import * as THREE from 'three';
import { buildRoads } from './RoadBuilder';
import { createCar } from './CarBuilder';

export const initThreeGame = ({
  mount,
  setCrash,
  setRoadInfo,
  setCarMapPos,
  toggleMiniMap,
}: any) => {
  // ── Scene ─────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

  // ── Camera ────────────────────────────
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.set(0, 4, 10);

  // ── Renderer ──────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  mount.appendChild(renderer.domElement);

  // ── Lights ────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(sun.target);

  // ── World ─────────────────────────────
  const {
    obstacles,
    curve,
    trafficCars,
    LANES,
    LANE_WIDTH,
    ROAD_WIDTH,
  } = buildRoads(scene);

  // ── Car ───────────────────────────────
  const { car, carBody, tires } = createCar(scene);

  // ── Game state ────────────────────────
  let speed = 0;
  let t = 0;
  let lateralOffset = 0;
  let crashed = false;

  // ⛔ NEW: spawn protection timer (VERY IMPORTANT)
  let spawnSafeTime = 0;

  const MAX_SPEED = 0.0025;
  const ACCEL = 0.00008;
  const FRICTION = 0.00004;
  const TURN_STRENGTH = 0.002;

  // ── KEY SYSTEM ────────────────────────
  const keysDown = new Set<string>();

  const normalizeKey = (key: string): string => {
    switch (key) {
      case 'ArrowUp': return 'fwd';
      case 'ArrowDown': return 'bwd';
      case 'ArrowLeft': return 'lft';
      case 'ArrowRight': return 'rgt';
      case 'w': case 'W': return 'fwd';
      case 's': case 'S': return 'bwd';
      case 'a': case 'A': return 'lft';
      case 'd': case 'D': return 'rgt';
      default: return key.toLowerCase();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }

    const mapped = normalizeKey(e.key);
    keysDown.add(mapped);

    if (mapped === 'r') {
      t = 0;
      lateralOffset = 0;
      speed = 0;
      crashed = false;
      spawnSafeTime = 0; // reset protection
      setCrash(false);
      keysDown.clear();
    }

    if (mapped === 'm') toggleMiniMap?.();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keysDown.delete(normalizeKey(e.key));
  };

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  // ── Camera helpers ────────────────────
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  // ── Animation ─────────────────────────
  let animId: number;

  const animate = () => {
    animId = requestAnimationFrame(animate);

    spawnSafeTime += 1; // ⛔ count frames

    const isFwd = keysDown.has('fwd');
    const isBwd = keysDown.has('bwd');
    const isLft = keysDown.has('lft');
    const isRgt = keysDown.has('rgt');

    // ── SPEED ──
    if (!crashed) {
      if (isFwd) speed = Math.min(speed + ACCEL, MAX_SPEED);
      else if (isBwd) speed = Math.max(speed - ACCEL, -MAX_SPEED * 0.5);
      else {
        if (speed > 0) speed = Math.max(speed - FRICTION, 0);
        if (speed < 0) speed = Math.min(speed + FRICTION, 0);
      }
    } else {
      speed *= 0.95;
    }

    // ── MOVE ──
    t = THREE.MathUtils.clamp(t + speed, 0, 0.999);

    if (isLft) lateralOffset += TURN_STRENGTH;
    if (isRgt) lateralOffset -= TURN_STRENGTH;

    lateralOffset = THREE.MathUtils.clamp(
      lateralOffset,
      -ROAD_WIDTH / 2 + 0.5,
      ROAD_WIDTH / 2 - 0.5
    );

    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pos = point.clone().add(normal.multiplyScalar(lateralOffset));
    car.position.copy(pos);

    car.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    // ── CAR ANIMATION ──
    if (carBody) {
      carBody.rotation.x = THREE.MathUtils.lerp(
        carBody.rotation.x,
        -speed * 50,
        0.1
      );
    }

    tires.forEach((tire: THREE.Mesh) => {
      tire.rotation.x += speed * 40;
    });

    // ── AI TRAFFIC (SAFE) ──
    trafficCars.forEach((ai: any) => {
      if (!ai.mesh) return;

      ai.t = (ai.t + ai.speed) % 1;

      if (Math.random() < 0.002) {
        ai.targetLane = Math.floor(Math.random() * LANES);
      }

      ai.lane += (ai.targetLane - ai.lane) * 0.05;

      const p = curve.getPoint(ai.t);
      const tan = curve.getTangent(ai.t);
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

      const laneOffset =
        -ROAD_WIDTH / 2 + ai.lane * LANE_WIDTH + LANE_WIDTH / 2;

      ai.mesh.position.copy(p.clone().add(n.multiplyScalar(laneOffset)));
      ai.mesh.rotation.y = Math.atan2(-tan.x, -tan.z);
    });

    // ── COLLISION (FIXED 🚀) ──
    if (spawnSafeTime > 60) { // ⛔ wait ~1 second
      obstacles.forEach((obs: THREE.Mesh) => {
        if (!obs || !obs.position) return;

        const dist = car.position.distanceTo(obs.position);

        // ignore far objects
        if (dist > 20) return;

        if (dist < 1.8) {
          crashed = true;
          setCrash(true);
          speed *= 0.5;
        }
      });
    }

    // ── CAMERA ──
    const behind = new THREE.Vector3(0, 3.5, 9).applyEuler(
      new THREE.Euler(0, car.rotation.y, 0)
    );

    camPos.lerp(car.position.clone().add(behind), 0.08);
    camera.position.copy(camPos);

    camTarget.lerp(
      new THREE.Vector3(car.position.x, car.position.y + 1, car.position.z),
      0.15
    );

    camera.lookAt(camTarget);

    // ── LIGHT FOLLOW ──
    sun.position.set(
      car.position.x + 30,
      car.position.y + 60,
      car.position.z + 20
    );

    // ── UI ──
    setCarMapPos({ x: car.position.x, z: car.position.z });
    setRoadInfo('CURVED HIGHWAY');

    renderer.render(scene, camera);
  };

  animate();

  // ── Resize ────────────────────────────
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener('resize', onResize);

  // ── Cleanup ───────────────────────────
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);

    if (mount.contains(renderer.domElement)) {
      mount.removeChild(renderer.domElement);
    }

    renderer.dispose();
  };
};