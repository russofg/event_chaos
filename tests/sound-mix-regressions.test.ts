import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUDIO_BUS_LEVELS,
  buildScenarioTransitionFrequencies,
  buildStateTransitionFrequencies,
  buildEscalationSfxPattern,
  buildEventResultSfxPattern,
  getEventSfxLayerPreset,
  getAdaptiveAudioBusMultipliers,
  getAudioSpatialProfile,
  getAudioPresetForMode,
  getCrowdNoiseTarget,
  getSystemSpatialPan,
  getMasterGainTarget,
  getScenarioAudioProfile,
  getReverbWetTarget,
  normalizeUserAudioMix,
  normalizeAudioBusLevels
} from '../hooks/useSoundSynth';
import { GameMode, SystemType } from '../types';
import { GameState } from '../types';

describe('Sound Mix Regressions', () => {
  it('reduces master gain under warning/critical conditions and high stress', () => {
    const healthy = getMasterGainTarget(80, 'OK', 10);
    const warning = getMasterGainTarget(80, 'WARNING', 10);
    const critical = getMasterGainTarget(80, 'CRITICAL', 10);
    const stressed = getMasterGainTarget(80, 'OK', 95);

    expect(healthy).toBeGreaterThan(warning);
    expect(warning).toBeGreaterThan(critical);
    expect(healthy).toBeGreaterThan(stressed);
  });

  it('keeps reverb wet mix in safe bounds while reacting to stage and stress', () => {
    const low = getReverbWetTarget(10, 10);
    const medium = getReverbWetTarget(50, 40);
    const high = getReverbWetTarget(100, 95);

    expect(low).toBeGreaterThanOrEqual(0.06);
    expect(high).toBeLessThanOrEqual(0.72);
    expect(medium).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(medium);
  });

  it('maps crowd gain to cheering/booing states', () => {
    expect(getCrowdNoiseTarget(85)).toBeGreaterThan(0);
    expect(getCrowdNoiseTarget(20)).toBeGreaterThan(0);
    expect(getCrowdNoiseTarget(50)).toBe(0);
    expect(getCrowdNoiseTarget(100)).toBeGreaterThan(getCrowdNoiseTarget(85));
  });

  it('builds per-system event result patterns with different tonal profiles', () => {
    const soundSuccess = buildEventResultSfxPattern(SystemType.SOUND, true, 2, 1);
    const lightsFailure = buildEventResultSfxPattern(SystemType.LIGHTS, false, 2, 1);

    expect(soundSuccess.length).toBe(3);
    expect(lightsFailure.length).toBe(3);
    expect(soundSuccess[0]).toBeLessThan(soundSuccess[1]);
    expect(soundSuccess[1]).toBeLessThan(soundSuccess[2]);
    expect(lightsFailure[0]).toBeGreaterThan(lightsFailure[2]);
    expect(soundSuccess[0]).not.toBe(lightsFailure[0]);
  });

  it('scales escalation pulse count by severity', () => {
    const low = buildEscalationSfxPattern(SystemType.VIDEO, 1, 0);
    const high = buildEscalationSfxPattern(SystemType.VIDEO, 3, 0);

    expect(low.length).toBe(2);
    expect(high.length).toBe(4);
    expect(high[0]).toBeGreaterThan(0);
  });

  it('uses scenario-specific profiles and falls back to NORMAL', () => {
    const tutorial = getScenarioAudioProfile('TUTORIAL');
    const blackout = getScenarioAudioProfile('BLACKOUT_PROTOCOL');
    const fallback = getScenarioAudioProfile('UNKNOWN_SCENARIO');

    expect(tutorial.tempo).toBeLessThan(blackout.tempo);
    expect(tutorial.id).toBe('TUTORIAL');
    expect(blackout.id).toBe('BLACKOUT_PROTOCOL');
    expect(fallback.id).toBe('NORMAL');
  });

  it('builds transition frequencies from profile roots', () => {
    const load = buildScenarioTransitionFrequencies('ARENA', 'LOAD');
    const start = buildScenarioTransitionFrequencies('ARENA', 'START');

    expect(load.length).toBe(3);
    expect(start.length).toBe(3);
    expect(load[0]).toBeLessThan(load[1]);
    expect(start[2]).toBeGreaterThan(start[1]);
    expect(start[0]).not.toBe(load[0]);
  });

  it('maps state transition frequencies for pause/resume/victory/fail flows', () => {
    const pause = buildStateTransitionFrequencies(GameState.PLAYING, GameState.PAUSED);
    const resume = buildStateTransitionFrequencies(GameState.PAUSED, GameState.PLAYING);
    const victory = buildStateTransitionFrequencies(GameState.PLAYING, GameState.VICTORY);
    const fail = buildStateTransitionFrequencies(GameState.PLAYING, GameState.GAME_OVER);

    expect(pause.length).toBe(2);
    expect(resume.length).toBe(3);
    expect(victory[0]).toBeGreaterThan(fail[0]);
    expect(resume[2]).toBeGreaterThan(resume[1]);
  });

  it('normalizes and clamps audio bus levels', () => {
    const normalized = normalizeAudioBusLevels({
      music: 2,
      sfx: -1,
      ui: 0.8,
      crowd: 1.25
    });

    expect(normalized).toEqual({
      music: 1.4,
      sfx: 0,
      ui: 0.8,
      crowd: 1.25
    });

    expect(normalizeAudioBusLevels({}, DEFAULT_AUDIO_BUS_LEVELS)).toEqual(DEFAULT_AUDIO_BUS_LEVELS);
  });

  it('exposes different audio presets by game mode', () => {
    const normal = getAudioPresetForMode(GameMode.NORMAL);
    const hardcore = getAudioPresetForMode(GameMode.HARDCORE);
    const speedrun = getAudioPresetForMode(GameMode.SPEEDRUN);

    expect(hardcore.sfx).toBeGreaterThan(normal.sfx);
    expect(hardcore.music).toBeLessThan(normal.music);
    expect(speedrun.music).toBeGreaterThan(normal.music);
  });

  it('applies adaptive crisis ducking while playing', () => {
    const calm = getAdaptiveAudioBusMultipliers({
      isPlaying: true,
      criticalEvents: 0,
      warningEvents: 0,
      stress: 10,
      overlaysActive: false
    });
    const crisis = getAdaptiveAudioBusMultipliers({
      isPlaying: true,
      criticalEvents: 2,
      warningEvents: 1,
      stress: 92,
      overlaysActive: true
    });

    expect(crisis.music).toBeLessThan(calm.music);
    expect(crisis.sfx).toBeGreaterThan(calm.sfx);
    expect(crisis.ui).toBeGreaterThan(calm.ui);
    expect(crisis.crowd).toBeLessThan(calm.crowd);
  });

  it('keeps neutral adaptive multipliers outside active gameplay', () => {
    expect(getAdaptiveAudioBusMultipliers({
      isPlaying: false,
      criticalEvents: 3,
      warningEvents: 4,
      stress: 100,
      overlaysActive: true
    })).toEqual({
      music: 1,
      sfx: 1,
      ui: 1,
      crowd: 1
    });
  });

  it('builds layered event presets by outcome and severity', () => {
    const successLow = getEventSfxLayerPreset(true, 1);
    const successHigh = getEventSfxLayerPreset(true, 3);
    const failLow = getEventSfxLayerPreset(false, 1);
    const failHigh = getEventSfxLayerPreset(false, 3);

    expect(successHigh.layers.length).toBeGreaterThan(successLow.layers.length);
    expect(failHigh.layers.length).toBeGreaterThan(failLow.layers.length);
    expect(failLow.noiseIntensity).toBeGreaterThan(0);
    expect(failHigh.noiseIntensity).toBeGreaterThan(failLow.noiseIntensity);
    expect(successLow.noiseIntensity).toBeLessThanOrEqual(successHigh.noiseIntensity);
  });

  it('normalizes user audio mix and clamps to safe limits', () => {
    const normalized = normalizeUserAudioMix({
      master: 2,
      music: -0.2,
      sfx: 0.8,
      ui: 1.6
    });

    expect(normalized).toEqual({
      master: 1.4,
      music: 0,
      sfx: 0.8,
      ui: 1.4,
      crowd: 1
    });
  });

  it('applies wider panning in cinematic spatial mode than focus mode', () => {
    const cinematic = getSystemSpatialPan(SystemType.LIGHTS, 'CINEMATIC', 3, 1);
    const focus = getSystemSpatialPan(SystemType.LIGHTS, 'FOCUS', 3, 1);
    const balanced = getSystemSpatialPan(SystemType.LIGHTS, 'BALANCED', 3, 1);

    expect(Math.abs(cinematic)).toBeGreaterThan(Math.abs(balanced));
    expect(Math.abs(balanced)).toBeGreaterThan(Math.abs(focus));
    expect(getAudioSpatialProfile('FOCUS').width).toBeLessThan(getAudioSpatialProfile('CINEMATIC').width);
  });
});
