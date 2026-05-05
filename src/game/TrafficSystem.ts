import * as THREE from 'three';

interface TrafficCar {
  mesh: THREE.Group;
  proxy: THREE.Mesh;
  t: number;
  speed: number;
  lane: number;
  targetLane: number;
  laneChangeProgress: number;
  color: number;
}

export class TrafficSystem {
  private trafficCars: TrafficCar[] = [];
  private curve: THREE.CatmullRomCurve3;
  private lanes: number;
  private laneWidth: number;
  private roadWidth: number;
  private scene: THREE.Scene;
  private isPaused: boolean = false;

  // Traffic configuration
  private readonly MIN_SPEED = 0.0004;
  private readonly MAX_SPEED = 0.0009;
  private readonly LANE_CHANGE_DURATION = 1.5;
  private readonly MIN_DISTANCE_BETWEEN_CARS = 18;
  private readonly SPAWN_DISTANCE_AHEAD = 0.4;
  private readonly DESPAWN_DISTANCE_BEHIND = 0.1;

  // Dynamic density control
  private trafficDensity: number = 0.7;
  private spawnCooldown: number = 0;
  private maxCars: number = 30;

  constructor(
    scene: THREE.Scene,
    curve: THREE.CatmullRomCurve3,
    lanes: number,
    laneWidth: number,
    roadWidth: number
  ) {
    this.scene = scene;
    this.curve = curve;
    this.lanes = lanes;
    this.laneWidth = laneWidth;
    this.roadWidth = roadWidth;

    console.info('[TrafficSystem] Initialized with', lanes, 'lanes, width:', laneWidth);
  }

  // Initialize traffic cars
  initializeTraffic(initialCars: TrafficCar[]) {
    this.trafficCars = initialCars;
    console.info(`[TrafficSystem] Loaded ${this.trafficCars.length} traffic cars`);
  }

  // Main update loop
  update(deltaTime: number, playerPosition: THREE.Vector3) {
    if (this.isPaused) return;
    
    // Cap delta time for smooth updates
    const safeDelta = Math.min(deltaTime, 0.033);
    
    this.updateTrafficCars(safeDelta);
    this.handleLaneChanges(safeDelta);
    this.checkTrafficCollisions();
    this.manageTrafficDensity(playerPosition);
    this.updateSpawnCooldown(safeDelta);
  }

  private updateSpawnCooldown(deltaTime: number) {
    if (this.spawnCooldown > 0) {
      this.spawnCooldown -= deltaTime;
    }
  }

  private updateTrafficCars(deltaTime: number) {
    for (let i = 0; i < this.trafficCars.length; i++) {
      const car = this.trafficCars[i];
      
      // Update position along curve
      car.t += car.speed * deltaTime;
      
      // Wrap around if beyond end of track
      if (car.t > 1.0) {
        car.t = car.t - 1.0;
      }
      
      // Get curve frame
      const frame = this.getCurveFrame(car.t);
      const laneOffset = this.calculateLaneOffset(car.lane);
      const position = frame.point.clone().add(frame.normal.clone().multiplyScalar(laneOffset));
      position.y = 0.35;

      // Update mesh position
      car.mesh.position.copy(position);
      car.proxy.position.copy(position);

      // Orient car along curve
      const lookTarget = position.clone().add(frame.tangent);
      car.mesh.lookAt(lookTarget);
      car.proxy.lookAt(lookTarget);

      // Update lane change progress
      if (car.laneChangeProgress < 1) {
        car.laneChangeProgress = Math.min(1, car.laneChangeProgress + deltaTime / this.LANE_CHANGE_DURATION);
        const currentLane = THREE.MathUtils.lerp(car.lane, car.targetLane, car.laneChangeProgress);
        car.lane = currentLane;
      }
    }
  }

  private getCurveFrame(t: number) {
    // Ensure t is within bounds
    const safeT = Math.max(0, Math.min(1, t));
    const point = this.curve.getPoint(safeT);
    const tangent = this.curve.getTangent(safeT).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    return { point, tangent, normal };
  }

