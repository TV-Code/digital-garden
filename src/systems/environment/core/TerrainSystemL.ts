import { createNoise2D, createNoise3D } from 'simplex-noise';
import { TerrainLayer, TerrainFeature, TerrainType } from '../../../types/environment/terrain';
import { ColorSystem, ColorBridge, HSLColor } from '../../../utils/colors';
import { Vector2 } from '../../../types';

interface DepthLayer {
    depth: number;  // 0 (foreground) to 1 (background)
    elements: TerrainElement[];
    scale: number;
    yOffset: number;
}

interface TerrainElement {
    type: 'cliff' | 'mountain' | 'plateau';
    path: Path2D;
    color: HSLColor;
    position: Vector2;
    width: number;
    height: number;
}

interface TerrainParams {
    resolution: number;
    baseFrequency: number;
    composition: CompositionParams;
    depthLayers: DepthLayerParams[];
    geometry: GeometryParams;
}

interface DepthLayerParams {
    depth: number;
    scale: number;
    yOffset: number;
}

interface GeometryParams {
    minCliffWidth: number;
    maxCliffHeight: number;
    valleyWidth: number;
    plateauFlatness: number;
    sharpness: number;
    cliffProbability: number;
}

interface CompositionParams {
    mode: 'valley' | 'coastal' | 'cliff';
    centerOpening: number;
    cliffSteepness: number;
    smoothing: number;
    verticalBias: number;
    waterVisibility?: number;    // Optional for coastal mode
    coastalCurve?: number;       // Optional for coastal mode
}

export class TerrainSystem {
    private layers: DepthLayer[] = [];
    private noise2D: ReturnType<typeof createNoise2D>;
    private noise3D: ReturnType<typeof createNoise3D>;
    private staticBuffer: OffscreenCanvas;
    private staticCtx: OffscreenCanvasRenderingContext2D;

    private readonly TERRAIN_PARAMS: TerrainParams = {
        // Core generation controls
        resolution: 100,
        baseFrequency: 0.05, // Increased from 0.01
        
        // Composition controls
        composition: {
            mode: 'valley',
            centerOpening: 0.6,
            cliffSteepness: 0.9,
            smoothing: 0.2,
            verticalBias: 0.8,
            waterVisibility: 0.4,
            coastalCurve: 0.3
        },
    
        // Layer distribution (adjusted for better visibility)
        depthLayers: [
            { depth: 0.0, scale: 1.0, yOffset: 0 },
            { depth: 0.3, scale: 0.85, yOffset: 50 },
            { depth: 0.6, scale: 0.7, yOffset: 100 },
        ],
    
        // Geometric controls (adjusted for more features)
        geometry: {
            minCliffWidth: 0.1,
            maxCliffHeight: 0.6,    // Increased
            valleyWidth: 0.5,
            plateauFlatness: 0.7,   // Reduced
            sharpness: 0.9,
            cliffProbability: 0.4   // Increased
        }
    };

    constructor(
        private width: number,
        private height: number,
        private waterLevel: number
    ) {
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        
        this.staticBuffer = new OffscreenCanvas(width, height);
        this.staticCtx = this.staticBuffer.getContext('2d')!;

        this.generateTerrain();
    }

    public getLayers(): TerrainLayer[] {
        // Convert DepthLayers to TerrainLayers
        return this.layers.map(layer => ({
            type: this.determineTerrainType(layer.depth),
            elevation: layer.depth,
            path: this.createLayerPath(layer),
            points: this.extractLayerPoints(layer),
            features: this.convertElementsToFeatures(layer.elements),
            vegetationZones: []
        }));
    }

    public getDepthLayers(): DepthLayer[] {
        return this.layers.map(layer => ({
            depth: layer.depth,
            elements: layer.elements,
            scale: layer.scale,
            yOffset: layer.yOffset
        }));
    }

    // public drawDebug(ctx: CanvasRenderingContext2D): void {
    //     ctx.save();
        
    //     // Draw layer boundaries
    //     this.layers.forEach((layer, i) => {
    //         ctx.strokeStyle = `hsla(${i * 60}, 70%, 50%, 0.5)`;
    //         ctx.lineWidth = 2;
            
