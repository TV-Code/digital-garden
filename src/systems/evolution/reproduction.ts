import { GeneticTraits } from './mutation';
import mutationSystem from './mutation';

interface ReproductionResult {
  offspring: GeneticTraits;
  success: number;  // 0-1 indicating reproduction success
  energy: number;   // Energy cost of reproduction
}

export class ReproductionSystem {
  private environmentalCache: Map<string, number[]> = new Map();

  async reproduce(
    parent1: GeneticTraits,
    parent2: GeneticTraits | null,
    environmentalFactors: number[]
  ): Promise<ReproductionResult> {
    // Calculate base success chance
    const successChance = this.calculateSuccessChance(
      parent1,
      parent2,
      environmentalFactors
    );

    // Create offspring traits
    let offspring: GeneticTraits;
    if (parent2) {
      offspring = this.crossover(parent1, parent2);
    } else {
      offspring = this.clone(parent1);
    }

    // Apply mutations based on environmental factors
    offspring = mutationSystem.mutate(offspring, environmentalFactors);

    // Calculate energy cost
    const energyCost = this.calculateEnergyCost(
      offspring,
      parent1,
      environmentalFactors
    );

    return {
      offspring,
      success: successChance,
      energy: energyCost
    };
  }

  private crossover(parent1: GeneticTraits, parent2: GeneticTraits): GeneticTraits {
    const offspring: GeneticTraits = {
      color: this.crossoverProperties(parent1.color, parent2.color),
      form: this.crossoverProperties(parent1.form, parent2.form),
      growth: this.crossoverProperties(parent1.growth, parent2.growth),
      adaptation: this.crossoverProperties(parent1.adaptation, parent2.adaptation)
    };

    return offspring;
  }

  private crossoverProperties<T>(prop1: T, prop2: T): T {
    const result = {} as T;
    
    Object.keys(prop1).forEach(key => {
      // Randomly choose between parents or create average
      const useAverage = Math.random() < 0.3;
      if (useAverage) {
        result[key] = (prop1[key] + prop2[key]) / 2;
      } else {
        result[key] = Math.random() < 0.5 ? prop1[key] : prop2[key];
      }
    });

    return result;
  }

  private clone(parent: GeneticTraits): GeneticTraits {
    // Deep clone with slight random variations
    return {
      color: {
        hue: parent.color.hue + (Math.random() - 0.5) * 10,
        saturation: parent.color.saturation + (Math.random() - 0.5) * 5,
        brightness: parent.color.brightness + (Math.random() - 0.5) * 5
      },
      form: { ...parent.form },
      growth: { ...parent.growth },
      adaptation: { ...parent.adaptation }
    };
  }

  private calculateSuccessChance(
    parent1: GeneticTraits,
    parent2: GeneticTraits | null,
    environmentalFactors: number[]
  ): number {
    let baseChance = 0.5;

    // Adjust based on parent fitness
    const parentFitness = this.calculateFitness(parent1, environmentalFactors);
    baseChance *= parentFitness;

    if (parent2) {
      const parent2Fitness = this.calculateFitness(parent2, environmentalFactors);
      baseChance *= parent2Fitness;
      baseChance = Math.sqrt(baseChance); // Normalize for two parents
    }

    // Environmental influence
    const environmentalSuitability = this.calculateEnvironmentalSuitability(
      environmentalFactors
    );
    baseChance *= environmentalSuitability;

    return Math.min(1, Math.max(0, baseChance));
  }

  private calculateFitness(
    traits: GeneticTraits,
    environmentalFactors: number[]
  ): number {
    // Calculate how well traits match environment
    const adaptationScore = 
      traits.adaptation.lightSensitivity * environmentalFactors[0] +
      traits.adaptation.energyEfficiency * environmentalFactors[1] +
      traits.adaptation.resilience * environmentalFactors[2];

    // Consider growth potential
    const growthScore = 
      (traits.growth.rate + traits.growth.maxSize) / 2;

    return (adaptationScore + growthScore) / 2;
  }

  private calculateEnvironmentalSuitability(
    factors: number[]
  ): number {
    // Average environmental factors with weights
    const weights = [0.4, 0.3, 0.3]; // light, energy, space
    return factors.reduce(
      (sum, factor, i) => sum + factor * weights[i],
      0
    );
  }

  private calculateEnergyCost(
    offspring: GeneticTraits,
    parent: GeneticTraits,
    environmentalFactors: number[]
  ): number {
    // Base cost
    let cost = 0.2;

    // Additional cost based on complexity
    cost += offspring.form.complexity * 0.3;
    cost += offspring.form.size * 0.2;

    // Efficiency reduction from parent's traits
    cost *= (2 - parent.adaptation.energyEfficiency);

    // Environmental influence
    const environmentalEfficiency = environmentalFactors[1]; // energy factor
    cost *= (2 - environmentalEfficiency);

    return Math.min(1, Math.max(0, cost));
  }
}

export default new ReproductionSystem();