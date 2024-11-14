import { createNoise2D, createNoise3D } from 'simplex-noise';
import { 
    Plant, TreeStyleType, Vector2, PlantStyle, FoliageStyle, 
    VegetationZone, TrunkStyle, PlantType, Zones, PlantDefinition,
    PlantElements, PlantColors, PlantAnimation, WindEffect, VegetationClusterParams
} from '../../../types/environment/vegetation';
import { ColorSystem, ColorUtils, HSLColor } from '../../../utils/colors';
import { TREE_STYLES, PLANT_TYPES, VEGETATION_COLORS } from '../../../configs/environment/vegetationConfig';

export class VegetationSystem {
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private plants: Plant[] = [];
    private season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
    private timeOfDay: number = 0;
    private windIntensity: number = 0;
    private zones: Zones;

    constructor(
        private width: number,
        private height: number,
        private waterLevel: number
    ) {
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();

        // Initialize zones
        this.zones = {
            shoreline: {
                start: waterLevel - height * 0.05,
                end: waterLevel + height * 0.1
            },
            vegetation: {
                denseGrowth: this.generateGrowthZones(3, 0.15),
                sparse: this.generateGrowthZones(5, 0.08),
                sheltered: this.generateGrowthZones(2, 0.2)
            }
        };

        // Initialize vegetation
        this.initializeVegetation();
    }

    private initializeVegetation() {
        const moistureMap = this.generateMoistureMap();
        
        // Generate plants for each type
        Object.values(PLANT_TYPES).forEach(plantType => {
            this.generatePlantsOfType(plantType, moistureMap);
        });
    }

    update(time: number, deltaTime: number) {
        // Update wind effect
        this.updateWindEffect(time);

        // Update each plant
        this.plants.forEach(plant => {
            // Update growth
            if (plant.growth < 1) {
                plant.growth += deltaTime * plant.animation.growthSpeed * 0.001;
            }

            // Update animation phase
            plant.animation.phase = time * 0.001 + plant.animation.swayOffset;

            // Apply wind effect
            const windEffect = this.calculateWindEffect(plant, time);
            this.applyWindEffect(plant, windEffect, deltaTime);
        });
    }

    draw(ctx: CanvasRenderingContext2D, time: number) {
      // Group plants by type and style for batch rendering
      const groups = new Map<string, Plant[]>();
      
      this.plants.forEach(plant => {
          // Only process visible plants
          if (plant.position.x >= -plant.size && 
              plant.position.x <= this.width + plant.size &&
              plant.position.y >= -plant.size && 
              plant.position.y <= this.height + plant.size) {
              
              const key = `${plant.type}_${plant.style || 'default'}`;
              if (!groups.has(key)) {
                  groups.set(key, []);
              }
              groups.get(key)!.push(plant);
          }
      });
  
      // Sort groups by y position for proper layering
      const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
          const aY = Math.min(...a[1].map(p => p.position.y));
          const bY = Math.min(...b[1].map(p => p.position.y));
          return aY - bY;
      });
  
      // Draw each group
      ctx.save();
      sortedGroups.forEach(([groupKey, plants]) => {
          // Set up common rendering state for the group
          const plant = plants[0];
          const style = plant.style ? TREE_STYLES[plant.style] : undefined;
          
          if (style) {
              // Apply group-wide visual settings
              this.setupGroupRenderingState(ctx, style);
          }
  
          // Draw all plants in the group
          plants.forEach(plant => {
              this.drawPlant(ctx, plant, time);
          });
      });
      ctx.restore();
  }

  private setupGroupRenderingState(ctx: CanvasRenderingContext2D, style: TreeStyle) {
    // Apply sophisticated rendering techniques for the whole group
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 5;
    ctx.globalCompositeOperation = 'source-over';
    
    // Could add more group-wide visual enhancements here
}

private drawPlant(ctx: CanvasRenderingContext2D, plant: Plant, time: number) {
  ctx.save();

  
  // Apply only the necessary transforms
  const growthScale = 0.3 + plant.growth * 0.7;
  
  // First move to plant position
  ctx.translate(plant.position.x, plant.position.y);
  // Scale around that position
  ctx.scale(growthScale, growthScale);
  // Move back
  ctx.translate(-plant.position.x, -plant.position.y);

  if (plant.style && plant.style in TREE_STYLES) {
      this.drawStyledPlant(ctx, plant, TREE_STYLES[plant.style], time);
  } else {
      this.drawDefaultPlant(ctx, plant, time);
  }

  ctx.restore();
}


  

    // Implementation of core plant generation methods...
    private generatePlantsOfType(plantDef: PlantDefinition, moistureMap: number[][]) {
      const gridSize = plantDef.type === 'tree' ? 40 : 20;
      const cols = Math.ceil(this.width / gridSize);
      const rows = Math.ceil(this.height / gridSize);
      
      let plantCount = 0;
  
      for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
              const worldX = x * gridSize + Math.random() * gridSize;
              const worldY = y * gridSize + Math.random() * gridSize;
  
              const growthPotential = this.evaluateGrowthPotential(worldX, worldY, plantDef.type);
              const moisture = this.getMoistureAt(worldX, worldY, moistureMap);
              const slope = this.getSlopeAt(worldX, worldY);
  
              if (this.isValidPlantLocation(plantDef, moisture, slope)) {
                  if (Math.random() < plantDef.density * growthPotential) {
                      this.createPlant(plantDef, { x: worldX, y: worldY });
                      plantCount++;
                  }
              }
          }
      }
  }

  private createPlant(def: PlantDefinition, position: Vector2): Plant {
    if (def.type === 'tree') {
        const style: TreeStyleType = 'WHITE_BIRCH';  // TypeScript now knows this is valid
        const size = def.size.min + Math.random() * (def.size.max - def.size.min);
        
        const plant: Plant = {
            type: def.type,
            position,
            size: size * 1.5,
            growth: 0,
            variation: Math.random(),
            elements: {
                trunk: undefined,
                foliage: [],
                details: []
            },
            colors: this.getPlantColors(def.type),
            animation: {
                swayOffset: Math.random() * Math.PI * 2,
                growthSpeed: 0.1,
                phase: Math.random() * Math.PI * 2,
                swayAmount: 0.1,
                windEffect: undefined
            },
            style  // TypeScript knows this is valid
        };

        this.generatePlantGeometry(plant);
        this.plants.push(plant);
        return plant;
    }

    // Handle other plant types...
    const plant: Plant = {
        type: def.type,
        position,
        size: def.size.min + Math.random() * (def.size.max - def.size.min),
        growth: 0,
        variation: Math.random(),
        elements: {
            trunk: undefined,
            foliage: [],
            details: []
        },
        colors: this.getPlantColors(def.type),
        animation: {
            swayOffset: Math.random() * Math.PI * 2,
            growthSpeed: 0.1 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2,
            swayAmount: 0.3,
            windEffect: undefined
        }
    };

    this.generatePlantGeometry(plant);
    this.plants.push(plant);
    return plant;
}

    private drawFoliage(
        ctx: CanvasRenderingContext2D,
        plant: Plant,
        time: number,
        baseTransform: any
    ) {
        const style = plant.style ? TREE_STYLES[plant.style as keyof typeof TREE_STYLES] : null;
        const foliageCount = plant.elements.foliage.length;

        plant.elements.foliage.forEach((foliage, i) => {
            ctx.save();

            // Calculate layer-specific animation
            const depth = i / foliageCount;
            const layerOffset = this.calculateLayerOffset(plant, i, time, baseTransform);
            ctx.translate(layerOffset.x, layerOffset.y);

            // Create appropriate gradient
            const gradient = this.createFoliageGradient(ctx, plant, style, depth);
            
            // Add depth effects
            this.applyFoliageEffects(ctx, depth, baseTransform);
            
            // Draw foliage
            ctx.fillStyle = gradient;
            ctx.fill(foliage);
            
            // Add highlights and details for final layer
            if (i === foliageCount - 1) {
                this.addFoliageHighlights(ctx, foliage, style);
            }
            
            ctx.restore();
        });
    }

    private normalizeColor(color: HSLColor | {h: number, s: number, b: number}): [number, number, number] {
      if (Array.isArray(color)) {
          return color;
      }
      return [color.h, color.s, color.b];
  }

  private createFoliageGradient(
    ctx: CanvasRenderingContext2D,
    plant: Plant,
    style: TreeStyle | null,
    depth: number
): CanvasGradient {
    const baseColor = style?.foliage?.colors?.[0] || this.normalizeColor(plant.colors.primary);
    const size = plant.size * (style?.foliage?.size || 1);
    
    const gradient = ctx.createRadialGradient(
        plant.position.x, plant.position.y - plant.size * 0.6, 0,
        plant.position.x, plant.position.y - plant.size * 0.6, size
    );
    
    const opacity = Math.max(0.4, 1 - depth * 0.15);
    const [h, s, b] = baseColor;
    
    gradient.addColorStop(0, `hsla(${h}, ${s}%, ${Math.min(100, b + 8)}%, ${opacity})`);
    gradient.addColorStop(0.3, `hsla(${h}, ${s}%, ${Math.min(100, b + 4)}%, ${opacity * 0.95})`);
    gradient.addColorStop(0.7, `hsla(${h}, ${s}%, ${b}%, ${opacity * 0.9})`);
    gradient.addColorStop(1, `hsla(${h}, ${s}%, ${Math.max(0, b - 5)}%, ${opacity * 0.8})`);
    
    return gradient;
}

