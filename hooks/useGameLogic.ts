
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GameStats, SystemState, SystemType, GameEvent, GameScenario, GameEventOption, CareerData, ShopItem, ActiveMission, GameMode, EventDefinition, MissionDefinition } from '../types';
import { GAME_DURATION, INITIAL_STATS, WIN_CONDITIONS, SYSTEM_EVENTS, SCENARIOS, CREW_MEMBERS, SHOP_ITEMS, CLIENT_MISSIONS, PERMANENT_UPGRADES } from '../constants';
import { useAIEventGenerator } from './useAIEventGenerator';
import { resolvePlayableScenario } from '../utils/scenarioUnlocks';

interface WinConditions {
  publicInterest: number;
  clientSatisfaction: number;
  stressLimit: number;
  minBudget: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface EventResolutionTelemetry {
  success: boolean;
  cost: number;
  systemId: SystemType;
  severity: 1 | 2 | 3;
  eventTitle: string;
  eventId: string;
}

export const shouldTriggerImmediateGameOver = (
  scenario: GameScenario,
  mode: GameMode,
  stats: Pick<GameStats, 'publicInterest' | 'clientSatisfaction' | 'stress' | 'budget'>,
  systems: SystemState[],
  winConditions: WinConditions
) => {
  if (scenario.isTutorial) return false;
  if (mode === GameMode.HARDCORE && systems.some(system => system.health <= 0)) return true;

  return (
    stats.publicInterest <= 0 ||
    stats.clientSatisfaction <= 0 ||
    stats.stress >= 100 ||
    stats.budget < winConditions.minBudget
  );
};

export const applyTutorialSafetyNet = (
  scenario: GameScenario,
  stats: Pick<GameStats, 'stress' | 'budget'>
) => {
  return {
    stress: scenario.isTutorial && stats.stress > 80 ? 50 : stats.stress,
    budget: scenario.isTutorial && stats.budget < 0 ? 1000 : stats.budget
  };
};

export const getTimerEndOutcome = (
  mode: GameMode,
  timeRemaining: number,
  stats: Pick<GameStats, 'publicInterest' | 'clientSatisfaction' | 'stress'>,
  winConditions: WinConditions
): 'VICTORY' | 'GAME_OVER' | null => {
  if (mode === GameMode.ENDLESS || timeRemaining > 0) return null;

  const passed =
    stats.publicInterest >= winConditions.publicInterest &&
    stats.clientSatisfaction >= winConditions.clientSatisfaction &&
    stats.stress < winConditions.stressLimit;

  return passed ? 'VICTORY' : 'GAME_OVER';
};

export const getCrewDriftMultiplier = (crewBonus: string | null) => {
  return crewBonus === 'LESS_DRIFT' ? 0.85 : 1.0;
};

export const getCrewStressMultiplier = (crewBonus: string | null) => {
  return crewBonus === 'SLOW_STRESS' ? 0.8 : 1.0;
};

export const getCrewAutoHealPer5Seconds = (crewBonus: string | null) => {
  return crewBonus === 'AUTO_REPAIR_SLOW' ? 0.5 : 0;
};

const DEFAULT_CAREER: CareerData = {
    totalCash: 0,
    completedScenarios: [],
    highScores: {},
    unlockedAchievements: [],
    unlockedUpgrades: [],
    careerPoints: 0,
    reputation: 0
};

const CAREER_STORAGE_KEY = 'event_chaos_career';
const KNOWN_SCENARIO_IDS = new Set(SCENARIOS.map((scenario) => scenario.id));
const KNOWN_UPGRADE_IDS = new Set(PERMANENT_UPGRADES.map((upgrade) => upgrade.id));

const getNonNegativeNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

const normalizeStringArray = (value: unknown, allowedIds?: Set<string>): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized = new Set<string>();

  value.forEach(entry => {
    if (typeof entry !== 'string') return;
    if (allowedIds && !allowedIds.has(entry)) return;
    normalized.add(entry);
  });

  return [...normalized];
};

const normalizeHighScores = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const normalized: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([scenarioId, score]) => {
    if (!KNOWN_SCENARIO_IDS.has(scenarioId)) return;
    const parsedScore = Number(score);
    if (!Number.isFinite(parsedScore)) return;
    normalized[scenarioId] = Math.max(0, parsedScore);
  });

  return normalized;
};

export const normalizeCareerData = (raw: unknown): CareerData => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Partial<Record<keyof CareerData, unknown>>)
    : {};

  return {
    totalCash: getNonNegativeNumber(source.totalCash),
    completedScenarios: normalizeStringArray(source.completedScenarios, KNOWN_SCENARIO_IDS),
    highScores: normalizeHighScores(source.highScores),
    unlockedAchievements: normalizeStringArray(source.unlockedAchievements),
    unlockedUpgrades: normalizeStringArray(source.unlockedUpgrades, KNOWN_UPGRADE_IDS),
    careerPoints: getNonNegativeNumber(source.careerPoints),
    reputation: getNonNegativeNumber(source.reputation)
  };
};

const NEW_MISSION_IDS = new Set([
  'balanced_mix',
  'visual_impact',
  'stage_security',
  'full_throttle',
  'cooldown_window',
  'arena_transition',
  'pyro_guard',
  'broadcast_lock',
  'blackout_containment',
  'precision_drop',
  'arena_split_cue',
  'tour_broadcast_sync',
  'blackout_triage'
]);

const getModeDuration = (mode: GameMode) => {
  if (mode === GameMode.SPEEDRUN) return 90;
  if (mode === GameMode.ENDLESS) return 3600;
  return GAME_DURATION;
};

export type MatchPhase = 'OPENING' | 'MIDGAME' | 'FINALE';

interface PhaseDirectorProfile {
  spawnDelayMultiplier: number;
  missionRespawnMultiplier: number;
  severityDelta: number;
  concurrencyDelta: number;
  cascadeChance: number;
  cascadeCooldownMs: number;
}

type SessionEventOutcome = 'SUCCESS' | 'FAIL';

interface SessionDirectorTelemetry {
  resolvedEvents: number;
  failedEvents: number;
  expiredEvents: number;
  totalSpend: number;
  recentOutcomes: SessionEventOutcome[];
}

interface AdaptiveDirectorAdjustments {
  spawnDelayMultiplier: number;
  missionRespawnMultiplier: number;
  severityDelta: number;
  concurrencyDelta: number;
  cascadeChanceDelta: number;
}

interface SessionFatigueMetrics {
  progressRatio: number;
  pressureLevel: number;
  recentFailRate: number;
  fatigueLevel: number;
}

interface ProceduralInjectionProfile {
  aiChanceMultiplier: number;
  aiCooldownMultiplier: number;
  idleRetryDelayMs: number;
  maxInjectedEvents: number;
  severityBias: number;
  durationMultiplier: number;
}

interface BossMomentProfile {
  active: boolean;
  recovery: boolean;
  intensity: number;
  spawnDelayMultiplier: number;
  missionRespawnMultiplier: number;
  severityDelta: number;
  concurrencyDelta: number;
  cascadeChanceDelta: number;
  aiChanceMultiplier: number;
  aiCooldownMultiplier: number;
  durationMultiplier: number;
}

interface EconomyPhaseProfile {
  missionRewardMultiplier: number;
  eventRewardMultiplier: number;
  failurePenaltyMultiplier: number;
  expiryPenaltyMultiplier: number;
  comebackBonusMultiplier: number;
}

interface EconomyStreakState {
  eventSuccessStreak: number;
  eventFailStreak: number;
  missionSuccessStreak: number;
  missionFailStreak: number;
}

const DEFAULT_SESSION_DIRECTOR_TELEMETRY: SessionDirectorTelemetry = {
  resolvedEvents: 0,
  failedEvents: 0,
  expiredEvents: 0,
  totalSpend: 0,
  recentOutcomes: []
};

const DEFAULT_PHASE_DIRECTOR_PROFILE: PhaseDirectorProfile = {
  spawnDelayMultiplier: 1,
  missionRespawnMultiplier: 1,
  severityDelta: 0,
  concurrencyDelta: 0,
  cascadeChance: 0.2,
  cascadeCooldownMs: 12000
};

const DEFAULT_ECONOMY_PROFILE: EconomyPhaseProfile = {
  missionRewardMultiplier: 1,
  eventRewardMultiplier: 1,
  failurePenaltyMultiplier: 1,
  expiryPenaltyMultiplier: 1,
  comebackBonusMultiplier: 0
};

const DEFAULT_ECONOMY_STREAK: EconomyStreakState = {
  eventSuccessStreak: 0,
  eventFailStreak: 0,
  missionSuccessStreak: 0,
  missionFailStreak: 0
};

const pushRecentOutcome = (
  outcomes: SessionEventOutcome[],
  outcome: SessionEventOutcome,
  maxLength: number = 8
) => {
  const next = [...outcomes, outcome];
  if (next.length <= maxLength) return next;
  return next.slice(next.length - maxLength);
};

export const getMatchPhase = (
  mode: GameMode,
  timeRemaining: number,
  totalDuration: number,
  stressLevel: number
): MatchPhase => {
  if (mode === GameMode.ENDLESS) {
    if (stressLevel >= 75) return 'FINALE';
    if (stressLevel >= 45) return 'MIDGAME';
    return 'OPENING';
  }

  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 'MIDGAME';
  const clampedRemaining = clamp(timeRemaining, 0, totalDuration);
  const progress = 1 - (clampedRemaining / totalDuration);

  if (progress < 0.34) return 'OPENING';
  if (progress < 0.78) return 'MIDGAME';
  return 'FINALE';
};

export const getPhaseDirectorProfile = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  phase: MatchPhase,
  stressLevel: number
): PhaseDirectorProfile => {
  if (difficulty === 'TUTORIAL') {
    return {
      spawnDelayMultiplier: 1.1,
      missionRespawnMultiplier: 1.08,
      severityDelta: -0.08,
      concurrencyDelta: 0,
      cascadeChance: 0,
      cascadeCooldownMs: 22000
    };
  }

  const baseByPhase: Record<MatchPhase, PhaseDirectorProfile> = {
    OPENING: {
      spawnDelayMultiplier: 1.12,
      missionRespawnMultiplier: 1.06,
      severityDelta: -0.05,
      concurrencyDelta: -1,
      cascadeChance: 0.12,
      cascadeCooldownMs: 15000
    },
    MIDGAME: {
      spawnDelayMultiplier: 1.0,
      missionRespawnMultiplier: 1.0,
      severityDelta: 0,
      concurrencyDelta: 0,
      cascadeChance: 0.2,
      cascadeCooldownMs: 12000
    },
    FINALE: {
      spawnDelayMultiplier: 0.82,
      missionRespawnMultiplier: 0.88,
      severityDelta: 0.08,
      concurrencyDelta: 1,
      cascadeChance: 0.3,
      cascadeCooldownMs: 9000
    }
  };

  const difficultyDelta = {
    NORMAL: { severity: -0.01, cascade: 0, concurrency: 0, spawn: 1.0, mission: 1.0 },
    HARD: { severity: 0.02, cascade: 0.04, concurrency: 0, spawn: 0.97, mission: 0.95 },
    EXTREME: { severity: 0.04, cascade: 0.08, concurrency: 1, spawn: 0.93, mission: 0.92 },
    TUTORIAL: { severity: -0.08, cascade: -1, concurrency: 0, spawn: 1.1, mission: 1.08 }
  }[difficulty];

  const modeDelta = {
    [GameMode.NORMAL]: { severity: 0, cascade: 0, concurrency: 0, spawn: 1.0, mission: 1.0 },
    [GameMode.ENDLESS]: { severity: -0.01, cascade: 0.01, concurrency: 0, spawn: 0.96, mission: 0.92 },
    [GameMode.SPEEDRUN]: { severity: 0.02, cascade: 0.02, concurrency: 0, spawn: 0.88, mission: 0.84 },
    [GameMode.HARDCORE]: { severity: 0.03, cascade: 0.03, concurrency: 1, spawn: 0.9, mission: 0.86 }
  }[mode];

  const stressDelta =
    stressLevel >= 85 ? { severity: 0.04, cascade: 0.06, spawn: 0.9, mission: 0.9 } :
    stressLevel >= 65 ? { severity: 0.02, cascade: 0.03, spawn: 0.95, mission: 0.95 } :
    stressLevel <= 20 ? { severity: -0.02, cascade: -0.04, spawn: 1.06, mission: 1.06 } :
    { severity: 0, cascade: 0, spawn: 1.0, mission: 1.0 };

  const profile = baseByPhase[phase];
  const cascadeChance = clamp(
    profile.cascadeChance + difficultyDelta.cascade + modeDelta.cascade + stressDelta.cascade,
    0.06,
    0.72
  );

  return {
    spawnDelayMultiplier: clamp(
      profile.spawnDelayMultiplier * difficultyDelta.spawn * modeDelta.spawn * stressDelta.spawn,
      0.62,
      1.28
    ),
    missionRespawnMultiplier: clamp(
      profile.missionRespawnMultiplier * difficultyDelta.mission * modeDelta.mission * stressDelta.mission,
      0.68,
      1.32
    ),
    severityDelta: clamp(
      profile.severityDelta + difficultyDelta.severity + modeDelta.severity + stressDelta.severity,
      -0.12,
      0.2
    ),
    concurrencyDelta: clamp(
      profile.concurrencyDelta + difficultyDelta.concurrency + modeDelta.concurrency,
      -1,
      2
    ),
    cascadeChance,
    cascadeCooldownMs: Math.round(clamp(
      profile.cascadeCooldownMs * (1.18 - cascadeChance),
      6000,
      22000
    ))
  };
};

