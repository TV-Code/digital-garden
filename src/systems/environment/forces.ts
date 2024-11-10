import { createNoise2D } from 'simplex-noise';
import * as tf from '@tensorflow/tfjs';

interface ForceField {
  grid: Float32Array;
  width: number;
  height: number;
}

export interface EnvironmentalForces {
  energy: ForceField;
  light: ForceField;
  flow: ForceField;
}

export class ForcesSystem {
  private noise2D = createNoise2D();
  private forces: EnvironmentalForces;
  private time: number = 0;
  private flowModel: tf.LayersModel;

  constructor(width: number, height: number) {
    this.forces = {
      energy: this.createForceField(width, height),
      light: this.createForceField(width, height),
      flow: this.createForceField(width, height)
    };

    this.initializeFlowModel();
  }

  private async initializeFlowModel() {
    // Simple model to predict flow patterns
    this.flowModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [3], units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 2, activation: 'tanh' }) // x and y components of flow
      ]
    });

    await this.flowModel.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError'
    });
  }

  private createForceField(width: number, height: number): ForceField {
    return {
      grid: new Float32Array(width * height),
      width,
      height
    };
  }

  update(deltaTime: number) {
    this.time += deltaTime;
    
    // Update each force field
    this.updateEnergyField(deltaTime);
    this.updateLightField(deltaTime);
    this.updateFlowField(deltaTime);
  }

  private updateEnergyField(deltaTime: number) {
    const { grid, width, height } = this.forces.energy;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Energy diffusion
        let energy = grid[idx];
        
        // Add noise-based fluctuation
        const noiseValue = this.noise2D(
          x * 0.05 + this.time * 0.1,
          y * 0.05
        );
        
        energy += noiseValue * 0.1 * deltaTime;
        
        // Energy decay
        energy *= (1 - 0.1 * deltaTime);
        
        // Clamp values
        grid[idx] = Math.max(0, Math.min(1, energy));
      }
    }
  }

  private updateLightField(deltaTime: number) {
    const { grid, width, height } = this.forces.light;

    // Simulate day/night cycle
    const dayPhase = (Math.sin(this.time * 0.1) + 1) * 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Base light level from height (higher = more light)
        const heightFactor = 1 - (y / height);
        
        // Add time-based variation
        const timeVariation = this.noise2D(
          x * 0.1 + this.time * 0.05,
          y * 0.1
        ) * 0.2;
        
        // Combine factors
        const lightLevel = heightFactor * dayPhase + timeVariation;
        
        grid[idx] = Math.max(0, Math.min(1, lightLevel));
      }
    }
  }

  private async updateFlowField(deltaTime: number) {
    const { grid, width, height } = this.forces.flow;
    
    // Use ML model to predict flow patterns
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        // Input features: position and time
        const input = tf.tensor2d([[
          x / width,
          y / height,
          this.time * 0.1
        ]]);
        
        // Predict flow direction
        const prediction = await this.flowModel.predict(input) as tf.Tensor;
        const [flowX, flowY] = await prediction.data();
        
        // Convert to flow strength
        grid[idx] = Math.sqrt(flowX * flowX + flowY * flowY);
        
        // Cleanup
        input.dispose();
        prediction.dispose();
      }
    }
  }

  // Get force at a specific position
  getForceAt(x: number, y: number): { 
    energy: number;
    light: number;
    flow: number;
  } {
    const { width, height } = this.forces.energy;
    
    // Convert to grid coordinates
    const gridX = Math.floor(x * width);
    const gridY = Math.floor(y * height);
    
    // Ensure within bounds
    const safeX = Math.max(0, Math.min(width - 1, gridX));
    const safeY = Math.max(0, Math.min(height - 1, gridY));
    
    const idx = safeY * width + safeX;
    
    return {
      energy: this.forces.energy.grid[idx],
      light: this.forces.light.grid[idx],
      flow: this.forces.flow.grid[idx]
    };
  }

  // Add energy to a specific point (e.g., from user interaction)
  addEnergy(x: number, y: number, amount: number, radius: number) {
    const { grid, width, height } = this.forces.energy;
    
    // Convert to grid coordinates
    const centerX = Math.floor(x * width);
    const centerY = Math.floor(y * height);
    const gridRadius = Math.floor(radius * width);
    
    // Apply energy in a radius
    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const px = centerX + dx;
        const py = centerY + dy;
        
        // Skip if outside bounds
        if (px < 0 || px >= width || py < 0 || py >= height) continue;
        
        // Calculate distance factor
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > gridRadius) continue;
        
        const factor = 1 - (dist / gridRadius);
        const idx = py * width + px;
        
        // Add energy with falloff
        grid[idx] += amount * factor;
        grid[idx] = Math.min(1, grid[idx]);
      }
    }
  }

  // Get visualization data for debugging
  getVisualizationData(): {
    energy: Uint8Array;
    light: Uint8Array;
    flow: Uint8Array;
  } {
    const visualData = {
      energy: new Uint8Array(this.forces.energy.grid.length * 4),
      light: new Uint8Array(this.forces.light.grid.length * 4),
      flow: new Uint8Array(this.forces.flow.grid.length * 4)
    };

    // Convert force fields to RGBA
    Object.entries(this.forces).forEach(([name, field]) => {
      for (let i = 0; i < field.grid.length; i++) {
        const value = Math.floor(field.grid[i] * 255);
        const idx = i * 4;
        
        visualData[name][idx] = value;     // R
        visualData[name][idx + 1] = value; // G
        visualData[name][idx + 2] = value; // B
        visualData[name][idx + 3] = 255;   // A
      }
    });

    return visualData;
  }
}

export default ForcesSystem;