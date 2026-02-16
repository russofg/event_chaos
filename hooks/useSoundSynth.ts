
import { useCallback, useRef } from 'react';
import { GameMode, GameState, SystemState, SystemType } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getMasterGainTarget = (faderValue: number, status: string, stress: number) => {
  const base = clamp(faderValue / 100, 0, 1) * 0.42;
  const statusPenalty =
    status === 'CRITICAL' ? 0.65 :
    status === 'WARNING' ? 0.82 :
    1.0;
  const stressPenalty = 1 - clamp(stress, 0, 100) / 100 * 0.2;
  return clamp(base * statusPenalty * stressPenalty, 0.02, 0.5);
};

export const getReverbWetTarget = (stageFader: number, stress: number) => {
  const stageMix = clamp(stageFader, 0, 100) / 100 * 0.45;
  const stressMix = clamp(stress, 0, 100) / 100 * 0.15;
  return clamp(0.08 + stageMix + stressMix, 0.06, 0.72);
};

export const getCrowdNoiseTarget = (publicInterest: number) => {
  if (publicInterest > 70) {
    return 0.15 * (publicInterest / 100);
  }
  if (publicInterest < 30) {
    return 0.1 * ((30 - publicInterest) / 30);
  }
  return 0;
};

export interface AudioBusLevels {
  music: number;
  sfx: number;
  ui: number;
  crowd: number;
}

export const DEFAULT_AUDIO_BUS_LEVELS: AudioBusLevels = {
  music: 1,
  sfx: 1,
  ui: 1,
  crowd: 1
};

export const normalizeAudioBusLevels = (
  levels: Partial<AudioBusLevels>,
  base: AudioBusLevels = DEFAULT_AUDIO_BUS_LEVELS
): AudioBusLevels => {
  return {
    music: clamp(levels.music ?? base.music, 0, 1.4),
    sfx: clamp(levels.sfx ?? base.sfx, 0, 1.4),
    ui: clamp(levels.ui ?? base.ui, 0, 1.4),
    crowd: clamp(levels.crowd ?? base.crowd, 0, 1.4)
  };
};

export interface UserAudioMix {
  master: number;
  music: number;
  sfx: number;
  ui: number;
  crowd: number;
}

export const DEFAULT_USER_AUDIO_MIX: UserAudioMix = {
  master: 1,
  music: 1,
  sfx: 1,
  ui: 1,
  crowd: 1
};

export const normalizeUserAudioMix = (
  mix: Partial<UserAudioMix>,
  base: UserAudioMix = DEFAULT_USER_AUDIO_MIX
): UserAudioMix => {
  return {
    master: clamp(mix.master ?? base.master, 0, 1.4),
    music: clamp(mix.music ?? base.music, 0, 1.4),
    sfx: clamp(mix.sfx ?? base.sfx, 0, 1.4),
    ui: clamp(mix.ui ?? base.ui, 0, 1.4),
    crowd: clamp(mix.crowd ?? base.crowd, 0, 1.4)
  };
};

export type AudioSpatialMode = 'BALANCED' | 'CINEMATIC' | 'FOCUS';

interface AudioSpatialProfile {
  width: number;
  microDrift: number;
}

const AUDIO_SPATIAL_PROFILES: Record<AudioSpatialMode, AudioSpatialProfile> = {
  BALANCED: { width: 0.6, microDrift: 0.06 },
  CINEMATIC: { width: 1, microDrift: 0.12 },
  FOCUS: { width: 0.25, microDrift: 0.03 }
};

export const getAudioSpatialProfile = (mode: AudioSpatialMode): AudioSpatialProfile => {
  return AUDIO_SPATIAL_PROFILES[mode];
};

const AUDIO_PRESETS_BY_MODE: Record<GameMode, AudioBusLevels> = {
  [GameMode.NORMAL]: {
    music: 1,
    sfx: 1,
    ui: 1,
    crowd: 1
  },
  [GameMode.ENDLESS]: {
    music: 0.96,
    sfx: 0.94,
    ui: 0.9,
    crowd: 1.05
  },
  [GameMode.SPEEDRUN]: {
    music: 1.08,
    sfx: 1.1,
    ui: 0.94,
    crowd: 0.98
  },
  [GameMode.HARDCORE]: {
    music: 0.9,
    sfx: 1.2,
    ui: 1.02,
    crowd: 0.92
  }
};

export const getAudioPresetForMode = (mode: GameMode): AudioBusLevels => {
  return AUDIO_PRESETS_BY_MODE[mode];
};

export interface AdaptiveAudioMixContext {
  isPlaying: boolean;
  criticalEvents: number;
  warningEvents: number;
  stress: number;
  overlaysActive: boolean;
}

export const getAdaptiveAudioBusMultipliers = (context: AdaptiveAudioMixContext): AudioBusLevels => {
  if (!context.isPlaying) {
    return {
      music: 1,
      sfx: 1,
      ui: 1,
      crowd: 1
    };
  }

  const crisisLoad = clamp(
    (context.criticalEvents * 0.36) +
      (context.warningEvents * 0.14) +
      (clamp(context.stress, 0, 100) / 100 * 0.42) +
      (context.overlaysActive ? 0.16 : 0),
    0,
    1
  );

  return {
    music: clamp(1 - (crisisLoad * 0.42), 0.58, 1),
    sfx: clamp(1 + (crisisLoad * 0.3), 1, 1.3),
    ui: clamp(1 + (crisisLoad * 0.22), 1, 1.24),
    crowd: clamp(1 - (crisisLoad * 0.2), 0.78, 1.05)
  };
};

