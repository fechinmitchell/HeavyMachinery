import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class DumpTruck {
  constructor(scene, physicsWorld, groundMaterial) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.groundMaterial = groundMaterial;
    this.createModel();
    this.createPhysics();

    // Use arrow keys for dump truck control.
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Movement parameters.
    this.forwardVelocity = 0;
    this.maxVelocity = 8;
    this.acceleration = 0.8;

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  createModel() {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

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

    // Base chassis (truck cab and frame).
    this.baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMaterial);
    this.baseMesh.position.set(0, 0.55, 0);
    this.baseGroup.add(this.leftTrackMesh, this.rightTrackMesh, this.baseMesh);

    this.scene.add(this.baseGroup);
  }

  createPhysics() {
    const truckMaterial = new CANNON.Material('dumpTruck');
    const contactMaterial = new CANNON.ContactMaterial(this.groundMaterial, truckMaterial, {
      friction: 20,
      restitution: 0.1
    });
    this.physicsWorld.addContactMaterial(contactMaterial);

    // Base physics body.
    this.baseBody = new CANNON.Body({ mass: 30000, material: truckMaterial });
    this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(1.0, 0.25, 2.2)));
    this.baseBody.position.set(0, 0.25, 0);
    this.baseBody.linearDamping = 0.99;
    this.baseBody.angularDamping = 0.99;
    this.physicsWorld.addBody(this.baseBody);
  }

  onKeyDown(event) {
    if (window.activeVehicle !== this) return;
    if (this.keys.hasOwnProperty(event.key)) {
      this.keys[event.key] = true;
    }
  }

  onKeyUp(event) {
    if (window.activeVehicle !== this) return;
    if (this.keys.hasOwnProperty(event.key)) {
      this.keys[event.key] = false;
    }
  }

  update() {
    // If no arrow keys are pressed, reset velocities.
    if (
      !this.keys['ArrowUp'] &&
      !this.keys['ArrowDown'] &&
      !this.keys['ArrowLeft'] &&
      !this.keys['ArrowRight']
    ) {
      this.forwardVelocity = 0;
      this.baseBody.velocity.x = 0;
      this.baseBody.velocity.z = 0;
      this.baseBody.angularVelocity.y = 0;
    }

    const forceMagnitude = 350000;
    const turnSpeed = 2;
    const damping = 0.95;
    const forward = new CANNON.Vec3(0, 0, -1);
    const forwardWorld = this.baseBody.quaternion.vmult(forward);

    if (this.keys['ArrowUp']) {
      this.forwardVelocity = Math.min(this.forwardVelocity + this.acceleration, this.maxVelocity);
    } else if (this.keys['ArrowDown']) {
      this.forwardVelocity = Math.max(this.forwardVelocity - this.acceleration, -this.maxVelocity);
    } else {
      this.forwardVelocity *= damping;
    }

    let leftTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);
    let rightTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);

    if (this.keys['ArrowLeft']) {
      leftTrackForce -= forceMagnitude * 0.4;
      rightTrackForce += forceMagnitude * 0.4;
      this.baseBody.angularVelocity.y = turnSpeed;
    }
    if (this.keys['ArrowRight']) {
      leftTrackForce += forceMagnitude * 0.4;
      rightTrackForce -= forceMagnitude * 0.4;
      this.baseBody.angularVelocity.y = -turnSpeed;
    }

    const leftForce = forwardWorld.scale(leftTrackForce);
    const rightForce = forwardWorld.scale(rightTrackForce);
    const leftOffset = this.baseBody.quaternion.vmult(new CANNON.Vec3(-0.9, 0, 0));
    const rightOffset = this.baseBody.quaternion.vmult(new CANNON.Vec3(0.9, 0, 0));

    this.baseBody.applyForce(leftForce, this.baseBody.position.vadd(leftOffset));
    this.baseBody.applyForce(rightForce, this.baseBody.position.vadd(rightOffset));

    const velocityMagnitude = Math.sqrt(
      this.baseBody.velocity.x ** 2 + this.baseBody.velocity.z ** 2
    );
    if (velocityMagnitude > this.maxVelocity) {
      const scale = this.maxVelocity / velocityMagnitude;
      this.baseBody.velocity.x *= scale;
      this.baseBody.velocity.z *= scale;
    }
    this.baseBody.angularVelocity.x = Math.max(
      Math.min(this.baseBody.angularVelocity.x, 0.3),
      -0.3
    );
    this.baseBody.velocity.y = 0;

    // Sync the Three.js group with the Cannon.js body.
    this.baseGroup.position.copy(this.baseBody.position);
    this.baseGroup.quaternion.copy(this.baseBody.quaternion);
  }
}
