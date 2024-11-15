import { createNoise2D, createNoise3D } from 'simplex-noise';
import { 
    Plant, TreeStyleType, Vector2, PlantStyle, FoliageStyle, TreeStyle,
    VegetationZone, TrunkStyle, PlantType, Zones, PlantDefinition,
    PlantElements, PlantColors, PlantAnimation, WindEffect, VegetationClusterParams
} from '../../../types/environment/vegetation';
import { ColorSystem, ColorUtils, HSLColor } from '../../../utils/colors';
import { TREE_STYLES, PLANT_TYPES, VEGETATION_COLORS } from '../../../configs/environment/vegetationConfig';
import { LightingSystem } from '../lighting';

export class VegetationSystem {
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private plants: Plant[] = [];
    private season: 'spring' | 'summer' | 'autumn' | 'winter' = 'summer';
    private timeOfDay: number = 0;
    private windTime: number = 0;
    private windIntensity: number = 0;
    private zones: Zones;
    private currentLighting: LightingSystem;
    private vegetationClusters: Map<string, {
      type: string;
      plants: Plant[];
      center: Vector2;
      radius: number;
  }> = new Map();

  constructor(
    private width: number,
    private height: number,
    private waterLevel: number
) {
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.plants = [];
    this.zones = [];
    this.vegetationClusters = new Map();
    this.currentLighting = new LightingSystem();
    this.season = 'summer';
    this.timeOfDay = 0;
    this.windTime = 0;
    this.windIntensity = 0;

    // Initialize vegetation after all properties are set
    this.initializeVegetation();
}

private initializeVegetation(): void {
  // Clear any existing vegetation first
  this.plants = [];

  // Debug: Log that we're starting initialization
  console.log('Starting vegetation initialization');

  // Define our exact tree placements
  const treeConfigs = [
      { style: 'COASTAL_PINE', count: 2 },
      { style: 'WINDSWEPT_TREE', count: 2 },
      { style: 'CLIFF_TREE', count: 2 }
  ];

  // Create each type of tree
  treeConfigs.forEach(config => {
      console.log(`Creating ${config.count} trees of style ${config.style}`);
      
      for (let i = 0; i < config.count; i++) {
          let attempts = 0;
          const maxAttempts = 50;

          while (attempts < maxAttempts) {
              const x = Math.random() * this.width;
              const y = this.waterLevel + Math.random() * (this.height - this.waterLevel);
              const terrainInfo = {
                  height: this.calculateHeightAt(x, y),
                  slope: this.calculateSlopeAt(x, y),
                  moisture: this.calculateMoistureAt(x, y)
              };

              if (this.isValidPlantLocation({ x, y })) {
                  const tree = this.createEnhancedPlant({
                      type: 'tree',
                      style: config.style,
                      position: { x, y },
                      sizeScale: 0.8 + Math.random() * 0.4
                  });

                  console.log(`Created ${config.style} tree:`, {
                      style: tree.style,
                      position: tree.position
                  });

                  this.plants.push(tree);
                  break;
              }
              attempts++;
          }
      }
  });

  // Add other vegetation types
  const otherPlants = [
      { type: 'bush' as const, style: 'flowering_bush', count: 6 },
      { type: 'flower' as const, style: 'coastal_bloom', count: 8 },
      { type: 'grass' as const, style: 'coastal_grass', count: 10 },
      { type: 'fern' as const, style: 'coastal_fern', count: 6 }
  ];

  otherPlants.forEach(config => {
      for (let i = 0; i < config.count; i++) {
          let attempts = 0;
          const maxAttempts = 50;

          while (attempts < maxAttempts) {
              const x = Math.random() * this.width;
              const y = this.waterLevel + Math.random() * (this.height - this.waterLevel);
              
              if (this.isValidPlantLocation({ x, y })) {
                  this.plants.push(this.createEnhancedPlant({
                      type: config.type,
                      style: config.style,
                      position: { x, y },
                      sizeScale: 0.8 + Math.random() * 0.4
                  }));
                  break;
              }
              attempts++;
          }
      }
  });

  console.log('Vegetation initialization complete. Plants created:', 
      this.plants.map(p => ({ type: p.type, style: p.style })));
}

draw(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();

  // Sort plants by y-position for proper layering
  const sortedPlants = [...this.plants].sort((a, b) => a.position.y - b.position.y);

  // Draw plants grouped by type for better performance
  const groups = this.groupPlantsByType(sortedPlants);

  // Draw plants in order from back to front
  const grassPlants = groups.get('grass');
  if (grassPlants) {
      this.drawGrassGroup(ctx, grassPlants, time);
  }

  const fernPlants = groups.get('fern');
  if (fernPlants) {
      this.drawFernGroup(ctx, fernPlants, time);
  }

  const bushPlants = groups.get('bush');
  if (bushPlants) {
      this.drawBushGroup(ctx, bushPlants, time);
  }

  const treePlants = groups.get('tree');
  if (treePlants) {
      this.drawTreeGroup(ctx, treePlants, time);
  }

  const flowerPlants = groups.get('flower');
  if (flowerPlants) {
      this.drawFlowerGroup(ctx, flowerPlants, time);
  }

  ctx.restore();
}

// Add missing draw methods
private drawGrassGroup(ctx: CanvasRenderingContext2D, plants: Plant[], time: number): void {
  plants.forEach(plant => {
      const style = this.getPlantStyle(plant);
      if (!style?.foliage) return;

      ctx.save();

      // Apply wind and movement
      const movement = this.calculatePlantTransform(plant, time);
      ctx.translate(
          plant.position.x + movement.sway.x,
          plant.position.y + movement.sway.y
      );
      ctx.scale(movement.growth, movement.growth);
      ctx.translate(-plant.position.x, -plant.position.y);

      // Draw grass blades
      plant.elements.foliage.forEach(blade => {
          const gradient = this.createFoliageGradient(ctx, plant, style, 0);
          ctx.fillStyle = gradient;
          ctx.fill(blade);
      });

      ctx.restore();
  });
}

private drawFernGroup(ctx: CanvasRenderingContext2D, plants: Plant[], time: number): void {
  plants.forEach(plant => {
      const style = this.getPlantStyle(plant);
      if (!style?.foliage) return;

      ctx.save();

      const movement = this.calculatePlantTransform(plant, time);
      ctx.translate(
          plant.position.x + movement.sway.x,
          plant.position.y + movement.sway.y
      );
      ctx.scale(movement.growth, movement.growth);
      ctx.translate(-plant.position.x, -plant.position.y);

      // Draw fern fronds
      plant.elements.foliage.forEach((frond, i) => {
          const depth = i / plant.elements.foliage.length;
          const gradient = this.createFoliageGradient(ctx, plant, style, depth);
          ctx.fillStyle = gradient;
          ctx.fill(frond);
      });

      ctx.restore();
  });
}

private drawBushGroup(ctx: CanvasRenderingContext2D, plants: Plant[], time: number): void {
  plants.forEach(plant => {
      const style = this.getPlantStyle(plant);
      if (!style?.foliage) return;

      ctx.save();

      const movement = this.calculatePlantTransform(plant, time);
      ctx.translate(
          plant.position.x + movement.sway.x,
          plant.position.y + movement.sway.y
      );
      ctx.scale(movement.growth, movement.growth);
      ctx.translate(-plant.position.x, -plant.position.y);

      // Draw bush foliage
      plant.elements.foliage.forEach((foliage, i) => {
          const depth = i / plant.elements.foliage.length;
          const gradient = this.createFoliageGradient(ctx, plant, style, depth);
          ctx.fillStyle = gradient;
          ctx.fill(foliage);
      });

      // Draw any details
      plant.elements.details.forEach(detail => {
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.stroke(detail);
      });

      ctx.restore();
  });
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

        this.generateEnhancedPlantGeometry(plant);
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
        colors: this.getPlantColors(def.type, style),
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

private generateCoastalVegetation(): void {
  const coastline = this.calculateCoastline();
  const segmentLength = 150;

  for (let i = 0; i < coastline.length - 1; i += segmentLength) {
      const position = coastline[i];
      const terrainInfo = this.getTerrainInfoAt(position.x, position.y);

      if (this.isValidCoastalLocation(terrainInfo)) {
          // Add natural variation to placement
          const offset = this.calculateNaturalOffset(position);
          position.x += offset.x;
          position.y += offset.y;

          // Create vegetation clusters with proper style parameters
          this.createFlowerCluster(position, 'coastal_bloom'); // Fixed: Added missing style parameter
          this.createGrassCluster(position, 'coastal_grass');  // Fixed: Added missing style parameter

          // Add occasional trees
          if (Math.random() < 0.3) {
              this.createCoastalTree(position);
          }
      }
  }
}

private generateCliffVegetation(): void {
  const cliffPoints = this.identifyCliffPoints();
  
  cliffPoints.forEach(point => {
      const terrainInfo = this.getTerrainInfoAt(point.x, point.y);
      
      if (this.isValidCliffLocation(terrainInfo)) {
          if (Math.random() < 0.4) {
              this.createCliffTree(point);
          }
          
          if (Math.random() < 0.6) {
              this.createCliffFlowers(point);
          }
      }
  });
}

private createCliffFlowers(position: Vector2): void {
  const flowerConfig = PLANT_TYPES.flower.variations?.find(v => v.name === 'coastal_bloom');
  if (!flowerConfig) return;

  const flower = this.createEnhancedPlant({
      type: 'flower',
      style: flowerConfig.name,
      position,
      sizeScale: 0.7 + Math.random() * 0.3
  });

  this.plants.push(flower);
}

private createCoastalTree(position: Vector2): void {
  const variation = Math.random();
  const style = variation < 0.6 ? 'COASTAL_PINE' : 'WINDSWEPT_TREE';
  
  const tree = this.createEnhancedPlant({
      type: 'tree',
      style,
      position,
      sizeScale: 0.9 + Math.random() * 0.2
  });

  this.plants.push(tree);
}

private createCliffTree(position: Vector2): void {
  const tree = this.createEnhancedPlant({
      type: 'tree',
      style: 'CLIFF_TREE', // Use the actual TreeStyleType
      position,
      sizeScale: 0.8 + Math.random() * 0.3
  });

  if (tree) {
      this.plants.push(tree);
  }
}

private createFlowerCluster(position: Vector2, style: string): void {
  const config = PLANT_TYPES.flower.variations?.find(v => v.name === style);
  if (!config) return;

  const count = 5 + Math.floor(Math.random() * 4);
  const radius = 50;

  for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * radius;
      const flowerPos = {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance
      };

      if (this.isValidPlantLocation(flowerPos)) {
          const flower = this.createEnhancedPlant({
              type: 'flower',
              style: config.name,
              position: flowerPos,
              sizeScale: 0.8 + Math.random() * 0.4
          });
          this.plants.push(flower);
      }
  }
}

private createGrassCluster(position: Vector2, style: string): void {
  const config = PLANT_TYPES.grass.variations?.find(v => v.name === style);
  if (!config) return;

  const count = 8 + Math.floor(Math.random() * 6);
  const radius = 40;

  for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.random() * radius;
      const grassPos = {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance
      };

      if (this.isValidPlantLocation(grassPos)) {
          const grass = this.createEnhancedPlant({
              type: 'grass',
              style: config.name,
              position: grassPos,
              sizeScale: 0.7 + Math.random() * 0.6
          });
          this.plants.push(grass);
      }
  }
}

