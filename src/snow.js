// src/snow.js
import * as THREE from 'three';

export function createSnow(scene, terrainSize) {
  const snowCount = 5000;
  const snowGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(snowCount * 3);

  for (let i = 0; i < snowCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * terrainSize;
    positions[i * 3 + 1] = Math.random() * 50 + 20; // Snow starts high (between 20 and 70)
    positions[i * 3 + 2] = (Math.random() - 0.5) * terrainSize;
  }
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const snowMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0.8
  });

  const snowParticles = new THREE.Points(snowGeometry, snowMaterial);
  scene.add(snowParticles);

  return snowParticles;
}

export function updateSnow(snowParticles) {
  const positions = snowParticles.geometry.attributes.position.array;
  const snowCount = positions.length / 3;
  for (let i = 0; i < snowCount; i++) {
    positions[i * 3 + 1] -= 0.1; // Falling speed
    if (positions[i * 3 + 1] < 0) {
      positions[i * 3 + 1] = Math.random() * 50 + 20; // Reset to a high value
    }
  }
  snowParticles.geometry.attributes.position.needsUpdate = true;
}
