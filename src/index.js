// index.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Import helper modules
import { initPhysics, updatePhysics } from './physics.js';
import { createTerrain } from './terrain.js';
import { Excavator } from './Excavator.js';
import { DumpTruck } from './DumpTruck.js';
import { SnowPlow } from './SnowPlow.js';
import { Block } from './Block.js';
import { createSceneryExtended } from './scenery.js';
import { createSnowLayer, updateSnowLayer } from './snowAccumulation.js';
import { createFallingSnow, updateFallingSnow } from './fallingSnow.js';
import { createOptimizedNeighborhood } from './neighborhoods.js';
import { createMediterraneanVillage } from './mediterraneanVillage.js';
// Import new modular components
import { createBridge, createRamp } from './Bridge.js';
// Note: if you created the environment.js module, you'll also want to import:
// import { createWater, createSky } from './environment.js';

// Ensure browser object exists
window.browser = window.browser || { runtime: {}, tabs: {}, storage: {} };
console.log('Starting index.js');

// 1. Create the Scene
const scene = new THREE.Scene();

// 2. Initialize Physics
const physicsWorld = initPhysics();

// 3. Create the Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);

// 4. Create Terrain
const groundMaterial = new CANNON.Material('ground');
const terrainData = createTerrain(scene, physicsWorld, groundMaterial);
const getHeight = terrainData.getHeight;
const terrainSize = terrainData.terrainSize || 100;

// 5. Create Vehicles
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(-6, 0.35, 0);

const dumpTruck = new DumpTruck(scene, physicsWorld, groundMaterial);
dumpTruck.baseBody.position.set(4, 0.35, 0);

const snowPlow = new SnowPlow(scene, physicsWorld, groundMaterial);
snowPlow.baseBody.position.set(10, 0.35, 0);

// Set the active vehicle (default: excavator)
window.activeVehicle = excavator;

// 6. Create a Block
const block = new Block(scene, physicsWorld, new THREE.Vector3(0, 10, 0));

// 7. Add Basic Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 40, 20);
scene.add(directionalLight);

// 8. Create Procedural Water
// If you've created environment.js, replace this with:
// const water = createWater(scene);
const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
const waterMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 }
  },
  vertexShader: /* glsl */ `
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Displace the surface to simulate waves.
      pos.z += sin(pos.x * 0.1 + time) * 1.0;
      pos.z += sin(pos.y * 0.1 + time * 1.5) * 1.0;
      vNormal = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      // Blend between a darker and lighter blue based on a simple light effect.
      float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
      vec3 waterColor = mix(vec3(0.0, 0.2, 0.4), vec3(0.0, 0.5, 0.8), intensity);
      gl_FragColor = vec4(waterColor, 1.0);
    }
  `,
  transparent: false,
});
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.y = -2;  // Lower the water by 2 units
scene.add(water);

// 9. Create Procedural Sky
// If you've created environment.js, replace this with:
// const sky = createSky(scene);
const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide, // Render inside of the sphere.
  uniforms: {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0xffffff) },
    offset: { value: 33 },
    exponent: { value: 0.6 }
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;
    void main() {
      // Create a smooth vertical gradient.
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// 10. Set up Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  rootElement.appendChild(renderer.domElement);
}

