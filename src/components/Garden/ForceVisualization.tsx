import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

interface ForceVisualizationProps {
  forces?: {
    energy: Float32Array;
    light: Float32Array;
    flow: Float32Array;
  };
  width?: number;
  height?: number;
}

const ForceVisualization: React.FC<ForceVisualizationProps> = ({
  forces,
  width = window.innerWidth,
  height = window.innerHeight
}) => {
  const noise2D = createNoise2D();
  const materialRef = useRef<THREE.ShaderMaterial>();

  // Create default force arrays if none provided
  const defaultForces = useMemo(() => ({
    energy: new Float32Array(width * height).fill(0.5),
    light: new Float32Array(width * height).fill(0.5),
    flow: new Float32Array(width * height).fill(0.5)
  }), [width, height]);

  const actualForces = forces || defaultForces;

  // Create data texture from forces
  const dataTexture = useMemo(() => {
    const data = new Uint8Array(width * height * 4);
    
    try {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const forceIdx = y * width + x;

          // Get force values with fallbacks
          const energy = actualForces.energy?.[forceIdx] ?? 0.5;
          const light = actualForces.light?.[forceIdx] ?? 0.5;
          const flow = actualForces.flow?.[forceIdx] ?? 0.5;

          // Create visual effect
          const noiseValue = noise2D(x * 0.02, y * 0.02) * 0.5 + 0.5;

          // Set colors
          data[idx] = Math.floor(255 * energy * light);     // R
          data[idx + 1] = Math.floor(255 * flow * noiseValue); // G
          data[idx + 2] = Math.floor(255 * light);          // B
          data[idx + 3] = Math.floor(255 * (0.1 + energy * 0.2)); // A
        }
      }
    } catch (error) {
      console.warn('Error creating force visualization:', error);
      // Fill with default values if there's an error
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128;     // R
        data[i + 1] = 128; // G
        data[i + 2] = 128; // B
        data[i + 3] = 128; // A
      }
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    return texture;
  }, [actualForces, width, height]);

  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        forceTexture: { value: dataTexture },
        resolution: { value: new THREE.Vector2(width, height) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D forceTexture;
        uniform vec2 resolution;
        varying vec2 vUv;

        void main() {
          // Sample force texture
          vec4 forces = texture2D(forceTexture, vUv);
          
          // Add some animation
          float animation = sin(time * 2.0 + vUv.y * 10.0) * 0.1;
          
          // Create final color
          vec3 color = forces.rgb + vec3(animation);
          float alpha = forces.a;

          gl_FragColor = vec4(color, alpha * 0.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
  }, [dataTexture, width, height]);

  // Animate
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, 0, 0.1]} scale={[1, 1, 1]}>
      <planeGeometry args={[width / 100, height / 100]} />
      <primitive object={shaderMaterial} ref={materialRef} />
    </mesh>
  );
};

export default ForceVisualization;