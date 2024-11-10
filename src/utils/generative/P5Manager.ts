import p5 from 'p5';
import { LSystem, PLANT_CONFIGS } from './l-system';
import { createNoise2D } from 'simplex-noise';

export class P5Manager {
  private p: p5;
  private noise2D = createNoise2D();
  private plants: Array<{
    lSystem: LSystem;
    position: [number, number];
    growth: number;
    color: string;
  }> = [];

  constructor(p: p5) {
    this.p = p;
    this.setupP5();
  }

  private setupP5() {
    this.p.colorMode(this.p.HSB, 360, 100, 100, 1);
    this.p.angleMode(this.p.RADIANS);
  }

  addPlant(x: number, y: number, type: keyof typeof PLANT_CONFIGS = 'simpleBush') {
    const lSystem = new LSystem(PLANT_CONFIGS[type]);
    const color = `hsl(${120 + Math.random() * 40}, 60%, 50%)`;
    
    this.plants.push({
      lSystem,
      position: [x, y],
      growth: 0,
      color
    });
  }

  draw() {
    // Update and draw each plant
    this.plants.forEach(plant => {
      if (plant.growth < 1) {
        plant.growth += 0.01;
      }

      this.drawPlant(plant);
    });

    // Draw environment effects
    this.drawEnvironmentEffects();
  }

  private drawPlant(plant: typeof this.plants[0]) {
    const { lSystem, position, growth, color } = plant;
    const points = lSystem.getPoints();

    this.p.push();
    this.p.translate(position[0], position[1]);
    this.p.stroke(color);
    this.p.noFill();

    // Draw branches
    this.p.beginShape();
    for (let i = 0; i < points.length * growth; i += 2) {
      if (i + 1 >= points.length) break;
      
      const start = points[i];
      const end = points[i + 1];
      
      // Add some noise to the line
      const noise = this.noise2D(i * 0.1, growth) * 5;
      
      this.p.vertex(
        start[0] + noise,
        start[1] + noise
      );
      this.p.vertex(
        end[0] + noise,
        end[1] + noise
      );
    }
    this.p.endShape();

    this.p.pop();
  }

  private drawEnvironmentEffects() {
    // Add ambient particles
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.p.width;
      const y = Math.random() * this.p.height;
      const size = Math.random() * 3;
      
      this.p.fill(255, 0.1);
      this.p.noStroke();
      this.p.circle(x, y, size);
    }
  }

  createGradientBackground(
    colorStart: string,
    colorEnd: string
  ) {
    const c1 = this.p.color(colorStart);
    const c2 = this.p.color(colorEnd);

    for (let y = 0; y < this.p.height; y++) {
      const inter = y / this.p.height;
      const c = this.p.lerpColor(c1, c2, inter);
      this.p.stroke(c);
      this.p.line(0, y, this.p.width, y);
    }
  }
}

export const createP5Instance = (
  container: HTMLElement,
  manager: P5Manager
) => {
  new p5((p: p5) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight);
    };

    p.draw = () => {
      manager.draw();
    };

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight);
    };
  }, container);
};