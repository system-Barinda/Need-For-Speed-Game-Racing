import * as THREE from "three";

export const createGameLoop = ({
  scene,
  camera,
  renderer,
  controller, // your GameController
}: any) => {
  const clock = new THREE.Clock();

  let running = true;

  const loop = () => {
    if (!running) return;

    requestAnimationFrame(loop);

    // ✅ Delta time (VERY IMPORTANT)
    const delta = clock.getDelta();

    // 🔥 Clamp delta (prevents lag spikes)
    const safeDelta = Math.min(delta, 0.033); // ~30 FPS cap

    // ── UPDATE GAME LOGIC ──
    controller.update(safeDelta);

    // ── RENDER ──
    renderer.render(scene, camera);
  };

  loop();

  // ── STOP FUNCTION ──
  const stop = () => {
    running = false;
  };

  return { stop };
};