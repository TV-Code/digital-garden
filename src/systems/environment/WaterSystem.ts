import { createNoise2D } from "simplex-noise";

export class WaterSystem {
  private noise: ReturnType<typeof createNoise2D>;
  private ripples: Array<{
    x: number;
    y: number;
    radius: number;
    strength: number;
    maxRadius: number;
    age: number;
  }> = [];

  private reflectionBuffer: OffscreenCanvas;
  private reflectionCtx: OffscreenCanvasRenderingContext2D;
  private causticPattern: OffscreenCanvas;

  private waterHeight: number;

  constructor(
    private baseY: number,
    private width: number,
    private canvasHeight: number
  ) {
    this.noise = createNoise2D();

    // Calculate the height of the water area
    this.waterHeight = this.canvasHeight - this.baseY;

    // Ensure width and height are valid unsigned integers
    const canvasWidth = Math.max(1, Math.ceil(this.width));
    const waterCanvasHeight = Math.max(1, Math.ceil(this.waterHeight));

    // Initialize reflection buffer
    this.reflectionBuffer = new OffscreenCanvas(
      canvasWidth,
      waterCanvasHeight
    );
    this.reflectionCtx = this.reflectionBuffer.getContext("2d")!;

    // Generate caustic pattern
    this.causticPattern = this.generateCausticPattern();
  }

  private generateCausticPattern(): OffscreenCanvas {
    const size = 256;
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d")!;

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 10 + Math.random() * 20;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  draw(ctx: CanvasRenderingContext2D, time: number, scene: () => void) {
    // 1. Draw base water with gradient
    this.drawBaseWater(ctx);

    // // 2. Apply underwater caustics
    // this.drawCaustics(ctx, time);

    // // 3. Draw reflections
    // this.drawReflections(ctx, time, scene);

    // // 4. Draw surface details
    // this.drawSurfaceDetails(ctx, time);

    // // 5. Draw ripples and waves
    // this.updateAndDrawRipples(ctx, time);
  }

  private drawBaseWater(ctx: CanvasRenderingContext2D) {
    ctx.save(); // Save context state
    const gradient = ctx.createLinearGradient(
      0,
      this.baseY,
      0,
      this.canvasHeight
    );

    // Use alpha of 1 for opaque water
    gradient.addColorStop(0, `hsla(185, 65%, 65%, 1)`);
    gradient.addColorStop(0.3, `hsla(185, 70%, 55%, 1)`);
    gradient.addColorStop(0.7, `hsla(190, 75%, 45%, 1)`);
    gradient.addColorStop(1, `hsla(195, 80%, 35%, 1)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.baseY, this.width, this.waterHeight);
    ctx.restore(); // Restore context state
  }

  private drawCaustics(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save(); // Save context state
    const scale = 1.5;
    const speed = time * 0.5;

    // Create moving caustics effect
    ctx.globalAlpha = 0.1;
    ctx.globalCompositeOperation = "overlay";

    for (let i = 0; i < 2; i++) {
      ctx.setTransform(
        scale,
        0,
        0,
        scale,
        Math.sin(speed + i) * 50,
        this.baseY + Math.cos(speed + i) * 50
      );

      ctx.drawImage(this.causticPattern, 0, 0);
    }

    // Reset transformations and properties
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore(); // Restore context state
  }

  private drawReflections(
    ctx: CanvasRenderingContext2D,
    time: number,
    scene: () => void
  ) {
    // Clear reflection buffer
    this.reflectionCtx.clearRect(
      0,
      0,
      this.reflectionBuffer.width,
      this.reflectionBuffer.height
    );

    // Draw reflected scene
    this.reflectionCtx.save();
    this.reflectionCtx.translate(0, this.waterHeight);
    this.reflectionCtx.scale(1, -1);
    scene();
    this.reflectionCtx.restore();

    // Apply wave distortion to reflection
    ctx.save(); // Save context state
    ctx.globalAlpha = 0.3;
    ctx.globalCompositeOperation = "source-over"; // Ensure default composite operation

    const waveHeight = 2;

    for (let x = 0; x < this.width; x += 2) {
      const distortion = this.noise(x * 0.01, time * 0.1) * waveHeight;

      ctx.drawImage(
        this.reflectionBuffer,
        x,
        0,
        2,
        this.waterHeight,
        x,
        this.baseY + distortion,
        2,
        this.waterHeight
      );
    }

    // Reset properties if needed (though ctx.restore() will handle it)
    ctx.globalAlpha = 1;
    ctx.restore(); // Restore context state
  }

  private drawSurfaceDetails(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save(); // Save context state
    // Draw subtle surface movement
    ctx.strokeStyle = `hsla(185, 40%, 80%, 0.1)`;
    ctx.lineWidth = 1;

    for (let x = 0; x < this.width; x += 20) {
      const y1 = this.baseY + this.noise(x * 0.005, time * 0.1) * 3;
      const y2 = this.baseY + this.noise((x + 10) * 0.005, time * 0.1) * 3;

      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x + 10, y2);
      ctx.stroke();
    }

    ctx.restore(); // Restore context state
  }

  private updateAndDrawRipples(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save(); // Save context state
    // Update existing ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.radius += 0.5;
      ripple.age += 1;
      ripple.strength = Math.max(0, 1 - ripple.age / 60) * 0.3;

      if (ripple.age > 60) {
        this.ripples.splice(i, 1);
        continue;
      }

      // Draw ripple with sophisticated effect
      ctx.save();
      ctx.strokeStyle = `hsla(185, 40%, 80%, ${ripple.strength})`;
      ctx.lineWidth = 1;

      const wobble = 8;
      const segments = 40;

      ctx.beginPath();
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const wobbleAmount =
          this.noise(
            Math.cos(angle) * ripple.radius * 0.1 + time * 0.1,
            Math.sin(angle) * ripple.radius * 0.1 + time * 0.1
          ) * wobble;
        const x =
          ripple.x + Math.cos(angle) * (ripple.radius + wobbleAmount);
        const y =
          ripple.y + Math.sin(angle) * (ripple.radius + wobbleAmount);

        if (j === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore(); // Restore context state for each ripple
    }

    ctx.restore(); // Restore context state

    // Add random ripples
    if (Math.random() < 0.03) {
      this.addRipple(
        Math.random() * this.width,
        this.baseY + Math.random() * this.waterHeight * 0.3
      );
    }
  }

  addRipple(x: number, y: number) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      strength: 0.5,
      maxRadius: 30 + Math.random() * 20,
      age: 0,
    });
  }
}
