import React from 'react';
import { ReactP5Wrapper } from "react-p5-wrapper";
import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D();

function sketch(p5) {
  let time = 0;
  const plants = [];
  let ripples = [];
  let grassBlades = [];

  // Enhanced color palette inspired by macOS Big Sur
  const colors = {
    sky: {
      top: '#FF5F6D',    // Coral
      bottom: '#FFC371'  // Light orange
    },
    mountains: {
      back: '#355C7D',   // Dark blue
      mid: '#6C5B7B',    // Purple
      front: '#C06C84'   // Pink
    },
    ground: '#E29578',   // Reddish clay
    pond: {
      top: '#89CFF0',    // Baby blue
      bottom: '#136F63', // Deep teal
      reflectionOpacity: 0.5
    },
    plants: {
      stem: '#355C7D',   // Dark blue
      grass: '#E29578',  // Reddish clay for grass
      flower1: ['#FF6B6B', '#FF8787', '#FFA5A5'],  // Coral variations
      flower2: ['#74B9FF', '#6AABE1', '#5E9BD1'],  // Blue variations
      flower3: ['#FFEAA7', '#FFE083', '#FFD66E'],  // Yellow variations
      leaf: '#6C5B7B'    // Purple
    }
  };

  // Helper function to darken a color
  function darkenColor(col, amount) {
    const c = p5.color(col);
    return p5.lerpColor(c, p5.color(0, 0, 0), amount).toString('#rrggbb');
  }

  class Plant {
    constructor(x, y, type = 'default') {
      this.x = x;
      this.y = y;
      this.type = type;
      this.growthProgress = 0;
      this.maxHeight = p5.random(50, 100);
      this.swayAmount = p5.random(0.5, 2);
      this.growthSpeed = p5.random(0.001, 0.003);
      this.flowerSize = p5.random(10, 20);
      this.stemSegments = [];
      this.flowerColors = this.selectFlowerColors();
      this.rotationOffset = p5.random(p5.TWO_PI);
      this.petalCount = this.type === 'daisy' ? 8 : 6;
      this.hasLeaves = Math.random() > 0.5;
    }

    selectFlowerColors() {
      switch (this.type) {
        case 'daisy':
          return colors.plants.flower1;
        case 'bellflower':
          return colors.plants.flower2;
        default:
          return p5.random([
            colors.plants.flower1,
            colors.plants.flower2,
            colors.plants.flower3
          ]);
      }
    }

    grow() {
      if (this.growthProgress < 1) {
        this.growthProgress += this.growthSpeed;

        // Generate stem with more natural curve
        this.stemSegments = [];
        const segments = 15;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const noiseOffset = noise2D(t * 2 + this.x * 0.01, time * 0.1) * this.swayAmount;
          const stemCurve = Math.sin(t * Math.PI) * 10; // Natural curve

          this.stemSegments.push({
            x: this.x + noiseOffset * 20 + stemCurve,
            y: this.y - t * this.maxHeight * this.growthProgress
          });
        }
      }
    }

    drawPetals(x, y, size) {
      p5.push();
      p5.translate(x, y);

      switch (this.type) {
        case 'daisy':
          // Draw daisy petals
          for (let i = 0; i < this.petalCount; i++) {
            const angle = (i / this.petalCount) * p5.TWO_PI + this.rotationOffset + time * 0.2;
            const petalSize = size * this.growthProgress;
            p5.fill(this.flowerColors[0]);
            p5.noStroke();
            p5.ellipse(
              p5.cos(angle) * petalSize,
              p5.sin(angle) * petalSize,
              petalSize * 1.2,
              petalSize * 0.6
            );
          }
          // Draw center
          p5.fill(this.flowerColors[2]);
          p5.noStroke();
          p5.ellipse(0, 0, size * 0.7);
          break;

        case 'bellflower':
          // Draw bell-shaped flower
          p5.fill(this.flowerColors[0]);
          p5.noStroke();
          p5.beginShape();
          for (let angle = 0; angle < p5.TWO_PI; angle += 0.1) {
            const r = size * (1 + Math.sin(angle * 3 + time)) * 0.2;
            const x = p5.cos(angle) * r;
            const y = p5.sin(angle) * r + size * 0.5;
            p5.vertex(x, y);
          }
          p5.endShape(p5.CLOSE);
          break;

        default:
          // Draw stylized flower
          p5.stroke(this.flowerColors[1]);
          p5.strokeWeight(2);
          p5.noFill();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * p5.TWO_PI + time * 0.3;
            const petalSize = size * this.growthProgress;
            p5.beginShape();
            for (let a = 0; a < p5.TWO_PI; a += 0.1) {
              const r = petalSize * (0.5 + 0.5 * Math.sin(6 * a));
              const x = r * Math.cos(a + angle);
              const y = r * Math.sin(a + angle);
              p5.vertex(x, y);
            }
            p5.endShape(p5.CLOSE);
          }
      }
      p5.pop();
    }

    drawLeaves() {
      if (!this.hasLeaves) return;

      for (let i = 1; i < this.stemSegments.length - 1; i += 2) {
        const point = this.stemSegments[i];
        const nextPoint = this.stemSegments[i + 1];
        const angle = Math.atan2(
          nextPoint.y - point.y,
          nextPoint.x - point.x
        );

        p5.push();
        p5.translate(point.x, point.y);
        p5.rotate(angle);

        // Draw leaf
        p5.fill(colors.plants.leaf);
        p5.noStroke();
        p5.beginShape();
        for (let t = 0; t <= Math.PI; t += 0.1) {
          const x = 10 * Math.cos(t);
          const y = 5 * Math.sin(t);
          p5.vertex(x, y);
        }
        for (let t = Math.PI; t >= 0; t -= 0.1) {
          const x = 10 * Math.cos(t);
          const y = -5 * Math.sin(t);
          p5.vertex(x, y);
        }
        p5.endShape(p5.CLOSE);
        p5.pop();
      }
    }

    draw() {
      // Draw stem
      p5.stroke(colors.plants.stem);
      p5.strokeWeight(2);
      p5.noFill();
      p5.beginShape();
      this.stemSegments.forEach(point => {
        p5.vertex(point.x, point.y);
      });
      p5.endShape();

      // Draw leaves
      if (this.growthProgress > 0.3) {
        this.drawLeaves();
      }

      // Draw flower
      if (this.growthProgress > 0.8) {
        const lastPoint = this.stemSegments[this.stemSegments.length - 1];
        this.drawPetals(lastPoint.x, lastPoint.y, this.flowerSize);
      }
    }
  }

  class GrassBlade {
    constructor(x) {
      this.x = x;
      this.y = p5.height * 0.7 + p5.random(-10, 10);
      this.height = p5.random(30, 60);
      this.swayAmount = p5.random(0.2, 0.5);
      this.controlPointOffset = p5.random(-20, 20);
    }

    draw() {
      const sway = Math.sin(time + this.x * 0.01) * this.swayAmount * 10;

      p5.stroke(colors.plants.grass);
      p5.strokeWeight(2);
      p5.noFill();
      p5.beginShape();
      p5.vertex(this.x, this.y);
      p5.quadraticVertex(
        this.x + this.controlPointOffset,
        this.y - this.height / 2,
        this.x + sway,
        this.y - this.height
      );
      p5.endShape();
    }
  }

  class Ripple {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.alpha = 255;
    }

    update() {
      this.radius += 2;
      this.alpha -= 2;
    }

    isFinished() {
      return this.alpha <= 0;
    }

    draw() {
      p5.noFill();
      p5.stroke(255, 255, 255, this.alpha);
      p5.strokeWeight(2);
      p5.ellipse(this.x, this.y, this.radius * 2);
    }
  }

  function initializeGrass() {
    grassBlades = [];
    for (let x = 0; x < p5.width; x += 5) {
      grassBlades.push(new GrassBlade(x));
    }
  }

  function drawGrass() {
    grassBlades.forEach(blade => {
      blade.draw();
    });
  }

  function drawSky() {
    const skyGradient = p5.drawingContext.createLinearGradient(0, 0, 0, p5.height * 0.7);
    skyGradient.addColorStop(0, colors.sky.top);
    skyGradient.addColorStop(1, colors.sky.bottom);
    p5.drawingContext.fillStyle = skyGradient;
    p5.noStroke();
    p5.rect(0, 0, p5.width, p5.height * 0.7);
  }

  function drawMountains() {
    // Draw three layers of mountains with smooth curves
    [
      { color: colors.mountains.back, height: 0.5, detail: 0.001, amplitude: 50 },
      { color: colors.mountains.mid, height: 0.55, detail: 0.002, amplitude: 70 },
      { color: colors.mountains.front, height: 0.6, detail: 0.003, amplitude: 90 }
    ].forEach(({ color, height, detail, amplitude }) => {
      p5.fill(color);
      p5.beginShape();
      p5.vertex(0, p5.height);
      for (let x = 0; x <= p5.width; x += 10) {
        const y =
          p5.height * height +
          noise2D(x * detail, time * 0.1) * amplitude;
        p5.vertex(x, y);
      }
      p5.vertex(p5.width, p5.height);
      p5.endShape(p5.CLOSE);
    });
  }

  function drawGround() {
    // Draw ground with subtle gradient
    const groundGradient = p5.drawingContext.createLinearGradient(
      0, p5.height * 0.7,
      0, p5.height
    );
    groundGradient.addColorStop(0, colors.ground);
    groundGradient.addColorStop(1, darkenColor(colors.ground, 0.2));
    p5.drawingContext.fillStyle = groundGradient;
    p5.fillStyle = groundGradient;
    p5.noStroke();
    p5.rect(0, p5.height * 0.7, p5.width, p5.height * 0.3);
  }

  function drawPond() {
    // Draw pond with gradient
    const pondHeight = p5.height * 0.2;
    const pondY = p5.height - pondHeight;
  
    // Pond gradient
    const pondGradient = p5.drawingContext.createLinearGradient(0, pondY, 0, p5.height);
    pondGradient.addColorStop(0, colors.pond.top);
    pondGradient.addColorStop(1, colors.pond.bottom);
    p5.noStroke();
    p5.drawingContext.fillStyle = pondGradient;
    p5.rect(0, pondY, p5.width, pondHeight);
  
    // Reflect mountains and grass in the pond
    p5.push();
    // Clip to the pond area
    p5.drawingContext.save();
    p5.drawingContext.beginPath();
    p5.drawingContext.rect(0, pondY, p5.width, pondHeight);
    p5.drawingContext.clip();
  
    // Reflect the scene
    p5.translate(0, pondY * 2 + pondHeight);
    p5.scale(1, -1);
    p5.tint(255, 255 * colors.pond.reflectionOpacity);
    drawMountains();
    drawGrass();
    p5.noTint();
  
    p5.drawingContext.restore();
    p5.pop();
  
    // Draw floating leaves
    drawFloatingLeaves();
  }
  

  function drawRipples() {
    ripples.forEach((ripple, index) => {
      ripple.update();
      ripple.draw();
      if (ripple.isFinished()) {
        ripples.splice(index, 1);
      }
    });
  }

  function drawSun() {
    const sunX = p5.width * 0.8;
    const sunY = p5.height * 0.2;
    const sunRadius = 50;

    p5.noStroke();
    p5.fill('#FFD700'); // Gold color
    p5.ellipse(sunX, sunY, sunRadius * 2);

    // Sun rays
    for (let i = 0; i < 8; i++) {
      const angle = p5.TWO_PI * (i / 8) + time * 0.2;
      const x = sunX + Math.cos(angle) * sunRadius * 1.5;
      const y = sunY + Math.sin(angle) * sunRadius * 1.5;
      p5.stroke('#FFD700');
      p5.strokeWeight(2);
      p5.line(sunX, sunY, x, y);
    }
  }

  function drawBirds() {
    // Draw stylized birds flying
    const birdCount = 3;
    for (let i = 0; i < birdCount; i++) {
      const x = (time * 50 + i * 100) % p5.width;
      const y = p5.height * 0.3 + Math.sin(time + i) * 20;

      p5.stroke('#000');
      p5.strokeWeight(2);
      p5.noFill();
      p5.beginShape();
      p5.vertex(x, y);
      p5.vertex(x + 10, y - 5);
      p5.vertex(x + 20, y);
      p5.endShape();
    }
  }

  function drawFloatingLeaves() {
    // Draw leaves floating in the pond
    const leafCount = 5;
    for (let i = 0; i < leafCount; i++) {
      const x = (time * 30 + i * 200) % p5.width;
      const y = p5.height - p5.height * 0.2 + Math.sin(time + i) * 10;

      p5.fill(colors.plants.leaf);
      p5.noStroke();
      p5.push();
      p5.translate(x, y);
      p5.rotate(Math.sin(time + i));
      p5.beginShape();
      for (let t = 0; t <= Math.PI * 2; t += 0.1) {
        const r = 5;
        const leafX = r * Math.cos(t);
        const leafY = r * Math.sin(t) * 0.5;
        p5.vertex(leafX, leafY);
      }
      p5.endShape(p5.CLOSE);
      p5.pop();
    }
  }

  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight);
    initializeGrass();
  };

  p5.mousePressed = () => {
    const pondY = p5.height - p5.height * 0.2;
    if (p5.mouseY >= pondY) {
      ripples.push(new Ripple(p5.mouseX, p5.mouseY));
    } else if (p5.mouseY > p5.height * 0.7) {
      const types = ['default', 'daisy', 'bellflower'];
      plants.push(new Plant(p5.mouseX, p5.mouseY, p5.random(types)));
    }
  };

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    initializeGrass();
  };

  p5.draw = () => {
    time += 0.01;

    // Draw sky
    drawSky();

    // Draw sun
    drawSun();

    // Draw mountains
    drawMountains();

    // Draw birds
    drawBirds();

    // Draw ground
    drawGround();

    // Draw grass
    drawGrass();

    // Update and draw plants
    plants.forEach(plant => {
      plant.grow();
      plant.draw();
    });

    // Draw pond
    drawPond();

    // Draw floating leaves
    drawFloatingLeaves();

    // Draw ripples
    drawRipples();
  };
}

const Garden: React.FC = () => {
  return (
    <div className="w-screen h-screen">
      <ReactP5Wrapper sketch={sketch} />
    </div>
  );
};

export default Garden;
