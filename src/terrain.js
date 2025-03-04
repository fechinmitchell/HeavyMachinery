import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Excavator } from './Excavator';
import { createTerrain } from './terrain';

window.browser = window.browser || { runtime: {}, tabs: {}, storage: {} };
console.log('Starting index.js');

// Create scene
const scene = new THREE.Scene();
console.log('Scene created');

// Set up physics world
const physicsWorld = new CANNON.World();
physicsWorld.gravity.set(0, -9.82, 0);
physicsWorld.broadphase = new CANNON.NaiveBroadphase();
physicsWorld.solver.iterations = 10;
physicsWorld.defaultContactMaterial.friction = 0.5;
physicsWorld.defaultContactMaterial.restitution = 0.1;
console.log('Physics world initialized');

// Instead of adding a flat terrain plane, instantiate our realistic terrain:
const playerPosition = new THREE.Vector3(0, 0, 0);
const terrain = createTerrain(scene, physicsWorld, playerPosition);
console.log('Realistic terrain created');

// Create excavator instance
const excavator = new Excavator(scene, physicsWorld);
excavator.baseBody.position.set(0, 0.35, 0);
console.log('Excavator initialized');

// Set up lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
console.log('Lights added');

// Set up camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 20, 50);
camera.lookAt(0, 0, 0);
console.log('Camera created and positioned');

// Set up renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) console.error('Root element not found!');
else {
  rootElement.appendChild(renderer.domElement);
  console.log('Renderer initialized:', renderer.domElement);
}

// Optional: add a control legend
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
    <li><strong>R</strong>: Raise Boom</li>
    <li><strong>F</strong>: Lower Boom</li>
    <li><strong>T</strong>: Extend Stick</li>
    <li><strong>G</strong>: Retract Stick</li>
    <li><strong>Y</strong>: Curl Bucket In</li>
    <li><strong>H</strong>: Curl Bucket Out</li>
    <li><strong>Space</strong>: Dig</li>
  </ul>
`;
document.body.appendChild(legend);
console.log('Control legend added');

function animate() {
  requestAnimationFrame(animate);
  // Update physics world
  physicsWorld.step(1 / 60);

  // Update excavator logic
  excavator.update();

  // Update terrain with player's current position (if needed to generate new chunks)
  terrain.update(playerPosition);

  renderer.render(scene, camera);
}
animate();
console.log('Animation loop started');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  console.log('Window resized');
});
