import { createNoise2D, createNoise3D } from "simplex-noise";
import { ColorSystem, ColorBridge } from "../../utils/colors";

interface PlantDefinition {
  type: 'tree' | 'bush' | 'flower' | 'grass' | 'fern';
  size: { min: number; max: number };
  density: number;
  conditions: {
    minSlope: number;
    maxSlope: number;
    minMoisture: number;
    preferredLight: number;
  };
}

interface Plant {
  type: PlantDefinition['type'];
  position: Vector2;
  size: number;
  growth: number;
  variation: number;
  elements: {
    trunk?: Path2D;
    foliage: Path2D[];
    details: Path2D[];
  };
  colors: {
    primary: HSLColor;
    secondary: HSLColor;
    detail: HSLColor;
  };
  animation: {
    swayOffset: number;
    growthSpeed: number;
    phase: number;
  };
}

interface Vector2 {
  x: number;
  y: number;
}

interface HSLColor {
  h: number;
  s: number;
  b: number;
  a?: number;
}

export class VegetationSystem {
  private noise2D: ReturnType<typeof createNoise2D>;
  private noise3D: ReturnType<typeof createNoise3D>;
  private plants: Plant[] = [];
  private growthProgress: number = 0;

  private zones: {
    shoreline: { start: number; end: number };
    vegetation: {
      denseGrowth: Vector2[];
      sparse: Vector2[];
      sheltered: Vector2[];
    };
  };

  private readonly PLANT_TYPES: Record<string, PlantDefinition> = {
    tree: {
      type: 'tree',
      size: { min: 80, max: 150 },
      density: 0.3,
      conditions: {
        minSlope: 0,
        maxSlope: 0.4,
        minMoisture: 0.3,
        preferredLight: 0.8
      }
    },
    bush: {
      type: 'bush',
      size: { min: 30, max: 60 },
      density: 0.6,
      conditions: {
        minSlope: 0,
        maxSlope: 0.6,
        minMoisture: 0.2,
        preferredLight: 0.6
      }
    },
    flower: {
      type: 'flower',
      size: { min: 15, max: 30 },
      density: 0.8,
      conditions: {
        minSlope: 0,
        maxSlope: 0.3,
        minMoisture: 0.4,
        preferredLight: 0.9
      }
    },
    grass: {
      type: 'grass',
      size: { min: 10, max: 25 },
      density: 1,
      conditions: {
        minSlope: 0,
        maxSlope: 0.7,
        minMoisture: 0.2,
        preferredLight: 0.7
      }
    },
    fern: {
      type: 'fern',
      size: { min: 20, max: 40 },
      density: 0.5,
      conditions: {
        minSlope: 0,
        maxSlope: 0.5,
        minMoisture: 0.6,
        preferredLight: 0.4
      }
    }
  };

  constructor(private width: number, private height: number, private waterLevel: number) {
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.initializeZones();
    this.initializeVegetation();
  }

  private initializeZones() {
    const shoreline = {
      start: this.waterLevel - this.height * 0.05,
      end: this.waterLevel + this.height * 0.1
    };

    // Create vegetation growth zones
    const denseGrowth = this.generateGrowthZones(3, 0.15); // Larger, fewer zones
    const sparse = this.generateGrowthZones(5, 0.08);      // Medium zones
    const sheltered = this.generateGrowthZones(2, 0.2);    // Few but large sheltered areas

    this.zones = {
      shoreline,
      vegetation: { denseGrowth, sparse, sheltered }
    };
  }

  private initializeVegetation() {
    // Generate moisture map for plant placement
    const moistureMap = this.generateMoistureMap();
    
    // Place different types of vegetation based on conditions
    Object.values(this.PLANT_TYPES).forEach(plantType => {
      this.generatePlantsOfType(plantType, moistureMap);
    });
  }

  private generateGrowthZones(count: number, sizeScale: number): Vector2[] {
    const zones: Vector2[] = [];
    const safeMargin = this.width * 0.1; // Keep away from edges

    for (let i = 0; i < count; i++) {
      // Use noise to make placement more natural
      const x = safeMargin + (this.width - 2 * safeMargin) * 
                (0.5 + this.noise2D(i * 0.5, 0) * 0.5);
      const y = this.waterLevel + this.noise2D(i * 0.5, 1) * this.height * 0.2;

      zones.push({ x, y });
    }

    return zones;
  }

