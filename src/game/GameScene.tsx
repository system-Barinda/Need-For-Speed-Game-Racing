import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { initThreeGame } from './ThreeSetup';
import { InputHandler } from './InputHandler';
import { GameController } from './GameController';

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
      obstacles,
      updateTraffic,
      cleanup,
    } = initThreeGame({ mount: mountRef.current });

    // ── SET SIZE (BASED ON CONTAINER) ──
    const setSize = () => {
      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    setSize();
    window.addEventListener('resize', setSize);

    // ── INPUT + CONTROLLER ─────────────
    const input = new InputHandler();
    const controller = new GameController(car, obstacles, input);

    // ── CAMERA HELPERS (REUSED OBJECTS) ─
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const offset = new THREE.Vector3(0, 4, 10);
    const tempVec = new THREE.Vector3();

    // ✅ FIX: initialize camera properly (no jump)
    camPos.copy(camera.position);
    camTarget.copy(car.position);

    // ── ANIMATION LOOP ─────────────────
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const safeDelta = Math.min(delta, 0.033);

      controller.update(safeDelta);
      updateTraffic?.();

      // ── CAMERA FOLLOW (STABLE + SMOOTH) ─
      tempVec.copy(offset);
      tempVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);

      const desiredPos = tempVec.add(car.position);

      // smooth position
      camPos.lerp(desiredPos, 0.1);
      camera.position.copy(camPos);

      // smooth look target
      tempVec.set(
        car.position.x,
        car.position.y + 1,
        car.position.z
      );

      camTarget.lerp(tempVec, 0.15);
      camera.lookAt(camTarget);

      renderer.render(scene, camera);
    };

    animate();

    // ── CLEANUP ────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      input.destroy();
      cleanup();
      window.removeEventListener('resize', setSize);
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
      }}
    />
  );
}