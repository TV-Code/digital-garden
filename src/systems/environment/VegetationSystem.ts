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
  style?: 'BIRCH' | 'WILLOW' | 'CHERRY';
}

interface VegetationClusterParams {
  position: Vector2;
  slope: number;
  moisture: number;
  terrainHeight: number;
}

interface TreeTrunkStyle {
  color: HSLColor;
  width: number;
  taper: number;
  bend?: number;
  twist?: number;
  markings?: HSLColor;
  markingDensity?: number;
}

interface TreeFoliageStyle {
  colors: HSLColor[];
  shape: 'drooping' | 'organic' | 'blossoms';
  density: number;
  size: number;
  animation: {
      swayAmount: number;
      swaySpeed: number;
  };
}

interface TreeStyle {
  trunk: TreeTrunkStyle;
  foliage: TreeFoliageStyle;
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

  private readonly TREE_STYLES: Record<'WILLOW' | 'BIRCH' | 'CHERRY', TreeStyle> = {
    WILLOW: {
        trunk: {
            color: { h: 30, s: 25, b: 35 },
            width: 0.07,
            taper: 0.9,
            bend: 0.4
        },
        foliage: {
            colors: [
                { h: 150, s: 30, b: 45 },
                { h: 140, s: 35, b: 40 },
                { h: 135, s: 40, b: 35 }
            ],
            shape: 'drooping',
            density: 0.8,
            size: 1.4,
            animation: {
                swayAmount: 0.4,
                swaySpeed: 0.8
            }
        }
    },
    BIRCH: {
        trunk: {
            color: { h: 35, s: 8, b: 98 },
            markings: { h: 0, s: 0, b: 20 },
            width: 0.05,
            taper: 0.85,
            markingDensity: 1.2
        },
        foliage: {
            colors: [
                { h: 25, s: 85, b: 95 },
                { h: 20, s: 80, b: 90 },
                { h: 30, s: 75, b: 85 }
            ],
            shape: 'organic',
            density: 0.9,
            size: 1.3,
            animation: {
                swayAmount: 0.3,
                swaySpeed: 0.6
            }
        }
    },
    CHERRY: {
        trunk: {
            color: { h: 20, s: 30, b: 35 },
            width: 0.06,
            taper: 0.8,
            twist: 0.3
        },
        foliage: {
            colors: [
                { h: 350, s: 80, b: 95 },
                { h: 345, s: 85, b: 90 },
                { h: 355, s: 75, b: 85 }
            ],
            shape: 'blossoms',
            density: 1.1,
            size: 1.2,
            animation: {
                swayAmount: 0.25,
                swaySpeed: 0.7
            }
        }
    }
};

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

