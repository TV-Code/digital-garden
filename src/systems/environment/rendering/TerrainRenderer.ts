// src/systems/environment/core/TerrainRenderer.ts

import { ColorSystem, HSLColor } from '../../../utils/colors';
import { TerrainLayer, TerrainFeature } from '../../../types/environment/terrain';

export class TerrainRenderer {
    private readonly LAYER_COLORS: Record<string, {
        base: HSLColor;
        highlight: HSLColor;
        shadow: HSLColor;
    }> = {
        mountain: {
            base: [220, 15, 35],
            highlight: [220, 10, 45],
            shadow: [220, 20, 25]
        },
        cliff: {
            base: [210, 20, 30],
            highlight: [210, 15, 40],
            shadow: [210, 25, 20]
        },
        plateau: {
            base: [30, 25, 40],
            highlight: [30, 20, 50],
            shadow: [30, 30, 30]
        },
        valley: {
            base: [150, 20, 45],
            highlight: [150, 15, 55],
            shadow: [150, 25, 35]
        },
        shoreline: {
            base: [45, 30, 50],
            highlight: [45, 25, 60],
            shadow: [45, 35, 40]
        }
    };

    private readonly FEATURE_COLORS: Record<string, {
        base: HSLColor;
        detail: HSLColor;
    }> = {
        ridge: {
            base: [210, 15, 40],
            detail: [210, 20, 30]
        },
        outcrop: {
            base: [200, 15, 35],
            detail: [200, 20, 25]
        },
        slope: {
            base: [160, 20, 45],
            detail: [160, 25, 35]
        },
        depression: {
            base: [180, 15, 40],
            detail: [180, 20, 30]
        },
        ledge: {
            base: [190, 15, 35],
            detail: [190, 20, 25]
        }
    };

