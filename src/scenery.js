import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Utility: Creates a single dynamic "block" in both THREE and CANNON.
 */
function createDynamicBox(
  scene,
  physicsWorld,
  size,            // { x: number, y: number, z: number }
  position,        // THREE.Vector3 for where the *bottom* of the box will sit
  color,
  mass = 1,
  fixedRotation = false,
  rotationY = 0    // optional rotation around Y for the mesh
) {
  // 1) Create the Three.js mesh
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Position the mesh so its bottom sits exactly at position.y
  // (center is at position.y + halfHeight)
  const halfY = size.y * 0.5;
  mesh.position.set(position.x, position.y + halfY, position.z);
  // Apply optional Y rotation
  mesh.rotation.y = rotationY;
  scene.add(mesh);

  // 2) Create the Cannon.js body
  const halfX = size.x * 0.5;
  const halfZ = size.z * 0.5;
  const shape = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));
  const body = new CANNON.Body({
    mass,
    linearDamping: 0.01,
    angularDamping: 0.01
  });
  body.addShape(shape);

  // The body center is at the same place as the mesh center:
  body.position.set(position.x, position.y + halfY, position.z);
  if (fixedRotation) {
    body.fixedRotation = true;
    body.updateMassProperties();
  }

  // If a rotation is specified, apply it to the body
  if (rotationY !== 0) {
    body.quaternion.setFromEuler(0, rotationY, 0, 'XYZ');
  }

  physicsWorld.addBody(body);

  return { mesh, body };
}

/**
 * Creates a "tree" out of two dynamic blocks:
 * (1) a trunk, (2) foliage on top.
 */
export function createTree(scene, physicsWorld, groundMaterial, position) {
  // Trunk: ~0.6 wide, 2 tall
  const trunkSize = { x: 0.6, y: 2, z: 0.6 };
  const trunkColor = 0x8b4513;
  const trunkBlock = createDynamicBox(
    scene,
    physicsWorld,
    trunkSize,
    position,
    trunkColor,
    1,
    true // fix rotation
  );

  // Foliage: ~1.5 wide, 1 tall; positioned atop trunk (trunk height = 2)
  const foliageSize = { x: 1.5, y: 1, z: 1.5 };
  const foliageColor = 0x228b22;
  const foliagePos = new THREE.Vector3(position.x, position.y + 2, position.z);
  const foliageBlock = createDynamicBox(
    scene,
    physicsWorld,
    foliageSize,
    foliagePos,
    foliageColor,
    1,
    true
  );

  return { trunk: trunkBlock, foliage: foliageBlock };
}

/**
 * Creates a house as a single compound dynamic body.
 * The visual house is a group consisting of:
 *  - A base (4x3x4 box) positioned with its bottom at the ground.
 *  - A roof (3.8x2x3.8 box) on top of the base, rotated 45° about Y.
 *
 * The compound physics body combines these two boxes so that the house
 * is a solid obstacle that blocks machinery.
 */
