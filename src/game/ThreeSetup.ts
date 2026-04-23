import * as THREE from "three";
import { buildRoads } from "./RoadBuilder";
import { createCar } from "./CarBuilder";

export const initThreeGame = ({ mount }: any) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 600);
  camera.position.set(0, 4, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const { obstacles, curve } = buildRoads(scene);
  const { car } = createCar(scene);

  return { scene, camera, renderer, car, curve, obstacles };
};