import { useState, useEffect, useRef, useCallback } from 'react';
import { GameStats, SystemState, SystemType, EarlyWarning } from '../types';

interface UseEarlyWarningSystemProps {
  stats: GameStats;
  systems: Record<SystemType, SystemState>;
  isPlaying: boolean;
  onPreventEvent?: (warningId: string) => void;
}

// Early warning definitions
const EARLY_WARNINGS: Omit<EarlyWarning, 'id' | 'timeUntilEvent'>[] = [
  {
    systemId: SystemType.SOUND,
    message: 'El amplificador está calentándose. Considera bajar el volumen.',
    severity: 'MEDIUM',
    canPrevent: true,
    preventionAction: 'Bajar SOUND a < 60%'
  },
  {
    systemId: SystemType.LIGHTS,
    message: 'Las luces están consumiendo mucha energía. Riesgo de sobrecarga.',
    severity: 'LOW',
    canPrevent: true,
    preventionAction: 'Bajar LIGHTS a < 70%'
  },
  {
    systemId: SystemType.VIDEO,
    message: 'La temperatura del procesador de video está subiendo.',
    severity: 'MEDIUM',
    canPrevent: true,
    preventionAction: 'Bajar VIDEO a < 65%'
  },
  {
    systemId: SystemType.STAGE,
    message: 'El generador está al 90% de capacidad. Riesgo de corte.',
    severity: 'HIGH',
    canPrevent: true,
    preventionAction: 'Bajar cualquier sistema a < 50%'
  }
];

