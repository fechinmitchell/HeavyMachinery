// mediterraneanVillage.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Water } from 'three/examples/jsm/objects/Water.js';

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
  
  // Create terrain and water with realistic water and gentle slopes.
  createTerrainWithWater(scene, physicsWorld, groundMaterial, patchSize, origin, materials);
  
  // Add houses.
  createMediterraneanHouses(scene, physicsWorld, patchSize, origin, materials);
  
  // Add roads that connect to other areas.
  createConnectingRoads(scene, physicsWorld, groundMaterial, patchSize, origin, materials);
  
  // Add vegetation (olive trees, cypress trees, etc.).
  addVegetation(scene, physicsWorld, patchSize, origin, materials);
  
  // Create bridge connection point for this village
  const bridgeStartPoint = createBridgeConnection(scene, physicsWorld, groundMaterial, patchSize, origin, materials);

  return {
    center: new THREE.Vector3(origin.x + patchSize / 2, origin.y, origin.z + patchSize / 2),
    bridgeConnectionPoint: bridgeStartPoint
  };
}

function createTerrainWithWater(scene, physicsWorld, groundMaterial, patchSize, origin, materials) {
  const seaLevel = -1.5;
  const seaSize = patchSize * 1.5;

  // Create realistic water using THREE.Water with improved settings
  const waterGeometry = new THREE.PlaneGeometry(seaSize, seaSize);
  const water = new Water(waterGeometry, {
    textureWidth: 1024, // Higher resolution for better detail
    textureHeight: 1024,
    waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function(texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 8); // Increase repeats for more detail
    }),
    sunDirection: new THREE.Vector3(1, 1, 1).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x1a75ff,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
    alpha: 0.8 // Transparency for shallow water effect
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(origin.x + patchSize / 2, seaLevel, origin.z + patchSize / 2);
  scene.add(water);

  // Add foam/wave effect at shoreline
  const shorelineGeometry = new THREE.RingGeometry(
    patchSize * 0.4 - 0.5, // Inner radius slightly smaller than island
    patchSize * 0.4 + 0.5, // Outer radius slightly larger than island
    64, 
    1
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

  // Create an invisible physics body for the water.
  const seaDepth = 15;
  const waterShape = new CANNON.Box(new CANNON.Vec3(seaSize / 2, seaDepth / 2, seaSize / 2));
  const waterBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(origin.x + patchSize / 2, seaLevel - seaDepth / 2, origin.z + patchSize / 2),
    shape: waterShape,
    material: groundMaterial
  });
  
  // Add water physics properties for machinery
  waterBody.collisionResponse = 1;
  waterBody.userData = { isWater: true };
  
  physicsWorld.addBody(waterBody);
  
  // Create the main island with gentle slopes.
  createSlopedIsland(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel);
}

function createSlopedIsland(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel) {
  const islandRadius = patchSize * 0.4;
  const segments = 64;
  const maxHeight = 1.5;
  
  // Create a circular geometry with more segments for smoother slopes
  const geometry = new THREE.CircleGeometry(islandRadius, segments);
  geometry.rotateX(-Math.PI / 2);
  
  // Modify vertex heights to form a gentle slope:
  // Create smoother, more gradual slopes that machinery can traverse
  const positionAttr = geometry.attributes.position;
  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i);
    const z = positionAttr.getZ(i);
    const dist = Math.sqrt(x * x + z * z);
    
    // Use a smoother height curve (quadratic instead of linear)
    // This creates a more gradual slope at the edges
    const heightRatio = 1 - (dist / islandRadius);
    const height = maxHeight * heightRatio * heightRatio;
    
    positionAttr.setY(i, height);
  }
  geometry.computeVertexNormals();
  
  const islandMesh = new THREE.Mesh(geometry, materials.sand);
  // Position the island so its base aligns with seaLevel.
  islandMesh.position.set(origin.x + patchSize / 2, seaLevel, origin.z + patchSize / 2);
  scene.add(islandMesh);
  
  // Use a heightfield for better physics representation of the sloped terrain
  const heightfieldSize = 32; // Must be a power of 2 + 1
  const heightfieldData = [];
  
  // Create a height array for the heightfield
  for (let i = 0; i < heightfieldSize; i++) {
    heightfieldData[i] = [];
    for (let j = 0; j < heightfieldSize; j++) {
      // Calculate normalized position on the island
      const nx = (i / (heightfieldSize - 1) - 0.5) * 2;
      const nz = (j / (heightfieldSize - 1) - 0.5) * 2;
      
      // Calculate distance from center (0-1)
      const dist = Math.min(1, Math.sqrt(nx * nx + nz * nz));
      
      // Use same quadratic function for smooth slope
      const heightRatio = 1 - dist;
      const height = maxHeight * heightRatio * heightRatio;
      
      heightfieldData[i][j] = height;
    }
  }
  
  // Create heightfield shape
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
  
  // Rotate the heightfield to the correct orientation
  heightfieldBody.addShape(heightfieldShape);
  physicsWorld.addBody(heightfieldBody);
  
  // Create a peninsula extending from the island for roads with gentle slopes for machinery
  createPeninsula(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel, maxHeight, islandRadius);
}

