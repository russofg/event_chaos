import { SystemType, EventDefinition, GameScenario, CrewMember, ShopItem, MissionDefinition, TutorialStep, PermanentUpgrade } from './types';

// Game Configuration
export const GAME_DURATION = 120; // seconds
export const INITIAL_STATS = {
  publicInterest: 50,
  clientSatisfaction: 50,
  stress: 0,
  budget: 5000,
  timeRemaining: GAME_DURATION
};

export const WIN_CONDITIONS = {
  publicInterest: 60,
  clientSatisfaction: 60,
  stressLimit: 80,
  minBudget: 0
};

export const EVENT_FREQUENCY_BASE = 15000; // ms

// Client Messages
export const CLIENT_MESSAGES = {
  HAPPY: [
    "¡El show está increíble!",
    "El público está encantado",
    "Todo está perfecto, sigue así",
    "Excelente trabajo técnico"
  ],
  ANGRY: [
    "¿Qué está pasando?",
    "El público se está aburriendo",
    "Necesito que esto mejore YA",
    "Esto no es lo que esperaba"
  ],
  PANIC: [
    "¡ESTO ES UN DESASTRE!",
    "¡ARREGLALO AHORA!",
    "¡EL SHOW SE ESTÁ YENDO A PEDAZOS!",
    "¡NO PUEDO CREER ESTO!"
  ],
  NEUTRAL: [
    "Todo parece estar bien",
    "Mantén el ritmo",
    "Sigue monitoreando",
    "Estamos en el camino correcto"
  ]
};

// Shop Items
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'stabilizer',
    name: 'Estabilizador de Fader',
    description: 'Reduce la deriva de los faders en 20%',
    cost: 1500,
    icon: 'Zap',
    effect: 'STABILITY',
    value: 20
  },
  {
    id: 'auto_repair',
    name: 'Auto-Reparación Lenta',
    description: 'Regenera 1% de salud cada 5 segundos',
    cost: 2000,
    icon: 'Shield',
    effect: 'AUTO_HEAL',
    value: 1
  },
  {
    id: 'stress_resist',
    name: 'Resistencia al Estrés',
    description: 'Reduce el aumento de estrés en 15%',
    cost: 1800,
    icon: 'Coffee',
    effect: 'STRESS_RESIST',
    value: 15
  },
  {
    id: 'budget_boost',
    name: 'Bono de Presupuesto',
    description: 'Añade $500 al presupuesto inicial',
    cost: 0,
    icon: 'Plug',
    effect: 'BUDGET_MULTIPLIER',
    value: 500
  }
];

// Crew Members
export const CREW_MEMBERS: CrewMember[] = [
  {
    id: 'VETERAN',
    name: 'Carlos "El Veterano"',
    role: 'Técnico Principal',
    description: 'Experiencia: 20 años. Reduce deriva de faders en 15%',
    bonus: 'LESS_DRIFT',
    avatarColor: 'bg-blue-500'
  },
  {
    id: 'BUDGET',
    name: 'María "La Económica"',
    role: 'Gerente de Presupuesto',
    description: 'Negociación: +$2500 al presupuesto inicial',
    bonus: 'MORE_BUDGET',
    avatarColor: 'bg-green-500'
  },
  {
    id: 'AUTO',
    name: 'Roberto "El Mecánico"',
    role: 'Especialista en Reparaciones',
    description: 'Auto-reparación: +0.5% salud cada 5s',
    bonus: 'AUTO_REPAIR_SLOW',
    avatarColor: 'bg-purple-500'
  },
  {
    id: 'CALM',
    name: 'Ana "La Zen"',
    role: 'Coordinadora de Estrés',
    description: 'Calma: El estrés sube 20% más lento',
    bonus: 'SLOW_STRESS',
    avatarColor: 'bg-pink-500'
  }
];

