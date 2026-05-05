// ================= GAME STATES =================
export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  LEVEL_COMPLETE: 'level_complete',
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

// ================= DIFFICULTY LEVELS =================
export const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert', // Added expert difficulty
} as const;

export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

// ================= GAME STATISTICS =================
export interface GameStats {
  score: number;
  distance: number;
  time: number;
  crashes: number;
  level: number;
  speed: number;
  lane: number;
  maxSpeed?: number; // Track max speed achieved
  powerups?: number; // Track powerups collected
}

// ================= LEVEL CONFIGURATION =================
export interface LevelConfig {
  id: number;
  name: string;
  difficulty: Difficulty;
  targetDistance: number;
  timeLimit?: number;
  trafficDensity: number;
  maxSpeed: number;
  description: string;
  reward?: number; // Level completion reward
  unlockScore?: number; // Minimum score to unlock next level
}

// ================= VEHICLE TYPES =================
export interface VehicleConfig {
  id: string;
  name: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  color: number;
  price?: number;
  unlocked?: boolean;
}

export const VehicleType = {
  STANDARD: 'standard',
  SPORTS: 'sports',
  RACING: 'racing',
  TRUCK: 'truck',
} as const;

export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

// ================= POWERUP TYPES =================
export const PowerUpType = {
  SPEED_BOOST: 'speed_boost',
  SHIELD: 'shield',
  SLOW_TIME: 'slow_time',
  INVINCIBILITY: 'invincibility',
  SCORE_MULTIPLIER: 'score_multiplier',
} as const;

export type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

export interface PowerUp {
  type: PowerUpType;
  duration: number;
  value: number;
  position: THREE.Vector3;
  collected: boolean;
}

// ================= OBSTACLE TYPES =================
export const ObstacleType = {
  CAR: 'car',
  TRUCK: 'truck',
  BARREL: 'barrel',
  CONE: 'cone',
  ROADBLOCK: 'roadblock',
} as const;

export type ObstacleType = typeof ObstacleType[keyof typeof ObstacleType];

export interface Obstacle {
  type: ObstacleType;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  damage: number;
  points: number;
}

// ================= INPUT ACTIONS =================
export const InputAction = {
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  ACCELERATE: 'accelerate',
  BRAKE: 'brake',
  BOOST: 'boost',
  PAUSE: 'pause',
  RESET: 'reset',
  MENU: 'menu',
} as const;

export type InputAction = typeof InputAction[keyof typeof InputAction];

// ================= COLLISION DATA =================
export interface CollisionData {
  occurred: boolean;
  object: THREE.Object3D | null;
  damage: number;
  position: THREE.Vector3;
  timestamp: number;
}

// ================= RENDER SETTINGS =================
export interface RenderSettings {
  shadows: boolean;
  antialias: boolean;
  quality: 'low' | 'medium' | 'high';
  fogEnabled: boolean;
  drawDistance: number;
}

// ================= AUDIO SETTINGS =================
export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

// ================= GAME SETTINGS =================
export interface GameSettings {
  difficulty: Difficulty;
  renderSettings: RenderSettings;
  audioSettings: AudioSettings;
  controlSensitivity: number;
  cameraDistance: number;
  showFPS: boolean;
  language: string;
}

// ================= ACHIEVEMENT =================
export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirement: number;
  current: number;
  completed: boolean;
  reward: number;
}

// ================= SAVE DATA =================
export interface SaveData {
  version: string;
  timestamp: number;
  stats: GameStats;
  settings: GameSettings;
  unlockedVehicles: string[];
  achievements: Achievement[];
  highScores: HighScore[];
}

// ================= HIGH SCORE =================
export interface HighScore {
  score: number;
  level: number;
  difficulty: Difficulty;
  date: string;
  name: string;
}

// ================= EVENT TYPES =================
export const GameEvent = {
  GAME_START: 'game_start',
  GAME_PAUSE: 'game_pause',
  GAME_RESUME: 'game_resume',
  GAME_OVER: 'game_over',
  LEVEL_START: 'level_start',
  LEVEL_COMPLETE: 'level_complete',
  SCORE_CHANGED: 'score_changed',
  CRASH: 'crash',
  POWERUP_COLLECTED: 'powerup_collected',
  LANE_CHANGED: 'lane_changed',
  SPEED_CHANGED: 'speed_changed',
} as const;

export type GameEvent = typeof GameEvent[keyof typeof GameEvent];

// ================= EVENT LISTENER =================
export type EventListener = (data?: any) => void;

// ================= HELPER FUNCTIONS =================
export const isGamePlaying = (state: GameState): boolean => {
  return state === GameState.PLAYING;
};

export const isGameOver = (state: GameState): boolean => {
  return state === GameState.GAME_OVER || state === GameState.LEVEL_COMPLETE;
};

export const getDifficultyMultiplier = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case Difficulty.EASY: return 0.8;
    case Difficulty.MEDIUM: return 1.0;
    case Difficulty.HARD: return 1.5;
    case Difficulty.EXPERT: return 2.0;
    default: return 1.0;
  }
};

export const getDifficultyColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case Difficulty.EASY: return '#44aa44';
    case Difficulty.MEDIUM: return '#ffaa44';
    case Difficulty.HARD: return '#ff4444';
    case Difficulty.EXPERT: return '#ff44ff';
    default: return '#ffffff';
  }
};

// ================= DEFAULT CONFIGURATIONS =================
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  difficulty: Difficulty.MEDIUM,
  renderSettings: {
    shadows: true,
    antialias: true,
    quality: 'high',
    fogEnabled: true,
    drawDistance: 500,
  },
  audioSettings: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.7,
    ambientVolume: 0.5,
    muted: false,
  },
  controlSensitivity: 1.0,
  cameraDistance: 8,
  showFPS: false,
  language: 'en',
};

export const DEFAULT_STATS: GameStats = {
  score: 0,
  distance: 0,
  time: 0,
  crashes: 0,
  level: 1,
  speed: 0,
  lane: 1,
  maxSpeed: 0,
  powerups: 0,
};