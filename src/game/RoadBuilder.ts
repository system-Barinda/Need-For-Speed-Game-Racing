import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];
  const trafficCars: any[] = [];

  // ── SETTINGS ─────────────────────────
  const LANE_WIDTH = 3.5;
  const LANES = 3;
  const ROAD_WIDTH = LANE_WIDTH * LANES;
  const SEGMENTS = 400;
  const SHOULDER_WIDTH = 1.5;

  // ── MAIN CURVE ───────────────────────
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -60),
    new THREE.Vector3(15, 0, -120),
    new THREE.Vector3(25, 0, -180),
    new THREE.Vector3(0, 0, -250),
    new THREE.Vector3(-25, 0, -320),
    new THREE.Vector3(-10, 0, -400),
    new THREE.Vector3(0, 0, -500),
  ];

  const curve = new THREE.CatmullRomCurve3(points);

  // ✅ FIX: use proper Frenet Frames
  const frames = curve.computeFrenetFrames(SEGMENTS, false);

  const getFrame = (t: number) => {
    const i = Math.min(Math.floor(t * SEGMENTS), SEGMENTS - 1);

    const point = curve.getPoint(t);
    const tangent = frames.tangents[i];
    const normal = frames.normals[i];

    return { point, tangent, normal };
  };

  // ── ROAD GEOMETRY ────────────────────
  const roadGeo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const { point, normal } = getFrame(t);

    const left = point.clone().add(normal.clone().multiplyScalar(ROAD_WIDTH / 2));
    const right = point.clone().add(normal.clone().multiplyScalar(-ROAD_WIDTH / 2));

    left.y += 0.02;
    right.y += 0.02;

    verts.push(left.x, left.y, left.z);
    verts.push(right.x, right.y, right.z);

    if (i < SEGMENTS) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  roadGeo.setIndex(idx);
  roadGeo.computeVertexNormals();

  const road = new THREE.Mesh(
    roadGeo,
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.9 })
  );
  scene.add(road);

  // ── TRAFFIC CAR BUILDER ──────────────
  const buildCar = (color: number) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 4),
      new THREE.MeshStandardMaterial({ color })
    );
    car.castShadow = true;
    return car;
  };

  const carColors = [0xff0000, 0x0000ff, 0x00ff00];

  // ── SPAWN TRAFFIC ────────────────────
  for (let i = 20; i < SEGMENTS - 10; i += 20) {
    const t = i / SEGMENTS;
    const lane = Math.floor(Math.random() * LANES);

    const car = buildCar(carColors[Math.floor(Math.random() * carColors.length)]);
    scene.add(car);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(proxy);
    obstacles.push(proxy);

    trafficCars.push({
      mesh: car,
      proxy,
      t,
      speed: 0.0005,
      lane,
    });
  }

  // ── UPDATE TRAFFIC ───────────────────
  const updateTraffic = () => {
    for (const car of trafficCars) {
      car.t += car.speed;
      if (car.t > 1) car.t = 0.05;

      const { point, tangent, normal } = getFrame(car.t);

      // ✅ FIX: proper lane centering
      const laneCenterOffset = (-ROAD_WIDTH / 2) + (LANE_WIDTH / 2);
      const laneOffset = laneCenterOffset + car.lane * LANE_WIDTH;

      const pos = point.clone().add(normal.clone().multiplyScalar(laneOffset));
      pos.y = 0.5;

      car.mesh.position.copy(pos);
      car.proxy.position.copy(pos);

      // ✅ FIX: stable rotation
      const angle = Math.atan2(tangent.x, tangent.z);
      car.mesh.rotation.y = angle;
      car.proxy.rotation.y = angle;
    }
  };

  return {
    obstacles,
    curve,
    trafficCars,
    LANES,
    LANE_WIDTH,
    ROAD_WIDTH,
    updateTraffic,
  };
};