import { BufferGeometry, Vector3, Float32BufferAttribute } from 'three';
import { createNoise2D } from 'simplex-noise';
import { Genome } from '../../systems/evolution/genome';

const noise2D = createNoise2D();

export const generateShape = (form: Genome['form']): BufferGeometry => {
  const geometry = new BufferGeometry();
  const vertices: number[] = [];
  const { baseSize, complexity, symmetry, shapeVertices } = form;

  // Generate base shape
  const numPoints = Math.floor(complexity * 20) + 3;
  const segments = Math.max(2, Math.floor(symmetry * 8));

  // Create vertices for each segment
  for (let segment = 0; segment < segments; segment++) {
    const segmentAngle = (segment / segments) * Math.PI * 2;
    
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const angle = segmentAngle + (t * Math.PI * 2) / segments;
      
      // Use noise to create organic variation
      const noiseValue = noise2D(
        Math.cos(angle) * complexity,
        Math.sin(angle) * complexity
      ) * 0.5 + 0.5;

      // Calculate radius with shape vertices influence
      const baseRadius = baseSize * (0.8 + noiseValue * 0.4);
      const vertexInfluence = shapeVertices[i % shapeVertices.length] || 1;
      const radius = baseRadius * vertexInfluence;

      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (noiseValue - 0.5) * baseSize * 0.2;

      vertices.push(x, y, z);

      // Add interior vertices for more organic shape
      if (i > 0 && i < numPoints - 1) {
        const interiorScale = 0.5 + noiseValue * 0.3;
        vertices.push(
          x * interiorScale,
          y * interiorScale,
          z * 1.5
        );
      }
    }
  }

  // Create faces by connecting vertices
  const indices: number[] = [];
  const verticesPerSegment = numPoints * 2 - 2;
  
  for (let segment = 0; segment < segments; segment++) {
    const nextSegment = (segment + 1) % segments;
    
    for (let i = 0; i < numPoints - 1; i++) {
      const current = segment * verticesPerSegment + i * 2;
      const next = segment * verticesPerSegment + (i + 1) * 2;
      const nextSegCurrent = nextSegment * verticesPerSegment + i * 2;
      const nextSegNext = nextSegment * verticesPerSegment + (i + 1) * 2;

      // Create triangles
      indices.push(current, nextSegCurrent, next);
      indices.push(nextSegCurrent, nextSegNext, next);
      
      // Add interior faces if not at the end
      if (i < numPoints - 2) {
        indices.push(current + 1, next + 1, current);
        indices.push(next + 1, next, current);
      }
    }
  }

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

// Helper function to create smooth transitions between shapes
export const interpolateShapes = (
  shapeA: BufferGeometry,
  shapeB: BufferGeometry,
  t: number
): BufferGeometry => {
  const interpolated = shapeA.clone();
  const posA = shapeA.attributes.position.array as Float32Array;
  const posB = shapeB.attributes.position.array as Float32Array;
  const positions = new Float32Array(posA.length);

  for (let i = 0; i < positions.length; i++) {
    positions[i] = posA[i] + (posB[i] - posA[i]) * t;
  }

  interpolated.setAttribute('position', new Float32BufferAttribute(positions, 3));
  interpolated.computeVertexNormals();

  return interpolated;
};