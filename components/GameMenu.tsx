
import React, { useMemo, useState } from 'react';
import { Button } from './Button';
import { RotateCcw, Play, XOctagon, DollarSign, AlertTriangle, AlertOctagon, Users, Check, Trophy, Lock, Star } from 'lucide-react';
import { GameMode, GameScenario, CareerData } from '../types';
import { CREW_MEMBERS } from '../constants';
import { getScenarioLockReason } from '../utils/scenarioUnlocks';
import { getCrewPortraitAsset, getMenuBackgroundAsset, getScenarioThumbnailAsset } from '../utils/artAssets';
import { getMenuCinematicClasses } from '../utils/uiCinematics';

interface GameMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  scenarios?: GameScenario[];
  selectedScenarioId?: string;
  onSelectScenario?: (id: string) => void;
  selectedGameMode?: GameMode;
  onSelectGameMode?: (mode: GameMode) => void;
  customStart?: (id: string, crewId: string, gameMode: GameMode) => void;
  careerData?: CareerData; // New Prop
  menuPanelOffsetClass?: string;
  isCompactLayout?: boolean;
  isMobileLayout?: boolean;
  reducedMotion?: boolean;
}

export const GameMenu: React.FC<GameMenuProps> = ({ 
    onResume, onRestart, onQuit, 
    scenarios, selectedScenarioId, onSelectScenario, selectedGameMode, onSelectGameMode, customStart, careerData,
    menuPanelOffsetClass = 'mt-0',
    isCompactLayout = false,
    isMobileLayout = false,
    reducedMotion = false
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(CREW_MEMBERS[0].id);
  const completedScenarioIds = careerData?.completedScenarios || [];
  const menuCinematicClasses = useMemo(
    () => getMenuCinematicClasses(isCompactLayout, reducedMotion),
    [isCompactLayout, reducedMotion]
  );
  const menuBackgroundAsset = useMemo(
    () => getMenuBackgroundAsset(isMobileLayout),
    [isMobileLayout]
  );
  const selectedScenarioThumbAsset = useMemo(
    () => getScenarioThumbnailAsset(selectedScenarioId || 'NORMAL'),
    [selectedScenarioId]
  );
  
  // Pause Menu
  if (!scenarios) {
      return (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="aaa-panel aaa-panel-strong p-8 max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 z-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)] pointer-events-none opacity-70"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-widest uppercase text-glow aaa-heading">SISTEMA PAUSADO</h2>
              <p className="text-slate-200 font-mono text-xs mb-8">ESPERANDO ENTRADA DE USUARIO...</p>
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              <Button variant="primary" onClick={onResume}>
                <div className="flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> CONTINUAR
                </div>
              </Button>

              <Button variant="neutral" onClick={onRestart}>
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> REINICIAR NIVEL
                </div>
              </Button>

              <Button variant="danger" onClick={onQuit}>
                 <div className="flex items-center justify-center gap-2">
                   <XOctagon className="w-4 h-4" /> SALIR AL MENÚ
                 </div>
              </Button>
            </div>
          </div>
        </div>
      );
  }

  const gameMode = selectedGameMode || GameMode.NORMAL;
  const modes: { id: GameMode; label: string; desc: string }[] = [
    { id: GameMode.NORMAL, label: 'NORMAL', desc: 'Balance estándar' },
    { id: GameMode.ENDLESS, label: 'ENDLESS', desc: 'Sin límite de tiempo' },
    { id: GameMode.SPEEDRUN, label: 'SPEEDRUN', desc: 'Ritmo acelerado' },
    { id: GameMode.HARDCORE, label: 'HARDCORE', desc: 'Sin margen de error' }
  ];

  // MAIN MENU
  return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden z-50 bg-cover bg-center"
        style={{
          backgroundImage: `url('${selectedScenarioThumbAsset}'), url('${menuBackgroundAsset}')`
        }}
      >
        <div className="absolute inset-0 bg-black/56 z-0"></div>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(1200px_520px_at_20%_10%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(900px_520px_at_90%_15%,rgba(20,184,166,0.18),transparent_62%)]"></div>
        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:52px_52px] opacity-25"></div>

         
         <div className={`aaa-panel aaa-panel-strong z-50 flex flex-col md:flex-row gap-6 p-4 md:p-8 relative max-w-6xl w-[96vw] max-h-[90vh] overflow-y-auto ${menuPanelOffsetClass} ${menuCinematicClasses.panelClass}`}>
            
            {/* LEFT: Scenario Selection */}
            <div className="flex-1 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-500 mb-2 tracking-tighter uppercase aaa-heading">
                        EVENT CHAOS
                        </h1>
                        <h2 className="text-sm aaa-panel-title">1. SELECCIONA EL ESCENARIO</h2>
                    </div>
                    {/* Career Stats Widget */}
                    {careerData && (
                        <div className="text-right font-mono text-xs space-y-1 aaa-stats-widget px-3 py-2">
                            <div className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                                <DollarSign className="w-3 h-3"/> {careerData.totalCash.toLocaleString()} ACUMULADO
                            </div>
                            <div className="text-cyan-400 font-bold flex items-center justify-end gap-1">
                                <Trophy className="w-3 h-3"/> {careerData.careerPoints} PUNTOS
                            </div>
                            <div className="text-amber-400 font-bold flex items-center justify-end gap-1">
                                <Star className="w-3 h-3"/> {careerData.reputation || 0} REP
                            </div>
                            <div className="text-slate-500">
                                {careerData.completedScenarios.length} / {scenarios.length} COMPLETADOS
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid gap-3">
                   {scenarios.map(scene => {
                      const isCompleted = completedScenarioIds.includes(scene.id);
                      const lockReason = getScenarioLockReason(scene, scenarios, careerData);
                      const isLocked = !!lockReason;
                      const highScore = careerData?.highScores?.[scene.id] || 0;
                      const scenarioThumbAsset = getScenarioThumbnailAsset(scene.id);
                      
                      return (
                      <button 
                         key={scene.id}
                         disabled={isLocked}
                         onClick={() => onSelectScenario && onSelectScenario(scene.id)}
                         className={`p-4 border rounded-lg text-left transition-all relative overflow-hidden group
                            ${menuCinematicClasses.scenarioButtonClass}
                            ${selectedScenarioId === scene.id 
                               ? `${menuCinematicClasses.scenarioActiveClass} border-cyan-400 bg-cyan-900/30 shadow-[0_0_24px_rgba(6,182,212,0.28)]` 
                               : isLocked ? 'border-slate-800 bg-slate-950/90 opacity-60' : 'border-slate-700 bg-slate-900/65 hover:bg-slate-800/75'
                            }
                         `}
                      >
                         <div
                           className="absolute inset-0 bg-cover bg-center opacity-34 pointer-events-none"
                           style={{ backgroundImage: `url('${scenarioThumbAsset}')` }}
                         ></div>
                         <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(255,255,255,0.06),transparent_28%,transparent_75%,rgba(34,211,238,0.08))] pointer-events-none"></div>
                         <div className="absolute inset-0 bg-[linear-gradient(170deg,rgba(3,8,16,0.72),rgba(6,12,22,0.84))] pointer-events-none"></div>
                         <div className="relative z-10">
                           <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                  <span className={`font-bold font-mono text-sm uppercase ${selectedScenarioId === scene.id ? 'text-white' : 'text-slate-300'}`}>
                                  {scene.title}
                                  </span>
                                  {isCompleted && <Trophy className="w-3 h-3 text-emerald-500" />}
                                  {isLocked && <Lock className="w-3 h-3 text-slate-600" />}
                              </div>
                              {scene.difficulty === 'EXTREME' && <AlertOctagon className="w-4 h-4 text-red-500" />}
                              {scene.difficulty === 'HARD' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                              {scene.difficulty === 'TUTORIAL' && <Users className="w-4 h-4 text-blue-400" />}
                           </div>
                           <p className="text-xs text-slate-200/85 leading-tight my-2">{scene.description}</p>
                           {isLocked && (
                              <div className="text-[10px] text-amber-300 font-mono mb-2">{lockReason}</div>
                           )}
                           <div className="flex justify-between items-center text-[10px] font-mono border-t border-dashed border-white/10 pt-2">
                              <span className="text-emerald-300 flex items-center gap-1"><DollarSign className="w-3 h-3"/>{scene.initialBudget}</span>
                              {highScore > 0 && (
                                <span className="text-cyan-200">BEST {highScore.toLocaleString()}</span>
                              )}
                           </div>
                         </div>
                         
                         {selectedScenarioId === scene.id && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                         )}
                      </button>
                   )})}
                </div>
            </div>

            {/* RIGHT: Crew & Start */}
            <div className="w-full md:w-80 flex flex-col gap-6 border-l border-slate-700/60 pl-0 md:pl-6 pt-4 md:pt-0">
                <div>
                    <h2 className="text-sm aaa-panel-title mb-4">2. CONTRATA TU JEFE</h2>
                    <div className="space-y-3">
                        {CREW_MEMBERS.map(crew => (
                            <button
                                key={crew.id}
                                onClick={() => setSelectedCrewId(crew.id)}
                                className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-all relative
                                    ${menuCinematicClasses.crewButtonClass}
                                    ${selectedCrewId === crew.id 
                                        ? `${menuCinematicClasses.crewActiveClass} border-emerald-400 bg-emerald-900/20 shadow-[0_0_16px_rgba(16,185,129,0.25)]` 
                                        : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800/70'}
                                `}
                            >
                                <div className={`w-10 h-10 rounded overflow-hidden flex items-center justify-center shrink-0 ${crew.avatarColor}`}>
                                    <img
                                      src={getCrewPortraitAsset(crew.id)}
                                      alt={crew.name}
                                      className="w-full h-full object-cover object-top"
                                      loading="lazy"
                                    />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-bold text-slate-200">{crew.name}</div>
                                    <div className="text-[10px] text-slate-400">{crew.role}</div>
                                </div>
                                {selectedCrewId === crew.id && <Check className="w-4 h-4 text-emerald-500 absolute top-2 right-2" />}
                            </button>
                        ))}
                    </div>
                    {/* Bonus Description */}
                    <div className="mt-4 p-3 bg-slate-900/70 border border-slate-700 rounded text-xs text-slate-400 italic">
                        " {CREW_MEMBERS.find(c => c.id === selectedCrewId)?.description} "
                    </div>
                </div>

                <div>
                    <h2 className="text-sm aaa-panel-title mb-3">3. MODO DE JUEGO</h2>
                    <div className="grid grid-cols-2 gap-2">
                      {modes.map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => onSelectGameMode && onSelectGameMode(mode.id)}
                          className={`text-left p-2 rounded border transition-all ${menuCinematicClasses.modeButtonClass} ${
                            gameMode === mode.id
                              ? `${menuCinematicClasses.modeActiveClass} border-cyan-400 bg-cyan-900/30 shadow-[0_0_14px_rgba(34,211,238,0.24)]`
                              : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className={`text-[11px] font-mono font-bold ${gameMode === mode.id ? 'text-cyan-300' : 'text-slate-300'}`}>
                            {mode.label}
                          </div>
                          <div className="text-[9px] text-slate-500">{mode.desc}</div>
                        </button>
                      ))}
                    </div>
                </div>

                <div className="mt-auto pt-8">
                    <Button
                      variant="primary"
                      onClick={() => customStart && selectedScenarioId && customStart(selectedScenarioId, selectedCrewId, gameMode)}
                      className={`w-full text-xl py-6 ${menuCinematicClasses.startButtonClass}`}
                    >
                    <div className="flex items-center justify-center gap-4">
                        <Play className="fill-current w-6 h-6" /> INICIAR SHOW
                    </div>
                    </Button>
                </div>
            </div>
            
         </div>
      </div>
  );
};