private createEnhancedPlant(params: {
  type: PlantType;
  style: string;
  position: Vector2;
  sizeScale: number;
}): Plant {
  console.log('Creating plant with params:', params);  // Debug log

  // Validate tree style if it's a tree
  if (params.type === 'tree') {
      const validStyles = ['COASTAL_PINE', 'WINDSWEPT_TREE', 'CLIFF_TREE'];
      if (!validStyles.includes(params.style)) {
          console.error('Invalid tree style:', params.style);
          throw new Error(`Invalid tree style: ${params.style}`);
      }
  }

  const baseSize = PLANT_TYPES[params.type].size.min + 
                  (PLANT_TYPES[params.type].size.max - PLANT_TYPES[params.type].size.min) * 
                  params.sizeScale;

  const plant: Plant = {
      type: params.type,
      style: params.style,  // Ensure style is being set
      position: { ...params.position },
      size: baseSize,
      growth: 0,
      variation: Math.random(),
      elements: {
          trunk: undefined,
          foliage: [],
          details: []
      },
      colors: this.getPlantColors(params.type, params.style),
      animation: {
          swayOffset: Math.random() * Math.PI * 2,
          growthSpeed: 0.1 + Math.random() * 0.1,
          phase: Math.random() * Math.PI * 2,
          swayAmount: this.getBaseSwayAmount(params.type),
          swaySpeed: this.getBaseSwaySpeed(params.type)
      }
  };

  // Ensure geometry is generated with correct style
  this.generateEnhancedPlantGeometry(plant);

  // Debug log to verify plant creation
  console.log('Created plant:', {
      type: plant.type,
      style: plant.style,
      hasElements: {
          trunk: !!plant.elements.trunk,
          foliage: plant.elements.foliage.length
      }
  });

  return plant;
}

private normalizeStyleName(style: string): string {
  return style.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

// Update style matching in other methods:
private getPlantStyle(plant: Plant): PlantStyle | undefined {
  if (!plant.style) return undefined;
  
  const plantDef = PLANT_TYPES[plant.type];
  if (!plantDef || !plantDef.variations) return undefined;

  const variation = plantDef.variations.find(v => 
      v.name.toLowerCase() === plant.style?.toLowerCase()
  );
  
  return variation?.style;
}


private calculateClusterPosition(
  center: Vector2,
  radius: number,
  index: number,
  total: number
): Vector2 {
  // Create natural-looking cluster distribution
  const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5;
  const distance = Math.pow(Math.random(), 0.7) * radius; // More density toward center
  
  return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
  };
}

private getPlantColors(type: PlantType, style: string): PlantColors {
  if (type === 'tree') {
      if (style in TREE_STYLES) {
          const treeStyle = TREE_STYLES[style as TreeStyleType];
          return {
              primary: treeStyle.foliage.colors[0],
              secondary: treeStyle.foliage.colors[1] || treeStyle.foliage.colors[0],
              detail: treeStyle.trunk.color
          };
      }
  }

  const plantDef = PLANT_TYPES[type];
  const variation = plantDef.variations?.find(v => v.name === style);
  
  if (!variation?.style.foliage?.colors) {
      throw new Error(`No colors defined for style ${style} of type ${type}`);
  }

  const colors = variation.style.foliage.colors;
  return {
      primary: colors[0],
      secondary: colors[1] || colors[0],
      detail: colors[2] || colors[0]
  };
}


private varyColor(base: HSLColor, variation: number): HSLColor {
  return [
      base[0] + variation,
      base[1] + (Math.random() - 0.5) * 5,
      base[2] + (Math.random() - 0.5) * 3
  ];
}

// Environmental calculation methods
private calculateCoastline(): Vector2[] {
  const points: Vector2[] = [];
  const resolution = 50;
  
  for (let x = 0; x < this.width; x += resolution) {
      const baseY = this.waterLevel;
      const variation = this.noise2D(x * 0.005, 0) * 100;
      
      points.push({
          x,
          y: baseY + variation
      });
  }
  
  return points;
}

private identifyCliffPoints(): Vector2[] {
  const points: Vector2[] = [];
  const resolution = 50;
  
  for (let x = 0; x < this.width; x += resolution) {
      for (let y = 0; y < this.height; y += resolution) {
          const slope = this.calculateSlopeAt(x, y);
          
          if (slope > 0.6) {
              points.push({ x, y });
          }
      }
  }
  
  return points;
}

private updateTimeOfDay(time: number): void {
  // Calculate time of day (0-1)
  this.timeOfDay = (Math.sin(time * 0.0001) + 1) / 2;
}

private updatePlantAnimation(plant: Plant, time: number, deltaTime: number): void {
  const windEffect = this.calculateWindEffect(plant, time);
  const localWind = this.windIntensity * windEffect;

  plant.animation.phase += deltaTime * 0.001 * plant.animation.swaySpeed;

  // Calculate type-specific movement
  switch (plant.type) {
      case 'tree':
          this.updateTreeAnimation(plant, localWind, time);
          break;
      case 'flower':
          this.updateFlowerAnimation(plant, localWind, time);
          break;
      case 'grass':
          this.updateGrassAnimation(plant, localWind, time);
          break;
  }
}

// Helper methods
private isValidCoastalLocation(terrainInfo: TerrainInfo): boolean {
  return terrainInfo.slope < 0.4 && 
         terrainInfo.moisture > 0.3 && 
         terrainInfo.height < this.waterLevel + 100;
}

private isValidCliffLocation(terrainInfo: TerrainInfo): boolean {
  return terrainInfo.slope > 0.6 && 
         terrainInfo.moisture > 0.2;
}

private calculateNaturalOffset(position: Vector2): Vector2 {
  return {
      x: (this.noise2D(position.x * 0.01, position.y * 0.01) - 0.5) * 100,
      y: (this.noise2D(position.x * 0.01, position.y * 0.01 + 100) - 0.5) * 100
  };
}

private generateShorelineZone(): void {
  if (!this.zones) {
      this.zones = [];  // Fixed: Initialize zones if undefined
  }

  const zone: VegetationZone = {
      bounds: this.generateZonePath([
          { x: 0, y: this.waterLevel - 50 },
          { x: this.width, y: this.waterLevel - 50 },
          { x: this.width, y: this.waterLevel + 100 },
          { x: 0, y: this.waterLevel + 100 }
      ]),
      position: { x: this.width / 2, y: this.waterLevel },
      moisture: 0.8,
      slope: 0.2,
      soilType: 'sandy',
      vegetationDensity: 0.7
  };

  this.zones.push(zone);
}

private generateCliffZone(): void {
  // Implement cliff zone generation with proper typing
  const cliffPoints = this.generateCliffPoints();
  const zone: VegetationZone = {
      bounds: this.generateZonePath(cliffPoints),
      position: { 
          x: this.width / 2, 
          y: this.waterLevel - 200 
      },
      moisture: 0.4,
      slope: 0.8,
      soilType: 'rocky',
      vegetationDensity: 0.3,
      conditions: {
          light: 0.8,
          temperature: 0.6,
          wind: 0.9,
          elevation: 0.7
      }
  };
  this.zones.push(zone);
}

private generateTransitionZones(): void {
  // Generate transition zones between coastal and cliff areas
  const transitionPoints = this.identifyTransitionPoints();
  transitionPoints.forEach(point => {
      this.generateTransitionZone(point);
  });
}

private generateTransitionZone(centerPoint: Vector2): void {
  const zone: VegetationZone = {
      bounds: this.generateTransitionZonePath(centerPoint),
      position: centerPoint,
      moisture: this.calculateMoistureAt(centerPoint.x, centerPoint.y),
      slope: this.calculateSlopeAt(centerPoint.x, centerPoint.y),
      soilType: 'fertile',
      vegetationDensity: 0.5,
      conditions: {
          light: 0.8,
          temperature: 0.6,
          wind: 0.7,
          elevation: this.calculateHeightAt(centerPoint.x, centerPoint.y)
      }
  };

  this.zones.push(zone);
  this.populateTransitionZone(zone);
}

private identifyTransitionPoints(): Vector2[] {
  const points: Vector2[] = [];
  const segments = 10;
  const spacing = this.width / segments;

  for (let i = 0; i <= segments; i++) {
      const x = i * spacing;
      const baseY = this.waterLevel - 100;
      const heightVariation = this.noise2D(x * 0.005, 0) * 50;

      points.push({
          x,
          y: baseY + heightVariation
      });
  }

  return points;
}

