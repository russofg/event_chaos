import { GameEvent } from '../types';

export interface MobileOverlayVisibilityInput {
  hasActiveMission: boolean;
  hasActiveNarrative: boolean;
  warningCount: number;
  hasPrimaryEvent: boolean;
  hasClientMessage: boolean;
  isCompactViewport?: boolean;
  centerHeight?: number;
}

export interface MobileOverlayVisibility {
  primaryOverlay: 'MISSION' | 'EVENT' | 'WARNING' | 'NARRATIVE' | 'NONE';
  hasBlockingOverlay: boolean;
  showMission: boolean;
  showPrimaryEvent: boolean;
  showWarnings: boolean;
  showNarrative: boolean;
  maxVisibleWarningCards: number;
  showClientPopup: boolean;
  showCombo: boolean;
  showSocialFeed: boolean;
}

export const sortEventsByUrgency = (events: GameEvent[]): GameEvent[] => {
  return [...events].sort((a, b) => {
    const priorityA = a.priority || 0;
    const priorityB = b.priority || 0;
    const highPriorityA = priorityA >= 5;
    const highPriorityB = priorityB >= 5;
    if (highPriorityA !== highPriorityB) return highPriorityB ? 1 : -1;

    if (!highPriorityA && !highPriorityB) {
      if (a.severity !== b.severity) return b.severity - a.severity;
      if (a.expiresAt !== b.expiresAt) return a.expiresAt - b.expiresAt;
      return priorityB - priorityA;
    }

    if (priorityA !== priorityB) return priorityB - priorityA;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return a.expiresAt - b.expiresAt;
  });
};

export const getMobileOverlayVisibility = ({
  hasActiveMission,
  hasActiveNarrative,
  warningCount,
  hasPrimaryEvent,
  hasClientMessage,
  isCompactViewport = false,
  centerHeight
}: MobileOverlayVisibilityInput): MobileOverlayVisibility => {
  const normalizedCenterHeight = Number.isFinite(centerHeight)
    ? Math.max(0, centerHeight as number)
    : undefined;
  const compactByHeight = typeof normalizedCenterHeight === 'number'
    ? normalizedCenterHeight < 360
    : false;
  const ultraCompactByHeight = typeof normalizedCenterHeight === 'number'
    ? normalizedCenterHeight < 300
    : false;
  const isCompact = isCompactViewport || compactByHeight;
  const isUltraCompact = isCompactViewport && compactByHeight ? true : ultraCompactByHeight;

  const showPrimaryEvent = hasPrimaryEvent;
  const showWarnings = warningCount > 0 && (!showPrimaryEvent || !isUltraCompact);
  const showNarrative = hasActiveNarrative && !showPrimaryEvent && (!showWarnings || !isCompact);
  const showMission = hasActiveMission && !showPrimaryEvent && !showWarnings && (!showNarrative || !isCompact);
  const hasBlockingOverlay = showMission || showPrimaryEvent || showWarnings || showNarrative;

  const primaryOverlay: MobileOverlayVisibility['primaryOverlay'] = showPrimaryEvent
    ? 'EVENT'
    : showWarnings
      ? 'WARNING'
      : showNarrative
        ? 'NARRATIVE'
        : showMission
          ? 'MISSION'
          : 'NONE';

  const allowSecondaryPanels = !isCompact;
  const showClientPopup =
    hasClientMessage &&
    !showPrimaryEvent &&
    !showNarrative &&
    (!showWarnings || allowSecondaryPanels);
  const showCombo =
    !showPrimaryEvent &&
    !showWarnings &&
    !showNarrative &&
    (!hasClientMessage || allowSecondaryPanels);
  const showSocialFeed = !showPrimaryEvent && !showWarnings && !showNarrative && !hasClientMessage && !showMission;

  return {
    primaryOverlay,
    hasBlockingOverlay,
    showMission,
    showPrimaryEvent,
    showWarnings,
    showNarrative,
    maxVisibleWarningCards: isUltraCompact ? 1 : isCompact ? 2 : 3,
    showClientPopup,
    showCombo,
    showSocialFeed
  };
};

export interface MenuToolbarClasses {
  container: string;
  button: string;
  icon: string;
  menuPanelOffset: string;
}

export const getMenuToolbarClasses = (
  isMobile: boolean,
  isCompactDesktop: boolean = false
): MenuToolbarClasses => {
  if (isMobile) {
    return {
      container:
        'absolute top-[max(0.5rem,env(safe-area-inset-top))] left-2 right-2 flex flex-wrap justify-center gap-2 z-[70]',
      button: 'aaa-toolbar-btn px-3 py-1.5 text-white flex items-center gap-1.5 text-sm',
      icon: 'w-4 h-4',
      menuPanelOffset: 'mt-24 sm:mt-20 md:mt-0'
    };
  }

  if (isCompactDesktop) {
    return {
      container:
        'absolute top-3 left-3 right-3 flex flex-wrap justify-center md:justify-start gap-2 z-[70]',
      button: 'aaa-toolbar-btn px-3 py-1.5 text-white flex items-center gap-1.5 text-sm',
      icon: 'w-4 h-4',
      menuPanelOffset: 'mt-24'
    };
  }

  return {
    container: 'absolute top-4 left-4 right-4 md:right-auto flex flex-wrap gap-3 z-50',
    button: 'aaa-toolbar-btn px-4 py-2 text-white flex items-center gap-2',
    icon: 'w-5 h-5',
    menuPanelOffset: 'mt-0'
  };
};
