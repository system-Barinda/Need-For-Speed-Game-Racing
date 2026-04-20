import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // ===============================
    // 🚗 Movement Variables
    // ===============================
    let speed = 0;
    const maxSpeed = 0.5;
    const acceleration = 0.02;
    const friction = 0.01;

    let moveLeft = false;
    let moveRight = false;

    // ===============================
    // 🎬 Scene Setup
    // ===============================
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // ===============================
    // 💡 Lighting
    // ===============================
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);

    // ===============================
    // 🛣️ Road
    // ===============================
    const roadGeometry = new THREE.PlaneGeometry(10, 50);
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // ===============================
    // 🚗 Car (Cube for now)
    // ===============================
    const carGeometry = new THREE.BoxGeometry(1, 1, 2);
    const carMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
    });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.y = 0.5;
    scene.add(car);

    // ===============================
    // 🎮 Controls
    // ===============================
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') speed += acceleration;
      if (e.key === 'ArrowLeft') moveLeft = true;
      if (e.key === 'ArrowRight') moveRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') moveLeft = false;
      if (e.key === 'ArrowRight') moveRight = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ===============================
    // 📱 Handle Resize
    // ===============================
    const handleResize = () => {
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

      // Apply friction
      if (speed > 0) speed -= friction;
      if (speed < 0) speed = 0;

      // Limit speed
      speed = Math.min(speed, maxSpeed);

      // Move road (simulate forward motion)
      road.position.z += speed;

      // Smooth turning
      if (moveLeft) car.position.x -= 0.1;
      if (moveRight) car.position.x += 0.1;

      // Keep car inside road
      car.position.x = Math.max(-4, Math.min(4, car.position.x));

      renderer.render(scene, camera);
    };

    animate();

    // ===============================
    // 🧹 Cleanup
    // ===============================
    return () => {
      cancelAnimationFrame(animationId);

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();

      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} />;
};

export default GameScene;
