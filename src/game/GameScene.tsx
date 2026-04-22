import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
//  ROAD NETWORK LAYOUT (top-down, Z = north, X = east)
//
//  Highway  : z = -1000 → +200  (the original straight road, width 10)
//  Avenue A : x = -60, z = -200 → +600  (north–south, runs left of highway)
//  Avenue B : x = +60, z = -200 → +600  (north–south, runs right of highway)
//  Street 1 : z = +100, x = -80 → +80   (east–west connector, near bridge)
//  Street 2 : z = -100, x = -80 → +80   (east–west connector)
//  Street 3 : z =  300, x = -80 → +80   (east–west connector)
//  Bridge   : z = +100, x = -80 → +80   (elevated section of Street 1)
//  Turns    : smooth 90° arcs connecting highway → streets at z=100 & z=-100
// ─────────────────────────────────────────────────────────────────────────────

const ROAD_COLOR  = 0x282828;
const LANE_WHITE  = 0xffffff;
const GROUND_COLOR = 0x4a8c3f;
const BRIDGE_COLOR = 0x8a8a8a;
const CURB_COLOR   = 0xbbbbbb;

// Helper: flat road segment (PlaneGeometry, XZ plane)
function makeRoad(scene: THREE.Scene, w: number, d: number, x: number, y: number, z: number, ry = 0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color: ROAD_COLOR })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = ry;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

// Helper: dash stripe
function makeDashes(scene: THREE.Scene, axis: 'z' | 'x', from: number, to: number, fixed: number, y: number, gap = 10, offset = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: LANE_WHITE });
  for (let v = from; v < to; v += gap) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(axis === 'z' ? 0.2 : 5, axis === 'z' ? 5 : 0.2), mat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(axis === 'z' ? fixed + offset : v + gap / 2, y, axis === 'z' ? v + gap / 2 : fixed + offset);
    scene.add(d);
  }
}

// Helper: edge lines
function makeEdge(scene: THREE.Scene, axis: 'z' | 'x', from: number, to: number, side: number, y: number) {
  const len = Math.abs(to - from);
  const mid = (from + to) / 2;
  const mat = new THREE.MeshStandardMaterial({ color: LANE_WHITE });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(axis === 'z' ? 0.15 : len, axis === 'z' ? len : 0.15), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(axis === 'z' ? side : mid, y, axis === 'z' ? mid : side);
  scene.add(mesh);
}

// Helper: curb
function makeCurb(scene: THREE.Scene, w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: CURB_COLOR })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// Helper: quarter-turn road surface using arc of quads
function makeArcRoad(scene: THREE.Scene, cx: number, cz: number, r: number,
                      fromAngle: number, toAngle: number, roadW: number, y: number) {
  const segs = 16;
  const dA = (toAngle - fromAngle) / segs;
  const mat = new THREE.MeshStandardMaterial({ color: ROAD_COLOR });
  for (let i = 0; i < segs; i++) {
    const a0 = fromAngle + i * dA;
    const a1 = a0 + dA;
    const mid = (a0 + a1) / 2;

    // quad centre on the arc circle
    const px = cx + Math.cos(mid) * r;
    const pz = cz + Math.sin(mid) * r;
    const arcLen = r * Math.abs(dA);

    const seg = new THREE.Mesh(new THREE.PlaneGeometry(roadW, arcLen), mat);
    seg.rotation.x = -Math.PI / 2;
    seg.rotation.z = -(mid + Math.PI / 2);   // tangent direction
    seg.position.set(px, y, pz);
    seg.receiveShadow = true;
    scene.add(seg);
  }
}

