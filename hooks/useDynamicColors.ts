import { useMemo } from 'react';
import { GameStats, SystemState, SystemType } from '../types';

interface DynamicColors {
  // Color themes based on game state
  primary: string;
  secondary: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  // Background tints
  bgTint: string;
  borderTint: string;
  // Text colors
  textPrimary: string;
  textSecondary: string;
}

export const useDynamicColors = (stats: GameStats, systems: Record<SystemType, SystemState>) => {
  return useMemo(() => {
    const { publicInterest, clientSatisfaction, stress } = stats;
    
    // Calculate overall energy level (0-100)
    const energyLevel = (publicInterest + clientSatisfaction) / 2;
    
    // Determine game state
    const isCrisis = stress > 70 || publicInterest < 30 || clientSatisfaction < 30;
    const isHighEnergy = energyLevel > 70 && stress < 40;
    const isSuccess = publicInterest > 60 && clientSatisfaction > 60 && stress < 50;
    
    let colors: DynamicColors;
    
    if (isCrisis) {
      // Crisis mode: Cold, desaturated colors
      colors = {
        primary: 'text-slate-400',
        secondary: 'text-slate-500',
        accent: 'text-blue-400',
        danger: 'text-red-500',
        success: 'text-emerald-400',
        warning: 'text-orange-400',
        bgTint: 'bg-slate-950/50',
        borderTint: 'border-slate-700',
        textPrimary: 'text-slate-300',
        textSecondary: 'text-slate-500'
      };
    } else if (isHighEnergy) {
      // High energy: Warm, vibrant colors
      colors = {
        primary: 'text-yellow-400',
        secondary: 'text-orange-400',
        accent: 'text-amber-500',
        danger: 'text-red-500',
        success: 'text-emerald-400',
        warning: 'text-yellow-500',
        bgTint: 'bg-amber-950/20',
        borderTint: 'border-amber-600',
        textPrimary: 'text-yellow-100',
        textSecondary: 'text-amber-300'
      };
    } else if (isSuccess) {
      // Success: Bright, saturated colors
      colors = {
        primary: 'text-emerald-400',
        secondary: 'text-cyan-400',
        accent: 'text-green-400',
        danger: 'text-red-500',
        success: 'text-emerald-500',
        warning: 'text-yellow-400',
        bgTint: 'bg-emerald-950/20',
        borderTint: 'border-emerald-600',
        textPrimary: 'text-emerald-100',
        textSecondary: 'text-emerald-300'
      };
    } else {
      // Normal: Balanced colors
      colors = {
        primary: 'text-cyan-400',
        secondary: 'text-blue-400',
        accent: 'text-cyan-500',
        danger: 'text-red-500',
        success: 'text-emerald-400',
        warning: 'text-amber-400',
        bgTint: 'bg-slate-900/50',
        borderTint: 'border-slate-600',
        textPrimary: 'text-slate-100',
        textSecondary: 'text-slate-400'
      };
    }
    
    return colors;
  }, [stats, systems]);
};
