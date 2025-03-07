import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Import your helpers and classes
import { initPhysics, updatePhysics } from './physics.js';
import { createTerrain } from './terrain.js';
import { Excavator } from './Excavator.js';
import { DumpTruck } from './DumpTruck.js';
import { Block } from './Block.js';

// So we don't get browser-undefined errors in some environments
window.browser = window.browser || { runtime: {}, tabs: {}, storage: {} };
console.log('Starting index.js');

// 1. Create the Scene
const scene = new THREE.Scene();

// 2. Create and set up Physics
const physicsWorld = initPhysics();

// 3. Create the Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// 4. Create Terrain (visual + physics)
const groundMaterial = new CANNON.Material('ground');
createTerrain(scene, physicsWorld, groundMaterial);

// 5. Create Vehicles and position them side by side.
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(-3, 0.35, 0); // Positioned to the left

const dumpTruck = new DumpTruck(scene, physicsWorld, groundMaterial);
dumpTruck.baseBody.position.set(3, 0.35, 0); // Positioned to the right

// Set the active vehicle (default to excavator).
window.activeVehicle = excavator;

// 6. Create a Block (for demonstration).
const block = new Block(scene, physicsWorld, new THREE.Vector3(0, 10, 0));

// 7. Basic Lights.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 8. Renderer.
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  rootElement.appendChild(renderer.domElement);
}

// 9. On-screen Controls Legend.
const legend = document.createElement('div');
legend.style.position = 'absolute';
legend.style.top = '10px';
legend.style.left = '10px';
legend.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
legend.style.color = 'white';
legend.style.padding = '10px';
legend.style.fontFamily = 'Arial, sans-serif';
legend.style.fontSize = '14px';

legend.innerHTML = `
  <h3>Vehicle Controls</h3>
  <p>
    <strong>1</strong>: Control Excavator (W, A, S, D, Q, E, R, F, T, G, Y, H, Space)<br>
    <strong>2</strong>: Control Dump Truck (Arrow Up, Arrow Down, Arrow Left, Arrow Right)
  </p>
  <ul style="list-style: none; padding: 0;">
    <!-- Camera Controls -->
    <li><strong>I</strong>: Zoom In (Camera)</li>
    <li><strong>K</strong>: Zoom Out (Camera)</li>
    <li><strong>J</strong>: Orbit Left (Camera)</li>
    <li><strong>L</strong>: Orbit Right (Camera)</li>
  </ul>
`;
document.body.appendChild(legend);

// 10. Extra Camera Controls.
const camKeys = { i: false, k: false, j: false, l: false };
let cameraAngle = Math.PI / 1.5;
let cameraDistance = 10;
let cameraHeight = 5;
const zoomSpeed = 0.1;
const orbitSpeed = 0.02;

window.addEventListener('keydown', (event) => {
  // Switch active vehicle when pressing 1 or 2.
  if (event.key === '1') {
    window.activeVehicle = excavator;
    console.log("Active vehicle: Excavator");
    return;
  } else if (event.key === '2') {
    window.activeVehicle = dumpTruck;
    console.log("Active vehicle: Dump Truck");
    return;
  }
  // Camera controls.
  switch (event.key.toLowerCase()) {
    case 'i': camKeys.i = true; break;
    case 'k': camKeys.k = true; break;
    case 'j': camKeys.j = true; break;
    case 'l': camKeys.l = true; break;
    default: break;
  }
});

window.addEventListener('keyup', (event) => {
  // Camera controls.
  switch (event.key.toLowerCase()) {
    case 'i': camKeys.i = false; break;
    case 'k': camKeys.k = false; break;
    case 'j': camKeys.j = false; break;
    case 'l': camKeys.l = false; break;
    default: break;
  }
});

// 11. Animation Loop.
function animate() {
  requestAnimationFrame(animate);

  // Update physics simulation.
  updatePhysics(physicsWorld);

  // Update both vehicles (each only processes input if active).
  excavator.update();
  dumpTruck.update();
  // Update the block.
  block.update();

  // --- Camera control logic ---
  if (camKeys.i) {
    cameraDistance = Math.max(2, cameraDistance - zoomSpeed);
  }
  if (camKeys.k) {
    cameraDistance = Math.min(50, cameraDistance + zoomSpeed);
  }
  if (camKeys.j) {
    cameraAngle -= orbitSpeed;
  }
  if (camKeys.l) {
    cameraAngle += orbitSpeed;
  }

  // Target the active vehicle for the camera.
  const targetPos = window.activeVehicle.baseGroup.position.clone();
  const offsetX = cameraDistance * Math.sin(cameraAngle);
  const offsetZ = cameraDistance * Math.cos(cameraAngle);
  camera.position.set(targetPos.x + offsetX, targetPos.y + cameraHeight, targetPos.z + offsetZ);
  camera.lookAt(targetPos);

  // Render the scene.
  renderer.render(scene, camera);
}
animate();

// 12. Handle window resizing.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
