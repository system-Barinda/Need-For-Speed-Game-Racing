import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class GameController {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];

  private speed = 0;

  // ✅ LANE SYSTEM
  private lanes = [-2, 0, 2];
  private currentLane = 1;
  private targetX = this.lanes[this.currentLane];

  private crashed = false;
  private crashTimer = 0;
  private spawnSafeTime = 0;

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

    // start in middle lane
    this.car.position.x = this.targetX;

    console.info('[Game] Controller ready (lane-based)');
  }

  update(delta: number) {
    this.spawnSafeTime++;

    const isFwd = this.input.isPressed('fwd');
    const isBwd = this.input.isPressed('bwd');
    const isLft = this.input.isPressed('lft');
    const isRgt = this.input.isPressed('rgt');

    // ================= SPEED =================
    if (!this.crashed) {
      if (isFwd) {
        if (this.speed < 0) {
          this.speed += this.BRAKE * delta;
        } else {
          this.speed += this.ACCEL * delta;
        }
      } else if (isBwd) {
        if (this.speed > 0) {
          this.speed -= this.BRAKE * delta;
        } else {
          this.speed -= this.ACCEL * 0.8 * delta;
        }
      } else {
        if (this.speed > 0) {
          this.speed = Math.max(0, this.speed - this.FRICTION * delta);
        } else {
          this.speed = Math.min(0, this.speed + this.FRICTION * delta);
        }
      }
    } else {
      this.speed *= 0.96;
    }

    // clamp speed
    if (this.speed > this.MAX_SPEED) this.speed = this.MAX_SPEED;
    if (this.speed < -this.MAX_REVERSE) this.speed = -this.MAX_REVERSE;
    if (Math.abs(this.speed) < 0.05) this.speed = 0;

    // ================= LANE CHANGE =================
    // trigger once (avoid skipping lanes fast)
    if (isLft) {
      this.currentLane = Math.max(0, this.currentLane - 1);
      this.targetX = this.lanes[this.currentLane];
    }

    if (isRgt) {
      this.currentLane = Math.min(
        this.lanes.length - 1,
        this.currentLane + 1
      );
      this.targetX = this.lanes[this.currentLane];
    }

    // smooth move to lane
    this.car.position.x += (this.targetX - this.car.position.x) * 0.15;

    // ================= FORWARD MOVEMENT =================
    this.car.position.z -= this.speed * delta;

    // ================= COLLISION =================
    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dist = this.car.position.distanceTo(obs.position);

        if (dist < 2.5 && !this.crashed) {
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

    // ================= VISUAL TILT =================
    const tilt = (this.targetX - this.car.position.x) * 0.3;
    this.car.rotation.z = -tilt;

    // keep car straight forward
    this.car.rotation.y = 0;
    this.car.rotation.x = 0;
  }
}