private populateTransitionZone(zone: VegetationZone): void {
  const plantCount = Math.floor(10 * zone.vegetationDensity);
  const radius = 100;

  for (let i = 0; i < plantCount; i++) {
      const angle = (i / plantCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = Math.sqrt(Math.random()) * radius; // Square root for more natural distribution
      const position = {
          x: zone.position.x + Math.cos(angle) * distance,
          y: zone.position.y + Math.sin(angle) * distance
      };

      if (this.isValidPlantLocation(position)) {
          // Mix of different vegetation types
          if (Math.random() < 0.3) {
              this.createTransitionTree(position, zone);
          } else if (Math.random() < 0.5) {
              this.createTransitionFlowers(position, zone);
          } else {
              this.createTransitionGrass(position, zone);
          }
      }
  }
}

private createTransitionTree(position: Vector2, zone: VegetationZone): void {
  // Choose tree style based on conditions
  const style = this.calculateSlopeAt(position.x, position.y) > 0.4 ? 
      'CLIFF_TREE' : 'COASTAL_PINE';

  const tree = this.createEnhancedPlant({
      type: 'tree',
      style,
      position,
      sizeScale: 0.8 + Math.random() * 0.3
  });

  this.plants.push(tree);
}

private createTransitionFlowers(position: Vector2, zone: VegetationZone): void {
  const flowerConfig = PLANT_TYPES.flower.variations?.find(v => v.name === 'coastal_bloom');
  if (!flowerConfig) return;

  const flower = this.createEnhancedPlant({
      type: 'flower',
      style: flowerConfig.name,
      position,
      sizeScale: 0.7 + Math.random() * 0.4
  });

  this.plants.push(flower);
}

private createTransitionGrass(position: Vector2, zone: VegetationZone): void {
  const grassConfig = PLANT_TYPES.grass.variations?.find(v => v.name === 'coastal_grass');
  if (!grassConfig) return;

  const grass = this.createEnhancedPlant({
      type: 'grass',
      style: grassConfig.name,
      position,
      sizeScale: 0.6 + Math.random() * 0.5
  });

  this.plants.push(grass);
}

private generateZonePath(points: Vector2[]): Path2D {
  const path = new Path2D();
  if (points.length < 2) return path;

  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      const next = points[Math.min(i + 1, points.length - 1)];

      // Create smooth curves between points
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      const cp2x = curr.x + (next.x - curr.x) * 0.5;
      const cp2y = curr.y + (next.y - curr.y) * 0.5;

      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
  }
  path.closePath();
  return path;
}

private generateCliffPoints(): Vector2[] {
  const points: Vector2[] = [];
  const segments = 10;
  const baseHeight = this.waterLevel - 300;
  
  for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * this.width;
      const heightVariation = this.noise2D(x * 0.005, 0) * 100;
      points.push({
          x,
          y: baseHeight + heightVariation
      });
  }
  return points;
}

private generateTransitionZonePath(): Path2D {
  const path = new Path2D();
  const segments = 20;
  
  // Create natural transition between zones
  let lastX = 0;
  let lastY = this.waterLevel - 150;
  
  path.moveTo(lastX, lastY);
  
  for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const x = t * this.width;
      const baseY = this.waterLevel - 150;
      const noise = this.noise2D(x * 0.005, 0) * 50;
      const y = baseY + noise;
      
      const cp1x = lastX + (x - lastX) * 0.5;
      const cp1y = lastY;
      const cp2x = x - (x - lastX) * 0.5;
      const cp2y = y;
      
      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
      
      lastX = x;
      lastY = y;
  }
  
  path.lineTo(this.width, this.height);
  path.lineTo(0, this.height);
  path.closePath();
  
  return path;
}

private calculateMoistureAt(x: number, y: number): number {
  const distanceFromWater = Math.abs(y - this.waterLevel);
  const baseMoisture = Math.max(0, 1 - distanceFromWater / (this.height * 0.2));
  
  // Add noise variation
  const variation = this.noise2D(x * 0.01, y * 0.01) * 0.3;
  
  return Math.min(1, Math.max(0, baseMoisture + variation));
}

private calculateSlopeAt(x: number, y: number): number {
  const dx = this.noise2D(x + 1, y) - this.noise2D(x - 1, y);
  const dy = this.noise2D(x, y + 1) - this.noise2D(x, y - 1);
  return Math.sqrt(dx * dx + dy * dy);
}

private calculateLightAt(x: number, y: number): number {
  if (!this.currentLighting) return 1;
  
  // Calculate base light level from time of day
  const baseLight = Math.sin(this.timeOfDay * Math.PI) * 0.5 + 0.5;
  
  // Add variation based on slope and position
  const slope = this.calculateSlopeAt(x, y);
  const slopeFactor = 1 - slope * 0.5;
  
  // Add noise for light variation (clouds, etc)
  const variation = this.noise2D(x * 0.01 + this.timeOfDay, y * 0.01) * 0.2;
  
  return Math.min(1, Math.max(0, baseLight * slopeFactor + variation));
}

private registerCluster(
  type: string,
  plants: Plant[],
  center: Vector2,
  radius: number
): void {
  const clusterId = `${type}_${center.x}_${center.y}`;
  this.vegetationClusters.set(clusterId, {
      type,
      plants,
      center,
      radius
  });
}

// Public interface methods
addPlant(params: {
  type: PlantType;
  style: string;
  position: Vector2;
  sizeScale: number;
}): void {
  console.log("Adding plant:", params); // Debug log
  const plant = this.createEnhancedPlant(params);
  if (plant) {
      this.plants.push(plant);
      console.log("Plant added successfully, total plants:", this.plants.length); // Debug log
  }
}

public removePlant(position: Vector2, radius: number = 10): void {
  this.plants = this.plants.filter(plant => {
      const distance = Math.hypot(
          plant.position.x - position.x,
          plant.position.y - position.y
      );
      return distance > radius;
  });
}

public getPlants(): Plant[] {
  return this.plants;
}

public clear(): void {
  this.plants = [];
  this.vegetationClusters.clear();
  this.zones = [];
  this.geometryCache.clear(); // Fixed: Added cache cleanup
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


  private initializeVegetationClusters(): void {
      // Clear existing clusters
      this.vegetationClusters.clear();
      
      // Initialize coastal regions
      this.generateCoastalClusters();
      
      // Initialize transition zones
      this.generateTransitionZones();
      
      // Create natural distribution patterns
      this.applyNaturalDistribution();
  }

  private generateCoastalClusters(): void {
      const coastline = this.calculateCoastline();
      const segmentLength = 200; // Distance between potential cluster points
      
      for (let i = 0; i < coastline.length - 1; i += segmentLength) {
          const position = coastline[i];
          const slope = this.calculateSlopeAt(position.x, position.y);
          const moisture = this.calculateMoistureAt(position.x, position.y);

          if (this.isValidClusterLocation(position, slope, moisture)) {
              // Add some natural variation to placement
              const offset = {
                  x: (this.noise2D(position.x * 0.01, position.y * 0.01) - 0.5) * 100,
                  y: (this.noise2D(position.x * 0.01, position.y * 0.01 + 100) - 0.5) * 100
              };

              position.x += offset.x;
              position.y += offset.y;

              this.createVegetationCluster('COASTAL_FLOWERS', position);
              
              // Add accompanying grass clusters
              if (Math.random() < 0.7) {
                  const grassOffset = {
                      x: position.x + (Math.random() - 0.5) * 150,
                      y: position.y + (Math.random() - 0.5) * 150
                  };
                  this.createVegetationCluster('GRASS_PATCH', grassOffset);
              }
          }
      }
  }

  private createVegetationCluster(type: string, center: Vector2): void {
      const config = this.CLUSTER_CONFIGS[type];
      const clusterId = `${type}_${center.x}_${center.y}`;
      const plants: Plant[] = [];

      const count = config.minCount + 
                   Math.floor(Math.random() * (config.maxCount - config.minCount));

      // Generate main cluster focal point
      const mainPlant = this.createEnhancedPlant(
          config.styles[0],
          center,
          1.2 // Slightly larger for focal point
      );
      plants.push(mainPlant);

      // Generate surrounding plants
      for (let i = 1; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
          const distance = Math.random() * config.radius * 
                         (0.3 + Math.pow(Math.random(), 0.5) * 0.7); // More plants toward center
          
          const position = {
              x: center.x + Math.cos(angle) * distance,
              y: center.y + Math.sin(angle) * distance
          };

          // Add height variation based on distance from center
          const heightScale = 1 - (distance / config.radius) * config.heightVariation;
          
          if (this.isValidPlantLocation(position)) {
              const plant = this.createEnhancedPlant(
                  config.styles[Math.floor(Math.random() * config.styles.length)],
                  position,
                  heightScale
              );
              plants.push(plant);
          }
      }

      // Store cluster information
      this.vegetationClusters.set(clusterId, {
          type,
          plants,
          center,
          radius: config.radius
      });

      // Add all plants to main collection
      plants.forEach(plant => this.plants.push(plant));
  }

  private applyNaturalDistribution(): void {
      // Apply natural variation to plant properties based on environment
      this.plants.forEach(plant => {
          const moisture = this.calculateMoistureAt(plant.position.x, plant.position.y);
          const light = this.calculateLightAt(plant.position.x, plant.position.y);
          
          // Adjust plant properties based on environmental factors
          plant.size *= 0.8 + (moisture * 0.4);
          plant.colors.primary[1] *= 0.8 + (moisture * 0.4); // Saturation
          plant.colors.primary[2] *= 0.8 + (light * 0.4);    // Brightness
          
          // Update geometry with new properties
          this.generatePlantGeometry(plant);
      });
  }

  // Enhanced animation system
  private updateEnhancedAnimations(time: number, deltaTime: number): void {
      const windTime = time * 0.001;
      const windStrength = (Math.sin(windTime * 0.5) * 0.5 + 0.5) * 0.8;
      
      this.plants.forEach(plant => {
          // Calculate base wind effect
          const windEffect = this.calculateWindEffect(plant, time);
          const localWind = windStrength * windEffect;

          // Update animation properties
          plant.animation.phase += deltaTime * 0.001 * plant.animation.swaySpeed;
          
          // Calculate unique movement for each plant type
          switch (plant.type) {
              case 'tree':
                  this.updateTreeAnimation(plant, localWind, time);
                  break;
              case 'flower':
                  this.updateFlowerAnimation(plant, localWind, time);
                  break;
              case 'grass':
                  this.updateGrassAnimation(plant, localWind, time);
                  break;
          }
      });
  }

  private generateEnhancedPlantGeometry(plant: Plant): void {
    switch (plant.type) {
        case 'tree': {
            if (!plant.style || !(plant.style in TREE_STYLES)) {
                this.generateTreeGeometry(plant, TREE_STYLES.COASTAL_PINE);
            } else {
                this.generateTreeGeometry(plant, TREE_STYLES[plant.style as TreeStyleType]);
            }
            break;
        }
        case 'bush': {
            const style = this.getPlantStyle(plant);
            if (style?.foliage) {
                this.generateBushGeometry(plant, style.foliage);
            }
            break;
        }
        case 'flower': {
            const style = this.getPlantStyle(plant);
            if (style?.foliage) {
                this.generateFlowerGeometry(plant, style.foliage);
            }
            break;
        }
        case 'grass': {
            const style = this.getPlantStyle(plant);
            if (style?.foliage) {
                this.generateGrassGeometry(plant, style.foliage);
            }
            break;
        }
        case 'fern': {
            const style = this.getPlantStyle(plant);
            if (style?.foliage) {
                this.generateFernGeometry(plant, style.foliage);
            }
            break;
        }
    }
}

  private generateCoastalPineGeometry(plant: Plant): void {
    const style = TREE_STYLES.COASTAL_PINE;
    plant.elements.trunk = this.generateStylizedTrunk(plant, style.trunk);
    plant.elements.foliage = this.generateLayeredFoliage(plant, {
        layers: 5,
        baseSize: plant.size * style.foliage.size,
        shape: 'triangular',
        variation: 0.2,
        density: style.foliage.density
    });
}

private generateStylizedTrunk(plant: Plant, style: any): Path2D {
    const trunk = new Path2D();
    const height = plant.size * 0.8;
    const baseWidth = plant.size * style.width;
    const points: Vector2[] = [];

    // Generate trunk points with artistic variation
    for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const angle = style.twist * Math.sin(t * Math.PI * 2) + 
                     (Math.random() - 0.5) * 0.1;
        const bend = style.bend || 0;
        
        points.push({
            x: plant.position.x + 
               Math.sin(angle) * baseWidth * (1 - t * style.taper) +
               Math.sin(t * Math.PI) * bend * plant.size * 0.2,
            y: plant.position.y - height * t
        });
    }

    // Create smooth trunk outline
    this.createSmoothPath(trunk, points, true);
    return trunk;
}

private generateLayeredFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
  const foliage: Path2D[] = [];
  const layers = 4;
  const baseY = plant.position.y - plant.size * 0.35;
  const baseWidth = plant.size * style.size;

  for (let i = 0; i < layers; i++) {
      const layer = new Path2D();
      const t = i / (layers - 1);
      const y = baseY - t * plant.size * 0.6;
      const width = baseWidth * (1.2 - t * 0.4);
      
      // Create clean horizontal shapes
      const points: Vector2[] = [];
      const segments = 12;
      for (let j = 0; j <= segments; j++) {
          const st = j / segments;
          const x = plant.position.x + (st - 0.5) * width;
          const yOffset = Math.sin(st * Math.PI) * width * 0.1;
          points.push({ x, y: y - yOffset });
      }

      this.createSmoothPath(layer, points);
      layer.closePath();
      foliage.push(layer);
  }

  return foliage;
}

private generateEnhancedFlowerGeometry(plant: Plant): void {
    const style = PLANT_TYPES.flower.variations[0].style;
    const flowers: Path2D[] = [];
    const stems: Path2D[] = [];

    // Generate cluster of flowers
    const flowerCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < flowerCount; i++) {
        const angle = (i / flowerCount) * Math.PI * 2;
        const distance = Math.random() * plant.size * 0.3;
        const position = {
            x: plant.position.x + Math.cos(angle) * distance,
            y: plant.position.y + Math.sin(angle) * distance
        };

        // Generate artistic flower
        const { flower, stem } = this.generateArtisticFlower(
            position,
            plant.size * (0.7 + Math.random() * 0.3),
            style
        );

        flowers.push(flower);
        stems.push(stem);
    }

    plant.elements = {
        foliage: flowers,
        details: stems
    };
}

private generateArtisticFlower(position: Vector2, size: number, style: any): {
    flower: Path2D,
    stem: Path2D
} {
    const flower = new Path2D();
    const stem = new Path2D();
    const petalCount = style.petals.count || 5;

    // Generate artistic stem with natural curve
    const stemHeight = size * style.stem.height;
    const controlPoint = {
        x: position.x + (Math.random() - 0.5) * size * 0.3,
        y: position.y - stemHeight * 0.6
    };

    stem.moveTo(position.x, position.y);
    stem.quadraticCurveTo(
        controlPoint.x,
        controlPoint.y,
        position.x,
        position.y - stemHeight
    );

    // Generate artistic petals
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalSize = size * (0.8 + Math.random() * 0.4);
        
        // Create artistic petal shape
        const petal = this.generateArtisticPetal(
            position,
            angle,
            petalSize,
            style.petals.shape
        );
        flower.addPath(petal);
    }

    return { flower, stem };
}

private generateArtisticPetal(
    center: Vector2,
    angle: number,
    size: number,
    shape: 'pointed' | 'rounded'
): Path2D {
    const petal = new Path2D();
    const points: Vector2[] = [];
    const segments = 8;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const width = Math.sin(t * Math.PI) * size * 0.3;
        const length = Math.sin(t * Math.PI) * size;

        points.push({
            x: center.x + Math.cos(angle) * length + 
               Math.cos(angle + Math.PI/2) * width,
            y: center.y + Math.sin(angle) * length + 
               Math.sin(angle + Math.PI/2) * width
        });
    }

    this.createSmoothPath(petal, points, true);
    return petal;
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

  
  private generateCloudFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const baseY = plant.position.y - plant.size * 0.35;
    const size = plant.size * style.size;

    // Create main cloud shape
    const mainCloud = new Path2D();
    const points: Vector2[] = [];
    const segments = 16;

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = t * Math.PI * 2;
        const radius = size * (0.8 + Math.sin(t * Math.PI * 2) * 0.2);
        
        points.push({
            x: plant.position.x + Math.cos(angle) * radius,
            y: baseY - size * 0.5 + Math.sin(angle) * radius * 0.8
        });
    }

    this.createSmoothPath(mainCloud, points);
    mainCloud.closePath();
    foliage.push(mainCloud);

    // Add 2-3 smaller cloud shapes for depth
    const subClouds = 2;
    for (let i = 0; i < subClouds; i++) {
        const subCloud = new Path2D();
        const angle = (i / subClouds) * Math.PI * 2;
        const distance = size * 0.3;
        const subPoints: Vector2[] = [];

        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            const subAngle = t * Math.PI * 2;
            const subRadius = size * 0.4;
            
            subPoints.push({
                x: plant.position.x + Math.cos(angle) * distance + Math.cos(subAngle) * subRadius,
                y: baseY - size * 0.5 + Math.sin(angle) * distance + Math.sin(subAngle) * subRadius * 0.8
            });
        }

        this.createSmoothPath(subCloud, subPoints);
        subCloud.closePath();
        foliage.push(subCloud);
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
  private drawEnhancedVegetation(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    
    // Sort all plants by y-position for proper layering
    const sortedPlants = [...this.plants].sort((a, b) => a.position.y - b.position.y);

    // Group plants by type for batch rendering
    const plantGroups = this.groupPlantsByType(sortedPlants);

    // Draw each group with specific rendering techniques
    this.drawGrassGroup(ctx, plantGroups.get('grass') || [], time);
    this.drawFlowerGroup(ctx, plantGroups.get('flower') || [], time);
    this.drawBushGroup(ctx, plantGroups.get('bush') || [], time);
    this.drawTreeGroup(ctx, plantGroups.get('tree') || [], time);

    ctx.restore();
}

private groupPlantsByType(plants: Plant[]): Map<string, Plant[]> {
    return plants.reduce((groups, plant) => {
        const group = groups.get(plant.type) || [];
        group.push(plant);
        groups.set(plant.type, group);
        return groups;
    }, new Map<string, Plant[]>());
}

private drawTreeGroup(ctx: CanvasRenderingContext2D, trees: Plant[], time: number): void {
  trees.forEach(tree => {
      const style = tree.style ? TREE_STYLES[tree.style as TreeStyleType] : null;
      if (!style) {
          console.warn('Tree missing style:', tree.style);
          return;
      }

      ctx.save();

      // Calculate and apply transforms
      const movement = this.calculatePlantTransform(tree, time);
      ctx.translate(
          tree.position.x + movement.sway.x,
          tree.position.y + movement.sway.y
      );
      ctx.scale(movement.growth, movement.growth);
      ctx.translate(-tree.position.x, -tree.position.y);

      // Draw trunk if it exists
      if (tree.elements.trunk) {
          const gradient = ctx.createLinearGradient(
              tree.position.x - tree.size * 0.1,
              tree.position.y,
              tree.position.x + tree.size * 0.1,
              tree.position.y - tree.size * 0.8
          );
          
          const trunkColor = style.trunk.color;
          gradient.addColorStop(0, `hsla(${trunkColor[0]}, ${trunkColor[1]}%, ${trunkColor[2]}%, 0.95)`);
          gradient.addColorStop(1, `hsla(${trunkColor[0]}, ${trunkColor[1]}%, ${Math.max(0, trunkColor[2] - 10)}%, 0.95)`);
          
          ctx.fillStyle = gradient;
          ctx.fill(tree.elements.trunk);
      }

      // Draw foliage with proper layering
      const foliageCount = tree.elements.foliage.length;
      tree.elements.foliage.forEach((foliage, i) => {
          const depth = i / foliageCount;
          const gradient = this.createFoliageGradient(ctx, tree, style, depth);
          
          // Add shadow for depth
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = gradient;
          ctx.fill(foliage);
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
      });

      ctx.restore();
  });
}

private drawEnhancedFoliage(ctx: CanvasRenderingContext2D, tree: Plant, time: number): void {
    const style = TREE_STYLES[tree.style];
    const foliageCount = tree.elements.foliage.length;

    // Calculate wind effect
    const windEffect = this.calculateWindEffect(tree, time);
    const baseOffset = tree.animation.currentOffset || { x: 0, y: 0 };

    tree.elements.foliage.forEach((foliage, i) => {
        ctx.save();

        const depth = i / foliageCount;
        const layerOffset = this.calculateFoliageOffset(tree, i, windEffect, time);

        // Apply wind movement
        ctx.translate(
            layerOffset.x + baseOffset.x * (1 - depth * 0.3),
            layerOffset.y + baseOffset.y * (1 - depth * 0.3)
        );

        // Create sophisticated foliage gradient
        const gradient = this.createFoliageGradient(ctx, tree, style, depth);
        
        // Apply foliage effects
        this.applyFoliageEffects(ctx, depth);
        
        ctx.fillStyle = gradient;
        ctx.fill(foliage);

        // Add highlights and details
        if (i === foliageCount - 1) {
            this.addFoliageHighlights(ctx, foliage, style);
        }

        ctx.restore();
    });
}

