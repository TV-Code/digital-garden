import { createNoise2D, createNoise3D } from 'simplex-noise';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { ColorSystem, ColorBridge, HSLColor } from '../../../utils/colors';
import { TerrainConfig } from '../../../configs/environment/terrainConfig';
import {
    TerrainType,
    TerrainLayer,
    TerrainFeature, 
    Vector2,
    RockFormation,
    ErosionPattern,
    VegetationZone
} from '../../../types/environment/terrain';
import { PlantType } from '../../../types/environment/vegetation';

export class TerrainSystem {
    private layers: TerrainLayer[] = [];
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private staticBuffer: OffscreenCanvas;
    private staticCtx: OffscreenCanvasRenderingContext2D;
    private renderer: TerrainRenderer;
    
    private readonly TERRAIN_PARAMS = {
        mountainHeight: 0.8,
        valleyDepth: 0.4,
        cliffSteepness: 0.85,
        erosionStrength: 0.6,
    };

    constructor(
        private width: number,
        private height: number,
        private waterLevel: number
    ) {
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();

        this.renderer = new TerrainRenderer(width, height);
        
        // Initialize static buffer for non-changing elements
        this.staticBuffer = new OffscreenCanvas(width, height);
        this.staticCtx = this.staticBuffer.getContext('2d')!;
        
        // Generate initial terrain
        this.generateTerrain();
    }

    public drawTerrain(ctx: CanvasRenderingContext2D, time: number, lighting: any) {
        ctx.save();
        
        // Draw base terrain
        this.layers.forEach(layer => {
            this.renderer.drawLayer(ctx, layer, time, lighting);
        });
        
        ctx.restore();
    }

    draw(ctx: CanvasRenderingContext2D, time: number, lighting: any) {
        // Draw static terrain
        ctx.drawImage(this.staticBuffer, 0, 0);
        
        // Draw dynamic terrain layers
        this.layers.forEach(layer => {
            this.renderer.drawLayer(ctx, layer, time, lighting);
        });
    
    }
    

    public update(time: number, deltaTime: number) {
        // Update terrain
        this.updateErosion(deltaTime);
        this.updateColors(time);
        
    }

    private generateTerrain() {
        // Generate base heightmap with multiple frequencies
        const heightMap = this.generateHeightmap();
        
        // Create terrain layers from heightmap
        this.layers = this.generateTerrainLayers(heightMap);
        
        // Add geological features to each layer
        this.layers.forEach(layer => {
            layer.features = this.generateFeatures(layer);
        });
        
        // Generate static elements
        this.renderStaticElements();
    }


    private generateHeightmap(): number[][] {
        const resolution = 100; // Higher resolution for more detail
        const heightmap: number[][] = [];
        
        for (let y = 0; y < resolution; y++) {
            heightmap[y] = [];
            for (let x = 0; x < resolution; x++) {
                let height = 0;
                
                // Layer 1: Base terrain shape
                height += this.noise2D(x * 0.02, y * 0.02) * 0.5;
                
                // Layer 2: Large features
                height += this.noise2D(x * 0.05, y * 0.05) * 0.3;
                
                // Layer 3: Medium details
                height += this.noise2D(x * 0.1, y * 0.1) * 0.15;
                
                // Layer 4: Small details
                height += this.noise2D(x * 0.2, y * 0.2) * 0.05;
                
                // Apply terrain shaping functions
                height = this.shapeTerrainHeight(height, x / resolution, y / resolution);
                
                heightmap[y][x] = height;
            }
        }
        
        return heightmap;
    }

    private generateTerrainLayers(heightmap: number[][]): TerrainLayer[] {
        const layers: TerrainLayer[] = [];
        const layerCount = 5; // Number of elevation layers
        
        for (let i = 0; i < layerCount; i++) {
            const elevation = i / (layerCount - 1);
            const type = this.determineTerrainType(elevation);
            
            const points = this.extractLayerPoints(heightmap, elevation);
            const path = this.createLayerPath(points);
            
            layers.push({
                path,
                points,
                elevation,
                type,
                features: [],
                vegetationZones: []
            });
        }
        
        return layers;
    }

    private generateFeatures(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const params = TerrainConfig.parameters[layer.type];
        
        // Generate features based on terrain type
        switch (layer.type) {
            case 'mountain':
                features.push(...this.generateMountainFeatures(layer, params));
                break;
            case 'valley':
                features.push(...this.generateValleyFeatures(layer, params));
                break;
            case 'plateau':
                features.push(...this.generatePlateauFeatures(layer, params));
                break;
            case 'coastal':
                features.push(...this.generateCoastalFeatures(layer, params));
                break;
            case 'riverbank':
                features.push(...this.generateRiverbankFeatures(layer, params));
                break;
        }
        
        return features;
    }

    private generateVegetationZones(layer: TerrainLayer): VegetationZone[] {
        const zones: VegetationZone[] = [];
        const zoneCount = Math.floor(3 + Math.random() * 3);
        
        for (let i = 0; i < zoneCount; i++) {
            // Create natural zone shapes using noise
            const zonePath = this.generateNaturalZoneShape(layer);
            const position = this.calculateZonePosition(layer, i);
            
            zones.push({
                bounds: zonePath,
                position,
                moisture: this.calculateMoistureAt(position.x, position.y),
                slope: this.calculateSlopeAt(position.x, position.y),
                soilType: this.determineSoilType(position, layer),
                vegetationDensity: this.calculateVegetationDensity(position, layer)
            });
        }
        
        return zones;
    }

