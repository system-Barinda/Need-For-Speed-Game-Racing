import * as THREE from 'three';
import { InputHandler } from './InputHandler';
import { PhysicsSystem } from './PhysicsSystem';

// Legacy GameController - now acts as a bridge to PhysicsSystem
// This maintains backward compatibility while delegating to the new system
export class GameController {
  private physicsSystem: PhysicsSystem;

  constructor(
    car: THREE.Object3D,
    obstacles: THREE.Mesh[],
    input: InputHandler
  ) {
    this.physicsSystem = new PhysicsSystem(car, obstacles, input);
    console.info('[GameController] Legacy controller initialized with PhysicsSystem');
  }

  update(delta: number) {
    this.physicsSystem.update(delta);
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
  }

  // Additional legacy methods for compatibility
  getDebugInfo() {
    return this.physicsSystem.getDebugInfo();
  }
}