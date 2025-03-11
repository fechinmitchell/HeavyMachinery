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
// Capture the returned object so we can use its connection point for the bridge.
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
  // Calculate differences between endpoints.
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dz = endPoint.z - startPoint.z;
  
  // Horizontal distance (for rotation calculation) and total length.
  const horizontalLength = Math.sqrt(dx * dx + dz * dz);
  const rampLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Set ramp dimensions.
  const rampWidth = 6;      // Adjust the width as needed.
  const rampThickness = 0.5; // Thickness of the ramp.
  
  // Create the ramp mesh using BoxGeometry.
  const rampGeometry = new THREE.BoxGeometry(rampLength, rampThickness, rampWidth);
  const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);
  
  // Compute the midpoint between the two endpoints.
  const midPoint = new THREE.Vector3(
    (startPoint.x + endPoint.x) / 2,
    (startPoint.y + endPoint.y) / 2,
    (startPoint.z + endPoint.z) / 2
  );
  rampMesh.position.copy(midPoint);
  
  // Determine rotations:
  // Rotate around Y to face the horizontal direction.
  // Then rotate around Z (negative angle) to create the incline.
  const angleY = Math.atan2(dz, dx);
  const angleZ = -Math.atan2(dy, horizontalLength);
  rampMesh.rotation.order = "YXZ";
  rampMesh.rotation.y = angleY;
  rampMesh.rotation.z = angleZ;
  
  scene.add(rampMesh);
  
  // Create a corresponding physics body.
  const rampShape = new CANNON.Box(new CANNON.Vec3(rampLength / 2, rampThickness / 2, rampWidth / 2));
  const rampBody = new CANNON.Body({
    mass: 0, // Static ramp.
    material: groundMaterial
  });
  rampBody.addShape(rampShape);
  rampBody.position.copy(rampMesh.position);
  rampBody.quaternion.copy(rampMesh.quaternion);
  physicsWorld.addBody(rampBody);
  
  return rampMesh;
}

// Define the ramp endpoints.
// Modify rampStart so that it lies along a road in your Mediterranean Village.
const rampStart = new THREE.Vector3(-350, 0.2, -350); // Adjust these coordinates as needed.
const rampEnd = medVillage.bridgeConnectionPoint;

