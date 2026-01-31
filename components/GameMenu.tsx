
import React, { useState } from 'react';
import { Button } from './Button';
import { RotateCcw, Play, XOctagon, DollarSign, AlertTriangle, AlertOctagon, Users, User, Check, Trophy, Lock } from 'lucide-react';
import { GameScenario, CrewMember, CareerData } from '../types';
import { CREW_MEMBERS } from '../constants';

interface GameMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  scenarios?: GameScenario[];
  selectedScenarioId?: string;
  onSelectScenario?: (id: string) => void;
  customStart?: (id: string, crewId: string) => void;
  careerData?: CareerData; // New Prop
}

export const GameMenu: React.FC<GameMenuProps> = ({ 
    onResume, onRestart, onQuit, 
    scenarios, selectedScenarioId, onSelectScenario, customStart, careerData 
}) => {
  const [selectedCrewId, setSelectedCrewId] = useState<string>(CREW_MEMBERS[0].id);
  
  // Pause Menu
  if (!scenarios) {
      return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900 border-2 border-slate-600 p-8 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-sm w-full text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)] pointer-events-none"></div>
            
            <h2 className="text-3xl font-bold text-white mb-2 tracking-widest uppercase text-glow">SISTEMA PAUSADO</h2>
            <p className="text-slate-400 font-mono text-xs mb-8">ESPERANDO ENTRADA DE USUARIO...</p>

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

  // MAIN MENU
  return (
      <div 
        className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden z-50 bg-cover bg-center"
        style={{ backgroundImage: "url('/menu_background.png')" }}
      >
        <div className="absolute inset-0 bg-black/50 z-0"></div>

         
         <div className="z-50 flex flex-col md:flex-row gap-6 p-8 bg-black/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl relative max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* LEFT: Scenario Selection */}
            <div className="flex-1 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 tracking-tighter uppercase">
                        EVENT CHAOS
                        </h1>
                        <h2 className="text-sm text-slate-400 tracking-[0.3em] font-mono text-glow">1. SELECCIONA EL ESCENARIO</h2>
                    </div>
                    {/* Career Stats Widget */}
                    {careerData && (
                        <div className="text-right font-mono text-xs space-y-1">
                            <div className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                                <DollarSign className="w-3 h-3"/> {careerData.totalCash.toLocaleString()} ACUMULADO
                            </div>
                            <div className="text-cyan-400 font-bold flex items-center justify-end gap-1">
                                <Trophy className="w-3 h-3"/> {careerData.careerPoints} PUNTOS
                            </div>
                            <div className="text-slate-500">
                                {careerData.completedScenarios.length} / {scenarios.length} COMPLETADOS
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid gap-3">
                   {scenarios.map(scene => {
                      const isCompleted = careerData?.completedScenarios.includes(scene.id);
                      const isLocked = scene.difficulty === 'EXTREME' && !careerData?.completedScenarios.includes('HARD') && careerData?.completedScenarios.length < 2;
                      
                      return (
                      <button 
                         key={scene.id}
                         disabled={isLocked}
                         onClick={() => onSelectScenario && onSelectScenario(scene.id)}
                         className={`p-4 border rounded-lg text-left transition-all relative overflow-hidden group
                            ${selectedScenarioId === scene.id 
                               ? 'border-cyan-500 bg-cyan-900/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                               : isLocked ? 'border-slate-800 bg-slate-950 opacity-60' : 'border-slate-700 bg-slate-900/50 hover:bg-slate-800'
                            }
                         `}
                      >
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
                         <p className="text-xs text-slate-500 leading-tight my-2">{scene.description}</p>
                         <div className="flex justify-between items-center text-[10px] font-mono border-t border-dashed border-white/10 pt-2">
                            <span className="text-emerald-500 flex items-center gap-1"><DollarSign className="w-3 h-3"/>{scene.initialBudget}</span>
                         </div>
                         
                         {selectedScenarioId === scene.id && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                         )}
                      </button>
                   )})}
                </div>
            </div>

            {/* RIGHT: Crew & Start */}
            <div className="w-full md:w-80 flex flex-col gap-6 border-l border-slate-800 pl-6">
                <div>
                    <h2 className="text-sm text-slate-400 tracking-[0.3em] font-mono text-glow mb-4">2. CONTRATA TU JEFE</h2>
                    <div className="space-y-3">
                        {CREW_MEMBERS.map(crew => (
                            <button
                                key={crew.id}
                                onClick={() => setSelectedCrewId(crew.id)}
                                className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-all relative
                                    ${selectedCrewId === crew.id 
                                        ? 'border-emerald-500 bg-emerald-900/20' 
                                        : 'border-slate-700 bg-slate-900/40 hover:bg-slate-800'}
                                `}
                            >
                                <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${crew.avatarColor}`}>
                                    <User className="w-6 h-6 text-white" />
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
                    <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 italic">
                        " {CREW_MEMBERS.find(c => c.id === selectedCrewId)?.description} "
                    </div>
                </div>

                <div className="mt-auto pt-8">
                    <Button variant="primary" onClick={() => customStart && selectedScenarioId && customStart(selectedScenarioId, selectedCrewId)} className="w-full text-xl py-6 animate-pulse">
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
