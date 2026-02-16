import { describe, expect, it } from 'vitest';
import { CLIENT_MISSIONS, SCENARIOS, SYSTEM_EVENTS } from '../constants';
import { SystemType } from '../types';

describe('Game Content Integrity', () => {
  it('has unique mission ids with valid criteria ranges', () => {
    const seen = new Set<string>();
    const validScenarioIds = new Set(SCENARIOS.map(s => s.id));

    CLIENT_MISSIONS.forEach((mission) => {
      expect(seen.has(mission.id)).toBe(false);
      seen.add(mission.id);

      expect(mission.holdDuration).toBeGreaterThan(0);
      expect(mission.timeout).toBeGreaterThan(mission.holdDuration);
      expect(mission.rewardCash).toBeGreaterThan(0);

      mission.criteria.forEach((criterion) => {
        const min = criterion.min ?? 0;
        const max = criterion.max ?? 100;
        expect(min).toBeGreaterThanOrEqual(0);
        expect(max).toBeLessThanOrEqual(100);
        expect(min).toBeLessThanOrEqual(max);
      });

      mission.allowedScenarios?.forEach(id => {
        expect(validScenarioIds.has(id)).toBe(true);
      });
    });
  });

  it('keeps enough mission variety per playable scenario', () => {
    const playableScenarios = SCENARIOS.filter(scenario => !scenario.isTutorial);

    playableScenarios.forEach(scenario => {
      const missionPool = CLIENT_MISSIONS.filter(mission =>
        !mission.allowedScenarios || mission.allowedScenarios.includes(scenario.id)
      );

      expect(missionPool.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('keeps valid scenario references for events', () => {
    const validScenarioIds = new Set(SCENARIOS.map(s => s.id));

    (Object.values(SYSTEM_EVENTS) as typeof SYSTEM_EVENTS[SystemType][]).forEach(events => {
      events.forEach(event => {
        if (!event.allowedScenarios) return;
        event.allowedScenarios.forEach(id => {
          expect(validScenarioIds.has(id)).toBe(true);
        });
      });
    });
  });

  it('has dedicated endgame event coverage by scenario', () => {
    const allEvents = (Object.values(SYSTEM_EVENTS) as typeof SYSTEM_EVENTS[SystemType][]).flat();

    const requiredCoverage: Record<string, number> = {
      ARENA: 4,
      WORLD_TOUR: 5,
      BLACKOUT_PROTOCOL: 5
    };

    Object.entries(requiredCoverage).forEach(([scenarioId, minCount]) => {
      const matching = allEvents.filter(event => event.allowedScenarios?.includes(scenarioId));
      expect(matching.length).toBeGreaterThanOrEqual(minCount);
    });
  });

  it('uses valid escalation links within each system', () => {
    (Object.values(SystemType) as SystemType[]).forEach(systemId => {
      const events = SYSTEM_EVENTS[systemId];
      const titles = new Set(events.map(e => e.title));

      events.forEach(event => {
        if (!event.escalationEvent) return;
        expect(titles.has(event.escalationEvent)).toBe(true);
      });
    });
  });

  it('uses valid cross-system related cascade links', () => {
    const titleSystems = new Map<string, SystemType[]>();

    (Object.values(SystemType) as SystemType[]).forEach(systemId => {
      SYSTEM_EVENTS[systemId].forEach(event => {
        const current = titleSystems.get(event.title) || [];
        titleSystems.set(event.title, [...current, systemId]);
      });
    });

    (Object.values(SystemType) as SystemType[]).forEach(systemId => {
      SYSTEM_EVENTS[systemId].forEach(event => {
        if (!event.relatedTo) return;

        event.relatedTo.forEach(targetTitle => {
          const targetSystems = titleSystems.get(targetTitle) || [];
          expect(targetSystems.length).toBeGreaterThan(0);
          expect(targetSystems.some(targetSystem => targetSystem !== systemId)).toBe(true);
        });
      });
    });
  });
});
