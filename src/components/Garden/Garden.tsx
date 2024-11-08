import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
} from '@react-three/drei';
import Environment from './Environment';
import Trees from './Trees';
import Ground from './Ground';

const Garden: React.FC = () => {
  return (
    <div className="fixed inset-0 w-screen h-screen">
      <Canvas id="canvas">
        <PerspectiveCamera 
          makeDefault 
          position={[0, 5, 10]} 
          fov={75}
        />
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          maxPolarAngle={Math.PI / 2.1} // Prevent going below ground
          minPolarAngle={0}
        />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.8} 
          castShadow 
        />

        {/* Environment (sky, atmosphere) */}
        <Environment />

        {/* Ground plane with grass */}
        <Ground />

        {/* Trees and plants */}
        <Trees />

        {/* Fog for depth */}
        <fog attach="fog" args={['#202030', 15, 100]} />
      </Canvas>
    </div>
  );
};

export default Garden;