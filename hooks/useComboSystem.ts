import { useState, useCallback, useRef, useEffect } from 'react';
import { SystemState, SystemType, ComboState } from '../types';

interface UseComboSystemProps {
  systems: Record<SystemType, SystemState>;
  isPlaying: boolean;
}

export const useComboSystem = ({ systems, isPlaying }: UseComboSystemProps) => {
  const [comboState, setComboState] = useState<ComboState>({
    streakSeconds: 0,
    multiplier: 1.0,
    lastBonusTime: 0,
    perfectRhythm: false
  });
  
  const lastCheckRef = useRef<number>(Date.now());
  const bonusCallbackRef = useRef<((bonus: { type: string; amount: number; message: string }) => void) | null>(null);
  const systemsRef = useRef(systems);

  useEffect(() => {
    systemsRef.current = systems;
  }, [systems]);

  // Update combo system
  useEffect(() => {
    if (!isPlaying) {
      setComboState({
        streakSeconds: 0,
        multiplier: 1.0,
        lastBonusTime: 0,
        perfectRhythm: false
      });
      lastCheckRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastCheckRef.current) / 1000; // seconds
      lastCheckRef.current = now;
      const currentSystems = Object.values(systemsRef.current) as SystemState[];
      const allSafe = currentSystems.every(sys => sys.faderValue >= 40 && sys.faderValue <= 60);
      const values = currentSystems.map(s => s.faderValue);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const inSync = values.every(v => Math.abs(v - avg) < 5);

      setComboState(prev => {
        let newStreak = prev.streakSeconds;
        let newMultiplier = prev.multiplier;
        let newPerfectRhythm = inSync && allSafe;
        let bonusAwarded = false;

        if (allSafe) {
          // Increase streak
          newStreak += deltaTime;
          
          // Calculate multiplier based on streak
          if (newStreak >= 60) {
            newMultiplier = 2.5; // 60+ seconds = 2.5x
          } else if (newStreak >= 30) {
            newMultiplier = 2.0; // 30-59 seconds = 2.0x
          } else if (newStreak >= 10) {
            newMultiplier = 1.5; // 10-29 seconds = 1.5x
          } else {
            newMultiplier = 1.0; // < 10 seconds = 1.0x
          }

          // Award bonuses at milestones
          if (newStreak >= 10 && prev.streakSeconds < 10 && now - prev.lastBonusTime > 1000) {
            bonusAwarded = true;
            if (bonusCallbackRef.current) {
              bonusCallbackRef.current({
                type: 'STREAK_10',
                amount: 50,
                message: '¡10 segundos estables! +$50'
              });
            }
          } else if (newStreak >= 30 && prev.streakSeconds < 30 && now - prev.lastBonusTime > 1000) {
            bonusAwarded = true;
            if (bonusCallbackRef.current) {
              bonusCallbackRef.current({
                type: 'STREAK_30',
                amount: 150,
                message: '¡30 segundos estables! +$150 y -10% estrés'
              });
            }
          } else if (newStreak >= 60 && prev.streakSeconds < 60 && now - prev.lastBonusTime > 1000) {
            bonusAwarded = true;
            if (bonusCallbackRef.current) {
              bonusCallbackRef.current({
                type: 'STREAK_60',
                amount: 300,
                message: '¡60 segundos perfectos! +$300 y evento especial'
              });
            }
          }
        } else {
          // Reset streak if not all safe
          newStreak = 0;
          newMultiplier = 1.0;
        }

        return {
          streakSeconds: newStreak,
          multiplier: newMultiplier,
          lastBonusTime: bonusAwarded ? now : prev.lastBonusTime,
          perfectRhythm: newPerfectRhythm
        };
      });
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [isPlaying]);

  const setBonusCallback = useCallback((callback: (bonus: { type: string; amount: number; message: string }) => void) => {
    bonusCallbackRef.current = callback;
  }, []);

  return {
    comboState,
    setBonusCallback
  };
};
