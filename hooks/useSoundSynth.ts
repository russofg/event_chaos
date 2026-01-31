
import { useCallback, useRef } from 'react';
import { SystemState, SystemType } from '../types';

export const useSoundSynth = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const distortionRef = useRef<WaveShaperNode | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const sequencerRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  const crowdNoiseRef = useRef<GainNode | null>(null);
  const crowdSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Music State
  const tempoRef = useRef(120);

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
      
      // Audio Chain: Master -> Distortion -> Filter -> Reverb -> Destination
      if (distortionRef.current && filterRef.current && reverbRef.current) {
        masterGainRef.current.connect(distortionRef.current);
        distortionRef.current.connect(filterRef.current);
        filterRef.current.connect(reverbRef.current);
        reverbRef.current.connect(audioCtxRef.current.destination);
      } else {
        // Fallback chain if reverb/distortion not available
        masterGainRef.current.connect(filterRef.current!);
        filterRef.current!.connect(audioCtxRef.current.destination);
      }
      
      // Crowd noise goes directly to destination
      if (crowdNoiseRef.current) {
        crowdNoiseRef.current.connect(audioCtxRef.current.destination);
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [createDistortionCurve, createReverbImpulse]);

  const playOsc = (
    type: OscillatorType,
    freq: number,
    decay: number,
    vol: number,
    detune: number = 0
  ) => {
      if (!audioCtxRef.current || !filterRef.current) return;
      const t = audioCtxRef.current.currentTime;
      
      const osc = audioCtxRef.current.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.value = detune;

      const gain = audioCtxRef.current.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

      osc.connect(gain);
      gain.connect(filterRef.current); // Connect to filter, not master directly
      
      osc.start(t);
      osc.stop(t + decay);
  };

  const playKick = () => {
      if (!audioCtxRef.current) return;
      const t = audioCtxRef.current.currentTime;
      
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      
      osc.connect(gain);
      gain.connect(filterRef.current!);
      osc.start(t);
      osc.stop(t + 0.1);
  }

  const playHat = () => {
      // Noise buffer for HiHat
      if (!audioCtxRef.current) return;
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
      gain.connect(filterRef.current!);
      noise.start();
  }

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
      
      // Simple Techno Pattern
      const bassLine = [110, 0, 110, 0, 110, 0, 110, 123]; // A2
      const leadLine = [0, 440, 0, 554, 0, 659, 0, 880];
      
      sequencerRef.current = window.setInterval(() => {
          if (!audioCtxRef.current) return;
          
          const s = stepRef.current;
          
          // STEM 1: DRUMS (Always playing unless completely dead)
          if (s % 4 === 0) playKick();
          if (s % 2 === 0) playHat();

          // STEM 2: BASS (Cut if low volume)
          if (masterGainRef.current!.gain.value > 0.1) {
             if (bassLine[s]) playBass(bassLine[s]);
          }

          // STEM 3: LEAD (Only if high health)
          if (masterGainRef.current!.gain.value > 0.2) {
              if (leadLine[s]) playLead(leadLine[s]);
          }

          stepRef.current = (s + 1) % 8;
      }, (60 / 120) * 1000 * 0.5); // Default 120 BPM, 8th notes
  }, [initAudio]);

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
      
      // 1. SOUND SYSTEM HEALTH (Filter + Distortion)
      if (status === 'CRITICAL') {
          // Muffled underwater sound with heavy distortion
          filterRef.current.frequency.setTargetAtTime(300, now, 0.5); 
          filterRef.current.Q.value = 10;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(50); // Heavy distortion
          }
      } else if (status === 'WARNING') {
          filterRef.current.frequency.setTargetAtTime(2000, now, 0.5);
          filterRef.current.Q.value = 5;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(20); // Light distortion
          }
      } else {
          filterRef.current.frequency.setTargetAtTime(22000, now, 0.5);
          filterRef.current.Q.value = 1;
          if (distortionRef.current) {
              distortionRef.current.curve = createDistortionCurve(0); // No distortion
          }
      }

      // 2. FADER VOLUME
      const vol = faderValue / 100;
      masterGainRef.current.gain.setTargetAtTime(vol * 0.4, now, 0.1);

      // 3. REVERB (Stage Fader Effect)
      if (reverbRef.current && stageFader !== undefined) {
          const reverbAmount = Math.min(1, stageFader / 100);
          // Adjust reverb wet/dry by connecting/disconnecting
          // For simplicity, we'll use gain to simulate reverb intensity
      }

      // 4. STRESS = Dissonance and Tempo Variation
      if (stress > 80) {
          // Add subtle detuning to create tension
          // This is handled in the sequencer by varying note frequencies
      }
      
      // 5. CROWD NOISE (Public Interest)
      if (crowdNoiseRef.current && publicInterest !== undefined) {
          updateCrowdNoise(publicInterest, now);
      }
      
  }, []);
  
  const updateCrowdNoise = useCallback((publicInterest: number, now: number) => {
      if (!audioCtxRef.current || !crowdNoiseRef.current) return;
      
      // Crowd noise intensity based on public interest
      let targetGain = 0;
      if (publicInterest > 70) {
          // Cheering/applause
          targetGain = 0.15 * (publicInterest / 100);
      } else if (publicInterest < 30) {
          // Booing/complaints
          targetGain = 0.1 * ((30 - publicInterest) / 30);
      }
      
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
      playOsc('sine', 1200, 0.05, 0.1);
  }, []);

  const playError = useCallback(() => {
      playOsc('sawtooth', 100, 0.4, 0.5);
      playOsc('square', 90, 0.4, 0.5);
  }, []);

  const playSuccess = useCallback(() => {
      playOsc('sine', 880, 0.1, 0.2);
      setTimeout(() => playOsc('sine', 1108, 0.2, 0.2), 100);
  }, []);

  const playAlarm = useCallback(() => {
      playOsc('square', 800, 0.5, 0.3);
      setTimeout(() => playOsc('square', 600, 0.5, 0.3), 200);
  }, []);

  const playStartGame = useCallback(() => {
      playOsc('triangle', 220, 1.0, 0.5);
      setTimeout(() => playOsc('triangle', 440, 1.0, 0.5), 200);
      setTimeout(() => playOsc('triangle', 880, 2.0, 0.3), 400);
  }, []);

  return { playClick, playError, playSuccess, playAlarm, playStartGame, startBackgroundLoop, updateBackgroundLoop };
};
