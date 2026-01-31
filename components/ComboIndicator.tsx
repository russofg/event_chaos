import React from 'react';
import { ComboState } from '../types';
import { Zap, Music, TrendingUp } from 'lucide-react';

interface ComboIndicatorProps {
  comboState: ComboState;
}

export const ComboIndicator: React.FC<ComboIndicatorProps> = ({ comboState }) => {
  const { streakSeconds, multiplier, perfectRhythm } = comboState;
  
  if (multiplier <= 1.0 && !perfectRhythm) return null;

  const getMultiplierColor = () => {
    if (multiplier >= 2.5) return 'text-yellow-400';
    if (multiplier >= 2.0) return 'text-orange-400';
    if (multiplier >= 1.5) return 'text-emerald-400';
    return 'text-cyan-400';
  };

  const getMultiplierGlow = () => {
    if (multiplier >= 2.5) return 'shadow-[0_0_20px_rgba(250,204,21,0.8)]';
    if (multiplier >= 2.0) return 'shadow-[0_0_15px_rgba(251,146,60,0.6)]';
    if (multiplier >= 1.5) return 'shadow-[0_0_10px_rgba(16,185,129,0.5)]';
    return 'shadow-[0_0_8px_rgba(6,182,212,0.4)]';
  };

  return (
    <div className="absolute top-20 right-8 z-[85] animate-in slide-in-from-top duration-300">
      <div className={`bg-slate-900/95 border-2 ${perfectRhythm ? 'border-yellow-500' : 'border-cyan-500'} rounded-xl shadow-2xl p-4 backdrop-blur-sm ${getMultiplierGlow()}`}>
        <div className="flex items-center gap-3">
          {perfectRhythm ? (
            <>
              <Music className="w-6 h-6 text-yellow-400 animate-pulse" />
              <div>
                <div className="text-yellow-400 font-bold text-sm uppercase tracking-wider">
                  RITMO PERFECTO
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Sistemas sincronizados
                </div>
              </div>
            </>
          ) : (
            <>
              <Zap className={`w-6 h-6 ${getMultiplierColor()} animate-pulse`} />
              <div>
                <div className={`${getMultiplierColor()} font-bold text-sm uppercase tracking-wider flex items-center gap-2`}>
                  COMBO x{multiplier.toFixed(1)}
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {Math.floor(streakSeconds)}s estables
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Progress bar for next milestone */}
        {!perfectRhythm && (
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getMultiplierColor().replace('text-', 'bg-')} transition-all duration-300`}
              style={{ 
                width: `${Math.min(100, (streakSeconds % 10) * 10)}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
