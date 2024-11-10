import React, { useMemo, useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

extend(THREE);

// Noise function used in shaders (place at top level)
const noiseFunction = `
  //
  // GLSL textureless classic 3D noise "cnoise",
  // with an RSL-style periodic variant "pnoise".
  // Author:  Stefan Gustavson (stefan.gustavson@liu.se)
  // Version: 2011-10-11
  //
  // Many thanks to Ian McEwan of Ashima Arts for the
  // ideas for permutation and gradient selection.
  //
  // Copyright (c) 2011 Stefan Gustavson. All rights reserved.
  // Distributed under the MIT license.
  //

  vec3 mod289(vec3 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x)
  {
    return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v)
  {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    // Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
  }
`;

// Also, let's simplify the background shader to ensure it works:
const backgroundFragment = `
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float time;
  uniform float energy;
  uniform float light;
  varying vec2 vUv;

  ${noiseFunction}

  void main() {
    float n = snoise(vec3(vUv * 3.0, time * 0.1)) * 0.5 + 0.5;
    vec3 color = mix(colorA, colorB, vUv.y);
    color = mix(color, color + vec3(0.2), n * energy);
    color *= light * 0.5 + 0.5;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Basic vertex shader (place at top level)
const basicVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface LayersProps {
  environmentalFactors: {
    light?: number;
    energy?: number;
    flow?: number;
  };
}

// src/components/Garden/Layers.tsx

// ... keep the noiseFunction the same ...

const shaderTypes = {
    background: {
      fragment: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform float time;
        uniform float energy;
        uniform float light;
        varying vec2 vUv;
  
        ${noiseFunction}
  
        void main() {
          // Correct vector construction
          vec3 noiseInput = vec3(vUv.x * 3.0, vUv.y * 3.0, time * 0.1);
          float n = snoise(noiseInput) * 0.5 + 0.5;
          
          vec3 color = mix(colorA, colorB, vUv.y);
          color = mix(color, color + vec3(0.2, 0.2, 0.2), n * energy);
          color *= light * 0.5 + 0.5;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      vertex: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `
    },
    terrain: {
      fragment: `
        uniform vec3 baseColor;
        uniform float time;
        uniform float energy;
        varying vec2 vUv;
  
        ${noiseFunction}
  
        void main() {
          // Correct vector construction
          vec3 noiseInput = vec3(vUv.x * 8.0, vUv.y * 8.0, time * 0.05);
          float n = snoise(noiseInput);
          
          vec3 color = baseColor;
          color *= 0.8 + n * 0.4;
          color *= 1.0 + energy * 0.2;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      vertex: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `
    },
    atmosphere: {
      fragment: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform float time;
        uniform float energy;
        uniform float flow;
        varying vec2 vUv;
  
        ${noiseFunction}
  
        void main() {
          // Correct vector construction
          vec3 noiseInput = vec3(
            vUv.x * 4.0 + time * flow * 0.2,
            vUv.y * 4.0,
            time * 0.1
          );
          
          float n = snoise(noiseInput);
          vec3 color = mix(colorA, colorB, vUv.y + n * 0.2);
          color += vec3(energy * 0.1);
          
          gl_FragColor = vec4(color, 0.3 + n * 0.1);
        }
      `,
      vertex: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `
    }
  };

const Layers: React.FC<LayersProps> = ({ environmentalFactors }) => {
  const light = environmentalFactors?.light ?? 0.5;
  const energy = environmentalFactors?.energy ?? 0.5;
  const flow = environmentalFactors?.flow ?? 0.5;

  const materials = useMemo(() => ({
    background: new THREE.ShaderMaterial({
      uniforms: {
        colorA: { value: new Vector3(0.1, 0.3, 0.5) },
        colorB: { value: new Vector3(0.7, 0.9, 1.0) },
        time: { value: 0 },
        energy: { value: energy },
        light: { value: light }
      },
      vertexShader: shaderTypes.background.vertex,
      fragmentShader: shaderTypes.background.fragment
    }),
    terrain: new THREE.ShaderMaterial({
        uniforms: {
          baseColor: { value: new Vector3(0.2, 0.4, 0.3) },
          time: { value: 0 },
          energy: { value: energy }
        },
        vertexShader: shaderTypes.terrain.vertex,
        fragmentShader: shaderTypes.terrain.fragment
      }),
      atmosphere: new THREE.ShaderMaterial({
        uniforms: {
          colorA: { value: new Vector3(0.3, 0.6, 0.8) },
          colorB: { value: new Vector3(0.6, 0.8, 1.0) },
          time: { value: 0 },
          energy: { value: energy },
          flow: { value: flow }
        },
        vertexShader: shaderTypes.atmosphere.vertex,
        fragmentShader: shaderTypes.atmosphere.fragment,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
    }), [energy, light, flow]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    Object.values(materials).forEach(material => {
      if (material.uniforms.time) material.uniforms.time.value = time;
      if (material.uniforms.energy) material.uniforms.energy.value = energy;
      if (material.uniforms.light) material.uniforms.light.value = light;
      if (material.uniforms.flow) material.uniforms.flow.value = flow;
    });
  });

  return (
    <group>
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[20, 20]} />
        <primitive object={materials.background} />
      </mesh>

      <mesh position={[0, -2, -5]} rotation={[-Math.PI * 0.1, 0, 0]}>
        <planeGeometry args={[20, 10, 32, 32]} />
        <primitive object={materials.terrain} />
      </mesh>

      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[20, 20]} />
        <primitive object={materials.atmosphere} />
      </mesh>
    </group>
  );
};

export default Layers;