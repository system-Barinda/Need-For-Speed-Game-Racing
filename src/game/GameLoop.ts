import * as THREE from 'three';
import { GameController } from './GameController';

export const startGameLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  controller: GameController,
  updateTraffic?: () => void
) => {
  let lastTime = performance.now();

  const loop = () => {
    requestAnimationFrame(loop);

    const now = performance.now();
    const delta = (now - lastTime) / 1000; // seconds
    lastTime = now;

    // clamp delta (prevents lag spikes)
    const safeDelta = Math.min(delta, 0.033);

    controller.update(safeDelta);

    if (updateTraffic) updateTraffic();

    renderer.render(scene, camera);
  };

  loop();
};
