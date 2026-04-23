import * as THREE from 'three';
import { InputHandler } from './InputHandler';

export class GameController {
  private car: THREE.Object3D;
  private input: InputHandler;

  private speed: number = 0;
  private maxSpeed: number = 20;
  private acceleration: number = 10;
  private friction: number = 5;

  constructor(car: THREE.Object3D, input: InputHandler) {
    this.car = car;
    this.input = input;
  }

  update(delta: number) {
    this.handleMovement(delta);
  }

  private handleMovement(delta: number) {
    // 🚗 Acceleration
    if (this.input.isPressed('ArrowUp') || this.input.isPressed('w')) {
      this.speed += this.acceleration * delta;
    }

    // 🛑 Brake
    if (this.input.isPressed('ArrowDown') || this.input.isPressed('s')) {
      this.speed -= this.acceleration * delta;
    }

    // Clamp speed
    this.speed = Math.max(0, Math.min(this.speed, this.maxSpeed));

    // Friction (slow down naturally)
    if (!this.input.isPressed('ArrowUp')) {
      this.speed -= this.friction * delta;
      this.speed = Math.max(0, this.speed);
    }

    // ⬅️➡️ Steering
    if (this.input.isPressed('ArrowLeft') || this.input.isPressed('a')) {
      this.car.position.x -= 10 * delta;
    }

    if (this.input.isPressed('ArrowRight') || this.input.isPressed('d')) {
      this.car.position.x += 10 * delta;
    }

    // 🏎️ Move forward
    this.car.position.z -= this.speed * delta;
  }
}