private calculatePlantTransform(plant: Plant, time: number): {
  sway: { x: number; y: number };
  growth: number;
  time: number;
} {
  const growth = plant.growth;
  const style = this.getTreeStyle(plant);
  const baseSwayAmount = style?.foliage?.animation?.swayAmount || 
      (plant.type === 'tree' ? 2 : 
       plant.type === 'grass' ? 4 :
       plant.type === 'flower' ? 3 : 2);
  const swaySpeed = style?.foliage?.animation?.swaySpeed || 1;
  
  // Calculate more natural sway movement
  const timeScale = time * 0.001;
  const windEffect = Math.sin(timeScale * swaySpeed + plant.animation.swayOffset);
  const verticalEffect = Math.cos(timeScale * swaySpeed * 0.7 + plant.animation.swayOffset);
  
  return {
      sway: {
          x: windEffect * baseSwayAmount * growth,
          y: verticalEffect * baseSwayAmount * 0.3 * growth
      },
      growth,
      time: timeScale
  };
}

    private calculateLayerOffset(
        plant: Plant,
        layerIndex: number,
        time: number,
        transform: any
    ): Vector2 {
        const windAmount = 2;
        const verticalAmount = 1;
        const layerPhase = plant.animation.swayOffset + layerIndex * 0.2;
        const swayMultiplier = 1 - (layerIndex / plant.elements.foliage.length) * 0.3;
        
        return {
            x: Math.sin(time * 0.001 + layerPhase) * windAmount * swayMultiplier,
            y: Math.cos(time * 0.001 * 0.7 + layerPhase) * verticalAmount * swayMultiplier
        };
    }

    private applyFoliageEffects(
        ctx: CanvasRenderingContext2D,
        depth: number,
        transform: any
    ): void {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 10 * (1 - depth * 0.5);
        ctx.shadowOffsetX = transform.sway.x * 2;
        ctx.shadowOffsetY = 3 + Math.abs(transform.sway.y);
        ctx.globalCompositeOperation = 'source-over';
    }

    private addFoliageHighlights(
        ctx: CanvasRenderingContext2D,
        foliage: Path2D,
        style: TreeStyle | null
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke(foliage);
        ctx.restore();
    }

    private generateMoistureMap(): number[][] {
        const resolution = 50;
        const map: number[][] = [];
        
        for (let y = 0; y < resolution; y++) {
            map[y] = [];
            for (let x = 0; x < resolution; x++) {
                const worldX = (x / resolution) * this.width;
                const worldY = (y / resolution) * this.height;
                
                let moisture = this.calculateBaseMoisture(worldX, worldY);
                moisture = this.adjustMoistureForZones(moisture, worldX, worldY);
                moisture = this.addMoistureVariation(moisture, x, y);
                
                map[y][x] = Math.max(0, Math.min(1, moisture));
            }
        }
        
        return map;
    }

    private calculateBaseMoisture(x: number, y: number): number {
        const distanceFromWater = Math.abs(y - this.waterLevel);
        return Math.max(0, 1 - distanceFromWater / (this.height * 0.2));
    }

    private evaluateGrowthPotential(x: number, y: number, type: PlantType): number {
        const waterInfluence = this.calculateWaterInfluence(y);
        const zoneInfluence = this.calculateZoneInfluence(x, y, type);
        const noiseVariation = this.calculateNoiseVariation(x, y);

        let potential = (waterInfluence + zoneInfluence) * 0.5;
        potential *= 0.8 + noiseVariation;

        return Math.max(0, Math.min(1, potential));
    }

    private calculateWaterInfluence(y: number): number {
        const distanceFromWater = Math.abs(y - this.waterLevel);
        return Math.max(0, 1 - distanceFromWater / (this.height * 0.2));
    }

    private calculateZoneInfluence(x: number, y: number, type: PlantType): number {
        const { vegetation } = this.zones;
        
        switch (type) {
            case 'tree':
                return this.evaluateZoneInfluence(x, y, vegetation.sheltered, 0.3);
            case 'bush':
                return Math.max(
                    this.evaluateZoneInfluence(x, y, vegetation.denseGrowth, 0.2),
                    this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.15)
                );
            case 'flower':
                return this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.15);
            case 'grass':
                return 0.3 + Math.max(
                    this.evaluateZoneInfluence(x, y, vegetation.denseGrowth, 0.1),
                    this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.05)
                );
            case 'fern':
                return this.evaluateZoneInfluence(x, y, vegetation.sheltered, 0.25);
            default:
                return 0;
        }
    }

    private calculateNoiseVariation(x: number, y: number): number {
        // Combine multiple noise frequencies for more natural variation
        let variation = 0;
        for (let freq = 1; freq <= 3; freq++) {
            variation += this.noise2D(x * 0.01 * freq, y * 0.01 * freq) * (1 / freq);
        }
        return variation * 0.3; // Scale to reasonable range
    }

    private evaluateZoneInfluence(x: number, y: number, zones: Vector2[], falloff: number): number {
        let influence = 0;
        
        zones.forEach(zone => {
            const dx = x - zone.x;
            const dy = y - zone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const radius = this.width * falloff;
            
            if (distance < radius) {
                const factor = 1 - (distance / radius);
                influence = Math.max(influence, factor * factor * (3 - 2 * factor)); // Smoothstep
            }
        });
        
        return influence;
    }

    private generateGrowthZones(count: number, sizeScale: number): Vector2[] {
        const zones: Vector2[] = [];
        const safeMargin = this.width * 0.1;
        
        for (let i = 0; i < count; i++) {
            const x = safeMargin + (this.width - 2 * safeMargin) * 
                     (0.5 + this.noise2D(i * 0.5, 0) * 0.5);
            const y = this.waterLevel + this.noise2D(i * 0.5, 1) * this.height * 0.2;
            
            zones.push({ x, y });
        }
        
        return zones;
    }

    private adjustMoistureForZones(baseMoisture: number, x: number, y: number): number {
        const { vegetation } = this.zones;
        const zoneInfluence = Math.max(
            this.evaluateZoneInfluence(x, y, vegetation.denseGrowth, 0.15),
            this.evaluateZoneInfluence(x, y, vegetation.sheltered, 0.2)
        );
        return baseMoisture * 0.7 + zoneInfluence * 0.3;
    }

    private addMoistureVariation(moisture: number, x: number, y: number): number {
        const variation = this.noise2D(x * 0.2, y * 0.2) * 0.2;
        return moisture + variation;
    }

    private isValidPlantLocation(
        plantDef: PlantDefinition,
        moisture: number,
        slope: number
    ): boolean {
        // Check basic conditions
        if (moisture < plantDef.conditions.minMoisture) return false;
        if (slope < plantDef.conditions.minSlope) return false;
        if (slope > plantDef.conditions.maxSlope) return false;

        // Add some randomness to create more natural distribution
        const randomFactor = 0.8 + Math.random() * 0.4;
        const moistureThreshold = plantDef.conditions.minMoisture * randomFactor;
        
        return moisture >= moistureThreshold;
    }

    private getSlopeAt(x: number, y: number): number {
        const sampleDistance = 5;
        const h1 = this.noise2D(x, y);
        const h2 = this.noise2D(x + sampleDistance, y);
        const h3 = this.noise2D(x, y + sampleDistance);
        
        const dx = (h2 - h1) / sampleDistance;
        const dy = (h3 - h1) / sampleDistance;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getMoistureAt(x: number, y: number, moistureMap: number[][]): number {
        const mapX = Math.floor((x / this.width) * (moistureMap[0].length - 1));
        const mapY = Math.floor((y / this.height) * (moistureMap.length - 1));
        
        // Ensure we're within bounds
        if (mapY >= 0 && mapY < moistureMap.length && 
            mapX >= 0 && mapX < moistureMap[0].length) {
            return moistureMap[mapY][mapX];
        }
        
        return 0;
    }

    private generateCrownPoints(plant: Plant, style: FoliageStyle): Vector2[] {
        const points: Vector2[] = [];
        const segments = 24;
        const baseSize = plant.size * style.size;
        const centerY = plant.position.y - plant.size * 0.6;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Create multi-layered noise for more organic shape
            let radius = baseSize * 0.8;
            
            // Base shape variation
            radius *= 1 + Math.sin(angle * 2) * 0.1;
            
            // Add multiple noise frequencies
            radius *= 1 + this.noise2D(angle * 3 + plant.variation, 0) * 0.2;
            radius *= 1 + this.noise2D(angle * 7 + plant.variation, 1) * 0.1;
            
            // Add style-based modifications
            if (style.shape === 'weeping') {
                radius *= 1 + Math.sin(angle) * 0.3;
            } else if (style.shape === 'conical') {
                radius *= 1 - Math.abs(Math.sin(angle)) * 0.2;
            }
            
            points.push({
                x: plant.position.x + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius * 0.6
            });
        }
        
        return points;
    }

    // Zone initialization and management
    private initializeZones() {
        const shoreline = {
            start: this.waterLevel - this.height * 0.05,
            end: this.waterLevel + this.height * 0.1
        };

        // Create vegetation growth zones
        const denseGrowth = this.generateGrowthZones(3, 0.15);
        const sparse = this.generateGrowthZones(5, 0.08);
        const sheltered = this.generateGrowthZones(2, 0.2);

        this.zones = {
            shoreline,
            vegetation: { denseGrowth, sparse, sheltered }
        };
    }

    private generateEnhancedTrunk(plant: Plant, style: TrunkStyle): Path2D {
      const trunk = new Path2D();
      const trunkWidth = plant.size * style.width;
      const trunkHeight = plant.size * 0.85;
      const points: Vector2[] = [];
      const segments = 20;
  
      // Generate trunk points with natural variation
      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const bendInfluence = style.bend ? Math.sin(t * Math.PI) * style.bend : 0;
          const twistInfluence = style.twist ? Math.sin(t * Math.PI * 2) * style.twist : 0;
          const naturalVariation = this.noise2D(t * 5 + plant.variation, t) * 0.1;
  
          const xOffset = (bendInfluence + twistInfluence + naturalVariation) * trunkHeight;
          const yPos = -t * trunkHeight; // Adjusted to be relative to (0, 0)
  
          points.push({
              x: xOffset,
              y: yPos
          });
      }
  
      this.drawTrunkOutline(trunk, points, trunkWidth, style.taper);
      return trunk;
  }
  

  private drawTrunkOutline(trunk: Path2D, points: Vector2[], baseWidth: number, taper: number): void {
      // Draw right side
      trunk.moveTo(points[0].x + baseWidth/2, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
          const t = i / (points.length - 1);
          const width = baseWidth * (1 - t * taper);
          const curr = points[i];
          const prev = points[i - 1];
          const next = points[Math.min(i + 1, points.length - 1)];
          
          const cp1x = prev.x + (curr.x - prev.x) * 0.5 + width/2;
          const cp1y = prev.y + (curr.y - prev.y) * 0.5;
          const cp2x = curr.x + (next.x - curr.x) * 0.5 + width/2;
          const cp2y = curr.y + (next.y - curr.y) * 0.5;
          
          trunk.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x + width/2, curr.y);
      }
      
      // Draw left side (in reverse)
      for (let i = points.length - 1; i >= 0; i--) {
          const t = i / (points.length - 1);
          const width = baseWidth * (1 - t * taper);
          const curr = points[i];
          const next = points[Math.max(i - 1, 0)];
          const prev = points[Math.min(i + 1, points.length - 1)];
          
          const cp1x = prev.x + (curr.x - prev.x) * 0.5 - width/2;
          const cp1y = prev.y + (curr.y - prev.y) * 0.5;
          const cp2x = curr.x + (next.x - curr.x) * 0.5 - width/2;
          const cp2y = curr.y + (next.y - curr.y) * 0.5;
          
          trunk.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x - width/2, curr.y);
      }
      
      trunk.closePath();
  }

  private addBarkTexture(plant: Plant, barkStyle: any): void {
      const trunkHeight = plant.size * 0.85;
      const details: Path2D[] = [];

      switch (barkStyle.pattern) {
          case 'ridged':
              details.push(...this.generateRidgedBark(plant, trunkHeight, barkStyle));
              break;
          case 'peeling':
              details.push(...this.generatePeelingBark(plant, trunkHeight, barkStyle));
              break;
          case 'flowing':
              details.push(...this.generateFlowingBark(plant, trunkHeight, barkStyle));
              break;
          case 'smooth':
              details.push(...this.generateSmoothBark(plant, trunkHeight, barkStyle));
              break;
      }

      plant.elements.details = details;
  }

  private updateWindEffect(time: number): void {
    this.windIntensity = (
        Math.sin(time * 0.001) * 0.3 +
        Math.sin(time * 0.0017) * 0.2 +
        Math.sin(time * 0.003) * 0.1
    ) * 0.5 + 0.5;
}

private calculateWindEffect(plant: Plant, time: number): WindEffect {
    return {
        intensity: this.windIntensity * (1 + this.noise2D(time * 0.001, plant.variation) * 0.5),
        direction: this.noise2D(time * 0.0005, 0) * Math.PI * 2,
        turbulence: this.noise3D(
            plant.position.x * 0.01,
            plant.position.y * 0.01,
            time * 0.001
        ),
        gustiness: Math.max(0, this.noise2D(time * 0.002, plant.variation))
    };
}

