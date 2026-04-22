import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── SETTINGS ─────────────────────────
  const ROAD_WIDTH = 9;
  const SEGMENTS = 200;

  // ── MAIN CURVE ───────────────────────
  const mainPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -50),
    new THREE.Vector3(10, 0, -100),
    new THREE.Vector3(20, 0, -150),
    new THREE.Vector3(0, 0, -200),
    new THREE.Vector3(-20, 0, -250),
    new THREE.Vector3(-10, 0, -300),
    new THREE.Vector3(0, 0, -350),
  ];

  const mainCurve = new THREE.CatmullRomCurve3(mainPoints);

  // ── ALTERNATIVE CURVE ────────────────
  const altPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-10, 0, -60),
    new THREE.Vector3(-25, 0, -120),
    new THREE.Vector3(-10, 0, -180),
    new THREE.Vector3(10, 0, -240),
    new THREE.Vector3(0, 0, -350),
  ];

  const altCurve = new THREE.CatmullRomCurve3(altPoints);

  // ── FUNCTION TO BUILD ROAD ───────────
  const createRoadFromCurve = (curve: THREE.CatmullRomCurve3) => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;

      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const left = point.clone().add(normal.clone().multiplyScalar(ROAD_WIDTH / 2));
      const right = point.clone().add(normal.clone().multiplyScalar(-ROAD_WIDTH / 2));

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

    const material = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      side: THREE.DoubleSide,
    });

    const road = new THREE.Mesh(geometry, material);
    scene.add(road);

    // ── LANE DASHES ──
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < SEGMENTS; i += 5) {
      const t = i / SEGMENTS;
      const point = curve.getPoint(t);

      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 3),
        lineMaterial
      );

      dash.rotation.x = -Math.PI / 2;
      dash.position.set(point.x, 0.05, point.z);
      scene.add(dash);
    }
  };

  // ── BUILD ROADS ──────────────────────
  createRoadFromCurve(mainCurve);
  createRoadFromCurve(altCurve);

  // ── OBSTACLES (MAIN ROAD) ────────────
  for (let i = 10; i < SEGMENTS; i += 20) {
    const t = i / SEGMENTS;
    const point = mainCurve.getPoint(t);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 3),
      new THREE.MeshStandardMaterial({ color: 0xff3333 })
    );

    box.position.set(point.x, 0.5, point.z);
    scene.add(box);
    obstacles.push(box);
  }

  // ── TREES ────────────────────────────
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x228833 });

  for (let i = 0; i < 120; i++) {
    const t = Math.random();
    const point = mainCurve.getPoint(t);
    const tangent = mainCurve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const offset = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 15);

    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 4, 8),
      treeMat
    );

    tree.position.copy(point.clone().add(normal.multiplyScalar(offset)));
    tree.position.y = 2;

    scene.add(tree);
  }

  // ── MOUNTAINS ────────────────────────
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x555555 });

  for (let i = 0; i < 40; i++) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(10, 20, 4),
      mountainMat
    );

    mountain.position.set(
      (Math.random() - 0.5) * 300,
      10,
      -Math.random() * 600
    );

    scene.add(mountain);
  }

  // ✅ FIXED RETURN
  return {
    obstacles,
    curve: mainCurve,   // main road for car
    altCurve: altCurve, // optional second route
  };
};