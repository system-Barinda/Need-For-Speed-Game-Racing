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