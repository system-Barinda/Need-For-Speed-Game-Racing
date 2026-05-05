import { GameStateManager } from './GameStateManager';
import { GameState, type GameStats, DEFAULT_STATS } from './types';

export interface UIElement {
  id: string;
  element: HTMLElement;
  visible: boolean;
  update?: (stats: GameStats, state: GameState) => void;
}

export class UISystem {
  private container: HTMLElement;
  private uiElements: Map<string, UIElement> = new Map();
  private gameStateManager: GameStateManager;

  // HUD elements
  private hudContainer!: HTMLElement;
  private speedDisplay!: HTMLElement;
  private scoreDisplay!: HTMLElement;
  private distanceDisplay!: HTMLElement;
  private timeDisplay!: HTMLElement;
  private levelDisplay!: HTMLElement;
  private miniMap!: HTMLElement;
  private speedBar!: HTMLElement; // Added speed bar
  private crashWarning!: HTMLElement; // Added crash warning

  // Menu elements
  private mainMenu!: HTMLElement;
  private pauseMenu!: HTMLElement;
  private gameOverMenu!: HTMLElement;
  private levelCompleteMenu!: HTMLElement;
  private settingsMenu!: HTMLElement | null;

  // Settings
  private showHUD = true;
  private showMiniMap = true;
  private messageQueue: string[] = [];
  private activeMessage: HTMLElement | null = null;

  constructor(container: HTMLElement, gameStateManager: GameStateManager) {
    this.container = container;
    this.gameStateManager = gameStateManager;

    this.initializeUI();
    console.info('[UISystem] UI system initialized');
  }

  private initializeUI() {
    this.createHUD();
    this.createMenus();
    this.setupEventListeners();
    this.updateVisibility();
  }

  private createHUD() {
    // Main HUD container
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'game-hud';
    this.hudContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: 'Arial', sans-serif;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      z-index: 100;
    `;

    // Speed display
    this.speedDisplay = this.createHUDText('Speed: 0 km/h', '24px', 'left: 20px; top: 20px;');
    this.hudContainer.appendChild(this.speedDisplay);

    // Speed bar
    this.speedBar = this.createSpeedBar();
    this.hudContainer.appendChild(this.speedBar);

    // Score display
    this.scoreDisplay = this.createHUDText('Score: 0', '28px', 'right: 20px; top: 20px;');
    this.hudContainer.appendChild(this.scoreDisplay);

    // Distance display
    this.distanceDisplay = this.createHUDText('Distance: 0m', '18px', 'left: 20px; top: 70px;');
    this.hudContainer.appendChild(this.distanceDisplay);

    // Time display
    this.timeDisplay = this.createHUDText('Time: 0.0s', '18px', 'left: 20px; top: 100px;');
    this.hudContainer.appendChild(this.timeDisplay);

    // Level display
    this.levelDisplay = this.createHUDText('Level 1', '22px', 'left: 50%; top: 20px; transform: translateX(-50%);');
    this.hudContainer.appendChild(this.levelDisplay);

    // Crash warning
    this.crashWarning = this.createHUDText('⚠️ WARNING ⚠️', '20px', 'left: 50%; top: 50%; transform: translate(-50%, -50%);');
    this.crashWarning.style.display = 'none';
    this.crashWarning.style.color = '#ff0000';
    this.crashWarning.style.fontWeight = 'bold';
    this.crashWarning.style.backgroundColor = 'rgba(0,0,0,0.7)';
    this.crashWarning.style.padding = '10px 20px';
    this.crashWarning.style.borderRadius = '10px';
    this.crashWarning.style.whiteSpace = 'nowrap';
    this.hudContainer.appendChild(this.crashWarning);

    // Mini map
    this.miniMap = document.createElement('div');
    this.miniMap.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      width: 180px;
      height: 180px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 10px;
      pointer-events: auto;
      backdrop-filter: blur(5px);
    `;
    this.hudContainer.appendChild(this.miniMap);

    this.container.appendChild(this.hudContainer);
  }