export const getSessionDifficultyTarget = (
  difficulty: GameScenario['difficulty'],
  telemetry: SessionDirectorTelemetry,
  stats: Pick<GameStats, 'stress' | 'budget'>,
  activeEventsCount: number,
  initialBudget: number
) => {
  if (difficulty === 'TUTORIAL') return -1;

  const totalFailures = telemetry.failedEvents + telemetry.expiredEvents;
  const totalResolved = telemetry.resolvedEvents;
  const totalAttempts = totalResolved + totalFailures;
  const successRate = totalAttempts > 0 ? totalResolved / totalAttempts : 0.5;
  const budgetRatio = initialBudget > 0 ? stats.budget / initialBudget : 1;
  const recentFails = telemetry.recentOutcomes.filter(outcome => outcome === 'FAIL').length;
  const recentFailPressure = telemetry.recentOutcomes.length > 0
    ? recentFails / telemetry.recentOutcomes.length
    : 0;

  let target = 0;
  target += (successRate - 0.55) * 1.1;

  if (stats.stress >= 85) target -= 0.5;
  else if (stats.stress >= 70) target -= 0.28;
  else if (stats.stress <= 35) target += 0.15;

  if (budgetRatio <= 0.2) target -= 0.42;
  else if (budgetRatio <= 0.45) target -= 0.2;
  else if (budgetRatio >= 1.7) target += 0.16;

  if (activeEventsCount <= 1 && successRate >= 0.65) target += 0.08;
  if (activeEventsCount >= 4) target -= 0.08;

  target -= recentFailPressure * 0.45;

  if (totalResolved >= 12 && successRate > 0.74) target += 0.14;
  if (totalFailures >= 6 && successRate < 0.45) target -= 0.16;

  return clamp(target, -1, 1);
};

export const getAdaptiveDirectorAdjustments = (
  difficultyTarget: number
): AdaptiveDirectorAdjustments => {
  const intensity = clamp(difficultyTarget, -1, 1);

  return {
    spawnDelayMultiplier: clamp(1 - (intensity * 0.18), 0.82, 1.22),
    missionRespawnMultiplier: clamp(1 - (intensity * 0.14), 0.86, 1.2),
    severityDelta: clamp(intensity * 0.08, -0.1, 0.1),
    concurrencyDelta: intensity >= 0.5 ? 1 : intensity <= -0.5 ? -1 : 0,
    cascadeChanceDelta: clamp(intensity * 0.12, -0.14, 0.14)
  };
};

export const composeDirectorProfile = (
  base: PhaseDirectorProfile,
  adjustments: AdaptiveDirectorAdjustments
): PhaseDirectorProfile => {
  const cascadeCooldownMultiplier = clamp(
    1 - (adjustments.cascadeChanceDelta * 0.72),
    0.72,
    1.28
  );

  return {
    spawnDelayMultiplier: clamp(
      base.spawnDelayMultiplier * adjustments.spawnDelayMultiplier,
      0.58,
      1.34
    ),
    missionRespawnMultiplier: clamp(
      base.missionRespawnMultiplier * adjustments.missionRespawnMultiplier,
      0.64,
      1.34
    ),
    severityDelta: clamp(base.severityDelta + adjustments.severityDelta, -0.18, 0.24),
    concurrencyDelta: clamp(base.concurrencyDelta + adjustments.concurrencyDelta, -2, 2),
    cascadeChance: clamp(base.cascadeChance + adjustments.cascadeChanceDelta, 0.04, 0.78),
    cascadeCooldownMs: Math.round(clamp(base.cascadeCooldownMs * cascadeCooldownMultiplier, 5000, 24000))
  };
};

export const getSessionFatigueMetrics = (
  mode: GameMode,
  timeRemaining: number,
  totalDuration: number,
  telemetry: SessionDirectorTelemetry,
  stats: Pick<GameStats, 'stress' | 'budget'>,
  activeEventsCount: number
): SessionFatigueMetrics => {
  const attempts = telemetry.resolvedEvents + telemetry.failedEvents + telemetry.expiredEvents;
  const recentFailRate = telemetry.recentOutcomes.length > 0
    ? telemetry.recentOutcomes.filter(outcome => outcome === 'FAIL').length / telemetry.recentOutcomes.length
    : 0;

  const progressRatio = mode === GameMode.ENDLESS
    ? clamp(attempts / 40, 0, 1)
    : totalDuration > 0
      ? clamp(1 - (timeRemaining / totalDuration), 0, 1)
      : 0.5;

  const stressPressure = clamp((stats.stress - 45) / 55, 0, 1);
  const loadPressure = clamp((activeEventsCount - 2) / 4, 0, 1);
  const failPressure = clamp(recentFailRate, 0, 1);
  const pressureLevel = clamp(
    (stressPressure * 0.54) +
    (loadPressure * 0.3) +
    (failPressure * 0.16),
    0,
    1
  );

  const fatigueLevel = clamp(
    (progressRatio * 0.56) +
    (pressureLevel * 0.44),
    0,
    1
  );

  return {
    progressRatio,
    pressureLevel,
    recentFailRate,
    fatigueLevel
  };
};

export const getProceduralInjectionProfile = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  metrics: SessionFatigueMetrics,
  activeEventsCount: number
): ProceduralInjectionProfile => {
  if (difficulty === 'TUTORIAL') {
    return {
      aiChanceMultiplier: 0.55,
      aiCooldownMultiplier: 1.45,
      idleRetryDelayMs: 11000,
      maxInjectedEvents: 1,
      severityBias: -0.2,
      durationMultiplier: 1.2
    };
  }

  const modeAggression = {
    [GameMode.NORMAL]: 1.0,
    [GameMode.ENDLESS]: 1.06,
    [GameMode.SPEEDRUN]: 1.12,
    [GameMode.HARDCORE]: 1.16
  }[mode];
  const difficultyAggression = {
    NORMAL: 1.0,
    HARD: 1.08,
    EXTREME: 1.16,
    TUTORIAL: 0.55
  }[difficulty];

  const overloadSuppression = metrics.pressureLevel >= 0.74 || metrics.recentFailRate >= 0.62;
  const climaxBoost = metrics.fatigueLevel >= 0.72 && metrics.pressureLevel <= 0.52;
  const loadPenalty = activeEventsCount >= 4 ? 0.14 : activeEventsCount >= 3 ? 0.08 : 0;
  const progressBoost = metrics.progressRatio >= 0.8 ? 0.06 : metrics.progressRatio >= 0.6 ? 0.03 : 0;

  let aiChanceMultiplier = difficultyAggression * modeAggression;
  let aiCooldownMultiplier = 1.0;
  let maxInjectedEvents = activeEventsCount >= 4 ? 1 : 2;
  let severityBias = (difficultyAggression - 1) * 0.16;
  let durationMultiplier = 1.0;
  let idleRetryDelayMs = 8000;

  if (overloadSuppression) {
    aiChanceMultiplier *= 0.76;
    aiCooldownMultiplier *= 1.26;
    maxInjectedEvents = 1;
    severityBias -= 0.14;
    durationMultiplier *= 1.14;
    idleRetryDelayMs = 10500;
  } else if (climaxBoost) {
    aiChanceMultiplier *= 1.08;
    aiCooldownMultiplier *= 0.9;
    maxInjectedEvents = 2;
    severityBias += 0.12;
    durationMultiplier *= 0.92;
    idleRetryDelayMs = 6500;
  } else if (metrics.fatigueLevel >= 0.55) {
    aiChanceMultiplier *= 0.96;
    aiCooldownMultiplier *= 1.05;
    severityBias -= 0.02;
    durationMultiplier *= 1.06;
    idleRetryDelayMs = 9000;
  }

  aiChanceMultiplier = clamp(aiChanceMultiplier + progressBoost - loadPenalty, 0.56, 1.34);
  aiCooldownMultiplier = clamp(aiCooldownMultiplier + (loadPenalty * 0.8), 0.78, 1.5);
  severityBias = clamp(severityBias, -0.24, 0.22);
  durationMultiplier = clamp(durationMultiplier + (loadPenalty * 0.4), 0.86, 1.28);
  idleRetryDelayMs = Math.round(clamp(idleRetryDelayMs + (loadPenalty * 2200), 5500, 13000));

  return {
    aiChanceMultiplier,
    aiCooldownMultiplier,
    idleRetryDelayMs,
    maxInjectedEvents,
    severityBias,
    durationMultiplier
  };
};

const SCENARIO_BOSS_BEATS: Record<string, number[]> = {
  NORMAL: [0.72],
  ROCKSTAR: [0.66, 0.84],
  FESTIVAL: [0.62, 0.78, 0.9],
  EXTREME: [0.64, 0.76, 0.88],
  ARENA: [0.58, 0.73, 0.87],
  WORLD_TOUR: [0.56, 0.7, 0.82, 0.92],
  BLACKOUT_PROTOCOL: [0.52, 0.66, 0.79, 0.9]
};

const DEFAULT_BOSS_MOMENT_PROFILE: BossMomentProfile = {
  active: false,
  recovery: false,
  intensity: 0,
  spawnDelayMultiplier: 1,
  missionRespawnMultiplier: 1,
  severityDelta: 0,
  concurrencyDelta: 0,
  cascadeChanceDelta: 0,
  aiChanceMultiplier: 1,
  aiCooldownMultiplier: 1,
  durationMultiplier: 1
};

const getBossTimelineProgress = (
  mode: GameMode,
  fatigueMetrics: SessionFatigueMetrics,
  attemptsCount: number
) => {
  if (mode !== GameMode.ENDLESS) return fatigueMetrics.progressRatio;
  return clamp((attemptsCount % 24) / 24, 0, 1);
};

export const getScenarioBossMomentProfile = (
  scenarioId: string,
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  phase: MatchPhase,
  fatigueMetrics: SessionFatigueMetrics,
  activeEventsCount: number,
  attemptsCount: number
): BossMomentProfile => {
  if (difficulty === 'TUTORIAL' || phase !== 'FINALE') return { ...DEFAULT_BOSS_MOMENT_PROFILE };
  const beats = SCENARIO_BOSS_BEATS[scenarioId];
  if (!beats || beats.length === 0) return { ...DEFAULT_BOSS_MOMENT_PROFILE };

  const timeline = getBossTimelineProgress(mode, fatigueMetrics, attemptsCount);
  const beatWidth = 0.035;
  const recoveryWidth = 0.06;
  const isActive = beats.some(beat => Math.abs(timeline - beat) <= beatWidth);
  const isRecovery = !isActive && beats.some(beat => {
    const start = beat + beatWidth;
    const end = start + recoveryWidth;
    return timeline > start && timeline <= end;
  });

  if (!isActive && !isRecovery) return { ...DEFAULT_BOSS_MOMENT_PROFILE };

  const difficultyIntensity = {
    NORMAL: 0.72,
    HARD: 0.86,
    EXTREME: 1.0,
    TUTORIAL: 0.6
  }[difficulty];

  const pressureSuppression = fatigueMetrics.pressureLevel >= 0.8 ? 0.78 : 1;
  const loadSuppression = activeEventsCount >= 5 ? 0.84 : 1;
  const intensity = clamp(
    difficultyIntensity *
      (0.78 + (fatigueMetrics.fatigueLevel * 0.34)) *
      pressureSuppression *
      loadSuppression,
    0.36,
    1.12
  );

  if (isActive) {
    return {
      active: true,
      recovery: false,
      intensity,
      spawnDelayMultiplier: clamp(1 - (intensity * 0.26), 0.6, 1),
      missionRespawnMultiplier: clamp(1 + (intensity * 0.1), 1, 1.2),
      severityDelta: clamp(intensity * 0.1, 0.04, 0.18),
      concurrencyDelta: intensity >= 0.72 ? 1 : 0,
      cascadeChanceDelta: clamp(intensity * 0.16, 0.06, 0.24),
      aiChanceMultiplier: clamp(1 + (intensity * 0.2), 1.04, 1.34),
      aiCooldownMultiplier: clamp(1 - (intensity * 0.16), 0.72, 0.96),
      durationMultiplier: clamp(1 - (intensity * 0.1), 0.78, 0.95)
    };
  }

  return {
    active: false,
    recovery: true,
    intensity: intensity * 0.8,
    spawnDelayMultiplier: clamp(1 + (intensity * 0.22), 1.04, 1.3),
    missionRespawnMultiplier: clamp(1 - (intensity * 0.08), 0.84, 1),
    severityDelta: clamp(-(intensity * 0.07), -0.14, -0.03),
    concurrencyDelta: intensity >= 0.9 ? -1 : 0,
    cascadeChanceDelta: clamp(-(intensity * 0.09), -0.16, -0.04),
    aiChanceMultiplier: clamp(1 - (intensity * 0.16), 0.7, 0.96),
    aiCooldownMultiplier: clamp(1 + (intensity * 0.2), 1.04, 1.32),
    durationMultiplier: clamp(1 + (intensity * 0.12), 1.02, 1.24)
  };
};