// Scenarios
export const SCENARIOS: GameScenario[] = [
  {
    id: 'TUTORIAL',
    title: 'Tutorial',
    description: 'Aprende los conceptos básicos',
    difficulty: 'TUTORIAL',
    contextPrompt: 'Tutorial scenario for learning the game',
    initialBudget: 10000,
    isTutorial: true
  },
  {
    id: 'NORMAL',
    title: 'Show Corporativo',
    description: 'Un evento corporativo estándar',
    difficulty: 'NORMAL',
    contextPrompt: 'Corporate event with standard requirements',
    initialBudget: 5000
  },
  {
    id: 'ROCKSTAR',
    title: 'Banda Diva',
    description: 'Una banda exigente con caprichos',
    difficulty: 'HARD',
    contextPrompt: 'Rockstar band with high demands and diva behavior',
    initialBudget: 6000
  },
  {
    id: 'FESTIVAL',
    title: 'Festival al Aire Libre',
    description: 'Evento masivo con múltiples desafíos',
    difficulty: 'HARD',
    contextPrompt: 'Outdoor festival with weather and technical challenges',
    initialBudget: 7000
  },
  {
    id: 'EXTREME',
    title: 'Show Extremo',
    description: 'El desafío definitivo',
    difficulty: 'EXTREME',
    contextPrompt: 'Extreme challenge with maximum difficulty',
    initialBudget: 4000
  }
];

// Tutorial Steps
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: 'Bienvenido a Event Chaos',
    text: 'Gestiona los sistemas técnicos de un show en vivo. Usa los faders para controlar SOUND, LIGHTS, VIDEO y STAGE.',
    highlight: 'faders'
  },
  {
    id: 2,
    title: 'Zona Segura',
    text: 'Mantén los faders entre 40% y 60% para máxima estabilidad. Fuera de esta zona, los sistemas pueden fallar.',
    highlight: 'safe-zone'
  },
  {
    id: 3,
    title: 'Eventos',
    text: 'Cuando aparezcan eventos, resuélvelos rápidamente eligiendo la opción correcta. Algunos requieren minijuegos.',
    highlight: 'events'
  },
  {
    id: 4,
    title: 'Estadísticas',
    text: 'Monitorea Public Interest, Client Satisfaction y Stress. Si alguna cae demasiado, pierdes.',
    highlight: 'stats'
  },
  {
    id: 5,
    title: '¡Comienza!',
    text: 'Mantén todo funcionando durante 2 minutos. ¡Buena suerte!',
    highlight: 'start'
  }
];

// Client Missions
export const CLIENT_MISSIONS: MissionDefinition[] = [
  {
    id: 'high_energy',
    title: '¡Máxima Energía!',
    description: 'Mantén SOUND y LIGHTS altos por 15 segundos',
    criteria: [
      { systemId: SystemType.SOUND, min: 60 },
      { systemId: SystemType.LIGHTS, min: 60 }
    ],
    holdDuration: 15,
    timeout: 45,
    rewardCash: 500
  },
  {
    id: 'low_stress',
    title: 'Ambiente Relajado',
    description: 'Mantén todos los sistemas entre 30-50% por 20 segundos',
    criteria: [
      { systemId: SystemType.SOUND, min: 30, max: 50 },
      { systemId: SystemType.LIGHTS, min: 30, max: 50 },
      { systemId: SystemType.VIDEO, min: 30, max: 50 },
      { systemId: SystemType.STAGE, min: 30, max: 50 }
    ],
    holdDuration: 20,
    timeout: 60,
    rewardCash: 800
  }
];