  private createSpeedBar(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      width: 200px;
      height: 20px;
      background: rgba(0,0,0,0.5);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid white;
    `;
    
    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #00ff00, #ffff00, #ff0000);
      transition: width 0.1s ease;
    `;
    
    container.appendChild(fill);
    return container;
  }

  private updateSpeedBar(speed: number, maxSpeed: number = 30) {
    const fill = this.speedBar.children[0] as HTMLElement;
    const percentage = Math.min(100, (Math.abs(speed) / maxSpeed) * 100);
    fill.style.width = `${percentage}%`;
    
    // Change color based on speed
    if (percentage > 80) {
      fill.style.background = '#ff0000';
    } else if (percentage > 50) {
      fill.style.background = '#ffff00';
    } else {
      fill.style.background = '#00ff00';
    }
  }

  private createHUDText(text: string, fontSize: string, position: string): HTMLElement {
    const element = document.createElement('div');
    element.textContent = text;
    element.style.cssText = `
      position: absolute;
      font-size: ${fontSize};
      font-weight: bold;
      ${position}
      pointer-events: none;
      background: rgba(0,0,0,0.5);
      padding: 5px 10px;
      border-radius: 5px;
      backdrop-filter: blur(3px);
    `;
    return element;
  }

  private createMenus() {
    // Main menu
    this.mainMenu = this.createMenu('main-menu', '🏎️ NEED FOR SPEED RACING 🏎️', [
      { text: '▶️ Start Game', action: () => this.gameStateManager.startGame() },
      { text: '⚙️ Settings', action: () => this.showSettings() },
      { text: 'ℹ️ About', action: () => this.showAbout() },
      { text: '🚪 Exit', action: () => this.exitGame() }
    ]);

    // Pause menu
    this.pauseMenu = this.createMenu('pause-menu', '⏸️ GAME PAUSED ⏸️', [
      { text: '▶️ Resume', action: () => this.gameStateManager.resumeGame() },
      { text: '🔄 Restart Level', action: () => this.gameStateManager.restartLevel() },
      { text: '⚙️ Settings', action: () => this.showSettings() },
      { text: '🏠 Main Menu', action: () => this.gameStateManager.resetGame() }
    ]);

    // Game over menu
    this.gameOverMenu = this.createMenu('game-over-menu', '💀 GAME OVER 💀', [
      { text: '🔄 Try Again', action: () => this.gameStateManager.restartLevel() },
      { text: '🏠 Main Menu', action: () => this.gameStateManager.resetGame() }
    ]);

    // Level complete menu
    this.levelCompleteMenu = this.createMenu('level-complete-menu', '🎉 LEVEL COMPLETE! 🎉', [
      { text: '➡️ Next Level', action: () => {
        if (this.gameStateManager.nextLevel()) {
          this.gameStateManager.startGame();
        } else {
          this.showMessage('🏆 CONGRATULATIONS! You completed all levels! 🏆');
          setTimeout(() => this.gameStateManager.resetGame(), 4000);
        }
      }},
      { text: '🔄 Restart Level', action: () => this.gameStateManager.restartLevel() },
      { text: '🏠 Main Menu', action: () => this.gameStateManager.resetGame() }
    ]);

    this.container.appendChild(this.mainMenu);
    this.container.appendChild(this.pauseMenu);
    this.container.appendChild(this.gameOverMenu);
    this.container.appendChild(this.levelCompleteMenu);
  }

