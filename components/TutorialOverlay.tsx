
import React from 'react';
import { Button } from './Button';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { TutorialStep } from '../types';

interface TutorialOverlayProps {
  step: TutorialStep;
  onNext: () => void;
  totalSteps: number;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, totalSteps }) => {
  return (
    <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
        <div className="bg-slate-900 border-2 border-cyan-500 rounded-lg p-8 max-w-lg w-full shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden animate-in zoom-in duration-300">
            
            {/* Background Tech Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.05)_25%,rgba(6,182,212,0.05)_50%,transparent_50%,transparent_75%,rgba(6,182,212,0.05)_75%,rgba(6,182,212,0.05)_100%)] bg-[length:20px_20px]"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-slate-700 rounded-full border-2 border-cyan-400 flex items-center justify-center overflow-hidden">
                             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto&backgroundColor=b6e3f4`} alt="Jefe" className="w-full h-full" />
                         </div>
                         <div>
                             <h2 className="text-xl font-bold text-white uppercase tracking-wider">{step.title}</h2>
                             <span className="text-cyan-400 text-xs font-mono font-bold">ROBERTO (JEFE TÉCNICO)</span>
                         </div>
                    </div>
                    <div className="bg-black/40 px-3 py-1 rounded text-xs font-mono text-slate-400 border border-slate-700">
                        PASO {step.id} / {totalSteps}
                    </div>
                </div>

                <div className="bg-black/30 p-4 rounded border-l-4 border-cyan-500 mb-8 min-h-[100px] flex items-center">
                    <p className="text-slate-200 text-lg leading-relaxed font-sans">{step.text}</p>
                </div>

                <div className="flex justify-end">
                    <Button variant="primary" onClick={onNext} className="group">
                        <div className="flex items-center gap-2">
                             {step.id === totalSteps ? (
                                <> <ShieldCheck className="w-5 h-5" /> COMENZAR TURNO </>
                             ) : (
                                <> SIGUIENTE <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> </>
                             )}
                        </div>
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
};
