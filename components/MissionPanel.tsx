
import React from 'react';
import { ActiveMission, SystemType } from '../types';
import { AlertOctagon, Check, Clock, Radio, Zap } from 'lucide-react';

interface MissionPanelProps {
  mission: ActiveMission;
}

export const MissionPanel: React.FC<MissionPanelProps> = ({ mission }) => {
  const timeLeft = Math.max(0, Math.round((mission.expiresAt - Date.now()) / 1000));
  const progressPercent = Math.min(100, (mission.progress / mission.holdDuration) * 100);
  
  // Is user currently meeting criteria?
  // We can infer this by progress speed but for UI simpler is to just show progress bar

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[95] animate-in slide-in-from-top duration-300">
        <div className="bg-slate-900/90 border-2 border-amber-500 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] p-4 w-96 overflow-hidden relative backdrop-blur-sm">
            
            {/* Background Stripe */}
            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 animate-pulse"></div>
            
            <div className="pl-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Radio className="w-5 h-5 text-amber-500 animate-ping absolute opacity-50" />
                        <Radio className="w-5 h-5 text-amber-500 relative" />
                        <span className="text-amber-500 font-bold uppercase tracking-widest text-xs">
                            DEMANDA DEL CLIENTE
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 font-mono text-xs">
                        <Clock className="w-3 h-3" /> {timeLeft}s
                    </div>
                </div>

                <h3 className="text-white font-black text-lg uppercase italic leading-none mb-1">
                    {mission.title}
                </h3>
                <p className="text-slate-400 text-xs font-mono mb-3 leading-tight">
                    {mission.description}
                </p>

                {/* Criteria Chips */}
                <div className="flex gap-2 mb-3 flex-wrap">
                    {mission.criteria.map((c, i) => (
                        <div key={i} className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300 font-mono">
                            {c.systemId} {c.min ? `> ${c.min}%` : `< ${c.max}%`}
                        </div>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-100 ease-linear"
                        style={{ width: `${progressPercent}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md">
                        MANTENER POSICIÓN... {Math.round(progressPercent)}%
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
