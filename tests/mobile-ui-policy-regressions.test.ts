import { describe, expect, it } from 'vitest';
import { SystemType } from '../types';
import {
  getMenuToolbarClasses,
  getMobileOverlayVisibility,
  sortEventsByUrgency
} from '../utils/mobileUiPolicy';

describe('Mobile UI Policy Regressions', () => {
  it('sorts events by priority, then severity, then earlier expiration', () => {
    const now = Date.now();
    const events = [
      {
        id: 'low-priority',
        systemId: SystemType.SOUND,
        title: 'A',
        description: 'A',
        severity: 3 as const,
        expiresAt: now + 8000,
        correctAction: 'X',
        options: [],
        priority: 2
      },
      {
        id: 'critical-no-priority',
        systemId: SystemType.LIGHTS,
        title: 'B',
        description: 'B',
        severity: 3 as const,
        expiresAt: now + 12000,
        correctAction: 'X',
        options: []
      },
      {
        id: 'high-priority',
        systemId: SystemType.VIDEO,
        title: 'C',
        description: 'C',
        severity: 1 as const,
        expiresAt: now + 20000,
        correctAction: 'X',
        options: [],
        priority: 8
      },
      {
        id: 'critical-sooner',
        systemId: SystemType.STAGE,
        title: 'D',
        description: 'D',
        severity: 3 as const,
        expiresAt: now + 3000,
        correctAction: 'X',
        options: []
      }
    ];

    const sorted = sortEventsByUrgency(events);
    expect(sorted.map(event => event.id)).toEqual([
      'high-priority',
      'critical-sooner',
      'low-priority',
      'critical-no-priority'
    ]);
  });

  it('hides non-critical mobile overlays when blocking overlays are present', () => {
    const visibility = getMobileOverlayVisibility({
      hasActiveMission: false,
      hasActiveNarrative: true,
      warningCount: 0,
      hasPrimaryEvent: false,
      hasClientMessage: true
    });

    expect(visibility.hasBlockingOverlay).toBe(true);
    expect(visibility.showNarrative).toBe(true);
    expect(visibility.primaryOverlay).toBe('NARRATIVE');
    expect(visibility.showClientPopup).toBe(false);
    expect(visibility.showCombo).toBe(false);
    expect(visibility.showSocialFeed).toBe(false);
  });

  it('shows client/combo/feed when no blocking overlays exist', () => {
    const visibility = getMobileOverlayVisibility({
      hasActiveMission: false,
      hasActiveNarrative: false,
      warningCount: 0,
      hasPrimaryEvent: false,
      hasClientMessage: true
    });

    expect(visibility.hasBlockingOverlay).toBe(false);
    expect(visibility.showMission).toBe(false);
    expect(visibility.showPrimaryEvent).toBe(false);
    expect(visibility.showWarnings).toBe(false);
    expect(visibility.showNarrative).toBe(false);
    expect(visibility.primaryOverlay).toBe('NONE');
    expect(visibility.showClientPopup).toBe(true);
    expect(visibility.showCombo).toBe(true);
    expect(visibility.showSocialFeed).toBe(false);
  });

  it('prioritizes event lane over mission/warnings/narrative to prevent stacked overlaps', () => {
    const visibility = getMobileOverlayVisibility({
      hasActiveMission: true,
      hasActiveNarrative: true,
      warningCount: 2,
      hasPrimaryEvent: true,
      hasClientMessage: true
    });

    expect(visibility.primaryOverlay).toBe('EVENT');
    expect(visibility.showPrimaryEvent).toBe(true);
    expect(visibility.showWarnings).toBe(false);
    expect(visibility.showNarrative).toBe(false);
    expect(visibility.showMission).toBe(false);
    expect(visibility.showClientPopup).toBe(false);
  });

  it('limits visible warnings in compact viewports', () => {
    const compact = getMobileOverlayVisibility({
      hasActiveMission: false,
      hasActiveNarrative: false,
      warningCount: 3,
      hasPrimaryEvent: false,
      hasClientMessage: false,
      isCompactViewport: true
    });

    expect(compact.showWarnings).toBe(true);
    expect(compact.maxVisibleWarningCards).toBe(1);
  });

  it('returns dedicated toolbar classes for mobile vs desktop menu', () => {
    const mobile = getMenuToolbarClasses(true);
    const desktop = getMenuToolbarClasses(false);
    const compactDesktop = getMenuToolbarClasses(false, true);

    expect(mobile.container.includes('top-')).toBe(true);
    expect(mobile.menuPanelOffset.includes('mt-24')).toBe(true);
    expect(desktop.container.includes('bottom-4')).toBe(true);
    expect(desktop.menuPanelOffset).toBe('mt-0');
    expect(compactDesktop.container.includes('top-3')).toBe(true);
    expect(compactDesktop.menuPanelOffset).toBe('mt-24');
  });
});