private applyWindEffect(plant: Plant, windEffect: WindEffect, deltaTime: number): void {
    // Base sway amount depends on plant type
    let swayAmount = 0;
    switch (plant.type) {
        case 'tree':
            swayAmount = 2;
            break;
        case 'bush':
            swayAmount = 1.5;
            break;
        case 'flower':
            swayAmount = 3;
            break;
        case 'grass':
            swayAmount = 4;
            break;
        case 'fern':
            swayAmount = 2.5;
            break;
    }

    // Apply wind to animation parameters
    plant.animation.swayAmount = swayAmount * windEffect.intensity;
    plant.animation.phase += deltaTime * 0.001 * (0.5 + windEffect.gustiness * 0.5);

    // Store wind effect for use in rendering
    plant.animation.windEffect = windEffect;
}

private updatePlant(plant: Plant, time: number, deltaTime: number): void {
  // Update wind effects
  const windEffect = this.calculateWindEffect(plant, time);
  this.applyWindEffect(plant, windEffect, deltaTime);

  // Update growth if not fully grown
  if (plant.growth < 1) {
      plant.growth += deltaTime * plant.animation.growthSpeed * 0.001;
      plant.growth = Math.min(plant.growth, 1);
  }

  // Update age
  if (plant.age !== undefined) {
      plant.age += deltaTime * 0.001;
  }

  // Update health based on conditions
  if (plant.health !== undefined) {
      const healthDecay = 0.001 * deltaTime;
      plant.health = Math.max(0, plant.health - healthDecay);
  }
}

  private calculateFoliageWindOffset(
      plant: Plant,
      layerIndex: number,
      time: number,
      windEffect: any,
      depth: number
  ): Vector2 {
      const basePhase = time * 0.001 + plant.animation.swayOffset;
      const layerPhase = basePhase + layerIndex * 0.2;
      
      const swayAmount = 2 * (1 - depth * 0.3) * windEffect.intensity;
      const swayX = Math.sin(layerPhase * windEffect.direction) * swayAmount;
      const swayY = Math.cos(layerPhase * 0.7) * swayAmount * 0.5;
      
      return {
          x: swayX + windEffect.turbulence * 5,
          y: swayY + Math.abs(windEffect.turbulence) * 3
      };
  }

  private generateTreeGeometry(plant: Plant) {
      const style = this.getTreeStyle(plant);
      if (!style) {
          this.generateOrganicTreeGeometry(plant);
          return;
      }

      plant.elements.trunk = this.generateEnhancedTrunk(plant, style.trunk);
      plant.elements.details = [];

      switch (style.foliage.shape) {
          case 'layered':
              plant.elements.foliage = this.generateLayeredFoliage(plant, style.foliage);
              break;
          case 'cascading':
              plant.elements.foliage = this.generateCascadingFoliage(plant, style.foliage);
              break;
          case 'cloud':
              plant.elements.foliage = this.generateCloudFoliage(plant, style.foliage);
              break;
          case 'wispy':
              plant.elements.foliage = this.generateWispyFoliage(plant, style.foliage);
              break;
          default:
              plant.elements.foliage = this.generateOrganicFoliage(plant, style.foliage);
      }

      // Add bark details based on style
      if (style.trunk.bark) {
          this.addBarkTexture(plant, style.trunk.bark);
      }
  }

  
  private generateCloudFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
      const foliage: Path2D[] = [];
      const centerY = plant.position.y - plant.size * 0.6;
      const baseSize = plant.size * style.size;
      const clusters = 5 + Math.floor(Math.random() * 4);

      // Generate main cloud shapes
      for (let i = 0; i < clusters; i++) {
          const cluster = new Path2D();
          const angle = (i / clusters) * Math.PI * 2;
          const distance = baseSize * 0.3 * (1 + Math.random() * 0.5);
          const centerX = plant.position.x + Math.cos(angle) * distance;
          const clusterCenterY = centerY + Math.sin(angle) * distance * 0.5;
          const size = baseSize * (0.4 + Math.random() * 0.3);

          // Generate organic cloud shape
          const points: Vector2[] = [];
          const segments = 24;
          for (let j = 0; j <= segments; j++) {
              const t = j / segments;
              const cloudAngle = t * Math.PI * 2;
              const radiusNoise = this.noise2D(cloudAngle * 2 + i, plant.variation) * 0.3;
              const radius = size * (1 + radiusNoise);

              points.push({
                  x: centerX + Math.cos(cloudAngle) * radius,
                  y: clusterCenterY + Math.sin(cloudAngle) * radius * 0.8
              });
          }

          this.createSmoothSpline(cluster, points, true);
          foliage.push(cluster);
      }

      // Add detail clusters
      const detailCount = Math.floor(clusters * 2.5);
      for (let i = 0; i < detailCount; i++) {
          const detail = new Path2D();
          const angle = Math.random() * Math.PI * 2;
          const distance = baseSize * 0.4 * (1 + Math.random() * 0.6);
          const detailX = plant.position.x + Math.cos(angle) * distance;
          const detailY = centerY + Math.sin(angle) * distance * 0.5;
          const detailSize = baseSize * 0.2 * (0.8 + Math.random() * 0.4);

          const points: Vector2[] = [];
          const segments = 16;
          for (let j = 0; j <= segments; j++) {
              const t = j / segments;
              const detailAngle = t * Math.PI * 2;
              const radiusNoise = this.noise2D(detailAngle * 3 + i, plant.variation) * 0.2;
              const radius = detailSize * (1 + radiusNoise);

              points.push({
                  x: detailX + Math.cos(detailAngle) * radius,
                  y: detailY + Math.sin(detailAngle) * radius * 0.9
              });
          }

          this.createSmoothSpline(detail, points, true);
          foliage.push(detail);
      }

      return foliage;
  }

  private generateCascadingFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
      const foliage: Path2D[] = [];
      const baseY = plant.position.y - plant.size * 0.7;
      const branchCount = Math.floor(12 + Math.random() * 6);

      // Create main crown shape
      const crown = new Path2D();
      const crownPoints: Vector2[] = this.generateCrownPoints(plant, style);
      this.createSmoothSpline(crown, crownPoints, true);
      foliage.push(crown);

      // Generate cascading branches
      for (let i = 0; i < branchCount; i++) {
          const branch = this.generateCascadingBranch(
              plant,
              i / branchCount,
              style
          );
          foliage.push(branch);
      }

      return foliage;
  }

  private generateCascadingBranch(
      plant: Plant,
      t: number,
      style: FoliageStyle
  ): Path2D {
      const branch = new Path2D();
      const angle = t * Math.PI * 2;
      const startRadius = plant.size * 0.3;
      const length = plant.size * (0.6 + Math.random() * 0.4);
      
      const startX = plant.position.x + Math.cos(angle) * startRadius;
      const startY = plant.position.y - plant.size * 0.6;
      
      branch.moveTo(startX, startY);

      const points: Vector2[] = [];
      const segments = 8;
      let currentPoint = { x: startX, y: startY };

      for (let i = 1; i <= segments; i++) {
          const segmentT = i / segments;
          const drop = segmentT * length;
          const sway = Math.sin(segmentT * Math.PI) * length * 0.3;
          const noise = this.noise2D(t * 10 + segmentT, plant.variation) * length * 0.15;

          currentPoint = {
              x: startX + sway + noise,
              y: startY + drop
          };
          points.push(currentPoint);
      }

      this.createSmoothSpline(branch, points, false);
      return branch;
  }

  private generateWispyFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
      const foliage: Path2D[] = [];
      const baseY = plant.position.y - plant.size * 0.7;
      const clusterCount = Math.floor(8 + Math.random() * 5);

      // Create delicate, wispy clusters
      for (let i = 0; i < clusterCount; i++) {
          const angle = (i / clusterCount) * Math.PI * 2;
          const distance = plant.size * (0.3 + Math.random() * 0.3);
          const clusterX = plant.position.x + Math.cos(angle) * distance;
          const clusterY = baseY + Math.sin(angle) * distance * 0.5;

          // Generate multiple wispy strands per cluster
          const strandCount = 3 + Math.floor(Math.random() * 4);
          for (let j = 0; j < strandCount; j++) {
              const strand = this.generateWispyStrand(
                  { x: clusterX, y: clusterY },
                  plant.size * 0.4,
                  plant.variation + i + j
              );
              foliage.push(strand);
          }
      }

      return foliage;
  }

  private generateWispyStrand(start: Vector2, length: number, seed: number): Path2D {
      const strand = new Path2D();
      const points: Vector2[] = [];
      const segments = 6;

      points.push(start);

      for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const angle = Math.PI * -0.5 + (Math.random() - 0.5) * 0.8;
          const segmentLength = length * (1 - t) * 0.3;
          const noise = this.noise2D(t * 5 + seed, t) * length * 0.1;

          const prev = points[points.length - 1];
          points.push({
              x: prev.x + Math.cos(angle) * segmentLength + noise,
              y: prev.y + Math.sin(angle) * segmentLength
          });
      }

      this.createSmoothSpline(strand, points, false);
      return strand;
  }


public updateZone(zone: any) {
    // Handle vegetation zone updates
    const affectedPlants = this.plants.filter(plant => 
        this.isPointInZone(plant.position, zone)
    );

    affectedPlants.forEach(plant => {
        this.updatePlantConditions(plant, zone);
    });
}

private isPointInZone(point: Vector2, zone: any): boolean {
    // Check if a point is within a vegetation zone
    const dx = point.x - zone.position.x;
    const dy = point.y - zone.position.y;
    return Math.sqrt(dx * dx + dy * dy) < zone.radius;
}

private updatePlantConditions(plant: Plant, zone: any) {
    // Update plant based on zone conditions
    plant.colors.primary.s *= zone.moisture;
    plant.colors.primary.b *= 0.8 + zone.moisture * 0.4;
    plant.animation.swayAmount *= 0.8 + zone.moisture * 0.4;
}

  createVegetationCluster(params: VegetationClusterParams) {
    const { position, slope, moisture, terrainHeight } = params;
    
    // Determine which plants can grow here based on conditions
    Object.values(this.PLANT_TYPES).forEach(plantType => {
        // Skip if conditions aren't suitable
        if (!this.isValidPlantLocation(plantType, moisture, slope)) return;
        
        // Calculate growth potential
        const potential = this.evaluateGrowthPotential(position.x, position.y, plantType.type);
        
        // Determine cluster size based on conditions
        const clusterSize = Math.floor(potential * 5) + 1;
        
        // Create cluster of plants
        for (let i = 0; i < clusterSize; i++) {
            if (Math.random() > plantType.density * potential) continue;
            
            // Add some variation to position within cluster
            const offset = {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20
            };
            
            const plantPosition = {
                x: position.x + offset.x,
                y: position.y + offset.y
            };
            
            // Create plant with type-specific variations
            this.createPlant(plantType, plantPosition);
        }
    });
}


  private generateGrassGeometry(plant: Plant) {
    const bladeCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < bladeCount; i++) {
      const blade = new Path2D();
      const baseX = plant.position.x + (Math.random() - 0.5) * plant.size * 0.5;
      const height = plant.size * (0.7 + Math.random() * 0.3);
      
      blade.moveTo(baseX, plant.position.y);
      blade.quadraticCurveTo(
        baseX + Math.sin(plant.animation.phase + i) * 10,
        plant.position.y - height * 0.6,
        baseX + Math.sin(plant.animation.phase + i) * 15,
        plant.position.y - height
      );
      
      plant.elements.foliage.push(blade);
    }
  }

