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
  private spawnSafeTime = 0;

  // ── TUNING ──
  private readonly MAX_SPEED = 18;
  private readonly ACCEL = 12;
  private readonly BRAKE = 10;
  private readonly FRICTION = 3;

  private readonly MAX_STEER = 0.6;
  private readonly STEER_SPEED = 3;
  private readonly STEER_RETURN = 2;

  private keys: Record<string, boolean> = {};

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler
  ) {
    this.car = car;
    this.obstacles = obstacles;
    this.input = input;

    this.heading = car.rotation.y;

    window.addEventListener(
      'keydown',
      (e) => (this.keys[e.key.toLowerCase()] = true)
    );
    window.addEventListener(
      'keyup',
      (e) => (this.keys[e.key.toLowerCase()] = false)
    );
  }

  update(delta: number) {
    this.spawnSafeTime++;

    const isFwd =
      this.input.isPressed('fwd') || this.keys['w'] || this.keys['arrowup'];
    const isBwd =
      this.input.isPressed('bwd') || this.keys['s'] || this.keys['arrowdown'];
    const isLft =
      this.input.isPressed('lft') || this.keys['a'] || this.keys['arrowleft'];
    const isRgt =
      this.input.isPressed('rgt') || this.keys['d'] || this.keys['arrowright'];

    // ── SPEED ──
    const forward = new THREE.Vector3(
      Math.sin(this.heading),
      0,
      -Math.cos(this.heading)
    );

    if (isFwd) {
      this.velocity.addScaledVector(forward, this.ACCEL * delta);
    } else if (isBwd) {
      this.velocity.addScaledVector(forward, -this.BRAKE * delta);
    } else {
      this.velocity.multiplyScalar(1 - this.FRICTION * delta);
    }

    // clamp speed
    if (this.velocity.length() > this.MAX_SPEED) {
      this.velocity.setLength(this.MAX_SPEED);
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

    // ── TURN BASED ON SPEED ──
    const speed = this.velocity.length();
    const turnFactor = speed / this.MAX_SPEED;

    this.heading += this.steerAngle * turnFactor * delta * 2;

    // ── APPLY MOVEMENT ──
    this.car.position.addScaledVector(this.velocity, delta);

    // ── COLLISION (simple but fast) ──
    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dist = this.car.position.distanceTo(obs.position);
        if (dist < 2.5) {
          this.velocity.multiplyScalar(0.3);
          this.crashed = true;
        }
      }
    }

    // ── VISUAL ──
    this.car.rotation.y = this.heading;

    // body roll
    this.car.rotation.z +=
      (-this.steerAngle * 0.2 - this.car.rotation.z) * 5 * delta;

    // keep upright
    this.car.rotation.x = 0;
  }
}
