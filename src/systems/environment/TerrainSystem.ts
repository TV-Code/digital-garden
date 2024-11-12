import { createNoise2D, createNoise3D } from "simplex-noise";
import { VegetationSystem } from "./VegetationSystem";
import { ColorSystem, ColorBridge } from "../../utils/colors";

interface TerrainFeature {
  path: Path2D;
  points: Vector2[];
  type: 'cliff' | 'slope' | 'ledge' | 'depression';
  position: Vector2;
  size: number;
  detail: {
    rockFormations: RockFormation[];
    vegetation: VegetationCluster[];
    erosion: ErosionDetail[];
  };
}

interface RockFormation {
  path: Path2D;
  cracks: Path2D[];
  erosion: Path2D[];
  texture: Path2D;
  color: HSLColor;
  position: Vector2;
  size: number;
}

interface VegetationCluster {
  position: Vector2;
  density: number;
  type: 'grass' | 'flowers' | 'moss';
  elements: Path2D[];
  colors: HSLColor[];
}

interface ErosionDetail {
  path: Path2D;
  depth: number;
  age: number;
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

export class TerrainSystem {
    private features: TerrainFeature[] = [];
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private erosionProgress: number = 0;
    private vegetationSystem: VegetationSystem;
    private staticBuffer: OffscreenCanvas;
    private staticCtx: OffscreenCanvasRenderingContext2D;
  
    constructor(
      private width: number, 
      private height: number,
      private waterLevel: number
    ) {
      this.noise2D = createNoise2D();
      this.noise3D = createNoise3D();
      this.vegetationSystem = new VegetationSystem(width, height, waterLevel);

      // Initialize static buffer
      this.staticBuffer = new OffscreenCanvas(width, height);
      this.staticCtx = this.staticBuffer.getContext('2d')!;

      this.generateTerrain();
    }
  
    private generateTerrain() {
      // Generate main landforms
      this.generateLandforms();
      
      // Add detail features
      this.features.forEach(feature => {
        feature.detail = {
          rockFormations: this.generateRockFormations(feature),
          vegetation: [], // VegetationSystem now handles this separately
          erosion: this.generateErosionPatterns(feature)
        };
      });
      this.renderStaticTerrain();
    }
  
    // Update method to handle time-based changes
    update(time: number, deltaTime: number) {
      // Update erosion and other terrain features
      this.erosionProgress += deltaTime * 0.001;
      
      // Update vegetation
      this.vegetationSystem.update(time, deltaTime);
    }
  
    
    draw(ctx: CanvasRenderingContext2D, time: number, lighting: any) {
        
        
        // Sort features by y position to ensure correct layering
        const sortedFeatures = [...this.features].sort((a, b) => b.position.y - a.position.y);
        
        // Draw each terrain feature
        sortedFeatures.forEach(feature => {
            ctx.save();
            
            // Draw main feature shape
            const gradient = this.createTerrainGradient(ctx, feature, lighting);
            ctx.fillStyle = gradient;
            ctx.fill(feature.path);
            
            // Only draw rock formations on cliffs and with reduced frequency
            if (feature.type === 'cliff') {
                feature.detail.rockFormations.forEach(rock => {
                    // Reduce rock contrast
                    ctx.globalAlpha = 0.4;
                    this.drawRockFormation(ctx, rock, time, lighting);
                });
            }
            
            // Draw erosion with reduced opacity
            feature.detail.erosion.forEach(erosion => {
                ctx.globalAlpha = 0.1;
                this.drawErosionPattern(ctx, erosion, time);
            });
            
            ctx.restore();
        });
        
        // Draw vegetation last and with full opacity
        ctx.globalAlpha = 1;
        this.vegetationSystem.draw(ctx, time);
        
    }

// Add missing erosion pattern generation
private generateErosionPatterns(feature: TerrainFeature): ErosionDetail[] {
    const patterns: ErosionDetail[] = [];
    const erosionCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 0; i < erosionCount; i++) {
        const path = new Path2D();
        const startPoint = this.getRandomPositionInFeature(feature);
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

    private generateLandforms() {
        // Create dramatic mountain ranges on sides
        const leftMountain = this.createMountainFeature(0, this.width * 0.4, 'left');
        const rightMountain = this.createMountainFeature(this.width * 0.6, this.width, 'right');
        
        // Create gentler slopes near water for vegetation
        const leftShore = this.createShorelineFeature(this.width * 0.2, this.width * 0.4);
        const rightShore = this.createShorelineFeature(this.width * 0.6, this.width * 0.8);
        
        this.features = [leftMountain, rightMountain, leftShore, rightShore];
        
        // Add detail and notify vegetation system
        this.features.forEach(feature => {
            this.addNaturalVariation(feature);
            if (feature.type === 'slope') {
                this.notifyVegetationSystem(feature);
            }
        });
    }
    
    
    private createShorelineFeature(startX: number, endX: number): TerrainFeature {
        const points: Vector2[] = [];
        const segments = 25;
        
        // Generate gentle shoreline
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            
            // Create subtle variations for natural look
            const variationScale = 0.008;
            const variation = this.noise2D(x * variationScale, 0) * 15;
            
            const y = this.waterLevel + variation;
            points.push({ x, y });
        }
        
        // Add slope points
        const slopePoints = this.generateGentleSlope(points);
        points.push(...slopePoints);
        
        return {
            path: this.createSmoothPath(points),
            points,
            type: 'slope',
            position: this.calculateCentroid(points),
            size: this.calculateFeatureSize(points),
            detail: {
                rockFormations: [],
                vegetation: [],
                erosion: []
            }
        };
    }
    
