import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    // --- Movement Variables ---
    let speed = 0;
    const maxSpeed = 0.5;
    const acceleration = 0.02;
    const friction = 0.01;
    const turnSensitivity = 0.07;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // FIX 1: Set initial camera position immediately so it's not at (0,0,0)
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // --- Road & Grid ---
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1000),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    const grid = new THREE.GridHelper(1000, 100, 0x444444, 0xffffff);
    grid.position.y = 0.01;
    scene.add(grid);

    // --- Car ---
    const carGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.6, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    body.position.y = 0.3; // Half of height so it sits ON the road
    carGroup.add(body);
    scene.add(carGroup);

    // FIX 2: Ensure camera is looking at the car before loop starts
    camera.lookAt(carGroup.position);

    // --- Controls ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') moveForward = true;
      if (key === 'arrowdown' || key === 's') moveBackward = true;
      if (key === 'arrowleft' || key === 'a') moveLeft = true;
      if (key === 'arrowright' || key === 'd') moveRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') moveForward = false;
      if (key === 'arrowdown' || key === 's') moveBackward = false;
      if (key === 'arrowleft' || key === 'a') moveLeft = false;
      if (key === 'arrowright' || key === 'd') moveRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Animation Loop ---
    let animationId: number;
    const cameraOffset = new THREE.Vector3(0, 4, 8);

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Physics
      if (moveForward) speed += acceleration;
      else if (moveBackward) speed -= acceleration;
      else {
        if (speed > 0) speed = Math.max(0, speed - friction);
        if (speed < 0) speed = Math.min(0, speed + friction);
      }
      speed = Math.max(-maxSpeed / 2, Math.min(speed, maxSpeed));

      // Movement
      carGroup.position.z -= speed;

      if (Math.abs(speed) > 0.01) {
        const turn = turnSensitivity * (speed / maxSpeed);
        if (moveLeft) carGroup.position.x -= turn;
        if (moveRight) carGroup.position.x += turn;
      }
      carGroup.position.x = Math.max(-4.4, Math.min(4.4, carGroup.position.x));

      // Camera Follow
      const targetCameraPos = carGroup.position.clone().add(cameraOffset);
      camera.position.lerp(targetCameraPos, 0.1);
      camera.lookAt(
        carGroup.position.x,
        carGroup.position.y,
        carGroup.position.z
      );

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
      initialized.current = false;
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default GameScene;