export const applyBossMomentToDirectorProfile = (
  profile: PhaseDirectorProfile,
  bossMoment: BossMomentProfile
): PhaseDirectorProfile => {
  if (!bossMoment.active && !bossMoment.recovery) return profile;

  const nextCascadeChance = clamp(
    profile.cascadeChance + bossMoment.cascadeChanceDelta,
    0.04,
    0.8
  );

  return {
    spawnDelayMultiplier: clamp(profile.spawnDelayMultiplier * bossMoment.spawnDelayMultiplier, 0.52, 1.42),
    missionRespawnMultiplier: clamp(profile.missionRespawnMultiplier * bossMoment.missionRespawnMultiplier, 0.62, 1.42),
    severityDelta: clamp(profile.severityDelta + bossMoment.severityDelta, -0.22, 0.3),
    concurrencyDelta: clamp(profile.concurrencyDelta + bossMoment.concurrencyDelta, -2, 2),
    cascadeChance: nextCascadeChance,
    cascadeCooldownMs: Math.round(clamp(
      profile.cascadeCooldownMs * (1.12 - nextCascadeChance),
      4500,
      25000
    ))
  };
};

export const applyBossMomentToProceduralProfile = (
  profile: ProceduralInjectionProfile,
  bossMoment: BossMomentProfile
): ProceduralInjectionProfile => {
  if (!bossMoment.active && !bossMoment.recovery) return profile;

  const nextMaxInjectedEvents = bossMoment.active
    ? Math.min(3, profile.maxInjectedEvents + (bossMoment.intensity >= 0.9 ? 1 : 0))
    : Math.max(1, profile.maxInjectedEvents - 1);

  return {
    aiChanceMultiplier: clamp(profile.aiChanceMultiplier * bossMoment.aiChanceMultiplier, 0.5, 1.5),
    aiCooldownMultiplier: clamp(profile.aiCooldownMultiplier * bossMoment.aiCooldownMultiplier, 0.64, 1.7),
    idleRetryDelayMs: Math.round(clamp(
      profile.idleRetryDelayMs * (bossMoment.recovery ? 1.12 : 0.92),
      4500,
      14000
    )),
    maxInjectedEvents: nextMaxInjectedEvents,
    severityBias: clamp(profile.severityBias + (bossMoment.severityDelta * 0.5), -0.3, 0.28),
    durationMultiplier: clamp(profile.durationMultiplier * bossMoment.durationMultiplier, 0.74, 1.34)
  };
};

interface MissionDirectorContext {
  systems: Record<SystemType, SystemState>;
  stats: Pick<GameStats, 'stress' | 'budget'>;
  phase: MatchPhase;
  mode: GameMode;
  difficulty: GameScenario['difficulty'];
}

interface AdaptiveMissionPick {
  missionId: string;
  queueIndex: number;
}

const getCriteriaBounds = (criterion: MissionDefinition['criteria'][number]) => {
  return {
    min: criterion.min ?? 0,
    max: criterion.max ?? 100
  };
};

export const getMissionComplexityScore = (mission: MissionDefinition) => {
  const criteriaCount = mission.criteria.length;
  const criteriaDensity = clamp((criteriaCount - 1) / 3, 0, 1);
  const precisionScore = mission.criteria.length > 0
    ? mission.criteria.reduce((sum, criterion) => {
      const { min, max } = getCriteriaBounds(criterion);
      const width = clamp(max - min, 0, 100);
      return sum + (1 - (width / 100));
    }, 0) / mission.criteria.length
    : 0;
  const holdComplexity = clamp((mission.holdDuration - 8) / 16, 0, 1);
  const timeoutPressure = clamp(mission.holdDuration / Math.max(1, mission.timeout), 0, 1);
  const rewardSignal = clamp(mission.rewardCash / 1800, 0, 1);

  return clamp(
    (criteriaDensity * 0.32) +
    (precisionScore * 0.28) +
    (holdComplexity * 0.18) +
    (timeoutPressure * 0.12) +
    (rewardSignal * 0.1),
    0,
    1
  );
};

export const getMissionSystemFitScore = (
  mission: MissionDefinition,
  systems: Record<SystemType, SystemState>
) => {
  if (mission.criteria.length === 0) return 0.5;

  let accumulatedGap = 0;
  let inRangeCount = 0;

  mission.criteria.forEach(criterion => {
    const value = systems[criterion.systemId]?.faderValue ?? 50;
    const { min, max } = getCriteriaBounds(criterion);
    const gap = value < min ? (min - value) : value > max ? (value - max) : 0;
    if (gap === 0) inRangeCount += 1;
    accumulatedGap += clamp(gap / 100, 0, 1);
  });

  const avgGap = accumulatedGap / mission.criteria.length;
  const inRangeRatio = inRangeCount / mission.criteria.length;

  return clamp((1 - avgGap) * 0.75 + (inRangeRatio * 0.25), 0, 1);
};

export const getMissionTargetComplexity = (context: MissionDirectorContext) => {
  const phaseBase = {
    OPENING: 0.42,
    MIDGAME: 0.56,
    FINALE: 0.68
  }[context.phase];

  const difficultyDelta = {
    TUTORIAL: -0.2,
    NORMAL: 0,
    HARD: 0.08,
    EXTREME: 0.14
  }[context.difficulty];

  const modeDelta = {
    [GameMode.NORMAL]: 0,
    [GameMode.ENDLESS]: -0.04,
    [GameMode.SPEEDRUN]: 0.06,
    [GameMode.HARDCORE]: 0.1
  }[context.mode];

  const stressDelta =
    context.stats.stress >= 85 ? -0.26 :
    context.stats.stress >= 70 ? -0.16 :
    context.stats.stress <= 35 ? 0.08 :
    0;
  const budgetDelta =
    context.stats.budget <= 1200 ? -0.15 :
    context.stats.budget >= 7000 ? 0.06 :
    0;

  return clamp(phaseBase + difficultyDelta + modeDelta + stressDelta + budgetDelta, 0.18, 0.9);
};

export const pickAdaptiveMissionFromQueue = (
  missionPool: MissionDefinition[],
  queueIds: string[],
  queueStartIndex: number,
  context: MissionDirectorContext,
  lookahead: number = 4,
  randomFactor: number = Math.random()
): AdaptiveMissionPick | null => {
  if (missionPool.length === 0 || queueIds.length === 0 || queueStartIndex >= queueIds.length) {
    return null;
  }

  const missionById = new Map(missionPool.map(mission => [mission.id, mission]));
  const targetComplexity = getMissionTargetComplexity(context);
  const pressureWeight = context.stats.stress >= 70 ? 0.4 : 0.25;
  const challengeWeight = context.stats.stress <= 45 ? 0.25 : 0.12;
  const economyWeight = context.stats.budget <= 1200 ? 0.2 : 0.08;
  const alignmentWeight = Math.max(0.2, 1 - pressureWeight - challengeWeight - economyWeight);

  const endIndex = Math.min(queueIds.length, queueStartIndex + Math.max(1, lookahead));
  let bestPick: AdaptiveMissionPick | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let queueIndex = queueStartIndex; queueIndex < endIndex; queueIndex += 1) {
    const missionId = queueIds[queueIndex];
    const mission = missionById.get(missionId);
    if (!mission) continue;

    const complexity = getMissionComplexityScore(mission);
    const complexityAlignment = 1 - Math.abs(complexity - targetComplexity);
    const fitScore = getMissionSystemFitScore(mission, context.systems);
    const economyScore = context.stats.budget <= 1200 ? fitScore : (0.5 * fitScore + 0.5 * complexityAlignment);
    const queueProximityBonus = (endIndex - queueIndex) * 0.003;
    const deterministicNoise = ((queueIndex - queueStartIndex + 1) * clamp(randomFactor, 0, 1)) * 0.002;

    const score =
      (complexityAlignment * alignmentWeight) +
      (fitScore * pressureWeight) +
      (complexity * challengeWeight) +
      (economyScore * economyWeight) +
      queueProximityBonus +
      deterministicNoise;

    if (score > bestScore) {
      bestScore = score;
      bestPick = { missionId, queueIndex };
    }
  }

  return bestPick;
};

export const getEventConcurrencyCap = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  stressLevel: number
) => {
  const difficultyBase = {
    TUTORIAL: 1,
    NORMAL: 3,
    HARD: 4,
    EXTREME: 5
  }[difficulty];

  const modeDelta =
    mode === GameMode.HARDCORE ? 1 :
    mode === GameMode.SPEEDRUN ? 1 :
    mode === GameMode.ENDLESS ? 0 :
    0;
  const stressDelta = stressLevel >= 80 ? 1 : stressLevel <= 20 ? -1 : 0;

  if (difficulty === 'TUTORIAL') return 1;
  return clamp(difficultyBase + modeDelta + stressDelta, 2, 6);
};

export const getStaticEventSeverityChance = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  stressLevel: number,
  activeEventsCount: number
) => {
  const baseByDifficulty = {
    TUTORIAL: 0.05,
    NORMAL: 0.15,
    HARD: 0.5,
    EXTREME: 0.7
  }[difficulty];
  const modeDelta =
    mode === GameMode.HARDCORE ? 0.12 :
    mode === GameMode.SPEEDRUN ? 0.08 :
    mode === GameMode.ENDLESS ? -0.04 :
    0;
  const stressDelta = clamp((stressLevel - 50) / 250, -0.12, 0.22);
  const loadDelta = activeEventsCount >= 4 ? -0.06 : activeEventsCount <= 1 ? 0.04 : 0;

  return clamp(baseByDifficulty + modeDelta + stressDelta + loadDelta, 0.05, 0.9);
};

export const getStaticEventSpawnDelayMs = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  stressLevel: number,
  activeEventsCount: number,
  randomFactor: number = Math.random()
) => {
  const baseByDifficulty = {
    TUTORIAL: 60000,
    NORMAL: 15000,
    HARD: 11000,
    EXTREME: 9000
  }[difficulty];
  const modeMultiplier =
    mode === GameMode.SPEEDRUN ? 0.62 :
    mode === GameMode.HARDCORE ? 0.72 :
    mode === GameMode.ENDLESS ? 0.86 :
    1.0;
  const stressMultiplier =
    stressLevel >= 85 ? 0.72 :
    stressLevel >= 65 ? 0.85 :
    stressLevel <= 20 ? 1.14 :
    1.0;
  const loadMultiplier =
    activeEventsCount >= 4 ? 1.22 :
    activeEventsCount <= 1 ? 0.94 :
    1.0;

  const normalizedRandom = clamp(randomFactor, 0, 1);
  const jitter = 0.88 + (normalizedRandom * 0.24);
  return Math.max(3500, Math.round(baseByDifficulty * modeMultiplier * stressMultiplier * loadMultiplier * jitter));
};

export const getMissionRewardCash = (
  baseRewardCash: number,
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  activeEventsCount: number,
  stressLevel: number,
  rewardMultiplier: number
) => {
  const difficultyMultiplier = {
    TUTORIAL: 0.9,
    NORMAL: 1.0,
    HARD: 1.12,
    EXTREME: 1.22
  }[difficulty];
  const modeMultiplier = {
    [GameMode.NORMAL]: 1.0,
    [GameMode.ENDLESS]: 0.95,
    [GameMode.SPEEDRUN]: 1.1,
    [GameMode.HARDCORE]: 1.16
  }[mode];
  const pressureBonus =
    (stressLevel >= 75 ? 0.08 : 0) +
    (activeEventsCount >= 4 ? 0.05 : activeEventsCount >= 2 ? 0.03 : 0);
  const totalMultiplier = clamp(difficultyMultiplier * modeMultiplier * rewardMultiplier * (1 + pressureBonus), 0.8, 1.6);
  return Math.max(50, Math.round(baseRewardCash * totalMultiplier));
};

