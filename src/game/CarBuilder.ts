import * as THREE from 'three';

export const createCar = (scene: THREE.Scene) => {
  const car = new THREE.Group();
  scene.add(car);

  // ================= MATERIALS =================
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    roughness: 0.3,
    metalness: 0.7,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88ccee,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.3,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.7,
    metalness: 0.2,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.95,
    roughness: 0.15,
  });

  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffaa66,
    emissive: 0xff4400,
    emissiveIntensity: 0.6,
  });

  // ================= BODY (Improved proportions) =================
  // Main lower body
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 4.0), bodyMat);
  lowerBody.position.y = 0.25;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  car.add(lowerBody);

  // Mid body (sports car look)
  const midBody = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 3.6), bodyMat);
  midBody.position.set(0, 0.55, -0.1);
  midBody.castShadow = true;
  car.add(midBody);

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), bodyMat);
  cabin.position.set(0, 0.88, -0.3);
  cabin.castShadow = true;
  car.add(cabin);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.8), bodyMat);
  roof.position.set(0, 1.15, -0.3);
  roof.castShadow = true;
  car.add(roof);

  // ================= GLASS =================
  // Front windshield
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.32, 0.05),
    glassMat
  );
  windshield.position.set(0, 1.02, 0.85);
  windshield.castShadow = true;
  car.add(windshield);

  // Rear windshield
  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.32, 0.05),
    glassMat
  );
  rearGlass.position.set(0, 1.02, -1.35);
  rearGlass.castShadow = true;
  car.add(rearGlass);

  // Side windows
  [-0.78, 0.78].forEach((x) => {
    const sideGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.38, 1.5),
      glassMat
    );
    sideGlass.position.set(x, 0.98, -0.35);
    sideGlass.castShadow = true;
    car.add(sideGlass);
  });

  // ================= LIGHTS =================
  // Headlights
  [-0.68, 0.68].forEach((x) => {
    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16),
      lightMat
    );
    headlight.position.set(x, 0.3, 2.05);
    headlight.castShadow = true;
    car.add(headlight);
    
    // Headlight glass
    const lightGlass = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffaa44, emissiveIntensity: 0.8 })
    );
    lightGlass.position.set(x, 0.3, 2.07);
    car.add(lightGlass);
  });

  // Taillights
  [-0.68, 0.68].forEach((x) => {
    const taillight = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.14, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 0.7 })
    );
    taillight.position.set(x, 0.32, -2.05);
    taillight.castShadow = true;
    car.add(taillight);
  });

  // Fog lights
  [-0.55, 0.55].forEach((x) => {
    const fogLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffaa66, emissive: 0xff6600, emissiveIntensity: 0.4 })
    );
    fogLight.position.set(x, 0.18, 2.02);
    car.add(fogLight);
  });

  // ================= WHEELS (FIXED - No rotation needed!) =================
  const tires: THREE.Mesh[] = [];

  // Wheel geometry - Cylinder stands upright by default (no rotation needed)
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.55, 24);
  const hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.57, 12);

  // Wheel positions: [x, z]
  const wheelPositions: [number, number][] = [
    [-0.88, 1.25],   // Front Left
    [0.88, 1.25],    // Front Right
    [-0.88, -1.35],  // Rear Left
    [0.88, -1.35],   // Rear Right
  ];

  wheelPositions.forEach(([x, z]) => {
    const wheelGroup = new THREE.Group();

    // Tire - NO rotation! Cylinder stands upright naturally
    const tire = new THREE.Mesh(wheelGeo, darkMat);
    tire.castShadow = true;
    tire.receiveShadow = true;
    wheelGroup.add(tire);

    // Hubcap - also upright
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    hub.castShadow = true;
    wheelGroup.add(hub);

    // Add rim details (spokes effect)
    const rimRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.03, 16, 32),
      chromeMat
    );
    rimRing.rotation.x = Math.PI / 2;
    rimRing.position.y = 0;
    wheelGroup.add(rimRing);

    wheelGroup.position.set(x, 0.28, z);
    car.add(wheelGroup);

    tires.push(tire);
  });

  // ================= ADDITIONAL DETAILS =================
  // Front grille
  const grille = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.22, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.3 })
  );
  grille.position.set(0, 0.28, 2.08);
  car.add(grille);

  // Grille details (horizontal lines)
  for (let i = -0.35; i <= 0.35; i += 0.35) {
    const grilleLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 })
    );
    grilleLine.position.set(0, 0.28 + i, 2.11);
    car.add(grilleLine);
  }

  // Hood scoop
  const hoodScoop = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.08, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
  );
  hoodScoop.position.set(0, 0.55, 1.05);
  car.add(hoodScoop);

  // Side skirts
  [-0.96, 0.96].forEach((x) => {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4 })
    );
    skirt.position.set(x, 0.18, -0.15);
    skirt.castShadow = true;
    car.add(skirt);
  });

  // Rear spoiler
  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 })
  );
  spoiler.position.set(0, 0.95, -1.65);
  car.add(spoiler);

  // Spoiler supports
  [-0.55, 0.55].forEach((x) => {
    const support = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.25, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
    );
    support.position.set(x, 0.78, -1.65);
    car.add(support);
  });

  // Exhaust pipes
  [-0.65, 0.65].forEach((x) => {
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.25, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 })
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x, 0.18, -1.95);
    car.add(exhaust);
  });

  // Mirrors
  [-0.85, 0.85].forEach((x) => {
    const mirror = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.08),
      chromeMat
    );
    mirror.position.set(x, 0.85, 0.45);
    car.add(mirror);
  });

  // ================= LANE SYSTEM =================
  const lanes = [-2.5, 0, 2.5]; // Match road width
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
    currentLane = Math.max(0, Math.min(lanes.length - 1, laneIndex));
    targetX = lanes[currentLane];
  };

  const update = () => {
    car.position.x += (targetX - car.position.x) * 0.15;
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