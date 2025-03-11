// src/terrain.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, physicsWorld, groundMaterial) {
  const terrainSize = 100;
  
  // Create a flat plane geometry.
  const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 1, 1);
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // Create a static physics body for the flat terrain.
  const terrainBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial
  });
  terrainBody.addShape(new CANNON.Plane());
  terrainBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  physicsWorld.addBody(terrainBody);

  // For a flat terrain, getHeight always returns 0.
  const getHeight = (x, z) => 0;

  return { mesh: terrainMesh, body: terrainBody, getHeight, terrainSize };
}
