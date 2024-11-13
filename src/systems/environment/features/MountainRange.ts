import { createNoise2D } from 'simplex-noise';
import { ColorSystem, ColorBridge } from '../../../utils/colors';

interface MountainColors {
    shadow: { h: number; s: number; b: number };
    midtone: { h: number; s: number; b: number };
    highlight: { h: number; s: number; b: number };
}

interface Vector2 {
    x: number;
    y: number;
}

interface Layer {
    points: Vector2[];
    depth: number;
}

export class MountainRange {
    private noise2D: ReturnType<typeof createNoise2D>;
    private layers: Layer[] = [];
    private rockDetails: Path2D[] = [];
    private snowcaps: Path2D[] = [];
    
    constructor(
        private baseHeight: number,
        private baseWidth: number,
        private complexity: number = 1,
        private position: { x: number; angle: number } = { x: 0, angle: 0 }
    ) {
        this.noise2D = createNoise2D();
        this.generateMountainLayers();
    }

    private generateMountainLayers() {
        // Generate main silhouette first
        const mainPoints = this.generateLayerPoints(1);
        this.layers.push({ points: mainPoints, depth: 1 });

        // Generate secondary layers for depth
        const layerCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < layerCount; i++) {
            const depth = 0.7 - (i * 0.15);
            const points = this.generateLayerPoints(depth);
            this.layers.push({ points, depth });
        }

        // Generate snow caps
        this.generateSnowCaps();
        
