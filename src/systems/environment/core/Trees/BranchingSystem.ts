import { createNoise2D } from 'simplex-noise';
import { Vector2 } from '../../../../types';
import { CurvePoint, TreeStyle } from '../../../../types/environment/vegetation';

export class BranchingSystem {
    private noise2D = createNoise2D();
    
    private readonly GROWTH_CONSTRAINTS = {
        minBranchAngle: Math.PI / 6,
        maxBranchAngle: Math.PI / 3,
        minLengthRatio: 0.6,
        maxLengthRatio: 0.85,
        minBranchCount: 2,
        maxBranchCount: 4
    };

    generateBranch(
        start: Vector2,
        angle: number,
        length: number,
        style: TreeStyle
    ): CurvePoint[] {
        const points: CurvePoint[] = [];
        const segments = 4;
        
        // Generate main branch points with style influence
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const curveAngle = this.calculateStyledAngle(angle, t, style);
            const curveLength = this.calculateStyledLength(length, t, style);
            
            const point: CurvePoint = {
                position: {
                    x: start.x + Math.cos(curveAngle) * curveLength,
                    y: start.y + Math.sin(curveAngle) * curveLength
                }
            };

            points.push(point);
        }

        // Add control points for natural curves
        this.addControlPoints(points, style);
        
        return points;
    }

    private calculateStyledAngle(baseAngle: number, t: number, style: TreeStyle): number {
        let curve = 0;

        switch (style.branchingPattern) {
            case 'upright':
                curve = -Math.sin(t * Math.PI) * 0.2;
                break;
            case 'weeping':
                curve = Math.sin(t * Math.PI) * 0.4 * t; // Increases with length
                break;
            case 'spreading':
                curve = Math.sin(t * Math.PI * 2) * 0.3;
                break;
        }

        // Add natural variation with noise
        const noise = this.noise2D(t * 10, baseAngle) * 0.1;
        return baseAngle + curve + noise;
    }

    private calculateStyledLength(baseLength: number, t: number, style: TreeStyle): number {
        let lengthMod = 1;

        switch (style.growthShape) {
            case 'conical':
                lengthMod = 1 - t * 0.3;
                break;
            case 'rounded':
                lengthMod = 1 - Math.pow(t, 2) * 0.4;
                break;
            case 'columnar':
                lengthMod = 1 - t * 0.1;
                break;
        }

        return baseLength * t * lengthMod;
    }

    private addControlPoints(points: CurvePoint[], style: TreeStyle): void {
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const segment = {
                x: next.position.x - current.position.x,
                y: next.position.y - current.position.y
            };

            const tension = this.getStyleTension(style);
            const controlLength = Math.hypot(segment.x, segment.y) * tension;
            const angle = Math.atan2(segment.y, segment.x);

            current.control2 = {
                x: current.position.x + Math.cos(angle) * controlLength,
                y: current.position.y + Math.sin(angle) * controlLength
            };

            next.control1 = {
                x: next.position.x - Math.cos(angle) * controlLength,
                y: next.position.y - Math.sin(angle) * controlLength
            };
        }
    }

    private getStyleTension(style: TreeStyle): number {
        switch (style.branchingPattern) {
            case 'weeping':
                return 0.4;
            case 'spreading':
                return 0.3;
            default:
                return 0.35;
        }
    }

    drawBranch(
        ctx: CanvasRenderingContext2D, 
        points: CurvePoint[], 
        width: number,
        growth: number
    ): void {
        if (points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(points[0].position.x, points[0].position.y);

        for (let i = 1; i < points.length; i++) {
            const t = i / (points.length - 1);
            if (t > growth) break;

            const current = points[i - 1];
            const next = points[i];

            if (current.control2 && next.control1) {
                ctx.bezierCurveTo(
                    current.control2.x, current.control2.y,
                    next.control1.x, next.control1.y,
                    next.position.x, next.position.y
                );
            } else {
                ctx.lineTo(next.position.x, next.position.y);
            }
        }

        ctx.lineWidth = width;
        ctx.stroke();
    }
}