private createFoliageGradient(
    ctx: CanvasRenderingContext2D,
    tree: Plant,
    style: any,
    depth: number
): CanvasGradient {
    const gradient = ctx.createRadialGradient(
        tree.position.x,
        tree.position.y - tree.size * 0.6,
        0,
        tree.position.x,
        tree.position.y - tree.size * 0.6,
        tree.size
    );

    const baseColor = style.foliage.colors[0];
    const opacity = Math.max(0.4, 1 - depth * 0.15);

    // Create sophisticated color transitions
    gradient.addColorStop(0, `hsla(${baseColor[0]}, ${baseColor[1]}%, ${Math.min(100, baseColor[2] + 8)}%, ${opacity})`);
    gradient.addColorStop(0.3, `hsla(${baseColor[0]}, ${baseColor[1]}%, ${Math.min(100, baseColor[2] + 4)}%, ${opacity * 0.95})`);
    gradient.addColorStop(0.7, `hsla(${baseColor[0]}, ${baseColor[1]}%, ${baseColor[2]}%, ${opacity * 0.9})`);
    gradient.addColorStop(1, `hsla(${baseColor[0]}, ${baseColor[1]}%, ${Math.max(0, baseColor[2] - 5)}%, ${opacity * 0.8})`);

    return gradient;
}

private drawFlowerGroup(ctx: CanvasRenderingContext2D, plants: Plant[], time: number): void {
  plants.forEach(plant => {
      const style = this.getPlantStyle(plant);
      if (!style?.foliage) return;

      ctx.save();

      const movement = this.calculatePlantTransform(plant, time);
      ctx.translate(
          plant.position.x + movement.sway.x,
          plant.position.y + movement.sway.y
      );
      ctx.scale(movement.growth, movement.growth);
      ctx.translate(-plant.position.x, -plant.position.y);

      // Draw stems (now part of foliage)
      plant.elements.details.forEach(stem => {
          ctx.strokeStyle = `hsla(120, 40%, 30%, 0.6)`;
          ctx.lineWidth = 1;
          ctx.stroke(stem);
      });

      // Draw petals
      plant.elements.foliage.forEach((petal, i) => {
          const depth = i / plant.elements.foliage.length;
          const gradient = this.createFoliageGradient(ctx, plant, style, depth);
          ctx.fillStyle = gradient;
          ctx.fill(petal);
      });

      ctx.restore();
  });
}

private drawEnhancedFlower(ctx: CanvasRenderingContext2D, flower: Plant, time: number): void {
    const style = PLANT_TYPES.flower.variations[0].style;
    const windEffect = this.calculateWindEffect(flower, time);

    ctx.save();

    // Calculate natural movement
    const movement = {
        x: Math.sin(time * 0.001 + flower.animation.swayOffset) * windEffect * 5,
        y: Math.cos(time * 0.001 * 0.7 + flower.animation.swayOffset) * windEffect * 3
    };

    ctx.translate(movement.x, movement.y);

    // Draw petals with sophisticated coloring
    flower.elements.foliage.forEach((petal, i) => {
        const color = style.petals.colors[i % style.petals.colors.length];
        const gradient = ctx.createRadialGradient(
            flower.position.x,
            flower.position.y,
            0,
            flower.position.x,
            flower.position.y,
            flower.size
        );

        gradient.addColorStop(0, `hsla(${color[0]}, ${color[1]}%, ${color[2]}%, 0.9)`);
        gradient.addColorStop(0.7, `hsla(${color[0]}, ${color[1]}%, ${color[2] - 5}%, 0.85)`);
        gradient.addColorStop(1, `hsla(${color[0]}, ${color[1]}%, ${color[2] - 10}%, 0.8)`);

        ctx.fillStyle = gradient;
        ctx.fill(petal);

        // Add petal highlights
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill(petal);
        ctx.restore();
    });

    ctx.restore();
}

private applyFoliageEffects(ctx: CanvasRenderingContext2D, depth: number): void {
    // Add sophisticated visual effects
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 10 * (1 - depth * 0.5);
    ctx.globalCompositeOperation = 'source-over';
}

private drawBarkTexture(ctx: CanvasRenderingContext2D, tree: Plant, barkStyle: any): void {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    
    tree.elements.details.forEach(detail => {
        const color = `hsla(${barkStyle.color[0]}, ${barkStyle.color[1]}%, ${Math.max(0, barkStyle.color[2] - 20)}%, 0.2)`;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke(detail);
    });

    ctx.restore();
}

private addFoliageHighlights(ctx: CanvasRenderingContext2D, foliage: Path2D, style: any): void {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke(foliage);
    ctx.restore();
}

private calculateFoliageOffset(
    tree: Plant,
    layerIndex: number,
    windEffect: number,
    time: number
): Vector2 {
    const basePhase = time * 0.001 + tree.animation.swayOffset;
    const layerPhase = basePhase + layerIndex * 0.2;
    
    return {
        x: Math.sin(layerPhase) * windEffect * 10 * (1 + layerIndex * 0.2),
        y: Math.cos(layerPhase * 0.7) * windEffect * 5 * (1 + layerIndex * 0.2)
    };
}

// Add these helper methods to support clustering and shadows
private groupFlowersByCluster(flowers: Plant[]): Plant[][] {
    const clusters: Plant[][] = [];
    const processed = new Set<Plant>();

    flowers.forEach(flower => {
        if (processed.has(flower)) return;

        const cluster = [flower];
        processed.add(flower);

        // Find nearby flowers
        flowers.forEach(other => {
            if (processed.has(other)) return;
            
            const distance = Math.hypot(
                flower.position.x - other.position.x,
                flower.position.y - other.position.y
            );

            if (distance < 100) {
                cluster.push(other);
                processed.add(other);
            }
        });

        clusters.push(cluster);
    });

    return clusters;
}

private drawClusterShadows(ctx: CanvasRenderingContext2D, cluster: Plant[]): void {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';

    cluster.forEach(plant => {
        ctx.beginPath();
        ctx.ellipse(
            plant.position.x,
            plant.position.y + 5,
            plant.size * 0.3,
            plant.size * 0.15,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });

    ctx.restore();
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

private generateTreeGeometry(plant: Plant, style: TreeStyle): void {
    // Generate minimal trunk
    plant.elements.trunk = this.generateCleanTrunk(plant, style.trunk);
    
    // Generate foliage based on shape
    switch (style.foliage.shape) {
        case 'rounded':
            plant.elements.foliage = this.generateRoundedCanopy(plant, style.foliage);
            break;
        case 'layered':
            plant.elements.foliage = this.generateLayeredCanopy(plant, style.foliage);
            break;
        case 'columnar':
            plant.elements.foliage = this.generateColumnarCanopy(plant, style.foliage);
            break;
    }
}

private generateCleanTrunk(plant: Plant, style: TrunkStyle): Path2D {
  const trunk = new Path2D();
  const height = plant.size * 0.35; // Shorter trunk for better proportions
  const width = plant.size * style.width;
  const bendOffset = style.bend ? height * style.bend : 0;

  trunk.moveTo(plant.position.x - width/2, plant.position.y);
  trunk.lineTo(
      plant.position.x - width/2 * style.taper + bendOffset,
      plant.position.y - height
  );
  trunk.lineTo(
      plant.position.x + width/2 * style.taper + bendOffset,
      plant.position.y - height
  );
  trunk.lineTo(plant.position.x + width/2, plant.position.y);
  trunk.closePath();

  return trunk;
}

private generateRoundedCanopy(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const mainShape = new Path2D();
    const centerY = plant.position.y - plant.size * 0.4; // Start above trunk
    const size = plant.size * style.size;
    
    // Create perfectly round main shape
    mainShape.arc(plant.position.x, centerY, size * 0.5, 0, Math.PI * 2);
    mainShape.closePath();
    foliage.push(mainShape);

    // Add 2-3 smaller overlapping circles for depth
    const subCircles = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < subCircles; i++) {
        const subShape = new Path2D();
        const angle = (i / subCircles) * Math.PI * 2;
        const distance = size * 0.2;
        const subSize = size * (0.3 + Math.random() * 0.2);
        
        subShape.arc(
            plant.position.x + Math.cos(angle) * distance,
            centerY + Math.sin(angle) * distance,
            subSize * 0.5,
            0,
            Math.PI * 2
        );
        subShape.closePath();
        foliage.push(subShape);
    }

    return foliage;
}

private generateLayeredCanopy(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const layers = 4; // Fixed number of layers for consistency
    const baseY = plant.position.y - plant.size * 0.4;
    const baseSize = plant.size * style.size;

    for (let i = 0; i < layers; i++) {
        const layer = new Path2D();
        const t = i / (layers - 1);
        const y = baseY - t * plant.size * 0.5;
        const width = baseSize * (1.2 - t * 0.4); // Wider at bottom
        
        // Create clean horizontal line with rounded ends
        layer.moveTo(plant.position.x - width/2, y);
        layer.lineTo(plant.position.x + width/2, y);
        
        // Add slight arch to top layers
        if (i > 0) {
            const archHeight = width * 0.1 * (1 - t);
            layer.quadraticCurveTo(
                plant.position.x,
                y - archHeight,
                plant.position.x + width/2,
                y
            );
        }
        
        foliage.push(layer);
    }

    return foliage;
}

private generateColumnarCanopy(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const mainShape = new Path2D();
    const baseY = plant.position.y - plant.size * 0.4;
    const height = plant.size * style.size;
    const baseWidth = plant.size * 0.3;

    // Create tapered column shape
    const points: Vector2[] = [
        { x: plant.position.x - baseWidth/2, y: baseY },
        { x: plant.position.x - baseWidth/3, y: baseY - height * 0.7 },
        { x: plant.position.x, y: baseY - height },
        { x: plant.position.x + baseWidth/3, y: baseY - height * 0.7 },
        { x: plant.position.x + baseWidth/2, y: baseY }
    ];

    mainShape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        mainShape.lineTo(points[i].x, points[i].y);
    }
    mainShape.closePath();
    foliage.push(mainShape);

    return foliage;
}

