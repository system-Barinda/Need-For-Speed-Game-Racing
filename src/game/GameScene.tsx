import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(renderer.domElement);

    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);

    // Road
    const roadGeometry = new THREE.PlaneGeometry(10, 50);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);

    // Car (simple cube for now)
    const carGeometry = new THREE.BoxGeometry(1, 1, 2);
    const carMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.y = 0.5;
    scene.add(car);

    // Controls
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') car.position.x -= 0.5;
      if (e.key === 'ArrowRight') car.position.x += 0.5;
    };

    window.addEventListener('keydown', handleKey);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Move road (simulate driving)
      road.position.z += 0.2;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKey);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default GameScene;
