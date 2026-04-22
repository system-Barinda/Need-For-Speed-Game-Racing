import * as THREE from 'three';

export const createCar = (scene: THREE.Scene) => {
  const car = new THREE.Group();
  scene.add(car);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 4),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );

  body.position.y = 0.6;
  car.add(body);

  const tires: THREE.Mesh[] = [];

  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  [-1, 1].forEach((x) => {
    [-1.5, 1.5].forEach((z) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.3, z);
      car.add(wheel);
      tires.push(wheel);
    });
  });

  return { car, carBody: body, tires };
};