private generateOrganicTreeGeometry(plant: Plant) {
  // Create a natural-looking default tree
  const defaultStyle = {
      trunk: {
          color: { h: 30, s: 25, b: 35 },
          width: 0.06,
          taper: 0.85
      },
      foliage: {
          colors: [
              { h: 120, s: 35, b: 45 },
              { h: 115, s: 40, b: 40 },
              { h: 125, s: 30, b: 35 }
          ],
          shape: 'organic',
          density: 0.8,
          size: 1.2,
          animation: {
              swayAmount: 0.3,
              swaySpeed: 0.6
          }
      }
  };

  plant.elements.trunk = this.generateStylizedTrunk(plant, defaultStyle.trunk);
  plant.elements.foliage = this.generateOrganicFoliage(plant, defaultStyle.foliage);
}

private generateStylizedTrunk(plant: Plant, trunkStyle: any): Path2D {
  const trunk = new Path2D();
  const trunkWidth = plant.size * trunkStyle.width;
  const trunkHeight = plant.size * 0.8;

  // Generate control points for natural trunk curve
  const points: Vector2[] = [];
  const segments = 15; // More segments for smoother curve

  // Calculate trunk characteristics
  const leanAngle = (Math.random() - 0.5) * 0.3;
  const bendAmount = trunkStyle.bend || 0.2;
  const twistAmount = trunkStyle.twist || 0;

  // Generate trunk points with natural variation
  for (let i = 0; i <= segments; i++) {
      const t = i / segments;

      // Create natural curve using multiple influences
      const heightInfluence = Math.sin(t * Math.PI); // Basic curve
      const bendInfluence = Math.sin(t * Math.PI * 0.5) * bendAmount; // Trunk bend
      const twistInfluence = Math.sin(t * Math.PI * 2) * twistAmount; // Trunk twist
      const noise = this.noise2D(t * 10 + plant.variation, t) * 5; // Subtle noise

      // Combine all influences
      const xOffset = (bendInfluence + twistInfluence) * trunkHeight * 0.2 + noise;
      const lean = t * Math.sin(leanAngle) * trunkHeight * 0.1;

      points.push({
          x: plant.position.x + xOffset + lean,
          y: plant.position.y - t * trunkHeight
      });
  }

  // Draw trunk outline with smooth curves
  this.drawTrunkOutline(trunk, points, trunkWidth, trunkStyle.taper);

  // Add style-specific trunk texturing here
  if (plant.style === 'BIRCH') {
      // Generate birch markings and store in plant.elements.details
      plant.elements.details = this.generateBirchMarkings(plant, points, trunkWidth, trunkStyle);
  } else if (trunkStyle.twist) {
      // Create a new Path2D for trunk details
      const trunkDetails = new Path2D();
      this.addTwistTexture(trunkDetails, points, trunkWidth, trunkStyle);
      plant.elements.details = [trunkDetails];
  } else {
      // If no special details, ensure details array is empty
      plant.elements.details = [];
  }

  return trunk;
}

private addBirchTexture(trunk: Path2D, points: Vector2[], width: number, style: any) {
  const markingCount = Math.floor(points.length * style.markingDensity || 1.2);
  
  for (let i = 0; i < markingCount; i++) {
      const t = i / markingCount;
      const index = Math.floor(t * (points.length - 1));
      const point = points[index];
      
      // Create natural marking shape
      const marking = new Path2D();
      const markingWidth = width * (1 - t * 0.3) * 0.7;
      const markingHeight = width * 0.3 * (0.8 + Math.random() * 0.4);
      
      // Add random offset and rotation
      const xOffset = (Math.random() - 0.5) * width * 0.5;
      const angle = (Math.random() - 0.5) * 0.3;
      
      // Draw curved marking
      marking.moveTo(point.x + xOffset - markingWidth/2, point.y);
      marking.quadraticCurveTo(
          point.x + xOffset,
          point.y + Math.cos(angle) * markingHeight,
          point.x + xOffset + markingWidth,
          point.y + Math.sin(angle) * markingHeight
      );
      
      trunk.addPath(marking);
  }
}

private addTwistTexture(trunk: Path2D, points: Vector2[], width: number, style: any) {
  const twistCount = Math.floor(points.length * 0.7);
  const twistAmount = style.twist;
  
  for (let i = 0; i < twistCount; i++) {
      const t = i / twistCount;
      const index = Math.floor(t * (points.length - 1));
      const point = points[index];
      
      // Create twist line
      const line = new Path2D();
      const lineWidth = width * (1 - t * 0.3);
      const twist = Math.sin(t * Math.PI * 2) * twistAmount * width;
      
      line.moveTo(point.x - lineWidth/2 + twist, point.y);
      line.quadraticCurveTo(
          point.x + twist * 0.5,
          point.y + width * 0.2,
          point.x + lineWidth/2 + twist,
          point.y
      );
      
      trunk.addPath(line);
  }
}


private generateBlossom(plant: Plant, style: any): Path2D[] {
  const blossoms: Path2D[] = [];
  const clusterCount = Math.floor(style.density * 15);
  const baseSize = plant.size * style.size;
  
  // Create main blossom silhouette
  const mainShape = this.generateOrganicFoliage(plant, {
      ...style,
      size: style.size * 0.9
  })[0];
  blossoms.push(mainShape);
  
  // Add individual blossom clusters
  for (let i = 0; i < clusterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * baseSize * 0.8;
      const size = baseSize * 0.15 * (0.8 + Math.random() * 0.4);
      
      const cluster = this.generateFlowerCluster({
          x: plant.position.x + Math.cos(angle) * distance,
          y: plant.position.y - plant.size * 0.6 + Math.sin(angle) * distance * 0.6
      }, size, style.colors);
      
      blossoms.push(cluster);
  }
  
  return blossoms;
}

private generateFlowerCluster(position: Vector2, size: number, colors: any[]): Path2D {
  const cluster = new Path2D();
  const petalCount = 5 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalSize = size * (0.8 + Math.random() * 0.4);
      
      cluster.moveTo(position.x, position.y);
      
      const cp1x = position.x + Math.cos(angle - 0.2) * petalSize * 0.5;
      const cp1y = position.y + Math.sin(angle - 0.2) * petalSize * 0.5;
      const cp2x = position.x + Math.cos(angle) * petalSize * 0.8;
      const cp2y = position.y + Math.sin(angle) * petalSize * 0.8;
      const endX = position.x + Math.cos(angle) * petalSize;
      const endY = position.y + Math.sin(angle) * petalSize;
      
      cluster.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
  }
  
  return cluster;
}

private drawEnhancedPlant(ctx: CanvasRenderingContext2D, plant: Plant, time: number): void {
  const baseTransform = this.calculatePlantTransform(plant, time);
  const windEffect = this.calculateWindEffect(plant, time);
  
  ctx.save();
  
  // Apply transformations
  this.applyPlantTransforms(ctx, plant, baseTransform, windEffect);
  
  // Draw plant elements with enhanced effects
  if (plant.elements.trunk) {
      this.drawEnhancedTrunk(ctx, plant, baseTransform);
  }
  
  this.drawEnhancedFoliage(ctx, plant, time, baseTransform, windEffect);
  
  ctx.restore();
}

private applyPlantTransforms(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  transform: any,
  windEffect: any
): void {
  const windForce = Math.sin(
      windEffect.direction + 
      plant.position.x * 0.02 + 
      plant.position.y * 0.01
  ) * windEffect.intensity * 20;

  const turbulence = windEffect.turbulence * 10 * plant.variation;
  
  // Apply transformations in correct order
  ctx.translate(plant.position.x, plant.position.y);
  ctx.scale(transform.growth, transform.growth);
  ctx.rotate(windForce * 0.02 + turbulence * 0.01);
  ctx.translate(-plant.position.x, -plant.position.y);
  ctx.translate(
      windForce + turbulence, 
      Math.sin(windForce * 0.5) * 5
  );
}

private drawEnhancedTrunk(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  transform: any
): void {
  if (!plant.elements.trunk) return;

  ctx.save();
  
  const style = this.getTreeStyle(plant);
  const gradient = this.createTrunkGradient(ctx, plant, 
      style?.trunk.color || plant.colors.detail
  );

  // Add enhanced shadows based on transform
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = transform.sway.x * 0.5;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = gradient;
  ctx.fill(plant.elements.trunk);

  // Draw bark details with proper blending
  if (plant.elements.details.length > 0) {
      ctx.globalCompositeOperation = 'multiply';
      plant.elements.details.forEach(detail => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.fill(detail);
      });
  }

  ctx.restore();
}

private drawEnhancedFoliage(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  time: number,
  baseTransform: any,
  windEffect: any
): void {
  const style = this.getTreeStyle(plant);
  if (!style) return;

  const foliageCount = plant.elements.foliage.length;
  
  plant.elements.foliage.forEach((foliage, i) => {
      ctx.save();
      
      const depth = i / foliageCount;
      const windOffset = this.calculateFoliageWindOffset(
          plant, i, time, windEffect, depth
      );

      ctx.translate(windOffset.x, windOffset.y);

      const gradient = this.createEnhancedFoliageGradient(
          ctx, plant, style, depth
      );
      
      this.applyFoliageEffects(ctx, depth, baseTransform);
      
      ctx.fillStyle = gradient;
      ctx.fill(foliage);
      
      if (i === foliageCount - 1) {
          this.addFoliageHighlights(ctx, foliage, style);
      }
      
      ctx.restore();
  });
}

private clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

private createEnhancedFoliageGradient(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  style: TreeStyle,
  depth: number
): CanvasGradient {
  const color = style.foliage.colors[0];
  const size = plant.size * style.foliage.size;
  
  const gradient = ctx.createRadialGradient(
      plant.position.x, plant.position.y - plant.size * 0.6,
      0,
      plant.position.x, plant.position.y - plant.size * 0.6,
      size
  );
  
  const opacity = this.clampValue(0.9 - depth * 0.15, 0, 1);
  const [h, s, b] = this.normalizeColor(color);
  
  gradient.addColorStop(0, `hsla(${h}, ${s}%, ${b + 8}%, ${opacity})`);
  gradient.addColorStop(0.3, `hsla(${h}, ${s}%, ${b + 4}%, ${opacity * 0.95})`);
  gradient.addColorStop(0.7, `hsla(${h}, ${s}%, ${b}%, ${opacity * 0.9})`);
  gradient.addColorStop(1, `hsla(${h}, ${s}%, ${b - 5}%, ${opacity * 0.8})`);
  
  return gradient;
}

private drawStyledPlant(ctx: CanvasRenderingContext2D, plant: Plant, style: TreeStyle, time: number) {
  if (plant.style === 'WHITE_BIRCH') {
      // Draw birch trunk
      if (plant.elements.trunk) {
          // White base
          ctx.fillStyle = 'rgba(245, 245, 245, 0.95)';
          ctx.fill(plant.elements.trunk);

          // Dark markings
          ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
          plant.elements.details.forEach(detail => {
              ctx.fill(detail);
          });
      }

      // Draw red foliage
      plant.elements.foliage.forEach((foliage, i) => {
          const color = style.foliage.colors[i % style.foliage.colors.length];
          ctx.fillStyle = `hsla(${color[0]}, ${color[1]}%, ${color[2]}%, 0.9)`;
          ctx.fill(foliage);
      });
  }
}

