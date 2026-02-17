import { GameMode, GameState } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface ArtTypographyProfile {
  display: string;
  body: string;
  mono: string;
}

interface ArtShellProfile {
  from: string;
  mid: string;
  to: string;
}

interface ArtPanelProfile {
  topRgb: string;
  bottomRgb: string;
  topAlpha: number;
  bottomAlpha: number;
  border: string;
  highlight: string;
  strongBorder: string;
}

interface ArtAuroraProfile {
  aRgb: string;
  bRgb: string;
  cRgb: string;
  alphaA: number;
  alphaB: number;
  alphaC: number;
}

interface ArtAccentProfile {
  chipBorder: string;
  toolbarBorder: string;
  headingGlow: string;
  panelTitle: string;
  glowPrimary: string;
}

export interface ArtDirectionProfile {
  id: string;
  label: string;
  typography: ArtTypographyProfile;
  shell: ArtShellProfile;
  panel: ArtPanelProfile;
  aurora: ArtAuroraProfile;
  accent: ArtAccentProfile;
}

export interface ArtDirectionRuntimeInput {
  scenarioId: string;
  mode: GameMode;
  threatLevel: number;
  gameState: GameState;
  reducedMotion?: boolean;
}

export type ArtDirectionCssVariables = Record<string, string>;

const BASE_TYPOGRAPHY: ArtTypographyProfile = {
  display: '"Saira Condensed", "Chakra Petch", sans-serif',
  body: '"Space Grotesk", "Chakra Petch", sans-serif',
  mono: '"JetBrains Mono", monospace'
};

