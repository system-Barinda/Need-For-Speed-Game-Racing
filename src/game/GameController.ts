import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class GameController {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];

  private speed = 0;
  private heading = 0;
  private steerAngle = 0;

  private crashed = false;
  private crashTimer = 0;
  private spawnSafeTime = 0;

  // ── TUNING ──
  private readonly MAX_SPEED = 20;
  private readonly MAX_REVERSE = 8;
  private readonly ACCEL = 18;
  private readonly BRAKE = 20;
  private readonly FRICTION = 4;

  private readonly MAX_STEER = 0.7;
  private readonly STEER_SPEED = 5;
  private readonly STEER_RETURN = 3;
  private readonly CRASH_RECOVERY = 1.4;

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler
  ) {
    this.car = car;
    this.obstacles = obstacles;
    this.input = input;

    this.heading = car.rotation.y;
    console.info('[Game] GameController initialized. Use Arrow keys to drive.');
  }

  update(delta: number) {
    this.spawnSafeTime++;

    const isFwd = this.input.isPressed('fwd');
    const isBwd = this.input.isPressed('bwd');
    const isLft = this.input.isPressed('lft');
    const isRgt = this.input.isPressed('rgt');

    const forward = new THREE.Vector3(
      Math.sin(this.heading),
      0,
      -Math.cos(this.heading)
    );

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
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - this.FRICTION * 2 * delta);
      } else {
        this.speed = Math.min(0, this.speed + this.FRICTION * 2 * delta);
      }
    }

    if (this.speed > this.MAX_SPEED) this.speed = this.MAX_SPEED;
    if (this.speed < -this.MAX_REVERSE) this.speed = -this.MAX_REVERSE;
    if (Math.abs(this.speed) < 0.035) this.speed = 0;

    let steerTarget = 0;
    if (isLft) steerTarget = this.MAX_STEER;
    if (isRgt) steerTarget = -this.MAX_STEER;

    if (steerTarget !== 0) {
      this.steerAngle +=
        (steerTarget - this.steerAngle) * this.STEER_SPEED * delta;
    } else {
      this.steerAngle *= 1 - this.STEER_RETURN * delta;
    }

    const speedFactor = Math.max(
      0.2,
      Math.min(Math.abs(this.speed) / this.MAX_SPEED, 1)
    );
    const direction = this.speed >= 0 ? 1 : -1;
    this.heading += this.steerAngle * speedFactor * delta * 1.8 * direction;

    const movement = forward.clone().multiplyScalar(this.speed * delta);
    this.car.position.add(movement);

    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dist = this.car.position.distanceTo(obs.position);
        if (dist < 2.5 && !this.crashed) {
          this.speed *= -0.35;
          this.crashed = true;
          this.crashTimer = 0;
          break;
        }
      }
    }

    if (this.crashed) {
      this.crashTimer += delta;
      if (this.crashTimer > this.CRASH_RECOVERY && Math.abs(this.speed) < 0.2) {
        this.crashed = false;
        this.crashTimer = 0;
      }
    }

    this.car.rotation.y = this.heading;
    this.car.rotation.z +=
      (-this.steerAngle * 0.2 - this.car.rotation.z) * 5 * delta;
    this.car.rotation.x = 0;
  }
}
