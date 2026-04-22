import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2000),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );

  road.rotation.x = -Math.PI / 2;
  scene.add(road);

  // Example obstacle
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  box.position.set(2, 0.5, -20);
  scene.add(box);

  obstacles.push(box);

  return obstacles;
};