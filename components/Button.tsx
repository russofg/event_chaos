
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
  
  const baseStyles = "relative px-6 py-4 font-bold uppercase tracking-widest text-sm transition-all duration-150 rounded-xl shadow-xl overflow-hidden border";
  
  // Cinematic polished style
  const variants = {
    primary: "bg-[linear-gradient(160deg,#0f172a,#0d2740)] border-cyan-500/60 text-cyan-100 hover:border-cyan-300 hover:shadow-[0_0_22px_rgba(34,211,238,0.35)]",
    danger: "bg-[linear-gradient(160deg,#2a1016,#3d141d)] border-red-500/60 text-red-100 hover:border-red-300 hover:shadow-[0_0_22px_rgba(239,68,68,0.35)]",
    success: "bg-[linear-gradient(160deg,#0f261f,#15382e)] border-emerald-500/60 text-emerald-100 hover:border-emerald-300 hover:shadow-[0_0_22px_rgba(16,185,129,0.35)]",
    neutral: "bg-[linear-gradient(160deg,#101a2d,#111827)] border-slate-500/60 text-slate-100 hover:border-slate-300 hover:shadow-[0_0_20px_rgba(148,163,184,0.25)]",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className} ${disabled ? 'opacity-45 grayscale cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_35%,transparent_70%)]" />
      <div className="absolute inset-[1px] rounded-[11px] pointer-events-none border border-white/5" />
      
      <div className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
        {children}
      </div>
    </button>
  );
};