// 11. Set up UI Controls
// 11.1 Vehicle controls legend
const commonNote = `<p><em>Switch vehicles with 1, 2, or 3.</em></p>`;
const excavatorLegend = `
  <h3>Excavator Controls</h3>
  <ul style="list-style: none; padding: 0;">
    <li>W: Move Forward</li>
    <li>S: Move Backward</li>
    <li>A: Turn Left</li>
    <li>D: Turn Right</li>
    <li>Q/E: Rotate Turret</li>
    <li>R/F: Boom Up/Down</li>
    <li>T/G: Stick Extend/Retract</li>
    <li>Y/H: Bucket Curl</li>
    <li>Space: Dig</li>
  </ul>
  ${commonNote}
`;
const dumpTruckLegend = `
  <h3>Dump Truck Controls</h3>
  <ul style="list-style: none; padding: 0;">
    <li>Arrow Up/Down: Move</li>
    <li>Arrow Left/Right: Turn</li>
    <li>B/N: Tipper Up/Down</li>
  </ul>
  ${commonNote}
`;
const snowPlowLegend = `
  <h3>Snow Plow Controls</h3>
  <ul style="list-style: none; padding: 0;">
    <li>Arrow Up/Down: Move</li>
    <li>Arrow Left/Right: Turn</li>
    <li>Z/X: Blade Rotate</li>
    <li>V/C: Lift/Lower Assembly</li>
  </ul>
  ${commonNote}
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
legend.innerHTML = excavatorLegend;
document.body.appendChild(legend);

// 11.2 Snow Controls
let snowEnabled = false;
let snowLayer = null;
let fallingSnow = null;
const snowToggleButton = document.createElement('button');
snowToggleButton.innerHTML = "Enable Snow";
snowToggleButton.style.position = 'absolute';
snowToggleButton.style.top = '10px';
snowToggleButton.style.right = '10px';
snowToggleButton.style.padding = '10px';
snowToggleButton.style.fontSize = '14px';
document.body.appendChild(snowToggleButton);

let accumulationMultiplier = 0.2;
const accumulationSliderContainer = document.createElement('div');
accumulationSliderContainer.style.position = 'absolute';
accumulationSliderContainer.style.top = '50px';
accumulationSliderContainer.style.right = '10px';
accumulationSliderContainer.style.padding = '10px';
accumulationSliderContainer.style.fontSize = '14px';
accumulationSliderContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
accumulationSliderContainer.style.color = 'white';
accumulationSliderContainer.innerHTML = `<label for="accumulationRate">Snow Speed:</label>
<input id="accumulationRate" type="range" min="0" max="1" step="0.01" value="0.2" />`;
document.body.appendChild(accumulationSliderContainer);

const accumulationSlider = document.getElementById('accumulationRate');
accumulationSlider.addEventListener('input', (event) => {
  accumulationMultiplier = parseFloat(event.target.value);
});

snowToggleButton.addEventListener('click', () => {
  if (!snowEnabled) {
    snowLayer = createSnowLayer(terrainSize, 64);
    fallingSnow = createFallingSnow(terrainSize);
    scene.add(snowLayer);
    scene.add(fallingSnow);
    snowEnabled = true;
    snowToggleButton.innerHTML = "Disable Snow";
  } else {
    if (snowLayer) {
      scene.remove(snowLayer);
      snowLayer.geometry.dispose();
      snowLayer.material.dispose();
      snowLayer = null;
    }
    if (fallingSnow) {
      scene.remove(fallingSnow);
      fallingSnow.geometry.dispose();
      fallingSnow.material.dispose();
      fallingSnow = null;
    }
    snowEnabled = false;
    snowToggleButton.innerHTML = "Enable Snow";
  }
});

// 12. Create environment elements
// 12.1 Create extended scenery for the central patch
createSceneryExtended(scene, physicsWorld, groundMaterial, getHeight, terrainSize);

// 12.2 Create an optimized neighborhood
const patchSize = 100;
const neighborhoodOrigin = new THREE.Vector3(150, 0, 150);
createOptimizedNeighborhood(
  scene,
  physicsWorld,
  groundMaterial,
  getHeight,
  patchSize,
  neighborhoodOrigin,
  'Lakeside'
);

// 12.3 Create Mediterranean Seaside Village
const medPatchSize = 200;
const medOrigin = new THREE.Vector3(-400, 0, -400);
const medVillage = createMediterraneanVillage(
  scene,
  physicsWorld,
  groundMaterial,
  getHeight,
  medPatchSize,
  medOrigin
);

// 12.4 Create connections between areas
// Create a ramp from the Mediterranean Village to the Bridge Connection Point
const rampStart = new THREE.Vector3(-350, 0.2, -350);
const rampEnd = medVillage.bridgeConnectionPoint;
createRamp(scene, physicsWorld, groundMaterial, rampStart, rampEnd);

// Create a Golden Gate style Bridge between Neighborhoods
const bridgeStart = new THREE.Vector3(
  neighborhoodOrigin.x + patchSize,
  0.2,
  neighborhoodOrigin.z + patchSize / 2
);
const bridgeEnd = medVillage.bridgeConnectionPoint;
createBridge(scene, physicsWorld, groundMaterial, bridgeStart, bridgeEnd);

// 13. Camera Controls
const camKeys = { i: false, k: false, j: false, l: false };
let cameraAngle = Math.PI / 1.5;
let cameraDistance = 10;
let cameraHeight = 5;
const zoomSpeed = 0.1;
const orbitSpeed = 0.02;

// 14. Event Listeners
// 14.1 Vehicle selection
window.addEventListener('keydown', (event) => {
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
  switch (event.key.toLowerCase()) {
    case 'i': camKeys.i = true; break;
    case 'k': camKeys.k = true; break;
    case 'j': camKeys.j = true; break;
    case 'l': camKeys.l = true; break;
    default: break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'i': camKeys.i = false; break;
    case 'k': camKeys.k = false; break;
    case 'j': camKeys.j = false; break;
    case 'l': camKeys.l = false; break;
    default: break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 15. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  updatePhysics(physicsWorld);
  
  // Update the water shader time uniform to animate the waves
  waterMaterial.uniforms.time.value += 0.02;

  // Update vehicles
  excavator.baseGroup.position.copy(excavator.baseBody.position);
  dumpTruck.baseGroup.position.copy(dumpTruck.baseBody.position);
  snowPlow.baseGroup.position.copy(snowPlow.baseBody.position);

  excavator.update();
  dumpTruck.update();
  snowPlow.update();
  block.update();

  // Update camera based on controls
  if (camKeys.i) cameraDistance = Math.max(2, cameraDistance - zoomSpeed);
  if (camKeys.k) cameraDistance = Math.min(50, cameraDistance + zoomSpeed);
  if (camKeys.j) cameraAngle -= orbitSpeed;
  if (camKeys.l) cameraAngle += orbitSpeed;

  // Position camera relative to active vehicle
  const targetPos = window.activeVehicle.baseGroup.position.clone();
  const offsetX = cameraDistance * Math.sin(cameraAngle);
  const offsetZ = cameraDistance * Math.cos(cameraAngle);
  camera.position.set(targetPos.x + offsetX, targetPos.y + cameraHeight, targetPos.z + offsetZ);
  camera.lookAt(targetPos);

  // Update snow if enabled
  if (snowEnabled) {
    if (snowLayer) updateSnowLayer(snowLayer, window.activeVehicle, accumulationMultiplier);
    if (fallingSnow) updateFallingSnow(fallingSnow, terrainSize);
  }

  renderer.render(scene, camera);
}
animate();