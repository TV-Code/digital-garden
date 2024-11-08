// src/components/Garden/Organism.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MeshPhysicalMaterial } from 'three';
import { Organism as OrganismType } from '../../systems/evolution/genome';
import { generateShape } from '../../utils/generative/shapes';

interface OrganismProps {
  organism: OrganismType;
  attention: Vector3;
}

const Organism: React.FC<OrganismProps> = ({ organism, attention }) => {
  const meshRef = useRef<THREE.Mesh>();
  const materialRef = useRef<MeshPhysicalMaterial>();
  const initialRotation = useMemo(() => Math.random() * Math.PI * 2, []);

  // Generate the organism's geometry
  const geometry = useMemo(() => {
    return generateShape(organism.genome.form);
  }, [organism.genome.form]);

  // Create material with interesting properties
  const material = useMemo(() => {
    const { colorHue, colorSaturation, colorLightness } = organism.genome.form;
    
    return new MeshPhysicalMaterial({
      color: `hsl(${colorHue * 360}, ${colorSaturation * 100}%, ${colorLightness * 100}%)`,
      roughness: 0.5,
      metalness: 0.1,
      transmission: 0.2,
      thickness: 0.5,
      attenuationColor: '#ffffff',
      attenuationDistance: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
  }, [organism.genome.form]);

  // Animation and interaction
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Calculate distance to attention point
    const attentionDistance = attention.distanceTo(
      new Vector3(...organism.position)
    );
    const attentionInfluence = Math.max(0, 1 - attentionDistance / 5) * 
                              organism.genome.behavior.attentionSensitivity;

    // Organic movement
    const time = state.clock.getElapsedTime();
    const idOffset = organism.id.charCodeAt(0) * 0.1;
    
    // Base movement
    const movement = {
      x: Math.sin(time + idOffset) * 0.02 * organism.genome.behavior.adaptability,
      y: Math.cos(time * 0.8 + idOffset) * 0.02 * organism.genome.behavior.adaptability,
      z: Math.sin(time * 1.2 + idOffset) * 0.01 * organism.genome.behavior.adaptability
    };

    // Apply position changes
    meshRef.current.position.x = organism.position[0] + movement.x;
    meshRef.current.position.y = organism.position[1] + movement.y;
    meshRef.current.position.z = organism.position[2] + movement.z;

    // Rotation animation
    meshRef.current.rotation.x = initialRotation + Math.sin(time * 0.5) * 0.1;
    meshRef.current.rotation.y = initialRotation + time * 0.1;
    meshRef.current.rotation.z = initialRotation + Math.cos(time * 0.3) * 0.1;

    // Scale pulsing based on energy and attention
    const baseScale = organism.genome.form.baseSize;
    const energyScale = 0.9 + (organism.energy * 0.2);
    const attentionScale = 1 + (attentionInfluence * 0.2);
    const pulseScale = 1 + Math.sin(time * 2 + idOffset) * 0.05;
    
    meshRef.current.scale.setScalar(baseScale * energyScale * attentionScale * pulseScale);

    // Update material properties
    if (materialRef.current) {
      materialRef.current.transmission = 0.2 + (attentionInfluence * 0.3);
      materialRef.current.emissive.setHSL(
        organism.genome.form.colorHue,
        organism.genome.form.colorSaturation * 0.5,
        attentionInfluence * 0.2
      );
    }
  });

  return (
    <mesh 
      ref={meshRef}
      position={organism.position}
      geometry={geometry}
    >
      <primitive object={material} ref={materialRef} />
    </mesh>
  );
};

export default Organism;