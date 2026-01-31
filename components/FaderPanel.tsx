import React, { useState, useEffect, useRef } from 'react';
import { SystemState, SystemType, SYSTEM_COLORS } from '../types';
import { AlertCircle, GripHorizontal } from 'lucide-react';

interface FaderPanelProps {
  systems: Record<SystemType, SystemState>;
  onFaderChange: (id: SystemType, value: number) => void;
  onSelectSystem: (id: SystemType) => void;
  selectedSystem: SystemType;
}

export const FaderPanel: React.FC<FaderPanelProps> = ({ systems, onFaderChange, onSelectSystem, selectedSystem }) => {
  const [draggingId, setDraggingId] = useState<SystemType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (id: SystemType) => {
    setDraggingId(id);
    onSelectSystem(id);
  };

  useEffect(() => {
    const handleMouseUp = () => setDraggingId(null);
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !containerRef.current) return;
      
      // Calculate relative position based on the specific fader track height
      // We assume the track is roughly 120px tall inside the UI
      // Ideally we'd get the rect of the specific track, but global movement delta works well for faders
      
      const sensitivity = 0.8;
      const deltaY = e.movementY * -1 * sensitivity; // Invert because up is positive value
      
      const currentVal = systems[draggingId].faderValue;
      const newVal = Math.min(100, Math.max(0, currentVal + deltaY));
      
      onFaderChange(draggingId, newVal);
    };

    if (draggingId) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [draggingId, systems, onFaderChange]);

  return (
    <div className="bg-[#1a1a20] border-t-4 border-slate-700 p-4 shadow-2xl relative z-40 select-none">
       {/* Texture */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
       
       {/* Screw Heads */}
       <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-slate-600 flex items-center justify-center"><div className="w-full h-[1px] bg-slate-800 rotate-45"></div></div>
       <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-slate-600 flex items-center justify-center"><div className="w-full h-[1px] bg-slate-800 rotate-45"></div></div>
       
       <div className="flex justify-between items-center h-48 max-w-4xl mx-auto gap-4" ref={containerRef}>
          {(Object.values(systems) as SystemState[]).map((sys) => {
             const isSafe = sys.faderValue >= 40 && sys.faderValue <= 60;
             const isCritical = sys.faderValue < 20 || sys.faderValue > 80;
             const color = isCritical ? 'bg-red-500 shadow-[0_0_15px_red]' : isSafe ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500';
             
             // Base styles
             const trackColor = SYSTEM_COLORS[sys.id].split(' ')[0].replace('text-', 'bg-'); // Extract color class
             
             return (
               <div key={sys.id} className="flex-1 h-full bg-[#111] rounded-lg border border-slate-800 p-2 flex flex-col items-center relative group">
                  
                  {/* Label & Status */}
                  <div 
                    onClick={() => onSelectSystem(sys.id)}
                    className={`w-full text-center mb-2 font-mono text-[10px] font-bold uppercase py-1 rounded cursor-pointer transition-colors
                      ${selectedSystem === sys.id ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}
                    `}
                  >
                     {sys.name}
                     {isCritical && <AlertCircle className="w-3 h-3 absolute top-2 right-2 text-red-500 animate-pulse" />}
                  </div>

                  {/* Fader Track */}
                  <div className="relative flex-1 w-2 bg-slate-900 rounded-full mb-2 border border-slate-800 shadow-inner">
                      {/* Safe Zone Marker */}
                      <div className="absolute top-[40%] bottom-[40%] left-0 right-0 bg-white/5 border-y border-white/10"></div>
                      
                      {/* Center Line */}
                      <div className="absolute top-1/2 left-[-4px] right-[-4px] h-[1px] bg-slate-600"></div>

                      {/* The Fader Cap */}
                      <div 
                        onMouseDown={() => handleMouseDown(sys.id)}
                        className={`absolute left-1/2 -translate-x-1/2 w-10 h-16 rounded shadow-xl cursor-ns-resize flex items-center justify-center transition-transform active:scale-95
                           bg-gradient-to-b from-slate-600 to-slate-800 border-t border-slate-500 border-b border-black
                        `}
                        style={{ bottom: `${sys.faderValue}%`, transform: 'translateX(-50%) translateY(50%)' }}
                      >
                          <div className={`w-full h-[2px] ${color}`}></div>
                          <GripHorizontal className="w-4 h-4 text-slate-400 absolute opacity-50" />
                      </div>
                  </div>

                  {/* Value readout */}
                  <div className={`font-mono text-xs ${isCritical ? 'text-red-500 font-bold animate-pulse' : 'text-slate-500'}`}>
                      {Math.round(sys.faderValue)}%
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );
};