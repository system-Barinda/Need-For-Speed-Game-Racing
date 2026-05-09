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

  // Main chassis/base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.95, 0.35, 4.8),
    bodyMat
  );
  base.position.y = 0.3;
  base.castShadow = true;
  base.receiveShadow = true;
  car.add(base);

  // Front hood - longer and sloped
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.22, 1.5),
    bodyMat
  );
  hood.position.set(0, 0.45, 1.7);
  hood.rotation.x = -0.15;
  hood.castShadow = true;
  car.add(hood);

  // Upper cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.45, 2.2),
    bodyMat
  );
  cabin.position.set(0, 0.75, -0.1);
  cabin.castShadow = true;
  car.add(cabin);

  // Roof - tapered sides for racing style
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.25, 1.9),
    bodyMat
  );
  roof.position.set(0, 1.08, -0.15);
  roof.castShadow = true;
  car.add(roof);

  // Rear deck/trunk - sloped down
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.22, 0.95),
    bodyMat
  );
  trunk.position.set(0, 0.52, -1.95);
  trunk.rotation.x = 0.12;
  trunk.castShadow = true;
  car.add(trunk);

  // Front bumper - more prominent
  const frontBumper = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.15, 0.25),
    bodyMat
  );
  frontBumper.position.set(0, 0.25, 2.45);
  frontBumper.castShadow = true;
  car.add(frontBumper);

  // ================= WINDOWS =================

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.5, 0.08),
    glassMat
  );
  windshield.position.set(0, 1.0, 0.55);
  windshield.rotation.x = -0.7;
  car.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.42, 0.08),
    glassMat
  );
  rearGlass.position.set(0, 0.98, -1.3);
  rearGlass.rotation.x = 0.6;
  car.add(rearGlass);

  [-0.88, 0.88].forEach((x) => {
    const sideWindow = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.42, 1.6),
      glassMat
    );

    sideWindow.position.set(x, 0.98, -0.1);
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

  // Larger wheels with proper proportions
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.32, 32);
  const rimGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.35, 24);

  const wheelPositions: [number, number][] = [
    [-1.15, 1.3],   // Front left
    [1.15, 1.3],    // Front right
    [-1.15, -1.55], // Rear left
    [1.15, -1.55],  // Rear right
  ];

  wheelPositions.forEach(([x, z]) => {
    const wheelGroup = new THREE.Group();

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.castShadow = true;

    // Rim ring - larger and more visible
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.04, 16, 100),
      rimMat
    );

    ring.rotation.y = Math.PI / 2;
    ring.castShadow = true;

    // Inner rim details
    const innerRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.36, 24),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 })
    );
    innerRim.rotation.z = Math.PI / 2;

    wheelGroup.add(tire);
    wheelGroup.add(rim);
    wheelGroup.add(ring);
    wheelGroup.add(innerRim);

    wheelGroup.position.set(x, 0.3, z);

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