import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class SnowPlow {
  constructor(scene, physicsWorld, groundMaterial) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.groundMaterial = groundMaterial;
    
    // Define concaveDepth property.
    this.concaveDepth = 0.2;
    
    this.createModel();
    this.createPhysics();

    // Use arrow keys for truck movement.
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    // Plow control keys.
    // "Z"/"X" rotate the blade; "V"/"C" lift/lower the entire plow assembly.
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
    // Plow material: yellow and double-sided (visual only, for front/back faces).
    const plowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
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
    this.plowAssembly = new THREE.Group();
    // Initially position at (0, 0.75, -1.9) relative to the truck base.
    this.plowAssembly.position.set(0, 0.75, -1.9);

    // Create a curved, skinny plow arm.
    const armCurvePoints = [
      new THREE.Vector3(0, 0, 0),            // mounting pivot at truck front
      new THREE.Vector3(0, -0.1, -0.5),
      new THREE.Vector3(0, -0.1, -1.0),
      new THREE.Vector3(0, 0, -1.8)          // extended end of arm
    ];
    const armCurve = new THREE.CatmullRomCurve3(armCurvePoints);
    const armGeometry = new THREE.TubeGeometry(armCurve, 20, 0.03, 8, false);
    const armMesh = new THREE.Mesh(armGeometry, plowMaterial);
    this.plowAssembly.add(armMesh);

    // Create the plow blade group.
    this.plowBladeGroup = new THREE.Group();
    this.plowBladeGroup.position.copy(armCurvePoints[armCurvePoints.length - 1]);
    // Start the blade at 45° (-Math.PI/4).
    this.plowBladeGroup.rotation.x = -Math.PI / 4;

    // Define blade dimensions.
    this.bladeWidth = 2.5;
    this.bladeHeight = 0.1;
    this.bladeDepth = 2.0;

    // Create a concave blade shape.
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(-this.bladeWidth / 2, 0);
    bladeShape.lineTo(-this.bladeWidth / 2, -this.bladeHeight);
    bladeShape.quadraticCurveTo(
      0,
      -this.bladeHeight - this.concaveDepth,
      this.bladeWidth / 2,
      -this.bladeHeight
    );
    bladeShape.lineTo(this.bladeWidth / 2, 0);
    bladeShape.lineTo(-this.bladeWidth / 2, 0);

    const extrudeSettings = {
      depth: this.bladeDepth,
      bevelEnabled: false
    };
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, extrudeSettings);
    bladeGeometry.computeBoundingBox();
    const bb = bladeGeometry.boundingBox;
    const offsetX = -(bb.max.x + bb.min.x) / 2;
    const offsetY = -bb.max.y;
    const offsetZ = -bb.min.z;
    bladeGeometry.translate(offsetX, offsetY, offsetZ);

    const bladeMesh = new THREE.Mesh(bladeGeometry, plowMaterial);
    this.plowBladeGroup.add(bladeMesh);

    this.plowAssembly.add(this.plowBladeGroup);
    this.baseGroup.add(this.plowAssembly);

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

    // Main body for the snowplow.
    this.baseBody = new CANNON.Body({ mass: 600000, material: truckMaterial });
    this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(0.9, 0.35, 1.9)));
    // Do not set the position here (we’ll set it in updates).
    this.baseBody.linearDamping = 0.99;
    this.baseBody.angularDamping = 0.99;
    this.physicsWorld.addBody(this.baseBody);

    // Plow blade shape (a box approximation).
    const halfExtents = new CANNON.Vec3(
      this.bladeWidth / 2,
      (this.bladeHeight + this.concaveDepth) / 2,
      this.bladeDepth / 2
    );
    this.plowBladeShape = new CANNON.Box(halfExtents);
    this.plowBladeBody = new CANNON.Body({ mass: 0 });
    this.plowBladeBody.addShape(this.plowBladeShape);
    // Kinematic so we can manually set its transform each frame.
    this.plowBladeBody.type = CANNON.Body.KINEMATIC;
    this.plowBladeBody.collisionResponse = true;
    this.physicsWorld.addBody(this.plowBladeBody);
  }

  update() {
    // Always update visual positions from physics.
    this.baseGroup.position.copy(this.baseBody.position);
    this.baseGroup.quaternion.copy(this.baseBody.quaternion);

    // Process input only if active.
    if (window.activeVehicle !== this) return;

    // Forward/back movement handling.
    const damping = 0.95;
    if (this.keys['ArrowUp']) {
      this.forwardVelocity = Math.min(
        this.forwardVelocity + this.acceleration,
        this.maxVelocity
      );
    } else if (this.keys['ArrowDown']) {
      this.forwardVelocity = Math.max(
        this.forwardVelocity - this.acceleration,
        -this.maxVelocity
      );
    } else {
      // Gradually slow down if no forward/back key is pressed.
      this.forwardVelocity *= damping;
      if (Math.abs(this.forwardVelocity) < 0.1) {
        this.forwardVelocity = 0;
      }
    }

    // Turning logic.
    this.isRotating = this.keys['ArrowLeft'] || this.keys['ArrowRight'];
    if (!this.isRotating) {
      this.baseBody.angularVelocity.y *= this.angularVelocityDecay;
      if (Math.abs(this.baseBody.angularVelocity.y) < 0.05) {
        this.baseBody.angularVelocity.y = 0;
      }
    }

    // Apply forward velocity in local forward direction.
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

    // Apply turning angular velocity.
    const turnSpeed = 1.5;
    if (this.keys['ArrowLeft']) {
      this.baseBody.angularVelocity.y = turnSpeed;
    } else if (this.keys['ArrowRight']) {
      this.baseBody.angularVelocity.y = -turnSpeed;
    }

    // Prevent drifting in Y.
    this.baseBody.velocity.y = 0;
    // Limit pitch/roll.
    this.baseBody.angularVelocity.x = Math.max(
      Math.min(this.baseBody.angularVelocity.x, 0.3),
      -0.3
    );

    // Plow blade rotation (Z / X keys).
    const plowSpeed = 0.02;
    if (this.plowKeys.z) {
      this.plowBladeGroup.rotation.x = Math.max(
        this.plowBladeGroup.rotation.x - plowSpeed,
        -Math.PI / 2
      );
    }
    if (this.plowKeys.x) {
      this.plowBladeGroup.rotation.x = Math.min(
        this.plowBladeGroup.rotation.x + plowSpeed,
        -Math.PI / 6
      );
    }

    // Plow assembly lift (V / C keys).
    const liftSpeed = 0.01;
    if (this.plowKeys.liftUp) {
      this.plowAssembly.position.y = Math.min(
        this.plowAssembly.position.y + liftSpeed,
        1.5
      );
    }
    if (this.plowKeys.liftDown) {
      this.plowAssembly.position.y = Math.max(
        this.plowAssembly.position.y - liftSpeed,
        0.1
      );
    }

    // Sync Three.js group to Cannon body again (clean-up).
    this.baseGroup.position.copy(this.baseBody.position);
    this.baseGroup.quaternion.copy(this.baseBody.quaternion);

    // Update the kinematic blade body to match the blade’s world transform.
    this.plowBladeGroup.updateMatrixWorld();
    let bladeWorldPos = new THREE.Vector3();
    this.plowBladeGroup.getWorldPosition(bladeWorldPos);
    let bladeWorldQuat = new THREE.Quaternion();
    this.plowBladeGroup.getWorldQuaternion(bladeWorldQuat);

    this.plowBladeBody.position.set(bladeWorldPos.x, bladeWorldPos.y, bladeWorldPos.z);
    this.plowBladeBody.quaternion.set(
      bladeWorldQuat.x,
      bladeWorldQuat.y,
      bladeWorldQuat.z,
      bladeWorldQuat.w
    );
  }
}
