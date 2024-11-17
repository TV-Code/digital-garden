import { createNoise2D, createNoise3D } from 'simplex-noise';
import { Vector2, TerrainLayer, TerrainFeature, TerrainType } from '../../../types';
import { ColorSystem, ColorBridge, HSLColor } from '../../../utils/colors';

interface TerrainLevel {
    height: number;
    type: TerrainType;
}

interface RockFormation {
    points: Vector2[];
    position: Vector2;
    size: number;
    path: Path2D;
    shadowPath?: Path2D;
    highlightPath?: Path2D;
}

export class TerrainSystem {
    private layers: TerrainLayer[] = [];
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private staticBuffer: OffscreenCanvas;
    private staticCtx: OffscreenCanvasRenderingContext2D;

    private readonly TERRAIN_PARAMS = {
        // Core generation controls
        resolution: 200,
        baseFrequency: 0.003,
        
        // Composition controls
        composition: {
            mode: 'valley' as 'valley' | 'coastal' | 'cliff',
            centerOpening: 0.4,    // Width of central valley/water
            cliffSteepness: 0.85,  // How vertical the cliffs are
            smoothing: 0.3,        // Amount of edge smoothing
            verticalBias: 0.7      // Tendency for vertical vs angled features
        },

        // Layer distribution (normalized heights)
        layers: [
            { height: 0.25, type: 'water' },
            { height: 0.35, type: 'shore' },
            { height: 0.55, type: 'cliff' },
            { height: 0.75, type: 'mountain' },
            { height: 0.9, type: 'peak' }
        ],

        // Geometric controls
        geometry: {
            minCliffWidth: 0.05,
            maxCliffHeight: 0.3,
            valleyWidth: 0.4,
            plateauFlatness: 0.9,
            sharpness: 0.8
        }
    };

    constructor(
        private width: number,
        private height: number,
        private waterLevel: number
    ) {
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        
        // Initialize static buffer
        this.staticBuffer = new OffscreenCanvas(width, height);
        this.staticCtx = this.staticBuffer.getContext('2d')!;

        this.TERRAIN_PARAMS.composition.mode = 
            width > height * 1.5 ? 'valley' : 'coastal';
        
        this.generateTerrain();
    }

    private initializeComposition(): void {
        // Randomly select a composition type with weighted probability
        const rand = Math.random();
        if (rand < 0.4) {
            this.TERRAIN_PARAMS.composition.type = 'coastal';
            this.TERRAIN_PARAMS.composition.waterVisibility = 0.3 + Math.random() * 0.2;
            this.TERRAIN_PARAMS.composition.coastalCurve = 0.2 + Math.random() * 0.3;
        } else if (rand < 0.7) {
            this.TERRAIN_PARAMS.composition.type = 'valley';
            this.TERRAIN_PARAMS.composition.centerOpening = 0.2 + Math.random() * 0.2;
        } else {
            this.TERRAIN_PARAMS.composition.type = 'canyon';
            this.TERRAIN_PARAMS.composition.centerOpening = 0.15 + Math.random() * 0.15;
        }

        // Randomly select cliff placement
        const cliffRand = Math.random();
        this.TERRAIN_PARAMS.composition.cliffPlacement = 
            cliffRand < 0.5 ? 'sides' :
            cliffRand < 0.8 ? 'background' : 'asymmetric';
    }

    private generateTerrainLayers(heightmap: number[][]): TerrainLayer[] {
        const layers: TerrainLayer[] = [];
        const { resolution } = this.TERRAIN_PARAMS;

        // Generate layers with smooth transitions
        this.TERRAIN_PARAMS.layers.forEach(layerConfig => {
            const points: Vector2[] = [];
            const segmentWidth = this.width / (resolution * 0.5); // Reduce number of segments
            
            // Generate key points instead of scanning every pixel
            for (let x = 0; x <= resolution; x += 2) {
                const screenX = (x / resolution) * this.width;
                let validY: number | null = null;
                
                // Find the height at this x position
                for (let y = 0; y < resolution; y++) {
                    if (!heightmap[y] || typeof heightmap[y][x] === 'undefined') continue;
                    
                    const height = heightmap[y][x];
                    if (Math.abs(height - layerConfig.height) < 0.05) {
                        validY = (y / resolution) * this.height;
                        break;
                    }
                }

                if (validY !== null) {
                    points.push({ x: screenX, y: validY });
                }
            }

            // Ensure we have start and end points
            if (points.length > 0) {
                if (points[0].x > 0) {
                    points.unshift({ x: 0, y: points[0].y });
                }
                if (points[points.length - 1].x < this.width) {
                    points.push({ x: this.width, y: points[points.length - 1].y });
                }
            }

            // Create smooth path
            const path = this.createSmoothLayerPath(points, layerConfig.height);
            
            layers.push({
                points,
                path,
                elevation: layerConfig.height,
                type: layerConfig.type as TerrainType,
                features: [],
                vegetationZones: []
            });
        });

        return layers;
    }

    private createSmoothLayerPath(points: Vector2[], elevation: number): Path2D {
        const path = new Path2D();
        if (points.length < 2) {
            // Create default path if not enough points
            path.moveTo(0, this.height);
            path.lineTo(0, elevation * this.height);
            path.lineTo(this.width, elevation * this.height);
            path.lineTo(this.width, this.height);
            path.closePath();
            return path;
        }

        // Start from bottom
        path.moveTo(0, this.height);
        path.lineTo(points[0].x, points[0].y);

        // Create smooth curves between points
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            // Calculate control points for smooth curve
            const cp1x = prev.x + (curr.x - prev.x) * 0.5;
            const cp1y = prev.y + (curr.y - prev.y) * 0.5;
            const cp2x = curr.x + (next.x - curr.x) * 0.5;
            const cp2y = curr.y + (next.y - curr.y) * 0.5;

            // Use bezier curve for smooth transition
            path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
        }

