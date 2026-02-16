import { CareerData, GameScenario } from '../types';

const DEFAULT_CAREER: CareerData = {
  totalCash: 0,
  completedScenarios: [],
  highScores: {},
  unlockedAchievements: [],
  unlockedUpgrades: [],
  careerPoints: 0,
  reputation: 0
};

const toSafeCareer = (careerData?: CareerData): CareerData => {
  if (!careerData) return DEFAULT_CAREER;
  return {
    totalCash: Number.isFinite(careerData.totalCash) ? Math.max(0, careerData.totalCash) : 0,
    completedScenarios: Array.isArray(careerData.completedScenarios) ? careerData.completedScenarios : [],
    highScores: careerData.highScores || {},
    unlockedAchievements: Array.isArray(careerData.unlockedAchievements) ? careerData.unlockedAchievements : [],
    unlockedUpgrades: Array.isArray(careerData.unlockedUpgrades) ? careerData.unlockedUpgrades : [],
    careerPoints: Number.isFinite(careerData.careerPoints) ? Math.max(0, careerData.careerPoints) : 0,
    reputation: Number.isFinite(careerData.reputation) ? Math.max(0, careerData.reputation) : 0
  };
};

export const getScenarioLockReason = (
  scenario: GameScenario,
  scenarios: GameScenario[],
  careerData?: CareerData
): string | null => {
  const safeCareer = toSafeCareer(careerData);
  const completedSet = new Set(safeCareer.completedScenarios);
  const scenarioTitleById = new Map(scenarios.map(scene => [scene.id, scene.title]));
  const hardCompletedCount = scenarios.filter(
    scene => scene.difficulty === 'HARD' && completedSet.has(scene.id)
  ).length;
  const req = scenario.unlockRequirements;

  if (!req) return null;

  if (req.requiredScenarioIds) {
    const missingRequired = req.requiredScenarioIds.find(id => !completedSet.has(id));
    if (missingRequired) {
      const scenarioTitle = scenarioTitleById.get(missingRequired) || missingRequired;
      return `Completa ${scenarioTitle} para desbloquear`;
    }
  }

  if (req.minHardScenarios && hardCompletedCount < req.minHardScenarios) {
    return `Completa ${req.minHardScenarios} escenarios HARD`;
  }

  if (req.minCompletedScenarios && safeCareer.completedScenarios.length < req.minCompletedScenarios) {
    return `Completa ${req.minCompletedScenarios} escenarios`;
  }

  if (req.minReputation && safeCareer.reputation < req.minReputation) {
    return `Reputación ${safeCareer.reputation}/${req.minReputation}`;
  }

  return null;
};

export const resolvePlayableScenario = (
  scenarioId: string,
  scenarios: GameScenario[],
  careerData?: CareerData
): GameScenario => {
  const requested = scenarios.find(scene => scene.id === scenarioId) || scenarios[0];
  if (!requested) {
    throw new Error('No scenarios configured');
  }

  const requestedLock = getScenarioLockReason(requested, scenarios, careerData);
  if (!requestedLock) return requested;

  return scenarios.find(scene => !getScenarioLockReason(scene, scenarios, careerData)) || scenarios[0];
};