    drawLayer(
        ctx: CanvasRenderingContext2D, 
        layer: TerrainLayer,
        lighting: any
    ): void {
        ctx.save();

        // Create gradient for layer
        const gradient = this.createLayerGradient(ctx, layer, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(layer.path);

        // Add texture/detail to layer
        this.addLayerDetail(ctx, layer);

        ctx.restore();
    }

    private createLayerGradient(
        ctx: CanvasRenderingContext2D,
        layer: TerrainLayer,
        lighting: any
    ): CanvasGradient {
        const colors = this.LAYER_COLORS[layer.type];
        const height = ctx.canvas.height;
        const startY = layer.elevation * height;
        const endY = startY + height * 0.2;

        const gradient = ctx.createLinearGradient(0, startY, 0, endY);

        // Apply lighting influence
        const lightLevel = lighting?.intensity || 1;
        const adjustColor = (color: HSLColor): string => {
            return ColorSystem.toHSLString([
                color[0],
                color[1],
                Math.min(100, color[2] * lightLevel)
            ]);
        };

        gradient.addColorStop(0, adjustColor(colors.highlight));
        gradient.addColorStop(0.3, adjustColor(colors.base));
        gradient.addColorStop(1, adjustColor(colors.shadow));

        return gradient;
    }

    private addLayerDetail(ctx: CanvasRenderingContext2D, layer: TerrainLayer): void {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.1;

        // Add noise-based texture
        const detail = new Path2D();
        layer.points.forEach((point, i) => {
            if (i === 0) {
                detail.moveTo(point.x, point.y);
            } else {
                detail.lineTo(point.x, point.y);
            }
        });
        detail.closePath();

        ctx.strokeStyle = `hsla(${this.LAYER_COLORS[layer.type].base[0]}, 
                              ${this.LAYER_COLORS[layer.type].base[1]}%, 
                              ${this.LAYER_COLORS[layer.type].base[2] - 10}%, 
                              0.2)`;
        ctx.stroke(detail);

        ctx.restore();
    }

    drawFeature(
        ctx: CanvasRenderingContext2D,
        feature: TerrainFeature,
        lighting: any
    ): void {
        ctx.save();

        // Create gradient for feature
        const gradient = this.createFeatureGradient(ctx, feature, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(feature.path);

        // Add feature-specific details
        this.addFeatureDetail(ctx, feature);

        // Add erosion effects
        if (feature.detail.erosion > 0.3) {
            this.addErosionDetail(ctx, feature);
        }

        ctx.restore();
    }

    private createFeatureGradient(
        ctx: CanvasRenderingContext2D,
        feature: TerrainFeature,
        lighting: any
    ): CanvasGradient {
        const colors = this.FEATURE_COLORS[feature.type];
        const angle = Math.atan2(
            feature.points[1].y - feature.points[0].y,
            feature.points[1].x - feature.points[0].x
        );

        const gradient = ctx.createLinearGradient(
            feature.position.x,
            feature.position.y,
            feature.position.x + Math.cos(angle) * feature.size,
            feature.position.y + Math.sin(angle) * feature.size
        );

        const lightLevel = lighting?.intensity || 1;
        const adjustColor = (color: HSLColor, mod: number = 0): string => {
            return ColorSystem.toHSLString([
                color[0],
                color[1],
                Math.min(100, (color[2] + mod) * lightLevel)
            ]);
        };

        gradient.addColorStop(0, adjustColor(colors.base, 5));
        gradient.addColorStop(0.5, adjustColor(colors.base));
        gradient.addColorStop(1, adjustColor(colors.base, -5));

        return gradient;
    }

    private addFeatureDetail(
        ctx: CanvasRenderingContext2D,
        feature: TerrainFeature
    ): void {
        ctx.save();

        // Add texture based on feature type and detail
        const detail = new Path2D();
        const roughness = feature.detail.roughness * 10;

        feature.points.forEach((point, i) => {
            if (i === 0) {
                detail.moveTo(point.x, point.y);
            } else {
                const prev = feature.points[i - 1];
                const dx = point.x - prev.x;
                const dy = point.y - prev.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const steps = Math.max(2, Math.floor(len / roughness));

                for (let j = 1; j <= steps; j++) {
                    const t = j / steps;
                    const x = prev.x + dx * t + (Math.random() - 0.5) * roughness;
                    const y = prev.y + dy * t + (Math.random() - 0.5) * roughness;
                    detail.lineTo(x, y);
                }
            }
        });

        ctx.strokeStyle = ColorSystem.toHSLString(
            this.FEATURE_COLORS[feature.type].detail
        );
        ctx.lineWidth = 0.5;
        ctx.stroke(detail);

        ctx.restore();
    }

    private addErosionDetail(
        ctx: CanvasRenderingContext2D,
        feature: TerrainFeature
    ): void {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.2;

        const erosionPaths = new Path2D();
        const erosionStrength = feature.detail.erosion * 20;

        feature.points.forEach((point, i) => {
            if (i === 0) return;
            const prev = feature.points[i - 1];
            const angle = Math.atan2(point.y - prev.y, point.x - prev.x);
            const perpAngle = angle + Math.PI/2;

            for (let j = 0; j < erosionStrength; j++) {
                const t = Math.random();
                const x = prev.x + (point.x - prev.x) * t;
                const y = prev.y + (point.y - prev.y) * t;
                const len = Math.random() * erosionStrength;

                erosionPaths.moveTo(x, y);
                erosionPaths.lineTo(
                    x + Math.cos(perpAngle) * len,
                    y + Math.sin(perpAngle) * len
                );
            }
        });

        ctx.strokeStyle = ColorSystem.toHSLString([
            this.FEATURE_COLORS[feature.type].base[0],
            this.FEATURE_COLORS[feature.type].base[1],
            Math.max(0, this.FEATURE_COLORS[feature.type].base[2] - 20)
        ]);
        ctx.lineWidth = 0.5;
        ctx.stroke(erosionPaths);

        ctx.restore();
    }
}