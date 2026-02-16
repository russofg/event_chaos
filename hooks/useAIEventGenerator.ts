
import { useState, useCallback } from 'react';
import { GameEvent, SystemType } from '../types';
import { SYSTEM_EVENTS } from '../constants';
import { getAIRuntimeConfig } from '../utils/aiRuntime';
import type { AIRuntimeConfig } from '../utils/aiRuntime';

const HARD_SCENARIOS = new Set(['ROCKSTAR', 'FESTIVAL', 'ARENA']);
const EXTREME_SCENARIOS = new Set(['EXTREME', 'WORLD_TOUR', 'BLACKOUT_PROTOCOL']);

const isAllowedForScenario = (allowedScenarios: string[] | undefined, scenarioId: string) => {
  if (!allowedScenarios || allowedScenarios.length === 0) return true;
  if (allowedScenarios.includes(scenarioId)) return true;

  if (HARD_SCENARIOS.has(scenarioId)) {
    return allowedScenarios.some(id => HARD_SCENARIOS.has(id));
  }

  if (EXTREME_SCENARIOS.has(scenarioId)) {
    return allowedScenarios.some(id => EXTREME_SCENARIOS.has(id) || HARD_SCENARIOS.has(id));
  }

  return false;
};

const pickScenarioWeightedTemplate = <T extends { allowedScenarios?: string[] }>(templates: T[], scenarioId: string) => {
  if (templates.length === 0) return null;
  const weightedPool = templates.flatMap(template => {
    const hasDirectMatch = template.allowedScenarios?.includes(scenarioId);
    const weight = hasDirectMatch ? 3 : 1;
    return Array.from({ length: weight }, () => template);
  });
  return weightedPool[Math.floor(Math.random() * weightedPool.length)] || templates[0];
};

export const getProceduralEventGenerationDelayMs = (
  runtimeConfig: AIRuntimeConfig = getAIRuntimeConfig()
) => {
  // External AI support is optional. Without API key we run in local-only mode.
  return runtimeConfig.mode === 'EXTERNAL_OPTIONAL' ? 260 : 120;
};

export const useAIEventGenerator = () => {
  const [isGeneratingEvents, setIsGeneratingEvents] = useState(false);

  // Procedural event director: always local-first, no external calls required.
  const generateAIEvents = useCallback(async (scenarioId: string): Promise<GameEvent[]> => {
    setIsGeneratingEvents(true);
    try {
      const delayMs = getProceduralEventGenerationDelayMs();
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Main local generation logic
      const newEvents: GameEvent[] = [];
      const systems = Object.values(SystemType);
      
      // Generate 2 random static events based on context
      for (let i = 0; i < 2; i++) {
        const sys = systems[Math.floor(Math.random() * systems.length)];
        const pool = SYSTEM_EVENTS[sys];
        
        const validEvents = pool.filter(e => isAllowedForScenario(e.allowedScenarios, scenarioId));
        const finalPool = validEvents.length > 0 ? validEvents : pool;
        
        const template = pickScenarioWeightedTemplate(finalPool, scenarioId) || finalPool[0];

        newEvents.push({
            id: `static-${Date.now()}-${i}`,
            systemId: sys,
            title: template.title,
            description: template.description,
            severity: 2,
            expiresAt: Date.now() + 30000,
            correctAction: "",
            options: template.options
        });
      }

      return newEvents;
    } finally {
      setIsGeneratingEvents(false);
    }
  }, []);

  return { generateAIEvents, isGeneratingEvents };
};
