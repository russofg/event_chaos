
export enum GameState {
  MENU = 'MENU',
  SHOP = 'SHOP',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum SystemType {
  SOUND = 'SOUND',
  LIGHTS = 'LIGHTS',
  VIDEO = 'VIDEO',
  STAGE = 'STAGE'
}

export interface GameStats {
  publicInterest: number; // 0-100
  clientSatisfaction: number; // 0-100
  stress: number; // 0-100
  budget: number; // $$$
  timeRemaining: number; // Seconds
}

export interface SystemState {
  id: SystemType;
  name: string;
  health: number; // 0-100
  status: 'OK' | 'WARNING' | 'CRITICAL';
  faderValue: number; // 0-100 position
  stability: number; // 0-100 (How shaky it is)
  driftSpeed: number; // How fast it moves away from center
}

export interface GameEventOption {
  label: string;
  isCorrect: boolean;
  stressImpact: number;
  cost?: number; // Cost in $
  requiresMinigame?: 'CABLES' | 'FREQUENCY';
}

export interface GameEvent {
  id: string;
  systemId: SystemType;
  title: string;
  description: string;
  severity: 1 | 2 | 3;
  expiresAt: number; // Timestamp
  correctAction: string;
  options: GameEventOption[];
  // Fase 2: Prioridades y cascada
  priority?: number; // 1-10, higher = more urgent
  canEscalate?: boolean; // Can this event trigger cascading events?
  escalationTime?: number; // Time before escalation (ms)
  escalatedFrom?: string; // ID of event that caused this
  relatedEvents?: string[]; // IDs of related events
}

export interface EventDefinition {
  title: string;
  description: string;
  options: GameEventOption[];
  allowedScenarios?: string[];
  // Fase 2: Prioridades y cascada
  priority?: number; // Default priority (1-10)
  canEscalate?: boolean; // Can escalate to worse event
  escalationEvent?: string; // Title of event to escalate to
  escalationTime?: number; // Time before escalation (seconds)
  relatedTo?: string[]; // Titles of related events
}

export interface GameScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'TUTORIAL' | 'NORMAL' | 'HARD' | 'EXTREME';
  contextPrompt: string;
  initialBudget: number;
  isTutorial?: boolean;
  unlockRequirements?: {
    minCompletedScenarios?: number;
    minHardScenarios?: number;
    minReputation?: number;
    requiredScenarioIds?: string[];
  };
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  description: string;
  bonus: 'LESS_DRIFT' | 'MORE_BUDGET' | 'AUTO_REPAIR_SLOW' | 'SLOW_STRESS';
  avatarColor: string;
}

export interface CareerData {
    totalCash: number;
    completedScenarios: string[];
    highScores: Record<string, number>;
    // Fase 3: Logros y mejoras
    unlockedAchievements: string[];
    unlockedUpgrades: string[];
    careerPoints: number; // Puntos para desbloquear mejoras
    reputation: number; // Progreso de carrera para desbloqueos avanzados
}

export interface TutorialStep {
  id: number;
  title: string;
  text: string;
  highlight?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  effect: 'STABILITY' | 'AUTO_HEAL' | 'STRESS_RESIST' | 'BUDGET_MULTIPLIER';
  value: number;
}

// --- NEW MISSION TYPES ---
export interface MissionCriteria {
    systemId: SystemType;
    min?: number;
    max?: number;
}

export interface MissionDefinition {
    id: string;
    title: string;
    description: string;
    criteria: MissionCriteria[];
    holdDuration: number; // Seconds needed to hold
    timeout: number; // Seconds to complete
    rewardCash: number;
    allowedScenarios?: string[];
}

export interface ActiveMission extends MissionDefinition {
    startTime: number;
    expiresAt: number;
    progress: number; // Seconds held so far
    isCompleted: boolean;
}

// Fase 2: Narrativa emergente
export interface NarrativeEvent {
    id: string;
    type: 'STORY' | 'CHARACTER' | 'CONTEXT';
    title: string;
    message: string;
    character?: string;
    triggerCondition: (stats: GameStats, systems: Record<SystemType, SystemState>, scenario?: GameScenario) => boolean;
    cooldown?: number; // Minimum time between same event (ms)
}

// Fase 2: Advertencias tempranas
export interface EarlyWarning {
    id: string;
    systemId: SystemType;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timeUntilEvent: number; // Seconds until event triggers
    canPrevent: boolean; // Can player prevent this event?
    preventionAction?: string; // What action prevents it
}

export interface ComboState {
  streakSeconds: number; // Seconds in safe zone
  multiplier: number; // Current combo multiplier (1.0 = no combo)
  lastBonusTime: number; // Last time a bonus was awarded
  perfectRhythm: boolean; // All systems in sync
}

export const SYSTEM_COLORS = {
  [SystemType.SOUND]: 'text-amber-400 border-amber-400 bg-amber-400/10',
  [SystemType.LIGHTS]: 'text-purple-400 border-purple-400 bg-purple-400/10',
  [SystemType.VIDEO]: 'text-cyan-400 border-cyan-400 bg-cyan-400/10',
  [SystemType.STAGE]: 'text-rose-400 border-rose-400 bg-rose-400/10',
};

// Fase 3: Sistema de Logros
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'PERFORMANCE' | 'ECONOMY' | 'SPEED' | 'PERFECTION' | 'SPECIAL';
  checkCondition: (stats: GameStats, systems: Record<SystemType, SystemState>, events: GameEvent[], sessionData: SessionData) => boolean;
  rewardPoints: number;
}

export interface SessionData {
  eventsResolved: number;
  eventsFailed: number;
  totalSpent: number;
  minSystemHealth: number;
  maxStress: number;
  timePlayed: number;
  perfectStreak: number;
}

// Fase 3: Sistema de Mejoras Permanentes
export interface PermanentUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number; // Career points
  category: 'REFLEXES' | 'KNOWLEDGE' | 'RESISTANCE' | 'EFFICIENCY' | 'SPECIAL';
  effect: (stats: GameStats, systems: Record<SystemType, SystemState>) => void;
  requires?: string[];
  unlocked: boolean;
}

// Fase 3: Modos de Juego
export enum GameMode {
  NORMAL = 'NORMAL',
  ENDLESS = 'ENDLESS',
  SPEEDRUN = 'SPEEDRUN',
  HARDCORE = 'HARDCORE'
}
