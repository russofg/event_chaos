import { describe, expect, it } from 'vitest';
import { SystemType } from '../types';
import { getEventImpactStyle } from '../utils/impactFx';

describe('Impact FX Regressions', () => {
  it('maps deterministic origins by system', () => {
    const sound = getEventImpactStyle(SystemType.SOUND, true, 2);
    const lights = getEventImpactStyle(SystemType.LIGHTS, true, 2);
    const video = getEventImpactStyle(SystemType.VIDEO, true, 2);
    const stage = getEventImpactStyle(SystemType.STAGE, true, 2);

    expect(sound.origin).toEqual({ xPercent: 18, yPercent: 58 });
    expect(lights.origin).toEqual({ xPercent: 82, yPercent: 18 });
    expect(video.origin).toEqual({ xPercent: 50, yPercent: 34 });
    expect(stage.origin).toEqual({ xPercent: 50, yPercent: 78 });
  });

  it('increases intensity with severity', () => {
    const low = getEventImpactStyle(SystemType.VIDEO, false, 1);
    const high = getEventImpactStyle(SystemType.VIDEO, false, 3);

    expect(high.durationMs).toBeGreaterThan(low.durationMs);
    expect(high.ringDurationMs).toBeGreaterThan(low.ringDurationMs);
    expect(high.freezeMs).toBeGreaterThan(low.freezeMs);
    expect(high.overlayOpacity).toBeGreaterThan(low.overlayOpacity);
  });

  it('uses softer impact for success than failure', () => {
    const success = getEventImpactStyle(SystemType.SOUND, true, 2);
    const failure = getEventImpactStyle(SystemType.SOUND, false, 2);

    expect(success.durationMs).toBeLessThan(failure.durationMs);
    expect(success.freezeMs).toBeLessThan(failure.freezeMs);
    expect(success.overlayOpacity).toBeLessThan(failure.overlayOpacity);
  });
});