private drawDefaultPlant(ctx: CanvasRenderingContext2D, plant: Plant, time: number) {
  switch (plant.type) {
      case 'tree':
          this.drawDefaultTree(ctx, plant);
          break;
      case 'bush':
          this.drawDefaultBush(ctx, plant);
          break;
      case 'flower':
          this.drawDefaultFlower(ctx, plant);
          break;
      case 'grass':
          this.drawDefaultGrass(ctx, plant);
          break;
      case 'fern':
          this.drawDefaultFern(ctx, plant);
          break;
  }
}

private drawDefaultTree(ctx: CanvasRenderingContext2D, plant: Plant) {
  // Draw trunk
  if (plant.elements.trunk) {
      ctx.fillStyle = this.createColorString(plant.colors.detail);
      ctx.fill(plant.elements.trunk);
  }

  // Draw foliage
  plant.elements.foliage.forEach((foliage, index) => {
      const depth = index / plant.elements.foliage.length;
      const gradient = this.createFoliageGradient(ctx, plant, plant.colors.primary, depth);
      ctx.fillStyle = gradient;
      ctx.fill(foliage);
  });
}

private drawDefaultBush(ctx: CanvasRenderingContext2D, plant: Plant) {
  plant.elements.foliage.forEach((foliage, index) => {
      const depth = index / plant.elements.foliage.length;
      const gradient = this.createFoliageGradient(ctx, plant, plant.colors.primary, depth);
      ctx.fillStyle = gradient;
      ctx.fill(foliage);
  });
}

private drawDefaultFlower(ctx: CanvasRenderingContext2D, plant: Plant) {
  // Draw petals
  const petalCount = plant.elements.foliage.length - 1;
  plant.elements.foliage.slice(0, -1).forEach((petal, i) => {
      const gradient = this.createPetalGradient(ctx, plant, plant.colors.primary);
      ctx.fillStyle = gradient;
      ctx.fill(petal);
  });

  // Draw center
  if (plant.elements.foliage.length > 0) {
      const center = plant.elements.foliage[plant.elements.foliage.length - 1];
      ctx.fillStyle = this.createColorString(plant.colors.detail);
      ctx.fill(center);
  }
}

private drawDefaultGrass(ctx: CanvasRenderingContext2D, plant: Plant) {
  ctx.fillStyle = this.createColorString(plant.colors.primary);
  plant.elements.foliage.forEach(blade => {
      ctx.fill(blade);
  });
}

private drawDefaultFern(ctx: CanvasRenderingContext2D, plant: Plant) {
  ctx.fillStyle = this.createColorString(plant.colors.primary);
  plant.elements.foliage.forEach(frond => {
      ctx.stroke(frond);
  });
}

private createPetalGradient(ctx: CanvasRenderingContext2D, plant: Plant, color: HSLColor): CanvasGradient {
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, plant.size);
  gradient.addColorStop(0, this.createColorString(color, 1));
  gradient.addColorStop(1, this.createColorString(color, 0.8));
  return gradient;
}

private createColorString(color: HSLColor, alpha: number = 1): string {
  return `hsla(${color[0]}, ${color[1]}%, ${color[2]}%, ${alpha})`;
}

private createTrunkGradient(ctx: CanvasRenderingContext2D, plant: Plant, color: HSLColor): CanvasGradient {
  const gradient = ctx.createLinearGradient(
      -plant.size * 0.1, 0,
      plant.size * 0.1, -plant.size
  );
  
  gradient.addColorStop(0, this.createColorString(color, 0.95));
  gradient.addColorStop(0.3, this.createColorString([color[0], color[1], color[2] - 3], 0.95));
  gradient.addColorStop(0.7, this.createColorString([color[0], color[1], color[2] - 6], 0.95));
  gradient.addColorStop(1, this.createColorString([color[0], color[1], color[2] - 10], 0.95));
  
  return gradient;
}

// Seasonal and Time-based Effects
private applySeasonalEffects(plant: Plant, time: number): void {
  const seasonalTransition = Math.sin(time * 0.0001) * 0.5 + 0.5;
  const colors = plant.colors;

  switch (this.season) {
      case 'autumn':
          this.applyAutumnEffects(colors, seasonalTransition);
          break;
      case 'winter':
          this.applyWinterEffects(colors, seasonalTransition);
          break;
      case 'spring':
          this.applySpringEffects(colors, seasonalTransition);
          break;
  }
}

private applyAutumnEffects(colors: any, transition: number): void {
  colors.primary[0] = this.lerpColor(120, 30, transition);  // Hue
  colors.primary[1] = this.lerpColor(40, 80, transition);   // Saturation
  colors.primary[2] = this.lerpColor(35, 45, transition);   // Brightness
}

private applyWinterEffects(colors: any, transition: number): void {
  colors.primary[1] *= (1 - transition * 0.5);  // Reduce saturation
  colors.primary[2] += transition * 20;         // Increase brightness
}

private applySpringEffects(colors: any, transition: number): void {
  colors.primary[0] = this.lerpColor(120, 90, transition);  // Hue
  colors.primary[1] = this.lerpColor(30, 60, transition);   // Saturation
  colors.primary[2] = this.lerpColor(35, 50, transition);   // Brightness
}

private lerpColor(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

private createArtisticGradient(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  colors: Array<{h: number, s: number, b: number}>,
  depth: number
): CanvasGradient {
  const centerX = plant.position.x;
  const centerY = plant.position.y - plant.size * 0.6;
  const radius = plant.size * 1.2;

  // Create dynamic gradient center based on time of day
  const gradient = ctx.createRadialGradient(
      centerX - radius * 0.2, centerY - radius * 0.2, 0,
      centerX, centerY, radius
  );

  // Add sophisticated color stops
  const baseOpacity = Math.max(0.4, 1 - depth * 0.15);
  const color1 = colors[0];
  const color2 = colors[1];
  const color3 = colors[2];

  gradient.addColorStop(0, `hsla(${color1.h}, ${color1.s}%, ${color1.b}%, ${baseOpacity})`);
  gradient.addColorStop(0.3, `hsla(${color2.h}, ${color2.s}%, ${color2.b}%, ${baseOpacity * 0.9})`);
  gradient.addColorStop(0.7, `hsla(${color2.h}, ${color2.s}%, ${Math.max(0, color2.b - 5)}%, ${baseOpacity * 0.8})`);
  gradient.addColorStop(1, `hsla(${color3.h}, ${color3.s}%, ${Math.max(0, color3.b - 10)}%, ${baseOpacity * 0.7})`);

  return gradient;
}

private drawStylizedTrunk(ctx: CanvasRenderingContext2D, plant: Plant) {
  const style = this.TREE_STYLES[plant.style];
  if (!style?.trunk) return;

  ctx.save();

  // Create sophisticated trunk gradient
  const gradient = ctx.createLinearGradient(
      plant.position.x - plant.size * 0.1,
      plant.position.y,
      plant.position.x + plant.size * 0.1,
      plant.position.y - plant.size
  );

  const { color } = style.trunk;
  gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.b}%, 0.95)`);
  gradient.addColorStop(0.4, `hsla(${color.h}, ${color.s}%, ${color.b - 5}%, 0.9)`);
  gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${Math.max(0, color.b - 10)}%, 0.95)`);

  // Add trunk shadows for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = gradient;
  ctx.fill(plant.elements.trunk);

  // Add style-specific details
  if (plant.style === 'BIRCH') {
      this.drawBirchDetails(ctx, plant);
  } else if (style.trunk.twist) {
      this.drawTrunkTexture(ctx, plant, style);
  }

  ctx.restore();
}

private drawBirchDetails(ctx: CanvasRenderingContext2D, plant: Plant) {
  const style = this.TREE_STYLES.BIRCH;
  const { markings } = style.trunk;
  
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `hsla(${markings.h}, ${markings.s}%, ${markings.b}%, 0.3)`;
  
  plant.elements.details.forEach(marking => {
      ctx.fill(marking);
  });
  
  ctx.restore();
}

private drawTrunkTexture(ctx: CanvasRenderingContext2D, plant: Plant, style: any) {
  const textureLines = 8;
  const trunkHeight = plant.size * 0.8;
  
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = `hsla(${style.trunk.color.h}, ${style.trunk.color.s}%, ${Math.max(0, style.trunk.color.b - 20)}%, 0.1)`;
  ctx.lineWidth = 1;

  for (let i = 0; i < textureLines; i++) {
      const line = new Path2D();
      const y = plant.position.y - (i / textureLines) * trunkHeight;
      const twist = Math.sin(i * 0.5) * style.trunk.twist * plant.size;
      
      line.moveTo(plant.position.x - plant.size * 0.1 + twist, y);
      line.quadraticCurveTo(
          plant.position.x + twist * 0.5, y - 10,
          plant.position.x + plant.size * 0.1 + twist, y
      );
      
      ctx.stroke(line);
  }
  
  ctx.restore();
}

private generateBirchMarkings(plant: Plant, height: number): Path2D[] {
  const markings: Path2D[] = [];
  const segmentHeight = 20;
  const numSegments = Math.floor(height / segmentHeight);

  for (let i = 0; i < numSegments; i++) {
      // Create horizontal bands
      const marking = new Path2D();
      const y = -i * segmentHeight;
      const width = plant.size * 0.1;
      
      // Random horizontal stripes
      marking.moveTo(-width/2, y);
      marking.lineTo(width/2, y);
      marking.lineTo(width/2, y - 5);
      marking.lineTo(-width/2, y - 5);
      marking.closePath();

      markings.push(marking);

      // Add some vertical connecting marks
      if (Math.random() < 0.5) {
          const vertMark = new Path2D();
          const x = (Math.random() - 0.5) * width;
          vertMark.moveTo(x, y);
          vertMark.lineTo(x + 5, y - segmentHeight/2);
          vertMark.lineTo(x, y - segmentHeight);
          markings.push(vertMark);
      }
  }

  return markings;
}