    private generateRockTexture(points: Vector2[], size: number): Path2D {
        const texture = new Path2D();
        const center = this.calculateCentroid(points);
        const pointCount = Math.floor(size * 2);
        
        for (let i = 0; i < pointCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 0.8;
            const x = center.x + Math.cos(angle) * distance;
            const y = center.y + Math.sin(angle) * distance;
            
            if (this.isPointInPolygon({ x, y }, points)) {
                texture.moveTo(x, y);
                texture.arc(x, y, 0.5, 0, Math.PI * 2);
            }
        }
        
        return texture;
    }
    
    private generateRockCracks(points: Vector2[], size: number): Path2D[] {
        const cracks: Path2D[] = [];
        const crackCount = Math.floor(3 + Math.random() * 4);
        
        for (let i = 0; i < crackCount; i++) {
            const crack = new Path2D();
            const start = points[Math.floor(Math.random() * points.length)];
            const angle = Math.random() * Math.PI * 2;
            
            crack.moveTo(start.x, start.y);
            
            let currentPoint = { x: start.x, y: start.y };
            const steps = Math.floor(4 + Math.random() * 3);
            
            for (let j = 0; j < steps; j++) {
                const noise = this.noise2D(currentPoint.x * 0.1, currentPoint.y * 0.1) * size * 0.2;
                
                currentPoint = {
                    x: currentPoint.x + Math.cos(angle + noise) * (size / steps),
                    y: currentPoint.y + Math.sin(angle + noise) * (size / steps)
                };
                
                crack.lineTo(currentPoint.x, currentPoint.y);
            }
            
            cracks.push(crack);
        }
        
        return cracks;
    }

    private drawLayer(
        ctx: CanvasRenderingContext2D, 
        layer: TerrainLayer, 
        time: number, 
        lighting: any
    ) {
        ctx.save();
        
        // Draw base terrain
        const gradient = this.createTerrainGradient(ctx, layer, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(layer.path);
        
        // Draw features
        layer.features.forEach(feature => {
            this.drawFeature(ctx, feature, time, lighting);
        });
        
        ctx.restore();
    }

    private getTerrainColor(type: TerrainType, variant: 'base' | 'shadow' | 'highlight' = 'base'): HSLColor {
        const colors = TerrainConfig.colors[type];
        return colors[variant];
    }

    private getFeatureColor(type: TerrainFeature['type']): HSLColor {
        return TerrainConfig.features[type].color;
    }

    private createTerrainGradient(
        ctx: CanvasRenderingContext2D,
        layer: TerrainLayer,
        lighting: any
    ): CanvasGradient {
        const gradient = ctx.createLinearGradient(
            0, layer.elevation * this.height,
            0, (layer.elevation + 0.2) * this.height
        );
        
        const baseColor = this.getTerrainColor(layer.type, 'base');
        const highlightColor = this.getTerrainColor(layer.type, 'highlight');
        const shadowColor = this.getTerrainColor(layer.type, 'shadow');
        
        gradient.addColorStop(0, ColorBridge.toHSLString(highlightColor));
        gradient.addColorStop(0.3, ColorBridge.toHSLString(baseColor));
        gradient.addColorStop(1, ColorBridge.toHSLString(shadowColor));
        
        return gradient;
    }
  
// Add missing erosion pattern generation
private generateErosionPatterns(feature: TerrainFeature): ErosionDetail[] {
    const patterns: ErosionDetail[] = [];
    const erosionCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < erosionCount; i++) {
        const path = new Path2D();
        const startPoint = this.getRandomPositionInLayer(feature);
        const length = feature.size * (0.2 + Math.random() * 0.3);
        const angle = Math.random() * Math.PI * 2;
        
        path.moveTo(startPoint.x, startPoint.y);
        
        let currentPoint = { x: startPoint.x, y: startPoint.y };
        for (let j = 0; j < 5; j++) {
            const t = j / 4;
            const noise = this.noise2D(t * 10 + i, feature.position.y * 0.01) * 20;
            
            currentPoint = {
                x: currentPoint.x + Math.cos(angle + noise * 0.1) * (length / 5),
                y: currentPoint.y + Math.sin(angle + noise * 0.1) * (length / 5)
            };
            
            path.lineTo(currentPoint.x, currentPoint.y);
        }
        
        patterns.push({
            path,
            depth: 1 + Math.random() * 2,
            age: Math.random()
        });
    }
    
    return patterns;
}

private generateRockFormations(points: Vector2[], size: number): RockFormation[] {
    const formations: RockFormation[] = [];
    const formationCount = Math.floor(3 + Math.random() * 4);
    
    for (let i = 0; i < formationCount; i++) {
        const position = points[Math.floor(Math.random() * points.length)];
        const rockSize = size * (0.2 + Math.random() * 0.3);
        
        // Generate rock shape
        const rockPoints: Vector2[] = [];
        const segments = 12;
        
        for (let j = 0; j <= segments; j++) {
            const angle = (j / segments) * Math.PI * 2;
            let radius = rockSize * (0.8 + Math.random() * 0.4);
            
            // Add variation to rock shape
            radius *= 1 + this.noise2D(angle * 3, i) * 0.3;
            radius *= 1 + this.noise2D(angle * 8, i + 1) * 0.2;
            
            rockPoints.push({
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius * 0.8
            });
        }
        
        const rockPath = this.createRockPath(rockPoints);
        
        // Generate rock details
        const cracks = this.generateRockCracks(rockPoints, rockSize);
        const texture = this.generateRockTexture(rockPoints, rockSize);
        const weathering = this.generateRockWeathering(rockPoints, rockSize);
        
        formations.push({
            path: rockPath,
            detail: {
                cracks,
                texture,
                weathering
            },
            color: this.getRockColor('cliff'),
            position,
            size: rockSize,
            age: Math.random()
        });
    }
    
    return formations;
}

private generateRockWeathering(points: Vector2[], size: number): Path2D[] {
    const weathering: Path2D[] = [];
    const weatherCount = Math.floor(4 + Math.random() * 4);
    
    for (let i = 0; i < weatherCount; i++) {
        const path = new Path2D();
        const start = points[Math.floor(Math.random() * points.length)];
        
        path.moveTo(start.x, start.y);
        
        const angle = Math.random() * Math.PI * 2;
        let currentPoint = start;
        const steps = 4;
        
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const noise = this.noise2D(currentPoint.x * 0.1, currentPoint.y * 0.1) * size * 0.15;
            
            currentPoint = {
                x: currentPoint.x + Math.cos(angle + noise) * (size/steps),
                y: currentPoint.y + Math.sin(angle + noise) * (size/steps)
            };
            
            path.lineTo(currentPoint.x, currentPoint.y);
        }
        
        weathering.push(path);
    }
    
