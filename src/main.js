// src/main.js
import * as THREE from 'three';
import { initPhysics, updatePhysics } from './physics.js';
import { createTerrain } from './terrain.js';
import { Excavator } from './Excavator.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Initialize physics world
const physicsWorld = initPhysics();

// Define ground material for physics interaction
const groundMaterial = new CANNON.Material('ground');

// Create terrain
const terrain = createTerrain(scene, physicsWorld, groundMaterial);

// Create excavator with groundMaterial
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(0, 10, 0); // Start above ground

// Camera setup
const cameraPosition = new CANNON.Vec3(0, 15, 20);
camera.lookAt(0, 0, 0);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update physics
  updatePhysics(physicsWorld);

  // Update excavator
  excavator.update();

  // Follow excavator with camera
  const excavatorPos = excavator.baseGroup.position;
  camera.position.set(excavatorPos.x, excavatorPos.y + 15, excavatorPos.z + 20);
  camera.lookAt(excavatorPos);

  renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});