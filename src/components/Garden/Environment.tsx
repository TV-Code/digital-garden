// src/components/Garden/Environment.tsx
import React from 'react';
import { useFrame } from '@react-three/fiber';

const Environment: React.FC = () => {
  return (
    <>
      {/* Simple sky backdrop */}
      <mesh position={[0, 0, -20]} scale={[100, 100, 1]}>
        <planeGeometry />
        <meshBasicMaterial 
          color="#88b6d1" 
          transparent 
          opacity={0.5} 
        />
      </mesh>

      {/* Optional: Add stars or other ambient particles */}
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh 
          key={i}
          position={[
            (Math.random() - 0.5) * 50,
            Math.random() * 30,
            (Math.random() - 0.5) * 50
          ]}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="white" transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
};

export default Environment;