import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class GameController {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];

  private speed = 0;

  // ✅ MATCH ROAD SYSTEM (IMPORTANT)
  private readonly LANE_WIDTH = 3.5;
  private lanes = [
    -this.LANE_WIDTH, // left
    0,                // middle
    this.LANE_WIDTH   // right
  ];

  private currentLane = 1;
  private targetX = this.lanes[this.currentLane];

  private crashed = false;
  private crashTimer = 0;
  private spawnSafeTime = 0;

  // ✅ Prevent lane spam (VERY IMPORTANT FIX)
  private laneCooldown = 0;
  private readonly LANE_COOLDOWN_TIME = 0.2;

  // ── TUNING ──
  private readonly MAX_SPEED = 20;
  private readonly MAX_REVERSE = 8;
  private readonly ACCEL = 18;
  private readonly BRAKE = 20;
  private readonly FRICTION = 4;
  private readonly CRASH_RECOVERY = 1.4;

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler
  ) {
    this.car = car;
    this.obstacles = obstacles;
    this.input = input;

    // Start centered
    this.car.position.x = this.targetX;

    console.info('[Game] Controller ready (FIXED)');
  }

  update(delta: number) {
    this.spawnSafeTime += delta;
    this.laneCooldown -= delta;

    const isFwd = this.input.isPressed('fwd');
    const isBwd = this.input.isPressed('bwd');
    const isLft = this.input.isPressed('lft');
    const isRgt = this.input.isPressed('rgt');

    // ================= SPEED =================
    if (!this.crashed) {
      if (isFwd) {
        this.speed += this.speed < 0
          ? this.BRAKE * delta
          : this.ACCEL * delta;
      } else if (isBwd) {
        this.speed -= this.speed > 0
          ? this.BRAKE * delta
          : this.ACCEL * 0.8 * delta;
      } else {
        // friction
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.FRICTION * delta);
        } else {
          this.speed = Math.min(0, this.speed + this.FRICTION * delta);
        }
      }
    } else {
      this.speed *= 0.96;
    }

    // clamp
    this.speed = THREE.MathUtils.clamp(
      this.speed,
      -this.MAX_REVERSE,
      this.MAX_SPEED
    );

    if (Math.abs(this.speed) < 0.05) this.speed = 0;

    // ================= LANE CHANGE (FIXED) =================
    if (this.laneCooldown <= 0) {
      if (isLft && this.currentLane > 0) {
        this.currentLane--;
        this.targetX = this.lanes[this.currentLane];
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
      }

      if (isRgt && this.currentLane < this.lanes.length - 1) {
        this.currentLane++;
        this.targetX = this.lanes[this.currentLane];
        this.laneCooldown = this.LANE_COOLDOWN_TIME;
      }
    }

    // smooth lane movement
    this.car.position.x = THREE.MathUtils.lerp(
      this.car.position.x,
      this.targetX,
      0.12
    );

    // ================= FORWARD =================
    this.car.position.z -= this.speed * delta;

    // ================= COLLISION =================
    if (this.spawnSafeTime > 1) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dx = Math.abs(this.car.position.x - obs.position.x);
        const dz = Math.abs(this.car.position.z - obs.position.z);

        // ✅ Better collision box check
        if (dx < 1.5 && dz < 2.5 && !this.crashed) {
          this.speed *= -0.3;
          this.crashed = true;
          this.crashTimer = 0;
          break;
        }
      }
    }

    if (this.crashed) {
      this.crashTimer += delta;

      if (this.crashTimer > this.CRASH_RECOVERY) {
        this.crashed = false;
        this.crashTimer = 0;
      }
    }

    // ================= VISUAL =================
    const tilt = (this.targetX - this.car.position.x) * 0.25;
    this.car.rotation.z = -tilt;

    this.car.rotation.y = 0;
    this.car.rotation.x = 0;
  }
}