const SYSTEM_SFX_BASE_FREQ: Record<SystemType, number> = {
  [SystemType.SOUND]: 180,
  [SystemType.LIGHTS]: 230,
  [SystemType.VIDEO]: 205,
  [SystemType.STAGE]: 155
};

const SYSTEM_SPATIAL_BASE_PAN: Record<SystemType, number> = {
  [SystemType.SOUND]: -0.08,
  [SystemType.LIGHTS]: 0.42,
  [SystemType.VIDEO]: -0.42,
  [SystemType.STAGE]: 0.1
};

export const getSystemSpatialPan = (
  systemId: SystemType,
  mode: AudioSpatialMode,
  variation: number,
  step: number = 0
) => {
  const profile = getAudioSpatialProfile(mode);
  const drift = (((variation + step) % 7) - 3) * profile.microDrift;
  return clamp((SYSTEM_SPATIAL_BASE_PAN[systemId] + drift) * profile.width, -0.95, 0.95);
};

export interface ScenarioAudioProfile {
  id: string;
  label: string;
  tempo: number;
  rootHz: number;
  bassLine: number[];
  leadLine: number[];
  hatDensity: 'SPARSE' | 'NORMAL' | 'DENSE';
  reverbBias: number;
  tension: number;
}

const SCENARIO_AUDIO_PROFILES: Record<string, ScenarioAudioProfile> = {
  TUTORIAL: {
    id: 'TUTORIAL',
    label: 'Training Pulse',
    tempo: 108,
    rootHz: 82,
    bassLine: [82, 0, 82, 0, 98, 0, 82, 0],
    leadLine: [0, 330, 0, 370, 0, 415, 0, 494],
    hatDensity: 'SPARSE',
    reverbBias: -0.04,
    tension: 0.1
  },
  NORMAL: {
    id: 'NORMAL',
    label: 'Corporate Drive',
    tempo: 120,
    rootHz: 110,
    bassLine: [110, 0, 110, 0, 110, 0, 110, 123],
    leadLine: [0, 440, 0, 554, 0, 659, 0, 880],
    hatDensity: 'NORMAL',
    reverbBias: 0,
    tension: 0.2
  },
  ROCKSTAR: {
    id: 'ROCKSTAR',
    label: 'Diva Pressure',
    tempo: 128,
    rootHz: 123,
    bassLine: [123, 0, 146, 0, 123, 0, 164, 0],
    leadLine: [0, 492, 0, 620, 0, 738, 0, 930],
    hatDensity: 'DENSE',
    reverbBias: 0.04,
    tension: 0.55
  },
  FESTIVAL: {
    id: 'FESTIVAL',
    label: 'Open Air Lift',
    tempo: 124,
    rootHz: 98,
    bassLine: [98, 0, 110, 0, 123, 0, 110, 0],
    leadLine: [0, 392, 0, 494, 0, 587, 0, 740],
    hatDensity: 'DENSE',
    reverbBias: 0.08,
    tension: 0.4
  },
  EXTREME: {
    id: 'EXTREME',
    label: 'Extreme Run',
    tempo: 134,
    rootHz: 146,
    bassLine: [146, 0, 146, 0, 174, 0, 146, 185],
    leadLine: [0, 584, 0, 740, 0, 880, 0, 1170],
    hatDensity: 'DENSE',
    reverbBias: 0.06,
    tension: 0.75
  },
  ARENA: {
    id: 'ARENA',
    label: 'Arena Transit',
    tempo: 130,
    rootHz: 130,
    bassLine: [130, 0, 146, 0, 130, 0, 155, 0],
    leadLine: [0, 520, 0, 654, 0, 778, 0, 980],
    hatDensity: 'DENSE',
    reverbBias: 0.05,
    tension: 0.6
  },
  WORLD_TOUR: {
    id: 'WORLD_TOUR',
    label: 'Global Broadcast',
    tempo: 132,
    rootHz: 138,
    bassLine: [138, 0, 155, 0, 174, 0, 155, 0],
    leadLine: [0, 552, 0, 694, 0, 826, 0, 1040],
    hatDensity: 'DENSE',
    reverbBias: 0.07,
    tension: 0.7
  },
  BLACKOUT_PROTOCOL: {
    id: 'BLACKOUT_PROTOCOL',
    label: 'Blackout Alarm',
    tempo: 138,
    rootHz: 92,
    bassLine: [92, 0, 110, 0, 92, 0, 82, 0],
    leadLine: [0, 368, 0, 438, 0, 520, 0, 694],
    hatDensity: 'DENSE',
    reverbBias: 0.02,
    tension: 0.92
  }
};

export const getScenarioAudioProfile = (scenarioId: string): ScenarioAudioProfile => {
  return SCENARIO_AUDIO_PROFILES[scenarioId] || SCENARIO_AUDIO_PROFILES.NORMAL;
};

export const buildScenarioTransitionFrequencies = (
  scenarioId: string,
  phase: 'LOAD' | 'START' = 'START'
) => {
  const profile = getScenarioAudioProfile(scenarioId);
  if (phase === 'LOAD') {
    return [profile.rootHz * 1.2, profile.rootHz * 1.5, profile.rootHz * 1.8];
  }
  return [profile.rootHz, profile.rootHz * 2, profile.rootHz * 2.5];
};

