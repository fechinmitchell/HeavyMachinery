import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Excavator {
    constructor(scene, physicsWorld, groundMaterial) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.groundMaterial = groundMaterial;
        this.cubes = [];
        this.attachedCubes = [];
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

        // For user input movement
        this.forwardVelocity = 0;
        this.maxVelocity = 8;
        this.acceleration = 0.8;

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    createModel() {
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7 });
        const bucketMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

        // Tracks
        const trackGeometry = new THREE.BoxGeometry(0.6, 0.5, 4.4);
        this.leftTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.rightTrackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        this.leftTrackMesh.position.set(-0.9, 0.25, 0);
        this.rightTrackMesh.position.set(0.9, 0.25, 0);

        // Wheels
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

        // Base
        this.baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 3.8), bodyMaterial);
        this.baseMesh.position.set(0, 0.55, 0);

        // Turret
        this.turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1.4, 16), bodyMaterial);
        this.turretMesh.position.set(0, 1.2, 0);

        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(0.8, 0.9, 0.8);
        this.cabinMesh = new THREE.Mesh(cabinGeometry, glassMaterial);
        this.cabinMesh.position.set(0, 1.65, -0.7);
        this.cabinMesh.rotation.x = -0.2;

        // Counterweight
        this.counterweightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), bodyMaterial);
        this.counterweightMesh.position.set(0, 1.35, 1);

        // Boom
        this.boomMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.35), bodyMaterial);
        this.boomMesh.position.set(0, 2.5, 0);
        // Add a stop block on the top face of the boom.
        this.boomStopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.1), bodyMaterial);
        this.boomStopMesh.position.set(0.0, 1.525, 0.2);
        this.boomMesh.add(this.boomStopMesh);

        // Stick
        this.stickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 0.3), bodyMaterial);
        this.stickMesh.position.set(0, 4.5, 0);

        // Bucket
        const bucketGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -0.5, 0, -0.4,   0.5, 0, -0.4,   0.5, 0.8, -0.4,  -0.5, 0.8, -0.4,
            -0.5, 0,  0.2,   0.5, 0,  0.2,   0.5, 0.4,  0.2,  -0.5, 0.4,  0.2
        ]);
        const indices = [
            0, 1, 2, 2, 3, 0,
            4, 5, 6, 6, 7, 4,
            0, 4, 7, 7, 3, 0,
            1, 5, 6, 6, 2, 1,
            3, 2, 6, 6, 7, 3
        ];
        bucketGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        bucketGeometry.setIndex(indices);
        bucketGeometry.computeVertexNormals();
        this.bucketMesh = new THREE.Mesh(bucketGeometry, bucketMaterial);
        this.bucketMesh.position.set(0, 6, 0);

        // Assemble groups
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
            friction: 20,
            restitution: 0.1
        });
        this.physicsWorld.addContactMaterial(contactMaterial);

        // Increase solver iterations for improved constraint stability
        this.physicsWorld.solver.iterations = 20;
        this.physicsWorld.solver.tolerance = 0.001;

        // Base body
        this.baseBody = new CANNON.Body({ mass: 30000, material: excavatorMaterial });
        this.baseBody.addShape(new CANNON.Box(new CANNON.Vec3(1.0, 0.25, 2.2)));
        this.baseBody.position.set(0, 0.25, 0);
        this.baseBody.linearDamping = 0.99;
        this.baseBody.angularDamping = 0.99;
        this.physicsWorld.addBody(this.baseBody);

        // Turret body
        this.turretBody = new CANNON.Body({ mass: 1000, material: excavatorMaterial });
        this.turretBody.addShape(new CANNON.Cylinder(0.8, 1, 1.4, 16));
        this.turretBody.position.set(0, 1.2, 0);
        this.turretBody.linearDamping = 0.99;
        this.turretBody.angularDamping = 0.99;
        this.physicsWorld.addBody(this.turretBody);

        // Turret hinge (Y-axis)
        this.turretConstraint = new CANNON.HingeConstraint(this.baseBody, this.turretBody, {
            pivotA: new CANNON.Vec3(0, 0.95, 0),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 1, 0),
            axisB: new CANNON.Vec3(0, 1, 0),
            maxForce: 1e12,
            collideConnected: true
        });
        this.turretConstraint.enableMotor();
        this.turretConstraint.motorEquation.maxForce = 1e5;
        this.physicsWorld.addConstraint(this.turretConstraint);

        // --- Improved Arm Physics ---

        // Boom body
        this.boomBody = new CANNON.Body({ mass: 50, material: excavatorMaterial });
        this.boomBody.addShape(new CANNON.Box(new CANNON.Vec3(0.175, 1.5, 0.175)));
        this.boomBody.addShape(new CANNON.Box(new CANNON.Vec3(0.35, 0.025, 0.05)), new CANNON.Vec3(0, 1.525, 0));
        this.boomBody.position.set(0, 3.2, 0);
        this.boomBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / -4);
        this.boomBody.linearDamping = 0.1;
        this.boomBody.angularDamping = 0.5;
        this.physicsWorld.addBody(this.boomBody);

        // Boom hinge (X-axis)
        this.boomConstraint = new CANNON.HingeConstraint(this.turretBody, this.boomBody, {
            pivotA: new CANNON.Vec3(0, 0.7, -0.25),
            pivotB: new CANNON.Vec3(0, -1.5, 0),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e12,
            collideConnected: true
        });
        this.boomConstraint.enableMotor();
        this.boomConstraint.motorEquation.maxForce = 1e5;
        this.physicsWorld.addConstraint(this.boomConstraint);
        const stiffness = 1e9, relaxation = 2, timeStep = 1 / 60;
        this.boomConstraint.rotationalEquation1.setSpookParams(stiffness, relaxation, timeStep);
        this.boomConstraint.rotationalEquation2.setSpookParams(stiffness, relaxation, timeStep);

        // Stick body
        this.stickBody = new CANNON.Body({ mass: 30, material: excavatorMaterial });
        this.stickBody.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 1.5, 0.15)));
        this.stickBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / -6);
        this.stickBody.position.set(0, 5.45, 0);
        this.stickBody.linearDamping = 0.1;
        this.stickBody.angularDamping = 0.5;
        this.physicsWorld.addBody(this.stickBody);

        // Stick hinge (X-axis)
        this.stickConstraint = new CANNON.HingeConstraint(this.boomBody, this.stickBody, {
            pivotA: new CANNON.Vec3(0, 1.5, 0),
            pivotB: new CANNON.Vec3(0, -1.5, 0),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e12,
            collideConnected: true
        });
        this.stickConstraint.enableMotor();
        this.stickConstraint.motorEquation.maxForce = 1e5;
        this.physicsWorld.addConstraint(this.stickConstraint);
        this.stickConstraint.rotationalEquation1.setSpookParams(stiffness, relaxation, timeStep);
        this.stickConstraint.rotationalEquation2.setSpookParams(stiffness, relaxation, timeStep);

        // Bucket body
        this.bucketBody = new CANNON.Body({ mass: 10, material: excavatorMaterial });
        const bucketVertices = [
            new CANNON.Vec3(-0.5, 0, -0.4), new CANNON.Vec3(0.5, 0, -0.4),
            new CANNON.Vec3(0.5, 0.8, -0.4), new CANNON.Vec3(-0.5, 0.8, -0.4),
            new CANNON.Vec3(-0.5, 0,  0.2), new CANNON.Vec3(0.5, 0,  0.2),
            new CANNON.Vec3(0.5, 0.4,  0.2), new CANNON.Vec3(-0.5, 0.4,  0.2)
        ];
        const bucketFaces = [
            [0, 1, 2], [2, 3, 0],
            [4, 5, 6], [6, 7, 4],
            [0, 4, 7], [7, 3, 0],
            [1, 5, 6], [6, 2, 1],
            [3, 2, 6], [6, 7, 3]
        ];
        this.bucketBody.addShape(new CANNON.ConvexPolyhedron({
            vertices: bucketVertices,
            faces: bucketFaces
        }));
        this.bucketBody.position.set(0, 6.55, 0);
        this.bucketBody.linearDamping = 0.1;
        this.bucketBody.angularDamping = 0.5;
        this.physicsWorld.addBody(this.bucketBody);

        // Bucket hinge (X-axis)
        this.bucketConstraint = new CANNON.HingeConstraint(this.stickBody, this.bucketBody, {
            pivotA: new CANNON.Vec3(0, 1.8, 0),
            pivotB: new CANNON.Vec3(0, 0.3, -0.30),
            axisA: new CANNON.Vec3(1, 0, 0),
            axisB: new CANNON.Vec3(1, 0, 0),
            maxForce: 1e12,
            collideConnected: true
        });
        this.bucketConstraint.enableMotor();
        this.bucketConstraint.motorEquation.maxForce = 1e5;
        this.physicsWorld.addConstraint(this.bucketConstraint);
        this.bucketConstraint.rotationalEquation1.setSpookParams(stiffness, relaxation, timeStep);
        this.bucketConstraint.rotationalEquation2.setSpookParams(stiffness, relaxation, timeStep);
    }

    // Clamp hinge rotation around the X-axis by comparing the Y axes of the bodies.
    clampHingeAngleAroundX(childBody, parentBody, minAngle, maxAngle) {
        const childUpWorld = childBody.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const parentUpWorld = parentBody.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        let dot = childUpWorld.dot(parentUpWorld);
        dot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(dot);
        const cross = childUpWorld.cross(parentUpWorld);
        const sign = cross.z < 0 ? -1 : 1;
        const signedAngle = angle * sign;
        if (signedAngle < minAngle || signedAngle > maxAngle) {
            childBody.angularVelocity.set(0, 0, 0);
        }
    }

    // Clamp hinge rotation around the Y-axis by comparing the forward vectors.
    clampHingeAngleAroundY(childBody, parentBody, minAngle, maxAngle) {
        const childFwdWorld = childBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        const parentFwdWorld = parentBody.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        let dot = childFwdWorld.dot(parentFwdWorld);
        dot = Math.max(-1, Math.min(1, dot));
        const angle = Math.acos(dot);
        const cross = childFwdWorld.cross(parentFwdWorld);
        const sign = cross.y < 0 ? -1 : 1;
        const signedAngle = angle * sign;
        if (signedAngle < minAngle || signedAngle > maxAngle) {
            childBody.angularVelocity.set(0, 0, 0);
        }
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
        // If no movement keys are pressed, ensure no force or motor is applied.
        if (!this.keys.w && !this.keys.s && !this.keys.a && !this.keys.d) {
            this.forwardVelocity = 0;
            // Reset horizontal velocities:
            this.baseBody.velocity.x = 0;
            this.baseBody.velocity.z = 0;
            // Reset angular velocity around Y:
            this.baseBody.angularVelocity.y = 0;
        }

        const forceMagnitude = 350000;
        const turnSpeed = 2;
        const damping = 0.95;
        const armSpeed = 1.5;

        const forward = new CANNON.Vec3(0, 0, -1);
        const forwardWorld = this.baseBody.quaternion.vmult(forward);

        if (this.keys.w) {
            this.forwardVelocity = Math.min(this.forwardVelocity + this.acceleration, this.maxVelocity);
        } else if (this.keys.s) {
            this.forwardVelocity = Math.max(this.forwardVelocity - this.acceleration, -this.maxVelocity);
        } else {
            this.forwardVelocity *= damping;
        }

        let leftTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);
        let rightTrackForce = this.forwardVelocity * (forceMagnitude / this.maxVelocity);

        if (this.keys.a) {
            leftTrackForce -= forceMagnitude * 0.4;
            rightTrackForce += forceMagnitude * 0.4;
            this.baseBody.angularVelocity.y = turnSpeed;
        }
        if (this.keys.d) {
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

        // Clamp horizontal velocities if necessary
        const velocityMagnitude = Math.sqrt(
            this.baseBody.velocity.x ** 2 + this.baseBody.velocity.z ** 2
        );
        if (velocityMagnitude > this.maxVelocity) {
            const scale = this.maxVelocity / velocityMagnitude;
            this.baseBody.velocity.x *= scale;
            this.baseBody.velocity.z *= scale;
        }

        this.baseBody.angularVelocity.x = Math.max(Math.min(this.baseBody.angularVelocity.x, 0.3), -0.3);
        // Optionally, lock vertical velocity so the excavator stays on the ground.
        this.baseBody.velocity.y = 0;

        this.baseGroup.children.forEach(child => {
            if (child.geometry instanceof THREE.CylinderGeometry) {
                const isLeftWheel = child.position.x < 0;
                const trackSpeed = isLeftWheel ? leftTrackForce : rightTrackForce;
                child.rotation.x += (trackSpeed / forceMagnitude) * 0.1;
            }
        });

        // Joint Motor Controls
        if (this.keys.q) this.turretConstraint.setMotorSpeed(-armSpeed);
        else if (this.keys.e) this.turretConstraint.setMotorSpeed(armSpeed);
        else this.turretConstraint.setMotorSpeed(0);

        if (this.keys.r) {
            this.boomConstraint.setMotorSpeed(-armSpeed);
        } else if (this.keys.f) {
            this.boomConstraint.setMotorSpeed(armSpeed);
        } else {
            this.boomConstraint.setMotorSpeed(0);
            this.boomBody.angularVelocity.set(0, 0, 0);
        }

        // For the stick hinge, apply a proportional controller to limit rotation.
        if (this.keys.g) {
            this.stickConstraint.setMotorSpeed(-armSpeed);
        } else if (this.keys.t) {
            this.stickConstraint.setMotorSpeed(armSpeed);
        } else {
            let boomInv = this.boomBody.quaternion.clone();
            boomInv.conjugate();
            let relQuat = boomInv.mult(this.stickBody.quaternion);
            let currentAngle = 2 * Math.atan2(relQuat.x, relQuat.w);
            const minAngle = -0.0873;
            const maxAngle = 0.0873;
            let error = 0;
            if (currentAngle > maxAngle) {
                error = currentAngle - maxAngle;
            } else if (currentAngle < minAngle) {
                error = currentAngle - minAngle;
            }
            const kP = 0.1;
            let correctiveSpeed = -kP * error;
            if (Math.abs(error) < 0.01) {
                correctiveSpeed = 0;
            }
            this.stickConstraint.setMotorSpeed(correctiveSpeed);
        }

        if (this.keys.y) {
            this.bucketConstraint.setMotorSpeed(armSpeed);
        } else if (this.keys.h) {
            this.bucketConstraint.setMotorSpeed(-armSpeed);
        } else {
            this.bucketConstraint.setMotorSpeed(0);
            this.bucketBody.angularVelocity.set(0, 0, 0);
        }

        // Manual Angle Limits for other joints
        this.clampHingeAngleAroundY(this.turretBody, this.baseBody, -Math.PI, Math.PI);
        this.clampHingeAngleAroundX(this.boomBody, this.turretBody, -Math.PI / 4, Math.PI / 3);
        this.clampHingeAngleAroundX(this.bucketBody, this.stickBody, -Math.PI / 4, Math.PI / 2);

        if (this.keys.space) {
            this.dig();
        }

        this.attachedCubes.forEach(cube => {
            const localPos = cube.localPosition;
            const worldPos = this.bucketBody.position.clone().vadd(
                this.bucketBody.quaternion.vmult(localPos)
            );
            cube.body.position.copy(worldPos);
            cube.body.quaternion.copy(this.bucketBody.quaternion);
            if (cube.instanceId !== undefined && this.cubes.length > 0 && this.cubes[0].mesh) {
                const dummy = new THREE.Object3D();
                dummy.position.copy(worldPos);
                dummy.quaternion.copy(this.bucketBody.quaternion);
                dummy.updateMatrix();
                this.cubes[0].mesh.setMatrixAt(cube.instanceId, dummy.matrix);
                this.cubes[0].mesh.instanceMatrix.needsUpdate = true;
            }
        });

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
            const cubePos = cube.body.position;
            const distance = bucketPos.distanceTo(cubePos);
            if (distance < 0.4 && this.attachedCubes.length < 20) {
                console.log(`Picking up cube at ${cubePos.x}, ${cubePos.y}, ${cubePos.z}`);
                const localPos = cubePos.clone().vsub(bucketPos);
                localPos.applyQuaternion(this.bucketBody.quaternion.conjugate());
                cube.localPosition = localPos;
                this.attachedCubes.push(cube);
                this.cubes.splice(i, 1);
                break;
            }
        }
        if (this.keys.r && this.attachedCubes.length > 0) {
            console.log(`Releasing ${this.attachedCubes.length} cubes`);
            this.attachedCubes.forEach(cube => {
                cube.body.velocity.set(0, 0, 0);
                cube.body.angularVelocity.set(0, 0, 0);
            });
            this.attachedCubes = [];
        }
    }
}

