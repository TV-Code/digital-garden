import { useRef, useCallback, useState } from 'react';
import { LightingSystem } from '../systems/environment/lighting';
import { TerrainSystem } from '../systems/environment/TerrainSystem';
import { WaterSystem } from '../systems/environment/WaterSystem';
import { MountainRange } from '../systems/environment/MountainRange';
import { AtmosphericSystem } from '../systems/environment/AtmosphericSystem';
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

  const frameRef = useRef<number>(0);
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
        // Background peaks
        new MountainRange(
          height * 0.25,  // baseHeight
          width * 0.6,    // baseWidth
          0.5,            // complexity
          { x: -0.5, angle: 0 }  // position
        ),
        new MountainRange(
          height * 0.3,
          width * 0.6,
          0.5,
          { x: 0.5, angle: 0 }
        ),
        // Mid mountains
        new MountainRange(
          height * 0.35,
          width * 0.7,
          0.7,
          { x: -0.3, angle: 0 }
        ),
        new MountainRange(
          height * 0.35,
          width * 0.7,
          0.7,
          { x: 0.3, angle: 0 }
        ),
        // Foreground mountains
        new MountainRange(
          height * 0.4,
          width * 0.8,
          1.0,
          { x: -0.2, angle: 0 }
        ),
        new MountainRange(
          height * 0.4,
          width * 0.8,
          1.0,
          { x: 0.2, angle: 0 }
        ),
      ]
    };
}, []);

    const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
      const deltaTime = lastFrameTimeRef.current ? time - lastFrameTimeRef.current : 0;
      lastFrameTimeRef.current = time;
      timeRef.current = time * 0.001;
  
      const { width, height } = ctx.canvas;
      
      // Update lighting
      systems.current.lighting?.updateColors(timeRef.current);
      const currentLighting = systems.current.lighting?.getCurrentLighting();
      if (!currentLighting) return;
  
      // Clear canvas with the current background color
      ctx.clearRect(0, 0, width, height);
  
      // Draw sky gradient
      const { sky } = currentLighting;
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.7);
      skyGradient.addColorStop(0, `hsla(${sky.primary[0]}, ${sky.primary[1]}%, ${sky.primary[2]}%, 1)`);
      skyGradient.addColorStop(0.6, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${sky.secondary[2]}%, 1)`);
      skyGradient.addColorStop(1, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${Math.min(100, sky.secondary[2] + 10)}%, 1)`);
      
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
  
      const bgMountains = systems.current.mountains.slice(0, 2);
    ctx.globalAlpha = 0.7; // Fade background mountains
    drawMountainRange(ctx, bgMountains, width, height, true);

    // Draw mid mountains
    const midMountains = systems.current.mountains.slice(2, 4);
    ctx.globalAlpha = 0.8;
    drawMountainRange(ctx, midMountains, width, height, true);

    // Draw front mountains
    const frontMountains = systems.current.mountains.slice(4);
    ctx.globalAlpha = 1.0;
    drawMountainRange(ctx, frontMountains, width, height, false);

    // Reset context
    ctx.restore();
  
      // Draw water system with reflections
      const reflectionScene = () => {
        ctx.globalAlpha = 0.3;
        // Only reflect the far and mid mountains
        drawMountainRange(ctx, [...bgMountains, ...midMountains], width, height, true);
        ctx.globalAlpha = 1;
      };
      
      systems.current.water?.draw(ctx, timeRef.current, reflectionScene);
  
      // Draw terrain after water
      systems.current.terrain?.update(timeRef.current, deltaTime);
      systems.current.terrain?.draw(ctx, timeRef.current, currentLighting);
  
      // Request next frame
      frameRef.current = requestAnimationFrame((t) => renderFrame(ctx, t));
  }, []);

  const drawMountainRange = (
    ctx: CanvasRenderingContext2D,
    mountains: MountainRange[],
    width: number,
    height: number,
    isBackground: boolean
  ) => {
    mountains.forEach((mountain, i) => {
      const colorIndex = i % ColorSystem.landscape.mountains.length;
      const mountainColor = ColorSystem.landscape.mountains[colorIndex];
      
      // Adjust colors based on depth
      const depthFactor = isBackground ? 0.7 : 1;
      const adjustedColor = {
        h: mountainColor.base[0],
        s: mountainColor.base[1] * depthFactor,
        b: mountainColor.base[2] * depthFactor
      };
      
      mountain.draw(ctx, width, height, {
        base: adjustedColor,
        highlight: ColorBridge.fromColorSystem(mountainColor.highlight),
        shadow: ColorBridge.fromColorSystem(mountainColor.shadow),
      });
    });
  };

  const cleanup = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
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