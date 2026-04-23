import { useEffect, useRef } from "react";
import { initThreeGame } from "./threeSetup";
import { InputHandler } from "./InputHandler";
import { GameController } from "./GameController";

export default function GameScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { scene, camera, renderer, car, curve, obstacles } =
      initThreeGame({ mount: mountRef.current });

    const input = new InputHandler();
    const controller = new GameController(car, curve, obstacles, input);

    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      controller.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      input.destroy();
    };
  }, []);

  return <div ref={mountRef} />;
}