  private calculateLaneOffset(lane: number): number {
    // Center the lanes on the road
    const laneCenter = -this.roadWidth / 2 + (lane + 0.5) * this.laneWidth;
    return laneCenter;
  }

  private handleLaneChanges(deltaTime: number) {
    // Clean up completed lane changes
    this.laneChangeQueue = this.laneChangeQueue.filter(car => {
      if (car.laneChangeProgress >= 1) {
        car.lane = car.targetLane;
        car.laneChangeProgress = 1;
        return false;
      }
      return true;
    });

    // Random lane changes for realism (reduced frequency)
    for (const car of this.trafficCars) {
      // Only change lanes if not already changing and not too frequent
      if (Math.random() < 0.0005 * deltaTime && 
          !this.laneChangeQueue.includes(car) && 
          car.laneChangeProgress >= 1) {
        this.requestLaneChange(car);
      }
    }
  }

  private laneChangeQueue: TrafficCar[] = [];

  private requestLaneChange(car: TrafficCar) {
    const currentLane = Math.round(car.lane);
    const possibleLanes = [];
    
    for (let lane = 0; lane < this.lanes; lane++) {
      if (lane !== currentLane) {
        possibleLanes.push(lane);
      }
    }
    
    if (possibleLanes.length > 0) {
      const targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
      
      // Check if lane is safe to change into
      if (this.isLaneChangeSafe(car, targetLane)) {
        car.targetLane = targetLane;
        car.laneChangeProgress = 0;
        this.laneChangeQueue.push(car);
      }
    }
  }

  private isLaneChangeSafe(car: TrafficCar, targetLane: number): boolean {
    // Check for other cars in target lane
    for (const other of this.trafficCars) {
      if (other !== car && Math.round(other.lane) === targetLane) {
        const distance = Math.abs(car.t - other.t);
        if (distance < 0.05) { // Too close
          return false;
        }
      }
    }
    return true;
  }

  private checkTrafficCollisions() {
    // Simple collision avoidance between traffic cars
    for (let i = 0; i < this.trafficCars.length; i++) {
      for (let j = i + 1; j < this.trafficCars.length; j++) {
        const car1 = this.trafficCars[i];
        const car2 = this.trafficCars[j];
        
        const distance = Math.abs(car1.t - car2.t) * 500; // Approximate world distance
        
        if (distance < this.MIN_DISTANCE_BETWEEN_CARS) {
          // Slow down the car behind
          if (car1.t > car2.t) {
            car1.speed = Math.max(this.MIN_SPEED, car2.speed * 0.95);
          } else {
            car2.speed = Math.max(this.MIN_SPEED, car1.speed * 0.95);
          }
        }
      }
    }
  }

  private manageTrafficDensity(playerPosition: THREE.Vector3) {
    // Get player progress along curve (approximate)
    const playerT = this.approximateTFromPosition(playerPosition);
    
    // Remove cars that are too far behind
    const removeThreshold = playerT - this.DESPAWN_DISTANCE_BEHIND;
    this.trafficCars = this.trafficCars.filter(car => {
      if (car.t < removeThreshold || car.t > 1.0) {
        this.scene.remove(car.mesh);
        this.scene.remove(car.proxy);
        // Dispose geometries to prevent memory leaks
        this.disposeCarGeometry(car.mesh);
        return false;
      }
      return true;
    });

    // Spawn new cars ahead based on density
    if (this.trafficCars.length < this.maxCars && this.spawnCooldown <= 0) {
      const spawnT = playerT + this.SPAWN_DISTANCE_AHEAD;
      
      // Check if spawn position is not too close to existing cars
      let canSpawn = true;
      for (const car of this.trafficCars) {
        if (Math.abs(car.t - spawnT) < 0.03) {
          canSpawn = false;
          break;
        }
      }
      
      if (canSpawn && Math.random() < this.trafficDensity * 0.1) {
        this.spawnTrafficCar(spawnT);
        this.spawnCooldown = 0.5; // Cooldown between spawns
      }
    }
  }

