import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Import your helpers and classes
import { initPhysics, updatePhysics } from './physics.js';
import { createTerrain } from './terrain.js';
import { Excavator } from './Excavator.js';
import { DumpTruck } from './DumpTruck.js';
import { SnowPlow } from './SnowPlow.js';  // Your new SnowPlow class
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
// Positioning: excavator is left at x = -3, dump truck is right at x = 3.
// We'll add the snow plow on the other side of the dump truck at x = 9
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(-3, 0.35, 0); // Left side

const dumpTruck = new DumpTruck(scene, physicsWorld, groundMaterial);
dumpTruck.baseBody.position.set(3, 0.35, 0); // Center-right

const snowPlow = new SnowPlow(scene, physicsWorld, groundMaterial);
snowPlow.baseBody.position.set(9, 0.35, 0); // Further right (same offset as between excavator and dump truck)

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
const excavatorLegend = `
  <h3>Excavator Controls</h3>
  <p><strong>Press 1 to switch to Excavator</strong></p>
  <ul style="list-style: none; padding: 0;">
    <li><strong>W</strong>: Move Forward</li>
    <li><strong>S</strong>: Move Backward</li>
    <li><strong>A</strong>: Turn Left</li>
    <li><strong>D</strong>: Turn Right</li>
    <li><strong>Q</strong>: Rotate Turret Left</li>
    <li><strong>E</strong>: Rotate Turret Right</li>
    <li><strong>R</strong>: Raise Boom / Release Cubes</li>
    <li><strong>F</strong>: Lower Boom</li>
    <li><strong>T</strong>: Extend Stick</li>
    <li><strong>G</strong>: Retract Stick</li>
    <li><strong>Y</strong>: Curl Bucket In</li>
    <li><strong>H</strong>: Curl Bucket Out</li>
    <li><strong>Space</strong>: Pick Up Cubes</li>
  </ul>
`;

const dumpTruckLegend = `
  <h3>Dump Truck Controls</h3>
  <p><strong>Press 2 to switch to Dump Truck</strong></p>
  <ul style="list-style: none; padding: 0;">
    <li><strong>Arrow Up</strong>: Move Forward</li>
    <li><strong>Arrow Down</strong>: Move Backward</li>
    <li><strong>Arrow Left</strong>: Turn Left</li>
    <li><strong>Arrow Right</strong>: Turn Right</li>
  </ul>
`;

const snowPlowLegend = `
  <h3>Snow Plow Controls</h3>
  <p><strong>Press 3 to switch to Snow Plow</strong></p>
  <ul style="list-style: none; padding: 0;">
    <li><strong>W</strong>: Move Forward</li>
    <li><strong>S</strong>: Move Backward</li>
    <li><strong>A</strong>: Turn Left</li>
    <li><strong>D</strong>: Turn Right</li>
    <li><strong>Z</strong>: Raise Plow</li>
    <li><strong>X</strong>: Lower Plow</li>
  </ul>
`;
const legend = document.createElement('div');
legend.style.position = 'absolute';
legend.style.top = '10px';
legend.style.left = '10px';
legend.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
legend.style.color = 'white';
legend.style.padding = '10px';
legend.style.fontFamily = 'Arial, sans-serif';
legend.style.fontSize = '14px';
// Initially show the excavator legend.
legend.innerHTML = excavatorLegend;
document.body.appendChild(legend);

// 10. Extra Camera Controls.
const camKeys = { i: false, k: false, j: false, l: false };
let cameraAngle = Math.PI / 1.5;
let cameraDistance = 10;
let cameraHeight = 5;
const zoomSpeed = 0.1;
const orbitSpeed = 0.02;

window.addEventListener('keydown', (event) => {
  // Switch active vehicle with keys 1, 2, or 3.
  if (event.key === '1') {
    window.activeVehicle = excavator;
    legend.innerHTML = excavatorLegend;
    return;
  } else if (event.key === '2') {
    window.activeVehicle = dumpTruck;
    legend.innerHTML = dumpTruckLegend;
    return;
  } else if (event.key === '3') {
    window.activeVehicle = snowPlow;
    legend.innerHTML = snowPlowLegend;
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

  // Update each vehicle.
  excavator.update();
  dumpTruck.update();
  snowPlow.update();
  // Update the block.
  block.update();

  // Camera control logic.
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
