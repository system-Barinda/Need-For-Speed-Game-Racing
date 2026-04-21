import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  const [crash, setCrash] = useState(false);

  const gameRef = useRef<{
    car: THREE.Group | null;
    carBody: THREE.Mesh | null;
    tires: THREE.Mesh[];
    sun: THREE.DirectionalLight | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    obstacles: THREE.Mesh[];
    speed: number;
    keys: {
      fwd: boolean;
      bwd: boolean;
      lft: boolean;
      rgt: boolean;
      reset: boolean;
    };
  }>({
    car: null,
    carBody: null,
    tires: [],
    sun: null,
    camera: null,
    renderer: null,
    obstacles: [],
    speed: 0,
    keys: { fwd: false, bwd: false, lft: false, rgt: false, reset: false },
  });

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    const MAX_SPEED = 1.6;
    const ACCELERATION = 0.055;
    const BRAKE = 0.08;
    const FRICTION = 0.022;
    const TURN = 0.055;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 60, 200);

    const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 500);
    camera.position.set(0, 3.5, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff8e7, 1.3);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.camera.far = 400;
    scene.add(sun);

    // Ground & Road (same as before)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 2000),
      new THREE.MeshStandardMaterial({ color: 0x4a8c3f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2000),
      new THREE.MeshStandardMaterial({ color: 0x282828 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Center dashes + edge lines (copy your original code here if needed)

    // === OBSTACLES ===
    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    const obstacles: THREE.Mesh[] = [];
    const obstacleSize = 1.2;

    // Spawn some obstacles along the road sides
    for (let i = -800; i < 800; i += 45 + Math.random() * 25) {
      [-5.5, 5.5].forEach((side) => {
        const obs = new THREE.Mesh(
          new THREE.BoxGeometry(obstacleSize, obstacleSize * 0.8, obstacleSize),
          obstacleMat
        );
        obs.position.set(
          side + (Math.random() - 0.5) * 1.5,
          obstacleSize * 0.4,
          i
        );
        obs.castShadow = true;
        obs.receiveShadow = true;
        scene.add(obs);
        obstacles.push(obs);
      });
    }

    // Car (same as before - paste your full car creation code here)
    const car = new THREE.Group();
    scene.add(car);

    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.58, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    carBody.position.y = 0.58;
    carBody.castShadow = true;
    car.add(carBody);

    // Cabin, glass, lights, wheels... (add your full car parts here exactly as before)

    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20);
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.29, 8);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

    const tires: THREE.Mesh[] = [];

    [
      [-1, 1.3],
      [1, 1.3],
      [-1, -1.3],
      [1, -1.3],
    ].forEach(([sx, sz]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wg.add(tire);

      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);

      wg.position.set(sx * 0.98, 0.34, sz);
      car.add(wg);
      tires.push(tire);
    });

    car.position.set(0, 0, 0);

    // Store everything
    const g = gameRef.current;
    g.car = car;
    g.carBody = carBody;
    g.tires = tires;
    g.sun = sun;
    g.camera = camera;
    g.renderer = renderer;
    g.obstacles = obstacles;

    // Animation
    let animId: number;
    const camTarget = new THREE.Vector3();
    const camPos = new THREE.Vector3(0, 3.5, 8);
    const OFFSET = new THREE.Vector3(0, 3.5, 9.5);

    const carBox = new THREE.Box3();
    const obsBox = new THREE.Box3();

    const checkCollision = (): boolean => {
      if (!g.car) return false;
      carBox.setFromObject(g.car);

      for (const obs of g.obstacles) {
        obsBox.setFromObject(obs);
        if (carBox.intersectsBox(obsBox)) {
          return true;
        }
      }
      return false;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const keys = g.keys;
      let speed = g.speed;

      if (keys.reset) {
        // Reset car
        if (g.car) {
          g.car.position.set(0, 0, 0);
          g.car.rotation.y = 0;
        }
        speed = 0;
        setCrash(false);
        keys.reset = false;
      }

      if (!crash) {
        // Acceleration / Braking
        if (keys.fwd) {
          speed = Math.min(speed + ACCELERATION, MAX_SPEED);
        } else if (keys.bwd) {
          speed = Math.max(speed - BRAKE, -MAX_SPEED * 0.6);
        } else {
          if (speed > 0) speed = Math.max(0, speed - FRICTION);
          else if (speed < 0) speed = Math.min(0, speed + FRICTION);
        }

        g.speed = speed;

        // Steering
        if (Math.abs(speed) > 0.01 && g.car) {
          const turnSpeed = TURN * (Math.abs(speed) / MAX_SPEED);
          if (keys.lft) g.car.rotation.y += turnSpeed;
          if (keys.rgt) g.car.rotation.y -= turnSpeed;
        }

        // Move car
        if (g.car && Math.abs(speed) > 0.005) {
          const dir = new THREE.Vector3(
            -Math.sin(g.car.rotation.y),
            0,
            -Math.cos(g.car.rotation.y)
          );
          g.car.position.addScaledVector(dir, speed);

          // Body tilt + wheels
          if (g.carBody) {
            g.carBody.rotation.x = THREE.MathUtils.lerp(
              g.carBody.rotation.x,
              -speed * 0.08,
              0.3
            );
          }
          g.tires.forEach((t) => (t.rotation.x += speed * 4.2));
        }

        // Check collision AFTER movement
        if (checkCollision()) {
          speed = 0;
          g.speed = 0;
          setCrash(true);
        }
      }

      // Camera & Sun (same as before)
      if (g.car && g.camera) {
        const behind = OFFSET.clone().applyEuler(
          new THREE.Euler(0, g.car.rotation.y, 0)
        );
        camPos.lerp(g.car.position.clone().add(behind), 0.1);
        g.camera.position.copy(camPos);

        camTarget.lerp(
          new THREE.Vector3(
            g.car.position.x,
            g.car.position.y + 1.3,
            g.car.position.z
          ),
          0.2
        );
        g.camera.lookAt(camTarget);
      }

      if (g.sun && g.car) {
        g.sun.position.set(
          g.car.position.x + 30,
          g.car.position.y + 60,
          g.car.position.z + 20
        );
        g.sun.target.position.copy(g.car.position);
        g.sun.target.updateMatrixWorld();
      }

      if (g.renderer && g.camera) {
        g.renderer.render(scene, g.camera);
      }
    };

    animate();

    // Controls
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') g.keys.fwd = true;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
        g.keys.bwd = true;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
        g.keys.lft = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
        g.keys.rgt = true;
      if (e.key.toLowerCase() === 'r') g.keys.reset = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
        g.keys.fwd = false;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
        g.keys.bwd = false;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
        g.keys.lft = false;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
        g.keys.rgt = false;
    };

    const onResize = () => {
      if (g.camera && g.renderer) {
        g.camera.aspect = W() / H();
        g.camera.updateProjectionMatrix();
        g.renderer.setSize(W(), H());
      }
    };

    renderer.domElement.tabIndex = 1;
    renderer.domElement.focus();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      initialized.current = false;
    };
  }, [crash]); // re-run only if crash state changes (rare)

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

      {/* Controls HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.65)',
          padding: '10px 25px',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      >
        W/↑ Accelerate &nbsp;|&nbsp; S/↓ Brake &nbsp;|&nbsp; A/← Left
        &nbsp;|&nbsp; D/→ Right &nbsp;|&nbsp; R = Reset
      </div>

      {/* Crash Message */}
      {crash && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff4444',
            fontSize: '48px',
            fontWeight: 'bold',
            textShadow: '0 0 10px #000',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          CRASH!
        </div>
      )}
    </div>
  );
};

export default GameScene;
