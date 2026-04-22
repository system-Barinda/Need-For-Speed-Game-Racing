import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── CONFIG ───────────────────────────
  const ROAD_LENGTH = 2000;
  const LANE_WIDTH = 3;
  const LANES = 3;
  const ROAD_WIDTH = LANE_WIDTH * LANES;

  // ── ROAD BASE ────────────────────────
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
    new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.9,
    })
  );

  road.rotation.x = -Math.PI / 2;
  scene.add(road);

  // ── LANE DASHED LINES ────────────────
  const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let lane = 1; lane < LANES; lane++) {
    const x = -ROAD_WIDTH / 2 + lane * LANE_WIDTH;

    for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += 12) {
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 5),
        dashMaterial
      );

      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, z);
      scene.add(dash);
    }
  }

  // ── SIDE SOLID LINES ─────────────────
  const sideLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

  [-ROAD_WIDTH / 2, ROAD_WIDTH / 2].forEach((x) => {
    for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += 8) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 6),
        sideLineMaterial
      );

      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, z);
      scene.add(line);
    }
  });

  // ── ROAD SHOULDERS ───────────────────
  const shoulderMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
  });

  const shoulderWidth = 2;

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(
      new THREE.PlaneGeometry(shoulderWidth, ROAD_LENGTH),
      shoulderMaterial
    );

    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(
      side * (ROAD_WIDTH / 2 + shoulderWidth / 2),
      0.01,
      0
    );

    scene.add(shoulder);
  });

  // ── GRASS ENVIRONMENT ────────────────
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(300, ROAD_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0x1f7a1f })
  );

  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.05;
  scene.add(grass);

  // ── OBSTACLES (cars / blocks) ───────
  for (let i = 0; i < 15; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1, 3),
      new THREE.MeshStandardMaterial({ color: 0xff3333 })
    );

    const laneIndex = Math.floor(Math.random() * LANES);
    const x =
      -ROAD_WIDTH / 2 +
      laneIndex * LANE_WIDTH +
      LANE_WIDTH / 2;

    box.position.set(x, 0.5, -50 - i * 60);

    scene.add(box);
    obstacles.push(box);
  }

  return obstacles;
};