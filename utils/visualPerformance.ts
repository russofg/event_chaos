export interface VisualPerformanceContext {
  isMobile: boolean;
  stressLevel: number;
  activeEvents: number;
  criticalEvents: number;
  qualityMode?: VisualQualityMode;
  prefersReducedMotion?: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
}

export type VisualQualityMode = 'AUTO' | 'PERFORMANCE' | 'CINEMATIC';

export interface VisualQualityProfile {
  targetFps: number;
  maxParticles: number;
  gridSize: number;
  noiseScale: number;
  glitchScale: number;
  scanlineOpacity: number;
  trailAlpha: number;
}

export interface FxRenderPlanInput {
  profile: VisualQualityProfile;
  isMobile: boolean;
  stressLevel: number;
  activeEvents: number;
  criticalEvents: number;
  prefersReducedMotion?: boolean;
  isPageVisible?: boolean;
}

export interface FxRenderPlan {
  shouldRender: boolean;
  dprCap: number;
  drawGrid: boolean;
  drawNoise: boolean;
  drawGlitch: boolean;
  drawVignette: boolean;
  scanlineStep: number;
  noiseMultiplier: number;
  glitchBandMultiplier: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const clampPositiveInt = (value: number, fallback: number) => {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value);
};

export interface DevicePerformanceBudgetContext {
  isMobile: boolean;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  prefersReducedMotion?: boolean;
}

export interface DevicePerformanceBudget {
  tier: 'LOW' | 'MID' | 'HIGH';
  targetFpsCap: number;
  maxParticlesCap: number;
  recommendedDprCap: number;
}

export const getDevicePerformanceBudget = ({
  isMobile,
  deviceMemoryGb = 8,
  hardwareConcurrency = 8,
  prefersReducedMotion = false
}: DevicePerformanceBudgetContext): DevicePerformanceBudget => {
  const memoryScore = clamp(deviceMemoryGb, 2, 24) / 8;
  const cpuScore = clamp(hardwareConcurrency, 2, 16) / 8;
  const platformPenalty = isMobile ? 0.3 : 0;
  const reducedMotionPenalty = prefersReducedMotion ? 0.25 : 0;
  const totalScore = (memoryScore * 0.58) + (cpuScore * 0.42) - platformPenalty - reducedMotionPenalty;

  if (totalScore < 0.9) {
    return {
      tier: 'LOW',
      targetFpsCap: isMobile ? 34 : 48,
      maxParticlesCap: isMobile ? 52 : 90,
      recommendedDprCap: isMobile ? 1.2 : 1.5
    };
  }

  if (totalScore < 1.3) {
    return {
      tier: 'MID',
      targetFpsCap: isMobile ? 40 : 56,
      maxParticlesCap: isMobile ? 72 : 130,
      recommendedDprCap: isMobile ? 1.35 : 1.7
    };
  }

  return {
    tier: 'HIGH',
    targetFpsCap: isMobile ? 48 : 66,
    maxParticlesCap: isMobile ? 96 : 170,
    recommendedDprCap: isMobile ? 1.5 : 1.85
  };
};

export const getFrameIntervalMs = (targetFps: number) => {
  const fps = clampPositiveInt(targetFps, 60);
  return 1000 / clamp(fps, 12, 120);
};

export const getVisualizerTargetFps = (
  isMobile: boolean,
  stressLevel: number,
  qualityMode: VisualQualityMode = 'AUTO',
  reducedMotion: boolean = false
) => {
  const stress = clamp(stressLevel, 0, 100);
  const baseFps = isMobile
    ? (stress > 80 ? 28 : stress > 55 ? 32 : 36)
    : (stress > 85 ? 45 : stress > 60 ? 52 : 60);

  if (qualityMode === 'PERFORMANCE') {
    const performance = isMobile ? baseFps + 4 : baseFps + 6;
    return reducedMotion ? Math.min(performance, isMobile ? 24 : 30) : performance;
  }
  if (qualityMode === 'CINEMATIC') {
    const cinematic = isMobile ? baseFps - 2 : baseFps - 4;
    return reducedMotion ? Math.min(cinematic, isMobile ? 22 : 26) : cinematic;
  }
  return reducedMotion ? Math.min(baseFps, isMobile ? 24 : 30) : baseFps;
};

