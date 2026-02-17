
import React from 'react';
import { getUIButtonClasses } from '../utils/uiSystem';
import type { UIButtonVariant } from '../utils/uiSystem';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: UIButtonVariant;
  disabled?: boolean;
  className?: string;
}

export const Button = ({ 
  children, 
  onClick, 
  variant = 'neutral', 
  disabled = false,
  className = ''
}: ButtonProps) => {
  const ui = getUIButtonClasses({ variant, disabled });

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${ui.base} ${ui.variant} ${ui.state} ${className}`}
    >
      <div className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
        {children}
      </div>
    </button>
  );
};
