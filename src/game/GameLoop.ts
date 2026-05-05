import * as THREE from 'three';
import { GameController } from './GameController';
import { InputHandler } from './InputHandler';

export const GameLoop = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  controller: GameController,
  input: InputHandler,
  player: THREE.Object3D,
  updateTraffic?: () => void
) => {
  let lastTime = performance.now();
  let animationId: number;
  let frameCount = 0;
  let fpsUpdateTime = performance.now();

  // ================= RESIZE HANDLER =================
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);
  handleResize(); // Initialize with correct size

  // ================= CAMERA FOLLOW =================
  const updateCamera = () => {
    if (!player) return;
    
    const target = player.position;
    
    // Smooth camera following
    // X-axis: follow horizontally
    camera.position.x += (target.x - camera.position.x) * 0.1;
    
    // Z-axis: maintain distance behind car (offset of 6 units)
    camera.position.z += (target.z + 6 - camera.position.z) * 0.1;
    
    // Y-axis: follow at height of 4 units above car
    camera.position.y += (target.y + 4 - camera.position.y) * 0.1;
    
    // Look at the car
    camera.lookAt(target);
  };

  // ================= FPS COUNTER (optional debug) =================
  const updateFPS = () => {
    frameCount++;
    const now = performance.now();
    if (now - fpsUpdateTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - fpsUpdateTime));
      // Uncomment for debug:
      // console.log(`FPS: ${fps}, Speed: ${controller.getRunningSpeed().toFixed(1)}`);
      frameCount = 0;
      fpsUpdateTime = now;
    }
  };

  // ================= CRASH DETECTION VISUAL =================
  let crashFlashTimer = 0;
  const updateCrashEffect = (delta: number) => {
    if (controller.isCrashed()) {
      crashFlashTimer += delta;
      if (crashFlashTimer < 0.2) {
        // Flash red effect on crash
        scene.background = new THREE.Color(0x330000);
      } else {
        scene.background = new THREE.Color(0x111122); // Default dark background
        if (crashFlashTimer > 0.5) {
          crashFlashTimer = 0;
        }
      }
    } else {
      // Reset background smoothly
      if (scene.background.getHex() !== 0x111122) {
        scene.background = new THREE.Color(0x111122);
      }
    }
  };

  // ================= MAIN LOOP =================
  const loop = () => {
    animationId = requestAnimationFrame(loop);

    try {
      const now = performance.now();
      let delta = (now - lastTime) / 1000;
      
      // Cap delta to prevent large jumps
      if (delta > 0.1) delta = 0.033;
      lastTime = now;

      // Skip updates if delta is too small
      if (delta < 0.001) {
        renderer.render(scene, camera);
        return;
      }

      // 🔥 UPDATE GAME PHYSICS
      controller.update(delta);
      
      // 🔥 UPDATE TRAFFIC IF PROVIDED
      if (updateTraffic) {
        updateTraffic();
      }
      
      // 🔥 UPDATE VISUAL EFFECTS
      updateCrashEffect(delta);
      
      // 🔥 UPDATE CAMERA POSITION
      updateCamera();
      
      // 🔥 UPDATE FPS COUNTER (optional)
      updateFPS();
      
      // 🔥 IMPORTANT: Reset input buffer for next frame
      input.update();

      // Render the scene
      renderer.render(scene, camera);
      
    } catch (err) {
      console.error('Game loop error:', err);
      stop();
    }
  };

  // ================= START LOOP =================
  console.log('[GameLoop] Starting game loop...');
  loop();

  // ================= CLEANUP FUNCTION =================
  const stop = () => {
    console.log('[GameLoop] Stopping game loop...');
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
  };

  // Return public methods
  return { 
    stop,
    getFrameCount: () => frameCount,
  };
};