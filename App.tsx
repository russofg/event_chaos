
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, SystemType, SystemState, GameEventOption } from './types';
import { SCENARIOS, TUTORIAL_STEPS, PERMANENT_UPGRADES } from './constants';
import { useGameLogic } from './hooks/useGameLogic';
import { useClientAI } from './hooks/useClientAI';
import { useSoundSynth } from './hooks/useSoundSynth';
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
import { Activity, DollarSign, Trophy, AlertOctagon, Users, ZapOff, Frown, Pause, RotateCcw, AlertTriangle, Settings, Home } from 'lucide-react';

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
    currentScenario,
    saveCareer // Fase 3: For achievements/upgrades
  } = useGameLogic();

  // REMOVED: useAIImage hook is no longer needed for 2D visualizer
  const { clientMessage, clientMood, clearMessage } = useClientAI(stats, gameState === GameState.PLAYING && !tutorialActive);
  const { playClick, playError, playSuccess, playAlarm, playStartGame, startBackgroundLoop, updateBackgroundLoop } = useSoundSynth();
  
  // Combo System
  const { comboState, setBonusCallback } = useComboSystem({ 
    systems, 
    isPlaying: gameState === GameState.PLAYING && !tutorialActive 
  });
  
  const [selectedSystem, setSelectedSystem] = useState<SystemType>(SystemType.SOUND);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionTrigger, setExplosionTrigger] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState(SCENARIOS[0].id);
  const [logs, setLogs] = useState<{id: string, text: string, type: 'info'|'error'|'warning'|'success'}[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  
  const prevEventsLength = useRef(0);

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
    isPlaying: gameState === GameState.PLAYING && !tutorialActive,
    careerData,
    onAchievementUnlocked: handleAchievementUnlocked
  });

  // Upgrade System (Fase 3)
  const handleUpgradePurchased = useCallback((upgradeId: string, cost: number) => {
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
    
    const upgrade = PERMANENT_UPGRADES.find(u => u.id === upgradeId);
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
      }
  }, [gameState, startBackgroundLoop]);

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
     if (activeEvents.length > prevEventsLength.current) {
         const newEvent = activeEvents[activeEvents.length - 1];
         addLog(`${newEvent.systemId}: ${newEvent.title} DETECTED`, newEvent.severity === 3 ? 'error' : 'warning');
         if (newEvent.severity === 3) {
             playAlarm();
             setScreenShake(true);
             setTimeout(() => setScreenShake(false), 500);
         } else {
             playError();
         }
     } 
     else if (activeEvents.length < prevEventsLength.current && prevEventsLength.current > 0) {
         playSuccess();
         setExplosionTrigger(t => !t);
         addLog(`Issue resolved. Systems stabilizing.`, 'success');
     }
     prevEventsLength.current = activeEvents.length;
  }, [activeEvents, playAlarm, playError, playSuccess]);


  const handleStartSession = (scenarioId: string, crewId: string) => {
      playClick();
      initializeSession(scenarioId, crewId); // Goes to Shop
      addLog(`Loading Scenario Config: ${scenarioId}...`, 'info');
  };
  
  const handleShopFinish = () => {
      playStartGame();
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
      if (stats.budget <= -10000) return { 
          title: "QUIEBRA", 
          desc: "Fondos insuficientes.", 
          icon: DollarSign, color: "text-red-500"
      };
      return { title: "GAME OVER", desc: "Sistema terminado.", icon: AlertOctagon, color: "text-red-500" };
  };
  
  // DAMAGE EFFECTS
  const videoCritical = systems[SystemType.VIDEO].status === 'CRITICAL';
  const stageSmoke = systems[SystemType.STAGE].faderValue > 80;

  // Fase 4: Paleta de colores dinámica
  const dynamicColors = useDynamicColors(stats, systems);

  return (
    <div 
        className={`h-screen w-screen bg-[#111] text-slate-100 flex flex-col overflow-hidden relative selection:bg-cyan-500 selection:text-black font-sans
            ${screenShake ? 'animate-shake' : ''}
            transition-colors duration-1000
        `}
        style={{
          // Aplicar tint dinámico al fondo
          background: gameState === GameState.PLAYING 
            ? `linear-gradient(135deg, #111 0%, ${dynamicColors.bgTint.replace('bg-', '').replace('/50', '')} 100%)`
            : '#111'
        }}
    >
      {/* --- ATMOSPHERE LAYERS --- */}
      
      {/* Desk Texture */}
      <div className="absolute inset-0 bg-[#0a0a0a] z-0 pointer-events-none opacity-50"></div>
      
      {/* Coffee Stain */}
      <div className="absolute top-10 right-20 w-32 h-32 rounded-full border-4 border-[#3e2723] opacity-30 z-0 pointer-events-none blur-[1px]" style={{ boxShadow: '0 0 10px #3e2723' }}></div>
      <div className="absolute top-12 right-24 w-24 h-24 rounded-full border-2 border-[#3e2723] opacity-20 z-0 pointer-events-none"></div>

      {/* Post-it Note */}
      <div className="absolute top-32 -left-4 w-40 h-40 bg-yellow-200 text-slate-800 p-4 rotate-6 shadow-xl z-10 font-handwriting text-xs transform hover:rotate-0 transition-transform duration-300">
          <div className="font-bold border-b border-yellow-300 mb-2 pb-1">PASSWORD WIFI:</div>
          <div className="font-mono">Ch40s_Pr0_2024</div>
          <div className="mt-4 text-[10px] text-slate-600">
              * NO TOCAR EL CABLE ROJO DEL RACK DE DIMMERS.
          </div>
      </div>

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
            scenarios={SCENARIOS} 
            careerData={careerData}
         />
         {/* Fase 3: Botones de Logros y Mejoras */}
         <div className="absolute bottom-8 left-8 flex gap-4 z-50">
           <button
             onClick={() => setShowAchievements(true)}
             className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg flex items-center gap-2 transition-all"
           >
             <Trophy className="w-5 h-5" />
             Logros
           </button>
           <button
             onClick={() => setShowUpgrades(true)}
             className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-2 transition-all"
           >
             <Settings className="w-5 h-5" />
             Mejoras
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
               if (!result) {
                 // Si falla, ya se muestra el error en handleUpgradePurchased
                 console.log('No se pudo comprar la mejora');
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
        <GameMenu onResume={() => { playClick(); togglePause(); }} onRestart={() => { playClick(); handleStartSession(selectedScenarioId, 'VETERAN'); }} onQuit={() => { playClick(); quitGame(); }} />
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <>
            <FXCanvas stressLevel={stats.stress} triggerExplosion={explosionTrigger} />
            
            {/* Alarm Overlay */}
            <div className={`absolute inset-0 pointer-events-none z-40 transition-opacity duration-1000 ${stats.stress > 80 ? 'opacity-100 animate-alarm' : 'opacity-0'}`}
                style={{ boxShadow: 'inset 0 0 100px rgba(220, 38, 38, 0.4)' }}
            ></div>
            
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

            <ClientPopup message={clientMessage} mood={clientMood} onClose={clearMessage} />
            <SocialFeed stats={stats} />

            {activeMinigame && (
                <MinigameOverlay type={activeMinigame.type} onComplete={completeMinigame} />
            )}

            {/* HEADER - Plastic Panel Look */}
            <header className="h-20 bg-[#1e293b] border-b-4 border-[#0f172a] flex items-center px-4 gap-4 relative z-30 shadow-lg">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10"></div>
                
                {/* Clock LCD */}
                <div className="w-36 bg-[#0f172a] p-2 rounded border border-slate-700 shadow-[inset_0_0_10px_black] relative">
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-0.5 flex justify-between">
                        <span>TIME</span>
                        {stats.timeRemaining < 30 && <Activity className="w-3 h-3 text-red-500 animate-pulse" />}
                    </div>
                    <div className={`text-2xl font-mono font-bold tracking-widest ${stats.timeRemaining < 30 ? dynamicColors.danger + ' animate-pulse' : dynamicColors.primary} text-glow`}>
                        {formatTime(stats.timeRemaining)}
                    </div>
                </div>
                
                <div className="flex-1 grid grid-cols-4 gap-8 items-center h-full pt-2">
                    <ProgressBar value={stats.publicInterest} label="Energía" colorClass={dynamicColors.success} />
                    <ProgressBar value={stats.clientSatisfaction} label="Cliente" colorClass={dynamicColors.primary} />
                    <ProgressBar value={stats.stress} label="Estrés" colorClass={stats.stress > 80 ? dynamicColors.danger : dynamicColors.warning} />
                    
                    <div className="flex flex-col w-full mb-3">
                        <div className="flex justify-between items-end mb-1 text-xs font-mono tracking-widest uppercase">
                            <span className="text-slate-400">Fondos</span>
                        </div>
                        <div className={`h-8 border bg-black/50 rounded flex items-center px-2 font-mono text-xl tracking-wider shadow-inner ${stats.budget < 0 ? 'border-red-500 text-red-500' : 'border-slate-700 text-emerald-400'}`}>
                            <DollarSign className="w-4 h-4 mr-1 opacity-50" />
                            {stats.budget.toLocaleString()}
                        </div>
                    </div>
                </div>

                <Button onClick={togglePause} variant="neutral" className="h-12 w-12 flex items-center justify-center !p-0">
                    <Pause className="w-6 h-6" />
                </Button>
            </header>

            <div className="flex-1 flex flex-col relative z-30 overflow-hidden p-6 gap-6">
                <div className="flex-1 flex gap-6 min-h-0">
                    
                    {/* CENTER: 2D Visualizer */}
                    <main className="flex-1 flex flex-col gap-4 relative z-20 min-w-0">
                        <div className="flex-1 bg-black rounded-xl border-4 border-[#1e293b] overflow-hidden relative shadow-2xl">
                             <Visualizer 
                                systemType={selectedSystem} 
                                status={systems[selectedSystem].status} 
                                health={systems[selectedSystem].health} 
                                allSystems={systems}
                                publicInterest={stats.publicInterest}
                            />
                        </div>

                        <div className="h-32">
                            <TerminalLog logs={logs} />
                        </div>
                    </main>

                    {/* RIGHT: Alerts (Clipboard style) */}
                    <aside className="w-80 flex flex-col gap-4 z-20 bg-[#1e293b] rounded-xl border-t border-l border-white/10 shadow-2xl p-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" /> EVENT LOG
                            </span>
                            <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono shadow-inner">
                                {activeEvents.length} PENDING
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-700 space-y-3">
                            {activeEvents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                    <Activity className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-mono uppercase">All Systems OK</span>
                                </div>
                            ) : (
                                // Fase 2: Sort events by priority (higher first), then by time left
                                [...activeEvents]
                                    .sort((a, b) => {
                                        const priorityA = a.priority || 0;
                                        const priorityB = b.priority || 0;
                                        if (priorityA !== priorityB) return priorityB - priorityA;
                                        return a.expiresAt - b.expiresAt; // Earlier expiration first
                                    })
                                    .map(event => (
                                        <EventCard key={event.id} event={event} onResolve={handleResolveEvent} />
                                    ))
                            )}
                        </div>
                    </aside>
                </div>

                <div className="z-40">
                    <FaderPanel 
                        systems={systems} 
                        onFaderChange={handleFaderChange} 
                        onSelectSystem={handleSystemSelect}
                        selectedSystem={selectedSystem}
                    />
                </div>
            </div>
        </>
      )}

      {/* GAME OVER OVERLAY */}
      {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95">
                {(() => {
                    const reason = getGameOverReason();
                    const Icon = reason.icon;
                    return (
                        <div className="bg-slate-900 border-2 border-slate-700 p-10 rounded-xl max-w-xl w-full text-center shadow-2xl relative overflow-hidden">
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
