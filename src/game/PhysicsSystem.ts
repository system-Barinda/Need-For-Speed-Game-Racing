import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class PhysicsSystem {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private curve: THREE.CatmullRomCurve3;

  // Physics properties
  private t = 0; // Position along curve (0-1)
  private speed = 0;
  private velocity = new THREE.Vector3();
  private acceleration = new THREE.Vector3();
  private friction = 0.95;
  private maxSpeed = 25;
  private maxReverseSpeed = 10;
  private accelerationRate = 20;
  private brakeRate = 25;

  // Lane system
  private readonly LANE_WIDTH = 3.5;
  private lanes = [
    -this.LANE_WIDTH, // left
    0, // middle
    this.LANE_WIDTH, // right
  ];
  private currentLane = 1;
  private targetLane = 1;
  private laneOffset = 0;
  private laneChangeSpeed = 8;

  // Collision system
  private crashed = false;
  private crashTimer = 0;
  private readonly CRASH_RECOVERY_TIME = 1.5;
  private spawnSafeTime = 0;
  private readonly COLLISION_DISTANCE_X = 1.5;
  private readonly COLLISION_DISTANCE_Z = 2.5;
  private readonly CRASH_BOUNCE_FACTOR = -0.3;

  // Input cooldowns
  private laneCooldown = 0;
  private readonly LANE_COOLDOWN_TIME = 0.2;

  // Visual feedback
  private tiltAngle = 0;
  private readonly MAX_TILT = 0.3;

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler,
    curve: THREE.CatmullRomCurve3
  ) {
    this.car = car;
    this.obstacles = obstacles;
    this.input = input;
    this.curve = curve;

    // Initialize car position on curve
    this.updateCarPosition();
    this.car.position.y = 0.35;

    console.info('[PhysicsSystem] Initialized with curve-based physics');
  }

  update(deltaTime: number) {
    this.spawnSafeTime += deltaTime;
    this.laneCooldown = Math.max(0, this.laneCooldown - deltaTime);

    // Handle input
    this.handleInput(deltaTime);

    // Update physics
    this.updatePhysics(deltaTime);

    // Handle lane changes
    this.updateLaneChange(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Update crash recovery
    this.updateCrashRecovery(deltaTime);

    // Update car position and rotation
    this.updateCarPosition();

    // Update visual feedback
    this.updateVisualFeedback();
  }

  private handleInput(deltaTime: number) {
    const isForward = this.input.isPressed('fwd');
    const isBackward = this.input.isPressed('bwd');
    const isLeft = this.input.isPressed('lft');
    const isRight = this.input.isPressed('rgt');

    // Acceleration and braking
    if (!this.crashed) {
      if (isForward) {
        const accel = this.speed < 0 ? this.brakeRate : this.accelerationRate;
        this.speed += accel * deltaTime;
      } else if (isBackward) {
        const accel =
          this.speed > 0 ? this.brakeRate : this.accelerationRate * 0.8;
        this.speed -= accel * deltaTime;
      } else {
        // Apply friction
        this.speed *= this.friction;
      }
    } else {
      // Slow down during crash
      this.speed *= 0.96;
    }

    // Clamp speed
    this.speed = THREE.MathUtils.clamp(
      this.speed,
      -this.maxReverseSpeed,
      this.maxSpeed
    );

    // Stop if very slow
    if (Math.abs(this.speed) < 0.05) {
      this.speed = 0;
    }

    // Lane changes
    if (this.laneCooldown <= 0) {
      if (isLeft && this.currentLane > 0) {
        this.currentLane--;
        this.targetLane = this.currentLane;
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
      } else if (isRight && this.currentLane < this.lanes.length - 1) {
        this.currentLane++;
        this.targetLane = this.currentLane;
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
      }
    }
  }

  private updatePhysics(deltaTime: number) {
    // Update position along curve based on speed
    // Speed is in units per second, convert to t change
    const curveLength = this.curve.getLength();
    const tChange = (this.speed * deltaTime) / curveLength;
    this.t += tChange;

    // Keep t in valid range (loop the track)
    if (this.t > 1) {
      this.t = this.t - 1;
    } else if (this.t < 0) {
      this.t = 1 + this.t;
    }
  }

  private updateLaneChange(deltaTime: number) {
    // Smooth lane transitions
    const targetOffset = this.lanes[this.targetLane];
    const diff = targetOffset - this.laneOffset;

    if (Math.abs(diff) > 0.01) {
      const moveAmount = Math.sign(diff) * this.laneChangeSpeed * deltaTime;
      if (Math.abs(moveAmount) > Math.abs(diff)) {
        this.laneOffset = targetOffset;
      } else {
        this.laneOffset += moveAmount;
      }
    }
  }

  private checkCollisions() {
    if (this.spawnSafeTime < 1 || this.crashed) return;

    for (const obstacle of this.obstacles) {
      if (!obstacle) continue;

      const dx = Math.abs(this.car.position.x - obstacle.position.x);
      const dz = Math.abs(this.car.position.z - obstacle.position.z);

      if (dx < this.COLLISION_DISTANCE_X && dz < this.COLLISION_DISTANCE_Z) {
        // Collision detected
        this.speed *= this.CRASH_BOUNCE_FACTOR;
        this.crashed = true;
        this.crashTimer = 0;
        console.info('[PhysicsSystem] Collision detected!');
        break;
      }
    }
  }

  private updateCrashRecovery(deltaTime: number) {
    if (this.crashed) {
      this.crashTimer += deltaTime;
      if (this.crashTimer >= this.CRASH_RECOVERY_TIME) {
        this.crashed = false;
        this.crashTimer = 0;
        console.info('[PhysicsSystem] Recovered from crash');
      }
    }
  }

  private updateCarPosition() {
    // Get curve frame at current t
    const point = this.curve.getPoint(this.t);
    const tangent = this.curve.getTangent(this.t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Calculate position with lane offset
    const position = point
      .clone()
      .add(normal.clone().multiplyScalar(this.laneOffset));
    position.y = 0.35;

    // Update car position
    this.car.position.copy(position);

    // Orient car along curve (forward direction)
    const lookTarget = position.clone().add(tangent);
    this.car.lookAt(lookTarget);
  }

  // Public getters for game state
  getSpeed(): number {
    return this.speed;
  }

  getCurrentLane(): number {
    return this.currentLane;
  }

  isCrashed(): boolean {
    return this.crashed;
  }

  getPosition(): THREE.Vector3 {
    return this.car.position.clone();
  }

  // Reset physics state
  reset() {
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.currentLane = 1;
    this.targetX = this.lanes[this.currentLane];
    this.car.position.x = this.targetX;
    this.crashed = false;
    this.crashTimer = 0;
    this.spawnSafeTime = 0;
    this.laneCooldown = 0;
    this.tiltAngle = 0;
    console.info('[PhysicsSystem] Physics reset');
  }

  // Advanced physics methods for future expansion
  applyForce(force: THREE.Vector3) {
    this.acceleration.add(force);
  }

  setMaxSpeed(speed: number) {
    this.maxSpeed = Math.max(0, speed);
  }

  setFriction(friction: number) {
    this.friction = THREE.MathUtils.clamp(friction, 0, 1);
  }

  // Debug information
  getDebugInfo() {
    return {
      speed: this.speed.toFixed(2),
      lane: this.currentLane,
      position: {
        x: this.car.position.x.toFixed(2),
        y: this.car.position.y.toFixed(2),
        z: this.car.position.z.toFixed(2),
      },
      crashed: this.crashed,
      crashTimer: this.crashTimer.toFixed(2),
      laneCooldown: this.laneCooldown.toFixed(2),
    };
  }
}
