import * as THREE from 'three';
import { TrafficSystem } from './TrafficSystem';

export const buildRoads = (scene: THREE.Scene) => {
  const obstacles: THREE.Mesh[] = [];

  // ── SETTINGS ─────────────────────────
  const LANE_WIDTH = 2.5; // Adjusted to match car width
  const LANES = 3;
  const ROAD_WIDTH = LANE_WIDTH * LANES;
  const SEGMENTS = 400;
  const SHOULDER_WIDTH = 1.2;

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

  // ── ROAD SHOULDER ────────────────────
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

  // Asphalt texture
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 512;
  asphaltCanvas.height = 512;
  const ctx = asphaltCanvas.getContext('2d')!;
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const gray = Math.floor(Math.random() * 30 + 20);
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  
  // Add road lines texture
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 8;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(256, i * 50);
    ctx.lineTo(256, i * 50 + 25);
    ctx.stroke();
  }
  
  const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.repeat.set(4, 4);

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.receiveShadow = true;
  scene.add(road);

  // ── LANE MARKINGS ────────────────────
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf5d020, emissive: 0x442200, emissiveIntensity: 0.3 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444, emissiveIntensity: 0.2 });

  // Dashed white lane dividers
  for (let lane = 1; lane < LANES; lane++) {
    const laneOffset = -ROAD_WIDTH / 2 + lane * LANE_WIDTH;

    for (let i = 0; i < SEGMENTS - 1; i += 6) {
      const t = i / SEGMENTS;
      const { point, tangent, normal } = getFrame(t);

      const lanePos = point.clone().add(normal.clone().multiplyScalar(laneOffset));

      const dashGeo = new THREE.PlaneGeometry(0.2, 2.2);
      const dash = new THREE.Mesh(dashGeo, whiteMat);
      dash.position.copy(lanePos);
      dash.position.y = 0.04;

      const angle = Math.atan2(tangent.x, tangent.z);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      dash.receiveShadow = false;

      scene.add(dash);
    }
  }

  // Solid center yellow line
  for (let i = 0; i < SEGMENTS - 1; i += 1) {
    const t = i / SEGMENTS;
    const { point, tangent, normal } = getFrame(t);
    const p = point.clone().add(normal.clone().multiplyScalar(0));
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.8), yellowMat);
    dash.position.copy(p);
    dash.position.y = 0.04;
    const angle = Math.atan2(tangent.x, tangent.z);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -angle;
    scene.add(dash);
  }

  // ── TREES (Optimized) ────────────────
  const buildTree = (position: THREE.Vector3) => {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage (simplified for performance)
    const leafColors = [0x1a5c2a, 0x1e6b30, 0x236b2a];
    const layers = 3;

    for (let l = 0; l < layers; l++) {
      const radius = 2.0 - l * 0.4;
      const height = 2.2 + l * 0.3;
      const y = 2.0 + l * 1.4;
      const color = leafColors[l % leafColors.length];

      const leafGeo = new THREE.ConeGeometry(radius, height, 6);
      const leafMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = y;
      leaf.castShadow = true;
      group.add(leaf);
    }

    const scale = 0.6 + Math.random() * 0.5;
    group.scale.set(scale, scale * (0.9 + Math.random() * 0.3), scale);
    group.position.copy(position);
    scene.add(group);
  };

  // Place trees (reduced count for performance)
  for (let i = 0; i < SEGMENTS; i += 4) {
    const t = i / SEGMENTS;
    const { point, normal } = getFrame(t);

    for (const side of [1, -1]) {
      if (Math.random() < 0.5) {
        const dist = 12 + Math.random() * 18;
        const pos = point.clone().add(normal.clone().multiplyScalar(side * dist));
        pos.y = 0;
        buildTree(pos);
      }
    }
  }

  // ── MOUNTAINS (Simplified) ───────────
  const buildMountain = (x: number, z: number, baseRadius: number, height: number) => {
    const segments = 8;
    const bodyGeo = new THREE.ConeGeometry(baseRadius, height, segments);
    
    const rockColor = new THREE.Color(0.4 + Math.random() * 0.1, 0.38, 0.35);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: rockColor,
      roughness: 0.9,
      metalness: 0.05,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;

    const mountainGroup = new THREE.Group();
    mountainGroup.add(body);
    
    // Snow cap
    const snowGeo = new THREE.ConeGeometry(baseRadius * 0.4, height * 0.25, segments);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.5 });
    const snow = new THREE.Mesh(snowGeo, snowMat);
    snow.position.y = height - height * 0.15;
    mountainGroup.add(snow);

    mountainGroup.position.set(x, -0.5, z);
    scene.add(mountainGroup);
  };

  // Mountain ranges
  const mountainPositions = [
    { x: -200, z: -200, r: 50, h: 70 },
    { x: 200, z: -150, r: 55, h: 75 },
    { x: -180, z: -380, r: 48, h: 65 },
    { x: 180, z: -400, r: 52, h: 68 },
    { x: -250, z: -500, r: 45, h: 60 },
    { x: 250, z: -480, r: 47, h: 62 },
  ];

  for (const m of mountainPositions) {
    buildMountain(m.x, m.z, m.r, m.h);
  }

  // ── TRAFFIC CARS ────────────────────
  const carColors = [0xcc2200, 0x002299, 0x007744, 0xddaa00, 0x880088, 0x226699];

  const buildCar = (color: number): THREE.Group => {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.6,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: new THREE.Color(0xffff44),
      emissiveIntensity: 0.6,
    });

    // Body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.8), bodyMat);
    lower.position.y = 0.35;
    lower.castShadow = true;
    group.add(lower);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), bodyMat);
    cabin.position.set(0, 0.85, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Glass
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), glassMat);
    windshield.position.set(0, 0.87, 0.95);
    windshield.rotation.x = -Math.PI * 0.15;
    group.add(windshield);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    const wheelPositions = [
      [0.85, 0.35, 1.2], [-0.85, 0.35, 1.2],
      [0.85, 0.35, -1.2], [-0.85, 0.35, -1.2],
    ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
    }

    // Lights
    for (const lx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), lightMat);
      hl.position.set(lx, 0.4, 1.95);
      group.add(hl);
    }

    return group;
  };

  // ── INITIALIZE TRAFFIC SYSTEM ───────
  const trafficSystem = new TrafficSystem(scene, curve, LANES, LANE_WIDTH, ROAD_WIDTH);

  // Create initial traffic cars
  const initialTrafficCars: any[] = [];
  for (let i = 20; i < SEGMENTS - 10; i += 25) {
    const t = i / SEGMENTS;
    const laneIndex = Math.floor(Math.random() * LANES);
    const color = carColors[Math.floor(Math.random() * carColors.length)];

    const carGroup = buildCar(color);
    scene.add(carGroup);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 3.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(proxy);
    obstacles.push(proxy);

    initialTrafficCars.push({
      mesh: carGroup,
      proxy,
      t,
      speed: 0.0003 + Math.random() * 0.0005,
      lane: laneIndex,
      targetLane: laneIndex,
      laneChangeProgress: 1,
      color
    });
  }

  trafficSystem.initializeTraffic(initialTrafficCars);

  // Update function for traffic
  const updateTraffic = (deltaTime: number = 1 / 60, playerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) => {
    trafficSystem.update(deltaTime, playerPosition);
  };

  console.info('[buildRoads] Road system initialized with', obstacles.length, 'obstacles');

  return {
    obstacles,
    curve,
    trafficCars: trafficSystem.getTrafficCars(),
    trafficSystem,
    LANES,
    LANE_WIDTH,
    ROAD_WIDTH,
    updateTraffic,
  };
};