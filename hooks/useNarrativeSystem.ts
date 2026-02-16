import { useState, useEffect, useRef, useCallback } from 'react';
import { GameStats, SystemState, SystemType, NarrativeEvent, GameScenario } from '../types';

interface UseNarrativeSystemProps {
  stats: GameStats;
  systems: Record<SystemType, SystemState>;
  isPlaying: boolean;
  currentScenario?: GameScenario;
}

type NarrativeTriggerCondition = (
  stats: GameStats,
  systems: Record<SystemType, SystemState>,
  scenario?: GameScenario
) => boolean;

interface NarrativeSequenceStageDefinition {
  type: NarrativeEvent['type'];
  title: string;
  message: string;
  character?: string;
  cooldown?: number;
  triggerCondition: NarrativeTriggerCondition;
}

interface NarrativeSequenceDefinition {
  id: string;
  allowedScenarioIds: string[];
  stages: NarrativeSequenceStageDefinition[];
}

export interface NarrativeSequenceProgress {
  [sequenceId: string]: number;
}

export interface NarrativeSequenceCooldownState {
  [stageKey: string]: number;
}

export interface NarrativeSequencePickResult {
  narrative: NarrativeEvent | null;
  nextProgress: NarrativeSequenceProgress;
  stageKey: string | null;
}

export const buildNarrativeStageKey = (sequenceId: string, stageIndex: number) => {
  return `${sequenceId}:${stageIndex}`;
};

export const pickNarrativeSequenceStage = (
  sequences: NarrativeSequenceDefinition[],
  progress: NarrativeSequenceProgress,
  cooldowns: NarrativeSequenceCooldownState,
  now: number,
  stats: GameStats,
  systems: Record<SystemType, SystemState>,
  scenario?: GameScenario
): NarrativeSequencePickResult => {
  if (!scenario) {
    return {
      narrative: null,
      nextProgress: progress,
      stageKey: null
    };
  }

  for (const sequence of sequences) {
    if (!sequence.allowedScenarioIds.includes(scenario.id)) continue;

    const currentStageIndex = progress[sequence.id] || 0;
    if (currentStageIndex >= sequence.stages.length) continue;

    const stage = sequence.stages[currentStageIndex];
    const stageKey = buildNarrativeStageKey(sequence.id, currentStageIndex);
    const cooldown = stage.cooldown || 30000;
    const lastTriggered = cooldowns[stageKey] || 0;

    if (now - lastTriggered <= cooldown) continue;
    if (!stage.triggerCondition(stats, systems, scenario)) continue;

    return {
      narrative: {
        id: stageKey,
        type: stage.type,
        title: stage.title,
        message: stage.message,
        character: stage.character,
        cooldown,
        triggerCondition: stage.triggerCondition
      },
      nextProgress: {
        ...progress,
        [sequence.id]: currentStageIndex + 1
      },
      stageKey
    };
  }

  return {
    narrative: null,
    nextProgress: progress,
    stageKey: null
  };
};

