import { describe, expect, it } from 'vitest';
import { GameMode, GameEventOption, SystemType } from '../types';
import {
  buildMinigameResolutionOption,
  applyBossMomentToDirectorProfile,
  applyBossMomentToEconomyProfile,
  applyBossMomentToProceduralProfile,
  calculateScenarioScore,
  composeDirectorProfile,
  createRelatedCascadeEvent,
  createEscalatedEvent,
  getEventResolutionBudgetDelta,
  getAdaptiveDirectorAdjustments,
  getEventConcurrencyCap,
  getCrossSystemCascadeTargets,
  getCrewAutoHealPer5Seconds,
  getCrewDriftMultiplier,
  getCrewStressMultiplier,
  getExpiredEventsBudgetPenalty,
  getMatchPhase,
  getMissionComplexityScore,
  getMissionRewardCash,
  getMissionRewardPacingMultiplier,
  getMissionSystemFitScore,
  getMissionTargetComplexity,
  getMissionTimeoutBudgetPenalty,
  getPhaseEconomyProfile,
  getPhaseDirectorProfile,
  getProceduralInjectionProfile,
  getScenarioBossMomentProfile,
  getSessionDifficultyTarget,
  getSessionFatigueMetrics,
  pickAdaptiveMissionFromQueue,
  getScenarioCompletionRewards,
  getStaticEventSeverityChance,
  getStaticEventSpawnDelayMs,
} from '../hooks/useGameLogic';
import { shouldRunFinalAchievementCheck } from '../hooks/useAchievementSystem';

