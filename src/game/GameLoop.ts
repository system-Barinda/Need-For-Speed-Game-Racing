import * as THREE from 'three';
import { GameController } from './GameController';

export const GameLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controller: GameController,
  updateTraffic?: () => void
) => {
  let lastTime = performance.now();
  let animationId: number;

  // ✅ HANDLE RESIZE
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);

  // ✅ MAIN LOOP
  const loop = () => {
    animationId = requestAnimationFrame(loop);

    try {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // ✅ prevent physics explosion
      const safeDelta = Math.min(delta, 0.033);

      controller.update(safeDelta);

      if (updateTraffic) updateTraffic();

      renderer.render(scene, camera);
    } catch (err) {
      console.error('Game loop error:', err);
      stop(); // stop loop if something breaks
    }
  };

  // ✅ START LOOP
  loop();

  // ✅ CLEANUP FUNCTION (VERY IMPORTANT)
  const stop = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };

  return { stop };
};