export const buildStateTransitionFrequencies = (
  from: GameState | null,
  to: GameState
) => {
  if (to === GameState.PAUSED) return [420, 320];
  if (to === GameState.PLAYING && from === GameState.PAUSED) return [360, 520, 760];
  if (to === GameState.PLAYING) return [330, 495, 660];
  if (to === GameState.VICTORY) return [660, 880, 1175];
  if (to === GameState.GAME_OVER) return [220, 172, 134];
  if (to === GameState.SHOP) return [300, 420, 540];
  if (to === GameState.MENU) return [280, 380];
  return [400];
};

export const getSystemSfxBaseFrequency = (systemId: SystemType) => {
  return SYSTEM_SFX_BASE_FREQ[systemId];
};

export const buildEventResultSfxPattern = (
  systemId: SystemType,
  success: boolean,
  severity: 1 | 2 | 3,
  variation: number
) => {
  const base = getSystemSfxBaseFrequency(systemId);
  const severityScale = 1 + (severity - 1) * 0.08;
  const drift = ((variation % 7) - 3) * 0.012;

  if (success) {
    const root = base * 2.2 * severityScale * (1 + drift);
    return [root, root * 1.26, root * 1.5];
  }

  const root = base * 1.65 * severityScale * (1 - drift * 0.5);
  return [root * 1.09, root * 0.92, root * 0.78];
};

export const buildEscalationSfxPattern = (
  systemId: SystemType,
  severity: 1 | 2 | 3,
  variation: number
) => {
  const base = getSystemSfxBaseFrequency(systemId);
  const drift = ((variation % 5) - 2) * 0.015;
  const count = severity + 1;
  const root = base * 2.35 * (1 + drift);

  return Array.from({ length: count }, (_, index) => {
    const pulseOffset = index % 2 === 0 ? 1.12 : 0.96;
    return root * pulseOffset;
  });
};

export interface EventSfxLayer {
  wave: OscillatorType;
  octave: number;
  gain: number;
  decay: number;
  detune?: number;
  delayMs?: number;
}

export interface EventSfxLayerPreset {
  layers: EventSfxLayer[];
  noiseIntensity: number;
}

export const getEventSfxLayerPreset = (
  success: boolean,
  severity: 1 | 2 | 3
): EventSfxLayerPreset => {
  if (success) {
    if (severity === 1) {
      return {
        layers: [
          { wave: 'triangle', octave: 1, gain: 0.06, decay: 0.14 },
          { wave: 'sine', octave: 2, gain: 0.04, decay: 0.12, delayMs: 18 }
        ],
        noiseIntensity: 0
      };
    }

    if (severity === 2) {
      return {
        layers: [
          { wave: 'triangle', octave: 1, gain: 0.08, decay: 0.16 },
          { wave: 'sine', octave: 2, gain: 0.06, decay: 0.14, delayMs: 15 },
          { wave: 'sine', octave: 3, gain: 0.035, decay: 0.11, detune: 7, delayMs: 35 }
        ],
        noiseIntensity: 0
      };
    }

    return {
      layers: [
        { wave: 'triangle', octave: 1, gain: 0.1, decay: 0.18 },
        { wave: 'sine', octave: 2, gain: 0.075, decay: 0.16, delayMs: 12 },
        { wave: 'sine', octave: 3, gain: 0.05, decay: 0.14, detune: 12, delayMs: 28 },
        { wave: 'square', octave: 0.5, gain: 0.035, decay: 0.2, delayMs: 0 }
      ],
      noiseIntensity: 0.08
    };
  }

  if (severity === 1) {
    return {
      layers: [
        { wave: 'square', octave: 1, gain: 0.11, decay: 0.16 },
        { wave: 'sawtooth', octave: 0.8, gain: 0.075, decay: 0.2, detune: -8, delayMs: 10 }
      ],
      noiseIntensity: 0.35
    };
  }

  if (severity === 2) {
    return {
      layers: [
        { wave: 'square', octave: 1, gain: 0.13, decay: 0.18 },
        { wave: 'sawtooth', octave: 0.75, gain: 0.095, decay: 0.22, detune: -12, delayMs: 8 },
        { wave: 'triangle', octave: 0.5, gain: 0.07, decay: 0.24, delayMs: 0 }
      ],
      noiseIntensity: 0.6
    };
  }

  return {
    layers: [
      { wave: 'square', octave: 1, gain: 0.15, decay: 0.2 },
      { wave: 'sawtooth', octave: 0.72, gain: 0.11, decay: 0.24, detune: -16, delayMs: 8 },
      { wave: 'triangle', octave: 0.48, gain: 0.09, decay: 0.28, delayMs: 0 },
      { wave: 'square', octave: 1.5, gain: 0.065, decay: 0.16, detune: 11, delayMs: 18 }
    ],
    noiseIntensity: 0.95
  };
};