const GameScene = () => {
  const mountRef  = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const [crash, setCrash]     = useState(false);
  const [miniMap, setMiniMap] = useState(false);
  const [roadInfo, setRoadInfo] = useState('HIGHWAY');

  const carPosRef = useRef({ x: 0, z: 0 });

  const gameRef = useRef<{
    car: THREE.Group | null;
    carBody: THREE.Mesh | null;
    tires: THREE.Mesh[];
    sun: THREE.DirectionalLight | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    obstacles: THREE.Mesh[];
    speed: number;
    keys: { fwd: boolean; bwd: boolean; lft: boolean; rgt: boolean; reset: boolean };
  }>({
    car: null, carBody: null, tires: [], sun: null,
    camera: null, renderer: null, obstacles: [],
    speed: 0,
    keys: { fwd: false, bwd: false, lft: false, rgt: false, reset: false },
  });

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    const MAX_SPEED  = 1.6;
    const ACCEL      = 0.055;
    const BRAKE      = 0.08;
    const FRICTION   = 0.022;
    const TURN       = 0.055;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current!.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

    const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 600);
    camera.position.set(0, 3.5, 8);

    // ── Lights ────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, far: 600 });
    scene.add(sun);

    // ── Ground ────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 2400),
      new THREE.MeshStandardMaterial({ color: GROUND_COLOR })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const Y   = 0.01;   // road surface Y
    const YB  = 3.2;    // bridge deck Y
    const YBR = 0.02;   // road on bridge Y offset (relative to bridge deck)

    // ════════════════════════════════════════════════════════
    //  1. HIGHWAY  (center x=0, z = -1000 → +200)
    // ════════════════════════════════════════════════════════
    makeRoad(scene, 10, 1200, 0, Y, -400);           // main slab
    makeDashes(scene, 'z', -1000, 200, 0, Y + 0.001);
    makeEdge(scene, 'z', -1000, 200, -4.85, Y + 0.001);
    makeEdge(scene, 'z', -1000, 200,  4.85, Y + 0.001);

    // Highway sign poles (every 200 units)
    const poleMat  = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const signMat  = new THREE.MeshStandardMaterial({ color: 0x005500 });
    for (let sz = -900; sz < 200; sz += 200) {
      [-6, 6].forEach((sx) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), poleMat);
        pole.position.set(sx, 3, sz);
        scene.add(pole);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 0.12), signMat);
        sign.position.set(sx, 6, sz);
        scene.add(sign);
      });
    }

    // ════════════════════════════════════════════════════════
    //  2. AVENUE A  (x = -60, z = -200 → +600)
    // ════════════════════════════════════════════════════════
    makeRoad(scene, 8, 800, -60, Y, 200);
    makeDashes(scene, 'z', -200, 600, -60, Y + 0.001);
    makeEdge(scene, 'z', -200, 600, -64.8, Y + 0.001);
    makeEdge(scene, 'z', -200, 600, -55.2, Y + 0.001);

    // ════════════════════════════════════════════════════════
    //  3. AVENUE B  (x = +60, z = -200 → +600)
    // ════════════════════════════════════════════════════════
    makeRoad(scene, 8, 800, 60, Y, 200);
    makeDashes(scene, 'z', -200, 600, 60, Y + 0.001);
    makeEdge(scene, 'z', -200, 600, 55.2, Y + 0.001);
    makeEdge(scene, 'z', -200, 600, 64.8, Y + 0.001);

    // ════════════════════════════════════════════════════════
    //  4. STREET 1  (z = -100, x = -80 → +80)  plain connector
    // ════════════════════════════════════════════════════════
    makeRoad(scene, 160, 8, 0, Y, -100);
    makeDashes(scene, 'x', -80, 80, -100, Y + 0.001);
    makeEdge(scene, 'x', -80, 80, -104.8, Y + 0.001);
    makeEdge(scene, 'x', -80, 80,  -95.2, Y + 0.001);

    // ════════════════════════════════════════════════════════
    //  5. STREET 2  (z = +300, x = -80 → +80)
    // ════════════════════════════════════════════════════════
    makeRoad(scene, 160, 8, 0, Y, 300);
    makeDashes(scene, 'x', -80, 80, 300, Y + 0.001);
    makeEdge(scene, 'x', -80, 80,  295.2, Y + 0.001);
    makeEdge(scene, 'x', -80, 80,  304.8, Y + 0.001);

    // ════════════════════════════════════════════════════════
    //  6. BRIDGE (Street 3 elevated, z = +100, x = -80 → +80)
    // ════════════════════════════════════════════════════════
    // Ramp up (left side, x = -80 → -40)
    const rampL = new THREE.Mesh(new THREE.PlaneGeometry(40, 8),
      new THREE.MeshStandardMaterial({ color: BRIDGE_COLOR }));
    rampL.rotation.x = -(Math.PI / 2 + 0.08);
    rampL.position.set(-60, 1.4, 100);
    rampL.receiveShadow = true;
    scene.add(rampL);

    // Ramp down (right side, x = +40 → +80)
    const rampR = new THREE.Mesh(new THREE.PlaneGeometry(40, 8),
      new THREE.MeshStandardMaterial({ color: BRIDGE_COLOR }));
    rampR.rotation.x = -(Math.PI / 2 - 0.08);
    rampR.rotation.y = Math.PI;
    rampR.position.set(60, 1.4, 100);
    rampR.receiveShadow = true;
    scene.add(rampR);

    // Bridge deck
    const deckW = 80;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: BRIDGE_COLOR }));
    deck.position.set(0, YB - 0.25, 100);
    deck.castShadow = true;
    deck.receiveShadow = true;
    scene.add(deck);

    // Road surface on deck
    makeRoad(scene, deckW, 8, 0, YB + YBR, 100);
    makeDashes(scene, 'x', -40, 40, 100, YB + YBR + 0.001);
    makeEdge(scene, 'x', -40, 40, 95.2,  YB + YBR + 0.001);
    makeEdge(scene, 'x', -40, 40, 104.8, YB + YBR + 0.001);

    // Bridge pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    [-28, -14, 0, 14, 28].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, YB, 10), pillarMat);
      pillar.position.set(px, YB / 2, 100);
      pillar.castShadow = true;
      scene.add(pillar);
    });

    // Bridge guard rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    [-4.2, 4.2].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.7, 0.15), railMat);
      rail.position.set(0, YB + 0.6, 100 + rz);
      rail.castShadow = true;
      scene.add(rail);
      // Posts
      for (let px = -38; px <= 38; px += 6) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), railMat);
        post.position.set(px, YB + 0.6, 100 + rz);
        scene.add(post);
      }
    });

    // ════════════════════════════════════════════════════════
    //  7. TURNS  (highway → streets, smooth 90° arcs)
    // ════════════════════════════════════════════════════════
    const TURN_R = 12;

    // Turn A: Highway right side → Street 1 (east), at z=-100, x=+5
    // Arc centre at (5+TURN_R, -100+0), angle from 180° → 270°
    makeArcRoad(scene, 5 + TURN_R, -100, TURN_R, Math.PI, Math.PI * 1.5, 8, Y);

    // Turn B: Highway left side → Street 1 (west), at z=-100, x=-5
    makeArcRoad(scene, -(5 + TURN_R), -100, TURN_R, 0, -Math.PI / 2, 8, Y);

    // Turn C: Highway right side → Street 2 (east), at z=+300, x=+5
    makeArcRoad(scene, 5 + TURN_R, 300, TURN_R, Math.PI, Math.PI * 1.5, 8, Y);

    // Turn D: Highway left side → Street 2 (west), at z=+300, x=-5
    makeArcRoad(scene, -(5 + TURN_R), 300, TURN_R, 0, -Math.PI / 2, 8, Y);

    // ════════════════════════════════════════════════════════
    //  8. INTERSECTION markings (stop lines)
    // ════════════════════════════════════════════════════════
    const stopMat = new THREE.MeshStandardMaterial({ color: LANE_WHITE });
    [
      // Highway × Street 1
      { x: 0, z: -95.5, w: 10, d: 0.4 },
      { x: 0, z: -104.5, w: 10, d: 0.4 },
      // Highway × Street 2
      { x: 0, z:  295.5, w: 10, d: 0.4 },
      { x: 0, z:  304.5, w: 10, d: 0.4 },
      // Bridge × Avenue A
      { x: -64.5, z: 100, w: 0.4, d: 10 },
      // Bridge × Avenue B
      { x:  64.5, z: 100, w: 0.4, d: 10 },
    ].forEach(({ x, z, w, d }) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), stopMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, Y + 0.003, z);
      scene.add(m);
    });

    // ════════════════════════════════════════════════════════
    //  9. TREES (forest along highway & avenues)
    // ════════════════════════════════════════════════════════
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x1e5c1e }),
      new THREE.MeshStandardMaterial({ color: 0x2d7a2d }),
      new THREE.MeshStandardMaterial({ color: 0x3a8a3a }),
    ];
    const addTree = (x: number, z: number, scale: number) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.8 * scale, 7), trunkMat);
      trunk.position.y = 0.9 * scale; trunk.castShadow = true; g.add(trunk);
      const mat = leafMats[Math.floor(Math.random() * leafMats.length)];
      [{ r: 1.6 * scale, h: 2.2 * scale, y: 2.5 * scale },
       { r: 1.2 * scale, h: 1.8 * scale, y: 3.8 * scale },
       { r: 0.7 * scale, h: 1.4 * scale, y: 4.8 * scale }].forEach(({ r, h, y }) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
        cone.position.y = y; cone.castShadow = true; g.add(cone);
      });
      g.position.set(x, 0, z); scene.add(g);
    };

    // Highway trees
    for (let z = -950; z < 200; z += 9) {
      addTree(-(8 + Math.random() * 5), z + (Math.random() - 0.5) * 5, 0.7 + Math.random() * 0.7);
      addTree(  8 + Math.random() * 5,  z + (Math.random() - 0.5) * 5, 0.7 + Math.random() * 0.7);
    }
    // Avenue A trees
    for (let z = -200; z < 600; z += 10) {
      addTree(-68 - Math.random() * 4, z + (Math.random() - 0.5) * 5, 0.6 + Math.random() * 0.5);
      addTree(-52 + Math.random() * 3, z + (Math.random() - 0.5) * 5, 0.5 + Math.random() * 0.4);
    }
    // Avenue B trees
    for (let z = -200; z < 600; z += 10) {
      addTree(52 - Math.random() * 3, z + (Math.random() - 0.5) * 5, 0.5 + Math.random() * 0.4);
      addTree(68 + Math.random() * 4, z + (Math.random() - 0.5) * 5, 0.6 + Math.random() * 0.5);
    }

    // ════════════════════════════════════════════════════════
    //  10. OBSTACLES (on highway & streets)
    // ════════════════════════════════════════════════════════
    const obsMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    const obstacles: THREE.Mesh[] = [];

    const addObstacle = (x: number, z: number, y = 0.5) => {
      const obs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), obsMat);
      obs.position.set(x, y, z);
      obs.castShadow = true; obs.receiveShadow = true;
      scene.add(obs); obstacles.push(obs);
    };

    // Highway obstacles
    for (let i = -800; i < 200; i += 45 + Math.random() * 25)
      [-3.5, 3.5].forEach(s => addObstacle(s + (Math.random() - 0.5) * 1.5, i));

    // Avenue A obstacles
    for (let z = -150; z < 550; z += 60 + Math.random() * 30)
      addObstacle(-60 + (Math.random() - 0.5) * 3, z);

    // Avenue B obstacles
    for (let z = -150; z < 550; z += 60 + Math.random() * 30)
      addObstacle(60 + (Math.random() - 0.5) * 3, z);

    // Street 1 obstacles
    for (let x = -60; x < 60; x += 40 + Math.random() * 20)
      addObstacle(x, -100 + (Math.random() - 0.5) * 2);

    // Street 2 obstacles
    for (let x = -60; x < 60; x += 40 + Math.random() * 20)
      addObstacle(x, 300 + (Math.random() - 0.5) * 2);

    // ════════════════════════════════════════════════════════
    //  11. CAR
    // ════════════════════════════════════════════════════════
    const car = new THREE.Group(); scene.add(car);

    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.58, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 }));
    carBody.position.y = 0.58; carBody.castShadow = true; car.add(carBody);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.52, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xcc1100 }));
    cabin.position.set(0, 1.09, 0.1); cabin.castShadow = true; car.add(cabin);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.44, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.6 }));
    glass.position.set(0, 1.09, 1.08); car.add(glass);

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1.2 });
    [-0.64, 0.64].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.06), hlMat);
      hl.position.set(x, 0.6, 2.05); car.add(hl);
    });

    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff2200, emissiveIntensity: 0.9 });
    [-0.64, 0.64].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.06), tlMat);
      tl.position.set(x, 0.6, -2.05); car.add(tl);
    });

    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20);
    const hubGeo  = new THREE.CylinderGeometry(0.14, 0.14, 0.29, 8);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat  = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const tires: THREE.Mesh[] = [];

    ([ [-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3] ] as [number,number][]).forEach(([sx, sz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat); tire.rotation.z = Math.PI / 2; tire.castShadow = true; wg.add(tire);
      const hub  = new THREE.Mesh(hubGeo,  hubMat);  hub.rotation.z  = Math.PI / 2; wg.add(hub);
      wg.position.set(sx * 0.98, 0.34, sz);
      car.add(wg); tires.push(tire);
    });

    car.position.set(0, 0, 0);

    const g = gameRef.current;
    g.car = car; g.carBody = carBody; g.tires = tires;
    g.sun = sun; g.camera = camera; g.renderer = renderer; g.obstacles = obstacles;

    // ════════════════════════════════════════════════════════
    //  12. ANIMATION LOOP
    // ════════════════════════════════════════════════════════
    let animId: number;
    const camTarget = new THREE.Vector3();
    const camPos    = new THREE.Vector3(0, 3.5, 8);
    const OFFSET    = new THREE.Vector3(0, 3.5, 9.5);
    const carBox    = new THREE.Box3();
    const obsBox    = new THREE.Box3();
    const crashRef  = { current: false };

    const checkCollision = () => {
      if (!g.car) return false;
      carBox.setFromObject(g.car);
      for (const obs of g.obstacles) {
        obsBox.setFromObject(obs);
        if (carBox.intersectsBox(obsBox)) return true;
      }
      return false;
    };

    // Road zone detection
    const getRoadZone = (x: number, z: number): string => {
      if (Math.abs(x) < 5 && z > -1000 && z < 250) return 'HIGHWAY';
      if (Math.abs(x - (-60)) < 4 && z > -200 && z < 600) return 'AVENUE A';
      if (Math.abs(x - 60) < 4   && z > -200 && z < 600)  return 'AVENUE B';
      if (Math.abs(z - (-100)) < 5 && Math.abs(x) < 80)    return 'STREET 1';
      if (Math.abs(z - 300) < 5   && Math.abs(x) < 80)     return 'STREET 2';
      if (Math.abs(z - 100) < 6   && Math.abs(x) < 44)     return '🌉 BRIDGE';
      return 'OFF ROAD';
    };

    let frameCount = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const keys = g.keys;
      let speed = g.speed;

      if (keys.reset) {
        if (g.car) { g.car.position.set(0, 0, 0); g.car.rotation.y = 0; }
        speed = 0; g.speed = 0;
        crashRef.current = false; setCrash(false);
        keys.reset = false;
      }

      if (!crashRef.current) {
        if (keys.fwd)       speed = Math.min(speed + ACCEL, MAX_SPEED);
        else if (keys.bwd)  speed = Math.max(speed - BRAKE, -MAX_SPEED * 0.6);
        else {
          if (speed > 0) speed = Math.max(0, speed - FRICTION);
          if (speed < 0) speed = Math.min(0, speed + FRICTION);
        }
        g.speed = speed;

        if (Math.abs(speed) > 0.01 && g.car) {
          const t = TURN * (Math.abs(speed) / MAX_SPEED);
          if (keys.lft) g.car.rotation.y += t;
          if (keys.rgt) g.car.rotation.y -= t;
        }

        if (g.car && Math.abs(speed) > 0.005) {
          const dir = new THREE.Vector3(-Math.sin(g.car.rotation.y), 0, -Math.cos(g.car.rotation.y));
          g.car.position.addScaledVector(dir, speed);
          if (g.carBody) g.carBody.rotation.x = THREE.MathUtils.lerp(g.carBody.rotation.x, -speed * 0.08, 0.3);
          g.tires.forEach(t => { t.rotation.x += speed * 4.2; });
        }

        if (checkCollision()) { g.speed = 0; crashRef.current = true; setCrash(true); }
      }

      // Camera follow
      if (g.car && g.camera) {
        const behind = OFFSET.clone().applyEuler(new THREE.Euler(0, g.car.rotation.y, 0));
        camPos.lerp(g.car.position.clone().add(behind), 0.1);
        g.camera.position.copy(camPos);
        camTarget.lerp(new THREE.Vector3(g.car.position.x, g.car.position.y + 1.3, g.car.position.z), 0.2);
        g.camera.lookAt(camTarget);

        // Update HUD every 30 frames
        if (frameCount++ % 30 === 0) {
          const p = g.car.position;
          carPosRef.current = { x: p.x, z: p.z };
          setRoadInfo(getRoadZone(p.x, p.z));
        }
      }

      if (g.sun && g.car) {
        g.sun.position.set(g.car.position.x + 30, g.car.position.y + 60, g.car.position.z + 20);
        g.sun.target.position.copy(g.car.position);
        g.sun.target.updateMatrixWorld();
      }

      if (g.renderer && g.camera) g.renderer.render(scene, g.camera);
    };
    animate();

    // ── Controls ──────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'ArrowUp'    || e.key.toLowerCase() === 'w') g.keys.fwd = true;
      if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') g.keys.bwd = true;
      if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') g.keys.lft = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') g.keys.rgt = true;
      if (e.key.toLowerCase() === 'r') g.keys.reset = true;
      if (e.key.toLowerCase() === 'm') setMiniMap(p => !p);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp'    || e.key.toLowerCase() === 'w') g.keys.fwd = false;
      if (e.key === 'ArrowDown'  || e.key.toLowerCase() === 's') g.keys.bwd = false;
      if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'a') g.keys.lft = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') g.keys.rgt = false;
    };
    const onResize = () => {
      if (g.camera && g.renderer) {
        g.camera.aspect = W() / H();
        g.camera.updateProjectionMatrix();
        g.renderer.setSize(W(), H());
      }
    };

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (mountRef.current?.contains(renderer.domElement))
        mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      initialized.current = false;
    };
  }, []);

  // ── Mini-map (SVG top-down view) ─────────────────────────
  const MAP_SCALE  = 0.08;
  const MAP_W      = 240;
  const MAP_H      = 240;
  const MAP_CX     = MAP_W / 2;
  const MAP_CY     = MAP_H / 2;
  const toMap = (x: number, z: number) => ({
    mx: MAP_CX + x * MAP_SCALE,
    my: MAP_CY + z * MAP_SCALE,
  });
  const cp = carPosRef.current;
  const { mx: carMX, my: carMY } = toMap(cp.x, cp.z);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ── HUD top-left: road zone ── */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(0,0,0,0.7)', color: '#00ff88',
        fontFamily: 'monospace', fontSize: 14,
        padding: '8px 18px', borderRadius: 6,
        borderLeft: '3px solid #00ff88',
        pointerEvents: 'none',
        letterSpacing: 1,
      }}>
        📍 {roadInfo}
      </div>

      {/* ── HUD top-right: mini-map toggle ── */}
      <div
        onClick={() => setMiniMap(p => !p)}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(0,0,0,0.7)', color: '#ffdd88',
          fontFamily: 'monospace', fontSize: 13,
          padding: '7px 16px', borderRadius: 6,
          cursor: 'pointer', userSelect: 'none',
          border: '1px solid #ffdd8844',
        }}
      >
        🗺 Map [{miniMap ? 'ON' : 'OFF'}]  &nbsp;<span style={{opacity:0.6}}>M</span>
      </div>

      {/* ── Mini-map ── */}
      {miniMap && (
        <div style={{
          position: 'absolute', bottom: 70, right: 16,
          width: MAP_W, height: MAP_H,
          background: 'rgba(0,0,0,0.8)',
          borderRadius: 8, border: '1px solid #555',
          overflow: 'hidden',
        }}>
          <svg width={MAP_W} height={MAP_H} style={{ display: 'block' }}>
            {/* Ground */}
            <rect width={MAP_W} height={MAP_H} fill="#2a4a2a" />

            {/* Highway */}
            {(() => {
              const z1 = toMap(0, -1000), z2 = toMap(0, 200);
              return <line x1={z1.mx} y1={z1.my} x2={z2.mx} y2={z2.my}
                stroke="#555" strokeWidth={4} />;
            })()}

            {/* Avenue A */}
            {(() => {
              const a1 = toMap(-60, -200), a2 = toMap(-60, 600);
              return <line x1={a1.mx} y1={a1.my} x2={a2.mx} y2={a2.my}
                stroke="#555" strokeWidth={3} />;
            })()}

            {/* Avenue B */}
            {(() => {
              const b1 = toMap(60, -200), b2 = toMap(60, 600);
              return <line x1={b1.mx} y1={b1.my} x2={b2.mx} y2={b2.my}
                stroke="#555" strokeWidth={3} />;
            })()}

            {/* Street 1 */}
            {(() => {
              const s1 = toMap(-80, -100), s2 = toMap(80, -100);
              return <line x1={s1.mx} y1={s1.my} x2={s2.mx} y2={s2.my}
                stroke="#555" strokeWidth={2.5} />;
            })()}

            {/* Street 2 */}
            {(() => {
              const s1 = toMap(-80, 300), s2 = toMap(80, 300);
              return <line x1={s1.mx} y1={s1.my} x2={s2.mx} y2={s2.my}
                stroke="#555" strokeWidth={2.5} />;
            })()}

            {/* Bridge (highlighted) */}
            {(() => {
              const b1 = toMap(-40, 100), b2 = toMap(40, 100);
              return <line x1={b1.mx} y1={b1.my} x2={b2.mx} y2={b2.my}
                stroke="#99aaff" strokeWidth={3} />;
            })()}

            {/* Labels */}
            <text x={MAP_CX + 2} y={MAP_CY - 5} fill="#888" fontSize="7" fontFamily="monospace">HWY</text>
            {(() => {
              const p = toMap(-60, 200);
              return <text x={p.mx - 14} y={p.my} fill="#888" fontSize="6" fontFamily="monospace">AVE A</text>;
            })()}
            {(() => {
              const p = toMap(60, 200);
              return <text x={p.mx + 2} y={p.my} fill="#888" fontSize="6" fontFamily="monospace">AVE B</text>;
            })()}
            {(() => {
              const p = toMap(40, 100);
              return <text x={p.mx + 2} y={p.my} fill="#aabbff" fontSize="6" fontFamily="monospace">BRIDGE</text>;
            })()}

            {/* Car dot */}
            <circle cx={carMX} cy={carMY} r={4} fill="#ff4422" stroke="#fff" strokeWidth={1} />
          </svg>
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff', fontFamily: 'monospace', fontSize: 13,
        background: 'rgba(0,0,0,0.6)',
        padding: '10px 24px', borderRadius: 8,
        pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: '0.5px',
      }}>
        W/↑ Accel &nbsp;|&nbsp; S/↓ Brake &nbsp;|&nbsp; A/← Left &nbsp;|&nbsp; D/→ Right &nbsp;|&nbsp;
        <span style={{ color: '#ffdd88' }}>R</span> Reset &nbsp;|&nbsp;
        <span style={{ color: '#ffdd88' }}>M</span> Map
      </div>

      {/* ── Crash overlay ── */}
      {crash && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)', pointerEvents: 'none',
        }}>
          <div style={{
            color: '#ff3333', fontSize: 64, fontWeight: 900,
            fontFamily: 'monospace', letterSpacing: 6,
            textShadow: '0 0 30px #ff0000, 0 4px 8px #000',
          }}>CRASH!</div>
          <div style={{ color: '#fff', fontSize: 20, fontFamily: 'monospace', marginTop: 16 }}>
            Press <span style={{ color: '#ffdd88', fontWeight: 'bold' }}>R</span> to restart
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScene;