import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { initPhysics, updatePhysics } from './physics.js';
import { createTerrain } from './terrain.js';
import { Excavator } from './Excavator.js';
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

// 5. Create Excavator
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(0, 0.35, 0);

// 6. Create a single Block that starts in the air and drops into the center
const block = new Block(scene, physicsWorld, new THREE.Vector3(0, 10, 0));

// 7. Basic Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// 8. Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  rootElement.appendChild(renderer.domElement);
}

// 9. On-screen Controls Legend
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
  <h3>Excavator Controls</h3>
  <ul style="list-style: none; padding: 0;">
    <li><strong>W</strong>: Move Forward</li>
    <li><strong>S</strong>: Move Backward</li>
    <li><strong>A</strong>: Turn Left</li>
    <li><strong>D</strong>: Turn Right</li>
    <li><strong>Q</strong>: Rotate Turret Left</li>
    <li><strong>E</strong>: Rotate Turret Right</li>
    <li><strong>R</strong>: Raise Boom / (Also Release Cubes)</li>
    <li><strong>F</strong>: Lower Boom</li>
    <li><strong>T</strong>: Extend Stick</li>
    <li><strong>G</strong>: Retract Stick</li>
    <li><strong>Y</strong>: Curl Bucket In</li>
    <li><strong>H</strong>: Curl Bucket Out</li>
    <li><strong>Space</strong>: Pick Up Cubes</li>
    <li><strong>I</strong>: Zoom In (Camera)</li>
    <li><strong>K</strong>: Zoom Out (Camera)</li>
    <li><strong>J</strong>: Orbit Left (Camera)</li>
    <li><strong>L</strong>: Orbit Right (Camera)</li>
  </ul>
`;
document.body.appendChild(legend);

// 10. Extra Camera Controls
const keys = { i: false, k: false, j: false, l: false };
let cameraAngle = Math.PI / 1.5;
let cameraDistance = 10;
let cameraHeight = 5;
const zoomSpeed = 0.1;
const orbitSpeed = 0.02;

window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'i': keys.i = true; break;
    case 'k': keys.k = true; break;
    case 'j': keys.j = true; break;
    case 'l': keys.l = true; break;
    default: break;
  }
});
window.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'i': keys.i = false; break;
    case 'k': keys.k = false; break;
    case 'j': keys.j = false; break;
    case 'l': keys.l = false; break;
    default: break;
  }
});

// 11. Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Update physics simulation
  updatePhysics(physicsWorld);

  // Update excavator and block positions from physics
  excavator.update();
  block.update();

  // --- Camera control logic ---
  if (keys.i) {
    cameraDistance = Math.max(2, cameraDistance - zoomSpeed);
  }
  if (keys.k) {
    cameraDistance = Math.min(50, cameraDistance + zoomSpeed);
  }
  if (keys.j) {
    cameraAngle -= orbitSpeed;
  }
  if (keys.l) {
    cameraAngle += orbitSpeed;
  }
  const ePos = excavator.baseGroup.position.clone();
  const offsetX = cameraDistance * Math.sin(cameraAngle);
  const offsetZ = cameraDistance * Math.cos(cameraAngle);
  camera.position.set(ePos.x + offsetX, ePos.y + cameraHeight, ePos.z + offsetZ);
  camera.lookAt(ePos);

  renderer.render(scene, camera);
}
animate();

// 12. Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
