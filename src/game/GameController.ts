import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class GameController {
  private car: THREE.Object3D;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];

  private velocity = new THREE.Vector3();
  private heading = 0;
  private steerAngle = 0;

  private crashed = false;
  private crashTimer = 0;
  private spawnSafeTime = 0;

  // ── TUNING ──
  private readonly MAX_SPEED = 18;
  private readonly ACCEL = 12;
  private readonly BRAKE = 10;
  private readonly FRICTION = 3;

  private readonly MAX_STEER = 0.6;
  private readonly STEER_SPEED = 3;
  private readonly STEER_RETURN = 2;
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

    const speed = this.velocity.length();

    if (isFwd && !this.crashed) {
      this.velocity.addScaledVector(forward, this.ACCEL * delta);
    } else if (isBwd && !this.crashed) {
      if (speed > 0.5) {
        this.velocity.addScaledVector(forward, -this.BRAKE * delta);
      } else {
        this.velocity.addScaledVector(forward, -this.ACCEL * 0.6 * delta);
      }
    } else {
      const drag = this.crashed ? this.FRICTION * 1.8 : this.FRICTION;
      this.velocity.multiplyScalar(Math.max(0, 1 - drag * delta));
    }

    if (this.velocity.length() > this.MAX_SPEED) {
      this.velocity.setLength(this.MAX_SPEED);
    }

    if (this.velocity.length() < 0.03) {
      this.velocity.set(0, 0, 0);
    }

    // ── STEERING ──
    let steerTarget = 0;
    if (isLft) steerTarget = this.MAX_STEER;
    if (isRgt) steerTarget = -this.MAX_STEER;

    if (steerTarget !== 0) {
      this.steerAngle +=
        (steerTarget - this.steerAngle) * this.STEER_SPEED * delta;
    } else {
      this.steerAngle *= 1 - this.STEER_RETURN * delta;
    }

    const turnFactor = Math.min(speed / this.MAX_SPEED, 1);
    const turnDirection = this.velocity.dot(forward) < 0 ? -1 : 1;
    this.heading += this.steerAngle * turnFactor * delta * 2 * turnDirection;

    // ── APPLY MOVEMENT ──
    this.car.position.addScaledVector(this.velocity, delta);

    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dist = this.car.position.distanceTo(obs.position);
        if (dist < 2.5 && !this.crashed) {
          this.velocity.multiplyScalar(-0.4);
          this.crashed = true;
          this.crashTimer = 0;
          break;
        }
      }
    }

    if (this.crashed) {
      this.crashTimer += delta;
      if (this.crashTimer > this.CRASH_RECOVERY && this.velocity.length() < 0.2) {
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
