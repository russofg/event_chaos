import { describe, expect, it } from 'vitest';
import { getHudCinematicClasses, getMenuCinematicClasses } from '../utils/uiCinematics';

describe('UI Cinematics Regressions', () => {
  it('returns critical HUD emphasis classes with kinetic motion when allowed', () => {
    const classes = getHudCinematicClasses('CRITICAL', false, true);

    expect(classes.shellToneClass).toContain('aaa-hud-tone-critical');
    expect(classes.shellToneClass).toContain('aaa-hud-kinetic');
    expect(classes.headerClass).toContain('aaa-hud-header-critical');
    expect(classes.stagePanelClass).toContain('aaa-stage-panel-critical');
    expect(classes.eventLogClass).toContain('aaa-eventlog-critical');
    expect(classes.faderDockClass).toContain('aaa-fader-dock-mobile');
  });

  it('returns calm/static HUD classes for reduced motion desktop contexts', () => {
    const classes = getHudCinematicClasses('CALM', true, false);

    expect(classes.shellToneClass).toContain('aaa-hud-tone-calm');
    expect(classes.shellToneClass).toContain('aaa-hud-static');
    expect(classes.headerClass).toContain('aaa-hud-header-calm');
    expect(classes.faderDockClass).toContain('aaa-fader-dock-desktop');
  });

  it('builds menu cinematic class bundles for compact and wide layouts', () => {
    const compact = getMenuCinematicClasses(true, false);
    const wideReduced = getMenuCinematicClasses(false, true);

    expect(compact.panelClass).toContain('aaa-menu-panel');
    expect(compact.panelClass).toContain('aaa-menu-panel-compact');
    expect(compact.panelClass).toContain('aaa-menu-kinetic');
    expect(compact.startButtonClass).toBe('aaa-menu-start-cta');
    expect(compact.scenarioActiveClass).toBe('aaa-menu-choice-active');

    expect(wideReduced.panelClass).toContain('aaa-menu-panel-wide');
    expect(wideReduced.panelClass).toContain('aaa-menu-static');
  });
});
