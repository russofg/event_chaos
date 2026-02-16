import { describe, expect, it } from 'vitest';
import { GameMode, GameScenario, SystemState, SystemType } from '../types';
import { applyTutorialSafetyNet, getTimerEndOutcome, shouldTriggerImmediateGameOver } from '../hooks/useGameLogic';

const baseScenario = (overrides: Partial<GameScenario> = {}): GameScenario => ({
  id: 'NORMAL',
  title: 'Normal',
  description: 'Scenario',
  difficulty: 'NORMAL',
  contextPrompt: 'prompt',
  initialBudget: 5000,
  ...overrides
});

const buildSystems = (health: number = 100): SystemState[] => ([
  { id: SystemType.SOUND, name: 'Sound', health, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
  { id: SystemType.LIGHTS, name: 'Lights', health, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
  { id: SystemType.VIDEO, name: 'Video', health, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 },
  { id: SystemType.STAGE, name: 'Stage', health, status: 'OK', faderValue: 50, stability: 100, driftSpeed: 1 }
]);

const WIN = {
  publicInterest: 60,
  clientSatisfaction: 60,
  stressLimit: 80,
  minBudget: 0
};

describe('Session Flow Logic', () => {
  it('triggers immediate game over on invalid stats for non-tutorial', () => {
    const scenario = baseScenario();
    const systems = buildSystems(100);

    const result = shouldTriggerImmediateGameOver(
      scenario,
      GameMode.NORMAL,
      { publicInterest: 50, clientSatisfaction: 50, stress: 20, budget: -1 },
      systems,
      WIN
    );

    expect(result).toBe(true);
  });

  it('enforces hardcore no-margin rule when any system reaches zero health', () => {
    const scenario = baseScenario();
    const brokenSystems = buildSystems(100);
    brokenSystems[0] = { ...brokenSystems[0], health: 0, status: 'CRITICAL' };

    const hardcore = shouldTriggerImmediateGameOver(
      scenario,
      GameMode.HARDCORE,
      { publicInterest: 80, clientSatisfaction: 80, stress: 20, budget: 3000 },
      brokenSystems,
      WIN
    );

    const normal = shouldTriggerImmediateGameOver(
      scenario,
      GameMode.NORMAL,
      { publicInterest: 80, clientSatisfaction: 80, stress: 20, budget: 3000 },
      brokenSystems,
      WIN
    );

    expect(hardcore).toBe(true);
    expect(normal).toBe(false);
  });

  it('does not trigger immediate game over for tutorial safety states', () => {
    const tutorialScenario = baseScenario({ id: 'TUTORIAL', isTutorial: true, difficulty: 'TUTORIAL' });
    const systems = buildSystems(0);

    const result = shouldTriggerImmediateGameOver(
      tutorialScenario,
      GameMode.HARDCORE,
      { publicInterest: 0, clientSatisfaction: 0, stress: 100, budget: -500 },
      systems,
      WIN
    );

    expect(result).toBe(false);
  });

  it('applies tutorial safety net for stress and budget', () => {
    const tutorialScenario = baseScenario({ id: 'TUTORIAL', isTutorial: true, difficulty: 'TUTORIAL' });

    const safe = applyTutorialSafetyNet(tutorialScenario, { stress: 95, budget: -250 });

    expect(safe.stress).toBe(50);
    expect(safe.budget).toBe(1000);
  });

  it('returns correct timer end outcomes', () => {
    const victory = getTimerEndOutcome(
      GameMode.NORMAL,
      0,
      { publicInterest: 70, clientSatisfaction: 75, stress: 40 },
      WIN
    );
    const failure = getTimerEndOutcome(
      GameMode.NORMAL,
      0,
      { publicInterest: 50, clientSatisfaction: 75, stress: 40 },
      WIN
    );
    const noEnd = getTimerEndOutcome(
      GameMode.ENDLESS,
      0,
      { publicInterest: 70, clientSatisfaction: 75, stress: 40 },
      WIN
    );

    expect(victory).toBe('VICTORY');
    expect(failure).toBe('GAME_OVER');
    expect(noEnd).toBeNull();
  });
});