  private evaluateGrowthPotential(x: number, y: number, type: PlantDefinition['type']): number {
    let potential = 0;

    // Base distance from water influence
    const waterDistance = Math.abs(y - this.waterLevel);
    const waterInfluence = Math.max(0, 1 - waterDistance / (this.height * 0.2));

    // Zone-specific influences
    const { vegetation } = this.zones;
    
    switch (type) {
      case 'tree':
        // Trees prefer sheltered zones far from water
        potential = this.evaluateZoneInfluence(x, y, vegetation.sheltered, 0.3);
        potential *= Math.max(0.2, 1 - waterInfluence);
        break;
        
      case 'bush':
        // Bushes grow in both dense and sparse zones
        potential = Math.max(
          this.evaluateZoneInfluence(x, y, vegetation.denseGrowth, 0.2),
          this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.15)
        );
        break;
        
      case 'flower':
        // Flowers prefer sparse zones and moderate moisture
        potential = this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.15);
        potential *= waterInfluence * 0.7;
        break;
        
      case 'grass':
        // Grass grows everywhere but denser in growth zones
        potential = 0.3 + Math.max(
          this.evaluateZoneInfluence(x, y, vegetation.denseGrowth, 0.1),
          this.evaluateZoneInfluence(x, y, vegetation.sparse, 0.05)
        );
        break;
        
