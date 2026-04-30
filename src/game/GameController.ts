import * as THREE from "three";
import { InputHandler } from "./InputHandler";

export class GameController {
  private car: THREE.Object3D;
  private curve: any;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private updateTraffic?: () => void;

  private speed = 0;
  private crashed = false;
  private spawnSafeTime = 0;

  private blockForward = false;

  private MAX_SPEED = 0.5;
  private ACCEL = 0.01;
  private FRICTION = 0.005;

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
        if (dist > 5) continue;

        const sideDiff = Math.abs(obs.position.x - this.car.position.x);

        if (sideDiff < 2 && dist < 3) {
          this.blockForward = true;
        }
      }
    }

    // ── REALISTIC STEERING ──
    let steer = 0;
    if (isLft) steer = 1;
    if (isRgt) steer = -1;

    // Smooth turning
    this.car.rotation.y += steer * 0.03;

    // Limit max turning angle
    const maxTurn = 0.6;
    this.car.rotation.y = Math.max(
      -maxTurn,
      Math.min(maxTurn, this.car.rotation.y)
    );

    // Auto-straighten when no input
    if (!isLft && !isRgt) {
      this.car.rotation.y *= 0.9;
    }

    // ── FORWARD MOVEMENT BASED ON ROTATION ──
    if (!this.blockForward) {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(this.car.quaternion);

      this.car.position.add(forward.multiplyScalar(this.speed));
    } else {
      this.speed *= 0.9;
    }

    // Optional: slight drift smoothing
    this.car.rotation.y *= 0.98;
  }

  private reset() {
    this.speed = 0;
    this.crashed = false;
    this.spawnSafeTime = 0;
    this.blockForward = false;

    this.car.position.set(0, 0.35, 0);
    this.car.rotation.set(0, 0, 0);
  }
}