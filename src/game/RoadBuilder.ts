import * as THREE from 'three';
import { TrafficSystem } from './TrafficSystem';

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

  // ── HELPER: Get frenet frame ──────────
  const getFrame = (t: number) => {
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    return { point, tangent, normal };
  };

  // ── TERRAIN BASE ─────────────────────
  const terrainGeo = new THREE.PlaneGeometry(800, 800, 80, 80);
  const terrainPos = terrainGeo.attributes.position;
  for (let i = 0; i < terrainPos.count; i++) {
    const x = terrainPos.getX(i);
    const z = terrainPos.getZ(i);
    const height =
      Math.sin(x * 0.02) * 2 +
      Math.cos(z * 0.015) * 1.5 +
      Math.sin((x + z) * 0.01) * 1;
    terrainPos.setY(i, height - 0.5);
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x4a7a3a,
    roughness: 0.95,
    metalness: 0.0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(0, -0.6, -300);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ── ROAD SHOULDER (dirt/gravel strip) ─
  const buildShoulder = (side: number) => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const { point, normal } = getFrame(t);

      const inner = ROAD_WIDTH / 2;
      const outer = inner + SHOULDER_WIDTH;

      const p1 = point.clone().add(normal.clone().multiplyScalar(side * inner));
      const p2 = point.clone().add(normal.clone().multiplyScalar(side * outer));

      p1.y += 0.01;
      p2.y -= 0.05;

      verts.push(p1.x, p1.y, p1.z);
      verts.push(p2.x, p2.y, p2.z);

      if (i < SEGMENTS) {
        const b = i * 2;
        if (side > 0) {
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        } else {
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0x9b8b6e, roughness: 1 })
    );
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  buildShoulder(1);
  buildShoulder(-1);

  // ── MAIN ROAD GEOMETRY ───────────────
  const roadGeo = new THREE.BufferGeometry();
  const roadVerts: number[] = [];
  const roadIdx: number[] = [];
  const roadUVs: number[] = [];

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const { point, normal } = getFrame(t);

    const left = point.clone().add(normal.clone().multiplyScalar(ROAD_WIDTH / 2));
    const right = point.clone().add(normal.clone().multiplyScalar(-ROAD_WIDTH / 2));

    left.y += 0.02;
    right.y += 0.02;

    roadVerts.push(left.x, left.y, left.z);
    roadVerts.push(right.x, right.y, right.z);

    roadUVs.push(0, t * 20);
    roadUVs.push(1, t * 20);

    if (i < SEGMENTS) {
      const b = i * 2;
      roadIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs, 2));
  roadGeo.setIndex(roadIdx);
  roadGeo.computeVertexNormals();

  // Asphalt texture via canvas
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 256;
  asphaltCanvas.height = 256;
  const ctx = asphaltCanvas.getContext('2d')!;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const gray = Math.floor(Math.random() * 30 + 20);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.wrapT = THREE.RepeatWrapping;

  const road = new THREE.Mesh(
    roadGeo,
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.9,
      metalness: 0.05,
    })
  );
  road.receiveShadow = true;
  scene.add(road);

  // ── ROAD EDGE CURBS ───────────────────
  const buildCurb = (side: number) => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const idx: number[] = [];
    const offset = (ROAD_WIDTH / 2) * side;

    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const { point, normal } = getFrame(t);

      const base = point.clone().add(normal.clone().multiplyScalar(offset));
      const top = base.clone();
      top.y += 0.12;

      const inner = base.clone().add(normal.clone().multiplyScalar(side * -0.15));
      const topInner = inner.clone();
      topInner.y += 0.12;

      verts.push(inner.x, inner.y, inner.z);
      verts.push(top.x, top.y, top.z);

      if (i < SEGMENTS) {
        const b = i * 2;
        if (side > 0) {
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        } else {
          idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        }
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: 0xccccbb, roughness: 0.8 })
    );
    scene.add(mesh);
  };

  buildCurb(1);
  buildCurb(-1);

  // ── LANE MARKINGS ────────────────────
  // Center solid yellow double-line
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf5d020 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Dashed white lane dividers
  for (let lane = 1; lane < LANES; lane++) {
    const laneOffset = -ROAD_WIDTH / 2 + lane * LANE_WIDTH;

    for (let i = 0; i < SEGMENTS - 1; i += 5) {
      const t = i / SEGMENTS;
      const { point, tangent, normal } = getFrame(t);

      const lanePos = point.clone().add(normal.clone().multiplyScalar(laneOffset));

      // Orient dash along road tangent
      const dashGeo = new THREE.PlaneGeometry(0.25, 2.5);
      const dash = new THREE.Mesh(dashGeo, whiteMat);
      dash.position.copy(lanePos);
      dash.position.y = 0.03;

      const angle = Math.atan2(tangent.x, tangent.z);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;

      scene.add(dash);
    }
  }

  // Solid center yellow double line
  for (let offset of [-0.15, 0.15]) {
    for (let i = 0; i < SEGMENTS - 1; i += 1) {
      const t = i / SEGMENTS;
      const { point, tangent, normal } = getFrame(t);
      const p = point.clone().add(normal.clone().multiplyScalar(offset));
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.5), yellowMat);
      dash.position.copy(p);
      dash.position.y = 0.04;
      const angle = Math.atan2(tangent.x, tangent.z);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      scene.add(dash);
    }
  }

  // ── 🌲 REALISTIC TREES ───────────────
  const buildTree = (position: THREE.Vector3) => {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers (stacked cones for pine look)
    const leafColors = [0x1a5c2a, 0x1e6b30, 0x236b2a, 0x2d8040];
    const layers = 3 + Math.floor(Math.random() * 2);

    for (let l = 0; l < layers; l++) {
      const radius = 2.2 - l * 0.35;
      const height = 2.5 + l * 0.3;
      const y = 2.2 + l * 1.5;
      const color = leafColors[Math.floor(Math.random() * leafColors.length)];

      const leafGeo = new THREE.ConeGeometry(radius, height, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = y;
      leaf.castShadow = true;
      group.add(leaf);
    }

    // Random scale & slight tilt
    const scale = 0.7 + Math.random() * 0.7;
    group.scale.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    group.rotation.y = Math.random() * Math.PI * 2;

    group.position.copy(position);
    scene.add(group);
  };

  // Deciduous tree (round top)
  const buildDecTree = (position: THREE.Vector3) => {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 3, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e10, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);

    const crownColors = [0x2d7a3a, 0x3a8a40, 0x4a9a45, 0x336633];
    const numCrowns = 3 + Math.floor(Math.random() * 3);

    for (let c = 0; c < numCrowns; c++) {
      const r = 1.5 + Math.random() * 1.2;
      const color = crownColors[Math.floor(Math.random() * crownColors.length)];
      const crownGeo = new THREE.SphereGeometry(r, 8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(
        (Math.random() - 0.5) * 1.2,
        3 + c * 0.6 + Math.random() * 0.5,
        (Math.random() - 0.5) * 1.2
      );
      crown.castShadow = true;
      group.add(crown);
    }

    const scale = 0.6 + Math.random() * 0.6;
    group.scale.set(scale, scale, scale);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.position.copy(position);
    scene.add(group);
  };

  // Place trees along road
  for (let i = 0; i < SEGMENTS; i += 3) {
    const t = i / SEGMENTS;
    const { point, normal } = getFrame(t);

    for (const side of [1, -1]) {
      if (Math.random() < 0.6) {
        const dist = 14 + Math.random() * 22;
        const pos = point.clone().add(normal.clone().multiplyScalar(side * dist));
        pos.y = 0;

        if (Math.random() > 0.4) {
          buildTree(pos);
        } else {
          buildDecTree(pos);
        }
      }
    }
  }

  // ── ⛰️ REALISTIC MOUNTAINS ───────────
  const buildMountain = (x: number, z: number, baseRadius: number, height: number) => {
    const group = new THREE.Group();

    // Multi-layer mountain body
    const segments = 10 + Math.floor(Math.random() * 6);

    // Base rock layer
    const bodyGeo = new THREE.ConeGeometry(baseRadius, height * 0.85, segments);
    const bodyPos = bodyGeo.attributes.position;
    for (let i = 0; i < bodyPos.count; i++) {
      const y = bodyPos.getY(i);
      if (y < height * 0.5) {
        bodyPos.setX(i, bodyPos.getX(i) + (Math.random() - 0.5) * baseRadius * 0.12);
        bodyPos.setZ(i, bodyPos.getZ(i) + (Math.random() - 0.5) * baseRadius * 0.12);
      }
    }
    bodyGeo.computeVertexNormals();

    const rockColor = new THREE.Color(
      0.35 + Math.random() * 0.1,
      0.33 + Math.random() * 0.08,
      0.30 + Math.random() * 0.08
    );
    const bodyMat = new THREE.MeshStandardMaterial({
      color: rockColor,
      roughness: 1,
      metalness: 0,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = (height * 0.85) / 2;
    body.castShadow = true;
    group.add(body);

    // Snow cap
    const snowHeight = height * 0.28;
    const snowRadius = baseRadius * 0.3;
    const snowGeo = new THREE.ConeGeometry(snowRadius, snowHeight, segments);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      roughness: 0.5,
    });
    const snow = new THREE.Mesh(snowGeo, snowMat);
    snow.position.y = height * 0.85 - snowHeight * 0.1;
    snow.castShadow = true;
    group.add(snow);

    // Mid snow patches
    for (let p = 0; p < 4; p++) {
      const patchGeo = new THREE.SphereGeometry(snowRadius * 0.5, 6, 4);
      const patch = new THREE.Mesh(patchGeo, snowMat);
      const angle = (p / 4) * Math.PI * 2;
      patch.position.set(
        Math.cos(angle) * snowRadius * 0.8,
        height * 0.6 + Math.random() * height * 0.1,
        Math.sin(angle) * snowRadius * 0.8
      );
      group.add(patch);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group);
  };

  // Mountain ranges on both sides
  const mountainPositions = [
    { x: -180, z: -150, r: 45, h: 90 },
    { x: -220, z: -300, r: 55, h: 110 },
    { x: -160, z: -430, r: 40, h: 75 },
    { x: 190, z: -100, r: 50, h: 95 },
    { x: 230, z: -260, r: 60, h: 120 },
    { x: 180, z: -400, r: 42, h: 80 },
    { x: -100, z: -520, r: 65, h: 130 },
    { x: 100, z: -540, r: 50, h: 100 },
    { x: -250, z: -480, r: 35, h: 65 },
    { x: 260, z: -460, r: 45, h: 85 },
  ];

  for (const m of mountainPositions) {
    buildMountain(m.x, m.z, m.r, m.h);
    // Add smaller secondary peaks nearby
    for (let s = 0; s < 2; s++) {
      buildMountain(
        m.x + (Math.random() - 0.5) * m.r * 2,
        m.z + (Math.random() - 0.5) * m.r * 2,
        m.r * (0.4 + Math.random() * 0.35),
        m.h * (0.45 + Math.random() * 0.35)
      );
    }
  }

  // ── 🚗 REALISTIC TRAFFIC CARS ────────
  const carColors = [0xcc2200, 0x002299, 0x007744, 0xddaa00, 0x880088, 0x226699];

  const buildCar = (color: number): THREE.Group => {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: new THREE.Color(0xffff44),
      emissiveIntensity: 0.8,
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: new THREE.Color(0xff0000),
      emissiveIntensity: 0.5,
    });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.9 });

    // Main body lower
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.2), bodyMat);
    lower.position.y = 0.35;
    lower.castShadow = true;
    group.add(lower);

    // Cabin upper
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.55, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, bodyMat);
    cabin.position.set(0, 0.9, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshields
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), glassMat);
    windshield.position.set(0, 0.92, 0.98);
    windshield.rotation.x = -Math.PI * 0.15;
    group.add(windshield);

    const rearshield = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), glassMat);
    rearshield.position.set(0, 0.92, -1.18);
    rearshield.rotation.x = Math.PI * 0.15;
    group.add(rearshield);

    // Side windows
    for (const sx of [-0.86, 0.86]) {
      const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), glassMat);
      sideWin.position.set(sx, 0.92, -0.1);
      sideWin.rotation.y = Math.PI / 2;
      group.add(sideWin);
    }

    // Wheels (4 corners)
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelPositions = [
      [0.92, 0.35, 1.3],
      [-0.92, 0.35, 1.3],
      [0.92, 0.35, -1.3],
      [-0.92, 0.35, -1.3],
    ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);

      // Hubcap
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 8), chromeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      group.add(hub);
    }

    // Headlights
    for (const lx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), lightMat);
      hl.position.set(lx, 0.42, 2.1);
      group.add(hl);
    }

    // Taillights
    for (const lx of [-0.65, 0.65]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), tailMat);
      tl.position.set(lx, 0.42, -2.1);
      group.add(tl);
    }

    // Front bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.18, 0.12), chromeMat);
    bumper.position.set(0, 0.22, 2.12);
    group.add(bumper);

    // Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.06), darkMat);
    grille.position.set(0, 0.38, 2.13);
    group.add(grille);

    return group;
  };

  // ── 🏠 HOUSES ────────────────────────
  const buildHouse = (position: THREE.Vector3) => {
    const group = new THREE.Group();

    const wallColors = [0xcc9966, 0xddaa77, 0xbbaa88, 0xcc8855, 0xaa9977];
    const roofColors = [0x882200, 0x663311, 0x774422, 0x553300];

    const wallColor = wallColors[Math.floor(Math.random() * wallColors.length)];
    const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];

    const w = 5 + Math.random() * 3;
    const d = 5 + Math.random() * 3;
    const h = 3.5 + Math.random() * 1.5;

    // Walls
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = h / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof (prism)
    const roofGeo = new THREE.CylinderGeometry(0, w * 0.65, h * 0.6, 4, 1);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + (h * 0.6) / 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), doorMat);
    door.position.set(0, 0.9, d / 2 + 0.05);
    group.add(door);

    // Windows
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.7,
      emissive: new THREE.Color(0x445566),
      emissiveIntensity: 0.3,
    });
    for (const wx of [-w * 0.27, w * 0.27]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.1), winMat);
      win.position.set(wx, h * 0.55, d / 2 + 0.05);
      group.add(win);
    }

    group.position.copy(position);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);
  };

  for (let i = 0; i < 35; i++) {
    const t = Math.random();
    const { point, normal } = getFrame(t);
    const side = Math.random() > 0.5 ? 1 : -1;
    const dist = 28 + Math.random() * 40;
    const pos = point.clone().add(normal.clone().multiplyScalar(side * dist));
    pos.y = 0;
    buildHouse(pos);
  }

  // ── 💡 STREET LIGHTS ─────────────────
  for (let i = 0; i < SEGMENTS; i += 20) {
    const t = i / SEGMENTS;
    const { point, normal } = getFrame(t);

    for (const side of [1, -1]) {
      const base = point.clone().add(normal.clone().multiplyScalar(side * (ROAD_WIDTH / 2 + 0.8)));
      base.y = 0;

      const group = new THREE.Group();

      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 })
      );
      pole.position.y = 3;
      group.add(pole);

      // Arm
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.5 })
      );
      arm.rotation.z = Math.PI / 2;
      arm.position.set(side * 0.75, 6, 0);
      group.add(arm);

      // Light housing
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.4),
        new THREE.MeshStandardMaterial({
          color: 0xffffaa,
          emissive: new THREE.Color(0xffee88),
          emissiveIntensity: 1.2,
        })
      );
      lamp.position.set(side * 1.4, 5.9, 0);
      group.add(lamp);

      group.position.copy(base);
      scene.add(group);
    }
  }

  // ── UPDATE AI TRAFFIC ─────────────────
  // (called externally each frame)
  const updateTraffic = () => {
    for (const car of trafficCars) {
      car.t += car.speed;
      if (car.t > 1) car.t = 0.05;

      const t = car.t;
      const { point, tangent, normal } = getFrame(t);

      const laneOffset = -ROAD_WIDTH / 2 + (car.lane + 0.5) * LANE_WIDTH;
      const pos = point.clone().add(normal.clone().multiplyScalar(laneOffset));
      pos.y = 0.35;

      car.mesh.position.copy(pos);
      car.proxy.position.copy(pos);

      // Face direction of travel
      const lookTarget = pos.clone().add(tangent);
      car.mesh.lookAt(lookTarget);
      car.proxy.lookAt(lookTarget);
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