    //         layer.elements.forEach(element => {
    //             ctx.strokeStyle = `hsla(${i * 60}, 70%, 50%, 0.5)`;
    //             ctx.stroke(element.path);
                
    //             // Draw element center
    //             ctx.fillStyle = 'red';
    //             ctx.beginPath();
    //             ctx.arc(element.position.x, element.position.y, 5, 0, Math.PI * 2);
    //             ctx.fill();
                
    //             // Draw element bounds
    //             ctx.strokeRect(
    //                 element.position.x - element.width/2,
    //                 element.position.y - element.height/2,
    //                 element.width,
    //                 element.height
    //             );
    //         });
    //     });
        
    //     ctx.restore();
    // }

    public generateTerrain(): void {
        // Initialize composition parameters based on scene type
        this.initializeComposition();
        
        // Generate each depth layer
        this.TERRAIN_PARAMS.depthLayers.forEach(layerParams => {
            const elements = this.generateTerrainElements(
                layerParams.depth,
                layerParams.scale
            );
            
            this.layers.push({
                depth: layerParams.depth,
                elements,
                scale: layerParams.scale,
                yOffset: layerParams.yOffset
            });
        });
        
        // Generate static elements
        this.renderStaticElements();
    }

    private initializeComposition(): void {
        const rand = Math.random();
        const composition = this.TERRAIN_PARAMS.composition;
        
        if (rand < 0.4) {
            composition.mode = 'coastal';
            composition.waterVisibility = 0.3 + Math.random() * 0.2;
            composition.coastalCurve = 0.2 + Math.random() * 0.3;
        } else if (rand < 0.7) {
            composition.mode = 'valley';
            composition.centerOpening = 0.2 + Math.random() * 0.2;
        } else {
            composition.mode = 'cliff';
            composition.centerOpening = 0.15 + Math.random() * 0.15;
        }
    }

    private generateTerrainElements(depth: number, scale: number): TerrainElement[] {
        const elements: TerrainElement[] = [];
        const { resolution, baseFrequency } = this.TERRAIN_PARAMS;
        
        // Generate base heightmap for this layer
        const heightMap = this.generateHeightMap(depth, scale);
        
        // Extract terrain features based on height thresholds
        const features = this.extractFeatures(heightMap, depth);
        
        // Convert features to terrain elements
        features.forEach(feature => {
            const element = this.createTerrainElement(feature, depth, scale);
            if (element) {
                elements.push(element);
            }
        });
        
        return elements;
    }

    private generateHeightMap(depth: number, scale: number): number[][] {
        const { resolution, baseFrequency } = this.TERRAIN_PARAMS;
        const heightMap: number[][] = [];
        
        for (let y = 0; y < resolution; y++) {
            heightMap[y] = [];
            for (let x = 0; x < resolution; x++) {
                const nx = (x / resolution) * scale;
                const ny = (y / resolution) * scale;
                
                // Generate multi-layered noise with more pronounced features
                let height = 0;
                
                // Large features (increased amplitude)
                height += this.noise2D(nx * baseFrequency, ny * baseFrequency) * 0.7;
                
                // Medium details
                height += this.noise2D(nx * baseFrequency * 2, ny * baseFrequency * 2) * 0.4;
                
                // Fine details (reduced in background)
                height += this.noise2D(nx * baseFrequency * 4, ny * baseFrequency * 4) 
                    * 0.2 * (1 - depth);
                
                // Normalize and amplify
                height = (height + 1) * 0.5; // Normalize to 0-1
                height = Math.pow(height, 1.5); // Amplify high points
                
                // Apply depth-based modifications
                height = this.shapeTerrainHeight(height, nx, ny, depth);
                
                heightMap[y][x] = height;
            }
        }
        
        return heightMap;
    }

    private shapeTerrainHeight(height: number, x: number, y: number, depth: number): number {
        const { composition, geometry } = this.TERRAIN_PARAMS;
        
        // Apply composition mask
        const mask = this.getCompositionMask(x, y);
        height *= mask;
        
        // Add cliff features based on depth
        if (depth < 0.5 && Math.random() < geometry.cliffProbability) {
            height = this.addCliffFeature(height, x, y);
        }
        
        // Smooth background elements
        if (depth > 0.7) {
            height = this.smoothHeight(height, x, y);
        }
        
        return height;
    }

