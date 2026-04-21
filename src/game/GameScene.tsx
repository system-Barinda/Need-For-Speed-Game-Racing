import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    // ===============================
    // 🚗 Movement Variables
    // ===============================
    let speed = 0;
    const maxSpeed = 0.5;
    const acceleration = 0.02;
    const friction = 0.01;
    const turnSensitivity = 0.05;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;

    // ===============================
    // 🎬 Scene Setup
    // ===============================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // ===============================
    // 💡 Lighting
    // ===============================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // ===============================
    // 🛣️ Road
    // ===============================
    const roadGeometry = new THREE.PlaneGeometry(10, 1000);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    const grid = new THREE.GridHelper(1000, 100, 0x000000, 0xffffff);
    grid.position.y = 0.01;
    scene.add(grid);

    // ===============================
    // 🚗 Car
    // ===============================
    const carGroup = new THREE.Group();

    // Car body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    body.position.y = 0.6;
    carGroup.add(body);

    // Car roof/cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xcc0000 })
    );
    cabin.position.set(0, 1.1, -0.1);
    carGroup.add(cabin);

    // Wheels (4 corners)
    const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheelPositions = [
      [-0.7, 0.25, 0.9],
      [0.7, 0.25, 0.9],
      [-0.7, 0.25, -0.9],
      [0.7, 0.25, -0.9],
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      carGroup.add(wheel);
    });

    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);

    // ===============================
    // 🎥 Camera Offset (Behind and Above)
    // ===============================
    const cameraOffset = new THREE.Vector3(0, 4, 10);

    // ===============================
    // 🎮 Controls
    // ===============================
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveForward = true;
      if (e.key === 'ArrowDown' || e.key === 's') moveBackward = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = true;
      if (e.key === 'ArrowRight' || e.key === 'd') moveRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') moveForward = false;
      if (e.key === 'ArrowDown' || e.key === 's') moveBackward = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') moveLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd') moveRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // ===============================
    // 🔄 Animation Loop
    // ===============================
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // ✅ FIX 1: Forward/Backward speed logic
      if (moveForward) {
        speed += acceleration;
      } else if (moveBackward) {
        speed -= acceleration;
      } else {
        // Natural friction
        if (speed > 0) speed = Math.max(0, speed - friction);
        if (speed < 0) speed = Math.min(0, speed + friction);
      }

      // Clamp speed
      speed = Math.max(-maxSpeed / 2, Math.min(speed, maxSpeed));

      // ✅ FIX 2: Rotate the car instead of sliding position.x
      // The car only turns when it's actually moving
      if (Math.abs(speed) > 0.01) {
        const turnAmount = turnSensitivity * (speed / maxSpeed);
        if (moveLeft) carGroup.rotation.y += turnAmount;
        if (moveRight) carGroup.rotation.y -= turnAmount;
      }

      // ✅ FIX 3: Move in the direction the car is facing using its rotation
      const direction = new THREE.Vector3(
        -Math.sin(carGroup.rotation.y),
        0,
        -Math.cos(carGroup.rotation.y)
      );
      carGroup.position.addScaledVector(direction, speed);

      // ✅ FIX 4: Rotate the camera offset with the car so it always stays behind it
      const rotatedOffset = cameraOffset
        .clone()
        .applyEuler(new THREE.Euler(0, carGroup.rotation.y, 0));
      const targetCameraPos = carGroup.position.clone().add(rotatedOffset);

      camera.position.lerp(targetCameraPos, 0.1);
      camera.lookAt(
        carGroup.position.x,
        carGroup.position.y + 1,
        carGroup.position.z
      );

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      initialized.current = false;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}
    />
  );
};

export default GameScene;
