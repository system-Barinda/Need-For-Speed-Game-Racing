import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  // All mutable game objects and state in refs
  const gameRef = useRef<{
    car: THREE.Group | null;
    carBody: THREE.Mesh | null;
    tires: THREE.Mesh[];
    sun: THREE.DirectionalLight | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    speed: number;
    keys: { fwd: boolean; bwd: boolean; lft: boolean; rgt: boolean };
  }>({
    car: null,
    carBody: null,
    tires: [],
    sun: null,
    camera: null,
    renderer: null,
    speed: 0,
    keys: { fwd: false, bwd: false, lft: false, rgt: false },
  });

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    const MAX_SPEED = 1.4;
    const ACCELERATION = 0.045;
    const FRICTION = 0.018;
    const TURN = 0.052;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 60, 200);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 500);
    camera.position.set(0, 3.5, 8);
    camera.lookAt(0, 1, 0);

    // Lights
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

    // Ground & Road (unchanged)
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

    // Dashes and edge lines (unchanged - omitted for brevity, copy from your code)

    // Trees (unchanged - copy from your previous code)

    // === CAR ===
    const car = new THREE.Group();
    scene.add(car);

    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.58, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    carBody.position.y = 0.58;
    carBody.castShadow = true;
    car.add(carBody);

    // Cabin, glass, headlights, taillights (copy exactly from your code)
    // ... (add them here the same way)

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

    // Save everything to ref
    const g = gameRef.current;
    g.car = car;
    g.carBody = carBody;
    g.tires = tires;
    g.sun = sun;
    g.camera = camera;
    g.renderer = renderer;

    // Animation
    let animId: number;
    const camTarget = new THREE.Vector3();
    const camPos = new THREE.Vector3(0, 3.5, 8);
    const OFFSET = new THREE.Vector3(0, 3.5, 9);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const keys = g.keys;
      let speed = g.speed;

      // Speed control
      if (keys.fwd) speed = Math.min(speed + ACCELERATION, MAX_SPEED);
      else if (keys.bwd)
        speed = Math.max(speed - ACCELERATION, -MAX_SPEED * 0.55);
      else {
        if (speed > 0) speed = Math.max(0, speed - FRICTION);
        if (speed < 0) speed = Math.min(0, speed + FRICTION);
      }
      g.speed = speed;

      // Steering
      if (Math.abs(speed) > 0.008 && g.car) {
        const t = TURN * (speed / MAX_SPEED);
        if (keys.lft) g.car.rotation.y += t;
        if (keys.rgt) g.car.rotation.y -= t;
      }

      // Move car
      if (g.car) {
        const dir = new THREE.Vector3(
          -Math.sin(g.car.rotation.y),
          0,
          -Math.cos(g.car.rotation.y)
        );
        g.car.position.addScaledVector(dir, speed);

        // Body tilt
        if (g.carBody) {
          g.carBody.rotation.x = THREE.MathUtils.lerp(
            g.carBody.rotation.x,
            -speed * 0.07,
            0.25
          );
        }

        // Wheel spin
        g.tires.forEach((t) => {
          t.rotation.x += speed * 4.0;
        });
      }

      // Camera follow
      if (g.car && g.camera) {
        const behind = OFFSET.clone().applyEuler(
          new THREE.Euler(0, g.car.rotation.y, 0)
        );
        camPos.lerp(g.car.position.clone().add(behind), 0.12);
        g.camera.position.copy(camPos);

        camTarget.lerp(
          new THREE.Vector3(
            g.car.position.x,
            g.car.position.y + 1.2,
            g.car.position.z
          ),
          0.18
        );
        g.camera.lookAt(camTarget);
      }

      // Sun follows
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
      console.log('Key down:', e.key); // ← remove after testing

      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') g.keys.fwd = true;
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
        g.keys.bwd = true;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
        g.keys.lft = true;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
        g.keys.rgt = true;
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

    // Focus the canvas for better keyboard capture
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
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 25px',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      >
        W/↑ Accelerate &nbsp; | &nbsp; S/↓ Brake &nbsp; | &nbsp; A/← Left &nbsp;
        | &nbsp; D/→ Right
      </div>
    </div>
  );
};

export default GameScene;
