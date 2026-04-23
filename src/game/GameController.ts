import * as THREE from "three";
import { InputHandler } from "./InputHandler";

export class GameController {
  private car: THREE.Object3D;
  private curve: any;
  private input: InputHandler;
  private obstacles: THREE.Mesh[];

  private speed = 0;
  private t = 0;
  private lateralOffset = 0;
  private crashed = false;
  private spawnSafeTime = 0;

  private MAX_SPEED = 0.0025;
  private ACCEL = 0.00008;
  private FRICTION = 0.00004;
  private TURN_STRENGTH = 0.002;

  constructor(car: THREE.Object3D, curve: any, obstacles: THREE.Mesh[], input: InputHandler) {
    this.car = car;
    this.curve = curve;
    this.obstacles = obstacles;
    this.input = input;
  }

  update() {
    this.spawnSafeTime++;

    const isFwd = this.input.isPressed("fwd");
    const isBwd = this.input.isPressed("bwd");
    const isLft = this.input.isPressed("lft");
    const isRgt = this.input.isPressed("rgt");

    // SPEED
    if (!this.crashed) {
      if (isFwd) this.speed = Math.min(this.speed + this.ACCEL, this.MAX_SPEED);
      else if (isBwd) this.speed = Math.max(this.speed - this.ACCEL, -this.MAX_SPEED * 0.5);
      else {
        if (this.speed > 0) this.speed = Math.max(this.speed - this.FRICTION, 0);
        if (this.speed < 0) this.speed = Math.min(this.speed + this.FRICTION, 0);
      }
    }

    // MOVE
    this.t = THREE.MathUtils.clamp(this.t + this.speed, 0, 0.999);

    if (isLft) this.lateralOffset += this.TURN_STRENGTH;
    if (isRgt) this.lateralOffset -= this.TURN_STRENGTH;

    const point = this.curve.getPoint(this.t);
    const tangent = this.curve.getTangent(this.t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pos = point.clone().add(normal.multiplyScalar(this.lateralOffset));
    this.car.position.copy(pos);

    this.car.rotation.y = Math.atan2(-tangent.x, -tangent.z);

    // COLLISION
    if (this.spawnSafeTime > 60) {
      this.obstacles.forEach((obs) => {
        const dist = this.car.position.distanceTo(obs.position);
        if (dist < 1.8) {
          this.crashed = true;
          this.speed *= 0.5;
        }
      });
    }
  }
}