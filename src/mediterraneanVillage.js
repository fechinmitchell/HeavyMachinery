// mediterraneanVillage.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// =====================================================
// CUSTOM WATER (Shader-based, non-reflective)
// =====================================================
const waterVertexShader = /* glsl */ `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Wave displacement:
    pos.z += sin(pos.x * 0.1 + time) * 1.0;
    pos.z += sin(pos.y * 0.1 + time * 1.5) * 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Solid water color (tweak as desired)
    gl_FragColor = vec4(0.0, 0.5, 0.8, 1.0);
  }
`;

// =====================================================
// MAIN VILLAGE CREATION
// =====================================================
export function createMediterraneanVillage(scene, physicsWorld, groundMaterial, getHeight, patchSize, origin) {
  console.log('Creating Mediterranean Village at:', origin);
  
  // Materials for Mediterranean theme
  const materials = {
    water: new THREE.MeshStandardMaterial({
      color: 0x1a75ff,
      metalness: 0.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8
    }),
    sand: new THREE.MeshStandardMaterial({ color: 0xf2d2a9 }),
    road: new THREE.MeshStandardMaterial({ color: 0xcccccc }),
    whitewash: new THREE.MeshStandardMaterial({ color: 0xfffafa }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xc84a31 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x567d46 }),
    oliveTree: new THREE.MeshStandardMaterial({ color: 0x6b8e23 }),
    rockWall: new THREE.MeshStandardMaterial({ color: 0x9c9c9c }),
    bridge: new THREE.MeshStandardMaterial({ color: 0xb76e79 }), // Golden Gate-like color
    bridgeCable: new THREE.MeshStandardMaterial({ color: 0x555555 }),
    bridgeRoad: new THREE.MeshStandardMaterial({ color: 0x333333 })
  };
  
  // Create terrain and water with gentle slopes.
  createTerrainWithWater(scene, physicsWorld, groundMaterial, patchSize, origin, materials);
  
  // Add houses.
  createMediterraneanHouses(scene, physicsWorld, patchSize, origin, materials);
  
  // Add roads that connect to other areas.
  createConnectingRoads(scene, physicsWorld, groundMaterial, patchSize, origin, materials);
  
  // Add vegetation (olive trees, cypress trees, etc.).
  addVegetation(scene, physicsWorld, patchSize, origin, materials);
  
  // Create a stone wall with arched openings around the village.
  createVillageWall(scene, patchSize, origin, materials);
  
  // Create bridge connection point for this village
  const bridgeStartPoint = createBridgeConnection(scene, physicsWorld, groundMaterial, patchSize, origin, materials);

  return {
    center: new THREE.Vector3(origin.x + patchSize / 2, origin.y, origin.z + patchSize / 2),
    bridgeConnectionPoint: bridgeStartPoint
  };
}

// =====================================================
// TERRAIN & WATER CREATION (Custom Shader Water)
// =====================================================
function createTerrainWithWater(scene, physicsWorld, groundMaterial, patchSize, origin, materials) {
  const seaLevel = -1.5;
  const seaSize = patchSize * 1.5;
  
  // Create water using a custom shader material (non-reflective)
  const waterGeometry = new THREE.PlaneGeometry(seaSize, seaSize, 128, 128);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    transparent: false
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(origin.x + patchSize / 2, seaLevel, origin.z + patchSize / 2);
  scene.add(water);
  // (Remember: In your animation loop update waterMaterial.uniforms.time.value)
  
  // Shoreline foam effect
  const shorelineGeometry = new THREE.RingGeometry(
    patchSize * 0.4 - 0.5,
    patchSize * 0.4 + 0.5,
    64, 1
  );
  shorelineGeometry.rotateX(-Math.PI / 2);
  const shorelineMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    roughness: 0.8
  });
  const shorelineMesh = new THREE.Mesh(shorelineGeometry, shorelineMaterial);
  shorelineMesh.position.set(origin.x + patchSize / 2, seaLevel + 0.05, origin.z + patchSize / 2);
  scene.add(shorelineMesh);
  
  // Invisible water physics body
  const seaDepth = 15;
  const waterShape = new CANNON.Box(new CANNON.Vec3(seaSize / 2, seaDepth / 2, seaSize / 2));
  const waterBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(origin.x + patchSize / 2, seaLevel - seaDepth / 2, origin.z + patchSize / 2),
    shape: waterShape,
    material: groundMaterial
  });
  waterBody.collisionResponse = 1;
  waterBody.userData = { isWater: true };
  physicsWorld.addBody(waterBody);
  
  // Create island terrain
  createSlopedIsland(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel);
}