const SCENARIO_ART_PROFILES: Record<string, ArtDirectionProfile> = {
  TUTORIAL: {
    id: 'TUTORIAL',
    label: 'Training Grid',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#061525', mid: '#0a2237', to: '#12324a' },
    panel: {
      topRgb: '10, 27, 44',
      bottomRgb: '6, 16, 28',
      topAlpha: 0.9,
      bottomAlpha: 0.86,
      border: 'rgba(98, 167, 207, 0.42)',
      highlight: 'rgba(138, 230, 255, 0.34)',
      strongBorder: 'rgba(75, 205, 255, 0.5)'
    },
    aurora: {
      aRgb: '59, 130, 246',
      bRgb: '14, 165, 233',
      cRgb: '45, 212, 191',
      alphaA: 0.24,
      alphaB: 0.2,
      alphaC: 0.16
    },
    accent: {
      chipBorder: 'rgba(83, 142, 180, 0.72)',
      toolbarBorder: 'rgba(88, 155, 198, 0.74)',
      headingGlow: 'rgba(56, 189, 248, 0.34)',
      panelTitle: '#b8daef',
      glowPrimary: '0 0 24px rgba(56, 189, 248, 0.34)'
    }
  },
  NORMAL: {
    id: 'NORMAL',
    label: 'Corporate Neon',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#040b18', mid: '#082036', to: '#0d2f49' },
    panel: {
      topRgb: '10, 19, 34',
      bottomRgb: '5, 10, 20',
      topAlpha: 0.9,
      bottomAlpha: 0.84,
      border: 'rgba(84, 111, 153, 0.34)',
      highlight: 'rgba(106, 223, 255, 0.3)',
      strongBorder: 'rgba(45, 212, 191, 0.38)'
    },
    aurora: {
      aRgb: '34, 211, 238',
      bRgb: '20, 184, 166',
      cRgb: '59, 130, 246',
      alphaA: 0.24,
      alphaB: 0.2,
      alphaC: 0.14
    },
    accent: {
      chipBorder: 'rgba(70, 94, 130, 0.7)',
      toolbarBorder: 'rgba(77, 99, 132, 0.7)',
      headingGlow: 'rgba(34, 211, 238, 0.25)',
      panelTitle: '#a9bdd8',
      glowPrimary: '0 0 24px rgba(34, 211, 238, 0.34)'
    }
  },
  ROCKSTAR: {
    id: 'ROCKSTAR',
    label: 'Diva Voltage',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#120617', mid: '#27103a', to: '#132745' },
    panel: {
      topRgb: '24, 12, 42',
      bottomRgb: '10, 8, 24',
      topAlpha: 0.9,
      bottomAlpha: 0.88,
      border: 'rgba(136, 92, 203, 0.38)',
      highlight: 'rgba(232, 121, 249, 0.26)',
      strongBorder: 'rgba(217, 70, 239, 0.44)'
    },
    aurora: {
      aRgb: '217, 70, 239',
      bRgb: '59, 130, 246',
      cRgb: '244, 114, 182',
      alphaA: 0.26,
      alphaB: 0.18,
      alphaC: 0.16
    },
    accent: {
      chipBorder: 'rgba(143, 102, 201, 0.74)',
      toolbarBorder: 'rgba(164, 108, 221, 0.72)',
      headingGlow: 'rgba(217, 70, 239, 0.28)',
      panelTitle: '#d3b7f4',
      glowPrimary: '0 0 24px rgba(217, 70, 239, 0.3)'
    }
  },
  FESTIVAL: {
    id: 'FESTIVAL',
    label: 'Outdoor Pulse',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#12100a', mid: '#2b2011', to: '#12343a' },
    panel: {
      topRgb: '24, 18, 9',
      bottomRgb: '10, 10, 14',
      topAlpha: 0.9,
      bottomAlpha: 0.86,
      border: 'rgba(176, 116, 53, 0.38)',
      highlight: 'rgba(253, 186, 116, 0.28)',
      strongBorder: 'rgba(45, 212, 191, 0.4)'
    },
    aurora: {
      aRgb: '251, 146, 60',
      bRgb: '45, 212, 191',
      cRgb: '56, 189, 248',
      alphaA: 0.24,
      alphaB: 0.19,
      alphaC: 0.15
    },
    accent: {
      chipBorder: 'rgba(180, 124, 66, 0.74)',
      toolbarBorder: 'rgba(166, 129, 84, 0.72)',
      headingGlow: 'rgba(251, 146, 60, 0.28)',
      panelTitle: '#e5c7a3',
      glowPrimary: '0 0 22px rgba(251, 146, 60, 0.3)'
    }
  },
  EXTREME: {
    id: 'EXTREME',
    label: 'Critical Burn',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#13050b', mid: '#2f0d16', to: '#112739' },
    panel: {
      topRgb: '26, 10, 16',
      bottomRgb: '8, 7, 17',
      topAlpha: 0.92,
      bottomAlpha: 0.88,
      border: 'rgba(170, 75, 93, 0.42)',
      highlight: 'rgba(244, 114, 182, 0.26)',
      strongBorder: 'rgba(248, 113, 113, 0.44)'
    },
    aurora: {
      aRgb: '244, 63, 94',
      bRgb: '59, 130, 246',
      cRgb: '239, 68, 68',
      alphaA: 0.26,
      alphaB: 0.18,
      alphaC: 0.16
    },
    accent: {
      chipBorder: 'rgba(161, 86, 104, 0.75)',
      toolbarBorder: 'rgba(173, 93, 112, 0.74)',
      headingGlow: 'rgba(244, 63, 94, 0.28)',
      panelTitle: '#dfb1bc',
      glowPrimary: '0 0 24px rgba(244, 63, 94, 0.3)'
    }
  },
  ARENA: {
    id: 'ARENA',
    label: 'Arena Broadcast',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#061024', mid: '#0f1b3b', to: '#103555' },
    panel: {
      topRgb: '9, 20, 44',
      bottomRgb: '6, 12, 29',
      topAlpha: 0.9,
      bottomAlpha: 0.86,
      border: 'rgba(93, 122, 190, 0.38)',
      highlight: 'rgba(96, 165, 250, 0.28)',
      strongBorder: 'rgba(56, 189, 248, 0.44)'
    },
    aurora: {
      aRgb: '59, 130, 246',
      bRgb: '37, 99, 235',
      cRgb: '34, 211, 238',
      alphaA: 0.24,
      alphaB: 0.2,
      alphaC: 0.16
    },
    accent: {
      chipBorder: 'rgba(93, 122, 190, 0.72)',
      toolbarBorder: 'rgba(99, 129, 200, 0.74)',
      headingGlow: 'rgba(96, 165, 250, 0.28)',
      panelTitle: '#b7c8ef',
      glowPrimary: '0 0 24px rgba(96, 165, 250, 0.3)'
    }
  },
  WORLD_TOUR: {
    id: 'WORLD_TOUR',
    label: 'Global Prime',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#08091d', mid: '#1c1d48', to: '#143f66' },
    panel: {
      topRgb: '17, 18, 52',
      bottomRgb: '7, 10, 27',
      topAlpha: 0.91,
      bottomAlpha: 0.88,
      border: 'rgba(114, 105, 211, 0.4)',
      highlight: 'rgba(129, 140, 248, 0.26)',
      strongBorder: 'rgba(34, 211, 238, 0.42)'
    },
    aurora: {
      aRgb: '129, 140, 248',
      bRgb: '34, 211, 238',
      cRgb: '250, 204, 21',
      alphaA: 0.24,
      alphaB: 0.2,
      alphaC: 0.12
    },
    accent: {
      chipBorder: 'rgba(114, 105, 211, 0.74)',
      toolbarBorder: 'rgba(123, 114, 222, 0.74)',
      headingGlow: 'rgba(129, 140, 248, 0.28)',
      panelTitle: '#c5c5f6',
      glowPrimary: '0 0 24px rgba(129, 140, 248, 0.3)'
    }
  },
  BLACKOUT_PROTOCOL: {
    id: 'BLACKOUT_PROTOCOL',
    label: 'Emergency Grid',
    typography: BASE_TYPOGRAPHY,
    shell: { from: '#090508', mid: '#240f13', to: '#3a1a0b' },
    panel: {
      topRgb: '24, 10, 12',
      bottomRgb: '9, 8, 14',
      topAlpha: 0.93,
      bottomAlpha: 0.9,
      border: 'rgba(172, 70, 70, 0.42)',
      highlight: 'rgba(248, 113, 113, 0.28)',
      strongBorder: 'rgba(251, 146, 60, 0.44)'
    },
    aurora: {
      aRgb: '239, 68, 68',
      bRgb: '251, 146, 60',
      cRgb: '220, 38, 38',
      alphaA: 0.22,
      alphaB: 0.16,
      alphaC: 0.14
    },
    accent: {
      chipBorder: 'rgba(171, 83, 83, 0.74)',
      toolbarBorder: 'rgba(182, 102, 79, 0.74)',
      headingGlow: 'rgba(248, 113, 113, 0.28)',
      panelTitle: '#e9b7b7',
      glowPrimary: '0 0 24px rgba(248, 113, 113, 0.3)'
    }
  }
};

