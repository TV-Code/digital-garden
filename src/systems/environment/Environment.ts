import { createNoise2D } from "simplex-noise";
import { ColorSystem } from "../../utils/colors";

export class TerrainSystem {
    private shoreline: Path2D[] = [];
    private rocks: Array<{
      path: Path2D;
      color: any;
      highlight: any;
      shadow: any;
    }> = [];
    private landmasses: Array<{
      path: Path2D;
      gradient: CanvasGradient;
    }> = [];
  
    constructor(private width: number, private height: number) {
      this.generateTerrain();
    }
  
    private generateTerrain() {
      // Create main landmasses on both sides
      const leftShore = new Path2D();
      leftShore.moveTo(0, this.height * 0.6);
      leftShore.quadraticCurveTo(
        this.width * 0.2, this.height * 0.55,
        this.width * 0.3, this.height * 0.65
      );
      leftShore.lineTo(0, this.height);
      leftShore.closePath();
      this.shoreline.push(leftShore);
  
      const rightShore = new Path2D();
      rightShore.moveTo(this.width, this.height * 0.6);
      rightShore.quadraticCurveTo(
        this.width * 0.8, this.height * 0.55,
        this.width * 0.7, this.height * 0.65
      );
      rightShore.lineTo(this.width, this.height);
      rightShore.closePath();
      this.shoreline.push(rightShore);
  
      // Generate scattered rocks
      for (let i = 0; i < 15; i++) {
        this.generateRock(
          Math.random() * this.width,
          this.height * (0.6 + Math.random() * 0.2),
          20 + Math.random() * 40
        );
      }
    }
  
    private generateRock(x: number, y: number, size: number) {
      const rockPath = new Path2D();
      const points: [number, number][] = [];
      const segments = 8 + Math.floor(Math.random() * 4);
  
      // Generate irregular rock shape
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const radius = size * (0.8 + Math.random() * 0.4);
        points.push([
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        ]);
      }
  
      // Create rock path
      rockPath.moveTo(points[0][0], points[0][1]);
      points.forEach((point, i) => {
        const nextPoint = points[(i + 1) % points.length];
        const controlPoint = {
          x: (point[0] + nextPoint[0]) / 2 + (Math.random() - 0.5) * size * 0.3,
          y: (point[1] + nextPoint[1]) / 2 + (Math.random() - 0.5) * size * 0.3
        };
        rockPath.quadraticCurveTo(controlPoint.x, controlPoint.y, nextPoint[0], nextPoint[1]);
      });
  
      // Add rock with lighting variations
      this.rocks.push({
        path: rockPath,
        color: {
          h: 220 + Math.random() * 20,
          s: 30 + Math.random() * 20,
          b: 30 + Math.random() * 20
        },
        highlight: {
          h: 15,
          s: 30,
          b: 90
        },
        shadow: {
          h: 220,
          s: 40,
          b: 20
        }
      });
    }
  
    draw(ctx: CanvasRenderingContext2D, time: number) {
      // Draw shoreline
      this.shoreline.forEach(shore => {
        ctx.save();
        const gradient = ctx.createLinearGradient(0, this.height * 0.5, 0, this.height);
        gradient.addColorStop(0, `hsla(125, 30%, 45%, 1)`);
        gradient.addColorStop(1, `hsla(125, 35%, 35%, 1)`);
        ctx.fillStyle = gradient;
        ctx.fill(shore);
        ctx.restore();
      });
  
      // Draw rocks with lighting
      this.rocks.forEach(rock => {
        ctx.save();
        
        // Base rock color
        const baseGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        baseGradient.addColorStop(0, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b}%, 1)`);
        baseGradient.addColorStop(1, `hsla(${rock.color.h}, ${rock.color.s}%, ${rock.color.b - 10}%, 1)`);
        ctx.fillStyle = baseGradient;
        ctx.fill(rock.path);
  
        // Highlight edge
        ctx.strokeStyle = `hsla(${rock.highlight.h}, ${rock.highlight.s}%, ${rock.highlight.b}%, 0.3)`;
        ctx.lineWidth = 2;
        ctx.stroke(rock.path);
  
        ctx.restore();
      });
    }
  
    // Returns safe positions for vegetation placement
    getSafePlantingSpots(count: number): Array<{x: number, y: number}> {
      const spots: Array<{x: number, y: number}> = [];
      
      for (let i = 0; i < count; i++) {
        const x = Math.random() * this.width;
        const y = this.height * (0.6 + Math.random() * 0.2);
        
        // Check if point is on land
        if (this.isPointOnLand(x, y)) {
          spots.push({x, y});
        }
      }
      
      return spots;
    }
  
    private isPointOnLand(x: number, y: number): boolean {
      // Implement point-in-path checking for shoreline
      return y > this.height * 0.6;
    }
  }

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

  export class WaterSystem {
    private ripples: Array<{
      x: number;
      y: number;
      radius: number;
      strength: number;
      maxRadius: number;
    }> = [];
  
    constructor(private baseY: number) {}
  
    draw(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
        // Draw base water
        const gradient = ctx.createLinearGradient(0, this.baseY, 0, height);
        const { surface, deep } = ColorSystem.water;
        
        gradient.addColorStop(0, `hsla(${surface.h}, ${surface.s}%, ${surface.b}%, 0.9)`);
        gradient.addColorStop(1, `hsla(${deep.h}, ${deep.s}%, ${deep.b}%, 0.95)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, this.baseY, width, height - this.baseY);
      
        // Update and draw ripples
        this.drawRipples(ctx);
      
        // Draw reflections
        this.drawReflections(ctx, width, time);
      }
      
      private drawRipples(ctx: CanvasRenderingContext2D) {
        const { ripple } = ColorSystem.water;
        this.ripples.forEach(ripple => {
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${ripple.h}, ${ripple.s}%, ${ripple.b}%, ${ripple.strength})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
      
      private drawReflections(ctx: CanvasRenderingContext2D, width: number, time: number) {
        const { highlight } = ColorSystem.water;
        ctx.beginPath();
        for (let x = 0; x < width; x += 20) {
          const y = this.baseY + Math.sin(x * 0.05 + time * 2) * 2;
          ctx.moveTo(x, y);
          ctx.lineTo(x + 10, y + 1);
        }
        ctx.strokeStyle = `hsla(${highlight.h}, ${highlight.s}%, ${highlight.b}%, 0.1)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
  
    addRipple(x: number, y: number) {
      this.ripples.push({
        x,
        y,
        radius: 0,
        strength: 0.5,
        maxRadius: 30 + Math.random() * 20
      });
    }
  }