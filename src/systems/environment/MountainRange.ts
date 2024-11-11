import { createNoise2D, createNoise3D } from "simplex-noise";
import { ColorSystem, ColorBridge } from "../../utils/colors";

interface Vector2 {
  x: number;
  y: number;
}

interface MountainFeature {
  path: Path2D;
  type: 'ridge' | 'crag' | 'cliff' | 'ledge';
  depth: number;
  color: any;
}

export class MountainRange {
  private noise2D: ReturnType<typeof createNoise2D>;
  private noise3D: ReturnType<typeof createNoise3D>;
  private features: MountainFeature[] = [];
  private snowCaps: Path2D[] = [];
  private rockDetails: Path2D[] = [];
  private mainProfile: Vector2[] = [];
  
  constructor(
    private baseHeight: number,
    private baseWidth: number,
    private complexity: number = 1,
    private position: { x: number; angle: number } = { x: 0, angle: 0 }
  ) {
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.mainProfile = this.generateMountainProfile();
    this.generateMountainGeometry();
  }

  private generateMountainProfile(): Vector2[] {
    const points: Vector2[] = [];
    const segments = 200; // High detail

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let height = 0;

      // Combine multiple noise frequencies for natural detail
      for (let freq = 1; freq <= 5; freq++) {
        const amplitude = 1 / Math.pow(freq, 1.2);
        height += this.noise2D(t * freq * this.complexity, freq) * amplitude;
      }

      // Shape the profile
      height = Math.pow(height * 1.5, 1.3); // More dramatic peaks
      height *= this.getEnvelope(t); // Natural falloff at edges
      
      points.push({ 
        x: t * this.baseWidth,
        y: -height * this.baseHeight
      });
    }

