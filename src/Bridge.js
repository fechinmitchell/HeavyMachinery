// bridge.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Creates a ramp between two points with proper physics
 * This simplified version is compatible with index.js
 * 
 * @param {THREE.Scene} scene - The scene to add the ramp to
 * @param {CANNON.World} physicsWorld - The physics world for collisions
 * @param {CANNON.Material} groundMaterial - Material for physics bodies
 * @param {THREE.Vector3} start - Start point of the ramp
 * @param {THREE.Vector3} end - End point of the ramp
 * @returns {THREE.Group} The ramp group
 */
export function createRamp(scene, physicsWorld, groundMaterial, start, end) {
  // Calculate ramp dimensions
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const slope = Math.atan2(dy, length);
  
  // Create a group to hold all ramp components
  const rampGroup = new THREE.Group();
  scene.add(rampGroup);
  
  // Create ramp geometry
  const rampWidth = 6;
  const rampThickness = 0.5;
  const rampGeometry = new THREE.BoxGeometry(length, rampThickness, rampWidth);
  const rampMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    roughness: 0.7,
    metalness: 0.2
  });
  
  const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
  
  // Position the ramp at the midpoint between start and end
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const midZ = (start.z + end.z) / 2;
  ramp.position.set(midX, midY, midZ);
  
  // Rotate the ramp to align with the slope and direction
  ramp.rotation.y = -angle;
  ramp.rotation.x = slope;
  
  rampGroup.add(ramp);
  
  // Add guardrails
  const railHeight = 0.5;
  const railThickness = 0.1;
  
  const leftRailGeometry = new THREE.BoxGeometry(length, railHeight, railThickness);
  const rightRailGeometry = new THREE.BoxGeometry(length, railHeight, railThickness);
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.5,
    metalness: 0.5
  });
  
  const leftRail = new THREE.Mesh(leftRailGeometry, railMaterial);
  const rightRail = new THREE.Mesh(rightRailGeometry, railMaterial);
  
  // Position rails at the edges of the ramp, slightly above the surface
  leftRail.position.set(0, railHeight / 2, rampWidth / 2 - railThickness / 2);
  rightRail.position.set(0, railHeight / 2, -rampWidth / 2 + railThickness / 2);
  
  ramp.add(leftRail);
  ramp.add(rightRail);
  
  // Add physics for the ramp
  const rampShape = new CANNON.Box(
    new CANNON.Vec3(length / 2, rampThickness / 2, rampWidth / 2)
  );
  
  const rampBody = new CANNON.Body({
    mass: 0, // Static body
    material: groundMaterial
  });
  
  rampBody.addShape(rampShape);
  
  // Position the physics body
  rampBody.position.set(midX, midY, midZ);
  
  // Apply rotations
  const q1 = new CANNON.Quaternion();
  q1.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
  
  const q2 = new CANNON.Quaternion();
  q2.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), slope);
  
  rampBody.quaternion = q1.mult(q2);
  
  // Add to physics world
  physicsWorld.addBody(rampBody);
  
  return rampGroup;
}

/**
 * Creates a Golden Gate style suspension bridge between two points with
 * enhanced structural supports, solid decking for heavy machinery,
 * improved ramps with seamless connections, and enhanced cable system.
 * 
 * @param {THREE.Scene} scene - The scene to add bridge elements to
 * @param {CANNON.World} physicsWorld - The physics world for collisions
 * @param {CANNON.Material} groundMaterial - Material for physics bodies
 * @param {THREE.Vector3} start - Start point of the bridge
 * @param {THREE.Vector3} end - End point of the bridge
 * @param {Object} options - Optional parameters
 * @param {boolean} options.addSpiralRamp - Whether to add a spiral ramp at the start point
 * @param {THREE.Vector3} options.spiralTarget - Target point for the spiral ramp (village center)
 * @returns {THREE.Group} The bridge group containing all elements
 */
