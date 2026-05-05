import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { initThreeGame } from './ThreeSetup';
import { InputHandler } from './InputHandler';
import { GameController } from './GameController';
import { GameStateManager } from './GameStateManager';
import { UISystem } from './UISystem';
import { GameState } from './types';

export default function GameScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const gameRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    car: THREE.Group;
    controller: GameController;
    gameStateManager: GameStateManager;
    uiSystem: UISystem;
    input: InputHandler;
    updateTraffic: (delta: number, playerPos: THREE.Vector3) => void;
    cleanup: () => void;
  } | null>(null);

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
      LANE_WIDTH,
      ROAD_WIDTH,
    } = initThreeGame({ mount: mountRef.current });

    // ── SET SIZE ──
    const setSize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      renderer.setSize(width, height);
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

    // Set initial camera position behind car
    camera.position.set(0, 5, 12);
    camera.lookAt(car.position);

    // Store refs
    gameRef.current = {
      scene,
      camera,
      renderer,
      car,
      controller,
      gameStateManager,
      uiSystem,
      input,
      updateTraffic,
      cleanup,
    };

    setIsInitialized(true);

    // ── ANIMATION LOOP ─────────────────
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      
      const now = performance.now();
      let delta = (now - lastTime) / 1000;
      if (delta > 0.033) delta = 0.033;
      if (delta < 0.001) {
        renderer.render(scene, camera);
        return;
      }
      lastTime = now;

      if (!gameRef.current) return;

      const state = gameStateManager.getState();
      
      // Only update game logic when playing
      if (state === GameState.PLAYING) {
        // Update controller
        controller.update(delta);
        
        // Update traffic
        updateTraffic(delta, car.position);
        
        // Update game state manager
        gameStateManager.update(delta);
        
        // Update camera to follow car
        const targetPos = car.position.clone();
        // Camera follows behind car
        const cameraOffset = new THREE.Vector3(0, 4, 10);
        const desiredPos = targetPos.clone().add(cameraOffset);
        camera.position.lerp(desiredPos, 0.1);
        camera.lookAt(targetPos);
      }
      
      // Update input (reset just-pressed states)
      input.update();
      
      // Update UI
      uiSystem.update(delta);
      
      // Render
      renderer.render(scene, camera);
    };

    animate();

    // ── CLEANUP ────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      if (gameRef.current) {
        gameRef.current.input.destroy();
        gameRef.current.uiSystem.destroy();
        gameRef.current.cleanup();
      }
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
        position: 'relative',
        backgroundColor: '#000',
      }}
    />
  );
}