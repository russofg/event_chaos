import { describe, expect, it } from 'vitest';
import {
  getDevicePerformanceBudget,
  getFxRenderPlan,
  getFrameIntervalMs,
  getVisualizerTargetFps,
  getVisualQualityProfile
} from '../utils/visualPerformance';

describe('Visual Performance Regressions', () => {
  it('maps visualizer fps based on platform and stress', () => {
    expect(getVisualizerTargetFps(true, 20, 'AUTO')).toBe(36);
    expect(getVisualizerTargetFps(true, 70, 'AUTO')).toBe(32);
    expect(getVisualizerTargetFps(true, 95, 'AUTO')).toBe(28);

    expect(getVisualizerTargetFps(false, 20, 'AUTO')).toBe(60);
    expect(getVisualizerTargetFps(false, 70, 'AUTO')).toBe(52);
    expect(getVisualizerTargetFps(false, 95, 'AUTO')).toBe(45);
    expect(getVisualizerTargetFps(false, 70, 'PERFORMANCE')).toBeGreaterThan(getVisualizerTargetFps(false, 70, 'AUTO'));
    expect(getVisualizerTargetFps(false, 70, 'CINEMATIC')).toBeLessThan(getVisualizerTargetFps(false, 70, 'AUTO'));
    expect(getVisualizerTargetFps(false, 70, 'PERFORMANCE', true)).toBeLessThanOrEqual(30);
    expect(getVisualizerTargetFps(true, 70, 'CINEMATIC', true)).toBeLessThanOrEqual(24);
  });

  it('builds lighter quality profile on mobile high-load contexts', () => {
    const desktopCalm = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 20,
      activeEvents: 0,
      criticalEvents: 0
    });
    const mobileCrisis = getVisualQualityProfile({
      isMobile: true,
      stressLevel: 95,
      activeEvents: 4,
      criticalEvents: 2
    });

    expect(mobileCrisis.targetFps).toBeLessThan(desktopCalm.targetFps);
    expect(mobileCrisis.maxParticles).toBeLessThan(desktopCalm.maxParticles);
    expect(mobileCrisis.noiseScale).toBeLessThanOrEqual(1);
    expect(mobileCrisis.glitchScale).toBeLessThanOrEqual(1);
  });

  it('respects reduced-motion preference with conservative outputs', () => {
    const reduced = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 80,
      activeEvents: 3,
      criticalEvents: 1,
      prefersReducedMotion: true
    });

    expect(reduced.targetFps).toBeLessThanOrEqual(32);
    expect(reduced.scanlineOpacity).toBe(0);
    expect(reduced.noiseScale).toBeLessThanOrEqual(0.2);
  });

  it('supports explicit quality modes over auto defaults', () => {
    const base = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 55,
      activeEvents: 2,
      criticalEvents: 1,
      qualityMode: 'AUTO'
    });
    const perf = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 55,
      activeEvents: 2,
      criticalEvents: 1,
      qualityMode: 'PERFORMANCE'
    });
    const cine = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 55,
      activeEvents: 2,
      criticalEvents: 1,
      qualityMode: 'CINEMATIC'
    });

    expect(perf.targetFps).toBeGreaterThanOrEqual(base.targetFps);
    expect(perf.maxParticles).toBeLessThanOrEqual(base.maxParticles);
    expect(cine.targetFps).toBeLessThanOrEqual(base.targetFps);
    expect(cine.maxParticles).toBeGreaterThanOrEqual(base.maxParticles);
  });

  it('calculates frame interval with safe fps bounds', () => {
    expect(getFrameIntervalMs(60)).toBeCloseTo(16.67, 1);
    expect(getFrameIntervalMs(0)).toBeCloseTo(16.67, 1);
    expect(getFrameIntervalMs(1000)).toBeCloseTo(8.33, 1);
  });

  it('builds low-power fx plan under heavy mobile load', () => {
    const profile = getVisualQualityProfile({
      isMobile: true,
      stressLevel: 94,
      activeEvents: 5,
      criticalEvents: 2,
      qualityMode: 'AUTO'
    });

    const plan = getFxRenderPlan({
      profile,
      isMobile: true,
      stressLevel: 94,
      activeEvents: 5,
      criticalEvents: 2,
      prefersReducedMotion: false,
      isPageVisible: true
    });

    expect(plan.dprCap).toBeLessThanOrEqual(1.25);
    expect(plan.drawGrid).toBe(false);
    expect(plan.drawGlitch).toBe(false);
    expect(plan.scanlineStep).toBe(6);
  });

  it('disables rendering when page is not visible', () => {
    const profile = getVisualQualityProfile({
      isMobile: false,
      stressLevel: 40,
      activeEvents: 1,
      criticalEvents: 0
    });

    const hiddenPlan = getFxRenderPlan({
      profile,
      isMobile: false,
      stressLevel: 40,
      activeEvents: 1,
      criticalEvents: 0,
      isPageVisible: false
    });

    expect(hiddenPlan.shouldRender).toBe(false);
  });

  it('creates device performance budgets by tier and platform', () => {
    const lowMobile = getDevicePerformanceBudget({
      isMobile: true,
      deviceMemoryGb: 3,
      hardwareConcurrency: 4
    });
    const highDesktop = getDevicePerformanceBudget({
      isMobile: false,
      deviceMemoryGb: 16,
      hardwareConcurrency: 12
    });

    expect(lowMobile.tier).toBe('LOW');
    expect(lowMobile.targetFpsCap).toBeLessThanOrEqual(34);
    expect(highDesktop.tier).toBe('HIGH');
    expect(highDesktop.targetFpsCap).toBeGreaterThan(lowMobile.targetFpsCap);
    expect(highDesktop.maxParticlesCap).toBeGreaterThan(lowMobile.maxParticlesCap);
  });
});
