import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Disc } from 'lucide-react';
import { SystemType, SystemState } from '../types';
import { getFrameIntervalMs, getVisualizerTargetFps } from '../utils/visualPerformance';
import type { VisualQualityMode } from '../utils/visualPerformance';
import {
  getGameplayBackgroundAsset,
  getStageAsset,
  getStageScenarioVisualAsset
} from '../utils/artAssets';

interface VisualizerProps {
  systemType: SystemType;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  health: number;
  aiImageUrl?: string | null;
  isAiGenerating?: boolean;
  allSystems?: Record<SystemType, SystemState>;
  publicInterest: number;
  stressLevel?: number;
  isMobile?: boolean;
  qualityMode?: VisualQualityMode;
  reducedMotionOverride?: boolean;
  scenarioId?: string;
}

type StageImageKey =
  | 'bg'
  | 'scenario'
  | 'trussHorizontal'
  | 'trussVertical'
  | 'lineArray'
  | 'movingHead'
  | 'ledFrame';

const imageReady = (image?: HTMLImageElement): image is HTMLImageElement =>
  Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
) => {
  if (!imageReady(image) || width <= 0 || height <= 0) return;

  const srcAspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = width / height;

  let sx = 0;
  let sy = 0;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;

  if (srcAspect > targetAspect) {
    sw = image.naturalHeight * targetAspect;
    sx = (image.naturalWidth - sw) * 0.5;
  } else {
    sh = image.naturalWidth / targetAspect;
    sy = (image.naturalHeight - sh) * 0.5;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  ctx.restore();
};

const drawImageContain = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 1
) => {
  if (!imageReady(image) || width <= 0 || height <= 0) return;

  const srcAspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (srcAspect > targetAspect) {
    drawHeight = width / srcAspect;
  } else {
    drawWidth = height * srcAspect;
  }

  const drawX = x + (width - drawWidth) * 0.5;
  const drawY = y + (height - drawHeight) * 0.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
};

const loadImage = (src: string): HTMLImageElement => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  return image;
};

export const Visualizer: React.FC<VisualizerProps> = ({
  systemType,
  status,
  allSystems,
  publicInterest,
  stressLevel = 0,
  isMobile = false,
  qualityMode = 'AUTO' as VisualQualityMode,
  reducedMotionOverride = false,
  scenarioId = 'NORMAL'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  const lastRenderTimeRef = useRef(0);
  const stageImagesRef = useRef<Partial<Record<StageImageKey, HTMLImageElement>>>({});

  const stageAssetSources = useMemo(
    () => ({
      bg: getGameplayBackgroundAsset(isMobile),
      scenario: getStageScenarioVisualAsset(scenarioId),
      trussHorizontal: getStageAsset('trussHorizontal'),
      trussVertical: getStageAsset('trussVertical'),
      lineArray: getStageAsset('lineArray'),
      movingHead: getStageAsset('movingHead'),
      ledFrame: getStageAsset('ledFrame')
    }),
    [isMobile, scenarioId]
  );

  useEffect(() => {
    const current = stageImagesRef.current;

    (Object.entries(stageAssetSources) as Array<[StageImageKey, string]>).forEach(([key, src]) => {
      const existing = current[key];
      if (existing && (existing as HTMLImageElement & { __src?: string }).__src === src) {
        return;
      }
      const image = loadImage(src) as HTMLImageElement & { __src?: string };
      image.__src = src;
      current[key] = image;
    });
  }, [stageAssetSources]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = (timestamp: number) => {
      const targetFps = getVisualizerTargetFps(isMobile, stressLevel, qualityMode, reducedMotionOverride);
      const minDelta = getFrameIntervalMs(targetFps);
      if (timestamp - lastRenderTimeRef.current >= minDelta) {
        lastRenderTimeRef.current = timestamp;
        setTick((t) => t + 1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isMobile, qualityMode, reducedMotionOverride, stressLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    const W = canvas.width;
    const H = canvas.height;

    const audioSys = allSystems?.[SystemType.SOUND];
    const lightSys = allSystems?.[SystemType.LIGHTS];
    const videoSys = allSystems?.[SystemType.VIDEO];
    const stageSys = allSystems?.[SystemType.STAGE];

    const audioVal = audioSys ? audioSys.faderValue : 50;
    const lightVal = lightSys ? lightSys.faderValue : 50;
    const videoVal = videoSys ? videoSys.faderValue : 50;
    const stageVal = stageSys ? stageSys.faderValue : 50;

    const audioStat = audioSys?.status || 'OK';
    const videoStat = videoSys?.status || 'OK';
    const lightStat = lightSys?.status || 'OK';

    const brightness = clamp(lightVal / 100, 0.1, 1);
    const stageImages = stageImagesRef.current;

    ctx.fillStyle = '#03060d';
    ctx.fillRect(0, 0, W, H);

    if (imageReady(stageImages.bg)) {
      drawImageCover(ctx, stageImages.bg, 0, 0, W, H, 0.42 + brightness * 0.18);
    }

    if (imageReady(stageImages.scenario)) {
      drawImageCover(ctx, stageImages.scenario, W * 0.12, H * 0.18, W * 0.76, H * 0.54, 0.2 + videoVal / 500);
    }

    const roomGradient = ctx.createLinearGradient(0, 0, 0, H);
    roomGradient.addColorStop(0, 'rgba(2, 5, 12, 0.86)');
    roomGradient.addColorStop(0.38, 'rgba(5, 11, 24, 0.5)');
    roomGradient.addColorStop(1, 'rgba(2, 5, 11, 0.96)');
    ctx.fillStyle = roomGradient;
    ctx.fillRect(0, 0, W, H);

    const floorHorizon = H * 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, floorHorizon);
    ctx.lineTo(W, floorHorizon);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.clip();

    const floorGrad = ctx.createLinearGradient(0, floorHorizon, 0, H);
    floorGrad.addColorStop(0, `rgba(15, 25, 42, ${0.2 + stageVal / 420})`);
    floorGrad.addColorStop(1, `rgba(2, 8, 18, ${0.72 + stageVal / 240})`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorHorizon, W, H - floorHorizon);

    ctx.strokeStyle = `rgba(98, 124, 165, ${0.08 + stageVal / 700})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -W; i <= W * 2; i += 54) {
      ctx.moveTo(i, H);
      ctx.lineTo(W * 0.5, floorHorizon);
    }
    for (let y = floorHorizon + 24; y < H; y += 24) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.restore();

    const topTrussY = H * 0.02;
    const topTrussH = clamp(H * 0.11, 34, 72);
    const sideTrussW = clamp(W * 0.06, 26, 52);
    const sideTrussTop = H * 0.04;
    const sideTrussH = H * 0.7;

    if (imageReady(stageImages.trussHorizontal)) {
      drawImageCover(ctx, stageImages.trussHorizontal, W * 0.03, topTrussY, W * 0.94, topTrussH, 0.92);
    } else {
      ctx.strokeStyle = 'rgba(131, 153, 190, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(W * 0.03, topTrussY, W * 0.94, topTrussH);
    }

    if (imageReady(stageImages.trussVertical)) {
      drawImageCover(ctx, stageImages.trussVertical, W * 0.07, sideTrussTop, sideTrussW, sideTrussH, 0.82);
      drawImageCover(ctx, stageImages.trussVertical, W * 0.87, sideTrussTop, sideTrussW, sideTrussH, 0.82);
    }

    const lineArrayW = clamp(W * 0.12, 56, 132);
    const lineArrayH = clamp(H * 0.66, 220, 400);
    const leftLineArrayX = W * 0.11;
    const rightLineArrayX = W * 0.78;
    const lineArrayY = H * 0.1;

    const drawLineArrayWaves = (originX: number, originY: number) => {
      if (audioVal <= 48) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let wave = 0; wave < 3; wave += 1) {
        const waveRadius = ((tick * 3.4) + wave * 34) % 150;
        const waveOpacity = (1 - waveRadius / 150) * (audioVal / 100) * 0.42;
        ctx.strokeStyle = `rgba(126, 214, 255, ${waveOpacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(originX, originY, waveRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawFeedbackRings = (originX: number, originY: number) => {
      if (audioStat !== 'CRITICAL' && audioVal <= 90) return;
      for (let ring = 0; ring < 2; ring += 1) {
        const radius = ((tick * 5) + ring * 55) % 210;
        const opacity = 1 - radius / 210;
        ctx.strokeStyle = ring === 0
          ? `rgba(255, 66, 66, ${opacity * 0.7})`
          : `rgba(255, 170, 56, ${opacity * 0.52})`;
        ctx.lineWidth = ring === 0 ? 3 : 2;
        ctx.beginPath();
        ctx.arc(originX, originY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const drawLineArray = (x: number, mirror = false) => {
      if (imageReady(stageImages.lineArray)) {
        ctx.save();
        if (mirror) {
          ctx.translate(x + lineArrayW, 0);
          ctx.scale(-1, 1);
          drawImageContain(ctx, stageImages.lineArray, 0, lineArrayY, lineArrayW, lineArrayH, 0.95);
        } else {
          drawImageContain(ctx, stageImages.lineArray, x, lineArrayY, lineArrayW, lineArrayH, 0.95);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = '#0e1520';
        ctx.fillRect(x, lineArrayY, lineArrayW, lineArrayH);
      }

      const waveX = x + lineArrayW * 0.52;
      const waveY = lineArrayY + lineArrayH * 0.48;
      drawLineArrayWaves(waveX, waveY);
      drawFeedbackRings(waveX, waveY);
    };

    drawLineArray(leftLineArrayX, false);
    drawLineArray(rightLineArrayX, true);

    const screenW = W * 0.47;
    const screenH = H * 0.33;
    const screenX = (W - screenW) * 0.5;
    const screenY = H * 0.24;
    const vIntensity = clamp(videoVal / 100, 0.1, 1);

    ctx.save();
    ctx.fillStyle = '#040912';
    ctx.fillRect(screenX, screenY, screenW, screenH);

    if (videoStat === 'CRITICAL') {
      const pixelSize = 6;
      for (let r = 0; r < screenH; r += pixelSize) {
        for (let c = 0; c < screenW; c += pixelSize) {
          if (Math.random() > 0.52) {
            const luminance = Math.random() > 0.5 ? 245 : 18;
            ctx.fillStyle = `rgba(${luminance}, ${luminance}, ${luminance}, 0.9)`;
            ctx.fillRect(screenX + c, screenY + r, pixelSize, pixelSize);
          }
        }
      }
    } else {
      if (imageReady(stageImages.scenario)) {
        const offsetX = Math.sin(tick * 0.016) * (screenW * 0.05);
        const offsetY = Math.cos(tick * 0.011) * (screenH * 0.04);
        drawImageCover(
          ctx,
          stageImages.scenario,
          screenX - offsetX,
          screenY - offsetY,
          screenW + Math.abs(offsetX) * 2,
          screenH + Math.abs(offsetY) * 2,
          0.85
        );
      }

      const ledTint = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
      ledTint.addColorStop(0, `rgba(23, 118, 180, ${0.18 + vIntensity * 0.2})`);
      ledTint.addColorStop(0.5, `rgba(45, 220, 210, ${0.14 + vIntensity * 0.16})`);
      ledTint.addColorStop(1, `rgba(14, 42, 88, ${0.22 + vIntensity * 0.2})`);
      ctx.fillStyle = ledTint;
      ctx.fillRect(screenX, screenY, screenW, screenH);

      const scanStep = isMobile ? 5 : 4;
      ctx.strokeStyle = `rgba(158, 223, 255, ${0.08 + vIntensity * 0.14})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = screenY + 1; y < screenY + screenH; y += scanStep) {
        ctx.moveTo(screenX + 2, y);
        ctx.lineTo(screenX + screenW - 2, y);
      }
      ctx.stroke();

      if (!reducedMotionOverride) {
        const eqBars = isMobile ? 10 : 16;
        const barW = screenW / (eqBars * 1.3);
        for (let i = 0; i < eqBars; i += 1) {
          const baseX = screenX + 18 + i * barW * 1.3;
          const amplitude = (Math.sin((tick * 0.08) + i * 0.7) + 1) * 0.5;
          const barH = 8 + amplitude * (screenH * 0.32) * vIntensity;
          ctx.fillStyle = `rgba(${90 + i * 8}, ${220 - i * 5}, 255, ${0.16 + vIntensity * 0.32})`;
          ctx.fillRect(baseX, screenY + screenH - 14 - barH, barW, barH);
        }
      }
    }
    ctx.restore();

    if (imageReady(stageImages.ledFrame)) {
      drawImageCover(ctx, stageImages.ledFrame, screenX - 10, screenY - 10, screenW + 20, screenH + 20, 0.95);
    } else {
      ctx.strokeStyle = 'rgba(106, 176, 226, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 4, screenY - 4, screenW + 8, screenH + 8);
    }

    if (lightStat !== 'CRITICAL' && lightVal > 5) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const lIntensity = clamp(lightVal / 100, 0.08, 1);
      const fixtureY = topTrussY + topTrussH * 0.55;
      const fixtureCount = isMobile ? 3 : 5;
      const fixtureSpacing = W * (isMobile ? 0.23 : 0.15);
      const firstFixtureX = W * (isMobile ? 0.27 : 0.2);
      const fixtureW = clamp(W * 0.05, 26, 42);
      const fixtureH = fixtureW * 0.95;

      const drawBeam = (
        originX: number,
        originY: number,
        angle: number,
        colorHue: number,
        isStrobe = false
      ) => {
        if (isStrobe && lightVal > 82 && Math.floor(tick / 4) % 2 === 0) return;

        const beamLen = H * 1.25;
        const beamW = 28 + stageVal / 4;
        const endX = originX + Math.sin(angle) * beamLen;
        const endY = originY + Math.cos(angle) * beamLen;

        const beamGradient = ctx.createLinearGradient(originX, originY, endX, endY);
        beamGradient.addColorStop(0, `hsla(${colorHue}, 100%, 84%, ${0.8 * lIntensity})`);
        beamGradient.addColorStop(0.25, `hsla(${colorHue}, 100%, 65%, ${0.55 * lIntensity})`);
        beamGradient.addColorStop(0.62, `hsla(${colorHue}, 100%, 45%, ${0.25 * lIntensity})`);
        beamGradient.addColorStop(1, `hsla(${colorHue}, 100%, 35%, 0)`);

        ctx.fillStyle = beamGradient;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(endX - beamW, endY);
        ctx.lineTo(endX + beamW, endY);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${colorHue}, 100%, 82%, 0.75)`;
        ctx.fillStyle = 'rgba(240, 250, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(originX, originY, 4 + 3 * lIntensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      for (let i = 0; i < fixtureCount; i += 1) {
        const fixtureX = firstFixtureX + i * fixtureSpacing;
        const baseAngle = Math.sin(tick * (0.016 + i * 0.002) + i * 0.9) * 0.75;
        const hue = (tick * 1.8 + i * 64) % 360;

        if (imageReady(stageImages.movingHead)) {
          drawImageContain(ctx, stageImages.movingHead, fixtureX - fixtureW / 2, fixtureY - fixtureH * 0.65, fixtureW, fixtureH, 0.94);
        }

        drawBeam(fixtureX, fixtureY + 2, baseAngle, hue);

        if (!isMobile && lightVal > 84) {
          drawBeam(fixtureX, fixtureY + 2, baseAngle + 0.22, (hue + 42) % 360, true);
        }
      }

      ctx.restore();
    }

    const crowdY = H;
    const crowdHeight = H * 0.25;
    const personSpacing = isMobile ? 14 : 11;
    const personCount = Math.floor(W / personSpacing);

    for (let i = 0; i < personCount; i += 1) {
      const x = (i / personCount) * W;
      const personSeed = i * 1000;
      const personPhase = tick * 0.15 + personSeed * 0.01;

      let moodOffset = 0;
      let jump = 0;
      let personSize = 7;

      if (publicInterest < 30) {
        moodOffset = 24;
        personSize = 6;
      } else if (publicInterest > 80) {
        jump = Math.sin(personPhase) * (audioVal / 5.4) * 1.7;
        personSize = 9;
      } else {
        jump = Math.sin(personPhase) * (audioVal / 9);
      }

      let riotX = 0;
      if (publicInterest < 10) {
        riotX = Math.sin(personPhase * 2) * 7;
      }

      const headY = crowdY - crowdHeight * 0.6 + moodOffset - jump;
      ctx.fillStyle = publicInterest > 70 ? '#101721' : '#060b14';
      ctx.beginPath();
      ctx.arc(x + riotX, headY, personSize, 0, Math.PI * 2);
      ctx.fill();

      if (jump > 4.5) {
        ctx.strokeStyle = '#1a2433';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + riotX - personSize, headY);
        ctx.lineTo(x + riotX - personSize * 1.45, headY - personSize * 0.75);
        ctx.moveTo(x + riotX + personSize, headY);
        ctx.lineTo(x + riotX + personSize * 1.45, headY - personSize * 0.75);
        ctx.stroke();
      }
    }

    if (publicInterest < 20 && Math.random() > 0.93) {
      ctx.fillStyle = '#dce7ff';
      const px = Math.random() * W;
      const py = H - Math.random() * 150;
      ctx.beginPath();
      ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (publicInterest > 60 && Math.random() > 0.7) {
      const phoneX = Math.random() * W;
      const phoneY = crowdY - crowdHeight * 0.5 - Math.random() * 30;
      ctx.fillStyle = 'rgba(238, 248, 255, 0.85)';
      ctx.fillRect(phoneX - 1, phoneY - 2, 2, 4);
    }

    if (publicInterest > 20) {
      const stageCenterX = W * 0.5;
      const stageY = H * 0.52;

      const artistMovement = Math.sin(tick * 0.1) * 3;
      ctx.fillStyle = '#090f18';
      ctx.beginPath();
      ctx.arc(stageCenterX + artistMovement, stageY, 15, 0, Math.PI * 2);
      ctx.fill();

      if (audioVal > 60) {
        ctx.strokeStyle = '#172132';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(stageCenterX + artistMovement - 10, stageY - 5);
        ctx.lineTo(stageCenterX + artistMovement - 25, stageY - 20);
        ctx.stroke();
      }

      if (publicInterest > 60) {
        const sideMovement = Math.sin(tick * 0.12 + 1) * 2;
        ctx.beginPath();
        ctx.arc(stageCenterX - 80 + sideMovement, stageY + 5, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const fogDensity = stageVal / 100;
    if (fogDensity > 0.1) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(172, 208, 255, ${fogDensity * 0.12})`;
      ctx.fillRect(0, 0, W, H);

      if (!reducedMotionOverride) {
        const particleCount = isMobile ? 12 : 20;
        for (let i = 0; i < particleCount; i += 1) {
          const particleX = (tick * 0.45 + i * 55) % W;
          const particleY = H * 0.4 + Math.sin(tick * 0.05 + i) * 22;
          const particleSize = 2 + Math.random() * 3.4;
          ctx.fillStyle = `rgba(230, 244, 255, ${fogDensity * 0.3})`;
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'source-over';
    }
  }, [
    allSystems,
    isMobile,
    qualityMode,
    reducedMotionOverride,
    scenarioId,
    status,
    stressLevel,
    systemType,
    publicInterest,
    stageAssetSources,
    tick
  ]);

  const renderTechData = () => (
    <div className="absolute top-4 right-4 z-20 text-right font-mono text-[9px] text-cyan-500/80 bg-black/60 p-2 border border-cyan-900/50 rounded backdrop-blur-sm pointer-events-none">
      <div className="mb-1 border-b border-cyan-900/50 pb-1 flex justify-end items-center gap-1">
        <Disc className={`w-3 h-3 ${tick % 20 < 10 ? 'animate-spin' : ''}`} />
        CAM_01_FEED
      </div>
      {status === 'CRITICAL' && <div className="text-red-500 font-bold blink">ERROR DETECTED</div>}
      <div>LUX: {Math.round((allSystems?.[SystemType.LIGHTS].faderValue || 0) * 8.5)}</div>
      <div>DB: {Math.round(80 + (allSystems?.[SystemType.SOUND].faderValue || 0) * 0.4)}</div>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#050505] rounded-lg overflow-hidden border border-slate-700 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] group">
      <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full block" />

      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 pointer-events-none z-20" />

      {renderTechData()}

      {status === 'CRITICAL' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="border-4 border-red-500 bg-red-900/80 p-4 animate-pulse rotate-[-10deg]">
            <div className="text-white font-black text-3xl">NO SIGNAL</div>
          </div>
        </div>
      )}
    </div>
  );
};
