import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Plant, TreeStyleType, Vector2, PlantStyle } from '../../../types/environment/vegetation';
import { ColorSystem } from '../../../utils/colors';

interface GeneticTrait {
    value: number;
    mutation: number;
}

interface PlantGenome {
    height: GeneticTrait;
    spread: GeneticTrait;
    colorVariation: GeneticTrait;
    growthRate: GeneticTrait;
    adaptability: GeneticTrait;
    resilience: GeneticTrait;
}

interface EnvironmentalConditions {
    light: number;
    moisture: number;
    temperature: number;
    wind: number;
}

class EvolutionaryVegetationSystem extends VegetationSystem {
    private genomes: Map<string, PlantGenome> = new Map();
    private neuralNetwork: SimpleNeuralNetwork;
    private generation: number = 0;
    private fitnessScores: Map<string, number> = new Map();

    constructor(width: number, height: number, waterLevel: number) {
        super(width, height, waterLevel);
        this.neuralNetwork = new SimpleNeuralNetwork([4, 8, 4]); // Input: environmental conditions, Output: growth parameters
        this.initializeEvolutionarySystem();
    }

    private initializeEvolutionarySystem(): void {
        // Initialize base genomes for each plant type
        PLANT_TYPES.forEach((type, name) => {
            this.genomes.set(name, this.createInitialGenome());
        });
    }

    private createInitialGenome(): PlantGenome {
        return {
            height: { value: Math.random(), mutation: 0.1 },
            spread: { value: Math.random(), mutation: 0.1 },
            colorVariation: { value: Math.random(), mutation: 0.1 },
            growthRate: { value: Math.random(), mutation: 0.1 },
            adaptability: { value: Math.random(), mutation: 0.1 },
            resilience: { value: Math.random(), mutation: 0.1 }
        };
    }

    override createPlant(params: {
        type: PlantType;
        style: string;
        position: Vector2;
        sizeScale: number;
    }): Plant {
        const plant = super.createPlant(params);
        
        // Add evolutionary properties
        const genome = this.genomes.get(params.type) || this.createInitialGenome();
        const conditions = this.getEnvironmentalConditions(params.position);
        
        // Use neural network to adjust growth parameters
        const growthParams = this.neuralNetwork.forward([
            conditions.light,
            conditions.moisture,
            conditions.temperature,
            conditions.wind
        ]);

        // Apply genome and neural network influences
        plant.size *= genome.height.value * growthParams[0];
        plant.animation.growthSpeed *= genome.growthRate.value * growthParams[1];
        
        // Adjust colors based on genetics
        plant.colors = this.evolveColors(plant.colors, genome.colorVariation.value);

        return plant;
    }

    private evolveColors(baseColors: PlantColors, variation: number): PlantColors {
        return {
            primary: this.mutateColor(baseColors.primary, variation),
            secondary: this.mutateColor(baseColors.secondary, variation),
            detail: this.mutateColor(baseColors.detail, variation)
        };
    }

    private mutateColor(color: HSLColor, variation: number): HSLColor {
        return [
            color[0] + (Math.random() - 0.5) * variation * 20,
            color[1] + (Math.random() - 0.5) * variation * 15,
            color[2] + (Math.random() - 0.5) * variation * 10
        ];
    }

    override update(time: number, deltaTime: number): void {
        super.update(time, deltaTime);
        this.updateEvolution(time);
    }

    private updateEvolution(time: number): void {
        // Every day cycle, evaluate fitness and evolve
        const dayProgress = (Math.sin(time * 0.0001) + 1) / 2;
        
        if (dayProgress < 0.01 && this.shouldEvolve()) {
            this.evaluateFitness();
            this.evolveGeneration();
            this.generation++;
        }
    }

    private evaluateFitness(): void {
        this.plants.forEach(plant => {
            const conditions = this.getEnvironmentalConditions(plant.position);
            const genome = this.genomes.get(plant.type);
            if (!genome) return;

            // Calculate fitness based on growth and adaptation
            let fitness = plant.growth;
            fitness *= this.calculateAdaptationScore(plant, conditions);
            fitness *= genome.resilience.value;

            this.fitnessScores.set(plant.type, (this.fitnessScores.get(plant.type) || 0) + fitness);
        });
    }

    private evolveGeneration(): void {
        // Evolve genomes based on fitness scores
        this.genomes.forEach((genome, type) => {
            const fitness = this.fitnessScores.get(type) || 0;
            if (fitness > 0.7) {
                this.mutateGenome(genome);
            }
        });

        // Train neural network on successful adaptations
        this.trainNeuralNetwork();
    }

