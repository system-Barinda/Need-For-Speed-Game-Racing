import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const GameScene = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mountRef.current || initialized.current) return;
    initialized.current = true;

    // ── Movement ──────────────────────────────────────────
    let speed = 0;
    const MAX_SPEED = 0.8;
    const ACCELERATION = 0.025;
    const FRICTION = 0.012;
    const TURN = 0.04;

    let fwd = false,
      bwd = false,
      lft = false,
      rgt = false;

    // ── Renderer ──────────────────────────────────────────
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

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
    // start positioned behind where car will be
    camera.position.set(0, 3.5, 8);
    camera.lookAt(0, 1, 0);

    // ── Lights ────────────────────────────────────────────
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
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a2d });
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.6, 7);
    const leafGeo = new THREE.ConeGeometry(1.5, 3.2, 7);

    for (let z = -950; z < 950; z += 14) {
      [-8, 8].forEach((side) => {
        const xOff = side + (Math.random() - 0.5) * 2.5;
        const zOff = z + (Math.random() - 0.5) * 4;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(xOff, 0.8, zOff);
        trunk.castShadow = true;
        scene.add(trunk);

        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(xOff, 3.4, zOff);
        leaf.castShadow = true;
        scene.add(leaf);
      });
    }

    // ── Car ──────────────────────────────────────────────
    const car = new THREE.Group();
    scene.add(car);

    // Body
    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.58, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    carBody.position.y = 0.58;
    carBody.castShadow = true;
    car.add(carBody);

    // Cabin
    const carCabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.52, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xcc1100 })
    );
    carCabin.position.set(0, 1.09, 0.1);
    carCabin.castShadow = true;
    car.add(carCabin);

    // Windshield (front glass)
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

    // Headlights
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

    // Tail lights
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

    // Wheels
    const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 20);
    const hubGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.29, 8);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

    const wheelGroups: THREE.Group[] = [];
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
      wheelGroups.push(wg);
      tires.push(tire);
    });

    car.position.set(0, 0, 0);

    // ── Animation ────────────────────────────────────────
    let animId: number;

    const camTarget = new THREE.Vector3();
    const camPos = new THREE.Vector3(0, 3.5, 8);
    const OFFSET = new THREE.Vector3(0, 3.5, 9);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // ── Speed ──
      if (fwd) speed = Math.min(speed + ACCELERATION, MAX_SPEED);
      else if (bwd) speed = Math.max(speed - ACCELERATION, -MAX_SPEED * 0.5);
      else {
        if (speed > 0) speed = Math.max(0, speed - FRICTION);
        if (speed < 0) speed = Math.min(0, speed + FRICTION);
      }

      // ── Steer ──
      if (Math.abs(speed) > 0.005) {
        const t = TURN * (speed / MAX_SPEED);
        if (lft) car.rotation.y += t;
        if (rgt) car.rotation.y -= t;
      }

      // ── Move car through world ──
      const dir = new THREE.Vector3(
        -Math.sin(car.rotation.y),
        0,
        -Math.cos(car.rotation.y)
      );
      car.position.addScaledVector(dir, speed);

      // Slight body tilt for feel
      carBody.rotation.x = THREE.MathUtils.lerp(
        carBody.rotation.x,
        -speed * 0.06,
        0.2
      );

      // Spin wheels
      tires.forEach((t) => {
        t.rotation.x += speed * 3.5;
      });

      // ── Camera: always stay behind car, rotated with it ──
      const behind = OFFSET.clone().applyEuler(
        new THREE.Euler(0, car.rotation.y, 0)
      );
      camPos.lerp(car.position.clone().add(behind), 0.1);
      camera.position.copy(camPos);

      camTarget.lerp(
        new THREE.Vector3(car.position.x, car.position.y + 1.0, car.position.z),
        0.15
      );
      camera.lookAt(camTarget);

      // Keep directional light near car so shadows follow
      sun.position.set(
        car.position.x + 30,
        car.position.y + 60,
        car.position.z + 20
      );
      sun.target.position.copy(car.position);
      sun.target.updateMatrixWorld();

      renderer.render(scene, camera);
    };

    animate();

    // ── Controls ─────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') fwd = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') bwd = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') lft = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rgt = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') fwd = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') bwd = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') lft = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rgt = false;
    };
    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
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

      {/* Controls HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 12,
          background: 'rgba(0,0,0,0.55)',
          padding: '8px 20px',
          borderRadius: 8,
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          letterSpacing: '0.5px',
        }}
      >
        W / ↑ &nbsp; Accelerate &nbsp;|&nbsp; S / ↓ &nbsp; Brake &nbsp;|&nbsp; A
        / ← &nbsp; Left &nbsp;|&nbsp; D / → &nbsp; Right
      </div>
    </div>
  );
};

export default GameScene;
