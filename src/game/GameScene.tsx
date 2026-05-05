import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { initThreeGame } from './ThreeSetup';
import { InputHandler } from './InputHandler';
import { GameController } from './GameController';
import { GameStateManager } from './GameStateManager';
import { UISystem } from './UISystem';

export default function GameScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── INIT THREE ──────────────────────
    const {
      scene,
      camera,
      renderer,
      car,
      curve,
      obstacles,
      trafficSystem,
      updateTraffic,
      cleanup,
    } = initThreeGame({ mount: mountRef.current });

    // ── SET SIZE (BASED ON CONTAINER) ──
    const setSize = () => {
      if (!mountRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    setSize();
    window.addEventListener('resize', setSize);

    // ── SYSTEMS INITIALIZATION ─────────
    const input = new InputHandler();
    const controller = new GameController(car, obstacles, input, curve);
    const gameStateManager = new GameStateManager();
    const uiSystem = new UISystem(mountRef.current, gameStateManager);

    // Connect systems
    gameStateManager.setPhysicsSystem(controller.physicsSystem);
    gameStateManager.setTrafficSystem(trafficSystem);

    // Set initial running speed
    controller.setBaseSpeed(6.0); // Start with good running speed
    console.log('[GameScene] Game initialized with running speed:', controller.getRunningSpeed());

    // Initial UI update to show menu
    uiSystem.update(0);

    // ── CAMERA HELPERS (REUSED OBJECTS) ─
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const offset = new THREE.Vector3(0, 4, 8); // Adjusted for better view
    const tempVec = new THREE.Vector3();

    // Initialize camera properly (no jump)
    camPos.copy(camera.position);
    camTarget.copy(car.position);

    // ── GAME STATE TRACKING ────────────
    let lastSpeed = 0;
    let crashFlashTimer = 0;
    let originalBackground: THREE.Color;

    // Store original background color
    if (scene.background) {
      originalBackground = scene.background.clone();
    } else {
      originalBackground = new THREE.Color(0x111122);
      scene.background = originalBackground;
    }

    // ── ANIMATION LOOP ─────────────────
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFPSUpdate = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      let delta = (now - lastTime) / 1000;
      
      // Cap delta to prevent large jumps
      if (delta > 0.033) delta = 0.033;
      if (delta < 0.001) {
        renderer.render(scene, camera);
        return;
      }
      
      lastTime = now;

      // Update FPS counter (optional debug)
      frameCount++;
      if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFPSUpdate));
        const speed = controller.getRunningSpeed();
        // Uncomment for debug:
        // console.log(`FPS: ${fps}, Speed: ${speed.toFixed(1)}, Lane: ${controller.getCurrentLane()}`);
        frameCount = 0;
        lastFPSUpdate = now;
      }

      // ── CRASH EFFECT ─────────────────
      if (controller.isCrashed()) {
        crashFlashTimer += delta;
        if (crashFlashTimer < 0.2) {
          // Flash red on crash
          scene.background = new THREE.Color(0x330000);
        } else if (crashFlashTimer < 0.5) {
          // Fade back to normal
          const t = (crashFlashTimer - 0.2) / 0.3;
          const r = 0x33 * (1 - t);
          const color = new THREE.Color(r / 255, 0, 0);
          scene.background = color;
        } else {
          scene.background = originalBackground;
          crashFlashTimer = 0;
        }
      } else {
        // Smooth background reset
        if (scene.background.getHex() !== originalBackground.getHex()) {
          scene.background = originalBackground;
        }
      }

      // ── UPDATE GAME SYSTEMS ───────────
      gameStateManager.update(delta);
      controller.update(delta);
      
      if (updateTraffic) {
        updateTraffic(delta, car.position);
      }

      // Update input (must be after controller update)
      input.update();

      // Update UI
      uiSystem.update(delta);

      // ── CAMERA FOLLOW (STABLE + SMOOTH) ─
      // Calculate desired camera position
      tempVec.copy(offset);
      
      // Apply car rotation for dynamic following
      if (car.rotation.y) {
        tempVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
      }
      
      const desiredPos = tempVec.clone().add(car.position);

      // Smooth position interpolation
      camPos.lerp(desiredPos, 0.15);
      camera.position.copy(camPos);

      // Smooth look target (slightly above car for better view)
      tempVec.set(
        car.position.x,
        car.position.y + 1.5,
        car.position.z
      );

      camTarget.lerp(tempVec, 0.2);
      camera.lookAt(camTarget);

      // ── SPEED-BASED FOV EFFECT ────────
      const currentSpeed = controller.getRunningSpeed();
      const targetFOV = 75 + (currentSpeed / controller['maxSpeed']) * 10;
      camera.fov += (targetFOV - camera.fov) * 0.05;
      camera.updateProjectionMatrix();

      // ── SPEED LINES EFFECT (optional) ─
      if (currentSpeed > 8.0 && !controller.isCrashed()) {
        // You could add speed line particles here for visual effect
        // This is a placeholder for future enhancement
      }

      // Log speed changes (for debugging)
      if (Math.abs(currentSpeed - lastSpeed) > 0.5) {
        console.log(`[GameScene] Speed: ${currentSpeed.toFixed(1)} units/sec`);
        lastSpeed = currentSpeed;
      }

      // Render the scene
      renderer.render(scene, camera);
    };

    // Start the animation loop
    animate();

    // ── KEYBOARD SHORTCUTS ─────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // Speed boost on 'B' key
      if (e.code === 'KeyB' && !controller.isCrashed()) {
        controller.boostSpeed(2.0, 1.8);
        console.log('[GameScene] Speed boost activated!');
      }
      
      // Increase speed on '+' or '='
      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        controller.increaseSpeed(0.5);
        console.log(`[GameScene] Speed increased to: ${controller.getRunningSpeed().toFixed(1)}`);
      }
      
      // Decrease speed on '-' 
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        controller.decreaseSpeed(0.5);
        console.log(`[GameScene] Speed decreased to: ${controller.getRunningSpeed().toFixed(1)}`);
      }
      
      // Reset speed on 'R'
      if (e.code === 'KeyR') {
        controller.setBaseSpeed(6.0);
        console.log('[GameScene] Speed reset to default');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    // ── CLEANUP ────────────────────────
    return () => {
      console.log('[GameScene] Cleaning up...');
      cancelAnimationFrame(animId);
      input.destroy();
      uiSystem.destroy();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', setSize);
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative',
        backgroundColor: '#000',
      }}
    />
  );
}