private generateMinimalTrunk(plant: Plant, style: TrunkStyle): Path2D {
  const trunk = new Path2D();
  const height = plant.size * 0.7; // Shorter trunk
  const width = plant.size * style.width;
  
  // Create simple, clean trunk shape
  const startX = plant.position.x;
  const startY = plant.position.y;
  const bendOffset = style.bend ? Math.sin(0.5 * Math.PI) * height * style.bend : 0;
  
  trunk.moveTo(startX - width/2, startY);
  trunk.quadraticCurveTo(
      startX + bendOffset, startY - height * 0.5,
      startX + bendOffset * 1.2, startY - height
  );
  trunk.lineTo(startX + width/2 + bendOffset * 1.2, startY - height);
  trunk.quadraticCurveTo(
      startX + width/2 + bendOffset, startY - height * 0.5,
      startX + width/2, startY
  );
  trunk.closePath();
  
  return trunk;
}

private generateBubblyFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
  const foliage: Path2D[] = [];
  const centerY = plant.position.y - plant.size * 0.6;
  const baseSize = plant.size * style.size;
  const clusters = 3 + Math.floor(Math.random() * 3);
  
  // Create main bubble shape
  const mainBubble = new Path2D();
  const points: Vector2[] = [];
  const segments = 32; // Higher segment count for smoother curves
  
  for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Create organic bubble shape with subtle variation
      const noise = this.noise2D(angle * 3 + plant.variation, 0) * 0.15;
      const radius = baseSize * (1 + noise);
      
      points.push({
          x: plant.position.x + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius * 0.9 // Slightly flatten
      });
  }
  
  this.createSmoothPath(mainBubble, points, true);
  foliage.push(mainBubble);
  
  // Add smaller bubbles for detail
  for (let i = 0; i < clusters; i++) {
      const bubble = new Path2D();
      const angle = (i / clusters) * Math.PI * 2;
      const distance = baseSize * 0.4;
      const size = baseSize * (0.3 + Math.random() * 0.3);
      const subPoints: Vector2[] = [];
      
      for (let j = 0; j <= segments; j++) {
          const subAngle = (j / segments) * Math.PI * 2;
          const subNoise = this.noise2D(subAngle * 4 + i, plant.variation) * 0.1;
          const subRadius = size * (1 + subNoise);
          
          subPoints.push({
              x: plant.position.x + Math.cos(angle) * distance + Math.cos(subAngle) * subRadius,
              y: centerY + Math.sin(angle) * distance * 0.9 + Math.sin(subAngle) * subRadius * 0.9
          });
      }
      
      this.createSmoothPath(bubble, subPoints, true);
      foliage.push(bubble);
  }
  
  return foliage;
}

  private generateTrunkGeometry(plant: Plant, style: TrunkStyle): Path2D {
      const trunk = new Path2D();
      const height = plant.size * 0.8;
      const baseWidth = plant.size * style.width;
      
      // Generate trunk control points
      const points: Vector2[] = [];
      const segments = 12;
      
      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          
          // Calculate trunk shape with various influences
          const twist = style.twist ? Math.sin(t * Math.PI * 2) * style.twist : 0;
          const bend = style.bend ? Math.sin(t * Math.PI) * style.bend : 0;
          const noise = this.noise2D(t * 10 + plant.variation, t) * 0.1;
          
          const width = baseWidth * (1 - t * style.taper);
          const x = plant.position.x + 
                   Math.cos(twist * Math.PI) * width + 
                   Math.sin(t * Math.PI) * bend * plant.size + 
                   noise * plant.size;
          const y = plant.position.y - height * t;
          
          points.push({ x, y });
      }

      // Create smooth trunk outline
      this.createSmoothPath(trunk, points);
      return trunk;
  }

  private generateConicalFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
      const foliage: Path2D[] = [];
      const layers = Math.ceil(4 * style.density);
      
      for (let i = 0; i < layers; i++) {
          const layer = new Path2D();
          const t = i / (layers - 1);
          const layerSize = style.size * plant.size * (1 - t * 0.7);
          const heightOffset = -plant.size * (0.4 + t * 0.5);
          
          // Generate layer points
          const points: Vector2[] = [];
          const segments = 24;
          
          for (let j = 0; j <= segments; j++) {
              const angle = (j / segments) * Math.PI * 2;
              const noise = this.noise2D(angle * 3 + i + plant.variation, t) * 0.2;
              const radius = layerSize * (1 + noise);
              
              points.push({
                  x: plant.position.x + Math.cos(angle) * radius,
                  y: plant.position.y + heightOffset + Math.sin(angle) * radius * 0.3
              });
          }
          
          this.createSmoothPath(layer, points);
          foliage.push(layer);
      }
      
      return foliage;
  }

  private generateSpreadingFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const clusters = Math.ceil(5 * style.density);
    
    // Generate main crown
    foliage.push(this.generateFoliageCrown(plant, style));
    
    // Generate spreading branches
    for (let i = 0; i < clusters; i++) {
        const angle = (i / clusters) * Math.PI * 2 + Math.random() * 0.5;
        const distance = style.size * plant.size * (0.3 + Math.random() * 0.4);
        const cluster = this.generateFoliageCluster(
            plant,
            angle,
            distance,
            style
        );
        foliage.push(...cluster);
    }
    
    return foliage;
}

private generateFoliageCrown(plant: Plant, style: FoliageStyle): Path2D {
    const crown = new Path2D();
    const points: Vector2[] = [];
    const segments = 32;
    const size = style.size * plant.size;
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        
        // Add multi-layered noise for natural variation
        let radius = size;
        radius *= 1 + Math.sin(angle * 2) * 0.2;
        radius *= 1 + this.noise2D(angle * 3 + plant.variation, 0) * 0.3;
        radius *= 1 + this.noise2D(angle * 7 + plant.variation, 1) * 0.15;
        
        points.push({
            x: plant.position.x + Math.cos(angle) * radius,
            y: plant.position.y - size * 0.6 + Math.sin(angle) * radius * 0.6
        });
    }
    
    this.createSmoothPath(crown, points, true);
    return crown;
}

private generateFoliageCluster(
    plant: Plant,
    angle: number,
    distance: number,
    style: FoliageStyle
): Path2D[] {
    const clusters: Path2D[] = [];
    const clusterCount = 2 + Math.floor(Math.random() * 3);
    const baseSize = style.size * plant.size * 0.4;
    
    for (let i = 0; i < clusterCount; i++) {
        const cluster = new Path2D();
        const clusterAngle = angle + (Math.random() - 0.5) * 0.5;
        const clusterDist = distance * (0.8 + Math.random() * 0.4);
        
        const center = {
            x: plant.position.x + Math.cos(clusterAngle) * clusterDist,
            y: plant.position.y - plant.size * 0.4 + Math.sin(clusterAngle) * clusterDist * 0.6
        };
        
        // Generate cluster points
        const points: Vector2[] = [];
        const segments = 16;
        
        for (let j = 0; j <= segments; j++) {
            const a = (j / segments) * Math.PI * 2;
            const noise = this.noise2D(a * 3 + i + plant.variation, i) * 0.3;
            const radius = baseSize * (0.8 + Math.random() * 0.4) * (1 + noise);
            
            points.push({
                x: center.x + Math.cos(a) * radius,
                y: center.y + Math.sin(a) * radius * 0.8
            });
        }
        
        this.createSmoothPath(cluster, points, true);
        clusters.push(cluster);
    }
    
    return clusters;
}

private generateWeepingFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    
    // Generate main crown
    foliage.push(this.generateFoliageCrown(plant, style));
    
    // Generate weeping branches
    const branchCount = Math.ceil(8 * style.density);
    
    for (let i = 0; i < branchCount; i++) {
        const branch = this.generateWeepingBranch(plant, i / branchCount, style);
        foliage.push(branch);
    }
    
    return foliage;
}

private generateWeepingBranch(
    plant: Plant,
    t: number,
    style: FoliageStyle
): Path2D {
    const branch = new Path2D();
    const angle = t * Math.PI * 2;
    const length = style.size * plant.size * 0.8;
    
    // Create branch base point
    const baseX = plant.position.x + Math.cos(angle) * length * 0.3;
    const baseY = plant.position.y - plant.size * 0.6;
    
    branch.moveTo(baseX, baseY);
    
    // Create weeping curve
    const controlPoints = this.generateWeepingCurve(
        { x: baseX, y: baseY },
        angle,
        length,
        style
    );
    
    // Create smooth curve through control points
    controlPoints.forEach((point, i) => {
        if (i === 0) return;
        
        const prev = controlPoints[i - 1];
        const curr = point;
        const next = controlPoints[Math.min(i + 1, controlPoints.length - 1)];
        
        const cp1 = {
            x: prev.x + (curr.x - prev.x) * 0.5,
            y: prev.y + (curr.y - prev.y) * 0.5
        };
        
        const cp2 = {
            x: curr.x + (next.x - curr.x) * 0.5,
            y: curr.y + (next.y - curr.y) * 0.5
        };
        
        branch.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x, next.y);
    });
    
    return branch;
}

private generateWeepingCurve(
    start: Vector2,
    angle: number,
    length: number,
    style: FoliageStyle
): Vector2[] {
    const points: Vector2[] = [start];
    const segments = 8;
    
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        
        // Create natural curve with increasing downward force
        const x = start.x + Math.cos(angle) * length * t;
        const y = start.y + (Math.pow(t, 2) * length * 1.2);
        
        // Add natural variation
        const noise = this.noise2D(x * 0.05, y * 0.05) * length * 0.1;
        
        points.push({
            x: x + noise,
            y: y + noise * 0.5
        });
    }
    
    return points;
}

private generateRoundedFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
  const foliage: Path2D[] = [];
  const mainShape = new Path2D();
  const centerY = plant.position.y - plant.size * 0.35; // Start above trunk
  const size = plant.size * style.size;

  // Create perfect circle for main shape
  mainShape.arc(plant.position.x, centerY, size * 0.5, 0, Math.PI * 2);
  foliage.push(mainShape);

  // Add 2-3 overlapping circles for depth
  const subCircles = 3;
  for (let i = 0; i < subCircles; i++) {
      const subShape = new Path2D();
      const angle = (i / subCircles) * Math.PI * 2;
      const distance = size * 0.2;
      const subSize = size * 0.4;
      
      subShape.arc(
          plant.position.x + Math.cos(angle) * distance,
          centerY + Math.sin(angle) * distance,
          subSize,
          0,
          Math.PI * 2
      );
      foliage.push(subShape);
  }

  return foliage;
}

