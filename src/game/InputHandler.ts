export class InputHandler {
  private keys = new Set<string>();
  private justPressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    console.info('[Game] InputHandler ready');
  }

  // ================= KEY NORMALIZATION =================
  private normalizeKey(key: string): string {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'fwd';

      case 'ArrowDown':
      case 's':
      case 'S':
        return 'bwd';

      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'lft';

      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'rgt';

      case ' ':
      case 'Space':
        return 'space';

      case 'r':
      case 'R':
        return 'r';

      default:
        return key.toLowerCase();
    }
  }

  // ================= EVENTS =================
  private onKeyDown = (e: KeyboardEvent) => {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space'].includes(
        e.key
      )
    ) {
      e.preventDefault();
    }

    const key = this.normalizeKey(e.key);

    // ✅ detect first press only
    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.justPressed.add(key); // 🔥 IMPORTANT
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = this.normalizeKey(e.key);
    this.keys.delete(key);
  };

  private onBlur = () => {
    this.keys.clear();
    this.justPressed.clear();
  };

  // ================= API =================

  // hold key
  isPressed(key: string) {
    return this.keys.has(key);
  }

  // 🔥 tap once (use for lane switching)
  isJustPressed(key: string) {
    return this.justPressed.has(key);
  }

  // 🔥 MUST call this every frame (in GameLoop)
  update() {
    this.justPressed.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.keys.clear();
    this.justPressed.clear();
  }
}