    return weathering;
}

private calculateTerrainColor(elevation: number, moisture: number): HSLColor {
    // Base color from the current time of day
    const baseColor: HSLColor = [...ColorSystem.vegetation.foliage.default];
    
    // Adjust based on elevation
    baseColor[2] = Math.max(20, baseColor[2] - elevation * 20);
    
    // Adjust saturation based on moisture
    baseColor[1] = Math.min(100, baseColor[1] + moisture * 20);
    
    return baseColor;
}

private updateStaticElements() {
    const ctx = this.staticCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    
    this.layers.forEach(layer => {
        this.renderer.drawLayer(ctx, layer, 0, null); // Static rendering
    });
}
  
    // Add helper method to get terrain info for vegetation placement
    getTerrainInfoAt(x: number, y: number): { 
      height: number;
      slope: number;
      moisture: number;
    } {
      const height = this.calculateHeightAt(x, y);
      const slope = this.calculateSlopeAt(x, y);
      const moisture = this.calculateMoistureAt(x, y);
  
      return { height, slope, moisture };
    }
  
    private calculateHeightAt(x: number, y: number): number {
      // Sample noise at different frequencies for natural height
      let height = 0;
      for (let freq = 1; freq <= 4; freq++) {
        height += this.noise2D(x * 0.005 * freq, y * 0.005 * freq) / freq;
      }
      return height;
    }
  
    private calculateSlopeAt(x: number, y: number): number {
      const dx = this.calculateHeightAt(x + 1, y) - this.calculateHeightAt(x - 1, y);
      const dy = this.calculateHeightAt(x, y + 1) - this.calculateHeightAt(x, y - 1);
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    private calculateMoistureAt(x: number, y: number): number {
      // Base moisture affected by distance from water
      const distanceFromWater = Math.abs(y - this.waterLevel);
      const baseMoisture = Math.max(0, 1 - distanceFromWater / (this.height * 0.2));
      
      // Add noise variation
      const variation = this.noise2D(x * 0.01, y * 0.01) * 0.3;
      
      return Math.min(1, Math.max(0, baseMoisture + variation));
    }

   

// Helper to generate smoother rock paths
private createRockPath(points: Vector2[]): Path2D {
    const path = new Path2D();
    
    path.moveTo(points[0].x, points[0].y);
    points.forEach((point, i) => {
        const next = points[(i + 1) % points.length];
        const ctrl = {
            x: (point.x + next.x) / 2,
            y: (point.y + next.y) / 2
        };
        path.quadraticCurveTo(ctrl.x, ctrl.y, next.x, next.y);
    });
    path.closePath();
    
    return path;
}

// Improved rock color generation for more consistent results
private getRockColor(type: TerrainFeature['type']): HSLColor {
    // Get color from config and ensure it's in HSLColor array format
    const color = TerrainConfig.features[type].color;
    return color;
}

private updateColors(time: number) {
    this.layers.forEach(layer => {
        // Get time-based colors
        const colors = TerrainConfig.colors[layer.type];
        
        // Update feature colors
        layer.features.forEach(feature => {
            if (feature.rockFormations.length > 0) {
                this.updateRockColors(feature.rockFormations, time);
            }
        });
    });
}

private updateRockColors(formations: RockFormation[], time: number) {
    formations.forEach(formation => {
        // Apply time-based color variations
        const baseColor = formation.color;
        const timeInfluence = Math.sin(time * 0.001) * 0.1;
        
        formation.color = [
            baseColor[0],
            baseColor[1],
            baseColor[2] * (1 + timeInfluence)
        ];
    });
}

  private createSmoothPath(points: Vector2[]): Path2D {
    const path = new Path2D();
    
    // Sort points to create a continuous outline
    const sorted = this.sortPointsForOutline(points);
    
    // Create smooth curve through points
    path.moveTo(sorted[0].x, sorted[0].y);
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const next = sorted[(i + 1) % sorted.length];
      
      const cp1 = {
        x: curr.x + (next.x - prev.x) * 0.2,
        y: curr.y + (next.y - prev.y) * 0.2
      };
      
      const cp2 = {
        x: next.x - (next.x - curr.x) * 0.2,
        y: next.y - (next.y - curr.y) * 0.2
      };
      
      path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, next.x, next.y);
    }
    
    path.closePath();
    return path;
  }

  
  private getPointsFromPath(path: Path2D): Vector2[] {
    // This is a simplified version - in practice, you'd need to properly extract points
    // from the Path2D object. For now, we'll create some sample points
    const points: Vector2[] = [];
    const segments = 20;
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: Math.cos(angle) * 100,
        y: Math.sin(angle) * 100
      });
    }
    
    return points;
  }
  
  private sortPointsForOutline(points: Vector2[]): Vector2[] {
    // Sort points to form a continuous outline
    const center = this.calculateCentroid(points);
    
    return points.sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });
  }
  
  private calculateCentroid(points: Vector2[]): Vector2 {
    const sum = points.reduce((acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / points.length,
      y: sum.y / points.length
    };
  }

  

  private shapeTerrainHeight(height: number, x: number, y: number): number {
    // Convert y to screen space
    const screenY = y * this.height;
    
    // Only generate terrain below water
    if (screenY < this.waterLevel) {
        return 0;
    }
    
    // Scale height by distance from water
    const waterDist = (screenY - this.waterLevel) / (this.height - this.waterLevel);
    height *= waterDist;
    
    // Add valley shape
    const centerDist = Math.abs(x - 0.5);
    const valleyFactor = 1 - Math.pow(centerDist * 2, 2);
    height *= valleyFactor;
    
    return height;
}

// Helper methods for feature generation
private generateMountainFeatures(layer: TerrainLayer): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const featureCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < featureCount; i++) {
        const position = this.getRandomPositionInLayer(layer);
        const size = this.width * (0.1 + Math.random() * 0.2);
        
        const points = this.generateMountainPoints(position, size, layer.elevation);
        const path = this.createSmoothPath(points);
        
        features.push({
            path,
            points,
            type: 'ridge',
            position,
            size,
            elevation: layer.elevation,
            rockFormations: this.generateRockFormations(points, size),
            erosionPatterns: this.generateErosionPatternsForMountain(points, size)
        });
    }
    
    return features;
}

