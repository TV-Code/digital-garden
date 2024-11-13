import { createNoise2D } from 'simplex-noise';
import { 
    TerrainFeature, TerrainLayer, Vector2, 
    RockFormation, ErosionPattern 
} from '../../types/environment/terrain';
import { TerrainConfig } from '../../configs/environment/terrainConfig';
import { ColorSystem, ColorBridge, HSLColor } from '../../utils/colors';

interface FeatureParams {
    height: number;
    roughness: number;
    erosionStrength: number;
    vegetationDensity: number;
}

export class TerrainFeatureGenerator {
    private noise2D: ReturnType<typeof createNoise2D>;

    constructor(
        private width: number,
        private height: number
    ) {
        this.noise2D = createNoise2D();
    }

    generateMountainFeatures(layer: TerrainLayer, params: FeatureParams): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const featureCount = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < featureCount; i++) {
            const position = this.getRandomPositionInLayer(layer);
            const size = this.width * (0.1 + Math.random() * 0.2);
            
            // Apply params to generation
            const points = this.generateMountainPoints(
                position, 
                size, 
                layer.elevation,
                params.roughness
            );
            const path = this.createSmoothPath(points);
            
            // Generate formations with param influence
            const rockFormations = this.generateRockFormations(
                points, 
                size, 
                params.roughness
            );

            // Generate erosion patterns based on strength
            const erosionPatterns = this.generateErosionPatterns(
                points,
                size,
                params.erosionStrength
            );
            
            features.push({
                path,
                points,
                type: 'ridge',
                position,
                size,
                elevation: layer.elevation,
                rockFormations,
                erosionPatterns
            });
        }
        
        return features;
    }

    generateValleyFeatures(layer: TerrainLayer, params: FeatureParams): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const valleyCount = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < valleyCount; i++) {
            const position = this.getRandomPositionInLayer(layer);
            const size = this.width * (0.15 + Math.random() * 0.25);
            
            // Apply valley-specific parameters
            const depth = size * params.height;
            const points = this.generateValleyPoints(
                position,
                size,
                depth,
                params.roughness
            );
            const path = this.createSmoothPath(points);
            
            // Generate erosion with higher water influence
            const erosionPatterns = this.generateValleyErosion(
                points,
                size,
                params.erosionStrength
            );
            
            features.push({
                path,
                points,
                type: 'valley',
                position,
                size,
                elevation: layer.elevation,
                rockFormations: [], // Valleys typically have fewer rock formations
                erosionPatterns
            });
        }
        
        return features;
    }

    generatePlateauFeatures(layer: TerrainLayer, params: FeatureParams): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const plateauCount = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < plateauCount; i++) {
            const position = this.getRandomPositionInLayer(layer);
            const size = this.width * (0.2 + Math.random() * 0.3);
            
            const points = this.generatePlateauPoints(
                position,
                size,
                layer.elevation,
                params.roughness
            );
            const path = this.createSmoothPath(points);
            
            // Generate rock formations for plateau edges
            const rockFormations = this.generateRockFormations(
                points,
                size * 0.5,
                params.roughness
            );
            
            // Generate wind-based erosion patterns
            const erosionPatterns = this.generatePlateauErosion(
                points,
                size,
                params.erosionStrength
            );
            
            features.push({
                path,
                points,
                type: 'plateau',
                position,
                size,
                elevation: layer.elevation,
                rockFormations,
                erosionPatterns
            });
        }
        
        return features;
    }

    private generateMountainPoints(
        position: Vector2,
        size: number,
        elevation: number,
        roughness: number
    ): Vector2[] {
        const points: Vector2[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            let radius = size * (0.8 + Math.random() * 0.4);
            
            // Apply roughness to noise
            radius *= 1 + Math.sin(angle * 3) * 0.3 * roughness;
            radius *= 1 + this.noise2D(angle * 5, elevation) * 0.2 * roughness;
            radius *= 1 + this.noise2D(angle * 10, elevation + 1) * 0.1 * roughness;
            
            points.push({
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius * 0.7
            });
        }
        
        return points;
    }

    private generateValleyPoints(
        position: Vector2,
        size: number,
        depth: number,
        roughness: number
    ): Vector2[] {
        const points: Vector2[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = position.x - size/2 + t * size;
            let y = position.y;
            
            // Apply depth and roughness
            y += Math.sin(t * Math.PI) * depth;
            y += this.noise2D(x * 0.01, position.y) * size * 0.2 * roughness;
            
            points.push({ x, y });
        }
        
        return points;
    }

    private generatePlateauPoints(
        position: Vector2,
        size: number,
        elevation: number,
        roughness: number
    ): Vector2[] {
        const points: Vector2[] = [];
        const segments = 30;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            let radius = size;
            
            // Create plateau shape with variable roughness
            const angleNorm = (angle % (Math.PI/2)) / (Math.PI/2);
            const platShape = Math.pow(Math.sin(angleNorm * Math.PI), 0.3);
            radius *= 0.8 + platShape * 0.2;
            
            // Apply noise based on roughness
            radius *= 1 + this.noise2D(angle * 5, elevation) * 0.1 * roughness;
            
            points.push({
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius
            });
        }
        
        return points;
    }

    private generateRockFormations(
        points: Vector2[],
        size: number,
        roughness: number
    ): RockFormation[] {
        const formations: RockFormation[] = [];
        const formationCount = Math.floor(3 + Math.random() * 4);
        
        for (let i = 0; i < formationCount; i++) {
            const position = points[Math.floor(Math.random() * points.length)];
            const rockSize = size * (0.2 + Math.random() * 0.3);
            
            // Generate rock points with roughness influence
            const rockPoints = this.generateRockPoints(position, rockSize, roughness);
            const rockPath = this.createRockPath(rockPoints);
            
            formations.push({
                path: rockPath,
                detail: {
                    cracks: this.generateRockCracks(rockPoints, rockSize, roughness),
                    texture: this.generateRockTexture(rockPoints, rockSize),
                    weathering: this.generateRockWeathering(rockPoints, rockSize)
                },
                color: TerrainConfig.features.cliff.color,
                position,
                size: rockSize,
                age: Math.random()
            });
        }
        
        return formations;
    }

    // Helper methods
    private createSmoothPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        if (points.length < 2) return path;
        
        path.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cp1 = {
                x: curr.x + (next.x - prev.x) * 0.2,
                y: curr.y + (next.y - prev.y) * 0.2
            };
            
            path.quadraticCurveTo(cp1.x, cp1.y, curr.x, curr.y);
        }
        
        path.closePath();
        return path;
    }

    private getRandomPositionInLayer(layer: TerrainLayer): Vector2 {
        const margin = this.width * 0.1;
        return {
            x: margin + Math.random() * (this.width - margin * 2),
            y: layer.elevation * this.height + 
               (Math.random() - 0.5) * this.height * 0.1
        };
    }

}