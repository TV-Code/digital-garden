import { useRef, useCallback } from 'react';
import { LightingSystem } from '../systems/environment/lighting';
import { TerrainSystem } from '../systems/environment/TerrainSystem';
import { WaterSystem } from '../systems/environment/WaterSystem';
import { MountainRange } from '../systems/environment/MountainRange';
import { ColorSystem, ColorBridge } from '../utils/colors';

export const useSanctuary = () => {
  const systems = useRef({
    lighting: null as LightingSystem | null,
    terrain: null as TerrainSystem | null,
    water: null as WaterSystem | null,
    mountains: [] as MountainRange[],
  });

  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const baseYRef = useRef<number>(0);

  const initializeSystems = useCallback((canvas: HTMLCanvasElement) => {
    const { width, height } = canvas;
    const baseY = height * 0.6; // Water starts at 60% of canvas height
    baseYRef.current = baseY;

    // Initialize all systems
    systems.current = {
      lighting: new LightingSystem(),
      terrain: new TerrainSystem(width, height),
      water: new WaterSystem(baseY, width, height),
      mountains: [
        new MountainRange(
          height * 0.8, // Taller
          0.8, // Less detail for distance
          { x: -0.2, angle: Math.PI * 0.02 } // Slight left lean
        ),
        new MountainRange(
          height * 0.85,
          1.0,
          { x: 0.1, angle: -Math.PI * 0.03 } // Right lean
        ),
        // Front mountains (shorter but more detailed)
        new MountainRange(
          height * 0.7,
          1.2,
          { x: -0.15, angle: Math.PI * 0.01 }
        ),
      ],
    };
  }, []);

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = ctx.canvas;
    timeRef.current = time * 0.001;
  
    // Update lighting
    systems.current.lighting?.updateColors(timeRef.current);
    const currentLighting = systems.current.lighting?.getCurrentLighting();
  
    if (!currentLighting) return;
  
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
  
    // Draw sky
    const { sky } = currentLighting;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    skyGradient.addColorStop(0, `hsla(${sky.primary[0]}, ${sky.primary[1]}%, ${sky.primary[2]}%, 1)`);
    skyGradient.addColorStop(1, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${sky.secondary[2]}%, 1)`);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);
  
    // Draw background mountains (those that should be behind the water)
    const backgroundMountains = systems.current.mountains.slice(0, 2); // Adjust indices as needed
    backgroundMountains.forEach((mountain, i) => {
      const mountainColor = ColorSystem.landscape.mountains[i];
      const adjustedColor = ColorBridge.fromColorSystem(mountainColor.base);
      const adjustedShadowColor = ColorBridge.fromColorSystem(mountainColor.shadow);
      mountain.draw(ctx, width, height, {
        base: adjustedColor,
        highlight: ColorBridge.fromColorSystem(mountainColor.highlight),
        shadow: adjustedShadowColor,
      });
    });
  
    // Draw foreground mountains (those that should be in front of the water)
    const foregroundMountains = systems.current.mountains.slice(2); // Adjust indices as needed
    foregroundMountains.forEach((mountain, i) => {
      // Note: Adjust the index 'i' if needed
      const mountainColor = ColorSystem.landscape.mountains[i + 2]; // Offset index
      const adjustedColor = ColorBridge.fromColorSystem(mountainColor.base);
      const adjustedShadowColor = ColorBridge.fromColorSystem(mountainColor.shadow);
      mountain.draw(ctx, width, height, {
        base: adjustedColor,
        highlight: ColorBridge.fromColorSystem(mountainColor.highlight),
        shadow: adjustedShadowColor,
      });
    });
  
    // Define the scene function for reflections (only background mountains)
    const scene = () => {
      backgroundMountains.forEach((mountain, i) => {
        const mountainColor = ColorSystem.landscape.mountains[i];
        const adjustedColor = ColorBridge.fromColorSystem(mountainColor.base);
        const adjustedShadowColor = ColorBridge.fromColorSystem(mountainColor.shadow);
        mountain.draw(ctx, width, height, {
          base: adjustedColor,
          highlight: ColorBridge.fromColorSystem(mountainColor.highlight),
          shadow: adjustedShadowColor,
        });
      });
    };
  
    // Draw water
    console.log('Before drawing water:', ctx.globalAlpha, ctx.globalCompositeOperation);
    // Draw water
    systems.current.water?.draw(ctx, timeRef.current, scene);
    console.log('After drawing water:', ctx.globalAlpha, ctx.globalCompositeOperation);

  
    // Draw terrain (foreground elements)
    systems.current.terrain?.draw(ctx, timeRef.current, currentLighting);
  
    // Request next frame
    frameRef.current = requestAnimationFrame((t) => renderFrame(ctx, t));
  }, []);
  
  
  

  const cleanup = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const handleClick = useCallback((x: number, y: number, canvasHeight: number) => {
    // Only add ripples if clicking on water
    if (y > canvasHeight * 0.6) {
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
