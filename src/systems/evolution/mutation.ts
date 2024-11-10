import { LSystem } from '../../utils/generative/l-system';
import * as tf from '@tensorflow/tfjs';

export interface GeneticTraits {
  // Visual traits
  color: {
    hue: number;       // 0-360
    saturation: number;// 0-100
    brightness: number;// 0-100
  };
  form: {
    complexity: number;    // 0-1
    symmetry: number;      // 0-1
    size: number;         // 0-1
  };
  
  // Growth traits
  growth: {
    rate: number;         // 0-1
    maxSize: number;      // 0-1
    branchingFactor: number; // 0-1
    angleVariation: number;  // 0-1
  };
  
  // Environmental adaptation
  adaptation: {
    lightSensitivity: number;  // 0-1
    energyEfficiency: number;  // 0-1
    resilience: number;       // 0-1
  };
}

export class MutationSystem {
  private mlModel: tf.LayersModel;
  
  constructor() {
    this.initializeML();
  }

  private async initializeML() {
    // Create a simple model to predict successful mutations
    this.mlModel = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [Object.keys(this.flattenTraits(this.createDefaultTraits())).length], 
          units: 32, 
          activation: 'relu' 
        }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'sigmoid' })
      ]
    });

    await this.mlModel.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError'
    });
  }

  createDefaultTraits(): GeneticTraits {
    return {
      color: {
        hue: 120 + Math.random() * 40,        // Green-ish
        saturation: 60 + Math.random() * 20,   // Medium saturation
        brightness: 40 + Math.random() * 30    // Medium brightness
      },
      form: {
        complexity: 0.5,
        symmetry: 0.7,
        size: 0.5
      },
      growth: {
        rate: 0.5,
        maxSize: 0.5,
        branchingFactor: 0.5,
        angleVariation: 0.5
      },
      adaptation: {
        lightSensitivity: 0.5,
        energyEfficiency: 0.5,
        resilience: 0.5
      }
    };
  }

  mutate(traits: GeneticTraits, environmentalFactors: number[]): GeneticTraits {
    // Predict optimal mutation direction using ML model
    const currentTraits = this.flattenTraits(traits);
    const prediction = this.predictMutation(currentTraits, environmentalFactors);
    
    // Apply mutations based on prediction
    return this.applyMutation(traits, prediction);
  }

  private async predictMutation(traits: Record<string, number>, environmentalFactors: number[]) {
    const input = tf.tensor2d([...Object.values(traits), ...environmentalFactors], [1, traits.length + environmentalFactors.length]);
    const prediction = await this.mlModel.predict(input) as tf.Tensor;
    return await prediction.data();
  }

  private applyMutation(traits: GeneticTraits, prediction: Float32Array): GeneticTraits {
    const mutated = { ...traits };
    const mutationStrength = 0.1; // How strong mutations can be

    // Apply color mutations
    mutated.color.hue += (prediction[0] - 0.5) * 20 * mutationStrength;
    mutated.color.saturation += (prediction[1] - 0.5) * 20 * mutationStrength;
    mutated.color.brightness += (prediction[2] - 0.5) * 20 * mutationStrength;

    // Apply form mutations
    mutated.form.complexity = this.clamp(
      mutated.form.complexity + (prediction[3] - 0.5) * mutationStrength
    );
    mutated.form.symmetry = this.clamp(
      mutated.form.symmetry + (prediction[4] - 0.5) * mutationStrength
    );
    mutated.form.size = this.clamp(
      mutated.form.size + (prediction[5] - 0.5) * mutationStrength
    );

    // Apply growth mutations
    Object.keys(mutated.growth).forEach((key, i) => {
      mutated.growth[key] = this.clamp(
        mutated.growth[key] + (prediction[6 + i] - 0.5) * mutationStrength
      );
    });

    // Apply adaptation mutations
    Object.keys(mutated.adaptation).forEach((key, i) => {
      mutated.adaptation[key] = this.clamp(
        mutated.adaptation[key] + (prediction[6 + i] - 0.5) * mutationStrength
      );
    });

    return mutated;
  }

  // Helper method to convert nested traits object to flat array for ML
  private flattenTraits(traits: GeneticTraits): Record<string, number> {
    const flat: Record<string, number> = {};
    
    Object.entries(traits).forEach(([category, values]) => {
      Object.entries(values).forEach(([trait, value]) => {
        flat[`${category}_${trait}`] = value;
      });
    });
    
    return flat;
  }

  // Convert traits to L-System parameters
  traitsToLSystem(traits: GeneticTraits): Partial<LSystem> {
    return {
      iterations: Math.floor(3 + traits.form.complexity * 2),
      angle: Math.PI / 6 + (traits.growth.angleVariation - 0.5) * Math.PI / 6,
      lengthFactor: 0.3 + traits.form.size * 0.4,
      rules: [
        {
          predecessor: 'F',
          successor: this.generateRuleFromTraits(traits),
          probability: 1
        }
      ]
    };
  }

  private generateRuleFromTraits(traits: GeneticTraits): string {
    const branchingLevel = Math.floor(1 + traits.growth.branchingFactor * 3);
    let rule = 'FF';
    
    for (let i = 0; i < branchingLevel; i++) {
      const symmetry = traits.form.symmetry > 0.7;
      if (symmetry) {
        rule += `+[+F-F-F]-[-F+F+F]`;
      } else {
        rule += `+[+F-F]-[-F+F]`;
      }
    }
    
    return rule;
  }

  private clamp(value: number, min = 0, max = 1): number {
    return Math.min(max, Math.max(min, value));
  }
}

export default new MutationSystem();