      case 'fern':
        // Ferns prefer sheltered, moist areas
        potential = this.evaluateZoneInfluence(x, y, vegetation.sheltered, 0.25);
        potential *= waterInfluence;
        break;
    }

    // Add some noise variation
    potential *= 0.8 + this.noise2D(x * 0.01, y * 0.01) * 0.4;

    return Math.min(1, Math.max(0, potential));
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

  private generatePlantsOfType(plantDef: PlantDefinition, moistureMap: number[][]) {
    const gridSize = plantDef.type === 'tree' ? 40 : 20;
    const cols = Math.ceil(this.width / gridSize);
    const rows = Math.ceil(this.height / gridSize);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const worldX = x * gridSize + Math.random() * gridSize;
        const worldY = y * gridSize + Math.random() * gridSize;

        // Skip if below water
        if (worldY > this.waterLevel) continue;

        const growthPotential = this.evaluateGrowthPotential(worldX, worldY, plantDef.type);
        const moisture = this.getMoistureAt(worldX, worldY, moistureMap);
        const slope = this.getSlopeAt(worldX, worldY);

        if (this.isValidPlantLocation(plantDef, moisture, slope)) {
          if (Math.random() < plantDef.density * growthPotential) {
            this.createPlant(plantDef, { x: worldX, y: worldY });
          }
        }
      }
    }
  }

  private generateMoistureMap(): number[][] {
    const resolution = 50;
    const map: number[][] = [];
    
    for (let y = 0; y < resolution; y++) {
      map[y] = [];
      for (let x = 0; x < resolution; x++) {
        const worldX = (x / resolution) * this.width;
        const worldY = (y / resolution) * this.height;

        // Base moisture from water proximity
        const waterDist = Math.abs(worldY - this.waterLevel);
        let moisture = Math.max(0, 1 - waterDist / (this.height * 0.2));

        // Enhanced by vegetation zones
        const zoneInfluence = Math.max(
          this.evaluateZoneInfluence(worldX, worldY, this.zones.vegetation.denseGrowth, 0.15),
          this.evaluateZoneInfluence(worldX, worldY, this.zones.vegetation.sheltered, 0.2)
        );
        moisture = moisture * 0.7 + zoneInfluence * 0.3;

        // Add noise variation
        const variation = this.noise2D(x * 0.2, y * 0.2) * 0.2;
        map[y][x] = Math.min(1, Math.max(0, moisture + variation));
      }
    }
    
    return map;
  }

  private createPlant(def: PlantDefinition, position: Vector2): Plant {
    const size = def.size.min + Math.random() * (def.size.max - def.size.min);
    const variation = Math.random();
    
    const plant: Plant = {
      type: def.type,
      position,
      size,
      growth: 0,
      variation,
      elements: {
        foliage: [],
        details: []
      },
      colors: this.getPlantColors(def.type),
      animation: {
        swayOffset: Math.random() * Math.PI * 2,
        growthSpeed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      }
    };

    // Generate plant geometry
    switch (def.type) {
      case 'tree':
        this.generateTreeGeometry(plant);
        break;
      case 'bush':
        this.generateBushGeometry(plant);
        break;
      case 'flower':
        this.generateFlowerGeometry(plant);
        break;
      case 'grass':
        this.generateGrassGeometry(plant);
        break;
      case 'fern':
        this.generateFernGeometry(plant);
        break;
    }

    this.plants.push(plant);
    return plant;
  }

  private generateTreeGeometry(plant: Plant) {
    // Generate trunk
    plant.elements.trunk = new Path2D();
    const trunkWidth = plant.size * 0.1;
    const trunkHeight = plant.size * 0.7;
    
    // Create natural trunk curve
    const points: Vector2[] = [];
    const segments = 10;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = plant.position.x + 
                this.noise2D(t * 10, plant.variation) * trunkWidth * 0.5;
      const y = plant.position.y - t * trunkHeight;
      points.push({ x, y });
    }
    
    // Draw trunk
    plant.elements.trunk.moveTo(points[0].x - trunkWidth/2, points[0].y);
    points.forEach((point, i) => {
      if (i === 0) return;
      const width = trunkWidth * (1 - i/segments * 0.7);
      plant.elements.trunk.quadraticCurveTo(
        point.x, point.y,
        point.x + width/2, point.y
      );
    });
    points.reverse().forEach((point, i) => {
      if (i === 0) return;
      const width = trunkWidth * (i/segments * 0.7);
      plant.elements.trunk.quadraticCurveTo(
        point.x, point.y,
        point.x - width/2, point.y
      );
    });
    
    // Generate foliage layers
    const layers = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < layers; i++) {
      const layer = new Path2D();
      const layerSize = plant.size * (0.5 + i * 0.2);
      const centerY = points[Math.floor(points.length * 0.7)].y - i * plant.size * 0.2;
      
      // Create organic foliage shape
      let angle = 0;
      layer.moveTo(
        plant.position.x + Math.cos(angle) * layerSize,
        centerY + Math.sin(angle) * layerSize * 0.5
      );
      
      while (angle < Math.PI * 2) {
        angle += 0.1;
        const radius = layerSize * (0.8 + 
          this.noise2D(angle + i, plant.variation) * 0.4);
        layer.lineTo(
          plant.position.x + Math.cos(angle) * radius,
          centerY + Math.sin(angle) * radius * 0.5
        );
      }
      layer.closePath();
      plant.elements.foliage.push(layer);
    }
  }

  private generateFlowerGeometry(plant: Plant) {
    const stem = new Path2D();
    const petalCount = 8 + Math.floor(Math.random() * 5);
    const petalSize = plant.size * 0.2;
    
    // Create stem
    stem.moveTo(plant.position.x, plant.position.y);
    stem.quadraticCurveTo(
      plant.position.x + Math.sin(plant.animation.phase) * 5,
      plant.position.y - plant.size * 0.6,
      plant.position.x + Math.sin(plant.animation.phase) * 10,
      plant.position.y - plant.size
    );
    plant.elements.details.push(stem);
    
    // Create petals
    for (let i = 0; i < petalCount; i++) {
      const petal = new Path2D();
      const angle = (i / petalCount) * Math.PI * 2;
      const petalOffset = {
        x: Math.cos(angle) * petalSize,
        y: Math.sin(angle) * petalSize
      };
      
      petal.moveTo(
        plant.position.x + Math.sin(plant.animation.phase) * 10,
        plant.position.y - plant.size
      );
      petal.quadraticCurveTo(
        plant.position.x + Math.sin(plant.animation.phase) * 10 + petalOffset.x * 1.5,
        plant.position.y - plant.size + petalOffset.y * 1.5,
        plant.position.x + Math.sin(plant.animation.phase) * 10 + petalOffset.x,
        plant.position.y - plant.size + petalOffset.y
      );
      
      plant.elements.foliage.push(petal);
    }
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

  update(time: number, deltaTime: number) {
    // Update growth
    this.plants.forEach(plant => {
      if (plant.growth < 1) {
        plant.growth += deltaTime * plant.animation.growthSpeed * 0.001;
      }
      plant.animation.phase = time * 0.001 + plant.animation.swayOffset;
    });
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    // Sort plants by y position for proper layering
    const sortedPlants = [...this.plants].sort((a, b) => a.position.y - b.position.y);
    
    sortedPlants.forEach(plant => {
      ctx.save();
      
      // Apply growth scale
      ctx.translate(plant.position.x, plant.position.y);
      ctx.scale(plant.growth, plant.growth);
      ctx.translate(-plant.position.x, -plant.position.y);
      
      // Draw trunk if exists
      if (plant.elements.trunk) {
        const trunkGradient = ctx.createLinearGradient(
          plant.position.x, plant.position.y,
          plant.position.x, plant.position.y - plant.size
        );

        // Continuing the draw method in VegetationSystem...

        trunkGradient.addColorStop(0, `hsla(${plant.colors.detail.h}, ${plant.colors.detail.s}%, ${plant.colors.detail.b}%, 0.9)`);
        trunkGradient.addColorStop(1, `hsla(${plant.colors.detail.h}, ${plant.colors.detail.s}%, ${plant.colors.detail.b - 10}%, 0.9)`);
        
        ctx.fillStyle = trunkGradient;
        ctx.fill(plant.elements.trunk);
      }
      
      // Draw foliage with animation
      plant.elements.foliage.forEach((foliage, i) => {
        // Calculate sway based on time and plant's properties
        const sway = Math.sin(time * 0.001 + plant.animation.swayOffset + i * 0.2) * 3;
        ctx.save();
        ctx.translate(sway, 0);
        
        // Create gradient for foliage
        const gradient = ctx.createLinearGradient(
          plant.position.x,
          plant.position.y - plant.size,
          plant.position.x,
          plant.position.y
        );
        
        gradient.addColorStop(0, `hsla(${plant.colors.primary.h}, ${plant.colors.primary.s}%, ${plant.colors.primary.b + 5}%, 0.9)`);
        gradient.addColorStop(1, `hsla(${plant.colors.primary.h}, ${plant.colors.primary.s}%, ${plant.colors.primary.b}%, 0.9)`);
        
        ctx.fillStyle = gradient;
        ctx.fill(foliage);
        ctx.restore();
      });
      
      // Draw details (stems, specific features)
      plant.elements.details.forEach(detail => {
        ctx.strokeStyle = `hsla(${plant.colors.secondary.h}, ${plant.colors.secondary.s}%, ${plant.colors.secondary.b}%, 0.8)`;
        ctx.lineWidth = 1;
        ctx.stroke(detail);
      });
      
      ctx.restore();
    });
  }

  private generateBushGeometry(plant: Plant) {
    // Create multiple foliage clusters
    const clusterCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < clusterCount; i++) {
      const cluster = new Path2D();
      const clusterSize = plant.size * (0.6 + Math.random() * 0.4);
      const offset = {
        x: (Math.random() - 0.5) * plant.size * 0.5,
        y: -Math.random() * plant.size * 0.3
      };
      
      // Create organic bush shape
      let angle = 0;
      const startX = plant.position.x + offset.x;
      const startY = plant.position.y + offset.y;
      
      cluster.moveTo(startX, startY);
      
      while (angle < Math.PI * 2) {
        angle += 0.1;
        const radius = clusterSize * (0.8 + this.noise2D(angle + i, plant.variation) * 0.4);
        cluster.lineTo(
          startX + Math.cos(angle) * radius,
          startY + Math.sin(angle) * radius * 0.8
        );
      }
      
      cluster.closePath();
      plant.elements.foliage.push(cluster);
    }
    
    // Add some detail lines for texture
    for (let i = 0; i < 10; i++) {
      const detail = new Path2D();
      const angle = Math.random() * Math.PI * 2;
      const length = plant.size * (0.2 + Math.random() * 0.3);
      
      detail.moveTo(
        plant.position.x + Math.cos(angle) * plant.size * 0.3,
        plant.position.y + Math.sin(angle) * plant.size * 0.3
      );
      detail.lineTo(
        plant.position.x + Math.cos(angle) * (plant.size * 0.3 + length),
        plant.position.y + Math.sin(angle) * (plant.size * 0.3 + length)
      );
      
      plant.elements.details.push(detail);
    }
  }

  private generateFernGeometry(plant: Plant) {
    const frondCount = 4 + Math.floor(Math.random() * 4);
    const segmentCount = 10;
    const frondLength = plant.size * 0.8;
    
    for (let i = 0; i < frondCount; i++) {
      const frond = new Path2D();
      const baseAngle = (i / frondCount) * Math.PI;
      
      // Create main frond stem
      let currentPoint = {
        x: plant.position.x,
        y: plant.position.y
      };
      
      frond.moveTo(currentPoint.x, currentPoint.y);
      
      // Generate segments with leaflets
      for (let j = 0; j < segmentCount; j++) {
        const t = j / segmentCount;
        const angle = baseAngle + Math.sin(t * Math.PI) * 0.3;
        
        // Calculate next point on main stem
        currentPoint = {
          x: plant.position.x + Math.cos(angle) * frondLength * t,
          y: plant.position.y - frondLength * t
        };
        
        frond.lineTo(currentPoint.x, currentPoint.y);
        
        // Add leaflets
        if (j > 0) {
          const leafletSize = (frondLength * 0.2) * (1 - t);
          const leafletCount = 3;
          
          for (let k = 0; k < leafletCount; k++) {
            const leaflet = new Path2D();
            const leafletAngle = angle + Math.PI * 0.3 * (k - 1);
            
            leaflet.moveTo(currentPoint.x, currentPoint.y);
            leaflet.quadraticCurveTo(
              currentPoint.x + Math.cos(leafletAngle) * leafletSize * 0.7,
              currentPoint.y + Math.sin(leafletAngle) * leafletSize * 0.7,
              currentPoint.x + Math.cos(leafletAngle) * leafletSize,
              currentPoint.y + Math.sin(leafletAngle) * leafletSize
            );
            
            plant.elements.details.push(leaflet);
          }
        }
      }
      
      plant.elements.foliage.push(frond);
    }
  }

  private getPlantColors(type: PlantDefinition['type']): Plant['colors'] {
    switch (type) {
      case 'tree':
        return {
          primary: { h: 120, s: 40, b: 35 },
          secondary: { h: 120, s: 35, b: 30 },
          detail: { h: 30, s: 40, b: 30 }
        };
      case 'bush':
        return {
          primary: { h: 115, s: 45, b: 30 },
          secondary: { h: 115, s: 40, b: 25 },
          detail: { h: 115, s: 35, b: 20 }
        };
      case 'flower':
        const hue = Math.random() > 0.5 ? 0 : 280; // Red or Purple
        return {
          primary: { h: hue, s: 70, b: 60 },
          secondary: { h: 120, s: 40, b: 35 },
          detail: { h: 120, s: 35, b: 30 }
        };
      case 'grass':
        return {
          primary: { h: 110, s: 50, b: 35 },
          secondary: { h: 110, s: 45, b: 30 },
          detail: { h: 110, s: 40, b: 25 }
        };
      case 'fern':
        return {
          primary: { h: 125, s: 45, b: 30 },
          secondary: { h: 125, s: 40, b: 25 },
          detail: { h: 125, s: 35, b: 20 }
        };
    }
  }

  private getMoistureAt(x: number, y: number, moistureMap: number[][]): number {
    const mapX = Math.floor((x / this.width) * moistureMap[0].length);
    const mapY = Math.floor((y / this.height) * moistureMap.length);
    return moistureMap[mapY]?.[mapX] ?? 0;
  }

  private getSlopeAt(x: number, y: number): number {
    // Simplified slope calculation using noise
    const resolution = 0.1;
    const height1 = this.noise2D(x * resolution, y * resolution);
    const height2 = this.noise2D((x + 1) * resolution, (y + 1) * resolution);
    return Math.abs(height2 - height1);
  }

  private isValidPlantLocation(
    plantDef: PlantDefinition,
    moisture: number,
    slope: number
  ): boolean {
    return moisture >= plantDef.conditions.minMoisture &&
           slope >= plantDef.conditions.minSlope &&
           slope <= plantDef.conditions.maxSlope;
  }
}