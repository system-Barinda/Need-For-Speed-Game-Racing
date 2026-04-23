import * as THREE from "three";
import { InputHandler } from "./InputHandler";

export class GameController {
  private car: THREE.Object3D;
  private curve: any;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private updateTraffic?: () => void;

  private speed = 0;
  private t = 0;
  private lateralOffset = 0;
  private crashed = false;
  private spawnSafeTime = 0;

  // 🔥 Tuned values (smooth + responsive)
  private MAX_SPEED = 0.01;
  private ACCEL = 0.0005;
  private FRICTION = 0.0002;
  private TURN_STRENGTH = 0.02;

  private ROAD_WIDTH = 10.5;

  constructor(
    car: THREE.Object3D,
    curve: any,
    obstacles: THREE.Mesh[],
    input: InputHandler,
    updateTraffic?: () => void
  ) {
    this.car = car;
    this.curve = curve;
    this.obstacles = obstacles;
    this.input = input;
    this.updateTraffic = updateTraffic;
  }

  update() {
    this.spawnSafeTime++;

    // 🚗 Update traffic
    if (this.updateTraffic) {
      this.updateTraffic();
    }

    const isFwd = this.input.isPressed("fwd");
    const isBwd = this.input.isPressed("bwd");
    const isLft = this.input.isPressed("lft");
    const isRgt = this.input.isPressed("rgt");

    // 🔄 RESET (press R)
    if (this.input.isPressed("r")) {
      this.reset();
      return;
    }

    // ── SPEED ──
    if (!this.crashed || isFwd) {
      // allow recovery if player presses forward
      if (isFwd) {
        this.speed = Math.min(this.speed + this.ACCEL, this.MAX_SPEED);
      } else if (isBwd) {
        this.speed = Math.max(this.speed - this.ACCEL, -this.MAX_SPEED * 0.5);
      } else {
        // friction
        if (this.speed > 0) this.speed = Math.max(this.speed - this.FRICTION, 0);
        if (this.speed < 0) this.speed = Math.min(this.speed + this.FRICTION, 0);
      }
    } else {
      // slow down after crash
      this.speed *= 0.95;
    }

    // ── MOVE (FIXED: NO MORE FREEZE) ──
    this.t += this.speed;

    // 🔁 LOOP ROAD (CRITICAL FIX)
    if (this.t > 1) this.t = 0;
    if (this.t < 0) this.t = 0;

    // ── STEERING ──
    if (isLft) this.lateralOffset += this.TURN_STRENGTH;
    if (isRgt) this.lateralOffset -= this.TURN_STRENGTH;

    // 🔥 SOFT ROAD LIMIT (NO HARD BLOCK)
    const limit = this.ROAD_WIDTH / 2 - 0.5;

    if (this.lateralOffset > limit) {
      this.lateralOffset = limit;
      this.speed *= 0.98; // slight slow when hitting edge
    }

    if (this.lateralOffset < -limit) {
      this.lateralOffset = -limit;
      this.speed *= 0.98;
    }

    // ── FOLLOW CURVE ──
    const point = this.curve.getPoint(this.t);
    const tangent = this.curve.getTangent(this.t);

    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pos = point.clone().add(normal.multiplyScalar(this.lateralOffset));

    pos.y = 0.35; // keep above road

    this.car.position.copy(pos);

    // face forward
    this.car.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    // ── COLLISION ──
    if (this.spawnSafeTime > 60 && !this.crashed) {
      for (const obs of this.obstacles) {
        if (!obs || !obs.position) continue;

        const dist = this.car.position.distanceTo(obs.position);

        if (dist > 20) continue;

        if (dist < 1.8) {
          this.crashed = true;
          this.speed *= 0.5;
          break;
        }
      }
    }
  }

  // 🔄 RESET GAME
  private reset() {
    this.speed = 0;
    this.t = 0;
    this.lateralOffset = 0;
    this.crashed = false;
    this.spawnSafeTime = 0;
  }
}