    return points;
  }

  private generateMountainGeometry() {
    // Generate each feature using the main profile
    this.generateRidgeLines(this.mainProfile);
    this.generateCliffs(this.mainProfile);
    this.generateSnowCaps(this.mainProfile);
    this.generateRockDetail(this.mainProfile);
  }

  private generateCliffs(profile: Vector2[]) {
    if (!profile.length) return;
    
    const cliffCount = Math.floor(2 + Math.random() * 3);
    
    for (let i = 0; i < cliffCount; i++) {
      const cliff = new Path2D();
      const startIndex = Math.floor(Math.random() * (profile.length - 20));
      const length = Math.floor(10 + Math.random() * 20);
      
      if (startIndex + length >= profile.length) continue;

      // Generate jagged cliff face
      for (let j = 0; j < length; j++) {
        const point = profile[startIndex + j];
        if (!point) continue;
        
        const jag = this.noise2D(point.x * 0.1, point.y * 0.1) * 30;
        
        if (j === 0) cliff.moveTo(point.x, point.y);
        else cliff.lineTo(point.x + jag, point.y);
      }
      
      this.features.push({
        path: cliff,
        type: 'cliff',
        depth: 0.2,
        color: null
      });
    }
  }

  private getEnvelope(t: number): number {
    // Custom envelope function for more natural mountain shapes
    const base = Math.sin(t * Math.PI);
    const peak = Math.pow(1 - Math.abs(t - 0.5) * 2, 2);
    return base * 0.7 + peak * 0.3;
  }

  private generateRidgeLines(profile: Vector2[]) {
    // Generate main ridge
    const mainRidge = new Path2D();
    profile.forEach((point, i) => {
      if (i === 0) mainRidge.moveTo(point.x, point.y);
      else {
        const ctrl = this.getRidgeControl(profile[i - 1], point);
        mainRidge.quadraticCurveTo(ctrl.x, ctrl.y, point.x, point.y);
      }
    });

    // Generate sub-ridges
    const subRidges: Path2D[] = [];
    const ridgeCount = Math.floor(3 + Math.random() * 3);
    
    for (let i = 0; i < ridgeCount; i++) {
      const ridge = new Path2D();
      const offset = (Math.random() - 0.5) * 50;
      
      profile.forEach((point, j) => {
        if (j === 0) ridge.moveTo(point.x + offset, point.y + offset * 0.5);
        else {
          const ctrl = this.getRidgeControl(profile[j - 1], point);
          ridge.quadraticCurveTo(
            ctrl.x + offset,
            ctrl.y + offset * 0.5,
            point.x + offset,
            point.y + offset * 0.5
          );
        }
      });
      
      subRidges.push(ridge);
    }

    this.features.push(
      { path: mainRidge, type: 'ridge', depth: 0, color: null },
      ...subRidges.map(path => ({ path, type: 'ridge' as const, depth: 0.1, color: null }))
    );
  }

  private getRidgeControl(p1: Vector2, p2: Vector2): Vector2 {
    const mid = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
    
    // Add some randomness to control points for more natural curves
    const noise = this.noise2D(mid.x * 0.01, mid.y * 0.01) * 20;
    
    return {
      x: mid.x + noise,
      y: mid.y + noise * 0.5
    };
  }

  private generateSnowCaps(profile: Vector2[]) {
    const snowLine = Math.min(...profile.map(p => p.y)) + this.baseHeight * 0.2;
    const snow = new Path2D();
    let inSnow = false;
    let snowStart: Vector2 | null = null;
    
    profile.forEach((point, i) => {
      if (point.y < snowLine && !inSnow) {
        inSnow = true;
        snowStart = point;
        snow.moveTo(point.x, point.y);
      } else if (point.y < snowLine) {
        const noise = this.noise2D(point.x * 0.05, point.y * 0.05) * 10;
        snow.lineTo(point.x, point.y + noise);
      } else if (inSnow) {
        inSnow = false;
        if (snowStart) {
          snow.lineTo(point.x, snowLine);
          snow.lineTo(snowStart.x, snowLine);
          snow.closePath();
        }
      }
    });

    this.snowCaps.push(snow);
  }

  private generateRockDetail(profile: Vector2[]) {
    const segmentCount = Math.floor(20 + Math.random() * 20);
    
    for (let i = 0; i < segmentCount; i++) {
      const detail = new Path2D();
      const startIndex = Math.floor(Math.random() * (profile.length - 5));
      
      // Generate rock face detail
      detail.moveTo(profile[startIndex].x, profile[startIndex].y);
      
      for (let j = 1; j < 5; j++) {
        const point = profile[startIndex + j];
        const noise = this.noise3D(
          point.x * 0.1,
          point.y * 0.1,
          i * 0.5
        ) * 15;
        
        detail.lineTo(
          point.x + noise,
          point.y + noise * 0.5
        );
      }
      
      this.rockDetails.push(detail);
    }
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, colors: any) {
    ctx.save();
    
    // Calculate base position - move away from sides
    const centerX = width * (0.5 + this.position.x * 0.5); // Reduce spread
    const baseY = height * 0.7; // Move mountains up
    
    // Transform for mountain drawing
    ctx.translate(centerX, baseY);
    ctx.rotate(this.position.angle);
    ctx.scale(1, 1); // Adjust scale for better proportions
    
    // Draw mountains relative to their center
    ctx.translate(-this.baseWidth / 2, 0);
    
    // Draw features with adjusted gradient
    this.features.forEach(feature => {
        const gradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
        const baseColor = colors.base;
        
        gradient.addColorStop(0, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b + 15}%, 1)`);
        gradient.addColorStop(0.5, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b}%, 1)`);
        gradient.addColorStop(1, `hsla(${baseColor.h}, ${baseColor.s}%, ${baseColor.b - 10}%, 1)`);
        
        ctx.fillStyle = gradient;
        ctx.fill(feature.path);
    });

    // Draw rock details
    this.rockDetails.forEach(detail => {
        ctx.strokeStyle = `hsla(${colors.shadow.h}, ${colors.shadow.s}%, ${colors.shadow.b}%, 0.2)`;
        ctx.lineWidth = 1;
        ctx.stroke(detail);
    });

    // Draw snow caps
    this.snowCaps.forEach(snow => {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 10;
        
        const snowGradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
        snowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        snowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
        
        ctx.fillStyle = snowGradient;
        ctx.fill(snow);
        
        ctx.shadowBlur = 0;
    });

    ctx.restore();
}

}