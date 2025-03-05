// src/Excavator.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Excavator {
    constructor(scene, physicsWorld, groundMaterial) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.groundMaterial = groundMaterial;
        this.cubes = [];
        this.createModel();
        this.createPhysics();

        this.keys = {
            w: false, s: false, a: false, d: false,
            q: false, e: false,
            r: false, f: false,
            t: false, g: false,
            y: false, h: false,
            space: false
        };

        this.forwardVelocity = 0;
        this.maxVelocity = 8; // Reduced max velocity for more control
        this.acceleration = 0.8; // Slightly higher acceleration for responsiveness

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    createModel() {
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
        const bucketMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

        const trackGeometry = new THREE.BoxGeometry(0.6, 0.5, 4.4);
        this.leftTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.rightTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.leftTrackMesh.position.set(-0.9, 0.25, 0);
        this.rightTrackMesh.position.set(0.9, 0.25, 0);

        const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
        for (let i = -1.8; i <= 1.8; i += 0.9) {
            const leftWheel = new THREE.Mesh(wheelGeometry, trackMaterial);
            const rightWheel = new THREE.Mesh(wheelGeometry, trackMaterial);
            leftWheel.position.set(-0.9, 0.25, i);
            rightWheel.position.set(0.9, 0.25, i);
            leftWheel.rotation.z = Math.PI / 2;
            rightWheel.rotation.z = Math.PI / 2;
            this.baseGroup = this.baseGroup || new THREE.Group();
            this.baseGroup.add(leftWheel, rightWheel);
        }

        this.baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMaterial);
        this.baseMesh.position.set(0, 0.55, 0);

        this.turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1.4, 16), bodyMaterial);
        this.turretMesh.position.set(0, 1.2, 0);

        const cabinGeometry = new THREE.BoxGeometry(0.8, 0.9, 0.8);
        this.cabinMesh = new THREE.Mesh(cabinGeometry, glassMaterial);
        this.cabinMesh.position.set(0, 1.65, -0.7);
        this.cabinMesh.rotation.x = -0.2;

        this.counterweightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), bodyMaterial);
        this.counterweightMesh.position.set(0, 1.35, 1);

        this.boomMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.35), bodyMaterial);
        this.boomMesh.position.set(0, 2.5, 0);

        this.stickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), bodyMaterial);
        this.stickMesh.position.set(0, 4.5, 0);

        const bucketGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -0.5, 0, -0.4,  0.5, 0, -0.4,  0.5, 0.8, -0.4,  -0.5, 0.8, -0.4,
            -0.5, 0, 0.2,   0.5, 0, 0.2,   0.5, 0.4, 0.2,   -0.5, 0.4, 0.2
        ]);
        const indices = [
            0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4,
            0, 4, 7, 7, 3, 0, 1, 5, 6, 6, 2, 1,
            0, 1, 5, 5, 4, 0, 3, 2, 6, 6, 7, 3
        ];
        bucketGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        bucketGeometry.setIndex(indices);
        bucketGeometry.computeVertexNormals();
        this.bucketMesh = new THREE.Mesh(bucketGeometry, bucketMaterial);
        this.bucketMesh.position.set(0, 6, 0);

        this.baseGroup = this.baseGroup || new THREE.Group();
        this.baseGroup.add(this.leftTrackMesh, this.rightTrackMesh, this.baseMesh);
        this.scene.add(this.baseGroup);

        this.turretGroup = new THREE.Group();
        this.turretGroup.add(this.turretMesh, this.cabinMesh, this.counterweightMesh);
        this.scene.add(this.turretGroup);

        this.scene.add(this.boomMesh);
        this.scene.add(this.stickMesh);
        this.scene.add(this.bucketMesh);
    }

    createPhysics() {
        const excavatorMaterial = new CANNON.Material('excavator');
        const contactMaterial = new CANNON.ContactMaterial(this.groundMaterial, excavatorMaterial, {
            friction: 20,    // Increased friction for better grip
            restitution: 0.1 // Lower restitution for less bounce
        });
        this.physicsWorld.addContactMaterial(contactMaterial);

        this.baseBody = new CANNON.Body({ mass: 30000 });
        this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(1.0, 0.25, 2.2)));
        this.baseBody.position.set(0, 0.25, 0);
        this.baseBody.material = excavatorMaterial;
        this.baseBody.linearDamping = 0.9;  // Increased damping to reduce sliding
        this.baseBody.angularDamping = 0.9; // Increased to stop rotation faster
        this.physicsWorld.addBody(this.baseBody);

        this.turretBody = new CANNON.Body({ mass: 300 });
        this.turretBody.addShape(new CANNON.Cylinder(0.8, 1, 1.4, 16));
        this.turretBody.position.set(0, 1.2, 0);
        this.turretBody.material = excavatorMaterial;
        this.physicsWorld.addBody(this.turretBody);

        this.turretConstraint = new CANNON.HingeConstraint(this.baseBody, this.turretBody, {
            pivotA: new CANNON.Vec3(0, 0.95, 0),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 1, 0),
            axisB: new CANNON.Vec3(0, 1, 0),
            maxForce: 1e8
        });
        this.turretConstraint.enableMotor();
        this.physicsWorld.addConstraint(this.turretConstraint);

        this.boomBody = new CANNON.Body({ mass: 150 });
        this.boomBody.addShape(new CANNON.Box(new CANNON.Vec3(0.175, 1.5, 0.175)));
        this.boomBody.position.set(0, 3.2, 0);
        this.boomBody.material = excavatorMaterial;
        this.physicsWorld.addBody(this.boomBody);
        this.boomBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / -2);

        this.boomConstraint = new CANNON.HingeConstraint(this.turretBody, this.boomBody, {
            pivotA: new CANNON.Vec3(0, .7, -.25),
            pivotB: new CANNON.Vec3(0, -1.5, 0),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e2000
        });
        this.boomConstraint.enableMotor();
        this.physicsWorld.addConstraint(this.boomConstraint);

        this.stickBody = new CANNON.Body({ mass: 100 });
        this.stickBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 1.5, 0.15)));
        this.stickBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / -6);
        this.stickBody.position.set(0, 5.45, 0);
        this.stickBody.material = excavatorMaterial;
        this.physicsWorld.addBody(this.stickBody);

        this.stickConstraint = new CANNON.HingeConstraint(this.boomBody, this.stickBody, {
            pivotA: new CANNON.Vec3(0, 1.5, 0),
            pivotB: new CANNON.Vec3(0, -1.5, 0),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e2000
        });
        this.stickConstraint.enableMotor();
        this.physicsWorld.addConstraint(this.stickConstraint);

        this.bucketBody = new CANNON.Body({ mass: 50 });
        this.bucketBody.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.3)));
        this.bucketBody.position.set(0, 6.75, 0);
        this.bucketBody.material = excavatorMaterial;
        this.physicsWorld.addBody(this.bucketBody);

        this.bucketConstraint = new CANNON.HingeConstraint(this.stickBody, this.bucketBody, {
            pivotA: new CANNON.Vec3(0, 1.4, 0),
            pivotB: new CANNON.Vec3(0, .3, -.30),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e10
        });
        this.bucketConstraint.enableMotor();
        this.physicsWorld.addConstraint(this.bucketConstraint);
    }

    setCubes(cubes) {
        this.cubes = cubes;
    }

    onKeyDown(event) {
        switch (event.key) {
            case 'w': this.keys.w = true; break;
            case 's': this.keys.s = true; break;
            case 'a': this.keys.a = true; break;
            case 'd': this.keys.d = true; break;
            case 'q': this.keys.q = true; break;
            case 'e': this.keys.e = true; break;
            case 'r': this.keys.r = true; break;
            case 'f': this.keys.f = true; break;
            case 't': this.keys.t = true; break;
            case 'g': this.keys.g = true; break;
            case 'y': this.keys.y = true; break;
            case 'h': this.keys.h = true; break;
            case ' ': this.keys.space = true; break;
            default: break;
        }
    }

    onKeyUp(event) {
        switch (event.key) {
            case 'w': this.keys.w = false; break;
            case 's': this.keys.s = false; break;
            case 'a': this.keys.a = false; break;
            case 'd': this.keys.d = false; break;
            case 'q': this.keys.q = false; break;
            case 'e': this.keys.e = false; break;
            case 'r': this.keys.r = false; break;
            case 'f': this.keys.f = false; break;
            case 't': this.keys.t = false; break;
            case 'g': this.keys.g = false; break;
            case 'y': this.keys.y = false; break;
            case 'h': this.keys.h = false; break;
            case ' ': this.keys.space = false; break;
            default: break;
        }
    }

    update() {
        const forceMagnitude = 350000; // Slightly increased force for better push against friction
        const turnSpeed = 2;    // Reduced turn speed for more stability
        const damping = 0.95;   // Higher damping for quicker stopping
        const armSpeed = 3;

        const forward = new CANNON.Vec3(0, 0, -1);
        const forwardWorld = this.baseBody.quaternion.vmult(forward);

        // Smooth acceleration
        if (this.keys.w) {
            this.forwardVelocity = Math.min(this.forwardVelocity + this.acceleration, this.maxVelocity);
        } else if (this.keys.s) {
            this.forwardVelocity = Math.max(this.forwardVelocity - this.acceleration, -this.maxVelocity);
        } else {
            this.forwardVelocity *= damping;
        }

        let leftTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);
        let rightTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);

        // Differential steering
        if (this.keys.a) {
            leftTrackForce -= forceMagnitude * 0.4;  // Reduced differential force for stability
            rightTrackForce += forceMagnitude * 0.4;
            this.baseBody.angularVelocity.y = turnSpeed;
        }
        if (this.keys.d) {
            leftTrackForce += forceMagnitude * 0.4;
            rightTrackForce -= forceMagnitude * 0.4;
            this.baseBody.angularVelocity.y = -turnSpeed;
        }

        // Apply forces at track positions
        const leftForce = forwardWorld.scale(leftTrackForce);
        const rightForce = forwardWorld.scale(rightTrackForce);
        const leftOffset = this.baseBody.quaternion.vmult(new CANNON.Vec3(-0.9, 0, 0));
        const rightOffset = this.baseBody.quaternion.vmult(new CANNON.Vec3(0.9, 0, 0));

        this.baseBody.applyForce(leftForce, this.baseBody.position.vadd(leftOffset));
        this.baseBody.applyForce(rightForce, this.baseBody.position.vadd(rightOffset));

        // Stronger damping when no input
        if (!this.keys.w && !this.keys.s && !this.keys.a && !this.keys.d) {
            this.baseBody.velocity.x *= damping;
            this.baseBody.velocity.z *= damping;
            this.baseBody.angularVelocity.y *= damping;
        }

        // Limit velocity to prevent excessive sliding
        const velocityMagnitude = Math.sqrt(
            this.baseBody.velocity.x ** 2 + this.baseBody.velocity.z ** 2
        );
        if (velocityMagnitude > this.maxVelocity) {
            const scale = this.maxVelocity / velocityMagnitude;
            this.baseBody.velocity.x *= scale;
            this.baseBody.velocity.z *= scale;
        }

        // Stability controls (tighter limits)
        this.baseBody.angularVelocity.x = Math.max(Math.min(this.baseBody.angularVelocity.x, 0.3), -0.3); // Reduced pitch limit
        this.baseBody.velocity.y = Math.max(this.baseBody.velocity.y, -0.05); // Tighter vertical limit

        // Wheel rotation
        this.baseGroup.children.forEach(child => {
            if (child.geometry instanceof THREE.CylinderGeometry) {
                const isLeftWheel = child.position.x < 0;
                const trackSpeed = isLeftWheel ? leftTrackForce : rightTrackForce;
                child.rotation.x += (trackSpeed / forceMagnitude) * 0.1;
            }
        });

        // Turret, boom, stick, bucket controls (unchanged)
        if (this.keys.q) this.turretConstraint.setMotorSpeed(-armSpeed);
        else if (this.keys.e) this.turretConstraint.setMotorSpeed(armSpeed);
        else this.turretConstraint.setMotorSpeed(0);

        if (this.keys.r) this.boomConstraint.setMotorSpeed(armSpeed);
        else if (this.keys.f) this.boomConstraint.setMotorSpeed(-armSpeed);
        else this.boomConstraint.setMotorSpeed(0);

        if (this.keys.t) this.stickConstraint.setMotorSpeed(armSpeed);
        else if (this.keys.g) this.stickConstraint.setMotorSpeed(-armSpeed);
        else this.stickConstraint.setMotorSpeed(0);

        if (this.keys.y) this.bucketConstraint.setMotorSpeed(armSpeed);
        else if (this.keys.h) this.bucketConstraint.setMotorSpeed(-armSpeed);
        else this.bucketConstraint.setMotorSpeed(0);

        if (this.keys.space) this.dig();

        // Sync visuals with physics
        this.baseGroup.position.copy(this.baseBody.position);
        this.baseGroup.quaternion.copy(this.baseBody.quaternion);

        this.turretGroup.position.copy(this.turretBody.position);
        this.turretGroup.quaternion.copy(this.turretBody.quaternion);

        this.boomMesh.position.copy(this.boomBody.position);
        this.boomMesh.quaternion.copy(this.boomBody.quaternion);

        this.stickMesh.position.copy(this.stickBody.position);
        this.stickMesh.quaternion.copy(this.stickBody.quaternion);

        this.bucketMesh.position.copy(this.bucketBody.position);
        this.bucketMesh.quaternion.copy(this.bucketBody.quaternion);
    }

    dig() {
        const bucketPos = this.bucketBody.position;
        for (let i = this.cubes.length - 1; i >= 0; i--) {
            const cube = this.cubes[i];
            const cubePos = cube.mesh ? cube.mesh.position : cube.body.position;
            const distance = bucketPos.distanceTo(cubePos);

            if (distance < 0.8) {
                if (cube.mesh) this.scene.remove(cube.mesh);
                if (cube.body) this.physicsWorld.removeBody(cube.body);
                this.cubes.splice(i, 1);
                break;
            }
        }
    }
}