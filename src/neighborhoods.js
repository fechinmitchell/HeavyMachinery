// neighborhoods.js
import * as THREE from 'three';
import { createRoad } from './scenery.js';

/**
 * Creates an optimized neighborhood patch that includes:
 * - Instanced houses (for performance)
 * - Roads
 * - Instanced trees (greenery)
 * - A water feature (if theme is "Lakeside")
 *
 * @param {THREE.Scene} scene
 * @param {CANNON.World} physicsWorld
 * @param {CANNON.Material} groundMaterial
 * @param {Function} getHeight - Function (x, z) => y for terrain.
 * @param {number} patchSize - The size (width/length) of the patch.
 * @param {THREE.Vector3} origin - Center of the patch.
 * @param {string} theme - Theme string (e.g., "Lakeside", "Saudi", etc.)
 */
export function createOptimizedNeighborhood(scene, physicsWorld, groundMaterial, getHeight, patchSize, origin, theme) {
  const gridRows = 4, gridCols = 4;
  const cellSize = patchSize / gridCols;
  const halfPatch = patchSize / 2;

  // === Instanced Houses ===
  // For simplicity, we use a basic box as the house "base".
  // In a real game you might load a more detailed model.
  const houseCount = gridRows * gridCols;
  const houseGeometry = new THREE.BoxGeometry(4, 3, 4); // base size of house
  const houseMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
  const instancedHouses = new THREE.InstancedMesh(houseGeometry, houseMaterial, houseCount);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      const localX = -halfPatch + cellSize * j + cellSize / 2;
      const localZ = -halfPatch + cellSize * i + cellSize / 2;
      const offsetX = (Math.random() - 0.5) * cellSize * 0.3;
      const offsetZ = (Math.random() - 0.5) * cellSize * 0.3;
      const posX = origin.x + localX + offsetX;
      const posZ = origin.z + localZ + offsetZ;
      const posY = getHeight(posX, posZ);
      dummy.position.set(posX, posY, posZ);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      instancedHouses.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }
  instancedHouses.instanceMatrix.needsUpdate = true;
  scene.add(instancedHouses);

  // === Roads ===
  // Create a horizontal and vertical road across the patch.
  createRoad(
    scene,
    new THREE.Vector3(origin.x - halfPatch, getHeight(origin.x - halfPatch, origin.z), origin.z),
    new THREE.Vector3(origin.x + halfPatch, getHeight(origin.x + halfPatch, origin.z), origin.z)
  );
  createRoad(
    scene,
    new THREE.Vector3(origin.x, getHeight(origin.x, origin.z - halfPatch), origin.z - halfPatch),
    new THREE.Vector3(origin.x, getHeight(origin.x, origin.z + halfPatch), origin.z + halfPatch)
  );

  // === Water Feature (for Lakeside theme) ===
  if (theme === 'Lakeside') {
    createWaterFeature(scene, patchSize * 0.6, new THREE.Vector3(origin.x, getHeight(origin.x, origin.z) + 0.1, origin.z));
  }

  // === Greenery (Instanced Trees) ===
  // We’ll create a simple tree with a trunk (cylinder) and foliage (cone)
  const treeCount = 5;
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const instancedTrunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);

  const foliageGeometry = new THREE.ConeGeometry(1, 2, 8);
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
  const instancedFoliage = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, treeCount);

  for (let i = 0; i < treeCount; i++) {
    // Random position within patch.
    const x = origin.x + (Math.random() - 0.5) * patchSize;
    const z = origin.z + (Math.random() - 0.5) * patchSize;
    const y = getHeight(x, z);
    // Trunk: center at (x, y+1, z)
    dummy.position.set(x, y + 1, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    instancedTrunks.setMatrixAt(i, dummy.matrix);
    // Foliage: position atop trunk. Center at (x, y+3, z) (trunk height 2, foliage height 2)
    dummy.position.set(x, y + 3, z);
    dummy.updateMatrix();
    instancedFoliage.setMatrixAt(i, dummy.matrix);
  }
  instancedTrunks.instanceMatrix.needsUpdate = true;
  instancedFoliage.instanceMatrix.needsUpdate = true;
  scene.add(instancedTrunks);
  scene.add(instancedFoliage);
}

/**
 * Creates a water feature using a simple water plane.
 * @param {THREE.Scene} scene
 * @param {number} size - Size of the water plane.
 * @param {THREE.Vector3} position - Position of the water.
 */
function createWaterFeature(scene, size, position) {
  const waterGeo = new THREE.PlaneGeometry(size, size);
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x3355ff,
    transparent: true,
    opacity: 0.8
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.copy(position);
  scene.add(waterMesh);
}
