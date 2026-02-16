import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  colorClass: string;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max = 100, 
  label, 
  colorClass,
  showValue = true
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const segments = 20; // 20 segments of 5%
  const activeSegments = Math.ceil((percentage / 100) * segments);
  
  return (
    <div className="flex flex-col w-full mb-3 group">
      <div className="flex justify-between items-end mb-1 text-xs font-mono tracking-widest uppercase">
        <span className="text-slate-400 group-hover:text-white transition-colors">{label}</span>
        {showValue && <span className={`${colorClass} font-bold text-glow`}>{Math.round(value)}%</span>}
      </div>
      
      <div className="flex gap-[2px] h-3.5 w-full bg-slate-950/70 p-[2px] border border-slate-700/70 rounded-[6px] shadow-[inset_0_0_10px_rgba(2,6,23,0.8)]">
        {[...Array(segments)].map((_, i) => {
            const isActive = i < activeSegments;
            // Opacity gradient for active bars
            const opacity = isActive ? 0.6 + (i / segments) * 0.4 : 0.1;
            
            return (
                <div 
                    key={i}
                    className={`flex-1 rounded-[2px] transition-all duration-150 ${isActive ? colorClass.replace('text-', 'bg-') : 'bg-slate-700/70'}`}
                    style={{ 
                        opacity: opacity,
                        boxShadow: isActive ? `0 0 6px ${colorClass === 'text-red-500' ? 'red' : 'currentColor'}` : 'none'
                    }}
                />
            )
        })}
      </div>
    </div>
  );
};