private generateOrganicFoliage(plant: Plant, style: any): Path2D[] {
  const foliage: Path2D[] = [];
  const centerY = plant.position.y - plant.size * 0.6;
  const baseSize = plant.size * style.size;

  // Create main silhouette shape
  const mainShape = new Path2D();
  const points: Vector2[] = [];
  const segments = 32; // More segments for smoother curves

  // Generate organic base shape using multiple noise frequencies
  for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      
      // Combine multiple noise frequencies for more natural variation
      let radius = baseSize * 0.8;
      for (let freq = 1; freq <= 3; freq++) {
          const noise = this.noise2D(
              Math.cos(angle) * freq + plant.variation * 10,
              Math.sin(angle) * freq + plant.variation * 10
          );
          radius += baseSize * 0.3 * noise / freq;
      }

      // Add directional bias for more interesting shapes
      const directionalBias = Math.sin(angle * 2) * 0.3;
      radius *= (1 + directionalBias);

      points.push({
          x: plant.position.x + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.6 // Flatten vertically
      });
  }

  // Create smooth curve through points using Catmull-Rom spline
  this.createSmoothSpline(mainShape, points, true);
  foliage.push(mainShape);

  // Add internal detail layers
  const detailLayers = 3 + Math.floor(Math.random() * 3);
  for (let layer = 0; layer < detailLayers; layer++) {
      const detail = new Path2D();
      const layerPoints: Vector2[] = [];
      const layerSize = baseSize * (0.7 - layer * 0.15);
      const layerOffset = {
          x: (Math.random() - 0.5) * baseSize * 0.2,
          y: -layer * baseSize * 0.15
      };

      // Generate detailed internal shapes
      for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const noise = this.noise2D(
              angle * 3 + layer + plant.variation,
              layer * 2 + plant.variation
          );
          const radius = layerSize * (0.8 + noise * 0.3);

          layerPoints.push({
              x: plant.position.x + layerOffset.x + Math.cos(angle) * radius,
              y: centerY + layerOffset.y + Math.sin(angle) * radius * 0.5
          });
      }

      this.createSmoothSpline(detail, layerPoints, true);
      foliage.push(detail);
  }

  // Add small detail clusters for texture
  const clusterCount = Math.floor(plant.size / 20);
  for (let i = 0; i < clusterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * baseSize * 0.7;
      const clusterSize = plant.size * 0.1 * (1 + Math.random());
      
      const cluster = this.generateDetailCluster({
          x: plant.position.x + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance * 0.6
      }, clusterSize);
      
      foliage.push(cluster);
  }

  return foliage;
}

private createSmoothSpline(path: Path2D, points: Vector2[], closed: boolean = false): void {
  if (points.length < 2) return;

  const tension = 0.3; // Adjust for tighter/looser curves
  path.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[(i - 1 + points.length) % points.length];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[(i + 2) % points.length];

      // Catmull-Rom to Bézier conversion
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }

  if (closed) {
      path.closePath();
  }
}

private generateDetailCluster(position: Vector2, size: number): Path2D {
  const cluster = new Path2D();
  const points: Vector2[] = [];
  const segments = 12;

  // Create organic cluster shape
  for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noise = this.noise2D(angle * 5, size) * 0.4;
      const radius = size * (0.8 + noise);

      points.push({
          x: position.x + Math.cos(angle) * radius,
          y: position.y + Math.sin(angle) * radius * 0.7
      });
  }

  this.createSmoothSpline(cluster, points, true);
  return cluster;
}

private generatePetalFoliage(plant: Plant, style: any): Path2D[] {
  const foliage: Path2D[] = [];
  const petalCount = 12;
  const layers = 3;
  
  for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < petalCount; i++) {
          const petal = new Path2D();
          const angle = (i / petalCount) * Math.PI * 2;
          const layerOffset = layer * plant.size * 0.2;
          const size = plant.size * style.size * (1 - layer * 0.2);
          
          // Create petal-like shape
          const centerX = plant.position.x;
          const centerY = plant.position.y - plant.size * 0.6 - layerOffset;
          
          const petalLength = size * 0.4;
          const petalWidth = size * 0.2;
          
          // Create rounded petal shape
          petal.moveTo(centerX, centerY);
          petal.bezierCurveTo(
              centerX + Math.cos(angle - 0.2) * petalWidth,
              centerY + Math.sin(angle - 0.2) * petalWidth,
              centerX + Math.cos(angle) * petalLength,
              centerY + Math.sin(angle) * petalLength,
              centerX + Math.cos(angle + 0.2) * petalWidth,
              centerY + Math.sin(angle + 0.2) * petalWidth
          );
          petal.closePath();
          
          foliage.push(petal);
      }
  }
  
  return foliage;
}

private getPlantColors(type: PlantDefinition['type']): Plant['colors'] {
  const baseColors = {
      tree: {
          primary: [120, 35, 32] as HSLColor,
          secondary: [120, 30, 28] as HSLColor,
          detail: [30, 35, 28] as HSLColor
      },
      bush: {
          primary: [115, 40, 28] as HSLColor,
          secondary: [115, 35, 24] as HSLColor,
          detail: [115, 30, 20] as HSLColor
      },
      flower: {
          primary: [0, 75, 65] as HSLColor,
          secondary: [120, 35, 32] as HSLColor,
          detail: [120, 30, 28] as HSLColor
      },
      grass: {
          primary: [110, 45, 32] as HSLColor,
          secondary: [110, 40, 28] as HSLColor,
          detail: [110, 35, 24] as HSLColor
      },
      fern: {
          primary: [125, 40, 28] as HSLColor,
          secondary: [125, 35, 24] as HSLColor,
          detail: [125, 30, 20] as HSLColor
      }
  };
  
  const base = baseColors[type];
  const variation = Math.random() * 6 - 3;
  
  return {
      primary: [
          base.primary[0] + variation,
          base.primary[1] + (Math.random() - 0.5) * 5,
          base.primary[2] + (Math.random() - 0.5) * 3
      ] as HSLColor,
      secondary: [
          base.secondary[0] + variation,
          base.secondary[1] + (Math.random() - 0.5) * 5,
          base.secondary[2] + (Math.random() - 0.5) * 3
      ] as HSLColor,
      detail: [
          base.detail[0],
          base.detail[1] + (Math.random() - 0.5) * 5,
          base.detail[2] + (Math.random() - 0.5) * 3
      ] as HSLColor
  };
}

// Helper function to create HSL color string
private createHSLString(color: HSLColor, opacity: number = 1): string {
  const [h, s, b] = color;
  return `hsla(${h}, ${s}%, ${b}%, ${opacity})`;
}

// Update the trunk color method to use consistent color format
private getTrunkColor(plant: Plant): string {
  const color = plant.colors.detail;
  return this.createHSLString(color, 0.9);
}

private drawTreeStyle(ctx: CanvasRenderingContext2D, plant: Plant) {
  if (!plant.style || !this.TREE_STYLES[plant.style]) return false;
  
  const style = this.TREE_STYLES[plant.style];
  const trunkColor = style.trunk.color;
  
  // Draw trunk with enhanced shading
  const trunkGradient = ctx.createLinearGradient(
      plant.position.x - plant.size * 0.1, plant.position.y,
      plant.position.x + plant.size * 0.1, plant.position.y - plant.size
  );
  
  trunkGradient.addColorStop(0, `hsla(${trunkColor.h}, ${trunkColor.s}%, ${trunkColor.b}%, 0.95)`);
  trunkGradient.addColorStop(1, `hsla(${trunkColor.h}, ${trunkColor.s}%, ${Math.max(trunkColor.b - 5, 0)}%, 0.95)`);
  
  ctx.fillStyle = trunkGradient;
  ctx.fill(plant.elements.trunk);
  
  // Draw markings for birch trees
  if (plant.style === 'BIRCH' && plant.elements.details.length > 0) {
      const markingColor = this.TREE_STYLES.BIRCH.trunk.markings;
      ctx.fillStyle = `hsla(${markingColor.h}, ${markingColor.s}%, ${markingColor.b}%, 0.4)`;
      plant.elements.details.forEach(marking => {
          ctx.fill(marking);
      });
  }
  
  return true;
}

private drawTrunk(ctx: CanvasRenderingContext2D, plant: Plant, transform: any) {
  const style = plant.style ? this.TREE_STYLES[plant.style] : null;
  
  ctx.save();
  
  // Add trunk shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = transform.sway.x * 0.5;
  ctx.shadowOffsetY = 2;

  if (style) {
      // Draw styled trunk
      const trunkGradient = this.createTrunkGradient(ctx, plant, style.trunk.color);
      ctx.fillStyle = trunkGradient;
      ctx.fill(plant.elements.trunk);

      // Add style-specific details
      if (plant.style === 'BIRCH') {
          this.drawBirchMarkings(ctx, plant, style);
      }
  } else {
      // Draw default trunk
      const defaultGradient = this.createTrunkGradient(ctx, plant, plant.colors.detail);
      ctx.fillStyle = defaultGradient;
      ctx.fill(plant.elements.trunk);
  }

  ctx.restore();
}

private drawBirchMarkings(ctx: CanvasRenderingContext2D, plant: Plant, style: any) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const markingColor = style.trunk.markings;
  ctx.fillStyle = `hsla(${markingColor.h}, ${markingColor.s}%, ${markingColor.b}%, 0.3)`;
  
  plant.elements.details.forEach(marking => {
      ctx.fill(marking);
      
      // Add subtle highlight above each marking
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `hsla(0, 0%, 100%, 0.1)`;
      ctx.transform(1, 0, 0, 1, 0, -1);
      ctx.fill(marking);
  });
  
  ctx.restore();
}


private addFoliageDetails(ctx: CanvasRenderingContext2D, foliage: Path2D, style: any) {
  if (!style) return;
  
  // Add subtle highlights
  ctx.globalCompositeOperation = 'overlay';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke(foliage);
}

  
private generateLayeredFoliage(plant: Plant, style: any): Path2D[] {
  const foliage: Path2D[] = [];
  const layers = 4 + Math.floor(Math.random() * 3);
  const baseSize = plant.size * style.size;

  for (let i = 0; i < layers; i++) {
      const layer = new Path2D();
      const layerSize = baseSize * (0.6 + i * 0.15);
      const centerY = -plant.size * 0.6 - i * plant.size * 0.25; // Adjusted

      // Create more organic layer shape
      const points: Vector2[] = [];
      const segments = 24;
      const startAngle = Math.random() * Math.PI * 2;

      for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2 + startAngle;
          const baseRadius = layerSize * (0.7 + Math.sin(angle * 2) * 0.1);
          const noise = this.noise2D(angle * 3 + i + plant.variation, i) * layerSize * 0.3;
          const radius = baseRadius + noise;

          points.push({
              x: Math.cos(angle) * radius,
              y: centerY + Math.sin(angle) * radius * 0.4
          });
      }
      
      // Create smooth curve through points
      points.forEach((point, idx) => {
          if (idx === 0) {
              layer.moveTo(point.x, point.y);
          } else {
              const prev = points[idx - 1];
              const curr = point;
              const next = points[Math.min(idx + 1, points.length - 1)];
              
              const cp1 = {
                  x: prev.x + (curr.x - prev.x) * 0.5,
                  y: prev.y + (curr.y - prev.y) * 0.5
              };
              const cp2 = {
                  x: curr.x + (next.x - curr.x) * 0.5,
                  y: curr.y + (next.y - curr.y) * 0.5
              };
              
              layer.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
          }
      });
      
      layer.closePath();
      foliage.push(layer);
  }
  
  return foliage;
}