// =====================================================
// ISLAND & PENINSULA
// =====================================================
function createSlopedIsland(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel) {
  const islandRadius = patchSize * 0.4;
  const segments = 64;
  const maxHeight = 1.5;
  
  const geometry = new THREE.CircleGeometry(islandRadius, segments);
  geometry.rotateX(-Math.PI / 2);
  
  const positionAttr = geometry.attributes.position;
  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i);
    const z = positionAttr.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    const heightRatio = 1 - (dist / islandRadius);
    const height = maxHeight * heightRatio * heightRatio;
    positionAttr.setY(i, height);
  }
  geometry.computeVertexNormals();
  
  const islandMesh = new THREE.Mesh(geometry, materials.sand);
  islandMesh.position.set(origin.x + patchSize / 2, seaLevel, origin.z + patchSize / 2);
  scene.add(islandMesh);
  
  // Heightfield for physics
  const heightfieldSize = 32;
  const heightfieldData = [];
  for (let i = 0; i < heightfieldSize; i++) {
    heightfieldData[i] = [];
    for (let j = 0; j < heightfieldSize; j++) {
      const nx = (i / (heightfieldSize - 1) - 0.5) * 2;
      const nz = (j / (heightfieldSize - 1) - 0.5) * 2;
      const dist = Math.min(1, Math.sqrt(nx * nx + nz * nz));
      const heightRatio = 1 - dist;
      const height = maxHeight * heightRatio * heightRatio;
      heightfieldData[i][j] = height;
    }
  }
  const heightfieldShape = new CANNON.Heightfield(heightfieldData, {
    elementSize: (islandRadius * 2) / (heightfieldSize - 1)
  });
  const heightfieldBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(
      origin.x + patchSize / 2 - islandRadius,
      seaLevel,
      origin.z + patchSize / 2 - islandRadius
    ),
    material: groundMaterial
  });
  heightfieldBody.addShape(heightfieldShape);
  physicsWorld.addBody(heightfieldBody);
  
  createPeninsula(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel, maxHeight, islandRadius);
}

function createPeninsula(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel, landHeight, islandRadius) {
  const peninsulaWidth = patchSize * 0.2;
  const peninsulaLength = patchSize * 0.5;
  
  const detailSegments = 20;
  const peninsulaGeometry = new THREE.PlaneGeometry(peninsulaWidth, peninsulaLength, detailSegments - 1, detailSegments - 1);
  peninsulaGeometry.rotateX(-Math.PI / 2);
  
  const positionAttr = peninsulaGeometry.attributes.position;
  for (let i = 0; i < positionAttr.count; i++) {
    const y = positionAttr.getY(i);
    const lengthRatio = (y + peninsulaLength / 2) / peninsulaLength;
    let height;
    if (lengthRatio < 0.2) {
      height = landHeight * 0.8;
    } else if (lengthRatio > 0.9) {
      height = seaLevel + 0.1;
    } else {
      const t = (lengthRatio - 0.2) / 0.7;
      height = landHeight * 0.8 * (1 - t) + (seaLevel + 0.1) * t;
    }
    positionAttr.setZ(i, height);
  }
  peninsulaGeometry.computeVertexNormals();
  
  const peninsulaMesh = new THREE.Mesh(peninsulaGeometry, materials.sand);
  const islandCenter = new THREE.Vector2(origin.x + patchSize / 2, origin.z + patchSize / 2);
  peninsulaMesh.position.set(islandCenter.x, 0, islandCenter.y - (islandRadius + peninsulaLength / 2));
  scene.add(peninsulaMesh);
  
  // Physics for peninsula
  const heightfieldSize = 32;
  const heightfieldData = [];
  for (let i = 0; i < heightfieldSize; i++) {
    heightfieldData[i] = [];
    for (let j = 0; j < heightfieldSize; j++) {
      const lengthRatio = j / (heightfieldSize - 1);
      let height;
      if (lengthRatio < 0.2) {
        height = landHeight * 0.8;
      } else if (lengthRatio > 0.9) {
        height = seaLevel + 0.1;
      } else {
        const t = (lengthRatio - 0.2) / 0.7;
        height = landHeight * 0.8 * (1 - t) + (seaLevel + 0.1) * t;
      }
      heightfieldData[i][j] = height - seaLevel;
    }
  }
  const peninsulaShape = new CANNON.Heightfield(heightfieldData, {
    elementSize: peninsulaLength / (heightfieldSize - 1)
  });
  const peninsulaBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(
      islandCenter.x - peninsulaWidth / 2,
      seaLevel,
      islandCenter.y - islandRadius - peninsulaLength
    ),
    material: groundMaterial
  });
  peninsulaBody.addShape(peninsulaShape);
  physicsWorld.addBody(peninsulaBody);
  
  return {
    startPoint: new THREE.Vector3(islandCenter.x, seaLevel + 0.1, islandCenter.y - islandRadius - peninsulaLength)
  };
}

