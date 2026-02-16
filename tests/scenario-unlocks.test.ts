import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../constants';
import { CareerData } from '../types';
import { getScenarioLockReason, resolvePlayableScenario } from '../utils/scenarioUnlocks';

const buildCareer = (overrides: Partial<CareerData> = {}): CareerData => ({
  totalCash: 0,
  completedScenarios: [],
  highScores: {},
  unlockedAchievements: [],
  unlockedUpgrades: [],
  careerPoints: 0,
  reputation: 0,
  ...overrides
});

describe('Scenario Unlock Rules', () => {
  it('locks EXTREME until enough HARD scenarios are completed', () => {
    const extreme = SCENARIOS.find(scene => scene.id === 'EXTREME');
    expect(extreme).toBeDefined();

    const reason = getScenarioLockReason(extreme!, SCENARIOS, buildCareer({
      completedScenarios: ['TUTORIAL', 'NORMAL']
    }));

    expect(reason).toBe('Completa 2 escenarios HARD');
  });

  it('locks ARENA by reputation when completion count is already met', () => {
    const arena = SCENARIOS.find(scene => scene.id === 'ARENA');
    expect(arena).toBeDefined();

    const reason = getScenarioLockReason(arena!, SCENARIOS, buildCareer({
      completedScenarios: ['TUTORIAL', 'NORMAL', 'ROCKSTAR', 'FESTIVAL'],
      reputation: 20
    }));

    expect(reason).toBe('Reputación 20/30');
  });

  it('prioritizes required-scenario locks for BLACKOUT_PROTOCOL', () => {
    const blackout = SCENARIOS.find(scene => scene.id === 'BLACKOUT_PROTOCOL');
    expect(blackout).toBeDefined();

    const reason = getScenarioLockReason(blackout!, SCENARIOS, buildCareer({
      completedScenarios: ['TUTORIAL', 'NORMAL', 'ROCKSTAR', 'FESTIVAL', 'EXTREME', 'ARENA'],
      reputation: 200
    }));

    expect(reason).toBe('Completa World Tour Live para desbloquear');
  });

  it('falls back to first unlocked scenario when requested one is locked', () => {
    const resolved = resolvePlayableScenario('BLACKOUT_PROTOCOL', SCENARIOS, buildCareer());
    expect(resolved.id).toBe('TUTORIAL');
  });

  it('keeps requested scenario when requirements are met', () => {
    const resolved = resolvePlayableScenario('WORLD_TOUR', SCENARIOS, buildCareer({
      completedScenarios: ['TUTORIAL', 'NORMAL', 'ROCKSTAR', 'FESTIVAL', 'ARENA'],
      reputation: 80
    }));

    expect(resolved.id).toBe('WORLD_TOUR');
  });
});