export function createHouse(scene, physicsWorld, groundMaterial, position) {
  // --- Visual Setup ---
  const houseGroup = new THREE.Group();

  // Base parameters
  const baseSize = { x: 4, y: 3, z: 4 };
  const baseColor = 0xf0f0f0;
  const baseGeo = new THREE.BoxGeometry(baseSize.x, baseSize.y, baseSize.z);
  const baseMat = new THREE.MeshStandardMaterial({ color: baseColor });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  // Center base mesh: bottom at y=0, center at y=1.5
  baseMesh.position.set(0, baseSize.y * 0.5, 0);
  houseGroup.add(baseMesh);

  // Roof parameters
  const roofSize = { x: 3.8, y: 2, z: 3.8 };
  const roofColor = 0x8b0000;
  const roofGeo = new THREE.BoxGeometry(roofSize.x, roofSize.y, roofSize.z);
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor });
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  // Position roof: bottom at y = base height (3), so center at y = 3 + roofSize.y/2 = 4
  roofMesh.position.set(0, baseSize.y + roofSize.y * 0.5, 0);
  // Rotate roof 45° about Y for visual flair
  roofMesh.rotation.y = Math.PI / 4;
  houseGroup.add(roofMesh);

  // Position the group so that its bottom is at position.y
  houseGroup.position.copy(position);
  scene.add(houseGroup);

  // --- Physics Setup: Compound Body ---
  // We'll create one Cannon.Body and add two shapes:
  // 1) The base shape: a box of half extents (baseSize.x/2, baseSize.y/2, baseSize.z/2),
  //    positioned so its center is at (0, baseSize.y/2, 0).
  // 2) The roof shape: a box of half extents (roofSize.x/2, roofSize.y/2, roofSize.z/2),
  //    positioned at (0, baseSize.y + roofSize.y/2, 0) with a 45° rotation about Y.
  const houseMass = 100000; // Use a high mass so the house won't be pushed
  const houseBody = new CANNON.Body({
    mass: houseMass,
    material: groundMaterial,
    linearDamping: 0.01,
    angularDamping: 0.01,
    fixedRotation: true
  });

  // Base shape
  const baseHalf = new CANNON.Vec3(baseSize.x / 2, baseSize.y / 2, baseSize.z / 2);
  const baseShape = new CANNON.Box(baseHalf);
  // Position the base shape so its center is at (0, baseSize.y/2, 0)
  houseBody.addShape(baseShape, new CANNON.Vec3(0, baseSize.y / 2, 0));

  // Roof shape
  const roofHalf = new CANNON.Vec3(roofSize.x / 2, roofSize.y / 2, roofSize.z / 2);
  const roofShape = new CANNON.Box(roofHalf);
  // Define a quaternion for a 45° rotation around Y
  const roofQuat = new CANNON.Quaternion();
  roofQuat.setFromEuler(0, Math.PI / 4, 0);
  // Position roof shape so its center is at (0, baseSize.y + roofSize.y/2, 0)
  houseBody.addShape(roofShape, new CANNON.Vec3(0, baseSize.y + roofSize.y / 2, 0), roofQuat);

  // Position the compound body so that the bottom of the house is at position.y
  // The compound shape extends from y=0 to y=(baseSize.y + roofSize.y)
  houseBody.position.set(position.x, position.y, position.z);
  physicsWorld.addBody(houseBody);

  return { group: houseGroup, body: houseBody };
}

/**
 * Creates a road as a narrow plane connecting two points.
 */
export function createRoad(scene, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const roadGeo = new THREE.PlaneGeometry(2, length);
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set((start.x + end.x) / 2, 0.05, (start.z + end.z) / 2);
  road.rotation.z = Math.atan2(dz, dx);
  scene.add(road);
}

/**
 * Creates a neighborhood in a grid layout:
 * Houses in a grid, roads, and some trees scattered around.
 */
export function createSceneryExtended(scene, physicsWorld, groundMaterial, getHeight, terrainSize) {
  const gridRows = 4;
  const gridCols = 4;
  const cellSize = terrainSize / gridCols;
  const halfTerrain = terrainSize / 2;

  // Place houses in a grid.
  for (let i = 0; i < gridRows; i++) {
    for (let j = 0; j < gridCols; j++) {
      // Compute center of each cell.
      const centerX = -halfTerrain + cellSize * j + cellSize / 2;
      const centerZ = -halfTerrain + cellSize * i + cellSize / 2;

      // Apply a small random offset.
      const offsetX = (Math.random() - 0.5) * cellSize * 0.3;
      const offsetZ = (Math.random() - 0.5) * cellSize * 0.3;
      const posX = centerX + offsetX;
      const posZ = centerZ + offsetZ;

      // Terrain height.
      const posY = getHeight(posX, posZ);

      // Create a house.
      createHouse(scene, physicsWorld, groundMaterial, new THREE.Vector3(posX, posY, posZ));
    }
  }

  // Create horizontal roads.
  for (let i = 0; i <= gridRows; i++) {
    const z = -halfTerrain + i * cellSize;
    createRoad(
      scene,
      new THREE.Vector3(-halfTerrain, getHeight(-halfTerrain, z), z),
      new THREE.Vector3(halfTerrain, getHeight(halfTerrain, z), z)
    );
  }

  // Create vertical roads.
  for (let j = 0; j <= gridCols; j++) {
    const x = -halfTerrain + j * cellSize;
    createRoad(
      scene,
      new THREE.Vector3(x, getHeight(x, -halfTerrain), -halfTerrain),
      new THREE.Vector3(x, getHeight(x, halfTerrain), halfTerrain)
    );
  }

  // Scatter a few trees.
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * terrainSize;
    const z = (Math.random() - 0.5) * terrainSize;
    const posY = getHeight(x, z);
    createTree(scene, physicsWorld, groundMaterial, new THREE.Vector3(x, posY, z));
  }
}