function createPeninsula(scene, physicsWorld, groundMaterial, patchSize, origin, materials, seaLevel, landHeight, islandRadius) {
  const peninsulaWidth = patchSize * 0.2;
  const peninsulaLength = patchSize * 0.5;
  
  // Create a custom geometry for the peninsula with gentle slopes
  const detailSegments = 20;
  const peninsulaGeometry = new THREE.PlaneGeometry(
    peninsulaWidth, 
    peninsulaLength, 
    detailSegments - 1, 
    detailSegments - 1
  );
  peninsulaGeometry.rotateX(-Math.PI / 2);
  
  // Modify the geometry to create a gentle slope
  const positionAttr = peninsulaGeometry.attributes.position;
  for (let i = 0; i < positionAttr.count; i++) {
    const y = positionAttr.getY(i);
    
    // Normalize the position along the length (0 at start, 1 at end)
    const lengthRatio = (y + peninsulaLength / 2) / peninsulaLength;
    
    // Create a smooth slope from the island to the water
    let height;
    if (lengthRatio < 0.2) {
      // Near the island, maintain island height
      height = landHeight * 0.8;
    } else if (lengthRatio > 0.9) {
      // Near the water, gradually reach sea level
      height = seaLevel + 0.1;
    } else {
      // Smooth transition in between
      const t = (lengthRatio - 0.2) / 0.7;
      height = landHeight * 0.8 * (1 - t) + (seaLevel + 0.1) * t;
    }
    
    positionAttr.setZ(i, height);
  }
  peninsulaGeometry.computeVertexNormals();
  
  const peninsulaMesh = new THREE.Mesh(peninsulaGeometry, materials.sand);
  
  const islandCenter = new THREE.Vector3(origin.x + patchSize / 2, 0, origin.z + patchSize / 2);
  peninsulaMesh.position.set(
    islandCenter.x,
    0,
    islandCenter.z - (islandRadius + peninsulaLength / 2)
  );
  scene.add(peninsulaMesh);
  
  // Create heightfield for peninsula physics
  const heightfieldSize = 32;
  const heightfieldData = [];
  
  for (let i = 0; i < heightfieldSize; i++) {
    heightfieldData[i] = [];
    for (let j = 0; j < heightfieldSize; j++) {
      // Normalize position on peninsula (0-1)
      const lengthRatio = j / (heightfieldSize - 1);
      
      // Use same slope function as visual geometry
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
      islandCenter.z - islandRadius - peninsulaLength
    ),
    material: groundMaterial
  });
  
  peninsulaBody.addShape(peninsulaShape);
  physicsWorld.addBody(peninsulaBody);
  
  return {
    startPoint: new THREE.Vector3(
      islandCenter.x,
      seaLevel + 0.1,
      islandCenter.z - islandRadius - peninsulaLength
    )
  };
}

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
  mainRoadMesh.position.set(
    islandCenter.x,
    0.15,
    islandCenter.z - mainRoadLength / 2
  );
  scene.add(mainRoadMesh);
  
  const circularRoadRadius = islandRadius * 0.7;
  const circularRoadGeometry = new THREE.RingGeometry(
    circularRoadRadius - roadWidth / 2,
    circularRoadRadius + roadWidth / 2,
    32
  );
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
    connectorMesh.position.set(
      (innerX + outerX) / 2,
      0.17,
      (innerZ + outerZ) / 2
    );
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
  
  // Create a dock/pier that extends from the peninsula
  const dockGeometry = new THREE.BoxGeometry(roadWidth, 1, bridgeDockLength);
  const dockMesh = new THREE.Mesh(dockGeometry, materials.road);
  
  // Position at the end of the peninsula
  dockMesh.position.set(
    islandCenter.x,
    0.2,
    islandCenter.z - patchSize * 0.5 - bridgeDockLength / 2
  );
  scene.add(dockMesh);
  
  // Add physics for the dock
  const dockShape = new CANNON.Box(new CANNON.Vec3(roadWidth / 2, 0.5, bridgeDockLength / 2));
  const dockBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(dockMesh.position.x, dockMesh.position.y, dockMesh.position.z),
    material: groundMaterial
  });
  dockBody.addShape(dockShape);
  physicsWorld.addBody(dockBody);
  
  // Return the bridge connection point (at the end of the dock)
  return new THREE.Vector3(
    islandCenter.x,
    1, // Slightly elevated for the bridge
    islandCenter.z - patchSize * 0.5 - bridgeDockLength
  );
}

