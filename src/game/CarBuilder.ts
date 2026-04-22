import * as THREE from 'three';

export const createCar = (scene: THREE.Scene) => {
  const car = new THREE.Group();
  scene.add(car);

  // ── Body ─────────────────────────────
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 4),
    new THREE.MeshStandardMaterial({ color: 0xff2200 })
  );
  body.position.y = 0.6;
  body.castShadow = true;
  car.add(body);

  // ── Cabin ────────────────────────────
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.5, 2),
    new THREE.MeshStandardMaterial({ color: 0xcc1100 })
  );
  cabin.position.set(0, 1.1, 0.2);
  cabin.castShadow = true;
  car.add(cabin);

  // ── Windshield ───────────────────────
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.4, 0.05),
    new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.6,
    })
  );
  glass.position.set(0, 1.1, 1.1);
  car.add(glass);

  // ── Headlights ───────────────────────
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffffaa,
    emissiveIntensity: 1,
  });

  [-0.6, 0.6].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.15, 0.05),
      headlightMat
    );
    light.position.set(x, 0.6, 2);
    car.add(light);
  });

  // ── Taillights ───────────────────────
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2200,
    emissiveIntensity: 0.8,
  });

  [-0.6, 0.6].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.15, 0.05),
      tailMat
    );
    light.position.set(x, 0.6, -2);
    car.add(light);
  });

  // ── Wheels ───────────────────────────
  const tires: THREE.Mesh[] = [];

  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.3, 8);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

  (
    [
      [-1, 1.3],
      [1, 1.3],
      [-1, -1.3],
      [1, -1.3],
    ] as [number, number][]
  ).forEach(([x, z]) => {
    const wheelGroup = new THREE.Group();

    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    wheelGroup.position.set(x * 0.95, 0.35, z);
    car.add(wheelGroup);

    tires.push(tire);
  });

  // ── Initial position ──────────────────
  car.position.set(0, 0, 0);

  return {
    car,
    carBody: body,
    tires,
  };
};
