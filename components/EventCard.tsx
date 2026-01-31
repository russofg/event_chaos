import React, { useEffect, useState } from 'react';
import { GameEvent, SYSTEM_COLORS, GameEventOption } from '../types';
import { AlertTriangle, Clock, Terminal, DollarSign, ChevronRight, Activity, TrendingUp, AlertCircle } from 'lucide-react';

interface EventCardProps {
  event: GameEvent;
  onResolve: (eventId: string, option: GameEventOption) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onResolve }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((event.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(interval);
  }, [event.expiresAt]);

  // Determine styles based on severity
  const severityStyles = event.severity === 3 
    ? { border: 'border-red-500', bg: 'bg-red-950/90', icon: 'text-red-500 animate-pulse' }
    : event.severity === 2 
    ? { border: 'border-orange-500', bg: 'bg-orange-950/90', icon: 'text-orange-500' }
    : { border: 'border-amber-500', bg: 'bg-slate-900/95', icon: 'text-amber-500' };

  return (
    <div className={`relative w-full border-l-4 ${severityStyles.border} bg-slate-900 mb-3 shadow-lg transition-all duration-200`}>
      
      {/* Background Grid Pattern for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-white/5 bg-black/20 relative z-10">
        <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${severityStyles.icon}`} />
            <span className={`font-mono text-xs font-bold tracking-widest ${severityStyles.icon}`}>
                {event.severity === 3 ? 'CRITICAL_FAILURE' : 'SYSTEM_WARNING'}
            </span>
            {/* Fase 2: Priority indicator - Mostrar para cualquier prioridad >= 5 */}
            {event.priority !== undefined && event.priority >= 5 && (
              <div className={`flex items-center gap-1 text-[10px] font-bold ${
                event.priority >= 8 ? 'text-red-400' : 
                event.priority >= 6 ? 'text-orange-400' : 
                'text-yellow-400'
              }`}>
                <TrendingUp className="w-3 h-3" />
                <span>PRIORITY {event.priority}</span>
              </div>
            )}
            {/* Fase 2: Escalation warning */}
            {event.canEscalate && event.escalationTime && Date.now() < event.escalationTime && (
              <div className="flex items-center gap-1 text-orange-400 text-[10px] animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>ESCALATING</span>
              </div>
            )}
            {event.escalatedFrom && (
              <div className="text-[10px] text-purple-400 italic">
                (Escalado)
              </div>
            )}
        </div>
        <div className={`flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded ${timeLeft < 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-300'}`}>
          <Clock className="w-3 h-3" />
          <span>T-{timeLeft.toString().padStart(2, '0')}s</span>
        </div>
      </div>

      <div className="p-4 relative z-10">
          <div className="flex items-start gap-3 mb-4">
             {/* System Tag */}
             <div className={`text-[10px] font-black px-1 py-4 rounded-sm bg-black border border-white/10 tracking-widest uppercase writing-vertical-lr ${SYSTEM_COLORS[event.systemId]}`}>
                {event.systemId}
             </div>
             
             {/* Text Content */}
             <div className="flex-1">
                <h3 className="font-bold text-sm leading-tight mb-1 text-slate-100 uppercase tracking-wide font-mono">
                    {event.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono leading-relaxed border-l-2 border-slate-700 pl-2">
                    {event.description}
                </p>
             </div>
          </div>
          
          {/* Action Area */}
          <div className="space-y-2 mt-2">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1 border-b border-white/5 pb-1">
                <Terminal className="w-3 h-3" /> PROTOCOLOS DE RESPUESTA
            </div>
            
            {event.options.map((opt, idx) => {
              const hasCost = opt.cost && opt.cost > 0;
              return (
                <button
                    key={idx}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent bubbling issues
                        onResolve(event.id, opt);
                    }}
                    className={`w-full group relative overflow-hidden text-left font-mono text-xs border transition-all duration-100 ease-in-out cursor-pointer
                       ${hasCost 
                         ? 'bg-slate-900 border-slate-700 hover:border-emerald-500 hover:bg-slate-800' 
                         : 'bg-slate-900 border-slate-700 hover:border-cyan-500 hover:bg-slate-800'
                       }
                    `}
                >
                    {/* Hover Fill Effect */}
                    <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-300 opacity-10 
                        ${hasCost ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                    />

                    <div className="relative p-3 flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-sm ${hasCost ? 'bg-emerald-600' : 'bg-slate-600 group-hover:bg-cyan-400'}`}></div>
                            <span className="uppercase font-semibold text-slate-300 group-hover:text-white transition-colors">
                                {opt.label}
                            </span>
                        </div>

                        {hasCost ? (
                            <span className="text-emerald-400 font-bold flex items-center bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900">
                                <DollarSign className="w-3 h-3 mr-0.5" />{opt.cost}
                            </span>
                        ) : (
                             <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                        )}
                    </div>
                </button>
              );
            })}
          </div>
      </div>
    </div>
  );
};