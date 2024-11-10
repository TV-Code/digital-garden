import { ColorSystem } from "../../utils/colors";

export class VegetationSystem {
    private plants: Plant[] = [];
    private grass: GrassCluster[] = [];
    private flowers: Flower[] = [];
    private moss: MossPatch[] = [];
  
    constructor(private baseY: number) {
      this.initializeVegetation();
    }
  
    private initializeVegetation() {
      // Add grass clusters along the shoreline
      for (let x = 0; x < window.innerWidth; x += 30) {
        if (Math.random() < 0.8) {
          this.grass.push(new GrassCluster(
            x + Math.random() * 20,
            this.baseY - Math.random() * 20,
            20 + Math.random() * 30
          ));
        }
      }
  
      // Add flower clusters
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * window.innerWidth;
        const y = this.baseY - Math.random() * 40;
        const flowerType = Math.random() < 0.5 ? 'red' : Math.random() < 0.5 ? 'purple' : 'yellow';
        this.flowers.push(new Flower(x, y, flowerType));
      }
  
      // Add moss patches along rocks
      for (let i = 0; i < 20; i++) {
        this.moss.push(new MossPatch(
          Math.random() * window.innerWidth,
          this.baseY - Math.random() * 30,
          30 + Math.random() * 50
        ));
      }
    }
  
    draw(ctx: CanvasRenderingContext2D, time: number) {
      // Draw moss first as base layer
      this.moss.forEach(moss => moss.draw(ctx, time));
      
      // Draw grass behind flowers
      this.grass.forEach(grass => grass.draw(ctx, time));
      
      // Draw flowers
      this.flowers.forEach(flower => flower.draw(ctx, time));
    }
  }
  
  class GrassCluster {
    private blades: Array<{
      x: number;
      height: number;
      width: number;
      swayOffset: number;
      color: typeof ColorSystem.vegetation.grass;
    }> = [];
  
    constructor(private x: number, private y: number, private size: number) {
      // Create individual grass blades
      const bladeCount = Math.floor(size / 2);
      for (let i = 0; i < bladeCount; i++) {
        this.blades.push({
          x: Math.random() * size - size/2,
          height: 10 + Math.random() * 20,
          width: 1 + Math.random(),
          swayOffset: Math.random() * Math.PI * 2,
          color: {
            h: 120 + Math.random() * 30,
            s: 40 + Math.random() * 20,
            b: 45 + Math.random() * 20
          }
        });
      }
    }
  
    draw(ctx: CanvasRenderingContext2D, time: number) {
      this.blades.forEach(blade => {
        const sway = Math.sin(time * 2 + blade.swayOffset) * 3;
        const controlX = this.x + blade.x + sway;
        const controlY = this.y - blade.height * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(this.x + blade.x, this.y);
        ctx.quadraticCurveTo(
          controlX, controlY,
          this.x + blade.x + sway, this.y - blade.height
        );
        
        ctx.strokeStyle = `hsla(${blade.color.h}, ${blade.color.s}%, ${blade.color.b}%, 0.8)`;
        ctx.lineWidth = blade.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    }
  }
  
  class Flower {
    private petals: Array<{
      angle: number;
      scale: number;
      offset: number;
    }> = [];
    private growth: number = 0;
    private swayOffset: number;
  
    constructor(private x: number, private y: number, private type: string) {
      const petalCount = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < petalCount; i++) {
        this.petals.push({
          angle: (i / petalCount) * Math.PI * 2,
          scale: 0.8 + Math.random() * 0.4,
          offset: Math.random() * Math.PI * 2
        });
      }
      this.swayOffset = Math.random() * Math.PI * 2;
    }
  
    draw(ctx: CanvasRenderingContext2D, time: number) {
      // Grow animation
      if (this.growth < 1) {
        this.growth += 0.02;
      }
  
      const sway = Math.sin(time + this.swayOffset) * 3;
      const flowerColor = ColorSystem.flowers[this.type as keyof typeof ColorSystem.flowers];
      
      // Draw stem
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.quadraticCurveTo(
        this.x + sway, this.y - 30,
        this.x + sway, this.y - 60 * this.growth
      );
      ctx.strokeStyle = `hsla(${ColorSystem.flowers.stems.h}, ${ColorSystem.flowers.stems.s}%, ${ColorSystem.flowers.stems.b}%, 0.8)`;
      ctx.lineWidth = 2;
      ctx.stroke();
  
      // Draw petals
      const flowerX = this.x + sway;
      const flowerY = this.y - 60 * this.growth;
  
      this.petals.forEach(petal => {
        const angle = petal.angle + Math.sin(time + petal.offset) * 0.1;
        const size = 10 * this.growth * petal.scale;
  
        ctx.beginPath();
        ctx.ellipse(
          flowerX + Math.cos(angle) * size * 0.5,
          flowerY + Math.sin(angle) * size * 0.5,
          size,
          size * 0.4,
          angle,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `hsla(${flowerColor.h}, ${flowerColor.s}%, ${flowerColor.b}%, 0.9)`;
        ctx.fill();
      });
  
      // Draw flower center
      ctx.beginPath();
      ctx.arc(flowerX, flowerY, 4 * this.growth, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${flowerColor.h}, ${flowerColor.s - 10}%, ${flowerColor.b - 20}%, 0.9)`;
      ctx.fill();
    }
  }
  
  class MossPatch {
    private points: Array<{
      x: number;
      y: number;
      size: number;
      color: typeof ColorSystem.vegetation.grass;
    }> = [];
  
    constructor(private x: number, private y: number, private size: number) {
      const pointCount = Math.floor(size / 2);
      for (let i = 0; i < pointCount; i++) {
        this.points.push({
          x: Math.random() * size - size/2,
          y: Math.random() * size/3 - size/6,
          size: 2 + Math.random() * 3,
          color: {
            h: 100 + Math.random() * 40,
            s: 35 + Math.random() * 20,
            b: 35 + Math.random() * 15
          }
        });
      }
    }
  
    draw(ctx: CanvasRenderingContext2D, time: number) {
      this.points.forEach(point => {
        const wobble = Math.sin(time * 2 + point.x * 0.1) * 1;
        
        ctx.beginPath();
        ctx.arc(
          this.x + point.x,
          this.y + point.y + wobble,
          point.size,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `hsla(${point.color.h}, ${point.color.s}%, ${point.color.b}%, 0.6)`;
        ctx.fill();
      });
    }
  }