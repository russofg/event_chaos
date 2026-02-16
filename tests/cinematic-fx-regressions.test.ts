import { describe, expect, it } from 'vitest';
import { GameState } from '../types';
import {
  getCinematicTransitionStyle,
  getThreatLevel,
  getThreatRailProfile
} from '../utils/cinematicFx';

describe('Cinematic FX Regressions', () => {
  it('maps key game-state transitions to cinematic presets', () => {
    expect(getCinematicTransitionStyle(GameState.PAUSED, GameState.PLAYING)?.label).toBe('REANUDANDO SHOW');
    expect(getCinematicTransitionStyle(GameState.PLAYING, GameState.PAUSED)?.label).toBe('PAUSA TÁCTICA');
    expect(getCinematicTransitionStyle(GameState.PLAYING, GameState.VICTORY)?.tint).toBe('EMERALD');
    expect(getCinematicTransitionStyle(GameState.PLAYING, GameState.GAME_OVER)?.tint).toBe('RED');
    expect(getCinematicTransitionStyle(GameState.MENU, GameState.MENU)).toBeNull();
  });

  it('computes higher threat level with stress and event pressure', () => {
    const calm = getThreatLevel(20, 0, 0);
    const medium = getThreatLevel(55, 1, 1);
    const crisis = getThreatLevel(95, 2, 3);

    expect(calm).toBeGreaterThanOrEqual(0);
    expect(crisis).toBeLessThanOrEqual(1);
    expect(medium).toBeGreaterThan(calm);
    expect(crisis).toBeGreaterThan(medium);
  });

  it('returns calm/elevated/critical rail profiles by threshold', () => {
    expect(getThreatRailProfile(0.2, false).tone).toBe('CALM');
    expect(getThreatRailProfile(0.5, false).tone).toBe('ELEVATED');
    expect(getThreatRailProfile(0.9, false).tone).toBe('CRITICAL');
  });

  it('damps threat rail intensity when paused', () => {
    const live = getThreatRailProfile(0.8, false);
    const paused = getThreatRailProfile(0.8, true);

    expect(paused.opacity).toBeLessThan(live.opacity);
    expect(paused.tone).toBe(live.tone);
  });
});
