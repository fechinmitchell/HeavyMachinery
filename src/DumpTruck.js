import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class DumpTruck {
  constructor(scene, physicsWorld, groundMaterial) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.groundMaterial = groundMaterial;
    this.createModel();
    this.createPhysics();

    // Use arrow keys for movement.
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Tipper control keys.
    this.tipperKeys = {
      b: false,
      n: false
    };

    // Movement parameters.
    this.forwardVelocity = 0;
    this.maxVelocity = 8;
    this.acceleration = 0.8;
    
    // Rotation parameters.
    this.isRotating = false;
    this.angularVelocityDecay = 0.8;

    // Listen for movement and tipper keys.
    window.addEventListener('keydown', (e) => {
      if (window.activeVehicle !== this) return;
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }
      if (e.key === 'b') {
        this.tipperKeys.b = true;
      }
      if (e.key === 'n') {
        this.tipperKeys.n = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (window.activeVehicle !== this) return;
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
      if (e.key === 'b') {
        this.tipperKeys.b = false;
      }
      if (e.key === 'n') {
        this.tipperKeys.n = false;
      }
    });
  }

  createModel() {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    // Tipper material in yellow.
    const tipperMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });

    // Create tracks.
    const trackGeometry = new THREE.BoxGeometry(0.6, 0.5, 4.4);
    this.leftTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    this.rightTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    this.leftTrackMesh.position.set(-0.9, 0.25, 0);
    this.rightTrackMesh.position.set(0.9, 0.25, 0);

    // Create wheels.
    this.baseGroup = new THREE.Group();
    const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
    for (let i = -1.8; i <= 1.8; i += 0.9) {
      const leftWheel = new THREE.Mesh(wheelGeometry, trackMaterial);
      const rightWheel = new THREE.Mesh(wheelGeometry, trackMaterial);
      leftWheel.position.set(-0.9, 0.25, i);
      rightWheel.position.set(0.9, 0.25, i);
      leftWheel.rotation.z = Math.PI / 2;
      rightWheel.rotation.z = Math.PI / 2;
      this.baseGroup.add(leftWheel, rightWheel);
    }

    // Base chassis.
    this.baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMaterial);
    this.baseMesh.position.set(0, 0.55, 0);
    this.baseGroup.add(this.leftTrackMesh, this.rightTrackMesh, this.baseMesh);

    // Create tipper group.
    this.tipperGroup = new THREE.Group();
    // For a 3.8-deep chassis, back face is at z = 1.9; raise tipper to y = 0.85.
    this.tipperGroup.position.set(0, 0.85, 1.9);

    // Create tipper model.
    this.tipperModel = new THREE.Group();
    const bedWidth = 2.2, bedDepth = 3.0, bedThickness = 0.2;
    const sideWallThickness = 0.1, sideWallHeight = 0.5;
    const frontWallThickness = 0.1, frontWallHeight = 0.3;

    const bedGeometry = new THREE.BoxGeometry(bedWidth, bedThickness, bedDepth);
    bedGeometry.translate(0, 0, -bedDepth / 2);
    const bedMesh = new THREE.Mesh(bedGeometry, tipperMaterial);

    const leftWallGeometry = new THREE.BoxGeometry(sideWallThickness, sideWallHeight, bedDepth);
    const leftWallMesh = new THREE.Mesh(leftWallGeometry, tipperMaterial);
    leftWallMesh.position.set(-bedWidth/2 + sideWallThickness/2, bedThickness/2 + sideWallHeight/2, -bedDepth/2);

    const rightWallGeometry = new THREE.BoxGeometry(sideWallThickness, sideWallHeight, bedDepth);
    const rightWallMesh = new THREE.Mesh(rightWallGeometry, tipperMaterial);
    rightWallMesh.position.set(bedWidth/2 - sideWallThickness/2, bedThickness/2 + sideWallHeight/2, -bedDepth/2);

    const frontWallGeometry = new THREE.BoxGeometry(bedWidth, frontWallHeight, frontWallThickness);
    const frontWallMesh = new THREE.Mesh(frontWallGeometry, tipperMaterial);
    frontWallMesh.position.set(0, bedThickness/2 + frontWallHeight/2, -bedDepth + frontWallThickness/2);

    this.tipperModel.add(bedMesh, leftWallMesh, rightWallMesh, frontWallMesh);
    this.tipperGroup.add(this.tipperModel);
    this.baseGroup.add(this.tipperGroup);

    this.scene.add(this.baseGroup);
  }

  createPhysics() {
    const truckMaterial = new CANNON.Material('dumpTruck');
    const contactMaterial = new CANNON.ContactMaterial(
      this.groundMaterial,
      truckMaterial,
      { friction: 20, restitution: 0.1 }
    );
    this.physicsWorld.addContactMaterial(contactMaterial);

    this.baseBody = new CANNON.Body({ mass: 600000, material: truckMaterial });
    this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(0.9, 0.35, 1.9)));
    // Do not set the position here – we set it in index.js.
    this.baseBody.linearDamping = 0.99;
    this.baseBody.angularDamping = 0.99;
    this.physicsWorld.addBody(this.baseBody);
  }

  update() {
    if (window.activeVehicle !== this) return;

    this.isRotating = this.keys['ArrowLeft'] || this.keys['ArrowRight'];
    const damping = 0.95;
    if (this.keys['ArrowUp']) {
      this.forwardVelocity = Math.min(this.forwardVelocity + this.acceleration, this.maxVelocity);
    } else if (this.keys['ArrowDown']) {
      this.forwardVelocity = Math.max(this.forwardVelocity - this.acceleration, -this.maxVelocity);
    } else {
      this.forwardVelocity *= damping;
      if (Math.abs(this.forwardVelocity) < 0.1) {
        this.forwardVelocity = 0;
      }
    }
    if (!this.isRotating) {
      this.baseBody.angularVelocity.y *= this.angularVelocityDecay;
      if (Math.abs(this.baseBody.angularVelocity.y) < 0.05) {
        this.baseBody.angularVelocity.y = 0;
      }
    }
    if (this.forwardVelocity !== 0) {
      const forward = new CANNON.Vec3(0, 0, -1);
      const forwardWorld = this.baseBody.quaternion.vmult(forward);
      const velocityVector = forwardWorld.scale(this.forwardVelocity);
      this.baseBody.velocity.x = velocityVector.x;
      this.baseBody.velocity.z = velocityVector.z;
    } else {
      this.baseBody.velocity.x = 0;
      this.baseBody.velocity.z = 0;
    }
    const turnSpeed = 1.5;
    if (this.keys['ArrowLeft']) {
      this.baseBody.angularVelocity.y = turnSpeed;
    } else if (this.keys['ArrowRight']) {
      this.baseBody.angularVelocity.y = -turnSpeed;
    }
    this.baseBody.velocity.y = 0;
    this.baseBody.angularVelocity.x = Math.max(Math.min(this.baseBody.angularVelocity.x, 0.3), -0.3);

    // Tipper controls.
    const tipSpeed = 0.02;
    if (this.tipperKeys.b) {
      this.tipperGroup.rotation.x = Math.min(this.tipperGroup.rotation.x + tipSpeed, Math.PI / 6);
    }
    if (this.tipperKeys.n) {
      this.tipperGroup.rotation.x = Math.max(this.tipperGroup.rotation.x - tipSpeed, 0);
    }

    this.baseGroup.position.copy(this.baseBody.position);
    this.baseGroup.quaternion.copy(this.baseBody.quaternion);
  }
}