    private generateGentleSlope(shorePoints: Vector2[]): Vector2[] {
        const slopePoints: Vector2[] = [];
        const slopeHeight = (this.height - this.waterLevel) * 0.25; // Shorter, gentler slopes
        
        shorePoints.forEach(point => {
            // Create a natural slope curve
            const steps = 4;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                // Use easing function for natural curve
                const ease = t * t * (3 - 2 * t);
                
                const slopePoint = {
                    x: point.x + this.noise2D(point.x * 0.01, t) * 8,
                    y: point.y + slopeHeight * ease
                };
                
                slopePoints.push(slopePoint);
            }
        });
        
        return slopePoints;
    }

    private renderStaticTerrain() {
        const ctx = this.staticCtx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw features in order
        this.features.forEach(feature => {
            ctx.save();
            
            // Draw main terrain shape
            const gradient = this.createTerrainGradient(ctx, feature);
            ctx.fillStyle = gradient;
            ctx.fill(feature.path);
            
            // Draw rock formations for cliffs only
            if (feature.type === 'cliff') {
                ctx.globalAlpha = 0.4;
                feature.detail.rockFormations.forEach(rock => {
                    this.drawRockFormation(ctx, rock);
                });
            }
            
            // Subtle erosion patterns
            ctx.globalAlpha = 0.15;
            feature.detail.erosion.forEach(erosion => {
                this.drawErosionPattern(ctx, erosion);
            });
            
            ctx.restore();
        });
    }

private drawErosionPattern(
    ctx: CanvasRenderingContext2D, 
    erosion: ErosionDetail
) {
    const opacity = Math.min(0.3, erosion.age * 0.1);
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = erosion.depth * 0.5; // Reduced line width
    ctx.stroke(erosion.path);
}

private drawRockFormation(
    ctx: CanvasRenderingContext2D,
    rock: RockFormation
) {
    // Main rock shape
    const gradient = ctx.createLinearGradient(
        rock.position.x,
        rock.position.y - rock.size,
        rock.position.x,
        rock.position.y + rock.size
    );
    
    // Softer gradient for rocks
    gradient.addColorStop(0, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b + 8}%, 0.7)`);
    gradient.addColorStop(0.4, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b}%, 0.6)`);
    gradient.addColorStop(1, `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 10)}%, 0.5)`);
    
    ctx.fillStyle = gradient;
    ctx.fill(rock.path);
    
    // Subtle rock details
    if (rock.texture) {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 5)}%, 1)`;
        ctx.fill(rock.texture);
        ctx.restore();
    }
    
    // Very subtle cracks
    if (rock.cracks.length > 0) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 15)}%, 1)`;
        ctx.lineWidth = 0.5;
        rock.cracks.forEach(crack => {
            ctx.stroke(crack);
        });
        ctx.restore();
    }
}

