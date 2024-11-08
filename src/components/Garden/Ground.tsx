import React from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

const Ground: React.FC = () => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.1, 0]} 
      receiveShadow
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        color="#3c5c3c"
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
};

export default Ground;