  private approximateTFromPosition(position: THREE.Vector3): number {
    // Approximate t based on Z position (since curve mainly moves in Z)
    // This is a simplification - for better accuracy, you'd want to sample the curve
    const curveLength = this.curve.getLength();
    const t = Math.abs(position.z) / curveLength;
    return Math.min(0.95, Math.max(0, t));
  }

  private spawnTrafficCar(t: number) {
    const lane = Math.floor(Math.random() * this.lanes);
    const speed = this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED);
    const color = this.getRandomCarColor();

    const carGroup = this.buildTrafficCar(color);
    this.scene.add(carGroup);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 3.8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.scene.add(proxy);

    const trafficCar: TrafficCar = {
      mesh: carGroup,
      proxy,
      t: Math.max(0, Math.min(1, t)),
      speed,
      lane,
      targetLane: lane,
      laneChangeProgress: 1,
      color
    };

    this.trafficCars.push(trafficCar);
  }

  private buildTrafficCar(color: number): THREE.Group {
    const group = new THREE.Group();

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.6,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: new THREE.Color(0xffff44),
      emissiveIntensity: 0.6,
    });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9 });

    // Main body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 3.8), bodyMat);
    lower.position.y = 0.35;
    lower.castShadow = true;
    group.add(lower);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), bodyMat);
    cabin.position.set(0, 0.85, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Glass
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), glassMat);
    windshield.position.set(0, 0.87, 0.95);
    windshield.rotation.x = -Math.PI * 0.15;
    group.add(windshield);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    const wheelPositions = [
      [0.85, 0.35, 1.2], [-0.85, 0.35, 1.2],
      [0.85, 0.35, -1.2], [-0.85, 0.35, -1.2],
    ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 8), chromeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      group.add(hub);
    }

    // Lights
    for (const lx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), lightMat);
      hl.position.set(lx, 0.42, 1.95);
      group.add(hl);
    }

    return group;
  }

  private disposeCarGeometry(group: THREE.Group) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }

  private getRandomCarColor(): number {
    const colors = [0xcc2200, 0x002299, 0x007744, 0xddaa00, 0x880088, 0x226699, 0x444444, 0x993300];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ================= PUBLIC INTERFACE =================
  
  getTrafficCars(): TrafficCar[] {
    return this.trafficCars;
  }

  getObstacles(): THREE.Mesh[] {
    return this.trafficCars.map(car => car.proxy);
  }

  setTrafficDensity(density: number) {
    this.trafficDensity = Math.max(0, Math.min(1, density));
    console.info(`[TrafficSystem] Traffic density set to: ${this.trafficDensity}`);
  }

  getTrafficDensity(): number {
    return this.trafficDensity;
  }

  pauseTraffic() {
    this.isPaused = true;
    console.info('[TrafficSystem] Traffic paused');
  }

  resumeTraffic() {
    this.isPaused = false;
    console.info('[TrafficSystem] Traffic resumed');
  }

  clearTraffic() {
    for (const car of this.trafficCars) {
      this.scene.remove(car.mesh);
      this.scene.remove(car.proxy);
      this.disposeCarGeometry(car.mesh);
    }
    this.trafficCars = [];
    this.laneChangeQueue = [];
    console.info('[TrafficSystem] All traffic cleared');
  }

  setMaxCars(max: number) {
    this.maxCars = Math.max(5, max);
  }

  // Debug information
  getDebugInfo() {
    const avgSpeed = this.trafficCars.length > 0 
      ? this.trafficCars.reduce((sum, car) => sum + car.speed, 0) / this.trafficCars.length 
      : 0;
      
    return {
      carCount: this.trafficCars.length,
      maxCars: this.maxCars,
      laneChanges: this.laneChangeQueue.length,
      averageSpeed: avgSpeed.toFixed(4),
      trafficDensity: this.trafficDensity,
      isPaused: this.isPaused,
    };
  }
}