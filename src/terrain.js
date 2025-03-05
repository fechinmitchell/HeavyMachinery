// src/terrain.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, physicsWorld, groundMaterial) {
  // Terrain visual
  const terrainSize = 100;
  const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize);
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrainMesh.rotation.x = -Math.PI / 2;
  scene.add(terrainMesh);

  // Terrain physics
  const terrainBody = new CANNON.Body({
    mass: 0, // Static
    material: groundMaterial
  });
  terrainBody.addShape(new CANNON.Plane());
  terrainBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  physicsWorld.addBody(terrainBody);

  return { mesh: terrainMesh, body: terrainBody };
}