// =====================================================
// VILLAGE WALL WITH ARCHES
// =====================================================
function createVillageWall(scene, patchSize, origin, materials) {
  // Wall will encircle the island.
  const center = new THREE.Vector2(origin.x + patchSize / 2, origin.z + patchSize / 2);
  const islandRadius = patchSize * 0.4;
  const wallRadius = islandRadius + 2; // 2 units outside the island
  const wallThickness = 0.5;
  const wallHeight = 3;
  const outerRadius = wallRadius + wallThickness;
  const innerRadius = wallRadius - wallThickness;
  
  // Create the outer and inner boundaries.
  const wallShape = new THREE.Shape();
  wallShape.absarc(center.x, center.y, outerRadius, 0, Math.PI * 2, true);
  const innerCircle = new THREE.Path();
  innerCircle.absarc(center.x, center.y, innerRadius, 0, Math.PI * 2, false);
  wallShape.holes.push(innerCircle);
  
  // Create three arch openings evenly spaced along the wall.
  const archCount = 3;
  const archWidth = 3;
  const archHeight = 2.5;
  for (let i = 0; i < archCount; i++) {
    const angle = (i * 2 * Math.PI) / archCount;
    // Arch center along the wall:
    const archCenter = new THREE.Vector2(
      center.x + wallRadius * Math.cos(angle),
      center.y + wallRadius * Math.sin(angle)
    );
    // Build an arch shape (rectangle with a semicircular top) in 2D.
    const archShape = new THREE.Shape();
    archShape.moveTo(-archWidth / 2, 0);
    archShape.lineTo(-archWidth / 2, archHeight - archWidth / 2);
    archShape.absarc(0, archHeight - archWidth / 2, archWidth / 2, Math.PI, 0, false);
    archShape.lineTo(archWidth / 2, 0);
    archShape.lineTo(-archWidth / 2, 0);
    
    // Transform archShape: since THREE.Shape does not support applyMatrix4,
    // we extract its points, apply a 2D matrix transformation, and rebuild the shape.
    const pts = archShape.getPoints();
    // Create a 2D transformation matrix (Matrix3) that rotates and translates.
    const m = new THREE.Matrix3();
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Set the matrix as:
    // [ cosA, -sinA, archCenter.x ]
    // [ sinA,  cosA, archCenter.y ]
    // [ 0,      0,         1     ]
    m.set(
      cosA, -sinA, archCenter.x,
      sinA,  cosA, archCenter.y,
      0,     0,    1
    );
    for (let j = 0; j < pts.length; j++) {
      pts[j].applyMatrix3(m);
    }
    const transformedArch = new THREE.Shape(pts);
    wallShape.holes.push(transformedArch);
  }
  
  const extrudeSettings = {
    steps: 1,
    depth: wallHeight,
    bevelEnabled: false
  };
  const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
  wallGeometry.rotateX(-Math.PI / 2);
  
  const wallMesh = new THREE.Mesh(wallGeometry, materials.rockWall);
  wallMesh.position.y = origin.y + 1.5;
  scene.add(wallMesh);
}

// =====================================================
// HOUSES, ROADS, VEGETATION, & TREES (Unchanged)
// =====================================================

function createMediterraneanHouses(scene, physicsWorld, patchSize, origin, materials) {
  const islandCenter = new THREE.Vector3(origin.x + patchSize / 2, 0, origin.z + patchSize / 2);
  const islandRadius = patchSize * 0.3;
  const houseCount = 8;
  const housePositions = [];
  for (let i = 0; i < houseCount; i++) {
    const angle = (Math.PI * 2 * i) / houseCount;
    const distance = islandRadius * 0.6 * (0.6 + Math.random() * 0.3);
    const x = islandCenter.x + Math.cos(angle) * distance;
    const z = islandCenter.z + Math.sin(angle) * distance;
    housePositions.push({ x, z, rotation: angle + Math.PI + (Math.random() * Math.PI / 4 - Math.PI / 8) });
  }
  housePositions.forEach(pos => {
    createMediterraneanHouse(scene, physicsWorld, pos.x, pos.z, pos.rotation, materials);
  });
}

