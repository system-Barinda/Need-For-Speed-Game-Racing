import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class PhysicsSystem {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private curve: THREE.CatmullRomCurve3;

  // Physics properties
  private t = 0; // Position along curve (0-1)
  private speed = 5; // Starting speed (running)
  private maxSpeed = 30;
  private minSpeed = 3;
  private accelerationRate = 15;
  private brakeRate = 20;
  private friction = 0.98;

  // Lane system
  private readonly LANE_WIDTH = 2.5; // Adjusted to match car width
  private lanes = [
    -this.LANE_WIDTH, // left
    0,               // middle
    this.LANE_WIDTH, // right
  ];
  private currentLane = 1;
  private targetLane = 1;
  private laneOffset = 0;
  private laneChangeSpeed = 6;

  // Collision system
  private crashed = false;
  private crashTimer = 0;
  private readonly CRASH_RECOVERY_TIME = 1.5;
  private spawnSafeTime = 0;
  private readonly SAFE_TIME_AFTER_SPAWN = 1.0;
  private readonly COLLISION_DISTANCE_X = 1.2;
  private readonly COLLISION_DISTANCE_Z = 2.0;
  private readonly CRASH_BOUNCE_FACTOR = -0.5;

  // Input cooldowns
  private laneCooldown = 0;
  private readonly LANE_COOLDOWN_TIME = 0.15;

  // Visual feedback
  private tiltAngle = 0;
  private readonly MAX_TILT = 0.25;
  private originalCarColor: THREE.Color | null = null;
  private crashFlashTimer = 0;

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

    // Store original car color for crash effects
    const carMesh = this.car.children.find(child => child instanceof THREE.Mesh && child.material);
    if (carMesh && (carMesh as THREE.Mesh).material) {
      const material = (carMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      this.originalCarColor = material.color.clone();
    }

    console.info('[PhysicsSystem] Initialized with running speed physics');
  }

  update(deltaTime: number) {
    this.spawnSafeTime += deltaTime;
    this.laneCooldown = Math.max(0, this.laneCooldown - deltaTime);

    // Handle input only if not crashed
    if (!this.crashed) {
      this.handleInput(deltaTime);
    }

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
    this.updateVisualFeedback(deltaTime);
  }

  private handleInput(deltaTime: number) {
    const isForward = this.input.isPressed('forward');
    const isBackward = this.input.isPressed('backward');
    const isLeft = this.input.isPressed('left');
    const isRight = this.input.isPressed('right');

    // Acceleration and braking
    if (isForward) {
      // Accelerate
      this.speed += this.accelerationRate * deltaTime;
    } else if (isBackward) {
      // Brake/reverse
      this.speed -= this.brakeRate * deltaTime;
    } else if (Math.abs(this.speed) > this.minSpeed) {
      // Apply friction when no input
      this.speed *= this.friction;
    }

    // Clamp speed
    this.speed = THREE.MathUtils.clamp(this.speed, this.minSpeed, this.maxSpeed);

    // Lane changes using just pressed (single tap)
    if (this.laneCooldown <= 0) {
      if (this.input.isJustPressed('left') && this.currentLane > 0) {
        this.targetLane = this.currentLane - 1;
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
        console.log(`[PhysicsSystem] Moving to lane ${this.targetLane}`);
      } else if (this.input.isJustPressed('right') && this.currentLane < this.lanes.length - 1) {
        this.targetLane = this.currentLane + 1;
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
        console.log(`[PhysicsSystem] Moving to lane ${this.targetLane}`);
      }
    }
  }

  private updatePhysics(deltaTime: number) {
    // Update position along curve based on speed
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
    // Update current lane based on target
    if (this.targetLane !== this.currentLane) {
      const diff = this.lanes[this.targetLane] - this.laneOffset;
      
      if (Math.abs(diff) > 0.05) {
        const moveAmount = Math.sign(diff) * this.laneChangeSpeed * deltaTime;
        this.laneOffset += moveAmount;
      } else {
        // Lane change complete
        this.currentLane = this.targetLane;
        this.laneOffset = this.lanes[this.currentLane];
      }
    }
  }

  private checkCollisions() {
    if (this.spawnSafeTime < this.SAFE_TIME_AFTER_SPAWN || this.crashed) return;

    for (const obstacle of this.obstacles) {
      if (!obstacle || !obstacle.visible) continue;

      const dx = Math.abs(this.car.position.x - obstacle.position.x);
      const dz = Math.abs(this.car.position.z - obstacle.position.z);

      if (dx < this.COLLISION_DISTANCE_X && dz < this.COLLISION_DISTANCE_Z) {
        // Collision detected
        this.handleCollision(obstacle);
        break;
      }
    }
  }

  private handleCollision(obstacle: THREE.Mesh) {
    // Reduce speed on collision
    this.speed *= this.CRASH_BOUNCE_FACTOR;
    this.speed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.speed));
    
    this.crashed = true;
    this.crashTimer = 0;
    this.crashFlashTimer = 0;
    
    console.info('[PhysicsSystem] Collision detected!');
    
    // Optional: Add visual feedback to obstacle
    if (obstacle.material) {
      const material = obstacle.material as THREE.MeshStandardMaterial;
      const originalColor = material.color.clone();
      material.color.setHex(0xff0000);
      setTimeout(() => {
        material.color.copy(originalColor);
      }, 200);
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
    const position = point.clone().add(normal.clone().multiplyScalar(this.laneOffset));
    position.y = 0.35;

    // Update car position
    this.car.position.copy(position);

    // Orient car along curve (forward direction)
    const lookTarget = position.clone().add(tangent);
    this.car.lookAt(lookTarget);
  }

  private updateVisualFeedback(deltaTime: number) {
    // Update crash flash
    if (this.crashed) {
      this.crashFlashTimer += deltaTime;
      
      // Flash effect for car material
      const carMesh = this.car.children.find(child => child instanceof THREE.Mesh && (child as THREE.Mesh).material);
      if (carMesh && (carMesh as THREE.Mesh).material && this.originalCarColor) {
        const material = (carMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        const flashIntensity = Math.sin(this.crashFlashTimer * 20) * 0.5 + 0.5;
        material.color.setHex(0xff0000);
        material.emissiveIntensity = flashIntensity;
        
        if (this.crashFlashTimer > 0.5) {
          material.color.copy(this.originalCarColor);
          material.emissiveIntensity = 0;
        }
      }
    }
    
    // Calculate tilt based on lane change speed
    const laneChangeProgress = Math.abs(this.lanes[this.targetLane] - this.laneOffset) / this.LANE_WIDTH;
    const tiltTarget = laneChangeProgress * this.MAX_TILT * Math.sign(this.lanes[this.targetLane] - this.laneOffset);
    this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, tiltTarget, 0.2);

    // Apply tilt rotation (z-axis) while preserving the curve orientation
    this.car.rotation.z = -this.tiltAngle;
  }

  // ================= PUBLIC METHODS =================
  
  getSpeed(): number {
    return this.speed;
  }

  setSpeed(speed: number) {
    this.speed = THREE.MathUtils.clamp(speed, this.minSpeed, this.maxSpeed);
  }

  getCurrentLane(): number {
    return this.currentLane;
  }

  getTargetLane(): number {
    return this.targetLane;
  }

  isCrashed(): boolean {
    return this.crashed;
  }

  getPosition(): THREE.Vector3 {
    return this.car.position.clone();
  }

  getProgress(): number {
    return this.t * 100; // Percentage of track completed
  }

  // Reset physics state
  reset() {
    this.speed = 5; // Reset to default running speed
    this.t = 0;
    this.currentLane = 1;
    this.targetLane = 1;
    this.laneOffset = 0;
    this.crashed = false;
    this.crashTimer = 0;
    this.spawnSafeTime = 0;
    this.laneCooldown = 0;
    this.tiltAngle = 0;
    this.crashFlashTimer = 0;
    
    this.updateCarPosition();
    
    // Reset car color
    if (this.originalCarColor) {
      const carMesh = this.car.children.find(child => child instanceof THREE.Mesh && (child as THREE.Mesh).material);
      if (carMesh && (carMesh as THREE.Mesh).material) {
        const material = (carMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        material.color.copy(this.originalCarColor);
        material.emissiveIntensity = 0;
      }
    }
    
    console.info('[PhysicsSystem] Physics reset to default state');
  }

  // Speed management methods
  setMaxSpeed(speed: number) {
    this.maxSpeed = Math.max(this.minSpeed, speed);
    console.log(`[PhysicsSystem] Max speed set to: ${this.maxSpeed}`);
  }

  setMinSpeed(speed: number) {
    this.minSpeed = Math.max(0, speed);
    console.log(`[PhysicsSystem] Min speed set to: ${this.minSpeed}`);
  }

  increaseSpeed(amount: number) {
    this.speed = Math.min(this.maxSpeed, this.speed + amount);
  }

  decreaseSpeed(amount: number) {
    this.speed = Math.max(this.minSpeed, this.speed - amount);
  }

  // Advanced physics methods
  applyForce(force: THREE.Vector3) {
    this.speed += force.x; // Simplified force application
  }

  setFriction(friction: number) {
    this.friction = THREE.MathUtils.clamp(friction, 0.9, 0.99);
  }

  // Collision management
  isSafeSpawn(): boolean {
    return this.spawnSafeTime >= this.SAFE_TIME_AFTER_SPAWN;
  }

  // Debug information
  getDebugInfo() {
    return {
      speed: this.speed.toFixed(2),
      minSpeed: this.minSpeed,
      maxSpeed: this.maxSpeed,
      lane: this.currentLane,
      targetLane: this.targetLane,
      progress: this.getProgress().toFixed(1) + '%',
      position: {
        x: this.car.position.x.toFixed(2),
        y: this.car.position.y.toFixed(2),
        z: this.car.position.z.toFixed(2),
      },
      crashed: this.crashed,
      crashTimer: this.crashTimer.toFixed(2),
      laneCooldown: this.laneCooldown.toFixed(2),
      safeTime: this.spawnSafeTime.toFixed(2),
    };
  }
}