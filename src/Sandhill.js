import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Creates a Minecraft-like block pile that drops from short heights
 * and settles into a stable pyramid/hill. Each cube is an individual
 * Cannon body, so they can be pushed or scooped by the excavator.
 */
export class SandHill {
    constructor(
        scene,
        physicsWorld,
        groundMaterial,
        excavatorMaterial,
        position = new THREE.Vector3(0, 0, 5)
    ) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.groundMaterial = groundMaterial;
        this.excavatorMaterial = excavatorMaterial;
        this.position = position;

        this.cubes = []; // Store each block's { instanceId, body, mesh }

        // Create the blocky hill
        this.createBlockHill();
    }

    createBlockHill() {
        // --- 1) Set up a physics Material for the cubes
        const sandPhysicsMaterial = new CANNON.Material('blockMaterial');

        // Ground contact
        const blockGroundContact = new CANNON.ContactMaterial(this.groundMaterial, sandPhysicsMaterial, {
            friction: 0.8,       // fairly high friction so blocks don't slide easily
            restitution: 0.0,    // no bounce
        });
        this.physicsWorld.addContactMaterial(blockGroundContact);

        // Excavator contact
        // (Ensures excavator can push them realistically)
        const blockExcavatorContact = new CANNON.ContactMaterial(sandPhysicsMaterial, this.excavatorMaterial, {
            friction: 0.7,
            restitution: 0.0
        });
        this.physicsWorld.addContactMaterial(blockExcavatorContact);

        // --- 2) Visual Material
        const blockMeshMat = new THREE.MeshStandardMaterial({ color: 0xd4a017 });

        // We'll use InstancedMesh to render many cubes efficiently
        // "Minecraft block" => let's assume 1.0 x 1.0 x 1.0
        const blockSize = 1.0;
        const halfSize = blockSize * 0.5;
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);

        // Adjust how many blocks we want. We'll form a pyramid-like shape.
        // e.g. base 10x10 => 100 blocks on the bottom layer, plus smaller layers above.
        const layers = 6; // number of layers
        // We'll compute how many total blocks that is:
        //  e.g. 6 layers => 10x10 on bottom, 8x8 above, etc. 
        // Let's define the base size as 10 (for a 10x10 bottom).
        const baseSize = 10; // must be even or multiple of 2 for symmetrical stacking
        let totalBlocks = 0;
        for (let layer = 0; layer < layers; layer++) {
            const layerSize = baseSize - layer * 2; // 10, 8, 6, 4, 2...
            if (layerSize <= 0) break;
            totalBlocks += layerSize * layerSize;
        }

        // Create InstancedMesh with that total count
        const blockInstancedMesh = new THREE.InstancedMesh(geometry, blockMeshMat, totalBlocks);
        const dummy = new THREE.Object3D();

        // --- 3) Place cubes in a stacked pyramid
        // We'll center them around this.position horizontally,
        // and then offset them in Y layer by layer.
        let instanceIndex = 0;
        const startY = this.position.y + 0.5; // minimal offset so they drop a bit
        for (let layer = 0; layer < layers; layer++) {
            const layerSize = baseSize - layer * 2;
            if (layerSize <= 0) break;

            // The Y position for this layer
            // stack each layer on top of the previous:
            const yPos = startY + layer * blockSize + 1; 
            // +1 so there's a small gap to let them fall and settle

            // We'll center each layer so that x,z are symmetrical
            // layerSize * blockSize is the total width. half is half of that.
            const halfLayerWidth = (layerSize * blockSize) / 2;

            for (let row = 0; row < layerSize; row++) {
                for (let col = 0; col < layerSize; col++) {
                    // X, Z in local space
                    let x = -halfLayerWidth + (col + 0.5) * blockSize;
                    let z = -halfLayerWidth + (row + 0.5) * blockSize;

                    // Convert to world coords, offset by "this.position"
                    x += this.position.x;
                    z += this.position.z;
                    
                    // Optionally add a small random offset so they don't spawn
                    // perfectly aligned, helping them settle more naturally:
                    const randOffset = 0.05; // small perturbation
                    x += (Math.random() - 0.5) * randOffset;
                    z += (Math.random() - 0.5) * randOffset;

                    const y = yPos; 
                    
                    // Position the THREE dummy
                    dummy.position.set(x, y, z);
                    dummy.quaternion.set(0, 0, 0, 1); // no rotation by default
                    dummy.updateMatrix();
                    blockInstancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

                    // --- 4) Create Cannon body for each block
                    const body = new CANNON.Body({
                        mass: 1, // 1 kg per block
                        material: sandPhysicsMaterial
                    });
                    // A box shape (half extents = 0.5 each)
                    body.addShape(new CANNON.Box(new CANNON.Vec3(halfSize, halfSize, halfSize)));
                    body.position.set(x, y, z);

                    // Let them sleep if very still => stable piles
                    body.allowSleep = true;
                    body.sleepSpeedLimit = 0.2;  // speed below which to sleep
                    body.sleepTimeLimit = 1;     // need 1s below that speed

                    // Add to world
                    this.physicsWorld.addBody(body);

                    // Track in array
                    this.cubes.push({ instanceId: instanceIndex, body, mesh: blockInstancedMesh });

                    instanceIndex++;
                }
            }
        }

        this.scene.add(blockInstancedMesh);
        this.sandMesh = blockInstancedMesh;

        console.log(`Built a blocky hill with ${totalBlocks} cubes.`);

        // --- 5) Pre-simulate so they settle before unpausing the game 
        // (If you want them to fall and settle in front of the player, skip this.)
        for (let step = 0; step < 120; step++) { // ~2 seconds at 60Hz
            this.physicsWorld.step(1 / 60);
        }
        // After this, they should be mostly settled in a pyramid shape.
    }

    /**
     * For other code (like the excavator) to know about these blocks if needed.
     */
    getCubes() {
        return this.cubes;
    }
}
