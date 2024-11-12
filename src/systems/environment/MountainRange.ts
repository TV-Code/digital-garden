import { createNoise2D, createNoise3D } from "simplex-noise";
import { ColorSystem, ColorBridge } from "../../utils/colors";

interface HSLColor {
  h: number;
  s: number;
  b: number;
}

interface MountainColors {
  shadow: HSLColor;
  midtone: HSLColor;
  highlight: HSLColor;
  base?: HSLColor;  // Optional for backward compatibility
}

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

interface MountainProfile {
  points: Vector2[];
  ridges: Vector2[][];
  facets: Vector2[][];
}

export class MountainRange {
  private noise2D: ReturnType<typeof createNoise2D>;
  private noise3D: ReturnType<typeof createNoise3D>;
  private features: MountainFeature[] = [];
  private snowCaps: Path2D[] = [];
  private rockDetails: Path2D[] = [];
  private mainProfile: MountainProfile;  // Changed from Vector2[] to MountainProfile
  
  constructor(
    private baseHeight: number,
    private baseWidth: number,
    private complexity: number = 1,
    private position: { x: number; angle: number } = { x: 0, angle: 0 }
  ) {
    this.noise2D = createNoise2D();
    this.noise3D = createNoise3D();
    this.features = [];
    this.snowCaps = [];
    this.rockDetails = [];

    try {
        // Generate mountain profile
        this.mainProfile = this.generateEnhancedMountainProfile();
        
        // Generate mountain features
        if (this.mainProfile && this.mainProfile.points.length > 0) {
            this.generateMountainGeometry();
        } else {
            console.warn('Failed to generate mountain profile');
        }
    } catch (error) {
        console.error('Error generating mountain:', error);
        // Initialize with empty profile as fallback
        this.mainProfile = {
            points: [],
            ridges: [],
            facets: []
        };
    }
}

  // Add helper method for control points
  private getControlPoint(p1: Vector2, p2: Vector2): Vector2 {
    const mid = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
    
    // Add controlled randomness for natural curves
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const noise = this.noise2D(mid.x * 0.01, mid.y * 0.01) * distance * 0.2;
    
    return {
      x: mid.x + Math.cos(angle + Math.PI/2) * noise,
      y: mid.y + Math.sin(angle + Math.PI/2) * noise * 0.5
    };
  }

