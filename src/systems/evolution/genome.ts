export interface Genome {
    // Visual traits
    form: {
      baseSize: number;          // Base size of the organism
      shapeVertices: number[];   // Points defining the organism's shape
      complexity: number;        // How many subdivisions/details
      colorHue: number;         // Base color hue (0-1)
      colorSaturation: number;  // Color saturation (0-1)
      colorLightness: number;   // Color lightness (0-1)
      symmetry: number;         // Degree of radial symmetry
    };
    
    // Behavioral traits
    behavior: {
      attentionSensitivity: number;  // How strongly it responds to attention (-1 to 1)
      growthRate: number;            // Speed of development (0-1)
      energyEfficiency: number;      // Energy use efficiency (0-1)
      adaptability: number;          // Rate of mutation (0-1)
    };
  
    // Environmental preferences
    environment: {
      preferredEnergy: number;    // Optimal energy level
      preferredDensity: number;   // Optimal proximity to others
      preferredFlow: number;      // Optimal movement amount
    };
  }
  
  export interface Organism {
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    genome: Genome;
    energy: number;
    age: number;
    generation: number;
    parentIds: string[];
  }
  
  // Mutation helper functions
  export const mutateGenome = (genome: Genome, mutationRate: number = 0.1): Genome => {
    const mutateValue = (value: number, range: number = 0.1): number => {
      if (Math.random() < mutationRate) {
        return Math.max(0, Math.min(1, value + (Math.random() - 0.5) * range));
      }
      return value;
    };
  
    return {
      form: {
        ...genome.form,
        baseSize: mutateValue(genome.form.baseSize),
        shapeVertices: genome.form.shapeVertices.map(v => mutateValue(v)),
        complexity: mutateValue(genome.form.complexity),
        colorHue: mutateValue(genome.form.colorHue),
        colorSaturation: mutateValue(genome.form.colorSaturation),
        colorLightness: mutateValue(genome.form.colorLightness),
        symmetry: mutateValue(genome.form.symmetry),
      },
      behavior: {
        ...genome.behavior,
        attentionSensitivity: mutateValue(genome.behavior.attentionSensitivity),
        growthRate: mutateValue(genome.behavior.growthRate),
        energyEfficiency: mutateValue(genome.behavior.energyEfficiency),
        adaptability: mutateValue(genome.behavior.adaptability),
      },
      environment: {
        ...genome.environment,
        preferredEnergy: mutateValue(genome.environment.preferredEnergy),
        preferredDensity: mutateValue(genome.environment.preferredDensity),
        preferredFlow: mutateValue(genome.environment.preferredFlow),
      },
    };
  };