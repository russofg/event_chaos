
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameMode, GameState, SystemType, SystemState, GameEventOption } from './types';
import { SCENARIOS, TUTORIAL_STEPS, PERMANENT_UPGRADES, WIN_CONDITIONS } from './constants';
import { useGameLogic } from './hooks/useGameLogic';
import { useClientAI } from './hooks/useClientAI';
import { useSoundSynth, DEFAULT_USER_AUDIO_MIX, normalizeUserAudioMix } from './hooks/useSoundSynth';
import type { AudioSpatialMode, UserAudioMix } from './hooks/useSoundSynth';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';
import { EventCard } from './components/EventCard';
import { Visualizer } from './components/Visualizer';
import { ClientPopup } from './components/ClientPopup';
import { FXCanvas } from './components/FXCanvas';
import { GameMenu } from './components/GameMenu';
import { Shop } from './components/Shop'; // New Import
import { SocialFeed } from './components/SocialFeed';
import { TerminalLog } from './components/TerminalLog';
import { FaderPanel } from './components/FaderPanel';
import { MinigameOverlay } from './components/Minigames';
import { TutorialOverlay } from './components/TutorialOverlay';
import { MissionPanel } from './components/MissionPanel'; // New Import
import { ComboIndicator } from './components/ComboIndicator';
import { NarrativePopup } from './components/NarrativePopup';
import { EarlyWarningPanel } from './components/EarlyWarningPanel';
import { useComboSystem } from './hooks/useComboSystem';
import { useNarrativeSystem } from './hooks/useNarrativeSystem';
import { useEarlyWarningSystem } from './hooks/useEarlyWarningSystem';
import { useAchievementSystem, ACHIEVEMENTS } from './hooks/useAchievementSystem';
import { useUpgradeSystem } from './hooks/useUpgradeSystem';
import { useDynamicColors } from './hooks/useDynamicColors';
import { AchievementPanel } from './components/AchievementPanel';
import { UpgradeShop } from './components/UpgradeShop';
import { GameSettingsPanel } from './components/GameSettingsPanel';
import { computeMobileHudInsets } from './utils/mobileHudLayout';
import { getVisualQualityProfile } from './utils/visualPerformance';
import type { VisualQualityMode } from './utils/visualPerformance';
import { getCinematicTransitionStyle, getThreatLevel, getThreatRailProfile } from './utils/cinematicFx';
import { getEventImpactStyle } from './utils/impactFx';
import type { EventImpactStyle } from './utils/impactFx';
import { buildRuntimeDiagnosticsSnapshot } from './utils/runtimeDiagnostics';
import { getMenuToolbarClasses, getMobileOverlayVisibility, sortEventsByUrgency } from './utils/mobileUiPolicy';
import { Activity, DollarSign, Trophy, AlertOctagon, Users, ZapOff, Frown, Pause, RotateCcw, AlertTriangle, Settings, Home } from 'lucide-react';

const VISUAL_QUALITY_STORAGE_KEY = 'event_chaos_visual_quality_mode';
const USER_SETTINGS_STORAGE_KEY = 'event_chaos_user_settings_v1';
const VISUAL_QUALITY_SEQUENCE: VisualQualityMode[] = ['AUTO', 'PERFORMANCE', 'CINEMATIC'];
const VISUAL_QUALITY_LABEL: Record<VisualQualityMode, string> = {
  AUTO: 'AUTO',
  PERFORMANCE: 'PERF',
  CINEMATIC: 'CINE'
};
const AUDIO_SPATIAL_SEQUENCE: AudioSpatialMode[] = ['BALANCED', 'CINEMATIC', 'FOCUS'];
const DEFAULT_AUDIO_SPATIAL_MODE: AudioSpatialMode = 'BALANCED';

interface StoredUserSettings {
  visualQualityMode?: VisualQualityMode;
  reducedMotion?: boolean;
  highContrastUi?: boolean;
  audioSpatialMode?: AudioSpatialMode;
  audioMix?: Partial<UserAudioMix>;
}

interface ActiveCinematicTransition {
  id: number;
  label: string;
  tint: 'CYAN' | 'AMBER' | 'RED' | 'EMERALD' | 'SLATE';
  durationMs: number;
}

interface ActiveImpactFx extends EventImpactStyle {
  id: number;
}

interface ActiveFreezePulse {
  id: number;
  durationMs: number;
  tint: 'SUCCESS' | 'FAIL';
}

interface ActiveCameraPunch {
  id: number;
  durationMs: number;
  x: number;
  y: number;
}

