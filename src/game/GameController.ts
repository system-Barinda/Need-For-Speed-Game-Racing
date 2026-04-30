import * as THREE from "three";
import { InputHandler } from "./InputHandler";

/**
 * Bicycle / rear-axle car model
 * ─────────────────────────────
 * We simulate TWO points on the car:
 *   frontAxle  = car centre + (wheelbase/2) forward
 *   rearAxle   = car centre - (wheelbase/2) forward
 *
 * Each frame:
 *  1. Move rearAxle  straight in the car's current heading
 *  2. Move frontAxle in the steered direction
 *  3. Re-derive car position + heading from the two axle positions
 *
 * This is the same model used in most professional racing games.
 */
export class GameController {
  private car: THREE.Object3D;
  private curve: any;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private updateTraffic?: () => void;

  // ── Physics state ─────────────────────────────────────────────────────────
  private speed        = 0;
  private heading      = 0;   // radians — car's current facing angle (Y axis)
  private steerAngle   = 0;   // current wheel deflection in radians

  private crashed       = false;
  private spawnSafeTime = 0;
  private blockForward  = false;

  // ── Tuning ────────────────────────────────────────────────────────────────
  private readonly WHEELBASE      = 3.0;   // front↔rear axle distance (world units)
  private readonly MAX_SPEED      = 0.45;
  private readonly REVERSE_SPEED  = 0.18;
  private readonly ACCEL          = 0.013;
  private readonly BRAKE          = 0.025;
  private readonly FRICTION       = 0.007;

  // Max wheel lock angle ~28°
  private readonly MAX_WHEEL_LOCK = 0.48;

  // How fast wheels physically turn toward target (0–1 lerp per frame)
  private readonly STEER_SPEED    = 0.18;

  // How fast wheels self-centre when released
  private readonly STEER_RETURN   = 0.14;

  // Cosmetic body roll amount
  private readonly BODY_ROLL      = 0.06;

  private keys: Record<string, boolean> = {};

  constructor(
    car: THREE.Object3D,
    curve: any,
    obstacles: THREE.Mesh[],
    input: InputHandler,
    updateTraffic?: () => void
  ) {
    this.car            = car;
    this.curve          = curve;
    this.obstacles      = obstacles;
    this.input          = input;
    this.updateTraffic  = updateTraffic;

    // Seed heading from scene placement
    this.heading = car.rotation.y;

    window.addEventListener("keydown", (e) => (this.keys[e.key.toLowerCase()] = true));
    window.addEventListener("keyup",   (e) => (this.keys[e.key.toLowerCase()] = false));
  }

