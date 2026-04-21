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
    const maxSpeed = 1.2; // much faster
    const acceleration = 0.04; // quicker response
    const friction = 0.02;
    const turnSensitivity = 0.045;

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;

    // ===============================
    // 🎬 Scene Setup
    // ===============================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

    const camera = new THREE.PerspectiveCamera(
      65,
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    dirLight.shadow.camera.far = 300;
    scene.add(dirLight);

    // ===============================
    // 🌿 Ground (large static plane)
    // ===============================
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x4a7c3f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ===============================
    // 🛣️ Road Segments (tile & recycle)
    // ===============================
    const ROAD_WIDTH = 10;
    const TILE_LEN = 20;
    const NUM_TILES = 14; // enough to fill view + buffer

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    // Each tile is a group: road + markings
    const roadTiles: THREE.Group[] = [];

    const makeTile = (zPos: number): THREE.Group => {
      const g = new THREE.Group();

      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, TILE_LEN),
        roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.receiveShadow = true;
      g.add(road);

      // center dash
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 0.02;
      g.add(dash);

      // edge lines
      [-4.8, 4.8].forEach((x) => {
        const edge = new THREE.Mesh(
          new THREE.PlaneGeometry(0.15, TILE_LEN),
          edgeMat
        );
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(x, 0.02, 0);
        g.add(edge);
      });

      g.position.set(0, 0.01, zPos);
      scene.add(g);
      return g;
    };

    for (let i = 0; i < NUM_TILES; i++) {
      roadTiles.push(makeTile(i * TILE_LEN - (NUM_TILES / 2) * TILE_LEN));
    }

    // ===============================
    // 🌲 Tree Columns (recycle too)
    // ===============================
    const TREE_SPACING = 14;
    const NUM_TREE_ROWS = 12;
    const treePairs: THREE.Group[] = [];

    const makeTreePair = (zPos: number): THREE.Group => {
      const g = new THREE.Group();
      [-8.5, 8.5].forEach((x) => {
        const xOff = (Math.random() - 0.5) * 2;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 1.4, 7),
          new THREE.MeshStandardMaterial({ color: 0x7a4f2a })
        );
        trunk.position.set(x + xOff, 0.7, 0);
        trunk.castShadow = true;
        g.add(trunk);

        const foliage = new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 3.0, 7),
          new THREE.MeshStandardMaterial({ color: 0x266626 })
        );
        foliage.position.set(x + xOff, 3.0, 0);
        foliage.castShadow = true;
        g.add(foliage);
      });
      g.position.set(0, 0, zPos);
      scene.add(g);
      return g;
    };

    for (let i = 0; i < NUM_TREE_ROWS; i++) {
      treePairs.push(
        makeTreePair(i * TREE_SPACING - (NUM_TREE_ROWS / 2) * TREE_SPACING)
      );
    }

    // ===============================
    // 🚗 Car
    // ===============================
    const carGroup = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 4.0),
      new THREE.MeshStandardMaterial({ color: 0xff2200 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    carGroup.add(body);

    // Cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 2.0),
      new THREE.MeshStandardMaterial({ color: 0xcc1100 })
    );
    cabin.position.set(0, 1.05, 0.1);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.42, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.65,
      })
    );
    windshield.position.set(0, 1.05, 1.06);
    carGroup.add(windshield);

    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
      emissiveIntensity: 1,
    });
    [-0.62, 0.62].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), hlMat);
      hl.position.set(x, 0.58, 2.04);
      carGroup.add(hl);
    });

    // Tail lights
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
    });
    [-0.62, 0.62].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), tlMat);
      tl.position.set(x, 0.58, -2.04);
      carGroup.add(tl);
    });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 20);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hubMat2 = new THREE.MeshStandardMaterial({ color: 0x999999 });

    const wheelPositions: [number, number, number][] = [
      [-0.97, 0.33, 1.25],
      [0.97, 0.33, 1.25],
      [-0.97, 0.33, -1.25],
      [0.97, 0.33, -1.25],
    ];

    const wheelMeshes: THREE.Mesh[] = [];
    wheelPositions.forEach(([x, y, z]) => {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wg.add(tire);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.27, 8),
        hubMat2
      );
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      wg.position.set(x, y, z);
      carGroup.add(wg);
      wheelMeshes.push(tire);
    });

    // Car stays at world origin — world moves around it
    carGroup.position.set(0, 0, 0);
    scene.add(carGroup);

    // ===============================
    // 🎥 Camera
    // ===============================
    const cameraOffset = new THREE.Vector3(0, 2.8, 7);
    camera.position.set(0, 2.8, 7);
    camera.lookAt(0, 1, 0);

    // ===============================
    // 🎮 Controls
    // ===============================
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        moveForward = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')
        moveBackward = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')
        moveLeft = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')
        moveRight = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')
        moveForward = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')
        moveBackward = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')
        moveLeft = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')
        moveRight = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ===============================
    // 🔄 Animation Loop
    // ===============================
    let animId: number;

    // Track car world position separately (car mesh stays at origin)
    const carWorldPos = new THREE.Vector3(0, 0, 0);
    let carAngle = 0; // car's heading in radians

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Speed
      if (moveForward) speed += acceleration;
      else if (moveBackward) speed -= acceleration;
      else {
        if (speed > 0) speed = Math.max(0, speed - friction);
        if (speed < 0) speed = Math.min(0, speed + friction);
      }
      speed = Math.max(-maxSpeed * 0.5, Math.min(speed, maxSpeed));

      // Steering
      if (Math.abs(speed) > 0.01) {
        const turn = turnSensitivity * (speed / maxSpeed);
        if (moveLeft) carAngle += turn;
        if (moveRight) carAngle -= turn;
      }

      // Move world position
      const dx = -Math.sin(carAngle) * speed;
      const dz = -Math.cos(carAngle) * speed;
      carWorldPos.x += dx;
      carWorldPos.z += dz;

      // Visual car rotation (stays centered in world)
      carGroup.rotation.y = carAngle;

      // Tilt car slightly on acceleration/braking for feel
      carGroup.rotation.x = THREE.MathUtils.lerp(
        carGroup.rotation.x,
        -speed * 0.08,
        0.15
      );

      // Spin wheels
      wheelMeshes.forEach((w) => {
        w.rotation.x += speed * 3.5;
      });

      // ✅ KEY FIX: Move the entire world opposite to car movement
      // This creates infinite scrolling — road & trees shift around the car
      ground.position.x = -carWorldPos.x;
      ground.position.z = -carWorldPos.z;

      // Recycle road tiles
      roadTiles.forEach((tile) => {
        tile.position.x = -carWorldPos.x; // keep road centered on car x
        // tiles scroll on z
        const relZ = tile.position.z - -carWorldPos.z;
        if (relZ > TILE_LEN * (NUM_TILES / 2)) {
          tile.position.z -= TILE_LEN * NUM_TILES;
        } else if (relZ < -TILE_LEN * (NUM_TILES / 2)) {
          tile.position.z += TILE_LEN * NUM_TILES;
        }
      });

      // Recycle tree pairs
      treePairs.forEach((pair) => {
        const relZ = pair.position.z - -carWorldPos.z;
        if (relZ > TREE_SPACING * (NUM_TREE_ROWS / 2)) {
          pair.position.z -= TREE_SPACING * NUM_TREE_ROWS;
        } else if (relZ < -TREE_SPACING * (NUM_TREE_ROWS / 2)) {
          pair.position.z += TREE_SPACING * NUM_TREE_ROWS;
        }
      });

      // Camera follows behind car
      const rotatedOffset = cameraOffset
        .clone()
        .applyEuler(new THREE.Euler(0, carAngle, 0));

      camera.position.lerp(rotatedOffset, 0.12);
      camera.lookAt(0, carGroup.position.y + 0.8, 0);

      renderer.render(scene, camera);
    };

    animate();

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

      {/* Speed indicator */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 22,
          fontWeight: 'bold',
          background: 'rgba(0,0,0,0.5)',
          padding: '10px 18px',
          borderRadius: 10,
          pointerEvents: 'none',
          letterSpacing: 2,
        }}
      >
        🚗 DRIVE
      </div>

      {/* Controls HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.5)',
          padding: '9px 22px',
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