export const getPhaseEconomyProfile = (
  difficulty: GameScenario['difficulty'],
  mode: GameMode,
  phase: MatchPhase,
  stressLevel: number,
  fatigueMetrics: Pick<SessionFatigueMetrics, 'fatigueLevel' | 'pressureLevel'>
): EconomyPhaseProfile => {
  if (difficulty === 'TUTORIAL') {
    return {
      missionRewardMultiplier: 0.92,
      eventRewardMultiplier: 0.86,
      failurePenaltyMultiplier: 0.78,
      expiryPenaltyMultiplier: 0.74,
      comebackBonusMultiplier: 0.08
    };
  }

  const baseByPhase: Record<MatchPhase, EconomyPhaseProfile> = {
    OPENING: {
      missionRewardMultiplier: 0.95,
      eventRewardMultiplier: 0.9,
      failurePenaltyMultiplier: 0.9,
      expiryPenaltyMultiplier: 0.88,
      comebackBonusMultiplier: 0.08
    },
    MIDGAME: {
      missionRewardMultiplier: 1.0,
      eventRewardMultiplier: 1.0,
      failurePenaltyMultiplier: 1.0,
      expiryPenaltyMultiplier: 1.0,
      comebackBonusMultiplier: 0.12
    },
    FINALE: {
      missionRewardMultiplier: 1.12,
      eventRewardMultiplier: 1.16,
      failurePenaltyMultiplier: 1.1,
      expiryPenaltyMultiplier: 1.12,
      comebackBonusMultiplier: 0.18
    }
  };

  const difficultyDelta = {
    NORMAL: { mission: 1.0, event: 1.0, failure: 1.0, expiry: 1.0, comeback: 0 },
    HARD: { mission: 1.05, event: 1.08, failure: 1.04, expiry: 1.06, comeback: 0.02 },
    EXTREME: { mission: 1.1, event: 1.14, failure: 1.08, expiry: 1.12, comeback: 0.04 },
    TUTORIAL: { mission: 0.92, event: 0.86, failure: 0.78, expiry: 0.74, comeback: 0.08 }
  }[difficulty];

  const modeDelta = {
    [GameMode.NORMAL]: { mission: 1.0, event: 1.0, failure: 1.0, expiry: 1.0, comeback: 0 },
    [GameMode.ENDLESS]: { mission: 0.98, event: 1.02, failure: 0.98, expiry: 1.0, comeback: 0.02 },
    [GameMode.SPEEDRUN]: { mission: 1.04, event: 1.08, failure: 1.06, expiry: 1.06, comeback: 0.02 },
    [GameMode.HARDCORE]: { mission: 1.06, event: 1.1, failure: 1.1, expiry: 1.1, comeback: 0.03 }
  }[mode];

  const stressDelta =
    stressLevel >= 85 ? { mission: 1.04, event: 1.06, failure: 0.9, expiry: 0.9, comeback: 0.07 } :
    stressLevel >= 70 ? { mission: 1.03, event: 1.04, failure: 0.94, expiry: 0.94, comeback: 0.05 } :
    stressLevel <= 30 ? { mission: 1.0, event: 1.0, failure: 1.04, expiry: 1.04, comeback: -0.02 } :
    { mission: 1.0, event: 1.0, failure: 1.0, expiry: 1.0, comeback: 0 };

  const fatigueDelta =
    fatigueMetrics.fatigueLevel >= 0.8 && fatigueMetrics.pressureLevel <= 0.55
      ? { mission: 1.06, event: 1.08, failure: 1.04, expiry: 1.05, comeback: 0.03 }
      : fatigueMetrics.pressureLevel >= 0.75
        ? { mission: 1.0, event: 0.98, failure: 0.88, expiry: 0.86, comeback: 0.06 }
        : { mission: 1.0, event: 1.0, failure: 1.0, expiry: 1.0, comeback: 0 };

  const base = baseByPhase[phase];
  return {
    missionRewardMultiplier: clamp(base.missionRewardMultiplier * difficultyDelta.mission * modeDelta.mission * stressDelta.mission * fatigueDelta.mission, 0.82, 1.48),
    eventRewardMultiplier: clamp(base.eventRewardMultiplier * difficultyDelta.event * modeDelta.event * stressDelta.event * fatigueDelta.event, 0.7, 1.65),
    failurePenaltyMultiplier: clamp(base.failurePenaltyMultiplier * difficultyDelta.failure * modeDelta.failure * stressDelta.failure * fatigueDelta.failure, 0.68, 1.5),
    expiryPenaltyMultiplier: clamp(base.expiryPenaltyMultiplier * difficultyDelta.expiry * modeDelta.expiry * stressDelta.expiry * fatigueDelta.expiry, 0.64, 1.52),
    comebackBonusMultiplier: clamp(base.comebackBonusMultiplier + difficultyDelta.comeback + modeDelta.comeback + stressDelta.comeback + fatigueDelta.comeback, 0, 0.36)
  };
};

export const applyBossMomentToEconomyProfile = (
  profile: EconomyPhaseProfile,
  bossMoment: BossMomentProfile
): EconomyPhaseProfile => {
  if (!bossMoment.active && !bossMoment.recovery) return profile;

  if (bossMoment.active) {
    return {
      missionRewardMultiplier: clamp(profile.missionRewardMultiplier * (1 + (bossMoment.intensity * 0.08)), 0.82, 1.7),
      eventRewardMultiplier: clamp(profile.eventRewardMultiplier * (1 + (bossMoment.intensity * 0.1)), 0.7, 1.8),
      failurePenaltyMultiplier: clamp(profile.failurePenaltyMultiplier * (1 + (bossMoment.intensity * 0.06)), 0.64, 1.6),
      expiryPenaltyMultiplier: clamp(profile.expiryPenaltyMultiplier * (1 + (bossMoment.intensity * 0.08)), 0.62, 1.65),
      comebackBonusMultiplier: clamp(profile.comebackBonusMultiplier + 0.04, 0, 0.4)
    };
  }

  return {
    missionRewardMultiplier: clamp(profile.missionRewardMultiplier * (1 + (bossMoment.intensity * 0.05)), 0.82, 1.7),
    eventRewardMultiplier: clamp(profile.eventRewardMultiplier * 0.96, 0.68, 1.8),
    failurePenaltyMultiplier: clamp(profile.failurePenaltyMultiplier * 0.86, 0.62, 1.6),
    expiryPenaltyMultiplier: clamp(profile.expiryPenaltyMultiplier * 0.84, 0.6, 1.65),
    comebackBonusMultiplier: clamp(profile.comebackBonusMultiplier + 0.06, 0, 0.45)
  };
};

export const getEventResolutionBudgetDelta = (
  severity: 1 | 2 | 3,
  isCorrect: boolean,
  cost: number,
  activeEventsCount: number,
  stats: Pick<GameStats, 'stress' | 'budget'>,
  economyProfile: EconomyPhaseProfile,
  streakState: Pick<EconomyStreakState, 'eventSuccessStreak' | 'eventFailStreak'>
) => {
  if (isCorrect) {
    const baseReward = 65 + (severity * 55) + (Math.min(4, activeEventsCount) * 12);
    const streakBonus = Math.min(0.18, streakState.eventSuccessStreak * 0.03);
    const pressureBonus = stats.stress >= 70 ? economyProfile.comebackBonusMultiplier : 0;
    const budgetBonus = stats.budget <= 1200 ? economyProfile.comebackBonusMultiplier * 0.6 : 0;
    const rewardMultiplier = economyProfile.eventRewardMultiplier * (1 + streakBonus + pressureBonus + budgetBonus);
    const rewardCash = Math.max(0, Math.round(baseReward * rewardMultiplier));
    const netBudgetDelta = rewardCash - cost;
    return {
      rewardCash,
      penaltyCash: 0,
      netBudgetDelta
    };
  }

  const basePenalty = (severity * 45) + (Math.min(4, activeEventsCount) * 14);
  const failStreakPenalty = Math.min(0.22, streakState.eventFailStreak * 0.04);
  const pressureRelief = stats.stress >= 80 ? 0.14 : 0;
  const penaltyMultiplier = economyProfile.failurePenaltyMultiplier * (1 + failStreakPenalty - pressureRelief);
  const penaltyCash = Math.max(0, Math.round(basePenalty * penaltyMultiplier));
  const netBudgetDelta = -(cost + penaltyCash);
  return {
    rewardCash: 0,
    penaltyCash,
    netBudgetDelta
  };
};

export const getMissionRewardPacingMultiplier = (
  economyProfile: EconomyPhaseProfile,
  streakState: Pick<EconomyStreakState, 'missionSuccessStreak' | 'missionFailStreak'>,
  stats: Pick<GameStats, 'stress' | 'budget'>,
  phase: MatchPhase,
  fatigueLevel: number
) => {
  const successBonus = Math.min(0.15, streakState.missionSuccessStreak * 0.03);
  const failComeback = Math.min(0.22, streakState.missionFailStreak * economyProfile.comebackBonusMultiplier * 0.7);
  const budgetComeback = stats.budget <= 1200 ? economyProfile.comebackBonusMultiplier * 0.6 : 0;
  const stressComeback = stats.stress >= 75 ? economyProfile.comebackBonusMultiplier * 0.5 : 0;
  const finaleFatigueBonus = phase === 'FINALE' && fatigueLevel >= 0.72 ? 0.08 : 0;

  const total = economyProfile.missionRewardMultiplier *
    (1 + successBonus + failComeback + budgetComeback + stressComeback + finaleFatigueBonus);
  return clamp(total, 0.76, 1.62);
};

export const getMissionTimeoutBudgetPenalty = (
  mission: Pick<MissionDefinition, 'criteria' | 'rewardCash'>,
  economyProfile: EconomyPhaseProfile,
  stats: Pick<GameStats, 'stress' | 'budget'>
) => {
  const basePenalty = Math.max(
    120,
    Math.round(mission.rewardCash * 0.22) + (mission.criteria.length * 55)
  );
  const pressureRelief =
    stats.stress >= 85 ? economyProfile.comebackBonusMultiplier * 0.75 :
    stats.stress >= 70 ? economyProfile.comebackBonusMultiplier * 0.45 :
    0;
  const budgetRelief = stats.budget <= 1000 ? economyProfile.comebackBonusMultiplier * 0.35 : 0;
  const penaltyMultiplier = Math.max(0.58, economyProfile.failurePenaltyMultiplier - pressureRelief - budgetRelief);
  return Math.max(0, Math.round(basePenalty * penaltyMultiplier));
};

export const getExpiredEventsBudgetPenalty = (
  expiredEvents: GameEvent[],
  activeEventsCount: number,
  economyProfile: EconomyPhaseProfile,
  stressLevel: number
) => {
  if (expiredEvents.length === 0) return 0;

  const severityWeight = expiredEvents.reduce((sum, event) => sum + event.severity, 0);
  const basePenalty = (severityWeight * 42) + (Math.min(5, activeEventsCount) * 18);
  const stressRelief = stressLevel >= 85 ? 0.2 : stressLevel >= 70 ? 0.12 : 0;
  const penaltyMultiplier = Math.max(0.6, economyProfile.expiryPenaltyMultiplier - stressRelief);
  return Math.max(0, Math.round(basePenalty * penaltyMultiplier));
};

export const getScenarioCompletionRewards = (
  difficulty: GameScenario['difficulty'],
  isFirstTime: boolean,
  mode: GameMode
) => {
  const pointsByDifficulty = {
    TUTORIAL: { first: 10, repeat: 5 },
    NORMAL: { first: 20, repeat: 10 },
    HARD: { first: 30, repeat: 15 },
    EXTREME: { first: 50, repeat: 25 }
  };
  const reputationByDifficulty = {
    TUTORIAL: { first: 4, repeat: 1 },
    NORMAL: { first: 12, repeat: 4 },
    HARD: { first: 20, repeat: 7 },
    EXTREME: { first: 35, repeat: 12 }
  };
  const modeMultiplier =
    mode === GameMode.HARDCORE ? 1.25 :
    mode === GameMode.SPEEDRUN ? 1.15 :
    mode === GameMode.ENDLESS ? 0.9 :
    1.0;

  const basePoints = isFirstTime ? pointsByDifficulty[difficulty].first : pointsByDifficulty[difficulty].repeat;
  const baseReputation = isFirstTime ? reputationByDifficulty[difficulty].first : reputationByDifficulty[difficulty].repeat;

  return {
    pointsEarned: Math.max(1, Math.round(basePoints * modeMultiplier)),
    reputationEarned: Math.max(1, Math.round(baseReputation * modeMultiplier))
  };
};

export const calculateScenarioScore = (
  mode: GameMode,
  difficulty: GameScenario['difficulty'],
  stats: Pick<GameStats, 'publicInterest' | 'clientSatisfaction' | 'stress' | 'budget'>,
  systems: SystemState[]
) => {
  const boundedStress = Math.min(100, Math.max(0, stats.stress));
  const boundedInterest = Math.min(100, Math.max(0, stats.publicInterest));
  const boundedClient = Math.min(100, Math.max(0, stats.clientSatisfaction));
  const averageSystemHealth = systems.length > 0
    ? systems.reduce((sum, system) => sum + Math.min(100, Math.max(0, system.health)), 0) / systems.length
    : 100;

  const basePerformance =
    (boundedInterest * 3) +
    (boundedClient * 3) +
    ((100 - boundedStress) * 2) +
    (averageSystemHealth * 2) +
    (Math.max(0, stats.budget) / 40);

  const difficultyMultiplier = {
    TUTORIAL: 0.6,
    NORMAL: 1.0,
    HARD: 1.35,
    EXTREME: 1.7
  }[difficulty];

  const modeMultiplier = {
    [GameMode.NORMAL]: 1.0,
    [GameMode.ENDLESS]: 0.95,
    [GameMode.SPEEDRUN]: 1.15,
    [GameMode.HARDCORE]: 1.25
  }[mode];

  return Math.max(1, Math.round(basePerformance * difficultyMultiplier * modeMultiplier));
};

