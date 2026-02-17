import type { ThreatTone } from './cinematicFx';

export interface HudCinematicClasses {
  shellToneClass: string;
  headerClass: string;
  stagePanelClass: string;
  terminalClass: string;
  eventLogClass: string;
  faderDockClass: string;
  mobileOverlayClass: string;
}

export const getHudCinematicClasses = (
  tone: ThreatTone,
  reducedMotion: boolean,
  isMobile: boolean
): HudCinematicClasses => {
  const toneClass =
    tone === 'CRITICAL'
      ? 'aaa-hud-tone-critical'
      : tone === 'ELEVATED'
        ? 'aaa-hud-tone-elevated'
        : 'aaa-hud-tone-calm';
  const motionClass = reducedMotion ? 'aaa-hud-static' : 'aaa-hud-kinetic';
  const headerToneClass =
    tone === 'CRITICAL'
      ? 'aaa-hud-header-critical'
      : tone === 'ELEVATED'
        ? 'aaa-hud-header-elevated'
        : 'aaa-hud-header-calm';
  const stageToneClass =
    tone === 'CRITICAL'
      ? 'aaa-stage-panel-critical'
      : tone === 'ELEVATED'
        ? 'aaa-stage-panel-elevated'
        : 'aaa-stage-panel-calm';
  const terminalToneClass =
    tone === 'CRITICAL'
      ? 'aaa-terminal-critical'
      : tone === 'ELEVATED'
        ? 'aaa-terminal-elevated'
        : 'aaa-terminal-calm';
  const eventLogToneClass =
    tone === 'CRITICAL'
      ? 'aaa-eventlog-critical'
      : tone === 'ELEVATED'
        ? 'aaa-eventlog-elevated'
        : 'aaa-eventlog-calm';

  return {
    shellToneClass: `${toneClass} ${motionClass}`,
    headerClass: `aaa-hud-header ${headerToneClass}`,
    stagePanelClass: `aaa-stage-panel ${stageToneClass}`,
    terminalClass: `aaa-terminal-shell ${terminalToneClass}`,
    eventLogClass: `aaa-eventlog-shell ${eventLogToneClass}`,
    faderDockClass: `aaa-fader-dock ${isMobile ? 'aaa-fader-dock-mobile' : 'aaa-fader-dock-desktop'}`,
    mobileOverlayClass: 'aaa-mobile-overlay-stack'
  };
};

export interface MenuCinematicClasses {
  panelClass: string;
  scenarioButtonClass: string;
  scenarioActiveClass: string;
  crewButtonClass: string;
  crewActiveClass: string;
  modeButtonClass: string;
  modeActiveClass: string;
  startButtonClass: string;
}

export const getMenuCinematicClasses = (
  isCompactLayout: boolean,
  reducedMotion: boolean
): MenuCinematicClasses => {
  const compactClass = isCompactLayout ? 'aaa-menu-panel-compact' : 'aaa-menu-panel-wide';
  const motionClass = reducedMotion ? 'aaa-menu-static' : 'aaa-menu-kinetic';

  return {
    panelClass: `aaa-menu-panel ${compactClass} ${motionClass}`,
    scenarioButtonClass: 'aaa-menu-choice aaa-menu-choice-scenario',
    scenarioActiveClass: 'aaa-menu-choice-active',
    crewButtonClass: 'aaa-menu-choice aaa-menu-choice-crew',
    crewActiveClass: 'aaa-menu-choice-active',
    modeButtonClass: 'aaa-menu-choice aaa-menu-choice-mode',
    modeActiveClass: 'aaa-menu-choice-active',
    startButtonClass: 'aaa-menu-start-cta'
  };
};
