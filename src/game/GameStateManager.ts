import * as THREE from 'three';
import { PhysicsSystem } from './PhysicsSystem';
import { TrafficSystem } from './TrafficSystem';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  LEVEL_COMPLETE = 'level_complete'
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface GameStats {
  score: number;
  distance: number;
  time: number;
  crashes: number;
  level: number;
  speed: number;
  lane: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  difficulty: Difficulty;
  targetDistance: number;
  timeLimit?: number;
  trafficDensity: number;
  maxSpeed: number;
  description: string;
}

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
  private totalPauseTime = 0;

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

    return false; // No more levels
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
    if (this.currentState !== GameState.PLAYING) return;

    // Update game time
    this.stats.time += deltaTime;

    // Update stats from systems
    if (this.physicsSystem) {
      this.stats.speed = this.physicsSystem.getSpeed();
      this.stats.lane = this.physicsSystem.getCurrentLane();

      // Track distance (simplified)
      this.stats.distance += Math.abs(this.stats.speed) * deltaTime;

      // Check for crashes
      if (this.physicsSystem.isCrashed()) {
        this.stats.crashes++;
      }
    }

    // Update score
    this.updateScore(deltaTime);

    // Check win/lose conditions
    this.checkGameConditions();
  }

  private updateScore(deltaTime: number) {
    // Base score from distance
    this.stats.score += Math.abs(this.stats.speed) * deltaTime * 10;

    // Bonus for speed
    if (this.stats.speed > 15) {
      this.stats.score += deltaTime * 20;
    }

    // Penalty for crashes
    if (this.physicsSystem?.isCrashed()) {
      this.stats.score = Math.max(0, this.stats.score - 100);
    }
  }

  private checkGameConditions() {
    // Check distance goal
    if (this.stats.distance >= this.currentLevel.targetDistance) {
      this.setState(GameState.LEVEL_COMPLETE);
      return;
    }

    // Check time limit
    if (this.currentLevel.timeLimit && this.stats.time >= this.currentLevel.timeLimit) {
      this.setState(GameState.GAME_OVER);
      return;
    }

    // Check excessive crashes
    if (this.stats.crashes >= 5) {
      this.setState(GameState.GAME_OVER);
      return;
    }
  }

  // Event handlers
  private onGameStart() {
    this.gameStartTime = performance.now();
    this.levelStartTime = performance.now();
    this.totalPauseTime = 0;

    // Apply level settings
    if (this.physicsSystem) {
      this.physicsSystem.setMaxSpeed(this.currentLevel.maxSpeed);
    }

    if (this.trafficSystem) {
      this.trafficSystem.setTrafficDensity(this.currentLevel.trafficDensity);
    }

    console.info(`[GameStateManager] Game started - Level ${this.currentLevel.id}: ${this.currentLevel.name}`);
  }

  private onGamePause() {
    this.pauseStartTime = performance.now();

    if (this.trafficSystem) {
      this.trafficSystem.pauseTraffic();
    }
  }

  private onGameResume() {
    if (this.pauseStartTime > 0) {
      this.totalPauseTime += performance.now() - this.pauseStartTime;
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
    console.info(`[GameStateManager] Level Complete! Score: ${Math.floor(this.stats.score)}`);

    if (this.trafficSystem) {
      this.trafficSystem.pauseTraffic();
    }
  }

  // Game control methods
  startGame() {
    this.resetGameStats();
    this.setState(GameState.PLAYING);
  }

  pauseGame() {
    if (this.currentState === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    }
  }

  resumeGame() {
    if (this.currentState === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
      this.onGameResume();
    }
  }

  restartLevel() {
    this.resetLevelStats();
    this.setState(GameState.PLAYING);
  }

  resetGame() {
    this.resetGameStats();
    this.setLevel(1);
    this.setState(GameState.MENU);
  }

  // Statistics management
  private resetLevelStats() {
    this.stats.distance = 0;
    this.stats.time = 0;
    this.stats.crashes = 0;
    this.levelStartTime = performance.now();

    if (this.physicsSystem) {
      this.physicsSystem.reset();
    }
  }

  private resetGameStats() {
    this.stats = {
      score: 0,
      distance: 0,
      time: 0,
      crashes: 0,
      level: this.currentLevel.id,
      speed: 0,
      lane: 1
    };

    if (this.physicsSystem) {
      this.physicsSystem.reset();
    }

    if (this.trafficSystem) {
      this.trafficSystem.clearTraffic();
    }
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  // Save/Load functionality (for future expansion)
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
      return true;
    } catch (error) {
      console.error('[GameStateManager] Failed to load game:', error);
      return false;
    }
  }

  // Achievement system (basic)
  checkAchievements(): string[] {
    const achievements: string[] = [];

    if (this.stats.distance > 5000) {
      achievements.push('Long Distance Driver');
    }

    if (this.stats.crashes === 0 && this.stats.distance > 1000) {
      achievements.push('Perfect Driver');
    }

    if (this.stats.speed > 25) {
      achievements.push('Speed Demon');
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
      levelProgress: (this.stats.distance / this.currentLevel.targetDistance * 100).toFixed(1) + '%',
      timeRemaining: this.currentLevel.timeLimit ?
        Math.max(0, this.currentLevel.timeLimit - this.stats.time).toFixed(1) + 's' : '∞'
    };
  }
}