import * as THREE from 'three';
import { InputHandler } from './InputHandler';
import { PhysicsSystem } from './PhysicsSystem';

// Legacy GameController - now acts as a bridge to PhysicsSystem
// This maintains backward compatibility while delegating to the new system
export class GameController {
  public physicsSystem: PhysicsSystem;
  private speedMultiplier: number = 1.0;
  private baseSpeed: number = 5.0;
  private maxSpeed: number = 15.0;
  private minSpeed: number = 3.0;

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler,
    curve: THREE.CatmullRomCurve3
  ) {
    this.physicsSystem = new PhysicsSystem(car, obstacles, input, curve);
    
    // Set initial running speed
    this.physicsSystem.setSpeed(this.baseSpeed);
    
    console.info('[GameController] Legacy controller initialized with PhysicsSystem');
    console.info(`[GameController] Running speed: ${this.baseSpeed} units/sec`);
  }

  update(delta: number) {
    // Apply speed multiplier to physics system
    const currentSpeed = this.physicsSystem.getSpeed();
    const targetSpeed = this.baseSpeed * this.speedMultiplier;
    
    // Smooth speed transition
    const newSpeed = this.lerp(currentSpeed, targetSpeed, 0.1);
    this.physicsSystem.setSpeed(Math.min(this.maxSpeed, Math.max(this.minSpeed, newSpeed)));
    
    // Update physics with current delta
    this.physicsSystem.update(delta);
  }

  // Speed control methods
  setBaseSpeed(speed: number) {
    this.baseSpeed = Math.min(this.maxSpeed, Math.max(this.minSpeed, speed));
    console.info(`[GameController] Base speed set to: ${this.baseSpeed}`);
  }

  setSpeedMultiplier(multiplier: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, multiplier));
    console.info(`[GameController] Speed multiplier set to: ${this.speedMultiplier}`);
  }

  increaseSpeed(amount: number = 0.5) {
    this.setBaseSpeed(this.baseSpeed + amount);
  }

  decreaseSpeed(amount: number = 0.5) {
    this.setBaseSpeed(this.baseSpeed - amount);
  }

  boostSpeed(duration: number = 2.0, boostMultiplier: number = 1.5) {
    const originalMultiplier = this.speedMultiplier;
    this.setSpeedMultiplier(boostMultiplier);
    
    setTimeout(() => {
      this.setSpeedMultiplier(originalMultiplier);
    }, duration * 1000);
  }

  getRunningSpeed(): number {
    return this.physicsSystem.getSpeed();
  }

  // Delegate methods to PhysicsSystem
  getSpeed(): number {
    return this.physicsSystem.getSpeed();
  }

  getCurrentLane(): number {
    return this.physicsSystem.getCurrentLane();
  }

  isCrashed(): boolean {
    return this.physicsSystem.isCrashed();
  }

  getPosition(): THREE.Vector3 {
    return this.physicsSystem.getPosition();
  }

  reset(): void {
    this.physicsSystem.reset();
    this.speedMultiplier = 1.0;
    this.baseSpeed = 5.0;
    this.physicsSystem.setSpeed(this.baseSpeed);
  }

  // Additional legacy methods for compatibility
  getDebugInfo() {
    return {
      ...this.physicsSystem.getDebugInfo(),
      baseSpeed: this.baseSpeed,
      speedMultiplier: this.speedMultiplier,
      runningSpeed: this.getRunningSpeed(),
      maxSpeed: this.maxSpeed,
      minSpeed: this.minSpeed,
    };
  }

  // Helper method for linear interpolation
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }
}