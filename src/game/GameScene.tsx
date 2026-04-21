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
    const maxSpeed = 0.4;
    const acceleration = 0.015;
    const friction = 0.008;
    const turnSensitivity = 0.04;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;

    // ===============================
    // 🎬 Scene Setup
    // ===============================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, 120);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // ===============================
    // 💡 Lighting
    // ===============================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // ===============================
    // 🌿 Ground
    // ===============================
    const groundGeo = new THREE.PlaneGeometry(200, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ===============================
    // 🛣️ Road
    // ===============================
    const roadGeo = new THREE.PlaneGeometry(8, 500);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Center dashes
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = -240; i < 240; i += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 3.5), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, i);
      scene.add(dash);
    }

    // Edge lines
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = -240; i < 240; i += 2) {
      [-3.8, 3.8].forEach((x) => {
        const edge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.12, 1.5),
          edgeMat
        );
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(x, 0.02, i);
        scene.add(edge);
      });
    }

    // ===============================
    // 🌲 Trees
    // ===============================
    const addTree = (x: number, z: number) => {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b5e3c })
      );
      trunk.position.set(x, 0.6, z);
      trunk.castShadow = true;
      scene.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 2.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d6a2d })
      );
      foliage.position.set(x, 2.5, z);
      foliage.castShadow = true;
      scene.add(foliage);
    };

    for (let z = -200; z < 200; z += 12) {
      addTree(-7 + (Math.random() * 2 - 1), z + Math.random() * 4);
      addTree(7 + (Math.random() * 2 - 1), z + Math.random() * 4);
    }

    // ===============================
    // 🚗 Car
    // ===============================
    const carGroup = new THREE.Group();

    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    bodyMesh.position.y = 0.55;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    const cabinMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xcc1100 })
    );
    cabinMesh.position.set(0, 1.05, 0.1);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.42, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.6,
      })
    );
    windshield.position.set(0, 1.05, 1.05);
    carGroup.add(windshield);

    // Headlights
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.8,
    });
    [-0.6, 0.6].forEach((x) => {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.05),
        lightMat
      );
      hl.position.set(x, 0.6, 2.03);
      carGroup.add(hl);
    });

    // Tail lights
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.6,
    });
    [-0.6, 0.6].forEach((x) => {
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.05),
        tailMat
      );
      tl.position.set(x, 0.6, -2.03);
      carGroup.add(tl);
    });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 20);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

    const wheelPositions: [number, number, number][] = [
      [-0.95, 0.32, 1.2],
      [0.95, 0.32, 1.2],
      [-0.95, 0.32, -1.2],
      [0.95, 0.32, -1.2],
    ];

    const wheels: THREE.Mesh[] = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.26, 8),
        hubMat
      );
      hub.rotation.z = Math.PI / 2;
      wGroup.add(hub);

      wGroup.position.set(x, y, z);
      carGroup.add(wGroup);
      wheels.push(tire);
    });

    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);

    // ===============================
    // 🎥 Camera — tight follow cam
    // ===============================
    const cameraOffset = new THREE.Vector3(0, 2.5, 6);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 1, 0);

    // ===============================
    // 🎮 Controls
    // ===============================
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        moveForward = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')
        moveBackward = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')
        moveLeft = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')
        moveRight = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        moveForward = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')
        moveBackward = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')
        moveLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')
        moveRight = false;
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

      if (moveForward) {
        speed += acceleration;
      } else if (moveBackward) {
        speed -= acceleration;
      } else {
        if (speed > 0) speed = Math.max(0, speed - friction);
        if (speed < 0) speed = Math.min(0, speed + friction);
      }
      speed = Math.max(-maxSpeed / 2, Math.min(speed, maxSpeed));

      if (Math.abs(speed) > 0.005) {
        const turnAmount = turnSensitivity * (speed / maxSpeed);
        if (moveLeft) carGroup.rotation.y += turnAmount;
        if (moveRight) carGroup.rotation.y -= turnAmount;
      }

      const direction = new THREE.Vector3(
        -Math.sin(carGroup.rotation.y),
        0,
        -Math.cos(carGroup.rotation.y)
      );
      carGroup.position.addScaledVector(direction, speed);

      // Spin wheels
      wheels.forEach((w) => {
        w.rotation.x += speed * 3;
      });

      // Camera follow
      const rotatedOffset = cameraOffset
        .clone()
        .applyEuler(new THREE.Euler(0, carGroup.rotation.y, 0));
      const targetCameraPos = carGroup.position.clone().add(rotatedOffset);

      camera.position.lerp(targetCameraPos, 0.12);
      camera.lookAt(
        carGroup.position.x,
        carGroup.position.y + 0.8,
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
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.45)',
          padding: '8px 20px',
          borderRadius: 8,
          letterSpacing: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        W / ↑ &nbsp; Forward &nbsp;|&nbsp; S / ↓ &nbsp; Reverse &nbsp;|&nbsp; A
        / ← &nbsp; Left &nbsp;|&nbsp; D / → &nbsp; Right
      </div>
    </div>
  );
};

export default GameScene;