        // Generate rock details
        this.generateRockDetails();
    }

    private generateLayerPoints(depthFactor: number): Vector2[] {
        const points: Vector2[] = [];
        const segments = 150;  // Reduced for performance while maintaining quality
        
        // Generate base profile points
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let height = 0;
            
            // First pass: large features
            for (let freq = 1; freq <= 3; freq++) {
                const amplitude = 1 / Math.pow(freq, 0.7); // Less falloff for more drama
                height += this.noise2D(t * freq * this.complexity, freq) * amplitude;
            }
            
            // Second pass: add dramatic peaks
            const peakInfluence = Math.pow(Math.sin(t * Math.PI * 3), 2) * 0.4;
            height = Math.pow(height * 1.8 + peakInfluence, 1.5);
            
            // Apply depth-based modulation
            height *= this.getEnvelope(t) * depthFactor;
            
            // Add micro-detail
            const microDetail = this.noise2D(t * 20, depthFactor) * 0.1;
            height += microDetail;
            
            points.push({
                x: t * this.baseWidth,
                y: -height * this.baseHeight
            });
        }
        
        // Smooth the profile for more natural curves
        return this.smoothPoints(points);
    }

    private getEnvelope(t: number): number {
        // Enhanced envelope function for more interesting shapes
        const base = Math.sin(t * Math.PI);
        const peak = Math.pow(1 - Math.abs(t - 0.5) * 2, 2);
        const secondary = Math.sin(t * Math.PI * 4) * 0.2;
        return base * 0.5 + peak * 0.4 + secondary + 0.1;
    }

    private smoothPoints(points: Vector2[]): Vector2[] {
        const smoothed: Vector2[] = [];
        const window = 3;  // Smoothing window size
        
        for (let i = 0; i < points.length; i++) {
            let sumX = 0, sumY = 0, count = 0;
            
            for (let j = Math.max(0, i - window); j <= Math.min(points.length - 1, i + window); j++) {
                const weight = 1 - Math.abs(i - j) / (window + 1);
                sumX += points[j].x * weight;
                sumY += points[j].y * weight;
                count += weight;
            }
            
            smoothed.push({
                x: sumX / count,
                y: sumY / count
            });
        }
        
        return smoothed;
    }

    private generateSnowCaps() {
        this.layers.forEach(layer => {
            const snowLine = Math.min(...layer.points.map(p => p.y)) + this.baseHeight * 0.15;
            const snow = new Path2D();
            let inSnow = false;
            let snowStart: Vector2 | null = null;
            
            layer.points.forEach((point, i) => {
                if (point.y < snowLine && !inSnow) {
                    inSnow = true;
                    snowStart = point;
                    snow.moveTo(point.x, point.y);
                } else if (point.y < snowLine) {
                    // Add natural variation to snow line
                    const variance = this.noise2D(point.x * 0.05, snowLine) * 15;
                    snow.lineTo(point.x, point.y + variance);
                } else if (inSnow && snowStart) {
                    inSnow = false;
                    snow.lineTo(point.x, snowLine);
                    snow.lineTo(snowStart.x, snowLine);
                    snow.closePath();
                }
            });
            
            if (inSnow && snowStart) {
                snow.lineTo(layer.points[layer.points.length - 1].x, snowLine);
                snow.lineTo(snowStart.x, snowLine);
                snow.closePath();
            }
            
            this.snowcaps.push(snow);
        });
    }

    private generateRockDetails() {
        // Create rock details for each layer
        this.layers.forEach(layer => {
            const detailCount = Math.floor(10 * layer.depth);
            
            for (let i = 0; i < detailCount; i++) {
                const detail = new Path2D();
                const startIdx = Math.floor(Math.random() * (layer.points.length - 4));
                const length = 3 + Math.floor(Math.random() * 3);
                
                detail.moveTo(layer.points[startIdx].x, layer.points[startIdx].y);
                
                for (let j = 1; j < length; j++) {
                    const point = layer.points[startIdx + j];
                    const noise = this.noise2D(point.x * 0.1 + i, point.y * 0.1) * 20;
                    detail.lineTo(
                        point.x + noise * layer.depth,
                        point.y + noise * 0.5 * layer.depth
                    );
                }
                
                this.rockDetails.push(detail);
            }
        });
    }

    draw(ctx: CanvasRenderingContext2D, width: number, height: number, colors: MountainColors) {
        ctx.save();
        
        // Position mountain
        const centerX = width * (0.5 + this.position.x * 0.5);
        const baseY = height * 0.7;
        
        ctx.translate(centerX, baseY);
        ctx.rotate(this.position.angle);
        ctx.translate(-this.baseWidth / 2, 0);
        
        // Draw mountain layers from back to front
        this.layers.forEach(layer => {
            this.drawLayer(ctx, layer, colors);
        });
        
        // Draw rock details
        ctx.globalCompositeOperation = 'multiply';
        this.rockDetails.forEach(detail => {
            ctx.strokeStyle = `hsla(${colors.shadow.h}, ${colors.shadow.s}%, ${colors.shadow.b}%, 0.2)`;
            ctx.lineWidth = 1;
            ctx.stroke(detail);
        });
        ctx.globalCompositeOperation = 'source-over';
        
        // Draw snow caps with glow
        this.snowcaps.forEach(snow => {
            ctx.save();
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill(snow);
            ctx.restore();
        });
        
        ctx.restore();
    }

    private drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, colors: MountainColors) {
        const gradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
        
        // Adjust colors based on layer depth
        const intensityFactor = layer.depth;
        gradient.addColorStop(0, `hsla(${colors.highlight.h}, 
            ${colors.highlight.s * intensityFactor}%, 
            ${colors.highlight.b * intensityFactor}%, 1)`);
        gradient.addColorStop(0.4, `hsla(${colors.midtone.h}, 
            ${colors.midtone.s * intensityFactor}%, 
            ${colors.midtone.b * intensityFactor}%, 1)`);
        gradient.addColorStop(1, `hsla(${colors.shadow.h}, 
            ${colors.shadow.s * intensityFactor}%, 
            ${colors.shadow.b * intensityFactor}%, 1)`);

        ctx.beginPath();
        layer.points.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                const prev = layer.points[i - 1];
                const curr = point;
                const next = layer.points[Math.min(i + 1, layer.points.length - 1)];
                
                // Calculate control points for smooth curves
                const cp = this.getControlPoint(prev, curr, next, layer.depth);
                ctx.quadraticCurveTo(cp.x, cp.y, curr.x, curr.y);
            }
        });

        // Complete the mountain shape
        ctx.lineTo(this.baseWidth, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();
    }

    private getControlPoint(p1: Vector2, p2: Vector2, p3: Vector2, depth: number): Vector2 {
        const mid = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2
        };
        
        // Calculate perpendicular angle for control point offset
        const angle = Math.atan2(p3.y - p1.y, p3.x - p1.x) + Math.PI/2;
        
        // Add natural variation
        const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const noise = this.noise2D(mid.x * 0.01, mid.y * 0.01) * distance * 0.2;
        
        return {
            x: mid.x + Math.cos(angle) * noise * depth,
            y: mid.y + Math.sin(angle) * noise * depth
        };
    }
}