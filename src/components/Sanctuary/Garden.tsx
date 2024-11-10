import React, { useCallback, useRef, useEffect } from 'react';
import { createNoise2D } from 'simplex-noise';
import { interpolate } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';
import { line, curveBasisClosed } from 'd3-shape';

// Advanced color system with sophisticated harmonies

  
  

class MountainRange {
  private noise2D: ReturnType<typeof createNoise2D>;
  private baseHeight: number;
  private complexity: number;
  private ridgeOffset: number;

  constructor(baseHeight: number, complexity: number = 1) {
    this.noise2D = createNoise2D();
    this.baseHeight = baseHeight;
    this.complexity = complexity;
    this.ridgeOffset = Math.random() * 1000;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, color: any) {
    const points: [number, number][] = [];
    const segments = 200;

    // Generate mountain profile
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * width;
      const normalizedX = i / segments;
      
      // Combine multiple noise frequencies
      let y = 0;
      for (let freq = 1; freq <= 4; freq++) {
        const noiseValue = this.noise2D(
          normalizedX * freq * this.complexity + this.ridgeOffset,
          freq * 0.5
        );
        y += noiseValue * (1 / freq);
      }

      // Shape the mountain profile
      y = Math.abs(y);  // Create sharp ridges
      y = 1 - Math.pow(1 - y, 2);  // Enhance peaks
      y *= Math.sin(normalizedX * Math.PI);  // Fade at edges
      
      points.push([x, height - (y * this.baseHeight)]);
    }

    // Draw mountain body
    ctx.beginPath();
    ctx.moveTo(points[0][0], height);
    points.forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.lineTo(points[points.length - 1][0], height);
    ctx.closePath();

    // Create and apply gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, `hsla(${color.base.h}, ${color.base.s}%, ${color.base.b}%, 1)`);
    gradient.addColorStop(1, `hsla(${color.base.h}, ${color.base.s}%, ${color.base.b * 0.8}%, 1)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw highlight edge
    ctx.beginPath();
    points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point[0], point[1]);
      else ctx.lineTo(point[0], point[1]);
    });
    ctx.strokeStyle = `hsla(${color.highlight.h}, ${color.highlight.s}%, ${color.highlight.b}%, 0.3)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}







  

// Main landscape component
const Garden: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const lightingRef = useRef<LightingSystem | null>(null);
    const mountainRangesRef = useRef<MountainRange[]>([]);
    const waterSystemRef = useRef<WaterSystem | null>(null);
    const terrainRef = useRef<TerrainSystem | null>(null);
    const vegetationRef = useRef<VegetationSystem | null>(null);
  
    const initialize = useCallback(() => {
      if (!canvasRef.current) return;
  
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
  
      // Set up canvas with proper scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
  
      // Initialize lighting system
      lightingRef.current = new LightingSystem();
  
      // Initialize systems
      mountainRangesRef.current = [
        new MountainRange(rect.height * 0.4, 1.0),
        new MountainRange(rect.height * 0.5, 1.2),
        new MountainRange(rect.height * 0.6, 1.5)
      ];
  
      terrainRef.current = new TerrainSystem(rect.width, rect.height);
      waterSystemRef.current = new WaterSystem(rect.height * 0.6);
      
      // Initialize vegetation with proper terrain system
      const plantingSpots = terrainRef.current.getSafePlantingSpots(50);
      vegetationRef.current = new VegetationSystem(plantingSpots);
  
      // Animation loop
      const animate = (time: number) => {
        timeRef.current = time * 0.001;
        
        // Update lighting
        lightingRef.current?.updateColors(timeRef.current);
        const currentLighting = lightingRef.current?.getCurrentLighting();
        
        if (!currentLighting) return;
  
        ctx.clearRect(0, 0, rect.width, rect.height);
  
        // Draw sky with new lighting
        const { sky } = currentLighting;
        const skyGradient = ctx.createLinearGradient(0, 0, 0, rect.height * 0.6);
        skyGradient.addColorStop(0, `hsla(${sky.primary[0]}, ${sky.primary[1]}%, ${sky.primary[2]}%, 1)`);
        skyGradient.addColorStop(1, `hsla(${sky.secondary[0]}, ${sky.secondary[1]}%, ${sky.secondary[2]}%, 1)`);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, rect.width, rect.height);
  
        // Draw mountains with lighting influence
        mountainRangesRef.current.forEach((mountain, i) => {
          const mountainColor = SanctuaryColors.landscape.mountains[i];
          const adjustedColor = adjustColorWithLighting(mountainColor, currentLighting);
          mountain.draw(ctx, rect.width, rect.height, adjustedColor);
        });
  
        // Draw terrain with lighting
        terrainRef.current?.draw(ctx, timeRef.current, currentLighting);
  
        // Draw water with lighting
        waterSystemRef.current?.draw(
          ctx, 
          rect.width, 
          rect.height, 
          timeRef.current,
          currentLighting
        );
  
        // Draw vegetation with lighting
        vegetationRef.current?.draw(ctx, timeRef.current, currentLighting);
  
        frameRef.current = requestAnimationFrame(animate);
      };
  
      animate(0);
    }, []);
  
    // Update click handler to check for terrain
    const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Only add ripples if clicking on water (not on terrain)
      if (y > rect.height * 0.6) {
        waterSystemRef.current?.addRipple(x, y);
      }
    }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-screen h-screen"
      onClick={handleClick}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

function adjustColorWithLighting(baseColor: any, lighting: any) {
    const ambientInfluence = lighting.ambient.intensity;
    return {
      base: {
        h: baseColor.base[0],
        s: baseColor.base[1] * ambientInfluence,
        b: baseColor.base[2] * ambientInfluence
      },
      highlight: {
        h: baseColor.highlight[0],
        s: baseColor.highlight[1] * ambientInfluence,
        b: baseColor.highlight[2] * ambientInfluence
      }
    };
  }

export default Garden;