import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import Layers from './Layers';
import Ground from './Ground';
import Trees from './Trees';
import Flowers from './Flowers';
import ForceVisualization from './ForceVisualization';
import Controls from '../UI/Controls';
import useGardenSystem from '../../hooks/useGardenSystem';

const Garden: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const { 
    plants, 
    environmentalFactors, 
    handleInteraction, 
    addPlant,
    forces,
    getForces,
    getInteractions 
  } = useGardenSystem(dimensions.width, dimensions.height);

  const defaultForces = {
    energy: new Float32Array(window.innerWidth * window.innerHeight).fill(0.5),
    light: new Float32Array(window.innerWidth * window.innerHeight).fill(0.5),
    flow: new Float32Array(window.innerWidth * window.innerHeight).fill(0.5)
  };

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse/touch interactions
  const handlePointerMove = (event: React.PointerEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    handleInteraction(x, y, 'energy');
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // Convert to Three.js coordinates (-1 to 1)
    const threeX = (x * 2 - 1) * 10; // Multiply by 10 for scene scale
    const threeY = -(y * 2 - 1) * 5; // Multiply by 5 for scene scale

    addPlant([threeX, threeY, 0]);
    handleInteraction(x, y, 'growth');
  };

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen relative bg-black"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <Canvas>
        <PerspectiveCamera 
          makeDefault 
          position={[0, 2, 15]} 
          fov={60}
        />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          maxDistance={20}
          minDistance={5}
        />

        {/* Environment and Atmosphere */}
        <Layers environmentalFactors={environmentalFactors} />
        
        {/* Ground */}
        <Ground />

        {/* Trees */}
        <Trees 
          environmentalFactors={environmentalFactors}
          count={15}  // Adjust as needed
        />

        {/* Flowers */}
        <Flowers 
          count={20}  // Adjust as needed
          environmentalFactors={environmentalFactors}
        />

        {/* Dynamic lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={0.6} 
          castShadow
        />
        <hemisphereLight
          args={['#ffffff', '#66ccff', 0.6]}
          position={[0, 50, 0]}
        />

        {/* Force field visualization */}
        <ForceVisualization
          forces={defaultForces}
          width={dimensions.width}
          height={dimensions.height}
        />
      </Canvas>

      {/* UI Controls */}
      <Controls
        onInteractionTypeChange={(type) => console.log('Interaction type:', type)}
        onSettingsChange={(settings) => console.log('Settings:', settings)}
        environmentalFactors={[
          environmentalFactors.light || 0,
          environmentalFactors.energy || 0,
          environmentalFactors.flow || 0
        ]}
      />
    </div>
  );
};

export default Garden;