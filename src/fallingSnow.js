import * as THREE from 'three';

export function createFallingSnow(terrainSize) {
  const snowCount = 3000;
  const snowGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * terrainSize;
    positions[i * 3 + 1] = Math.random() * 30 + 20; // Start high (between 20 and 50)
    positions[i * 3 + 2] = (Math.random() - 0.5) * terrainSize;
  }
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const snowMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.8
  });
  return new THREE.Points(snowGeometry, snowMaterial);
}

export function updateFallingSnow(fallingSnow, terrainSize) {
  const positions = fallingSnow.geometry.attributes.position.array;
  const count = positions.length / 3;
  const fallingSpeed = 0.05; // Adjust this for desired falling speed
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    positions[idx + 1] -= fallingSpeed;
    // Reset a snowflake if it goes below ground.
    if (positions[idx + 1] < 0) {
      positions[idx + 1] = Math.random() * 30 + 20;
    }
  }
  fallingSnow.geometry.attributes.position.needsUpdate = true;
}
