import * as THREE from "three";
import { buildRoads } from "./RoadBuilder";
import { createCar } from "./CarBuilder";

export const initThreeGame = ({ mount }: { mount: HTMLElement }) => {
  // ── SCENE ────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

  // ── CAMERA ───────────────────────────
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.set(0, 4, 10);

  // ── RENDERER ─────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false;

  mount.appendChild(renderer.domElement);

  // ── LIGHTING ─────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(30, 60, 20);
  sun.castShadow = false;
  scene.add(sun);

  // ── WORLD ────────────────────────────
  const {
    obstacles,
    curve,
    updateTraffic,
    ROAD_WIDTH,
  } = buildRoads(scene);

  // ── CAR ──────────────────────────────
  const { car } = createCar(scene);

  let playerT = 0; // 🚗 position on curve

  const setCarOnRoad = () => {
    const point = curve.getPoint(playerT);
    const tangent = curve.getTangent(playerT);

    car.position.copy(point);
    car.position.y = 0.35;

    // ✅ FIX: align car with road direction
    const angle = Math.atan2(tangent.x, tangent.z);
    car.rotation.y = angle;
  };

  setCarOnRoad();

  // ── CAMERA FOLLOW (SMOOTH) ───────────
  const cameraOffset = new THREE.Vector3(0, 4, 10);

  const updateCamera = () => {
    const desiredPosition = car.position.clone().add(
      cameraOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        car.rotation.y
      )
    );

    // smooth follow
    camera.position.lerp(desiredPosition, 0.1);

    camera.lookAt(car.position);
  };

  // ── GAME LOOP ────────────────────────
  const clock = new THREE.Clock();

  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // 🚗 move player forward automatically (you can control later)
    playerT += delta * 0.05;
    if (playerT > 1) playerT = 0;

    setCarOnRoad();

    updateTraffic();
    updateCamera();

    renderer.render(scene, camera);
  };

  animate();

  // ── RESIZE HANDLER ───────────────────
  let resizeTimeout: number;

  const onResize = () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = window.setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
  };

  window.addEventListener("resize", onResize);

  // ── CLEANUP ──────────────────────────
  const cleanup = () => {
    window.removeEventListener("resize", onResize);

    if (mount.contains(renderer.domElement)) {
      mount.removeChild(renderer.domElement);
    }

    renderer.dispose();
  };

  // ── RETURN ───────────────────────────
  return {
    scene,
    camera,
    renderer,
    car,
    curve,
    obstacles,
    updateTraffic,
    ROAD_WIDTH,
    cleanup,
  };
};