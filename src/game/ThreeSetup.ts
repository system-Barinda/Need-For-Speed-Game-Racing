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

  // 👉 IMPORTANT: focus canvas (keyboard fix)
  renderer.domElement.setAttribute('tabindex', '0');
  renderer.domElement.focus();

  // ── Lights ────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  scene.add(sun);

  // ── World ─────────────────────────────
  const { obstacles, curve } = buildRoads(scene);

  // ── Car ───────────────────────────────
  const { car, carBody, tires } = createCar(scene);

  // ── Game state ────────────────────────
  let speed = 0;
  let t = 0;

  const MAX_SPEED = 0.0025;
  const ACCEL = 0.00008;
  const FRICTION = 0.00004;
  const TURN_STRENGTH = 0.002;

  let lateralOffset = 0;

  const keys = {
    fwd: false,
    bwd: false,
    lft: false,
    rgt: false,
    reset: false,
  };

  // ── Controls (🔥 FIXED) ───────────────
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();

    // 👉 STOP browser scrolling
    if (
      ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)
    ) {
      e.preventDefault();
    }

    if (k === 'w' || k === 'arrowup') keys.fwd = true;
    if (k === 's' || k === 'arrowdown') keys.bwd = true;
    if (k === 'a' || k === 'arrowleft') keys.lft = true;
    if (k === 'd' || k === 'arrowright') keys.rgt = true;

    if (k === 'r') keys.reset = true;
    if (k === 'm') toggleMiniMap();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();

    if (k === 'w' || k === 'arrowup') keys.fwd = false;
    if (k === 's' || k === 'arrowdown') keys.bwd = false;
    if (k === 'a' || k === 'arrowleft') keys.lft = false;
    if (k === 'd' || k === 'arrowright') keys.rgt = false;
  };

  // 👉 Attach to window (global capture)
  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  // ── Camera ────────────────────────────
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();

  // ── Animation ─────────────────────────
  let animId: number;

  const animate = () => {
    animId = requestAnimationFrame(animate);

    // RESET
    if (keys.reset) {
      t = 0;
      lateralOffset = 0;
      speed = 0;
      setCrash(false);
      keys.reset = false;
    }

    // SPEED
    if (keys.fwd) speed = Math.min(speed + ACCEL, MAX_SPEED);
    else if (keys.bwd) speed = Math.max(speed - ACCEL, -MAX_SPEED * 0.5);
    else {
      if (speed > 0) speed -= FRICTION;
      if (speed < 0) speed += FRICTION;
    }

    // MOVE ON CURVE
    t += speed;
    t = THREE.MathUtils.clamp(t, 0, 1);

    // LEFT / RIGHT
    if (keys.lft) lateralOffset += TURN_STRENGTH;
    if (keys.rgt) lateralOffset -= TURN_STRENGTH;

    lateralOffset = THREE.MathUtils.clamp(lateralOffset, -3.5, 3.5);

    // CURVE POSITION
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const finalPos = point.clone().add(normal.multiplyScalar(lateralOffset));

    car.position.copy(finalPos);

    // ROTATION
    car.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    // ANIMATION
    if (carBody) {
      carBody.rotation.x = THREE.MathUtils.lerp(
        carBody.rotation.x,
        -speed * 10,
        0.1
      );
    }

    tires.forEach((tire: THREE.Mesh) => {
      tire.rotation.x += speed * 50;
    });

    // COLLISION
    obstacles.forEach((obs: THREE.Mesh) => {
      if (car.position.distanceTo(obs.position) < 1.5) {
        setCrash(true);
        speed = 0;
      }
    });

    // CAMERA
    const camOffset = new THREE.Vector3(0, 4, 10).applyEuler(
      new THREE.Euler(0, car.rotation.y, 0)
    );

    camPos.lerp(car.position.clone().add(camOffset), 0.1);
    camera.position.copy(camPos);

    camTarget.lerp(
      new THREE.Vector3(car.position.x, car.position.y + 1, car.position.z),
      0.2
    );

    camera.lookAt(camTarget);

    // LIGHT FOLLOW
    sun.position.set(
      car.position.x + 30,
      car.position.y + 60,
      car.position.z + 20
    );

    // UI
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