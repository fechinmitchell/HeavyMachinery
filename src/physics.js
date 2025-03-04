import * as CANNON from 'cannon-es';

export function initPhysics() {
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  return world;
}

export function updatePhysics(world) {
  world.step(1 / 60);
}