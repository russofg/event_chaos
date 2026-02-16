import { SystemType } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface ImpactOrigin {
  xPercent: number;
  yPercent: number;
}

export interface EventImpactStyle {
  systemId: SystemType;
  success: boolean;
  severity: 1 | 2 | 3;
  durationMs: number;
  ringDurationMs: number;
  freezeMs: number;
  overlayOpacity: number;
  colorHex: string;
  glowHex: string;
  origin: ImpactOrigin;
}

const SYSTEM_ORIGIN: Record<SystemType, ImpactOrigin> = {
  [SystemType.SOUND]: { xPercent: 18, yPercent: 58 },
  [SystemType.LIGHTS]: { xPercent: 82, yPercent: 18 },
  [SystemType.VIDEO]: { xPercent: 50, yPercent: 34 },
  [SystemType.STAGE]: { xPercent: 50, yPercent: 78 }
};

const SYSTEM_SUCCESS_COLORS: Record<SystemType, { colorHex: string; glowHex: string }> = {
  [SystemType.SOUND]: { colorHex: '#22d3ee', glowHex: '#67e8f9' },
  [SystemType.LIGHTS]: { colorHex: '#a78bfa', glowHex: '#c4b5fd' },
  [SystemType.VIDEO]: { colorHex: '#38bdf8', glowHex: '#7dd3fc' },
  [SystemType.STAGE]: { colorHex: '#f472b6', glowHex: '#f9a8d4' }
};

const SYSTEM_FAILURE_COLORS: Record<SystemType, { colorHex: string; glowHex: string }> = {
  [SystemType.SOUND]: { colorHex: '#ef4444', glowHex: '#f87171' },
  [SystemType.LIGHTS]: { colorHex: '#f97316', glowHex: '#fdba74' },
  [SystemType.VIDEO]: { colorHex: '#f43f5e', glowHex: '#fb7185' },
  [SystemType.STAGE]: { colorHex: '#dc2626', glowHex: '#f87171' }
};

export const getEventImpactStyle = (
  systemId: SystemType,
  success: boolean,
  severity: 1 | 2 | 3
): EventImpactStyle => {
  const sev = clamp(severity, 1, 3);
  const colors = success ? SYSTEM_SUCCESS_COLORS[systemId] : SYSTEM_FAILURE_COLORS[systemId];
  const baseDuration = success ? 340 : 410;
  const baseRingDuration = success ? 460 : 560;
  const baseFreeze = success ? 30 : 55;
  const baseOpacity = success ? 0.16 : 0.24;

  return {
    systemId,
    success,
    severity,
    durationMs: Math.round(baseDuration + sev * 42),
    ringDurationMs: Math.round(baseRingDuration + sev * 55),
    freezeMs: Math.round(baseFreeze + sev * (success ? 8 : 13)),
    overlayOpacity: clamp(baseOpacity + sev * (success ? 0.04 : 0.07), 0.14, 0.52),
    colorHex: colors.colorHex,
    glowHex: colors.glowHex,
    origin: SYSTEM_ORIGIN[systemId]
  };
};
