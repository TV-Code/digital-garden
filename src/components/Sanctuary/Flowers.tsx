import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FlowerProps {
  position: [number, number, number];
  color: string;
  size?: number;
}

const Flower: React.FC<FlowerProps> = ({ 
  position, 
  color, 
  size = 1 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Generate flower shape
  const shape = useMemo(() => {
    const points: THREE.Vector2[] = [];
    const petalCount = 6;
    const innerRadius = 0.1 * size;
    const outerRadius = 0.3 * size;

    for (let i = 0; i <= petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const middleAngle = angle + (Math.PI / petalCount);

      points.push(
        new THREE.Vector2(
          Math.cos(angle) * outerRadius,
          Math.sin(angle) * outerRadius
        )
      );

      points.push(
        new THREE.Vector2(
          Math.cos(middleAngle) * innerRadius * 1.5,
          Math.sin(middleAngle) * innerRadius * 1.5
        )
      );
    }

    return new THREE.Shape(points);
  }, [size]);

  // Gentle animation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      groupRef.current.rotation.z = Math.sin(time + position[0]) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Flower petals */}
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -0.4 * size, 0]}>
        <planeGeometry args={[0.05 * size, 0.8 * size]} />
        <meshBasicMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
};

const Flowers: React.FC = () => {
  // Generate flower positions
  const flowers = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      position: [
        -2 + (i / 14) * 4,  // Spread across x-axis
        Math.sin(i / 14 * Math.PI) * 0.5 - 1,  // Gentle curve
        0
      ] as [number, number, number],
      color: `hsl(${350 + Math.random() * 20}, 80%, 65%)`,
      size: 0.8 + Math.random() * 0.4
    }));
  }, []);

  return (
    <group position={[0, -2, 1]}>
      {flowers.map((flower, i) => (
        <Flower key={i} {...flower} />
      ))}
    </group>
  );
};

export default Flowers;