    private mutateGenome(genome: PlantGenome): void {
        Object.values(genome).forEach(trait => {
            if (Math.random() < trait.mutation) {
                trait.value += (Math.random() - 0.5) * trait.mutation;
                trait.value = Math.max(0, Math.min(1, trait.value));
            }
        });
    }

    private trainNeuralNetwork(): void {
        // Collect training data from successful plants
        const trainingData = this.plants
            .filter(plant => plant.growth > 0.8)
            .map(plant => ({
                input: Object.values(this.getEnvironmentalConditions(plant.position)),
                output: [
                    plant.size / this.getBaseSize(plant.type),
                    plant.animation.growthSpeed,
                    plant.growth,
                    1.0 // Survival signal
                ]
            }));

        // Train network if we have enough data
        if (trainingData.length > 10) {
            this.neuralNetwork.train(trainingData, 100);
        }
    }

    private getEnvironmentalConditions(position: Vector2): EnvironmentalConditions {
        return {
            light: this.calculateLightAt(position.x, position.y),
            moisture: this.calculateMoistureAt(position.x, position.y),
            temperature: this.calculateTemperatureAt(position.x, position.y),
            wind: this.calculateWindAt(position.x, position.y)
        };
    }

    private calculateAdaptationScore(plant: Plant, conditions: EnvironmentalConditions): number {
        // Calculate how well the plant is adapted to its conditions
        const genome = this.genomes.get(plant.type);
        if (!genome) return 0;

        let score = 1.0;
        
        // Light adaptation
        score *= this.calculateConditionScore(conditions.light, genome.adaptability.value);
        
        // Moisture adaptation
        score *= this.calculateConditionScore(conditions.moisture, genome.adaptability.value);
        
        // Temperature adaptation
        score *= this.calculateConditionScore(conditions.temperature, genome.adaptability.value);
        
        // Wind resilience
        score *= this.calculateConditionScore(1 - conditions.wind, genome.resilience.value);

        return score;
    }

    private calculateConditionScore(condition: number, adaptability: number): number {
        const optimal = 0.7; // Assuming this is the ideal value
        const difference = Math.abs(condition - optimal);
        return 1 - difference * (1 - adaptability);
    }

    private shouldEvolve(): boolean {
        return this.generation === 0 || 
               this.plants.length >= 10 || 
               this.generation % 10 === 0;
    }
}

// Simple Neural Network implementation
class SimpleNeuralNetwork {
    private weights: number[][][];
    private biases: number[][];

    constructor(layers: number[]) {
        this.weights = [];
        this.biases = [];
        
        for (let i = 0; i < layers.length - 1; i++) {
            this.weights[i] = Array(layers[i]).fill(0)
                .map(() => Array(layers[i + 1]).fill(0)
                    .map(() => Math.random() - 0.5));
            this.biases[i] = Array(layers[i + 1]).fill(0)
                .map(() => Math.random() - 0.5);
        }
    }

    forward(input: number[]): number[] {
        let current = input;
        
        for (let i = 0; i < this.weights.length; i++) {
            const layer = Array(this.weights[i][0].length).fill(0);
            
            for (let j = 0; j < this.weights[i].length; j++) {
                for (let k = 0; k < this.weights[i][j].length; k++) {
                    layer[k] += current[j] * this.weights[i][j][k];
                }
            }
            
            for (let j = 0; j < layer.length; j++) {
                layer[j] = this.sigmoid(layer[j] + this.biases[i][j]);
            }
            
            current = layer;
        }
        
        return current;
    }

    train(data: { input: number[], output: number[] }[], epochs: number): void {
        const learningRate = 0.1;

        for (let epoch = 0; epoch < epochs; epoch++) {
            data.forEach(({ input, output }) => {
                // Forward pass
                const predicted = this.forward(input);
                
                // Backward pass (simplified)
                const errors = output.map((target, i) => target - predicted[i]);
                
                // Update weights and biases
                this.weights.forEach((layer, i) => {
                    layer.forEach((neuron, j) => {
                        neuron.forEach((weight, k) => {
                            const delta = learningRate * errors[k] * input[j];
                            this.weights[i][j][k] += delta;
                        });
                    });
                });
            });
        }
    }

    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }
}

export default EvolutionaryVegetationSystem;