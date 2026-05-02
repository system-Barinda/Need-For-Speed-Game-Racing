import * as THREE from 'three';
import { GameController } from './GameController';
import { InputHandler } from './InputHandler';

export const GameLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controller: GameController,
  input: InputHandler, // 🔥 ADD THIS
  player: THREE.Object3D, // 🔥 ADD THIS (car reference)
  updateTraffic?: () => void
) => {
  let lastTime = performance.now();
  let animationId: number;

  // ================= RESIZE =================
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);
  handleResize(); // 🔥 FIX: run once at start

  // ================= CAMERA FOLLOW =================
  const updateCamera = () => {
    const target = player.position;

    camera.position.x += (target.x - camera.position.x) * 0.1;
    camera.position.z += (target.z + 6 - camera.position.z) * 0.1;
    camera.position.y += (target.y + 4 - camera.position.y) * 0.1;

    camera.lookAt(target);
  };

  // ================= MAIN LOOP =================
  const loop = () => {
    animationId = requestAnimationFrame(loop);

    try {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const safeDelta = Math.min(delta, 0.033);

      // 🔥 UPDATE GAME
      controller.update(safeDelta);

      if (updateTraffic) updateTraffic();

      // 🔥 CAMERA FOLLOW
      updateCamera();

      // 🔥 IMPORTANT: reset input buffer
      input.update();

      renderer.render(scene, camera);
    } catch (err) {
      console.error('Game loop error:', err);
      stop();
    }
  };

  // ================= START =================
  loop();

  // ================= CLEANUP =================
  const stop = () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };

  return { stop };
};