export function createBridgeBetweenNeighborhoods(scene, physicsWorld, groundMaterial, startPoint, endPoint, materials) {
  console.log('Creating bridge between:', startPoint, 'and', endPoint);
  
  // Calculate bridge properties
  const bridgeDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  const bridgeLength = startPoint.distanceTo(endPoint);
  const bridgeWidth = 6;
  const bridgeHeight = 30; // Height of towers
  const segmentCount = Math.max(10, Math.floor(bridgeLength / 10)); // One segment per 10 units
  const segmentLength = bridgeLength / segmentCount;
  
  // Create bridge center point
  const bridgeCenter = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  
  // Create a group to hold all bridge elements
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);
  
  const roadGeometry = new THREE.BoxGeometry(bridgeWidth, 1, bridgeLength);
  const roadMesh = new THREE.Mesh(roadGeometry, materials.bridgeRoad);
  roadMesh.position.copy(bridgeCenter);
  roadMesh.position.y = 1; // Slight elevation
  roadMesh.lookAt(endPoint.x, 1, endPoint.z);
  bridgeGroup.add(roadMesh);

  // Create physics body for the road deck
  const roadShape = new CANNON.Box(new CANNON.Vec3(bridgeWidth / 2, 0.5, bridgeLength / 2));
  const roadBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(bridgeCenter.x, bridgeCenter.y, bridgeCenter.z),
    material: groundMaterial
  });
  // Align the road physics with the mesh orientation
  const quaternion = new THREE.Quaternion();
  roadMesh.getWorldQuaternion(quaternion);
  roadBody.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  roadBody.addShape(roadShape);
  physicsWorld.addBody(roadBody);

  // Create bridge towers
  const towerWidth = 2;
  const towerDepth = 2;
  const towerDistance = bridgeLength * 0.25; // Tower at 1/4 and 3/4 of bridge length

  for (let i = -1; i <= 1; i += 2) {
    // Skip middle tower
    if (i === 0) continue;
    
    const towerPosition = new THREE.Vector3().copy(bridgeCenter).addScaledVector(bridgeDirection, i * towerDistance);
    towerPosition.y = 0; // At base level
    
    // Create tower base
    const towerBaseGeometry = new THREE.BoxGeometry(towerWidth * 1.5, 2, towerDepth * 1.5);
    const towerBaseMesh = new THREE.Mesh(towerBaseGeometry, materials.bridge);
    towerBaseMesh.position.copy(towerPosition);
    towerBaseMesh.position.y = 1; // Half the base height
    bridgeGroup.add(towerBaseMesh);
    
    // Create tower columns
    for (let j = -1; j <= 1; j += 2) {
      const columnGeometry = new THREE.BoxGeometry(towerWidth / 2, bridgeHeight, towerDepth / 2);
      const columnMesh = new THREE.Mesh(columnGeometry, materials.bridge);
      columnMesh.position.copy(towerPosition);
      columnMesh.position.x += j * towerWidth * 0.4;
      columnMesh.position.y = bridgeHeight / 2 + 2; // Half height + base height
      bridgeGroup.add(columnMesh);
      
      // Physics for tower column
      const columnShape = new CANNON.Box(new CANNON.Vec3(towerWidth / 4, bridgeHeight / 2, towerDepth / 4));
      const columnBody = new CANNON.Body({
        mass: 0,
        position: new CANNON.Vec3(columnMesh.position.x, columnMesh.position.y, columnMesh.position.z)
      });
      columnBody.addShape(columnShape);
      physicsWorld.addBody(columnBody);
      
      // Create tower crossbeam at top
      if (j === -1) {
        const crossbeamGeometry = new THREE.BoxGeometry(towerWidth * 1.2, towerWidth / 2, towerDepth / 2);
        const crossbeamMesh = new THREE.Mesh(crossbeamGeometry, materials.bridge);
        crossbeamMesh.position.copy(towerPosition);
        crossbeamMesh.position.y = bridgeHeight + 2;
        bridgeGroup.add(crossbeamMesh);
      }
    }
    
    // Physics for tower base
    const towerBaseShape = new CANNON.Box(new CANNON.Vec3(towerWidth * 1.5 / 2, 1, towerDepth * 1.5 / 2));
    const towerBaseBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(towerBaseMesh.position.x, towerBaseMesh.position.y, towerBaseMesh.position.z)
    });
    towerBaseBody.addShape(towerBaseShape);
    physicsWorld.addBody(towerBaseBody);
  }

  // Create suspension cables
  const cableCount = 10;
  const cableSpacing = bridgeLength / (cableCount + 1);
  const cableHeight = bridgeHeight * 0.9;
  const cableThickness = 0.1;

  // Main suspension cables (horizontal)
  const mainCablePoints = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = startPoint.x + (endPoint.x - startPoint.x) * t;
    const z = startPoint.z + (endPoint.z - startPoint.z) * t;
    
    // Create a parabolic cable curve with highest points at the towers
    let y;
    const relativeDist = Math.abs((t - 0.5) * 2); // 0 at middle, 1 at ends
    if (relativeDist <= 0.5) {
      // Between towers - parabolic curve
      y = cableHeight * (1 - Math.pow(relativeDist * 2, 2)) + 2;
    } else {
      // Outside towers - linear decrease
      y = cableHeight * (1 - Math.pow(0.5 * 2, 2)) + 2 - (relativeDist - 0.5) * 4;
    }
    
    mainCablePoints.push(new THREE.Vector3(x, y, z));
  }

  // Create the main suspension cables
  const mainCableCurve = new THREE.CatmullRomCurve3(mainCablePoints);
  const mainCableGeometry = new THREE.TubeGeometry(mainCableCurve, 50, cableThickness, 8, false);
  const mainCableMesh = new THREE.Mesh(mainCableGeometry, materials.bridgeCable);
  bridgeGroup.add(mainCableMesh);

  // Create the vertical suspension cables
  for (let i = 1; i <= cableCount; i++) {
    const t = i / (cableCount + 1);
    const cablePosition = new THREE.Vector3().copy(startPoint).lerp(endPoint, t);
    
    // Get height at this position from the main cable curve
    const mainCableHeight = mainCableCurve.getPointAt(t).y;
    
    // Create vertical cable
    const verticalCableGeometry = new THREE.CylinderGeometry(cableThickness / 2, cableThickness / 2, mainCableHeight - 1, 8);
    const verticalCableMesh = new THREE.Mesh(verticalCableGeometry, materials.bridgeCable);
    verticalCableMesh.position.copy(cablePosition);
    verticalCableMesh.position.y = (mainCableHeight + 1) / 2;
    bridgeGroup.add(verticalCableMesh);
  }

  // Add bridge railings
  const railingHeight = 1.2;
  for (let side = -1; side <= 1; side += 2) {
    const railingGeometry = new THREE.BoxGeometry(0.2, railingHeight, bridgeLength);
    const railingMesh = new THREE.Mesh(railingGeometry, materials.bridgeCable);
    railingMesh.position.copy(bridgeCenter);
    railingMesh.position.x += side * (bridgeWidth / 2 - 0.1);
    railingMesh.position.y = 1 + railingHeight / 2;
    railingMesh.lookAt(endPoint.x, 1 + railingHeight / 2, endPoint.z);
    bridgeGroup.add(railingMesh);
    
    // Add posts at regular intervals
    const postCount = Math.floor(bridgeLength / 5);
    for (let i = 0; i <= postCount; i++) {
      const t = i / postCount;
      const postPosition = new THREE.Vector3().copy(startPoint).lerp(endPoint, t);
      postPosition.y = 1;
      
      // Adjust x position based on side
      const direction = new THREE.Vector3().copy(bridgeDirection).cross(new THREE.Vector3(0, 1, 0));
      postPosition.add(direction.multiplyScalar(side * (bridgeWidth / 2 - 0.1)));
      
      const postGeometry = new THREE.BoxGeometry(0.2, railingHeight, 0.2);
      const postMesh = new THREE.Mesh(postGeometry, materials.bridgeCable);
      postMesh.position.copy(postPosition);
      postMesh.position.y += railingHeight / 2;
      bridgeGroup.add(postMesh);
    }
  }

  // Return the bridge for reference
  return {
    group: bridgeGroup,
    startPoint: startPoint,
    endPoint: endPoint
  };
}