const MODE_INTENSITY = {
  [GameMode.NORMAL]: { aurora: 1, border: 1, headingGlow: 1 },
  [GameMode.ENDLESS]: { aurora: 1.04, border: 1.02, headingGlow: 1.05 },
  [GameMode.SPEEDRUN]: { aurora: 1.12, border: 1.08, headingGlow: 1.12 },
  [GameMode.HARDCORE]: { aurora: 1.18, border: 1.14, headingGlow: 1.16 }
};

const STATE_DAMPING = {
  [GameState.MENU]: 0.9,
  [GameState.SHOP]: 0.94,
  [GameState.PLAYING]: 1,
  [GameState.PAUSED]: 0.72,
  [GameState.GAME_OVER]: 0.78,
  [GameState.VICTORY]: 1.04
};

export const getScenarioArtDirectionProfile = (scenarioId: string): ArtDirectionProfile => {
  return SCENARIO_ART_PROFILES[scenarioId] || SCENARIO_ART_PROFILES.NORMAL;
};

export const getArtDirectionCssVariables = ({
  scenarioId,
  mode,
  threatLevel,
  gameState,
  reducedMotion = false
}: ArtDirectionRuntimeInput): ArtDirectionCssVariables => {
  const profile = getScenarioArtDirectionProfile(scenarioId);
  const modeIntensity = MODE_INTENSITY[mode];
  const stateDamp = STATE_DAMPING[gameState];
  const threat = clamp(threatLevel, 0, 1);
  const motionDamp = reducedMotion ? 0.76 : 1;

  const auroraBoost = clamp((0.66 + (threat * 0.48)) * modeIntensity.aurora * stateDamp * motionDamp, 0.34, 1.4);
  const panelTopAlpha = clamp(profile.panel.topAlpha * (0.95 + (threat * 0.08)), 0.72, 0.97);
  const panelBottomAlpha = clamp(profile.panel.bottomAlpha * (0.95 + (threat * 0.06)), 0.68, 0.94);

  return {
    '--aaa-font-display': profile.typography.display,
    '--aaa-font-body': profile.typography.body,
    '--aaa-font-mono': profile.typography.mono,

    '--aaa-bg-0': profile.shell.from,
    '--aaa-bg-1': profile.shell.mid,
    '--aaa-bg-2': profile.shell.to,

    '--aaa-panel-top-rgb': profile.panel.topRgb,
    '--aaa-panel-bottom-rgb': profile.panel.bottomRgb,
    '--aaa-panel-top-alpha': panelTopAlpha.toFixed(3),
    '--aaa-panel-bottom-alpha': panelBottomAlpha.toFixed(3),
    '--aaa-panel-border': profile.panel.border,
    '--aaa-panel-highlight': profile.panel.highlight,
    '--aaa-panel-strong-border': profile.panel.strongBorder,

    '--aaa-chip-border': profile.accent.chipBorder,
    '--aaa-toolbar-border': profile.accent.toolbarBorder,
    '--aaa-heading-glow': profile.accent.headingGlow,
    '--aaa-panel-title-color': profile.accent.panelTitle,
    '--aaa-glow-primary': profile.accent.glowPrimary,

    '--aaa-aurora-a-rgb': profile.aurora.aRgb,
    '--aaa-aurora-b-rgb': profile.aurora.bRgb,
    '--aaa-aurora-c-rgb': profile.aurora.cRgb,
    '--aaa-aurora-alpha-a': (profile.aurora.alphaA * auroraBoost).toFixed(3),
    '--aaa-aurora-alpha-b': (profile.aurora.alphaB * auroraBoost).toFixed(3),
    '--aaa-aurora-alpha-c': (profile.aurora.alphaC * auroraBoost).toFixed(3),

    '--aaa-mode-border-boost': modeIntensity.border.toFixed(3),
    '--aaa-mode-heading-glow-boost': modeIntensity.headingGlow.toFixed(3)
  };
};
