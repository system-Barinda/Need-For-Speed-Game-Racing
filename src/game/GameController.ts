export class GameController {
  private car: any;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, car: any) {
    this.scene = scene;
    this.car = car;
  }

  update(delta: number) {
    // Move car forward
    this.car.position.z -= delta * 10;

    // Example: simple control
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.car.position.x -= 0.5;
      if (e.key === "ArrowRight") this.car.position.x += 0.5;
    });
  }
}