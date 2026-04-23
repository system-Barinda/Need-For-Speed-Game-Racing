export class InputHandler {
  private keys = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
  }

  private normalizeKey(key: string): string {
    switch (key) {
      case "ArrowUp":
      case "w":
      case "W":
        return "fwd";

      case "ArrowDown":
      case "s":
      case "S":
        return "bwd";

      case "ArrowLeft":
      case "a":
      case "A":
        return "lft";

      case "ArrowRight":
      case "d":
      case "D":
        return "rgt";

      case " ":
      case "Space":
        return "space";

      case "r":
      case "R":
        return "r";

      default:
        return key.toLowerCase();
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // 🚫 prevent browser scrolling
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"].includes(e.key)
    ) {
      e.preventDefault();
    }

    const key = this.normalizeKey(e.key);

    // avoid adding duplicates (important for smooth control)
    if (!this.keys.has(key)) {
      this.keys.add(key);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = this.normalizeKey(e.key);
    this.keys.delete(key);
  };

  isPressed(key: string) {
    return this.keys.has(key);
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.keys.clear();
  }
}