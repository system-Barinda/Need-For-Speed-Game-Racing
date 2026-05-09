import * as THREE from "three";

export const createCar = (scene: THREE.Scene) => {
  const car = new THREE.Group();
  scene.add(car);

  // ================= MATERIALS =================
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xff2222,
    metalness: 0.85,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.45,
    roughness: 0,
    metalness: 0.2,
    transmission: 0.9,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.95,
    metalness: 0.05,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 1,
    roughness: 0.2,
  });

  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.3,
    roughness: 0.6,
  });

  // ================= MAIN BODY =================

  // Lower body
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.45, 4.5),
    bodyMat
  );
  base.position.y = 0.35;
  base.castShadow = true;
  base.receiveShadow = true;
  car.add(base);

  // Upper body
  const upperBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.4, 3.3),
    bodyMat
  );
  upperBody.position.set(0, 0.72, -0.15);
  upperBody.castShadow = true;
  car.add(upperBody);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.28, 1.8),
    bodyMat
  );
  roof.position.set(0, 1.08, -0.25);
  roof.castShadow = true;
  car.add(roof);

  // Front hood slope
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.18, 1.1),
    bodyMat
  );
  hood.position.set(0, 0.62, 1.55);
  hood.rotation.x = -0.12;
  hood.castShadow = true;
  car.add(hood);

  // Rear slope
  const rearSlope = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.2, 0.9),
    bodyMat
  );
  rearSlope.position.set(0, 0.65, -1.85);
  rearSlope.rotation.x = 0.18;
  rearSlope.castShadow = true;
  car.add(rearSlope);

  // ================= WINDOWS =================

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.45, 0.05),
    glassMat
  );
  windshield.position.set(0, 0.98, 0.6);
  windshield.rotation.x = -0.65;
  car.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 0.38, 0.05),
    glassMat
  );
  rearGlass.position.set(0, 0.95, -1.1);
  rearGlass.rotation.x = 0.55;
  car.add(rearGlass);

  [-0.78, 0.78].forEach((x) => {
    const sideWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.38, 1.4),
      glassMat
    );

    sideWindow.position.set(x, 0.95, -0.2);
    car.add(sideWindow);
  });

  // ================= FRONT DETAILS =================

  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.22, 0.08),
    blackMat
  );
  grille.position.set(0, 0.35, 2.27);
  car.add(grille);

  // Headlights
  [-0.7, 0.7].forEach((x) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffeeaa,
        emissiveIntensity: 1.2,
      })
    );

    light.position.set(x, 0.42, 2.26);
    car.add(light);
  });

  // ================= REAR LIGHTS =================

  [-0.7, 0.7].forEach((x) => {
    const rearLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.12, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xff2200,
        emissive: 0xff0000,
        emissiveIntensity: 1,
      })
    );

    rearLight.position.set(x, 0.38, -2.25);
    car.add(rearLight);
  });

  // ================= WHEELS =================

  const tires: THREE.Mesh[] = [];

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.42, 32);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.44, 24);

  const wheelPositions: [number, number][] = [
    [-1.02, 1.45],
    [1.02, 1.45],
    [-1.02, -1.45],
    [1.02, -1.45],
  ];

  wheelPositions.forEach(([x, z]) => {
    const wheelGroup = new THREE.Group();

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;

    // Rim ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.03, 12, 32),
      rimMat
    );

    ring.rotation.y = Math.PI / 2;

    wheelGroup.add(tire);
    wheelGroup.add(rim);
    wheelGroup.add(ring);

    wheelGroup.position.set(x, 0.38, z);

    car.add(wheelGroup);

    tires.push(tire);
  });

  // ================= SIDE SKIRTS =================

  [-1.03, 1.03].forEach((x) => {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.12, 3),
      blackMat
    );

    skirt.position.set(x, 0.18, 0);
    car.add(skirt);
  });

  // ================= SPOILER =================

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.08, 0.18),
    blackMat
  );

  spoiler.position.set(0, 1.0, -2.0);
  car.add(spoiler);

  [-0.55, 0.55].forEach((x) => {
    const support = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.08),
      blackMat
    );

    support.position.set(x, 0.86, -2.0);
    car.add(support);
  });

  // ================= EXHAUST =================

  [-0.45, 0.45].forEach((x) => {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.28, 10),
      rimMat
    );

    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x, 0.18, -2.2);

    car.add(exhaust);
  });

  // ================= MIRRORS =================

  [-0.92, 0.92].forEach((x) => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.08),
      blackMat
    );

    mirror.position.set(x, 0.88, 0.45);

    car.add(mirror);
  });

  // ================= LANE SYSTEM =================

  const lanes = [-2.5, 0, 2.5];

  let currentLane = 1;
  let targetX = lanes[currentLane];

  const moveLeft = () => {
    currentLane = Math.max(0, currentLane - 1);
    targetX = lanes[currentLane];
  };

  const moveRight = () => {
    currentLane = Math.min(lanes.length - 1, currentLane + 1);
    targetX = lanes[currentLane];
  };

  const moveToLane = (laneIndex: number) => {
    currentLane = Math.max(
      0,
      Math.min(lanes.length - 1, laneIndex)
    );

    targetX = lanes[currentLane];
  };

  const update = () => {
    car.position.x += (targetX - car.position.x) * 0.12;

    // small tilt while moving
    const tilt = (targetX - car.position.x) * 0.08;
    car.rotation.z = tilt;
  };

  // Initial position
  car.position.set(lanes[currentLane], 0, 0);

  return {
    car,
    tires,
    moveLeft,
    moveRight,
    moveToLane,
    update,
    getCurrentLane: () => currentLane,
    getLanes: () => lanes,
  };
};