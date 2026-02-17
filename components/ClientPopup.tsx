import React, { useEffect, useState } from 'react';
import { User, MessageSquare, XCircle, Volume2 } from 'lucide-react';

interface ClientPopupProps {
  message: string | null;
  mood: 'HAPPY' | 'ANGRY' | 'PANIC' | 'NEUTRAL';
  onClose: () => void;
  mobile?: boolean;
}

export const ClientPopup: React.FC<ClientPopupProps> = ({ message, mood, onClose, mobile = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 500); // Wait for animation
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message && !isVisible) return null;

  const getStyles = () => {
    switch (mood) {
      case 'ANGRY': return 'border-red-500 bg-red-950/90 shadow-red-900/50';
      case 'PANIC': return 'border-orange-500 bg-orange-950/90 shadow-orange-900/50';
      case 'HAPPY': return 'border-emerald-500 bg-emerald-950/90 shadow-emerald-900/50';
      default: return 'border-slate-500 bg-slate-900/90 shadow-slate-900/50';
    }
  };

  const getIconColor = () => {
    switch (mood) {
      case 'ANGRY': return 'text-red-500 animate-pulse';
      case 'PANIC': return 'text-orange-500 animate-bounce';
      case 'HAPPY': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className={`${mobile ? 'relative w-full shrink-0 pointer-events-auto' : 'absolute top-20 md:top-24 left-2 right-2 md:left-auto md:right-8 z-50 md:w-80'} transition-all duration-500 transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
      <div className={`border-l-4 p-4 rounded-r-lg shadow-2xl backdrop-blur-md relative overflow-hidden ${getStyles()}`}>
        
        {/* Scanlines overlay specific to popup */}
        <div className="absolute inset-0 aaa-scanline-overlay pointer-events-none"></div>

        <div className="flex items-start gap-4 relative z-10">
           {/* Client Avatar Placeholder */}
           <div className="relative">
              <div className={`w-12 h-12 rounded-lg border-2 bg-black flex items-center justify-center overflow-hidden ${getStyles().split(' ')[0]}`}>
                  <User className={`w-8 h-8 ${getIconColor()}`} />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-slate-700">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
              </div>
           </div>

           <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${getIconColor()}`}>
                      {mood === 'ANGRY' ? 'CLIENTE (FURIOSO)' : mood === 'HAPPY' ? 'CLIENTE (VIP)' : 'INCOMING MSG'}
                  </span>
                  <button onClick={() => setIsVisible(false)} className="text-white/50 hover:text-white">
                      <XCircle className="w-4 h-4" />
                  </button>
              </div>
              
              <div className="font-mono text-sm leading-tight text-white drop-shadow-md">
                  "{message}"
              </div>
           </div>
        </div>

        {/* Decoration */}
        <div className="absolute bottom-0 right-0 p-1 opacity-50">
            <MessageSquare className="w-12 h-12 text-white/5 -rotate-12" />
        </div>
      </div>
    </div>
  );
};
