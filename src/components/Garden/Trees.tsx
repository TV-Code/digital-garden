import React, { useMemo, useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';
import { ShaderMaterial } from 'three';
import * as THREE from 'three';

extend({ ShaderMaterial });

interface TreesProps {
  count?: number;
  environmentalFactors: {
    light?: number;
    energy?: number;
    flow?: number;
  };
}

const noise2D = createNoise2D();

const Tree: React.FC<{ 
  position: [number, number, number],
  scale: number,
  type: 'normal' | 'tall' | 'round',
  energy: number
}> = ({ position, scale, type, energy }) => {
  const groupRef = useRef<THREE.Group>();
  const initialRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  // Create tree material
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        energy: { value: energy },
        baseColor: { value: new THREE.Vector3(0.2, 0.3, 0.15) }
      },
      vertexShader: `
        uniform float time;
        uniform float energy;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          vUv = uv;
          vNormal = normal;
          
          // Add gentle swaying motion
          vec3 pos = position;
          float swayAmount = pos.y * 0.1;
          pos.x += sin(time + position.y) * swayAmount * energy;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float energy;
        uniform vec3 baseColor;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          // Create color variation based on height and normal
          vec3 color = baseColor;
          color += vUv.y * 0.1;  // Lighten towards top
          
          // Add energy-based glow
          float glow = sin(time * 2.0) * 0.5 + 0.5;
          color += vec3(0.1, 0.2, 0.1) * energy * glow;
          
          // Simple lighting
          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;
          color *= 0.8 + light * 0.2;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }, [energy]);

  // Animate tree
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    material.uniforms.time.value = time;
    
    // Add subtle rotation
    groupRef.current.rotation.y = initialRotation + Math.sin(time * 0.5) * 0.02;
  });

  // Generate tree geometry based on type
  const geometry = useMemo(() => {
    switch (type) {
      case 'tall':
        return new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 4 * scale, 8);
      case 'round':
        return new THREE.SphereGeometry(scale, 8, 8);
      default:
        return new THREE.ConeGeometry(scale, scale * 2, 8);
    }
  }, [type, scale]);

  return (
    <group ref={groupRef} position={position}>
      {/* Tree trunk */}
      <mesh castShadow>
        <cylinderGeometry args={[0.1 * scale, 0.15 * scale, scale, 6]} />
        <meshStandardMaterial color="#3d2817" />
      </mesh>

      {/* Tree foliage */}
      <mesh position={[0, scale * 1.2, 0]} castShadow>
        <primitive object={geometry} />
        <primitive object={material} />
      </mesh>
    </group>
  );
};

const Trees: React.FC<TreesProps> = ({ 
  count = 10,
  environmentalFactors 
}) => {
  // Generate tree positions
  const trees = useMemo(() => {
    const positions: Array<{
      position: [number, number, number];
      scale: number;
      type: 'normal' | 'tall' | 'round';
    }> = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 5 + Math.random() * 5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      // Add some randomness to position
      const jitter = 2;
      const jx = (Math.random() - 0.5) * jitter;
      const jz = (Math.random() - 0.5) * jitter;

      positions.push({
        position: [x + jx, 0, z + jz],
        scale: 0.5 + Math.random() * 1,
        type: ['normal', 'tall', 'round'][Math.floor(Math.random() * 3)] as 'normal' | 'tall' | 'round'
      });
    }

    return positions;
  }, [count]);

  return (
    <group>
      {trees.map((tree, index) => (
        <Tree
          key={index}
          {...tree}
          energy={environmentalFactors.energy || 0.5}
        />
      ))}
    </group>
  );
};

export default Trees;