private generateDroopingFoliage(plant: Plant, style: any): Path2D[] {
  const foliage: Path2D[] = [];
  const branchCount = 8 + Math.floor(Math.random() * 4);
  const layers = 3;
  
  // Create main crown first
  const crown = new Path2D();
  const crownSize = plant.size * style.size * 0.8;
  const crownY = plant.position.y - plant.size * 0.7;
  
  // Create crown shape
  const crownPoints: Vector2[] = [];
  const segments = 20;
  
  for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const baseRadius = crownSize * (0.8 + Math.sin(angle * 2) * 0.1);
      const noise = this.noise2D(angle * 3 + plant.variation, 0) * crownSize * 0.2;
      const radius = baseRadius + noise;
      
      crownPoints.push({
          x: plant.position.x + Math.cos(angle) * radius,
          y: crownY + Math.sin(angle) * radius * 0.6
      });
  }
  
  // Create smooth crown
  crownPoints.forEach((point, idx) => {
      if (idx === 0) {
          crown.moveTo(point.x, point.y);
      } else {
          const prev = crownPoints[idx - 1];
          const curr = point;
          const next = crownPoints[Math.min(idx + 1, crownPoints.length - 1)];
          
          const cp1 = {
              x: prev.x + (curr.x - prev.x) * 0.5,
              y: prev.y + (curr.y - prev.y) * 0.5
          };
          const cp2 = {
              x: curr.x + (next.x - curr.x) * 0.5,
              y: curr.y + (next.y - curr.y) * 0.5
          };
          
          crown.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
      }
  });
  
  crown.closePath();
  foliage.push(crown);
  
  // Add drooping branches
  for (let i = 0; i < branchCount; i++) {
      const branch = new Path2D();
      const angle = (i / branchCount) * Math.PI * 2;
      const branchStart = {
          x: plant.position.x + Math.cos(angle) * crownSize * 0.5,
          y: crownY + Math.sin(angle) * crownSize * 0.4
      };
      
      // Create drooping curve
      branch.moveTo(branchStart.x, branchStart.y);
      
      const length = plant.size * (0.6 + Math.random() * 0.4);
      const controlPoint1 = {
          x: branchStart.x + Math.cos(angle) * length * 0.5,
          y: branchStart.y + length * 0.2
      };
      const controlPoint2 = {
          x: branchStart.x + Math.cos(angle) * length * 0.8,
          y: branchStart.y + length * 0.6
      };
      const endPoint = {
          x: branchStart.x + Math.cos(angle) * length,
          y: branchStart.y + length
      };
      
      branch.bezierCurveTo(
          controlPoint1.x, controlPoint1.y,
          controlPoint2.x, controlPoint2.y,
          endPoint.x, endPoint.y
      );
      
      // Add width to branch
      const width = length * 0.1;
      branch.lineTo(endPoint.x + width, endPoint.y);
      branch.bezierCurveTo(
          controlPoint2.x + width, controlPoint2.y,
          controlPoint1.x + width, controlPoint1.y,
          branchStart.x + width, branchStart.y
      );
      branch.closePath();
      
      foliage.push(branch);
  }
  
  return foliage;
}

private generateDefaultFoliage(plant: Plant, style: any): Path2D[] {
  // Fallback to regular layered foliage if style not recognized
  return this.generateLayeredFoliage(plant, {
      ...style,
      size: 1
  });
}

private generateRidgedBark(plant: Plant, height: number, roughness: number): Path2D[] {
  const ridges: Path2D[] = [];
  const ridgeCount = Math.floor(height / (8 - roughness * 4));
  
  for (let i = 0; i < ridgeCount; i++) {
      const ridge = new Path2D();
      const y = -i * (height / ridgeCount);
      const width = plant.size * 0.1;
      
      const points: Vector2[] = [];
      const segments = 8;
      
      for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const noise = this.noise2D(t * 10 + i, y) * roughness * 5;
          points.push({
              x: (t - 0.5) * width + noise,
              y: y + noise * 0.5
          });
      }
      
      this.createSmoothSpline(ridge, points, false);
      ridges.push(ridge);
  }
  
  return ridges;
}

private generatePeelingBark(plant: Plant, height: number, roughness: number): Path2D[] {
  const peels: Path2D[] = [];
  const peelCount = Math.floor(height / (15 - roughness * 5));
  
  for (let i = 0; i < peelCount; i++) {
      const peel = new Path2D();
      const y = -i * (height / peelCount);
      const width = plant.size * 0.08;
      const peelHeight = 10 + Math.random() * 15 * roughness;
      
      const curlStrength = 0.3 + Math.random() * 0.5 * roughness;
      const points: Vector2[] = [];
      
      for (let j = 0; j <= 10; j++) {
          const t = j / 10;
          const curl = Math.sin(t * Math.PI) * curlStrength;
          const noise = this.noise2D(t * 5 + i, y) * roughness * 2;
          
          points.push({
              x: width * curl + noise,
              y: y + t * peelHeight
          });
      }
      
      this.createSmoothSpline(peel, points, false);
      peels.push(peel);
  }
  
  return peels;
}

private generateFlowingBark(plant: Plant, height: number, roughness: number): Path2D[] {
  const lines: Path2D[] = [];
  const lineCount = Math.floor(height / (10 - roughness * 3));
  
  for (let i = 0; i < lineCount; i++) {
      const line = new Path2D();
      const startY = -i * (height / lineCount);
      const length = 20 + Math.random() * 30 * roughness;
      
      const points: Vector2[] = [];
      for (let j = 0; j <= 8; j++) {
          const t = j / 8;
          const noise = this.noise2D(t * 8 + i, startY) * roughness * 4;
          points.push({
              x: noise,
              y: startY + t * length + noise * 0.5
          });
      }
      
      this.createSmoothSpline(line, points, false);
      lines.push(line);
  }
  
  return lines;
}

private generateSmoothBark(plant: Plant, height: number, roughness: number): Path2D[] {
  const marks: Path2D[] = [];
  const markCount = Math.floor(height / (20 - roughness * 5));
  
  for (let i = 0; i < markCount; i++) {
      const mark = new Path2D();
      const y = -i * (height / markCount);
      const width = plant.size * 0.06 * (0.8 + Math.random() * 0.4);
      const noise = this.noise2D(i, y) * roughness * 2;
      
      mark.moveTo(-width/2 + noise, y);
      mark.quadraticCurveTo(
          noise * 0.5, y + noise * 0.5,
          width/2 + noise, y
      );
      
      marks.push(mark);
  }
  
  return marks;
}

private generateBushGeometry(plant: Plant): void {
  // Create multiple foliage clusters
  const clusterCount = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < clusterCount; i++) {
      const cluster = new Path2D();
      const clusterSize = plant.size * (0.6 + Math.random() * 0.4);
      const offset = {
          x: (Math.random() - 0.5) * plant.size * 0.5,
          y: -Math.random() * plant.size * 0.3
      };
      
      // Create organic bush shape with multiple noise frequencies
      const points: Vector2[] = [];
      const segments = 24;
      
      for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          let radius = clusterSize * 0.8;
          
          // Add varied noise frequencies
          radius *= 1 + this.noise2D(angle * 3 + i + plant.variation, 0) * 0.3;
          radius *= 1 + this.noise2D(angle * 7 + i + plant.variation, 1) * 0.2;
          radius *= 1 + this.noise2D(angle * 13 + i + plant.variation, 2) * 0.1;
          
          points.push({
              x: plant.position.x + offset.x + Math.cos(angle) * radius,
              y: plant.position.y + offset.y + Math.sin(angle) * radius * 0.8
          });
      }
      
      this.createSmoothSpline(cluster, points, true);
      plant.elements.foliage.push(cluster);
  }

  // Add detail elements for texture
  this.generateBushDetails(plant);
}

private generateBushDetails(plant: Plant): void {
  const detailCount = Math.floor(plant.size / 5);
  for (let i = 0; i < detailCount; i++) {
      const detail = new Path2D();
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * plant.size * 0.4;
      const length = plant.size * 0.1 * (0.5 + Math.random() * 0.5);
      
      const startX = plant.position.x + Math.cos(angle) * distance;
      const startY = plant.position.y + Math.sin(angle) * distance;
      
      // Create small branch-like details
      detail.moveTo(startX, startY);
      detail.quadraticCurveTo(
          startX + Math.cos(angle) * length * 0.5,
          startY + Math.sin(angle) * length * 0.5 - length * 0.2,
          startX + Math.cos(angle) * length,
          startY + Math.sin(angle) * length
      );
      
      plant.elements.details.push(detail);
  }
}

private generateBarkDetails(plant: Plant, barkStyle: BarkStyle): Path2D[] {
  const trunkHeight = plant.size * 0.85;
  const details: Path2D[] = [];

  switch (barkStyle.pattern) {
      case 'ridged':
          details.push(...this.generateRidgedBark(plant, trunkHeight, barkStyle.roughness));
          break;
      case 'peeling':
          details.push(...this.generatePeelingBark(plant, trunkHeight, barkStyle.roughness));
          break;
      case 'flowing':
          details.push(...this.generateFlowingBark(plant, trunkHeight, barkStyle.roughness));
          break;
      case 'smooth':
          details.push(...this.generateSmoothBark(plant, trunkHeight, barkStyle.roughness));
          break;
  }

  return details;
}

private generateEnhancedBushFoliage(plant: Plant): Path2D[] {
  const foliage: Path2D[] = [];
  const clusterCount = 3 + Math.floor(Math.random() * 4);
  const baseSize = plant.size * 0.7;

  for (let i = 0; i < clusterCount; i++) {
      const cluster = new Path2D();
      const offset = {
          x: (Math.random() - 0.5) * plant.size * 0.5,
          y: -Math.random() * plant.size * 0.3
      };

      // Create organic bush shape
      const points: Vector2[] = [];
      const segments = 24;

      for (let j = 0; j <= segments; j++) {
          const angle = (j / segments) * Math.PI * 2;
          let radius = baseSize * (0.8 + Math.random() * 0.4);
          
          // Add natural variation
          radius *= 1 + this.noise2D(angle * 3 + i, plant.variation) * 0.3;
          radius *= 1 + this.noise2D(angle * 7 + i, plant.variation) * 0.2;

          points.push({
              x: offset.x + Math.cos(angle) * radius,
              y: offset.y + Math.sin(angle) * radius * 0.8
          });
      }

      this.createSmoothSpline(cluster, points, true);
      foliage.push(cluster);
  }

  return foliage;
}

private generateEnhancedFlowerFoliage(plant: Plant): Path2D[] {
  const foliage: Path2D[] = [];
  const petalCount = 5 + Math.floor(Math.random() * 4);
  const layerCount = 2;

  for (let layer = 0; layer < layerCount; layer++) {
      for (let i = 0; i < petalCount; i++) {
          const petal = new Path2D();
          const angle = (i / petalCount) * Math.PI * 2 + layer * (Math.PI / petalCount);
          const size = plant.size * (1 - layer * 0.2);

          // Create more natural petal shape
          petal.moveTo(0, 0);
          
          const cp1x = Math.cos(angle - 0.3) * size * 0.5;
          const cp1y = Math.sin(angle - 0.3) * size * 0.5;
          const cp2x = Math.cos(angle) * size * 0.8;
          const cp2y = Math.sin(angle) * size * 0.8;
          const endX = Math.cos(angle) * size;
          const endY = Math.sin(angle) * size;

          petal.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
          petal.bezierCurveTo(
              cp2x + Math.cos(angle + Math.PI/2) * size * 0.1,
              cp2y + Math.sin(angle + Math.PI/2) * size * 0.1,
              cp1x + Math.cos(angle + Math.PI/2) * size * 0.05,
              cp1y + Math.sin(angle + Math.PI/2) * size * 0.05,
              0, 0
          );

          foliage.push(petal);
      }
  }

  // Add center
  const center = new Path2D();
  center.arc(0, 0, plant.size * 0.15, 0, Math.PI * 2);
  foliage.push(center);

  return foliage;
}