  private createMenu(id: string, title: string, buttons: { text: string; action: () => void }[]): HTMLElement {
    const menu = document.createElement('div');
    menu.id = id;
    menu.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,40,0.95));
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      min-width: 320px;
      display: none;
      z-index: 200;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      color: #ffaa44;
      margin-bottom: 30px;
      font-size: 32px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    menu.appendChild(titleElement);

    buttons.forEach(buttonConfig => {
      const button = document.createElement('button');
      button.textContent = buttonConfig.text;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 12px 0;
        padding: 14px 20px;
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      button.onmouseover = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      };
      button.onmouseout = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      };
      button.onclick = () => {
        buttonConfig.action();
        this.hideAllMenus();
      };
      menu.appendChild(button);
    });

    return menu;
  }

  private setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      const state = this.gameStateManager.getState();
      
      switch (event.key) {
        case 'Escape':
          if (state === 'playing') {
            this.gameStateManager.pauseGame();
          } else if (state === 'paused') {
            this.gameStateManager.resumeGame();
          }
          break;
        case 'h':
        case 'H':
          this.toggleHUD();
          break;
        case 'm':
        case 'M':
          this.toggleMiniMap();
          break;
        case 'd':
        case 'D':
          this.showDebugInfo();
          break;
      }
    });
  }

  // Update methods
  update(deltaTime: number) {
    const stats = this.gameStateManager.getStats();
    const state = this.gameStateManager.getState();

    this.updateHUD(stats, state);
    this.updateVisibility();
    this.processMessageQueue();
    this.updateCrashWarning(stats);
  }

  private updateHUD(stats: GameStats, state: GameState) {
    if (!this.showHUD || state !== 'playing') return;

    const speedKmh = Math.abs(stats.speed * 3.6);
    this.speedDisplay.textContent = `⚡ SPEED: ${speedKmh.toFixed(0)} km/h`;
    this.scoreDisplay.textContent = `💰 SCORE: ${Math.floor(stats.score)}`;
    this.distanceDisplay.textContent = `📏 DISTANCE: ${Math.floor(stats.distance)}m`;
    this.timeDisplay.textContent = `⏱️ TIME: ${stats.time.toFixed(1)}s`;
    this.levelDisplay.textContent = `🎯 LEVEL ${stats.level}`;
    
    this.updateSpeedBar(stats.speed);
    this.updateMiniMap(stats);
  }

  private updateCrashWarning(stats: GameStats) {
    if (this.gameStateManager.getState() !== 'playing') {
      this.crashWarning.style.display = 'none';
      return;
    }
    
    // Show warning when approaching obstacles (simplified)
    const isNearCrash = stats.speed > 20 && stats.crashes > 0;
    if (isNearCrash) {
      this.crashWarning.style.display = 'block';
      // Flash effect
      const opacity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
      this.crashWarning.style.opacity = opacity.toString();
    } else {
      this.crashWarning.style.display = 'none';
    }
  }

  private updateMiniMap(stats: GameStats) {
    if (!this.showMiniMap) return;

    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 180, 180);
    
    // Draw lanes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    for (let i = 1; i < 3; i++) {
      const y = i * 60;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(180, y);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Draw road borders
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, 170, 170);
    
    // Draw player car
    const playerY = (stats.lane + 1) * 60 - 30;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(15, playerY - 8, 25, 16);
    
    // Draw player label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('YOU', 20, playerY - 10);
    
    // Draw or update mini map display
    this.miniMap.innerHTML = '';
    this.miniMap.appendChild(canvas);
    
    // Add legend
    const legend = document.createElement('div');
    legend.style.cssText = `
      position: absolute;
      bottom: 5px;
      left: 5px;
      font-size: 10px;
      color: white;
      background: rgba(0,0,0,0.5);
      padding: 2px 5px;
      border-radius: 3px;
    `;
    legend.textContent = '← LANE 1 | LANE 2 | LANE 3 →';
    this.miniMap.appendChild(legend);
  }

  private updateVisibility() {
    const state = this.gameStateManager.getState();

    // Hide all menus first
    this.hideAllMenus();

    // Show HUD based on state and settings
    this.hudContainer.style.display = (this.showHUD && state === 'playing') ? 'block' : 'none';

    // Show appropriate menu
    switch (state) {
      case 'menu':
        this.mainMenu.style.display = 'block';
        break;
      case 'paused':
        this.pauseMenu.style.display = 'block';
        break;
      case 'game_over':
        this.updateGameOverStats();
        this.gameOverMenu.style.display = 'block';
        break;
      case 'level_complete':
        this.updateLevelCompleteStats();
        this.levelCompleteMenu.style.display = 'block';
        break;
    }
  }

  private hideAllMenus() {
    this.mainMenu.style.display = 'none';
    this.pauseMenu.style.display = 'none';
    this.gameOverMenu.style.display = 'none';
    this.levelCompleteMenu.style.display = 'none';
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'none';
    }
  }

  private updateGameOverStats() {
    const stats = this.gameStateManager.getStats();
    const finalScore = Math.floor(stats.score);
    const finalDistance = Math.floor(stats.distance);
    const finalTime = stats.time.toFixed(1);
    
    const statsDisplay = document.createElement('div');
    statsDisplay.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: rgba(0,0,0,0.5);
      border-radius: 10px;
      font-size: 16px;
      text-align: left;
    `;
    statsDisplay.innerHTML = `
      <div>🏆 Final Score: ${finalScore}</div>
      <div>📏 Distance: ${finalDistance}m</div>
      <div>⏱️ Time: ${finalTime}s</div>
      <div>💥 Crashes: ${stats.crashes}</div>
    `;
    
    const existingStats = this.gameOverMenu.querySelector('.game-stats');
    if (existingStats) existingStats.remove();
    statsDisplay.className = 'game-stats';
    this.gameOverMenu.appendChild(statsDisplay);
  }

  private updateLevelCompleteStats() {
    const stats = this.gameStateManager.getStats();
    const levelProgress = this.gameStateManager.getLevelProgress();
    
    const statsDisplay = document.createElement('div');
    statsDisplay.style.cssText = `
      margin: 20px 0;
      padding: 15px;
      background: rgba(0,0,0,0.5);
      border-radius: 10px;
      font-size: 16px;
      text-align: left;
    `;
    statsDisplay.innerHTML = `
      <div>📊 Level Progress: ${levelProgress.toFixed(1)}%</div>
      <div>💰 Score: ${Math.floor(stats.score)}</div>
      <div>💥 Crashes: ${stats.crashes}</div>
    `;
    
    const existingStats = this.levelCompleteMenu.querySelector('.level-stats');
    if (existingStats) existingStats.remove();
    statsDisplay.className = 'level-stats';
    this.levelCompleteMenu.appendChild(statsDisplay);
  }

  private processMessageQueue() {
    if (this.activeMessage) return;
    if (this.messageQueue.length === 0) return;
    
    const message = this.messageQueue.shift();
    if (message) {
      this.showMessageNow(message);
    }
  }

  private showMessageNow(message: string) {
    this.activeMessage = document.createElement('div');
    this.activeMessage.textContent = message;
    this.activeMessage.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: #ffaa44;
      padding: 20px 30px;
      border-radius: 15px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      z-index: 300;
      pointer-events: none;
      border: 2px solid #ffaa44;
      animation: fadeInOut 3s ease-in-out;
    `;

    this.container.appendChild(this.activeMessage);

    setTimeout(() => {
      if (this.activeMessage && this.activeMessage.parentNode) {
        this.activeMessage.parentNode.removeChild(this.activeMessage);
        this.activeMessage = null;
      }
    }, 3000);
  }

  // UI control methods
  toggleHUD() {
    this.showHUD = !this.showHUD;
    this.updateVisibility();
    console.info(`[UISystem] HUD ${this.showHUD ? 'shown' : 'hidden'}`);
  }

  toggleMiniMap() {
    this.showMiniMap = !this.showMiniMap;
    this.miniMap.style.display = this.showMiniMap ? 'block' : 'none';
    console.info(`[UISystem] Mini map ${this.showMiniMap ? 'shown' : 'hidden'}`);
  }

  showMessage(message: string, duration: number = 3000) {
    this.messageQueue.push(message);
  }

  private showAbout() {
    this.showMessage('🏎️ Need for Speed Racing Game\nVersion 1.0\nUse Arrow Keys or WASD to drive\nPress ESC to pause', 5000);
  }

  private showSettings() {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'block';
      return;
    }
    
    this.settingsMenu = this.createMenu('settings-menu', '⚙️ SETTINGS ⚙️', [
      { text: `🎮 ${this.showHUD ? 'Hide' : 'Show'} HUD (H)`, action: () => this.toggleHUD() },
      { text: `🗺️ ${this.showMiniMap ? 'Hide' : 'Show'} Mini Map (M)`, action: () => this.toggleMiniMap() },
      { text: '🐞 Show Debug Info (D)', action: () => this.showDebugInfo() },
      { text: '🔙 Back', action: () => {
        if (this.settingsMenu) this.settingsMenu.style.display = 'none';
      }}
    ]);

    this.container.appendChild(this.settingsMenu);
    this.settingsMenu.style.display = 'block';
  }

  private exitGame() {
    if (confirm('Are you sure you want to exit the game?')) {
      window.close();
    }
  }

  // Achievement notifications
  showAchievement(achievement: string) {
    this.showMessage(`🏆 ACHIEVEMENT UNLOCKED: ${achievement} 🏆`, 5000);
    console.info(`[UISystem] Achievement unlocked: ${achievement}`);
  }

  // Debug information display
  showDebugInfo() {
    const debugInfo = this.gameStateManager.getDebugInfo();
    const debugElement = document.createElement('div');
    debugElement.style.cssText = `
      position: absolute;
      top: 20px;
      right: 200px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-width: 350px;
      z-index: 150;
      border: 1px solid #00ff00;
      backdrop-filter: blur(5px);
    `;

    debugElement.innerHTML = `
      <strong>🐞 DEBUG INFO</strong><br>
      ─────────────────<br>
      State: ${debugInfo.state}<br>
      Level: ${debugInfo.level}<br>
      Progress: ${debugInfo.levelProgress}<br>
      Time Remaining: ${debugInfo.timeRemaining}<br>
      Speed: ${debugInfo.stats.speed.toFixed(1)} units/s<br>
      Lane: ${debugInfo.stats.lane}<br>
      Crashes: ${debugInfo.stats.crashes}<br>
      Score: ${Math.floor(debugInfo.stats.score)}<br>
      Distance: ${Math.floor(debugInfo.stats.distance)}m<br>
      ─────────────────<br>
      Press D to close
    `;

    this.container.appendChild(debugElement);

    const closeHandler = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        if (debugElement.parentNode) {
          debugElement.parentNode.removeChild(debugElement);
        }
        document.removeEventListener('keydown', closeHandler);
      }
    };
    
    document.addEventListener('keydown', closeHandler);
    
    setTimeout(() => {
      if (debugElement.parentNode) {
        debugElement.parentNode.removeChild(debugElement);
        document.removeEventListener('keydown', closeHandler);
      }
    }, 15000);
  }

  // Cleanup
  destroy() {
    // Remove all UI elements
    this.uiElements.forEach(element => {
      if (element.element.parentNode) {
        element.element.parentNode.removeChild(element.element);
      }
    });
    this.uiElements.clear();

    // Remove main containers
    if (this.hudContainer && this.hudContainer.parentNode) {
      this.hudContainer.parentNode.removeChild(this.hudContainer);
    }
    
    if (this.settingsMenu && this.settingsMenu.parentNode) {
      this.settingsMenu.parentNode.removeChild(this.settingsMenu);
    }

    console.info('[UISystem] UI system destroyed');
  }
}