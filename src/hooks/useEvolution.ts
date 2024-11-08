import { useState, useEffect, useCallback, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';
import { Vector3 } from 'three';
import { Organism, Genome, mutateGenome } from '../systems/evolution/genome';

interface EnvironmentState {
  energy: number;
  flow: number;
  density: number;
}

interface AddOrganismOptions {
  position: [number, number, number];
  parentGenome?: Genome;
}

// Create a default genome for new organisms
const createDefaultGenome = (): Genome => ({
  form: {
    baseSize: 0.5 + Math.random() * 0.5,
    shapeVertices: Array.from({ length: 8 }, () => 0.5 + Math.random() * 0.5),
    complexity: 0.5,
    colorHue: Math.random(),
    colorSaturation: 0.5 + Math.random() * 0.5,
    colorLightness: 0.4 + Math.random() * 0.3,
    symmetry: 0.3 + Math.random() * 0.7
  },
  behavior: {
    attentionSensitivity: Math.random(),
    growthRate: 0.3 + Math.random() * 0.4,
    energyEfficiency: 0.4 + Math.random() * 0.3,
    adaptability: 0.2 + Math.random() * 0.4
  },
  environment: {
    preferredEnergy: 0.4 + Math.random() * 0.4,
    preferredDensity: 0.3 + Math.random() * 0.4,
    preferredFlow: 0.4 + Math.random() * 0.3
  }
});

export const useEvolution = () => {
  const [organisms, setOrganisms] = useState<Organism[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    energy: 0.5,
    flow: 0,
    density: 0
  });

  const noise2D = useRef(createNoise2D());
  const generationCount = useRef(0);
  const evolutionSpeed = useRef(1);

  // Add a new organism
  const addOrganism = useCallback(({ position, parentGenome }: AddOrganismOptions) => {
    const genome = parentGenome ? mutateGenome(parentGenome) : createDefaultGenome();
    
    const newOrganism: Organism = {
      id: Math.random().toString(36).substr(2, 9),
      position,
      rotation: [0, 0, 0],
      genome,
      energy: 1.0,
      age: 0,
      generation: parentGenome ? generationCount.current + 1 : 0,
      parentIds: []
    };

    setOrganisms(prev => [...prev, newOrganism]);
  }, []);

  // Remove an organism
  const removeOrganism = useCallback((id: string) => {
    setOrganisms(prev => prev.filter(org => org.id !== id));
  }, []);

  // Update environment state
  const updateEnvironment = useCallback((newState: Partial<EnvironmentState>) => {
    setEnvironment(prev => ({
      ...prev,
      ...newState
    }));
  }, []);

  // Calculate fitness for an organism
  const calculateFitness = useCallback((organism: Organism): number => {
    const { genome } = organism;
    
    // Environmental fitness
    const environmentFitness = (
      Math.abs(genome.environment.preferredEnergy - environment.energy) +
      Math.abs(genome.environment.preferredFlow - environment.flow) +
      Math.abs(genome.environment.preferredDensity - environment.density)
    ) / 3;

    // Age bonus (slight advantage for surviving longer)
    const ageFitness = Math.min(organism.age / 500, 0.2);

    // Efficiency bonus
    const efficiencyFitness = genome.behavior.energyEfficiency * 0.3;

    return (1 - environmentFitness) * 0.5 + ageFitness + efficiencyFitness;
  }, [environment]);

  // Handle reproduction
  const reproduceOrganism = useCallback((parent: Organism) => {
    if (organisms.length >= 50) return; // Population cap

    const parentPosition = new Vector3(...parent.position);
    const offset = new Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      0
    );

    // Apply some influence from parent's movement
    offset.multiplyScalar(parent.genome.behavior.adaptability);

    const newPosition = parentPosition.add(offset).toArray();
    
    addOrganism({
      position: newPosition as [number, number, number],
      parentGenome: parent.genome
    });

    generationCount.current += 1;
  }, [addOrganism, organisms.length]);

  // Update organism positions and states
  const updateOrganisms = useCallback(() => {
    setOrganisms(prevOrganisms => {
      return prevOrganisms.map(organism => {
        const fitness = calculateFitness(organism);
        const energyChange = (
          (fitness - 0.5) * 0.1 * // Base energy change from fitness
          organism.genome.behavior.energyEfficiency * // Modified by efficiency
          evolutionSpeed.current // Modified by evolution speed
        );

        const newEnergy = Math.max(0, Math.min(1, organism.energy + energyChange));

        // Chance to reproduce if healthy
        if (newEnergy > 0.8 && Math.random() < 0.05 * evolutionSpeed.current) {
          reproduceOrganism(organism);
        }

        // Age the organism
        const newAge = organism.age + 1 * evolutionSpeed.current;

        // Remove if too old or no energy
        if (newAge > 1000 || newEnergy < 0.1) {
          return null;
        }

        // Calculate movement
        const time = Date.now() * 0.001;
        const moveSpeed = 0.1 * organism.genome.behavior.adaptability;
        const noiseX = noise2D.current(time + organism.id.charCodeAt(0), 0) * moveSpeed;
        const noiseY = noise2D.current(0, time + organism.id.charCodeAt(0)) * moveSpeed;

        // Apply movement based on environment flow
        const flowForce = environment.flow * 0.05;

        return {
          ...organism,
          energy: newEnergy,
          age: newAge,
          position: [
            organism.position[0] + noiseX + flowForce,
            organism.position[1] + noiseY,
            organism.position[2]
          ]
        };
      }).filter(Boolean) as Organism[];
    });
  }, [calculateFitness, reproduceOrganism, environment.flow]);

  // Main evolution update loop
  useEffect(() => {
    const evolutionInterval = setInterval(() => {
      updateOrganisms();
    }, 100 / evolutionSpeed.current);

    return () => clearInterval(evolutionInterval);
  }, [updateOrganisms]);

  // Adjust evolution speed based on breathing
  const setEvolutionSpeed = useCallback((speed: number) => {
    evolutionSpeed.current = speed;
  }, []);

  return {
    organisms,
    addOrganism,
    removeOrganism,
    updateEnvironment,
    environment,
    setEvolutionSpeed,
    generationCount: generationCount.current
  };
};