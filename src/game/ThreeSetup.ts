import * as THREE from "three";
import { buildRoads } from "./RoadBuilder";
import { createCar } from "./CarBuilder";

export const initThreeGame = ({ mount }: any) => {
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

  // ── RENDERER (OPTIMIZED) ─────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: false,          // 🔥 off = faster
    powerPreference: "high-performance",
  });

  renderer.setSize(window.innerWidth, window.innerHeight);

  // 🔥 LIMIT pixel ratio (BIG performance win)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  // 🔥 disable heavy shadows (you can enable later if needed)
  renderer.shadowMap.enabled = false;

  mount.appendChild(renderer.domElement);

  // ── LIGHTING (LIGHTWEIGHT) ───────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(30, 60, 20);

  // 🔥 disable shadow casting (big boost)
  sun.castShadow = false;

  scene.add(sun);

  // ── WORLD (ROAD + TRAFFIC) ───────────
  const {
    obstacles,
    curve,
    updateTraffic,
    ROAD_WIDTH,
  } = buildRoads(scene);

  // ── CAR ──────────────────────────────
  const { car } = createCar(scene);

  const startPoint = curve.getPoint(0);
  car.position.copy(startPoint);
  car.position.y = 0.35;

  // ── RESIZE HANDLER (OPTIMIZED) ───────
  let resizeTimeout: any;

  const onResize = () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100); // 🔥 debounce resize
  };

  window.addEventListener("resize", onResize);

  // ── CLEANUP FUNCTION ─────────────────
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