export function createBridge(scene, physicsWorld, groundMaterial, start, end, options = {}) {
    // Default options
    const defaults = {
        addSpiralRamp: false,
        spiralTarget: null,
        bridgeMass: 0 // Zero mass means immovable
    };
    
    options = {...defaults, ...options};
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const bridgeWidth = 8;        // Wider for a major bridge
    const deckThickness = 1.0;    // Increased thickness for the bridge deck for stability
    const bridgeColor = 0xC0392B; // Iconic "International Orange"
    const cableColor = 0x222222;  // Darker color for cables
    const towerHeight = 30;       // Height of the suspension towers
    const towerWidth = 4;
    const towerDepth = 4;
    const numSuspensionCables = 30; // Increased number of cables for better visuals
    const supportColor = 0x7D7D7D; // Concrete color for supports
  
    // Calculate bridge orientation
    const bridgeAngle = -Math.atan2(dz, dx);
  
    // Deck height and ramp parameters
    const deckHeight = Math.max(start.y, end.y) + 15; // Higher deck for approaches
    const startHeightDifference = deckHeight - start.y;
    const endHeightDifference = deckHeight - end.y;
    const desiredGradient = 0.05; // Gentler 5% slope (1:20)
    const startRampLength = startHeightDifference / desiredGradient; // Horizontal distance for start ramp
    const endRampLength = endHeightDifference / desiredGradient; // Horizontal distance for end ramp
    const minTotalLength = startRampLength + endRampLength + 20; // 20 as minimum main span
  
    if (length < minTotalLength) {
      console.warn(`Bridge length (${length}) too short for gentle ramps. Minimum required: ${minTotalLength}`);
    }
  
    const mainSpanLength = length - (startRampLength + endRampLength);
  
    // Create a group to hold the bridge components
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set((start.x + end.x) / 2, 0, (start.z + end.z) / 2);
    bridgeGroup.rotation.y = bridgeAngle;
    scene.add(bridgeGroup);
  
    // --- MAIN DECK SPAN ---
    const mainDeckGeometry = new THREE.BoxGeometry(mainSpanLength, deckThickness, bridgeWidth);
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.2
    });
    const mainDeckMesh = new THREE.Mesh(mainDeckGeometry, deckMaterial);
    mainDeckMesh.position.set(0, deckHeight, 0);
    bridgeGroup.add(mainDeckMesh);
  
    // --- BRIDGE ABUTMENTS ---
    function createBridgeAbutment(isStart) {
      const abutmentDirection = isStart ? -1 : 1;
      const rampLength = isStart ? startRampLength : endRampLength;
      const abutmentX = abutmentDirection * (mainSpanLength / 2 + rampLength * 0.5);
      const groundY = isStart ? start.y : end.y;
      const abutmentHeight = (deckHeight - groundY) * 0.8;
      const abutmentWidth = bridgeWidth * 1.5;
      const abutmentDepth = rampLength * 0.5;
      
      const abutmentShape = new THREE.Shape();
      abutmentShape.moveTo(-abutmentWidth/2, 0);
      abutmentShape.lineTo(abutmentWidth/2, 0);
      abutmentShape.lineTo(abutmentWidth*0.4, abutmentHeight);
      abutmentShape.lineTo(-abutmentWidth*0.4, abutmentHeight);
      abutmentShape.lineTo(-abutmentWidth/2, 0);
      
      const extrudeSettings = {
        steps: 1,
        depth: abutmentDepth,
        bevelEnabled: false
      };
      
      const abutmentGeometry = new THREE.ExtrudeGeometry(abutmentShape, extrudeSettings);
      const abutmentMaterial = new THREE.MeshStandardMaterial({
        color: supportColor,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const abutment = new THREE.Mesh(abutmentGeometry, abutmentMaterial);
      abutment.rotation.x = -Math.PI / 2;
      abutment.position.set(abutmentX, groundY, -abutmentDepth/2);
      bridgeGroup.add(abutment);
      
      // Physics for abutment
      const abutmentShape1 = new CANNON.Box(new CANNON.Vec3(abutmentWidth/2, abutmentHeight/2, abutmentDepth/2));
      const abutmentBody = new CANNON.Body({
        mass: 0,
        material: groundMaterial
      });
      abutmentBody.addShape(abutmentShape1);
      const localPos = new THREE.Vector3(abutmentX, groundY + abutmentHeight/2, 0);
      const worldPos = localPos.applyMatrix4(
        new THREE.Matrix4().makeRotationY(bridgeAngle)
      ).add(bridgeGroup.position);
      abutmentBody.position.set(worldPos.x, worldPos.y, worldPos.z);
      abutmentBody.quaternion.setFromEuler(0, bridgeAngle, 0);
      physicsWorld.addBody(abutmentBody);
      
      // Support columns
      const numColumns = 3;
      const columnSpacing = rampLength * 0.25;
      const columnRadius = 1.2;
      const columnMaterial = new THREE.MeshStandardMaterial({
        color: supportColor,
        roughness: 0.7,
        metalness: 0.3
      });
      
      for (let i = 1; i <= numColumns; i++) {
        const columnX = abutmentX + abutmentDirection * (abutmentDepth/2 + i * columnSpacing);
        const t = i / (numColumns + 1);
        const columnTop = deckHeight - (deckHeight - groundY) * t;
        const columnHeight = columnTop - groundY;
        
        const columnGeometry = new THREE.CylinderGeometry(
          columnRadius,
          columnRadius * 1.2,
          columnHeight,
          12
        );
        
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(columnX, groundY + columnHeight/2, 0);
        bridgeGroup.add(column);
        
        const columnShape = new CANNON.Cylinder(
          columnRadius,
          columnRadius * 1.2,
          columnHeight,
          12
        );
        const columnBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        columnBody.addShape(columnShape);
        const colLocalPos = new THREE.Vector3(columnX, groundY + columnHeight/2, 0);
        const colWorldPos = colLocalPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        columnBody.position.set(colWorldPos.x, colWorldPos.y, colWorldPos.z);
        columnBody.quaternion.setFromEuler(0, bridgeAngle, 0);
        physicsWorld.addBody(columnBody);
      }
    }
    
    createBridgeAbutment(true);
    createBridgeAbutment(false);
    
    // --- INTERNAL APPROACH RAMPS ---
    // This is a simplified internal implementation of the ramp
    // Different from the exported createRamp function
    function createInternalRamp(isStart) {
      const rampSegments = 16; // Increased segments for smoother ramps
      const direction = isStart ? -1 : 1;
      const rampLength = isStart ? startRampLength : endRampLength;
      const startX = direction * mainSpanLength / 2;
      const startY = deckHeight;
      const endX = direction * (mainSpanLength / 2 + rampLength);
      const endY = isStart ? start.y : end.y;
      
      // Ramp group to hold all ramp components
      const rampGroup = new THREE.Group();
      bridgeGroup.add(rampGroup);
      
      // Define the road path with gentle curve at the end
      const points = [];
      
      // Adjust the first point to achieve a flush connection with the main bridge deck
      // First point sits *inside* the bridge deck by a small amount to ensure flush connection
      points.push(new THREE.Vector3(startX - direction * 0.2, startY, 0));
      
      if (isStart) {
        // Improved start ramp with smoother transition
        for (let i = 1; i <= rampSegments; i++) {
          const t = i / rampSegments;
          // Use quadratic easing for a more natural slope
          const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const x = startX + (endX - startX) * t;
          const y = startY - (startY - endY) * easeT; // Eased slope
          const z = 0; // Straight path
          points.push(new THREE.Vector3(x, y, z));
        }
      } else {
        // Improved end ramp with smooth curve
        const curveSegments = 10; // Increased segments for the curve
        const straightSegments = rampSegments - curveSegments;
        
        // First part - smooth descent
        for (let i = 1; i <= straightSegments; i++) {
          const t = i / straightSegments;
          // Quadratic ease-in function
          const easeT = t * t;
          const x = startX + (endX - startX) * 0.6 * t;
          const y = startY - (startY - endY) * 0.7 * easeT;
          const z = 0;
          points.push(new THREE.Vector3(x, y, z));
        }
        
        // Second part - smooth curved descent
        for (let i = 1; i <= curveSegments; i++) {
          const t = i / curveSegments;
          // Ease-out function
          const easeT = 1 - Math.pow(1 - t, 2);
          const x = startX + (endX - startX) * (0.6 + 0.4 * t);
          const y = startY - (startY - endY) * (0.7 + 0.3 * easeT);
          // Smooth curvature
          const curveAmount = t * t * bridgeWidth * 2.5;
          const z = -curveAmount;
          points.push(new THREE.Vector3(x, y, z));
        }
      }
      
      // Create a smooth path for visualization and physics
      const rampCurve = new THREE.CatmullRomCurve3(points);
      const rampPoints = rampCurve.getPoints(rampSegments);
      
      // Create a more robust road surface with exact same materials as the bridge deck
      // to ensure visual continuity
      const roadProfileShape = new THREE.Shape();
      roadProfileShape.moveTo(-bridgeWidth/2, 0);
      roadProfileShape.lineTo(bridgeWidth/2, 0);
      roadProfileShape.lineTo(bridgeWidth/2, deckThickness);
      roadProfileShape.lineTo(-bridgeWidth/2, deckThickness);
      roadProfileShape.lineTo(-bridgeWidth/2, 0);
      
      const sweepPath = new THREE.CatmullRomCurve3(rampPoints);
      const extrudeSettings = {
        steps: rampSegments,
        bevelEnabled: false,
        extrudePath: sweepPath
      };
      
      const rampGeometry = new THREE.ExtrudeGeometry(roadProfileShape, extrudeSettings);
      // Use the EXACT same material as the bridge deck for perfect visual match
      const ramp = new THREE.Mesh(rampGeometry, deckMaterial);
      rampGroup.add(ramp);
      
      // Add guardrails to the ramp for visual clarity and safety
      const guardrailHeight = 1.0;
      
      // Create guardrails along the path
      for (let i = 0; i < rampPoints.length; i++) {
        const point = rampPoints[i];
        
        // Skip first point for seamless connection with bridge guardrails
        if (i === 0) continue;
        
        // Calculate direction to next point for orientation
        const nextPoint = rampPoints[Math.min(i + 1, rampPoints.length - 1)];
        const prevPoint = rampPoints[Math.max(i - 1, 0)];
        
        const pathDirection = new THREE.Vector3().subVectors(nextPoint, prevPoint).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(pathDirection, up).normalize();
        
        // Create post
        const postGeometry = new THREE.BoxGeometry(0.2, guardrailHeight, 0.2);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        
        // Left guardrail post
        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.copy(point);
        leftPost.position.add(right.clone().multiplyScalar(bridgeWidth/2 - 0.1));
        leftPost.position.y += guardrailHeight/2 + deckThickness/2;
        rampGroup.add(leftPost);
        
        // Right guardrail post
        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.copy(point);
        rightPost.position.add(right.clone().multiplyScalar(-bridgeWidth/2 + 0.1));
        rightPost.position.y += guardrailHeight/2 + deckThickness/2;
        rampGroup.add(rightPost);
        
        // Only add rail segments on regular intervals
        if (i % 2 === 0 && i < rampPoints.length - 2) {
          // Calculate length to next post
          const nextPos = rampPoints[i + 2];
          const railLength = point.distanceTo(nextPos);
          
          // Create rails
          const railGeometry = new THREE.BoxGeometry(railLength, 0.15, 0.1);
          const railMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666666,
            metalness: 0.6,
            roughness: 0.3
          });
          
          // Left rail
          const leftRail = new THREE.Mesh(railGeometry, railMaterial);
          leftRail.position.copy(point);
          leftRail.position.add(right.clone().multiplyScalar(bridgeWidth/2 - 0.1));
          leftRail.position.y += guardrailHeight - 0.1 + deckThickness/2;
          leftRail.position.add(pathDirection.clone().multiplyScalar(railLength/2));
          
          // Orient rail along path
          const railQuat = new THREE.Quaternion();
          const railUp = new THREE.Vector3(0, 1, 0);
          const railForward = pathDirection;
          const railRight = new THREE.Vector3().crossVectors(railUp, railForward).normalize();
          const railMatrix = new THREE.Matrix4().makeBasis(railForward, railUp, railRight);
          railQuat.setFromRotationMatrix(railMatrix);
          leftRail.quaternion.copy(railQuat);
          
          rampGroup.add(leftRail);
          
          // Right rail (clone of left)
          const rightRail = leftRail.clone();
          rightRail.position.copy(point);
          rightRail.position.add(right.clone().multiplyScalar(-bridgeWidth/2 + 0.1));
          rightRail.position.y += guardrailHeight - 0.1 + deckThickness/2;
          rightRail.position.add(pathDirection.clone().multiplyScalar(railLength/2));
          rightRail.quaternion.copy(railQuat);
          rampGroup.add(rightRail);
        }
      }
      
      // Create solid physics for ramp segments using the actual path points
      // The physics bodies are now thicker and more solid for heavy machinery
      for (let i = 0; i < rampSegments; i++) {
        const p1 = rampPoints[i];
        const p2 = rampPoints[i + 1];
        const segDirection = new THREE.Vector3().subVectors(p2, p1).normalize();
        const segLength = p1.distanceTo(p2);
        
        // Create a more robust physics body for the segment with additional friction
        const segShape = new CANNON.Box(new CANNON.Vec3(segLength / 2, bridgeWidth / 2, deckThickness));
        const segBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        segBody.addShape(segShape);
        
        // Position at midpoint of segment
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const localPos = midPoint.clone();
        const worldPos = localPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        
        segBody.position.set(worldPos.x, worldPos.y, worldPos.z);
        
        // Orient along segment direction
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(segDirection, up).normalize();
        const mat = new THREE.Matrix4().makeBasis(segDirection, up, right);
        const quat = new THREE.Quaternion().setFromRotationMatrix(mat);
        
        // Apply bridge rotation and then segment orientation
        const q1 = new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), bridgeAngle);
        const q2 = new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w);
        segBody.quaternion = q1.mult(q2);
        
        // Create high-friction material for ramp
        const rampMaterial = new CANNON.Material('ramp');
        segBody.material = rampMaterial;
        
        const rampContactMaterial = new CANNON.ContactMaterial(
          groundMaterial,
          rampMaterial,
          {
            friction: 1.0,      // High friction to prevent slipping
            restitution: 0.05   // Low restitution
          }
        );
        physicsWorld.addContactMaterial(rampContactMaterial);
        
        physicsWorld.addBody(segBody);
      }
      
      return rampGroup;
    }
    
    createInternalRamp(true);
    createInternalRamp(false);
    
    // --- ROAD MARKINGS ---
    // Add center line
    const roadMarkingsGeometry = new THREE.PlaneGeometry(mainSpanLength, bridgeWidth * 0.05);
    const roadMarkingsMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const roadMarkings = new THREE.Mesh(roadMarkingsGeometry, roadMarkingsMaterial);
    roadMarkings.rotation.x = -Math.PI / 2;
    roadMarkings.position.set(0, deckHeight + deckThickness / 2 + 0.01, 0);
    bridgeGroup.add(roadMarkings);
    
    // Add lane dividers (dashed lines)
    const dashLength = 1.5;
    const dashGap = 1.5;
    const dashWidth = 0.1;
    const laneOffset = bridgeWidth / 4;
    
    for (let offset = -laneOffset; offset <= laneOffset; offset += laneOffset * 2) {
      for (let i = -mainSpanLength/2 + dashLength/2; i < mainSpanLength/2; i += dashLength + dashGap) {
        const dashGeometry = new THREE.PlaneGeometry(dashLength, dashWidth);
        const dash = new THREE.Mesh(dashGeometry, roadMarkingsMaterial);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(i, deckHeight + deckThickness / 2 + 0.01, offset);
        bridgeGroup.add(dash);
      }
    }
    
    // --- GUARDRAILS FOR MAIN SPAN ---
    const guardrailHeightMain = 1.5;
    const guardrailGeometryMain = new THREE.BoxGeometry(mainSpanLength, guardrailHeightMain, 0.3);
    const guardrailMaterialMain = new THREE.MeshStandardMaterial({ 
      color: bridgeColor,
      roughness: 0.5,
      metalness: 0.7
    });
    const leftGuardrailMain = new THREE.Mesh(guardrailGeometryMain, guardrailMaterialMain);
    leftGuardrailMain.position.set(0, deckHeight + guardrailHeightMain / 2, bridgeWidth / 2 - 0.2);
    bridgeGroup.add(leftGuardrailMain);
    const rightGuardrailMain = new THREE.Mesh(guardrailGeometryMain, guardrailMaterialMain);
    rightGuardrailMain.position.set(0, deckHeight + guardrailHeightMain / 2, -bridgeWidth / 2 + 0.2);
    bridgeGroup.add(rightGuardrailMain);
    
    // Add vertical posts to guardrails for visual detail
    const postSpacing = 3;
    const postWidth = 0.15;
    const numPosts = Math.floor(mainSpanLength / postSpacing);
    
    // --- TOWERS WITH FOUNDATIONS ---
    const towerOffset = mainSpanLength / 4;
    const towerMaterial = new THREE.MeshStandardMaterial({ 
      color: bridgeColor,
      roughness: 0.3,
      metalness: 0.8
    });
    
    for (let i = 0; i < numPosts; i++) {
      const x = -mainSpanLength/2 + postSpacing/2 + i * postSpacing;
      
      // Skip posts at tower positions
      if (Math.abs(x - (-towerOffset)) < towerWidth/2 || 
          Math.abs(x - towerOffset) < towerWidth/2) {
        continue;
      }
      
      const postGeometry = new THREE.BoxGeometry(postWidth, guardrailHeightMain, postWidth);
      const postMaterial = new THREE.MeshStandardMaterial({
        color: bridgeColor,
        roughness: 0.4,
        metalness: 0.8
      });
      
      // Left side posts
      const leftPost = new THREE.Mesh(postGeometry, postMaterial);
      leftPost.position.set(x, deckHeight + guardrailHeightMain/2, bridgeWidth/2 - 0.2);
      bridgeGroup.add(leftPost);
      
      // Right side posts
      const rightPost = new THREE.Mesh(postGeometry, postMaterial);
      rightPost.position.set(x, deckHeight + guardrailHeightMain/2, -bridgeWidth/2 + 0.2);
      bridgeGroup.add(rightPost);
    }
    
    // Create complete towers with foundations that extend to the ground
    function createTowerWithFoundation(xOffset) {
      const localX = xOffset;
      const groundLevel = xOffset < 0 ? start.y : end.y;
      const foundationHeight = deckHeight - groundLevel;
      const foundationWidth = towerWidth * 1.5;
      const foundationDepth = towerDepth * 1.5;
      
      // Tower group to hold all components
      const towerGroup = new THREE.Group();
      towerGroup.position.set(localX, 0, 0);
      
      // Main tower above deck
      const upperTowerGeometry = new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth);
      const upperTower = new THREE.Mesh(upperTowerGeometry, towerMaterial);
      upperTower.position.set(0, deckHeight + towerHeight / 2, 0);
      towerGroup.add(upperTower);
      
      // Foundation below deck
      if (foundationHeight > 0) {
        // Tapered tower foundation (wider at bottom)
        const foundationGeometry = new THREE.BoxGeometry(foundationWidth, foundationHeight, foundationDepth);
        const foundationMaterial = new THREE.MeshStandardMaterial({
          color: supportColor,
          roughness: 0.7,
          metalness: 0.2
        });
        const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
        foundation.position.set(0, groundLevel + foundationHeight / 2, 0);
        towerGroup.add(foundation);
        
        // Create diagonal supports for the foundation
        const supportThickness = 1.0;
        const supportLength = Math.sqrt(Math.pow(foundationHeight, 2) + Math.pow(foundationWidth, 2));
        
        // Front diagonal support
        const frontSupportGeometry = new THREE.BoxGeometry(supportThickness, supportLength, foundationDepth * 0.8);
        const frontSupport = new THREE.Mesh(frontSupportGeometry, foundationMaterial);
        frontSupport.position.set(foundationWidth/3, groundLevel + foundationHeight/2, 0);
        frontSupport.rotation.z = Math.atan2(foundationWidth/2, foundationHeight);
        towerGroup.add(frontSupport);
        
        // Back diagonal support
        const backSupport = frontSupport.clone();
        backSupport.position.set(-foundationWidth/3, groundLevel + foundationHeight/2, 0);
        backSupport.rotation.z = -Math.atan2(foundationWidth/2, foundationHeight);
        towerGroup.add(backSupport);
        
        // Add reinforced base at ground level
        const baseGeometry = new THREE.BoxGeometry(foundationWidth * 1.2, 1.0, foundationDepth * 1.2);
        const baseFoundation = new THREE.Mesh(baseGeometry, foundationMaterial);
        baseFoundation.position.set(0, groundLevel + 0.5, 0);
        towerGroup.add(baseFoundation);
        
        // Add physics for the foundation
        const foundationShape = new CANNON.Box(new CANNON.Vec3(foundationWidth/2, foundationHeight/2, foundationDepth/2));
        const foundationBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        foundationBody.addShape(foundationShape);
        
        const foundationLocalPos = new THREE.Vector3(localX, groundLevel + foundationHeight/2, 0);
        const foundationWorldPos = foundationLocalPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        
        foundationBody.position.set(foundationWorldPos.x, foundationWorldPos.y, foundationWorldPos.z);
        foundationBody.quaternion.setFromEuler(0, bridgeAngle, 0);
        physicsWorld.addBody(foundationBody);
        
        // Add physics for the upper tower
        const upperTowerShape = new CANNON.Box(new CANNON.Vec3(towerWidth/2, towerHeight/2, towerDepth/2));
        const upperTowerBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        upperTowerBody.addShape(upperTowerShape);
        
        const towerLocalPos = new THREE.Vector3(localX, deckHeight + towerHeight/2, 0);
        const towerWorldPos = towerLocalPos.applyMatrix4(
          new THREE.Matrix4().makeRotationY(bridgeAngle)
        ).add(bridgeGroup.position);
        
        upperTowerBody.position.set(towerWorldPos.x, towerWorldPos.y, towerWorldPos.z);
        upperTowerBody.quaternion.setFromEuler(0, bridgeAngle, 0);
        physicsWorld.addBody(upperTowerBody);
      }
      
      // Cross beams on tower
      const crossBeamPositions = [0.2, 0.5, 0.8]; // Positions as a fraction of tower height
      
      for (const fraction of crossBeamPositions) {
        const crossBeamY = deckHeight + towerHeight * fraction;
        const crossBeamLength = bridgeWidth * 1.2;
        const crossBeamWidth = towerWidth * 0.8;
        const crossBeamHeight = towerWidth * 0.8;
        
        const crossBeamGeometry = new THREE.BoxGeometry(crossBeamWidth, crossBeamHeight, crossBeamLength);
        const crossBeam = new THREE.Mesh(crossBeamGeometry, towerMaterial);
        crossBeam.position.set(0, crossBeamY, 0);
        towerGroup.add(crossBeam);
      }
      
      // Tower top details
      const capWidth = towerWidth * 1.2;
      const capHeight = 1.5;
      const capDepth = towerDepth * 1.2;
      
      const capGeometry = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
      const cap = new THREE.Mesh(capGeometry, towerMaterial);
      cap.position.set(0, deckHeight + towerHeight + capHeight/2, 0);
      towerGroup.add(cap);
      
      // Add decorative elements
      const decorSize = 0.5;
      const decorGeometry = new THREE.SphereGeometry(decorSize, 8, 8);
      const decor = new THREE.Mesh(decorGeometry, towerMaterial);
      decor.position.set(0, deckHeight + towerHeight + capHeight + decorSize/2, 0);
      towerGroup.add(decor);
      
      bridgeGroup.add(towerGroup);
      return towerGroup;
    }
    
    // Create the towers - these are important for the bridge structure
    createTowerWithFoundation(-towerOffset);
    createTowerWithFoundation(towerOffset);
    
    // --- SUSPENSION CABLES ---
    // Main suspension cables
    const mainCableRadius = 0.5;  // Thicker main cables
    const mainCableGeometry = new THREE.CylinderGeometry(
      mainCableRadius, 
      mainCableRadius, 
      mainSpanLength, 
      16, 
      1, 
      true
    );
    mainCableGeometry.rotateZ(Math.PI / 2); // Rotate to align with bridge
    
    const mainCableMaterial = new THREE.MeshStandardMaterial({
      color: cableColor,
      roughness: 0.4,
      metalness: 0.7
    });
    
    // Cable drooping function using a catenary curve
    const cableHeight = towerHeight * 0.9;
    const droop = towerHeight * 0.15;
    
    function getCableY(x, totalLength) {
      const a = totalLength / (2 * Math.asinh(totalLength / (2 * droop)));
      return cableHeight - a * (Math.cosh(x / a) - 1);
    }
    
    // Create catenary curve for main cables
    const cableCurvePoints = [];
    const cableDivisions = 50;
    
    for (let i = 0; i <= cableDivisions; i++) {
      const t = i / cableDivisions;
      const x = -mainSpanLength/2 + mainSpanLength * t;
      const y = getCableY((x + mainSpanLength/2) - mainSpanLength/2, mainSpanLength) + deckHeight;
      cableCurvePoints.push(new THREE.Vector3(x, y, 0));
    }
    
    const cableCurve = new THREE.CatmullRomCurve3(cableCurvePoints);
    const cableTubeGeometry = new THREE.TubeGeometry(cableCurve, cableDivisions, mainCableRadius, 12, false);
    
    // Left main cable
    const leftMainCable = new THREE.Mesh(cableTubeGeometry, mainCableMaterial);
    leftMainCable.position.set(0, 0, bridgeWidth/2 - 0.5);
    bridgeGroup.add(leftMainCable);
    
    // Right main cable
    const rightMainCable = new THREE.Mesh(cableTubeGeometry, mainCableMaterial);
    rightMainCable.position.set(0, 0, -bridgeWidth/2 + 0.5);
    bridgeGroup.add(rightMainCable);
    
    // Add vertical suspender cables
    const suspenderMaterial = new THREE.MeshStandardMaterial({
      color: cableColor,
      roughness: 0.3,
      metalness: 0.8
    });
    const suspenderRadius = 0.08;
    
    for (let i = 1; i < numSuspensionCables - 1; i++) {
      const t = i / (numSuspensionCables - 1);
      const suspenderX = -mainSpanLength/2 + mainSpanLength * t;
      
      // Skip suspenders at tower positions
      if (Math.abs(suspenderX - (-towerOffset)) < towerWidth/2 || 
          Math.abs(suspenderX - towerOffset) < towerWidth/2) {
        continue;
      }
      
      // Get y position from the cable curve
      const point = cableCurve.getPointAt(t);
      const cableY = point.y;
      
      // Create left suspender
      const leftSuspenderHeight = cableY - deckHeight;
      const leftSuspenderGeometry = new THREE.CylinderGeometry(
        suspenderRadius, 
        suspenderRadius, 
        leftSuspenderHeight, 
        6
      );
      const leftSuspender = new THREE.Mesh(leftSuspenderGeometry, suspenderMaterial);
      leftSuspender.position.set(
        suspenderX, 
        deckHeight + leftSuspenderHeight/2, 
        bridgeWidth/2 - 0.5
      );
      bridgeGroup.add(leftSuspender);
      
      // Create right suspender
      const rightSuspenderGeometry = new THREE.CylinderGeometry(
        suspenderRadius, 
        suspenderRadius, 
        leftSuspenderHeight, 
        6
      );
      const rightSuspender = new THREE.Mesh(rightSuspenderGeometry, suspenderMaterial);
      rightSuspender.position.set(
        suspenderX, 
        deckHeight + leftSuspenderHeight/2, 
        -bridgeWidth/2 + 0.5
      );
      bridgeGroup.add(rightSuspender);
      
      // Add small connection piece to deck
      const connectorSize = 0.3;
      const connectorGeometry = new THREE.BoxGeometry(connectorSize, connectorSize, connectorSize);
      const connectorMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.3,
        metalness: 0.8
      });
      
      const leftConnector = new THREE.Mesh(connectorGeometry, connectorMaterial);
      leftConnector.position.set(suspenderX, deckHeight + connectorSize/2, bridgeWidth/2 - 0.5);
      bridgeGroup.add(leftConnector);
      
      const rightConnector = new THREE.Mesh(connectorGeometry, connectorMaterial);
      rightConnector.position.set(suspenderX, deckHeight + connectorSize/2, -bridgeWidth/2 + 0.5);
      bridgeGroup.add(rightConnector);
    }
    
    // Create cross cables for stability
    const numCrossCables = 10;
    const crossCableRadius = 0.06;
    
    for (let i = 1; i < numCrossCables; i++) {
      const t = i / numCrossCables;
      const crossX = -mainSpanLength/2 + mainSpanLength * t;
      
      // Skip cross cables at tower positions
      if (Math.abs(crossX - (-towerOffset)) < towerWidth/2 || 
          Math.abs(crossX - towerOffset) < towerWidth/2) {
        continue;
      }
      
      // Create a cross cable that spans diagonally
      const crossCableLength = Math.sqrt(Math.pow(bridgeWidth, 2) + Math.pow(5, 2));
      const crossCableGeometry = new THREE.CylinderGeometry(
        crossCableRadius, 
        crossCableRadius, 
        crossCableLength, 
        6
      );
      
      const crossCable = new THREE.Mesh(crossCableGeometry, suspenderMaterial);
      crossCable.position.set(crossX, deckHeight - 1, 0);
      
      // Rotate to create diagonal
      crossCable.rotation.x = Math.PI / 2;
      crossCable.rotation.y = Math.atan2(5, bridgeWidth);
      
      bridgeGroup.add(crossCable);
    }
    
    // --- SPIRAL RAMP (OPTIONAL) ---
    if (options.addSpiralRamp && options.spiralTarget) {
      // Calculate direction from start to target
      const targetDirection = new THREE.Vector3()
        .subVectors(options.spiralTarget, start)
        .normalize();
      
      // Spiral parameters
      const spiralRadius = 10;
      const spiralHeight = 10;
      const numTurns = 1.5;
      const numSegments = 36;
      const segmentsPerTurn = numSegments / numTurns;
      const rampWidth = 5;
      
      // Create spiral group
      const spiralGroup = new THREE.Group();
      spiralGroup.position.copy(start);
      
      // Orient spiral to face target
      const spiralUp = new THREE.Vector3(0, 1, 0);
      const spiralForward = new THREE.Vector3(targetDirection.x, 0, targetDirection.z).normalize();
      const spiralRight = new THREE.Vector3().crossVectors(spiralUp, spiralForward).normalize();
      const spiralMatrix = new THREE.Matrix4().makeBasis(spiralForward, spiralUp, spiralRight);
      spiralGroup.setRotationFromMatrix(spiralMatrix);
      
      // Create spiral segments
      for (let i = 0; i < numSegments; i++) {
        const angle1 = (i / segmentsPerTurn) * Math.PI * 2;
        const angle2 = ((i + 1) / segmentsPerTurn) * Math.PI * 2;
        
        const height1 = (i / numSegments) * spiralHeight;
        const height2 = ((i + 1) / numSegments) * spiralHeight;
        
        const inner1 = spiralRadius - rampWidth/2;
        const outer1 = spiralRadius + rampWidth/2;
        
        // Points for the segment
        const segmentShape = new THREE.Shape();
        
        // First edge (inner curve)
        segmentShape.moveTo(
          inner1 * Math.cos(angle1),
          inner1 * Math.sin(angle1)
        );
        
        // Second edge (outer curve of first angle)
        segmentShape.lineTo(
          outer1 * Math.cos(angle1),
          outer1 * Math.sin(angle1)
        );
        
        // Third edge (outer curve of second angle)
        segmentShape.lineTo(
          outer1 * Math.cos(angle2),
          outer1 * Math.sin(angle2)
        );
        
        // Fourth edge (inner curve of second angle)
        segmentShape.lineTo(
          inner1 * Math.cos(angle2),
          inner1 * Math.sin(angle2)
        );
        
        // Close shape
        segmentShape.lineTo(
          inner1 * Math.cos(angle1),
          inner1 * Math.sin(angle1)
        );
        
        // Extrude the shape upward with slight slope
        const extrudeSettings = {
          steps: 1,
          depth: height2 - height1,
          bevelEnabled: false
        };
        
        const segmentGeometry = new THREE.ExtrudeGeometry(segmentShape, extrudeSettings);
        const segment = new THREE.Mesh(segmentGeometry, deckMaterial);
        
        // Position segment
        segment.position.set(0, height1, 0);
        segment.rotation.x = -Math.PI / 2;
        
        spiralGroup.add(segment);
        
        // Add railings
        const railHeight = 1.0;
        const railRadius = 0.1;
        
        // Inner rail
        const innerRailShape = new THREE.CurvePath();
        const innerRailCurve = new THREE.EllipseCurve(
          0, 0,
          inner1, inner1,
          angle1, angle2,
          false, 0
        );
        innerRailShape.add(innerRailCurve);
        
        const innerRailPoints = innerRailShape.getPoints(10);
        const innerRailGeometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            innerRailPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
          ),
          10,
          railRadius,
          8,
          false
        );
        
        const innerRail = new THREE.Mesh(innerRailGeometry, guardrailMaterialMain);
        innerRail.position.set(0, height1 + railHeight, 0);
        spiralGroup.add(innerRail);
        
        // Outer rail
        const outerRailShape = new THREE.CurvePath();
        const outerRailCurve = new THREE.EllipseCurve(
          0, 0,
          outer1, outer1,
          angle1, angle2,
          false, 0
        );
        outerRailShape.add(outerRailCurve);
        
        const outerRailPoints = outerRailShape.getPoints(10);
        const outerRailGeometry = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            outerRailPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
          ),
          10,
          railRadius,
          8,
          false
        );
        
        const outerRail = new THREE.Mesh(outerRailGeometry, guardrailMaterialMain);
        outerRail.position.set(0, height1 + railHeight, 0);
        spiralGroup.add(outerRail);
        
        // Add physics for the spiral segment
        const segBodyShape = new CANNON.Box(
          new CANNON.Vec3(rampWidth/2, (height2 - height1)/2, spiralRadius/2)
        );
        const segBody = new CANNON.Body({
          mass: 0,
          material: groundMaterial
        });
        segBody.addShape(segBodyShape);
        
        // Calculate average position and angle for the segment
        const avgAngle = (angle1 + angle2) / 2;
        const avgHeight = (height1 + height2) / 2;
        const avgRadius = spiralRadius;
        
        // Create position in local coordinates
        const segLocalPos = new THREE.Vector3(
          avgRadius * Math.cos(avgAngle),
          avgHeight,
          avgRadius * Math.sin(avgAngle)
        );
        
        // Convert to world space with spiral orientation
        segLocalPos.applyMatrix4(spiralMatrix);
        const segWorldPos = segLocalPos.add(start);
        
        segBody.position.set(segWorldPos.x, segWorldPos.y, segWorldPos.z);
        
        // Calculate orientation
        const segForward = new THREE.Vector3(
          -Math.sin(avgAngle),
          0,
          -Math.cos(avgAngle)
        ).applyMatrix4(spiralMatrix);
        
        const segUp = new THREE.Vector3(0, 1, 0);
        const segRight = new THREE.Vector3().crossVectors(segUp, segForward).normalize();
        const rotation = new THREE.Matrix4().makeBasis(segForward, segUp, segRight);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotation);
        
        segBody.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        
        physicsWorld.addBody(segBody);
      }
      
      // Add spiral connection to bridge start ramp
      const connectionLength = 5;
      const connectionGeometry = new THREE.BoxGeometry(connectionLength, deckThickness, rampWidth);
      const connection = new THREE.Mesh(connectionGeometry, deckMaterial);
      
      // Position to connect spiral exit to bridge start
      const spiralExitAngle = numTurns * Math.PI * 2;
      const spiralExitHeight = spiralHeight;
      const spiralExitX = spiralRadius * Math.cos(spiralExitAngle);
      const spiralExitZ = spiralRadius * Math.sin(spiralExitAngle);
      
      connection.position.set(
        spiralExitX + connectionLength/2 * Math.cos(spiralExitAngle),
        spiralExitHeight,
        spiralExitZ + connectionLength/2 * Math.sin(spiralExitAngle)
      );
      
      connection.rotation.y = spiralExitAngle;
      spiralGroup.add(connection);
      
      scene.add(spiralGroup);
    }
    
    // --- PHYSICS FOR MAIN BRIDGE SPAN ---
    const bridgeDeckShape = new CANNON.Box(
      new CANNON.Vec3(mainSpanLength/2, deckThickness/2, bridgeWidth/2)
    );
    const bridgeDeckBody = new CANNON.Body({
      mass: options.bridgeMass,
      material: groundMaterial
    });
    bridgeDeckBody.addShape(bridgeDeckShape);
    
    const deckLocalPos = new THREE.Vector3(0, deckHeight, 0);
    const deckWorldPos = deckLocalPos.applyMatrix4(
      new THREE.Matrix4().makeRotationY(bridgeAngle)
    ).add(bridgeGroup.position);
    
    bridgeDeckBody.position.set(deckWorldPos.x, deckWorldPos.y, deckWorldPos.z);
    bridgeDeckBody.quaternion.setFromEuler(0, bridgeAngle, 0);
    physicsWorld.addBody(bridgeDeckBody);
    
    // Create high-friction material for bridge
    const bridgeContactMaterial = new CANNON.ContactMaterial(
      groundMaterial,
      bridgeDeckBody.material,
      {
        friction: 0.9,      // High friction
        restitution: 0.05   // Low bounce
      }
    );
    physicsWorld.addContactMaterial(bridgeContactMaterial);
    
    // Return the bridge group
    return bridgeGroup;
}