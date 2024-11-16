import { Vector2 } from '../../../../types';
import { TreeStyle, FoliageDetail } from '../../../../types/environment/vegetation';
import { ColorSystem } from '../../../../utils/colors';

export class TreeRenderers {
    // White Birch specific renderer
    static drawBirchFoliage(
        ctx: CanvasRenderingContext2D,
        position: Vector2,
        size: number,
        style: TreeStyle['foliageStyle'],
        growth: number,
        time: number
    ): void {
        ctx.save();
        
        // Create warm gradient for leaves
        const gradient = ctx.createRadialGradient(
            position.x, position.y, 0,
            position.x, position.y, size * 0.8
        );
        
        gradient.addColorStop(0, ColorSystem.toHSLString(style.color, 1));
        gradient.addColorStop(0.7, ColorSystem.toHSLString([
            style.color[0],
            style.color[1],
            style.color[2] - 10
        ], 0.95));
        gradient.addColorStop(1, ColorSystem.toHSLString([
            style.color[0],
            style.color[1] - 10,
            style.color[2] - 20
        ], 0.9));

        ctx.fillStyle = gradient;

        // Draw clustered bubble-like leaves
        const detail = style.detail as FoliageDetail;
        const bubbleCount = Math.floor(style.density * 12);
        const baseSize = detail.bubbleSize || size * 0.2;

        for (let i = 0; i < bubbleCount; i++) {
            const angle = (i / bubbleCount) * Math.PI * 2;
            const radius = size * (0.3 + Math.random() * 0.5);
            const bubbleSize = baseSize * (1 - detail.variance! * Math.random());

            // Add gentle animation
            const wobble = Math.sin(time * 0.001 + i) * 3;
            const x = position.x + Math.cos(angle) * radius + wobble;
            const y = position.y + Math.sin(angle) * radius * 0.7;

            ctx.beginPath();
            ctx.arc(x, y, bubbleSize * growth, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Bubble Pine specific renderer
    static drawBubblePineFoliage(
        ctx: CanvasRenderingContext2D,
        position: Vector2,
        size: number,
        style: TreeStyle['foliageStyle'],
        growth: number,
        time: number
    ): void {
        ctx.save();

        const detail = style.detail as FoliageDetail;
        const layers = detail.layers || 3;

        // Create cool gradient for pine foliage
        const gradient = ctx.createRadialGradient(
            position.x, position.y, 0,
            position.x, position.y, size
        );
        
        gradient.addColorStop(0, ColorSystem.toHSLString([
            style.color[0],
            style.color[1],
            style.color[2] + 5
        ], 0.95));
        gradient.addColorStop(0.6, ColorSystem.toHSLString(style.color, 0.9));
        gradient.addColorStop(1, ColorSystem.toHSLString([
            style.color[0],
            style.color[1] + 5,
            style.color[2] - 10
        ], 0.85));

        ctx.fillStyle = gradient;

        // Draw layered cloud-like formations
        for (let layer = 0; layer < layers; layer++) {
            const layerSize = size * (1 - layer * 0.2);
            const bubbleCount = Math.floor(8 + layer * 4);
            const layerOffset = layer * size * 0.15;

            for (let i = 0; i < bubbleCount; i++) {
                const angle = (i / bubbleCount) * Math.PI * 2;
                const baseRadius = layerSize * 0.5;
                
                // Add gentle wobble animation
                const wobble = Math.sin(time * 0.0008 + layer + i) * 2;
                const x = position.x + Math.cos(angle) * baseRadius + wobble;
                const y = position.y - layerOffset + Math.sin(angle) * baseRadius * 0.7;

                ctx.beginPath();
                ctx.arc(x, y, layerSize * 0.25 * growth, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    // Savanna Tree specific renderer
    static drawSavannaFoliage(
        ctx: CanvasRenderingContext2D,
        position: Vector2,
        size: number,
        style: TreeStyle['foliageStyle'],
        growth: number,
        time: number
    ): void {
        ctx.save();

        const detail = style.detail as FoliageDetail;
        
        // Create warm, layered gradient
        const gradient = ctx.createRadialGradient(
            position.x, position.y, 0,
            position.x, position.y, size
        );
        
        gradient.addColorStop(0, ColorSystem.toHSLString([
            style.color[0],
            style.color[1],
            style.color[2] + 5
        ], 0.9));
        gradient.addColorStop(0.7, ColorSystem.toHSLString(style.color, 0.85));
        gradient.addColorStop(1, ColorSystem.toHSLString([
            style.color[0],
            style.color[1] + 5,
            style.color[2] - 15
        ], 0.8));

        ctx.fillStyle = gradient;

        // Draw spreading canopy with gaps
        const layers = style.layerCount || 3;
        for (let layer = 0; layer < layers; layer++) {
            const t = layer / (layers - 1);
            const layerSize = size * (1 - t * detail.canopyDepth!);
            const segments = 16;

            ctx.beginPath();
            let firstPoint = true;
            
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const segmentRadius = layerSize * (1 - Math.random() * detail.gapFrequency!);
                
                // Add canopy wave animation
                const wave = Math.sin(time * 0.001 + angle * 2 + layer) * 4;
                const x = position.x + Math.cos(angle) * segmentRadius + wave;
                const y = position.y + Math.sin(angle) * segmentRadius * 0.6;

                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    const cp1x = x + Math.cos(angle + Math.PI/2) * segmentRadius * 0.2;
                    const cp1y = y + Math.sin(angle + Math.PI/2) * segmentRadius * 0.2;
                    ctx.quadraticCurveTo(cp1x, cp1y, x, y);
                }
            }

            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    // Birch trunk specific renderer
    static drawBirchTrunk(
        ctx: CanvasRenderingContext2D,
        points: { x: number, y: number }[],
        style: TreeStyle['trunkStyle'],
        width: number,
        growth: number
    ): void {
        ctx.save();

        // Draw base trunk
        ctx.strokeStyle = ColorSystem.toHSLString(style.color);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        // Add characteristic birch markings
        if (style.markings) {
            ctx.strokeStyle = ColorSystem.toHSLString(style.markings.color);
            ctx.lineWidth = 1;

            points.forEach((point, i) => {
                if (i === 0) return;
                const prev = points[i - 1];
                const angle = Math.atan2(point.y - prev.y, point.x - prev.x);
                const length = Math.hypot(point.x - prev.x, point.y - prev.y);
                
                for (let t = 0; t < length; t += style.markings!.size) {
                    if (Math.random() > style.markings!.frequency) continue;

                    const x = prev.x + Math.cos(angle) * t;
                    const y = prev.y + Math.sin(angle) * t;
                    const markingSize = style.markings!.size * (1 - Math.random() * style.markings!.variance);

                    ctx.beginPath();
                    ctx.arc(x, y, markingSize * growth, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }

        ctx.restore();
    }
}