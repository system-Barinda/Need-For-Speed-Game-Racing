import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];
  const trafficCars: THREE.Mesh[] = [];

  // ── SETTINGS ─────────────────────────
  const LANE_WIDTH = 3;
  const LANES = 3;
  const ROAD_WIDTH = LANE_WIDTH * LANES; // 9
  const SEGMENTS = 300;

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

  // ── ROAD GEOMETRY ────────────────────
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;

    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const left = point
      .clone()
      .add(normal.clone().multiplyScalar(ROAD_WIDTH / 2));
    const right = point
      .clone()
      .add(normal.clone().multiplyScalar(-ROAD_WIDTH / 2));

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    if (i < SEGMENTS) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const road = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      side: THREE.DoubleSide,
    })
  );

  scene.add(road);

  // ── LANE MARKINGS ────────────────────
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let lane = 1; lane < LANES; lane++) {
    const laneOffset = -ROAD_WIDTH / 2 + lane * LANE_WIDTH;

    for (let i = 0; i < SEGMENTS; i += 6) {
      const t = i / SEGMENTS;

      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const lanePos = point
        .clone()
        .add(normal.clone().multiplyScalar(laneOffset));

      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2), dashMat);

      dash.rotation.x = -Math.PI / 2;
      dash.position.copy(lanePos);
      dash.position.y = 0.05;

      scene.add(dash);
    }
  }

  // ── ROAD BORDERS ─────────────────────
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  for (let i = 0; i < SEGMENTS; i += 2) {
    const t = i / SEGMENTS;

    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const left = point
      .clone()
      .add(normal.clone().multiplyScalar(ROAD_WIDTH / 2));
    const right = point
      .clone()
      .add(normal.clone().multiplyScalar(-ROAD_WIDTH / 2));

    [left, right].forEach((pos) => {
      const border = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 2),
        borderMat
      );

      border.position.copy(pos);
      border.position.y = 0.1;

      scene.add(border);
    });
  }

  // ── TRAFFIC (AI CARS FOR OVERTAKING) ─
  const trafficMat = new THREE.MeshStandardMaterial({ color: 0x00aaff });

  for (let i = 20; i < SEGMENTS; i += 30) {
    const t = i / SEGMENTS;

    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // random lane
    const laneIndex = Math.floor(Math.random() * LANES);
    const laneOffset =
      -ROAD_WIDTH / 2 + laneIndex * LANE_WIDTH + LANE_WIDTH / 2;

    const pos = point.clone().add(normal.multiplyScalar(laneOffset));

    const car = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 3), trafficMat);

    car.position.copy(pos);
    car.position.y = 0.4;

    // rotate with road
    car.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    scene.add(car);
    trafficCars.push(car);
    obstacles.push(car); // 👈 collision
  }

  // ── TREES ────────────────────────────
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x228833 });

  for (let i = 0; i < 150; i++) {
    const t = Math.random();
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const offset = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 20);

    const tree = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4, 8), treeMat);

    tree.position.copy(point.clone().add(normal.multiplyScalar(offset)));
    tree.position.y = 2;

    scene.add(tree);
  }

  // ── MOUNTAINS ────────────────────────
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x555555 });

  for (let i = 0; i < 50; i++) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(12, 25, 4),
      mountainMat
    );

    mountain.position.set(
      (Math.random() - 0.5) * 400,
      12,
      -Math.random() * 800
    );

    scene.add(mountain);
  }

  // ── RETURN ───────────────────────────
  return {
    obstacles,
    curve,
    trafficCars, // 👈 for future AI movement
  };
};