const NARRATIVE_SEQUENCES: NarrativeSequenceDefinition[] = [
  {
    id: 'arena_set_change_chain',
    allowedScenarioIds: ['ARENA', 'WORLD_TOUR'],
    stages: [
      {
        type: 'CONTEXT',
        title: 'Cambio de Acto: Setup A',
        message: 'Dirección de Show: "Entramos a cambio de acto. Prioriza LIGHTS/STAGE en transición limpia."',
        character: 'Dirección Técnica',
        cooldown: 28000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 95 &&
          systems[SystemType.LIGHTS].faderValue > 58 &&
          systems[SystemType.STAGE].faderValue > 52
      },
      {
        type: 'STORY',
        title: 'Cambio de Acto: Ventana Segura',
        message: 'Producción: "Buen setup. Conserva SOUND/VIDEO en rango de broadcast antes del drop."',
        cooldown: 30000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 72 &&
          stats.stress < 78 &&
          systems[SystemType.SOUND].faderValue >= 45 &&
          systems[SystemType.SOUND].faderValue <= 65 &&
          systems[SystemType.VIDEO].faderValue >= 45 &&
          systems[SystemType.VIDEO].faderValue <= 70
      },
      {
        type: 'CHARACTER',
        title: 'Cambio de Acto: Cierre de Precisión',
        message: 'Headliner: "Perfect timing. Cerrá esta sección sin perder estabilidad y nos llevamos el show."',
        character: 'Headliner',
        cooldown: 32000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 44 &&
          stats.publicInterest >= 60 &&
          Object.values(systems).every(system => system.status === 'OK')
      }
    ]
  },
  {
    id: 'world_tour_broadcast_chain',
    allowedScenarioIds: ['WORLD_TOUR'],
    stages: [
      {
        type: 'CONTEXT',
        title: 'Cadena Satelital: Ventana 1',
        message: 'Broadcast Global: "Tenemos enlace limpio por 30s. Asegurá SOUND+VIDEO en precisión."',
        character: 'Centro de Broadcast',
        cooldown: 30000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 88 &&
          systems[SystemType.SOUND].status === 'OK' &&
          systems[SystemType.VIDEO].status === 'OK'
      },
      {
        type: 'STORY',
        title: 'Cadena Satelital: Corte Internacional',
        message: 'Producción Internacional: "Subimos señal a 12 países. No abras demasiado LIGHTS ni STAGE."',
        cooldown: 32000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 64 &&
          systems[SystemType.LIGHTS].faderValue <= 72 &&
          systems[SystemType.STAGE].faderValue <= 68 &&
          stats.stress < 80
      },
      {
        type: 'CHARACTER',
        title: 'Cadena Satelital: Confirmación Final',
        message: 'Director Global: "Link confirmado. Mantené este bloque hasta cierre y el contrato queda renovado."',
        character: 'Director Global',
        cooldown: 34000,
        triggerCondition: (stats) =>
          stats.timeRemaining < 38 &&
          stats.clientSatisfaction >= 58
      }
    ]
  },
  {
    id: 'blackout_failover_chain',
    allowedScenarioIds: ['BLACKOUT_PROTOCOL'],
    stages: [
      {
        type: 'CONTEXT',
        title: 'Failover Manual: Inicio',
        message: 'Comando Técnico: "Perdimos redundancia primaria. Prioridad: evitar doble sistema en crítico."',
        character: 'Centro de Control',
        cooldown: 26000,
        triggerCondition: (stats, systems) => {
          const unstable = Object.values(systems).filter(system => system.status !== 'OK').length;
          return stats.timeRemaining < 95 && unstable >= 2;
        }
      },
      {
        type: 'STORY',
        title: 'Failover Manual: Contención',
        message: 'Operaciones: "Contenemos picos. Conserva STAGE bajo 60% y VIDEO estable para evitar cascada."',
        cooldown: 30000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 68 &&
          systems[SystemType.STAGE].faderValue <= 60 &&
          systems[SystemType.VIDEO].faderValue >= 42 &&
          systems[SystemType.VIDEO].faderValue <= 62
      },
      {
        type: 'CHARACTER',
        title: 'Failover Manual: Recuperación',
        message: 'Supervisor de Crisis: "Buen trabajo. Si cierras así, evitamos apagón total del venue."',
        character: 'Supervisor de Crisis',
        cooldown: 34000,
        triggerCondition: (stats, systems) => {
          const criticalCount = Object.values(systems).filter(system => system.status === 'CRITICAL').length;
          return stats.timeRemaining < 42 && criticalCount === 0;
        }
      }
    ]
  },
  {
    id: 'festival_weather_chain',
    allowedScenarioIds: ['FESTIVAL', 'EXTREME'],
    stages: [
      {
        type: 'CONTEXT',
        title: 'Frente de Viento',
        message: 'Meteorología: "Ráfaga entrante. Revisa STAGE y margen de seguridad de estructura."',
        cooldown: 30000,
        triggerCondition: (stats, systems, scenario) =>
          !!scenario &&
          (scenario.id === 'FESTIVAL' || scenario.id === 'EXTREME') &&
          systems[SystemType.STAGE].faderValue > 64
      },
      {
        type: 'STORY',
        title: 'Frente de Viento: Ajuste de Potencia',
        message: 'Stage Crew: "Mantén LIGHTS y SOUND sincronizados mientras reducimos carga de techo."',
        cooldown: 31000,
        triggerCondition: (stats, systems) =>
          stats.timeRemaining < 70 &&
          systems[SystemType.LIGHTS].faderValue >= 48 &&
          systems[SystemType.SOUND].faderValue >= 50
      },
      {
        type: 'CHARACTER',
        title: 'Frente de Viento: Ventana Estable',
        message: 'Coordinación General: "La estructura respondió bien. Preserva esta estabilidad hasta final."',
        character: 'Coordinación General',
        cooldown: 32000,
        triggerCondition: (stats) =>
          stats.timeRemaining < 40 &&
          stats.stress < 72
      }
    ]
  }
];