private generateValleyFeatures(layer: TerrainLayer): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const valleyCount = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < valleyCount; i++) {
        const position = this.getRandomPositionInLayer(layer);
        const size = this.width * (0.15 + Math.random() * 0.25);
        
        const points = this.generateValleyPoints(position, size, layer.elevation);
        const path = this.createSmoothPath(points);
        
        features.push({
            path,
            points,
            type: 'valley',
            position,
            size,
            elevation: layer.elevation,
            rockFormations: [],
            erosionPatterns: this.generateErosionPatternsForValley(points, size)
        });
    }
    
    return features;
}

private generatePlateauFeatures(layer: TerrainLayer): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const plateauCount = 1 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < plateauCount; i++) {
        const position = this.getRandomPositionInLayer(layer);
        const size = this.width * (0.2 + Math.random() * 0.3);
        
        const points = this.generatePlateauPoints(position, size, layer.elevation);
        const path = this.createSmoothPath(points);
        
        features.push({
            path,
            points,
            type: 'plateau',
            position,
            size,
            elevation: layer.elevation,
            rockFormations: this.generateRockFormations(points, size * 0.5),
            erosionPatterns: this.generateErosionPatternsForPlateau(points, size)
        });
    }
    
    return features;
}

private generateCoastalFeatures(layer: TerrainLayer): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const segmentCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < segmentCount; i++) {
        const position = {
            x: (i / segmentCount) * this.width,
            y: this.waterLevel + (Math.random() - 0.5) * 50
        };
        const size = this.width / segmentCount * 1.2;
        
        const points = this.generateCoastalPoints(position, size, layer.elevation);
        const path = this.createSmoothPath(points);
        
        features.push({
            path,
            points,
            type: 'slope',
            position,
            size,
            elevation: layer.elevation,
            rockFormations: [],
            erosionPatterns: this.generateErosionPatternsForCoast(points, size)
        });
    }
    
    return features;
}

private generateRiverbankFeatures(layer: TerrainLayer): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const bankCount = 2;
    
    for (let i = 0; i < bankCount; i++) {
        const isLeftBank = i === 0;
        const position = {
            x: isLeftBank ? this.width * 0.3 : this.width * 0.7,
            y: this.waterLevel
        };
        const size = this.width * 0.2;
        
        const points = this.generateRiverbankPoints(position, size, layer.elevation, isLeftBank);
        const path = this.createSmoothPath(points);
        
        features.push({
            path,
            points,
            type: 'slope',
            position,
            size,
            elevation: layer.elevation,
            rockFormations: [],
            erosionPatterns: this.generateErosionPatternsForRiverbank(points, size)
        });
    }
    
    return features;
}

private isPointInPolygon(point: Vector2, vertices: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

// Point generation helpers
private generateMountainPoints(position: Vector2, size: number, elevation: number): Vector2[] {
    const points: Vector2[] = [];
    const segments = 20;
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const radiusBase = size * (0.8 + Math.random() * 0.4);
        
        // Generate detailed mountain profile
        let radius = radiusBase;
        
        // Add major features
        radius *= 1 + Math.sin(angle * 3) * 0.3;
        
        // Add medium details
        radius *= 1 + this.noise2D(angle * 5, elevation) * 0.2;
        
        // Add small details
        radius *= 1 + this.noise2D(angle * 10, elevation + 1) * 0.1;
        
        points.push({
            x: position.x + Math.cos(angle) * radius,
            y: position.y + Math.sin(angle) * radius * 0.7 // Flatten vertically
        });
    }
    
    return points;
}