    public draw(ctx: CanvasRenderingContext2D, time: number, lighting: any): void {
        if (this.layers.length === 0) {
            console.warn('No terrain layers to draw');
            return;
        }
    
        // Draw each depth layer in order
        this.layers.forEach((layer, index) => {
            console.log(`Drawing layer ${index}: ${layer.elements.length} elements`);
            ctx.save();
            
            // Apply depth-based transformations
            const scale = Math.pow(layer.scale, 1.5);
            ctx.scale(scale, scale);
            ctx.translate(0, layer.yOffset);
            
            // Apply depth-based atmospheric effect
            const atmosphericFade = 1 - layer.depth * 0.3;
            ctx.globalAlpha = atmosphericFade;
            
            // Draw elements
            layer.elements.forEach(element => {
                this.drawTerrainElement(ctx, element, layer.depth, lighting);
            });
            
            ctx.restore();
        });
    }

    private drawTerrainElement(
        ctx: CanvasRenderingContext2D,
        element: TerrainElement,
        depth: number,
        lighting: any
    ): void {
        // Create gradient based on element type and depth
        const gradient = this.createTerrainGradient(
            ctx,
            element,
            depth,
            lighting
        );
        
        ctx.fillStyle = gradient;
        ctx.fill(element.path);
        
        // Add detail based on depth
        if (depth < 0.5) {
            this.addTerrainDetail(ctx, element);
        }
    }

    private determineTerrainType(depth: number): TerrainType {
        if (depth < 0.2) return 'shore';
        if (depth < 0.4) return 'cliff';
        if (depth < 0.6) return 'mountain';
        if (depth < 0.8) return 'peak';
        return 'plateau';
    }
    
    private createLayerPath(layer: DepthLayer): Path2D {
        const path = new Path2D();
        
        // Combine all element paths into one layer path
        layer.elements.forEach(element => {
            path.addPath(element.path);
        });
        
        return path;
    }
    
    private extractLayerPoints(layer: DepthLayer): Vector2[] {
        // Collect all unique points from elements
        const points: Vector2[] = [];
        layer.elements.forEach(element => {
            // We'll need to extract points from the Path2D
            // Since we can't directly access Path2D points, we'll use element position
            points.push(element.position);
            points.push({
                x: element.position.x - element.width/2,
                y: element.position.y - element.height/2
            });
            points.push({
                x: element.position.x + element.width/2,
                y: element.position.y + element.height/2
            });
        });
        return points;
    }
    
    private convertElementsToFeatures(elements: TerrainElement[]): TerrainFeature[] {
        return elements.map(element => ({
            type: element.type,
            position: element.position,
            path: element.path,
            points: this.extractPointsFromElement(element),
            size: Math.max(element.width, element.height),
            elevation: element.position.y,
            rockFormations: [],
            erosionPatterns: []
        }));
    }
    