private generateIrregularFoliage(plant: Plant, style: FoliageStyle): Path2D[] {
    const foliage: Path2D[] = [];
    const clusterCount = Math.ceil(4 * style.density);
    
    // Generate main irregular shape
    const mainShape = this.generateIrregularShape(plant, style);
    foliage.push(mainShape);
    
    // Add irregular clusters
    for (let i = 0; i < clusterCount; i++) {
        const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
        const distance = style.size * plant.size * (0.2 + Math.random() * 0.4);
        
        const cluster = this.generateIrregularCluster(
            plant,
            angle,
            distance,
            style
        );
        foliage.push(cluster);
    }
    
    return foliage;
}

private generateIrregularShape(plant: Plant, style: FoliageStyle): Path2D {
    const shape = new Path2D();
    const points: Vector2[] = [];
    const segments = 28;
    const size = style.size * plant.size;
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        
        // Create irregular radius with multiple noise frequencies
        let radius = size;
        radius *= 1 + Math.sin(angle * 3) * 0.3;
        radius *= 1 + this.noise2D(angle * 5 + plant.variation, 0) * 0.4;
        radius *= 1 + this.noise2D(angle * 9 + plant.variation, 1) * 0.2;
        
        points.push({
            x: plant.position.x + Math.cos(angle) * radius,
            y: plant.position.y - size * 0.6 + Math.sin(angle) * radius * 0.7
        });
    }
    
    this.createSmoothPath(shape, points, true);
    return shape;
}

private generateIrregularCluster(
    plant: Plant,
    angle: number,
    distance: number,
    style: FoliageStyle
): Path2D {
    const cluster = new Path2D();
    const size = style.size * plant.size * 0.4;
    const center = {
        x: plant.position.x + Math.cos(angle) * distance,
        y: plant.position.y - plant.size * 0.4 + Math.sin(angle) * distance
    };
    
    const points: Vector2[] = [];
    const segments = 16;
    
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        let radius = size;
        
        // Add multi-layered irregularity
        radius *= 1 + Math.sin(a * 4) * 0.3;
        radius *= 1 + this.noise2D(a * 6 + plant.variation, angle) * 0.4;
        
        points.push({
            x: center.x + Math.cos(a) * radius,
            y: center.y + Math.sin(a) * radius * 0.8
        });
    }
    
    this.createSmoothPath(cluster, points, true);
    return cluster;
}

// Helper method for creating smooth paths
private createSmoothPath(path: Path2D, points: Vector2[], closed: boolean = false): void {
  if (points.length < 2) return;
  
  path.moveTo(points[0].x, points[0].y);
  
  // Use tension 0.3 for smoother curves
  for (let i = 1; i < points.length - 2; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2];
      
      const cp1x = p1.x + (p2.x - p0.x) * 0.3;
      const cp1y = p1.y + (p2.y - p0.y) * 0.3;
      const cp2x = p2.x - (p3.x - p1.x) * 0.3;
      const cp2y = p2.y - (p3.y - p1.y) * 0.3;
      
      path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  
  if (closed) {
      path.closePath();
  }
}

  private generateBushGeometry(plant: Plant, style: PlantStyle): void {
      if (!style.foliage) return;

      const foliage: Path2D[] = [];
      const details: Path2D[] = [];

      // Generate main bush body with multiple clusters
      const clusterCount = Math.ceil(5 * style.foliage.density);
      
      // Create main central mass
      const mainCluster = this.generateBushCluster(
          plant.position,
          plant.size * style.foliage.size,
          style.foliage,
          1.2 // Slightly larger for main mass
      );
      foliage.push(mainCluster);

      // Add surrounding clusters
      for (let i = 0; i < clusterCount; i++) {
          const angle = (i / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
          const distance = plant.size * 0.3 * Math.random();
          const position = {
              x: plant.position.x + Math.cos(angle) * distance,
              y: plant.position.y + Math.sin(angle) * distance
          };

          const cluster = this.generateBushCluster(
              position,
              plant.size * style.foliage.size * (0.6 + Math.random() * 0.4),
              style.foliage,
              1.0
          );
          foliage.push(cluster);

          // Add fine branch details
          if (style.foliage.texture === 'detailed' || style.foliage.texture === 'complex') {
              const branchDetails = this.generateBushBranchDetails(
                  position,
                  angle,
                  plant.size * 0.3,
                  style.foliage
              );
              details.push(...branchDetails);
          }
      }

      plant.elements = {
          foliage,
          details,
          trunk: undefined
      };
  }

  private generateBushCluster(
      position: Vector2,
      size: number,
      style: FoliageStyle,
      scale: number
  ): Path2D {
      const cluster = new Path2D();
      const points: Vector2[] = [];
      const segments = 24;

      for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          
          // Create organic shape with multiple noise frequencies
          let radius = size * scale;
          radius *= 1 + Math.sin(angle * 2) * 0.2;
          radius *= 1 + this.noise2D(angle * 4 + position.x * 0.1, position.y * 0.1) * 0.3;
          radius *= 1 + this.noise2D(angle * 8 + position.x * 0.2, position.y * 0.2) * 0.15;

          points.push({
              x: position.x + Math.cos(angle) * radius,
              y: position.y + Math.sin(angle) * radius * 0.9 // Slightly flattened
          });
      }

      this.createSmoothPath(cluster, points, true);
      return cluster;
  }

  private generateBushBranchDetails(
      position: Vector2,
      angle: number,
      size: number,
      style: FoliageStyle
  ): Path2D[] {
      const details: Path2D[] = [];
      const branchCount = Math.floor(4 + Math.random() * 4);

      for (let i = 0; i < branchCount; i++) {
          const branchAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
          const branch = new Path2D();
          const length = size * (0.5 + Math.random() * 0.5);

          let currentPoint = position;
          branch.moveTo(currentPoint.x, currentPoint.y);

          // Create natural-looking branch curve
          const points: Vector2[] = [currentPoint];
          const segments = 4;

          for (let j = 1; j <= segments; j++) {
              const t = j / segments;
              const noise = this.noise2D(t * 10 + i, angle) * size * 0.1;
              
              currentPoint = {
                  x: position.x + Math.cos(branchAngle) * length * t + noise,
                  y: position.y + Math.sin(branchAngle) * length * t + noise * 0.5
              };
              points.push(currentPoint);
          }

          this.createSmoothPath(branch, points);
          details.push(branch);
      }

      return details;
  }

  private generateFlowerGeometry(plant: Plant, style: PlantStyle): void {
      if (!style.foliage) return;

      const petalCount = Math.floor(5 + Math.random() * 3);
      const layers = style.foliage.density > 1 ? 2 : 1;

      const foliage: Path2D[] = [];
      const details: Path2D[] = [];

      // Generate stem
      const stem = this.generateFlowerStem(plant, style);
      details.push(stem);

      // Generate petals in layers
      for (let layer = 0; layer < layers; layer++) {
          const layerPetals = this.generateFlowerPetals(
              plant,
              petalCount,
              layer,
              style.foliage
          );
          foliage.push(...layerPetals);
      }

      // Generate flower center
      const center = this.generateFlowerCenter(plant, style.foliage);
      details.push(center);

      plant.elements = {
          foliage,
          details,
          trunk: undefined
      };
  }

  private generateFlowerStem(plant: Plant, style: PlantStyle): Path2D {
      const stem = new Path2D();
      const stemHeight = plant.size * 0.8;
      const bendStrength = 0.2 + Math.random() * 0.2;

      const points: Vector2[] = [];
      const segments = 8;

      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const bendOffset = Math.sin(t * Math.PI) * plant.size * bendStrength;
          const noise = this.noise2D(t * 10 + plant.variation, t) * plant.size * 0.05;

          points.push({
              x: plant.position.x + bendOffset + noise,
              y: plant.position.y - stemHeight * t
          });
      }

      this.createSmoothPath(stem, points);
      return stem;
  }

  private generateFlowerPetals(
      plant: Plant,
      count: number,
      layer: number,
      style: FoliageStyle
  ): Path2D[] {
      const petals: Path2D[] = [];
      const baseSize = plant.size * style.size * (1 - layer * 0.2);
      const angleOffset = layer * (Math.PI / count);

      for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + angleOffset;
          const petal = this.generatePetal(
              {
                  x: plant.position.x,
                  y: plant.position.y - plant.size * 0.8
              },
              angle,
              baseSize,
              style
          );
          petals.push(petal);
      }

      return petals;
  }

  private generatePetal(
      center: Vector2,
      angle: number,
      size: number,
      style: FoliageStyle
  ): Path2D {
      const petal = new Path2D();
      const points: Vector2[] = [];
      const segments = 12;

      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          // Create teardrop shape for petal
          const width = Math.sin(t * Math.PI) * size * 0.3;
          const length = Math.sin(t * Math.PI) * size;

          const noise = this.noise2D(t * 5 + angle, t) * size * 0.1;
          
          points.push({
              x: center.x + Math.cos(angle) * length + 
                 Math.cos(angle + Math.PI/2) * width + noise,
              y: center.y + Math.sin(angle) * length + 
                 Math.sin(angle + Math.PI/2) * width + noise * 0.5
          });
      }

      this.createSmoothPath(petal, points, true);
      return petal;
  }

  private generateFlowerCenter(plant: Plant, style: FoliageStyle): Path2D {
      const center = new Path2D();
      const size = plant.size * style.size * 0.2;
      const position = {
          x: plant.position.x,
          y: plant.position.y - plant.size * 0.8
      };

      // Create detailed center with inner pattern
      const points: Vector2[] = [];
      const segments = 16;

      for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const noise = this.noise2D(angle * 3 + plant.variation, 0) * size * 0.15;
          const radius = size * (1 + noise);

          points.push({
              x: position.x + Math.cos(angle) * radius,
              y: position.y + Math.sin(angle) * radius
          });
      }

      this.createSmoothPath(center, points, true);
      return center;
  }

  private generateGrassGeometry(plant: Plant, style: PlantStyle): void {
      if (!style.foliage) return;

      const bladeCount = Math.ceil(6 * style.foliage.density);
      const foliage: Path2D[] = [];

      for (let i = 0; i < bladeCount; i++) {
          const blade = this.generateGrassBlade(plant, i, bladeCount, style.foliage);
          foliage.push(blade);
      }

      plant.elements = {
          foliage,
          details: [],
          trunk: undefined
      };
  }

  private generateGrassBlade(
      plant: Plant,
      index: number,
      total: number,
      style: FoliageStyle
  ): Path2D {
      const blade = new Path2D();
      const angle = ((index + Math.random() * 0.5) / total) * Math.PI - Math.PI/2;
      const height = plant.size * style.size * (0.7 + Math.random() * 0.3);
      const width = plant.size * 0.05;
      const curve = 0.3 + Math.random() * 0.3;

      const points: Vector2[] = [];
      const segments = 8;

      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const bendOffset = Math.sin(t * Math.PI) * height * curve;
          const widthOffset = Math.sin(t * Math.PI) * width;
          const noise = this.noise2D(t * 10 + index, plant.variation) * width;

          points.push({
              x: plant.position.x + Math.cos(angle) * bendOffset + 
                 Math.cos(angle + Math.PI/2) * widthOffset + noise,
              y: plant.position.y + Math.sin(angle) * bendOffset + 
                 Math.sin(angle + Math.PI/2) * widthOffset - height * t
          });
      }

      this.createSmoothPath(blade, points);
      return blade;
  }

  private generateFernGeometry(plant: Plant, style: PlantStyle): void {
      if (!style.foliage) return;

      const frondCount = Math.ceil(4 * style.foliage.density);
      const foliage: Path2D[] = [];
      const details: Path2D[] = [];

      // Generate main stem
      const stem = this.generateFernStem(plant, style);
      details.push(stem);

      // Generate fronds
      for (let i = 0; i < frondCount; i++) {
          const t = i / (frondCount - 1);
          const frond = this.generateFernFrond(plant, t, style.foliage);
          foliage.push(frond);
      }

      plant.elements = {
          foliage,
          details,
          trunk: undefined
      };
  }

  private generateFernStem(plant: Plant, style: PlantStyle): Path2D {
      const stem = new Path2D();
      const height = plant.size * 0.9;
      const curve = 0.2 + Math.random() * 0.2;

      const points: Vector2[] = [];
      const segments = 10;

      for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const bendOffset = Math.sin(t * Math.PI) * height * curve;
          const noise = this.noise2D(t * 10 + plant.variation, t) * plant.size * 0.05;

          points.push({
              x: plant.position.x + bendOffset + noise,
              y: plant.position.y - height * t
          });
      }

      this.createSmoothPath(stem, points);
      return stem;
  }