// System Events - 47 eventos totales distribuidos por sistemas y escenarios
export const SYSTEM_EVENTS: Record<SystemType, EventDefinition[]> = {
  [SystemType.SOUND]: [
    // Eventos básicos de SOUND (todos los escenarios)
    {
      title: 'Feedback',
      description: 'Hay un feedback agudo en el sistema de sonido',
      options: [
        { label: 'Bajar el volumen', isCorrect: true, stressImpact: -5 },
        { label: 'Ignorar', isCorrect: false, stressImpact: 15 },
        { label: 'Subir más el volumen', isCorrect: false, stressImpact: 25 }
      ],
      priority: 7,
      canEscalate: true,
      escalationEvent: 'Ruido de Masa (Hum)',
      escalationTime: 25
    },
    {
      title: 'Ruido de Masa (Hum)',
      description: 'Hay un zumbido constante en el sistema',
      options: [
        { label: 'Verificar conexiones a tierra', isCorrect: true, stressImpact: -5, cost: 200 },
        { label: 'Aumentar el volumen para taparlo', isCorrect: false, stressImpact: 20 },
        { label: 'Desconectar y reconectar', isCorrect: false, stressImpact: 10, requiresMinigame: 'CABLES' }
      ],
      priority: 6,
      canEscalate: true,
      escalationEvent: 'Caída de Sistema Completo',
      escalationTime: 30
    },
    {
      title: 'Cable Cortado',
      description: 'Un cable importante se ha cortado',
      options: [
        { label: 'Reparar cable (minijuego)', isCorrect: true, stressImpact: -10, requiresMinigame: 'CABLES' },
        { label: 'Usar cable de respaldo', isCorrect: true, stressImpact: -5, cost: 300 },
        { label: 'Continuar sin ese canal', isCorrect: false, stressImpact: 15 }
      ],
      priority: 8,
      canEscalate: true,
      escalationEvent: 'Caída de Sistema Completo',
      escalationTime: 35
    },
    {
      title: 'Caída de Sistema Completo',
      description: 'El sistema de sonido ha fallado completamente',
      options: [
        { label: 'Reiniciar sistema completo', isCorrect: true, stressImpact: -15, cost: 500 },
        { label: 'Usar sistema de respaldo', isCorrect: true, stressImpact: -10, cost: 800 },
        { label: 'Continuar sin sonido', isCorrect: false, stressImpact: 40 }
      ],
      priority: 10
    },
    {
      title: 'Micrófono Sin Sonido',
      description: 'El micrófono principal no está captando audio',
      options: [
        { label: 'Verificar batería del micrófono', isCorrect: true, stressImpact: -5, cost: 50 },
        { label: 'Cambiar a micrófono de respaldo', isCorrect: true, stressImpact: -3, cost: 100 },
        { label: 'Aumentar ganancia', isCorrect: false, stressImpact: 10 }
      ],
      priority: 6,
      allowedScenarios: ['NORMAL', 'ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Amplificador Sobrecalentado',
      description: 'El amplificador está alcanzando temperaturas peligrosas',
      options: [
        { label: 'Reducir volumen y ventilar', isCorrect: true, stressImpact: -8 },
        { label: 'Usar amplificador de respaldo', isCorrect: true, stressImpact: -5, cost: 400 },
        { label: 'Continuar al máximo', isCorrect: false, stressImpact: 25 }
      ],
      priority: 8,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Interferencia de Radio',
      description: 'Hay interferencia de radio frecuencia en el sistema',
      options: [
        { label: 'Ajustar frecuencias (minijuego)', isCorrect: true, stressImpact: -10, requiresMinigame: 'FREQUENCY' },
        { label: 'Usar filtros de RF', isCorrect: true, stressImpact: -5, cost: 250 },
        { label: 'Ignorar', isCorrect: false, stressImpact: 12 }
      ],
      priority: 5,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Monitor de Escenario Fallido',
      description: 'Los monitores de escenario no funcionan',
      options: [
        { label: 'Reparar monitores', isCorrect: true, stressImpact: -5, cost: 200 },
        { label: 'Usar sistema de monitores alternativo', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Continuar sin monitores', isCorrect: false, stressImpact: 15 }
      ],
      priority: 4,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Eco en el Sistema',
      description: 'Hay un eco molesto en las voces',
      options: [
        { label: 'Ajustar delay y reverb', isCorrect: true, stressImpact: -5 },
        { label: 'Reducir ganancia de retorno', isCorrect: true, stressImpact: -3 },
        { label: 'Ignorar', isCorrect: false, stressImpact: 10 }
      ],
      priority: 4,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Distorsión en Línea Principal',
      description: 'La señal principal está distorsionada',
      options: [
        { label: 'Verificar niveles de entrada', isCorrect: true, stressImpact: -8 },
        { label: 'Usar línea de respaldo', isCorrect: true, stressImpact: -5, cost: 300 },
        { label: 'Aumentar headroom', isCorrect: false, stressImpact: 15 }
      ],
      priority: 7,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Batería de Inalámbrico Agotada',
      description: 'El micrófono inalámbrico se quedó sin batería',
      options: [
        { label: 'Cambiar batería', isCorrect: true, stressImpact: -3, cost: 20 },
        { label: 'Usar micrófono con cable', isCorrect: true, stressImpact: -5, cost: 50 },
        { label: 'Continuar sin ese micrófono', isCorrect: false, stressImpact: 12 }
      ],
      priority: 3,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Problema con Subwoofers',
      description: 'Los subwoofers no están funcionando correctamente',
      options: [
        { label: 'Verificar conexiones de subwoofers', isCorrect: true, stressImpact: -5, cost: 100 },
        { label: 'Ajustar crossover', isCorrect: true, stressImpact: -3 },
        { label: 'Continuar sin graves', isCorrect: false, stressImpact: 15 }
      ],
      priority: 5,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    }
  ],
  [SystemType.LIGHTS]: [
    // Eventos básicos de LIGHTS
    {
      title: 'Foco Quemado',
      description: 'Uno de los focos principales se ha quemado',
      options: [
        { label: 'Reemplazar foco', isCorrect: true, stressImpact: -5, cost: 150 },
        { label: 'Usar focos de respaldo', isCorrect: true, stressImpact: -3, cost: 100 },
        { label: 'Continuar con menos luz', isCorrect: false, stressImpact: 10 }
      ],
      priority: 5
    },
    {
      title: 'Sobrecarga de Circuito',
      description: 'El circuito de luces está sobrecargado',
      options: [
        { label: 'Redistribuir carga', isCorrect: true, stressImpact: -8, cost: 200 },
        { label: 'Bajar intensidad de luces', isCorrect: true, stressImpact: -5 },
        { label: 'Ignorar', isCorrect: false, stressImpact: 20 }
      ],
      priority: 7,
      canEscalate: true,
      escalationEvent: 'Corte de Energía en Luces',
      escalationTime: 30
    },
    {
      title: 'Corte de Energía en Luces',
      description: 'Todo el sistema de luces se ha apagado',
      options: [
        { label: 'Reiniciar dimmer rack', isCorrect: true, stressImpact: -10, cost: 300 },
        { label: 'Usar sistema de emergencia', isCorrect: true, stressImpact: -8, cost: 500 },
        { label: 'Continuar a oscuras', isCorrect: false, stressImpact: 35 }
      ],
      priority: 9
    },
    {
      title: 'DMX Desconectado',
      description: 'La señal DMX se ha perdido',
      options: [
        { label: 'Reconectar cable DMX', isCorrect: true, stressImpact: -5, requiresMinigame: 'CABLES' },
        { label: 'Usar backup DMX', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Continuar sin control', isCorrect: false, stressImpact: 15 }
      ],
      priority: 6,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Movimiento de Luces Bloqueado',
      description: 'Las luces móviles no responden',
      options: [
        { label: 'Reiniciar movimientos', isCorrect: true, stressImpact: -5 },
        { label: 'Usar modo manual', isCorrect: true, stressImpact: -3 },
        { label: 'Continuar estático', isCorrect: false, stressImpact: 10 }
      ],
      priority: 4,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Efecto Estroboscópico Roto',
      description: 'El estroboscopio no funciona correctamente',
      options: [
        { label: 'Reparar estroboscopio', isCorrect: true, stressImpact: -3, cost: 100 },
        { label: 'Usar efecto alternativo', isCorrect: true, stressImpact: -2 },
        { label: 'Continuar sin efecto', isCorrect: false, stressImpact: 8 }
      ],
      priority: 3,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Luces de Colores Desincronizadas',
      description: 'Los colores no coinciden con la programación',
      options: [
        { label: 'Recalibrar colores', isCorrect: true, stressImpact: -5 },
        { label: 'Usar preset de respaldo', isCorrect: true, stressImpact: -3 },
        { label: 'Continuar desincronizado', isCorrect: false, stressImpact: 12 }
      ],
      priority: 4,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Sobrecarga Térmica en LED',
      description: 'Las luces LED están sobrecalentándose',
      options: [
        { label: 'Reducir intensidad y ventilar', isCorrect: true, stressImpact: -8 },
        { label: 'Activar modo de seguridad', isCorrect: true, stressImpact: -5 },
        { label: 'Continuar al máximo', isCorrect: false, stressImpact: 20 }
      ],
      priority: 7,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Follow Spot Desalineado',
      description: 'El follow spot no está apuntando correctamente',
      options: [
        { label: 'Realinear follow spot', isCorrect: true, stressImpact: -3 },
        { label: 'Usar follow spot de respaldo', isCorrect: true, stressImpact: -2, cost: 80 },
        { label: 'Continuar desalineado', isCorrect: false, stressImpact: 10 }
      ],
      priority: 3,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Consola de Luces Congelada',
      description: 'La consola de control no responde',
      options: [
        { label: 'Reiniciar consola', isCorrect: true, stressImpact: -8, cost: 200 },
        { label: 'Usar consola de respaldo', isCorrect: true, stressImpact: -5, cost: 300 },
        { label: 'Continuar sin control', isCorrect: false, stressImpact: 20 }
      ],
      priority: 8,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Cable de Alimentación Suelto',
      description: 'Un cable de alimentación se ha desconectado',
      options: [
        { label: 'Reconectar cable', isCorrect: true, stressImpact: -5, requiresMinigame: 'CABLES' },
        { label: 'Usar fuente alternativa', isCorrect: true, stressImpact: -3, cost: 100 },
        { label: 'Continuar sin esa luz', isCorrect: false, stressImpact: 12 }
      ],
      priority: 5,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Efecto de Neblina No Funciona',
      description: 'La máquina de neblina no está produciendo efecto',
      options: [
        { label: 'Verificar fluido y limpiar', isCorrect: true, stressImpact: -3, cost: 50 },
        { label: 'Usar máquina de respaldo', isCorrect: true, stressImpact: -2, cost: 80 },
        { label: 'Continuar sin neblina', isCorrect: false, stressImpact: 8 }
      ],
      priority: 2,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    }
  ],
  [SystemType.VIDEO]: [
    // Eventos básicos de VIDEO
    {
      title: 'Pantalla Congelada',
      description: 'La pantalla principal se ha congelado',
      options: [
        { label: 'Reiniciar proyector', isCorrect: true, stressImpact: -8, cost: 100 },
        { label: 'Cambiar a fuente de respaldo', isCorrect: true, stressImpact: -5, cost: 150 },
        { label: 'Continuar sin video', isCorrect: false, stressImpact: 15 }
      ],
      priority: 6,
      canEscalate: true,
      escalationEvent: 'Fallo Total de Video',
      escalationTime: 30
    },
    {
      title: 'Fallo Total de Video',
      description: 'Todo el sistema de video ha fallado',
      options: [
        { label: 'Reiniciar todo el sistema', isCorrect: true, stressImpact: -12, cost: 400 },
        { label: 'Usar sistema de respaldo completo', isCorrect: true, stressImpact: -10, cost: 600 },
        { label: 'Continuar sin video', isCorrect: false, stressImpact: 30 }
      ],
      priority: 9
    },
    {
      title: 'Resolución Incorrecta',
      description: 'La resolución del video no coincide',
      options: [
        { label: 'Ajustar resolución (minijuego)', isCorrect: true, stressImpact: -10, requiresMinigame: 'FREQUENCY' },
        { label: 'Usar fuente alternativa', isCorrect: true, stressImpact: -5, cost: 200 },
        { label: 'Ignorar', isCorrect: false, stressImpact: 12 }
      ],
      priority: 5
    },
    {
      title: 'Proyector Sobrecalentado',
      description: 'El proyector está alcanzando temperaturas peligrosas',
      options: [
        { label: 'Reducir brillo y ventilar', isCorrect: true, stressImpact: -8 },
        { label: 'Usar proyector de respaldo', isCorrect: true, stressImpact: -5, cost: 500 },
        { label: 'Continuar al máximo', isCorrect: false, stressImpact: 20 }
      ],
      priority: 7,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Señal de Video Perdida',
      description: 'La señal de entrada se ha perdido',
      options: [
        { label: 'Verificar conexiones', isCorrect: true, stressImpact: -5, requiresMinigame: 'CABLES' },
        { label: 'Usar fuente de respaldo', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Continuar sin señal', isCorrect: false, stressImpact: 15 }
      ],
      priority: 6,
      allowedScenarios: ['NORMAL', 'ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Pixelación en Pantalla',
      description: 'La imagen está pixelada y con artefactos',
      options: [
        { label: 'Verificar calidad de señal', isCorrect: true, stressImpact: -5 },
        { label: 'Cambiar a conexión de mayor calidad', isCorrect: true, stressImpact: -3, cost: 200 },
        { label: 'Continuar pixelado', isCorrect: false, stressImpact: 10 }
      ],
      priority: 4,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Lámpara de Proyector Quemada',
      description: 'La lámpara del proyector se ha quemado',
      options: [
        { label: 'Reemplazar lámpara', isCorrect: true, stressImpact: -8, cost: 800 },
        { label: 'Usar proyector de respaldo', isCorrect: true, stressImpact: -5, cost: 500 },
        { label: 'Continuar sin proyector', isCorrect: false, stressImpact: 25 }
      ],
      priority: 8,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Sincronización Perdida',
      description: 'Las pantallas no están sincronizadas',
      options: [
        { label: 'Resincronizar señales', isCorrect: true, stressImpact: -5 },
        { label: 'Usar genlock', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Continuar desincronizado', isCorrect: false, stressImpact: 12 }
      ],
      priority: 5,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Cable HDMI Roto',
      description: 'El cable HDMI principal está dañado',
      options: [
        { label: 'Reparar cable (minijuego)', isCorrect: true, stressImpact: -5, requiresMinigame: 'CABLES' },
        { label: 'Usar cable de respaldo', isCorrect: true, stressImpact: -3, cost: 100 },
        { label: 'Continuar sin esa fuente', isCorrect: false, stressImpact: 12 }
      ],
      priority: 4,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Procesador de Video Saturado',
      description: 'El procesador está al límite de capacidad',
      options: [
        { label: 'Reducir complejidad de efectos', isCorrect: true, stressImpact: -8 },
        { label: 'Usar procesador adicional', isCorrect: true, stressImpact: -5, cost: 400 },
        { label: 'Continuar saturado', isCorrect: false, stressImpact: 18 }
      ],
      priority: 7,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Pantalla LED con Píxeles Muertos',
      description: 'Hay píxeles muertos en la pantalla LED',
      options: [
        { label: 'Reparar módulo LED', isCorrect: true, stressImpact: -5, cost: 300 },
        { label: 'Usar pantalla de respaldo', isCorrect: true, stressImpact: -3, cost: 500 },
        { label: 'Continuar con píxeles muertos', isCorrect: false, stressImpact: 10 }
      ],
      priority: 4,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Fuente de Video Incorrecta',
      description: 'Se está mostrando la fuente de video incorrecta',
      options: [
        { label: 'Cambiar a fuente correcta', isCorrect: true, stressImpact: -3 },
        { label: 'Verificar switcher', isCorrect: true, stressImpact: -5 },
        { label: 'Continuar con fuente incorrecta', isCorrect: false, stressImpact: 15 }
      ],
      priority: 5,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    }
  ],
  [SystemType.STAGE]: [
    // Eventos básicos de STAGE
    {
      title: 'Problema de Energía',
      description: 'Hay una fluctuación en el suministro de energía',
      options: [
        { label: 'Usar generador de respaldo', isCorrect: true, stressImpact: -10, cost: 400 },
        { label: 'Reducir carga total', isCorrect: true, stressImpact: -8 },
        { label: 'Continuar y rezar', isCorrect: false, stressImpact: 25 }
      ],
      priority: 9,
      canEscalate: true,
      escalationEvent: 'Corte de Energía Total',
      escalationTime: 30
    },
    {
      title: 'Corte de Energía Total',
      description: 'Todo el escenario ha perdido energía',
      options: [
        { label: 'Activar generador de emergencia', isCorrect: true, stressImpact: -15, cost: 1000 },
        { label: 'Reducir todos los sistemas', isCorrect: true, stressImpact: -12 },
        { label: 'Evacuar', isCorrect: false, stressImpact: 60 }
      ],
      priority: 10
    },
    {
      title: 'Escenario Inestable',
      description: 'El escenario está vibrando peligrosamente',
      options: [
        { label: 'Reforzar estructura', isCorrect: true, stressImpact: -12, cost: 600 },
        { label: 'Reducir carga en escenario', isCorrect: true, stressImpact: -8 },
        { label: 'Evacuar área', isCorrect: false, stressImpact: 50 }
      ],
      priority: 8,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Viento Fuerte',
      description: 'Viento fuerte está afectando el escenario',
      options: [
        { label: 'Asegurar estructuras', isCorrect: true, stressImpact: -8, cost: 300 },
        { label: 'Reducir elementos aéreos', isCorrect: true, stressImpact: -5 },
        { label: 'Continuar sin cambios', isCorrect: false, stressImpact: 20 }
      ],
      priority: 7,
      allowedScenarios: ['FESTIVAL']
    },
    {
      title: 'Lluvia Entrando al Escenario',
      description: 'La lluvia está mojando el equipo',
      options: [
        { label: 'Cubrir equipo crítico', isCorrect: true, stressImpact: -10, cost: 400 },
        { label: 'Mover equipo a área seca', isCorrect: true, stressImpact: -8, cost: 300 },
        { label: 'Continuar expuesto', isCorrect: false, stressImpact: 30 }
      ],
      priority: 8,
      allowedScenarios: ['FESTIVAL']
    },
    {
      title: 'Temperatura Extrema',
      description: 'La temperatura está afectando el equipo',
      options: [
        { label: 'Activar ventilación adicional', isCorrect: true, stressImpact: -8, cost: 200 },
        { label: 'Reducir carga de sistemas', isCorrect: true, stressImpact: -5 },
        { label: 'Continuar sin cambios', isCorrect: false, stressImpact: 18 }
      ],
      priority: 6,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Cable de Alimentación Principal Dañado',
      description: 'El cable principal de alimentación está dañado',
      options: [
        { label: 'Reparar cable (minijuego)', isCorrect: true, stressImpact: -10, requiresMinigame: 'CABLES' },
        { label: 'Usar línea de respaldo', isCorrect: true, stressImpact: -8, cost: 500 },
        { label: 'Continuar con riesgo', isCorrect: false, stressImpact: 25 }
      ],
      priority: 9,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Problema con Sistema de Seguridad',
      description: 'El sistema de seguridad del escenario está fallando',
      options: [
        { label: 'Reparar sistema de seguridad', isCorrect: true, stressImpact: -8, cost: 400 },
        { label: 'Activar protocolo de emergencia', isCorrect: true, stressImpact: -5 },
        { label: 'Continuar sin seguridad', isCorrect: false, stressImpact: 30 }
      ],
      priority: 8,
      allowedScenarios: ['NORMAL', 'ROCKSTAR']
    },
    {
      title: 'Sobrecarga en Tablero Eléctrico',
      description: 'El tablero eléctrico está sobrecargado',
      options: [
        { label: 'Redistribuir carga eléctrica', isCorrect: true, stressImpact: -10, cost: 300 },
        { label: 'Activar tablero de respaldo', isCorrect: true, stressImpact: -8, cost: 500 },
        { label: 'Continuar sobrecargado', isCorrect: false, stressImpact: 28 }
      ],
      priority: 9,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL', 'EXTREME']
    },
    {
      title: 'Estructura del Escenario Insegura',
      description: 'Hay dudas sobre la estabilidad de la estructura',
      options: [
        { label: 'Inspeccionar y reforzar', isCorrect: true, stressImpact: -12, cost: 800 },
        { label: 'Reducir peso en escenario', isCorrect: true, stressImpact: -10 },
        { label: 'Continuar con riesgo', isCorrect: false, stressImpact: 45 }
      ],
      priority: 9,
      allowedScenarios: ['FESTIVAL', 'EXTREME']
    },
    {
      title: 'Problema con Sistema de Humo',
      description: 'El sistema de humo/neblina no funciona',
      options: [
        { label: 'Reparar sistema de humo', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Usar sistema de respaldo', isCorrect: true, stressImpact: -2, cost: 100 },
        { label: 'Continuar sin humo', isCorrect: false, stressImpact: 8 }
      ],
      priority: 2,
      allowedScenarios: ['ROCKSTAR', 'FESTIVAL']
    },
    {
      title: 'Fallo en Sistema de Comunicación',
      description: 'El sistema de comunicación del escenario no funciona',
      options: [
        { label: 'Reparar comunicaciones', isCorrect: true, stressImpact: -5, cost: 200 },
        { label: 'Usar radios de respaldo', isCorrect: true, stressImpact: -3, cost: 150 },
        { label: 'Continuar sin comunicación', isCorrect: false, stressImpact: 15 }
      ],
      priority: 5,
      allowedScenarios: ['NORMAL', 'ROCKSTAR', 'FESTIVAL']
    }
  ]
};

// Fase 3: Mejoras Permanentes
export const PERMANENT_UPGRADES: PermanentUpgrade[] = [
  {
    id: 'reflexes_1',
    name: 'Reflejos Mejorados I',
    description: '+10% más tiempo para resolver eventos',
    icon: '⚡',
    category: 'REFLEXES',
    cost: 50,
    effect: () => {}, // Implementado en useGameLogic
    unlocked: false
  },
  {
    id: 'knowledge_1',
    name: 'Conocimiento Técnico I',
    description: 'Los eventos muestran más información útil',
    icon: '📚',
    category: 'KNOWLEDGE',
    cost: 40,
    effect: () => {},
    unlocked: false
  },
  {
    id: 'resistance_1',
    name: 'Resistencia al Estrés I',
    description: 'El estrés sube 15% más lento',
    icon: '🛡️',
    category: 'RESISTANCE',
    cost: 60,
    effect: () => {},
    unlocked: false
  },
  {
    id: 'efficiency_1',
    name: 'Eficiencia Mejorada I',
    description: 'Las acciones consumen 20% menos presupuesto',
    icon: '⚙️',
    category: 'EFFICIENCY',
    cost: 45,
    effect: () => {},
    unlocked: false
  },
  {
    id: 'reflexes_2',
    name: 'Reflejos Mejorados II',
    description: '+20% más tiempo para resolver eventos',
    icon: '⚡⚡',
    category: 'REFLEXES',
    cost: 100,
    effect: () => {},
    unlocked: false
  },
  {
    id: 'resistance_2',
    name: 'Resistencia al Estrés II',
    description: 'El estrés sube 30% más lento',
    icon: '🛡️🛡️',
    category: 'RESISTANCE',
    cost: 120,
    effect: () => {},
    unlocked: false
  }
];