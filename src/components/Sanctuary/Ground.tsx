import React, { useMemo } from 'react';
import { Vector3 } from 'three';
import { extend, useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';

extend(THREE);

const noise2D = createNoise2D();

const Ground: React.FC = () => {
  // Create ground shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new Vector3(0.2, 0.3, 0.2) },  // Darker green
        colorB: { value: new Vector3(0.3, 0.4, 0.3) },  // Lighter green
        noiseScale: { value: 5.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform float noiseScale;
        
        varying vec2 vUv;
        varying vec3 vPosition;

        // Simplex noise function
        ${noise2D}

        void main() {
          float n = snoise(vec3(vPosition.x * noiseScale * 0.1, 
                               vPosition.z * noiseScale * 0.1, 
                               time * 0.1));
                               
          // Create more detailed patterns
          float detail = snoise(vec3(vPosition.x * noiseScale * 0.5,
                                   vPosition.z * noiseScale * 0.5,
                                   time * 0.05)) * 0.5;
                                   
          n = n * 0.7 + detail * 0.3;
          
          // Mix colors based on noise
          vec3 color = mix(colorA, colorB, n * 0.5 + 0.5);
          
          // Add slight darkening at edges for depth
          float edgeDarkening = 1.0 - pow(distance(vUv, vec2(0.5)) * 1.5, 2.0);
          color *= 0.8 + edgeDarkening * 0.2;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }, []);

  // Update time uniform
  useFrame((state) => {
    material.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 100, 64, 64]} />
      <primitive object={material} />
    </mesh>
  );
};

export default Ground;