export const useEarlyWarningSystem = ({ 
  stats, 
  systems, 
  isPlaying,
  onPreventEvent 
}: UseEarlyWarningSystemProps) => {
  const [activeWarnings, setActiveWarnings] = useState<EarlyWarning[]>([]);
  const warningCooldownsRef = useRef<Map<string, number>>(new Map());
  const warningCreatedAtRef = useRef<Map<string, number>>(new Map());
  const activeWarningsRef = useRef<EarlyWarning[]>([]); // Ref para evitar race conditions

  const checkWarnings = useCallback(() => {
    if (!isPlaying) {
      setActiveWarnings([]);
      return;
    }

    const now = Date.now();
    const soundValue = systems[SystemType.SOUND]?.faderValue || 0;
    
    console.log('[FASE 2 DEBUG] Checking warnings. SOUND fader:', soundValue, 'isPlaying:', isPlaying);
    
    setActiveWarnings(prev => {
      // Usar el ref para obtener el estado más actualizado
      const currentWarnings = activeWarningsRef.current.length > 0 ? activeWarningsRef.current : prev;
      const existingWarningIds = new Set(currentWarnings.map(w => w.id));
      const newWarnings: EarlyWarning[] = [];

      // Primero, mantener las advertencias existentes que aún cumplen condiciones
      currentWarnings.forEach(warning => {
        let shouldKeep = false;
        
        switch (warning.systemId) {
          case SystemType.SOUND:
            shouldKeep = systems[SystemType.SOUND]?.faderValue > 60;
            break;
          case SystemType.LIGHTS:
            shouldKeep = systems[SystemType.LIGHTS].faderValue > 65;
            break;
          case SystemType.VIDEO:
            shouldKeep = systems[SystemType.VIDEO].faderValue > 60;
            break;
          case SystemType.STAGE:
            const totalLoad = Object.values(systems).reduce((sum, s) => sum + s.faderValue, 0);
            shouldKeep = totalLoad > 200;
            break;
        }
        
        if (shouldKeep) {
          newWarnings.push(warning);
        }
      });
      
      // Check each warning condition para agregar nuevas
      EARLY_WARNINGS.forEach((warningDef, index) => {
        const warningKey = `${warningDef.systemId}-${index}`;
        const lastTriggered = warningCooldownsRef.current.get(warningKey) || 0;
        
        // Si ya existe, no crear una nueva
        if (existingWarningIds.has(warningKey)) {
          return;
        }
        
        // Cooldown de 5 segundos
        if (now - lastTriggered < 5000) {
          return;
        }

        let shouldTrigger = false;
        let timeUntilEvent = 30;

        switch (warningDef.systemId) {
          case SystemType.SOUND:
            if (soundValue > 60) {
              shouldTrigger = true;
              timeUntilEvent = 25;
              console.log('[FASE 2 DEBUG] SOUND warning should trigger! Value:', soundValue);
            }
            break;
          case SystemType.LIGHTS:
            if (systems[SystemType.LIGHTS].faderValue > 65) {
              shouldTrigger = true;
              timeUntilEvent = 20;
            }
            break;
          case SystemType.VIDEO:
            if (systems[SystemType.VIDEO].faderValue > 60) {
              shouldTrigger = true;
              timeUntilEvent = 30;
            }
            break;
          case SystemType.STAGE:
            const totalLoad = Object.values(systems).reduce((sum, s) => sum + s.faderValue, 0);
            if (totalLoad > 200) {
              shouldTrigger = true;
              timeUntilEvent = 15;
            }
            break;
        }

        if (shouldTrigger) {
          const warning: EarlyWarning = {
            id: warningKey,
            ...warningDef,
            timeUntilEvent
          };
          newWarnings.push(warning);
          warningCooldownsRef.current.set(warningKey, now);
          warningCreatedAtRef.current.set(warningKey, now);
          console.log('[FASE 2] Advertencia temprana activada:', warning.message, 'Total warnings:', newWarnings.length);
        }
      });

      console.log('[FASE 2 DEBUG] Returning', newWarnings.length, 'warnings');
      // Actualizar el ref con las nuevas advertencias
      activeWarningsRef.current = newWarnings;
      return newWarnings;
    });
  }, [systems, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setActiveWarnings([]);
      activeWarningsRef.current = [];
      return;
    }

    // Check immediately
    checkWarnings();
    
    const interval = setInterval(checkWarnings, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [checkWarnings, isPlaying]);

  // Check if warnings are being prevented (with hysteresis and minimum display time)
  useEffect(() => {
    if (!isPlaying || activeWarnings.length === 0) return;

    const checkPrevention = setInterval(() => {
      const now = Date.now();
      setActiveWarnings(prev => {
        const filtered = prev.filter(warning => {
          const createdAt = warningCreatedAtRef.current.get(warning.id) || now;
          const minDisplayTime = 8000; // Mínimo 8 segundos visible (aumentado)
          
          // No eliminar si no ha pasado el tiempo mínimo
          if (now - createdAt < minDisplayTime) {
            return true; // Mantener la advertencia
          }

          let isPrevented = false;

          switch (warning.systemId) {
            case SystemType.SOUND:
              // Hysteresis: solo desaparece si baja de 50% (umbral mucho más bajo que el de activación 60%)
              isPrevented = systems[SystemType.SOUND].faderValue < 50;
              break;
            case SystemType.LIGHTS:
              isPrevented = systems[SystemType.LIGHTS].faderValue < 55; // Hysteresis (activación 65%)
              break;
            case SystemType.VIDEO:
              isPrevented = systems[SystemType.VIDEO].faderValue < 50; // Hysteresis (activación 60%)
              break;
            case SystemType.STAGE:
              const totalLoad = Object.values(systems).reduce((sum, s) => sum + s.faderValue, 0);
              isPrevented = totalLoad < 160; // Hysteresis: umbral más bajo (activación 200)
              break;
          }

          if (isPrevented && warning.canPrevent && onPreventEvent) {
            onPreventEvent(warning.id);
            warningCreatedAtRef.current.delete(warning.id);
            warningCooldownsRef.current.delete(warning.id);
          }

          return !isPrevented; // Remove if prevented
        });
        // Actualizar el ref
        activeWarningsRef.current = filtered;
        return filtered;
      });
    }, 3000); // Check cada 3 segundos (menos frecuente)

    return () => clearInterval(checkPrevention);
  }, [activeWarnings, systems, isPlaying, onPreventEvent]);

  // Update timeUntilEvent countdown
  useEffect(() => {
    if (!isPlaying || activeWarnings.length === 0) return;

    const interval = setInterval(() => {
      setActiveWarnings(prev => {
        const updated = prev.map(w => ({
          ...w,
          timeUntilEvent: Math.max(0, w.timeUntilEvent - 1)
        })).filter(w => w.timeUntilEvent > 0);
        // Actualizar el ref
        activeWarningsRef.current = updated;
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWarnings, isPlaying]);

  return {
    activeWarnings
  };
};
