import { GameState } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface CinematicTransitionStyle {
  label: string;
  tint: 'CYAN' | 'AMBER' | 'RED' | 'EMERALD' | 'SLATE';
  durationMs: number;
}

export const getCinematicTransitionStyle = (
  from: GameState | null,
  to: GameState
): CinematicTransitionStyle | null => {
  if (from === to) return null;

  if (to === GameState.PLAYING && from === GameState.PAUSED) {
    return { label: 'REANUDANDO SHOW', tint: 'CYAN', durationMs: 340 };
  }
  if (to === GameState.PLAYING) {
    return { label: 'SHOW EN VIVO', tint: 'CYAN', durationMs: 440 };
  }
  if (to === GameState.PAUSED) {
    return { label: 'PAUSA TÁCTICA', tint: 'SLATE', durationMs: 320 };
  }
  if (to === GameState.SHOP) {
    return { label: 'PREPARANDO RACK', tint: 'AMBER', durationMs: 360 };
  }
  if (to === GameState.VICTORY) {
    return { label: 'MISIÓN CUMPLIDA', tint: 'EMERALD', durationMs: 700 };
  }
  if (to === GameState.GAME_OVER) {
    return { label: 'FALLO CRÍTICO', tint: 'RED', durationMs: 760 };
  }
  if (to === GameState.MENU) {
    return { label: 'SISTEMA EN ESPERA', tint: 'SLATE', durationMs: 300 };
  }
  return null;
};

export const getThreatLevel = (
  stress: number,
  criticalEvents: number,
  warningEvents: number
) => {
  const normalizedStress = clamp(stress, 0, 100) / 100;
  const eventLoad = clamp((criticalEvents * 0.42) + (warningEvents * 0.14), 0, 1);
  return clamp((normalizedStress * 0.68) + (eventLoad * 0.52), 0, 1);
};

export type ThreatTone = 'CALM' | 'ELEVATED' | 'CRITICAL';

export interface ThreatRailProfile {
  tone: ThreatTone;
  opacity: number;
  pulseMs: number;
  glowStrength: number;
}

export const getThreatRailProfile = (
  threatLevel: number,
  paused: boolean
): ThreatRailProfile => {
  const normalized = clamp(threatLevel, 0, 1);
  const damp = paused ? 0.7 : 1;

  if (normalized >= 0.72) {
    return {
      tone: 'CRITICAL',
      opacity: clamp((0.42 + normalized * 0.38) * damp, 0.2, 0.88),
      pulseMs: 900,
      glowStrength: 0.9
    };
  }

  if (normalized >= 0.38) {
    return {
      tone: 'ELEVATED',
      opacity: clamp((0.26 + normalized * 0.3) * damp, 0.16, 0.68),
      pulseMs: 1300,
      glowStrength: 0.62
    };
  }

  return {
    tone: 'CALM',
    opacity: clamp((0.12 + normalized * 0.2) * damp, 0.08, 0.42),
    pulseMs: 1800,
    glowStrength: 0.36
  };
};
