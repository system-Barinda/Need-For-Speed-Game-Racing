import * as THREE from 'three';

export const createCar = (scene: THREE.Scene) => {
  const car = new THREE.Group();
  scene.add(car);

  // MATERIALS
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    roughness: 0.4,
    metalness: 0.6,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccee,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.6,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    metalness: 1,
    roughness: 0.2,
  });

  // ── LOWER BODY ───────────────────────
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 4.2), bodyMat);
  lowerBody.position.y = 0.4;

  lowerBody.castShadow = true;
  car.add(lowerBody);

  // ── CABIN ────────────────────────────
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), bodyMat);
  cabin.position.set(0, 0.95, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  // ── WINDSHIELD (FRONT) ───────────────
  const windshield = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.5),
    glassMat
  );
  windshield.position.set(0, 0.95, 1.1);
  windshield.rotation.x = -Math.PI * 0.2;
  car.add(windshield);

  // ── REAR WINDOW ──────────────────────
  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), glassMat);
  rearGlass.position.set(0, 0.95, -1.3);
  rearGlass.rotation.x = Math.PI * 0.2;
  car.add(rearGlass);

  // ── SIDE WINDOWS ─────────────────────
  [-0.9, 0.9].forEach((x) => {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.45), glassMat);
    side.position.set(x, 0.95, -0.2);
    side.rotation.y = Math.PI / 2;
    car.add(side);
  });

  // ── FRONT BUMPER ─────────────────────
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.2, 0.15),
    chromeMat
  );
  bumper.position.set(0, 0.2, 2.15);
  car.add(bumper);

  // ── GRILLE ───────────────────────────
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.25, 0.05),
    darkMat
  );
  grille.position.set(0, 0.4, 2.2);
  car.add(grille);

  // ── HEADLIGHTS ───────────────────────
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: new THREE.Color(0xffffaa),
    emissiveIntensity: 1.2,
  });

  [-0.7, 0.7].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.15, 0.1),
      headMat
    );
    light.position.set(x, 0.45, 2.15);
    car.add(light);
  });

  // ── TAILLIGHTS ───────────────────────
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff2200,
    emissive: new THREE.Color(0xff0000),
    emissiveIntensity: 0.8,
  });

  [-0.7, 0.7].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.1),
      tailMat
    );
    light.position.set(x, 0.45, -2.15);
    car.add(light);
  });

  // ── WHEELS ───────────────────────────
  const tires: THREE.Mesh[] = [];

  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 20);
  const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.32, 10);

  const wheelPositions: [number, number][] = [
    [-0.95, 1.4],
    [0.95, 1.4],
    [-0.95, -1.4],
    [0.95, -1.4],
  ];

  wheelPositions.forEach(([x, z]) => {
    const group = new THREE.Group();

    const tire = new THREE.Mesh(wheelGeo, darkMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    group.add(tire);

    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.rotation.z = Math.PI / 2;
    group.add(hub);

    group.position.set(x, 0.35, z);
    car.add(group);

    tires.push(tire);
  });

  car.position.set(0, 0, 0);

  return {
    car,
    carBody: lowerBody,
    tires,
  };
};
