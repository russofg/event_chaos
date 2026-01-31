import React from 'react';
import { NarrativeEvent } from '../types';
import { MessageSquare, X, User, BookOpen, Radio } from 'lucide-react';

interface NarrativePopupProps {
  narrative: NarrativeEvent;
  onDismiss: () => void;
}

export const NarrativePopup: React.FC<NarrativePopupProps> = ({ narrative, onDismiss }) => {
  const getIcon = () => {
    switch (narrative.type) {
      case 'CHARACTER': return <User className="w-5 h-5" />;
      case 'STORY': return <BookOpen className="w-5 h-5" />;
      case 'CONTEXT': return <Radio className="w-5 h-5" />;
      default: return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getColor = () => {
    switch (narrative.type) {
      case 'CHARACTER': return 'border-blue-500 bg-blue-950/90';
      case 'STORY': return 'border-purple-500 bg-purple-950/90';
      case 'CONTEXT': return 'border-cyan-500 bg-cyan-950/90';
      default: return 'border-slate-500 bg-slate-900/90';
    }
  };

  return (
    <div className="absolute bottom-32 right-8 z-[90] animate-in slide-in-from-right duration-500 max-w-md w-full">
      <div className={`border-2 ${getColor()} rounded-xl shadow-2xl p-4 backdrop-blur-md relative overflow-hidden`}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getColor().replace('border-', 'bg-').replace('/90', '/20')}`}>
                {getIcon()}
              </div>
              <div>
                <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  {narrative.type}
                </div>
                <div className="font-bold text-white text-sm">
                  {narrative.title}
                </div>
                {narrative.character && (
                  <div className="text-xs text-blue-400 italic mt-1">
                    — {narrative.character}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-black/30 p-3 rounded border-l-4 border-white/20">
            <p className="text-slate-200 text-sm leading-relaxed">
              {narrative.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