private generateValleyPoints(position: Vector2, size: number, elevation: number): Vector2[] {
    const points: Vector2[] = [];
    const segments = 20;
    const valleyWidth = size * 0.6;
    const valleyDepth = size * 0.4;
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = position.x - size/2 + t * size;
        
        // Generate valley profile
        let y = position.y;
        
        // Add base valley shape
        y += Math.sin(t * Math.PI) * valleyDepth;
        
        // Add terrain variation
        y += this.noise2D(x * 0.01, elevation) * valleyWidth * 0.2;
        
        points.push({ x, y });
    }
    
    return points;
}

private generatePlateauPoints(position: Vector2, size: number, elevation: number): Vector2[] {
    const points: Vector2[] = [];
    const segments = 30;
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        let radius = size;
        
        // Create plateau shape with steep sides
        const angleNorm = (angle % (Math.PI/2)) / (Math.PI/2);
        const platShape = Math.pow(Math.sin(angleNorm * Math.PI), 0.3);
        radius *= 0.8 + platShape * 0.2;
        
        // Add terrain variation
        radius *= 1 + this.noise2D(angle * 5, elevation) * 0.1;
        
        points.push({
            x: position.x + Math.cos(angle) * radius,
            y: position.y + Math.sin(angle) * radius
        });
    }
    
    return points;
}

// Erosion pattern generators
private generateErosionPatternsForMountain(points: Vector2[], size: number): ErosionPattern[] {
    const patterns: ErosionPattern[] = [];
    const patternCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < patternCount; i++) {
        const paths: Path2D[] = [];
        const mainPath = new Path2D();
        const startPoint = points[Math.floor(Math.random() * points.length)];
        const angle = Math.random() * Math.PI * 2;
        
        // Create main erosion channel
        let currentPoint = startPoint;
        const steps = 10;
        
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const noise = this.noise2D(currentPoint.x * 0.02, currentPoint.y * 0.02) * size * 0.1;
            
            currentPoint = {
                x: currentPoint.x + Math.cos(angle + noise) * (size / steps),
                y: currentPoint.y + Math.sin(angle + noise) * (size / steps)
            };
            
            if (j === 0) {
                mainPath.moveTo(currentPoint.x, currentPoint.y);
            } else {
                mainPath.lineTo(currentPoint.x, currentPoint.y);
            }
            
            // Add tributary channels
            if (Math.random() < 0.3) {
                const tributary = this.generateTributaryPath(currentPoint, size * 0.3, angle + Math.PI/2);
                paths.push(tributary);
            }
        }
        
        paths.push(mainPath);
        
        patterns.push({
            paths,
            depth: 0.5 + Math.random() * 0.5,
            type: 'geological',
            age: Math.random(),
            activity: 0.5 + Math.random() * 0.5
        });
    }
    
    return patterns;
}

private generateTributaryPath(start: Vector2, length: number, angle: number): Path2D {
    const path = new Path2D();
    path.moveTo(start.x, start.y);
    
    let currentPoint = start;
    const steps = 5;
    
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const noise = this.noise2D(currentPoint.x * 0.05, currentPoint.y * 0.05) * length * 0.2;
        
        currentPoint = {
            x: currentPoint.x + Math.cos(angle + noise) * (length / steps),
            y: currentPoint.y + Math.sin(angle + noise) * (length / steps)
        };
        
        path.lineTo(currentPoint.x, currentPoint.y);
    }
    
    return path;
}

// Vegetation zone helpers
private generateNaturalZoneShape(layer: TerrainLayer): Path2D {
    const path = new Path2D();
    const center = this.getRandomPositionInLayer(layer);
    const size = this.width * (0.1 + Math.random() * 0.2);
    const points: Vector2[] = [];
    
    // Generate organic shape using noise
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const noise = this.noise2D(angle * 3, layer.elevation) * size * 0.3;
        const radius = size * (0.7 + noise);
        
        points.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
        });
    }
    
    return this.createSmoothPath(points);
}

private calculateZonePosition(layer: TerrainLayer, index: number): Vector2 {
    const angle = (index / 3) * Math.PI * 2;
    const distance = this.width * 0.2;
    
    return {
        x: this.width/2 + Math.cos(angle) * distance,
        y: layer.elevation * this.height + Math.sin(angle) * distance
    };
}

private determineSoilType(position: Vector2, layer: TerrainLayer): 'rocky' | 'fertile' | 'sandy' {
    const noise = this.noise2D(position.x * 0.01, position.y * 0.01);
    
    if (layer.elevation > 0.7) return 'rocky';
    if (noise > 0.3) return 'fertile';
    return 'sandy';
}

private calculateVegetationDensity(position: Vector2, layer: TerrainLayer): number {
    const base = this.TERRAIN_PARAMS.vegetationDensity;
    const moisture = this.calculateMoistureAt(position.x, position.y);
    const slope = this.calculateSlopeAt(position.x, position.y);
    
    // Reduce density with elevation and slope
    const elevationFactor = 1 - layer.elevation * 0.5;
    const slopeFactor = 1 - slope * 2;
    
    return Math.max(0, Math.min(1, base * moisture * elevationFactor * slopeFactor));
}




private getTerrainBaseColor(type: TerrainType): HSLColor {
    const colors = {
        mountain: { h: 220, s: 15, b: 35 },
        valley: { h: 150, s: 20, b: 45 },
        plateau: { h: 30, s: 25, b: 40 },
        coastal: { h: 45, s: 30, b: 50 },
        riverbank: { h: 140, s: 25, b: 45 }
    };
    
    return colors[type];
}

// Utility functions
private getRandomPositionInLayer(layer: TerrainLayer): Vector2 {
    const margin = this.width * 0.1;
    return {
        x: margin + Math.random() * (this.width - margin * 2),
        y: layer.elevation * this.height + (Math.random() - 0.5) * this.height * 0.1
    };
}

