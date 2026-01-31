
import { useState, useCallback } from 'react';
import { GameEvent, SystemType } from '../types';
import { SYSTEM_EVENTS } from '../constants';

export const useAIEventGenerator = () => {
  const [isGeneratingEvents, setIsGeneratingEvents] = useState(false);

  // This function now just uses static logic to simulate AI generation
  const generateAIEvents = useCallback(async (scenarioContext: string): Promise<GameEvent[]> => {
    setIsGeneratingEvents(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // FALLBACK TO STATIC LOGIC (This is now the main logic)
    const newEvents: GameEvent[] = [];
    const systems = Object.values(SystemType);
    
    // Generate 2 random static events based on context
    for (let i = 0; i < 2; i++) {
      const sys = systems[Math.floor(Math.random() * systems.length)];
      const pool = SYSTEM_EVENTS[sys];
      
      // Filter by scenario context if possible
      const validEvents = pool.filter(e => !e.allowedScenarios || e.allowedScenarios.some(s => scenarioContext.includes(s)));
      const finalPool = validEvents.length > 0 ? validEvents : pool;
      
      const template = finalPool[Math.floor(Math.random() * finalPool.length)];

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

    setIsGeneratingEvents(false);
    return newEvents;
  }, []);

  return { generateAIEvents, isGeneratingEvents };
};