  private generateTreeGeometry(plant: Plant) {
    try {
        // Get available styles
        const styles = Object.keys(this.TREE_STYLES) as Array<keyof typeof this.TREE_STYLES>;

        // Assign style if not already present
        if (!plant.style && styles.length > 0) {
            const randomIndex = Math.floor(Math.random() * styles.length);
            plant.style = styles[randomIndex];
        }

        // Get style configuration using type guard
        const style = this.getTreeStyle(plant);
        if (!style) {
            console.warn('No valid tree style found, using default');
            this.generateOrganicTreeGeometry(plant);
            return;
        }

        // Generate trunk with artistic styling
        plant.elements.trunk = this.generateStylizedTrunk(plant, style.trunk);

        // Generate foliage based on artistic style
        switch (style.foliage.shape) {
            case 'organic':
                plant.elements.foliage = this.generateOrganicFoliage(plant, style.foliage);
                break;
            case 'blossoms':
                plant.elements.foliage = this.generateBlossom(plant, style.foliage);
                break;
            case 'drooping':
                plant.elements.foliage = this.generateDroopingFoliage(plant, style.foliage);
                break;
            default:
                plant.elements.foliage = this.generateOrganicFoliage(plant, style.foliage);
        }

        // The trunk details are now handled within generateStylizedTrunk
    } catch (error) {
        console.warn('Error generating artistic tree:', error);
        this.generateOrganicTreeGeometry(plant);
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


private drawTrunkOutline(trunk: Path2D, points: Vector2[], baseWidth: number, taper: number) {
  // Draw right side of trunk
  trunk.moveTo(points[0].x + baseWidth/2, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
      const t = i / (points.length - 1);
      const width = baseWidth * (1 - t * taper);
      const curr = points[i];
      const prev = points[i - 1];
      const next = points[Math.min(i + 1, points.length - 1)];
      
      // Calculate control points for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) * 0.5 + width/2;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      const cp2x = curr.x + (next.x - curr.x) * 0.5 + width/2;
      const cp2y = curr.y + (next.y - curr.y) * 0.5;
      
      trunk.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x + width/2, curr.y);
  }
  
  // Draw left side of trunk (in reverse)
  for (let i = points.length - 1; i >= 0; i--) {
      const t = i / (points.length - 1);
      const width = baseWidth * (1 - t * taper);
      const curr = points[i];
      const next = points[Math.max(i - 1, 0)];
      const prev = points[Math.min(i + 1, points.length - 1)];
      
      // Calculate control points for smooth curve
      const cp1x = prev.x + (curr.x - prev.x) * 0.5 - width/2;
      const cp1y = prev.y + (curr.y - prev.y) * 0.5;
      const cp2x = curr.x + (next.x - curr.x) * 0.5 - width/2;
      const cp2y = curr.y + (next.y - curr.y) * 0.5;
      
      trunk.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x - width/2, curr.y);
  }
  
  trunk.closePath();
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


private drawEnhancedFoliage(ctx: CanvasRenderingContext2D, plant: Plant, element: Path2D, index: number, time: number) {
  const style = this.TREE_STYLES[plant.style];
  if (!style) return;

  ctx.save();
  
  // Apply artistic animation
  const swayAmount = style.foliage.animation.swayAmount;
  const swaySpeed = style.foliage.animation.swaySpeed;
  const sway = Math.sin(time * 0.001 * swaySpeed + plant.animation.swayOffset + index * 0.2) * swayAmount;
  const verticalSway = Math.cos(time * 0.001 * swaySpeed * 0.7 + plant.animation.swayOffset) * swayAmount * 0.5;
  
  ctx.translate(sway * plant.size, verticalSway * plant.size);

  // Create sophisticated gradient based on style
  const colors = style.foliage.colors;
  const gradient = this.createArtisticGradient(ctx, plant, colors, index);
  
  // Apply artistic effects
  ctx.fillStyle = gradient;
  
  // Add depth and volume with shadows
  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = sway * 5;
  ctx.shadowOffsetY = 5 + verticalSway * 3;
  
  ctx.fill(element);

  // Add highlight details
  if (index === 0) {
      ctx.strokeStyle = `hsla(${colors[0].h}, ${colors[0].s}%, ${Math.min(colors[0].b + 10, 100)}%, 0.2)`;
      ctx.lineWidth = 1;
      ctx.stroke(element);
  }

  ctx.restore();
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

private generateBirchMarkings(plant: Plant): Path2D[] {
  const markings: Path2D[] = [];
  const trunkHeight = plant.size * 0.8;
  const markingCount = Math.floor(trunkHeight / 10); // More frequent markings
  
  for (let i = 0; i < markingCount; i++) {
      const marking = new Path2D();
      const y = plant.position.y - (i / markingCount) * trunkHeight;
      const width = plant.size * 0.08; // Slightly wider markings
      const height = 3 + Math.random() * 5; // Taller markings
      
      // Create horizontal dash marking with slight curve
      const x = plant.position.x + (Math.random() - 0.5) * width * 0.8;
      marking.moveTo(x - width/3, y);
      marking.quadraticCurveTo(
          x, y + height/2,
          x + width * 0.7, y - height/4
      );
      markings.push(marking);

      // Sometimes add a second smaller marking nearby
      if (Math.random() < 0.5) {
          const smallMarking = new Path2D();
          const smallX = x + (Math.random() - 0.5) * width * 0.5;
          const smallY = y + (Math.random() - 0.5) * height;
          smallMarking.moveTo(smallX - width/4, smallY);
          smallMarking.quadraticCurveTo(
              smallX, smallY + height/4,
              smallX + width/3, smallY
          );
          markings.push(smallMarking);
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

private generateFlowerGeometry(plant: Plant) {
  // Modified for more artistic flower rendering
  const flowerGroup: Path2D[] = [];
  
  // Create more natural stem with curve
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
  plant.elements.details.push(stem);

  // Generate more organic petal shapes
  const petalCount = 5 + Math.floor(Math.random() * 4);
  const baseSize = plant.size * 0.4;
  
  for (let i = 0; i < petalCount; i++) {
      const petal = new Path2D();
      const angle = (i / petalCount) * Math.PI * 2;
      
      // Create petal shape with varying sizes
      const petalLength = baseSize * (1.2 + Math.random() * 0.4);
      const petalWidth = baseSize * (0.4 + Math.random() * 0.3);
      
      const cp1Distance = petalLength * 0.5;
      const cp2Distance = petalLength * 0.8;
      
      // Add randomness to control points for more natural shapes
      const cp1Angle = angle + (Math.random() - 0.5) * 0.5;
      const cp2Angle = angle + (Math.random() - 0.5) * 0.3;
      
      petal.moveTo(plant.position.x, plant.position.y - stemHeight);
      petal.bezierCurveTo(
          plant.position.x + Math.cos(cp1Angle) * cp1Distance,
          plant.position.y - stemHeight + Math.sin(cp1Angle) * cp1Distance,
          plant.position.x + Math.cos(cp2Angle) * cp2Distance,
          plant.position.y - stemHeight + Math.sin(cp2Angle) * cp2Distance,
          plant.position.x + Math.cos(angle) * petalLength,
          plant.position.y - stemHeight + Math.sin(angle) * petalLength
      );
      
      // Add inner curve for petal shape
      petal.bezierCurveTo(
          plant.position.x + Math.cos(angle) * petalLength * 0.9,
          plant.position.y - stemHeight + Math.sin(angle) * petalLength * 0.9,
          plant.position.x + Math.cos(angle) * petalWidth,
          plant.position.y - stemHeight + Math.sin(angle) * petalWidth,
          plant.position.x,
          plant.position.y - stemHeight
      );
      
      flowerGroup.push(petal);
  }

  // Add flower center
  const center = new Path2D();
  center.arc(
      plant.position.x,
      plant.position.y - stemHeight,
      baseSize * 0.2,
      0,
      Math.PI * 2
  );
  
  plant.elements.details.push(center);
  plant.elements.foliage = flowerGroup;
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
            primary: { h: 120, s: 35, b: 32 },
            secondary: { h: 120, s: 30, b: 28 },
            detail: { h: 30, s: 35, b: 28 }
        },
        bush: {
            primary: { h: 115, s: 40, b: 28 },
            secondary: { h: 115, s: 35, b: 24 },
            detail: { h: 115, s: 30, b: 20 }
        },
        flower: {
            primary: { h: 0, s: 75, b: 65 }, // Bright red for flowers
            secondary: { h: 120, s: 35, b: 32 },
            detail: { h: 120, s: 30, b: 28 }
        },
        grass: {
            primary: { h: 110, s: 45, b: 32 },
            secondary: { h: 110, s: 40, b: 28 },
            detail: { h: 110, s: 35, b: 24 }
        },
        fern: {
            primary: { h: 125, s: 40, b: 28 },
            secondary: { h: 125, s: 35, b: 24 },
            detail: { h: 125, s: 30, b: 20 }
        }
    };
    
    const base = baseColors[type];
    const variation = Math.random() * 6 - 3;
    
    return {
        primary: {
            h: base.primary.h + variation,
            s: base.primary.s + (Math.random() - 0.5) * 5,
            b: base.primary.b + (Math.random() - 0.5) * 3
        },
        secondary: {
            h: base.secondary.h + variation,
            s: base.secondary.s + (Math.random() - 0.5) * 5,
            b: base.secondary.b + (Math.random() - 0.5) * 3
        },
        detail: {
            h: base.detail.h,
            s: base.detail.s + (Math.random() - 0.5) * 5,
            b: base.detail.b + (Math.random() - 0.5) * 3
        }
    };
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

draw(ctx: CanvasRenderingContext2D, time: number) {
  // Sort plants by y position for proper layering
  const sortedPlants = [...this.plants].sort((a, b) => a.position.y - b.position.y);
  
  // Draw plants in layers for better depth
  sortedPlants.forEach(plant => {
      this.drawPlant(ctx, plant, time);
  });
}

private drawPlant(ctx: CanvasRenderingContext2D, plant: Plant, time: number) {
  ctx.save();
  
  // Calculate base transformations
  const growth = Math.min(1, plant.growth);
  const baseTransform = this.calculatePlantTransform(plant, time, growth);
  
  // Apply base transform
  ctx.translate(plant.position.x, plant.position.y);
  ctx.scale(growth, growth);
  ctx.translate(-plant.position.x, -plant.position.y);
  ctx.translate(baseTransform.sway.x, baseTransform.sway.y);

  // Draw plant elements in order
  if (plant.elements.trunk) {
      this.drawTrunk(ctx, plant, baseTransform);
  }

  // Draw foliage with enhanced depth and animation
  this.drawFoliage(ctx, plant, time, baseTransform);
  
  ctx.restore();
}

private calculatePlantTransform(plant: Plant, time: number, growth: number) {
  const style = plant.style ? this.TREE_STYLES[plant.style] : null;
  const baseSwayAmount = style?.foliage?.animation?.swayAmount || (plant.type === 'tree' ? 2 : 3);
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

private createTrunkGradient(ctx: CanvasRenderingContext2D, plant: Plant, color: HSLColor) {
  // Create more sophisticated trunk gradient
  const gradient = ctx.createLinearGradient(
      plant.position.x - plant.size * 0.1,
      plant.position.y,
      plant.position.x + plant.size * 0.1,
      plant.position.y - plant.size
  );

  // Add multiple color stops for more depth
  gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.b}%, 0.95)`);
  gradient.addColorStop(0.3, `hsla(${color.h}, ${color.s}%, ${color.b - 3}%, 0.95)`);
  gradient.addColorStop(0.7, `hsla(${color.h}, ${color.s}%, ${color.b - 6}%, 0.95)`);
  gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.b - 10}%, 0.95)`);

  return gradient;
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

private drawFoliage(ctx: CanvasRenderingContext2D, plant: Plant, time: number, transform: any) {
  const style = plant.style ? this.TREE_STYLES[plant.style] : null;
  const foliageCount = plant.elements.foliage.length;
  
  // Draw foliage layers from back to front
  plant.elements.foliage.forEach((foliage, i) => {
      ctx.save();
      
      // Calculate layer-specific animation
      const depth = i / foliageCount;
      const layerOffset = this.calculateLayerOffset(plant, i, time, transform);
      ctx.translate(layerOffset.x, layerOffset.y);

      // Create enhanced gradient
      const gradient = this.createFoliageGradient(ctx, plant, style, depth);
      
      // Add depth effects
      this.applyFoliageEffects(ctx, depth, transform);
      
      // Draw foliage shape
      ctx.fillStyle = gradient;
      ctx.fill(foliage);
      
      // Add highlights and details
      if (i === foliageCount - 1) {
          this.addFoliageDetails(ctx, foliage, style);
      }
      
      ctx.restore();
  });
}

private calculateLayerOffset(plant: Plant, layerIndex: number, time: number, transform: any) {
  const layerPhase = plant.animation.swayOffset + layerIndex * 0.2;
  const swayMultiplier = 1 - (layerIndex / plant.elements.foliage.length) * 0.3;
  
  return {
      x: Math.sin(time * 0.001 + layerPhase) * 2 * swayMultiplier,
      y: Math.cos(time * 0.001 * 0.7 + layerPhase) * 1 * swayMultiplier
  };
}

private createFoliageGradient(ctx: CanvasRenderingContext2D, plant: Plant, style: any, depth: number) {
  const color = style?.foliage?.color || plant.colors.primary;
  const size = plant.size * (style?.foliage?.size || 1);
  
  const gradient = ctx.createRadialGradient(
      plant.position.x, plant.position.y - plant.size * 0.6,
      0,
      plant.position.x, plant.position.y - plant.size * 0.6,
      size
  );
  
  const opacity = 0.9 - depth * 0.15;
  gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.b + 8}%, ${opacity})`);
  gradient.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.b + 4}%, ${opacity})`);
  gradient.addColorStop(0.7, `hsla(${color.h}, ${color.s}%, ${color.b}%, ${opacity})`);
  gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.b - 5}%, ${opacity * 0.9})`);
  
  return gradient;
}

private applyFoliageEffects(ctx: CanvasRenderingContext2D, depth: number, transform: any) {
  // Add dynamic shadows based on movement
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 10 * (1 - depth * 0.5);
  ctx.shadowOffsetX = transform.sway.x * 2;
  ctx.shadowOffsetY = 3 + Math.abs(transform.sway.y);
  
  // Add subtle inner glow
  ctx.globalCompositeOperation = 'source-over';
}

private addFoliageDetails(ctx: CanvasRenderingContext2D, foliage: Path2D, style: any) {
  if (!style) return;
  
  // Add subtle highlights
  ctx.globalCompositeOperation = 'overlay';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  ctx.stroke(foliage);
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


// Add these methods to the VegetationSystem class

private generateLayeredFoliage(plant: Plant, style: any): Path2D[] {
  const foliage: Path2D[] = [];
  const layers = 4 + Math.floor(Math.random() * 3);
  const baseSize = plant.size * style.size;
  
  for (let i = 0; i < layers; i++) {
      const layer = new Path2D();
      const layerSize = baseSize * (0.6 + i * 0.15);
      const centerY = plant.position.y - plant.size * 0.6 - i * plant.size * 0.25;
      
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
              x: plant.position.x + Math.cos(angle) * radius,
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

private isValidTreeStyle(style: string): style is keyof typeof this.TREE_STYLES {
  return style in this.TREE_STYLES;
}

private getTreeStyle(plant: Plant): TreeStyle | null {
  if (plant.style && this.isValidTreeStyle(plant.style)) {
      return this.TREE_STYLES[plant.style];
  }
  return null;
}
}