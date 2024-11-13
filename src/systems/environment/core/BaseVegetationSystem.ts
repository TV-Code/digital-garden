// src/systems/environment/core/BaseVegetationSystem.ts

import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Plant, VegetationZone } from '../../../types/environment/vegetation';
import { Vector2 } from '../../../types/index';
import { HSLColor } from '../../../utils/colors';

export abstract class BaseVegetationSystem {
    protected noise2D: ReturnType<typeof createNoise2D>;
    protected noise3D: ReturnType<typeof createNoise3D>;
    protected plants: Plant[] = [];
    protected timeOfDay: number = 0;
    protected windIntensity: number = 0;

    constructor(
        protected width: number,
        protected height: number,
        protected waterLevel: number
    ) {
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
    }

    protected calculateMoistureAt(position: Vector2): number {
        const distanceFromWater = Math.abs(position.y - this.waterLevel);
        const baseMoisture = Math.max(0, 1 - distanceFromWater / (this.height * 0.2));
        const variation = this.noise2D(position.x * 0.01, position.y * 0.01) * 0.3;
        return Math.min(1, Math.max(0, baseMoisture + variation));
    }

    protected calculateSlopeAt(position: Vector2): number {
        const dx = this.noise2D(position.x + 1, position.y) - 
                  this.noise2D(position.x - 1, position.y);
        const dy = this.noise2D(position.x, position.y + 1) - 
                  this.noise2D(position.x, position.y - 1);
        return Math.sqrt(dx * dx + dy * dy);
    }

    protected isValidPlantLocation(plant: Plant, moisture: number, slope: number): boolean {
        // Add validation logic
        return true;
    }

    protected abstract generatePlantGeometry(plant: Plant): void;
    protected abstract updatePlant(plant: Plant, time: number, deltaTime: number): void;
    protected abstract drawPlant(ctx: CanvasRenderingContext2D, plant: Plant): void;
}