// Narrative events database
const NARRATIVE_EVENTS: NarrativeEvent[] = [
  {
    id: 'guitarist_problem',
    type: 'STORY',
    title: 'Problema del Guitarrista',
    message: 'Roberto (Stage Manager): "El guitarrista está teniendo problemas con su amplificador. Mantén el sonido estable mientras lo arreglamos."',
    triggerCondition: (stats, systems, scenario) =>
      systems[SystemType.SOUND].faderValue > 60 && stats.publicInterest > 40,
    cooldown: 30000
  },
  {
    id: 'singer_sick',
    type: 'CHARACTER',
    title: 'Cantante Enferma',
    message: 'Ana (Productora): "La cantante principal está enferma. Necesitas ajustar el micrófono para compensar su voz débil."',
    character: 'Ana "La Jefa"',
    triggerCondition: (stats, systems, scenario) =>
      systems[SystemType.SOUND].health < 70 && stats.clientSatisfaction < 60,
    cooldown: 28000
  },
  {
    id: 'crowd_encore',
    type: 'STORY',
    title: 'Público Pide Encore',
    message: 'El público está pidiendo un encore. ¡Mantén la energía alta!',
    triggerCondition: (stats, systems, scenario) =>
      stats.publicInterest > 70 && stats.timeRemaining < 60,
    cooldown: 35000
  },
  {
    id: 'manager_pressure',
    type: 'CHARACTER',
    title: 'Presión del Manager',
    message: 'Manager: "El CEO está mirando. Todo debe estar perfecto. No me falles."',
    character: 'Manager',
    triggerCondition: (stats, systems, scenario) =>
      stats.stress > 40 && stats.clientSatisfaction < 80,
    cooldown: 25000
  },
  {
    id: 'artist_tantrum',
    type: 'CHARACTER',
    title: 'Capricho del Artista',
    message: 'Artista: "¡Las luces están muy bajas! ¡Subilas ahora o cancelo el show!"',
    character: 'Artista Diva',
    triggerCondition: (stats, systems, scenario) => {
      if (scenario && scenario.id !== 'ROCKSTAR' && scenario.id !== 'FESTIVAL') {
        return false;
      }
      return systems[SystemType.LIGHTS].faderValue < 50 && stats.clientSatisfaction > 50;
    },
    cooldown: 30000
  },
  {
    id: 'technical_breakthrough',
    type: 'STORY',
    title: 'Momento Técnico Perfecto',
    message: 'Kai (Stage Manager): "Todo está funcionando perfectamente. Mantén este ritmo."',
    triggerCondition: (stats, systems, scenario) =>
      Object.values(systems).every(system => system.status === 'OK' && system.faderValue >= 35 && system.faderValue <= 65) &&
      stats.stress < 50,
    cooldown: 20000
  },
  {
    id: 'weather_shift',
    type: 'CONTEXT',
    title: 'Cambio de Clima',
    message: 'Operaciones: "Se viene una ráfaga fuerte. Revisá STAGE y mantené margen de seguridad."',
    triggerCondition: (stats, systems, scenario) =>
      !!scenario && scenario.id === 'FESTIVAL' && systems[SystemType.STAGE].faderValue > 65,
    cooldown: 35000
  },
  {
    id: 'vip_arrival',
    type: 'STORY',
    title: 'Llegó el VIP',
    message: 'Producción: "Llegó un invitado clave. Necesitamos impecable audio y luces en esta sección."',
    triggerCondition: (stats, systems) =>
      stats.timeRemaining < 80 &&
      systems[SystemType.SOUND].status === 'OK' &&
      systems[SystemType.LIGHTS].status === 'OK',
    cooldown: 45000
  },
  {
    id: 'arena_cue_storm',
    type: 'CONTEXT',
    title: 'Tormenta de Cues',
    message: 'Dirección Técnica: "Entramos a la parte más densa del show. Necesito cambios rápidos y precisos en LIGHTS/STAGE."',
    triggerCondition: (stats, systems, scenario) => {
      if (!scenario || (scenario.id !== 'ARENA' && scenario.id !== 'WORLD_TOUR')) {
        return false;
      }
      return systems[SystemType.LIGHTS].faderValue > 65 && systems[SystemType.STAGE].faderValue > 60;
    },
    cooldown: 28000
  },
  {
    id: 'satellite_lock',
    type: 'STORY',
    title: 'Ventana Satelital',
    message: 'Broadcast: "Tenemos 20 segundos de ventana limpia. Mantén VIDEO y SOUND dentro de parámetros de transmisión."',
    triggerCondition: (stats, systems, scenario) => {
      if (!scenario || scenario.id !== 'WORLD_TOUR') {
        return false;
      }
      return stats.timeRemaining < 75 &&
        systems[SystemType.VIDEO].faderValue >= 45 &&
        systems[SystemType.VIDEO].faderValue <= 65 &&
        systems[SystemType.SOUND].status === 'OK';
    },
    cooldown: 36000
  },
  {
    id: 'blackout_failover',
    type: 'CHARACTER',
    title: 'Protocolo de Contingencia',
    message: 'Comando Técnico: "Activamos failover manual. Mantén la calma y evita que dos sistemas caigan al mismo tiempo."',
    character: 'Centro de Control',
    triggerCondition: (stats, systems, scenario) => {
      if (!scenario || scenario.id !== 'BLACKOUT_PROTOCOL') {
        return false;
      }
      const unstableSystems = Object.values(systems).filter(system => system.status !== 'OK').length;
      return stats.stress > 50 && unstableSystems >= 2;
    },
    cooldown: 30000
  }
];

