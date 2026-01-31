import React, { useRef, useEffect } from 'react';

interface FXCanvasProps {
  stressLevel: number;
  triggerExplosion?: boolean; // Toggle to trigger a burst
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

export const FXCanvas: React.FC<FXCanvasProps> = ({ stressLevel, triggerExplosion }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Trigger explosion when prop changes
  useEffect(() => {
    if (triggerExplosion) {
      spawnExplosion(window.innerWidth / 2, window.innerHeight / 2, 30);
    }
  }, [triggerExplosion]);

  const spawnExplosion = (x: number, y: number, count: number) => {
    const colors = ['#22d3ee', '#ffffff', '#ef4444', '#f59e0b'];
    for (let i = 0; i < count; i++) {
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

  const handleClick = (e: MouseEvent) => {
    spawnExplosion(e.clientX, e.clientY, 8);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    window.addEventListener('mousedown', handleClick);
    resize();

    const render = () => {
      timeRef.current += 1;
      
      // Clear with trail effect
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; // Low opacity for trails
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Dynamic Background Grid
      // Speed depends on stress
      const speed = 0.5 + (stressLevel / 100) * 4; 
      const gridSize = 40;
      const offset = (timeRef.current * speed) % gridSize;
      
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.05 + (stressLevel / 400)})`; // Cyan, transparency based on stress
      ctx.lineWidth = 1;
      
      // Vertical Lines (Moving Perspective attempt)
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal Lines (Moving down)
      for (let y = offset; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw Particles
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
      if (stressLevel > 50) {
         const noiseCount = Math.floor((stressLevel - 50) * 2);
         ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
         for(let i=0; i<noiseCount; i++) {
             ctx.fillRect(
                 Math.random() * canvas.width, 
                 Math.random() * canvas.height, 
                 2, 2
             );
         }
      }

      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousedown', handleClick);
      cancelAnimationFrame(frameRef.current);
    };
  }, [stressLevel]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
};