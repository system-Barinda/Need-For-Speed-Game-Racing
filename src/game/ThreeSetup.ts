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
  camera.position.set(0, 3.5, 8);

  // ── Renderer ──────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  mount.appendChild(renderer.domElement);

  // ── Lights ────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  // ── World ─────────────────────────────
  const obstacles = buildRoads(scene);

  // ── Car ───────────────────────────────
  const { car, carBody, tires } = createCar(scene);

  // ── Game state ────────────────────────
  let speed = 0;
  const MAX_SPEED = 1.5;
  const ACCEL = 0.05;
  const FRICTION = 0.02;
  const TURN = 0.05;

  const keys = {
    fwd: false,
    bwd: false,
    lft: false,
    rgt: false,
    reset: false,
  };

  // ── Controls ──────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.key === 'ArrowUp') keys.fwd = true;
    if (k === 's' || e.key === 'ArrowDown') keys.bwd = true;
    if (k === 'a' || e.key === 'ArrowLeft') keys.lft = true;
    if (k === 'd' || e.key === 'ArrowRight') keys.rgt = true;
    if (k === 'r') keys.reset = true;
    if (k === 'm') toggleMiniMap();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'w' || e.key === 'ArrowUp') keys.fwd = false;
    if (k === 's' || e.key === 'ArrowDown') keys.bwd = false;
    if (k === 'a' || e.key === 'ArrowLeft') keys.lft = false;
    if (k === 'd' || e.key === 'ArrowRight') keys.rgt = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ── Camera follow ─────────────────────
  const camPos = new THREE.Vector3(0, 3.5, 8);
  const camTarget = new THREE.Vector3();
  const OFFSET = new THREE.Vector3(0, 3.5, 9);

  // ── Animation ─────────────────────────
  let animId: number;

  const animate = () => {
    animId = requestAnimationFrame(animate);

    // RESET
    if (keys.reset) {
      car.position.set(0, 0, 0);
      car.rotation.y = 0;
      speed = 0;
      setCrash(false);
      keys.reset = false;
    }

    // SPEED
    if (keys.fwd) speed = Math.min(speed + ACCEL, MAX_SPEED);
    else if (keys.bwd) speed = Math.max(speed - ACCEL, -MAX_SPEED * 0.5);
    else {
      if (speed > 0) speed = Math.max(0, speed - FRICTION);
      if (speed < 0) speed = Math.min(0, speed + FRICTION);
    }

    // TURN
    if (Math.abs(speed) > 0.01) {
      const t = TURN * (speed / MAX_SPEED);
      if (keys.lft) car.rotation.y += t;
      if (keys.rgt) car.rotation.y -= t;
    }

    // MOVE
    const dir = new THREE.Vector3(
      -Math.sin(car.rotation.y),
      0,
      -Math.cos(car.rotation.y)
    );
    car.position.addScaledVector(dir, speed);

    // CAR ANIMATION
    if (carBody) {
      carBody.rotation.x = THREE.MathUtils.lerp(
        carBody.rotation.x,
        -speed * 0.08,
        0.2
      );
    }

    tires.forEach((t: THREE.Mesh) => {
      t.rotation.x += speed * 4;
    });

    // CAMERA FOLLOW
    const behind = OFFSET.clone().applyEuler(
      new THREE.Euler(0, car.rotation.y, 0)
    );

    camPos.lerp(car.position.clone().add(behind), 0.1);
    camera.position.copy(camPos);

    camTarget.lerp(
      new THREE.Vector3(car.position.x, car.position.y + 1, car.position.z),
      0.2
    );
    camera.lookAt(camTarget);

    // SUN FOLLOW
    sun.position.set(
      car.position.x + 30,
      car.position.y + 60,
      car.position.z + 20
    );
    sun.target.position.copy(car.position);

    // UPDATE UI
    setCarMapPos({ x: car.position.x, z: car.position.z });

    // (optional simple road info)
    if (Math.abs(car.position.x) < 5) setRoadInfo('HIGHWAY');
    else setRoadInfo('OFF ROAD');

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