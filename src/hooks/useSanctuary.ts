import { useRef, useCallback } from 'react';
import { LightingSystem } from '../systems/environment/lighting';
import { TerrainSystem } from '../systems/environment/core/TerrainSystem';
import { WaterSystem } from '../systems/environment/core/WaterSystem';
import { MountainRange } from '../systems/environment/features/MountainRange';
import { AtmosphericSystem } from '../systems/environment/core/AtmosphericSystem';
import { ColorSystem, ColorBridge } from '../utils/colors';

interface Systems {
    lighting: LightingSystem | null;
    terrain: TerrainSystem | null;
    water: WaterSystem | null;
    mountains: MountainRange[];
    atmosphere: AtmosphericSystem | null;
}

export const useSanctuary = () => {
    const systems = useRef<Systems>({
        lighting: null,
        terrain: null,
        water: null,
        mountains: [],
        atmosphere: null
    });

    const timeRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);

    const initializeSystems = useCallback((canvas: HTMLCanvasElement) => {
        const { width, height } = canvas;
        const waterLevel = height * 0.55;
        
        systems.current = {
            lighting: new LightingSystem(),
            terrain: new TerrainSystem(width, height, waterLevel),
            water: new WaterSystem(waterLevel, width, height),
            atmosphere: new AtmosphericSystem(width, height, waterLevel),
            mountains: [
                // Enhanced mountain positioning and layering
                ...generateMountainRanges(width, height)
            ]
        };
    }, []);

    const generateMountainRanges = (width: number, height: number): MountainRange[] => {
      return [
          // Far background mountains - wide, low
          new MountainRange(height * 0.35, width * 0.7, 0.4, { x: -0.6, angle: 0 }),
          new MountainRange(height * 0.35, width * 0.7, 0.4, { x: 0.6, angle: 0 }),
          
          // Mid-range mountains - taller, more detailed
          new MountainRange(height * 0.45, width * 0.6, 0.7, { x: -0.3, angle: 0 }),
          new MountainRange(height * 0.45, width * 0.6, 0.7, { x: 0.3, angle: 0 }),
          
          // Foreground mountains - highest detail and impact
          new MountainRange(height * 0.5, width * 0.5, 1.0, { x: -0.15, angle: 0 }),
          new MountainRange(height * 0.5, width * 0.5, 1.0, { x: 0.15, angle: 0 })
      ];
  };

    const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
        const deltaTime = lastFrameTimeRef.current ? time - lastFrameTimeRef.current : 0;
        lastFrameTimeRef.current = time;
        timeRef.current = time * 0.001;

        const { width, height } = ctx.canvas;
        
        // Update lighting with improved timing
        systems.current.lighting?.updateColors(timeRef.current);
        const currentLighting = systems.current.lighting?.getCurrentLighting();
        if (!currentLighting) return;

        // Clear and draw sky gradient
        ctx.clearRect(0, 0, width, height);
        drawSky(ctx, currentLighting.sky, height);

        // Draw mountain ranges with improved layering
        drawMountainLayers(ctx, width, height, currentLighting);

        // Draw water system with enhanced reflections
        drawWaterSystem(ctx, timeRef.current);

        // Update and draw terrain and atmosphere
        updateAndDrawTerrain(ctx, timeRef.current, deltaTime, currentLighting);
    }, []);

    // Helper functions for rendering different parts of the scene
    const drawSky = (ctx: CanvasRenderingContext2D, sky: any, height: number) => {
        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
        skyGradient.addColorStop(0, `hsla(${sky.primary[0]}, ${sky.primary[1]}%, ${sky.primary[2]}%, 1)`);
        skyGradient.addColorStop(0.6, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${sky.secondary[2]}%, 1)`);
        skyGradient.addColorStop(1, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${Math.min(100, sky.secondary[2] + 10)}%, 1)`);
        
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    };

    const drawMountainLayers = (ctx: CanvasRenderingContext2D, width: number, height: number, lighting: any) => {
        ctx.save();
        
        // Background mountains
        ctx.globalAlpha = 0.7;
        drawMountainRange(ctx, systems.current.mountains.slice(0, 2), width, height, true);

        // Mid mountains
        ctx.globalAlpha = 0.8;
        drawMountainRange(ctx, systems.current.mountains.slice(2, 4), width, height, true);

        // Front mountains
        ctx.globalAlpha = 1.0;
        drawMountainRange(ctx, systems.current.mountains.slice(4), width, height, false);

        ctx.restore();
    };

    const drawMountainRange = (
      ctx: CanvasRenderingContext2D,
      mountains: MountainRange[],
      width: number,
      height: number,
      isBackground: boolean
  ) => {
      mountains.forEach((mountain) => {
          // Get current lighting state
          const currentLighting = systems.current.lighting?.getCurrentLighting();
          if (!currentLighting) return;
  
          // Get mountain colors from lighting state
          const { shadow, midtone, highlight } = currentLighting.terrain.mountains;
          
          // Apply depth factor for background mountains
          const depthFactor = isBackground ? 0.7 : 1;
          
          // Create mountain colors object
          const mountainColors = {
              shadow: {
                  h: shadow[0],
                  s: shadow[1] * depthFactor,
                  b: shadow[2] * depthFactor
              },
              midtone: {
                  h: midtone[0],
                  s: midtone[1] * depthFactor,
                  b: midtone[2] * depthFactor
              },
              highlight: {
                  h: highlight[0],
                  s: highlight[1] * depthFactor,
                  b: highlight[2] * depthFactor
              }
          };
          
          // Draw mountain with adjusted colors
          mountain.draw(ctx, width, height, mountainColors);
      });
  };

    const drawWaterSystem = (ctx: CanvasRenderingContext2D, time: number) => {
        const reflectionScene = () => {
            ctx.save();
            ctx.globalAlpha = 0.3;
            drawMountainRange(
                ctx, 
                [...systems.current.mountains.slice(0, 4)], 
                ctx.canvas.width, 
                ctx.canvas.height, 
                true
            );
            ctx.restore();
        };
        
        systems.current.water?.draw(ctx, time, reflectionScene);
    };

    const updateAndDrawTerrain = (
        ctx: CanvasRenderingContext2D, 
        time: number, 
        deltaTime: number, 
        lighting: any
    ) => {
        systems.current.terrain?.update(time, deltaTime);
        systems.current.terrain?.draw(ctx, time, lighting);
        systems.current.atmosphere?.draw(ctx, time);
    };

    const cleanup = useCallback(() => {
        // Cleanup system resources if needed
    }, []);

    const handleClick = useCallback((x: number, y: number, canvasHeight: number) => {
        const waterLevel = canvasHeight * 0.55;
        if (y > waterLevel) {
            systems.current.water?.addRipple(x, y);
        }
    }, []);

    return {
        initializeSystems,
        renderFrame,
        cleanup,
        handleClick,
    };
};