function createMediterraneanHouse(scene, physicsWorld, x, z, rotation, materials) {
  const baseY = 0.2;
  const baseWidth = 3 + Math.random() * 2;
  const baseDepth = 3 + Math.random() * 2;
  const baseHeight = 2.5 + Math.random() * 1;
  
  const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
  const baseMesh = new THREE.Mesh(baseGeometry, materials.whitewash);
  baseMesh.position.set(x, baseY + baseHeight / 2, z);
  baseMesh.rotation.y = rotation;
  scene.add(baseMesh);
  
  const roofHeight = 1.2;
  const roofOverhang = 0.3;
  const roofWidth = baseWidth + roofOverhang * 2;
  const roofDepth = baseDepth + roofOverhang * 2;
  
  const roofGeometry = new THREE.BoxGeometry(roofWidth, roofHeight, roofDepth);
  const roofMesh = new THREE.Mesh(roofGeometry, materials.terracotta);
  roofMesh.position.set(x, baseY + baseHeight + roofHeight / 2, z);
  roofMesh.rotation.y = rotation;
  scene.add(roofMesh);
  
  addHouseDetails(scene, x, z, baseY, baseWidth, baseDepth, baseHeight, rotation, materials);
  
  const houseShape = new CANNON.Box(new CANNON.Vec3(baseWidth / 2, baseHeight / 2, baseDepth / 2));
  const houseBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(x, baseY + baseHeight / 2, z),
    quaternion: new CANNON.Quaternion().setFromEuler(0, rotation, 0)
  });
  houseBody.addShape(houseShape);
  physicsWorld.addBody(houseBody);
  
  const roofShape = new CANNON.Box(new CANNON.Vec3(roofWidth / 2, roofHeight / 2, roofDepth / 2));
  const roofBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(x, baseY + baseHeight + roofHeight / 2, z),
    quaternion: new CANNON.Quaternion().setFromEuler(0, rotation, 0)
  });
  roofBody.addShape(roofShape);
  physicsWorld.addBody(roofBody);
}

function addHouseDetails(scene, x, z, baseY, baseWidth, baseDepth, baseHeight, rotation, materials) {
  const placeRelativeToHouse = (xOffset, zOffset) => {
    const relX = x + Math.cos(rotation) * xOffset - Math.sin(rotation) * zOffset;
    const relZ = z + Math.sin(rotation) * xOffset + Math.cos(rotation) * zOffset;
    return { x: relX, z: relZ };
  };
  const doorWidth = 0.8;
  const doorHeight = 1.8;
  const doorPos = placeRelativeToHouse(0, baseDepth / 2 + 0.01);
  
  const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x5c3a21,
    side: THREE.DoubleSide
  });
  const doorMesh = new THREE.Mesh(doorGeometry, doorMaterial);
  doorMesh.position.set(doorPos.x, baseY + doorHeight / 2, doorPos.z);
  doorMesh.rotation.y = rotation + Math.PI;
  scene.add(doorMesh);
  
  const windowSize = 0.6;
  const windowPositions = [
    { x: baseWidth / 4, z: baseDepth / 2 + 0.01, rotationOffset: Math.PI },
    { x: -baseWidth / 4, z: baseDepth / 2 + 0.01, rotationOffset: Math.PI },
    { x: baseWidth / 2 + 0.01, z: 0, rotationOffset: Math.PI / 2 },
    { x: -baseWidth / 2 - 0.01, z: 0, rotationOffset: -Math.PI / 2 }
  ];
  windowPositions.forEach(pos => {
    const windowPos = placeRelativeToHouse(pos.x, pos.z);
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      metalness: 0.2,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.set(windowPos.x, baseY + baseHeight / 2, windowPos.z);
    windowMesh.rotation.y = rotation + pos.rotationOffset;
    scene.add(windowMesh);
  });
}

function createConnectingRoads(scene, physicsWorld, groundMaterial, patchSize, origin, materials) {
  const islandCenter = new THREE.Vector3(origin.x + patchSize / 2, 0.1, origin.z + patchSize / 2);
  const islandRadius = patchSize * 0.3;
  
  const roadWidth = 4;
  const mainRoadLength = patchSize * 0.6;
  const mainRoadGeometry = new THREE.PlaneGeometry(roadWidth, mainRoadLength);
  const mainRoadMesh = new THREE.Mesh(mainRoadGeometry, materials.road);
  mainRoadMesh.rotation.x = -Math.PI / 2;
  mainRoadMesh.position.set(islandCenter.x, 0.15, islandCenter.z - mainRoadLength / 2);
  scene.add(mainRoadMesh);
  
  const circularRoadRadius = islandRadius * 0.7;
  const circularRoadGeometry = new THREE.RingGeometry(circularRoadRadius - roadWidth / 2, circularRoadRadius + roadWidth / 2, 32);
  const circularRoadMesh = new THREE.Mesh(circularRoadGeometry, materials.road);
  circularRoadMesh.rotation.x = -Math.PI / 2;
  circularRoadMesh.position.set(islandCenter.x, 0.16, islandCenter.z);
  scene.add(circularRoadMesh);
  
  const connectorCount = 8;
  for (let i = 0; i < connectorCount; i++) {
    const angle = (Math.PI * 2 * i) / connectorCount;
    const innerX = islandCenter.x + Math.cos(angle) * (circularRoadRadius - roadWidth / 2);
    const innerZ = islandCenter.z + Math.sin(angle) * (circularRoadRadius - roadWidth / 2);
    const outerX = islandCenter.x + Math.cos(angle) * islandRadius;
    const outerZ = islandCenter.z + Math.sin(angle) * islandRadius;
    const connectorLength = Math.sqrt(Math.pow(outerX - innerX, 2) + Math.pow(outerZ - innerZ, 2));
    const connectorGeometry = new THREE.PlaneGeometry(roadWidth / 2, connectorLength);
    const connectorMesh = new THREE.Mesh(connectorGeometry, materials.road);
    connectorMesh.rotation.x = -Math.PI / 2;
    connectorMesh.rotation.z = angle;
    connectorMesh.position.set((innerX + outerX) / 2, 0.17, (innerZ + outerZ) / 2);
    scene.add(connectorMesh);
  }
}

