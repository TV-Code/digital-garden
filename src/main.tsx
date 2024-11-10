import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import App from './App';
import './index.css';

// Extend Three.js with all the objects we'll use
extend(THREE);

// Create root and render
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);