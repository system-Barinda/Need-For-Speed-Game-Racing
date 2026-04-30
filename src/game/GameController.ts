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

  private blockForward = false;

  private MAX_SPEED = 0.01;
  private ACCEL = 0.0005;
  private FRICTION = 0.0002;
  private TURN_STRENGTH = 0.02;

  private ROAD_WIDTH = 10.5;

  private keys: Record<string, boolean> = {};

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

    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  update() {
    this.spawnSafeTime++;
    this.blockForward = false;

    if (this.updateTraffic) {
      this.updateTraffic();
    }

    const isFwd =
      this.input.isPressed("fwd") ||
      this.keys["arrowup"] ||
      this.keys["w"];

    const isBwd =
      this.input.isPressed("bwd") ||
      this.keys["arrowdown"] ||
      this.keys["s"];

    const isLft =
      this.input.isPressed("lft") ||
      this.keys["arrowleft"] ||
      this.keys["a"];

    const isRgt =
      this.input.isPressed("rgt") ||
      this.keys["arrowright"] ||
      this.keys["d"];

    if (this.input.isPressed("r")) {
      this.reset();
      return;
    }

    // ── SPEED ──
    if (!this.crashed || isFwd) {
      if (isFwd && !this.blockForward) {
        this.speed = Math.min(this.speed + this.ACCEL, this.MAX_SPEED);
      } else if (isBwd) {
        this.speed = Math.max(this.speed - this.ACCEL, -this.MAX_SPEED * 0.5);
      } else {
        if (this.speed > 0) this.speed = Math.max(this.speed - this.FRICTION, 0);
        if (this.speed < 0) this.speed = Math.min(this.speed + this.FRICTION, 0);
      }
    } else {
      this.speed *= 0.95;
    }

    // ── COLLISION ──
    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;

        const dist = this.car.position.distanceTo(obs.position);
        if (dist > 10) continue;

        if (obs.position.z < this.car.position.z) {
          const sideDiff = Math.abs(obs.position.x - this.car.position.x);

          if (sideDiff < 2 && dist < 3) {
            this.blockForward = true;
          }
        }
      }
    }

    // ── MOVE ──
    if (!this.blockForward) {
      this.t += this.speed;
    } else {
      this.speed *= 0.9;
    }

    if (this.t > 1) this.t = 0;
    if (this.t < 0) this.t = 0;

    // ✅ FIXED STEERING (CORRECT DIRECTION)
    if (isLft) this.lateralOffset -= this.TURN_STRENGTH;
    if (isRgt) this.lateralOffset += this.TURN_STRENGTH;

    const limit = this.ROAD_WIDTH / 2 - 0.5;

    if (this.lateralOffset > limit) {
      this.lateralOffset = limit;
      this.speed *= 0.98;
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
    pos.y = 0.35;

    this.car.position.copy(pos);
    this.car.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  }

  private reset() {
    this.speed = 0;
    this.t = 0;
    this.lateralOffset = 0;
    this.crashed = false;
    this.spawnSafeTime = 0;
    this.blockForward = false;
  }
}