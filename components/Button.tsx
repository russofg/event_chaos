
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'success' | 'neutral';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'neutral', 
  disabled = false,
  className = ''
}) => {
  
  const baseStyles = "relative px-6 py-4 font-bold uppercase tracking-widest text-sm transition-all duration-75 transform active:translate-y-1 active:border-b-0 border-b-4 rounded-lg shadow-xl overflow-hidden";
  
  // Skeuomorphic colors with plastic feel gradients
  const variants = {
    primary: "bg-gradient-to-t from-cyan-700 to-cyan-500 border-cyan-900 text-white hover:from-cyan-600 hover:to-cyan-400 shadow-[0_5px_0_rgb(22,78,99)] active:shadow-none",
    danger: "bg-gradient-to-t from-red-700 to-red-500 border-red-900 text-white hover:from-red-600 hover:to-red-400 shadow-[0_5px_0_rgb(127,29,29)] active:shadow-none",
    success: "bg-gradient-to-t from-emerald-700 to-emerald-500 border-emerald-900 text-white hover:from-emerald-600 hover:to-emerald-400 shadow-[0_5px_0_rgb(6,78,59)] active:shadow-none",
    neutral: "bg-gradient-to-t from-slate-700 to-slate-600 border-slate-900 text-slate-200 hover:from-slate-600 hover:to-slate-500 shadow-[0_5px_0_rgb(15,23,42)] active:shadow-none",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-50 grayscale cursor-not-allowed active:translate-y-0 active:border-b-4 active:shadow-[0_5px_0_rgba(0,0,0,0.5)]' : ''}`}
    >
      {/* Plastic Shine */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none"></div>
      
      <div className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
        {children}
      </div>
    </button>
  );
};