    private extractPointsFromElement(element: TerrainElement): Vector2[] {
        // Create a basic set of points around the element's bounds
        const points: Vector2[] = [];
        const segments = 8;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: element.position.x + Math.cos(angle) * element.width/2,
                y: element.position.y + Math.sin(angle) * element.height/2
            });
        }
        
        return points;
    }

    private getCompositionMask(x: number, y: number): number {
        const { composition } = this.TERRAIN_PARAMS;
        let mask = 1;

        switch (composition.mode) {
            case 'coastal':
                if (composition.coastalCurve !== undefined && composition.waterVisibility !== undefined) {
                    const coastX = Math.sin(y * Math.PI) * composition.coastalCurve;
                    const distFromCoast = Math.abs(x - (0.5 + coastX));
                    mask *= this.smoothStep(0, composition.waterVisibility, distFromCoast);
                }
                break;

            case 'valley':
                const centerDist = Math.abs(x - 0.5);
                mask *= this.smoothStep(
                    composition.centerOpening / 2,
                    composition.centerOpening,
                    centerDist
                );
                break;

            case 'cliff':
                const verticalFactor = Math.abs(Math.sin(x * Math.PI * 2));
                mask *= Math.pow(verticalFactor, composition.cliffSteepness);
                const bias = composition.verticalBias + 
                    (1 - composition.verticalBias) * this.noise2D(x * 10, y * 10);
                mask *= bias;
                break;
        }

        return mask;
    }

    private addCliffFeature(height: number, x: number, y: number): number {
        const { geometry } = this.TERRAIN_PARAMS;
        
        // Only add cliffs above certain height
        if (height > geometry.maxCliffHeight) {
            const t = (height - geometry.maxCliffHeight) / (1 - geometry.maxCliffHeight);
            const sharpness = Math.pow(t, geometry.sharpness);
            
            // Add some vertical variation
            const verticalNoise = this.noise2D(x * 20, y * 20) * 0.1;
            height = geometry.maxCliffHeight + 
                sharpness * (1 - geometry.maxCliffHeight + verticalNoise);
                
            // Add angular features
            if (Math.random() < 0.3) {
                const angle = Math.atan2(y, x);
                height += Math.sin(angle * 4) * 0.1;
            }
        }
        
        return height;
    }

    private smoothHeight(height: number, x: number, y: number): number {
        // Apply gaussian-like smoothing
        const sigma = 0.1;
        const kernel = 3;
        let sum = 0;
        let weight = 0;
        
        for (let dx = -kernel; dx <= kernel; dx++) {
            for (let dy = -kernel; dy <= kernel; dy++) {
                const h = this.noise2D((x + dx * 0.1) * 0.1, (y + dy * 0.1) * 0.1);
                const w = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                sum += h * w;
                weight += w;
            }
        }
        
        return sum / weight;
    }

    private extractFeatures(heightMap: number[][], depth: number): any[] {
        const features: any[] = [];
        const { resolution } = this.TERRAIN_PARAMS;
        
        // Lower the threshold to catch more features
        const heightThreshold = 0.2; // Changed from 0.5
        
        // Extract connected components above threshold
        const visited = new Set<string>();
        
        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const height = heightMap[y][x];
                const key = `${x},${y}`;
                
                if (height > heightThreshold && !visited.has(key)) {
                    // Found new feature
                    const feature = this.floodFillFeature(
                        heightMap, x, y, visited
                    );
                    
                    if (feature.points.length > 5) {  // Reduced minimum size threshold
                        features.push(feature);
                    }
                }
            }
        }
        
        console.log(`Extracted ${features.length} features at depth ${depth}`);
        return features;
    }

    private floodFillFeature(
        heightMap: number[][],
        startX: number,
        startY: number,
        visited: Set<string>
    ): any {
        const points: Vector2[] = [];
        const queue: [number, number][] = [[startX, startY]];
        const baseHeight = heightMap[startY][startX];
        
        while (queue.length > 0) {
            const [x, y] = queue.pop()!;
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Add point to feature
            points.push({
                x: (x / heightMap[0].length) * this.width,
                y: (y / heightMap.length) * this.height
            });
            
            // Check neighbors
            const neighbors = [
                [x+1, y], [x-1, y], [x, y+1], [x, y-1],
                [x+1, y+1], [x-1, y-1], [x+1, y-1], [x-1, y+1]
            ];
            
            for (const [nx, ny] of neighbors) {
                if (nx < 0 || nx >= heightMap[0].length || 
                    ny < 0 || ny >= heightMap.length) continue;
                    
                const nHeight = heightMap[ny][nx];
                if (Math.abs(nHeight - baseHeight) < 0.2) {
                    queue.push([nx, ny]);
                }
            }
        }
        
        return { points, baseHeight };
    }

    private createTerrainElement(
        feature: any,
        depth: number,
        scale: number
    ): TerrainElement | null {
        if (feature.points.length < 3) return null;
        
        // Determine element type based on shape analysis
        const type = this.analyzeFeatureType(feature);
        
        // Generate path based on type
        const path = this.generateElementPath(feature, type);
        
        // Calculate element dimensions
        const bounds = this.calculateBounds(feature.points);
        const position = {
            x: (bounds.minX + bounds.maxX) / 2,
            y: (bounds.minY + bounds.maxY) / 2
        };
        
        return {
            type,
            path,
            color: this.getTerrainColor(type, depth),
            position,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY
        };
    }

    private analyzeFeatureType(feature: any): 'cliff' | 'mountain' | 'plateau' {
        // Analyze shape characteristics to determine type
        const points = feature.points;
        const verticalRange = this.calculateVerticalRange(points);
        const slopeVariation = this.calculateSlopeVariation(points);
        
        if (slopeVariation > 0.8) return 'cliff';
        if (verticalRange > 0.6) return 'mountain';
        return 'plateau';
    }

    private generateElementPath(feature: any, type: string): Path2D {
        const path = new Path2D();
        const points = feature.points;
        
        // Sort points to create continuous outline
        const hull = this.calculateConvexHull(points);
        
        // Start path
        path.moveTo(hull[0].x, hull[0].y);
        
        // Generate path based on type
        switch (type) {
            case 'cliff':
                this.generateCliffPath(path, hull);
                break;
            case 'mountain':
                this.generateMountainPath(path, hull);
                break;
            case 'plateau':
                this.generatePlateauPath(path, hull);
                break;
        }
        
        path.closePath();
        return path;
    }

    private generateCliffPath(path: Path2D, points: Vector2[]): void {
        // Add jagged, vertical features
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            
            // Add intermediate points for jagged effect
            if (Math.random() < 0.3) {
                const mx = (prev.x + curr.x) / 2;
                const my = prev.y + (Math.random() - 0.5) * 20;
                path.lineTo(mx, my);
            }
            
            path.lineTo(curr.x, curr.y);
        }
    }

    private generateMountainPath(path: Path2D, points: Vector2[]): void {
        // Create smooth mountain silhouette
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            // Calculate control points for smooth curve
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
    }

    private generatePlateauPath(path: Path2D, points: Vector2[]): void {
        // Create flat-topped formation
        let topPoints: Vector2[] = [];
        let sidePoints: Vector2[] = [];
        
        // Separate points into top and sides
        points.forEach(point => {
            if (point.y < points[0].y + 10) {
                topPoints.push(point);
            } else {
                sidePoints.push(point);
            }
        });
        
        // Draw top
        topPoints.forEach((point, i) => {
            if (i === 0) {
                path.moveTo(point.x, point.y);
            } else {
                path.lineTo(point.x, point.y);
            }
        });
        
        // Draw sides
        sidePoints.forEach(point => {
            path.lineTo(point.x, point.y);
        });
    }

    private createTerrainGradient(
        ctx: CanvasRenderingContext2D,
        element: TerrainElement,
        depth: number,
        lighting: any
    ): CanvasGradient {
        const gradient = ctx.createLinearGradient(
            element.position.x,
            element.position.y - element.height/2,
            element.position.x,
            element.position.y + element.height/2
        );
        
        // Get base color and create variations
        const baseColor = element.color;
        const lightColor = this.adjustColor(baseColor, { l: +15 });
        const darkColor = this.adjustColor(baseColor, { l: -15 });
        
        // Apply depth and lighting modifications
        const depthFade = 1 - depth * 0.3;
        const lightingIntensity = lighting?.intensity || 1;
        
        gradient.addColorStop(0, ColorBridge.toHSLString(
            this.adjustColor(lightColor, { 
                l: lightingIntensity * 10,
                a: depthFade 
            })
        ));
        
        gradient.addColorStop(0.5, ColorBridge.toHSLString(
            this.adjustColor(baseColor, { a: depthFade })
        ));
        
        gradient.addColorStop(1, ColorBridge.toHSLString(
            this.adjustColor(darkColor, { 
                l: -lightingIntensity * 10,
                a: depthFade 
            })
        ));
        
        return gradient;
    }

    private addTerrainDetail(ctx: CanvasRenderingContext2D, element: TerrainElement): void {
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = ColorBridge.toHSLString(
            this.adjustColor(element.color, { l: -20 })
        );
        ctx.lineWidth = 0.5;
        
        // Add appropriate detail based on element type
        switch (element.type) {
            case 'cliff':
                this.addCliffDetail(ctx, element);
                break;
            case 'mountain':
                this.addMountainDetail(ctx, element);
                break;
            case 'plateau':
                this.addPlateauDetail(ctx, element);
                break;
        }
        
        ctx.restore();
    }

    private addCliffDetail(ctx: CanvasRenderingContext2D, element: TerrainElement): void {
        // Add vertical striations
        const stripeCount = Math.floor(element.width / 20);
        for (let i = 0; i < stripeCount; i++) {
            const x = element.position.x - element.width/2 + i * 20;
            const noise = this.noise2D(x * 0.1, element.position.y * 0.1) * 20;
            
            ctx.beginPath();
            ctx.moveTo(x + noise, element.position.y - element.height/2);
            ctx.lineTo(x - noise, element.position.y + element.height/2);
            ctx.stroke();
        }
    }

    private addMountainDetail(ctx: CanvasRenderingContext2D, element: TerrainElement): void {
        // Add ridge lines
        const ridgeCount = Math.floor(element.height / 30);
        for (let i = 0; i < ridgeCount; i++) {
            const y = element.position.y - element.height/2 + i * 30;
            ctx.beginPath();
            
            let x = element.position.x - element.width/2;
            ctx.moveTo(x, y);
            
            while (x < element.position.x + element.width/2) {
                x += 10;
                const noise = this.noise2D(x * 0.05, y * 0.05) * 15;
                ctx.lineTo(x, y + noise);
            }
            
            ctx.stroke();
        }
    }

    private addPlateauDetail(ctx: CanvasRenderingContext2D, element: TerrainElement): void {
        // Add surface texture
        const gridSize = 15;
        for (let x = element.position.x - element.width/2; 
             x < element.position.x + element.width/2; 
             x += gridSize) {
            for (let y = element.position.y - element.height/2; 
                 y < element.position.y + element.height/2; 
                 y += gridSize) {
                if (Math.random() < 0.3) {
                    const size = 2 + Math.random() * 4;
                    ctx.beginPath();
                    ctx.arc(
                        x + Math.random() * gridSize,
                        y + Math.random() * gridSize,
                        size,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
    }

    private calculateVerticalRange(points: Vector2[]): number {
        let minY = Infinity;
        let maxY = -Infinity;
        
        points.forEach(point => {
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });
        
        return (maxY - minY) / this.height;
    }

    private calculateSlopeVariation(points: Vector2[]): number {
        let slopes: number[] = [];
        
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            
            if (dx !== 0) {
                slopes.push(Math.abs(dy / dx));
            }
        }
        
        // Calculate variance of slopes
        const mean = slopes.reduce((a, b) => a + b, 0) / slopes.length;
        const variance = slopes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slopes.length;
        
        return Math.min(1, variance * 2);
    }

    private calculateConvexHull(points: Vector2[]): Vector2[] {
        // Graham Scan algorithm for convex hull
        if (points.length < 3) return points;

        // Find point with lowest y-coordinate
        let start = points.reduce((min, p) => 
            p.y < min.y || (p.y === min.y && p.x < min.x) ? p : min
        , points[0]);

        // Sort points by polar angle
        const sortedPoints = points
            .filter(p => p !== start)
            .sort((a, b) => {
                const angleA = Math.atan2(a.y - start.y, a.x - start.x);
                const angleB = Math.atan2(b.y - start.y, b.x - start.x);
                return angleA - angleB;
            });

        // Initialize hull with start point
        const hull: Vector2[] = [start];
        sortedPoints.forEach(point => {
            while (hull.length > 1 && !this.isLeftTurn(
                hull[hull.length - 2],
                hull[hull.length - 1],
                point
            )) {
                hull.pop();
            }
            hull.push(point);
        });

        return hull;
    }

    private isLeftTurn(p1: Vector2, p2: Vector2, p3: Vector2): boolean {
        return ((p2.x - p1.x) * (p3.y - p1.y) - 
                (p2.y - p1.y) * (p3.x - p1.x)) > 0;
    }

    private calculateBounds(points: Vector2[]): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    } {
        return points.reduce((bounds, point) => ({
            minX: Math.min(bounds.minX, point.x),
            maxX: Math.max(bounds.maxX, point.x),
            minY: Math.min(bounds.minY, point.y),
            maxY: Math.max(bounds.maxY, point.y)
        }), {
            minX: Infinity,
            maxX: -Infinity,
            minY: Infinity,
            maxY: -Infinity
        });
    }

    private smoothStep(edge0: number, edge1: number, x: number): number {
        // Hermite interpolation
        x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return x * x * (3 - 2 * x);
    }

    private getTerrainColor(type: string, depth: number): HSLColor {
        const baseColors: Record<string, HSLColor> = {
            cliff: [220, 15, 35],
            mountain: [210, 20, 40],
            plateau: [200, 25, 45]
        };

        const color = baseColors[type] || baseColors.mountain;
        
        // Adjust color based on depth
        return this.adjustColor(color, {
            s: -depth * 10,  // Desaturate with depth
            l: depth * 5     // Lighten slightly with depth
        });
    }

    private adjustColor(
        color: HSLColor,
        adjustments: {
            h?: number;
            s?: number;
            l?: number;
            a?: number;
        }
    ): HSLColor {
        const [h, s, l] = color;
        return [
            (h + (adjustments.h || 0)) % 360,
            Math.max(0, Math.min(100, s + (adjustments.s || 0))),
            Math.max(0, Math.min(100, l + (adjustments.l || 0)))
        ];
    }

    private renderStaticElements(): void {
        const ctx = this.staticCtx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        // Draw base terrain for each layer
        this.layers.forEach(layer => {
            ctx.save();
            
            // Apply depth transformations
            const scale = Math.pow(layer.scale, 1.5);
            ctx.scale(scale, scale);
            ctx.translate(0, layer.yOffset);
            
            // Draw elements
            layer.elements.forEach(element => {
                // Create gradient
                const gradient = this.createTerrainGradient(
                    ctx,
                    element,
                    layer.depth,
                    { intensity: 1 }  // Default lighting
                );
                
                ctx.fillStyle = gradient;
                ctx.fill(element.path);
                
                // Add static details
                this.addTerrainDetail(ctx, element);
            });
            
            ctx.restore();
        });
    }

    // Public methods for external interaction
    public getTerrainHeightAt(x: number, y: number): number {
        // Find the highest terrain element at this point
        let maxHeight = -Infinity;
        
        this.layers.forEach(layer => {
            layer.elements.forEach(element => {
                const ctx = this.staticCtx;
                if (ctx.isPointInPath(element.path, x, y)) {
                    const elementHeight = element.position.y - element.height/2;
                    maxHeight = Math.max(maxHeight, elementHeight);
                }
            });
        });
        
        return maxHeight === -Infinity ? this.waterLevel : maxHeight;
    }

    public getTerrainTypeAt(x: number, y: number): string {
        // Find the topmost terrain element at this point
        for (const layer of this.layers) {
            for (const element of layer.elements) {
                const ctx = this.staticCtx;
                if (ctx.isPointInPath(element.path, x, y)) {
                    return element.type;
                }
            }
        }
        
        return 'water';
    }

    public isPointOnGround(x: number, y: number): boolean {
        return y >= this.getTerrainHeightAt(x, y);
    }

    public update(time: number, deltaTime: number): void {
        // Update any dynamic elements or effects
    }

    public addTerrainFeature(
        type: 'cliff' | 'mountain' | 'plateau',
        position: Vector2,
        size: number
    ): void {
        // Add a new terrain feature at the specified position
        const element = this.createTerrainElement({
            points: this.generateFeaturePoints(type, position, size),
            baseHeight: position.y
        }, 0, 1);

        if (element) {
            this.layers[0].elements.push(element);
            this.renderStaticElements();
        }
    }

    private generateFeaturePoints(
        type: 'cliff' | 'mountain' | 'plateau',
        position: Vector2,
        size: number
    ): Vector2[] {
        const points: Vector2[] = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            let radius = size;
            
            // Modify radius based on type
            switch (type) {
                case 'cliff':
                    radius *= 0.8 + Math.abs(Math.sin(angle * 3)) * 0.4;
                    break;
                case 'mountain':
                    radius *= 0.9 + Math.cos(angle * 2) * 0.2;
                    break;
                case 'plateau':
                    radius *= 0.95 + Math.sin(angle * 4) * 0.1;
                    break;
            }
            
            points.push({
                x: position.x + Math.cos(angle) * radius,
                y: position.y + Math.sin(angle) * radius
            });
        }
        
        return points;
    }
}