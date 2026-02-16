import { describe, expect, it } from 'vitest';
import { GameMode } from '../types';
import {
  composeDirectorProfile,
  getAdaptiveDirectorAdjustments,
  getMatchPhase,
  getPhaseDirectorProfile,
  getPhaseEconomyProfile,
  getProceduralInjectionProfile,
  getSessionDifficultyTarget,
  getSessionFatigueMetrics,
  getMissionRewardPacingMultiplier
} from '../hooks/useGameLogic';

const DIFFICULTIES = ['NORMAL', 'HARD', 'EXTREME'] as const;
const MODES = [GameMode.NORMAL, GameMode.ENDLESS, GameMode.SPEEDRUN, GameMode.HARDCORE];

const makeRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
};

const toInt = (value: number, min: number, max: number) => {
  const span = max - min + 1;
  return min + Math.floor(value * span);
};

describe('Playtest Automation Regressions', () => {
  it('keeps director and economy outputs bounded through randomized session sweeps', () => {
    for (let seed = 1; seed <= 240; seed++) {
      const rand = makeRng(seed);
      const difficulty = DIFFICULTIES[toInt(rand(), 0, DIFFICULTIES.length - 1)];
      const mode = MODES[toInt(rand(), 0, MODES.length - 1)];
      const totalDuration = mode === GameMode.SPEEDRUN ? 90 : mode === GameMode.ENDLESS ? 3600 : 120;
      const timeRemaining = toInt(rand(), 0, totalDuration);

      const stats = {
        stress: toInt(rand(), 0, 100),
        budget: toInt(rand(), -2000, 12000)
      };
      const activeEvents = toInt(rand(), 0, 7);

      const telemetry = {
        resolvedEvents: toInt(rand(), 0, 48),
        failedEvents: toInt(rand(), 0, 30),
        expiredEvents: toInt(rand(), 0, 20),
        totalSpend: toInt(rand(), 0, 24000),
        recentOutcomes: Array.from(
          { length: toInt(rand(), 0, 8) },
          () => (rand() > 0.4 ? 'SUCCESS' : 'FAIL') as 'SUCCESS' | 'FAIL'
        )
      };

      const phase = getMatchPhase(mode, timeRemaining, totalDuration, stats.stress);
      const baseProfile = getPhaseDirectorProfile(difficulty, mode, phase, stats.stress);
      const target = getSessionDifficultyTarget(
        difficulty,
        telemetry,
        stats,
        activeEvents,
        Math.max(1000, toInt(rand(), 1000, 12000))
      );
      const adaptive = getAdaptiveDirectorAdjustments(target);
      const runtimeProfile = composeDirectorProfile(baseProfile, adaptive);

      const fatigue = getSessionFatigueMetrics(
        mode,
        timeRemaining,
        totalDuration,
        telemetry,
        stats,
        activeEvents
      );
      const procedural = getProceduralInjectionProfile(difficulty, mode, fatigue, activeEvents);
      const economy = getPhaseEconomyProfile(difficulty, mode, phase, stats.stress, fatigue);
      const missionPacing = getMissionRewardPacingMultiplier(
        economy,
        {
          missionSuccessStreak: toInt(rand(), 0, 8),
          missionFailStreak: toInt(rand(), 0, 6)
        },
        stats,
        phase,
        fatigue.fatigueLevel
      );

      expect(Number.isFinite(target)).toBe(true);
      expect(target).toBeGreaterThanOrEqual(-1);
      expect(target).toBeLessThanOrEqual(1);

      expect(runtimeProfile.spawnDelayMultiplier).toBeGreaterThanOrEqual(0.58);
      expect(runtimeProfile.spawnDelayMultiplier).toBeLessThanOrEqual(1.34);
      expect(runtimeProfile.cascadeChance).toBeGreaterThanOrEqual(0.04);
      expect(runtimeProfile.cascadeChance).toBeLessThanOrEqual(0.78);
      expect(runtimeProfile.cascadeCooldownMs).toBeGreaterThanOrEqual(5000);
      expect(runtimeProfile.cascadeCooldownMs).toBeLessThanOrEqual(24000);

      expect(fatigue.fatigueLevel).toBeGreaterThanOrEqual(0);
      expect(fatigue.fatigueLevel).toBeLessThanOrEqual(1);
      expect(procedural.aiChanceMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(procedural.aiChanceMultiplier).toBeLessThanOrEqual(1.5);
      expect(procedural.maxInjectedEvents).toBeGreaterThanOrEqual(1);
      expect(procedural.maxInjectedEvents).toBeLessThanOrEqual(2);

      expect(economy.missionRewardMultiplier).toBeGreaterThanOrEqual(0.82);
      expect(economy.missionRewardMultiplier).toBeLessThanOrEqual(1.48);
      expect(economy.failurePenaltyMultiplier).toBeGreaterThanOrEqual(0.55);
      expect(economy.failurePenaltyMultiplier).toBeLessThanOrEqual(1.45);
      expect(missionPacing).toBeGreaterThanOrEqual(0.72);
      expect(missionPacing).toBeLessThanOrEqual(1.72);
    }
  });

  it('keeps stable outputs on deterministic extreme crisis input', () => {
    const telemetry = {
      resolvedEvents: 2,
      failedEvents: 18,
      expiredEvents: 12,
      totalSpend: 18000,
      recentOutcomes: ['FAIL', 'FAIL', 'FAIL', 'SUCCESS', 'FAIL', 'FAIL', 'FAIL', 'FAIL'] as Array<'SUCCESS' | 'FAIL'>
    };

    const phase = getMatchPhase(GameMode.HARDCORE, 8, 120, 97);
    const baseProfile = getPhaseDirectorProfile('EXTREME', GameMode.HARDCORE, phase, 97);
    const target = getSessionDifficultyTarget('EXTREME', telemetry, { stress: 97, budget: -1200 }, 6, 4200);
    const adaptive = getAdaptiveDirectorAdjustments(target);
    const runtimeProfile = composeDirectorProfile(baseProfile, adaptive);

    expect(phase).toBe('FINALE');
    expect(target).toBeLessThanOrEqual(0);
    expect(runtimeProfile.concurrencyDelta).toBeGreaterThanOrEqual(-2);
    expect(runtimeProfile.concurrencyDelta).toBeLessThanOrEqual(2);
    expect(runtimeProfile.cascadeChance).toBeLessThanOrEqual(0.78);
  });
});