describe('Game Logic Regressions', () => {
  it('forces failed minigame options to be incorrect and stressful', () => {
    const option: GameEventOption = {
      label: 'Ajustar frecuencias',
      isCorrect: true,
      stressImpact: -8,
      requiresMinigame: 'FREQUENCY'
    };

    const failed = buildMinigameResolutionOption(option, false);

    expect(failed.isCorrect).toBe(false);
    expect(failed.stressImpact).toBe(10);
  });

  it('keeps successful minigame options unchanged', () => {
    const option: GameEventOption = {
      label: 'Reparar cable',
      isCorrect: true,
      stressImpact: -5,
      requiresMinigame: 'CABLES'
    };

    const success = buildMinigameResolutionOption(option, true);

    expect(success).toBe(option);
  });

  it('scales completion rewards by mode without dropping below 1', () => {
    const normal = getScenarioCompletionRewards('HARD', true, GameMode.NORMAL);
    const hardcore = getScenarioCompletionRewards('HARD', true, GameMode.HARDCORE);
    const endless = getScenarioCompletionRewards('TUTORIAL', false, GameMode.ENDLESS);

    expect(hardcore.pointsEarned).toBeGreaterThan(normal.pointsEarned);
    expect(hardcore.reputationEarned).toBeGreaterThan(normal.reputationEarned);
    expect(endless.pointsEarned).toBeGreaterThanOrEqual(1);
    expect(endless.reputationEarned).toBeGreaterThanOrEqual(1);
  });

  it('runs final achievement check only when session transitions from playing to stopped', () => {
    expect(shouldRunFinalAchievementCheck(true, false)).toBe(true);
    expect(shouldRunFinalAchievementCheck(false, false)).toBe(false);
    expect(shouldRunFinalAchievementCheck(false, true)).toBe(false);
    expect(shouldRunFinalAchievementCheck(true, true)).toBe(false);
  });

  it('matches crew bonus multipliers with the UI descriptions', () => {
    expect(getCrewDriftMultiplier('LESS_DRIFT')).toBe(0.85);
    expect(getCrewStressMultiplier('SLOW_STRESS')).toBe(0.8);
    expect(getCrewAutoHealPer5Seconds('AUTO_REPAIR_SLOW')).toBe(0.5);

    expect(getCrewDriftMultiplier(null)).toBe(1);
    expect(getCrewStressMultiplier('MORE_BUDGET')).toBe(1);
    expect(getCrewAutoHealPer5Seconds('LESS_DRIFT')).toBe(0);
  });

  it('calculates scenario score with mode/difficulty scaling and stability impact', () => {
    const healthySystems = [
      { id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 },
      { id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 },
      { id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 },
      { id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 }
    ];
    const damagedSystems = healthySystems.map(system => ({
      ...system,
      health: 40,
      status: 'WARNING' as const
    }));

    const baselineStats = {
      publicInterest: 80,
      clientSatisfaction: 78,
      stress: 25,
      budget: 5000
    };

    const normalScore = calculateScenarioScore(GameMode.NORMAL, 'NORMAL', baselineStats, healthySystems);
    const hardcoreExtreme = calculateScenarioScore(GameMode.HARDCORE, 'EXTREME', baselineStats, healthySystems);
    const unstableScore = calculateScenarioScore(GameMode.NORMAL, 'NORMAL', baselineStats, damagedSystems);

    expect(hardcoreExtreme).toBeGreaterThan(normalScore);
    expect(normalScore).toBeGreaterThan(unstableScore);
    expect(calculateScenarioScore(GameMode.ENDLESS, 'TUTORIAL', {
      publicInterest: -50,
      clientSatisfaction: -20,
      stress: 999,
      budget: -300
    }, [])).toBeGreaterThanOrEqual(1);
  });

  it('adapts event concurrency cap by difficulty, mode and stress', () => {
    expect(getEventConcurrencyCap('NORMAL', GameMode.NORMAL, 10)).toBe(2);
    expect(getEventConcurrencyCap('HARD', GameMode.SPEEDRUN, 85)).toBe(6);
    expect(getEventConcurrencyCap('EXTREME', GameMode.HARDCORE, 90)).toBe(6);
  });

  it('raises severity chance under pressure and clamps to safe bounds', () => {
    const calm = getStaticEventSeverityChance('NORMAL', GameMode.NORMAL, 10, 0);
    const crisis = getStaticEventSeverityChance('EXTREME', GameMode.HARDCORE, 95, 1);
    const overloaded = getStaticEventSeverityChance('HARD', GameMode.NORMAL, 70, 5);

    expect(calm).toBeGreaterThanOrEqual(0.05);
    expect(crisis).toBeLessThanOrEqual(0.9);
    expect(crisis).toBeGreaterThan(calm);
    expect(overloaded).toBeLessThan(crisis);
  });

  it('shortens static spawn delay in high-pressure speedrun contexts', () => {
    const calmDelay = getStaticEventSpawnDelayMs('NORMAL', GameMode.NORMAL, 20, 1, 0.5);
    const highPressureDelay = getStaticEventSpawnDelayMs('HARD', GameMode.SPEEDRUN, 90, 2, 0.5);
    const overloadedDelay = getStaticEventSpawnDelayMs('HARD', GameMode.SPEEDRUN, 90, 5, 0.5);

    expect(highPressureDelay).toBeLessThan(calmDelay);
    expect(overloadedDelay).toBeGreaterThanOrEqual(highPressureDelay);
    expect(highPressureDelay).toBeGreaterThanOrEqual(3500);
  });

  it('scales mission rewards by difficulty, mode and live pressure', () => {
    const base = getMissionRewardCash(1000, 'NORMAL', GameMode.NORMAL, 0, 20, 1);
    const intense = getMissionRewardCash(1000, 'EXTREME', GameMode.HARDCORE, 4, 80, 1);
    const upgraded = getMissionRewardCash(1000, 'EXTREME', GameMode.HARDCORE, 4, 80, 1.2);

    expect(intense).toBeGreaterThan(base);
    expect(upgraded).toBeGreaterThan(intense);
  });

  it('creates escalated events with upgraded severity and metadata', () => {
    const now = 10000;
    const baseEvent = {
      id: 'evt_base',
      systemId: SystemType.SOUND,
      title: 'Fallo Micrófono Principal',
      description: 'Micrófono principal dejó de funcionar',
      severity: 2 as const,
      expiresAt: 19000,
      correctAction: '',
      options: [{ label: 'Reemplazar micro', isCorrect: true, stressImpact: -4 }]
    };
    const definitions = [
      {
        title: 'Fallo Micrófono Principal',
        description: 'Micrófono principal dejó de funcionar',
        escalationEvent: 'Pérdida Total de Audio',
        escalationTime: 10,
        canEscalate: true,
        options: [{ label: 'Reemplazar micro', isCorrect: true, stressImpact: -4 }]
      },
      {
        title: 'Pérdida Total de Audio',
        description: 'No hay señal de audio en PA',
        priority: 10,
        canEscalate: false,
        options: [{ label: 'Conmutar backup', isCorrect: true, stressImpact: -10 }]
      }
    ];

    const escalated = createEscalatedEvent(baseEvent, definitions, now, () => 'evt_escalated');

    expect(escalated).toEqual({
      id: 'evt_escalated',
      systemId: SystemType.SOUND,
      title: 'Pérdida Total de Audio',
      description: 'No hay señal de audio en PA (Escalado desde: Fallo Micrófono Principal)',
      severity: 3,
      expiresAt: 19000,
      correctAction: '',
      options: [{ label: 'Conmutar backup', isCorrect: true, stressImpact: -10 }],
      priority: 10,
      canEscalate: false,
      escalatedFrom: 'evt_base',
      relatedEvents: ['evt_base']
    });
  });

  it('returns null when escalation definition is missing', () => {
    const baseEvent = {
      id: 'evt_base',
      systemId: SystemType.LIGHTS,
      title: 'Sin Escalación',
      description: 'Evento aislado',
      severity: 1 as const,
      expiresAt: 20000,
      correctAction: '',
      options: [{ label: 'OK', isCorrect: true, stressImpact: -1 }]
    };

    const noTarget = createEscalatedEvent(baseEvent, [{
      title: 'Sin Escalación',
      description: 'Evento aislado',
      escalationEvent: 'No Existe',
      options: [{ label: 'OK', isCorrect: true, stressImpact: -1 }]
    }], 10000, () => 'id_x');

    const noEscalation = createEscalatedEvent(baseEvent, [{
      title: 'Sin Escalación',
      description: 'Evento aislado',
      options: [{ label: 'OK', isCorrect: true, stressImpact: -1 }]
    }], 10000, () => 'id_y');

    expect(noTarget).toBeNull();
    expect(noEscalation).toBeNull();
  });

  it('maps game phase from time progression and endless stress bands', () => {
    expect(getMatchPhase(GameMode.NORMAL, 110, 120, 20)).toBe('OPENING');
    expect(getMatchPhase(GameMode.NORMAL, 70, 120, 35)).toBe('MIDGAME');
    expect(getMatchPhase(GameMode.NORMAL, 15, 120, 40)).toBe('FINALE');

    expect(getMatchPhase(GameMode.ENDLESS, 3600, 3600, 30)).toBe('OPENING');
    expect(getMatchPhase(GameMode.ENDLESS, 3600, 3600, 60)).toBe('MIDGAME');
    expect(getMatchPhase(GameMode.ENDLESS, 3600, 3600, 90)).toBe('FINALE');
  });

  it('intensifies phase director profile towards finale while preserving safe bounds', () => {
    const opening = getPhaseDirectorProfile('HARD', GameMode.NORMAL, 'OPENING', 40);
    const finale = getPhaseDirectorProfile('HARD', GameMode.NORMAL, 'FINALE', 85);
    const tutorial = getPhaseDirectorProfile('TUTORIAL', GameMode.NORMAL, 'FINALE', 90);

    expect(finale.spawnDelayMultiplier).toBeLessThan(opening.spawnDelayMultiplier);
    expect(finale.severityDelta).toBeGreaterThan(opening.severityDelta);
    expect(finale.cascadeChance).toBeGreaterThan(opening.cascadeChance);
    expect(finale.concurrencyDelta).toBeGreaterThanOrEqual(opening.concurrencyDelta);
    expect(tutorial.cascadeChance).toBe(0);
  });

  it('drives adaptive difficulty target down when session is under pressure', () => {
    const pressured = getSessionDifficultyTarget(
      'HARD',
      {
        resolvedEvents: 3,
        failedEvents: 6,
        expiredEvents: 2,
        totalSpend: 2200,
        recentOutcomes: ['FAIL', 'FAIL', 'SUCCESS', 'FAIL', 'FAIL']
      },
      { stress: 88, budget: 900 },
      5,
      6000
    );

    const stable = getSessionDifficultyTarget(
      'HARD',
      {
        resolvedEvents: 8,
        failedEvents: 1,
        expiredEvents: 0,
        totalSpend: 900,
        recentOutcomes: ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAIL']
      },
      { stress: 42, budget: 5200 },
      1,
      6000
    );

    expect(pressured).toBeLessThan(0);
    expect(stable).toBeGreaterThan(pressured);
  });

  it('returns adaptive director adjustments and composes them with phase profile', () => {
    const easier = getAdaptiveDirectorAdjustments(-0.8);
    const harder = getAdaptiveDirectorAdjustments(0.8);
    const base = getPhaseDirectorProfile('EXTREME', GameMode.HARDCORE, 'MIDGAME', 70);
    const composedHard = composeDirectorProfile(base, harder);
    const composedEasy = composeDirectorProfile(base, easier);

    expect(harder.spawnDelayMultiplier).toBeLessThan(1);
    expect(easier.spawnDelayMultiplier).toBeGreaterThan(1);
    expect(composedHard.spawnDelayMultiplier).toBeLessThan(base.spawnDelayMultiplier);
    expect(composedHard.cascadeChance).toBeGreaterThanOrEqual(base.cascadeChance);
    expect(composedEasy.severityDelta).toBeLessThanOrEqual(base.severityDelta);
  });

  it('computes session fatigue metrics from progress, pressure and recent failures', () => {
    const earlyCalm = getSessionFatigueMetrics(
      GameMode.NORMAL,
      105,
      120,
      {
        resolvedEvents: 4,
        failedEvents: 0,
        expiredEvents: 0,
        totalSpend: 500,
        recentOutcomes: ['SUCCESS', 'SUCCESS', 'SUCCESS']
      },
      { stress: 28, budget: 4200 },
      1
    );
    const lateOverloaded = getSessionFatigueMetrics(
      GameMode.NORMAL,
      15,
      120,
      {
        resolvedEvents: 9,
        failedEvents: 6,
        expiredEvents: 3,
        totalSpend: 2800,
        recentOutcomes: ['FAIL', 'FAIL', 'SUCCESS', 'FAIL', 'FAIL']
      },
      { stress: 88, budget: 900 },
      5
    );

    expect(lateOverloaded.progressRatio).toBeGreaterThan(earlyCalm.progressRatio);
    expect(lateOverloaded.pressureLevel).toBeGreaterThan(earlyCalm.pressureLevel);
    expect(lateOverloaded.fatigueLevel).toBeGreaterThan(earlyCalm.fatigueLevel);
  });

  it('rebalances procedural injection profile between overload suppression and late-session climax', () => {
    const overloadProfile = getProceduralInjectionProfile(
      'EXTREME',
      GameMode.HARDCORE,
      {
        progressRatio: 0.86,
        pressureLevel: 0.82,
        recentFailRate: 0.7,
        fatigueLevel: 0.88
      },
      5
    );
    const climaxProfile = getProceduralInjectionProfile(
      'EXTREME',
      GameMode.HARDCORE,
      {
        progressRatio: 0.86,
        pressureLevel: 0.38,
        recentFailRate: 0.2,
        fatigueLevel: 0.82
      },
      2
    );

    expect(overloadProfile.maxInjectedEvents).toBe(1);
    expect(overloadProfile.aiCooldownMultiplier).toBeGreaterThan(climaxProfile.aiCooldownMultiplier);
    expect(overloadProfile.aiChanceMultiplier).toBeLessThan(climaxProfile.aiChanceMultiplier);
    expect(overloadProfile.durationMultiplier).toBeGreaterThan(climaxProfile.durationMultiplier);
  });

  it('keeps procedural profile conservative in tutorial contexts', () => {
    const tutorialProfile = getProceduralInjectionProfile(
      'TUTORIAL',
      GameMode.NORMAL,
      {
        progressRatio: 0.9,
        pressureLevel: 0.9,
        recentFailRate: 0.9,
        fatigueLevel: 0.95
      },
      4
    );

    expect(tutorialProfile.maxInjectedEvents).toBe(1);
    expect(tutorialProfile.aiChanceMultiplier).toBeLessThan(1);
    expect(tutorialProfile.aiCooldownMultiplier).toBeGreaterThan(1);
    expect(tutorialProfile.severityBias).toBeLessThan(0);
  });

  it('activates scenario boss moments near finale beats and recovers right after', () => {
    const activeBoss = getScenarioBossMomentProfile(
      'FESTIVAL',
      'HARD',
      GameMode.NORMAL,
      'FINALE',
      {
        progressRatio: 0.79,
        pressureLevel: 0.42,
        recentFailRate: 0.2,
        fatigueLevel: 0.74
      },
      2,
      12
    );
    const recoveryBoss = getScenarioBossMomentProfile(
      'FESTIVAL',
      'HARD',
      GameMode.NORMAL,
      'FINALE',
      {
        progressRatio: 0.84,
        pressureLevel: 0.42,
        recentFailRate: 0.2,
        fatigueLevel: 0.74
      },
      2,
      12
    );

    expect(activeBoss.active).toBe(true);
    expect(activeBoss.recovery).toBe(false);
    expect(activeBoss.severityDelta).toBeGreaterThan(0);
    expect(activeBoss.aiChanceMultiplier).toBeGreaterThan(1);

    expect(recoveryBoss.active).toBe(false);
    expect(recoveryBoss.recovery).toBe(true);
    expect(recoveryBoss.severityDelta).toBeLessThan(0);
    expect(recoveryBoss.aiCooldownMultiplier).toBeGreaterThan(1);
  });

  it('skips boss moments outside finale phase and unknown scenario beats', () => {
    const midgameBoss = getScenarioBossMomentProfile(
      'FESTIVAL',
      'HARD',
      GameMode.NORMAL,
      'MIDGAME',
      {
        progressRatio: 0.79,
        pressureLevel: 0.42,
        recentFailRate: 0.2,
        fatigueLevel: 0.74
      },
      2,
      12
    );
    const unknownBoss = getScenarioBossMomentProfile(
      'CUSTOM_SCENARIO',
      'HARD',
      GameMode.NORMAL,
      'FINALE',
      {
        progressRatio: 0.79,
        pressureLevel: 0.42,
        recentFailRate: 0.2,
        fatigueLevel: 0.74
      },
      2,
      12
    );

    expect(midgameBoss.active).toBe(false);
    expect(midgameBoss.recovery).toBe(false);
    expect(unknownBoss.active).toBe(false);
    expect(unknownBoss.recovery).toBe(false);
  });

  it('applies boss profile deltas to director and procedural pacing', () => {
    const baseDirector = getPhaseDirectorProfile('EXTREME', GameMode.HARDCORE, 'FINALE', 72);
    const activeBoss = getScenarioBossMomentProfile(
      'WORLD_TOUR',
      'EXTREME',
      GameMode.HARDCORE,
      'FINALE',
      {
        progressRatio: 0.82,
        pressureLevel: 0.5,
        recentFailRate: 0.18,
        fatigueLevel: 0.82
      },
      2,
      18
    );
    const directed = applyBossMomentToDirectorProfile(baseDirector, activeBoss);

    const proceduralBase = getProceduralInjectionProfile(
      'EXTREME',
      GameMode.HARDCORE,
      {
        progressRatio: 0.82,
        pressureLevel: 0.5,
        recentFailRate: 0.18,
        fatigueLevel: 0.82
      },
      2
    );
    const proceduralBossed = applyBossMomentToProceduralProfile(proceduralBase, activeBoss);

    expect(directed.spawnDelayMultiplier).toBeLessThan(baseDirector.spawnDelayMultiplier);
    expect(directed.cascadeChance).toBeGreaterThanOrEqual(baseDirector.cascadeChance);
    expect(proceduralBossed.aiChanceMultiplier).toBeGreaterThanOrEqual(proceduralBase.aiChanceMultiplier);
    expect(proceduralBossed.aiCooldownMultiplier).toBeLessThanOrEqual(proceduralBase.aiCooldownMultiplier);
  });

  it('scales economy profile by phase pressure and applies boss deltas', () => {
    const calmOpening = getPhaseEconomyProfile(
      'NORMAL',
      GameMode.NORMAL,
      'OPENING',
      35,
      { fatigueLevel: 0.25, pressureLevel: 0.22 }
    );
    const pressuredFinale = getPhaseEconomyProfile(
      'EXTREME',
      GameMode.HARDCORE,
      'FINALE',
      86,
      { fatigueLevel: 0.86, pressureLevel: 0.82 }
    );

    const activeBoss = getScenarioBossMomentProfile(
      'WORLD_TOUR',
      'EXTREME',
      GameMode.HARDCORE,
      'FINALE',
      {
        progressRatio: 0.82,
        pressureLevel: 0.5,
        recentFailRate: 0.18,
        fatigueLevel: 0.82
      },
      2,
      18
    );
    const bossEconomy = applyBossMomentToEconomyProfile(pressuredFinale, activeBoss);

    expect(pressuredFinale.missionRewardMultiplier).toBeGreaterThan(calmOpening.missionRewardMultiplier);
    expect(pressuredFinale.failurePenaltyMultiplier).toBeLessThanOrEqual(pressuredFinale.expiryPenaltyMultiplier);
    expect(bossEconomy.eventRewardMultiplier).toBeGreaterThanOrEqual(pressuredFinale.eventRewardMultiplier);
  });

  it('balances event economy outcomes between reward and penalty paths', () => {
    const economyProfile = getPhaseEconomyProfile(
      'HARD',
      GameMode.NORMAL,
      'MIDGAME',
      62,
      { fatigueLevel: 0.56, pressureLevel: 0.52 }
    );
    const success = getEventResolutionBudgetDelta(
      3,
      true,
      120,
      3,
      { stress: 72, budget: 900 },
      economyProfile,
      { eventSuccessStreak: 3, eventFailStreak: 0 }
    );
    const failure = getEventResolutionBudgetDelta(
      3,
      false,
      120,
      3,
      { stress: 72, budget: 900 },
      economyProfile,
      { eventSuccessStreak: 0, eventFailStreak: 2 }
    );

    expect(success.rewardCash).toBeGreaterThan(0);
    expect(success.netBudgetDelta).toBeGreaterThan(-120);
    expect(failure.penaltyCash).toBeGreaterThan(0);
    expect(failure.netBudgetDelta).toBeLessThan(-120);
  });

  it('paces mission rewards and timeout penalties with streak and economy pressure', () => {
    const economyProfile = getPhaseEconomyProfile(
      'EXTREME',
      GameMode.HARDCORE,
      'FINALE',
      82,
      { fatigueLevel: 0.84, pressureLevel: 0.7 }
    );
    const paced = getMissionRewardPacingMultiplier(
      economyProfile,
      { missionSuccessStreak: 3, missionFailStreak: 1 },
      { stress: 84, budget: 700 },
      'FINALE',
      0.84
    );
    const timeoutPenalty = getMissionTimeoutBudgetPenalty(
      {
        criteria: [
          { systemId: SystemType.SOUND, min: 45, max: 60 },
          { systemId: SystemType.LIGHTS, min: 45, max: 60 }
        ],
        rewardCash: 1300
      },
      economyProfile,
      { stress: 84, budget: 700 }
    );

    expect(paced).toBeGreaterThan(1);
    expect(timeoutPenalty).toBeGreaterThan(0);
  });

  it('applies expiry budget penalties by severity and live load', () => {
    const economyProfile = getPhaseEconomyProfile(
      'HARD',
      GameMode.SPEEDRUN,
      'FINALE',
      78,
      { fatigueLevel: 0.72, pressureLevel: 0.68 }
    );
    const lowSeverityPenalty = getExpiredEventsBudgetPenalty(
      [{
        id: 'exp_1',
        systemId: SystemType.SOUND,
        title: 'A',
        description: 'A',
        severity: 1,
        expiresAt: 0,
        correctAction: '',
        options: [{ label: 'x', isCorrect: true, stressImpact: -1 }]
      }],
      2,
      economyProfile,
      78
    );
    const highSeverityPenalty = getExpiredEventsBudgetPenalty(
      [{
        id: 'exp_2',
        systemId: SystemType.SOUND,
        title: 'B',
        description: 'B',
        severity: 3,
        expiresAt: 0,
        correctAction: '',
        options: [{ label: 'x', isCorrect: true, stressImpact: -1 }]
      }],
      5,
      economyProfile,
      78
    );

    expect(lowSeverityPenalty).toBeGreaterThan(0);
    expect(highSeverityPenalty).toBeGreaterThan(lowSeverityPenalty);
  });

  it('scores mission complexity higher for tighter and denser objectives', () => {
    const basicMission = {
      id: 'basic',
      title: 'Básica',
      description: 'Una sola banda amplia',
      criteria: [{ systemId: SystemType.SOUND, min: 40, max: 70 }],
      holdDuration: 8,
      timeout: 45,
      rewardCash: 400
    };
    const advancedMission = {
      id: 'advanced',
      title: 'Avanzada',
      description: 'Múltiples bandas estrechas',
      criteria: [
        { systemId: SystemType.SOUND, min: 49, max: 55 },
        { systemId: SystemType.LIGHTS, min: 52, max: 58 },
        { systemId: SystemType.VIDEO, min: 50, max: 56 }
      ],
      holdDuration: 16,
      timeout: 30,
      rewardCash: 1400
    };

    expect(getMissionComplexityScore(advancedMission)).toBeGreaterThan(getMissionComplexityScore(basicMission));
  });

  it('computes higher mission fit when systems are already close to criteria', () => {
    const mission = {
      id: 'fit_check',
      title: 'Fit',
      description: 'Verifica fit',
      criteria: [
        { systemId: SystemType.SOUND, min: 48, max: 56 },
        { systemId: SystemType.LIGHTS, min: 50, max: 60 }
      ],
      holdDuration: 12,
      timeout: 35,
      rewardCash: 800
    };

    const closeSystems = {
      [SystemType.SOUND]: { id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK' as const, faderValue: 52, stability: 100, driftSpeed: 1 },
      [SystemType.LIGHTS]: { id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK' as const, faderValue: 55, stability: 100, driftSpeed: 1 },
      [SystemType.VIDEO]: { id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 },
      [SystemType.STAGE]: { id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 }
    };
    const farSystems = {
      [SystemType.SOUND]: { id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK' as const, faderValue: 20, stability: 100, driftSpeed: 1 },
      [SystemType.LIGHTS]: { id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK' as const, faderValue: 85, stability: 100, driftSpeed: 1 },
      [SystemType.VIDEO]: { id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 },
      [SystemType.STAGE]: { id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK' as const, faderValue: 50, stability: 100, driftSpeed: 1 }
    };

    expect(getMissionSystemFitScore(mission, closeSystems)).toBeGreaterThan(getMissionSystemFitScore(mission, farSystems));
  });

  it('reduces target mission complexity under high stress and low budget', () => {
    const calmTarget = getMissionTargetComplexity({
      systems: {
        [SystemType.SOUND]: { id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
        [SystemType.LIGHTS]: { id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
        [SystemType.VIDEO]: { id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
        [SystemType.STAGE]: { id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 }
      },
      stats: { stress: 35, budget: 7000 },
      phase: 'FINALE',
      mode: GameMode.HARDCORE,
      difficulty: 'EXTREME'
    });
    const crisisTarget = getMissionTargetComplexity({
      systems: {
        [SystemType.SOUND]: { id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK', faderValue: 20, stability: 100, driftSpeed: 1 },
        [SystemType.LIGHTS]: { id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK', faderValue: 80, stability: 100, driftSpeed: 1 },
        [SystemType.VIDEO]: { id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK', faderValue: 25, stability: 100, driftSpeed: 1 },
        [SystemType.STAGE]: { id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK', faderValue: 75, stability: 100, driftSpeed: 1 }
      },
      stats: { stress: 90, budget: 800 },
      phase: 'FINALE',
      mode: GameMode.HARDCORE,
      difficulty: 'EXTREME'
    });

    expect(crisisTarget).toBeLessThan(calmTarget);
  });

  it('picks a better fitting mission from queue lookahead in crisis context', () => {
    const missions = [
      {
        id: 'precision',
        title: 'Precisión',
        description: 'Ventana estrecha',
        criteria: [
          { systemId: SystemType.SOUND, min: 50, max: 54 },
          { systemId: SystemType.LIGHTS, min: 50, max: 54 }
        ],
        holdDuration: 16,
        timeout: 30,
        rewardCash: 1400
      },
      {
        id: 'recovery',
        title: 'Recuperación',
        description: 'Ventana amplia para estabilizar',
        criteria: [
          { systemId: SystemType.SOUND, min: 30, max: 70 }
        ],
        holdDuration: 10,
        timeout: 40,
        rewardCash: 500
      }
    ];

    const pick = pickAdaptiveMissionFromQueue(
      missions,
      ['precision', 'recovery'],
      0,
      {
        systems: {
          [SystemType.SOUND]: { id: SystemType.SOUND, name: 'Sound', health: 70, status: 'WARNING', faderValue: 28, stability: 100, driftSpeed: 1 },
          [SystemType.LIGHTS]: { id: SystemType.LIGHTS, name: 'Lights', health: 68, status: 'WARNING', faderValue: 76, stability: 100, driftSpeed: 1 },
          [SystemType.VIDEO]: { id: SystemType.VIDEO, name: 'Video', health: 72, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
          [SystemType.STAGE]: { id: SystemType.STAGE, name: 'Stage', health: 75, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 }
        },
        stats: { stress: 85, budget: 700 },
        phase: 'FINALE',
        mode: GameMode.HARDCORE,
        difficulty: 'HARD'
      },
      2,
      0.5
    );

    expect(pick).not.toBeNull();
    expect(pick?.missionId).toBe('recovery');
    expect(pick?.queueIndex).toBe(1);
  });

  it('collects cross-system cascade targets honoring active events, cooldowns and scenario checks', () => {
    const sourceEvent = {
      id: 'source_1',
      systemId: SystemType.SOUND,
      title: 'Evento Fuente',
      description: 'Fuente',
      severity: 2 as const,
      expiresAt: 20000,
      correctAction: '',
      options: [{ label: 'OK', isCorrect: true, stressImpact: -2 }]
    };
    const sourceDefinition = {
      title: 'Evento Fuente',
      description: 'Fuente',
      relatedTo: ['Objetivo Luces', 'Objetivo Video'],
      options: [{ label: 'OK', isCorrect: true, stressImpact: -2 }]
    };
    const allSystemEvents = {
      [SystemType.SOUND]: [sourceDefinition],
      [SystemType.LIGHTS]: [{
        title: 'Objetivo Luces',
        description: 'Objetivo A',
        allowedScenarios: ['NORMAL'],
        options: [{ label: 'A', isCorrect: true, stressImpact: -2 }]
      }],
      [SystemType.VIDEO]: [{
        title: 'Objetivo Video',
        description: 'Objetivo B',
        allowedScenarios: ['NORMAL'],
        options: [{ label: 'B', isCorrect: true, stressImpact: -2 }]
      }],
      [SystemType.STAGE]: []
    };

    const targets = getCrossSystemCascadeTargets(
      sourceEvent,
      sourceDefinition,
      allSystemEvents,
      new Set(['Objetivo Luces']),
      new Map([['Objetivo Video', 0]]),
      10000,
      (allowedScenarios) => !allowedScenarios || allowedScenarios.includes('NORMAL')
    );

    expect(targets).toHaveLength(1);
    expect(targets[0].systemId).toBe(SystemType.VIDEO);
    expect(targets[0].definition.title).toBe('Objetivo Video');
  });

  it('creates related cascade events with inherited metadata and escalation linkage', () => {
    const sourceEvent = {
      id: 'source_2',
      systemId: SystemType.STAGE,
      title: 'Falla Principal',
      description: 'Falla',
      severity: 2 as const,
      expiresAt: 50000,
      correctAction: '',
      options: [{ label: 'Corregir', isCorrect: true, stressImpact: -5 }]
    };
    const targetDefinition = {
      title: 'Falla Encadenada',
      description: 'Impacto cruzado',
      priority: 9,
      canEscalate: true,
      escalationTime: 25,
      options: [{ label: 'Mitigar', isCorrect: true, stressImpact: -8 }]
    };

    const cascade = createRelatedCascadeEvent(
      sourceEvent,
      SystemType.VIDEO,
      targetDefinition,
      20000,
      1,
      () => 'cascade_1'
    );

    expect(cascade).toEqual({
      id: 'cascade_1',
      systemId: SystemType.VIDEO,
      title: 'Falla Encadenada',
      description: 'Impacto cruzado (Impacto en cadena desde: Falla Principal)',
      severity: 3,
      expiresAt: 40000,
      correctAction: '',
      options: [{ label: 'Mitigar', isCorrect: true, stressImpact: -8 }],
      priority: 9,
      canEscalate: true,
      escalationTime: 45000,
      escalatedFrom: 'source_2',
      relatedEvents: ['source_2']
    });
  });
});
