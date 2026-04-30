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

  // ── Tuning constants ──────────────────────────────────────────────────────
  private MAX_SPEED   = 0.5;
  private ACCEL       = 0.012;
  private FRICTION    = 0.008;
  private BRAKE_FORCE = 0.02;

  // Steering is speed-sensitive: fast = less turn, slow = more turn
  private MAX_STEER_ANGLE = 0.045;   // radians per frame at low speed
  private MIN_STEER_ANGLE = 0.008;   // radians per frame at max speed
  private STEER_RETURN    = 0.12;    // how fast wheels straighten (0–1)

  // Current wheel angle (visual + physics)
  private steerAngle   = 0;          // actual wheel deflection this frame
  private carYaw       = 0;          // master yaw — we own rotation.y

  private keys: Record<string, boolean> = {};

  constructor(
    car: THREE.Object3D,
    curve: any,
    obstacles: THREE.Mesh[],
    input: InputHandler,
    updateTraffic?: () => void
  ) {
    this.car          = car;
    this.curve        = curve;
    this.obstacles    = obstacles;
    this.input        = input;
    this.updateTraffic = updateTraffic;

    // Seed yaw from whatever the car's initial rotation is
    this.carYaw = car.rotation.y;

    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  // ── Main update ────────────────────────────────────────────────────────────
  update() {
    this.spawnSafeTime++;
    this.blockForward = false;

    if (this.updateTraffic) this.updateTraffic();

    // ── Input ──
    const isFwd = this.input.isPressed("fwd") || this.keys["arrowup"]    || this.keys["w"];
    const isBwd = this.input.isPressed("bwd") || this.keys["arrowdown"]  || this.keys["s"];
    const isLft = this.input.isPressed("lft") || this.keys["arrowleft"]  || this.keys["a"];
    const isRgt = this.input.isPressed("rgt") || this.keys["arrowright"] || this.keys["d"];

    if (this.input.isPressed("r") || this.keys["r"]) {
      this.reset();
      return;
    }

    // ── Collision detection ──
    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;
        const dist     = this.car.position.distanceTo(obs.position);
        if (dist > 5)  continue;
        const sideDiff = Math.abs(obs.position.x - this.car.position.x);
        if (sideDiff < 2 && dist < 3) {
          this.blockForward = true;
        }
      }
    }

    // ── Speed ──
    if (!this.crashed) {
      if (isFwd && !this.blockForward) {
        this.speed = Math.min(this.speed + this.ACCEL, this.MAX_SPEED);
      } else if (isBwd) {
        // braking / reversing
        if (this.speed > 0) {
          this.speed = Math.max(this.speed - this.BRAKE_FORCE, 0);
        } else {
          this.speed = Math.max(this.speed - this.ACCEL, -this.MAX_SPEED * 0.4);
        }
      } else {
        // coast to stop
        if (this.speed > 0) this.speed = Math.max(this.speed - this.FRICTION, 0);
        if (this.speed < 0) this.speed = Math.min(this.speed + this.FRICTION, 0);
      }
    } else {
      // crash deceleration
      this.speed *= 0.92;
    }

    if (this.blockForward && this.speed > 0) {
      this.speed *= 0.85;
    }

    // ── Realistic steering ─────────────────────────────────────────────────
    //
    //  Real cars:
    //  • Turning rate is proportional to speed (Ackermann / bicycle model)
    //  • Steering only affects heading when the car is actually moving
    //  • Wheels self-centre when input is released
    //
    const absSpeed      = Math.abs(this.speed);
    const speedRatio    = Math.min(absSpeed / this.MAX_SPEED, 1); // 0 → 1

    // Interpolate steer sensitivity: full speed = less responsive
    const steerSensitivity =
      this.MAX_STEER_ANGLE * (1 - speedRatio) +
      this.MIN_STEER_ANGLE * speedRatio;

    // Raw steering input
    let steerInput = 0;
    if (isLft) steerInput =  1;
    if (isRgt) steerInput = -1;

    // Blend steer angle smoothly (feels like physical wheels turning)
    if (steerInput !== 0) {
      this.steerAngle += (steerInput * steerSensitivity - this.steerAngle) * 0.25;
    } else {
      // Self-centre — faster at higher speed (tyre feedback)
      const returnRate = this.STEER_RETURN + speedRatio * 0.15;
      this.steerAngle *= (1 - returnRate);
    }

    // Clamp max wheel lock
    const maxLock = 0.5;
    this.steerAngle = Math.max(-maxLock, Math.min(maxLock, this.steerAngle));

    // ── Yaw rotation (only when moving) ───────────────────────────────────
    //
    //  turnRate = steerAngle × (speed / wheelbase)
    //  wheelbase ≈ 2.5 units — tune to taste
    //
    const wheelbase = 2.5;
    if (absSpeed > 0.001) {
      // Reverse steering flips naturally because speed is negative
      const turnRate = this.steerAngle * (this.speed / wheelbase);
      this.carYaw   += turnRate;
    }

    // Write back to mesh — we own rotation.y entirely
    this.car.rotation.y = this.carYaw;

    // ── Move in the direction the car is facing ────────────────────────────
    if (!this.blockForward || this.speed < 0) {
      const forward = new THREE.Vector3(
        Math.sin(this.carYaw),
        0,
       -Math.cos(this.carYaw)         // -Z is forward in Three.js
      );
      this.car.position.addScaledVector(forward, this.speed);
    }

    // Slight body roll tilt into corners (cosmetic, optional)
    const targetRoll = -this.steerAngle * speedRatio * 0.08;
    this.car.rotation.z += (targetRoll - this.car.rotation.z) * 0.15;
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  private reset() {
    this.speed       = 0;
    this.crashed     = false;
    this.spawnSafeTime = 0;
    this.blockForward  = false;
    this.steerAngle    = 0;
    this.carYaw        = 0;

    this.car.position.set(0, 0.35, 0);
    this.car.rotation.set(0, 0, 0);
  }
}