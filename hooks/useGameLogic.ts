
import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, GameStats, SystemState, SystemType, GameEvent, GameScenario, GameEventOption, CareerData, ShopItem, ActiveMission } from '../types';
import { GAME_DURATION, INITIAL_STATS, WIN_CONDITIONS, SYSTEM_EVENTS, SCENARIOS, CREW_MEMBERS, SHOP_ITEMS, CLIENT_MISSIONS } from '../constants';
import { useAIEventGenerator } from './useAIEventGenerator';

const DEFAULT_CAREER: CareerData = {
    totalCash: 0,
    completedScenarios: [],
    highScores: {},
    unlockedAchievements: [],
    unlockedUpgrades: [],
    careerPoints: 0
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<GameStats>({ ...INITIAL_STATS, timeRemaining: GAME_DURATION });
  const [currentScenario, setCurrentScenario] = useState<GameScenario>(SCENARIOS[0]);
  const [activeMinigame, setActiveMinigame] = useState<{eventId: string, type: 'CABLES' | 'FREQUENCY'} | null>(null);
  const [activeMission, setActiveMission] = useState<ActiveMission | null>(null);
  
  // Tutorial State
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);

  // Career State
  const [careerData, setCareerData] = useState<CareerData>(DEFAULT_CAREER);

  // Crew & Inventory State
  const [crewBonus, setCrewBonus] = useState<string | null>(null);
  const [inventory, setInventory] = useState<string[]>([]);
  
  const [pendingStartData, setPendingStartData] = useState<{scenarioId: string, crewId: string} | null>(null);

  const [systems, setSystems] = useState<Record<SystemType, SystemState>>({
    [SystemType.SOUND]: { 
        id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0 
    },
    [SystemType.LIGHTS]: { 
        id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0 
    },
    [SystemType.VIDEO]: { 
        id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0
    },
    [SystemType.STAGE]: { 
        id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: 1.0
    },
  });

  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const { generateAIEvents, isGeneratingEvents } = useAIEventGenerator();
  
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const aiCooldownRef = useRef<number>(0);
  const nextStaticEventTimeRef = useRef<number>(0);
  const nextMissionTimeRef = useRef<number>(0);
  const eventCooldownsRef = useRef<Map<string, number>>(new Map());

  // LOAD CAREER ON MOUNT
  useEffect(() => {
      const saved = localStorage.getItem('event_chaos_career');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              // Ensure all fields exist (for backwards compatibility)
              const loadedCareer: CareerData = {
                  totalCash: parsed.totalCash || 0,
                  completedScenarios: parsed.completedScenarios || [],
                  highScores: parsed.highScores || {},
                  unlockedAchievements: parsed.unlockedAchievements || [],
                  unlockedUpgrades: parsed.unlockedUpgrades || [],
                  careerPoints: parsed.careerPoints || 0
              };
              setCareerData(loadedCareer);
              console.log('[CAREER] Cargado desde localStorage:', loadedCareer);
          } catch (e) {
              console.error("Failed to load save", e);
              // Reset to default if corrupted
              setCareerData(DEFAULT_CAREER);
          }
      } else {
          // If localStorage is empty, ensure we start with default
          console.log('[CAREER] localStorage vacío, usando DEFAULT_CAREER');
          setCareerData(DEFAULT_CAREER);
      }
  }, []);

  const saveCareer = useCallback((data: CareerData) => {
      setCareerData(data);
      localStorage.setItem('event_chaos_career', JSON.stringify(data));
  }, []);

  const handleFaderChange = (id: SystemType, value: number) => {
      setSystems(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              faderValue: value
          }
      }));
  };

  const initializeSession = (scenarioId: string = 'NORMAL', crewId: string = 'VETERAN') => {
      const scenario = SCENARIOS.find(s => s.id === scenarioId) || SCENARIOS[0];
      const crew = CREW_MEMBERS.find(c => c.id === crewId);
      
      setCurrentScenario(scenario);
      setCrewBonus(crew ? crew.bonus : null);
      
      const baseBudget = scenario.initialBudget + (crew?.bonus === 'MORE_BUDGET' ? 2500 : 0);
      setStats({ ...INITIAL_STATS, budget: baseBudget, timeRemaining: GAME_DURATION });
      setInventory([]); 
      
      setPendingStartData({ scenarioId, crewId });
      
      if (scenario.isTutorial) {
          startGame(baseBudget);
      } else {
          setGameState(GameState.SHOP);
      }
  };

  const buyItem = (item: ShopItem) => {
      if (stats.budget >= item.cost && !inventory.includes(item.id)) {
          setStats(prev => ({ ...prev, budget: prev.budget - item.cost }));
          setInventory(prev => [...prev, item.id]);
      }
  };

  const startGame = (overrideBudget?: number) => {
    const scenario = currentScenario; 
    
    let driftModifier = 1.0;
    let stressResist = 1.0;
    let autoHeal = 0;
    let finalBudget = overrideBudget !== undefined ? overrideBudget : stats.budget; 

    inventory.forEach(itemId => {
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (item) {
            // STABILITY: Reduce drift en porcentaje (ej: 20% = reduce a 80% del drift original)
            if (item.effect === 'STABILITY') {
                driftModifier *= (1 - item.value / 100);
            }
            // STRESS_RESIST: Reduce el aumento de estrés en porcentaje (ej: 15% = reduce aumento a 85%)
            if (item.effect === 'STRESS_RESIST') {
                stressResist *= (1 - item.value / 100);
            }
            if (item.effect === 'AUTO_HEAL') autoHeal = item.value;
            if (item.effect === 'BUDGET_MULTIPLIER') finalBudget += item.value;
        }
    });

    setGameState(GameState.PLAYING);
    setActiveMinigame(null);
    setActiveMission(null);

    if (scenario.isTutorial) {
        setTutorialActive(true);
        setTutorialStepIndex(0);
    } else {
        setTutorialActive(false);
    }

    setStats({ ...INITIAL_STATS, budget: finalBudget, timeRemaining: GAME_DURATION });
    setActiveEvents([]);
    eventCooldownsRef.current.clear(); 
    
    const driftBase = (scenario.isTutorial ? 0.8 : (scenario.difficulty === 'NORMAL' ? 1.7 : 2.2)) * driftModifier;

    setSystems({
      [SystemType.SOUND]: { 
        id: SystemType.SOUND, name: 'Sound', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase 
      },
      [SystemType.LIGHTS]: { 
        id: SystemType.LIGHTS, name: 'Lights', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase + 0.2
      },
      [SystemType.VIDEO]: { 
        id: SystemType.VIDEO, name: 'Video', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.2
      },
      [SystemType.STAGE]: { 
        id: SystemType.STAGE, name: 'Stage', health: 100, status: 'OK',
        faderValue: 50, stability: 100, driftSpeed: driftBase - 0.4
      },
    });
    lastTickRef.current = Date.now();
    aiCooldownRef.current = Date.now() + (scenario.id === 'NORMAL' ? 10000 : 8000); 
    nextStaticEventTimeRef.current = Date.now() + (scenario.isTutorial ? 999999 : 6000); 
    nextMissionTimeRef.current = Date.now() + 15000; // First mission after 15s

    modifiersRef.current = { stressResist, autoHeal };
  };

  const modifiersRef = useRef({ stressResist: 1.0, autoHeal: 0 });
  const applyComboBonusRef = useRef<((bonus: { type: string; amount: number; message: string }) => void) | null>(null);

  const applyComboBonus = useCallback((bonus: { type: string; amount: number; message: string }) => {
    setStats(prev => {
      let newBudget = prev.budget + bonus.amount;
      let newStress = prev.stress;
      
      if (bonus.type === 'STREAK_30') {
        newStress = Math.max(0, newStress - 10);
      } else if (bonus.type === 'STREAK_60') {
        newStress = Math.max(0, newStress - 20);
        // Could trigger special event here
      }
      
      return {
        ...prev,
        budget: newBudget,
        stress: newStress
      };
    });
  }, []);

  const setComboBonusCallback = useCallback((callback: (bonus: { type: string; amount: number; message: string }) => void) => {
    applyComboBonusRef.current = callback;
  }, []);

  const advanceTutorial = () => {
     setTutorialStepIndex(prev => prev + 1);
  };

  const finishTutorial = () => {
      setTutorialActive(false);
      nextStaticEventTimeRef.current = Date.now() + 5000;
  };

  const togglePause = () => {
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };

  const quitGame = () => {
    setGameState(GameState.MENU);
  };

  const generateStaticEvent = useCallback(() => {
    setActiveEvents(currentEvents => {
        const now = Date.now();
        const activeTitles = new Set(currentEvents.map(e => e.title));
        const systemTypes = Object.values(SystemType).sort(() => Math.random() - 0.5);
        
        for (const sys of systemTypes) {
            const possibleEvents = SYSTEM_EVENTS[sys];
            
            const validEvents = possibleEvents.filter(def => {
                const onCooldown = (eventCooldownsRef.current.get(def.title) || 0) > now;
                const isActive = activeTitles.has(def.title);
                const isScenarioAllowed = !def.allowedScenarios || def.allowedScenarios.includes(currentScenario.id);
                return !onCooldown && !isActive && isScenarioAllowed;
            });

            if (validEvents.length > 0) {
                const eventDef = validEvents[Math.floor(Math.random() * validEvents.length)];
                let severityChance = 0.5;
                
                if (currentScenario.difficulty === 'NORMAL') severityChance = 0.15; 
                if (currentScenario.difficulty === 'HARD') severityChance = 0.5; 
                if (currentScenario.difficulty === 'EXTREME') severityChance = 0.7; 

                const severity = Math.random() < severityChance ? (Math.random() > 0.5 ? 3 : 2) : 1;
                let duration = severity === 3 ? 20 : severity === 2 ? 30 : 45; 
                
                if (currentScenario.isTutorial) duration = 60;

                const newEvent: GameEvent = {
                    id: Math.random().toString(36).substr(2, 9),
                    systemId: sys,
                    title: eventDef.title,
                    description: eventDef.description,
                    severity: currentScenario.isTutorial ? 1 : severity as 1 | 2 | 3,
                    expiresAt: Date.now() + (duration * 1000),
                    correctAction: "", 
                    options: eventDef.options,
                    // Fase 2: Prioridades y cascada
                    priority: eventDef.priority || (severity === 3 ? 9 : severity === 2 ? 6 : 3),
                    canEscalate: eventDef.canEscalate || false,
                    escalationTime: eventDef.escalationTime ? Date.now() + (eventDef.escalationTime * 1000) : undefined,
                    relatedEvents: eventDef.relatedTo ? [] : undefined
                };
                
                // Debug: Log cuando se crea un evento con prioridad
                if (newEvent.priority && newEvent.priority >= 5) {
                    console.log(`[FASE 2] Evento creado con prioridad ${newEvent.priority}:`, newEvent.title);
                }

                return [...currentEvents, newEvent];
            }
        }
        return currentEvents;
    });
  }, [currentScenario]);

  const resolveEvent = (eventId: string, option: GameEventOption) => {
    if (option.requiresMinigame) {
        setActiveMinigame({ eventId, type: option.requiresMinigame });
        return;
    }
    applyEventResolution(eventId, option);
  };

  const completeMinigame = (success: boolean) => {
      if (!activeMinigame) return;
      const event = activeEvents.find(e => e.id === activeMinigame.eventId);
      if (event) {
          const option = event.options.find(o => o.requiresMinigame === activeMinigame.type);
          if (option) {
              const resultOption = { ...option, isCorrect: success };
              applyEventResolution(event.id, resultOption);
          }
      }
      setActiveMinigame(null);
  };

  const applyEventResolution = (eventId: string, option: GameEventOption) => {
    const event = activeEvents.find(e => e.id === eventId);
    if (!event) return;

    const isCorrect = option.isCorrect;
    const stressImpact = option.stressImpact;
    const cost = option.cost || 0;

    setStats(prev => {
       const newBudget = prev.budget - cost;
       let newStress = prev.stress;
       let newPublic = prev.publicInterest;
       let newClient = prev.clientSatisfaction;

       if (isCorrect) {
           const reductionMultiplier = currentScenario.difficulty === 'NORMAL' || currentScenario.isTutorial ? 1.5 : 1.2; 
           const residualStress = currentScenario.difficulty === 'NORMAL' ? 0 : stressImpact;
           
           newStress = Math.max(0, newStress - (15 * reductionMultiplier) + residualStress); 
           newClient = Math.min(100, newClient + 10); 
           newPublic = Math.min(100, newPublic + 10);
           eventCooldownsRef.current.set(event.title, Date.now() + 80000);
           
           setSystems(s => ({
               ...s,
               [event.systemId]: { ...s[event.systemId], health: Math.min(100, s[event.systemId].health + 30) } 
           }));

       } else {
           newStress = Math.min(100, newStress + stressImpact);
           newPublic = Math.max(0, newPublic - 5);
           newClient = Math.max(0, newClient - 5);
           eventCooldownsRef.current.set(event.title, Date.now() + 40000); 
       }

       return {
           ...prev,
           stress: newStress,
           clientSatisfaction: newClient,
           publicInterest: newPublic,
           budget: newBudget
       };
    });

    setActiveEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    if (tutorialActive) {
        return; 
    }

    timerRef.current = window.setInterval(async () => {
      const now = Date.now();
      lastTickRef.current = now;

      // 0. SYSTEM MECHANICS UPDATE
      setSystems(prevSystems => {
          const nextSystems = { ...prevSystems };
          let totalPenalty = 0;

          (Object.keys(nextSystems) as SystemType[]).forEach(key => {
              const sys = nextSystems[key];
              const hasEvents = activeEvents.some(e => e.systemId === key);
              const driftDirection = Math.random() > 0.5 ? 1 : -1;
              const eventMultiplier = hasEvents ? 2.5 : 1; 
              const crewMultiplier = crewBonus === 'LESS_DRIFT' ? 0.6 : 1.0;
              const noise = (Math.random() * sys.driftSpeed * eventMultiplier * crewMultiplier) * driftDirection;
              
              let newValue = sys.faderValue + noise;
              newValue = Math.max(0, Math.min(100, newValue));
              
              let healthDelta = 0;
              if (newValue >= 40 && newValue <= 60) {
                  healthDelta = 0.3; 
              } else if (newValue < 20 || newValue > 80) {
                  healthDelta = -0.3; 
                  totalPenalty += 0.6; 
              } else {
                  healthDelta = -0.05;
              }
              
              if (modifiersRef.current.autoHeal > 0 && sys.health < 100 && !hasEvents) {
                  healthDelta += modifiersRef.current.autoHeal;
              }

              nextSystems[key] = {
                  ...sys,
                  faderValue: newValue,
                  health: Math.max(0, Math.min(100, sys.health + healthDelta)),
                  status: sys.health < 30 ? 'CRITICAL' : sys.health < 70 ? 'WARNING' : 'OK'
              };
          });
          
          if (totalPenalty > 0) {
             const stressMult = crewBonus === 'SLOW_STRESS' ? 0.6 : 1.0;
             const itemMult = modifiersRef.current.stressResist;
             const tutorialProtection = currentScenario.isTutorial ? 0.1 : 1.0;
             setStats(s => ({ ...s, stress: Math.min(100, s.stress + (totalPenalty * stressMult * itemMult * tutorialProtection)) }));
          }

          return nextSystems;
      });

      // 1. MISSION LOGIC (CLIENT DEMANDS)
      if (activeMission) {
          // Check criteria
          const criteriaMet = activeMission.criteria.every(c => {
              const val = systems[c.systemId].faderValue;
              const min = c.min ?? 0;
              const max = c.max ?? 100;
              return val >= min && val <= max;
          });

          if (criteriaMet) {
              const newProgress = activeMission.progress + 0.05; // 50ms ticks
              if (newProgress >= activeMission.holdDuration) {
                  // MISSION COMPLETE
                  setStats(s => ({
                      ...s,
                      budget: s.budget + activeMission.rewardCash,
                      clientSatisfaction: Math.min(100, s.clientSatisfaction + 15),
                      publicInterest: Math.min(100, s.publicInterest + 10),
                      stress: Math.max(0, s.stress - 10)
                  }));
                  setActiveMission(null);
                  nextMissionTimeRef.current = now + 10000;
              } else {
                  setActiveMission(m => m ? ({ ...m, progress: newProgress }) : null);
              }
          }

          // Timeout check
          if (now > activeMission.expiresAt) {
              setStats(s => ({
                  ...s,
                  clientSatisfaction: Math.max(0, s.clientSatisfaction - 15),
                  stress: Math.min(100, s.stress + 10)
              }));
              setActiveMission(null);
              nextMissionTimeRef.current = now + 8000;
          }
      } else if (now > nextMissionTimeRef.current && !currentScenario.isTutorial) {
          // Spawn new mission
          const pool = CLIENT_MISSIONS;
          const missionDef = pool[Math.floor(Math.random() * pool.length)];
          const newMission: ActiveMission = {
              ...missionDef,
              startTime: now,
              expiresAt: now + (missionDef.timeout * 1000),
              progress: 0,
              isCompleted: false
          };
          setActiveMission(newMission);
      }


      // 2. AI Event Injection
      if (now > aiCooldownRef.current && !isGeneratingEvents && !currentScenario.isTutorial) {
          const aiChance = currentScenario.difficulty === 'NORMAL' ? 0.3 : 0.5; 
          if (Math.random() < aiChance) {
             aiCooldownRef.current = now + (currentScenario.difficulty === 'NORMAL' ? 35000 : 20000); 
             generateAIEvents(currentScenario.contextPrompt).then(newEvents => {
                 if (newEvents.length > 0) {
                     setActiveEvents(prev => {
                         const activeTitles = new Set(prev.map(e => e.title));
                         const uniqueNew = newEvents.filter(e => {
                             const onCooldown = (eventCooldownsRef.current.get(e.title) || 0) > now;
                             return !activeTitles.has(e.title) && !onCooldown;
                         });
                         return [...prev, ...uniqueNew];
                     });
                 }
             });
          } else {
             aiCooldownRef.current = now + 8000;
          }
      }

      setStats(prev => {
        // GAME OVER CONDITIONS
        if (!currentScenario.isTutorial) {
            if (prev.publicInterest <= 0 || prev.clientSatisfaction <= 0 || prev.stress >= 100 || prev.budget < WIN_CONDITIONS.minBudget) {
                setGameState(GameState.GAME_OVER);
                return prev;
            }
        } else {
             if (prev.stress > 80) prev.stress = 50;
             if (prev.budget < 0) prev.budget = 1000;
        }

        if (prev.timeRemaining <= 0) {
          if (prev.publicInterest >= WIN_CONDITIONS.publicInterest && 
              prev.clientSatisfaction >= WIN_CONDITIONS.clientSatisfaction && 
              prev.stress < WIN_CONDITIONS.stressLimit) {
            
            // Use functional update to get latest careerData
            setCareerData(currentCareer => {
              console.log(`[CAREER DEBUG] currentCareer recibido:`, currentCareer);
              
              // Ensure all required fields exist
              const newCareer: CareerData = {
                totalCash: (currentCareer?.totalCash || 0) + (prev.budget > 0 ? prev.budget : 0),
                completedScenarios: [...(currentCareer?.completedScenarios || [])], // Copy array
                highScores: currentCareer?.highScores || {},
                unlockedAchievements: currentCareer?.unlockedAchievements || [],
                unlockedUpgrades: currentCareer?.unlockedUpgrades || [],
                careerPoints: currentCareer?.careerPoints || 0
              };
              
              const isFirstTime = !newCareer.completedScenarios.includes(currentScenario.id);
              
              console.log(`[CAREER DEBUG] Escenario: ${currentScenario.id}, Dificultad: ${currentScenario.difficulty}`);
              console.log(`[CAREER DEBUG] Escenarios completados ANTES:`, [...newCareer.completedScenarios]);
              console.log(`[CAREER DEBUG] Es primera vez:`, isFirstTime);
              console.log(`[CAREER DEBUG] Puntos actuales ANTES:`, newCareer.careerPoints);
              
              // Marcar como completado si es primera vez
              if (isFirstTime) {
                newCareer.completedScenarios.push(currentScenario.id);
              }
              
              // Calcular puntos: bonus completo la primera vez, puntos reducidos en repeticiones
              let pointsEarned: number;
              if (isFirstTime) {
                // Bonus completo la primera vez
                pointsEarned = currentScenario.difficulty === 'TUTORIAL' ? 10 : 
                              currentScenario.difficulty === 'NORMAL' ? 20 :
                              currentScenario.difficulty === 'HARD' ? 30 : 50;
                console.log(`[CAREER] ✅ Escenario ${currentScenario.id} completado por primera vez! Bonus completo: +${pointsEarned} pts`);
              } else {
                // Puntos reducidos en repeticiones (50% del bonus inicial)
                pointsEarned = currentScenario.difficulty === 'TUTORIAL' ? 5 : 
                              currentScenario.difficulty === 'NORMAL' ? 10 :
                              currentScenario.difficulty === 'HARD' ? 15 : 25;
                console.log(`[CAREER] 🔄 Escenario ${currentScenario.id} completado nuevamente! Puntos de repetición: +${pointsEarned} pts`);
              }
              
              const oldPoints = newCareer.careerPoints || 0;
              newCareer.careerPoints = oldPoints + pointsEarned;
              console.log(`[CAREER] 💰 Puntos: ${oldPoints} + ${pointsEarned} = ${newCareer.careerPoints}`);
              console.log(`[CAREER] ✅ Escenarios completados:`, [...newCareer.completedScenarios]);
              
              // Save to localStorage
              const savedData = JSON.stringify(newCareer);
              localStorage.setItem('event_chaos_career', savedData);
              console.log(`[CAREER] 💾 Guardado en localStorage:`, savedData);
              
              // Verify what was saved
              const verify = localStorage.getItem('event_chaos_career');
              if (verify) {
                const parsed = JSON.parse(verify);
                console.log(`[CAREER] ✅ Verificación - Puntos guardados:`, parsed.careerPoints);
                console.log(`[CAREER] ✅ Verificación - Escenarios:`, parsed.completedScenarios);
              }
              
              return newCareer;
            });
            
            setGameState(GameState.VICTORY);
          } else {
            setGameState(GameState.GAME_OVER);
          }
          return prev;
        }

        let newPublic = prev.publicInterest;
        let newClient = prev.clientSatisfaction;
        let newStress = prev.stress;

        (Object.values(systems) as SystemState[]).forEach(sys => {
            if (sys.faderValue < 15 || sys.faderValue > 85) {
                newPublic -= 0.2; 
                newClient -= 0.15; 
                newStress += 0.05; 
            } else if (sys.faderValue < 30 || sys.faderValue > 70) {
                newPublic -= 0.02; 
                newClient -= 0.01;
            }
        });

        if (activeEvents.length === 0) {
            newStress = Math.max(0, newStress - 0.5);
        } else {
            activeEvents.forEach(e => {
                const factor = currentScenario.difficulty === 'NORMAL' ? 0.005 : 0.01; 
                const stressMult = crewBonus === 'SLOW_STRESS' ? 0.7 : 1.0;
                newStress += factor * e.severity * stressMult; 
                newPublic -= 0.005 * e.severity; 
            });
        }
        
        return {
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 0.05),
          publicInterest: Math.min(100, Math.max(0, newPublic)),
          clientSatisfaction: Math.min(100, Math.max(0, newClient)),
          stress: Math.min(100, Math.max(0, newStress)),
        };
      });

      // STATIC EVENT GENERATION CONTROL
      if (activeEvents.length < 3 && now > nextStaticEventTimeRef.current) {
          const baseDelay = currentScenario.difficulty === 'NORMAL' ? 15000 : 10000; 
          const randomDelay = Math.random() * 5000;
          nextStaticEventTimeRef.current = now + baseDelay + randomDelay;
          
          generateStaticEvent();
      }

      setActiveEvents(prevEvents => {
        const now = Date.now();
        const expired = prevEvents.filter(e => e.expiresAt < now);
        const remaining = prevEvents.filter(e => e.expiresAt >= now);
        
        // Fase 2: Check for event escalation
        const eventsToEscalate = remaining.filter(e => 
          e.canEscalate && 
          e.escalationTime && 
          now >= e.escalationTime &&
          !e.escalatedFrom // Don't escalate already escalated events
        );

        if (expired.length > 0) {
          setStats(current => ({
            ...current,
            publicInterest: Math.max(0, current.publicInterest - 10),
            clientSatisfaction: Math.max(0, current.clientSatisfaction - 10),
            stress: Math.min(100, current.stress + 10)
          }));
          
          setSystems(currSystems => {
              const newSystems = { ...currSystems };
              expired.forEach(ex => {
                  newSystems[ex.systemId] = {
                      ...newSystems[ex.systemId],
                      health: Math.max(0, newSystems[ex.systemId].health - 20),
                      status: 'WARNING'
                  };
              });
              return newSystems;
          });
          expired.forEach(ex => eventCooldownsRef.current.set(ex.title, Date.now() + 60000));
        }
        
        // Fase 2: Handle event escalation
        if (eventsToEscalate.length > 0) {
          eventsToEscalate.forEach(event => {
            const eventDef = SYSTEM_EVENTS[event.systemId].find(e => e.title === event.title);
            if (eventDef && eventDef.escalationEvent) {
              // Find the escalation event definition
              const escalationDef = SYSTEM_EVENTS[event.systemId].find(e => e.title === eventDef.escalationEvent);
              if (escalationDef) {
                const escalatedEvent: GameEvent = {
                  id: Math.random().toString(36).substr(2, 9),
                  systemId: event.systemId,
                  title: escalationDef.title,
                  description: `${escalationDef.description} (Escalado desde: ${event.title})`,
                  severity: Math.min(3, (event.severity + 1) as 1 | 2 | 3),
                  expiresAt: Date.now() + (event.expiresAt - now), // Keep remaining time
                  correctAction: "",
                  options: escalationDef.options,
                  priority: (escalationDef.priority || 9),
                  canEscalate: escalationDef.canEscalate || false,
                  escalatedFrom: event.id
                };
                remaining.push(escalatedEvent);
              }
            }
          });
          // Remove original events that escalated
          eventsToEscalate.forEach(e => {
            const index = remaining.findIndex(ev => ev.id === e.id);
            if (index >= 0) remaining.splice(index, 1);
          });
        }
        
        return remaining;
      });

    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, tutorialActive, activeEvents.length, generateStaticEvent, generateAIEvents, isGeneratingEvents, currentScenario, systems, crewBonus, saveCareer, careerData, activeMission]); 

  // Expose combo bonus callback - set it directly
  applyComboBonusRef.current = applyComboBonus;

  return {
    gameState,
    stats,
    systems,
    activeEvents,
    currentScenario,
    activeMinigame,
    careerData,
    inventory,
    activeMission, // Exported for UI
    tutorialActive,
    tutorialStepIndex,
    advanceTutorial,
    finishTutorial,
    initializeSession,
    buyItem,
    startGame,
    togglePause,
    quitGame,
    resolveEvent,
    completeMinigame,
    setGameState,
    handleFaderChange,
    applyComboBonus,
    setComboBonusCallback,
    saveCareer // Fase 3: Expose for achievements/upgrades
  };
};