private determineTerrainType(elevation: number): TerrainType {
    if (elevation > 0.8) return 'mountain';
    if (elevation > 0.6) return 'plateau';
    if (elevation > 0.4) return 'valley';
    if (elevation > 0.2) return 'riverbank';
    return 'coastal';
}

private extractLayerPoints(heightmap: number[][], elevation: number): Vector2[] {
    const points: Vector2[] = [];
    const threshold = elevation * 0.1;
    
    for (let x = 0; x < heightmap[0].length; x++) {
        for (let y = 0; y < heightmap.length; y++) {
            const height = heightmap[y][x];
            if (Math.abs(height - elevation) < threshold) {
                points.push({
                    x: (x / heightmap[0].length) * this.width,
                    y: (y / heightmap.length) * this.height
                });
            }
        }
    }
    
    // Simplify points to reduce complexity
    return this.simplifyPoints(points);
}

private simplifyPoints(points: Vector2[], tolerance: number = 5): Vector2[] {
    if (points.length < 3) return points;
    
    const simplified: Vector2[] = [points[0]];
    let lastPoint = points[0];
    
    for (let i = 1; i < points.length - 1; i++) {
        const point = points[i];
        const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
        
        if (distance > tolerance) {
            simplified.push(point);
            lastPoint = point;
        }
    }
    
    simplified.push(points[points.length - 1]);
    return simplified;
}

private createLayerPath(points: Vector2[]): Path2D {
    const path = new Path2D();
    if (points.length < 2) return path;
    
    // Sort points for continuous path
    const sortedPoints = this.sortPointsByDistance(points);
    
    path.moveTo(sortedPoints[0].x, sortedPoints[0].y);
    
    // Create smooth curve through points
    for (let i = 1; i < sortedPoints.length; i++) {
        const prev = sortedPoints[i - 1];
        const curr = sortedPoints[i];
        const next = sortedPoints[Math.min(i + 1, sortedPoints.length - 1)];
        
        const cp1 = {
            x: curr.x + (next.x - prev.x) * 0.2,
            y: curr.y + (next.y - prev.y) * 0.2
        };
        
        path.quadraticCurveTo(cp1.x, cp1.y, curr.x, curr.y);
    }
    
    return path;
}

