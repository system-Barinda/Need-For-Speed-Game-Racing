import { GameState, Difficulty } from './types';
import type { GameStats, LevelConfig } from './types';
import { PhysicsSystem } from './PhysicsSystem';
import { TrafficSystem } from './TrafficSystem';

export class GameStateManager {
  private currentState: GameState = GameState.MENU;
  private difficulty: Difficulty = Difficulty.MEDIUM;
  private currentLevel: LevelConfig;

  // Game statistics
  private stats: GameStats = {
    score: 0,
    distance: 0,
    time: 0,
    crashes: 0,
    level: 1,
    speed: 0,
    lane: 1
  };

  // Systems references
  private physicsSystem: PhysicsSystem | null = null;
  private trafficSystem: TrafficSystem | null = null;

  // Game timing
  private gameStartTime = 0;
  private levelStartTime = 0;
  private pauseStartTime = 0;
  private isGameStarting = false;

  // Level configurations
  private levels: LevelConfig[] = [
    {
      id: 1,
      name: 'Beginner Circuit',
      difficulty: Difficulty.EASY,
      targetDistance: 1000,
      trafficDensity: 0.5,
      maxSpeed: 20,
      description: 'Learn the basics of racing'
    },
    {
      id: 2,
      name: 'City Streets',
      difficulty: Difficulty.MEDIUM,
      targetDistance: 2000,
      trafficDensity: 0.7,
      maxSpeed: 25,
      description: 'Navigate busy city traffic'
    },
    {
      id: 3,
      name: 'Highway Challenge',
      difficulty: Difficulty.HARD,
      targetDistance: 3000,
      timeLimit: 180,
      trafficDensity: 1.0,
      maxSpeed: 30,
      description: 'Race against time on the highway'
    },
    {
      id: 4,
      name: 'Mountain Pass',
      difficulty: Difficulty.HARD,
      targetDistance: 4000,
      timeLimit: 240,
      trafficDensity: 0.8,
      maxSpeed: 28,
      description: 'Navigate treacherous mountain roads'
    }
  ];

  constructor() {
    this.currentLevel = this.levels[0];
    console.info('[GameStateManager] Initialized game state management');
  }

  // State management
  setState(newState: GameState) {
    const oldState = this.currentState;
    
    // Prevent unnecessary state changes
    if (oldState === newState && newState !== GameState.MENU) {
      return;
    }
    
    this.currentState = newState;
    console.info(`[GameStateManager] State changed: ${oldState} -> ${newState}`);

    switch (newState) {
      case GameState.PLAYING:
        this.onGameStart();
        break;
      case GameState.PAUSED:
        this.onGamePause();
        break;
      case GameState.GAME_OVER:
        this.onGameOver();
        break;
      case GameState.LEVEL_COMPLETE:
        this.onLevelComplete();
        break;
      case GameState.MENU:
        this.onMenuEnter();
        break;
    }
  }

  getState(): GameState {
    return this.currentState;
  }

  // Level management
  setLevel(levelId: number) {
    const level = this.levels.find(l => l.id === levelId);
    if (level) {
      this.currentLevel = level;
      this.stats.level = levelId;
      console.info(`[GameStateManager] Level set to: ${level.name}`);
    }
  }

  getCurrentLevel(): LevelConfig {
    return this.currentLevel;
  }

  nextLevel(): boolean {
    const nextLevelId = this.currentLevel.id + 1;
    const nextLevel = this.levels.find(l => l.id === nextLevelId);

    if (nextLevel) {
      this.setLevel(nextLevelId);
      this.resetLevelStats();
      return true;
    }

    return false;
  }