function addVegetation(scene, physicsWorld, patchSize, origin, materials) {
  const islandCenter = new THREE.Vector3(origin.x + patchSize / 2, 0, origin.z + patchSize / 2);
  const islandRadius = patchSize * 0.35;
  
  const treeCount = 20;
  for (let i = 0; i < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * islandRadius * 0.9;
    const x = islandCenter.x + Math.cos(angle) * distance;
    const z = islandCenter.z + Math.sin(angle) * distance;
    if (Math.random() > 0.5) {
      createOliveTree(scene, physicsWorld, x, z, materials);
    } else {
      createCypressTree(scene, physicsWorld, x, z, materials);
    }
  }
  
  for (let i = 0; i < 10; i++) {
    const offset = (Math.random() - 0.5) * 5;
    const distance = islandRadius + 5 + i * 4;
    const x = islandCenter.x + offset;
    const z = islandCenter.z - distance;
    if (Math.random() > 0.7) {
      createOliveTree(scene, physicsWorld, x, z, materials);
    } else {
      createCypressTree(scene, physicsWorld, x, z, materials);
    }
  }
}

function createOliveTree(scene, physicsWorld, x, z, materials) {
  const trunkHeight = 1.5 + Math.random() * 0.5;
  const trunkRadius = 0.2 + Math.random() * 0.1;
  
  const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunkMesh.position.set(x, trunkHeight / 2, z);
  scene.add(trunkMesh);
  
  const foliageRadius = 1 + Math.random() * 0.5;
  const foliageGeometry = new THREE.SphereGeometry(foliageRadius, 8, 8);
  const foliageMesh = new THREE.Mesh(foliageGeometry, materials.oliveTree);
  foliageMesh.position.set(x, trunkHeight + foliageRadius * 0.7, z);
  scene.add(foliageMesh);
  
  const trunkShape = new CANNON.Cylinder(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
  const trunkBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(x, trunkHeight / 2, z)
  });
  trunkBody.addShape(trunkShape);
  physicsWorld.addBody(trunkBody);
}

function createCypressTree(scene, physicsWorld, x, z, materials) {
  const trunkHeight = 1 + Math.random() * 0.5;
  const trunkRadius = 0.15 + Math.random() * 0.1;
  
  const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.2, trunkHeight, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunkMesh.position.set(x, trunkHeight / 2, z);
  scene.add(trunkMesh);
  
  const foliageHeight = 3 + Math.random() * 1;
  const foliageBaseRadius = 0.8 + Math.random() * 0.3;
  const foliageTopRadius = 0.2;
  
  const foliageGeometry = new THREE.CylinderGeometry(foliageTopRadius, foliageBaseRadius, foliageHeight, 8);
  const foliageMesh = new THREE.Mesh(foliageGeometry, materials.foliage);
  foliageMesh.position.set(x, trunkHeight + foliageHeight / 2, z);
  scene.add(foliageMesh);
  
  const foliageShape = new CANNON.Cylinder(foliageTopRadius, foliageBaseRadius, foliageHeight, 8);
  const foliageBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(x, trunkHeight + foliageHeight / 2, z)
  });
  foliageBody.addShape(foliageShape);
  physicsWorld.addBody(foliageBody);
}

function createBridgeConnection(scene, physicsWorld, groundMaterial, patchSize, origin, materials) {
  const islandCenter = new THREE.Vector3(origin.x + patchSize / 2, 0, origin.z + patchSize / 2);
  const roadWidth = 6;
  const bridgeDockLength = 10;
  
  const dockGeometry = new THREE.BoxGeometry(roadWidth, 1, bridgeDockLength);
  const dockMesh = new THREE.Mesh(dockGeometry, materials.road);
  dockMesh.position.set(
    islandCenter.x,
    0.2,
    islandCenter.z - patchSize * 0.5 - bridgeDockLength / 2
  );
  scene.add(dockMesh);
  
  const dockShape = new CANNON.Box(new CANNON.Vec3(roadWidth / 2, 0.5, bridgeDockLength / 2));
  const dockBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(dockMesh.position.x, dockMesh.position.y, dockMesh.position.z),
    material: groundMaterial
  });
  dockBody.addShape(dockShape);
  physicsWorld.addBody(dockBody);
  
  return new THREE.Vector3(
    islandCenter.x,
    1,
    islandCenter.z - patchSize * 0.5 - bridgeDockLength
  );
}