// Additional required methods
private updatePlantConditions(plant: Plant, zone: VegetationZone): void {
    // Update plant properties based on zone conditions
    const { moisture, light, wind } = zone.conditions || 
        { moisture: 0.5, light: 0.8, wind: 0.5 };

    // Adjust colors based on conditions
    plant.colors.primary = this.adjustColorForConditions(
        plant.colors.primary,
        moisture,
        light
    );
    plant.colors.secondary = this.adjustColorForConditions(
        plant.colors.secondary,
        moisture,
        light
    );

    // Adjust animation parameters
    plant.animation.swayAmount *= 0.8 + wind * 0.4;
    plant.animation.swaySpeed *= 0.8 + wind * 0.4;
}

private adjustColorForConditions(
    color: HSLColor,
    moisture: number,
    light: number
): HSLColor {
    return [
        color[0],
        Math.min(100, color[1] * (0.8 + moisture * 0.4)),
        Math.min(100, color[2] * (0.8 + light * 0.4))
    ];
}

private calculateWindEffect(plant: Plant, time: number): number {
    const baseWind = this.noise2D(
        time * 0.001,
        plant.position.y * 0.01
    ) * 0.5 + 0.5;
    
    const localWind = this.noise2D(
        plant.position.x * 0.02 + time * 0.001,
        plant.position.y * 0.02
    ) * 0.3;
    
    return Math.min(1, baseWind + localWind);
}

private getTerrainInfoAt(x: number, y: number): TerrainInfo {
    return {
        height: this.calculateHeightAt(x, y),
        slope: this.calculateSlopeAt(x, y),
        moisture: this.calculateMoistureAt(x, y)
    };
}

private calculateHeightAt(x: number, y: number): number {
    let height = 0;
    for (let freq = 1; freq <= 4; freq++) {
        height += this.noise2D(x * 0.005 * freq, y * 0.005 * freq) / freq;
    }
    return height;
}

private getDefaultStyleForType(type: PlantType): string {
    const plantDef = PLANT_TYPES[type];
    return plantDef.variations?.[0].name || 'default';
}

private isValidPlantLocation(position: Vector2): boolean {
  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return false;
  }

  const terrainInfo = this.getTerrainInfoAt(position.x, position.y);
  if (!terrainInfo) return false;
  
  // Check basic terrain conditions
  if (terrainInfo.height < 0) return false;
  if (terrainInfo.slope > 0.8) return false;
  
  // Check distance from existing plants
  for (const plant of this.plants) {
      if (!plant.position || !plant.size) continue;
      const distance = Math.hypot(
          position.x - plant.position.x,
          position.y - plant.position.y
      );
      if (distance < plant.size * 0.8) return false;
  }
  
  return true;
}

// Public update methods
public update(time: number, deltaTime: number): void {
    this.timeOfDay = (Math.sin(time * 0.0001) + 1) / 2;
    this.updatePlants(time, deltaTime);
    this.timeOfDay = (Math.sin(time * 0.0001) + 1) / 2;
    this.windTime = time;
    this.updateWind(time);
    this.updatePlants(time, deltaTime);
}

private updateWind(time: number): void {
  // Calculate base wind
  const baseWind = this.noise2D(time * 0.001, 0) * 0.5 + 0.5;
  
  // Add gusts
  const gustStrength = this.noise2D(time * 0.005, 100) * 0.3;
  
  this.windIntensity = Math.min(1, baseWind + gustStrength);
}

private updatePlants(time: number, deltaTime: number): void {
  if (!this.plants) return;

  this.plants.forEach(plant => {
      if (!plant || !plant.animation) return;

      // Update growth
      if (plant.growth < 1) {
          plant.growth += deltaTime * plant.animation.growthSpeed;
          plant.growth = Math.min(1, plant.growth);
      }

      // Calculate wind effect for this plant
      const localWind = this.calculateLocalWind(plant, time);
      if (localWind === undefined) return;

      // Update animation based on type
      switch (plant.type) {
          case 'tree':
              this.updateTreeAnimation(plant, localWind, time);
              break;
          case 'flower':
              this.updateFlowerAnimation(plant, localWind, time);
              break;
          case 'grass':
              this.updateGrassAnimation(plant, localWind, time);
              break;
          case 'bush':
              this.updateBushAnimation(plant, localWind, time);
              break;
          case 'fern':
              this.updateFernAnimation(plant, localWind, time);
              break;
      }
  });
}

private updateTreeAnimation(plant: Plant, localWind: number, time: number): void {
  if (!plant || !plant.animation) return;

  const baseFreq = time * 0.001;
  const swayAmount = (plant.animation.swayAmount || 0.3) * localWind;

  plant.animation.currentOffset = {
      x: Math.sin(baseFreq + plant.animation.swayOffset) * swayAmount,
      y: Math.cos(baseFreq * 0.7 + plant.animation.swayOffset) * swayAmount * 0.3
  };
}

private updateFlowerAnimation(plant: Plant, localWind: number, time: number): void {
  if (!plant || !plant.animation) return;

  const baseFreq = time * 0.001;
  const swayAmount = (plant.animation.swayAmount || 0.4) * localWind;

  plant.animation.currentOffset = {
      x: Math.sin(baseFreq + plant.animation.swayOffset) * swayAmount,
      y: Math.abs(Math.sin(baseFreq * 1.5 + plant.animation.swayOffset)) * swayAmount * 0.2
  };
}

private updateGrassAnimation(plant: Plant, localWind: number, time: number): void {
  if (!plant || !plant.animation) return;

  const baseFreq = time * 0.001;
  const swayAmount = (plant.animation.swayAmount || 0.5) * localWind;

  plant.animation.currentOffset = {
      x: Math.sin(baseFreq + plant.animation.swayOffset) * swayAmount,
      y: Math.abs(Math.sin(baseFreq * 2 + plant.animation.swayOffset)) * swayAmount * 0.2
  };
}

private updateBushAnimation(plant: Plant, localWind: number, time: number): void {
  if (!plant || !plant.animation) return;

  const baseFreq = time * 0.001;
  const swayAmount = (plant.animation.swayAmount || 0.25) * localWind;

  plant.animation.currentOffset = {
      x: Math.sin(baseFreq + plant.animation.swayOffset) * swayAmount,
      y: Math.cos(baseFreq * 0.5 + plant.animation.swayOffset) * swayAmount * 0.2
  };
}

private updateFernAnimation(plant: Plant, localWind: number, time: number): void {
  if (!plant || !plant.animation) return;

  const baseFreq = time * 0.001;
  const swayAmount = (plant.animation.swayAmount || 0.35) * localWind;

  plant.animation.currentOffset = {
      x: Math.sin(baseFreq + plant.animation.swayOffset) * swayAmount,
      y: Math.sin(baseFreq * 0.8 + plant.animation.swayOffset) * swayAmount * 0.3
  };
}

private getBaseSwayAmount(type: PlantType): number {
  switch (type) {
      case 'tree': return 0.3;
      case 'flower': return 0.4;
      case 'grass': return 0.5;
      case 'bush': return 0.25;
      case 'fern': return 0.35;
      default: return 0.3;
  }
}

private getBaseSwaySpeed(type: PlantType): number {
  switch (type) {
      case 'tree': return 0.6;
      case 'flower': return 0.8;
      case 'grass': return 1.0;
      case 'bush': return 0.5;
      case 'fern': return 0.7;
      default: return 0.6;
  }
}

private calculateLocalWind(plant: Plant, time: number): number {
  if (!plant || !plant.position) return 0;

  // Base wind intensity from global wind
  let wind = this.windIntensity;

  // Add position-based variation
  const positionVariation = this.noise2D(
      plant.position.x * 0.01 + time * 0.001,
      plant.position.y * 0.01
  ) * 0.3;

  // Add time-based variation
  const timeVariation = this.noise2D(
      time * 0.001,
      plant.variation
  ) * 0.2;

  return Math.min(1, Math.max(0, wind + positionVariation + timeVariation));
}


// Public zone management methods
public getZoneAt(position: Vector2): VegetationZone | null {
    return this.zones.find(zone => this.isPointInZone(position, zone)) || null;
}

private isPointInZone(point: Vector2, zone: VegetationZone): boolean {
    const ctx = new Path2D();
    return ctx.isPointInPath(zone.bounds, point.x, point.y);
}
}