  // ── Called every animation frame ──────────────────────────────────────────
  update() {
    this.spawnSafeTime++;
    this.blockForward = false;

    if (this.updateTraffic) this.updateTraffic();

    // ── Input ────────────────────────────────────────────────────────────────
    const isFwd = this.input.isPressed("fwd") || this.keys["arrowup"]    || this.keys["w"];
    const isBwd = this.input.isPressed("bwd") || this.keys["arrowdown"]  || this.keys["s"];
    const isLft = this.input.isPressed("lft") || this.keys["arrowleft"]  || this.keys["a"];
    const isRgt = this.input.isPressed("rgt") || this.keys["arrowright"] || this.keys["d"];

    if (this.input.isPressed("r") || this.keys["r"]) {
      this.reset();
      return;
    }

    // ── Collision ────────────────────────────────────────────────────────────
    if (this.spawnSafeTime > 60) {
      for (const obs of this.obstacles) {
        if (!obs) continue;
        const dist = this.car.position.distanceTo(obs.position);
        if (dist > 6) continue;
        const sideDiff = Math.abs(obs.position.x - this.car.position.x);
        if (sideDiff < 2.0 && dist < 3.2) {
          this.blockForward = true;
        }
      }
    }

    // ── Throttle / brake ─────────────────────────────────────────────────────
    if (!this.crashed) {
      if (isFwd && !this.blockForward) {
        this.speed = Math.min(this.speed + this.ACCEL, this.MAX_SPEED);
      } else if (isBwd) {
        if (this.speed > 0.001) {
          // Brake while rolling forward
          this.speed = Math.max(this.speed - this.BRAKE, 0);
        } else {
          // Reverse
          this.speed = Math.max(this.speed - this.ACCEL, -this.REVERSE_SPEED);
        }
      } else {
        // Coast to a stop
        if (this.speed > 0) this.speed = Math.max(this.speed - this.FRICTION, 0);
        if (this.speed < 0) this.speed = Math.min(this.speed + this.FRICTION, 0);
      }
    } else {
      this.speed *= 0.90;
    }

    if (this.blockForward && this.speed > 0) this.speed *= 0.80;

    // ── Steering ──────────────────────────────────────────────────────────────
    //
    // Wheel lock range shrinks slightly at high speed (stability)
    //
    const absSpeed   = Math.abs(this.speed);
    const speedRatio = Math.min(absSpeed / this.MAX_SPEED, 1);
    const maxLockNow = this.MAX_WHEEL_LOCK * (1 - speedRatio * 0.4);

    let targetWheel = 0;
    if (isLft) targetWheel =  maxLockNow;
    if (isRgt) targetWheel = -maxLockNow;

    if (isLft || isRgt) {
      // Lerp toward target — physical steering lag
      this.steerAngle += (targetWheel - this.steerAngle) * this.STEER_SPEED;
    } else {
      // Self-centre (castor effect — faster return at speed)
      const returnRate = this.STEER_RETURN + speedRatio * 0.18;
      this.steerAngle *= (1 - returnRate);
    }

    this.steerAngle = Math.max(-maxLockNow, Math.min(maxLockNow, this.steerAngle));

    // ── Bicycle model (rear-axle pivot) ───────────────────────────────────────
    //
    // Key insight: the REAR axle always moves in the current heading direction.
    //              The FRONT axle moves in the STEERED direction.
    //              The new heading is derived from where the axles ended up.
    //
    if (absSpeed > 0.0005) {
      const half = this.WHEELBASE / 2;
      const cosH = Math.cos(this.heading);
      const sinH = Math.sin(this.heading);

      // Compute axle world positions from car centre + heading
      //   forward in Three.js convention: +sinH on X, -cosH on Z
      const rearX  = this.car.position.x - sinH * half;
      const rearZ  = this.car.position.z + cosH * half;
      const frontX = this.car.position.x + sinH * half;
      const frontZ = this.car.position.z - cosH * half;

      // Move rear axle in current heading direction
      const newRearX = rearX + sinH * this.speed;
      const newRearZ = rearZ - cosH * this.speed;

      // Move front axle in steered heading direction
      const steeredH = this.heading + this.steerAngle;
      const cosSH    = Math.cos(steeredH);
      const sinSH    = Math.sin(steeredH);
      const newFrontX = frontX + sinSH * this.speed;
      const newFrontZ = frontZ - cosSH * this.speed;

      // New car centre = midpoint of axles
      this.car.position.x = (newRearX + newFrontX) / 2;
      this.car.position.z = (newRearZ + newFrontZ) / 2;

      // New heading = direction vector from rear to front axle
      this.heading = Math.atan2(
        newFrontX - newRearX,
       -(newFrontZ - newRearZ)
      );
    }

    // ── Write to mesh ────────────────────────────────────────────────────────
    this.car.rotation.y = this.heading;

    // Cosmetic body roll into corners
    const targetRoll = -this.steerAngle * speedRatio * this.BODY_ROLL;
    this.car.rotation.z += (targetRoll - this.car.rotation.z) * 0.12;

    // Never pitch up/down
    this.car.rotation.x = 0;
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  private reset() {
    this.speed         = 0;
    this.heading       = 0;
    this.steerAngle    = 0;
    this.crashed       = false;
    this.spawnSafeTime = 0;
    this.blockForward  = false;

    this.car.position.set(0, 0.35, 0);
    this.car.rotation.set(0, 0, 0);
  }
}