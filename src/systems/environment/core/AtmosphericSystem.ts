import { createNoise2D, createNoise3D } from "simplex-noise";
import { ColorSystem, ColorBridge } from "../utils/colors";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocity: { x: number; y: number };
  life: number;
  maxLife: number;
  color: { h: number; s: number; b: number };
}

export class AtmosphericSystem {
  private noise2D: ReturnType<typeof createNoise2D>;
  private noise3D: ReturnType<typeof createNoise3D>;
  private particles: Particle[] = [];
  private windField: number[][] = [];
  private timeOffset: number = Math.random() * 1000;
  
  constructor(
    private width: number,
    private height: number,
    private baseY: number
  ) {
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.initializeWindField();
  }

  private initializeWindField() {
    // Create a grid of wind vectors
    const resolution = 20;
    const cols = Math.ceil(this.width / resolution);
    const rows = Math.ceil(this.height / resolution);

    for (let y = 0; y < rows; y++) {
      this.windField[y] = [];
      for (let x = 0; x < cols; x++) {
        // Initialize with base wind direction
        this.windField[y][x] = this.noise2D(x * 0.1, y * 0.1);
      }
    }
  }

  private updateWindField(time: number) {
    const resolution = 20;
    const cols = Math.ceil(this.width / resolution);
    const rows = Math.ceil(this.height / resolution);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Create evolving wind patterns using 3D noise
        this.windField[y][x] = this.noise3D(
          x * 0.1,
          y * 0.1,
          time * 0.1 + this.timeOffset
        );
      }
    }
  }

  private getWindForce(x: number, y: number): { x: number; y: number } {
    const resolution = 20;
    const col = Math.floor(x / resolution);
    const row = Math.floor(y / resolution);
    
    // Get wind value from field, with bounds checking
    const windValue = this.windField[row]?.[col] ?? 0;
    
    // Convert noise value to wind vector
    return {
      x: Math.cos(windValue * Math.PI * 2) * 0.5,
      y: Math.sin(windValue * Math.PI * 2) * 0.2 // Less vertical movement
    };
  }

  private createMistParticle(): Particle {
    const y = this.baseY - Math.random() * 100;
    return {
      x: Math.random() * this.width,
      y,
      size: 20 + Math.random() * 40,
      opacity: 0.02 + Math.random() * 0.08,
      velocity: { x: 0, y: -0.1 - Math.random() * 0.2 },
      life: 0,
      maxLife: 300 + Math.random() * 300,
      color: {
        h: 200 + Math.random() * 20,
        s: 20 + Math.random() * 20,
        b: 95 + Math.random() * 5
      }
    };
  }

  private createAtmosphericParticle(time: number): Particle {
    const timeOfDay = (Math.sin(time * 0.1) + 1) / 2;
    const isDay = timeOfDay > 0.3 && timeOfDay < 0.7;
    
    if (isDay) {
      // Create dust particles during day
      return {
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.6,
        size: 2 + Math.random() * 4,
        opacity: 0.1 + Math.random() * 0.2,
        velocity: { x: 0, y: -0.05 - Math.random() * 0.1 },
        life: 0,
        maxLife: 400 + Math.random() * 200,
        color: {
          h: 40 + Math.random() * 20,
          s: 30 + Math.random() * 20,
          b: 90 + Math.random() * 10
        }
      };
    } else {
      // Create firefly-like particles during night
      return {
        x: Math.random() * this.width,
        y: this.baseY - Math.random() * 100,
        size: 3 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.3,
        velocity: { x: 0, y: 0 },
        life: 0,
        maxLife: 200 + Math.random() * 100,
        color: {
          h: 60,
          s: 100,
          b: 100
        }
      };
    }
  }

  update(time: number) {
    // Update wind patterns
    this.updateWindField(time);

    // Add new particles
    if (Math.random() < 0.3) {
      if (Math.random() < 0.7) {
        this.particles.push(this.createMistParticle());
      } else {
        this.particles.push(this.createAtmosphericParticle(time));
      }
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update life
      particle.life++;
      if (particle.life >= particle.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      // Apply wind forces
      const wind = this.getWindForce(particle.x, particle.y);
      particle.velocity.x += wind.x * 0.1;
      particle.velocity.y += wind.y * 0.1;

      // Apply velocity
      particle.x += particle.velocity.x;
      particle.y += particle.velocity.y;

      // Fade based on life
      const lifeProgress = particle.life / particle.maxLife;
      particle.opacity *= (1 - lifeProgress * 0.1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();

    // Use different blend modes for different effects
    ctx.globalCompositeOperation = 'screen';

    this.particles.forEach(particle => {
      const { x, y, size, opacity, color } = particle;
      
      // Skip particles outside view
      if (x < -size || x > this.width + size || y < -size || y > this.height + size) {
        return;
      }

      // Create gradient for particle
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.b}%, ${opacity})`);
      gradient.addColorStop(1, `hsla(${color.h}, ${color.s}%, ${color.b}%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}