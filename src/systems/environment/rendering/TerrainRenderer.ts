import { ColorSystem, ColorBridge, HSLColor } from '../../../utils/colors';
import { TerrainConfig } from '../../../configs/environment/terrainConfig';
import {
    TerrainLayer,
    TerrainFeature,
    RockFormation,
    ErosionPattern
} from '../../../types/environment/terrain';

export class TerrainRenderer {
    constructor(private width: number, private height: number) {}

    drawLayer(
        ctx: CanvasRenderingContext2D,
        layer: TerrainLayer,
        time: number,
        lighting: any
    ) {
        ctx.save();

        // Draw base terrain
        const gradient = this.createLayerGradient(ctx, layer, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(layer.path);

        // Draw features
        layer.features.forEach(feature => {
            this.drawFeature(ctx, feature, time, lighting);
        });

        ctx.restore();
    }

    private createLayerGradient(
        ctx: CanvasRenderingContext2D,
        layer: TerrainLayer,
        lighting: any
    ): CanvasGradient {
        const gradient = ctx.createLinearGradient(
            0, layer.elevation * this.height,
            0, (layer.elevation + 0.2) * this.height
        );

        const colors = TerrainConfig.colors[layer.type];
        const lightFactor = lighting?.intensity ?? 1;

        // Apply lighting factor to colors
        const modifyColor = (color: HSLColor): HSLColor => [
            color[0],
            color[1],
            color[2] * lightFactor
        ];

        gradient.addColorStop(0, ColorBridge.toHSLString(modifyColor(colors.highlight)));
        gradient.addColorStop(0.3, ColorBridge.toHSLString(modifyColor(colors.base)));
        gradient.addColorStop(1, ColorBridge.toHSLString(modifyColor(colors.shadow)));

        return gradient;
    }

    private drawFeature(
        ctx: CanvasRenderingContext2D,
        feature: TerrainFeature,
        time: number,
        lighting: any
    ) {
        // Draw base feature shape
        const gradient = this.createFeatureGradient(ctx, feature, lighting);
        ctx.fillStyle = gradient;
        ctx.fill(feature.path);

        // Draw rock formations
        feature.rockFormations.forEach(rock => {
            this.drawRockFormation(ctx, rock, lighting);
        });

        // Draw erosion patterns
        feature.erosionPatterns.forEach(pattern => {
            this.drawErosionPattern(ctx, pattern, time);
        });
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

        const baseColor = TerrainConfig.features[feature.type].color;
        const lightFactor = lighting?.intensity ?? 1;

        // Create gradient stops with proper color handling
        const stops = ColorSystem.createGradientColors(baseColor, 3, {
            darken: true,
            alpha: 1
        });

        stops.forEach((color, i) => {
            gradient.addColorStop(i / (stops.length - 1), color);
        });

        return gradient;
    }

    private drawRockFormation(
        ctx: CanvasRenderingContext2D,
        rock: RockFormation,
        lighting: any
    ) {
        ctx.save();

        // Create rock gradient with proper color handling
        const gradient = ctx.createLinearGradient(
            rock.position.x, rock.position.y - rock.size,
            rock.position.x, rock.position.y + rock.size
        );

        const stops = ColorSystem.createGradientColors(rock.color, 3, {
            darken: true,
            alpha: 0.9
        });

        stops.forEach((color, i) => {
            gradient.addColorStop(i / (stops.length - 1), color);
        });

        // Draw main rock shape
        ctx.fillStyle = gradient;
        ctx.fill(rock.path);

        // Draw rock details
        this.drawRockDetails(ctx, rock);

        ctx.restore();
    }

    private drawRockDetails(ctx: CanvasRenderingContext2D, rock: RockFormation) {
        // Draw cracks
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = ColorBridge.toHSLString([
            rock.color[0],
            rock.color[1],
            Math.max(0, rock.color[2] - 20)
        ], 0.8);
        ctx.lineWidth = 0.5;

        rock.detail.cracks.forEach(crack => {
            ctx.stroke(crack);
        });

        // Draw texture
        ctx.globalAlpha = 0.1;
        ctx.fill(rock.detail.texture);

        // Draw weathering
        ctx.globalAlpha = 0.2;
        rock.detail.weathering.forEach(weather => {
            ctx.stroke(weather);
        });
    }

    private drawErosionPattern(
        ctx: CanvasRenderingContext2D,
        pattern: ErosionPattern,
        time: number
    ) {
        ctx.save();

        const opacity = pattern.activity * 0.3;
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.lineWidth = pattern.depth;

        pattern.paths.forEach(path => {
            // Add animation based on erosion type
            if (pattern.type === 'water') {
                ctx.setLineDash([4, 4]);
                ctx.lineDashOffset = time * 0.01;
            }

            ctx.stroke(path);
        });

        ctx.restore();
    }
}