        // Complete the path
        path.lineTo(this.width, points[points.length - 1].y);
        path.lineTo(this.width, this.height);
        path.closePath();

        return path;
    }

    private generateTerrain(): void {
        // Generate heightmap with enhanced terrain generation
        const heightMap = this.generateHeightmap();
    
        // Create layers using generateTerrainLayers
        this.layers = this.generateTerrainLayers(heightMap);
    
        // Post-process layers for better visual coherence
        this.postProcessLayers();
    
        // Generate features for each layer
        this.layers.forEach(layer => {
            layer.features = this.generateFeatures(layer);
        });
    
        // Generate static elements
        this.renderStaticElements();
    }
    

    private generateHeightmap(): number[][] {
        const { resolution, baseFrequency } = this.TERRAIN_PARAMS;
        const heightmap: number[][] = Array(resolution).fill(0)
            .map(() => Array(resolution).fill(0));

        // Generate base composition mask
        const compositionMask = this.generateCompositionMask();
        
        // Apply mask to height generation
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const nx = x / resolution;
                const ny = y / resolution;
                
                // Get masked height value
                const maskedHeight = this.getMaskedHeight(nx, ny, compositionMask);
                
                // Apply geometric shaping
                heightmap[y][x] = this.shapeTerrainHeight(maskedHeight, nx, ny);
            }
        }
        
        return heightmap;
    }

    private generateCompositionMask(): (x: number, y: number) => number {
        const { composition } = this.TERRAIN_PARAMS;
        
        switch (composition.mode) {
            case 'valley':
                return this.generateValleyMask();
            case 'coastal':
                return this.generateCoastalMask();
            case 'cliff':
                return this.generateCliffMask();
            default:
                return () => 1;
        }
    }

    private generateValleyMask(): (x: number, y: number) => number {
        const { centerOpening, smoothing } = this.TERRAIN_PARAMS.composition;
        
        return (x: number, y: number) => {
            // Create central valley
            const centerDist = Math.abs(x - 0.5);
            const valleyFalloff = this.smoothStep(
                centerOpening / 2,
                centerOpening,
                centerDist
            );

            // Add height variation based on distance from center
            const heightVariation = 1 - Math.pow(y, 2) * 0.3;
            
            // Smooth transitions
            const smoothedValue = this.smoothStep(0, smoothing, valleyFalloff);
            
            return smoothedValue * heightVariation;
        };
    }

    private generateCoastalMask(): (x: number, y: number) => number {
        const { smoothing } = this.TERRAIN_PARAMS.composition;
        
        return (x: number, y: number) => {
            // Create curved coastline
            const curveOffset = Math.sin(x * Math.PI) * 0.2;
            const coastDist = Math.abs(y - (0.5 + curveOffset));
            
            // Add coastal cliffs
            const cliffFactor = Math.pow(1 - coastDist, 2);
            
            // Smooth transitions
            return this.smoothStep(0, smoothing, cliffFactor);
        };
    }

    private generateCliffMask(): (x: number, y: number) => number {
        const { cliffSteepness, verticalBias } = this.TERRAIN_PARAMS.composition;
        
        return (x: number, y: number) => {
            // Create dramatic vertical cliffs
            const verticalFactor = Math.abs(Math.sin(x * Math.PI * 2));
            const cliffMask = Math.pow(verticalFactor, cliffSteepness);
            
            // Add vertical bias
            const bias = verticalBias + (1 - verticalBias) * this.noise2D(x * 10, y * 10);
            
            return cliffMask * bias;
        };
    }

    private getMaskedHeight(x: number, y: number, mask: (x: number, y: number) => number): number {
        // Generate multi-layered noise
        let height = 0;
        
        // Large features (mountains, cliffs)
        height += this.noise2D(x * 2, y * 2) * 0.5;
        
        // Medium features (rock formations)
        height += this.noise2D(x * 4, y * 4) * 0.25;
        
        // Small details
        height += this.noise2D(x * 8, y * 8) * 0.125;
        
        // Apply composition mask
        return height * mask(x, y);
    }

    private shapeTerrainHeight(height: number, x: number, y: number): number {
        const { geometry } = this.TERRAIN_PARAMS;
        
        // Normalize to 0-1 range
        height = (height + 1) * 0.5;
        
        // Apply cliff shaping where appropriate
        if (height > geometry.maxCliffHeight) {
            const t = (height - geometry.maxCliffHeight) / (1 - geometry.maxCliffHeight);
            const sharpness = Math.pow(t, geometry.sharpness);
            
            // Add some vertical variation
            const verticalNoise = this.noise2D(x * 20, y * 20) * 0.1;
            height = geometry.maxCliffHeight + sharpness * (1 - geometry.maxCliffHeight + verticalNoise);
        }
        
        // Create plateau areas
        if (Math.random() < geometry.plateauFlatness && height > 0.7) {
            const noise = this.noise2D(x * 10, y * 10) * 0.05;
            height = 0.7 + noise;
        }
        
        return height;
    }

    private smoothStep(edge0: number, edge1: number, x: number): number {
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return x * x * (3 - 2 * x);
    }

    
    private getCompositionMask(x: number, y: number): number {
        const { composition } = this.TERRAIN_PARAMS;
        let mask = 1;

        switch (composition.type) {
            case 'coastal':
                // Create a curved coastline
                const coastX = Math.sin(y * Math.PI) * composition.coastalCurve;
                const distFromCoast = Math.abs(x - (0.5 + coastX));
                mask *= this.smoothStep(0, composition.waterVisibility, distFromCoast);
                break;

            case 'valley':
                // Create a central valley
                const centerDist = Math.abs(x - 0.5);
                mask *= this.smoothStep(
                    composition.centerOpening / 2,
                    composition.centerOpening,
                    centerDist
                );
                break;

            case 'canyon':
                // Create parallel cliffs
                const canyonDist = Math.abs(x - 0.5);
                mask *= this.smoothStep(
                    composition.centerOpening / 3,
                    composition.centerOpening,
                    canyonDist
                ) * this.getNoisedEdge(x, y);
                break;
        }

        return mask;
    }

    private getCliffMask(x: number, y: number): number {
        const { composition, cliffs } = this.TERRAIN_PARAMS;
        let mask = 0;

        switch (composition.cliffPlacement) {
            case 'sides':
                // Cliffs on both sides
                const sidesDist = Math.abs(x - 0.5);
                mask = this.smoothStep(
                    cliffs.spread,
                    cliffs.spread * 1.5,
                    sidesDist
                );
                break;

            case 'background':
                // Cliffs in background
                const bgDist = 1 - y;
                mask = this.smoothStep(
                    cliffs.spread,
                    cliffs.spread * 1.5,
                    bgDist
                );
                break;

            case 'asymmetric':
                // More cliffs on one side
                const asymDist = x;
                mask = this.smoothStep(
                    1 - cliffs.spread,
                    1 - cliffs.spread * 0.5,
                    asymDist
                );
                break;
        }

        // Add vertical bias to create more straight cliffs
        const verticalNoise = this.noise2D(x * 10, y * 10) * (1 - cliffs.verticalBias);
        const verticalBias = Math.abs(Math.sin(x * Math.PI * 2)) * cliffs.verticalBias;
        
        return mask * (verticalBias + verticalNoise);
    }

    private getNoisedEdge(x: number, y: number): number {
        const baseNoise = this.noise2D(x * 5, y * 5) * 0.5 + 0.5;
        const detailNoise = this.noise2D(x * 15, y * 15) * 0.25 + 0.75;
        return baseNoise * detailNoise;
    }

    public draw(ctx: CanvasRenderingContext2D, time: number, lighting: any): void {
        // Draw static terrain
        ctx.drawImage(this.staticBuffer, 0, 0);
        
        // Draw dynamic terrain layers
        this.layers.forEach(layer => {
            if (layer.type !== 'water') { // Water handled by WaterSystem
                this.drawLayer(ctx, layer, lighting);
            }
        });
    }

    public update(time: number, deltaTime: number): void {
        // Update colors based on lighting
        this.updateColors(time);
    }

    private refineTerrainGeometry(points: Vector2[], level: TerrainLevel): Vector2[] {
        if (points.length < 2) return points;
        
        // Sort points left to right for consistent geometry
        points.sort((a, b) => a.x - b.x);
        
        // Add boundary points if needed
        if (points[0].x > 0) {
            points.unshift({ x: 0, y: points[0].y });
        }
        if (points[points.length - 1].x < this.width) {
            points.push({ x: this.width, y: points[points.length - 1].y });
        }

        // Apply different refinement based on terrain type
        switch (level.type) {
            case 'cliff':
                return this.generateCliffGeometry(points);
            case 'mountain':
                return this.generateMountainGeometry(points);
            case 'plateau':
                return this.generatePlateauGeometry(points);
            default:
                return this.smoothPoints(points);
        }
    }

    private generateCliffGeometry(points: Vector2[]): Vector2[] {
        const refined: Vector2[] = [];
        const { maxCliffHeight, minCliffWidth } = this.TERRAIN_PARAMS;
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            refined.push(current);

            const next = points[i + 1];
            const distance = Math.hypot(next.x - current.x, next.y - current.y);
            
            // Only add cliff features if there's enough space
            if (distance > this.width * minCliffWidth) {
                const cliffHeight = this.height * maxCliffHeight * (0.5 + Math.random() * 0.5);
                const midX = current.x + (next.x - current.x) * 0.5;
                
                // Create vertical cliff face
                refined.push(
                    { x: midX - 2, y: current.y },
                    { x: midX, y: current.y + cliffHeight },
                    { x: midX + 2, y: next.y }
                );
            }
        }
        
        refined.push(points[points.length - 1]);
        return refined;
    }

    private generateCliffFeatures(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const cliffCount = Math.floor(layer.points.length / 20);
        
        for (let i = 0; i < cliffCount; i++) {
            // Find suitable cliff locations
            const basePoint = layer.points[Math.floor(Math.random() * layer.points.length)];
            const size = this.width * (0.05 + Math.random() * 0.1);
            
            // Generate vertical cliff face
            const cliffPoints = this.generateCliffPoints(basePoint, size, layer.elevation);
            
            if (cliffPoints.length > 0) {
                features.push({
                    type: 'cliff',
                    position: basePoint,
                    size,
                    points: cliffPoints,
                    path: this.createCliffPath(cliffPoints)
                });
            }
        }
        
        return features;
    }

    private generateCliffPoints(position: Vector2, size: number, elevation: number): Vector2[] {
        const points: Vector2[] = [];
        const height = size * (1.5 + Math.random());
        const width = size * (0.3 + Math.random() * 0.3);
        
        // Create main cliff shape
        points.push(
            { x: position.x - width/2, y: position.y },
            { x: position.x - width/3, y: position.y - height * 0.3 },
            { x: position.x, y: position.y - height },
            { x: position.x + width/3, y: position.y - height * 0.8 },
            { x: position.x + width/2, y: position.y }
        );
        
        // Add detail points
        return this.addCliffDetails(points);
    }

    private addCliffDetails(points: Vector2[]): Vector2[] {
        const detailed: Vector2[] = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            detailed.push(current);
            
            // Add jagged details between main points
            const segments = 2 + Math.floor(Math.random() * 3);
            for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const baseX = current.x + (next.x - current.x) * t;
                const baseY = current.y + (next.y - current.y) * t;
                
                // Add random offsets for more natural look
                const offset = (Math.random() - 0.5) * 5;
                detailed.push({
                    x: baseX + offset,
                    y: baseY + Math.abs(offset) * 0.5
                });
            }
        }
        
        detailed.push(points[points.length - 1]);
        return detailed;
    }

    private createCliffPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        if (points.length < 2) return path;

        path.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            // Use straight lines for more angular appearance
            path.lineTo(points[i].x, points[i].y);
        }
        
        path.closePath();
        return path;
    }

    private generateFeatures(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        
        switch (layer.type) {
            case 'cliff':
                // Generate main cliff features
                features.push(...this.generateCliffFeatures(layer));
                // Add supporting rocks at cliff bases
                features.push(...this.generateSupportingRocks(layer));
                break;
                
            case 'mountain':
                // Generate large rock formations for mountains
                features.push(...this.generateMountainRocks(layer));
                break;
                
            case 'plateau':
                // Generate scattered rocks on plateaus
                features.push(...this.generatePlateauRocks(layer));
                break;
                
            case 'shoreline':
                // Generate coastal rocks
                features.push(...this.generateCoastalRocks(layer));
                break;
        }
        
        return features;
    }

    private generateSupportingRocks(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const rockCount = Math.floor(layer.points.length / 15);
        
        // Add rocks at the base of cliffs
        for (let i = 0; i < rockCount; i++) {
            const basePoint = layer.points[Math.floor(Math.random() * layer.points.length)];
            const size = this.width * (0.02 + Math.random() * 0.04);
            
            features.push(this.generateRockFormation(
                basePoint,
                size,
                'cliff'
            ));
        }
        
        return features;
    }

    private generateMountainRocks(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const mainRockCount = 3 + Math.floor(Math.random() * 4);
        
        // Generate main large rock formations
        for (let i = 0; i < mainRockCount; i++) {
            const position = this.findSuitableRockPosition(layer);
            const size = this.width * (0.08 + Math.random() * 0.12);
            
            features.push(this.generateRockFormation(
                position,
                size,
                'mountain'
            ));
        }
        
        // Add smaller supporting rocks
        const smallRockCount = mainRockCount * 2;
        for (let i = 0; i < smallRockCount; i++) {
            const position = this.findSuitableRockPosition(layer);
            const size = this.width * (0.03 + Math.random() * 0.05);
            
            features.push(this.generateRockFormation(
                position,
                size,
                'mountain'
            ));
        }
        
        return features;
    }

    private generatePlateauRocks(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const rockCount = Math.floor(layer.points.length / 25);
        
        for (let i = 0; i < rockCount; i++) {
            const position = this.findSuitableRockPosition(layer);
            const size = this.width * (0.02 + Math.random() * 0.06);
            
            features.push(this.generateRockFormation(
                position,
                size,
                'plateau'
            ));
        }
        
        return features;
    }

    private generateCoastalRocks(layer: TerrainLayer): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const rockCount = Math.floor(layer.points.length / 30);
        
        for (let i = 0; i < rockCount; i++) {
            const position = this.findWaterlinePosition(layer);
            const size = this.width * (0.02 + Math.random() * 0.04);
            
            features.push(this.generateRockFormation(
                position,
                size,
                'shoreline'
            ));
        }
        
        return features;
    }

    private findSuitableRockPosition(layer: TerrainLayer): Vector2 {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const basePoint = layer.points[Math.floor(Math.random() * layer.points.length)];
            
            // Add some random offset from the base point
            const offset = {
                x: (Math.random() - 0.5) * this.width * 0.1,
                y: (Math.random() - 0.5) * this.height * 0.05
            };
            
            const position = {
                x: basePoint.x + offset.x,
                y: basePoint.y + offset.y
            };
            
            // Check if position is suitable
            if (this.isValidRockPosition(position, layer)) {
                return position;
            }
            
            attempts++;
        }
        
        // Fallback to base point if no suitable position found
        return layer.points[Math.floor(Math.random() * layer.points.length)];
    }

    private findWaterlinePosition(layer: TerrainLayer): Vector2 {
        const waterlinePoints = layer.points.filter(point => 
            Math.abs(point.y - this.waterLevel) < this.height * 0.1
        );
        
        if (waterlinePoints.length === 0) {
            return layer.points[Math.floor(Math.random() * layer.points.length)];
        }
        
        return waterlinePoints[Math.floor(Math.random() * waterlinePoints.length)];
    }

    private isValidRockPosition(position: Vector2, layer: TerrainLayer): boolean {
        // Check distance from other features
        const minDistance = this.width * 0.05;
        
        const tooClose = layer.features.some(feature => {
            const dx = feature.position.x - position.x;
            const dy = feature.position.y - position.y;
            return Math.sqrt(dx * dx + dy * dy) < minDistance;
        });
        
        if (tooClose) return false;
        
        // Check if position is within layer bounds
        const inBounds = layer.points.some(point => {
            const dx = point.x - position.x;
            const dy = point.y - position.y;
            return Math.sqrt(dx * dx + dy * dy) < this.width * 0.2;
        });
        
        return inBounds;
    }

    private generateMountainGeometry(points: Vector2[]): Vector2[] {
        const refined: Vector2[] = [];
        const peakCount = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            refined.push(current);

            const next = points[i + 1];
            const distance = Math.hypot(next.x - current.x, next.y - current.y);
            
            if (distance > this.width * 0.1) {
                // Add peaks
                for (let p = 0; p < peakCount; p++) {
                    const t = (p + 1) / (peakCount + 1);
                    const x = current.x + (next.x - current.x) * t;
                    const baseY = current.y + (next.y - current.y) * t;
                    const peakHeight = distance * 0.3 * (0.7 + Math.random() * 0.6);
                    
                    refined.push(
                        { x: x - distance * 0.05, y: baseY },
                        { x: x, y: baseY - peakHeight },
                        { x: x + distance * 0.05, y: baseY }
                    );
                }
            }
        }
        
        refined.push(points[points.length - 1]);
        return refined;
    }

    private generatePlateauGeometry(points: Vector2[]): Vector2[] {
        const refined: Vector2[] = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            refined.push(current);

            const next = points[i + 1];
            const distance = Math.hypot(next.x - current.x, next.y - current.y);
            
            if (distance > this.width * 0.15) {
                // Create flat plateau sections
                const plateauHeight = Math.min(current.y, next.y) - distance * 0.1;
                refined.push(
                    { x: current.x + distance * 0.1, y: current.y },
                    { x: current.x + distance * 0.2, y: plateauHeight },
                    { x: current.x + distance * 0.8, y: plateauHeight },
                    { x: current.x + distance * 0.9, y: next.y }
                );
            }
        }
        
        refined.push(points[points.length - 1]);
        return refined;
    }

    private smoothPoints(points: Vector2[]): Vector2[] {
        if (points.length < 3) return points;

        const smoothed: Vector2[] = [];
        const windowSize = 3; // Adjust for more/less smoothing
        
        for (let i = 0; i < points.length; i++) {
            let sumX = 0;
            let sumY = 0;
            let count = 0;
            
            // Calculate weighted average of nearby points
            for (let j = Math.max(0, i - windowSize); 
                 j <= Math.min(points.length - 1, i + windowSize); j++) {
                // Weight points based on distance from current point
                const weight = 1 / (1 + Math.abs(i - j));
                sumX += points[j].x * weight;
                sumY += points[j].y * weight;
                count += weight;
            }
            
            // Add noise to maintain some terrain character
            const noiseX = this.noise2D(points[i].x * 0.01, points[i].y * 0.01) * this.width * 0.01;
            const noiseY = this.noise2D(points[i].x * 0.01, points[i].y * 0.02) * this.height * 0.01;
            
            smoothed.push({
                x: (sumX / count) + noiseX,
                y: (sumY / count) + noiseY
            });
        }
        
        return smoothed;
    }

    private generateLayerFeatures(points: Vector2[], level: TerrainLevel): TerrainFeature[] {
        const features: TerrainFeature[] = [];
        const rockDensity = this.TERRAIN_PARAMS.rockDensity[level.type] || 0;
        
        if (rockDensity > 0) {
            const rockCount = Math.floor((points.length / 10) * rockDensity);
            
            for (let i = 0; i < rockCount; i++) {
                const basePoint = points[Math.floor(Math.random() * points.length)];
                const formation = this.generateRockFormation(basePoint, level);
                
                if (formation) {
                    features.push({
                        type: 'rock',
                        position: basePoint,
                        path: formation.path,
                        shadowPath: formation.shadowPath,
                        highlightPath: formation.highlightPath
                    });
                }
            }
        }
        
        return features;
    }

    private generateRockFormation(position: Vector2, size: number, terrainType: TerrainType): TerrainFeature {
        const rockPoints: Vector2[] = [];
        const segments = 8;
        
        // Generate base rock shape with more angular features
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            
            // Create jagged variations
            const jaggedNoise = this.noise2D(angle * 3, position.y * 0.01) * 0.4;
            const sharpNoise = Math.pow(Math.abs(this.noise2D(angle * 5, position.x * 0.01)), 2) * 0.6;
            
            // Combine different noise patterns for more interesting shapes
            let radius = size * (0.8 + jaggedNoise + sharpNoise);
            
            // Add directional bias for more dramatic shapes
            const verticalBias = Math.abs(Math.sin(angle)) * 0.3;
            radius *= (1 + verticalBias);
            
            rockPoints.push({
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius * 0.7
            });
        }

        // Add angular details
        const enhancedPoints = this.addRockDetails(rockPoints);
        
        return {
            type: 'rock',
            position,
            size,
            points: enhancedPoints,
            path: this.createAngularRockPath(enhancedPoints)
        };
    }

    private addRockDetails(points: Vector2[]): Vector2[] {
        const enhanced: Vector2[] = [];
        
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            
            enhanced.push(current);
            
            // Add sharp points between main points
            if (Math.random() < 0.7) {
                const midPoint = {
                    x: (current.x + next.x) * 0.5,
                    y: (current.y + next.y) * 0.5
                };
                
                // Create sharp outcrop
                const angle = Math.atan2(next.y - current.y, next.x - current.x) + Math.PI/2;
                const distance = Math.hypot(next.x - current.x, next.y - current.y);
                const sharpness = distance * (0.2 + Math.random() * 0.3);
                
                enhanced.push({
                    x: midPoint.x + Math.cos(angle) * sharpness,
                    y: midPoint.y + Math.sin(angle) * sharpness
                });
            }
        }
        
        return enhanced;
    }

    private createAngularRockPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        if (points.length < 2) return path;

        path.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            const current = points[i];
            const prev = points[i - 1];
            const next = points[(i + 1) % points.length];

            // Create sharp angles instead of curves
            if (Math.random() < 0.7) {
                // Add small offset for more jagged appearance
                const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
                const offset = 2 + Math.random() * 3;
                
                const offsetPoint = {
                    x: current.x + Math.cos(angle + Math.PI/2) * offset,
                    y: current.y + Math.sin(angle + Math.PI/2) * offset
                };
                
                path.lineTo(offsetPoint.x, offsetPoint.y);
            }
            
            path.lineTo(current.x, current.y);
        }
        
        path.closePath();
        return path;
    }

    // Part 3: Visual Styling and Rendering

    private drawLayer(ctx: CanvasRenderingContext2D, layer: TerrainLayer, lighting: any): void {
        ctx.save();

        // Create and apply gradient for main terrain
        const gradient = this.createTerrainGradient(ctx, layer, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(layer.path);

        // Draw features
        layer.features.forEach(feature => {
            this.drawFeature(ctx, feature, lighting);
        });

        ctx.restore();
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
        
        gradient.addColorStop(0, ColorSystem.toHSLString(highlightColor));
        gradient.addColorStop(0.3, ColorSystem.toHSLString(baseColor));
        gradient.addColorStop(1, ColorSystem.toHSLString(shadowColor));
        
        return gradient;
    }

    private drawFeature(ctx: CanvasRenderingContext2D, feature: TerrainFeature, lighting: any): void {
        if (feature.type === 'rock') {
            ctx.save();
    
            // Draw shadow first
            if (feature.shadowPath) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fill(feature.shadowPath);
            }
    
            // Draw main rock shape
            const rockGradient = this.createRockGradient(ctx, feature, lighting);
            ctx.fillStyle = rockGradient;
            ctx.fill(feature.path);
    
            // Draw highlight
            if (feature.highlightPath) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fill(feature.highlightPath);
            }
    
            ctx.restore();
        }
    }

    private createRockGradient(
        ctx: CanvasRenderingContext2D, 
        feature: TerrainFeature, 
        lighting: any
    ): CanvasGradient {
        const { position } = feature;
        const size = Math.max(
            feature.path.getBoundingClientRect?.()?.width || 20,
            feature.path.getBoundingClientRect?.()?.height || 20
        );

        const gradient = ctx.createLinearGradient(
            position.x - size/2, position.y - size/2,
            position.x + size/2, position.y + size/2
        );

        const baseColor = this.getRockColor(lighting);
        const shadowColor = this.adjustColor(baseColor, { l: -20 });
        const highlightColor = this.adjustColor(baseColor, { l: +20 });

        gradient.addColorStop(0, ColorBridge.toHSLString(highlightColor));
        gradient.addColorStop(0.5, ColorBridge.toHSLString(baseColor));
        gradient.addColorStop(1, ColorBridge.toHSLString(shadowColor));

        return gradient;
    }

    private renderStaticElements(): void {
        const ctx = this.staticCtx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw base terrain layers
        this.layers.forEach(layer => {
            if (layer.type !== 'water') {
                this.drawLayer(ctx, layer, null);
            }
        });
    }

    private createRockPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        
        path.moveTo(points[0].x, points[0].y);
        
        // Create smoother rock shapes with bezier curves
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cp1 = {
                x: prev.x + (curr.x - prev.x) * 0.5,
                y: prev.y + (curr.y - prev.y) * 0.5
            };
            
            const cp2 = {
                x: curr.x + (next.x - curr.x) * 0.5,
                y: curr.y + (next.y - curr.y) * 0.5
            };
            
            path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
        }
        
        path.closePath();
        return path;
    }

    private createRockShadowPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        const shadowOffset = this.height * 0.01;
        
        // Create offset shadow path
        path.moveTo(points[0].x + shadowOffset, points[0].y + shadowOffset);
        
        points.forEach(point => {
            path.lineTo(point.x + shadowOffset, point.y + shadowOffset);
        });
        
        path.closePath();
        return path;
    }

    private createRockHighlightPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        const highlightOffset = this.height * 0.005;
        
        // Create slightly offset highlight path
        path.moveTo(points[0].x - highlightOffset, points[0].y - highlightOffset);
        
        points.forEach(point => {
            path.lineTo(point.x - highlightOffset, point.y - highlightOffset);
        });
        
        path.closePath();
        return path;
    }

    // ... continuing from Parts 1-3

    private extractLayerPoints(heightmap: number[][], targetHeight: number): Vector2[] {
        const points: Vector2[] = [];
        const threshold = 0.05;
        const resolution = this.TERRAIN_PARAMS.resolution;

        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                if (!heightmap[y] || typeof heightmap[y][x] === 'undefined') continue;
                
                const height = heightmap[y][x];
                if (Math.abs(height - targetHeight) < threshold) {
                    points.push({
                        x: (x / resolution) * this.width,
                        y: (y / resolution) * this.height
                    });
                }
            }
        }

        // Ensure we have at least some points for each layer
        if (points.length === 0) {
            // Add fallback points if none were found
            points.push(
                { x: 0, y: targetHeight * this.height },
                { x: this.width * 0.5, y: targetHeight * this.height },
                { x: this.width, y: targetHeight * this.height }
            );
        }

        return this.simplifyPoints(points);
    }

    private simplifyPoints(points: Vector2[]): Vector2[] {
        if (points.length < 3) return points;
        
        const simplified: Vector2[] = [points[0]];
        const tolerance = this.width * 0.01; // Adjust for desired level of detail
        
        for (let i = 1; i < points.length - 1; i++) {
            const prev = simplified[simplified.length - 1];
            const curr = points[i];
            const next = points[i + 1];
            
            // Calculate area of triangle formed by these points
            const area = Math.abs(
                (prev.x - next.x) * (curr.y - prev.y) -
                (prev.x - curr.x) * (next.y - prev.y)
            ) / 2;
            
            // If area is significant enough, keep the point
            if (area > tolerance) {
                simplified.push(curr);
            }
        }
        
        simplified.push(points[points.length - 1]);
        return simplified;
    }

    private postProcessLayers(): void {
        if (!this.layers || this.layers.length === 0) return;

        // Sort layers by elevation
        this.layers.sort((a, b) => b.elevation - a.elevation);

        // Process each layer to ensure proper overlap
        for (let i = 1; i < this.layers.length; i++) {
            const upperLayer = this.layers[i - 1];
            const lowerLayer = this.layers[i];

            // Ensure lower layer doesn't intersect with upper layer
            lowerLayer.points = lowerLayer.points.map(point => {
                const upperPoint = this.findClosestPointAbove(point, upperLayer.points);
                if (upperPoint && point.y < upperPoint.y) {
                    return {
                        x: point.x,
                        y: upperPoint.y + (this.height * 0.02)
                    };
                }
                return point;
            });

            // Regenerate path after adjustment
            lowerLayer.path = this.createSmoothLayerPath(lowerLayer.points, lowerLayer.elevation);
        }
    }

    private findClosestPointAbove(point: Vector2, upperPoints: Vector2[]): Vector2 | null {
        if (!upperPoints || upperPoints.length === 0) return null;

        // Find points that are close in x-coordinate
        const nearbyPoints = upperPoints.filter(up => 
            Math.abs(up.x - point.x) < this.width * 0.05
        );

        if (nearbyPoints.length === 0) return null;

        // Find the lowest point that's still above our target
        return nearbyPoints.reduce((closest, curr) => {
            if (curr.y > point.y && (!closest || curr.y < closest.y)) {
                return curr;
            }
            return closest;
        }, null as Vector2 | null);
    }

    private createLayerPath(points: Vector2[]): Path2D {
        const path = new Path2D();
        if (!points || points.length < 2) {
            // Create a default path if there aren't enough points
            path.moveTo(0, this.height);
            path.lineTo(this.width, this.height);
            path.closePath();
            return path;
        }

        // Sort points left to right
        const sortedPoints = [...points].sort((a, b) => a.x - b.x);

        // Start from bottom-left
        path.moveTo(0, this.height);
        path.lineTo(sortedPoints[0].x, sortedPoints[0].y);

        // Create smooth curve through points
        for (let i = 1; i < sortedPoints.length - 1; i++) {
            const curr = sortedPoints[i];
            const next = sortedPoints[i + 1];
            const prev = sortedPoints[i - 1];

            const cp1 = {
                x: curr.x + (next.x - prev.x) * 0.2,
                y: curr.y + (next.y - prev.y) * 0.2
            };

            path.quadraticCurveTo(cp1.x, cp1.y, next.x, next.y);
        }

        // Complete the path
        path.lineTo(this.width, sortedPoints[sortedPoints.length - 1].y);
        path.lineTo(this.width, this.height);
        path.closePath();

        return path;
    }

    private smoothLayerTransitions(): void {
        const { layerBlendZone } = this.TERRAIN_PARAMS;
        
        for (let i = 0; i < this.layers.length - 1; i++) {
            const currentLayer = this.layers[i];
            const nextLayer = this.layers[i + 1];
            
            if (!currentLayer.points || !nextLayer.points) continue;

            // Find transition points
            const transitionPoints = currentLayer.points.filter(point => {
                if (!point) return false;
                
                const nextLayerPoint = this.findClosestPoint(point, nextLayer.points);
                if (!nextLayerPoint) return false;
                
                const dist = Math.hypot(
                    point.x - nextLayerPoint.x, 
                    point.y - nextLayerPoint.y
                );
                return dist < this.height * layerBlendZone;
            });
            
            // Smooth transition points
            transitionPoints.forEach(point => {
                if (!point) return;
                
                const nextLayerPoint = this.findClosestPoint(point, nextLayer.points);
                if (!nextLayerPoint) return;
                
                const dist = Math.hypot(
                    point.x - nextLayerPoint.x, 
                    point.y - nextLayerPoint.y
                );
                const t = dist / (this.height * layerBlendZone);
                
                point.y = point.y * (1 - t) + nextLayerPoint.y * t;
            });
        }
    }

    private getTerrainColor(type: TerrainType, variant: 'base' | 'shadow' | 'highlight' = 'base'): HSLColor {
        // Base colors for different terrain types
        const colors: Record<TerrainType, { base: HSLColor, shadow: HSLColor, highlight: HSLColor }> = {
            water: {
                base: [200, 60, 50],
                shadow: [200, 65, 40],
                highlight: [200, 55, 60]
            },
            shore: {
                base: [35, 30, 60],
                shadow: [35, 35, 50],
                highlight: [35, 25, 70]
            },
            cliff: {
                base: [220, 15, 35],
                shadow: [220, 20, 25],
                highlight: [220, 10, 45]
            },
            mountain: {
                base: [215, 20, 30],
                shadow: [215, 25, 20],
                highlight: [215, 15, 40]
            },
            peak: {
                base: [210, 15, 40],
                shadow: [210, 20, 30],
                highlight: [210, 10, 50]
            },
            valley: {
                base: [150, 20, 45],
                shadow: [150, 25, 35],
                highlight: [150, 15, 55]
            },
            plateau: {
                base: [35, 25, 50],
                shadow: [35, 30, 40],
                highlight: [35, 20, 60]
            }
        };

        return colors[type]?.[variant] || colors.mountain.base;
    }

    private getRockColor(lighting: any): HSLColor {
        const baseColor: HSLColor = [215, 20, 35];
        return lighting ? this.adjustColorForLighting(baseColor, lighting) : baseColor;
    }

    private adjustColorForLighting(color: HSLColor, lighting: any): HSLColor {
        if (!lighting) return color;
        
        const [h, s, l] = color;
        const lightIntensity = lighting.intensity || 1;
        const timeOfDay = lighting.timeOfDay || 0;
        
        // Adjust hue based on time of day
        const hueShift = Math.sin(timeOfDay * Math.PI * 2) * 10;
        
        // Adjust lightness based on lighting intensity
        const lightnessAdjustment = (lightIntensity - 1) * 15;
        
        return [
            (h + hueShift) % 360,
            Math.min(100, s * lightIntensity),
            Math.min(100, Math.max(0, l + lightnessAdjustment))
        ];
    }

    private adjustColor(color: HSLColor, adjustments: { h?: number; s?: number; l?: number }): HSLColor {
        const [h, s, l] = color;
        return [
            (h + (adjustments.h || 0)) % 360,
            Math.min(100, Math.max(0, s + (adjustments.s || 0))),
            Math.min(100, Math.max(0, l + (adjustments.l || 0)))
        ];
    }

    private findClosestPoint(target: Vector2, points: Vector2[]): Vector2 | null {
        if (!target || !points || points.length === 0) return null;
        
        let closest = points[0];
        let minDist = Number.MAX_VALUE;
        
        points.forEach(point => {
            if (!point) return;
            
            const dist = Math.hypot(point.x - target.x, point.y - target.y);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        });
        
        return closest;
    }

    public getTerrainHeightAt(x: number, y: number): number {
        const screenX = x / this.width;
        const screenY = y / this.height;
        
        // Sample multiple frequencies for natural variation
        let height = 0;
        for (let freq = 1; freq <= 4; freq++) {
            height += this.noise2D(screenX * freq, screenY * freq) / freq;
        }
        
        return this.shapeTerrainHeight(height, screenX, screenY);
    }

    public getTerrainTypeAt(x: number, y: number): TerrainType {
        const height = this.getTerrainHeightAt(x, y);
        
        // Find appropriate layer based on height
        for (const level of this.TERRAIN_PARAMS.levels) {
            if (height <= level.height) {
                return level.type;
            }
        }
        
        return 'mountain';
    }

    public getLayers(): TerrainLayer[] {
        return this.layers;
    }

    public updateColors(time: number): void {
        // Update dynamic colors (e.g., for time of day)
        this.layers.forEach(layer => {
            layer.features.forEach(feature => {
                if (feature.type === 'rock') {
                    // Update rock colors based on lighting
                    const timeOfDay = Math.sin(time * 0.001);
                    const lighting = { timeOfDay, intensity: 0.8 + timeOfDay * 0.2 };
                    feature.color = this.getRockColor(lighting);
                }
            });
        });
    }

    public addRandomFeature(x: number, y: number): void {
        const terrainType = this.getTerrainTypeAt(x, y);
        const layer = this.layers.find(l => l.type === terrainType);
        
        if (layer) {
            const feature = this.generateRockFormation({ x, y }, 
                layer.elevation, terrainType
            );
            
            if (feature) {
                layer.features.push({
                    type: 'rock',
                    position: { x, y },
                    path: feature.path,
                    shadowPath: feature.shadowPath,
                    highlightPath: feature.highlightPath
                });
            }
        }
    }

    public initializeWithExistingLayers(existingLayers: TerrainLayer[]): void {
        this.layers = existingLayers.map(layer => ({
            ...layer,
            features: this.generateLayerFeatures(layer.points, {
                height: layer.elevation,
                type: layer.type
            })
        }));
        
        this.postProcessLayers();
        this.renderStaticElements();
    }

    public integrate(systems: {
        water?: any,
        lighting?: any,
        vegetation?: any
    }): void {
        // Share relevant data with other systems
        if (systems.water) {
            const waterLayer = this.layers.find(l => l.type === 'water');
            if (waterLayer) {
                const waterlinePoints = waterLayer.points.map(p => ({
                    x: p.x,
                    y: Math.min(p.y, this.waterLevel)
                }));
                systems.water.updateWaterline(waterlinePoints);
            }
        }

        // Provide terrain data for vegetation placement
        if (systems.vegetation) {
            const terrainData = this.layers.map(layer => ({
                elevation: layer.elevation,
                type: layer.type,
                points: layer.points,
                features: layer.features
            }));
            systems.vegetation.updateTerrainData(terrainData);
        }
    }
}