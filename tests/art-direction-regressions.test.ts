import { describe, expect, it } from 'vitest';
import { GameMode, GameState } from '../types';
import { getArtDirectionCssVariables, getScenarioArtDirectionProfile } from '../utils/artDirection';

describe('Art Direction Regressions', () => {
  it('returns scenario-specific profile and falls back to NORMAL for unknown ids', () => {
    const arena = getScenarioArtDirectionProfile('ARENA');
    const unknown = getScenarioArtDirectionProfile('UNKNOWN_SCENARIO');

    expect(arena.id).toBe('ARENA');
    expect(arena.label.length).toBeGreaterThan(0);
    expect(unknown.id).toBe('NORMAL');
  });

  it('builds css variables with required design token keys', () => {
    const vars = getArtDirectionCssVariables({
      scenarioId: 'WORLD_TOUR',
      mode: GameMode.SPEEDRUN,
      threatLevel: 0.68,
      gameState: GameState.PLAYING,
      reducedMotion: false
    });

    expect(vars['--aaa-font-display']).toContain('Saira Condensed');
    expect(vars['--aaa-font-body']).toContain('Space Grotesk');
    expect(vars['--aaa-font-mono']).toContain('JetBrains Mono');

    expect(vars['--aaa-bg-0'].startsWith('#')).toBe(true);
    expect(vars['--aaa-bg-1'].startsWith('#')).toBe(true);
    expect(vars['--aaa-bg-2'].startsWith('#')).toBe(true);

    expect(vars['--aaa-panel-top-rgb'].split(',').length).toBe(3);
    expect(vars['--aaa-aurora-a-rgb'].split(',').length).toBe(3);
    expect(Number.parseFloat(vars['--aaa-aurora-alpha-a'])).toBeGreaterThan(0);
  });

  it('dampens aurora energy on pause and reduced motion', () => {
    const intense = getArtDirectionCssVariables({
      scenarioId: 'EXTREME',
      mode: GameMode.HARDCORE,
      threatLevel: 0.95,
      gameState: GameState.PLAYING,
      reducedMotion: false
    });

    const pausedReduced = getArtDirectionCssVariables({
      scenarioId: 'EXTREME',
      mode: GameMode.HARDCORE,
      threatLevel: 0.95,
      gameState: GameState.PAUSED,
      reducedMotion: true
    });

    expect(Number.parseFloat(intense['--aaa-aurora-alpha-a'])).toBeGreaterThan(
      Number.parseFloat(pausedReduced['--aaa-aurora-alpha-a'])
    );
  });
});