export const useSoundSynth = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicBusGainRef = useRef<GainNode | null>(null);
  const sfxBusGainRef = useRef<GainNode | null>(null);
  const uiBusGainRef = useRef<GainNode | null>(null);
  const crowdBusGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const distortionRef = useRef<WaveShaperNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const sequencerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const crowdNoiseRef = useRef<GainNode | null>(null);
  const crowdSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stressLevelRef = useRef(0);
  const interestLevelRef = useRef(50);
  const activeTempoRef = useRef(120);
  const lastTempoShiftRef = useRef(0);
  const sfxVariationRef = useRef(0);
  const scenarioProfileRef = useRef<ScenarioAudioProfile>(getScenarioAudioProfile('NORMAL'));
  const baseAudioBusLevelsRef = useRef<AudioBusLevels>(DEFAULT_AUDIO_BUS_LEVELS);
  const userAudioMixRef = useRef<UserAudioMix>(DEFAULT_USER_AUDIO_MIX);
  const adaptiveAudioBusLevelsRef = useRef<AudioBusLevels>({
    music: 1,
    sfx: 1,
    ui: 1,
    crowd: 1
  });
  const audioSpatialModeRef = useRef<AudioSpatialMode>('BALANCED');
  const audioBusLevelsRef = useRef<AudioBusLevels>(DEFAULT_AUDIO_BUS_LEVELS);
  
  // Music State
  const tempoRef = useRef(120);

  const applyAudioBusLevels = (levels: AudioBusLevels, smoothSeconds: number = 0.08) => {
    if (!audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    if (musicBusGainRef.current) {
      musicBusGainRef.current.gain.setTargetAtTime(levels.music, now, smoothSeconds);
    }
    if (sfxBusGainRef.current) {
      sfxBusGainRef.current.gain.setTargetAtTime(levels.sfx, now, smoothSeconds);
    }
    if (uiBusGainRef.current) {
      uiBusGainRef.current.gain.setTargetAtTime(levels.ui, now, smoothSeconds);
    }
    if (crowdBusGainRef.current) {
      crowdBusGainRef.current.gain.setTargetAtTime(levels.crowd, now, smoothSeconds);
    }
  };

  const getResolvedBusLevels = useCallback((): AudioBusLevels => {
    const user = userAudioMixRef.current;
    return normalizeAudioBusLevels({
      music: baseAudioBusLevelsRef.current.music * adaptiveAudioBusLevelsRef.current.music * user.master * user.music,
      sfx: baseAudioBusLevelsRef.current.sfx * adaptiveAudioBusLevelsRef.current.sfx * user.master * user.sfx,
      ui: baseAudioBusLevelsRef.current.ui * adaptiveAudioBusLevelsRef.current.ui * user.master * user.ui,
      crowd: baseAudioBusLevelsRef.current.crowd * adaptiveAudioBusLevelsRef.current.crowd * user.master * user.crowd
    });
  }, []);

  const syncResolvedBusLevels = useCallback((smoothSeconds: number = 0.08) => {
    const resolved = getResolvedBusLevels();
    audioBusLevelsRef.current = resolved;
    applyAudioBusLevels(resolved, smoothSeconds);
  }, [getResolvedBusLevels]);

  const setAudioBusLevels = useCallback((levels: Partial<AudioBusLevels>) => {
    const normalizedBase = normalizeAudioBusLevels(levels, baseAudioBusLevelsRef.current);
    baseAudioBusLevelsRef.current = normalizedBase;
    syncResolvedBusLevels();
  }, [syncResolvedBusLevels]);

  const setGameModeAudioPreset = useCallback((mode: GameMode) => {
    baseAudioBusLevelsRef.current = getAudioPresetForMode(mode);
    syncResolvedBusLevels();
  }, [syncResolvedBusLevels]);

  const setUserAudioMix = useCallback((mix: Partial<UserAudioMix>) => {
    userAudioMixRef.current = normalizeUserAudioMix(mix, userAudioMixRef.current);
    syncResolvedBusLevels();
  }, [syncResolvedBusLevels]);

  const setSpatialAudioMode = useCallback((mode: AudioSpatialMode) => {
    audioSpatialModeRef.current = mode;
  }, []);

  const setAdaptiveAudioMix = useCallback((context: AdaptiveAudioMixContext) => {
    adaptiveAudioBusLevelsRef.current = getAdaptiveAudioBusMultipliers(context);
    syncResolvedBusLevels(0.06);
  }, [syncResolvedBusLevels]);

  const setScenarioAudioProfile = useCallback((scenarioId: string) => {
    const profile = getScenarioAudioProfile(scenarioId);
    scenarioProfileRef.current = profile;
    tempoRef.current = profile.tempo;
  }, []);

  // Helper: Create distortion curve
  const createDistortionCurve = useCallback((amount: number) => {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }, []);
  
  // Helper: Create simple reverb impulse
  const createReverbImpulse = useCallback((ctx: AudioContext) => {
    const length = ctx.sampleRate * 2; // 2 seconds
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return impulse;
  }, []);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
      
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 0.4;
      musicBusGainRef.current = audioCtxRef.current.createGain();
      const resolvedBusLevels = getResolvedBusLevels();
      audioBusLevelsRef.current = resolvedBusLevels;

      musicBusGainRef.current.gain.value = resolvedBusLevels.music;
      sfxBusGainRef.current = audioCtxRef.current.createGain();
      sfxBusGainRef.current.gain.value = resolvedBusLevels.sfx;
      uiBusGainRef.current = audioCtxRef.current.createGain();
      uiBusGainRef.current.gain.value = resolvedBusLevels.ui;
      crowdBusGainRef.current = audioCtxRef.current.createGain();
      crowdBusGainRef.current.gain.value = resolvedBusLevels.crowd;
      dryGainRef.current = audioCtxRef.current.createGain();
      dryGainRef.current.gain.value = 0.85;
      reverbWetGainRef.current = audioCtxRef.current.createGain();
      reverbWetGainRef.current.gain.value = 0.15;
      compressorRef.current = audioCtxRef.current.createDynamicsCompressor();
      compressorRef.current.threshold.value = -18;
      compressorRef.current.knee.value = 20;
      compressorRef.current.ratio.value = 4;
      compressorRef.current.attack.value = 0.003;
      compressorRef.current.release.value = 0.2;
      
      // Global Lowpass Filter (for Sound System Health)
      filterRef.current = audioCtxRef.current.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.frequency.value = 20000;
      
      // Distortion Node (for CRITICAL sound system)
      distortionRef.current = audioCtxRef.current.createWaveShaper();
      distortionRef.current.curve = createDistortionCurve(0); // Start with no distortion
      distortionRef.current.oversample = '4x';
      
      // Reverb Node (for Stage effects)
      reverbRef.current = audioCtxRef.current.createConvolver();
      if (reverbRef.current) {
        reverbRef.current.buffer = createReverbImpulse(audioCtxRef.current);
      }
      
      // Crowd Noise Gain
      if (!crowdNoiseRef.current) {
        crowdNoiseRef.current = audioCtxRef.current.createGain();
        crowdNoiseRef.current.gain.value = 0;
      }
      
      // Audio Chain:
      // Music sources -> master(dynamic) -> music bus -> distortion -> filter -> dry -> compressor -> destination
      //                                                        -> reverb -> wet -> compressor -> destination
      // Event SFX -> sfx bus -> filter -> same master chain
      // UI SFX -> ui bus -> compressor -> destination
      // Crowd -> crowd gain(dynamic) -> crowd bus -> compressor -> destination
      if (
        musicBusGainRef.current &&
        sfxBusGainRef.current &&
        uiBusGainRef.current &&
        crowdBusGainRef.current &&
        distortionRef.current &&
        filterRef.current &&
        reverbRef.current &&
        dryGainRef.current &&
        reverbWetGainRef.current &&
        compressorRef.current
      ) {
        masterGainRef.current.connect(musicBusGainRef.current);
        musicBusGainRef.current.connect(distortionRef.current);
        sfxBusGainRef.current.connect(filterRef.current);
        uiBusGainRef.current.connect(compressorRef.current);
        distortionRef.current.connect(filterRef.current);
        filterRef.current.connect(dryGainRef.current);
        dryGainRef.current.connect(compressorRef.current);
        filterRef.current.connect(reverbRef.current);
        reverbRef.current.connect(reverbWetGainRef.current);
        reverbWetGainRef.current.connect(compressorRef.current);
        compressorRef.current.connect(audioCtxRef.current.destination);
      } else {
        // Fallback chain if reverb/distortion not available
        masterGainRef.current.connect(filterRef.current!);
        filterRef.current!.connect(audioCtxRef.current.destination);
      }
      
      // Crowd noise joins mastering chain when available
      if (crowdNoiseRef.current && crowdBusGainRef.current && compressorRef.current) {
        crowdNoiseRef.current.connect(crowdBusGainRef.current);
        crowdBusGainRef.current.connect(compressorRef.current);
      } else if (crowdNoiseRef.current) {
        crowdNoiseRef.current.connect(audioCtxRef.current.destination);
      }

      applyAudioBusLevels(audioBusLevelsRef.current, 0.001);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [createDistortionCurve, createReverbImpulse, getResolvedBusLevels]);

  const playOsc = (
    type: OscillatorType,
    freq: number,
    decay: number,
    vol: number,
    detune: number = 0
  ) => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const t = audioCtxRef.current.currentTime;
      
      const osc = audioCtxRef.current.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.value = detune;

      const gain = audioCtxRef.current.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      osc.connect(gain);
      gain.connect(masterGainRef.current);
      
      osc.start(t);
      osc.stop(t + decay);
  };

  const playUiOsc = (
    type: OscillatorType,
    freq: number,
    decay: number,
    vol: number,
    detune: number = 0
  ) => {
      initAudio();
      if (!audioCtxRef.current || !uiBusGainRef.current) return;
      const t = audioCtxRef.current.currentTime;

      const osc = audioCtxRef.current.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.value = detune;

      const gain = audioCtxRef.current.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      osc.connect(gain);
      gain.connect(uiBusGainRef.current);
      osc.start(t);
      osc.stop(t + decay);
  };

  const connectSfxNode = (
    sourceNode: AudioNode,
    systemId: SystemType,
    variation: number,
    step: number = 0
  ) => {
      if (!audioCtxRef.current || !sfxBusGainRef.current) return;
      const pan = getSystemSpatialPan(systemId, audioSpatialModeRef.current, variation, step);
      const supportsStereoPanner = typeof (audioCtxRef.current as any).createStereoPanner === 'function';
      if (supportsStereoPanner) {
        const panner = (audioCtxRef.current as any).createStereoPanner() as StereoPannerNode;
        panner.pan.setValueAtTime(pan, audioCtxRef.current.currentTime);
        sourceNode.connect(panner);
        panner.connect(sfxBusGainRef.current);
        return;
      }
      sourceNode.connect(sfxBusGainRef.current);
  };

  const nextVariation = () => {
      sfxVariationRef.current = (sfxVariationRef.current + 1) % 9999;
      return sfxVariationRef.current;
  };

  const playToneSequence = (
      frequencies: number[],
      options: {
        systemId: SystemType;
        success: boolean;
        severity: 1 | 2 | 3;
        variation: number;
      }
  ) => {
      if (!audioCtxRef.current || !sfxBusGainRef.current) return;
      const start = audioCtxRef.current.currentTime;
      const { success, severity, systemId, variation } = options;
      const step = success ? 0.055 : 0.06;
      const duration = success ? 0.11 : 0.13;

      frequencies.forEach((frequency, index) => {
          const osc = audioCtxRef.current!.createOscillator();
          osc.type = success
            ? (index === 0 ? 'triangle' : 'sine')
            : (index === 0 ? 'square' : 'sawtooth');
          osc.frequency.setValueAtTime(frequency, start + (index * step));

          if (!success && severity >= 3) {
            osc.detune.setValueAtTime(index % 2 === 0 ? 15 : -15, start + (index * step));
          }

          const gain = audioCtxRef.current!.createGain();
          gain.gain.setValueAtTime(success ? 0.11 : 0.15, start + (index * step));
          gain.gain.exponentialRampToValueAtTime(0.0001, start + (index * step) + duration);

          osc.connect(gain);
          connectSfxNode(gain, systemId, variation, index);
          osc.start(start + (index * step));
          osc.stop(start + (index * step) + duration);
      });
  };

  const playNoiseBurst = (intensity: number) => {
      if (!audioCtxRef.current || !sfxBusGainRef.current) return;
      const ctx = audioCtxRef.current;
      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.pow(1 - i / bufferSize, 2);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900 + (intensity * 400);
      band.Q.value = 0.7 + (intensity * 0.8);

      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.08 + (intensity * 0.1), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      source.connect(band);
      band.connect(gain);
      gain.connect(sfxBusGainRef.current);
      source.start(now);
      source.stop(now + 0.11);
  };

  const playEventLayers = (
    baseFrequency: number,
    preset: EventSfxLayerPreset,
    systemId: SystemType,
    variation: number
  ) => {
      if (!audioCtxRef.current || !sfxBusGainRef.current) return;
      const ctx = audioCtxRef.current;
      const start = ctx.currentTime;

      preset.layers.forEach((layer) => {
        const layerStart = start + ((layer.delayMs ?? 0) / 1000);
        const osc = ctx.createOscillator();
        osc.type = layer.wave;
        osc.frequency.setValueAtTime(clamp(baseFrequency * layer.octave, 42, 5200), layerStart);
        if (layer.detune) {
          osc.detune.setValueAtTime(layer.detune, layerStart);
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(layer.gain, layerStart);
        gain.gain.exponentialRampToValueAtTime(0.0001, layerStart + layer.decay);

        osc.connect(gain);
        connectSfxNode(gain, systemId, variation, Math.round(layer.delayMs || 0));
        osc.start(layerStart);
        osc.stop(layerStart + layer.decay + 0.03);
      });

      if (preset.noiseIntensity > 0) {
        playNoiseBurst(preset.noiseIntensity);
      }
  };

  const playKick = () => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const t = audioCtxRef.current.currentTime;
      
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      gain.connect(masterGainRef.current);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  const playHat = () => {
      // Noise buffer for HiHat
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const bufferSize = audioCtxRef.current.sampleRate * 0.05;
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = audioCtxRef.current.createBufferSource();
      noise.buffer = buffer;
      const gain = audioCtxRef.current.createGain();
      gain.gain.value = 0.3;
      // Bandpass for crisp hat
      const band = audioCtxRef.current.createBiquadFilter();
      band.type = 'highpass';
      band.frequency.value = 6000;
      
      noise.connect(band);
      band.connect(gain);
      gain.connect(masterGainRef.current);
      noise.start();
  }

  const playClap = () => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const bufferSize = Math.floor(audioCtxRef.current.sampleRate * 0.12);
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.pow(1 - i / bufferSize, 2.5);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      const band = audioCtxRef.current.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1800;
      band.Q.value = 0.9;

      const gain = audioCtxRef.current.createGain();
      const t = audioCtxRef.current.currentTime;
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

      source.connect(band);
      band.connect(gain);
      gain.connect(masterGainRef.current);
      source.start(t);
      source.stop(t + 0.14);
  };

  const playBass = (note: number) => {
      playOsc('sawtooth', note, 0.3, 0.4, -10);
      playOsc('sawtooth', note, 0.3, 0.4, 10); // Super saw-ish
  }

  const playLead = (note: number) => {
      playOsc('square', note * 2, 0.1, 0.2);
  }

  // PROCEDURAL SEQUENCER
  const startBackgroundLoop = useCallback(() => {
      initAudio();
      if (sequencerRef.current) clearInterval(sequencerRef.current);
      
      const profile = scenarioProfileRef.current;
      const bassLine = profile.bassLine;
      const leadLine = profile.leadLine;
      tempoRef.current = profile.tempo;
      const hatStep = profile.hatDensity === 'DENSE' ? 1 : profile.hatDensity === 'SPARSE' ? 4 : 2;
      
      sequencerRef.current = window.setInterval(() => {
          if (!audioCtxRef.current) return;
          
          const s = stepRef.current;
          const stressNow = stressLevelRef.current;
          const interestNow = interestLevelRef.current;
          const isHighStress = stressNow > 72;
          const isVeryHighStress = stressNow > 88;
          
          // STEM 1: DRUMS (Always playing unless completely dead)
          if (s % 4 === 0 || (isVeryHighStress && s % 2 === 0)) playKick();
          if (s % hatStep === 0 || isHighStress) playHat();
          if (interestNow > 75 && s % 4 === 2) playClap();

          // STEM 2: BASS (Cut if low volume)
          if (masterGainRef.current!.gain.value > 0.1) {
             if (bassLine[s]) {
               const detuneRatio = isHighStress && s % 2 === 1
                 ? (1.04 + (profile.tension * 0.025))
                 : 1;
               playBass(bassLine[s] * detuneRatio);
             }
          }

          // STEM 3: LEAD (Only if high health)
          if (masterGainRef.current!.gain.value > 0.2) {
              if (leadLine[s]) {
                const tensionOffset = isHighStress
                  ? (s % 2 === 0 ? 24 : -24) * (0.6 + profile.tension * 0.5)
                  : 0;
                playLead(leadLine[s] + tensionOffset);
              }
          }

          stepRef.current = (s + 1) % 8;
      }, (60 / tempoRef.current) * 1000 * 0.5); // 8th notes
      activeTempoRef.current = tempoRef.current;
  }, [initAudio]);

  const stopBackgroundLoop = useCallback(() => {
      if (sequencerRef.current) {
          clearInterval(sequencerRef.current);
          sequencerRef.current = null;
      }
      if (crowdSourceRef.current) {
          crowdSourceRef.current.stop();
          crowdSourceRef.current = null;
      }
      if (crowdNoiseRef.current && audioCtxRef.current) {
          crowdNoiseRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05);
      }
  }, []);

  const updateBackgroundLoop = useCallback((
      faderValue: number, 
      status: string, 
      stress: number,
      stageFader?: number,
      publicInterest?: number,
      allSystems?: Record<SystemType, SystemState>
  ) => {
      if (!masterGainRef.current || !filterRef.current || !audioCtxRef.current) return;
      
      const now = audioCtxRef.current.currentTime;
      const profile = scenarioProfileRef.current;
      stressLevelRef.current = clamp(stress, 0, 100);
      if (publicInterest !== undefined) {
        interestLevelRef.current = clamp(publicInterest, 0, 100);
      }
      
      // 1. SOUND SYSTEM HEALTH (Filter + Distortion)
      if (status === 'CRITICAL') {
          // Muffled underwater sound with heavy distortion
          filterRef.current.frequency.setTargetAtTime(450, now, 0.4); 
          filterRef.current.Q.value = 9;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(45); // Heavy distortion
          }
      } else if (status === 'WARNING') {
          filterRef.current.frequency.setTargetAtTime(2800, now, 0.4);
          filterRef.current.Q.value = 4;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(16); // Light distortion
          }
      } else {
          filterRef.current.frequency.setTargetAtTime(22000, now, 0.5);
          filterRef.current.Q.value = 1;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(0); // No distortion
          }
      }

      // 2. FADER VOLUME + stress ducking
      const targetGain = getMasterGainTarget(faderValue, status, stress);
      masterGainRef.current.gain.setTargetAtTime(targetGain, now, 0.12);

      // 3. REVERB (Stage + stress)
      if (reverbWetGainRef.current && dryGainRef.current) {
          const wet = clamp(getReverbWetTarget(stageFader ?? 50, stress) + profile.reverbBias, 0.06, 0.78);
          const dry = clamp(1 - wet * 0.72, 0.25, 0.95);
          reverbWetGainRef.current.gain.setTargetAtTime(wet, now, 0.22);
          dryGainRef.current.gain.setTargetAtTime(dry, now, 0.22);
      }

      // 4. STRESS = Dissonance and Tempo Variation
      let targetTempo = profile.tempo;
      if (stress > 80) {
          targetTempo += 10;
      } else if (stress > 55) {
          targetTempo += 5;
      }
      if (publicInterest !== undefined && publicInterest > 80) {
          targetTempo += 3;
      } else if (publicInterest !== undefined && publicInterest < 30) {
          targetTempo -= 2;
      }
      targetTempo = clamp(targetTempo, 96, 148);
      if (Math.abs(targetTempo - activeTempoRef.current) >= 4 && Date.now() - lastTempoShiftRef.current > 1500) {
          tempoRef.current = targetTempo;
          lastTempoShiftRef.current = Date.now();
          if (sequencerRef.current) {
              startBackgroundLoop();
          }
      }
      
      // 5. CROWD NOISE (Public Interest)
      if (crowdNoiseRef.current && publicInterest !== undefined) {
          updateCrowdNoise(publicInterest, now);
      }
      
  }, []);
  
  const updateCrowdNoise = useCallback((publicInterest: number, now: number) => {
      if (!audioCtxRef.current || !crowdNoiseRef.current) return;
      
      // Crowd noise intensity based on public interest
      const targetGain = getCrowdNoiseTarget(clamp(publicInterest, 0, 100));
      
      crowdNoiseRef.current.gain.setTargetAtTime(targetGain, now, 0.3);
      
      // Generate crowd noise if needed
      if (targetGain > 0.01 && !crowdSourceRef.current) {
          generateCrowdNoise();
      } else if (targetGain < 0.01 && crowdSourceRef.current) {
          crowdSourceRef.current.stop();
          crowdSourceRef.current = null;
      }
  }, []);
  
  const generateCrowdNoise = useCallback(() => {
      if (!audioCtxRef.current || !crowdNoiseRef.current) return;
      
      const bufferSize = audioCtxRef.current.sampleRate * 0.5; // 0.5 seconds
      const buffer = audioCtxRef.current.createBuffer(1, bufferSize, audioCtxRef.current.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Create crowd-like noise (filtered white noise)
      for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.3;
      }
      
      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      // Filter to make it sound more like crowd
      const filter = audioCtxRef.current.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      filter.Q.value = 1;
      
      source.connect(filter);
      filter.connect(crowdNoiseRef.current);
      source.start();
      
      crowdSourceRef.current = source;
  }, []);

  const playClick = useCallback(() => {
      playUiOsc('sine', 1200, 0.05, 0.1);
  }, []);

  const playError = useCallback(() => {
      playUiOsc('sawtooth', 100, 0.4, 0.38);
      playUiOsc('square', 90, 0.4, 0.32);
  }, []);

  const playSuccess = useCallback(() => {
      playUiOsc('sine', 880, 0.1, 0.2);
      setTimeout(() => playUiOsc('sine', 1108, 0.2, 0.2), 100);
  }, []);

  const playAlarm = useCallback(() => {
      playUiOsc('square', 800, 0.5, 0.26);
      setTimeout(() => playUiOsc('square', 600, 0.5, 0.24), 200);
  }, []);

  const playStartGame = useCallback((scenarioId?: string) => {
      const targetScenarioId = scenarioId || scenarioProfileRef.current.id;
      const frequencies = buildScenarioTransitionFrequencies(targetScenarioId, 'START');
      playUiOsc('triangle', frequencies[0], 0.9, 0.42);
      setTimeout(() => playUiOsc('triangle', frequencies[1], 0.9, 0.36), 170);
      setTimeout(() => playUiOsc('triangle', frequencies[2], 1.4, 0.26), 340);
  }, []);

  const playScenarioTransitionSfx = useCallback((scenarioId: string, phase: 'LOAD' | 'START' = 'LOAD') => {
      setScenarioAudioProfile(scenarioId);
      if (phase === 'START') {
        playStartGame(scenarioId);
        return;
      }
      const frequencies = buildScenarioTransitionFrequencies(scenarioId, 'LOAD');
      playUiOsc('sine', frequencies[0], 0.13, 0.12);
      setTimeout(() => playUiOsc('sine', frequencies[1], 0.14, 0.11), 70);
      setTimeout(() => playUiOsc('triangle', frequencies[2], 0.16, 0.1), 150);
  }, [playStartGame, setScenarioAudioProfile]);

  const playStateTransitionSfx = useCallback((from: GameState | null, to: GameState) => {
      const frequencies = buildStateTransitionFrequencies(from, to);
      const wave: OscillatorType =
        to === GameState.GAME_OVER ? 'sawtooth' :
        to === GameState.VICTORY ? 'triangle' :
        to === GameState.PAUSED ? 'square' :
        'sine';
      const baseDecay =
        to === GameState.VICTORY ? 0.22 :
        to === GameState.GAME_OVER ? 0.2 :
        0.12;
      const baseVolume =
        to === GameState.VICTORY ? 0.16 :
        to === GameState.GAME_OVER ? 0.15 :
        0.1;

      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          playUiOsc(wave, freq, baseDecay + index * 0.03, Math.max(0.08, baseVolume - index * 0.01));
        }, index * 72);
      });
  }, []);

  const playEventResolutionSfx = useCallback((params: {
      systemId: SystemType;
      success: boolean;
      severity: 1 | 2 | 3;
  }) => {
      initAudio();
      const variation = nextVariation();
      const frequencies = buildEventResultSfxPattern(
        params.systemId,
        params.success,
        params.severity,
        variation
      );
      playToneSequence(frequencies, {
        systemId: params.systemId,
        success: params.success,
        severity: params.severity,
        variation
      });
      const layerPreset = getEventSfxLayerPreset(params.success, params.severity);
      playEventLayers(frequencies[0], layerPreset, params.systemId, variation);
  }, [initAudio]);

  const playEventEscalationSfx = useCallback((params: {
      systemId: SystemType;
      severity: 1 | 2 | 3;
  }) => {
      initAudio();
      if (!audioCtxRef.current || !sfxBusGainRef.current) return;
      const variation = nextVariation();
      const frequencies = buildEscalationSfxPattern(params.systemId, params.severity, variation);
      const start = audioCtxRef.current.currentTime;

      frequencies.forEach((frequency, index) => {
        const osc = audioCtxRef.current!.createOscillator();
        osc.type = 'square';
        const pulseTime = start + (index * 0.09);
        osc.frequency.setValueAtTime(frequency, pulseTime);

        const gain = audioCtxRef.current!.createGain();
        gain.gain.setValueAtTime(0.14 + (params.severity * 0.015), pulseTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + 0.08);

        osc.connect(gain);
        connectSfxNode(gain, params.systemId, variation, index);
        osc.start(pulseTime);
        osc.stop(pulseTime + 0.085);
      });
  }, [initAudio]);

  return {
    playClick,
    playError,
    playSuccess,
    playAlarm,
    playStartGame,
    playScenarioTransitionSfx,
    playStateTransitionSfx,
    playEventResolutionSfx,
    playEventEscalationSfx,
    setAudioBusLevels,
    setGameModeAudioPreset,
    setUserAudioMix,
    setSpatialAudioMode,
    setAdaptiveAudioMix,
    setScenarioAudioProfile,
    startBackgroundLoop,
    stopBackgroundLoop,
    updateBackgroundLoop
  };
};
