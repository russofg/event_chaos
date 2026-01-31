import { useState, useEffect, useRef, useCallback } from 'react';
import { GameStats, SystemState, SystemType, GameEvent, Achievement, SessionData, CareerData } from '../types';

interface UseAchievementSystemProps {
  stats: GameStats;
  systems: Record<SystemType, SystemState>;
  activeEvents: GameEvent[];
  isPlaying: boolean;
  careerData: CareerData;
  onAchievementUnlocked: (achievementId: string, points: number) => void;
}

// Definición de logros
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'perfectionist',
    title: 'Perfeccionista',
    description: 'Completa un escenario sin que ningún sistema caiga por debajo de 50% de salud',
    icon: '⭐',
    category: 'PERFECTION',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.minSystemHealth >= 50 && stats.timeRemaining <= 0;
    },
    rewardPoints: 50
  },
  {
    id: 'economist',
    title: 'Económico',
    description: 'Completa un escenario gastando menos de $1000',
    icon: '💰',
    category: 'ECONOMY',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.totalSpent < 1000 && stats.timeRemaining <= 0;
    },
    rewardPoints: 30
  },
  {
    id: 'speed_demon',
    title: 'Demonio de la Velocidad',
    description: 'Resuelve 10 eventos en menos de 30 segundos',
    icon: '⚡',
    category: 'SPEED',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.eventsResolved >= 10 && sessionData.timePlayed < 30;
    },
    rewardPoints: 40
  },
  {
    id: 'stress_master',
    title: 'Maestro del Estrés',
    description: 'Completa un escenario sin que el estrés supere el 50%',
    icon: '🧘',
    category: 'PERFORMANCE',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.maxStress < 50 && stats.timeRemaining <= 0;
    },
    rewardPoints: 35
  },
  {
    id: 'event_master',
    title: 'Maestro de Eventos',
    description: 'Resuelve 20 eventos en una sola sesión',
    icon: '🎯',
    category: 'PERFORMANCE',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.eventsResolved >= 20;
    },
    rewardPoints: 45
  },
  {
    id: 'perfect_streak',
    title: 'Racha Perfecta',
    description: 'Mantén todos los sistemas estables por 60 segundos consecutivos',
    icon: '🔥',
    category: 'PERFECTION',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.perfectStreak >= 60;
    },
    rewardPoints: 60
  },
  {
    id: 'zero_failures',
    title: 'Cero Fallos',
    description: 'Completa un escenario sin fallar ningún evento',
    icon: '💎',
    category: 'PERFECTION',
    checkCondition: (stats, systems, events, sessionData) => {
      return sessionData.eventsFailed === 0 && stats.timeRemaining <= 0 && sessionData.eventsResolved > 0;
    },
    rewardPoints: 70
  },
  {
    id: 'budget_king',
    title: 'Rey del Presupuesto',
    description: 'Termina un escenario con más de $8000',
    icon: '👑',
    category: 'ECONOMY',
    checkCondition: (stats, systems, events, sessionData) => {
      return stats.budget > 8000 && stats.timeRemaining <= 0;
    },
    rewardPoints: 25
  }
];

export const useAchievementSystem = ({
  stats,
  systems,
  activeEvents,
  isPlaying,
  careerData,
  onAchievementUnlocked
}: UseAchievementSystemProps) => {
  const [sessionData, setSessionData] = useState<SessionData>({
    eventsResolved: 0,
    eventsFailed: 0,
    totalSpent: 0,
    minSystemHealth: 100,
    maxStress: 0,
    timePlayed: 0,
    perfectStreak: 0
  });

  const sessionStartTime = useRef<number>(0);
  const lastCheckTime = useRef<number>(0);
  const perfectStreakStart = useRef<number | null>(null);

  // Reset session data when game starts
  useEffect(() => {
    if (isPlaying && sessionStartTime.current === 0) {
      sessionStartTime.current = Date.now();
      setSessionData({
        eventsResolved: 0,
        eventsFailed: 0,
        totalSpent: 0,
        minSystemHealth: 100,
        maxStress: 0,
        timePlayed: 0,
        perfectStreak: 0
      });
    } else if (!isPlaying) {
      sessionStartTime.current = 0;
      perfectStreakStart.current = null;
    }
  }, [isPlaying]);

  // Track session data
  useEffect(() => {
    if (!isPlaying) return;

    const now = Date.now();
    const timePlayed = (now - sessionStartTime.current) / 1000;

    setSessionData(prev => {
      const minHealth = Math.min(
        prev.minSystemHealth,
        ...Object.values(systems).map(s => s.health)
      );
      const maxStress = Math.max(prev.maxStress, stats.stress);

      // Check perfect streak (all systems in safe zone 40-60%)
      const allInSafeZone = Object.values(systems).every(s => 
        s.faderValue >= 40 && s.faderValue <= 60 && s.status === 'OK'
      );

      let perfectStreak = prev.perfectStreak;
      if (allInSafeZone) {
        if (perfectStreakStart.current === null) {
          perfectStreakStart.current = now;
        }
        perfectStreak = (now - perfectStreakStart.current) / 1000;
      } else {
        perfectStreakStart.current = null;
        perfectStreak = 0;
      }

      return {
        ...prev,
        minSystemHealth: minHealth,
        maxStress: maxStress,
        timePlayed,
        perfectStreak
      };
    });
  }, [stats, systems, isPlaying]);

  // Check achievements
  const checkAchievements = useCallback(() => {
    if (!isPlaying) return;

    ACHIEVEMENTS.forEach(achievement => {
      // Skip if already unlocked
      if (careerData.unlockedAchievements.includes(achievement.id)) {
        return;
      }

      // Check condition
      if (achievement.checkCondition(stats, systems, activeEvents, sessionData)) {
        onAchievementUnlocked(achievement.id, achievement.rewardPoints);
      }
    });
  }, [stats, systems, activeEvents, sessionData, isPlaying, careerData, onAchievementUnlocked]);

  // Check achievements periodically
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(checkAchievements, 2000);
    return () => clearInterval(interval);
  }, [checkAchievements, isPlaying]);

  // Track events resolved/failed
  const trackEventResolved = useCallback((success: boolean) => {
    setSessionData(prev => ({
      ...prev,
      eventsResolved: success ? prev.eventsResolved + 1 : prev.eventsResolved,
      eventsFailed: success ? prev.eventsFailed : prev.eventsFailed + 1
    }));
  }, []);

  // Track spending
  const trackSpending = useCallback((amount: number) => {
    setSessionData(prev => ({
      ...prev,
      totalSpent: prev.totalSpent + amount
    }));
  }, []);

  return {
    sessionData,
    trackEventResolved,
    trackSpending
  };
};
