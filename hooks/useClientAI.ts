
import { useState, useEffect, useRef } from 'react';
import { GameStats } from '../types';
import { CLIENT_MESSAGES } from '../constants';

export const useClientAI = (stats: GameStats, isPlaying: boolean) => {
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [clientMood, setClientMood] = useState<'HAPPY' | 'ANGRY' | 'PANIC' | 'NEUTRAL'>('NEUTRAL');
  const lastSpokeTime = useRef<number>(Date.now());
  const processingRef = useRef(false);
  const statsRef = useRef(stats);
  const pendingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Helper to pick random array element
  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const generateMessage = async (mood: 'HAPPY' | 'ANGRY' | 'PANIC' | 'NEUTRAL') => {
      if (processingRef.current) return;
      
      // Purely static generation now
      processingRef.current = true;
      
      // Simulate "thinking" delay briefly
      pendingTimeoutRef.current = window.setTimeout(() => {
          const text = pickRandom(CLIENT_MESSAGES[mood]);
          setClientMood(mood);
          setClientMessage(text);
          lastSpokeTime.current = Date.now();
          processingRef.current = false;
      }, 500);
  };

  useEffect(() => {
    if (!isPlaying) {
        setClientMessage(null);
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
        processingRef.current = false;
        return;
    }

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const currentStats = statsRef.current;
      // Don't speak too often (min 12 seconds cooldown)
      if (now - lastSpokeTime.current < 12000) return;

      const randomTrigger = Math.random();

      // Priority 1: High Stress / Low Satisfaction (Panic/Angry)
      if (currentStats.stress > 80 || currentStats.clientSatisfaction < 20) {
         if (randomTrigger > 0.3) { 
             generateMessage(currentStats.stress > 90 ? 'PANIC' : 'ANGRY');
         }
         return;
      }

      // Priority 2: Public is bored
      if (currentStats.publicInterest < 30) {
          if (randomTrigger > 0.5) {
              generateMessage('ANGRY');
          }
          return;
      }

      // Priority 3: Going well (Happy)
      if (currentStats.publicInterest > 70 && currentStats.clientSatisfaction > 70 && currentStats.stress < 40) {
          if (randomTrigger > 0.6) { 
              generateMessage('HAPPY');
          }
          return;
      }

      // Priority 4: Random neutral comments
      if (randomTrigger > 0.85) {
          generateMessage('NEUTRAL');
      }

    }, 2000); // Check conditions every 2s

    return () => {
      clearInterval(checkInterval);
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
      processingRef.current = false;
    };
  }, [isPlaying]);

  const clearMessage = () => setClientMessage(null);

  return { clientMessage, clientMood, clearMessage };
};
