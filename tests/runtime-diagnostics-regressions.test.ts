import { describe, expect, it } from 'vitest';
import { buildRuntimeDiagnosticsSnapshot } from '../utils/runtimeDiagnostics';

describe('Runtime Diagnostics Regressions', () => {
  it('reports stable state for low pressure sessions', () => {
    const snapshot = buildRuntimeDiagnosticsSnapshot({
      stats: {
        publicInterest: 74,
        clientSatisfaction: 76,
        stress: 32,
        budget: 4200
      },
      activeEvents: 1,
      criticalEvents: 0,
      warningEvents: 0,
      hasBlockingOverlay: false,
      mobileCenterHeight: 420,
      visualProfile: {
        targetFps: 58,
        maxParticles: 120
      }
    });

    expect(snapshot.stabilityScore).toBeGreaterThanOrEqual(80);
    expect(snapshot.riskLevel).toBe('STABLE');
    expect(snapshot.frameBudgetMs).toBeCloseTo(17.24, 2);
  });

  it('escalates risk under compounding gameplay and performance pressure', () => {
    const snapshot = buildRuntimeDiagnosticsSnapshot({
      stats: {
        publicInterest: 22,
        clientSatisfaction: 28,
        stress: 91,
        budget: 650
      },
      activeEvents: 5,
      criticalEvents: 2,
      warningEvents: 3,
      hasBlockingOverlay: true,
      mobileCenterHeight: 290,
      visualProfile: {
        targetFps: 26,
        maxParticles: 30
      }
    });

    expect(snapshot.stabilityScore).toBeLessThan(45);
    expect(snapshot.riskLevel).toBe('CRITICAL');
    expect(snapshot.issues.length).toBeGreaterThanOrEqual(5);
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
  });

  it('stays within bounded score/risk outputs for edge values', () => {
    const snapshot = buildRuntimeDiagnosticsSnapshot({
      stats: {
        publicInterest: 0,
        clientSatisfaction: 0,
        stress: 100,
        budget: 0
      },
      activeEvents: 8,
      criticalEvents: 4,
      warningEvents: 6,
      hasBlockingOverlay: true,
      mobileCenterHeight: 180,
      visualProfile: {
        targetFps: 18,
        maxParticles: 12
      }
    });

    expect(snapshot.stabilityScore).toBeGreaterThanOrEqual(0);
    expect(snapshot.stabilityScore).toBeLessThanOrEqual(100);
    expect(['STABLE', 'WATCH', 'CRITICAL']).toContain(snapshot.riskLevel);
  });
});
