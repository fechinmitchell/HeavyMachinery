// index.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Import helper modules.
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

// Ensure browser object exists.
window.browser = window.browser || { runtime: {}, tabs: {}, storage: {} };
console.log('Starting index.js');

// 1. Create the Scene.
const scene = new THREE.Scene();

// 2. Initialize Physics.
const physicsWorld = initPhysics();

// 3. Create the Camera.
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 20, 30);
camera.lookAt(0, 0, 0);

// 4. Create Terrain.
const groundMaterial = new CANNON.Material('ground');
const terrainData = createTerrain(scene, physicsWorld, groundMaterial);
const getHeight = terrainData.getHeight;
const terrainSize = terrainData.terrainSize || 100;

// 5. Create Vehicles.
const excavator = new Excavator(scene, physicsWorld, groundMaterial);
excavator.baseBody.position.set(-6, 0.35, 0);

const dumpTruck = new DumpTruck(scene, physicsWorld, groundMaterial);
dumpTruck.baseBody.position.set(4, 0.35, 0);

const snowPlow = new SnowPlow(scene, physicsWorld, groundMaterial);
snowPlow.baseBody.position.set(10, 0.35, 0);

// Set the active vehicle (default: excavator).
window.activeVehicle = excavator;

// 6. Create a Block.
const block = new Block(scene, physicsWorld, new THREE.Vector3(0, 10, 0));

// 7. Add Basic Lights.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(20, 40, 20);
scene.add(directionalLight);

// --- Add Procedural Water ---
// Create a large plane with a custom shader that displaces vertices to mimic waves.
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

// --- Add Procedural Sky ---
// Create a large sphere with a gradient shader to simulate a natural sky.
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

// 8. Set up Renderer.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  rootElement.appendChild(renderer.domElement);
}

// 9. On-screen Controls Legend.
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

// 10. Create Extended Scenery for the Central Patch.
createSceneryExtended(scene, physicsWorld, groundMaterial, getHeight, terrainSize);

// 11. Create a New Optimized Neighborhood.
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

// 12. Create Mediterranean Seaside Village.
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

// 12.5 Create a Ramp from the Mediterranean Village to the Bridge Connection Point.
function createRamp(scene, physicsWorld, groundMaterial, startPoint, endPoint) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dz = endPoint.z - startPoint.z;
  const horizontalLength = Math.sqrt(dx * dx + dz * dz);
  const rampLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const rampWidth = 6;
  const rampThickness = 0.5;
  const rampGeometry = new THREE.BoxGeometry(rampLength, rampThickness, rampWidth);
  const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);
  const midPoint = new THREE.Vector3(
    (startPoint.x + endPoint.x) / 2,
    (startPoint.y + endPoint.y) / 2,
    (startPoint.z + endPoint.z) / 2
  );
  rampMesh.position.copy(midPoint);
  const angleY = Math.atan2(dz, dx);
  const angleZ = -Math.atan2(dy, horizontalLength);
  rampMesh.rotation.order = "YXZ";
  rampMesh.rotation.y = angleY;
  rampMesh.rotation.z = angleZ;
  scene.add(rampMesh);
  const rampShape = new CANNON.Box(new CANNON.Vec3(rampLength / 2, rampThickness / 2, rampWidth / 2));
  const rampBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial
  });
  rampBody.addShape(rampShape);
  rampBody.position.copy(rampMesh.position);
  rampBody.quaternion.copy(rampMesh.quaternion);
  physicsWorld.addBody(rampBody);
  return rampMesh;
}

const rampStart = new THREE.Vector3(-350, 0.2, -350);
const rampEnd = medVillage.bridgeConnectionPoint;
createRamp(scene, physicsWorld, groundMaterial, rampStart, rampEnd);

