export class InputHandler {
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private keyStateMap = new Map<string, boolean>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    console.info('[InputHandler] Ready and listening for input');
  }

  // ================= KEY NORMALIZATION =================
  private normalizeKey(key: string): string {
    const normalized = key.toLowerCase();
    
    switch (normalized) {
      case 'arrowup':
      case 'w':
        return 'forward';

      case 'arrowdown':
      case 's':
        return 'backward';

      case 'arrowleft':
      case 'a':
        return 'left';

      case 'arrowright':
      case 'd':
        return 'right';

      case ' ':
      case 'space':
        return 'space';

      case 'arrowup':
      case 'shift':
        return 'boost';

      case 'r':
        return 'reset';

      case 'escape':
      case 'p':
        return 'pause';

      default:
        return normalized;
    }
  }

  // ================= EVENT HANDLERS =================
  private onKeyDown = (e: KeyboardEvent) => {
    // Prevent default behavior for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Space', 'Shift', 'W', 'A', 'S', 'D', 'w', 'a', 's', 'd'];
    if (gameKeys.includes(e.key)) {
      e.preventDefault();
    }

    const key = this.normalizeKey(e.key);
    
    // Detect first press only
    if (!this.keys.has(key)) {
      this.keys.add(key);
      this.justPressed.add(key);
      this.keyStateMap.set(key, true);
      
      // Debug logging (optional - remove in production)
      if (key === 'left' || key === 'right' || key === 'forward' || key === 'backward') {
        console.log(`[InputHandler] Key pressed: ${key}`);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = this.normalizeKey(e.key);
    
    if (this.keys.has(key)) {
      this.keys.delete(key);
      this.justReleased.add(key);
      this.keyStateMap.set(key, false);
    }
  };

  private onBlur = () => {
    // Clear all input when window loses focus
    this.keys.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.keyStateMap.clear();
    console.log('[InputHandler] Window blur - all inputs cleared');
  };

  // ================= PUBLIC API =================

  // Check if key is currently being held down
  isPressed(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    return this.keys.has(normalizedKey);
  }

  // Check if key was just pressed this frame (good for single actions)
  isJustPressed(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    return this.justPressed.has(normalizedKey);
  }

  // Check if key was just released this frame
  isJustReleased(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    return this.justReleased.has(normalizedKey);
  }

  // Get all currently pressed keys
  getPressedKeys(): string[] {
    return Array.from(this.keys);
  }

  // Get movement direction as vector
  getMovementDirection(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    
    if (this.isPressed('left')) x -= 1;
    if (this.isPressed('right')) x += 1;
    if (this.isPressed('forward')) z += 1;
    if (this.isPressed('backward')) z -= 1;
    
    // Normalize diagonal movement
    if (x !== 0 && z !== 0) {
      const length = Math.sqrt(x * x + z * z);
      x /= length;
      z /= length;
    }
    
    return { x, z };
  }

  // Check for any input activity
  hasAnyInput(): boolean {
    return this.keys.size > 0;
  }

  // Get current action states
  getActionStates() {
    return {
      left: this.isPressed('left'),
      right: this.isPressed('right'),
      forward: this.isPressed('forward'),
      backward: this.isPressed('backward'),
      boost: this.isJustPressed('boost'),
      reset: this.isJustPressed('reset'),
      pause: this.isJustPressed('pause'),
      space: this.isJustPressed('space')
    };
  }

  // ================= UPDATE LOOP =================
  // MUST call this every frame to reset one-frame states
  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  // ================= CLEANUP =================
  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    
    this.keys.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.keyStateMap.clear();
    
    console.info('[InputHandler] Destroyed and cleaned up');
  }
}