// index.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Excavator } from './Excavator.js';

window.browser = window.browser || { runtime: {}, tabs: {}, storage: {} };
console.log('Starting index.js');

const scene = new THREE.Scene();
console.log('Scene created');

const physicsWorld = new CANNON.World();
physicsWorld.gravity.set(0, -9.82, 0);
physicsWorld.broadphase = new CANNON.NaiveBroadphase();
physicsWorld.solver.iterations = 10;
physicsWorld.defaultContactMaterial.friction = 0.5;
physicsWorld.defaultContactMaterial.restitution = 0.1;
console.log('Physics world initialized');

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
console.log('Camera created and positioned');

const terrainSize = 20;
const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize);
const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x33cc33 });
const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrainMesh.rotation.x = -Math.PI / 2;
scene.add(terrainMesh);
console.log('Flat terrain plane added (visual)');

const groundMaterial = new CANNON.Material('ground');
const terrainBody = new CANNON.Body({ mass: 0, material: groundMaterial });
terrainBody.addShape(new CANNON.Plane());
terrainBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
physicsWorld.addBody(terrainBody);
console.log('Terrain physics added');

const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(0, 0.35, 0);
// Rotate excavator to show front (arm side) toward camera
const cameraPosition = new CANNON.Vec3(camera.position.x, camera.position.y, camera.position.z);
const excavatorPosition = excavator.baseBody.position;
const directionToCamera = cameraPosition.vsub(excavatorPosition);
directionToCamera.y = 0;
directionToCamera.normalize();
const armDirection = new CANNON.Vec3(0, 0, 1); // Arm side (positive z in model)
const quaternion = new CANNON.Quaternion();
quaternion.setFromVectors(armDirection, directionToCamera);
excavator.baseBody.quaternion.copy(quaternion);
excavator.baseGroup.quaternion.copy(quaternion);
console.log('Excavator initialized');

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);
console.log('Lights added');

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) console.error('Root element not found!');
else {
  rootElement.appendChild(renderer.domElement);
  console.log('Renderer initialized:', renderer.domElement);
}

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
    <li><strong>I</strong>: Zoom In (Camera)</li>
    <li><strong>K</strong>: Zoom Out (Camera)</li>
    <li><strong>J</strong>: Orbit Left (Camera)</li>
    <li><strong>L</strong>: Orbit Right (Camera)</li>
  </ul>
`;
document.body.appendChild(legend);
console.log('Control legend added');

// Camera control variables
const keys = {
  i: false, // Zoom in
  k: false, // Zoom out
  j: false, // Orbit left
  l: false  // Orbit right
};

// Add key event listeners
window.addEventListener('keydown', (event) => {
  switch (event.key.toLowerCase()) {
    case 'i': keys.i = true; break;
    case 'k': keys.k = true; break;
    case 'j': keys.j = true; break;
    case 'l': keys.l = true; break;
    default: break; // Added default case
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'i': keys.i = false; break;
    case 'k': keys.k = false; break;
    case 'j': keys.j = false; break;
    case 'l': keys.l = false; break;
    default: break; // Added default case
  }
});

function animate() {
  requestAnimationFrame(animate);
  physicsWorld.step(1 / 60);
  excavator.update();

  // Camera controls
  const zoomSpeed = 0.05;
  const orbitSpeed = 0.02;
  const excavatorPos = new THREE.Vector3(0, 0.35, 0); // Excavator center

  // Zoom in/out
  if (keys.i) {
    camera.position.lerp(excavatorPos, zoomSpeed); // Move closer to excavator
  }
  if (keys.k) {
    const directionAway = camera.position.clone().sub(excavatorPos).normalize();
    camera.position.add(directionAway.multiplyScalar(zoomSpeed)); // Move away from excavator
  }

  // Orbit around excavator
  if (keys.j || keys.l) {
    const angle = keys.j ? orbitSpeed : -orbitSpeed;
    const camPos = camera.position.clone().sub(excavatorPos);
    const rotatedPos = camPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    camera.position.copy(excavatorPos.clone().add(rotatedPos));
  }

  camera.lookAt(excavatorPos); // Always look at excavator
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