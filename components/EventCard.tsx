import React, { useEffect, useState } from 'react';
import { GameEvent, SYSTEM_COLORS, GameEventOption } from '../types';
import { Clock, Terminal, DollarSign, ChevronRight, Activity, TrendingUp, AlertCircle } from 'lucide-react';

interface EventCardProps {
  event: GameEvent;
  onResolve: (eventId: string, option: GameEventOption) => void;
  mobile?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onResolve, mobile = false }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((event.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 250);
    return () => clearInterval(interval);
  }, [event.expiresAt]);

  // Determine styles based on severity
  const severityStyles = event.severity === 3 
    ? { border: 'border-red-500/80', bg: 'bg-red-950/75', icon: 'text-red-400 animate-pulse', accent: 'from-red-500/30 to-transparent' }
    : event.severity === 2 
    ? { border: 'border-orange-500/75', bg: 'bg-orange-950/55', icon: 'text-orange-400', accent: 'from-orange-500/25 to-transparent' }
    : { border: 'border-amber-500/70', bg: 'bg-slate-900/92', icon: 'text-amber-400', accent: 'from-amber-500/20 to-transparent' };
  const cardClass = mobile
    ? `relative w-full border ${severityStyles.border} ${severityStyles.bg} mb-2 shadow-lg transition-all duration-200 rounded-xl overflow-y-auto overflow-x-hidden overscroll-contain max-h-[42vh]`
    : `relative w-full border ${severityStyles.border} ${severityStyles.bg} mb-3 shadow-lg transition-all duration-200 rounded-xl overflow-hidden`;
  const sectionPaddingClass = mobile ? 'p-3' : 'p-4';
  const headerPaddingClass = mobile ? 'p-2.5' : 'p-3';
  const optionButtonClass = mobile ? 'text-[11px]' : 'text-xs';
  const optionInnerPaddingClass = mobile ? 'p-2.5' : 'p-3';
  const systemTagClass = mobile ? 'text-[9px] font-black px-1 py-2.5' : 'text-[10px] font-black px-1 py-4';
  const titleClass = mobile
    ? 'font-bold text-xs leading-tight mb-1 text-slate-100 uppercase tracking-wide font-mono'
    : 'font-bold text-sm leading-tight mb-1 text-slate-100 uppercase tracking-wide font-mono';
  const descriptionClass = mobile
    ? 'text-[11px] text-slate-400 font-mono leading-snug border-l-2 border-slate-700 pl-2'
    : 'text-xs text-slate-400 font-mono leading-relaxed border-l-2 border-slate-700 pl-2';

  return (
    <div className={cardClass}>
      <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${severityStyles.accent}`} />
      
      {/* Background Grid Pattern for texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-70"></div>

      {/* Header */}
      <div className={`flex justify-between items-center ${headerPaddingClass} border-b border-white/10 bg-black/25 relative z-10`}>
        <div className={`flex items-center gap-2 ${mobile ? 'flex-wrap pr-2' : ''}`}>
            <Activity className={`w-4 h-4 ${severityStyles.icon}`} />
            <span className={`font-mono ${mobile ? 'text-[11px]' : 'text-xs'} font-bold tracking-widest ${severityStyles.icon}`}>
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
                  <div className={`flex items-center gap-1 text-orange-400 animate-pulse ${mobile ? 'text-[9px]' : 'text-[10px]'}`}>
                    <AlertCircle className="w-3 h-3" />
                    <span>ESCALATING</span>
                  </div>
                )}
            {event.escalatedFrom && !mobile && (
              <div className="text-[10px] text-purple-400 italic whitespace-nowrap">
                (Escalado)
              </div>
            )}
        </div>
        <div className={`shrink-0 flex items-center gap-1 font-mono ${mobile ? 'text-[11px]' : 'text-xs'} px-2 py-0.5 rounded border ${timeLeft < 10 ? 'bg-red-700/80 border-red-400/70 text-white animate-pulse' : 'bg-slate-900/80 border-slate-600 text-slate-300'}`}>
          <Clock className="w-3 h-3" />
          <span>T-{timeLeft.toString().padStart(2, '0')}s</span>
        </div>
      </div>

      <div className={`${sectionPaddingClass} relative z-10`}>
          <div className={`flex items-start gap-3 ${mobile ? 'mb-3' : 'mb-4'}`}>
             {/* System Tag */}
             <div className={`${systemTagClass} rounded-sm bg-black/70 border border-white/15 tracking-widest uppercase ${SYSTEM_COLORS[event.systemId]}`}>
                {event.systemId}
             </div>
             
             {/* Text Content */}
             <div className="flex-1">
                <h3 className={titleClass}>
                    {event.title}
                </h3>
                <p className={descriptionClass}>
                    {event.description}
                </p>
             </div>
          </div>
          
          {/* Action Area */}
          <div className="space-y-2 mt-2">
            <div className={`${mobile ? 'text-[8px]' : 'text-[9px]'} text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 border-b border-white/10 pb-1`}>
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
                    className={`w-full group relative overflow-hidden text-left font-mono ${optionButtonClass} border transition-all duration-100 ease-in-out cursor-pointer
                       ${hasCost 
                         ? 'bg-slate-950/80 border-slate-700 hover:border-emerald-400 hover:bg-slate-800/90' 
                         : 'bg-slate-950/80 border-slate-700 hover:border-cyan-400 hover:bg-slate-800/90'
                       }
                    `}
                >
                    {/* Hover Fill Effect */}
                    <div className={`absolute inset-0 w-0 group-hover:w-full transition-all duration-300 opacity-10 
                        ${hasCost ? 'bg-emerald-500' : 'bg-cyan-500'}`} 
                    />

                    <div className={`relative ${optionInnerPaddingClass} flex items-center justify-between z-10`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-sm ${hasCost ? 'bg-emerald-600' : 'bg-slate-600 group-hover:bg-cyan-400'}`}></div>
                            <span className="uppercase font-semibold text-slate-200 group-hover:text-white transition-colors">
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
