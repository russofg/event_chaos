import { describe, expect, it } from 'vitest';
import { GameScenario, SystemState, SystemType } from '../types';
import {
  buildNarrativeStageKey,
  pickNarrativeSequenceStage
} from '../hooks/useNarrativeSystem';

const baseScenario = (id: string): GameScenario => ({
  id,
  title: id,
  description: id,
  difficulty: id === 'WORLD_TOUR' || id === 'BLACKOUT_PROTOCOL' ? 'EXTREME' : 'HARD',
  contextPrompt: id,
  initialBudget: 5000
});

const buildSystems = (overrides: Partial<Record<SystemType, Partial<SystemState>>> = {}) => ({
  [SystemType.SOUND]: {
    id: SystemType.SOUND,
    name: 'Sound',
    health: 100,
    status: 'OK' as const,
    faderValue: 55,
    stability: 100,
    driftSpeed: 1,
    ...overrides[SystemType.SOUND]
  },
  [SystemType.LIGHTS]: {
    id: SystemType.LIGHTS,
    name: 'Lights',
    health: 100,
    status: 'OK' as const,
    faderValue: 62,
    stability: 100,
    driftSpeed: 1,
    ...overrides[SystemType.LIGHTS]
  },
  [SystemType.VIDEO]: {
    id: SystemType.VIDEO,
    name: 'Video',
    health: 100,
    status: 'OK' as const,
    faderValue: 58,
    stability: 100,
    driftSpeed: 1,
    ...overrides[SystemType.VIDEO]
  },
  [SystemType.STAGE]: {
    id: SystemType.STAGE,
    name: 'Stage',
    health: 100,
    status: 'OK' as const,
    faderValue: 64,
    stability: 100,
    driftSpeed: 1,
    ...overrides[SystemType.STAGE]
  }
});

const SEQUENCES_FIXTURE = [
  {
    id: 'arena_chain',
    allowedScenarioIds: ['ARENA'],
    stages: [
      {
        type: 'CONTEXT' as const,
        title: 'S1',
        message: 'one',
        cooldown: 1000,
        triggerCondition: (stats: any) => stats.timeRemaining < 100
      },
      {
        type: 'STORY' as const,
        title: 'S2',
        message: 'two',
        cooldown: 1000,
        triggerCondition: (stats: any, systems: any) => stats.timeRemaining < 80 && systems[SystemType.SOUND].faderValue > 50
      }
    ]
  }
];

describe('Narrative Director Regressions', () => {
  it('picks first stage for matching scenario and condition', () => {
    const now = Date.now();
    const pick = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      {},
      {},
      now,
      {
        publicInterest: 60,
        clientSatisfaction: 60,
        stress: 40,
        budget: 4000,
        timeRemaining: 90
      },
      buildSystems(),
      baseScenario('ARENA')
    );

    expect(pick.narrative?.title).toBe('S1');
    expect(pick.stageKey).toBe(buildNarrativeStageKey('arena_chain', 0));
    expect(pick.nextProgress.arena_chain).toBe(1);
  });

  it('advances to next stage after progress and skips completed sequence', () => {
    const now = Date.now();
    const cooldowns = {
      [buildNarrativeStageKey('arena_chain', 0)]: now - 2000
    };

    const stageTwo = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      { arena_chain: 1 },
      cooldowns,
      now,
      {
        publicInterest: 70,
        clientSatisfaction: 70,
        stress: 35,
        budget: 5200,
        timeRemaining: 70
      },
      buildSystems({ [SystemType.SOUND]: { faderValue: 56 } }),
      baseScenario('ARENA')
    );

    expect(stageTwo.narrative?.title).toBe('S2');
    expect(stageTwo.nextProgress.arena_chain).toBe(2);

    const completed = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      { arena_chain: 2 },
      {},
      now + 4000,
      {
        publicInterest: 70,
        clientSatisfaction: 70,
        stress: 35,
        budget: 5200,
        timeRemaining: 60
      },
      buildSystems(),
      baseScenario('ARENA')
    );

    expect(completed.narrative).toBeNull();
    expect(completed.stageKey).toBeNull();
  });

  it('respects cooldown window for the current stage key', () => {
    const now = Date.now();
    const key = buildNarrativeStageKey('arena_chain', 0);

    const blocked = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      {},
      { [key]: now - 200 },
      now,
      {
        publicInterest: 60,
        clientSatisfaction: 60,
        stress: 40,
        budget: 4000,
        timeRemaining: 90
      },
      buildSystems(),
      baseScenario('ARENA')
    );

    expect(blocked.narrative).toBeNull();
    expect(blocked.nextProgress.arena_chain).toBeUndefined();
  });

  it('returns null when scenario is not provided or does not match sequence', () => {
    const now = Date.now();
    const stats = {
      publicInterest: 60,
      clientSatisfaction: 60,
      stress: 40,
      budget: 4000,
      timeRemaining: 90
    };

    const noScenario = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      {},
      {},
      now,
      stats,
      buildSystems(),
      undefined
    );

    const otherScenario = pickNarrativeSequenceStage(
      SEQUENCES_FIXTURE,
      {},
      {},
      now,
      stats,
      buildSystems(),
      baseScenario('WORLD_TOUR')
    );

    expect(noScenario.narrative).toBeNull();
    expect(otherScenario.narrative).toBeNull();
  });
});