  // Difficulty management
  setDifficulty(difficulty: Difficulty) {
    this.difficulty = difficulty;
    console.info(`[GameStateManager] Difficulty set to: ${difficulty}`);
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  // System integration
  setPhysicsSystem(physics: PhysicsSystem) {
    this.physicsSystem = physics;
  }

  setTrafficSystem(traffic: TrafficSystem) {
    this.trafficSystem = traffic;
  }

  // Update loop
  update(deltaTime: number) {
    // Only update game logic when playing
    if (this.currentState !== GameState.PLAYING) return;
    
    // Skip update if game is just starting (prevent weird frame)
    if (this.isGameStarting) {
      this.isGameStarting = false;
      return;
    }

    // Update game time
    this.stats.time += deltaTime;

    // Update stats from systems
    if (this.physicsSystem) {
      this.stats.speed = this.physicsSystem.getSpeed();
      this.stats.lane = this.physicsSystem.getCurrentLane();

      // Track distance
      this.stats.distance += Math.abs(this.stats.speed) * deltaTime;

      // Check for crashes (count each crash only once)
      if (this.physicsSystem.isCrashed() && !this.wasCrashed) {
        this.stats.crashes++;
        this.wasCrashed = true;
        console.log(`[GameStateManager] Crash detected! Total crashes: ${this.stats.crashes}`);
      } else if (!this.physicsSystem.isCrashed()) {
        this.wasCrashed = false;
      }
    }

    // Update score
    this.updateScore(deltaTime);

    // Check win/lose conditions
    this.checkGameConditions();
  }

  private wasCrashed = false;

  private updateScore(deltaTime: number) {
    // Base score from distance
    this.stats.score += Math.abs(this.stats.speed) * deltaTime * 10;

    // Bonus for high speed
    if (this.stats.speed > 15) {
      this.stats.score += deltaTime * 20;
    }

    // Bonus for perfect driving (no crashes)
    if (this.stats.crashes === 0 && this.stats.distance > 500) {
      this.stats.score += deltaTime * 5;
    }

    // Penalty for crashes
    if (this.physicsSystem?.isCrashed()) {
      this.stats.score = Math.max(0, this.stats.score - deltaTime * 50);
    }
  }

  private checkGameConditions() {
    // Check distance goal
    if (this.stats.distance >= this.currentLevel.targetDistance) {
      console.log('[GameStateManager] Level complete! Distance goal reached');
      this.setState(GameState.LEVEL_COMPLETE);
      return;
    }

    // Check time limit
    if (this.currentLevel.timeLimit && this.stats.time >= this.currentLevel.timeLimit) {
      console.log('[GameStateManager] Game over! Time limit exceeded');
      this.setState(GameState.GAME_OVER);
      return;
    }

    // Check excessive crashes
    if (this.stats.crashes >= 5) {
      console.log('[GameStateManager] Game over! Too many crashes');
      this.setState(GameState.GAME_OVER);
      return;
    }
  }

  // Event handlers
  private onGameStart() {
    console.log('[GameStateManager] onGameStart called');
    this.gameStartTime = performance.now();
    this.levelStartTime = performance.now();
    this.isGameStarting = true;

    // Apply level settings to physics
    if (this.physicsSystem) {
      this.physicsSystem.setMaxSpeed(this.currentLevel.maxSpeed);
      console.log(`[GameStateManager] Max speed set to: ${this.currentLevel.maxSpeed}`);
    }

    // Apply traffic density
    if (this.trafficSystem) {
      this.trafficSystem.setTrafficDensity(this.currentLevel.trafficDensity);
      this.trafficSystem.resumeTraffic();
      console.log(`[GameStateManager] Traffic density set to: ${this.currentLevel.trafficDensity}`);
    }

    console.info(`[GameStateManager] Game started - Level ${this.currentLevel.id}: ${this.currentLevel.name}`);
  }

  private onGamePause() {
    console.log('[GameStateManager] Game paused');
    this.pauseStartTime = performance.now();

    if (this.trafficSystem) {
      this.trafficSystem.pauseTraffic();
    }
  }

  private onGameResume() {
    console.log('[GameStateManager] Game resumed');
    if (this.pauseStartTime > 0) {
      // Add pause duration to start times to keep timers accurate
      const pauseDuration = performance.now() - this.pauseStartTime;
      this.gameStartTime += pauseDuration;
      this.levelStartTime += pauseDuration;
      this.pauseStartTime = 0;
    }

    if (this.trafficSystem) {
      this.trafficSystem.resumeTraffic();
    }
  }

  private onGameOver() {
    console.info(`[GameStateManager] Game Over - Final Score: ${Math.floor(this.stats.score)}`);

    if (this.trafficSystem) {
      this.trafficSystem.pauseTraffic();
    }
  }

  private onLevelComplete() {
    // Bonus score for completing level
    const timeBonus = Math.max(0, (this.currentLevel.timeLimit || 300) - this.stats.time) * 10;
    const crashPenalty = this.stats.crashes * 200;
    const levelBonus = 1000;
    
    this.stats.score += levelBonus + timeBonus - crashPenalty;
    this.stats.score = Math.max(0, this.stats.score);
    
    console.info(`[GameStateManager] Level Complete! Score: ${Math.floor(this.stats.score)}`);
    console.info(`  Level Bonus: ${levelBonus}, Time Bonus: ${Math.floor(timeBonus)}, Crash Penalty: ${Math.floor(crashPenalty)}`);

    if (this.trafficSystem) {
      this.trafficSystem.pauseTraffic();
    }
  }

  private onMenuEnter() {
    console.log('[GameStateManager] Entered menu state');
    // Reset any pending flags
    this.isGameStarting = false;
  }

  // Game control methods
  startGame() {
    console.log('[GameStateManager] startGame called - Resetting and starting game');
    this.resetGameStats();
    // Small delay to ensure systems are ready
    setTimeout(() => {
      this.setState(GameState.PLAYING);
    }, 50);
  }

  pauseGame() {
    if (this.currentState === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  resumeGame() {
    if (this.currentState === GameState.PAUSED) {
      this.onGameResume();
      this.setState(GameState.PLAYING);
    }
  }

  restartLevel() {
    console.log('[GameStateManager] restartLevel called');
    this.resetLevelStats();
    this.setState(GameState.PLAYING);
  }

  resetGame() {
    console.log('[GameStateManager] resetGame called - Returning to menu');
    this.resetGameStats();
    this.setLevel(1);
    this.setState(GameState.MENU);
  }

  // Statistics management
  private resetLevelStats() {
    console.log('[GameStateManager] Resetting level stats');
    this.stats.distance = 0;
    this.stats.time = 0;
    this.stats.crashes = 0;
    this.stats.score = 0;
    this.wasCrashed = false;
    this.levelStartTime = performance.now();
    this.isGameStarting = true;

    if (this.physicsSystem) {
      this.physicsSystem.reset();
    }
  }

  private resetGameStats() {
    console.log('[GameStateManager] Resetting all game stats');
    this.stats = {
      score: 0,
      distance: 0,
      time: 0,
      crashes: 0,
      level: this.currentLevel.id,
      speed: 0,
      lane: 1
    };
    this.wasCrashed = false;
    this.isGameStarting = false;

    if (this.physicsSystem) {
      this.physicsSystem.reset();
    }

    if (this.trafficSystem) {
      this.trafficSystem.clearTraffic();
      this.trafficSystem.resumeTraffic(); // Reset traffic state
    }
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getLevelProgress(): number {
    return (this.stats.distance / this.currentLevel.targetDistance) * 100;
  }

  getTimeRemaining(): number {
    if (!this.currentLevel.timeLimit) return -1;
    return Math.max(0, this.currentLevel.timeLimit - this.stats.time);
  }

  // Save/Load functionality
  saveGame(): string {
    const saveData = {
      stats: this.stats,
      level: this.currentLevel.id,
      difficulty: this.difficulty,
      state: this.currentState
    };
    return JSON.stringify(saveData);
  }

  loadGame(saveData: string): boolean {
    try {
      const data = JSON.parse(saveData);
      this.stats = data.stats;
      this.setLevel(data.level);
      this.difficulty = data.difficulty;
      this.currentState = data.state;
      console.log('[GameStateManager] Game loaded successfully');
      return true;
    } catch (error) {
      console.error('[GameStateManager] Failed to load game:', error);
      return false;
    }
  }

  // Achievement system
  checkAchievements(): string[] {
    const achievements: string[] = [];

    if (this.stats.distance >= 5000) {
      achievements.push('🏆 Long Distance Driver');
    }

    if (this.stats.crashes === 0 && this.stats.distance >= 1000) {
      achievements.push('🌟 Perfect Driver');
    }

    if (this.stats.speed >= 25) {
      achievements.push('⚡ Speed Demon');
    }

    if (this.stats.score >= 10000) {
      achievements.push('💰 High Roller');
    }

    if (this.currentLevel.id >= 4 && this.stats.crashes < 3) {
      achievements.push('👑 Master Racer');
    }

    return achievements;
  }

  // Debug and monitoring
  getDebugInfo() {
    return {
      state: this.currentState,
      level: this.currentLevel.name,
      difficulty: this.difficulty,
      stats: this.stats,
      levelProgress: this.getLevelProgress().toFixed(1) + '%',
      timeRemaining: this.getTimeRemaining() === -1 ? '∞' : this.getTimeRemaining().toFixed(1) + 's',
      gameTime: this.gameStartTime ? `${((performance.now() - this.gameStartTime) / 1000).toFixed(1)}s` : 'not started'
    };
  }
}