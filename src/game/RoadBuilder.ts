import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── ROAD ─────────────────────────────
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 2000),
    new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.9,
    })
  );

  road.rotation.x = -Math.PI / 2;
  scene.add(road);

  // ── ROAD LINES (CENTER) ──────────────
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = -1000; i < 1000; i += 10) {
    const dash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 4),
      lineMaterial
    );
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.01, i);
    scene.add(dash);
  }

  // ── SIDE GRASS ───────────────────────
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 2000),
    new THREE.MeshStandardMaterial({ color: 0x228822 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  scene.add(grass);

  // ── OBSTACLES ────────────────────────
  for (let i = 0; i < 10; i++) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );

    box.position.set(
      (Math.random() - 0.5) * 10,
      0.5,
      -50 - i * 50
    );

    scene.add(box);
    obstacles.push(box);
  }

  return obstacles;
};