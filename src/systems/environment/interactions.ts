import { createNoise2D } from 'simplex-noise';
import { ForcesSystem } from './forces';

interface InteractionPoint {
  x: number;
  y: number;
  strength: number;
  duration: number;
  type: 'attention' | 'energy' | 'growth';
}

export class InteractionsSystem {
  private noise2D = createNoise2D();
  private interactions: InteractionPoint[] = [];
  private forcesSystem: ForcesSystem;
  private lastUpdateTime: number = 0;

  constructor(forcesSystem: ForcesSystem) {
    this.forcesSystem = forcesSystem;
  }

  // Add a new interaction point (e.g., from user input)
  addInteraction(
    x: number, 
    y: number, 
    type: InteractionPoint['type'] = 'attention',
    strength: number = 1.0,
    duration: number = 2.0
  ) {
    this.interactions.push({
      x,
      y,
      type,
      strength,
      duration
    });

    // Immediately apply force field effects
    switch (type) {
      case 'energy':
        this.forcesSystem.addEnergy(x, y, strength * 0.5, 0.2);
        break;
      case 'growth':
        this.forcesSystem.addEnergy(x, y, strength * 0.3, 0.3);
        break;
      case 'attention':
        this.forcesSystem.addEnergy(x, y, strength * 0.1, 0.4);
        break;
    }
  }

  // Update interaction points and their effects
  update(currentTime: number) {
    const deltaTime = this.lastUpdateTime ? 
      (currentTime - this.lastUpdateTime) / 1000 : 
      0;
    
    this.lastUpdateTime = currentTime;

    // Update existing interactions
    this.interactions = this.interactions.filter(point => {
      // Decrease duration
      point.duration -= deltaTime;
      
      if (point.duration <= 0) {
        return false;
      }

      // Apply ongoing effects
      this.applyInteractionEffects(point, deltaTime);
      
      return true;
    });
  }

  private applyInteractionEffects(point: InteractionPoint, deltaTime: number) {
    // Calculate fade factor
    const fadeStart = 0.5; // Start fading when 0.5 seconds remain
    const fadeFactor = point.duration > fadeStart ? 
      1.0 : 
      point.duration / fadeStart;

    // Add some natural movement using noise
    const time = Date.now() * 0.001;
    const noiseX = this.noise2D(time, point.x) * 0.02;
    const noiseY = this.noise2D(point.y, time) * 0.02;

    const effectiveX = point.x + noiseX;
    const effectiveY = point.y + noiseY;

    // Apply type-specific effects
    switch (point.type) {
      case 'attention':
        this.applyAttentionEffect(
          effectiveX,
          effectiveY,
          point.strength * fadeFactor,
          deltaTime
        );
        break;

      case 'energy':
        this.applyEnergyEffect(
          effectiveX,
          effectiveY,
          point.strength * fadeFactor,
          deltaTime
        );
        break;

      case 'growth':
        this.applyGrowthEffect(
          effectiveX,
          effectiveY,
          point.strength * fadeFactor,
          deltaTime
        );
        break;
    }
  }

  private applyAttentionEffect(
    x: number,
    y: number,
    strength: number,
    deltaTime: number
  ) {
    // Attention creates a gentle ripple of energy
    const radius = 0.3 + Math.sin(Date.now() * 0.002) * 0.1;
    this.forcesSystem.addEnergy(
      x,
      y,
      strength * 0.1 * deltaTime,
      radius
    );
  }

  private applyEnergyEffect(
    x: number,
    y: number,
    strength: number,
    deltaTime: number
  ) {
    // Energy creates a more intense, focused effect
    const radius = 0.2;
    this.forcesSystem.addEnergy(
      x,
      y,
      strength * 0.3 * deltaTime,
      radius
    );
  }

  private applyGrowthEffect(
    x: number,
    y: number,
    strength: number,
    deltaTime: number
  ) {
    // Growth effect is wider and more sustained
    const radius = 0.4;
    this.forcesSystem.addEnergy(
      x,
      y,
      strength * 0.2 * deltaTime,
      radius
    );
  }

  // Get all active interaction points for visualization
  getActiveInteractions(): InteractionPoint[] {
    return this.interactions;
  }

  // Clear all interactions
  clearInteractions() {
    this.interactions = [];
  }
}

export default InteractionsSystem;