private sortPointsByDistance(points: Vector2[]): Vector2[] {
    const sorted: Vector2[] = [points[0]];
    const remaining = [...points.slice(1)];
    
    while (remaining.length > 0) {
        const last = sorted[sorted.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;
        
        // Find nearest point
        remaining.forEach((point, i) => {
            const dist = Math.hypot(point.x - last.x, point.y - last.y);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        });
        
        sorted.push(remaining[nearestIdx]);
        remaining.splice(nearestIdx, 1);
    }
    
    return sorted;
}

private renderStaticElements() {
    const ctx = this.staticCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw static terrain elements
    this.layers.forEach(layer => {
        // Draw base terrain layer
        const gradient = this.createTerrainGradient(ctx, layer, null);
        ctx.fillStyle = gradient;
        ctx.fill(layer.path);
        
        // Draw permanent rock formations
        layer.features.forEach(feature => {
            if (feature.type === 'ridge' || feature.type === 'cliff') {
                this.drawRockFormations(ctx, feature.rockFormations);
            }
        });
    });
}

private drawRockFormations(ctx: CanvasRenderingContext2D, formations: RockFormation[]) {
    formations.forEach(formation => {
        if (!formation.color || !Array.isArray(formation.color)) {
            // Use default color if formation color is missing or invalid
            formation.color = TerrainConfig.features.cliff.color;
        }
        
        ctx.save();
        
        // Draw main rock shape
        const gradient = ctx.createLinearGradient(
            formation.position.x, formation.position.y - formation.size,
            formation.position.x, formation.position.y + formation.size
        );
        
        const h = formation.color[0];
        const s = formation.color[1];
        const b = formation.color[2];
        
        gradient.addColorStop(0, `hsla(${h}, ${s}%, ${Math.min(100, b + 10)}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${b}%, 0.8)`);
        gradient.addColorStop(1, `hsla(${h}, ${s}%, ${Math.max(0, b - 10)}%, 0.7)`);
        
        ctx.fillStyle = gradient;
        ctx.fill(formation.path);
        
        // Draw rock details
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${Math.max(0, b - 20)}%, 1)`;
        ctx.lineWidth = 0.5;
        
        // Draw cracks
        formation.detail.cracks.forEach(crack => {
            ctx.stroke(crack);
        });
        
        // Draw texture
        ctx.globalAlpha = 0.1;
        ctx.fill(formation.detail.texture);
        
        // Draw weathering
        ctx.globalAlpha = 0.2;
        formation.detail.weathering.forEach(weather => {
            ctx.stroke(weather);
        });
        
        ctx.restore();
    });
}

private updateErosion(deltaTime: number) {
    this.layers.forEach(layer => {
        layer.features.forEach(feature => {
            feature.erosionPatterns.forEach(pattern => {
                // Update erosion age
                pattern.age += deltaTime * 0.001;
                
                // Modulate activity based on type
                switch (pattern.type) {
                    case 'water':
                        pattern.activity = 0.5 + Math.sin(pattern.age * 2) * 0.3;
                        break;
                    case 'wind':
                        pattern.activity = 0.3 + this.noise2D(pattern.age, 0) * 0.4;
                        break;
                    case 'geological':
                        pattern.activity = Math.min(1, pattern.age * 0.1);
                        break;
                }
            });
        });
    });
}

// updateVegetation(time: number, deltaTime: number): void {
//     this.vegetation.update(time, deltaTime);
// }

// drawVegetation(ctx: CanvasRenderingContext2D, time: number): void {
//     this.vegetation.draw(ctx, time);
// }

private drawFeature(ctx: CanvasRenderingContext2D, feature: TerrainFeature, time: number, lighting: any) {
    // Draw base feature shape
    const gradient = this.createFeatureGradient(ctx, feature, lighting);
    ctx.fillStyle = gradient;
    ctx.fill(feature.path);
    
    // Draw rock formations
    feature.rockFormations.forEach(rock => {
        this.drawRockFormation(ctx, rock);
    });
    
    // Draw erosion patterns
    feature.erosionPatterns.forEach(pattern => {
        this.drawErosionPattern(ctx, pattern, time);
    });
}

private drawErosionPattern(ctx: CanvasRenderingContext2D, pattern: ErosionPattern, time: number) {
    ctx.save();
    
    const opacity = pattern.activity * 0.3;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = pattern.depth;
    
    pattern.paths.forEach(path => {
        // Add subtle animation based on erosion type
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = pattern.type === 'water' ? time * 0.01 : 0;
        
        ctx.stroke(path);
    });
    
    ctx.restore();
}

private createFeatureGradient(
    ctx: CanvasRenderingContext2D, 
    feature: TerrainFeature, 
    lighting: any
): CanvasGradient {
    const gradient = ctx.createLinearGradient(
        feature.position.x,
        feature.position.y - feature.size,
        feature.position.x,
        feature.position.y + feature.size
    );
    
    const baseColor = this.getFeatureColor(feature.type);
    const lightFactor = lighting ? lighting.intensity : 1;
    
    // Use ColorBridge.toHSLString for safe color string creation
    gradient.addColorStop(0, ColorBridge.toHSLString(baseColor));
    gradient.addColorStop(0.5, ColorBridge.toHSLString([
        baseColor[0],
        baseColor[1],
        baseColor[2] * lightFactor
    ]));
    gradient.addColorStop(1, ColorBridge.toHSLString([
        baseColor[0],
        baseColor[1],
        Math.max(0, baseColor[2] * lightFactor - 10)
    ]));
    
    return gradient;
}

private generateErosionPatternsForValley(points: Vector2[], size: number): ErosionPattern[] {
    const patterns: ErosionPattern[] = [];
    
    // Generate main valley floor erosion
    const mainChannel = new Path2D();
    let currentPoint = points[0];
    mainChannel.moveTo(currentPoint.x, currentPoint.y);
    
    for (let i = 1; i < points.length; i++) {
        const t = i / points.length;
        const noise = this.noise2D(currentPoint.x * 0.02, currentPoint.y * 0.02) * size * 0.15;
        
        currentPoint = {
            x: points[i].x + noise,
            y: points[i].y + noise * 0.5
        };
        
        mainChannel.lineTo(currentPoint.x, currentPoint.y);
    }
    
    patterns.push({
        paths: [mainChannel],
        depth: 0.8,
        type: 'water',
        age: Math.random(),
        activity: 0.7
    });
    
    // Add smaller tributary patterns
    const tributaryCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < tributaryCount; i++) {
        const startIdx = Math.floor(Math.random() * (points.length - 1));
        const paths = this.generateValleyTributaries(points[startIdx], size * 0.4);
        
        patterns.push({
            paths,
            depth: 0.4 + Math.random() * 0.3,
            type: 'water',
            age: Math.random(),
            activity: 0.5 + Math.random() * 0.3
        });
    }
    
    return patterns;
}

private generateValleyTributaries(startPoint: Vector2, size: number): Path2D[] {
    const paths: Path2D[] = [];
    const branchCount = 2 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < branchCount; i++) {
        const path = new Path2D();
        path.moveTo(startPoint.x, startPoint.y);
        let currentPoint = startPoint;
        const angle = (Math.PI/3) * (Math.random() - 0.5);
        const steps = 5;
        
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const noise = this.noise2D(currentPoint.x * 0.05, currentPoint.y * 0.05) * size * 0.2;
            
            currentPoint = {
                x: currentPoint.x + Math.cos(angle + noise) * (size/steps),
                y: currentPoint.y + Math.sin(angle + noise) * (size/steps)
            };
            
            path.lineTo(currentPoint.x, currentPoint.y);
        }
        
        paths.push(path);
    }
    
    return paths;
}

private generateErosionPatternsForPlateau(points: Vector2[], size: number): ErosionPattern[] {
    const patterns: ErosionPattern[] = [];
    const patternCount = 4 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < patternCount; i++) {
        const startPoint = points[Math.floor(Math.random() * points.length)];
        const angle = Math.random() * Math.PI * 2;
        const mainPath = new Path2D();
        let currentPoint = startPoint;
        
        mainPath.moveTo(startPoint.x, startPoint.y);
        
        const steps = 8;
        for (let j = 0; j < steps; j++) {
            const t = j / steps;
            const noise = this.noise2D(currentPoint.x * 0.03, currentPoint.y * 0.03) * size * 0.1;
            
            currentPoint = {
                x: currentPoint.x + Math.cos(angle + noise) * (size/steps),
                y: currentPoint.y + Math.sin(angle + noise) * (size/steps)
            };
            
            mainPath.lineTo(currentPoint.x, currentPoint.y);
        }
        
        patterns.push({
            paths: [mainPath],
            depth: 0.3 + Math.random() * 0.4,
            type: 'wind',
            age: Math.random(),
            activity: 0.4 + Math.random() * 0.4
        });
    }
    
    return patterns;
}

private generateErosionPatternsForCoast(points: Vector2[], size: number): ErosionPattern[] {
    const patterns: ErosionPattern[] = [];
    const waveCount = 3 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < waveCount; i++) {
        const wavePath = new Path2D();
        let currentPoint = points[0];
        wavePath.moveTo(currentPoint.x, currentPoint.y);
        
        points.forEach((point, idx) => {
            if (idx === 0) return;
            
            const t = idx / points.length;
            const waveHeight = Math.sin(t * Math.PI * 4) * size * 0.05;
            const noise = this.noise2D(point.x * 0.05, i) * size * 0.03;
            
            currentPoint = {
                x: point.x,
                y: point.y + waveHeight + noise
            };
            
            wavePath.lineTo(currentPoint.x, currentPoint.y);
        });
        
        patterns.push({
            paths: [wavePath],
            depth: 0.2 + Math.random() * 0.3,
            type: 'water',
            age: Math.random(),
            activity: 0.6 + Math.random() * 0.4
        });
    }
    
    return patterns;
}

private generateErosionPatternsForRiverbank(points: Vector2[], size: number): ErosionPattern[] {
    const patterns: ErosionPattern[] = [];
    
    // Generate main riverbank erosion
    const mainPath = new Path2D();
    let currentPoint = points[0];
    mainPath.moveTo(currentPoint.x, currentPoint.y);
    
    points.forEach((point, idx) => {
        if (idx === 0) return;
        
        const t = idx / points.length;
        const noise = this.noise2D(point.x * 0.04, point.y * 0.04) * size * 0.1;
        
        currentPoint = {
            x: point.x + noise,
            y: point.y + noise * 0.5
        };
        
        mainPath.lineTo(currentPoint.x, currentPoint.y);
    });
    
    patterns.push({
        paths: [mainPath],
        depth: 0.6,
        type: 'water',
        age: Math.random(),
        activity: 0.8
    });
    
    // Add undercutting patterns
    const undercuts = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < undercuts; i++) {
        const startIdx = Math.floor(Math.random() * (points.length - 1));
        const undercutPath = this.generateUndercutPattern(points[startIdx], size * 0.3);
        
        patterns.push({
            paths: [undercutPath],
            depth: 0.4 + Math.random() * 0.3,
            type: 'water',
            age: Math.random(),
            activity: 0.5 + Math.random() * 0.3
        });
    }
    
    return patterns;
}

private generateUndercutPattern(startPoint: Vector2, size: number): Path2D {
    const path = new Path2D();
    path.moveTo(startPoint.x, startPoint.y);
    let currentPoint = startPoint;
    
    const steps = 6;
    const baseAngle = Math.PI/2 * (Math.random() - 0.5);
    
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const angle = baseAngle + Math.sin(t * Math.PI) * Math.PI/4;
        const noise = this.noise2D(currentPoint.x * 0.05, currentPoint.y * 0.05) * size * 0.2;
        
        currentPoint = {
            x: currentPoint.x + Math.cos(angle + noise) * (size/steps),
            y: currentPoint.y + Math.sin(angle + noise) * (size/steps)
        };
        
        path.lineTo(currentPoint.x, currentPoint.y);
    }
    
    return path;
}

private generateCoastalPoints(position: Vector2, size: number, elevation: number): Vector2[] {
    const points: Vector2[] = [];
    const segments = 20;
    const beachWidth = size * 0.8;
    const beachDepth = size * 0.3;
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = position.x - size/2 + t * size;
        
        // Generate coastal profile
        let y = position.y;
        
        // Add base beach shape
        y += Math.pow(t, 0.5) * beachDepth;
        
        // Add terrain variation
        y += this.noise2D(x * 0.02, elevation) * beachWidth * 0.15;
        
        points.push({ x, y });
    }
    
    return points;
}

private generateRiverbankPoints(position: Vector2, size: number, elevation: number, isLeftBank: boolean): Vector2[] {
    const points: Vector2[] = [];
    const segments = 20;
    const bankWidth = size * 0.6;
    const bankDepth = size * 0.4;
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = position.x + (isLeftBank ? -1 : 1) * t * bankWidth;
        
        // Generate riverbank profile
        let y = position.y;
        
        // Add base bank shape
        y += Math.pow(t, 0.7) * bankDepth;
        
        // Add terrain variation
        const noise = this.noise2D(x * 0.03, elevation) * bankWidth * 0.2;
        y += noise;
        
        points.push({ x, y });
    }
    
    return points;
}

private drawRockFormation(ctx: CanvasRenderingContext2D, rock: RockFormation) {
    ctx.save();
    
    // Draw main rock shape
    const gradient = ctx.createLinearGradient(
        rock.position.x, rock.position.y - rock.size,
        rock.position.x, rock.position.y + rock.size
    );
    
    gradient.addColorStop(0, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b + 10}%, 0.9)`);
    gradient.addColorStop(0.5, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b}%, 0.8)`);
    gradient.addColorStop(1, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b - 10}%, 0.7)`);
    
    ctx.fillStyle = gradient;
    ctx.fill(rock.path);
    
    // Draw rock details
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 20)}%, 1)`;
    ctx.lineWidth = 0.5;
    
    rock.detail.cracks.forEach(crack => {
        ctx.stroke(crack);
    });
    
    ctx.globalAlpha = 0.1;
    ctx.fill(rock.detail.texture);
    
    rock.detail.weathering.forEach(weather => {
        ctx.stroke(weather);
    });
    
    ctx.restore();
}



}