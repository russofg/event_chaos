
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { PlugZap, CheckCircle2, Activity, Wifi } from 'lucide-react';

interface MinigameProps {
  type: 'CABLES' | 'FREQUENCY';
  onComplete: (success: boolean) => void;
}

const CablesMinigame: React.FC<{ onComplete: (success: boolean) => void }> = ({ onComplete }) => {
  const [wires, setWires] = useState<{id: number, color: string, connected: boolean}[]>([
    { id: 1, color: 'bg-red-500', connected: false },
    { id: 2, color: 'bg-blue-500', connected: false },
    { id: 3, color: 'bg-green-500', connected: false },
    { id: 4, color: 'bg-yellow-500', connected: false },
  ]);
  
  const [selectedWire, setSelectedWire] = useState<number | null>(null);

  const handleWireClick = (id: number, side: 'LEFT' | 'RIGHT') => {
      if (side === 'LEFT') {
          if (!wires.find(w => w.id === id)?.connected) {
              setSelectedWire(id);
          }
      } else {
          if (selectedWire === id) {
              // Match!
              setWires(prev => prev.map(w => w.id === id ? { ...w, connected: true } : w));
              setSelectedWire(null);
          } else {
              // Fail or deselect
              setSelectedWire(null);
          }
      }
  };

  useEffect(() => {
      if (wires.every(w => w.connected)) {
          setTimeout(() => onComplete(true), 500);
      }
  }, [wires, onComplete]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-lg p-6 shadow-2xl max-w-md w-full relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <PlugZap className="text-yellow-400" /> REPARACIÓN MANUAL
            </h2>
            <div className="text-xs font-mono text-slate-400 animate-pulse">
                CONECTA LOS CABLES
            </div>
        </div>

        <div className="flex justify-between gap-8 bg-black/50 p-4 rounded-lg border border-slate-800 relative">
            {/* Left Side */}
            <div className="flex flex-col gap-4">
                {wires.map(wire => (
                    <button
                        key={`left-${wire.id}`}
                        onClick={() => handleWireClick(wire.id, 'LEFT')}
                        className={`w-12 h-8 rounded-l border-l-4 ${wire.color} transition-all
                            ${wire.connected ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}
                            ${selectedWire === wire.id ? 'ring-2 ring-white scale-110' : ''}
                        `}
                    >
                        <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">
                            {wire.connected ? 'OK' : 'IN'}
                        </div>
                    </button>
                ))}
            </div>

            {/* Middle Mess (Visual Only) */}
            <div className="flex-1 relative">
                {wires.map(wire => {
                    if (!wire.connected) return null;
                    return (
                        <div key={`line-${wire.id}`} 
                             className={`absolute h-1 w-full ${wire.color.replace('bg-', 'bg-')}`}
                             style={{ 
                                 top: `${(wire.id - 1) * 3 + 1.5}rem`, 
                                 opacity: 0.8,
                                 boxShadow: `0 0 10px ${wire.color === 'bg-red-500' ? 'red' : 'currentColor'}`
                             }}
                        ></div>
                    )
                })}
            </div>

            {/* Right Side */}
            <div className="flex flex-col gap-4">
                {wires.map(wire => (
                    <button
                        key={`right-${wire.id}`}
                        onClick={() => handleWireClick(wire.id, 'RIGHT')}
                        className={`w-12 h-8 rounded-r border-r-4 ${wire.color} transition-all
                            ${wire.connected ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-125'}
                            ${selectedWire && !wire.connected ? 'animate-pulse' : ''}
                        `}
                    >
                         <div className="w-full h-full bg-slate-700 flex items-center justify-center text-[10px] font-mono font-bold">
                            {wire.connected ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : 'OUT'}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        <div className="mt-4 text-center">
            <Button variant="danger" onClick={() => onComplete(false)} className="text-xs py-2 px-4">
                ABORTAR REPARACIÓN (FALLAR)
            </Button>
        </div>

      </div>
    </div>
  );
};

const FrequencyMinigame: React.FC<{ onComplete: (success: boolean) => void }> = ({ onComplete }) => {
    const [target] = useState(() => Math.floor(Math.random() * 60) + 20); // 20-80%
    const [value, setValue] = useState(50);
    const [locked, setLocked] = useState(false);
    const [noise, setNoise] = useState(0);

    const difference = Math.abs(target - value);
    const isClose = difference < 5;

    useEffect(() => {
        const interval = setInterval(() => {
            if (!locked) setNoise(Math.random() * 2 - 1);
        }, 100);
        return () => clearInterval(interval);
    }, [locked]);

    const handleLock = () => {
        if (isClose) {
            setLocked(true);
            setTimeout(() => onComplete(true), 800);
        }
    };

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-slate-600 rounded-lg p-6 shadow-2xl max-w-md w-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Activity className="text-cyan-400" /> SINTONIZAR RF
                    </h2>
                    <Wifi className={`w-4 h-4 ${locked ? 'text-green-500' : 'text-slate-500'}`} />
                </div>
                
                <div className="bg-black/50 p-8 rounded-lg border border-slate-800 mb-6 flex flex-col gap-6 items-center justify-center">
                    
                    {/* Visualizer Bar */}
                    <div className="w-full h-16 bg-slate-900 rounded border border-slate-700 relative overflow-hidden shadow-inner">
                        {/* Static / Noise Background */}
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/noise.png')]"></div>
                        
                        {/* Target Zone */}
                        <div 
                            className="absolute top-0 bottom-0 bg-green-500/20 border-x border-green-500/50"
                            style={{ left: `${target - 5}%`, width: '10%' }}
                        >
                            <div className="w-full h-full animate-pulse bg-green-500/10"></div>
                        </div>

                        {/* Signal Wave (Fake) */}
                        <div 
                            className={`absolute top-2 bottom-2 w-1 transition-all duration-75 ${locked ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-cyan-500 shadow-[0_0_10px_cyan]'}`}
                            style={{ left: `${value + noise}%` }}
                        ></div>
                    </div>
                    
                    {/* Control Slider */}
                    <div className="w-full px-2">
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={value} 
                            onChange={(e) => !locked && setValue(Number(e.target.value))}
                            disabled={locked}
                            className="w-full h-4 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                        />
                    </div>

                    <div className="font-mono text-xs text-slate-400 flex justify-between w-full px-1">
                        <span>400 MHz</span>
                        <span className={isClose ? 'text-green-400 font-bold' : ''}>{Math.round(value * 5 + 400)} MHz</span>
                        <span>900 MHz</span>
                    </div>
                </div>

                <div className="flex justify-between gap-4">
                     <Button variant="danger" onClick={() => onComplete(false)} className="text-xs py-2 px-4 flex-1">
                        CANCELAR
                    </Button>
                    <Button 
                        variant={locked ? 'success' : isClose ? 'primary' : 'neutral'} 
                        onClick={handleLock} 
                        disabled={locked}
                        className="text-xs py-2 px-4 flex-1"
                    >
                        {locked ? 'SEÑAL OK' : 'FIJAR FRECUENCIA'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export const MinigameOverlay: React.FC<MinigameProps> = ({ type, onComplete }) => {
  if (type === 'FREQUENCY') {
      return <FrequencyMinigame onComplete={onComplete} />;
  }
  return <CablesMinigame onComplete={onComplete} />;
};
