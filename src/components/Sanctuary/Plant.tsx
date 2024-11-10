import React, { useMemo, useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, BufferAttribute } from 'three';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

extend(THREE);

interface PlantProps {
  plant: {
    id: string;
    position: [number, number, number];
    traits: any;
    growth: number;
    energy: number;
    age: number;
    lSystem: any;
  };
  environmentalFactors: number[];
}

const noise2D = createNoise2D();

// Custom geometry merging function
const mergeGeometries = (geometries: THREE.BufferGeometry[]): THREE.BufferGeometry => {
  let vertexCount = 0;
  let indexCount = 0;

  // Calculate total counts
  geometries.forEach(geo => {
    if (geo.index) {
      indexCount += geo.index.count;
    } else {
      indexCount += geo.attributes.position.count;
    }
    vertexCount += geo.attributes.position.count;
  });

  // Create merged geometry
  const mergedGeometry = new BufferGeometry();
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);

  let vertexOffset = 0;
  let indexOffset = 0;

  // Merge geometries
  geometries.forEach(geo => {
    const positionArray = geo.attributes.position.array;
    const normalArray = geo.attributes.normal.array;
    
    // Copy positions and normals
    positions.set(positionArray, vertexOffset * 3);
    normals.set(normalArray, vertexOffset * 3);

    // Copy and offset indices
    if (geo.index) {
      const indexArray = geo.index.array;
      for (let i = 0; i < indexArray.length; i++) {
        indices[indexOffset + i] = indexArray[i] + vertexOffset;
      }
      indexOffset += indexArray.length;
    } else {
      for (let i = 0; i < geo.attributes.position.count; i++) {
        indices[indexOffset + i] = i + vertexOffset;
      }
      indexOffset += geo.attributes.position.count;
    }

    vertexOffset += geo.attributes.position.count;
  });

  // Set attributes
  mergedGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  mergedGeometry.setAttribute('normal', new BufferAttribute(normals, 3));
  mergedGeometry.setIndex(new BufferAttribute(indices, 1));

  return mergedGeometry;
};

const Plant: React.FC<PlantProps> = ({ plant, environmentalFactors }) => {
  const groupRef = useRef<THREE.Group>();
  const materialRef = useRef<THREE.ShaderMaterial>();

  // Generate geometry based on L-System and traits
  const geometry = useMemo(() => {
    try {
      const points = plant.lSystem.getPoints();
      const geometries: THREE.BufferGeometry[] = [];
      const scale = plant.traits.form.size * 0.5;

      // Create branches
      for (let i = 0; i < points.length - 1; i++) {
        const start = new Vector3(...points[i]);
        const end = new Vector3(...points[i + 1]);
        const direction = end.clone().sub(start);
        const length = direction.length();

        // Create branch geometry
        const branchGeometry = new THREE.CylinderGeometry(
          0.02 * scale,
          0.03 * scale,
          length,
          5
        );

        // Orient branch
        direction.normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(
          new Vector3(0, 1, 0),
          direction
        );

        branchGeometry.translate(0, length / 2, 0);
        branchGeometry.applyQuaternion(quaternion);
        branchGeometry.translate(start.x, start.y, start.z);

        geometries.push(branchGeometry);

        // Add leaves/flowers based on traits
        if (i % 2 === 0 && i > points.length * 0.3) {
          const leafGeometry = createLeafGeometry(
            scale,
            plant.traits.form.complexity
          );
          
          leafGeometry.translate(end.x, end.y, end.z);
          geometries.push(leafGeometry);
        }
      }

      return geometries.length > 0 ? mergeGeometries(geometries) : new THREE.CylinderGeometry(0.02 * scale, 0.03 * scale, 1, 5);
    } catch (error) {
      console.warn('Error generating plant geometry:', error);
      return new THREE.CylinderGeometry(0.02, 0.03, 1, 5);
    }
  }, [plant.lSystem, plant.traits.form]);

  // Rest of the component remains the same...
  
  return (
    <group 
      ref={groupRef}
      position={plant.position}
      scale={plant.traits.form.size}
    >
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={shader.vertexShader}
          fragmentShader={shader.fragmentShader}
          uniforms={{
            time: { value: 0 },
            growth: { value: plant.growth },
            energy: { value: plant.energy },
            color: { value: new Vector3(
              plant.traits.color.hue / 360,
              plant.traits.color.saturation / 100,
              plant.traits.color.brightness / 100
            )}
          }}
        />
      </mesh>
    </group>
  );
};


// Helper function to create leaf geometry
const createLeafGeometry = (scale: number, complexity: number) => {
  const shape = new THREE.Shape();
  const points = [];
  const segments = 8 + Math.floor(complexity * 4);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI;
    const radius = Math.sin(angle) * 0.2 * scale;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(new THREE.Vector2(x, y));
  }

  shape.setFromPoints(points);
  return new THREE.ShapeGeometry(shape);
};

export default Plant;