import { describe, expect, it } from 'vitest';
import { normalizeCareerData } from '../hooks/useGameLogic';

describe('Career Save Migration', () => {
  it('falls back to defaults for nullish or primitive saves', () => {
    expect(normalizeCareerData(null)).toEqual({
      totalCash: 0,
      completedScenarios: [],
      highScores: {},
      unlockedAchievements: [],
      unlockedUpgrades: [],
      careerPoints: 0,
      reputation: 0
    });

    expect(normalizeCareerData('broken')).toEqual({
      totalCash: 0,
      completedScenarios: [],
      highScores: {},
      unlockedAchievements: [],
      unlockedUpgrades: [],
      careerPoints: 0,
      reputation: 0
    });
  });

  it('migrates old partial saves and removes invalid ids', () => {
    const migrated = normalizeCareerData({
      totalCash: '15000',
      completedScenarios: ['NORMAL', 'NORMAL', 'INVALID'],
      highScores: {
        NORMAL: '9800',
        INVALID: 9999,
        ROCKSTAR: 'not-a-number'
      },
      unlockedAchievements: ['event_master', 'event_master', 123],
      unlockedUpgrades: ['reflexes_1', 'ghost_upgrade', 'reflexes_1'],
      careerPoints: '75.5',
      reputation: -10
    });

    expect(migrated).toEqual({
      totalCash: 15000,
      completedScenarios: ['NORMAL'],
      highScores: {
        NORMAL: 9800
      },
      unlockedAchievements: ['event_master'],
      unlockedUpgrades: ['reflexes_1'],
      careerPoints: 75.5,
      reputation: 0
    });
  });

  it('handles corrupted shapes and keeps only valid upgrade ids', () => {
    const migrated = normalizeCareerData({
      totalCash: Infinity,
      completedScenarios: 'ROCKSTAR',
      highScores: [1000, 2000],
      unlockedAchievements: { id: 'budget_king' },
      unlockedUpgrades: ['knowledge_1', 'knowledge_1', 'resistance_1', 'invalid'],
      careerPoints: 'nan',
      reputation: undefined
    });

    expect(migrated).toEqual({
      totalCash: 0,
      completedScenarios: [],
      highScores: {},
      unlockedAchievements: [],
      unlockedUpgrades: ['knowledge_1', 'resistance_1'],
      careerPoints: 0,
      reputation: 0
    });
  });
});