// Create the ramp.
createRamp(scene, physicsWorld, groundMaterial, rampStart, rampEnd);

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
    
    // Calculate bridge orientation
    const bridgeAngle = -Math.atan2(dz, dx);
    
    // Ramp parameters
    const rampLength = length * 0.2; // Each ramp is 20% of total bridge length
    const mainSpanLength = length - (2 * rampLength);
    const deckHeight = Math.max(start.y, end.y) + 15; // Higher deck to accommodate curved approaches
    
    // Create a group to hold the bridge components
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
    bridgeGroup.rotation.y = bridgeAngle;
    scene.add(bridgeGroup);
    
    // We'll build the bridge along the x-axis in local coordinates
    // and let the group's position/rotation handle the world placement
    
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
    
    // --- APPROACH RAMPS ---
    
    // Approach ramps using curved geometry
    const createCurvedRamp = (isStart) => {
      const rampSegments = 10;
      const direction = isStart ? -1 : 1;
      const startX = direction * mainSpanLength / 2;
      const startY = deckHeight;
      const endX = direction * (mainSpanLength / 2 + rampLength);
      const endY = isStart ? start.y : end.y;
      
      // Create points for the curve
      const points = [];
      for (let i = 0; i <= rampSegments; i++) {
        const t = i / rampSegments;
        // Use quadratic easing for a natural curve
        const easeT = 1 - Math.pow(1 - t, 2);
        const x = startX + (endX - startX) * t;
        const y = startY - (startY - endY) * easeT;
        points.push(new THREE.Vector2(x, y));
      }
      
      // Create the shape for extrusion
      const shape = new THREE.Shape();
      shape.moveTo(-bridgeWidth / 2, 0);
      shape.lineTo(bridgeWidth / 2, 0);
      shape.lineTo(bridgeWidth / 2, deckThickness);
      shape.lineTo(-bridgeWidth / 2, deckThickness);
      shape.lineTo(-bridgeWidth / 2, 0);
      
      // Create the path for extrusion
      const path = new THREE.CurvePath();
      const curve = new THREE.SplineCurve(points);
      path.add(curve);
      
      // Extrude settings
      const extrudeSettings = {
        steps: rampSegments,
        bevelEnabled: false,
        extrudePath: path
      };
      
      // Create the extruded geometry
      const rampGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const ramp = new THREE.Mesh(rampGeometry, deckMaterial);
      
      // Rotate the ramp to align with bridge
      ramp.rotation.z = Math.PI / 2;
      ramp.updateMatrix();
      
      bridgeGroup.add(ramp);
      
      // Create physics for the ramp using multiple segments
      for (let i = 0; i < rampSegments; i++) {
        const t1 = i / rampSegments;
        const t2 = (i + 1) / rampSegments;
        const easeT1 = 1 - Math.pow(1 - t1, 2);
        const easeT2 = 1 - Math.pow(1 - t2, 2);
        
        const x1 = startX + (endX - startX) * t1;
        const y1 = startY - (startY - endY) * easeT1;
        const x2 = startX + (endX - startX) * t2;
        const y2 = startY - (startY - endY) * easeT2;
        
        const segLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const segAngle = Math.atan2(y2 - y1, x2 - x1);
        
        const segShape = new CANNON.Box(new CANNON.Vec3(segLength / 2, bridgeWidth / 2, deckThickness / 2));
        const segBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        segBody.addShape(segShape);
        
        // Calculate position in world coordinates
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const localPos = new THREE.Vector3(midX, 0, 0);
        const worldPos = localPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        
        // Set position and rotation
        segBody.position.set(worldPos.x, midY, worldPos.z);
        
        // Calculate quaternion for combined rotation (bridge angle + segment slope)
        const q1 = new CANNON.Quaternion();
        q1.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), bridgeAngle);
        
        const q2 = new CANNON.Quaternion();
        q2.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -segAngle - Math.PI/2);
        
        segBody.quaternion = q1.mult(q2);
        
        physicsWorld.addBody(segBody);
      }
      
      // Add guardrails to the ramp
      const guardrailHeight = 1.5;
      const guardrailGeometry = new THREE.BoxGeometry(rampLength, guardrailHeight, 0.3);
      const guardrailMaterial = new THREE.MeshStandardMaterial({ 
        color: bridgeColor,
        roughness: 0.5,
        metalness: 0.7
      });
      
      // Curve points for the guardrails
      const gPoints = [];
      for (let i = 0; i <= rampSegments; i++) {
        const t = i / rampSegments;
        const easeT = 1 - Math.pow(1 - t, 2);
        const x = startX + (endX - startX) * t;
        const y = startY - (startY - endY) * easeT + guardrailHeight / 2;
        gPoints.push(new THREE.Vector3(x, y, bridgeWidth / 2 - 0.2));
      }
      
      const guardrailCurve = new THREE.CatmullRomCurve3(gPoints);
      const guardrailGeom = new THREE.TubeGeometry(guardrailCurve, rampSegments, 0.15, 8, false);
      const leftGuardrail = new THREE.Mesh(guardrailGeom, guardrailMaterial);
      bridgeGroup.add(leftGuardrail);
      
      // Right guardrail
      const gPoints2 = [];
      for (let i = 0; i <= rampSegments; i++) {
        const t = i / rampSegments;
        const easeT = 1 - Math.pow(1 - t, 2);
        const x = startX + (endX - startX) * t;
        const y = startY - (startY - endY) * easeT + guardrailHeight / 2;
        gPoints2.push(new THREE.Vector3(x, y, -bridgeWidth / 2 + 0.2));
      }
      
      const guardrailCurve2 = new THREE.CatmullRomCurve3(gPoints2);
      const guardrailGeom2 = new THREE.TubeGeometry(guardrailCurve2, rampSegments, 0.15, 8, false);
      const rightGuardrail = new THREE.Mesh(guardrailGeom2, guardrailMaterial);
      bridgeGroup.add(rightGuardrail);
    };
    
    // Create both approach ramps
    createCurvedRamp(true);  // Start ramp
    createCurvedRamp(false); // End ramp
    
    // --- ROAD MARKINGS ---
    const roadMarkingsGeometry = new THREE.PlaneGeometry(mainSpanLength, bridgeWidth * 0.1);
    const roadMarkingsMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const roadMarkings = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    roadMarkings.rotation.x = -Math.PI / 2;
    roadMarkings.position.set(0, deckHeight + deckThickness / 2 + 0.01, 0);
    bridgeGroup.add(roadMarkings);
    
    // --- GUARDRAILS FOR MAIN SPAN ---
    const guardrailHeight = 1.5;
    const guardrailGeometry = new THREE.BoxGeometry(mainSpanLength, guardrailHeight, 0.3);
    const guardrailMaterial = new THREE.MeshStandardMaterial({ 
      color: bridgeColor,
      roughness: 0.5,
      metalness: 0.7
    });
    const leftGuardrail = new THREE.Mesh(guardrailGeometry, guardrailMaterial);
    leftGuardrail.position.set(0, deckHeight + guardrailHeight / 2, bridgeWidth / 2 - 0.2);
    bridgeGroup.add(leftGuardrail);
    const rightGuardrail = new THREE.Mesh(guardrailGeometry, guardrailMaterial);
    rightGuardrail.position.set(0, deckHeight + guardrailHeight / 2, -bridgeWidth / 2 + 0.2);
    bridgeGroup.add(rightGuardrail);
    
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
    
    // --- SUSPENSION CABLES ---
    const mainCableMaterial = new THREE.MeshStandardMaterial({ 
      color: cableColor,
      roughness: 0.3,
      metalness: 0.9
    });
    
    // Main suspension cables spanning the entire bridge, including the curved ramps
    const points1 = [];
    points1.push(new THREE.Vector3(-mainSpanLength / 2 - rampLength, start.y + 2, bridgeWidth / 2));
    points1.push(new THREE.Vector3(-towerOffset, deckHeight + towerHeight, bridgeWidth / 2));
    points1.push(new THREE.Vector3(0, deckHeight + towerHeight - 5, bridgeWidth / 2));
    points1.push(new THREE.Vector3(towerOffset, deckHeight + towerHeight, bridgeWidth / 2));
    points1.push(new THREE.Vector3(mainSpanLength / 2 + rampLength, end.y + 2, bridgeWidth / 2));
    const mainCableGeometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const mainCable1 = new THREE.Line(mainCableGeometry1, mainCableMaterial);
    mainCable1.material.linewidth = 3;
    bridgeGroup.add(mainCable1);
    
    const points2 = [];
    points2.push(new THREE.Vector3(-mainSpanLength / 2 - rampLength, start.y + 2, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(-towerOffset, deckHeight + towerHeight, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(0, deckHeight + towerHeight - 5, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(towerOffset, deckHeight + towerHeight, -bridgeWidth / 2));
    points2.push(new THREE.Vector3(mainSpanLength / 2 + rampLength, end.y + 2, -bridgeWidth / 2));
    const mainCableGeometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const mainCable2 = new THREE.Line(mainCableGeometry2, mainCableMaterial);
    mainCable2.material.linewidth = 3;
    bridgeGroup.add(mainCable2);
    
    // --- VERTICAL SUSPENSION CABLES ---
    // Only add vertical cables to the main span, not the ramps
    for (let i = 0; i <= numSuspensionCables; i++) {
      const t = i / numSuspensionCables;
      const xPos = -mainSpanLength / 2 + t * mainSpanLength;
      
      // Skip positions where towers are located
      if (Math.abs(xPos - (-towerOffset)) < towerWidth / 2 || Math.abs(xPos - (towerOffset)) < towerWidth / 2) {
        continue;
      }
      
      // Calculate y position along the main cable curve
      let suspensionY;
      if (t <= 0.25) {
        // First quarter: cable goes up to first tower
        suspensionY = deckHeight + (t / 0.25) * towerHeight;
      } else if (t <= 0.5) {
        // Second quarter: cable curves down from first tower to center
        suspensionY = deckHeight + towerHeight - ((t - 0.25) / 0.25) * 5;
      } else if (t <= 0.75) {
        // Third quarter: cable curves up from center to second tower
        suspensionY = deckHeight + towerHeight - 5 + ((t - 0.5) / 0.25) * 5;
      } else {
        // Fourth quarter: cable goes down from second tower
        suspensionY = deckHeight + towerHeight - ((t - 0.75) / 0.25) * towerHeight;
      }
      
      // Create vertical cables
      const verticalPoints1 = [];
      verticalPoints1.push(new THREE.Vector3(xPos, suspensionY, bridgeWidth / 2));
      verticalPoints1.push(new THREE.Vector3(xPos, deckHeight, bridgeWidth / 2));
      const verticalCableGeometry1 = new THREE.BufferGeometry().setFromPoints(verticalPoints1);
      const verticalCable1 = new THREE.Line(verticalCableGeometry1, mainCableMaterial);
      bridgeGroup.add(verticalCable1);
      
      const verticalPoints2 = [];
      verticalPoints2.push(new THREE.Vector3(xPos, suspensionY, -bridgeWidth / 2));
      verticalPoints2.push(new THREE.Vector3(xPos, deckHeight, -bridgeWidth / 2));
      const verticalCableGeometry2 = new THREE.BufferGeometry().setFromPoints(verticalPoints2);
      const verticalCable2 = new THREE.Line(verticalCableGeometry2, mainCableMaterial);
      bridgeGroup.add(verticalCable2);
    }
    
    // --- CROSS-BRACING BETWEEN TOWERS ---
    const bracingMaterial = new THREE.LineBasicMaterial({ color: cableColor });
    const bracing1Points1 = [];
    bracing1Points1.push(new THREE.Vector3(-towerOffset - towerWidth / 2, deckHeight, towerDepth / 2));
    bracing1Points1.push(new THREE.Vector3(-towerOffset + towerWidth / 2, deckHeight + towerHeight / 2, -towerDepth / 2));
    const bracing1Geometry1 = new THREE.BufferGeometry().setFromPoints(bracing1Points1);
    const bracing1Line1 = new THREE.Line(bracing1Geometry1, bracingMaterial);
    bridgeGroup.add(bracing1Line1);
    const bracing1Points2 = [];
    bracing1Points2.push(new THREE.Vector3(-towerOffset + towerWidth / 2, deckHeight, towerDepth / 2));
    bracing1Points2.push(new THREE.Vector3(-towerOffset - towerWidth / 2, deckHeight + towerHeight / 2, -towerDepth / 2));
    const bracing1Geometry2 = new THREE.BufferGeometry().setFromPoints(bracing1Points2);
    const bracing1Line2 = new THREE.Line(bracing1Geometry2, bracingMaterial);
    bridgeGroup.add(bracing1Line2);
    
    const bracing2Points1 = [];
    bracing2Points1.push(new THREE.Vector3(towerOffset - towerWidth / 2, deckHeight, towerDepth / 2));
    bracing2Points1.push(new THREE.Vector3(towerOffset + towerWidth / 2, deckHeight + towerHeight / 2, -towerDepth / 2));
    const bracing2Geometry1 = new THREE.BufferGeometry().setFromPoints(bracing2Points1);
    const bracing2Line1 = new THREE.Line(bracing2Geometry1, bracingMaterial);
    bridgeGroup.add(bracing2Line1);
    const bracing2Points2 = [];
    bracing2Points2.push(new THREE.Vector3(towerOffset + towerWidth / 2, deckHeight, towerDepth / 2));
    bracing2Points2.push(new THREE.Vector3(towerOffset - towerWidth / 2, deckHeight + towerHeight / 2, -towerDepth / 2));
    const bracing2Geometry2 = new THREE.BufferGeometry().setFromPoints(bracing2Points2);
    const bracing2Line2 = new THREE.Line(bracing2Geometry2, bracingMaterial);
    bridgeGroup.add(bracing2Line2);
    
    // --- PHYSICS FOR THE MAIN DECK ---
    const deckShape = new CANNON.Box(new CANNON.Vec3(mainSpanLength / 2, deckThickness / 2, bridgeWidth / 2));
    const deckBody = new CANNON.Body({
      mass: 0,
      material: groundMaterial
    });
    deckBody.addShape(deckShape);
    
    // Convert local position to world position
    const deckWorldPos = new THREE.Vector3(0, deckHeight, 0)
      .applyMatrix4(new THREE.Matrix4().makeRotationY(bridgeAngle))
      .add(bridgeGroup.position);
    
    deckBody.position.set(deckWorldPos.x, deckWorldPos.y, deckWorldPos.z);
    deckBody.quaternion.setFromEuler(0, bridgeAngle, 0);
    physicsWorld.addBody(deckBody);
    
    // --- PHYSICS FOR THE TOWERS ---
    const towerShape = new CANNON.Box(new CANNON.Vec3(towerWidth / 2, towerHeight / 2, towerDepth / 2));
    
    // Tower 1
    const tower1Body = new CANNON.Body({
      mass: 0,
      material: groundMaterial
    });
    tower1Body.addShape(towerShape);
    const tower1WorldPos = new THREE.Vector3(-towerOffset, deckHeight + towerHeight / 2, 0)
      .applyMatrix4(new THREE.Matrix4().makeRotationY(bridgeAngle))
      .add(bridgeGroup.position);
    
    tower1Body.position.set(tower1WorldPos.x, tower1WorldPos.y, tower1WorldPos.z);
    tower1Body.quaternion.setFromEuler(0, bridgeAngle, 0);
    physicsWorld.addBody(tower1Body);
    
    // Tower 2
    const tower2Body = new CANNON.Body({
      mass: 0,
      material: groundMaterial
    });
    tower2Body.addShape(towerShape);
    const tower2WorldPos = new THREE.Vector3(towerOffset, deckHeight + towerHeight / 2, 0)
      .applyMatrix4(new THREE.Matrix4().makeRotationY(bridgeAngle))
      .add(bridgeGroup.position);
    
    tower2Body.position.set(tower2WorldPos.x, tower2WorldPos.y, tower2WorldPos.z);
    tower2Body.quaternion.setFromEuler(0, bridgeAngle, 0);
    physicsWorld.addBody(tower2Body);
    
    return bridgeGroup;
  }
  
// Define endpoints for the bridge.
const bridgeStart = new THREE.Vector3(
  neighborhoodOrigin.x + patchSize, // right edge of Lakeside neighborhood
  0.2, // slight elevation
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

  // Update vehicle positions.
  excavator.baseGroup.position.copy(excavator.baseBody.position);
  dumpTruck.baseGroup.position.copy(dumpTruck.baseBody.position);
  snowPlow.baseGroup.position.copy(snowPlow.baseBody.position);

  // Process vehicle updates.
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
