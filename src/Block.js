import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Block {
  constructor(scene, physicsWorld, startPosition = new THREE.Vector3(0, 10, 0)) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.startPosition = startPosition;
    this.createBlock();
  }

  createBlock() {
    const blockSize = 1.0; // 1x1x1 block like Minecraft
    // Create the Three.js mesh
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const material = new THREE.MeshStandardMaterial({ color: 0xd4a017 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.copy(this.startPosition);
    this.scene.add(this.mesh);

    // Create the Cannon.js body
    const mass = 1;
    const halfSize = blockSize * 0.5;
    const shape = new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, halfSize));
    this.body = new CANNON.Body({ mass: mass });
    this.body.addShape(shape);
    this.body.position.set(
      this.startPosition.x,
      this.startPosition.y,
      this.startPosition.z
    );
    // Optionally add a little damping to reduce jitter
    this.body.linearDamping = 0.01;
    this.body.angularDamping = 0.01;
    this.physicsWorld.addBody(this.body);
  }

  // Call this on each frame to update the mesh position from the physics body
  update() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}