export const buildMinigameResolutionOption = (
  option: GameEventOption,
  success: boolean
): GameEventOption => {
  if (success) return option;
  return {
    ...option,
    isCorrect: false,
    // Prevent negative stress on failure when the base option has a negative impact.
    stressImpact: Math.max(10, Math.abs(option.stressImpact))
  };
};

export const createEscalatedEvent = (
  event: GameEvent,
  systemEvents: EventDefinition[],
  now: number,
  idFactory: () => string = () => Math.random().toString(36).slice(2, 11)
): GameEvent | null => {
  const eventDef = systemEvents.find(def => def.title === event.title);
  if (!eventDef?.escalationEvent) return null;

  const escalationDef = systemEvents.find(def => def.title === eventDef.escalationEvent);
  if (!escalationDef) return null;

  const escalatedSeverity: 1 | 2 | 3 =
    event.severity === 3 ? 3 : ((event.severity + 1) as 1 | 2 | 3);
  const remainingMs = Math.max(1000, event.expiresAt - now);

  return {
    id: idFactory(),
    systemId: event.systemId,
    title: escalationDef.title,
    description: `${escalationDef.description} (Escalado desde: ${event.title})`,
    severity: escalatedSeverity,
    expiresAt: now + remainingMs,
    correctAction: '',
    options: escalationDef.options,
    priority: escalationDef.priority || 9,
    canEscalate: escalationDef.canEscalate || false,
    escalationTime: escalationDef.escalationTime ? now + (escalationDef.escalationTime * 1000) : undefined,
    escalatedFrom: event.id,
    relatedEvents: [event.id]
  };
};

interface CascadeTarget {
  systemId: SystemType;
  definition: EventDefinition;
}

export const getCrossSystemCascadeTargets = (
  sourceEvent: GameEvent,
  sourceDefinition: EventDefinition | undefined,
  allSystemEvents: Record<SystemType, EventDefinition[]>,
  activeTitles: Set<string>,
  eventCooldowns: Map<string, number>,
  now: number,
  isEventAllowedForScenario: (allowedScenarios: string[] | undefined) => boolean
): CascadeTarget[] => {
  if (!sourceDefinition?.relatedTo || sourceDefinition.relatedTo.length === 0) return [];

  const relatedTitles = new Set(sourceDefinition.relatedTo);
  const targets: CascadeTarget[] = [];

  (Object.values(SystemType) as SystemType[]).forEach(systemId => {
    if (systemId === sourceEvent.systemId) return;
    const systemDefinitions = allSystemEvents[systemId] || [];
    systemDefinitions.forEach(definition => {
      if (!relatedTitles.has(definition.title)) return;
      if (activeTitles.has(definition.title)) return;
      if ((eventCooldowns.get(definition.title) || 0) > now) return;
      if (!isEventAllowedForScenario(definition.allowedScenarios)) return;

      targets.push({ systemId, definition });
    });
  });

  return targets;
};

export const createRelatedCascadeEvent = (
  sourceEvent: GameEvent,
  targetSystemId: SystemType,
  targetDefinition: EventDefinition,
  now: number,
  severityBonus: number = 0,
  idFactory: () => string = () => Math.random().toString(36).slice(2, 11)
): GameEvent => {
  const priorityWeight = targetDefinition.priority ? (targetDefinition.priority >= 8 ? 1 : 0) : 0;
  const severity = clamp(
    Math.round(sourceEvent.severity + priorityWeight + severityBonus),
    1,
    3
  ) as 1 | 2 | 3;
  const baseDurationSeconds = severity === 3 ? 20 : severity === 2 ? 30 : 42;

  return {
    id: idFactory(),
    systemId: targetSystemId,
    title: targetDefinition.title,
    description: `${targetDefinition.description} (Impacto en cadena desde: ${sourceEvent.title})`,
    severity,
    expiresAt: now + (baseDurationSeconds * 1000),
    correctAction: '',
    options: targetDefinition.options,
    priority: targetDefinition.priority || (severity === 3 ? 9 : severity === 2 ? 6 : 4),
    canEscalate: targetDefinition.canEscalate || false,
    escalationTime: targetDefinition.escalationTime ? now + (targetDefinition.escalationTime * 1000) : undefined,
    escalatedFrom: sourceEvent.id,
    relatedEvents: [sourceEvent.id]
  };
};

interface PermanentGameplayModifiers {
  eventTimeMultiplier: number;
  missionTimeMultiplier: number;
  stressMultiplier: number;
  costMultiplier: number;
  rewardMultiplier: number;
  activeEventStressMultiplier: number;
}

const getPermanentGameplayModifiers = (unlockedUpgrades: string[]): PermanentGameplayModifiers => {
  const has = (upgradeId: string) => unlockedUpgrades.includes(upgradeId);

  let eventTimeMultiplier = 1.0;
  let missionTimeMultiplier = 1.0;
  let stressMultiplier = 1.0;
  let costMultiplier = 1.0;
  let rewardMultiplier = 1.0;
  let activeEventStressMultiplier = 1.0;

  if (has('reflexes_1')) eventTimeMultiplier *= 1.1;
  if (has('reflexes_2')) eventTimeMultiplier *= 1.2;
  if (has('special_focus')) eventTimeMultiplier *= 1.25;

  if (has('knowledge_1')) missionTimeMultiplier *= 1.05;
  if (has('knowledge_2')) {
    missionTimeMultiplier *= 1.1;
    activeEventStressMultiplier *= 0.9;
  }

  if (has('resistance_1')) stressMultiplier *= 0.85;
  if (has('resistance_2')) stressMultiplier *= 0.7;
  if (has('special_focus')) stressMultiplier *= 0.85;

  if (has('efficiency_1')) costMultiplier *= 0.8;
  if (has('efficiency_2')) costMultiplier *= 0.65;

  if (has('special_logistics')) rewardMultiplier *= 1.2;

  return {
    eventTimeMultiplier,
    missionTimeMultiplier,
    stressMultiplier,
    costMultiplier,
    rewardMultiplier,
    activeEventStressMultiplier
  };
};

