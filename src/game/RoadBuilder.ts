import * as THREE from 'three';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── Ground ─────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 2000),
    new THREE.MeshStandardMaterial({ color: 0x4a8c3f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Main Road ──────────────────────────
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 2000),
    new THREE.MeshStandardMaterial({ color: 0x282828 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.receiveShadow = true;
  scene.add(road);

  // ── Center dashed lines ────────────────
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  for (let z = -1000; z < 1000; z += 12) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 6), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z);
    scene.add(dash);
  }

  // ── Edge lines ─────────────────────────
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  [-4.85, 4.85].forEach((x) => {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2000), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.02, 0);
    scene.add(edge);
  });

  // ── Trees (simple environment) ─────────
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a2d });

  for (let z = -900; z < 900; z += 20) {
    [-8, 8].forEach((side) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 1.5, 6),
        trunkMat
      );
      trunk.position.set(side, 0.75, z);
      scene.add(trunk);

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 2.5, 6),
        leafMat
      );
      leaves.position.set(side, 2.5, z);
      scene.add(leaves);
    });
  }

  // ── Obstacles ──────────────────────────
  const obsMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });

  for (let z = -200; z > -900; z -= 60) {
    [-3.5, 3.5].forEach((x) => {
      const obs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.2), obsMat);
      obs.position.set(x + (Math.random() - 0.5), 0.5, z);
      obs.castShadow = true;
      scene.add(obs);
      obstacles.push(obs);
    });
  }

  return obstacles;
};
