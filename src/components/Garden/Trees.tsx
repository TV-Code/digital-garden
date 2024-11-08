import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Vector3, MeshPhysicalMaterial } from 'three';
import { createNoise2D } from 'simplex-noise';

interface TreeProps {
  position: [number, number, number];
  scale?: number;
  growthProgress?: number;
  type?: 'normal' | 'sacred' | 'abstract';
}

// Create noise function for organic movement
const noise2D = createNoise2D();

const Tree: React.FC<TreeProps> = ({ 
  position, 
  scale = 1, 
  growthProgress = 1,
  type = 'normal' 
}) => {
  const treeRef = useRef<THREE.Group>(null);
  const materialRef = useRef<MeshPhysicalMaterial>(null);
  
  // Generate tree shape based on type
  const geometry = useMemo(() => {
    switch(type) {
      case 'sacred':
        return generateSacredGeometry();
      case 'abstract':
        return generateAbstractGeometry();
      default:
        return generateNaturalGeometry();
    }
  }, [type]);

  // Animate tree growth and movement
  useFrame((state) => {
    if (!treeRef.current) return;

    const time = state.clock.getElapsedTime();
    
    // Gentle swaying motion
    const windEffect = Math.sin(time + position[0]) * 0.02;
    treeRef.current.rotation.z = windEffect;
    
    // Growth animation
    const currentScale = Math.min(scale * growthProgress, scale);
    treeRef.current.scale.setScalar(currentScale);
    
    // Organic movement based on noise
    const noiseValue = noise2D(time * 0.1, position[0] * 0.1);
    treeRef.current.position.y = position[1] + noiseValue * 0.1;

    // Update material properties
    if (materialRef.current) {
      materialRef.current.transmission = 0.2 + Math.sin(time) * 0.1;
      materialRef.current.emissiveIntensity = 0.1 + Math.sin(time * 0.5) * 0.05;
    }
  });

  return (
    <group ref={treeRef} position={position}>
      {/* Base/Trunk */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry 
          args={[0.2 * scale, 0.3 * scale, 2 * scale, 8]} 
        />
        <meshPhysicalMaterial
          ref={materialRef}
          color="#2a1810"
          roughness={0.8}
          metalness={0.1}
          clearcoat={0.5}
        />
      </mesh>

      {/* Main Foliage */}
      <group position={[0, 2 * scale, 0]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[0, i * 0.7 * scale, 0]} 
            castShadow
          >
            <coneGeometry 
              args={[
                (1.5 - i * 0.3) * scale, 
                2 * scale, 
                8
              ]} 
            />
            <meshPhysicalMaterial
              color={`hsl(${120 + i * 10}, 60%, ${30 + i * 5}%)`}
              roughness={0.7}
              metalness={0.1}
              clearcoat={0.3}
              transmission={0.1}
            />
          </mesh>
        ))}
      </group>

      {/* Energy flow particles */}
      <group position={[0, 1 * scale, 0]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              Math.sin(i / 5 * Math.PI * 2) * 0.5,
              i * 0.5,
              Math.cos(i / 5 * Math.PI * 2) * 0.5
            ]}
          >
            <sphereGeometry args={[0.05 * scale, 8, 8]} />
            <meshBasicMaterial 
              color="#88ff88" 
              transparent 
              opacity={0.5} 
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const Trees: React.FC = () => {
  // Generate more interesting tree positions
  const treePositions = useMemo(() => {
    const positions: Array<{
      pos: [number, number, number];
      scale: number;
      type: 'normal' | 'sacred' | 'abstract';
    }> = [];

    // Create clusters
    for (let cluster = 0; cluster < 3; cluster++) {
      const clusterCenter = new Vector3(
        (Math.random() - 0.5) * 20,
        0,
        (Math.random() - 0.5) * 20
      );

      const treeCount = 5 + Math.floor(Math.random() * 5);
      const type = ['normal', 'sacred', 'abstract'][cluster] as 'normal' | 'sacred' | 'abstract';

      for (let i = 0; i < treeCount; i++) {
        const angle = (i / treeCount) * Math.PI * 2;
        const radius = 2 + Math.random() * 3;
        const position = new Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ).add(clusterCenter);

        positions.push({
          pos: [position.x, position.y, position.z],
          scale: 0.5 + Math.random() * 1,
          type
        });
      }
    }

    return positions;
  }, []);

  return (
    <group>
      {treePositions.map((tree, index) => (
        <Tree 
          key={index} 
          position={tree.pos}
          scale={tree.scale}
          type={tree.type}
          growthProgress={Math.random()} // Random initial growth state
        />
      ))}
    </group>
  );
};

export default Trees;

// Helper function to generate different tree geometries
const generateNaturalGeometry = () => {
  // Implementation for natural tree geometry
  return new THREE.ConeGeometry(1, 2, 8);
};

const generateSacredGeometry = () => {
  // Implementation for sacred geometry inspired tree
  return new THREE.ConeGeometry(1, 2, 6); // Hexagonal base
};

const generateAbstractGeometry = () => {
  // Implementation for abstract tree form
  return new THREE.IcosahedronGeometry(1, 0);
};