export const getVisualQualityProfile = ({
  isMobile,
  stressLevel,
  activeEvents,
  criticalEvents,
  qualityMode = 'AUTO',
  prefersReducedMotion = false,
  deviceMemoryGb = 8,
  hardwareConcurrency = 8
}: VisualPerformanceContext): VisualQualityProfile => {
  const perfBudget = getDevicePerformanceBudget({
    isMobile,
    deviceMemoryGb,
    hardwareConcurrency,
    prefersReducedMotion
  });
  const stress = clamp(stressLevel, 0, 100);
  const eventLoad = clamp((activeEvents * 0.1) + (criticalEvents * 0.22), 0, 1.3);
  const stressLoad = stress / 100;
  const memoryPenalty = deviceMemoryGb <= 4 ? 0.16 : deviceMemoryGb <= 6 ? 0.08 : 0;
  const compositeLoad = clamp(eventLoad + (stressLoad * 0.42) + memoryPenalty, 0, 1);

  let targetFps = isMobile ? 38 : 60;
  if (isMobile) {
    targetFps -= Math.round(compositeLoad * 8);
  } else {
    targetFps -= Math.round(compositeLoad * 5);
  }
  if (qualityMode === 'PERFORMANCE') {
    targetFps += isMobile ? 5 : 8;
  } else if (qualityMode === 'CINEMATIC') {
    targetFps -= isMobile ? 3 : 5;
  }
  if (prefersReducedMotion) {
    targetFps = Math.min(targetFps, isMobile ? 26 : 32);
  }
  targetFps = Math.min(targetFps, perfBudget.targetFpsCap);

  const baseParticles = isMobile ? 52 : 130;
  const maxParticles = prefersReducedMotion
    ? Math.round(baseParticles * 0.45)
    : Math.round(baseParticles * (1 - compositeLoad * 0.25));
  const particlesAdjusted =
    qualityMode === 'PERFORMANCE'
      ? Math.round(maxParticles * 0.8)
      : qualityMode === 'CINEMATIC'
        ? Math.round(maxParticles * 1.2)
        : maxParticles;
  const particlesBudgetCapped = Math.min(particlesAdjusted, perfBudget.maxParticlesCap);

  const noiseScale = prefersReducedMotion
    ? 0.18
    : clamp((isMobile ? 0.62 : 1) - (compositeLoad * 0.18), 0.25, 1);
  const noiseAdjusted =
    qualityMode === 'PERFORMANCE'
      ? clamp(noiseScale * 0.78, 0.18, 1)
      : qualityMode === 'CINEMATIC'
        ? clamp(noiseScale * 1.2, 0.18, 1)
        : noiseScale;

  const glitchScale = prefersReducedMotion
    ? 0.2
    : clamp((isMobile ? 0.72 : 1) - (compositeLoad * 0.15), 0.35, 1);
  const glitchAdjusted =
    qualityMode === 'PERFORMANCE'
      ? clamp(glitchScale * 0.8, 0.2, 1)
      : qualityMode === 'CINEMATIC'
        ? clamp(glitchScale * 1.15, 0.2, 1)
        : glitchScale;
  const lowTierVisualPenalty = perfBudget.tier === 'LOW' ? 0.92 : 1;

  const scanlineOpacity = prefersReducedMotion
    ? 0
    : (isMobile ? 0.025 : 0.04);
  const scanlineAdjusted =
    qualityMode === 'PERFORMANCE'
      ? clamp(scanlineOpacity * 0.55, 0, 0.08)
      : qualityMode === 'CINEMATIC'
        ? clamp(scanlineOpacity * 1.5, 0, 0.1)
        : scanlineOpacity;

  const trailAlpha = clamp((isMobile ? 0.28 : 0.2) + (stressLoad * 0.12), 0.18, 0.42);
  const trailAdjusted =
    qualityMode === 'PERFORMANCE'
      ? clamp(trailAlpha * 0.92, 0.16, 0.42)
      : qualityMode === 'CINEMATIC'
        ? clamp(trailAlpha * 1.08, 0.16, 0.45)
        : trailAlpha;

  return {
    targetFps: clampPositiveInt(targetFps, isMobile ? 34 : 58),
    maxParticles: clampPositiveInt(particlesBudgetCapped, isMobile ? 36 : 90),
    gridSize: isMobile ? 52 : 40,
    noiseScale: clamp(noiseAdjusted * lowTierVisualPenalty, 0.18, 1),
    glitchScale: clamp(glitchAdjusted * lowTierVisualPenalty, 0.2, 1),
    scanlineOpacity: scanlineAdjusted,
    trailAlpha: trailAdjusted
  };
};

export const getFxRenderPlan = ({
  profile,
  isMobile,
  stressLevel,
  activeEvents,
  criticalEvents,
  prefersReducedMotion = false,
  isPageVisible = true
}: FxRenderPlanInput): FxRenderPlan => {
  const stress = clamp(stressLevel, 0, 100);
  const loadScore = activeEvents + (criticalEvents * 2) + (stress / 25);
  const lowPower = prefersReducedMotion || profile.targetFps <= 30 || (isMobile && loadScore >= 6);
  const ultraLowPower = prefersReducedMotion || profile.targetFps <= 24 || (isMobile && loadScore >= 8);

  const dprCap = prefersReducedMotion
    ? 1
    : isMobile
      ? ultraLowPower ? 1 : lowPower ? 1.25 : 1.5
      : ultraLowPower ? 1.2 : lowPower ? 1.5 : 1.75;

  return {
    shouldRender: isPageVisible,
    dprCap,
    drawGrid: !ultraLowPower,
    drawNoise: stress > 50 && !prefersReducedMotion,
    drawGlitch: stress > 68 && !prefersReducedMotion && !ultraLowPower,
    drawVignette: !prefersReducedMotion && (!isMobile || !ultraLowPower),
    scanlineStep: lowPower ? 6 : 4,
    noiseMultiplier: lowPower ? 0.74 : 1,
    glitchBandMultiplier: lowPower ? 0.72 : 1
  };
};
