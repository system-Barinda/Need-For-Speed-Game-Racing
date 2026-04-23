export class InputHandler {
  private keys = new Set<string>();

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
  }

  private normalizeKey(key: string): string {
    switch (key) {
      case "ArrowUp": case "w": case "W": return "fwd";
      case "ArrowDown": case "s": case "S": return "bwd";
      case "ArrowLeft": case "a": case "A": return "lft";
      case "ArrowRight": case "d": case "D": return "rgt";
      case " ": return "space";
      default: return key.toLowerCase();
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
      e.preventDefault();
    }
    this.keys.add(this.normalizeKey(e.key));
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(this.normalizeKey(e.key));
  };

  isPressed(key: string) {
    return this.keys.has(key);
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}