import React, { useRef, useEffect } from 'react';
import { getFrameIntervalMs, getFxRenderPlan, getVisualQualityProfile } from '../utils/visualPerformance';
import type { VisualQualityMode } from '../utils/visualPerformance';

interface FXCanvasProps {
  stressLevel: number;
  triggerExplosion?: boolean; // Toggle to trigger a burst
  isMobile?: boolean;
  activeEvents?: number;
  criticalEvents?: number;
  qualityMode?: VisualQualityMode;
  reducedMotionOverride?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const FXCanvas: React.FC<FXCanvasProps> = ({
  stressLevel,
  triggerExplosion,
  isMobile = false,
  activeEvents = 0,
  criticalEvents = 0,
  qualityMode = 'AUTO' as VisualQualityMode,
  reducedMotionOverride = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const lastRenderTimeRef = useRef(0);
  const timeRef = useRef<number>(0);
  const stressRef = useRef(stressLevel);
  const activeEventsRef = useRef(activeEvents);
  const criticalEventsRef = useRef(criticalEvents);
  const flashRef = useRef(0);
  const viewportRef = useRef({ width: 0, height: 0 });
  const prefersReducedMotionRef = useRef(reducedMotionOverride);
  const isPageVisibleRef = useRef(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );
  const appliedDprCapRef = useRef(1);
  const qualityRef = useRef(getVisualQualityProfile({
    isMobile,
    stressLevel,
    activeEvents,
    criticalEvents,
    qualityMode
  }));
  const frameIntervalRef = useRef(getFrameIntervalMs(qualityRef.current.targetFps));

  useEffect(() => {
    stressRef.current = stressLevel;
  }, [stressLevel]);

  useEffect(() => {
    activeEventsRef.current = activeEvents;
  }, [activeEvents]);

  useEffect(() => {
    criticalEventsRef.current = criticalEvents;
  }, [criticalEvents]);

  useEffect(() => {
    const mediaPrefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersReducedMotion = reducedMotionOverride || mediaPrefersReducedMotion;
    prefersReducedMotionRef.current = prefersReducedMotion;
    const deviceMemoryGb =
      typeof navigator !== 'undefined' && typeof (navigator as any).deviceMemory === 'number'
        ? (navigator as any).deviceMemory
        : 8;
    const hardwareConcurrency =
      typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
        ? navigator.hardwareConcurrency
        : 8;

    const profile = getVisualQualityProfile({
      isMobile,
      stressLevel: stressRef.current,
      activeEvents: activeEventsRef.current,
      criticalEvents: criticalEventsRef.current,
      qualityMode,
      prefersReducedMotion,
      deviceMemoryGb,
      hardwareConcurrency
    });
    qualityRef.current = profile;
    frameIntervalRef.current = getFrameIntervalMs(profile.targetFps);
  }, [isMobile, stressLevel, activeEvents, criticalEvents, qualityMode, reducedMotionOverride]);

  // Trigger explosion when prop changes
  useEffect(() => {
    if (triggerExplosion) {
      if (typeof window !== 'undefined') {
        spawnExplosion(window.innerWidth / 2, window.innerHeight / 2, 30);
      }
      flashRef.current = 1;
    }
  }, [triggerExplosion]);

  const spawnExplosion = (x: number, y: number, count: number) => {
    const maxParticles = qualityRef.current.maxParticles;
    const freeSlots = Math.max(0, maxParticles - particlesRef.current.length);
    if (freeSlots === 0) return;

    const spawnCount = Math.min(count, Math.max(8, freeSlots));
    const colors = ['#22d3ee', '#ffffff', '#ef4444', '#f59e0b'];
    for (let i = 0; i < spawnCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 1
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const applyResolution = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      viewportRef.current = { width: viewportWidth, height: viewportHeight };

      const plan = getFxRenderPlan({
        profile: qualityRef.current,
        isMobile,
        stressLevel: stressRef.current,
        activeEvents: activeEventsRef.current,
        criticalEvents: criticalEventsRef.current,
        prefersReducedMotion: prefersReducedMotionRef.current,
        isPageVisible: isPageVisibleRef.current
      });
      const devicePixelRatio = window.devicePixelRatio || 1;
      const effectiveDpr = Math.min(devicePixelRatio, plan.dprCap);
      appliedDprCapRef.current = plan.dprCap;

      canvas.width = Math.max(1, Math.round(viewportWidth * effectiveDpr));
      canvas.height = Math.max(1, Math.round(viewportHeight * effectiveDpr));
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      ctx.setTransform(effectiveDpr, 0, 0, effectiveDpr, 0, 0);
    };
    window.addEventListener('resize', applyResolution);
    applyResolution();

    const onVisibilityChange = () => {
      isPageVisibleRef.current = document.visibilityState !== 'hidden';
      if (isPageVisibleRef.current) {
        lastRenderTimeRef.current = performance.now();
        applyResolution();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    const render = (timestamp: number) => {
      const minFrameDelta = frameIntervalRef.current;
      if (timestamp - lastRenderTimeRef.current < minFrameDelta) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTimeRef.current = timestamp;
      timeRef.current += 1;
      const quality = qualityRef.current;
      const currentStress = stressRef.current;
      let renderPlan = getFxRenderPlan({
        profile: quality,
        isMobile,
        stressLevel: currentStress,
        activeEvents: activeEventsRef.current,
        criticalEvents: criticalEventsRef.current,
        prefersReducedMotion: prefersReducedMotionRef.current,
        isPageVisible: isPageVisibleRef.current
      });

      if (Math.abs(appliedDprCapRef.current - renderPlan.dprCap) > 0.01) {
        applyResolution();
        renderPlan = getFxRenderPlan({
          profile: quality,
          isMobile,
          stressLevel: currentStress,
          activeEvents: activeEventsRef.current,
          criticalEvents: criticalEventsRef.current,
          prefersReducedMotion: prefersReducedMotionRef.current,
          isPageVisible: isPageVisibleRef.current
        });
      }

      if (!renderPlan.shouldRender) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      const viewportWidth = viewportRef.current.width || window.innerWidth;
      const viewportHeight = viewportRef.current.height || window.innerHeight;
      const reducedFx = viewportWidth < 768 || quality.targetFps <= 34 || !renderPlan.drawGrid;

      // Clear with trail effect
      ctx.fillStyle = `rgba(5, 5, 5, ${quality.trailAlpha})`;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // 1. Draw Dynamic Background Grid
      // Speed depends on stress
      const speed = 0.4 + (currentStress / 100) * 3.2; 
      const gridSize = quality.gridSize;
      const offset = (timeRef.current * speed) % gridSize;

      if (renderPlan.drawGrid) {
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.05 + (currentStress / 400)})`; // Cyan, transparency based on stress
        ctx.lineWidth = 1;

        // Vertical Lines (Moving Perspective attempt)
        for (let x = 0; x < viewportWidth; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, viewportHeight);
          ctx.stroke();
        }

        // Horizontal Lines (Moving down)
        for (let y = offset; y < viewportHeight; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(viewportWidth, y);
          ctx.stroke();
        }
      }

      // 2. Draw Particles
      if (particlesRef.current.length > quality.maxParticles) {
        particlesRef.current.splice(0, particlesRef.current.length - quality.maxParticles);
      }
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life -= 0.02;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 3. Draw Digital Noise / Grain randomly
      if (renderPlan.drawNoise && currentStress > 50) {
         const baseNoise = (reducedFx ? 0.9 : 1.8) * quality.noiseScale * renderPlan.noiseMultiplier;
         const noiseCount = Math.floor((currentStress - 50) * baseNoise);
         ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
         for(let i=0; i<noiseCount; i++) {
             ctx.fillRect(
                 Math.random() * viewportWidth, 
                 Math.random() * viewportHeight, 
                 2, 2
             );
         }
      }

      // 4. Stress glitch bands
      if (renderPlan.drawGlitch && currentStress > 68) {
        const bandStep = (reducedFx ? 13 : 9) / Math.max(0.4, quality.glitchScale);
        const bandCount = Math.max(1, Math.floor(((currentStress - 65) / bandStep) * renderPlan.glitchBandMultiplier));
        for (let i = 0; i < bandCount; i++) {
          const y = Math.random() * viewportHeight;
          const h = Math.random() * (reducedFx ? 8 : 14) + 2;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.06 + currentStress / 900})`;
          ctx.fillRect(0, y, viewportWidth, h);
        }
      }

      // 5. Vignette for cinematic depth
      if (renderPlan.drawVignette) {
        const vignette = ctx.createRadialGradient(
          viewportWidth / 2,
          viewportHeight / 2,
          Math.min(viewportWidth, viewportHeight) * 0.25,
          viewportWidth / 2,
          viewportHeight / 2,
          Math.max(viewportWidth, viewportHeight) * 0.72
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, `rgba(0,0,0,${0.28 + currentStress / 260})`);
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      }

      // 6. Flash pulse on successful explosions
      if (flashRef.current > 0.01) {
        ctx.fillStyle = `rgba(34, 211, 238, ${0.22 * flashRef.current})`;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
        flashRef.current *= 0.9;
      }

      // 7. Subtle cinematic scanlines
      if (quality.scanlineOpacity > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${quality.scanlineOpacity})`;
        for (let y = 0; y < viewportHeight; y += renderPlan.scanlineStep) {
          ctx.fillRect(0, y, viewportWidth, 1);
        }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', applyResolution);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      cancelAnimationFrame(frameRef.current);
    };
  }, [isMobile]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
};
