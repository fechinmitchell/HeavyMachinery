// environment.js
import * as THREE from 'three';

/**
 * Creates a procedural water surface with animated waves
 * @param {THREE.Scene} scene - The scene to add the water to
 * @returns {Object} The water mesh and material for animation
 */
export function createWater(scene) {
  // Create a large plane with a custom shader that displaces vertices to mimic waves
  const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 128, 128);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 }
    },
    vertexShader: /* glsl */ `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Displace the surface to simulate waves.
        pos.z += sin(pos.x * 0.1 + time) * 1.0;
        pos.z += sin(pos.y * 0.1 + time * 1.5) * 1.0;
        vNormal = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        // Blend between a darker and lighter blue based on a simple light effect.
        float intensity = dot(vNormal, vec3(0.0, 0.0, 1.0));
        vec3 waterColor = mix(vec3(0.0, 0.2, 0.4), vec3(0.0, 0.5, 0.8), intensity);
        gl_FragColor = vec4(waterColor, 1.0);
      }
    `,
    transparent: false,
  });
  
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2;  // Lower the water by 2 units
  scene.add(water);
  
  return { mesh: water, material: waterMaterial };
}

/**
 * Creates a procedural sky with gradient effect
 * @param {THREE.Scene} scene - The scene to add the sky to
 * @returns {THREE.Mesh} The sky mesh
 */
export function createSky(scene) {
  const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide, // Render inside of the sphere
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        // Create a smooth vertical gradient
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `
  });
  
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
  
  return sky;
}