import { useState, useEffect, useRef, useCallback } from 'react';
import { GameStats, SystemState, SystemType, NarrativeEvent, GameScenario } from '../types';

interface UseNarrativeSystemProps {
  stats: GameStats;
  systems: Record<SystemType, SystemState>;
  isPlaying: boolean;
  currentScenario?: GameScenario;
}

// Narrative events database
const NARRATIVE_EVENTS: NarrativeEvent[] = [
  {
    id: 'guitarist_problem',
    type: 'STORY',
    title: 'Problema del Guitarrista',
    message: 'Roberto (Stage Manager): "El guitarrista está teniendo problemas con su amplificador. Mantén el sonido estable mientras lo arreglamos."',
    triggerCondition: (stats, systems, scenario) => 
      systems[SystemType.SOUND].faderValue > 60 && stats.publicInterest > 40,
    cooldown: 10000 // 10 seconds - muy frecuente para testing
  },
  {
    id: 'singer_sick',
    type: 'CHARACTER',
    title: 'Cantante Enferma',
    message: 'Ana (Productora): "La cantante principal está enferma. Necesitas ajustar el micrófono para compensar su voz débil."',
    character: 'Ana "La Jefa"',
    triggerCondition: (stats, systems, scenario) => 
      systems[SystemType.SOUND].health < 70 && stats.clientSatisfaction < 60,
    cooldown: 10000 // 10 segundos
  },
  {
    id: 'crowd_encore',
    type: 'STORY',
    title: 'Público Pide Encore',
    message: 'El público está pidiendo un encore. ¡Mantén la energía alta!',
    triggerCondition: (stats, systems, scenario) => 
      stats.publicInterest > 70 && stats.timeRemaining < 60,
    cooldown: 10000 // 10 segundos
  },
  {
    id: 'manager_pressure',
    type: 'CHARACTER',
    title: 'Presión del Manager',
    message: 'Manager: "El CEO está mirando. Todo debe estar perfecto. No me falles."',
    character: 'Manager',
    triggerCondition: (stats, systems, scenario) => 
      stats.stress > 40 && stats.clientSatisfaction < 80,
    cooldown: 10000 // 10 segundos
  },
  {
    id: 'artist_tantrum',
    type: 'CHARACTER',
    title: 'Capricho del Artista',
    message: 'Artista: "¡Las luces están muy bajas! ¡Subilas ahora o cancelo el show!"',
    character: 'Artista Diva',
    triggerCondition: (stats, systems, scenario) => {
      // Solo aparece en escenarios de banda/rockstar
      if (scenario && scenario.id !== 'ROCKSTAR' && scenario.id !== 'FESTIVAL') {
        return false;
      }
      return systems[SystemType.LIGHTS].faderValue < 50 && stats.clientSatisfaction > 50;
    },
    cooldown: 10000 // 10 segundos
  },
  {
    id: 'technical_breakthrough',
    type: 'STORY',
    title: 'Momento Técnico Perfecto',
    message: 'Kai (Stage Manager): "Todo está funcionando perfectamente. Mantén este ritmo."',
    triggerCondition: (stats, systems, scenario) => 
      Object.values(systems).every(s => s.status === 'OK' && s.faderValue >= 35 && s.faderValue <= 65) &&
      stats.stress < 50,
    cooldown: 10000 // 10 segundos
  }
];

export const useNarrativeSystem = ({ stats, systems, isPlaying, currentScenario }: UseNarrativeSystemProps) => {
  const [activeNarrative, setActiveNarrative] = useState<NarrativeEvent | null>(null);
  const lastTriggeredRef = useRef<Map<string, number>>(new Map());
  const narrativeTimeoutRef = useRef<number | null>(null);

  const checkNarrativeEvents = useCallback(() => {
    if (!isPlaying) {
      setActiveNarrative(null);
      return;
    }

    const now = Date.now();
    
    // Check each narrative event (excluir tipo STORY)
    for (const narrative of NARRATIVE_EVENTS) {
      // Filtrar eventos de tipo STORY - no se muestran
      if (narrative.type === 'STORY') {
        continue;
      }
      
      const lastTriggered = lastTriggeredRef.current.get(narrative.id) || 0;
      const cooldown = narrative.cooldown || 10000; // 10 segundos por defecto (antes 60)
      
      // Check if cooldown has passed and condition is met
      if (now - lastTriggered > cooldown && narrative.triggerCondition(stats, systems, currentScenario)) {
        setActiveNarrative(narrative);
        lastTriggeredRef.current.set(narrative.id, now);
        console.log('[FASE 2] Narrativa activada:', narrative.title);
        
        // Auto-dismiss after 8 seconds
        if (narrativeTimeoutRef.current) {
          clearTimeout(narrativeTimeoutRef.current);
        }
        narrativeTimeoutRef.current = window.setTimeout(() => {
          setActiveNarrative(null);
        }, 8000);
        
        break; // Only show one narrative at a time
      }
    }
  }, [stats, systems, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setActiveNarrative(null);
      return;
    }

    // Check immediately
    checkNarrativeEvents();
    
    const interval = setInterval(checkNarrativeEvents, 2000); // Check every 2 seconds (más frecuente)
    return () => {
      clearInterval(interval);
      if (narrativeTimeoutRef.current) {
        clearTimeout(narrativeTimeoutRef.current);
      }
    };
  }, [checkNarrativeEvents, isPlaying, stats, systems, currentScenario]);

  const dismissNarrative = useCallback(() => {
    setActiveNarrative(null);
    if (narrativeTimeoutRef.current) {
      clearTimeout(narrativeTimeoutRef.current);
    }
  }, []);

  return {
    activeNarrative,
    dismissNarrative
  };
};
