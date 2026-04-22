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
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    600
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(30, 60, 20);
  scene.add(light);

  // Roads + world
  const obstacles = buildRoads(scene);

  // Car
  const { car, carBody, tires } = createCar(scene);

  let speed = 0;
  const keys = { fwd: false, bwd: false, lft: false, rgt: false, reset: false };

  // Controls
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'w') keys.fwd = true;
    if (e.key === 's') keys.bwd = true;
    if (e.key === 'a') keys.lft = true;
    if (e.key === 'd') keys.rgt = true;
    if (e.key === 'r') keys.reset = true;
    if (e.key === 'm') toggleMiniMap();
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'w') keys.fwd = false;
    if (e.key === 's') keys.bwd = false;
    if (e.key === 'a') keys.lft = false;
    if (e.key === 'd') keys.rgt = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const animate = () => {
    requestAnimationFrame(animate);

    if (keys.fwd) speed += 0.05;
    if (keys.bwd) speed -= 0.05;

    car.position.z -= speed;

    setCarMapPos({ x: car.position.x, z: car.position.z });

    renderer.render(scene, camera);
  };

  animate();

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    renderer.dispose();
  };
};