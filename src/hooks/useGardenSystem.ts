import { useState, useEffect, useRef, useCallback } from 'react';
import { createNoise2D } from 'simplex-noise';
import * as tf from '@tensorflow/tfjs';
import ForcesSystem from '../systems/environment/forces';
import InteractionsSystem from '../systems/environment/interactions';
import mutationSystem from '../systems/evolution/mutation';
import reproductionSystem from '../systems/evolution/reproduction';
import { GeneticTraits } from '../systems/evolution/mutation';
import { LSystem } from '../utils/generative/l-system';

interface Plant {
  id: string;
  position: [number, number, number];
  traits: GeneticTraits;
  lSystem: LSystem;
  growth: number;
  energy: number;
  age: number;
}

interface GardenState {
  plants: Plant[];
  environmentalFactors: number[];
  lastInteractionTime: number;
}

export const useGardenSystem = (width: number, height: number) => {
  const [state, setState] = useState<GardenState>({
    plants: [],
    environmentalFactors: [0.5, 0.5, 0.5], // light, energy, space
    lastInteractionTime: Date.now()
  });

  // System refs
  const forcesRef = useRef<ForcesSystem>(null);
  const interactionsRef = useRef<InteractionsSystem>(null);
  const frameRef = useRef<number>(null);
  const noise2D = useRef(createNoise2D());

  // Initialize systems
  useEffect(() => {
    forcesRef.current = new ForcesSystem(width, height);
    interactionsRef.current = new InteractionsSystem(forcesRef.current);

    // Start animation loop
    const animate = () => {
      const currentTime = Date.now();
      
      // Update systems
      if (forcesRef.current && interactionsRef.current) {
        forcesRef.current.update(1/60);
        interactionsRef.current.update(currentTime);
      }

      // Update garden state
      updateGardenState(currentTime);

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [width, height]);

  // Update garden state
  const updateGardenState = useCallback((currentTime: number) => {
    setState(prevState => {
      const { plants, lastInteractionTime } = prevState;
      
      // Update environmental factors
      const environmentalFactors = getEnvironmentalFactors(currentTime);

      // Update plants
      const updatedPlants = plants.map(plant => {
        const forces = forcesRef.current?.getForceAt(
          plant.position[0] / width,
          plant.position[1] / height
        );

        // Calculate growth and energy changes
        const growthRate = calculateGrowthRate(plant, forces);
        const energyChange = calculateEnergyChange(plant, forces);

        return {
          ...plant,
          growth: Math.min(1, plant.growth + growthRate),
          energy: Math.max(0, Math.min(1, plant.energy + energyChange)),
          age: plant.age + 1
        };
      });

      // Remove dead plants
      const livingPlants = updatedPlants.filter(
        plant => plant.energy > 0 && plant.age < 1000
      );

      // Attempt reproduction for healthy plants
      const newPlants = [];
      livingPlants.forEach(plant => {
        if (shouldReproduce(plant, currentTime, lastInteractionTime)) {
          const offspring = createOffspring(plant, environmentalFactors);
          if (offspring) {
            newPlants.push(offspring);
          }
        }
      });

      return {
        plants: [...livingPlants, ...newPlants],
        environmentalFactors,
        lastInteractionTime: currentTime
      };
    });
  }, [width, height]);

  // Handle user interaction
  const handleInteraction = useCallback((
    x: number,
    y: number,
    type: 'attention' | 'energy' | 'growth' = 'attention'
  ) => {
    if (interactionsRef.current) {
      interactionsRef.current.addInteraction(
        x / width,
        y / height,
        type,
        1.0,
        2.0
      );
    }

    setState(prev => ({
      ...prev,
      lastInteractionTime: Date.now()
    }));
  }, [width, height]);

  // Add new plant
  const addPlant = useCallback((position: [number, number, number]) => {
    setState(prev => {
      const traits = mutationSystem.createDefaultTraits();
      const lSystem = new LSystem({
        ...mutationSystem.traitsToLSystem(traits),
        axiom: 'F'
      });

      const newPlant: Plant = {
        id: Math.random().toString(36).substr(2, 9),
        position,
        traits,
        lSystem,
        growth: 0,
        energy: 1,
        age: 0
      };

      return {
        ...prev,
        plants: [...prev.plants, newPlant]
      };
    });
  }, []);

  // Helper functions
  const getEnvironmentalFactors = (currentTime: number): number[] => {
    const timeScale = currentTime * 0.0001;
    return [
      // Light (day/night cycle)
      (Math.sin(timeScale) + 1) * 0.5,
      // Energy (from forces system)
      forcesRef.current?.getForceAt(0.5, 0.5).energy || 0.5,
      // Space (based on plant density)
      calculateSpaceFactor()
    ];
  };

  const calculateSpaceFactor = useCallback(() => {
    return Math.max(0, 1 - (state.plants.length / 50));
  }, [state.plants.length]);

  const calculateGrowthRate = (plant: Plant, forces: any): number => {
    const baseRate = 0.001 * plant.traits.growth.rate;
    const energyFactor = forces ? forces.energy : 0.5;
    const lightFactor = forces ? forces.light : 0.5;
    
    return baseRate * energyFactor * lightFactor;
  };

  const calculateEnergyChange = (plant: Plant, forces: any): number => {
    const baseChange = -0.001; // Natural energy decay
    const environmentalBonus = forces ? 
      (forces.energy * 0.002 * plant.traits.adaptation.energyEfficiency) : 0;
    
    return baseChange + environmentalBonus;
  };

  const shouldReproduce = (
    plant: Plant,
    currentTime: number,
    lastInteractionTime: number
  ): boolean => {
    const timeSinceInteraction = currentTime - lastInteractionTime;
    const isHealthy = plant.energy > 0.8;
    const isMature = plant.growth > 0.9;
    const hasSpace = calculateSpaceFactor() > 0.3;
    
    return isHealthy && isMature && hasSpace && 
           timeSinceInteraction > 5000 && // 5 seconds since last interaction
           Math.random() < 0.01; // Random chance
  };

  const createOffspring = (
    parent: Plant,
    environmentalFactors: number[]
  ): Plant | null => {
    const result = reproductionSystem.reproduce(
      parent.traits,
      null,
      environmentalFactors
    );

    if (result.success > 0.5) {
      // Position offspring near parent with some randomness
      const position: [number, number, number] = [
        parent.position[0] + (Math.random() - 0.5) * 2,
        parent.position[1] + (Math.random() - 0.5) * 2,
        parent.position[2]
      ];

      return {
        id: Math.random().toString(36).substr(2, 9),
        position,
        traits: result.offspring,
        lSystem: new LSystem({
          ...mutationSystem.traitsToLSystem(result.offspring),
          axiom: 'F'
        }),
        growth: 0,
        energy: 1 - result.energy,
        age: 0
      };
    }

    return null;
  };

  return {
    plants: state.plants,
    environmentalFactors: state.environmentalFactors,
    handleInteraction,
    addPlant,
    getForces: () => forcesRef.current,
    getInteractions: () => interactionsRef.current
  };
};

export default useGardenSystem;