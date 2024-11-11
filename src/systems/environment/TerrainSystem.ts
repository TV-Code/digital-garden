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
  
    constructor(
      private width: number, 
      private height: number,
      private waterLevel: number
    ) {
      this.noise2D = createNoise2D();
      this.noise3D = createNoise3D();
      this.vegetationSystem = new VegetationSystem(width, height, waterLevel);
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
    }
  
    // Update method to handle time-based changes
    update(time: number, deltaTime: number) {
      // Update erosion and other terrain features
      this.erosionProgress += deltaTime * 0.001;
      
      // Update vegetation
      this.vegetationSystem.update(time, deltaTime);
    }
  
    
draw(ctx: CanvasRenderingContext2D, time: number, lighting: any) {
    ctx.save();
    // Draw each terrain feature
    this.features.forEach(feature => {
        
        
        // Draw main feature shape
        const gradient = this.createTerrainGradient(ctx, feature, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(feature.path);
        
        // Draw rock formations
        feature.detail.rockFormations.forEach(rock => {
            this.drawRockFormation(ctx, rock, time, lighting);
        });
        
        // Draw erosion patterns
        feature.detail.erosion.forEach(erosion => {
            ctx.globalAlpha = 0.3;
            this.drawErosionPattern(ctx, erosion, time);
        });

        // Draw vegetation
        ctx.globalAlpha = 1;
        this.vegetationSystem.draw(ctx, time);
        
        
    });
    ctx.restore();
}

// Add missing erosion pattern drawing method
private drawErosionPattern(ctx: CanvasRenderingContext2D, erosion: ErosionDetail, time: number) {
    const opacity = Math.min(0.5, erosion.age * 0.1);
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = erosion.depth;
    ctx.stroke(erosion.path);
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
        // Generate height map with better constraints
        const heightmap = this.generateHeightmap();
        const features: TerrainFeature[] = [];
        
        // Create main shoreline features
        const leftShore = this.createShorelineFeature(0, this.width * 0.4, 'left');
        const rightShore = this.createShorelineFeature(this.width * 0.6, this.width, 'right');
        
        features.push(leftShore, rightShore);
        
        // Add additional terrain features
        features.forEach(feature => {
            this.addNaturalVariation(feature);
            feature.detail = {
                rockFormations: this.generateRockFormations(feature),
                vegetation: [],
                erosion: this.generateErosionPatterns(feature)
            };
        });
        
        this.features = features;
    }

    private createShorelineFeature(startX: number, endX: number, side: 'left' | 'right'): TerrainFeature {
        const points: Vector2[] = [];
        const segments = 30;
        
        // Generate shoreline points
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            const baseY = this.waterLevel;
            
            // Add height variation
            const heightVariation = this.noise2D(x * 0.005, side === 'left' ? 0 : 1) * 50;
            const y = baseY + heightVariation + 20; // Ensure it's below water
            
            points.push({ x, y });
        }
        
        // Add bottom points to close the shape
        points.push({ x: endX, y: this.height });
        points.push({ x: startX, y: this.height });
        
        return {
            path: this.createSmoothPath(points),
            points: points,
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
    
    private generateRockFormations(feature: TerrainFeature): RockFormation[] {
        const formations: RockFormation[] = [];
        const formationCount = Math.floor(feature.size / 60); // Reduce rock count
        
        for (let i = 0; i < formationCount; i++) {
            const position = this.getRandomPositionInFeature(feature);
            
            // Only generate rocks near shoreline
            const distanceFromWater = Math.abs(position.y - this.waterLevel);
            if (distanceFromWater > 100) continue;
            
            const size = 15 + Math.random() * 25; // Smaller rocks
            const points: Vector2[] = [];
            const segments = 12;
            
            // Generate rock shape
            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                let radius = size * (0.8 + this.noise2D(angle, i) * 0.3);
                radius *= 1 + Math.sin(angle * 3) * 0.2;
                
                points.push({
                    x: position.x + Math.cos(angle) * radius,
                    y: position.y + Math.sin(angle) * radius * 0.8
                });
            }
    
            const rockPath = this.createRockPath(points);
            const cracks = this.generateRockCracks(points, size);
            const erosion = this.generateRockErosion(points, size);
            const texture = this.generateRockTexture(points, size);
            
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
  
  private getRockColor(featureType: TerrainFeature['type']): HSLColor {
    const baseColors = {
      cliff: { h: 220, s: 15, b: 30 },
      ledge: { h: 215, s: 20, b: 35 },
      slope: { h: 210, s: 25, b: 40 },
      depression: { h: 200, s: 20, b: 35 }
    };
    
    const base = baseColors[featureType];
    return {
      h: base.h + (Math.random() - 0.5) * 20,
      s: base.s + (Math.random() - 0.5) * 10,
      b: base.b + (Math.random() - 0.5) * 10,
      a: 1
    };
  }
  
  private createTerrainGradient(
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
    
    const baseColor = this.getRockColor(feature.type);
    gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 15}%, 1)`);
    gradient.addColorStop(0.5, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
    gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b - 10}%, 1)`);
    
    return gradient;
  }

  private drawRockFormation(
    ctx: CanvasRenderingContext2D,
    rock: RockFormation,
    time: number,
    lighting: any
  ) {
    // Base rock shape with lighting
    const gradient = ctx.createLinearGradient(
      rock.position.x,
      rock.position.y - rock.size,
      rock.position.x,
      rock.position.y + rock.size
    );
    
    gradient.addColorStop(0, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b + 10}%, 1)`);
    gradient.addColorStop(0.4, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b}%, 1)`);
    gradient.addColorStop(1, `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 15)}%, 1)`);
    
    ctx.fillStyle = gradient;
    ctx.fill(rock.path);
    
    // Draw cracks and erosion
    rock.cracks.forEach(crack => {
      ctx.strokeStyle = `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 20)}%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke(crack);
    });
    
    // Draw texture details
    ctx.fillStyle = `hsla(${rock.color.h}, ${rock.color.s}%, ${Math.max(0, rock.color.b - 10)}%, 0.1)`;
    ctx.fill(rock.texture);
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


  private constrainPoint(point: Vector2): Vector2 {
    return {
        x: Math.max(0, Math.min(this.width, point.x)),
        y: Math.max(this.waterLevel, Math.min(this.height, point.y))
    };
}
}