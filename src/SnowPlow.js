import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class SnowPlow {
  constructor(scene, physicsWorld, groundMaterial) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.groundMaterial = groundMaterial;
    this.createModel();
    this.createPhysics();

    // Use the same arrow keys for movement.
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Plow control keys.
    // "Z" rotates the blade up, "X" rotates the blade down.
    // "V" lifts the entire plow assembly, "C" lowers it.
    this.plowKeys = {
      z: false,
      x: false,
      liftUp: false,
      liftDown: false
    };

    // Movement parameters.
    this.forwardVelocity = 0;
    this.maxVelocity = 8;
    this.acceleration = 0.8;
    
    // Turning parameters.
    this.isRotating = false;
    this.angularVelocityDecay = 0.8;

    // Listen for keys.
    window.addEventListener('keydown', (e) => {
      if (window.activeVehicle !== this) return;
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
      }
      if (e.key.toLowerCase() === 'z') {
        this.plowKeys.z = true;
      }
      if (e.key.toLowerCase() === 'x') {
        this.plowKeys.x = true;
      }
      if (e.key.toLowerCase() === 'v') {
        this.plowKeys.liftUp = true;
      }
      if (e.key.toLowerCase() === 'c') {
        this.plowKeys.liftDown = true;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (window.activeVehicle !== this) return;
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
      if (e.key.toLowerCase() === 'z') {
        this.plowKeys.z = false;
      }
      if (e.key.toLowerCase() === 'x') {
        this.plowKeys.x = false;
      }
      if (e.key.toLowerCase() === 'v') {
        this.plowKeys.liftUp = false;
      }
      if (e.key.toLowerCase() === 'c') {
        this.plowKeys.liftDown = false;
      }
    });
  }

  createModel() {
    // Materials.
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    // Make the plow material double-sided.
    const plowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      side: THREE.DoubleSide
    });

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

    // ----- Create the Plow Assembly -----
    // Attach the plow assembly flush with the truck's front.
    // Start with a Y value that can later be lowered.
    this.plowAssembly = new THREE.Group();
    // Initially positioned at (0, 0.75, -1.9) relative to the truck base.
    this.plowAssembly.position.set(0, 0.75, -1.9);

    // Create a curved, skinny plow arm.
    // Extend the arm further by adjusting the last point.
    const armCurvePoints = [
      new THREE.Vector3(0, 0, 0),            // mounting pivot at truck front
      new THREE.Vector3(0, -0.1, -0.5),
      new THREE.Vector3(0, -0.1, -1.0),
      new THREE.Vector3(0, 0, -1.8)            // extended end of arm
    ];
    const armCurve = new THREE.CatmullRomCurve3(armCurvePoints);
    const armGeometry = new THREE.TubeGeometry(armCurve, 20, 0.03, 8, false);
    const armMesh = new THREE.Mesh(armGeometry, plowMaterial);
    this.plowAssembly.add(armMesh);

    // Create the plow blade group.
    this.plowBladeGroup = new THREE.Group();
    // Attach it at the end of the arm.
    this.plowBladeGroup.position.copy(armCurvePoints[armCurvePoints.length - 1]);

    // Define the new blade dimensions to be wider and longer.
    this.bladeWidth = 2.5;  // increased width
    this.bladeHeight = 0.1;
    this.bladeDepth = 2.0;  // increased depth so it can reach the ground and move blocks

    const bladeGeometry = new THREE.BoxGeometry(this.bladeWidth, this.bladeHeight, this.bladeDepth);
    // Translate so the pivot is at the top-back edge.
    bladeGeometry.translate(0, -this.bladeHeight / 2, this.bladeDepth / 2);
    const bladeMesh = new THREE.Mesh(bladeGeometry, plowMaterial);
    this.plowBladeGroup.add(bladeMesh);

    // Add the blade group to the plow assembly.
    this.plowAssembly.add(this.plowBladeGroup);

    // Add the plow assembly to the truck's base.
    this.baseGroup.add(this.plowAssembly);
    // ----- End Plow Assembly Creation -----

    this.scene.add(this.baseGroup);
  }

  createPhysics() {
    const truckMaterial = new CANNON.Material('snowPlow');
    const contactMaterial = new CANNON.ContactMaterial(
      this.groundMaterial,
      truckMaterial,
      { friction: 20, restitution: 0.1 }
    );
    this.physicsWorld.addContactMaterial(contactMaterial);

    // Create the physics body for the truck chassis.
    this.baseBody = new CANNON.Body({ mass: 200000, material: truckMaterial });
    this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(0.9, 0.35, 1.9)));
    this.baseBody.position.set(0, 0.55, 0);
    this.baseBody.linearDamping = 0.99;
    this.baseBody.angularDamping = 0.99;
    this.physicsWorld.addBody(this.baseBody);

    // ---- Create a Physics Body for the Plow Blade ----
    // We create a separate, kinematic physics body for the blade,
    // so that it can interact with blocks.
    const halfExtents = new CANNON.Vec3(this.bladeWidth / 2, this.bladeHeight / 2, this.bladeDepth / 2);
    this.plowBladeShape = new CANNON.Box(halfExtents);
    this.plowBladeBody = new CANNON.Body({ mass: 0 }); // kinematic
    this.plowBladeBody.addShape(this.plowBladeShape);
    // Mark it as kinematic.
    this.plowBladeBody.type = CANNON.Body.KINEMATIC;
    this.plowBladeBody.collisionResponse = true;
    this.physicsWorld.addBody(this.plowBladeBody);
    // ---- End Plow Blade Physics Body Creation ----
  }

  update() {
    // Only update if this vehicle is active.
    if (window.activeVehicle !== this) return;

    // --- Movement (arrow keys) ---
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

    this.isRotating = this.keys['ArrowLeft'] || this.keys['ArrowRight'];
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
    this.baseBody.angularVelocity.x = Math.max(
      Math.min(this.baseBody.angularVelocity.x, 0.3),
      -0.3
    );

    // --- Handle Plow Controls ---
    // 1. Blade Rotation: Rotate the blade (relative to the arm) between 0 (fully lowered)
    // and -Math.PI/6 (raised).
    const plowSpeed = 0.02;
    if (this.plowKeys.z) {
      this.plowBladeGroup.rotation.x = Math.max(this.plowBladeGroup.rotation.x - plowSpeed, -Math.PI / 6);
    }
    if (this.plowKeys.x) {
      this.plowBladeGroup.rotation.x = Math.min(this.plowBladeGroup.rotation.x + plowSpeed, 0);
    }

    // 2. Full Plow Lift: Adjust the vertical position of the entire plow assembly.
    // Allow movement between 0.1 (very low) and 1.5 (raised).
    const liftSpeed = 0.01;
    if (this.plowKeys.liftUp) {
      this.plowAssembly.position.y = Math.min(this.plowAssembly.position.y + liftSpeed, 1.5);
    }
    if (this.plowKeys.liftDown) {
      this.plowAssembly.position.y = Math.max(this.plowAssembly.position.y - liftSpeed, 0.1);
    }
    // --- End Plow Controls ---

    // Sync the truck's visual model with its physics body.
    this.baseGroup.position.copy(this.baseBody.position);
    this.baseGroup.quaternion.copy(this.baseBody.quaternion);

    // --- Update the Physics Body for the Plow Blade ---
    // We need to update the kinematic blade body to match the world transform
    // of the visual plow blade (i.e. the plowBladeGroup).
    this.plowBladeGroup.updateMatrixWorld();
    let bladeWorldPos = new THREE.Vector3();
    this.plowBladeGroup.getWorldPosition(bladeWorldPos);
    let bladeWorldQuat = new THREE.Quaternion();
    this.plowBladeGroup.getWorldQuaternion(bladeWorldQuat);
    // Copy these to the Cannon body.
    this.plowBladeBody.position.set(bladeWorldPos.x, bladeWorldPos.y, bladeWorldPos.z);
    this.plowBladeBody.quaternion.set(bladeWorldQuat.x, bladeWorldQuat.y, bladeWorldQuat.z, bladeWorldQuat.w);
    // --- End Blade Physics Update ---
  }
}
