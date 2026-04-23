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

  // ── RENDERER ─────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;

  mount.appendChild(renderer.domElement);

  // ── LIGHTING ─────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  scene.add(sun);
  scene.add(sun.target);

  // ── WORLD (ROAD + TRAFFIC) ───────────
  const {
    obstacles,
    curve,
    updateTraffic,
    ROAD_WIDTH,
  } = buildRoads(scene);

  // ── CAR ──────────────────────────────
  const { car } = createCar(scene);

  // initial car position (important!)
  const startPoint = curve.getPoint(0);
  car.position.copy(startPoint);
  car.position.y = 0.35;

  // ── RESIZE HANDLER ───────────────────
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
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

  // ── RETURN EVERYTHING ────────────────
  return {
    scene,
    camera,
    renderer,
    car,
    curve,
    obstacles,
    updateTraffic, // 🔥 VERY IMPORTANT
    ROAD_WIDTH,    // 🔥 optional but useful
    cleanup,
  };
};