export function createBridgeBetweenNeighborhoods(scene, physicsWorld, groundMaterial, startPoint, endPoint, materials) {
  console.log('Creating bridge between:', startPoint, 'and', endPoint);
  
  const bridgeDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  const bridgeLength = startPoint.distanceTo(endPoint);
  const bridgeWidth = 6;
  const bridgeHeight = 30;
  const segmentCount = Math.max(10, Math.floor(bridgeLength / 10));
  const segmentLength = bridgeLength / segmentCount;
  
  const bridgeCenter = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);
  
  const roadGeometry = new THREE.BoxGeometry(bridgeWidth, 1, bridgeLength);
  const roadMesh = new THREE.Mesh(roadGeometry, materials.bridgeRoad);
  roadMesh.position.copy(bridgeCenter);
  roadMesh.position.y = 1;
  roadMesh.lookAt(endPoint.x, 1, endPoint.z);
  bridgeGroup.add(roadMesh);

  const roadShape = new CANNON.Box(new CANNON.Vec3(bridgeWidth / 2, 0.5, bridgeLength / 2));
  const roadBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(bridgeCenter.x, bridgeCenter.y, bridgeCenter.z),
    material: groundMaterial
  });
  const quaternion = new THREE.Quaternion();
  roadMesh.getWorldQuaternion(quaternion);
  roadBody.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  roadBody.addShape(roadShape);
  physicsWorld.addBody(roadBody);

  const towerWidth = 2;
  const towerDepth = 2;
  const towerDistance = bridgeLength * 0.25;
  for (let i = -1; i <= 1; i += 2) {
    const towerPosition = new THREE.Vector3().copy(bridgeCenter).addScaledVector(bridgeDirection, i * towerDistance);
    towerPosition.y = 0;
    
    const towerBaseGeometry = new THREE.BoxGeometry(towerWidth * 1.5, 2, towerDepth * 1.5);
    const towerBaseMesh = new THREE.Mesh(towerBaseGeometry, materials.bridge);
    towerBaseMesh.position.copy(towerPosition);
    towerBaseMesh.position.y = 1;
    bridgeGroup.add(towerBaseMesh);
    
    for (let j = -1; j <= 1; j += 2) {
      const columnGeometry = new THREE.BoxGeometry(towerWidth / 2, bridgeHeight, towerDepth / 2);
      const columnMesh = new THREE.Mesh(columnGeometry, materials.bridge);
      columnMesh.position.copy(towerPosition);
      columnMesh.position.x += j * towerWidth * 0.4;
      columnMesh.position.y = bridgeHeight / 2 + 2;
      bridgeGroup.add(columnMesh);
      
      const columnShape = new CANNON.Box(new CANNON.Vec3(towerWidth / 4, bridgeHeight / 2, towerDepth / 4));
      const columnBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(columnMesh.position.x, columnMesh.position.y, columnMesh.position.z)
      });
      columnBody.addShape(columnShape);
      physicsWorld.addBody(columnBody);
      
      if (j === -1) {
        const crossbeamGeometry = new THREE.BoxGeometry(towerWidth * 1.2, towerWidth / 2, towerDepth / 2);
        const crossbeamMesh = new THREE.Mesh(crossbeamGeometry, materials.bridge);
        crossbeamMesh.position.copy(towerPosition);
        crossbeamMesh.position.y = bridgeHeight + 2;
        bridgeGroup.add(crossbeamMesh);
      }
    }
    
    const towerBaseShape = new CANNON.Box(new CANNON.Vec3(towerWidth * 1.5 / 2, 1, towerDepth * 1.5 / 2));
    const towerBaseBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(towerBaseMesh.position.x, towerBaseMesh.position.y, towerBaseMesh.position.z)
    });
    towerBaseBody.addShape(towerBaseShape);
    physicsWorld.addBody(towerBaseBody);
  }

  const cableCount = 10;
  const cableHeight = bridgeHeight * 0.9;
  const cableThickness = 0.1;
  const mainCablePoints = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = startPoint.x + (endPoint.x - startPoint.x) * t;
    const z = startPoint.z + (endPoint.z - startPoint.z) * t;
    let y;
    const relativeDist = Math.abs((t - 0.5) * 2);
    if (relativeDist <= 0.5) {
      y = cableHeight * (1 - Math.pow(relativeDist * 2, 2)) + 2;
    } else {
      y = cableHeight * (1 - Math.pow(0.5 * 2, 2)) + 2 - (relativeDist - 0.5) * 4;
    }
    mainCablePoints.push(new THREE.Vector3(x, y, z));
  }
  const mainCableCurve = new THREE.CatmullRomCurve3(mainCablePoints);
  const mainCableGeometry = new THREE.TubeGeometry(mainCableCurve, 50, cableThickness, 8, false);
  const mainCableMesh = new THREE.Mesh(mainCableGeometry, materials.bridgeCable);
  bridgeGroup.add(mainCableMesh);

  for (let i = 1; i <= cableCount; i++) {
    const t = i / (cableCount + 1);
    const cablePosition = new THREE.Vector3().copy(startPoint).lerp(endPoint, t);
    const mainCableHeight = mainCableCurve.getPointAt(t).y;
    const verticalCableGeometry = new THREE.CylinderGeometry(cableThickness / 2, cableThickness / 2, mainCableHeight - 1, 8);
    const verticalCableMesh = new THREE.Mesh(verticalCableGeometry, materials.bridgeCable);
    verticalCableMesh.position.copy(cablePosition);
    verticalCableMesh.position.y = (mainCableHeight + 1) / 2;
    bridgeGroup.add(verticalCableMesh);
  }

  const railingHeight = 1.2;
  for (let side = -1; side <= 1; side += 2) {
    const railingGeometry = new THREE.BoxGeometry(0.2, railingHeight, bridgeLength);
    const railingMesh = new THREE.Mesh(railingGeometry, materials.bridgeCable);
    railingMesh.position.copy(bridgeCenter);
    railingMesh.position.x += side * (bridgeWidth / 2 - 0.1);
    railingMesh.position.y = 1 + railingHeight / 2;
    railingMesh.lookAt(endPoint.x, 1 + railingHeight / 2, endPoint.z);
    bridgeGroup.add(railingMesh);
    
    const postCount = Math.floor(bridgeLength / 5);
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount;
      const postPosition = new THREE.Vector3().copy(startPoint).lerp(endPoint, t);
      postPosition.y = 1;
      const direction = new THREE.Vector3().copy(bridgeDirection).cross(new THREE.Vector3(0, 1, 0));
      postPosition.add(direction.multiplyScalar(side * (bridgeWidth / 2 - 0.1)));
      const postGeometry = new THREE.BoxGeometry(0.2, railingHeight, 0.2);
      const postMesh = new THREE.Mesh(postGeometry, materials.bridgeCable);
      postMesh.position.copy(postPosition);
      postMesh.position.y += railingHeight / 2;
      bridgeGroup.add(postMesh);
    }
  }

  return {
    group: bridgeGroup,
    startPoint: startPoint,
    endPoint: endPoint
  };
}

