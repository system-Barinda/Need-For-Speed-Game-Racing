import * as THREE from 'three';
import { GameStateManager, GameState, GameStats } from './GameStateManager';

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
  private hudContainer: HTMLElement;
  private speedDisplay: HTMLElement;
  private scoreDisplay: HTMLElement;
  private distanceDisplay: HTMLElement;
  private timeDisplay: HTMLElement;
  private levelDisplay: HTMLElement;
  private miniMap: HTMLElement;

  // Menu elements
  private mainMenu: HTMLElement;
  private pauseMenu: HTMLElement;
  private gameOverMenu: HTMLElement;
  private levelCompleteMenu: HTMLElement;

  // Settings
  private showHUD = true;
  private showMiniMap = true;

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
    this.speedDisplay = this.createHUDText('Speed: 0 km/h', '20px', 'left: 20px; top: 20px;');
    this.hudContainer.appendChild(this.speedDisplay);

    // Score display
    this.scoreDisplay = this.createHUDText('Score: 0', '24px', 'right: 20px; top: 20px;');
    this.hudContainer.appendChild(this.scoreDisplay);

    // Distance display
    this.distanceDisplay = this.createHUDText('Distance: 0m', '18px', 'left: 20px; top: 60px;');
    this.hudContainer.appendChild(this.distanceDisplay);

    // Time display
    this.timeDisplay = this.createHUDText('Time: 0.0s', '18px', 'left: 20px; top: 90px;');
    this.hudContainer.appendChild(this.timeDisplay);

    // Level display
    this.levelDisplay = this.createHUDText('Level 1', '20px', 'left: 50%; top: 20px; transform: translateX(-50%);');
    this.hudContainer.appendChild(this.levelDisplay);

    // Mini map
    this.miniMap = document.createElement('div');
    this.miniMap.style.cssText = `
      position: absolute;
      right: 20px;
      bottom: 20px;
      width: 150px;
      height: 150px;
      background: rgba(0, 0, 0, 0.7);
      border: 2px solid white;
      border-radius: 10px;
      pointer-events: auto;
    `;
    this.hudContainer.appendChild(this.miniMap);

    this.container.appendChild(this.hudContainer);
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
    `;
    return element;
  }

  private createMenus() {
    // Main menu
    this.mainMenu = this.createMenu('main-menu', 'Need for Speed Racing', [
      { text: 'Start Game', action: () => this.gameStateManager.startGame() },
      { text: 'Settings', action: () => this.showSettings() },
      { text: 'Exit', action: () => window.close() }
    ]);

    // Pause menu
    this.pauseMenu = this.createMenu('pause-menu', 'Game Paused', [
      { text: 'Resume', action: () => this.gameStateManager.resumeGame() },
      { text: 'Restart Level', action: () => this.gameStateManager.restartLevel() },
      { text: 'Main Menu', action: () => this.gameStateManager.resetGame() }
    ]);

    // Game over menu
    this.gameOverMenu = this.createMenu('game-over-menu', 'Game Over', [
      { text: 'Try Again', action: () => this.gameStateManager.restartLevel() },
      { text: 'Main Menu', action: () => this.gameStateManager.resetGame() }
    ]);

    // Level complete menu
    this.levelCompleteMenu = this.createMenu('level-complete-menu', 'Level Complete!', [
      { text: 'Next Level', action: () => {
        if (this.gameStateManager.nextLevel()) {
          this.gameStateManager.startGame();
        } else {
          this.showMessage('Congratulations! You completed all levels!');
          setTimeout(() => this.gameStateManager.resetGame(), 3000);
        }
      }},
      { text: 'Restart Level', action: () => this.gameStateManager.restartLevel() },
      { text: 'Main Menu', action: () => this.gameStateManager.resetGame() }
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
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid white;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      min-width: 300px;
      display: none;
      z-index: 200;
    `;

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      color: white;
      margin-bottom: 20px;
      font-size: 28px;
    `;
    menu.appendChild(titleElement);

    buttons.forEach(buttonConfig => {
      const button = document.createElement('button');
      button.textContent = buttonConfig.text;
      button.style.cssText = `
        display: block;
        width: 100%;
        margin: 10px 0;
        padding: 12px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        transition: background 0.3s;
      `;
      button.onmouseover = () => button.style.background = '#0056b3';
      button.onmouseout = () => button.style.background = '#007bff';
      button.onclick = buttonConfig.action;
      menu.appendChild(button);
    });

    return menu;
  }

  private setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'Escape':
          if (this.gameStateManager.getState() === GameState.PLAYING) {
            this.gameStateManager.pauseGame();
          } else if (this.gameStateManager.getState() === GameState.PAUSED) {
            this.gameStateManager.resumeGame();
          }
          break;
        case 'h':
          this.toggleHUD();
          break;
        case 'm':
          this.toggleMiniMap();
          break;
      }
    });
  }

  // Update methods
  update(deltaTime: number) {
    const stats = this.gameStateManager.getStats();
    const state = this.gameStateManager.getState();

    this.updateHUD(stats);
    this.updateVisibility();
  }

  private updateHUD(stats: GameStats) {
    if (!this.showHUD) return;

    this.speedDisplay.textContent = `Speed: ${Math.abs(stats.speed * 3.6).toFixed(0)} km/h`;
    this.scoreDisplay.textContent = `Score: ${Math.floor(stats.score)}`;
    this.distanceDisplay.textContent = `Distance: ${Math.floor(stats.distance)}m`;
    this.timeDisplay.textContent = `Time: ${stats.time.toFixed(1)}s`;
    this.levelDisplay.textContent = `Level ${stats.level}`;

    // Update mini map (simplified representation)
    this.updateMiniMap(stats);
  }

  private updateMiniMap(stats: GameStats) {
    if (!this.showMiniMap) return;

    // Simple mini map showing player position and lane
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;

    ctx.canvas.width = 150;
    ctx.canvas.height = 150;
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, 150, 150);

    // Draw lanes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      const y = i * 50;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(150, y);
      ctx.stroke();
    }

    // Draw player car
    const playerY = (stats.lane + 1) * 50 - 25;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, playerY - 5, 20, 10);

    // Update mini map display
    this.miniMap.innerHTML = '';
    this.miniMap.appendChild(ctx.canvas);
  }

  private updateVisibility() {
    const state = this.gameStateManager.getState();

    // Hide all menus first
    this.mainMenu.style.display = 'none';
    this.pauseMenu.style.display = 'none';
    this.gameOverMenu.style.display = 'none';
    this.levelCompleteMenu.style.display = 'none';

    // Show HUD based on state and settings
    this.hudContainer.style.display = (this.showHUD && state === GameState.PLAYING) ? 'block' : 'none';

    // Show appropriate menu
    switch (state) {
      case GameState.MENU:
        this.mainMenu.style.display = 'block';
        break;
      case GameState.PAUSED:
        this.pauseMenu.style.display = 'block';
        break;
      case GameState.GAME_OVER:
        this.gameOverMenu.style.display = 'block';
        break;
      case GameState.LEVEL_COMPLETE:
        this.levelCompleteMenu.style.display = 'block';
        break;
    }
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
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      z-index: 300;
      pointer-events: none;
    `;

    this.container.appendChild(messageElement);

    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, duration);
  }

  private showSettings() {
    // Simple settings menu (can be expanded)
    const settingsMenu = this.createMenu('settings-menu', 'Settings', [
      { text: 'Toggle HUD (H)', action: () => this.toggleHUD() },
      { text: 'Toggle Mini Map (M)', action: () => this.toggleMiniMap() },
      { text: 'Back', action: () => {
        const settingsElement = document.getElementById('settings-menu');
        if (settingsElement) settingsElement.style.display = 'none';
      }}
    ]);

    settingsMenu.id = 'settings-menu';
    this.container.appendChild(settingsMenu);
    settingsMenu.style.display = 'block';
  }

  // Achievement notifications
  showAchievement(achievement: string) {
    this.showMessage(`🏆 ${achievement}`, 5000);
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
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      max-width: 300px;
      z-index: 150;
    `;

    debugElement.innerHTML = `
      <strong>Debug Info:</strong><br>
      State: ${debugInfo.state}<br>
      Level: ${debugInfo.level}<br>
      Progress: ${debugInfo.levelProgress}<br>
      Time Left: ${debugInfo.timeRemaining}<br>
      Stats: ${JSON.stringify(debugInfo.stats, null, 2)}
    `;

    this.container.appendChild(debugElement);

    setTimeout(() => {
      if (debugElement.parentNode) {
        debugElement.parentNode.removeChild(debugElement);
      }
    }, 10000);
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

    console.info('[UISystem] UI system destroyed');
  }
}