import * as THREE from "three";
import { buildRoads } from "./RoadBuilder";
import { createCar } from "./CarBuilder";

export const initThreeGame = ({ mount }: { mount: HTMLElement }) => {
  // ── SCENE ────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122); // Darker for better visibility
  scene.fog = new THREE.Fog(0x111122, 100, 350);

  // ── CAMERA ───────────────────────────
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 0, 0);

  // ── RENDERER ─────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: true, // Enable antialiasing for smoother edges
    powerPreference: "high-performance",
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true; // Enable shadows for better visuals
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  
  mount.appendChild(renderer.domElement);

  // ── LIGHTING (Improved) ─────────────────────────
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);

  // Main directional light (sun)
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.receiveShadow = false;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  // Fill light from below (road reflection)
  const fillLight = new THREE.PointLight(0x4466aa, 0.3);
  fillLight.position.set(0, -5, 0);
  scene.add(fillLight);

  // Back rim light for better edge definition
  const rimLight = new THREE.PointLight(0xffaa66, 0.4);
  rimLight.position.set(-10, 10, -20);
  scene.add(rimLight);

  // Optional: subtle hemisphere light
  const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x44aa44, 0.4);
  scene.add(hemiLight);

  // ── WORLD ────────────────────────────
  const {
    obstacles,
    curve,
    trafficSystem,
    updateTraffic,
    LANES,
    LANE_WIDTH,
    ROAD_WIDTH,
  } = buildRoads(scene);

  // ── CAR ──────────────────────────────
  const { car } = createCar(scene);
  
  // Position car at start of road
  const startPoint = curve.getPoint(0);
  car.position.copy(startPoint);
  car.position.y = 0.35;
  
  // Align with road direction at start
  const startTangent = curve.getTangent(0);
  const startAngle = Math.atan2(startTangent.x, startTangent.z);
  car.rotation.y = startAngle;

  // ── HELPER: Get car position on curve ──
  const getCarPositionOnCurve = (t: number) => {
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const angle = Math.atan2(tangent.x, tangent.z);
    return { point, tangent, angle };
  };

  // ── RESIZE HANDLER (Optimized) ───────────────────
  let resizeTimeout: number;
  let isResizing = false;

  const onResize = () => {
    if (isResizing) return;
    isResizing = true;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      isResizing = false;
    }, 100);
  };

  window.addEventListener("resize", onResize);

  // ── UTILITY FUNCTIONS ─────────────────
  const updateCarPosition = (t: number) => {
    const { point, angle } = getCarPositionOnCurve(t);
    car.position.copy(point);
    car.position.y = 0.35;
    car.rotation.y = angle;
  };

  const getRoadInfo = () => {
    return {
      laneWidth: LANE_WIDTH,
      lanes: LANES,
      roadWidth: ROAD_WIDTH,
    };
  };

  // ── CLEANUP (Thorough) ──────────────────────────
  const cleanup = () => {
    // Remove event listeners
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimeout);
    
    // Remove renderer from DOM
    if (mount && mount.contains(renderer.domElement)) {
      mount.removeChild(renderer.domElement);
    }
    
    // Dispose of Three.js resources
    renderer.dispose();
    
    // Clear scene
    while(scene.children.length > 0) {
      const child = scene.children[0];
      if (child.isMesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
      scene.remove(child);
    }
    
    console.info('[initThreeGame] Cleanup complete');
  };

  // ── RETURN (Complete API) ───────────────────────────
  return {
    scene,
    camera,
    renderer,
    car,
    curve,
    obstacles,
    trafficSystem,
    updateTraffic,
    LANES,
    LANE_WIDTH,
    ROAD_WIDTH,
    getCarPositionOnCurve,
    updateCarPosition,
    getRoadInfo,
    cleanup,
  };
};