// 13. Create a Golden Gate style Bridge Between Neighborhoods.
// 13. Create a Golden Gate style Bridge Between Neighborhoods.
function createBridge(scene, physicsWorld, groundMaterial, start, end) {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const bridgeWidth = 8;        // Wider for a major bridge
    const deckThickness = 0.5;    // Thickness of the bridge deck
    const bridgeColor = 0xC0392B; // Iconic "International Orange"
    const cableColor = 0x111111;  // Dark color for cables
    const towerHeight = 30;       // Height of the suspension towers
    const towerWidth = 4;
    const towerDepth = 4;
    const numSuspensionCables = 20;
    const supportColor = 0x7D7D7D; // Concrete color for supports
  
    // Calculate bridge orientation
    const bridgeAngle = -Math.atan2(dz, dx);
  
    // Deck height and ramp parameters
    const deckHeight = Math.max(start.y, end.y) + 15; // Higher deck for approaches
    const startHeightDifference = deckHeight - start.y;
    const endHeightDifference = deckHeight - end.y;
    const desiredGradient = 0.05; // Gentler 5% slope (1:20)
    const startRampLength = startHeightDifference / desiredGradient; // Horizontal distance for start ramp
    const endRampLength = endHeightDifference / desiredGradient; // Horizontal distance for end ramp
    const minTotalLength = startRampLength + endRampLength + 20; // 20 as minimum main span
  
    if (length < minTotalLength) {
      console.warn(`Bridge length (${length}) too short for gentle ramps. Minimum required: ${minTotalLength}`);
    }
  
    const mainSpanLength = length - (startRampLength + endRampLength);
  
    // Create a group to hold the bridge components
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
    bridgeGroup.rotation.y = bridgeAngle;
    scene.add(bridgeGroup);
  
    // --- MAIN DECK SPAN ---
    const mainDeckGeometry = new THREE.BoxGeometry(mainSpanLength, deckThickness, bridgeWidth);
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.2
    });
    const mainDeckMesh = new THREE.Mesh(mainDeckGeometry, deckMaterial);
    mainDeckMesh.position.set(0, deckHeight, 0);
    bridgeGroup.add(mainDeckMesh);
  
    // --- BRIDGE ABUTMENTS ---
    function createBridgeAbutment(isStart) {
      const direction = isStart ? -1 : 1;
      const rampLength = isStart ? startRampLength : endRampLength;
      const abutmentX = direction * (mainSpanLength / 2 + rampLength * 0.5);
      const groundY = isStart ? start.y : end.y;
      const abutmentHeight = (deckHeight - groundY) * 0.8;
      const abutmentWidth = bridgeWidth * 1.5;
      const abutmentDepth = rampLength * 0.5;
      
      const abutmentShape = new THREE.Shape();
      abutmentShape.moveTo(-abutmentWidth/2, 0);
      abutmentShape.lineTo(abutmentWidth/2, 0);
      abutmentShape.lineTo(abutmentWidth*0.4, abutmentHeight);
      abutmentShape.lineTo(-abutmentWidth*0.4, abutmentHeight);
      abutmentShape.lineTo(-abutmentWidth/2, 0);
      
      const extrudeSettings = {
        steps: 1,
        depth: abutmentDepth,
        bevelEnabled: false
      };
      
      const abutmentGeometry = new THREE.ExtrudeGeometry(abutmentShape, extrudeSettings);
      const abutmentMaterial = new THREE.MeshStandardMaterial({
        color: supportColor,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const abutment = new THREE.Mesh(abutmentGeometry, abutmentMaterial);
      abutment.rotation.x = -Math.PI / 2;
      abutment.position.set(abutmentX, groundY, -abutmentDepth/2);
      bridgeGroup.add(abutment);
      
      // Physics for abutment
      const abutmentShape1 = new CANNON.Box(new CANNON.Vec3(abutmentWidth/2, abutmentHeight/2, abutmentDepth/2));
      const abutmentBody = new CANNON.Body({
        mass: 0,
        material: groundMaterial
      });
      abutmentBody.addShape(abutmentShape1);
      const localPos = new THREE.Vector3(abutmentX, groundY + abutmentHeight/2, 0);
      const worldPos = localPos.applyMatrix4(
        new THREE.Matrix4().makeRotationY(bridgeAngle)
      ).add(bridgeGroup.position);
      abutmentBody.position.set(worldPos.x, worldPos.y, worldPos.z);
      abutmentBody.quaternion.setFromEuler(0, bridgeAngle, 0);
      physicsWorld.addBody(abutmentBody);
      
      // Support columns
      const numColumns = 3;
      const columnSpacing = rampLength * 0.25;
      const columnRadius = 1.2;
      const columnMaterial = new THREE.MeshStandardMaterial({
        color: supportColor,
        roughness: 0.7,
        metalness: 0.3
      });
      
      for (let i = 1; i <= numColumns; i++) {
        const columnX = abutmentX + direction * (abutmentDepth/2 + i * columnSpacing);
        const t = i / (numColumns + 1);
        const columnTop = deckHeight - (deckHeight - groundY) * t;
        const columnHeight = columnTop - groundY;
        
        const columnGeometry = new THREE.CylinderGeometry(
          columnRadius,
          columnRadius * 1.2,
          columnHeight,
          12
        );
        
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(columnX, groundY + columnHeight/2, 0);
        bridgeGroup.add(column);
        
        const columnShape = new CANNON.Cylinder(
          columnRadius,
          columnRadius * 1.2,
          columnHeight,
          12
        );
        const columnBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        columnBody.addShape(columnShape);
        const colLocalPos = new THREE.Vector3(columnX, groundY + columnHeight/2, 0);
        const colWorldPos = colLocalPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        columnBody.position.set(colWorldPos.x, colWorldPos.y, colWorldPos.z);
        columnBody.quaternion.setFromEuler(0, bridgeAngle, 0);
        physicsWorld.addBody(columnBody);
      }
    }
    
    createBridgeAbutment(true);
    createBridgeAbutment(false);
    
    // --- APPROACH RAMPS (DRIVABLE ROAD SURFACES) ---
    const createRoadRamp = (isStart) => {
      const rampSegments = 12;
      const direction = isStart ? -1 : 1;
      const rampLength = isStart ? startRampLength : endRampLength;
      const startX = direction * mainSpanLength / 2;
      const startY = deckHeight;
      const endX = direction * (mainSpanLength / 2 + rampLength);
      const endY = isStart ? start.y : end.y;
      
      // Define the road path with gentle curve at the end
      const points = [];
      // First point connects exactly to the main span
      points.push(new THREE.Vector3(startX, startY, 0));
      
      if (isStart) {
        // Straight approach for start ramp
        for (let i = 1; i <= rampSegments; i++) {
          const t = i / rampSegments;
          const x = startX + (endX - startX) * t;
          const y = startY - (startY - endY) * t; // Linear slope
          const z = 0; // Straight path
          points.push(new THREE.Vector3(x, y, z));
        }
      } else {
        // Curved L-shape for end ramp
        const curveSegments = 8; // Number of segments for the curve
        const straightSegments = rampSegments - curveSegments;
        
        // First part - straight descent
        for (let i = 1; i <= straightSegments; i++) {
          const t = i / straightSegments;
          const x = startX + (endX - startX) * 0.6 * t;
          const y = startY - (startY - endY) * 0.7 * t;
          const z = 0;
          points.push(new THREE.Vector3(x, y, z));
        }
        
        // Second part - curved descent with turn to the left
        for (let i = 1; i <= curveSegments; i++) {
          const t = i / curveSegments;
          const x = startX + (endX - startX) * (0.6 + 0.4 * t);
          const y = startY - (startY - endY) * (0.7 + 0.3 * t);
          // Add increasing Z offset to curve to the left (negative Z direction)
          const curveAmount = t * t * bridgeWidth * 2;
          const z = -curveAmount;
          points.push(new THREE.Vector3(x, y, z));
        }
      }
      
      // Create a smooth path for visualization and physics
      const rampCurve = new THREE.CatmullRomCurve3(points);
      const rampPoints = rampCurve.getPoints(rampSegments);
      
      // Create road surface mesh using sweep geometry
      const roadProfileShape = new THREE.Shape();
      roadProfileShape.moveTo(-bridgeWidth/2, 0);
      roadProfileShape.lineTo(bridgeWidth/2, 0);
      roadProfileShape.lineTo(bridgeWidth/2, deckThickness);
      roadProfileShape.lineTo(-bridgeWidth/2, deckThickness);
      roadProfileShape.lineTo(-bridgeWidth/2, 0);
      
      const sweepPath = new THREE.CatmullRomCurve3(rampPoints);
      const extrudeSettings = {
        steps: rampSegments,
        bevelEnabled: false,
        extrudePath: sweepPath
      };
      
      const rampGeometry = new THREE.ExtrudeGeometry(roadProfileShape, extrudeSettings);
      const ramp = new THREE.Mesh(rampGeometry, deckMaterial);
      // Removed the following rotation to prevent the ramp from lying flat:
      // ramp.rotation.x = Math.PI / 2;
      bridgeGroup.add(ramp);
      
      // Physics for ramp segments using the actual path points
      for (let i = 0; i < rampSegments; i++) {
        const p1 = rampPoints[i];
        const p2 = rampPoints[i + 1];
        const segDirection = new THREE.Vector3().subVectors(p2, p1).normalize();
        const segLength = p1.distanceTo(p2);
        
        const segShape = new CANNON.Box(new CANNON.Vec3(segLength / 2, bridgeWidth / 2, deckThickness / 2));
        const segBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        segBody.addShape(segShape);
        
        // Position at midpoint of segment
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const localPos = midPoint.clone();
        const worldPos = localPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        segBody.position.set(worldPos.x, worldPos.y, worldPos.z);
        
        // Orient along segment direction
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(segDirection, up).normalize();
        const mat = new THREE.Matrix4().makeBasis(segDirection, up, right);
        const quat = new THREE.Quaternion().setFromRotationMatrix(mat);
        
        // Apply bridge rotation and then segment orientation
        const q1 = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), bridgeAngle);
        const q2 = new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w);
        segBody.quaternion = q1.mult(q2);
        
        physicsWorld.addBody(segBody);
      }
      
      // Guardrails and reflector posts code remains unchanged...
      // (left out here for brevity)
    };
    
    createRoadRamp(true);
    createRoadRamp(false);
    
    // --- ROAD MARKINGS ---
    const roadMarkingsGeometry = new THREE.PlaneGeometry(mainSpanLength, bridgeWidth * 0.1);
    const roadMarkingsMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const roadMarkings = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    roadMarkings.rotation.x = -Math.PI / 2;
    roadMarkings.position.set(0, deckHeight + deckThickness / 2 + 0.01, 0);
    bridgeGroup.add(roadMarkings);
    
    // --- GUARDRAILS FOR MAIN SPAN ---
    const guardrailHeightMain = 1.5;
    const guardrailGeometryMain = new THREE.BoxGeometry(mainSpanLength, guardrailHeightMain, 0.3);
    const guardrailMaterialMain = new THREE.MeshStandardMaterial({ 
      color: bridgeColor,
      roughness: 0.5,
      metalness: 0.7
    });
    const leftGuardrailMain = new THREE.Mesh(guardrailGeometryMain, guardrailMaterialMain);
    leftGuardrailMain.position.set(0, deckHeight + guardrailHeightMain / 2, bridgeWidth / 2 - 0.2);
    bridgeGroup.add(leftGuardrailMain);
    const rightGuardrailMain = new THREE.Mesh(guardrailGeometryMain, guardrailMaterialMain);
    rightGuardrailMain.position.set(0, deckHeight + guardrailHeightMain / 2, -bridgeWidth / 2 + 0.2);
    bridgeGroup.add(rightGuardrailMain);
    
    // --- TOWERS ---
    const towerOffset = mainSpanLength / 4;
    const towerMaterial = new THREE.MeshStandardMaterial({ 
      color: bridgeColor,
      roughness: 0.3,
      metalness: 0.8
    });
    const tower1Geometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
    const tower1 = new THREE.Mesh(tower1Geometry, towerMaterial);
    tower1.position.set(-towerOffset, deckHeight + towerHeight / 2, 0);
    bridgeGroup.add(tower1);
    const tower2Geometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
    const tower2 = new THREE.Mesh(tower2Geometry, towerMaterial);
    tower2.position.set(towerOffset, deckHeight + towerHeight / 2, 0);
    bridgeGroup.add(tower2);
    
    // --- CROSSBEAMS FOR TOWERS ---
    const crossbeamGeometry = new THREE.BoxGeometry(towerWidth, 2, bridgeWidth + 2);
    const tower1TopCrossbeam = new THREE.Mesh(crossbeamGeometry, towerMaterial);
    tower1TopCrossbeam.position.set(-towerOffset, deckHeight + towerHeight - 2, 0);
    bridgeGroup.add(tower1TopCrossbeam);
    const tower1MiddleCrossbeam = new THREE.Mesh(crossbeamGeometry, towerMaterial);
    tower1MiddleCrossbeam.position.set(-towerOffset, deckHeight + towerHeight / 2, 0);
    bridgeGroup.add(tower1MiddleCrossbeam);
    const tower2TopCrossbeam = new THREE.Mesh(crossbeamGeometry, towerMaterial);
    tower2TopCrossbeam.position.set(towerOffset, deckHeight + towerHeight - 2, 0);
    bridgeGroup.add(tower2TopCrossbeam);
    const tower2MiddleCrossbeam = new THREE.Mesh(crossbeamGeometry, towerMaterial);
    tower2MiddleCrossbeam.position.set(towerOffset, deckHeight + towerHeight / 2, 0);
    bridgeGroup.add(tower2MiddleCrossbeam);
    
    // --- SUSPENSION CABLES (ANCHOR AT ABUTMENTS) ---
    const mainCableMaterial = new THREE.MeshStandardMaterial({ 
      color: cableColor,
      roughness: 0.3,
      metalness: 0.9
    });
    
    const abutmentStartX = -mainSpanLength / 2 - startRampLength * 0.5;
    const abutmentEndX = mainSpanLength / 2 + endRampLength * 0.5;
    
    const points1 = [];
    points1.push(new THREE.Vector3(abutmentStartX, deckHeight + 5, bridgeWidth / 2));
    points1.push(new THREE.Vector3(-towerOffset, deckHeight + towerHeight, bridgeWidth / 2));
    points1.push(new THREE.Vector3(0, deckHeight + towerHeight - 5, bridgeWidth / 2));
    points1.push(new THREE.Vector3(towerOffset, deckHeight + towerHeight, bridgeWidth / 2));
    points1.push(new THREE.Vector3(abutmentEndX, deckHeight + 5, bridgeWidth / 2));
    const mainCableCurve1 = new THREE.CatmullRomCurve3(points1);
    const mainCableTube1 = new THREE.TubeGeometry(mainCableCurve1, 50, 0.3, 8, false);
    const mainCable1 = new THREE.Mesh(mainCableTube1, mainCableMaterial);
    bridgeGroup.add(mainCable1);
    
    const points2 = [];
    points2.push(new THREE.Vector3(abutmentStartX, deckHeight + 5, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(-towerOffset, deckHeight + towerHeight, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(0, deckHeight + towerHeight - 5, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(towerOffset, deckHeight + towerHeight, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(abutmentEndX, deckHeight + 5, -bridgeWidth / 2));
    const mainCableCurve2 = new THREE.CatmullRomCurve3(points2);
    const mainCableTube2 = new THREE.TubeGeometry(mainCableCurve2, 50, 0.3, 8, false);
    const mainCable2 = new THREE.Mesh(mainCableTube2, mainCableMaterial);
    bridgeGroup.add(mainCable2);
    
    // --- VERTICAL SUSPENSION CABLES ---
    for (let i = 0; i <= numSuspensionCables; i++) {
      const t = i / numSuspensionCables;
      const xPos = -mainSpanLength / 2 + t * mainSpanLength;
      
      if (Math.abs(xPos - (-towerOffset)) < towerWidth / 2 || Math.abs(xPos - (towerOffset)) < towerWidth / 2) {
        continue;
      }
      
      let suspensionY;
      if (t <= 0.25) {
        suspensionY = deckHeight + (t / 0.25) * (towerHeight - 5);
      } else if (t <= 0.5) {
        suspensionY = deckHeight + towerHeight - ((t - 0.25) / 0.25) * 5;
      } else if (t <= 0.75) {
        suspensionY = deckHeight + towerHeight - 5 + ((t - 0.5) / 0.25) * 5;
      } else {
        suspensionY = deckHeight + towerHeight - ((t - 0.75) / 0.25) * (towerHeight - 5);
      }
      
      const verticalPoints1 = [];
      verticalPoints1.push(new THREE.Vector3(xPos, suspensionY, bridgeWidth / 2));
      verticalPoints1.push(new THREE.Vector3(xPos, deckHeight, bridgeWidth / 2));
      const verticalCurve1 = new THREE.CatmullRomCurve3(verticalPoints1);
      const verticalTube1 = new THREE.TubeGeometry(verticalCurve1, 1, 0.05, 8, false);
      const verticalCable1 = new THREE.Mesh(verticalTube1, mainCableMaterial);
      bridgeGroup.add(verticalCable1);
      
      const verticalPoints2 = [];
      verticalPoints2.push(new THREE.Vector3(xPos, suspensionY, -bridgeWidth / 2));
      verticalPoints2.push(new THREE.Vector3(xPos, deckHeight, -bridgeWidth / 2));
      const verticalCurve2 = new THREE.CatmullRomCurve3(verticalPoints2);
      const verticalTube2 = new THREE.TubeGeometry(verticalCurve2, 1, 0.05, 8, false);
      const verticalCable2 = new THREE.Mesh(verticalTube2, mainCableMaterial);
      bridgeGroup.add(verticalCable2);
    }
    
    // --- Physics for Main Deck ---
    const deckShape = new CANNON.Box(new CANNON.Vec3(mainSpanLength / 2, bridgeWidth / 2, deckThickness / 2));
    const deckBody = new CANNON.Body({
      mass: 0,
      material: groundMaterial
    });
    deckBody.addShape(deckShape);
    const deckLocalPos = new THREE.Vector3(0, deckHeight, 0);
    const deckWorldPos = deckLocalPos.applyMatrix4(
      new THREE.Matrix4().makeRotationY(bridgeAngle)
    ).add(bridgeGroup.position);
    deckBody.position.set(deckWorldPos.x, deckWorldPos.y, deckWorldPos.z);
    deckBody.quaternion.setFromEuler(0, bridgeAngle, 0);
    physicsWorld.addBody(deckBody);
    
    // --- Tower Physics ---
    function addTowerPhysics(xOffset) {
      const towerShape = new CANNON.Box(new CANNON.Vec3(towerWidth / 2, towerHeight / 2, towerDepth / 2));
      const towerBody = new CANNON.Body({
        mass: 0,
        material: groundMaterial
      });
      towerBody.addShape(towerShape);
      const towerLocalPos = new THREE.Vector3(xOffset, deckHeight + towerHeight / 2, 0);
      const towerWorldPos = towerLocalPos.applyMatrix4(
        new THREE.Matrix4().makeRotationY(bridgeAngle)
      ).add(bridgeGroup.position);
      towerBody.position.set(towerWorldPos.x, towerWorldPos.y, towerWorldPos.z);
      towerBody.quaternion.setFromEuler(0, bridgeAngle, 0);
      physicsWorld.addBody(towerBody);
    }
    
    addTowerPhysics(-towerOffset);
    addTowerPhysics(towerOffset);
    
    return bridgeGroup;
  }
  

const bridgeStart = new THREE.Vector3(
  neighborhoodOrigin.x + patchSize,
  0.2,
  neighborhoodOrigin.z + patchSize / 2
);
const bridgeEnd = medVillage.bridgeConnectionPoint;
createBridge(scene, physicsWorld, groundMaterial, bridgeStart, bridgeEnd);

// 14. Snow Toggle and Accumulation Controls.
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

// 15. Extra Camera Controls.
const camKeys = { i: false, k: false, j: false, l: false };
let cameraAngle = Math.PI / 1.5;
let cameraDistance = 10;
let cameraHeight = 5;
const zoomSpeed = 0.1;
const orbitSpeed = 0.02;

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

// 16. Animation Loop.
function animate() {
  requestAnimationFrame(animate);
  updatePhysics(physicsWorld);
  
  // Update the water shader time uniform to animate the waves.
  waterMaterial.uniforms.time.value += 0.02;

  excavator.baseGroup.position.copy(excavator.baseBody.position);
  dumpTruck.baseGroup.position.copy(dumpTruck.baseBody.position);
  snowPlow.baseGroup.position.copy(snowPlow.baseBody.position);

  excavator.update();
  dumpTruck.update();
  snowPlow.update();
  block.update();

  if (camKeys.i) cameraDistance = Math.max(2, cameraDistance - zoomSpeed);
  if (camKeys.k) cameraDistance = Math.min(50, cameraDistance + zoomSpeed);
  if (camKeys.j) cameraAngle -= orbitSpeed;
  if (camKeys.l) cameraAngle += orbitSpeed;

  const targetPos = window.activeVehicle.baseGroup.position.clone();
  const offsetX = cameraDistance * Math.sin(cameraAngle);
  const offsetZ = cameraDistance * Math.cos(cameraAngle);
  camera.position.set(targetPos.x + offsetX, targetPos.y + cameraHeight, targetPos.z + offsetZ);
  camera.lookAt(targetPos);

  if (snowEnabled) {
    if (snowLayer) updateSnowLayer(snowLayer, window.activeVehicle, accumulationMultiplier);
    if (fallingSnow) updateFallingSnow(fallingSnow, terrainSize);
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
