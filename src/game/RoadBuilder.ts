import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── ROAD SETTINGS ────────────────────
  const ROAD_WIDTH = 9;
  const SEGMENTS = 200;

  // ── DEFINE CURVE PATH ────────────────
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -50),
    new THREE.Vector3(10, 0, -100),   // turn right
    new THREE.Vector3(20, 0, -150),
    new THREE.Vector3(0, 0, -200),    // turn left
    new THREE.Vector3(-20, 0, -250),
    new THREE.Vector3(-10, 0, -300),
    new THREE.Vector3(0, 0, -350),
  ];

  const curve = new THREE.CatmullRomCurve3(points);

  // ── CREATE ROAD GEOMETRY ─────────────
  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;

    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    // perpendicular direction
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

  // ── ADD LANE LINES ───────────────────
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

  // ── OBSTACLES ON CURVE ───────────────
  for (let i = 10; i < SEGMENTS; i += 20) {
    const t = i / SEGMENTS;
    const point = curve.getPoint(t);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 3),
      new THREE.MeshStandardMaterial({ color: 0xff3333 })
    );

    box.position.set(point.x, 0.5, point.z);

    scene.add(box);
    obstacles.push(box);
  }

  return obstacles;
};