private generateEnhancedGrassFoliage(plant: Plant): Path2D[] {
  const foliage: Path2D[] = [];
  const bladeCount = 5 + Math.floor(Math.random() * 5);

  for (let i = 0; i < bladeCount; i++) {
      const blade = new Path2D();
      const offset = (Math.random() - 0.5) * plant.size * 0.5;
      const height = plant.size * (0.7 + Math.random() * 0.3);
      const width = plant.size * 0.1;
      const curve = (Math.random() - 0.5) * 0.5;

      // Create more natural blade shape
      blade.moveTo(offset - width/2, 0);
      blade.bezierCurveTo(
          offset + curve * plant.size, -height * 0.4,
          offset + curve * plant.size, -height * 0.7,
          offset + curve * plant.size * 2, -height
      );
      blade.lineTo(offset + curve * plant.size * 2 + width/4, -height);
      blade.bezierCurveTo(
          offset + curve * plant.size + width/4, -height * 0.7,
          offset + curve * plant.size + width/4, -height * 0.4,
          offset + width/2, 0
      );

      foliage.push(blade);
  }

  return foliage;
}

private generateEnhancedFernFoliage(plant: Plant): Path2D[] {
  const foliage: Path2D[] = [];
  const frondCount = 4 + Math.floor(Math.random() * 4);

  for (let i = 0; i < frondCount; i++) {
      const frond = new Path2D();
      const angle = (i / frondCount) * Math.PI - Math.PI/4;
      const length = plant.size * (0.7 + Math.random() * 0.3);

      // Draw main stem
      const stemPoints: Vector2[] = [];
      const segments = 10;

      for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const x = Math.cos(angle) * length * t;
          const y = Math.sin(angle) * length * t;
          stemPoints.push({ x, y });

          // Add leaflets
          if (j > 0 && j < segments - 1) {
              const leafletLength = length * 0.2 * (1 - t);
              const leafletAngle = angle + Math.PI/2;
              
              for (const side of [-1, 1]) {
                  const leaflet = new Path2D();
                  leaflet.moveTo(x, y);
                  leaflet.quadraticCurveTo(
                      x + Math.cos(leafletAngle) * leafletLength * 0.7 * side,
                      y + Math.sin(leafletAngle) * leafletLength * 0.7,
                      x + Math.cos(leafletAngle) * leafletLength * side,
                      y + Math.sin(leafletAngle) * leafletLength
                  );
                  foliage.push(leaflet);
              }
          }
      }

      this.createSmoothSpline(frond, stemPoints, false);
      foliage.push(frond);
  }

  return foliage;
}

// Flower Generation and Drawing
private generateFlowerGeometry(plant: Plant): void {
  // Generate stem
  const stem = this.generateFlowerStem(plant);
  plant.elements.details.push(stem);

  // Generate petals
  const petalCount = 5 + Math.floor(Math.random() * 4);
  const petalLayers = 2 + Math.floor(Math.random() * 2);
  
  for (let layer = 0; layer < petalLayers; layer++) {
      const layerPetals = this.generateFlowerPetals(plant, petalCount, layer);
      plant.elements.foliage.push(...layerPetals);
  }

  // Generate flower center
  const center = this.generateFlowerCenter(plant);
  plant.elements.details.push(center);
}

private generateFlowerStem(plant: Plant): Path2D {
  const stem = new Path2D();
  const stemHeight = plant.size * (0.9 + Math.random() * 0.3);
  const controlPoint = {
      x: plant.position.x + (Math.random() - 0.5) * plant.size * 0.3,
      y: plant.position.y - stemHeight * 0.5
  };
  
  stem.moveTo(plant.position.x, plant.position.y);
  stem.quadraticCurveTo(
      controlPoint.x, controlPoint.y,
      plant.position.x, plant.position.y - stemHeight
  );

  return stem;
}

private generateFlowerPetals(plant: Plant, count: number, layer: number): Path2D[] {
  const petals: Path2D[] = [];
  const baseSize = plant.size * 0.4;
  const layerOffset = layer * plant.size * 0.05;
  
  for (let i = 0; i < count; i++) {
      const petal = new Path2D();
      const angle = (i / count) * Math.PI * 2 + layer * (Math.PI / count);
      
      const petalLength = baseSize * (1.2 + Math.random() * 0.4 - layer * 0.2);
      const petalWidth = baseSize * (0.4 + Math.random() * 0.3);
      
      const cp1Distance = petalLength * 0.5;
      const cp2Distance = petalLength * 0.8;
      
      const cp1Angle = angle + (Math.random() - 0.5) * 0.5;
      const cp2Angle = angle + (Math.random() - 0.5) * 0.3;
      
      const center = {
          x: plant.position.x,
          y: plant.position.y - plant.size + layerOffset
      };

      // Create petal shape with natural curve
      this.drawPetalShape(petal, center, angle, {
          length: petalLength,
          width: petalWidth,
          cp1Distance,
          cp2Distance,
          cp1Angle,
          cp2Angle
      });
      
      petals.push(petal);
  }
  
  return petals;
}

private drawPetalShape(
  petal: Path2D, 
  center: Vector2, 
  angle: number, 
  params: {
      length: number;
      width: number;
      cp1Distance: number;
      cp2Distance: number;
      cp1Angle: number;
      cp2Angle: number;
  }
): void {
  const {length, width, cp1Distance, cp2Distance, cp1Angle, cp2Angle} = params;

  petal.moveTo(center.x, center.y);
  
  // Outer curve
  petal.bezierCurveTo(
      center.x + Math.cos(cp1Angle) * cp1Distance,
      center.y + Math.sin(cp1Angle) * cp1Distance,
      center.x + Math.cos(cp2Angle) * cp2Distance,
      center.y + Math.sin(cp2Angle) * cp2Distance,
      center.x + Math.cos(angle) * length,
      center.y + Math.sin(angle) * length
  );
  
  // Inner curve
  petal.bezierCurveTo(
      center.x + Math.cos(angle) * length * 0.9,
      center.y + Math.sin(angle) * length * 0.9,
      center.x + Math.cos(angle) * width,
      center.y + Math.sin(angle) * width,
      center.x,
      center.y
  );
}

private generateFlowerCenter(plant: Plant): Path2D {
  const center = new Path2D();
  const centerSize = plant.size * 0.15;
  const centerY = plant.position.y - plant.size;
  
  // Create textured center with small dots
  for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * centerSize;
      center.moveTo(
          plant.position.x + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance
      );
      center.arc(
          plant.position.x + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance,
          1,
          0,
          Math.PI * 2
      );
  }
  
  return center;
}

// Fern Generation and Drawing
private generateFernGeometry(plant: Plant): void {
  const frondCount = 4 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < frondCount; i++) {
      const frond = this.generateFernFrond(plant, i, frondCount);
      plant.elements.foliage.push(frond);
  }
}

private generateFernFrond(plant: Plant, index: number, totalFronds: number): Path2D {
  const frond = new Path2D();
  const baseAngle = (index / totalFronds) * Math.PI;
  const frondLength = plant.size * 0.8;
  const segments = 10;
  
  let currentPoint = plant.position;
  frond.moveTo(currentPoint.x, currentPoint.y);
  
  // Generate main frond stem with leaflets
  for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const angle = baseAngle + Math.sin(t * Math.PI) * 0.3;
      
      // Calculate next point on main stem
      currentPoint = {
          x: plant.position.x + Math.cos(angle) * frondLength * t,
          y: plant.position.y - frondLength * t
      };
      
      frond.lineTo(currentPoint.x, currentPoint.y);
      
      // Add leaflets except at base
      if (i > 0) {
          this.addFernLeaflets(frond, currentPoint, angle, frondLength * (1 - t));
      }
  }
  
  return frond;
}

private addFernLeaflets(
  frond: Path2D,
  point: Vector2,
  mainAngle: number,
  size: number
): void {
  const leafletCount = 3;
  const leafletSize = size * 0.2;
  
  for (let i = 0; i < leafletCount; i++) {
      const leafletAngle = mainAngle + Math.PI * 0.3 * (i - 1);
      
      frond.moveTo(point.x, point.y);
      frond.quadraticCurveTo(
          point.x + Math.cos(leafletAngle) * leafletSize * 0.7,
          point.y + Math.sin(leafletAngle) * leafletSize * 0.7,
          point.x + Math.cos(leafletAngle) * leafletSize,
          point.y + Math.sin(leafletAngle) * leafletSize
      );
  }
}

private isValidTreeStyle(style: string): style is keyof typeof TREE_STYLES {
  return style in TREE_STYLES;
}

private getTreeStyle(plant: Plant): TreeStyle | null {
  if (plant.style && this.isValidTreeStyle(plant.style)) {
      return TREE_STYLES[plant.style];
  }
  return null;
}

private geometryCache: Map<string, {
  trunk?: Path2D;
  foliage: Path2D[];
  details: Path2D[];
}> = new Map();

private generateCacheKey(plant: Plant): string {
  return `${plant.type}_${plant.style || 'default'}_${Math.round(plant.size)}`;
}

private getOrCreateGeometry(plant: Plant): {trunk?: Path2D; foliage: Path2D[]; details: Path2D[]} {
  const cacheKey = this.generateCacheKey(plant);
  
  if (!this.geometryCache.has(cacheKey)) {
      // Generate new geometry
      const elements = {
          trunk: undefined as Path2D | undefined,
          foliage: [] as Path2D[],
          details: [] as Path2D[]
      };

      // Generate based on type and style
      if (plant.type === 'tree' && plant.style) {
          const style = TREE_STYLES[plant.style];
          elements.trunk = this.generateEnhancedTrunk(plant, style.trunk);
          
          switch (style.foliage.shape) {
              case 'layered':
                  elements.foliage = this.generateLayeredFoliage(plant, style.foliage);
                  break;
              case 'cascading':
                  elements.foliage = this.generateCascadingFoliage(plant, style.foliage);
                  break;
              case 'cloud':
                  elements.foliage = this.generateCloudFoliage(plant, style.foliage);
                  break;
              case 'wispy':
                  elements.foliage = this.generateWispyFoliage(plant, style.foliage);
                  break;
          }

          if (style.trunk.bark) {
              elements.details = this.generateBarkDetails(plant, style.trunk.bark);
          }
      } else {
          // Generate other plant types...
          switch (plant.type) {
              case 'bush':
                  elements.foliage = this.generateEnhancedBushFoliage(plant);
                  break;
              case 'flower':
                  elements.foliage = this.generateEnhancedFlowerFoliage(plant);
                  break;
              case 'grass':
                  elements.foliage = this.generateEnhancedGrassFoliage(plant);
                  break;
              case 'fern':
                  elements.foliage = this.generateEnhancedFernFoliage(plant);
                  break;
          }
      }

      this.geometryCache.set(cacheKey, elements);
  }

  return this.geometryCache.get(cacheKey)!;
}

private generatePlantGeometry(plant: Plant): void {
  // Get base geometry from cache
  const geometry = this.getOrCreateGeometry(plant);

  // Create plant elements, ensuring each one is properly positioned
  const centerX = plant.position.x;
  const centerY = plant.position.y;

  plant.elements = {
      trunk: geometry.trunk ? this.translatePath(geometry.trunk, centerX, centerY) : undefined,
      foliage: geometry.foliage.map(path => this.translatePath(path, centerX, centerY)),
      details: geometry.details.map(path => this.translatePath(path, centerX, centerY))
  };
}

// Helper method to position a path relative to a plant's position
private translatePath(path: Path2D, x: number, y: number): Path2D {
  const newPath = new Path2D();
  const matrix = new DOMMatrix();
  matrix.translateSelf(x, y);
  newPath.addPath(path, matrix);
  return newPath;
}
}