export const useNarrativeSystem = ({ stats, systems, isPlaying, currentScenario }: UseNarrativeSystemProps) => {
  const [activeNarrative, setActiveNarrative] = useState<NarrativeEvent | null>(null);
  const activeNarrativeRef = useRef<NarrativeEvent | null>(null);
  const lastTriggeredRef = useRef<Map<string, number>>(new Map());
  const sequenceProgressRef = useRef<NarrativeSequenceProgress>({});
  const narrativeTimeoutRef = useRef<number | null>(null);
  const statsRef = useRef(stats);
  const systemsRef = useRef(systems);
  const scenarioRef = useRef(currentScenario);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    systemsRef.current = systems;
  }, [systems]);

  useEffect(() => {
    scenarioRef.current = currentScenario;
  }, [currentScenario]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const clearActiveNarrative = useCallback(() => {
    setActiveNarrative(null);
    activeNarrativeRef.current = null;
    if (narrativeTimeoutRef.current) {
      clearTimeout(narrativeTimeoutRef.current);
      narrativeTimeoutRef.current = null;
    }
  }, []);

  const showNarrative = useCallback((narrative: NarrativeEvent) => {
    setActiveNarrative(narrative);
    activeNarrativeRef.current = narrative;

    if (narrativeTimeoutRef.current) {
      clearTimeout(narrativeTimeoutRef.current);
    }
    narrativeTimeoutRef.current = window.setTimeout(() => {
      setActiveNarrative(null);
      activeNarrativeRef.current = null;
      narrativeTimeoutRef.current = null;
    }, 8000);
  }, []);

  const checkNarrativeEvents = useCallback(() => {
    if (!isPlayingRef.current) {
      clearActiveNarrative();
      return;
    }

    if (activeNarrativeRef.current) return;

    const now = Date.now();
    const statsNow = statsRef.current;
    const systemsNow = systemsRef.current;
    const scenarioNow = scenarioRef.current;

    const cooldownState = Object.fromEntries(lastTriggeredRef.current.entries());
    const sequencePick = pickNarrativeSequenceStage(
      NARRATIVE_SEQUENCES,
      sequenceProgressRef.current,
      cooldownState,
      now,
      statsNow,
      systemsNow,
      scenarioNow
    );

    if (sequencePick.narrative && sequencePick.stageKey) {
      sequenceProgressRef.current = sequencePick.nextProgress;
      lastTriggeredRef.current.set(sequencePick.stageKey, now);
      showNarrative(sequencePick.narrative);
      return;
    }

    for (const narrative of NARRATIVE_EVENTS) {
      const lastTriggered = lastTriggeredRef.current.get(narrative.id) || 0;
      const cooldown = narrative.cooldown || 30000;

      if (now - lastTriggered > cooldown && narrative.triggerCondition(statsNow, systemsNow, scenarioNow)) {
        lastTriggeredRef.current.set(narrative.id, now);
        showNarrative(narrative);
        break;
      }
    }
  }, [clearActiveNarrative, showNarrative]);

  useEffect(() => {
    if (!isPlaying) {
      clearActiveNarrative();
      sequenceProgressRef.current = {};
      lastTriggeredRef.current.clear();
      return;
    }

    checkNarrativeEvents();

    const interval = setInterval(checkNarrativeEvents, 2000);
    return () => {
      clearInterval(interval);
      if (narrativeTimeoutRef.current) {
        clearTimeout(narrativeTimeoutRef.current);
      }
    };
  }, [checkNarrativeEvents, clearActiveNarrative, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    sequenceProgressRef.current = {};
  }, [currentScenario?.id, isPlaying]);

  const dismissNarrative = useCallback(() => {
    clearActiveNarrative();
  }, [clearActiveNarrative]);

  return {
    activeNarrative,
    dismissNarrative
  };
};