  private generateMountainGeometry() {
    // Generate features using the enhanced profile
    this.generateRidgeLines(this.mainProfile.points);
    this.generateCliffs(this.mainProfile.points);
    this.generateSnowCaps(this.mainProfile.points);
    this.generateRockDetail(this.mainProfile.points);
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, colors: MountainColors) {
    ctx.save();
    
    // Calculate base position with enhanced positioning
    const centerX = width * (0.5 + this.position.x * 0.5);
    const baseY = height * 0.7;
    
    // Transform for mountain drawing
    ctx.translate(centerX, baseY);
    ctx.rotate(this.position.angle);
    ctx.translate(-this.baseWidth / 2, 0);
    
    // Draw main mountain profile with enhanced effects
    this.drawMountainProfile(ctx, this.mainProfile, colors, performance.now());

    // Draw additional features
    this.features.forEach(feature => {
        const gradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
        const { h, s, b } = colors.midtone;
        
        // Enhanced gradient with more dramatic color transitions
        gradient.addColorStop(0, `hsla(${h}, ${s}%, ${b + 15}%, 1)`);
        gradient.addColorStop(0.3, `hsla(${h}, ${s}%, ${b + 5}%, 1)`);
        gradient.addColorStop(0.6, `hsla(${h}, ${s}%, ${b}%, 1)`);
        gradient.addColorStop(1, `hsla(${h}, ${s}%, ${Math.max(0, b - 15)}%, 1)`);
        
        ctx.fillStyle = gradient;
        ctx.fill(feature.path);
    });

    // Enhanced rock detail rendering
    ctx.globalCompositeOperation = 'multiply';
    this.rockDetails.forEach(detail => {
        const { h, s, b } = colors.shadow;
        ctx.strokeStyle = `hsla(${h}, ${s}%, ${b}%, 0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke(detail);
    });
    ctx.globalCompositeOperation = 'source-over';

    // Enhanced snow caps with improved lighting
    this.snowCaps.forEach(snow => {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 15;
        
        const snowGradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
        snowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        snowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
        snowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)');
        
        ctx.fillStyle = snowGradient;
        ctx.fill(snow);
        ctx.restore();
    });

    ctx.restore();
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

  private generateEnhancedMountainProfile(): MountainProfile {
    // Generate base points
    const basePoints: Vector2[] = [];
    const segments = 200; // High detail

    // First generate the base mountain points
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let height = 0;

        // Combine multiple frequencies for natural detail
        for (let freq = 1; freq <= 5; freq++) {
            const amplitude = 1 / Math.pow(freq, 1.1); // Less falloff for more drama
            height += this.noise2D(t * freq * this.complexity, freq) * amplitude;
        }

        // Add dramatic peaks
        const peakInfluence = Math.sin(t * Math.PI * 4) * 0.3;
        height = Math.pow(height * 1.5 + peakInfluence, 1.4);
        height *= this.getEnvelope(t);
        
        basePoints.push({ 
            x: t * this.baseWidth,
            y: -height * this.baseHeight
        });
    }

    // Generate ridges using base points as reference
    const ridges: Vector2[][] = [];
    const ridgeCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < ridgeCount; i++) {
        const ridge: Vector2[] = [];
        const ridgeOffset = (Math.random() - 0.5) * this.baseHeight * 0.3;
        
        // Sample points from base profile for ridge
        for (let j = 0; j < basePoints.length; j += 3) {
            const basePoint = basePoints[j];
            const noise = this.noise2D(basePoint.x * 0.02, i) * this.baseHeight * 0.1;
            ridge.push({
                x: basePoint.x + (Math.random() - 0.5) * this.baseWidth * 0.1,
                y: basePoint.y + ridgeOffset + noise
            });
        }
        ridges.push(ridge);
    }

    // Generate facets for dramatic lighting
    const facets: Vector2[][] = [];
    const facetCount = 5 + Math.floor(Math.random() * 5);

    for (let i = 0; i < facetCount; i++) {
        const startIndex = Math.floor(Math.random() * (basePoints.length - 20));
        const length = Math.floor(10 + Math.random() * 20);
        const facet: Vector2[] = [];

        // Create facet points
        for (let j = 0; j < length; j++) {
            const basePoint = basePoints[startIndex + j];
            if (!basePoint) continue;  // Skip if point doesn't exist

            const noise = this.noise2D(basePoint.x * 0.1, basePoint.y * 0.1) * this.baseHeight * 0.15;
            facet.push({
                x: basePoint.x,
                y: basePoint.y + noise
            });
        }

        if (facet.length > 0) {  // Only add facet if it has points
            facets.push(facet);
        }
    }

    // Return complete mountain profile
    return {
        points: basePoints,
        ridges: ridges,
        facets: facets
    };
}

private generateCliffs(profile: Vector2[]) {
  if (!profile.length) return;
  
  const cliffCount = Math.floor(2 + Math.random() * 3);
  
  for (let i = 0; i < cliffCount; i++) {
      const cliffSegment = new Path2D();
      const startIndex = Math.floor(Math.random() * (profile.length - 20));
      const length = Math.floor(10 + Math.random() * 20);
      
      // Skip if we'd go past the end of the profile
      if (startIndex + length >= profile.length) continue;

      // Start cliff path
      const startPoint = profile[startIndex];
      cliffSegment.moveTo(startPoint.x, startPoint.y);

      // Generate jagged cliff face with enhanced detail
      for (let j = 1; j < length; j++) {
          const t = j / length;
          const point = profile[startIndex + j];
          
          // Create more dramatic jags and overhangs
          const baseJag = this.noise2D(point.x * 0.1, point.y * 0.1) * 30;
          const overhang = Math.sin(t * Math.PI) * 20 * this.noise2D(point.x * 0.2, t);
          
          // Add micro-detail
          const microDetail = this.noise3D(
              point.x * 0.5,
              point.y * 0.5,
              t
          ) * 10;

          const finalX = point.x + baseJag + overhang + microDetail;
          const finalY = point.y + this.noise2D(point.x * 0.3, t) * 15;

          // Control points for smoother curves
          const prevPoint = profile[startIndex + j - 1];
          const ctrlX = (prevPoint.x + finalX) / 2;
          const ctrlY = prevPoint.y + (finalY - prevPoint.y) * 0.5;

          cliffSegment.quadraticCurveTo(ctrlX, ctrlY, finalX, finalY);
      }

      // Add cliff to features
      this.features.push({
          path: cliffSegment,
          type: 'cliff',
          depth: 0.2 + Math.random() * 0.3, // Variable depth for more drama
          color: null
      });

      // Add optional ledges near the cliff
      if (Math.random() < 0.7) {
          this.generateLedgesNearCliff(profile, startIndex, length);
      }
  }
}

private generateLedgesNearCliff(profile: Vector2[], startIndex: number, length: number) {
  const ledgeCount = 1 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < ledgeCount; i++) {
      const ledgePath = new Path2D();
      const ledgeStart = startIndex + Math.floor(Math.random() * length);
      const ledgeLength = 5 + Math.floor(Math.random() * 10);
      
      if (ledgeStart + ledgeLength >= profile.length) continue;
      
      const startPoint = profile[ledgeStart];
      ledgePath.moveTo(startPoint.x, startPoint.y);
      
      // Create a protruding ledge
      for (let j = 1; j < ledgeLength; j++) {
          const t = j / ledgeLength;
          const point = profile[ledgeStart + j];
          
          // Create ledge protrusion
          const protrusion = Math.sin(t * Math.PI) * 25;
          const verticalShift = Math.sin(t * Math.PI) * 10;
          
          const x = point.x + protrusion + this.noise2D(point.x * 0.2, t) * 10;
          const y = point.y + verticalShift + this.noise2D(point.y * 0.2, t) * 5;
          
          ledgePath.lineTo(x, y);
      }
      
      this.features.push({
          path: ledgePath,
          type: 'ledge',
          depth: 0.15 + Math.random() * 0.15,
          color: null
      });
  }
}


private drawMountainProfile(
  ctx: CanvasRenderingContext2D,
  profile: MountainProfile,
  colors: MountainColors,
  time: number
) {
  ctx.save();

  // Draw main silhouette with gradient
  const gradient = ctx.createLinearGradient(0, -this.baseHeight, 0, 0);
  gradient.addColorStop(0, `hsla(${colors.highlight.h}, ${colors.highlight.s}%, ${colors.highlight.b}%, 1)`);
  gradient.addColorStop(0.4, `hsla(${colors.midtone.h}, ${colors.midtone.s}%, ${colors.midtone.b}%, 1)`);
  gradient.addColorStop(1, `hsla(${colors.shadow.h}, ${colors.shadow.s}%, ${colors.shadow.b}%, 1)`);

  // Draw silhouette
  ctx.beginPath();
  profile.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else {
          const prev = profile.points[i - 1];
          const cp = this.getControlPoint(prev, point);
          ctx.quadraticCurveTo(cp.x, cp.y, point.x, point.y);
      }
  });
  ctx.lineTo(profile.points[profile.points.length - 1].x, 0);
  ctx.lineTo(profile.points[0].x, 0);
  ctx.closePath();
  
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw ridge lines with subtle animation
  ctx.globalAlpha = 0.3;
  profile.ridges.forEach(ridge => {
      ctx.beginPath();
      ridge.forEach((point, i) => {
          const offset = Math.sin(time * 0.001 + i * 0.1) * 2;
          if (i === 0) ctx.moveTo(point.x, point.y + offset);
          else ctx.lineTo(point.x, point.y + offset);
      });
      ctx.strokeStyle = `hsla(${colors.shadow.h}, ${colors.shadow.s}%, ${colors.shadow.b}%, 0.3)`;
      ctx.stroke();
  });

  // Draw facets for dramatic lighting
  ctx.globalAlpha = 0.15;
  profile.facets.forEach(facet => {
      ctx.beginPath();
      facet.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = `hsla(${colors.highlight.h}, ${colors.highlight.s}%, ${colors.highlight.b}%, 0.5)`;
      ctx.stroke();
  });

  ctx.restore();
}

}