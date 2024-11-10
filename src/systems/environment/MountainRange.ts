import { createNoise2D } from "simplex-noise";

export class MountainRange {
    private noise2D: ReturnType<typeof createNoise2D>;
    private baseHeight: number;
    private complexity: number;
    private ridgeOffset: number;
    private position: { x: number; angle: number }; // Add position control
  
    constructor(
      baseHeight: number, 
      complexity: number = 1,
      position: { x: number; angle: number } = { x: 0, angle: 0 }
    ) {
      this.noise2D = createNoise2D();
      this.baseHeight = baseHeight;
      this.complexity = complexity;
      this.ridgeOffset = Math.random() * 1000;
      this.position = position;
    }
  
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, color: any) {
      const points: [number, number][] = [];
      const segments = 200;
  
      // Define perspective angle based on position
      const perspectiveAngle = this.position.angle;
      const skewX = Math.tan(perspectiveAngle);
  
      // Generate mountain profile with more dramatic peaks
      for (let i = 0; i <= segments; i++) {
        const x = (i / segments) * width;
        const normalizedX = i / segments;
        
        // Enhanced noise combination for more dramatic ridges
        let y = 0;
        for (let freq = 1; freq <= 4; freq++) {
          const noiseValue = this.noise2D(
            normalizedX * freq * this.complexity + this.ridgeOffset,
            freq * 0.5
          );
          // Increase influence of higher frequencies for sharper peaks
          y += noiseValue * (1 / Math.pow(freq, 0.8));
        }
  
        // Enhanced peak shaping
        y = Math.abs(y);  
        y = 1 - Math.pow(1 - y, 3); // More dramatic peaks
        
        // Apply envelope with position offset
        const positionedX = normalizedX + this.position.x;
        const envelope = Math.sin((positionedX) * Math.PI);
        y *= envelope;
        
        // Apply perspective transformation
        const perspectiveY = y * this.baseHeight;
        const perspectiveX = x + perspectiveY * skewX;
        
        points.push([perspectiveX, height - perspectiveY]);
      }
  
      // Draw mountain body with enhanced gradients
      ctx.beginPath();
      ctx.moveTo(points[0][0], height);
      points.forEach(point => ctx.lineTo(point[0], point[1]));
      ctx.lineTo(points[points.length - 1][0], height);
      ctx.closePath();
  
      // Create more sophisticated gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, `hsla(${color.base.h}, ${color.base.s}%, ${color.base.b}%, 1)`);
      gradient.addColorStop(0.3, `hsla(${color.shadow.h}, ${color.shadow.s}%, ${color.shadow.b}%, 1)`);
      gradient.addColorStop(0.7, `hsla(${color.base.h}, ${color.base.s}%, ${Math.max(0, color.base.b - 10)}%, 1)`);
      gradient.addColorStop(1, `hsla(${color.shadow.h}, ${color.shadow.s}%, ${Math.max(0, color.shadow.b - 15)}%, 1)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
  
      // Draw highlights with more detail
      this.drawMountainDetail(ctx, points, color);
    }
  
    private drawMountainDetail(ctx: CanvasRenderingContext2D, points: [number, number][], color: any) {
      // Draw ridge highlights
      ctx.beginPath();
      points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point[0], point[1]);
        else ctx.lineTo(point[0], point[1]);
      });
      
      // Create highlight gradient
      const highlightGradient = ctx.createLinearGradient(
        points[0][0], points[0][1],
        points[points.length - 1][0], points[points.length - 1][1]
      );
      highlightGradient.addColorStop(0, `hsla(${color.highlight.h}, ${color.highlight.s}%, ${color.highlight.b}%, 0.4)`);
      highlightGradient.addColorStop(0.5, `hsla(${color.highlight.h}, ${color.highlight.s}%, ${color.highlight.b}%, 0.1)`);
      highlightGradient.addColorStop(1, `hsla(${color.highlight.h}, ${color.highlight.s}%, ${color.highlight.b}%, 0.3)`);
      
      ctx.strokeStyle = highlightGradient;
      ctx.lineWidth = 2;
      ctx.stroke();
  
      // Add detail lines for texture
      this.drawMountainTexture(ctx, points, color);
    }
  
    private drawMountainTexture(ctx: CanvasRenderingContext2D, points: [number, number][], color: any) {
      // Draw vertical detail lines
      ctx.beginPath();
      for (let i = 0; i < points.length - 1; i += 4) {
        const startPoint = points[i];
        const endPoint = [startPoint[0], startPoint[1] + 50 + Math.random() * 30];
        
        ctx.moveTo(startPoint[0], startPoint[1]);
        ctx.lineTo(endPoint[0], endPoint[1]);
      }
      
      ctx.strokeStyle = `hsla(${color.shadow.h}, ${color.shadow.s}%, ${color.shadow.b}%, 0.1)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }