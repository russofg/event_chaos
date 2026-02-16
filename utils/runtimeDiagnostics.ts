import { GameStats } from '../types';
import { getFrameIntervalMs, VisualQualityProfile } from './visualPerformance';

export type RuntimeRiskLevel = 'STABLE' | 'WATCH' | 'CRITICAL';

export interface RuntimeDiagnosticsInput {
  stats: Pick<GameStats, 'publicInterest' | 'clientSatisfaction' | 'stress' | 'budget'>;
  activeEvents: number;
  criticalEvents: number;
  warningEvents: number;
  hasBlockingOverlay: boolean;
  mobileCenterHeight?: number;
  visualProfile: Pick<VisualQualityProfile, 'targetFps' | 'maxParticles'>;
}

export interface RuntimeDiagnosticsSnapshot {
  stabilityScore: number;
  riskLevel: RuntimeRiskLevel;
  frameBudgetMs: number;
  issues: string[];
  recommendations: string[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const buildRuntimeDiagnosticsSnapshot = ({
  stats,
  activeEvents,
  criticalEvents,
  warningEvents,
  hasBlockingOverlay,
  mobileCenterHeight,
  visualProfile
}: RuntimeDiagnosticsInput): RuntimeDiagnosticsSnapshot => {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (stats.stress >= 85) {
    score -= 24;
    issues.push('Estrés operativo crítico');
    recommendations.push('Prioriza resolver eventos sin costo alto para bajar presión.');
  } else if (stats.stress >= 70) {
    score -= 14;
    issues.push('Estrés elevado');
  }

  if (stats.clientSatisfaction <= 35) {
    score -= 16;
    issues.push('Satisfacción del cliente en zona de riesgo');
    recommendations.push('Cumple una misión de cliente para recuperar confianza.');
  }

  if (stats.publicInterest <= 35) {
    score -= 12;
    issues.push('Interés del público cayendo');
    recommendations.push('Sostén SOUND/LIGHTS en ventana alta por unos segundos.');
  }

  if (stats.budget <= 800) {
    score -= 16;
    issues.push('Presupuesto de emergencia');
    recommendations.push('Evita opciones costosas y busca cadena de éxitos para comeback.');
  } else if (stats.budget <= 1800) {
    score -= 8;
    issues.push('Presupuesto ajustado');
  }

  if (criticalEvents >= 2) {
    score -= 18;
    issues.push('Múltiples eventos críticos simultáneos');
    recommendations.push('Resuelve primero el evento con mayor prioridad/tiempo límite.');
  } else if (criticalEvents === 1) {
    score -= 10;
    issues.push('Evento crítico activo');
  }

  if (activeEvents >= 4) {
    score -= 10;
    issues.push('Cola de eventos alta');
  }

  if (warningEvents >= 3) {
    score -= 6;
    issues.push('Picos de advertencias tempranas');
  }

  if (hasBlockingOverlay) {
    score -= 4;
  }

  if (typeof mobileCenterHeight === 'number' && Number.isFinite(mobileCenterHeight) && mobileCenterHeight < 320) {
    score -= 8;
    issues.push('HUD móvil con espacio limitado');
    recommendations.push('En móvil compacto, resuelve el evento primario antes de abrir otras capas.');
  }

  if (visualProfile.targetFps <= 28) {
    score -= 8;
    issues.push('Motor visual en modo de contención');
    recommendations.push('Usa modo PERFORMANCE para estabilizar tasa de cuadros.');
  } else if (visualProfile.targetFps <= 34) {
    score -= 4;
  }

  const frameBudgetMs = Number(getFrameIntervalMs(visualProfile.targetFps).toFixed(2));
  const boundedScore = clamp(Math.round(score), 0, 100);

  let riskLevel: RuntimeRiskLevel = 'STABLE';
  if (boundedScore < 45) riskLevel = 'CRITICAL';
  else if (boundedScore < 72) riskLevel = 'WATCH';

  if (riskLevel === 'STABLE' && recommendations.length === 0) {
    recommendations.push('Estado sólido. Mantén la zona segura y prepara recursos para el final.');
  }

  return {
    stabilityScore: boundedScore,
    riskLevel,
    frameBudgetMs,
    issues,
    recommendations
  };
};