private createTerrainGradient(
    ctx: CanvasRenderingContext2D,
    feature: TerrainFeature,
    lighting: any = null // Made optional since we're using static colors
): CanvasGradient {
    const gradient = ctx.createLinearGradient(
        feature.position.x,
        feature.position.y - feature.size,
        feature.position.x,
        feature.position.y + feature.size
    );
    
    const baseColor = this.getRockColor(feature.type);
    
    switch (feature.type) {
        case 'cliff':
            // Dramatic mountain colors
            gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 20}%, 1)`);
            gradient.addColorStop(0.3, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 10}%, 1)`);
            gradient.addColorStop(0.6, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
            gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${Math.max(0, baseColor.b - 15)}%, 1)`);
            break;
            
        case 'slope':
            // Softer slope colors with smoother transition
            gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s - 5}%, ${baseColor.b + 10}%, 1)`);
            gradient.addColorStop(0.4, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 5}%, 1)`);
            gradient.addColorStop(0.7, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
            gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b - 5}%, 1)`);
            break;
            
        case 'ledge':
            // Middle ground between cliff and slope
            gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 15}%, 1)`);
            gradient.addColorStop(0.5, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
            gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b - 10}%, 1)`);
            break;
            
        case 'depression':
            // Subtle shadows for depressions
            gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
            gradient.addColorStop(0.5, `hsla(${baseColor.h}, ${baseColor.s}%, ${Math.max(0, baseColor.b - 5)}%, 1)`);
            gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${Math.max(0, baseColor.b - 10)}%, 1)`);
            break;
    }
    
    return gradient;
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
private getRockColor(featureType: TerrainFeature['type']): HSLColor {
    const baseColors = {
        cliff: { h: 220, s: 15, b: 35 }, // Blueish gray for mountains
        ledge: { h: 215, s: 20, b: 40 },
        slope: { h: 210, s: 25, b: 45 },
        depression: { h: 200, s: 20, b: 40 }
    };
    
    const base = baseColors[featureType];
    // Minimal variation to prevent flickering
    return {
        h: base.h + (Math.random() - 0.5) * 5,
        s: base.s + (Math.random() - 0.5) * 3,
        b: base.b + (Math.random() - 0.5) * 3,
        a: 1
    };
}
    
    private generateSlopePoints(shorePoints: Vector2[], side: 'left' | 'right'): Vector2[] {
        const slopePoints: Vector2[] = [];
        const slopeHeight = this.height - this.waterLevel;
        
        shorePoints.forEach(point => {
            // Create multiple points down the slope for better terrain definition
            const steps = 3;
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const slopeNoise = this.noise2D(point.x * 0.02, t) * 30;
                
                // Calculate slope point with natural variation
                const slopePoint = {
                    x: point.x + (side === 'left' ? -1 : 1) * slopeNoise,
                    y: point.y + slopeHeight * t
                };
                
                slopePoints.push(slopePoint);
            }
        });
        
        return slopePoints;
    }
    
    private createValleyFeatures(): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const valleyWidth = this.width * 0.2; // Central valley width
        const centerX = this.width * 0.5;
        
        // Create valley floor
        const valleyPoints: Vector2[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = centerX - valleyWidth / 2 + valleyWidth * t;
            const noise = this.noise2D(x * 0.02, 0) * 20;
            const y = this.waterLevel + noise;
            
            valleyPoints.push({ x, y });
        }
        
        const valleyFeature: TerrainFeature = {
            path: this.createSmoothPath(valleyPoints),
            points: valleyPoints,
            type: 'depression',
            position: this.calculateCentroid(valleyPoints),
            size: valleyWidth,
            detail: {
                rockFormations: [],
                vegetation: [],
                erosion: []
            }
        };
        
        features.push(valleyFeature);
        return features;
    }
    
    private notifyVegetationSystem(feature: TerrainFeature) {
        // Create vegetation clusters based on terrain type and slope
        const vegetationPoints = this.calculateVegetationPoints(feature);
        
        vegetationPoints.forEach(point => {
            const terrainInfo = this.getTerrainInfoAt(point.x, point.y);
            this.vegetationSystem.createVegetationCluster({
                position: point,
                slope: terrainInfo.slope,
                moisture: terrainInfo.moisture,
                terrainHeight: terrainInfo.height
            });
        });
    }
    
    private calculateVegetationPoints(feature: TerrainFeature): Vector2[] {
        const points: Vector2[] = [];
        const density = feature.type === 'slope' ? 0.3 : 0.5;
        
        // Sample points along the feature's surface
        for (let i = 0; i < feature.points.length - 1; i++) {
            const p1 = feature.points[i];
            const p2 = feature.points[i + 1];
            
            // Create intermediate points for vegetation
            const steps = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < steps; j++) {
                if (Math.random() > density) continue;
                
                const t = j / steps;
                const noise = this.noise2D(p1.x * 0.1, t) * 10;
                
                points.push({
                    x: p1.x + (p2.x - p1.x) * t + noise,
                    y: p1.y + (p2.y - p1.y) * t
                });
            }
        }
        
        return points;
    }
    
    private generateRockFormations(feature: TerrainFeature): RockFormation[] {
        if (feature.type !== 'cliff') return [];
        
        const formations: RockFormation[] = [];
        // Significantly reduce formation count
        const formationCount = Math.floor(feature.size / 200);
        
        for (let i = 0; i < formationCount; i++) {
            const position = this.getRandomPositionInFeature(feature);
            
            // Only generate rocks away from water
            const distanceFromWater = Math.abs(position.y - this.waterLevel);
            if (distanceFromWater < 100) continue;
            
            // Create smaller, less jagged rocks
            const size = 10 + Math.random() * 15;
            const points: Vector2[] = [];
            const segments = 8;
            
            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                // Reduce noise variation
                let radius = size * (0.9 + this.noise2D(angle, i) * 0.2);
                radius *= 1 + Math.sin(angle * 2) * 0.1;
                
                points.push({
                    x: position.x + Math.cos(angle) * radius,
                    y: position.y + Math.sin(angle) * radius * 0.8
                });
            }
    
            const rockPath = this.createRockPath(points);
            // Reduce or eliminate cracks and erosion for cleaner look
            const cracks: Path2D[] = [];
            const erosion: Path2D[] = [];
            const texture = this.generateSimpleTexture(points, size);
            
            formations.push({
                path: rockPath,
                cracks,
                erosion,
                texture,
                color: this.getRockColor(feature.type),
                position,
                size
            });
        }
        
        return formations;
    }

    private generateSimpleTexture(points: Vector2[], size: number): Path2D {
        const texture = new Path2D();
        const center = this.calculateCentroid(points);
        // Reduce texture density
        const pointCount = Math.floor(size);
        
        for (let i = 0; i < pointCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * size * 0.8;
            const x = center.x + Math.cos(angle) * distance;
            const y = center.y + Math.sin(angle) * distance;
            
            if (this.isPointInPolygon({ x, y }, points)) {
                texture.moveTo(x, y);
                // Smaller texture points
                texture.arc(x, y, 0.5, 0, Math.PI * 2);
            }
        }
        
        return texture;
    }
    
    // Update mountain feature creation to prevent overlapping
    private createMountainFeature(startX: number, endX: number, side: 'left' | 'right'): TerrainFeature {
        const points: Vector2[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            
            // Smoother height profile
            const baseHeight = Math.sin(t * Math.PI) * this.height * 0.4;
            const noiseScale = 0.003;
            const variation = this.noise2D(x * noiseScale, side === 'left' ? 0 : 1) * this.height * 0.08;
            
            const y = Math.max(
                this.waterLevel - baseHeight - variation,
                this.waterLevel - this.height * 0.6
            );

            points.push({ x, y });
        }
        
        // Add base points with slight inset to prevent overlap
        const inset = (endX - startX) * 0.05;
        points.push({ x: endX - inset, y: this.height });
        points.push({ x: startX + inset, y: this.height });
        
        return {
            path: this.createSmoothPath(points),
            points,
            type: 'cliff',
            position: this.calculateCentroid(points),
            size: this.calculateFeatureSize(points),
            detail: {
                rockFormations: [],
                vegetation: [],
                erosion: []
            }
        };
    }

    private constrainToWaterLevel(feature: TerrainFeature) {
        const path = new Path2D();
        const points = this.getPointsFromPath(feature.path);
        
        // Adjust points that are above water level
        points.forEach(point => {
            if (point.y < this.waterLevel) {
                point.y = this.waterLevel + (Math.random() * 20); // Small random variation
            }
        });
        
        feature.path = this.createSmoothPath(points);
    }

    private generateHeightmap(): number[][] {
        const resolution = 50;
        const heightmap: number[][] = [];
        
        for (let y = 0; y < resolution; y++) {
            heightmap[y] = [];
            for (let x = 0; x < resolution; x++) {
                let height = 0;
                
                // Use consistent scale factors
                const scale = 0.05;
                for (let freq = 1; freq <= 4; freq++) {
                    const amplitude = 1 / Math.pow(2, freq - 1);
                    height += this.noise2D(x * scale * freq, y * scale * freq) * amplitude;
                }
                
                // Normalize height to 0-1 range
                height = (height + 1) * 0.5;
                
                // Shape terrain
                height = this.shapeTerrainHeight(height, x / resolution, y / resolution);
                heightmap[y][x] = height;
            }
        }
        
        return heightmap;
    }

  private extractFeatures(heightmap: number[][]): TerrainFeature[] {
    const features: TerrainFeature[] = [];
    const visited = new Set<string>();

    // Find local maxima and significant height changes
    for (let y = 1; y < heightmap.length - 1; y++) {
      for (let x = 1; x < heightmap[y].length - 1; x++) {
        if (visited.has(`${x},${y}`)) continue;

        const height = heightmap[y][x];
        const neighbors = this.getNeighborHeights(heightmap, x, y);
        
        if (this.isSignificantFeature(height, neighbors)) {
          const feature = this.extractFeatureAtPoint(heightmap, x, y, visited);
          if (feature) features.push(feature);
        }
      }
    }

    return features;
  }

  private isSignificantFeature(height: number, neighbors: number[]): boolean {
    const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    return Math.abs(height - avgNeighbor) > 0.2 || 
           height > Math.max(...neighbors) * 1.2;
  }

  private extractFeatureAtPoint(
    heightmap: number[][], 
    startX: number, 
    startY: number,
    visited: Set<string>
  ): TerrainFeature | null {
    const path = new Path2D();
    const points: Vector2[] = [];
    const queue: [number, number][] = [[startX, startY]];
    const baseHeight = heightmap[startY][startX];
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Add point to feature
      const worldX = (x / heightmap[0].length) * this.width;
      const worldY = (y / heightmap.length) * this.height;
      points.push({ x: worldX, y: worldY });
      
      // Check neighbors
      const neighbors = this.getNeighborCoords(heightmap, x, y);
      for (const [nx, ny] of neighbors) {
        const heightDiff = Math.abs(heightmap[ny][nx] - baseHeight);
        if (heightDiff < 0.3) {
          queue.push([nx, ny]);
        }
      }
    }

    if (points.length < 3) return null;

    // Create smooth path through points
    return {
      path: this.createSmoothPath(points),
      type: this.determineFeatureType(points, heightmap),
      position: this.calculateCentroid(points),
      size: this.calculateFeatureSize(points),
      detail: {
        rockFormations: [],
        vegetation: [],
        erosion: []
      }
    };
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

private getNeighborHeights(heightmap: number[][], x: number, y: number): number[] {
    const neighbors: number[] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    dirs.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < heightmap[0].length && ny >= 0 && ny < heightmap.length) {
        neighbors.push(heightmap[ny][nx]);
      }
    });
    
    return neighbors;
  }
  
  private getNeighborCoords(heightmap: number[][], x: number, y: number): [number, number][] {
    const neighbors: [number, number][] = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    
    dirs.forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < heightmap[0].length && ny >= 0 && ny < heightmap.length) {
        neighbors.push([nx, ny]);
      }
    });
    
    return neighbors;
  }
  
  private addNaturalVariation(feature: TerrainFeature) {
    const points = feature.points; // Use stored points
    
    points.forEach((point, i) => {
      const noise = this.noise2D(point.x * 0.01, point.y * 0.01) * feature.size * 0.1;
      point.x += noise;
      point.y += noise * 0.5;
    });
    
    feature.path = this.createSmoothPath(points);
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
  
  private calculateFeatureSize(points: Vector2[]): number {
    const center = this.calculateCentroid(points);
    
    // Calculate average distance from center
    return points.reduce((sum, point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / points.length;
  }
  
  private determineFeatureType(points: Vector2[], heightmap: number[][]): TerrainFeature['type'] {
    const center = this.calculateCentroid(points);
    const slope = this.calculateAverageSlope(points, heightmap);
    
    if (slope > 0.8) return 'cliff';
    if (slope > 0.5) return 'ledge';
    if (slope > 0.2) return 'slope';
    return 'depression';
  }
  
  private calculateAverageSlope(points: Vector2[], heightmap: number[][]): number {
    let totalSlope = 0;
    let count = 0;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0) {
        totalSlope += Math.abs(dy / distance);
        count++;
      }
    }
    
    return count > 0 ? totalSlope / count : 0;
  }
  
  private getRandomPositionInFeature(feature: TerrainFeature): Vector2 {
    const center = this.calculateCentroid(this.getPointsFromPath(feature.path));
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * feature.size * 0.5;
    
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
    };
  }
  
  private generateRockCracks(points: Vector2[], size: number): Path2D[] {
    const cracks: Path2D[] = [];
    const crackCount = Math.floor(3 + Math.random() * 5);
    
    for (let i = 0; i < crackCount; i++) {
      const crack = new Path2D();
      const start = points[Math.floor(Math.random() * points.length)];
      const angle = Math.random() * Math.PI * 2;
      
      crack.moveTo(start.x, start.y);
      
      let x = start.x;
      let y = start.y;
      const length = size * (0.3 + Math.random() * 0.4);
      const segments = Math.floor(length / 5);
      
      for (let j = 0; j < segments; j++) {
        const noise = this.noise2D(x * 0.1, y * 0.1) * 10;
        x += Math.cos(angle + noise) * (5 + Math.random() * 3);
        y += Math.sin(angle + noise) * (5 + Math.random() * 3);
        crack.lineTo(x, y);
      }
      
      cracks.push(crack);
    }
    
    return cracks;
  }
  
  private generateRockErosion(points: Vector2[], size: number): Path2D[] {
    const erosion: Path2D[] = [];
    const erosionCount = Math.floor(5 + Math.random() * 5);
    
    for (let i = 0; i < erosionCount; i++) {
      const path = new Path2D();
      const start = points[Math.floor(Math.random() * points.length)];
      
      path.moveTo(start.x, start.y);
      
      // Create irregular erosion patterns
      for (let j = 0; j < 5; j++) {
        const noise = this.noise2D(start.x * 0.1 + j, start.y * 0.1) * size * 0.2;
        path.quadraticCurveTo(
          start.x + noise,
          start.y + noise,
          start.x + noise * 0.5,
          start.y + noise * 0.5
        );
      }
      
      erosion.push(path);
    }
    
    return erosion;
  }
  
  private generateRockTexture(points: Vector2[], size: number): Path2D {
    const texture = new Path2D();
    const center = this.calculateCentroid(points);
    const pointCount = Math.floor(size * 2);
    
    for (let i = 0; i < pointCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * size;
      const x = center.x + Math.cos(angle) * distance;
      const y = center.y + Math.sin(angle) * distance;
      
      if (this.isPointInPolygon({ x, y }, points)) {
        texture.moveTo(x, y);
        texture.arc(x, y, 1, 0, Math.PI * 2);
      }
    }
    
    return texture;
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

  private constrainPoint(point: Vector2): Vector2 {
    return {
        x: Math.max(0, Math.min(this.width, point.x)),
        y: Math.max(this.waterLevel, Math.min(this.height, point.y))
    };
}
}