export function createFloatingBridgeBetweenNeighborhoods(scene, physicsWorld, groundMaterial, startPoint, endPoint, materials) {
  console.log('Creating floating bridge between:', startPoint, 'and', endPoint);

  const bridgeDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  const bridgeLength = startPoint.distanceTo(endPoint);
  const bridgeWidth = 6;
  const bridgeCenter = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  const seaLevel = -1.5;

  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);

  // --- Floating Pontoons ---
  const pontoonCount = Math.max(3, Math.floor(bridgeLength / 20));
  const pontoonWidth = bridgeWidth * 1.5;
  const pontoonLength = 10;
  const pontoonHeight = 2;
  const pontoonGeometry = new THREE.BoxGeometry(pontoonWidth, pontoonHeight, pontoonLength);
  
  const pontoons = [];
  for (let i = 0; i < pontoonCount; i++) {
    const t = i / (pontoonCount - 1);
    const pontoonPosition = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
    pontoonPosition.y = seaLevel + pontoonHeight / 2;
    
    const pontoonMesh = new THREE.Mesh(pontoonGeometry, materials.whitewash);
    pontoonMesh.position.copy(pontoonPosition);
    pontoonMesh.lookAt(endPoint.x, pontoonPosition.y, endPoint.z);
    bridgeGroup.add(pontoonMesh);
    
    const trimGeometry = new THREE.BoxGeometry(pontoonWidth + 0.2, 0.2, pontoonLength + 0.2);
    const trimMesh = new THREE.Mesh(trimGeometry, materials.terracotta);
    trimMesh.position.copy(pontoonPosition);
    trimMesh.position.y += pontoonHeight / 2;
    trimMesh.lookAt(endPoint.x, pontoonPosition.y, endPoint.z);
    bridgeGroup.add(trimMesh);
    
    const pontoonShape = new CANNON.Box(new CANNON.Vec3(pontoonWidth / 2, pontoonHeight / 2, pontoonLength / 2));
    const pontoonBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(pontoonPosition.x, pontoonPosition.y, pontoonPosition.z),
      material: groundMaterial
    });
    pontoonBody.quaternion.setFromEuler(0, Math.atan2(bridgeDirection.z, bridgeDirection.x), 0);
    pontoonBody.addShape(pontoonShape);
    physicsWorld.addBody(pontoonBody);
    
    pontoons.push({ mesh: pontoonMesh, body: pontoonBody, position: pontoonPosition });
  }
  
  // --- Road Deck ---
  const roadGeometry = new THREE.BoxGeometry(bridgeWidth, 0.5, bridgeLength);
  const roadMesh = new THREE.Mesh(roadGeometry, materials.bridgeRoad);
  roadMesh.position.copy(bridgeCenter);
  roadMesh.position.y = seaLevel + pontoonHeight + 0.25;
  roadMesh.lookAt(endPoint.x, roadMesh.position.y, endPoint.z);
  bridgeGroup.add(roadMesh);
  
  const segmentCount = pontoonCount - 1;
  const segmentLength = bridgeLength / segmentCount;
  const roadSegments = [];
  for (let i = 0; i < segmentCount; i++) {
    const t = (i + 0.5) / segmentCount;
    const segmentPosition = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
    segmentPosition.y = roadMesh.position.y;
    
    const roadShape = new CANNON.Box(new CANNON.Vec3(bridgeWidth / 2, 0.25, segmentLength / 2));
    const roadBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(segmentPosition.x, segmentPosition.y, segmentPosition.z),
      material: groundMaterial
    });
    roadBody.quaternion.copy(roadMesh.quaternion);
    roadBody.addShape(roadShape);
    physicsWorld.addBody(roadBody);
    roadSegments.push(roadBody);
  }
  
  // --- Suspension Cables ---
  const cableThickness = 0.1;
  const cableHeightAbove = 10;
  const mainCablePoints = [];
  pontoons.forEach((pontoon) => {
    const cablePoint = pontoon.position.clone();
    cablePoint.y += pontoonHeight / 2 + cableHeightAbove;
    mainCablePoints.push(cablePoint);
  });
  const mainCableCurve = new THREE.CatmullRomCurve3(mainCablePoints);
  const mainCableGeometry = new THREE.TubeGeometry(mainCableCurve, 50, cableThickness, 8, false);
  const mainCableMesh = new THREE.Mesh(mainCableGeometry, materials.bridgeCable);
  bridgeGroup.add(mainCableMesh);
  
  pontoons.forEach((pontoon) => {
    const roadPoint = pontoon.position.clone();
    roadPoint.y = roadMesh.position.y;
    const cableGeometry = new THREE.CylinderGeometry(cableThickness / 2, cableThickness / 2, cableHeightAbove, 8);
    const cableMesh = new THREE.Mesh(cableGeometry, materials.bridgeCable);
    cableMesh.position.lerpVectors(pontoon.position, roadPoint, 0.5);
    cableMesh.position.y += pontoonHeight / 2 + cableHeightAbove / 2;
    bridgeGroup.add(cableMesh);
  });
  
  // --- Decorative Lanterns ---
  const lanternCount = pontoonCount * 2;
  for (let i = 0; i < lanternCount; i++) {
    const t = i / (lanternCount - 1);
    const basePosition = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
    basePosition.y = roadMesh.position.y;
    for (let side = -1; side <= 1; side += 2) {
      const lanternPos = basePosition.clone();
      lanternPos.add(bridgeDirection.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(side * bridgeWidth / 2));
      const lanternGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const lanternMesh = new THREE.Mesh(lanternGeometry, new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 }));
      lanternMesh.position.copy(lanternPos);
      lanternMesh.position.y += 0.5;
      bridgeGroup.add(lanternMesh);
      
      const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
      const poleMesh = new THREE.Mesh(poleGeometry, materials.bridgeCable);
      poleMesh.position.copy(lanternPos);
      poleMesh.position.y += 0.25;
      bridgeGroup.add(poleMesh);
    }
  }
  
  return {
    group: bridgeGroup,
    startPoint: startPoint,
    endPoint: endPoint,
    pontoons: pontoons,
    roadSegments: roadSegments
  };
}

// =====================================================
// OPTIONAL: Connect Two Villages With a Floating Bridge
// =====================================================
export function connectTwoVillagesWithFloatingBridge(scene, physicsWorld, groundMaterial, materials) {
  const village1 = createMediterraneanVillage(scene, physicsWorld, groundMaterial, () => 0, 100, new THREE.Vector3(0, 0, 0));
  const village2 = createMediterraneanVillage(scene, physicsWorld, groundMaterial, () => 0, 100, new THREE.Vector3(200, 0, 0));
  const bridge = createFloatingBridgeBetweenNeighborhoods(
    scene,
    physicsWorld,
    groundMaterial,
    village1.bridgeConnectionPoint,
    village2.bridgeConnectionPoint,
    materials
  );
  return { village1, village2, bridge };
}
