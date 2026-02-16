import React from 'react';
import { X, SlidersHorizontal, AudioLines, Eye, Gauge, ShieldAlert } from 'lucide-react';
import type { VisualQualityMode } from '../utils/visualPerformance';
import type { AudioSpatialMode, UserAudioMix } from '../hooks/useSoundSynth';

interface RuntimeDiagnosticsView {
  stabilityScore: number;
  riskLevel: 'STABLE' | 'WATCH' | 'CRITICAL';
  frameBudgetMs: number;
  issues: string[];
  recommendations: string[];
}

interface GameSettingsPanelProps {
  onClose: () => void;
  visualQualityMode: VisualQualityMode;
  onVisualQualityChange: (mode: VisualQualityMode) => void;
  audioSpatialMode: AudioSpatialMode;
  onAudioSpatialModeChange: (mode: AudioSpatialMode) => void;
  audioMix: UserAudioMix;
  onAudioMixChange: (mix: Partial<UserAudioMix>) => void;
  reducedMotion: boolean;
  onReducedMotionChange: (enabled: boolean) => void;
  highContrastUi: boolean;
  onHighContrastUiChange: (enabled: boolean) => void;
  onReset: () => void;
  runtimeDiagnostics?: RuntimeDiagnosticsView;
}

const QUALITY_OPTIONS: VisualQualityMode[] = ['AUTO', 'PERFORMANCE', 'CINEMATIC'];
const SPATIAL_OPTIONS: AudioSpatialMode[] = ['BALANCED', 'CINEMATIC', 'FOCUS'];

const SliderRow: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, value, min = 0, max = 1.4, step = 0.05, onChange }) => {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-300">
        <span>{label}</span>
        <span className="text-cyan-300">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-500"
      />
    </label>
  );
};

const OptionPills = <T extends string>({
  options,
  current,
  onSelect
}: {
  options: T[];
  current: T;
  onSelect: (value: T) => void;
}) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={`px-2 py-2 border rounded text-[10px] font-mono uppercase tracking-widest transition-colors ${
            current === option
              ? 'border-cyan-500 bg-cyan-900/30 text-cyan-200'
              : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export const GameSettingsPanel: React.FC<GameSettingsPanelProps> = ({
  onClose,
  visualQualityMode,
  onVisualQualityChange,
  audioSpatialMode,
  onAudioSpatialModeChange,
  audioMix,
  onAudioMixChange,
  reducedMotion,
  onReducedMotionChange,
  highContrastUi,
  onHighContrastUiChange,
  onReset,
  runtimeDiagnostics
}) => {
  const runtimeToneClass = runtimeDiagnostics?.riskLevel === 'CRITICAL'
    ? 'text-red-300 border-red-500/50 bg-red-950/40'
    : runtimeDiagnostics?.riskLevel === 'WATCH'
      ? 'text-amber-200 border-amber-500/50 bg-amber-950/40'
      : 'text-emerald-200 border-emerald-500/45 bg-emerald-950/35';

  return (
    <div className="absolute inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/95">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-[0.2em] text-slate-100 uppercase">Ajustes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-slate-300">
              <Eye className="w-4 h-4 text-cyan-400" />
              Visual
            </div>
            <OptionPills options={QUALITY_OPTIONS} current={visualQualityMode} onSelect={onVisualQualityChange} />
            <label className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
              <span>Reducir animaciones</span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => onReducedMotionChange(event.target.checked)}
                className="accent-cyan-500"
              />
            </label>
            <label className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200">
              <span>Mayor contraste HUD</span>
              <input
                type="checkbox"
                checked={highContrastUi}
                onChange={(event) => onHighContrastUiChange(event.target.checked)}
                className="accent-cyan-500"
              />
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-slate-300">
              <AudioLines className="w-4 h-4 text-cyan-400" />
              Audio
            </div>
            <OptionPills options={SPATIAL_OPTIONS} current={audioSpatialMode} onSelect={onAudioSpatialModeChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SliderRow label="Master" value={audioMix.master} onChange={(value) => onAudioMixChange({ master: value })} />
              <SliderRow label="Music" value={audioMix.music} onChange={(value) => onAudioMixChange({ music: value })} />
              <SliderRow label="SFX" value={audioMix.sfx} onChange={(value) => onAudioMixChange({ sfx: value })} />
              <SliderRow label="UI" value={audioMix.ui} onChange={(value) => onAudioMixChange({ ui: value })} />
              <div className="md:col-span-2">
                <SliderRow label="Crowd" value={audioMix.crowd} onChange={(value) => onAudioMixChange({ crowd: value })} />
              </div>
            </div>
          </section>

          {runtimeDiagnostics && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-slate-300">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Motor Runtime
              </div>
              <div className={`rounded border p-3 ${runtimeToneClass}`}>
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider">
                  <span>Estabilidad</span>
                  <span>{runtimeDiagnostics.stabilityScore}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-200">
                  <span>Riesgo: {runtimeDiagnostics.riskLevel}</span>
                  <span>Frame budget: {runtimeDiagnostics.frameBudgetMs}ms</span>
                </div>
              </div>

              {runtimeDiagnostics.issues.length > 0 && (
                <div className="rounded border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    Riesgos detectados
                  </div>
                  {runtimeDiagnostics.issues.slice(0, 3).map((issue, index) => (
                    <div key={`${issue}-${index}`} className="text-[11px] text-slate-300">
                      - {issue}
                    </div>
                  ))}
                </div>
              )}

              {runtimeDiagnostics.recommendations.length > 0 && (
                <div className="rounded border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300">Recomendaciones</div>
                  {runtimeDiagnostics.recommendations.slice(0, 2).map((recommendation, index) => (
                    <div key={`${recommendation}-${index}`} className="text-[11px] text-slate-300">
                      - {recommendation}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-950/95">
          <button
            onClick={onReset}
            className="px-3 py-2 rounded border border-amber-700 bg-amber-950/30 text-amber-300 text-xs font-mono uppercase tracking-wider hover:bg-amber-900/30"
          >
            Reset Ajustes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-cyan-700 bg-cyan-950/30 text-cyan-200 text-xs font-mono uppercase tracking-wider hover:bg-cyan-900/30"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
