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

  // Traffic configuration
  private readonly MIN_SPEED = 0.0003;
  private readonly MAX_SPEED = 0.0008;
  private readonly LANE_CHANGE_DURATION = 1.0;
  private readonly MIN_DISTANCE_BETWEEN_CARS = 15;

  // Lane change system
  private laneChangeQueue: TrafficCar[] = [];

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

    console.info('[TrafficSystem] Initialized traffic management');
  }

  // Initialize traffic cars
  initializeTraffic(initialCars: TrafficCar[]) {
    this.trafficCars = initialCars;
    console.info(`[TrafficSystem] Loaded ${this.trafficCars.length} traffic cars`);
  }

  // Main update loop
  update(deltaTime: number, playerPosition: THREE.Vector3) {
    this.updateTrafficCars(deltaTime);
    this.handleLaneChanges(deltaTime);
    this.checkTrafficCollisions();
    this.manageTrafficDensity(playerPosition);
  }

  private updateTrafficCars(deltaTime: number) {
    for (const car of this.trafficCars) {
      // Update position along curve
      car.t += car.speed * deltaTime;
      if (car.t > 1) {
        car.t = 0.05; // Loop around
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
    const point = this.curve.getPoint(t);
    const tangent = this.curve.getTangent(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    return { point, tangent, normal };
  }

  private calculateLaneOffset(lane: number): number {
    return -this.roadWidth / 2 + (lane + 0.5) * this.laneWidth;
  }

  private handleLaneChanges(deltaTime: number) {
    // Process lane change queue
    for (const car of this.laneChangeQueue) {
      if (car.laneChangeProgress >= 1) {
        // Lane change complete
        car.lane = car.targetLane;
        car.laneChangeProgress = 1;
        this.laneChangeQueue = this.laneChangeQueue.filter(c => c !== car);
      }
    }

    // Random lane changes for realism
    for (const car of this.trafficCars) {
      if (Math.random() < 0.001 * deltaTime && !this.laneChangeQueue.includes(car)) {
        this.requestLaneChange(car);
      }
    }
  }

  private requestLaneChange(car: TrafficCar) {
    const possibleLanes = [0, 1, 2].filter(lane => lane !== Math.round(car.lane));
    if (possibleLanes.length > 0) {
      car.targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
      car.laneChangeProgress = 0;
      this.laneChangeQueue.push(car);
    }
  }

  private checkTrafficCollisions() {
    // Simple collision avoidance between traffic cars
    for (let i = 0; i < this.trafficCars.length; i++) {
      for (let j = i + 1; j < this.trafficCars.length; j++) {
        const car1 = this.trafficCars[i];
        const car2 = this.trafficCars[j];

        const distance = car1.mesh.position.distanceTo(car2.mesh.position);
        if (distance < this.MIN_DISTANCE_BETWEEN_CARS) {
          // Slow down cars that are too close
          car1.speed = Math.min(car1.speed, car2.speed * 0.9);
          car2.speed = Math.min(car2.speed, car1.speed * 0.9);
        }
      }
    }
  }

  private manageTrafficDensity(playerPosition: THREE.Vector3) {
    // Remove cars that are too far behind
    const minT = playerPosition.z / -500; // Approximate conversion
    this.trafficCars = this.trafficCars.filter(car => {
      if (car.t < minT - 0.1) {
        this.scene.remove(car.mesh);
        this.scene.remove(car.proxy);
        return false;
      }
      return true;
    });

    // Spawn new cars ahead
    const maxT = Math.min(1, minT + 0.3);
    let spawnCount = 0;
    for (let t = minT + 0.05; t < maxT && spawnCount < 2; t += 0.02) {
      if (Math.random() < 0.1) {
        this.spawnTrafficCar(t);
        spawnCount++;
      }
    }
  }

  private spawnTrafficCar(t: number) {
    const lane = Math.floor(Math.random() * this.lanes);
    const speed = this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED);
    const color = this.getRandomCarColor();

    const carGroup = this.buildTrafficCar(color);
    this.scene.add(carGroup);

    const proxy = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.2, 4.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.scene.add(proxy);

    const trafficCar: TrafficCar = {
      mesh: carGroup,
      proxy,
      t,
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
      roughness: 0.1,
      metalness: 0.3,
    });
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: new THREE.Color(0xffff44),
      emissiveIntensity: 0.8,
    });
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: new THREE.Color(0xff0000),
      emissiveIntensity: 0.5,
    });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.2, metalness: 0.9 });

    // Main body
    const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.2), bodyMat);
    lower.position.y = 0.35;
    lower.castShadow = true;
    group.add(lower);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), bodyMat);
    cabin.position.set(0, 0.9, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    // Windshields
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), glassMat);
    windshield.position.set(0, 0.92, 0.98);
    windshield.rotation.x = -Math.PI * 0.15;
    group.add(windshield);

    const rearshield = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.5), glassMat);
    rearshield.position.set(0, 0.92, -1.18);
    rearshield.rotation.x = Math.PI * 0.15;
    group.add(rearshield);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    const wheelPositions = [
      [0.92, 0.35, 1.3],
      [-0.92, 0.35, 1.3],
      [0.92, 0.35, -1.3],
      [-0.92, 0.35, -1.3],
    ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.26, 8), chromeMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, wy, wz);
      group.add(hub);
    }

    // Lights
    for (const lx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.08), lightMat);
      hl.position.set(lx, 0.42, 2.1);
      group.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.08), tailMat);
      tl.position.set(lx, 0.42, -2.1);
      group.add(tl);
    }

    return group;
  }

  private getRandomCarColor(): number {
    const colors = [0xcc2200, 0x002299, 0x007744, 0xddaa00, 0x880088, 0x226699];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Public interface
  getTrafficCars(): TrafficCar[] {
    return this.trafficCars;
  }

  getObstacles(): THREE.Mesh[] {
    return this.trafficCars.map(car => car.proxy);
  }

  setTrafficDensity(_density: number) {
    // Adjust spawn rates based on density (0-1)
    // Implementation for dynamic traffic density
  }

  pauseTraffic() {
    for (const car of this.trafficCars) {
      car.speed = 0;
    }
  }

  resumeTraffic() {
    for (const car of this.trafficCars) {
      car.speed = this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED);
    }
  }

  clearTraffic() {
    for (const car of this.trafficCars) {
      this.scene.remove(car.mesh);
      this.scene.remove(car.proxy);
    }
    this.trafficCars = [];
    this.laneChangeQueue = [];
  }

  // Debug information
  getDebugInfo() {
    return {
      carCount: this.trafficCars.length,
      laneChanges: this.laneChangeQueue.length,
      averageSpeed: this.trafficCars.reduce((sum, car) => sum + car.speed, 0) / this.trafficCars.length
    };
  }
}