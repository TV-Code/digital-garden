// src/components/Scene.tsx
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import Layers from './Layers';
import Flowers from './Flowers';

const Scene: React.FC = () => {
  return (
    <Canvas>
      <PerspectiveCamera 
        makeDefault 
        position={[0, 0, 10]} 
        fov={50}
      />

      {/* Scene background color */}
      <color attach="background" args={['#87CEEB']} />

      {/* Landscape layers */}
      <Layers />

      {/* Foreground elements */}
      <Flowers />
    </Canvas>
  );
};

export default Scene;