const loadStoredUserSettings = (): StoredUserSettings => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredUserSettings;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const App: React.FC = () => {
  const { 
    gameState, 
    stats, 
    systems, 
    activeEvents, 
    activeMinigame,
    careerData,
    inventory,
    activeMission, // New Mission State
    tutorialActive,
    tutorialStepIndex,
    advanceTutorial,
    finishTutorial,
    initializeSession, // Use this for Menu -> Shop
    buyItem, // For Shop
    startGame, // Shop -> Game
    togglePause,
    quitGame,
    resolveEvent, 
    completeMinigame,
    setGameState,
    handleFaderChange,
    applyComboBonus,
    setComboBonusCallback,
    setEventResolutionCallback,
    currentScenario,
    currentGameMode,
    pendingStartData,
    saveCareer // Fase 3: For achievements/upgrades
  } = useGameLogic();

  // REMOVED: useAIImage hook is no longer needed for 2D visualizer
  const { clientMessage, clientMood, clearMessage } = useClientAI(stats, gameState === GameState.PLAYING && !tutorialActive);
  const {
    playClick,
    playError,
    playSuccess,
    playAlarm,
    playStartGame,
    playScenarioTransitionSfx,
    playStateTransitionSfx,
    playEventResolutionSfx,
    playEventEscalationSfx,
    setScenarioAudioProfile,
    setGameModeAudioPreset,
    setUserAudioMix,
    setSpatialAudioMode,
    setAdaptiveAudioMix,
    startBackgroundLoop,
    stopBackgroundLoop,
    updateBackgroundLoop
  } = useSoundSynth();
  
  // Combo System
  const { comboState, setBonusCallback } = useComboSystem({ 
    systems, 
    isPlaying: gameState === GameState.PLAYING && !tutorialActive 
  });
  
  const [selectedSystem, setSelectedSystem] = useState<SystemType>(SystemType.SOUND);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionTrigger, setExplosionTrigger] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(GameMode.NORMAL);
  const [logs, setLogs] = useState<{id: string, text: string, type: 'info'|'error'|'warning'|'success'}[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [visualQualityMode, setVisualQualityMode] = useState<VisualQualityMode>(() => {
    const storedSettings = loadStoredUserSettings();
    if (storedSettings.visualQualityMode) {
      return storedSettings.visualQualityMode;
    }
    if (typeof window === 'undefined') return 'AUTO';
    const savedMode = window.localStorage.getItem(VISUAL_QUALITY_STORAGE_KEY);
    if (savedMode === 'AUTO' || savedMode === 'PERFORMANCE' || savedMode === 'CINEMATIC') {
      return savedMode;
    }
    return 'AUTO';
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    const storedSettings = loadStoredUserSettings();
    return Boolean(storedSettings.reducedMotion);
  });
  const [highContrastUi, setHighContrastUi] = useState<boolean>(() => {
    const storedSettings = loadStoredUserSettings();
    return Boolean(storedSettings.highContrastUi);
  });
  const [audioSpatialMode, setAudioSpatialMode] = useState<AudioSpatialMode>(() => {
    const storedSettings = loadStoredUserSettings();
    const mode = storedSettings.audioSpatialMode;
    if (mode === 'BALANCED' || mode === 'CINEMATIC' || mode === 'FOCUS') return mode;
    return DEFAULT_AUDIO_SPATIAL_MODE;
  });
  const [audioMix, setAudioMix] = useState<UserAudioMix>(() => {
    const storedSettings = loadStoredUserSettings();
    return normalizeUserAudioMix(storedSettings.audioMix || DEFAULT_USER_AUDIO_MIX);
  });
  const [mobileHudInsets, setMobileHudInsets] = useState(() => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : undefined;
    return computeMobileHudInsets({ headerHeight: 76, faderHeight: 176, viewportHeight });
  });
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1380 || window.innerHeight < 900;
  });
  const [activeTransition, setActiveTransition] = useState<ActiveCinematicTransition | null>(null);
  const [activeImpactFx, setActiveImpactFx] = useState<ActiveImpactFx | null>(null);
  const [activeFreezePulse, setActiveFreezePulse] = useState<ActiveFreezePulse | null>(null);
  const [activeCameraPunch, setActiveCameraPunch] = useState<ActiveCameraPunch | null>(null);
  
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const prevGameStateRef = useRef<GameState>(gameState);
  const headerRef = useRef<HTMLElement | null>(null);
  const mobileFaderDockRef = useRef<HTMLDivElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const impactTimeoutRef = useRef<number | null>(null);
  const freezeTimeoutRef = useRef<number | null>(null);
  const punchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches);
    };

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateCompactViewport = () => {
      setIsCompactViewport(window.innerWidth < 1380 || window.innerHeight < 900);
    };

    updateCompactViewport();
    window.addEventListener('resize', updateCompactViewport);
    window.addEventListener('orientationchange', updateCompactViewport);
    return () => {
      window.removeEventListener('resize', updateCompactViewport);
      window.removeEventListener('orientationchange', updateCompactViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VISUAL_QUALITY_STORAGE_KEY, visualQualityMode);
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify({
      visualQualityMode,
      reducedMotion,
      highContrastUi,
      audioSpatialMode,
      audioMix
    }));
  }, [audioMix, audioSpatialMode, highContrastUi, reducedMotion, visualQualityMode]);

  useEffect(() => {
    setScenarioAudioProfile(currentScenario.id);
  }, [currentScenario.id, setScenarioAudioProfile]);

  useEffect(() => {
    setGameModeAudioPreset(currentGameMode);
  }, [currentGameMode, setGameModeAudioPreset]);

  useEffect(() => {
    setUserAudioMix(audioMix);
  }, [audioMix, setUserAudioMix]);

  useEffect(() => {
    setSpatialAudioMode(audioSpatialMode);
  }, [audioSpatialMode, setSpatialAudioMode]);

  useEffect(() => {
    const previousState = prevGameStateRef.current;
    if (previousState === gameState) return;

    const transitionStyle = getCinematicTransitionStyle(previousState, gameState);
    if (transitionStyle) {
      const transitionId = Date.now();
      setActiveTransition({
        id: transitionId,
        ...transitionStyle
      });

      playStateTransitionSfx(previousState, gameState);

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = window.setTimeout(() => {
        setActiveTransition(current =>
          current && current.id === transitionId ? null : current
        );
        transitionTimeoutRef.current = null;
      }, transitionStyle.durationMs);
    }

    prevGameStateRef.current = gameState;
  }, [gameState, playStateTransitionSfx]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (impactTimeoutRef.current) {
        clearTimeout(impactTimeoutRef.current);
      }
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
      if (punchTimeoutRef.current) {
        clearTimeout(punchTimeoutRef.current);
      }
    };
  }, []);

  const updateMobileHudLayout = useCallback(() => {
    if (!isMobileLayout) return;
    const headerHeight = headerRef.current?.getBoundingClientRect().height || 76;
    const faderHeight = mobileFaderDockRef.current?.getBoundingClientRect().height || 176;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : undefined;
    setMobileHudInsets(computeMobileHudInsets({ headerHeight, faderHeight, viewportHeight }));
  }, [isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout || (gameState !== GameState.PLAYING && gameState !== GameState.PAUSED)) return;

    updateMobileHudLayout();
    const rafId = window.requestAnimationFrame(updateMobileHudLayout);
    const timeoutId = window.setTimeout(updateMobileHudLayout, 180);
    window.addEventListener('resize', updateMobileHudLayout);
    window.addEventListener('orientationchange', updateMobileHudLayout);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateMobileHudLayout());
      if (headerRef.current) resizeObserver.observe(headerRef.current);
      if (mobileFaderDockRef.current) resizeObserver.observe(mobileFaderDockRef.current);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', updateMobileHudLayout);
      window.removeEventListener('orientationchange', updateMobileHudLayout);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [gameState, isMobileLayout, updateMobileHudLayout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addLog = (text: string, type: 'info'|'error'|'warning'|'success' = 'info') => {
      setLogs(prev => [...prev.slice(-20), { id: Math.random().toString(), text, type }]);
  };

  // Narrative System (Fase 2)
  const { activeNarrative, dismissNarrative } = useNarrativeSystem({
    stats,
    systems,
    isPlaying: gameState === GameState.PLAYING && !tutorialActive,
    currentScenario: currentScenario
  });
  
  // Early Warning System (Fase 2)
  const handlePreventEvent = useCallback((warningId: string) => {
    addLog(`Evento prevenido: ${warningId}`, 'success');
    playSuccess();
    // Small bonus for preventing events
    // This could be integrated with useGameLogic if needed
  }, [playSuccess]);
  
  const { activeWarnings } = useEarlyWarningSystem({
    stats,
    systems,
    isPlaying: gameState === GameState.PLAYING && !tutorialActive,
    onPreventEvent: handlePreventEvent
  });

  // Achievement System (Fase 3)
  const handleAchievementUnlocked = useCallback((achievementId: string, points: number) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (achievement && !careerData.unlockedAchievements.includes(achievementId)) {
      const newCareer = {
        ...careerData,
        unlockedAchievements: [...careerData.unlockedAchievements, achievementId],
        careerPoints: careerData.careerPoints + points
      };
      saveCareer(newCareer);
      addLog(`🎉 Logro desbloqueado: ${achievement.title} (+${points} pts)`, 'success');
      playSuccess();
    }
  }, [careerData, saveCareer, playSuccess]);

  const { sessionData, trackEventResolved, trackSpending } = useAchievementSystem({
    stats,
    systems,
    activeEvents,
    // Keep session progress across pause; only stop tracking when leaving gameplay flow.
    isPlaying: (gameState === GameState.PLAYING || gameState === GameState.PAUSED) && !tutorialActive,
    careerData,
    onAchievementUnlocked: handleAchievementUnlocked
  });

  useEffect(() => {
    setEventResolutionCallback(({ success, cost, systemId, severity, eventTitle }) => {
      trackEventResolved(success);
      if (cost > 0) {
        trackSpending(cost);
      }
      playEventResolutionSfx({ systemId, success, severity });

      const impactStyle = getEventImpactStyle(systemId, success, severity);
      const impactId = Date.now();
      setActiveImpactFx({
        id: impactId,
        ...impactStyle
      });
      if (impactTimeoutRef.current) {
        clearTimeout(impactTimeoutRef.current);
      }
      impactTimeoutRef.current = window.setTimeout(() => {
        setActiveImpactFx(current => (current && current.id === impactId ? null : current));
        impactTimeoutRef.current = null;
      }, impactStyle.durationMs);

      setActiveFreezePulse({
        id: impactId,
        durationMs: impactStyle.freezeMs,
        tint: success ? 'SUCCESS' : 'FAIL'
      });
      if (freezeTimeoutRef.current) {
        clearTimeout(freezeTimeoutRef.current);
      }
      freezeTimeoutRef.current = window.setTimeout(() => {
        setActiveFreezePulse(current => (current && current.id === impactId ? null : current));
        freezeTimeoutRef.current = null;
      }, impactStyle.freezeMs);

      const directionX = impactStyle.origin.xPercent < 35 ? 1 : impactStyle.origin.xPercent > 65 ? -1 : 0;
      const directionY = impactStyle.origin.yPercent < 40 ? 1 : impactStyle.origin.yPercent > 65 ? -1 : 0;
      const punchAmplitude = (success ? 2.4 : 4.2) + (severity * (success ? 0.9 : 1.35));
      setActiveCameraPunch({
        id: impactId,
        x: directionX * punchAmplitude,
        y: directionY * punchAmplitude,
        durationMs: Math.round(success ? 130 + severity * 16 : 155 + severity * 22)
      });
      if (punchTimeoutRef.current) {
        clearTimeout(punchTimeoutRef.current);
      }
      punchTimeoutRef.current = window.setTimeout(() => {
        setActiveCameraPunch(current => (current && current.id === impactId ? null : current));
        punchTimeoutRef.current = null;
      }, success ? 160 : 210);

      if (success) {
        setExplosionTrigger(t => !t);
        addLog(`${systemId}: ${eventTitle} RESUELTO`, 'success');
      } else {
        addLog(`${systemId}: ${eventTitle} RESOLUCIÓN FALLIDA`, 'error');
      }
    });
  }, [setEventResolutionCallback, trackEventResolved, trackSpending, playEventResolutionSfx]);

  // Upgrade System (Fase 3)
  const handleUpgradePurchased = useCallback((upgradeId: string, cost: number) => {
    const upgrade = PERMANENT_UPGRADES.find(u => u.id === upgradeId);
    const missingRequirements = (upgrade?.requires || []).filter(
      requirementId => !careerData.unlockedUpgrades.includes(requirementId)
    );

    if (missingRequirements.length > 0) {
      addLog('Esta mejora todavía requiere desbloqueos previos', 'warning');
      playError();
      return;
    }

    // Verificar que no esté ya desbloqueado y que tenga puntos suficientes
    if (careerData.unlockedUpgrades.includes(upgradeId)) {
      addLog('Esta mejora ya está desbloqueada', 'warning');
      return; // Ya está desbloqueado
    }
    if (careerData.careerPoints < cost) {
      addLog('No tienes suficientes puntos de carrera', 'error');
      playError();
      return; // No tiene puntos suficientes
    }

    const newCareer = {
      ...careerData,
      unlockedUpgrades: [...careerData.unlockedUpgrades, upgradeId],
      careerPoints: careerData.careerPoints - cost
    };
    saveCareer(newCareer);
    addLog(`✅ Mejora desbloqueada: ${upgrade?.name || upgradeId}`, 'success');
    playSuccess();
  }, [careerData, saveCareer, playSuccess, playError]);

  const { getAvailableUpgrades, purchaseUpgrade } = useUpgradeSystem({
    careerData,
    onUpgradePurchased: handleUpgradePurchased
  });

  // Setup combo bonus callback
  useEffect(() => {
    setBonusCallback((bonus) => {
      applyComboBonus(bonus);
      addLog(bonus.message, 'success');
      playSuccess();
    });
  }, [setBonusCallback, applyComboBonus, playSuccess]);

  // Audio Loop Logic
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          startBackgroundLoop();
      } else {
          stopBackgroundLoop();
      }
      return () => {
          stopBackgroundLoop();
      };
  }, [gameState, startBackgroundLoop, stopBackgroundLoop]);

  // Audio Reactive Updates
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          updateBackgroundLoop(
              systems[SystemType.SOUND].faderValue, 
              systems[SystemType.SOUND].status,
              stats.stress,
              systems[SystemType.STAGE].faderValue,
              stats.publicInterest,
              systems
          );
      }
  }, [gameState, systems, stats.stress, stats.publicInterest, updateBackgroundLoop]);


  useEffect(() => {
     const prevIds = prevEventIdsRef.current;
     const newEvents = activeEvents.filter(event => !prevIds.has(event.id));

     if (newEvents.length > 0) {
       newEvents.forEach((newEvent) => {
         const isEscalation = Boolean(newEvent.escalatedFrom);
         addLog(
           `${newEvent.systemId}: ${newEvent.title} ${isEscalation ? 'ESCALATED' : 'DETECTED'}`,
           isEscalation || newEvent.severity === 3 ? 'error' : 'warning'
         );

         if (isEscalation) {
           playEventEscalationSfx({ systemId: newEvent.systemId, severity: newEvent.severity });
           setScreenShake(true);
           setTimeout(() => setScreenShake(false), 450);
         } else if (newEvent.severity === 3) {
           playAlarm();
           setScreenShake(true);
           setTimeout(() => setScreenShake(false), 500);
         } else {
           playError();
         }
       });
     }

     prevEventIdsRef.current = new Set(activeEvents.map(event => event.id));
  }, [activeEvents, playAlarm, playError, playEventEscalationSfx]);

  const criticalEventCount = useMemo(
    () => activeEvents.reduce((acc, event) => acc + (event.severity === 3 ? 1 : 0), 0),
    [activeEvents]
  );
  const warningEventCount = useMemo(
    () => activeEvents.reduce((acc, event) => acc + (event.severity === 2 ? 1 : 0), 0),
    [activeEvents]
  );
  const sortedActiveEvents = useMemo(
    () => sortEventsByUrgency(activeEvents),
    [activeEvents]
  );
  const mobilePrimaryEvent = sortedActiveEvents[0] || null;
  const mobileQueuedEvents = Math.max(0, sortedActiveEvents.length - 1);
  const mobileCenterHeight = useMemo(() => {
    if (!isMobileLayout || typeof window === 'undefined') return undefined;
    return Math.max(0, window.innerHeight - mobileHudInsets.top - mobileHudInsets.bottom);
  }, [isMobileLayout, mobileHudInsets.bottom, mobileHudInsets.top]);
  const threatLevel = useMemo(
    () => getThreatLevel(stats.stress, criticalEventCount, warningEventCount),
    [criticalEventCount, stats.stress, warningEventCount]
  );
  const threatRailProfile = useMemo(
    () => getThreatRailProfile(threatLevel, gameState === GameState.PAUSED),
    [gameState, threatLevel]
  );

  useEffect(() => {
    setAdaptiveAudioMix({
      isPlaying: gameState === GameState.PLAYING,
      criticalEvents: criticalEventCount,
      warningEvents: warningEventCount,
      stress: stats.stress,
      overlaysActive: Boolean(activeMission || activeNarrative || activeWarnings.length > 0 || clientMessage)
    });
  }, [
    activeMission,
    activeNarrative,
    activeWarnings,
    clientMessage,
    criticalEventCount,
    gameState,
    setAdaptiveAudioMix,
    stats.stress,
    warningEventCount
  ]);


  const handleStartSession = (scenarioId: string, crewId: string, gameMode: GameMode) => {
      playClick();
      const resolvedScenarioId = initializeSession(scenarioId, crewId, gameMode); // Goes to Shop
      setScenarioAudioProfile(resolvedScenarioId);
      setGameModeAudioPreset(gameMode);
      playScenarioTransitionSfx(resolvedScenarioId, 'LOAD');
      if (resolvedScenarioId !== scenarioId) {
        setSelectedScenarioId(resolvedScenarioId);
        addLog(`Escenario bloqueado. Redirigido a ${resolvedScenarioId}.`, 'warning');
      }
      addLog(`Loading Scenario Config: ${resolvedScenarioId} (${gameMode})...`, 'info');
  };
  
  const handleShopFinish = () => {
      playStartGame(currentScenario.id);
      startGame(); // Goes to Playing
      setLogs([]);
      addLog('SYSTEM INITIALIZED. SHOW STARTED.', 'success');
  };

  const handleResolveEvent = (id: string, option: GameEventOption) => {
      playClick();
      resolveEvent(id, option);
      addLog(`User Action: ${option.label}`, 'info');
  };

  const handleSystemSelect = (sys: SystemType) => {
    playClick();
    setSelectedSystem(sys);
  };

  const cycleVisualQuality = useCallback(() => {
    setVisualQualityMode((prevMode) => {
      const currentIndex = VISUAL_QUALITY_SEQUENCE.indexOf(prevMode);
      const nextMode = VISUAL_QUALITY_SEQUENCE[(currentIndex + 1) % VISUAL_QUALITY_SEQUENCE.length];
      addLog(`Visual FX: ${nextMode}`, 'info');
      return nextMode;
    });
  }, []);

  const cycleAudioSpatial = useCallback(() => {
    setAudioSpatialMode((prevMode) => {
      const currentIndex = AUDIO_SPATIAL_SEQUENCE.indexOf(prevMode);
      const nextMode = AUDIO_SPATIAL_SEQUENCE[(currentIndex + 1) % AUDIO_SPATIAL_SEQUENCE.length];
      addLog(`Audio Espacial: ${nextMode}`, 'info');
      return nextMode;
    });
  }, []);

  const handleAudioMixChange = useCallback((mix: Partial<UserAudioMix>) => {
    setAudioMix((prev) => normalizeUserAudioMix(mix, prev));
  }, []);

  const resetSettings = useCallback(() => {
    setVisualQualityMode('AUTO');
    setReducedMotion(false);
    setHighContrastUi(false);
    setAudioSpatialMode(DEFAULT_AUDIO_SPATIAL_MODE);
    setAudioMix(DEFAULT_USER_AUDIO_MIX);
    addLog('Ajustes restablecidos a valores por defecto', 'warning');
  }, []);
  
  const getGameOverReason = () => {
      if (gameState === GameState.VICTORY) return { 
          title: "MISIÓN CUMPLIDA", 
          desc: "Evento finalizado con éxito.", 
          icon: Trophy, color: "text-emerald-400"
      };
      if (stats.stress >= 100) return { 
          title: "COLAPSO NERVIOSO", 
          desc: "El operador no pudo manejar la presión.", 
          icon: ZapOff, color: "text-red-500"
      };
      if (stats.publicInterest <= 0) return { 
          title: "PÚBLICO HOSTIL", 
          desc: "Disturbios generalizados.", 
          icon: Users, color: "text-red-500"
      };
      if (stats.clientSatisfaction <= 0) return { 
          title: "DESPEDIDO", 
          desc: "El cliente canceló el contrato.", 
          icon: Frown, color: "text-red-500"
      };
      if (stats.budget < WIN_CONDITIONS.minBudget) return { 
          title: "QUIEBRA", 
          desc: "Fondos insuficientes.", 
          icon: DollarSign, color: "text-red-500"
      };
      return { title: "GAME OVER", desc: "Sistema terminado.", icon: AlertOctagon, color: "text-red-500" };
  };
  
  // DAMAGE EFFECTS
  const videoCritical = systems[SystemType.VIDEO].status === 'CRITICAL';
  const stageSmoke = systems[SystemType.STAGE].faderValue > 80;
  const mobileOverlayVisibility = useMemo(
    () =>
      getMobileOverlayVisibility({
        hasActiveMission: Boolean(activeMission),
        hasActiveNarrative: Boolean(activeNarrative),
        warningCount: activeWarnings.length,
        hasPrimaryEvent: Boolean(mobilePrimaryEvent),
        hasClientMessage: Boolean(clientMessage),
        isCompactViewport: isMobileLayout && isCompactViewport,
        centerHeight: mobileCenterHeight
      }),
    [
      activeMission,
      activeNarrative,
      activeWarnings.length,
      clientMessage,
      isCompactViewport,
      isMobileLayout,
      mobileCenterHeight,
      mobilePrimaryEvent
    ]
  );
  const showMobileMission = mobileOverlayVisibility.showMission;
  const showMobilePrimaryEvent = mobileOverlayVisibility.showPrimaryEvent;
  const showMobileWarnings = mobileOverlayVisibility.showWarnings;
  const showMobileNarrative = mobileOverlayVisibility.showNarrative;
  const showMobileClientPopup = mobileOverlayVisibility.showClientPopup;
  const showMobileCombo = mobileOverlayVisibility.showCombo;
  const showMobileSocialFeed = mobileOverlayVisibility.showSocialFeed;
  const runtimeVisualProfile = useMemo(() => {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : null;
    const deviceMemoryGb = nav && typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
    const hardwareConcurrency = nav?.hardwareConcurrency || 8;

    return getVisualQualityProfile({
      isMobile: isMobileLayout,
      stressLevel: stats.stress,
      activeEvents: activeEvents.length,
      criticalEvents: criticalEventCount,
      qualityMode: visualQualityMode,
      prefersReducedMotion: reducedMotion,
      deviceMemoryGb,
      hardwareConcurrency
    });
  }, [
    activeEvents.length,
    criticalEventCount,
    isMobileLayout,
    reducedMotion,
    stats.stress,
    visualQualityMode
  ]);
  const runtimeDiagnostics = useMemo(
    () =>
      buildRuntimeDiagnosticsSnapshot({
        stats: {
          publicInterest: stats.publicInterest,
          clientSatisfaction: stats.clientSatisfaction,
          stress: stats.stress,
          budget: stats.budget
        },
        activeEvents: activeEvents.length,
        criticalEvents: criticalEventCount,
        warningEvents: warningEventCount,
        hasBlockingOverlay: mobileOverlayVisibility.hasBlockingOverlay,
        mobileCenterHeight,
        visualProfile: runtimeVisualProfile
      }),
    [
      activeEvents.length,
      criticalEventCount,
      mobileCenterHeight,
      mobileOverlayVisibility.hasBlockingOverlay,
      runtimeVisualProfile,
      stats.budget,
      stats.clientSatisfaction,
      stats.publicInterest,
      stats.stress,
      warningEventCount
    ]
  );

  // Fase 4: Paleta de colores dinámica
  const dynamicColors = useDynamicColors(stats, systems);
  const transitionTintClass: Record<ActiveCinematicTransition['tint'], string> = {
    CYAN: 'from-cyan-400/35 via-sky-400/20 to-transparent',
    AMBER: 'from-amber-400/35 via-orange-400/20 to-transparent',
    RED: 'from-red-500/45 via-red-400/24 to-transparent',
    EMERALD: 'from-emerald-400/35 via-emerald-300/20 to-transparent',
    SLATE: 'from-slate-300/24 via-slate-200/12 to-transparent'
  };
  const threatRailColorClass =
    threatRailProfile.tone === 'CRITICAL'
      ? 'from-red-500/80 via-orange-400/70 to-red-500/80'
      : threatRailProfile.tone === 'ELEVATED'
        ? 'from-amber-400/75 via-orange-300/70 to-amber-400/75'
        : 'from-cyan-400/72 via-sky-300/65 to-cyan-400/72';
  const impactOverlayToneClass = activeImpactFx?.success ? 'aaa-impact-success' : 'aaa-impact-fail';
  const freezeOverlayToneClass = activeFreezePulse?.tint === 'FAIL' ? 'aaa-freeze-fail' : 'aaa-freeze-success';
  const menuToolbarClasses = useMemo(
    () => getMenuToolbarClasses(isMobileLayout, !isMobileLayout && isCompactViewport),
    [isCompactViewport, isMobileLayout]
  );

  return (
    <div 
        className={`aaa-shell h-screen w-screen text-slate-100 flex flex-col overflow-hidden relative selection:bg-cyan-500 selection:text-black font-sans
            ${screenShake ? 'animate-shake' : ''}
            transition-colors duration-1000
        `}
        style={{
          // Aplicar tint dinámico al fondo
          background: gameState === GameState.PLAYING 
            ? `linear-gradient(160deg, #050a16 0%, ${dynamicColors.bgColor} 52%, #08162d 100%)`
            : 'linear-gradient(160deg, #040814, #09172a 56%, #10243d)',
          filter: highContrastUi ? 'contrast(1.12) saturate(1.08)' : undefined
        }}
    >
      {/* --- ATMOSPHERE LAYERS --- */}
      <div className="aaa-bg-aurora"></div>
      <div className="aaa-bg-grid"></div>
      <div className="aaa-bg-noise"></div>
      <div className="aaa-bg-vignette"></div>

      {/* --- DAMAGE OVERLAYS --- */}
      
      {/* Video Failure Glitch */}
      {videoCritical && (
        <div className="absolute inset-0 z-[60] pointer-events-none opacity-40 mix-blend-hard-light animate-pulse bg-red-900" 
             style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', filter: 'url(#glitch)' }}>
            <div className="absolute top-1/2 left-0 w-full h-2 bg-white skew-x-12 opacity-50"></div>
            <div className="absolute top-1/4 left-0 w-full h-4 bg-blue-500 skew-x-[-12deg] opacity-30 mix-blend-exclusion"></div>
        </div>
      )}

      {/* Smoke Fog */}
      {stageSmoke && (
          <div className="absolute inset-0 z-[55] pointer-events-none bg-white/10 backdrop-blur-[2px] animate-pulse"></div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="absolute top-0 left-0 right-0 z-[44] pointer-events-none">
          <div
            className={`aaa-threat-rail bg-gradient-to-r ${threatRailColorClass}`}
            style={{
              opacity: threatRailProfile.opacity,
              boxShadow:
                threatRailProfile.tone === 'CRITICAL'
                  ? `0 0 ${18 + threatRailProfile.glowStrength * 16}px rgba(239,68,68,0.55)`
                  : threatRailProfile.tone === 'ELEVATED'
                    ? `0 0 ${14 + threatRailProfile.glowStrength * 14}px rgba(245,158,11,0.5)`
                    : `0 0 ${10 + threatRailProfile.glowStrength * 10}px rgba(34,211,238,0.48)`,
              ['--aaa-threat-pulse' as string]: `${threatRailProfile.pulseMs}ms`
            } as React.CSSProperties}
          />
        </div>
      )}

      {activeTransition && (
        <div
          className="absolute inset-0 z-[92] pointer-events-none aaa-transition-overlay"
          style={{ ['--aaa-fx-duration' as string]: `${activeTransition.durationMs}ms` } as React.CSSProperties}
        >
          <div className={`absolute inset-0 bg-gradient-to-b ${transitionTintClass[activeTransition.tint]}`}></div>
          <div className="absolute inset-x-0 top-[42%] flex justify-center">
            <div className="aaa-transition-label px-5 py-2 rounded-full text-[11px] sm:text-xs">
              {activeTransition.label}
            </div>
          </div>
        </div>
      )}

      {activeImpactFx && (
        <div
          className={`absolute inset-0 z-[89] pointer-events-none aaa-impact-overlay ${impactOverlayToneClass}`}
          style={{
            ['--aaa-impact-duration' as string]: `${activeImpactFx.durationMs}ms`,
            ['--aaa-impact-ring-duration' as string]: `${activeImpactFx.ringDurationMs}ms`,
            ['--aaa-impact-x' as string]: `${activeImpactFx.origin.xPercent}%`,
            ['--aaa-impact-y' as string]: `${activeImpactFx.origin.yPercent}%`,
            ['--aaa-impact-opacity' as string]: `${activeImpactFx.overlayOpacity}`,
            ['--aaa-impact-color' as string]: activeImpactFx.colorHex,
            ['--aaa-impact-glow' as string]: activeImpactFx.glowHex
          } as React.CSSProperties}
        >
          <div className="aaa-impact-core"></div>
          <div className="aaa-impact-ring"></div>
        </div>
      )}

      {activeCameraPunch && (
        <div
          className="absolute inset-0 z-[90] pointer-events-none aaa-camera-punch"
          style={{
            ['--aaa-fx-duration' as string]: `${activeCameraPunch.durationMs}ms`,
            ['--aaa-punch-x' as string]: `${activeCameraPunch.x}px`,
            ['--aaa-punch-y' as string]: `${activeCameraPunch.y}px`
          } as React.CSSProperties}
        ></div>
      )}

      {activeFreezePulse && (
        <div
          className={`absolute inset-0 z-[93] pointer-events-none aaa-freeze-overlay ${freezeOverlayToneClass}`}
          style={{ ['--aaa-fx-duration' as string]: `${activeFreezePulse.durationMs}ms` } as React.CSSProperties}
        ></div>
      )}

      {/* --- GAME UI --- */}

      {gameState === GameState.MENU && (
         <>
         <GameMenu 
            onResume={() => {}} 
            onRestart={() => {}} 
            onQuit={() => {}} 
            customStart={handleStartSession} 
            selectedScenarioId={selectedScenarioId} 
            onSelectScenario={setSelectedScenarioId}
            selectedGameMode={selectedGameMode}
            onSelectGameMode={setSelectedGameMode}
            scenarios={SCENARIOS} 
            careerData={careerData}
            menuPanelOffsetClass={menuToolbarClasses.menuPanelOffset}
         />
         {/* Fase 3: Botones de Logros y Mejoras */}
         <div className={menuToolbarClasses.container}>
           <button
             onClick={() => setShowAchievements(true)}
             className={menuToolbarClasses.button}
           >
             <Trophy className={menuToolbarClasses.icon} />
             Logros
           </button>
           <button
             onClick={() => setShowUpgrades(true)}
             className={menuToolbarClasses.button}
           >
             <Settings className={menuToolbarClasses.icon} />
             Mejoras
           </button>
           <button
             onClick={() => { playClick(); cycleVisualQuality(); }}
             className={menuToolbarClasses.button}
           >
             <Activity className={menuToolbarClasses.icon} />
             FX {VISUAL_QUALITY_LABEL[visualQualityMode]}
           </button>
           <button
             onClick={() => { playClick(); setShowSettings(true); }}
             className={menuToolbarClasses.button}
           >
             <Settings className={menuToolbarClasses.icon} />
             Ajustes
           </button>
         </div>
         {showAchievements && (
           <AchievementPanel
             achievements={ACHIEVEMENTS}
             unlockedIds={careerData.unlockedAchievements}
             onClose={() => setShowAchievements(false)}
           />
         )}
         {showUpgrades && (
           <UpgradeShop
             key={careerData.careerPoints + careerData.unlockedUpgrades.length} // Force re-render when career data changes
             upgrades={getAvailableUpgrades()}
             careerPoints={careerData.careerPoints}
               onPurchase={(upgrade) => {
               const result = purchaseUpgrade(upgrade);
               if (result.status === 'MISSING_REQUIREMENTS') {
                 const requiredNames = result.missingRequirements
                   .map(requirementId => PERMANENT_UPGRADES.find(item => item.id === requirementId)?.name || requirementId)
                   .join(', ');
                 addLog(`Mejora bloqueada. Requiere: ${requiredNames}`, 'warning');
                 playError();
               } else if (result.status === 'INSUFFICIENT_POINTS') {
                 addLog(`No tienes suficientes puntos para ${upgrade.name}`, 'error');
                 playError();
               } else if (result.status === 'ALREADY_UNLOCKED') {
                 addLog(`La mejora ${upgrade.name} ya está desbloqueada`, 'warning');
               }
             }}
             onClose={() => setShowUpgrades(false)}
           />
         )}
         </>
      )}

      {gameState === GameState.SHOP && (
          <Shop 
             currentBudget={stats.budget}
             inventory={inventory}
             onBuy={(item) => { playClick(); buyItem(item); }}
             onStart={handleShopFinish}
          />
      )}
          
      {gameState === GameState.PAUSED && (
        <GameMenu
          onResume={() => { playClick(); togglePause(); }}
          onRestart={() => {
            playClick();
            const restartScenario = pendingStartData?.scenarioId || currentScenario.id || selectedScenarioId;
            const restartCrew = pendingStartData?.crewId || 'VETERAN';
            const restartMode = pendingStartData?.gameMode || currentGameMode;
            handleStartSession(restartScenario, restartCrew, restartMode);
          }}
          onQuit={() => { playClick(); quitGame(); }}
        />
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <>
            <FXCanvas
              stressLevel={stats.stress}
              triggerExplosion={explosionTrigger}
              isMobile={isMobileLayout}
              activeEvents={activeEvents.length}
              criticalEvents={criticalEventCount}
              qualityMode={visualQualityMode}
              reducedMotionOverride={reducedMotion}
            />
            
            {/* Alarm Overlay */}
            <div className={`absolute inset-0 pointer-events-none z-40 transition-opacity duration-1000 ${stats.stress > 80 ? 'opacity-100 animate-alarm' : 'opacity-0'}`}
                style={{ boxShadow: 'inset 0 0 100px rgba(220, 38, 38, 0.4)' }}
            ></div>
            
            {!isMobileLayout && (
              <>
                {/* MISSION PANEL */}
                {activeMission && <MissionPanel mission={activeMission} />}
                
                {/* COMBO INDICATOR */}
                <ComboIndicator comboState={comboState} />
                
                {/* NARRATIVE POPUP (Fase 2) */}
                {activeNarrative && (
                  <NarrativePopup narrative={activeNarrative} onDismiss={dismissNarrative} />
                )}
                
                {/* EARLY WARNING PANEL (Fase 2) */}
                <EarlyWarningPanel warnings={activeWarnings} />
              </>
            )}

            {isMobileLayout && (
              <div
                className="absolute left-2 right-2 z-[95] flex flex-col items-stretch gap-2 pointer-events-none overflow-y-auto overscroll-contain pb-2 pr-1"
                style={{ top: mobileHudInsets.top, bottom: mobileHudInsets.bottom }}
              >
                {showMobileMission && activeMission && <MissionPanel mission={activeMission} mobile />}
                {showMobilePrimaryEvent && mobilePrimaryEvent && (
                  <div className="relative w-full shrink-0 pointer-events-auto">
                    {mobileQueuedEvents > 0 && (
                      <div className="mb-1 flex justify-end">
                        <span className="aaa-chip px-2 py-0.5 text-[10px] font-mono text-slate-200">
                          +{mobileQueuedEvents} EN COLA
                        </span>
                      </div>
                    )}
                    <EventCard event={mobilePrimaryEvent} onResolve={handleResolveEvent} mobile />
                  </div>
                )}
                {showMobileWarnings && (
                  <EarlyWarningPanel
                    warnings={activeWarnings}
                    mobile
                    maxItems={mobileOverlayVisibility.maxVisibleWarningCards}
                  />
                )}
                {showMobileNarrative && activeNarrative && (
                  <NarrativePopup narrative={activeNarrative} onDismiss={dismissNarrative} mobile />
                )}
                {showMobileClientPopup && (
                  <ClientPopup message={clientMessage} mood={clientMood} onClose={clearMessage} mobile />
                )}
                {showMobileCombo && <ComboIndicator comboState={comboState} mobile />}
                {showMobileSocialFeed && <SocialFeed stats={stats} mobile />}
              </div>
            )}
            
            {/* TUTORIAL OVERLAY */}
            {tutorialActive && TUTORIAL_STEPS[tutorialStepIndex] && (
                <TutorialOverlay 
                    step={TUTORIAL_STEPS[tutorialStepIndex]} 
                    totalSteps={TUTORIAL_STEPS.length}
                    onNext={() => {
                        playClick();
                        if (tutorialStepIndex === TUTORIAL_STEPS.length - 1) {
                            finishTutorial();
                        } else {
                            advanceTutorial();
                        }
                    }} 
                />
            )}

            {!isMobileLayout && <ClientPopup message={clientMessage} mood={clientMood} onClose={clearMessage} />}
            {!isMobileLayout && <SocialFeed stats={stats} />}

            {activeMinigame && (
                <MinigameOverlay type={activeMinigame.type} onComplete={completeMinigame} />
            )}

            {/* HEADER */}
            <header ref={headerRef} className="min-h-20 aaa-panel aaa-panel-soft rounded-none md:rounded-xl flex items-center px-2 md:px-4 gap-2 md:gap-4 relative z-30">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/15"></div>
                
                {/* Clock LCD */}
                <div className="w-28 md:w-36 aaa-kpi p-2 relative">
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-0.5 flex justify-between">
                        <span>TIME</span>
                        {stats.timeRemaining < 30 && <Activity className="w-3 h-3 text-red-500 animate-pulse" />}
                    </div>
                    <div className={`text-2xl font-mono font-bold tracking-widest ${stats.timeRemaining < 30 ? dynamicColors.danger + ' animate-pulse' : dynamicColors.primary} text-glow`}>
                        {formatTime(stats.timeRemaining)}
                    </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-8 items-center h-full pt-1 md:pt-2">
                    <ProgressBar value={stats.publicInterest} label="Energía" colorClass={dynamicColors.success} />
                    <ProgressBar value={stats.clientSatisfaction} label="Cliente" colorClass={dynamicColors.primary} />
                    <ProgressBar value={stats.stress} label="Estrés" colorClass={stats.stress > 80 ? dynamicColors.danger : dynamicColors.warning} />
                    
                    <div className="flex flex-col w-full mb-3">
                        <div className="flex justify-between items-end mb-1 text-xs font-mono tracking-widest uppercase">
                            <span className="text-slate-400">Fondos</span>
                        </div>
                        <div className={`h-8 border rounded flex items-center px-2 font-mono text-xl tracking-wider shadow-inner bg-slate-950/60 ${stats.budget < 0 ? 'border-red-500 text-red-500' : 'border-slate-700 text-emerald-400'}`}>
                            <DollarSign className="w-4 h-4 mr-1 opacity-50" />
                            {stats.budget.toLocaleString()}
                        </div>
                    </div>
                </div>

                <Button
                  onClick={() => { playClick(); setShowSettings(true); }}
                  variant="neutral"
                  className="h-12 w-12 flex items-center justify-center !p-0"
                >
                    <Settings className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => { playClick(); cycleVisualQuality(); }}
                  variant="neutral"
                  className="hidden sm:flex h-12 px-2 md:px-3 items-center justify-center text-[10px] md:text-xs font-mono uppercase tracking-wider"
                >
                    FX {VISUAL_QUALITY_LABEL[visualQualityMode]}
                </Button>
                <Button
                  onClick={() => { playClick(); cycleAudioSpatial(); }}
                  variant="neutral"
                  className="hidden md:flex h-12 px-2 md:px-3 items-center justify-center text-[10px] md:text-xs font-mono uppercase tracking-wider"
                >
                    AUD {audioSpatialMode.slice(0, 4)}
                </Button>
                <Button onClick={() => { playClick(); togglePause(); }} variant="neutral" className="h-12 w-12 flex items-center justify-center !p-0">
                    <Pause className="w-6 h-6" />
                </Button>
            </header>

            <div className="flex-1 flex flex-col relative z-30 overflow-hidden p-2 md:p-6 gap-2 md:gap-6">
                <div className="flex-1 flex flex-col lg:flex-row gap-2 md:gap-6 min-h-0">
                    
                    {/* CENTER: 2D Visualizer */}
                    <main className="flex-1 flex flex-col gap-2 md:gap-4 relative z-20 min-w-0">
                        <div className="flex-1 min-h-[220px] aaa-panel aaa-panel-strong overflow-hidden relative">
                             <Visualizer 
                                systemType={selectedSystem} 
                                status={systems[selectedSystem].status} 
                                health={systems[selectedSystem].health} 
                                allSystems={systems}
                                publicInterest={stats.publicInterest}
                                stressLevel={stats.stress}
                                isMobile={isMobileLayout}
                                qualityMode={visualQualityMode}
                                reducedMotionOverride={reducedMotion}
                            />
                        </div>

                        <div className="h-24 md:h-32">
                            <TerminalLog logs={logs} />
                        </div>
                    </main>

                    {/* RIGHT: Alerts */}
                    {!isMobileLayout && (
                    <aside className="w-full lg:w-80 max-h-64 lg:max-h-none flex flex-col gap-3 md:gap-4 z-20 aaa-panel aaa-panel-soft p-3 md:p-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-700/80">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> EVENT LOG
                            </span>
                            <span className="aaa-chip text-slate-300 text-[10px] px-2 py-0.5 font-mono shadow-inner">
                                {activeEvents.length} PENDING
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-700 space-y-3">
                            {sortedActiveEvents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <Activity className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-mono uppercase">All Systems OK</span>
                                </div>
                            ) : (
                                sortedActiveEvents.map(event => (
                                    <EventCard key={event.id} event={event} onResolve={handleResolveEvent} />
                                ))
                            )}
                        </div>
                    </aside>
                    )}
                </div>

                <div ref={mobileFaderDockRef} className="z-40">
                    <FaderPanel 
                        systems={systems} 
                        onFaderChange={handleFaderChange} 
                        onSelectSystem={handleSystemSelect}
                        selectedSystem={selectedSystem}
                        mobile={isMobileLayout}
                    />
                </div>
            </div>
        </>
      )}

      {showSettings && (
        <GameSettingsPanel
          onClose={() => { playClick(); setShowSettings(false); }}
          visualQualityMode={visualQualityMode}
          onVisualQualityChange={(mode) => {
            setVisualQualityMode(mode);
            addLog(`Visual FX: ${mode}`, 'info');
          }}
          audioSpatialMode={audioSpatialMode}
          onAudioSpatialModeChange={(mode) => {
            setAudioSpatialMode(mode);
            addLog(`Audio Espacial: ${mode}`, 'info');
          }}
          audioMix={audioMix}
          onAudioMixChange={handleAudioMixChange}
          reducedMotion={reducedMotion}
          onReducedMotionChange={setReducedMotion}
          highContrastUi={highContrastUi}
          onHighContrastUiChange={setHighContrastUi}
          onReset={resetSettings}
          runtimeDiagnostics={runtimeDiagnostics}
        />
      )}

      {/* GAME OVER OVERLAY */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-4">
                {(() => {
                    const reason = getGameOverReason();
                    const Icon = reason.icon;
                    return (
                        <div className="aaa-panel aaa-panel-strong p-10 max-w-xl w-full text-center relative overflow-hidden">
                            <div className="flex justify-center mb-6">
                                <div className={`p-4 rounded-full bg-black border-4 ${reason.color.replace('text', 'border')} border-opacity-50`}>
                                    <Icon className={`w-16 h-16 ${reason.color}`} />
                                </div>
                            </div>
                            <h1 className={`text-4xl font-black mb-2 uppercase tracking-widest ${reason.color} text-glow`}>
                                {reason.title}
                            </h1>
                            <p className="text-slate-300 mb-8 font-mono text-lg">{reason.desc}</p>
                            
                            <Button onClick={() => { playClick(); setGameState(GameState.MENU); }} variant="neutral" className="w-full py-4 text-lg">
                                <div className="flex items-center justify-center gap-2">
                                    {gameState === GameState.VICTORY ? (
                                        <>
                                            <Home className="w-5 h-5" /> VOLVER AL MENÚ
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw className="w-5 h-5" /> REINICIAR SISTEMA
                                        </>
                                    )}
                                </div>
                            </Button>
                        </div>
                    );
                })()}
          </div>
      )}
    </div>
  );
};

export default App;
