import * as THREE from "three";
import { InputHandler } from "./InputHandler";

/**
 * Realistic Car Physics Model
 * ─────────────────────────────
 * Uses a full physics-based approach with:
 * - Velocity vector (separate from heading)
 * - Lateral and longitudinal forces
 * - Slip angles for realistic cornering
 * - Proper steering response at different speeds
 */
export class GameController {
  private car: THREE.Object3D;
  private curve: any;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];
  private updateTraffic?: () => void;

  // ── Physics state ─────────────────────────────────────────────────────────
  private velocityX     = 0;   // velocity in world X direction
  private velocityZ     = 0;   // velocity in world Z direction
  private heading       = 0;   // radians — car's facing angle (Y axis)
  private steerInput    = 0;   // raw steering input (-1 to 1)
  private steerAngle    = 0;   // current wheel deflection in radians
  private crashed       = false;
  private spawnSafeTime = 0;
  private blockForward  = false;

  // ── Tuning (realistic values) ─────────────────────────────────────────────
  private readonly WHEELBASE          = 2.8;   // meters
  private readonly MAX_SPEED          = 18.0;  // m/s (~65 km/h)
  private readonly REVERSE_MAX_SPEED  = 6.0;   // m/s (~22 km/h)
  private readonly ACCEL              = 12.0;  // m/s² (acceleration force)
  private readonly BRAKE_FORCE        = 10.0;  // m/s² (braking force)
  private readonly ENGINE_BRAKING     = 3.0;   // m/s² (natural deceleration)
  
  // ── Steering properties ────────────────────────────────────────────────────
  private readonly MAX_STEER_ANGLE    = 0.65;  // radians (~37° max wheel lock)
  private readonly STEER_SPEED_RATE   = 3.5;   // how fast steering turns (rad/s)
  private readonly STEER_RETURN_RATE  = 2.8;   // how fast steering returns (rad/s)
  
  // ── Handling (traction & grip) ────────────────────────────────────────────
  private readonly LONGITUDINAL_TRACTION = 1.2;   // acceleration grip multiplier
  private readonly LATERAL_TRACTION      = 1.0;   // cornering grip multiplier
  private readonly UNDERSTEER_FACTOR     = 0.45;  // more understeer at speed
  
  // ── Drift / oversteer characteristics ─────────────────────────────────────
  private readonly DRIFT_SLIP_THRESHOLD = 0.12;   // radians (slip angle threshold)
  private readonly DRIFT_FRICTION       = 0.98;   // friction when sliding
  
  // ── Speed-sensitive steering ──────────────────────────────────────────────
  private readonly SPEED_STEERING_CURVE = 0.35;   // reduces steering at high speed
  
  // ── Visual effects ────────────────────────────────────────────────────────
  private readonly BODY_ROLL            = 0.15;
  private readonly TILT_FACTOR          = 0.08;

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

    // ── Collision detection ─────────────────────────────────────────────────
    if (this.spawnSafeTime > 60 && !this.crashed) {
      for (const obs of this.obstacles) {
        if (!obs) continue;
        const dist = this.car.position.distanceTo(obs.position);
        const sideDiff = Math.abs(obs.position.x - this.car.position.x);
        
        // Realistic collision bounds (car is ~2m wide, 4.5m long)
        if (dist < 3.0 && sideDiff < 1.5) {
          this.crashed = true;
          this.blockForward = true;
          // Reduce speed on collision
          const crashSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
          if (crashSpeed > 3.0) {
            this.velocityX *= 0.3;
            this.velocityZ *= 0.3;
          }
          break;
        }
        
        // Obstacle blocking (slowing down instead of crashing)
        if (dist < 5.0 && sideDiff < 1.8 && dist > 3.0) {
          this.blockForward = true;
        }
      }
    }

    // ── Calculate current speed ─────────────────────────────────────────────
    let currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
    const speedKmh = currentSpeed * 3.6; // convert to km/h for reference
    
    // ── Throttle / Brake (Longitudinal forces) ──────────────────────────────
    if (!this.crashed) {
      // Get heading direction vectors
      const forwardX = Math.sin(this.heading);
      const forwardZ = -Math.cos(this.heading);
      
      // Calculate forward velocity component
      const forwardVel = this.velocityX * forwardX + this.velocityZ * forwardZ;
      
      if (isFwd && !this.blockForward) {
        // Acceleration - reduced if steering hard (traction loss)
        let tractionLoss = Math.abs(this.steerAngle / this.MAX_STEER_ANGLE) * 0.3;
        let acceleration = this.ACCEL * (1 - tractionLoss) * this.LONGITUDINAL_TRACTION;
        
        // Reduce acceleration when going backwards
        if (forwardVel < -1.0) {
          acceleration *= 0.5; // brake before reversing
        }
        
        // Apply acceleration in forward direction
        this.velocityX += forwardX * acceleration * (1/60);
        this.velocityZ += forwardZ * acceleration * (1/60);
        
        // Limit max speed
        if (currentSpeed > this.MAX_SPEED) {
          this.velocityX *= this.MAX_SPEED / currentSpeed;
          this.velocityZ *= this.MAX_SPEED / currentSpeed;
          currentSpeed = this.MAX_SPEED;
        }
      } 
      else if (isBwd) {
        // Braking or reversing
        if (currentSpeed > 0.5) {
          // Brake - strong deceleration
          const brakeDirX = -this.velocityX / currentSpeed;
          const brakeDirZ = -this.velocityZ / currentSpeed;
          this.velocityX += brakeDirX * this.BRAKE_FORCE * (1/60);
          this.velocityZ += brakeDirZ * this.BRAKE_FORCE * (1/60);
        } 
        else {
          // Reverse
          const reverseDirX = -forwardX;
          const reverseDirZ = -forwardZ;
          this.velocityX += reverseDirX * this.ACCEL * 0.6 * (1/60);
          this.velocityZ += reverseDirZ * this.ACCEL * 0.6 * (1/60);
          
          // Limit reverse speed
          currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
          if (currentSpeed > this.REVERSE_MAX_SPEED) {
            this.velocityX *= this.REVERSE_MAX_SPEED / currentSpeed;
            this.velocityZ *= this.REVERSE_MAX_SPEED / currentSpeed;
          }
        }
      } 
      else {
        // Coasting - engine braking and friction
        const speedRatio = Math.min(currentSpeed / this.MAX_SPEED, 1);
        const drag = this.ENGINE_BRAKING * (0.5 + speedRatio * 0.5);
        
        if (currentSpeed > 0) {
          this.velocityX *= (1 - drag * (1/60));
          this.velocityZ *= (1 - drag * (1/60));
        }
        
        // Very low speed friction (prevents endless rolling)
        if (currentSpeed < 0.1 && currentSpeed > 0) {
          this.velocityX *= 0.95;
          this.velocityZ *= 0.95;
        }
      }
    }
    
    // Reduce speed when blocked by obstacle
    if (this.blockForward && currentSpeed > 0) {
      this.velocityX *= 0.96;
      this.velocityZ *= 0.96;
    }
    
    // Update current speed after changes
    currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityZ * this.velocityZ);
    
    // ── Steering input (realistic with speed sensitivity) ───────────────────
    let rawSteer = 0;
    if (isLft) rawSteer = 1;
    if (isRgt) rawSteer = -1;
    if (isLft && isRgt) rawSteer = 0;
    
    // Speed-sensitive steering (less steering at high speed)
    const speedRatio = Math.min(currentSpeed / this.MAX_SPEED, 1);
    const steeringReduction = 1 - (speedRatio * this.SPEED_STEERING_CURVE);
    let targetSteer = rawSteer * steeringReduction;
    
    // Update steering angle with realistic rate
    if (Math.abs(rawSteer) > 0) {
      // Turning - apply steering input
      const steerDelta = (targetSteer * this.MAX_STEER_ANGLE - this.steerAngle);
      this.steerAngle += Math.sign(steerDelta) * Math.min(Math.abs(steerDelta), this.STEER_SPEED_RATE * (1/60));
    } else {
      // Return to center with speed-sensitive return rate
      const returnRate = this.STEER_RETURN_RATE * (0.5 + speedRatio * 0.5);
      this.steerAngle *= (1 - returnRate * (1/60));
    }
    
    // Clamp steering angle
    this.steerAngle = Math.max(-this.MAX_STEER_ANGLE, Math.min(this.MAX_STEER_ANGLE, this.steerAngle));
    
    // ── Lateral forces (cornering physics) ──────────────────────────────────
    if (currentSpeed > 0.1) {
      // Get forward direction
      const forwardX = Math.sin(this.heading);
      const forwardZ = -Math.cos(this.heading);
      
      // Calculate forward and lateral velocity components
      const forwardVel = this.velocityX * forwardX + this.velocityZ * forwardZ;
      const lateralVel = -this.velocityX * forwardZ + this.velocityZ * forwardX;
      
      // Calculate slip angle (angle between velocity and heading)
      let slipAngle = Math.atan2(lateralVel, forwardVel);
      
      // Apply steering effect to heading (yaw rotation)
      let yawRate = 0;
      
      if (Math.abs(forwardVel) > 0.5) {
        // Normal driving - steering affects heading based on speed
        const steeringEffect = this.steerAngle * (currentSpeed / this.WHEELBASE) * (1/60);
        
        // Understeer at high speed
        let understeer = 1 - (speedRatio * this.UNDERSTEER_FACTOR);
        yawRate = steeringEffect * understeer;
        
        // Add drift/slip effect when sliding
        const absSlip = Math.abs(slipAngle);
        if (absSlip > this.DRIFT_SLIP_THRESHOLD && currentSpeed > 5.0) {
          // Counter-steering effect for drift
          const driftAmount = (absSlip - this.DRIFT_SLIP_THRESHOLD) / 0.3;
          const driftCorrection = Math.sign(slipAngle) * driftAmount * 0.05;
          yawRate += driftCorrection;
          
          // Reduce lateral traction when sliding (drift)
          const lateralFriction = this.DRIFT_FRICTION;
          // Kill some lateral velocity
          const correction = -lateralVel * lateralFriction * (1/60);
          this.velocityX += forwardZ * correction;
          this.velocityZ += -forwardX * correction;
        } else {
          // Normal cornering - lateral grip keeps car stable
          const gripEffect = Math.min(Math.abs(lateralVel) * this.LATERAL_TRACTION * 0.5, 3.0) * (1/60);
          const correction = -lateralVel * gripEffect;
          this.velocityX += forwardZ * correction;
          this.velocityZ += -forwardX * correction;
        }
      }
      
      // Apply yaw rotation to heading
      this.heading += yawRate;
      
      // Normalize heading
      this.heading = ((this.heading % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }
    
    // ── Apply velocity to position ──────────────────────────────────────────
    this.car.position.x += this.velocityX * (1/60);
    this.car.position.z += this.velocityZ * (1/60);
    
    // ── Visual effects ──────────────────────────────────────────────────────
    // Steering wheel visual
    this.car.rotation.y = this.heading;
    
    // Body roll based on lateral G-force
    const forwardX = Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);
    const lateralVel = -this.velocityX * forwardZ + this.velocityZ * forwardX;
    const lateralForce = lateralVel * currentSpeed * 0.1;
    const targetRoll = -this.steerAngle * speedRatio * this.BODY_ROLL + lateralForce * this.TILT_FACTOR;
    this.car.rotation.z += (targetRoll - this.car.rotation.z) * 0.15;
    
    // Pitch during acceleration/braking
    const forwardVel = this.velocityX * forwardX + this.velocityZ * forwardZ;
    const accelerationForce = forwardVel - (this.prevForwardVel || 0);
    this.prevForwardVel = forwardVel;
    const targetPitch = -accelerationForce * 0.03;
    this.car.rotation.x += (targetPitch - this.car.rotation.x) * 0.1;
    
    // ── Crash effect (visual) ───────────────────────────────────────────────
    if (this.crashed) {
      this.car.rotation.z += 0.05;
      this.car.rotation.x += 0.03;
    }
  }
  
  private prevForwardVel = 0;

  // ── Reset car state ──────────────────────────────────────────────────────
  private reset() {
    this.velocityX     = 0;
    this.velocityZ     = 0;
    this.heading       = 0;
    this.steerInput    = 0;
    this.steerAngle    = 0;
    this.crashed       = false;
    this.spawnSafeTime = 0;
    this.blockForward  = false;
    this.prevForwardVel = 0;

    this.car.position.set(0, 0.35, 0);
    this.car.rotation.set(0, 0, 0);
  }
}