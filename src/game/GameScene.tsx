import { useEffect, useRef } from "react";
import * as THREE from "three";
import { initThreeGame } from "./ThreeSetup";
import { InputHandler } from "./InputHandler";
import { GameController } from "./GameController";

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
      updateTraffic,
      cleanup,
    } = initThreeGame({ mount: mountRef.current });

    // ── INPUT + CONTROLLER ─────────────
    const input = new InputHandler();

    const controller = new GameController(
      car,
      curve,
      obstacles,
      input,
      updateTraffic
    );

    // ── CAMERA HELPERS ─────────────────
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3();

    // ── ANIMATION LOOP ─────────────────
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      controller.update();

      // 🚗 CAMERA FOLLOW (SMOOTH)
      const offset = new THREE.Vector3(0, 4, 10);
      offset.applyEuler(new THREE.Euler(0, car.rotation.y, 0));

      const desiredPos = car.position.clone().add(offset);

      // smooth camera movement
      camPos.lerp(desiredPos, 0.08);
      camera.position.copy(camPos);

      // smooth look at
      camTarget.lerp(
        new THREE.Vector3(
          car.position.x,
          car.position.y + 1,
          car.position.z
        ),
        0.15
      );

      camera.lookAt(camTarget);

      renderer.render(scene, camera);
    };

    animate();

    // ── CLEANUP ────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      input.destroy();
      cleanup();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: "100%", height: "100vh", overflow: "hidden" }}
    />
  );
}