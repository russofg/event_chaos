import { describe, expect, it } from 'vitest';
import { computeMobileHudInsets } from '../utils/mobileHudLayout';

describe('Mobile Layout Regressions', () => {
  it('creates top/bottom insets based on measured header and fader heights', () => {
    const insets = computeMobileHudInsets({
      headerHeight: 88.4,
      faderHeight: 190.2,
      gap: 10
    });

    expect(insets).toEqual({
      top: 98,
      bottom: 200
    });
  });

  it('enforces minimum insets for very small/invalid metrics', () => {
    const insets = computeMobileHudInsets({
      headerHeight: 0,
      faderHeight: Number.NaN,
      gap: -5
    });

    expect(insets.top).toBeGreaterThanOrEqual(72);
    expect(insets.bottom).toBeGreaterThanOrEqual(132);
  });

  it('caps inset sum on short viewports to preserve center gameplay space', () => {
    const insets = computeMobileHudInsets({
      headerHeight: 110,
      faderHeight: 220,
      gap: 12,
      viewportHeight: 620,
      minCenterHeight: 280
    });

    expect(insets.top).toBe(108);
    expect(insets.bottom).toBe(232);
    expect(insets.top + insets.bottom).toBeLessThanOrEqual(340);
  });
});
