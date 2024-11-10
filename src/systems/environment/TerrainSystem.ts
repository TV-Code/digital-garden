import { createNoise2D, createNoise3D } from "simplex-noise";

interface RockFormation {
    path: Path2D;
    position: Vector2;
    size: number;
    angle: number;
    detail: {
      cracks: Path2D[];
      highlights: Path2D[];
      texture: Path2D;
    };
    colors: {
      base: HSLColor;
      highlight: HSLColor;
      shadow: HSLColor;
      detail: HSLColor;
    };
  }
  
  interface Vector2 {
    x: number;
    y: number;
  }
  
  interface HSLColor {
    h: number;
    s: number;
    b: number;
    a?: number;
  }
  
  export class TerrainSystem {
    private shoreline: Path2D[] = [];
    private rocks: RockFormation[] = [];
    private noise: ReturnType<typeof createNoise2D>;
    private detailNoise: ReturnType<typeof createNoise3D>;
    
    constructor(private width: number, private height: number) {
      this.noise = createNoise2D();
      this.detailNoise = createNoise3D();
      this.generateTerrain();
    }
  
    private generateTerrain() {
      // Generate main terrain composition
      this.generateShoreline();
      this.generateRockFormations();
    }
  
    private generateShoreline() {
      // Create more natural, curved shoreline paths
      const leftShore = this.createNaturalShoreline(0, this.width * 0.4, 'left');
      const rightShore = this.createNaturalShoreline(this.width * 0.6, this.width, 'right');
      
      this.shoreline = [leftShore, rightShore];
    }
  
    private createNaturalShoreline(startX: number, endX: number, side: 'left' | 'right'): Path2D {
      const path = new Path2D();
      const points: Vector2[] = [];
      const segments = 20;
  
      // Generate control points for natural curve
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = startX + (endX - startX) * t;
        const baseY = this.height * 0.6;
        
        // Add natural variation using noise
        const noiseValue = this.noise(x * 0.005, side === 'left' ? 0 : 1);
        const variation = noiseValue * this.height * 0.1;
        
        points.push({
          x,
          y: baseY + variation
        });
      }
  
      // Create smooth curve through points
      path.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length - 2; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        path.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
  
      // Complete the shoreline path
      path.lineTo(points[points.length - 1].x, this.height);
      path.lineTo(points[0].x, this.height);
      path.closePath();
  
      return path;
    }
  
    private generateRockFormations() {
      // Clear existing rocks
      this.rocks = [];
  
      // Generate main rock clusters
      this.generateRockCluster(
        { x: this.width * 0.2, y: this.height * 0.65 },
        15,
        'foreground'
      );
      this.generateRockCluster(
        { x: this.width * 0.8, y: this.height * 0.67 },
        12,
        'foreground'
      );
      this.generateRockCluster(
        { x: this.width * 0.5, y: this.height * 0.7 },
        8,
        'background'
      );
    }
  
    private generateRockCluster(center: Vector2, count: number, depth: 'foreground' | 'background') {
      const radius = depth === 'foreground' ? 150 : 100;
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = radius * (0.3 + Math.random() * 0.7);
        
        const position = {
          x: center.x + Math.cos(angle) * distance,
          y: center.y + Math.sin(angle) * distance * 0.5 // Flatten distribution
        };
  
        const size = depth === 'foreground' 
          ? 30 + Math.random() * 50
          : 20 + Math.random() * 30;
  
        this.rocks.push(this.createDetailedRock(position, size, depth));
      }
    }
  
    private createDetailedRock(position: Vector2, size: number, depth: 'foreground' | 'background'): RockFormation {
      const segments = depth === 'foreground' ? 12 : 8;
      const path = new Path2D();
      const points: Vector2[] = [];
  
      // Generate base rock shape
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const radius = size * (0.8 + this.noise(angle * 2, position.y * 0.01) * 0.4);
        
        points.push({
          x: position.x + Math.cos(angle) * radius,
          y: position.y + Math.sin(angle) * radius * 0.8 // Slight vertical compression
        });
      }
  
      // Create smooth rock path
      path.moveTo(points[0].x, points[0].y);
      points.forEach((point, i) => {
        const next = points[(i + 1) % points.length];
        const ctrl = {
          x: (point.x + next.x) / 2 + (Math.random() - 0.5) * size * 0.2,
          y: (point.y + next.y) / 2 + (Math.random() - 0.5) * size * 0.2
        };
        path.quadraticCurveTo(ctrl.x, ctrl.y, next.x, next.y);
      });
  
      // Generate detailed features
      const details = this.generateRockDetails(points, size, depth);
  
      return {
        path,
        position,
        size,
        angle: Math.random() * Math.PI * 2,
        detail: details,
        colors: this.getRockColors(depth)
      };
    }

    private generateRockDetails(points: Vector2[], size: number, depth: 'foreground' | 'background') {
        const cracks: Path2D[] = [];
        const highlights: Path2D[] = [];
        const texture = new Path2D();
    
        // Generate geometric cracks
        const crackCount = depth === 'foreground' ? 5 : 3;
        for (let i = 0; i < crackCount; i++) {
          const crack = new Path2D();
          const startPoint = points[Math.floor(Math.random() * points.length)];
          const angle = Math.random() * Math.PI * 2;
          const length = size * (0.4 + Math.random() * 0.3);
    
          crack.moveTo(startPoint.x, startPoint.y);
          
          let currentPoint = { x: startPoint.x, y: startPoint.y };
          let currentAngle = angle;
          
          // Create jagged crack line
          const segments = Math.floor(length / 10);
          for (let j = 0; j < segments; j++) {
            currentAngle += (Math.random() - 0.5) * 0.5;
            const segmentLength = 5 + Math.random() * 5;
            
            currentPoint = {
              x: currentPoint.x + Math.cos(currentAngle) * segmentLength,
              y: currentPoint.y + Math.sin(currentAngle) * segmentLength
            };
            
            crack.lineTo(currentPoint.x, currentPoint.y);
          }
    
          cracks.push(crack);
        }
    
        // Generate highlight edges
        points.forEach((point, i) => {
          const next = points[(i + 1) % points.length];
          const highlight = new Path2D();
          
          if (Math.random() < 0.3) { // Only highlight some edges
            highlight.moveTo(point.x, point.y);
            highlight.lineTo(next.x, next.y);
            highlights.push(highlight);
          }
        });
    
        // Generate surface texture
        const texturePoints = [];
        const textureGridSize = Math.floor(size / 5);
        
        for (let i = 0; i < textureGridSize; i++) {
          for (let j = 0; j < textureGridSize; j++) {
            const noiseVal = this.detailNoise(i * 0.2, j * 0.2, 0);
            if (noiseVal > 0.6) {
              texturePoints.push({
                x: points[0].x + (i / textureGridSize) * size,
                y: points[0].y + (j / textureGridSize) * size
              });
            }
          }
        }
    
        texturePoints.forEach(point => {
          texture.moveTo(point.x, point.y);
          texture.arc(point.x, point.y, 1, 0, Math.PI * 2);
        });
    
        return { cracks, highlights, texture };
      }
    
      private getRockColors(depth: 'foreground' | 'background'): RockFormation['colors'] {
        const baseHue = 220 + Math.random() * 20;
        const intensity = depth === 'foreground' ? 1 : 0.8;
    
        return {
          base: {
            h: baseHue,
            s: 30 + Math.random() * 20,
            b: 30 + Math.random() * 20,
            a: 1
          },
          highlight: {
            h: 15,
            s: 30,
            b: 90,
            a: intensity * 0.3
          },
          shadow: {
            h: baseHue + 10,
            s: 40,
            b: 20,
            a: intensity * 0.4
          },
          detail: {
            h: baseHue - 10,
            s: 35,
            b: 25,
            a: intensity * 0.5
          }
        };
      }
    
      draw(ctx: CanvasRenderingContext2D, time: number, lighting: any) {
        // Draw shoreline with advanced shading
        this.shoreline.forEach(shore => {
          ctx.save();
          
          // Create sophisticated gradient for shore
          const gradient = ctx.createLinearGradient(0, this.height * 0.5, 0, this.height);
          gradient.addColorStop(0, `hsla(125, 30%, 45%, 1)`);
          gradient.addColorStop(0.4, `hsla(125, 32%, 40%, 1)`);
          gradient.addColorStop(0.7, `hsla(125, 35%, 35%, 1)`);
          gradient.addColorStop(1, `hsla(125, 35%, 30%, 1)`);
          
          ctx.fillStyle = gradient;
          ctx.fill(shore);
          
          // Add shore detail
          this.drawShoreDetail(ctx, shore, time);
          
          ctx.restore();
        });
    
        // Draw rocks with enhanced rendering
        this.rocks.forEach(rock => {
          this.drawEnhancedRock(ctx, rock, time, lighting);
        });
      }
    
      private drawEnhancedRock(
        ctx: CanvasRenderingContext2D, 
        rock: RockFormation, 
        time: number,
        lighting: any
      ) {
        ctx.save();
    
        // Create sophisticated base gradient
        const gradientHeight = rock.size * 2;
        const baseGradient = ctx.createLinearGradient(
          rock.position.x,
          rock.position.y - gradientHeight / 2,
          rock.position.x,
          rock.position.y + gradientHeight / 2
        );
    
        const { base, shadow } = rock.colors;
        
        baseGradient.addColorStop(0, `hsla(${base.h}, ${base.s}%, ${base.b}%, ${base.a})`);
        baseGradient.addColorStop(0.4, `hsla(${base.h}, ${base.s}%, ${Math.max(0, base.b - 5)}%, ${base.a})`);
        baseGradient.addColorStop(1, `hsla(${shadow.h}, ${shadow.s}%, ${shadow.b}%, ${shadow.a})`);
    
        ctx.fillStyle = baseGradient;
        ctx.fill(rock.path);
    
        // Draw cracks with shadow effect
        rock.detail.cracks.forEach(crack => {
          ctx.strokeStyle = `hsla(${rock.colors.shadow.h}, ${rock.colors.shadow.s}%, ${rock.colors.shadow.b}%, 0.3)`;
          ctx.lineWidth = 2;
          ctx.stroke(crack);
    
          // Highlight edge of crack
          ctx.strokeStyle = `hsla(${rock.colors.highlight.h}, ${rock.colors.highlight.s}%, ${rock.colors.highlight.b}%, 0.1)`;
          ctx.lineWidth = 1;
          ctx.stroke(crack);
        });
    
        // Draw edge highlights with time-based animation
        rock.detail.highlights.forEach(highlight => {
          const shimmer = Math.sin(time * 2 + rock.position.x * 0.01) * 0.2 + 0.8;
          ctx.strokeStyle = `hsla(${rock.colors.highlight.h}, ${rock.colors.highlight.s}%, ${rock.colors.highlight.b}%, ${0.2 * shimmer})`;
          ctx.lineWidth = 2;
          ctx.stroke(highlight);
        });
    
        // Draw surface texture
        ctx.fillStyle = `hsla(${rock.colors.detail.h}, ${rock.colors.detail.s}%, ${rock.colors.detail.b}%, 0.1)`;
        ctx.fill(rock.detail.texture);
    
        ctx.restore();
      }

      private drawShoreDetail(ctx: CanvasRenderingContext2D, shore: Path2D, time: number) {
        // Add grass-like detail along the shore
        const shoreBounds = this.getPathBounds(shore);
        const detailCount = Math.floor((shoreBounds.width + shoreBounds.height) / 10);
    
        for (let i = 0; i < detailCount; i++) {
          const x = shoreBounds.x + Math.random() * shoreBounds.width;
          const y = shoreBounds.y + Math.random() * shoreBounds.height;
    
          if (this.isPointInPath(shore, { x, y })) {
            const detailHeight = 3 + Math.random() * 5;
            const sway = Math.sin(time * 2 + x * 0.1) * 2;
    
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
              x + sway,
              y - detailHeight * 0.6,
              x + sway * 0.5,
              y - detailHeight
            );
            
            ctx.strokeStyle = `hsla(125, 35%, ${30 + Math.random() * 10}%, 0.3)`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    
      private getPathBounds(path: Path2D): { x: number; y: number; width: number; height: number } {
        // Approximate bounds based on terrain dimensions
        return {
          x: 0,
          y: this.height * 0.5,
          width: this.width,
          height: this.height * 0.5
        };
      }
    
      private isPointInPath(path: Path2D, point: Vector2): boolean {
        const ctx = document.createElement('canvas').getContext('2d')!;
        return ctx.isPointInPath(path, point.x, point.y);
      }
    }