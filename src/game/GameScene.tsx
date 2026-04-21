import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);
  const [crash, setCrash] = useState(false);
  const crashRef = useRef(false);

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

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W(), H());
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 60, 200);

    // ── Camera ────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 500);
    camera.position.set(0, 3.5, 8);

    // ── Lights ────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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

    // ── Ground ────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 2000),
      new THREE.MeshStandardMaterial({ color: 0x4a8c3f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ── Road ─────────────────────────────────────────────
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 2000),
      new THREE.MeshStandardMaterial({ color: 0x282828 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    // Center dashes
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let z = -990; z < 990; z += 10) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5), dashMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.02, z);
      scene.add(d);
    }

    // Edge lines
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [-4.85, 4.85].forEach((x) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2000), edgeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, 0);
      scene.add(line);
    });

    // ── Trees ────────────────────────────────────────────
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2a });
    const leafMats = [
      new THREE.MeshStandardMaterial({ color: 0x1e5c1e }),
      new THREE.MeshStandardMaterial({ color: 0x2d7a2d }),
      new THREE.MeshStandardMaterial({ color: 0x3a8a3a }),
    ];

    const addTree = (x: number, z: number, scale: number) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.8 * scale, 7),
        trunkMat
      );
      trunk.position.y = 0.9 * scale;
      trunk.castShadow = true;
      g.add(trunk);

      const mat = leafMats[Math.floor(Math.random() * leafMats.length)];
      [
        { r: 1.6 * scale, h: 2.2 * scale, y: 2.5 * scale },
        { r: 1.2 * scale, h: 1.8 * scale, y: 3.8 * scale },
        { r: 0.7 * scale, h: 1.4 * scale, y: 4.8 * scale },
      ].forEach(({ r, h, y }) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
        cone.position.y = y;
        cone.castShadow = true;
        g.add(cone);
      });

      g.position.set(x, 0, z);
      scene.add(g);
    };

    // Dense forest both sides — rows every 9 units, clusters of 2
    for (let z = -950; z < 950; z += 9) {
      // left forest
      const lx = -(8 + Math.random() * 5);
      addTree(lx, z + (Math.random() - 0.5) * 5, 0.7 + Math.random() * 0.7);
      addTree(
        lx - 3 - Math.random() * 3,
        z + (Math.random() - 0.5) * 5,
        0.6 + Math.random() * 0.6
      );

      // right forest
      const rx = 8 + Math.random() * 5;
      addTree(rx, z + (Math.random() - 0.5) * 5, 0.7 + Math.random() * 0.7);
      addTree(
        rx + 3 + Math.random() * 3,
        z + (Math.random() - 0.5) * 5,
        0.6 + Math.random() * 0.6
      );
    }

    // ── Obstacles ─────────────────────────────────────────
    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    const obstacles: THREE.Mesh[] = [];

    for (let i = -800; i < 800; i += 45 + Math.random() * 25) {
      [-3.5, 3.5].forEach((side) => {
        const obs = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 1.0, 1.2),
          obstacleMat
        );
        obs.position.set(side + (Math.random() - 0.5) * 1.5, 0.5, i);
        obs.castShadow = true;
        obs.receiveShadow = true;
        scene.add(obs);
        obstacles.push(obs);
      });
    }

    // ── Car ───────────────────────────────────────────────
    const car = new THREE.Group();
    scene.add(car);

    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.58, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    carBody.position.y = 0.58;
    carBody.castShadow = true;
    car.add(carBody);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.52, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xcc1100 })
    );
    cabin.position.set(0, 1.09, 0.1);
    cabin.castShadow = true;
    car.add(cabin);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.44, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.6,
      })
    );
    glass.position.set(0, 1.09, 1.08);
    car.add(glass);

    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 1.2,
    });
    [-0.64, 0.64].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.06), hlMat);
      hl.position.set(x, 0.6, 2.05);
      car.add(hl);
    });

    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff2200,
      emissiveIntensity: 0.9,
    });
    [-0.64, 0.64].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.17, 0.06), tlMat);
      tl.position.set(x, 0.6, -2.05);
      car.add(tl);
    });

    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20);
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.29, 8);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const tires: THREE.Mesh[] = [];

    (
      [
        [-1, 1.3],
        [1, 1.3],
        [-1, -1.3],
        [1, -1.3],
      ] as [number, number][]
    ).forEach(([sx, sz]) => {
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

    // Store refs
    const g = gameRef.current;
    g.car = car;
    g.carBody = carBody;
    g.tires = tires;
    g.sun = sun;
    g.camera = camera;
    g.renderer = renderer;
    g.obstacles = obstacles;

    // ── Animation ─────────────────────────────────────────
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
        if (carBox.intersectsBox(obsBox)) return true;
      }
      return false;
    };

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const keys = g.keys;
      let speed = g.speed;

      if (keys.reset) {
        if (g.car) {
          g.car.position.set(0, 0, 0);
          g.car.rotation.y = 0;
        }
        speed = 0;
        g.speed = 0;
        crashRef.current = false;
        setCrash(false);
        keys.reset = false;
      }

      if (!crashRef.current) {
        if (keys.fwd) speed = Math.min(speed + ACCELERATION, MAX_SPEED);
        else if (keys.bwd) speed = Math.max(speed - BRAKE, -MAX_SPEED * 0.6);
        else {
          if (speed > 0) speed = Math.max(0, speed - FRICTION);
          if (speed < 0) speed = Math.min(0, speed + FRICTION);
        }
        g.speed = speed;

        if (Math.abs(speed) > 0.01 && g.car) {
          const t = TURN * (Math.abs(speed) / MAX_SPEED);
          if (keys.lft) g.car.rotation.y += t;
          if (keys.rgt) g.car.rotation.y -= t;
        }

        if (g.car && Math.abs(speed) > 0.005) {
          const dir = new THREE.Vector3(
            -Math.sin(g.car.rotation.y),
            0,
            -Math.cos(g.car.rotation.y)
          );
          g.car.position.addScaledVector(dir, speed);
          if (g.carBody)
            g.carBody.rotation.x = THREE.MathUtils.lerp(
              g.carBody.rotation.x,
              -speed * 0.08,
              0.3
            );
          g.tires.forEach((t) => {
            t.rotation.x += speed * 4.2;
          });
        }

        if (checkCollision()) {
          g.speed = 0;
          crashRef.current = true;
          setCrash(true);
        }
      }

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

      if (g.renderer && g.camera) g.renderer.render(scene, g.camera);
    };

    animate();

    // ── Controls ──────────────────────────────────────────
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
      if (mountRef.current?.contains(renderer.domElement))
        mountRef.current.removeChild(renderer.domElement);
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
          padding: '10px 24px',
          borderRadius: 8,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.5px',
        }}
      >
        W / ↑ &nbsp; Accelerate &nbsp;|&nbsp; S / ↓ &nbsp; Brake &nbsp;|&nbsp; A
        / ← &nbsp; Left &nbsp;|&nbsp; D / → &nbsp; Right &nbsp;|&nbsp;
        <span style={{ color: '#ffdd88' }}>R</span>&nbsp; Reset
      </div>

      {crash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              color: '#ff3333',
              fontSize: 64,
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: 6,
              textShadow: '0 0 30px #ff0000, 0 4px 8px #000',
            }}
          >
            CRASH!
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: 20,
              fontFamily: 'monospace',
              marginTop: 16,
            }}
          >
            Press &nbsp;
            <span style={{ color: '#ffdd88', fontWeight: 'bold' }}>R</span>
            &nbsp; to restart
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScene;
