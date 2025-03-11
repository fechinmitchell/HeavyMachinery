// src/snowAccumulation.js
import * as THREE from 'three';

export function createSnowLayer(terrainSize, segments = 64) {
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  // Start with a flat layer (no snow).
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3 + 1] = 0;
  }
  geometry.attributes.position.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const snowLayer = new THREE.Mesh(geometry, material);
  snowLayer.receiveShadow = true;
  return snowLayer;
}

export function updateSnowLayer(snowLayer, activeVehicle, multiplier = 1.0) {
  // Get vehicle position and forward vector.
  const vehiclePos = activeVehicle.baseGroup.position;
  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(activeVehicle.baseBody.quaternion)
    .normalize();

  const positions = snowLayer.geometry.attributes.position.array;
  const count = positions.length / 3;
  // Use much lower accumulation values for a slower buildup.
  const normalAccumulation = 0.00005 * multiplier; // e.g. 0.00005 per frame
  const clearRadius = 3;
  const pileRadius = 6;
  const extraAccumulation = 0.0005 * multiplier; // extra accumulation in front
  const angleThreshold = Math.cos(THREE.MathUtils.degToRad(45));

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const vx = positions[idx];      // x-coordinate (local)
    let vy = positions[idx + 1];    // current snow height
    const vz = positions[idx + 2];

    // Compute vertex world position (layer is static at the origin).
    const vertexPos = new THREE.Vector3(vx, vy, vz);
    const dx = vertexPos.x - vehiclePos.x;
    const dz = vertexPos.z - vehiclePos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const toVertex = new THREE.Vector3(dx, 0, dz).normalize();
    const dot = forward.dot(toVertex);

    if (distance < clearRadius) {
      // Underneath the vehicle, clear snow a bit faster.
      vy = Math.max(0, vy - 0.001);
    } else if (distance < pileRadius && dot > angleThreshold) {
      // In front of the vehicle, add extra snow.
      vy += extraAccumulation;
    } else {
      // Otherwise, accumulate slowly.
      vy += normalAccumulation;
    }
    positions[idx + 1] = vy;
  }
  snowLayer.geometry.attributes.position.needsUpdate = true;
  snowLayer.geometry.computeVertexNormals();
}