const pickScenarioWeightedEvent = <T extends { allowedScenarios?: string[] }>(events: T[], scenarioId: string): T | null => {
  if (events.length === 0) return null;

  const weightedPool = events.flatMap(event => {
    const hasDirectScenarioMatch = event.allowedScenarios?.includes(scenarioId);
    const weight = hasDirectScenarioMatch ? 3 : 1;
    return Array.from({ length: weight }, () => event);
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)] || events[0];
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<GameStats>({ ...INITIAL_STATS, timeRemaining: GAME_DURATION });
  const [currentGameMode, setCurrentGameMode] = useState<GameMode>(GameMode.NORMAL);
  const [currentScenario, setCurrentScenario] = useState<GameScenario>(SCENARIOS[0]);
  const [activeMinigame, setActiveMinigame] = useState<{eventId: string, type: 'CABLES' | 'FREQUENCY'} | null>(null);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  
  // Tutorial State
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  // Career State
  const [careerData, setCareerData] = useState<CareerData>(DEFAULT_CAREER);

  // Crew & Inventory State
  const [crewBonus, setCrewBonus] = useState<string | null>(null);
  const [inventory, setInventory] = useState<string[]>([]);
  
  const [pendingStartData, setPendingStartData] = useState<{scenarioId: string, crewId: string, gameMode: GameMode} | null>(null);

  const [systems, setSystems] = useState<Record<SystemType, SystemState>>({
    [SystemType.SOUND]: { 
        id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0 
    },
    [SystemType.LIGHTS]: { 
        id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0 
    },
    [SystemType.VIDEO]: { 
        id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0
    },
    [SystemType.STAGE]: { 
        id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0
    },
  });

  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const { generateAIEvents, isGeneratingEvents } = useAIEventGenerator();
  
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const aiCooldownRef = useRef<number>(0);
  const nextStaticEventTimeRef = useRef<number>(0);
  const nextCascadeTimeRef = useRef<number>(0);
  const nextMissionTimeRef = useRef<number>(0);
  const eventCooldownsRef = useRef<Map<string, number>>(new Map());
  const missionQueueRef = useRef<string[]>([]);
  const missionQueueIndexRef = useRef<number>(0);
  const statsRef = useRef(stats);
  const systemsRef = useRef(systems);
  const activeEventsRef = useRef(activeEvents);
  const sessionDirectorTelemetryRef = useRef<SessionDirectorTelemetry>({
    ...DEFAULT_SESSION_DIRECTOR_TELEMETRY,
    recentOutcomes: []
  });
  const adaptiveDifficultyBiasRef = useRef<number>(0);
  const runtimeDirectorRef = useRef<PhaseDirectorProfile>(DEFAULT_PHASE_DIRECTOR_PROFILE);
  const runtimeEconomyProfileRef = useRef<EconomyPhaseProfile>({ ...DEFAULT_ECONOMY_PROFILE });
  const economyStreakRef = useRef<EconomyStreakState>({ ...DEFAULT_ECONOMY_STREAK });
  const activeMissionRef = useRef(activeMission);
  const currentScenarioRef = useRef(currentScenario);
  const currentGameModeRef = useRef(currentGameMode);
  const crewBonusRef = useRef(crewBonus);
  const isGeneratingEventsRef = useRef(isGeneratingEvents);
  const eventResolutionCallbackRef = useRef<((result: EventResolutionTelemetry) => void) | null>(null);

  useEffect(() => {
    systemsRef.current = systems;
  }, [systems]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    activeEventsRef.current = activeEvents;
  }, [activeEvents]);

  useEffect(() => {
    activeMissionRef.current = activeMission;
  }, [activeMission]);

  useEffect(() => {
    currentScenarioRef.current = currentScenario;
  }, [currentScenario]);

  useEffect(() => {
    currentGameModeRef.current = currentGameMode;
  }, [currentGameMode]);

  useEffect(() => {
    crewBonusRef.current = crewBonus;
  }, [crewBonus]);

  useEffect(() => {
    isGeneratingEventsRef.current = isGeneratingEvents;
  }, [isGeneratingEvents]);

  const isEventAllowedForScenario = useCallback((allowedScenarios: string[] | undefined, scenario: GameScenario) => {
    if (!allowedScenarios || allowedScenarios.length === 0) return true;
    if (allowedScenarios.includes(scenario.id)) return true;

    const HARD_SCENARIOS = ['ROCKSTAR', 'FESTIVAL', 'ARENA'];
    const EXTREME_SCENARIOS = ['EXTREME', 'WORLD_TOUR', 'BLACKOUT_PROTOCOL'];

    if (scenario.difficulty === 'HARD') {
      return allowedScenarios.some(id => HARD_SCENARIOS.includes(id));
    }

    if (scenario.difficulty === 'EXTREME') {
      return allowedScenarios.some(id => EXTREME_SCENARIOS.includes(id) || HARD_SCENARIOS.includes(id));
    }

    return false;
  }, []);

  const shuffleIds = useCallback((ids: string[]) => {
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const getMissionPoolForScenario = useCallback((scenario: GameScenario) => {
    if (scenario.isTutorial) return [];

    const directPool = CLIENT_MISSIONS.filter(mission =>
      !mission.allowedScenarios || mission.allowedScenarios.includes(scenario.id)
    );

    if (directPool.length > 0) return directPool;
    return CLIENT_MISSIONS.filter(mission => !mission.allowedScenarios || mission.allowedScenarios.length === 0);
  }, []);

  const refillMissionQueue = useCallback((prioritizeNew: boolean) => {
    const missionPool = getMissionPoolForScenario(currentScenarioRef.current);
    const allIds = missionPool.map(mission => mission.id);
    if (allIds.length === 0) {
      missionQueueRef.current = [];
      missionQueueIndexRef.current = 0;
      return;
    }

    if (!prioritizeNew) {
      missionQueueRef.current = shuffleIds(allIds);
      missionQueueIndexRef.current = 0;
      return;
    }

    const newIds = allIds.filter(id => NEW_MISSION_IDS.has(id));
    const legacyIds = allIds.filter(id => !NEW_MISSION_IDS.has(id));
    missionQueueRef.current = [...shuffleIds(newIds), ...shuffleIds(legacyIds)];
    missionQueueIndexRef.current = 0;
  }, [getMissionPoolForScenario, shuffleIds]);

  // LOAD CAREER ON MOUNT
  useEffect(() => {
      const saved = localStorage.getItem(CAREER_STORAGE_KEY);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              const loadedCareer = normalizeCareerData(parsed);
              setCareerData(loadedCareer);
              localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(loadedCareer));
          } catch (e) {
              console.error("Failed to load save", e);
              // Reset to default if corrupted
              setCareerData(DEFAULT_CAREER);
              localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(DEFAULT_CAREER));
          }
      } else {
          // If localStorage is empty, ensure we start with default
          setCareerData(DEFAULT_CAREER);
      }
  }, []);

  const saveCareer = useCallback((data: CareerData) => {
      const normalized = normalizeCareerData(data);
      setCareerData(normalized);
      localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const handleFaderChange = (id: SystemType, value: number) => {
      setSystems(prev => {
          const next = {
              ...prev,
              [id]: {
                  ...prev[id],
                  faderValue: value
              }
          };
          systemsRef.current = next;
          return next;
      });
  };

  const initializeSession = (scenarioId: string = 'NORMAL', crewId: string = 'VETERAN', gameMode: GameMode = GameMode.NORMAL) => {
      const scenario = resolvePlayableScenario(scenarioId, SCENARIOS, careerData);
      const crew = CREW_MEMBERS.find(c => c.id === crewId);
      
      setCurrentScenario(scenario);
      currentScenarioRef.current = scenario;
      setCurrentGameMode(gameMode);
      currentGameModeRef.current = gameMode;
      setCrewBonus(crew ? crew.bonus : null);
      crewBonusRef.current = crew ? crew.bonus : null;
      
      const baseBudget = scenario.initialBudget + (crew?.bonus === 'MORE_BUDGET' ? 2500 : 0);
      setStats({ ...INITIAL_STATS, budget: baseBudget, timeRemaining: getModeDuration(gameMode) });
      setInventory([]); 
      
      setPendingStartData({ scenarioId: scenario.id, crewId, gameMode });
      
      if (scenario.isTutorial) {
          startGame(baseBudget, scenario);
      } else {
          setGameState(GameState.SHOP);
      }

      return scenario.id;
  };

  const buyItem = (item: ShopItem) => {
      if (stats.budget >= item.cost && !inventory.includes(item.id)) {
          setStats(prev => ({ ...prev, budget: prev.budget - item.cost }));
          setInventory(prev => [...prev, item.id]);
      }
  };

  const startGame = (overrideBudget?: number, scenarioOverride?: GameScenario) => {
    const scenario = scenarioOverride ?? currentScenarioRef.current;
    currentScenarioRef.current = scenario;
    const gameMode = currentGameModeRef.current;
    const permanentModifiers = getPermanentGameplayModifiers(careerData.unlockedUpgrades);
    
    let driftModifier = 1.0;
    let stressResist = 1.0;
    let autoHealPer5Seconds = 0;
    let finalBudget = overrideBudget !== undefined ? overrideBudget : stats.budget; 

    inventory.forEach(itemId => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (item) {
            // STABILITY: Reduce drift en porcentaje (ej: 20% = reduce a 80% del drift original)
            if (item.effect === 'STABILITY') {
                driftModifier *= (1 - item.value / 100);
            }
            // STRESS_RESIST: Reduce el aumento de estrés en porcentaje (ej: 15% = reduce aumento a 85%)
            if (item.effect === 'STRESS_RESIST') {
                stressResist *= (1 - item.value / 100);
            }
            if (item.effect === 'AUTO_HEAL') autoHealPer5Seconds = item.value;
            if (item.effect === 'BUDGET_MULTIPLIER') finalBudget += item.value;
        }
    });
    autoHealPer5Seconds += getCrewAutoHealPer5Seconds(crewBonusRef.current);

    setGameState(GameState.PLAYING);
    setActiveMinigame(null);
    setActiveMission(null);
    activeMissionRef.current = null;
    refillMissionQueue(true);

    if (scenario.isTutorial) {
        setTutorialActive(true);
        setTutorialStepIndex(0);
    } else {
        setTutorialActive(false);
    }

    setStats({ ...INITIAL_STATS, budget: finalBudget, timeRemaining: getModeDuration(gameMode) });
    setActiveEvents([]);
    activeEventsRef.current = [];
    eventCooldownsRef.current.clear(); 
    sessionDirectorTelemetryRef.current = {
      ...DEFAULT_SESSION_DIRECTOR_TELEMETRY,
      recentOutcomes: []
    };
    adaptiveDifficultyBiasRef.current = 0;
    runtimeDirectorRef.current = { ...DEFAULT_PHASE_DIRECTOR_PROFILE };
    runtimeEconomyProfileRef.current = { ...DEFAULT_ECONOMY_PROFILE };
    economyStreakRef.current = { ...DEFAULT_ECONOMY_STREAK };
    
    const modeDriftMultiplier =
      gameMode === GameMode.HARDCORE ? 1.2 :
      gameMode === GameMode.SPEEDRUN ? 1.1 :
      gameMode === GameMode.ENDLESS ? 1.05 :
      1.0;
    const driftBase = (scenario.isTutorial ? 0.8 : (scenario.difficulty === 'NORMAL' ? 1.7 : 2.2)) * driftModifier * modeDriftMultiplier;

    setSystems({
      [SystemType.SOUND]: { 
        id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase 
      },
      [SystemType.LIGHTS]: { 
        id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase + 0.2
      },
      [SystemType.VIDEO]: { 
        id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.2
      },
      [SystemType.STAGE]: { 
        id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.4
      },
    });
    systemsRef.current = {
      [SystemType.SOUND]: {
        id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase
      },
      [SystemType.LIGHTS]: {
        id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase + 0.2
      },
      [SystemType.VIDEO]: {
        id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.2
      },
      [SystemType.STAGE]: {
        id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.4
      },
    };
    lastTickRef.current = Date.now();
    const now = Date.now();
    aiCooldownRef.current = now + (scenario.id === 'NORMAL' ? 10000 : 8000);
    nextStaticEventTimeRef.current = scenario.isTutorial
      ? now + 999999
      : now + getStaticEventSpawnDelayMs(scenario.difficulty, gameMode, 0, 0);
    nextCascadeTimeRef.current = now + 8000;
    const missionSpawnBase =
      scenario.difficulty === 'EXTREME' ? 11000 :
      scenario.difficulty === 'HARD' ? 13000 :
      15000;
    const missionSpawnModeMultiplier =
      gameMode === GameMode.SPEEDRUN ? 0.7 :
      gameMode === GameMode.HARDCORE ? 0.85 :
      1.0;
    nextMissionTimeRef.current = Date.now() + (scenario.isTutorial ? 999999 : Math.round(missionSpawnBase * missionSpawnModeMultiplier));

    modifiersRef.current = { stressResist: stressResist * permanentModifiers.stressMultiplier, autoHealPer5Seconds };
    autoHealPulseRef.current = Date.now() + 5000;
    permanentModifiersRef.current = permanentModifiers;
  };

  const modifiersRef = useRef({ stressResist: 1.0, autoHealPer5Seconds: 0 });
  const autoHealPulseRef = useRef<number>(Date.now() + 5000);
  const permanentModifiersRef = useRef<PermanentGameplayModifiers>(getPermanentGameplayModifiers([]));
  const applyComboBonusRef = useRef<((bonus: { type: string; amount: number; message: string }) => void) | null>(null);

  const applyComboBonus = useCallback((bonus: { type: string; amount: number; message: string }) => {
    setStats(prev => {
      let newBudget = prev.budget + Math.round(bonus.amount * permanentModifiersRef.current.rewardMultiplier);
      let newStress = prev.stress;
      
      if (bonus.type === 'STREAK_30') {
        newStress = Math.max(0, newStress - 10);
      } else if (bonus.type === 'STREAK_60') {
        newStress = Math.max(0, newStress - 20);
        // Could trigger special event here
      }
      
      return {
        ...prev,
        budget: newBudget,
        stress: newStress
      };
    });
  }, []);

  const setComboBonusCallback = useCallback((callback: (bonus: { type: string; amount: number; message: string }) => void) => {
    applyComboBonusRef.current = callback;
  }, []);

  const setEventResolutionCallback = useCallback((callback: (result: EventResolutionTelemetry) => void) => {
    eventResolutionCallbackRef.current = callback;
  }, []);

  const advanceTutorial = () => {
     setTutorialStepIndex(prev => prev + 1);
  };

  const finishTutorial = () => {
      setTutorialActive(false);
      nextStaticEventTimeRef.current = Date.now() + 5000;
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };

  const quitGame = () => {
    setGameState(GameState.MENU);
  };

  const generateStaticEvent = useCallback(() => {
    setActiveEvents(currentEvents => {
      const scenario = currentScenarioRef.current;
      const mode = currentGameModeRef.current;
      const now = Date.now();
      const eventTimeMultiplier = scenario.isTutorial ? 1 : permanentModifiersRef.current.eventTimeMultiplier;
      const stressNow = statsRef.current.stress;
      const runtimeSeverityDelta = runtimeDirectorRef.current.severityDelta;
      const activeTitles = new Set(currentEvents.map(e => e.title));
      const systemTypes = Object.values(SystemType).sort(() => Math.random() - 0.5);

      for (const sys of systemTypes) {
        const possibleEvents = SYSTEM_EVENTS[sys];

        const validEvents = possibleEvents.filter(def => {
          const onCooldown = (eventCooldownsRef.current.get(def.title) || 0) > now;
          const isActive = activeTitles.has(def.title);
          const isScenarioAllowed = isEventAllowedForScenario(def.allowedScenarios, scenario);
          return !onCooldown && !isActive && isScenarioAllowed;
        });

        if (validEvents.length > 0) {
          const eventDef = pickScenarioWeightedEvent(validEvents, scenario.id) || validEvents[0];
          const severityChance = getStaticEventSeverityChance(
            scenario.difficulty,
            mode,
            stressNow,
            currentEvents.length
          );
          const adjustedSeverityChance = clamp(severityChance + runtimeSeverityDelta, 0.05, 0.95);

          const severity = Math.random() < adjustedSeverityChance ? (Math.random() > 0.5 ? 3 : 2) : 1;
          let duration = severity === 3 ? 20 : severity === 2 ? 30 : 45;

          if (scenario.isTutorial) duration = 60;
          duration = Math.max(10, Math.round(duration * eventTimeMultiplier));

          const newEvent: GameEvent = {
            id: Math.random().toString(36).slice(2, 11),
            systemId: sys,
            title: eventDef.title,
            description: eventDef.description,
            severity: scenario.isTutorial ? 1 : (severity as 1 | 2 | 3),
            expiresAt: now + (duration * 1000),
            correctAction: "",
            options: eventDef.options,
            priority: eventDef.priority || (severity === 3 ? 9 : severity === 2 ? 6 : 3),
            canEscalate: eventDef.canEscalate || false,
            escalationTime: eventDef.escalationTime ? now + (eventDef.escalationTime * 1000) : undefined,
            relatedEvents: eventDef.relatedTo ? [] : undefined
          };

          return [...currentEvents, newEvent];
        }
      }

      return currentEvents;
    });
  }, [isEventAllowedForScenario]);

  const resolveEvent = (eventId: string, option: GameEventOption) => {
    if (option.requiresMinigame) {
        setActiveMinigame({ eventId, type: option.requiresMinigame });
        return;
    }
    applyEventResolution(eventId, option);
  };

  const completeMinigame = (success: boolean) => {
      if (!activeMinigame) return;
      const event = activeEventsRef.current.find(e => e.id === activeMinigame.eventId);
      if (event) {
          const option = event.options.find(o => o.requiresMinigame === activeMinigame.type);
          if (option) {
              const resultOption = buildMinigameResolutionOption(option, success);
              applyEventResolution(event.id, resultOption);
          }
      }
      setActiveMinigame(null);
  };

  const applyEventResolution = (eventId: string, option: GameEventOption) => {
    const event = activeEventsRef.current.find(e => e.id === eventId);
    if (!event) return;

    const isCorrect = option.isCorrect;
    const stressImpact = option.stressImpact;
    const baseCost = option.cost || 0;
    const cost = Math.max(0, Math.round(baseCost * permanentModifiersRef.current.costMultiplier));
    const scenario = currentScenarioRef.current;
    const activeEventsCount = activeEventsRef.current.length;
    const economyProfile = runtimeEconomyProfileRef.current;
    const economyStreakState = economyStreakRef.current;

    setStats(prev => {
       const budgetOutcome = getEventResolutionBudgetDelta(
         event.severity,
         isCorrect,
         cost,
         activeEventsCount,
         { stress: prev.stress, budget: prev.budget },
         economyProfile,
         economyStreakState
       );
       const newBudget = prev.budget + budgetOutcome.netBudgetDelta;
       let newStress = prev.stress;
       let newPublic = prev.publicInterest;
       let newClient = prev.clientSatisfaction;

       if (isCorrect) {
           const reductionMultiplier = scenario.difficulty === 'NORMAL' || scenario.isTutorial ? 1.5 : 1.2; 
           const residualStress = scenario.difficulty === 'NORMAL' ? 0 : stressImpact;
           
           newStress = Math.max(0, newStress - (15 * reductionMultiplier) + residualStress); 
           newClient = Math.min(100, newClient + 10); 
           newPublic = Math.min(100, newPublic + 10);
           eventCooldownsRef.current.set(event.title, Date.now() + 80000);
           
           setSystems(s => {
             const next = {
               ...s,
               [event.systemId]: { ...s[event.systemId], health: Math.min(100, s[event.systemId].health + 30) }
             };
             systemsRef.current = next;
             return next;
           });

       } else {
           newStress = Math.min(100, newStress + stressImpact);
           newPublic = Math.max(0, newPublic - 5);
           newClient = Math.max(0, newClient - 5);
           eventCooldownsRef.current.set(event.title, Date.now() + 40000); 
       }

       return {
           ...prev,
           stress: newStress,
           clientSatisfaction: newClient,
           publicInterest: newPublic,
           budget: newBudget
       };
    });

    const telemetry = sessionDirectorTelemetryRef.current;
    sessionDirectorTelemetryRef.current = {
      ...telemetry,
      resolvedEvents: isCorrect ? telemetry.resolvedEvents + 1 : telemetry.resolvedEvents,
      failedEvents: isCorrect ? telemetry.failedEvents : telemetry.failedEvents + 1,
      totalSpend: telemetry.totalSpend + cost,
      recentOutcomes: pushRecentOutcome(
        telemetry.recentOutcomes,
        isCorrect ? 'SUCCESS' : 'FAIL'
      )
    };
    economyStreakRef.current = isCorrect
      ? {
        ...economyStreakRef.current,
        eventSuccessStreak: economyStreakRef.current.eventSuccessStreak + 1,
        eventFailStreak: 0
      }
      : {
        ...economyStreakRef.current,
        eventSuccessStreak: 0,
        eventFailStreak: economyStreakRef.current.eventFailStreak + 1
      };

    eventResolutionCallbackRef.current?.({
      success: isCorrect,
      cost,
      systemId: event.systemId,
      severity: event.severity,
      eventTitle: event.title,
      eventId: event.id
    });

    setActiveEvents(prev => {
      const next = prev.filter(e => e.id !== eventId);
      activeEventsRef.current = next;
      return next;
    });
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    if (tutorialActive) return;

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const scenario = currentScenarioRef.current;
      const gameMode = currentGameModeRef.current;
      const crew = crewBonusRef.current;
      const currentEvents = activeEventsRef.current;
      const currentMission = activeMissionRef.current;
      const stressNow = statsRef.current.stress;
      const matchPhase = getMatchPhase(
        gameMode,
        statsRef.current.timeRemaining,
        getModeDuration(gameMode),
        stressNow
      );
      const phaseProfile = getPhaseDirectorProfile(
        scenario.difficulty,
        gameMode,
        matchPhase,
        stressNow
      );
      const sessionTelemetry = sessionDirectorTelemetryRef.current;
      const attemptsCount = sessionTelemetry.resolvedEvents + sessionTelemetry.failedEvents + sessionTelemetry.expiredEvents;
      const sessionTarget = getSessionDifficultyTarget(
        scenario.difficulty,
        sessionTelemetry,
        { stress: stressNow, budget: statsRef.current.budget },
        currentEvents.length,
        scenario.initialBudget + (crew === 'MORE_BUDGET' ? 2500 : 0)
      );
      const smoothedSessionTarget = clamp(
        (adaptiveDifficultyBiasRef.current * 0.88) + (sessionTarget * 0.12),
        -1,
        1
      );
      adaptiveDifficultyBiasRef.current = smoothedSessionTarget;
      const adaptiveAdjustments = getAdaptiveDirectorAdjustments(smoothedSessionTarget);
      const fatigueMetrics = getSessionFatigueMetrics(
        gameMode,
        statsRef.current.timeRemaining,
        getModeDuration(gameMode),
        sessionTelemetry,
        { stress: stressNow, budget: statsRef.current.budget },
        currentEvents.length
      );
      const bossMomentProfile = getScenarioBossMomentProfile(
        scenario.id,
        scenario.difficulty,
        gameMode,
        matchPhase,
        fatigueMetrics,
        currentEvents.length,
        attemptsCount
      );
      const runtimeDirectorProfileBase = composeDirectorProfile(phaseProfile, adaptiveAdjustments);
      const runtimeDirectorProfile = applyBossMomentToDirectorProfile(
        runtimeDirectorProfileBase,
        bossMomentProfile
      );
      runtimeDirectorRef.current = runtimeDirectorProfile;
      const economyProfileBase = getPhaseEconomyProfile(
        scenario.difficulty,
        gameMode,
        matchPhase,
        stressNow,
        {
          fatigueLevel: fatigueMetrics.fatigueLevel,
          pressureLevel: fatigueMetrics.pressureLevel
        }
      );
      const runtimeEconomyProfile = applyBossMomentToEconomyProfile(
        economyProfileBase,
        bossMomentProfile
      );
      runtimeEconomyProfileRef.current = runtimeEconomyProfile;
      const proceduralInjectionProfileBase = getProceduralInjectionProfile(
        scenario.difficulty,
        gameMode,
        fatigueMetrics,
        currentEvents.length
      );
      const proceduralInjectionProfile = applyBossMomentToProceduralProfile(
        proceduralInjectionProfileBase,
        bossMomentProfile
      );
      lastTickRef.current = now;

      // 0. SYSTEM MECHANICS UPDATE
      setSystems(prevSystems => {
        const nextSystems = { ...prevSystems };
        let totalPenalty = 0;
        const healPulseReady = now >= autoHealPulseRef.current;

        (Object.keys(nextSystems) as SystemType[]).forEach(key => {
          const sys = nextSystems[key];
          const hasEvents = currentEvents.some(e => e.systemId === key);
          const driftDirection = Math.random() > 0.5 ? 1 : -1;
          const eventMultiplier = hasEvents ? 2.5 : 1;
          const crewMultiplier = getCrewDriftMultiplier(crew);
          const noise = (Math.random() * sys.driftSpeed * eventMultiplier * crewMultiplier) * driftDirection;

          let newValue = sys.faderValue + noise;
          newValue = Math.max(0, Math.min(100, newValue));

          let healthDelta = 0;
          if (newValue >= 40 && newValue <= 60) {
            healthDelta = 0.3;
          } else if (newValue < 20 || newValue > 80) {
            healthDelta = -0.3;
            totalPenalty += 0.6;
          } else {
            healthDelta = -0.05;
          }

          if (healPulseReady && modifiersRef.current.autoHealPer5Seconds > 0 && sys.health < 100 && !hasEvents) {
            healthDelta += modifiersRef.current.autoHealPer5Seconds;
          }

          const nextHealth = Math.max(0, Math.min(100, sys.health + healthDelta));
          nextSystems[key] = {
            ...sys,
            faderValue: newValue,
            health: nextHealth,
            status: nextHealth < 30 ? 'CRITICAL' : nextHealth < 70 ? 'WARNING' : 'OK'
          };
        });

        if (totalPenalty > 0) {
          const stressMult = getCrewStressMultiplier(crew);
          const itemMult = modifiersRef.current.stressResist;
          const tutorialProtection = scenario.isTutorial ? 0.1 : 1.0;
          setStats(s => ({ ...s, stress: Math.min(100, s.stress + (totalPenalty * stressMult * itemMult * tutorialProtection)) }));
        }

        if (healPulseReady) {
          autoHealPulseRef.current = now + 5000;
        }

        systemsRef.current = nextSystems;
        return nextSystems;
      });

      // 1. MISSION LOGIC (CLIENT DEMANDS)
      const missionRespawnBase =
        scenario.difficulty === 'EXTREME' ? 7000 :
        scenario.difficulty === 'HARD' ? 8500 :
        10000;
      const missionRespawnModeMultiplier =
        gameMode === GameMode.SPEEDRUN ? 0.75 :
        gameMode === GameMode.HARDCORE ? 0.9 :
        1.0;
      const missionSuccessDelay = Math.round(
        missionRespawnBase * missionRespawnModeMultiplier * runtimeDirectorProfile.missionRespawnMultiplier
      );
      const missionFailDelay = Math.round(missionSuccessDelay * 0.8);
      const missionPool = getMissionPoolForScenario(scenario);
      const missionRewardPacingMultiplier = getMissionRewardPacingMultiplier(
        runtimeEconomyProfile,
        economyStreakRef.current,
        { stress: stressNow, budget: statsRef.current.budget },
        matchPhase,
        fatigueMetrics.fatigueLevel
      );

      if (currentMission) {
        const criteriaMet = currentMission.criteria.every(c => {
          const val = systemsRef.current[c.systemId].faderValue;
          const min = c.min ?? 0;
          const max = c.max ?? 100;
          return val >= min && val <= max;
        });

        if (criteriaMet) {
          const newProgress = currentMission.progress + 0.05;
          if (newProgress >= currentMission.holdDuration) {
            const missionReward = getMissionRewardCash(
              currentMission.rewardCash,
              scenario.difficulty,
              gameMode,
              currentEvents.length,
              statsRef.current.stress,
              permanentModifiersRef.current.rewardMultiplier
            );
            const pacedMissionReward = Math.max(
              60,
              Math.round(missionReward * missionRewardPacingMultiplier)
            );
            setStats(s => ({
              ...s,
              budget: s.budget + pacedMissionReward,
              clientSatisfaction: Math.min(100, s.clientSatisfaction + 15),
              publicInterest: Math.min(100, s.publicInterest + 10),
              stress: Math.max(0, s.stress - 10)
            }));
            economyStreakRef.current = {
              ...economyStreakRef.current,
              missionSuccessStreak: economyStreakRef.current.missionSuccessStreak + 1,
              missionFailStreak: 0
            };
            setActiveMission(null);
            activeMissionRef.current = null;
            nextMissionTimeRef.current = now + missionSuccessDelay;
          } else {
            setActiveMission(m => {
              if (!m) return null;
              const updated = { ...m, progress: newProgress };
              activeMissionRef.current = updated;
              return updated;
            });
          }
        }

        if (now > currentMission.expiresAt) {
          const missionTimeoutBudgetPenalty = getMissionTimeoutBudgetPenalty(
            currentMission,
            runtimeEconomyProfile,
            { stress: stressNow, budget: statsRef.current.budget }
          );
          setStats(s => ({
            ...s,
            clientSatisfaction: Math.max(0, s.clientSatisfaction - 15),
            stress: Math.min(100, s.stress + 10),
            budget: s.budget - missionTimeoutBudgetPenalty
          }));
          economyStreakRef.current = {
            ...economyStreakRef.current,
            missionSuccessStreak: 0,
            missionFailStreak: economyStreakRef.current.missionFailStreak + 1
          };
          setActiveMission(null);
          activeMissionRef.current = null;
          nextMissionTimeRef.current = now + missionFailDelay;
        }
      } else if (now > nextMissionTimeRef.current && !scenario.isTutorial) {
        if (missionPool.length === 0) {
          nextMissionTimeRef.current = now + 12000;
        } else {
          if (missionQueueRef.current.length === 0 || missionQueueIndexRef.current >= missionQueueRef.current.length) {
            refillMissionQueue(false);
          }
          const adaptivePick = pickAdaptiveMissionFromQueue(
            missionPool,
            missionQueueRef.current,
            missionQueueIndexRef.current,
            {
              systems: systemsRef.current,
              stats: { stress: stressNow, budget: statsRef.current.budget },
              phase: matchPhase,
              mode: gameMode,
              difficulty: scenario.difficulty
            },
            4
          );
          if (adaptivePick && adaptivePick.queueIndex !== missionQueueIndexRef.current) {
            const queue = missionQueueRef.current;
            [queue[missionQueueIndexRef.current], queue[adaptivePick.queueIndex]] = [queue[adaptivePick.queueIndex], queue[missionQueueIndexRef.current]];
          }
          const nextMissionId = missionQueueRef.current[missionQueueIndexRef.current];
          missionQueueIndexRef.current += 1;
          const missionDef = missionPool.find(mission => mission.id === nextMissionId) || missionPool[0];
          if (missionDef) {
            const missionTimeout = Math.max(
              missionDef.holdDuration + 5,
              Math.round(missionDef.timeout * permanentModifiersRef.current.missionTimeMultiplier)
            );
            const newMission: ActiveMission = {
              ...missionDef,
              startTime: now,
              expiresAt: now + (missionTimeout * 1000),
              progress: 0,
              isCompleted: false
            };
            setActiveMission(newMission);
            activeMissionRef.current = newMission;
          } else {
            nextMissionTimeRef.current = now + 12000;
          }
        }
      }


      // 2. Procedural Event Injection (offline-first local generator)
      if (now > aiCooldownRef.current && !isGeneratingEventsRef.current && !scenario.isTutorial) {
        const aiChanceBase = scenario.difficulty === 'NORMAL' ? 0.3 : 0.5;
        const modeBoostedChance = gameMode === GameMode.HARDCORE ? Math.min(0.8, aiChanceBase + 0.2) : aiChanceBase;
        const aiChance = clamp(modeBoostedChance * proceduralInjectionProfile.aiChanceMultiplier, 0.12, 0.88);
        if (Math.random() < aiChance) {
          const baseCooldown = scenario.difficulty === 'NORMAL' ? 35000 : 20000;
          const modeCooldown = gameMode === GameMode.SPEEDRUN ? 0.6 : gameMode === GameMode.HARDCORE ? 0.75 : 1;
          aiCooldownRef.current = now + Math.round(baseCooldown * modeCooldown * proceduralInjectionProfile.aiCooldownMultiplier);
          generateAIEvents(scenario.id)
            .then(newEvents => {
              if (newEvents.length === 0) return;
              setActiveEvents(prev => {
                const currentNow = Date.now();
                const activeTitles = new Set(prev.map(e => e.title));
                const uniqueNew = newEvents.filter(e => {
                  const onCooldown = (eventCooldownsRef.current.get(e.title) || 0) > currentNow;
                  return !activeTitles.has(e.title) && !onCooldown;
                });
                const selectedNewEvents = uniqueNew.slice(
                  0,
                  Math.max(1, Math.min(3, proceduralInjectionProfile.maxInjectedEvents))
                );
                const liveStress = statsRef.current.stress;
                const tunedNewEvents = selectedNewEvents.map(event => {
                  const baseRemainingMs = Math.max(2000, event.expiresAt - currentNow);
                  const adjustedRemainingMs = Math.round(
                    baseRemainingMs *
                    permanentModifiersRef.current.eventTimeMultiplier *
                    proceduralInjectionProfile.durationMultiplier
                  );
                  const criticalChance = clamp(
                    0.08 +
                    proceduralInjectionProfile.severityBias +
                    (liveStress >= 80 ? 0.05 : liveStress <= 30 ? -0.03 : 0),
                    0.03,
                    0.58
                  );
                  const warningChance = clamp(
                    0.54 + (proceduralInjectionProfile.severityBias * 0.45),
                    0.25,
                    0.78
                  );
                  const roll = Math.random();
                  const severity: 1 | 2 | 3 = roll < criticalChance ? 3 : roll < (criticalChance + warningChance) ? 2 : 1;
                  return {
                    ...event,
                    severity,
                    priority: event.priority || (severity === 3 ? 9 : severity === 2 ? 6 : 4),
                    expiresAt: currentNow + Math.max(2200, adjustedRemainingMs)
                  };
                });
                const next = [...prev, ...tunedNewEvents];
                activeEventsRef.current = next;
                return next;
              });
            })
            .catch(() => {
              // Ignore simulated AI generation errors.
            });
        } else {
          aiCooldownRef.current = now + proceduralInjectionProfile.idleRetryDelayMs;
        }
      }

      setStats(prev => {
        const scenarioNow = currentScenarioRef.current;
        const modeNow = currentGameModeRef.current;
        const crewNow = crewBonusRef.current;
        const systemsSnapshot = Object.values(systemsRef.current) as SystemState[];
        const eventsSnapshot = activeEventsRef.current as GameEvent[];

        // GAME OVER CONDITIONS
        const hasImmediateFailure = shouldTriggerImmediateGameOver(
          scenarioNow,
          modeNow,
          prev,
          systemsSnapshot,
          WIN_CONDITIONS
        );
        if (hasImmediateFailure) {
          setGameState(GameState.GAME_OVER);
          return prev;
        }

        const tutorialSafeStats = applyTutorialSafetyNet(scenarioNow, prev);
        const tutorialStress = tutorialSafeStats.stress;
        const tutorialBudget = tutorialSafeStats.budget;

        const timerEndOutcome = getTimerEndOutcome(modeNow, prev.timeRemaining, prev, WIN_CONDITIONS);
        if (timerEndOutcome) {
          if (timerEndOutcome === 'VICTORY') {

            setCareerData(currentCareer => {
              const safeCareer = normalizeCareerData(currentCareer);
              const newCareer: CareerData = {
                totalCash: safeCareer.totalCash + (prev.budget > 0 ? prev.budget : 0),
                completedScenarios: [...safeCareer.completedScenarios],
                highScores: { ...safeCareer.highScores },
                unlockedAchievements: safeCareer.unlockedAchievements,
                unlockedUpgrades: safeCareer.unlockedUpgrades,
                careerPoints: safeCareer.careerPoints,
                reputation: safeCareer.reputation
              };

              const isFirstTime = !newCareer.completedScenarios.includes(scenarioNow.id);

              if (isFirstTime) {
                newCareer.completedScenarios.push(scenarioNow.id);
              }

              const { pointsEarned, reputationEarned } = getScenarioCompletionRewards(scenarioNow.difficulty, isFirstTime, modeNow);
              newCareer.careerPoints += pointsEarned;
              newCareer.reputation += reputationEarned;
              const sessionScore = calculateScenarioScore(modeNow, scenarioNow.difficulty, prev, systemsSnapshot);
              const previousBest = newCareer.highScores[scenarioNow.id] || 0;
              if (sessionScore > previousBest) {
                newCareer.highScores[scenarioNow.id] = sessionScore;
              }
              const normalizedCareer = normalizeCareerData(newCareer);
              localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(normalizedCareer));
              return normalizedCareer;
            });

            setGameState(GameState.VICTORY);
          } else {
            setGameState(GameState.GAME_OVER);
          }
          return {
            ...prev,
            stress: tutorialStress,
            budget: tutorialBudget
          };
        }

        let newPublic = prev.publicInterest;
        let newClient = prev.clientSatisfaction;
        let newStress = tutorialStress;

        systemsSnapshot.forEach(sys => {
          if (sys.faderValue < 15 || sys.faderValue > 85) {
            newPublic -= 0.2;
            newClient -= 0.15;
            newStress += 0.05;
          } else if (sys.faderValue < 30 || sys.faderValue > 70) {
            newPublic -= 0.02;
            newClient -= 0.01;
          }
        });

        if (eventsSnapshot.length === 0) {
          newStress = Math.max(0, newStress - 0.5);
        } else {
          eventsSnapshot.forEach(e => {
            const factor = scenarioNow.difficulty === 'NORMAL' ? 0.005 : 0.01;
            const stressMult = getCrewStressMultiplier(crewNow);
            newStress += factor * e.severity * stressMult * permanentModifiersRef.current.activeEventStressMultiplier;
            newPublic -= 0.005 * e.severity;
          });
        }

        return {
          ...prev,
          budget: tutorialBudget,
          timeRemaining: modeNow === GameMode.ENDLESS
            ? prev.timeRemaining
            : Math.max(0, prev.timeRemaining - (modeNow === GameMode.SPEEDRUN ? 0.07 : 0.05)),
          publicInterest: Math.min(100, Math.max(0, newPublic)),
          clientSatisfaction: Math.min(100, Math.max(0, newClient)),
          stress: Math.min(100, Math.max(0, newStress)),
        };
      });

      // STATIC EVENT GENERATION CONTROL
      const activeEventCount = activeEventsRef.current.length;
      const baseConcurrencyCap = getEventConcurrencyCap(scenario.difficulty, gameMode, stressNow);
      const concurrencyCap = clamp(
        baseConcurrencyCap + runtimeDirectorProfile.concurrencyDelta,
        scenario.isTutorial ? 1 : 2,
        7
      );
      if (activeEventCount < concurrencyCap && now > nextStaticEventTimeRef.current) {
        const baseSpawnDelay = getStaticEventSpawnDelayMs(
          scenario.difficulty,
          gameMode,
          stressNow,
          activeEventCount
        );
        const spawnDelay = Math.max(3200, Math.round(baseSpawnDelay * runtimeDirectorProfile.spawnDelayMultiplier));
        nextStaticEventTimeRef.current = now + spawnDelay;
        generateStaticEvent();
      }

      setActiveEvents(prevEvents => {
        const currentNow = Date.now();
        const expired = prevEvents.filter(e => e.expiresAt < currentNow);
        const remaining = prevEvents.filter(e => e.expiresAt >= currentNow);
        
        const eventsToEscalate = remaining.filter(e => 
          e.canEscalate && 
          e.escalationTime && 
          currentNow >= e.escalationTime &&
          !e.escalatedFrom
        );

        if (expired.length > 0) {
          const expiredBudgetPenalty = getExpiredEventsBudgetPenalty(
            expired,
            remaining.length,
            runtimeEconomyProfile,
            stressNow
          );
          setStats(current => ({
            ...current,
            publicInterest: Math.max(0, current.publicInterest - 10),
            clientSatisfaction: Math.max(0, current.clientSatisfaction - 10),
            stress: Math.min(100, current.stress + 10),
            budget: current.budget - expiredBudgetPenalty
          }));
          
          setSystems(currSystems => {
            const newSystems = { ...currSystems };
            expired.forEach(ex => {
              const newHealth = Math.max(0, newSystems[ex.systemId].health - 20);
              newSystems[ex.systemId] = {
                ...newSystems[ex.systemId],
                health: newHealth,
                status: newHealth < 30 ? 'CRITICAL' : 'WARNING'
              };
            });
            systemsRef.current = newSystems;
            return newSystems;
          });
          expired.forEach(ex => eventCooldownsRef.current.set(ex.title, Date.now() + 60000));

          const telemetry = sessionDirectorTelemetryRef.current;
          let recentOutcomes = telemetry.recentOutcomes;
          const failBursts = Math.min(3, expired.length);
          for (let i = 0; i < failBursts; i += 1) {
            recentOutcomes = pushRecentOutcome(recentOutcomes, 'FAIL');
          }
          sessionDirectorTelemetryRef.current = {
            ...telemetry,
            failedEvents: telemetry.failedEvents + expired.length,
            expiredEvents: telemetry.expiredEvents + expired.length,
            recentOutcomes
          };
          const failBurst = Math.min(3, expired.length);
          economyStreakRef.current = {
            ...economyStreakRef.current,
            eventSuccessStreak: 0,
            eventFailStreak: economyStreakRef.current.eventFailStreak + failBurst
          };
        }
        
        if (eventsToEscalate.length > 0) {
          eventsToEscalate.forEach(event => {
            const escalatedEvent = createEscalatedEvent(event, SYSTEM_EVENTS[event.systemId], currentNow);
            if (escalatedEvent) {
              remaining.push(escalatedEvent);
            }
          });
          eventsToEscalate.forEach(e => {
            const index = remaining.findIndex(ev => ev.id === e.id);
            if (index >= 0) remaining.splice(index, 1);
          });
        }

        const cascadeSources = [...eventsToEscalate, ...expired]
          .sort((a, b) => {
            const priorityDelta = (b.priority || 0) - (a.priority || 0);
            if (priorityDelta !== 0) return priorityDelta;
            return b.severity - a.severity;
          });

        if (
          cascadeSources.length > 0 &&
          !scenario.isTutorial &&
          currentNow >= nextCascadeTimeRef.current &&
          remaining.length < concurrencyCap &&
          Math.random() < runtimeDirectorProfile.cascadeChance
        ) {
          const activeTitles = new Set<string>(remaining.map(event => event.title));

          for (const source of cascadeSources) {
            const sourceDefinition = SYSTEM_EVENTS[source.systemId].find(def => def.title === source.title);
            const targets = getCrossSystemCascadeTargets(
              source,
              sourceDefinition,
              SYSTEM_EVENTS,
              activeTitles,
              eventCooldownsRef.current,
              currentNow,
              (allowedScenarios) => isEventAllowedForScenario(allowedScenarios, scenario)
            );
            if (targets.length === 0) continue;

            const weightedTargets = targets.flatMap(target => {
              const weight = Math.max(1, Math.min(5, Math.round((target.definition.priority || 4) / 2)));
              return Array.from({ length: weight }, () => target);
            });
            const selectedTarget =
              weightedTargets[Math.floor(Math.random() * weightedTargets.length)] || targets[0];

            if (!selectedTarget) continue;

            const severityBonus = matchPhase === 'FINALE' ? 1 : 0;
            const cascadeEvent = createRelatedCascadeEvent(
              source,
              selectedTarget.systemId,
              selectedTarget.definition,
              currentNow,
              severityBonus
            );
            remaining.push(cascadeEvent);
            activeTitles.add(cascadeEvent.title);
            eventCooldownsRef.current.set(cascadeEvent.title, currentNow + 45000);

            const sourceIndex = remaining.findIndex(event => event.id === source.id);
            if (sourceIndex >= 0) {
              const sourceEvent = remaining[sourceIndex];
              const currentRelated = sourceEvent.relatedEvents || [];
              remaining[sourceIndex] = {
                ...sourceEvent,
                relatedEvents: [...currentRelated, cascadeEvent.id]
              };
            }

            nextCascadeTimeRef.current = currentNow + runtimeDirectorProfile.cascadeCooldownMs;
            break;
          }
        }

        activeEventsRef.current = remaining;
        return remaining;
      });

    }, 50);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, tutorialActive, generateStaticEvent, generateAIEvents]); 

  // Expose combo bonus callback - set it directly
  applyComboBonusRef.current = applyComboBonus;

  return {
    gameState,
    stats,
    systems,
    activeEvents,
    currentScenario,
    currentGameMode,
    pendingStartData,
    activeMinigame,
    careerData,
    inventory,
    activeMission, // Exported for UI
    tutorialActive,
    tutorialStepIndex,
    advanceTutorial,
    finishTutorial,
    initializeSession,
    buyItem,
    startGame,
    togglePause,
    quitGame,
    resolveEvent,
    completeMinigame,
    setGameState,
    handleFaderChange,
    applyComboBonus,
    setComboBonusCallback,
    setEventResolutionCallback,
    saveCareer // Fase 3: Expose for achievements/upgrades
  };
};