export function createFloatingBridgeBetweenNeighborhoods(scene, physicsWorld, groundMaterial, startPoint, endPoint, materials) {
  console.log('Creating floating bridge between:', startPoint, 'and', endPoint);

  // Calculate bridge properties
  const bridgeDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
  const bridgeLength = startPoint.distanceTo(endPoint);
  const bridgeWidth = 6;
  const bridgeCenter = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
  const seaLevel = -1.5; // Match the water level from createTerrainWithWater

  // Create a group for all bridge elements
  const bridgeGroup = new THREE.Group();
  scene.add(bridgeGroup);

  // --- Floating Pontoons ---
  const pontoonCount = Math.max(3, Math.floor(bridgeLength / 20)); // One pontoon every 20 units, min 3
  const pontoonSpacing = bridgeLength / (pontoonCount - 1);
  const pontoonWidth = bridgeWidth * 1.5;
  const pontoonLength = 10;
  const pontoonHeight = 2;
  const pontoonGeometry = new THREE.BoxGeometry(pontoonWidth, pontoonHeight, pontoonLength);
  
  const pontoons = [];
  for (let i = 0; i < pontoonCount; i++) {
    const t = i / (pontoonCount - 1);
    const pontoonPosition = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
    pontoonPosition.y = seaLevel + pontoonHeight / 2; // Float on water surface

    const pontoonMesh = new THREE.Mesh(pontoonGeometry, materials.whitewash);
    pontoonMesh.position.copy(pontoonPosition);
    pontoonMesh.lookAt(endPoint.x, pontoonPosition.y, endPoint.z);
    bridgeGroup.add(pontoonMesh);

    // Add terracotta trim for Mediterranean style
    const trimGeometry = new THREE.BoxGeometry(pontoonWidth + 0.2, 0.2, pontoonLength + 0.2);
    const trimMesh = new THREE.Mesh(trimGeometry, materials.terracotta);
    trimMesh.position.copy(pontoonPosition);
    trimMesh.position.y += pontoonHeight / 2;
    trimMesh.lookAt(endPoint.x, pontoonPosition.y, endPoint.z);
    bridgeGroup.add(trimMesh);

    // Physics: buoyant pontoon (static, but with slight bobbing)
    const pontoonShape = new CANNON.Box(new CANNON.Vec3(pontoonWidth / 2, pontoonHeight / 2, pontoonLength / 2));
    const pontoonBody = new CANNON.Body({
      mass: 0, // Static for simplicity
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
  roadMesh.position.y = seaLevel + pontoonHeight + 0.25; // Just above pontoons
  roadMesh.lookAt(endPoint.x, roadMesh.position.y, endPoint.z);
  bridgeGroup.add(roadMesh);

  // Physics for road deck (split into segments for realism)
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
  const cableHeightAbove = 10; // Height of cables above road
  const mainCablePoints = [];
  pontoons.forEach((pontoon, i) => {
    const cablePoint = pontoon.position.clone();
    cablePoint.y += pontoonHeight / 2 + cableHeightAbove;
    mainCablePoints.push(cablePoint);
  });

  const mainCableCurve = new THREE.CatmullRomCurve3(mainCablePoints);
  const mainCableGeometry = new THREE.TubeGeometry(mainCableCurve, 50, cableThickness, 8, false);
  const mainCableMesh = new THREE.Mesh(mainCableGeometry, materials.bridgeCable);
  bridgeGroup.add(mainCableMesh);

  // Vertical cables from pontoons to road
  pontoons.forEach((pontoon, i) => {
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

  // --- Water Hazard ---
  // The existing water body from createTerrainWithWater will handle machinery falling in
  // No additional physics needed here; machinery will sink due to collision with waterBody

  return {
    group: bridgeGroup,
    startPoint: startPoint,
    endPoint: endPoint,
    pontoons: pontoons,
    roadSegments: roadSegments
  };
}

// Optional utility function to connect two villages with the floating bridge
export function connectTwoVillagesWithFloatingBridge(scene, physicsWorld, groundMaterial, materials) {
  // Create two villages
  const village1 = createMediterraneanVillage(scene, physicsWorld, groundMaterial, () => 0, 100, new THREE.Vector3(0, 0, 0));
  const village2 = createMediterraneanVillage(scene, physicsWorld, groundMaterial, () => 0, 100, new THREE.Vector3(200, 0, 0));

  // Create the floating bridge between them
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