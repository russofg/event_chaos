
import React, { useEffect, useRef, useState } from 'react';
import { SystemType, SystemState } from '../types';
import { AlertCircle, Disc, Zap } from 'lucide-react';

interface VisualizerProps {
  systemType: SystemType;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  health: number;
  aiImageUrl?: string | null;
  isAiGenerating?: boolean;
  allSystems?: Record<SystemType, SystemState>;
  publicInterest: number; // Added for crowd logic
}

export const Visualizer: React.FC<VisualizerProps> = ({ 
  systemType, 
  status, 
  allSystems,
  publicInterest
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
        setTick(t => t + 1);
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- RENDER FUNCTIONS ---
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      // Fit Canvas
      if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
      }
      const W = canvas.width;
      const H = canvas.height;

      // Extract Values
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

      // --- 1. DARK ROOM BACKGROUND ---
      // Global brightness controlled by Lights Fader
      const brightness = Math.max(0.05, lightVal / 100); 
      
      ctx.fillStyle = `rgb(${5 * brightness}, ${5 * brightness}, ${5 * brightness})`;
      ctx.fillRect(0, 0, W, H);
      
      // Stage Floor Grid
      ctx.strokeStyle = `rgba(50, 50, 50, ${brightness})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -W; i < W * 2; i += 60) {
          ctx.moveTo(i, H);
          ctx.lineTo(W / 2, H * 0.4);
      }
      for (let i = H * 0.6; i < H; i += (i * 0.05)) {
           ctx.moveTo(0, i);
           ctx.lineTo(W, i);
      }
      ctx.stroke();

      // --- 2. TRUSSING ---
      const drawTruss = (x: number, y: number, w: number, h: number) => {
          ctx.strokeStyle = `rgba(60, 60, 60, ${brightness + 0.1})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);
          ctx.beginPath();
          for(let i=0; i < h; i+=20) {
              ctx.moveTo(x, y + i);
              ctx.lineTo(x + w, y + i + 20);
              ctx.moveTo(x + w, y + i);
              ctx.lineTo(x, y + i + 20);
          }
          ctx.stroke();
      }
      drawTruss(0, 10, W, 40); 
      drawTruss(W * 0.1, 10, 30, H * 0.7);
      drawTruss(W * 0.85, 10, 30, H * 0.7);

      // --- 3. LINE ARRAY SPEAKERS (Feedback Logic + Sound Waves) ---
      const drawLineArray = (x: number, y: number) => {
          const speakerCount = 8;
          const pulse = (audioVal / 100) * 4;
          
          // FEEDBACK WAVES (More dramatic)
          if (audioStat === 'CRITICAL' || audioVal > 90) {
              const radius = (tick * 5) % 200;
              const opacity = 1 - (radius / 200);
              ctx.strokeStyle = `rgba(255, 0, 0, ${opacity * 0.8})`;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.arc(x + 25, y + 100, radius, 0, Math.PI * 2);
              ctx.stroke();
              
              // Second wave
              const radius2 = ((tick * 5) + 50) % 200;
              const opacity2 = 1 - (radius2 / 200);
              ctx.strokeStyle = `rgba(255, 100, 0, ${opacity2 * 0.6})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(x + 25, y + 100, radius2, 0, Math.PI * 2);
              ctx.stroke();
          }

          // SOUND WAVES (Visible audio waves when volume is high)
          if (audioVal > 50) {
              ctx.globalCompositeOperation = 'screen';
              for (let wave = 0; wave < 3; wave++) {
                  const waveRadius = ((tick * 3) + (wave * 20)) % 120;
                  const waveOpacity = (1 - (waveRadius / 120)) * (audioVal / 100) * 0.3;
                  ctx.strokeStyle = `rgba(100, 200, 255, ${waveOpacity})`;
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.arc(x + 25, y + 100, waveRadius, 0, Math.PI * 2);
                  ctx.stroke();
              }
              ctx.globalCompositeOperation = 'source-over';
          }

          for(let i=0; i<speakerCount; i++) {
              const curveX = x + (i*i * 0.5); 
              const curveY = y + (i * 25);
              
              ctx.fillStyle = '#111';
              ctx.fillRect(curveX, curveY, 50, 22);
              ctx.strokeStyle = '#333';
              ctx.strokeRect(curveX, curveY, 50, 22);
              
              // Woofer (more dynamic)
              const beat = Math.sin((tick * 0.5) + i) * pulse;
              const wooferSize = 8 + beat;
              ctx.fillStyle = audioStat === 'CRITICAL' ? '#440000' : '#222';
              ctx.beginPath();
              ctx.arc(curveX + 20, curveY + 11, wooferSize, 0, Math.PI*2);
              ctx.fill();
              
              // Woofer glow when active
              if (audioVal > 60) {
                  ctx.shadowBlur = 10;
                  ctx.shadowColor = 'rgba(255, 200, 0, 0.5)';
                  ctx.beginPath();
                  ctx.arc(curveX + 20, curveY + 11, wooferSize * 1.2, 0, Math.PI*2);
                  ctx.fill();
                  ctx.shadowBlur = 0;
              }
          }
      };
      drawLineArray(W * 0.15, 60); 
      drawLineArray(W * 0.75, 60); 


      // --- 4. VIDEO WALL ---
      const screenW = W * 0.4;
      const screenH = H * 0.35;
      const screenX = (W - screenW) / 2;
      const screenY = H * 0.25;
      const vIntensity = videoVal / 100;
      
      // Frame
      ctx.fillStyle = '#111';
      ctx.fillRect(screenX - 5, screenY - 5, screenW + 10, screenH + 10);

      // Content
      if (videoStat === 'CRITICAL') {
          // Glitch Static
          const pixelSize = 5;
          for(let r=0; r<screenH; r+=pixelSize) {
              for(let c=0; c<screenW; c+=pixelSize) {
                   if (Math.random() > 0.5) {
                       ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
                       ctx.fillRect(screenX + c, screenY + r, pixelSize, pixelSize);
                   }
              }
          }
      } else {
          // Visuals
          const time = tick * 0.05;
          const pixelSize = 10;
          for(let r=0; r<screenH; r+=pixelSize) {
              for(let c=0; c<screenW; c+=pixelSize) {
                   const v = Math.sin(c*0.1 + time) + Math.sin(r*0.1 + time);
                   const rCol = Math.sin(v * Math.PI) * 255;
                   const gCol = Math.cos(v * Math.PI) * 255;
                   
                   ctx.fillStyle = `rgba(${Math.abs(rCol)}, ${Math.abs(gCol)}, 200, ${vIntensity})`;
                   ctx.fillRect(screenX + c, screenY + r, pixelSize, pixelSize);
              }
          }
      }

      // --- 5. LIGHTS (Beams - IMPROVED with realistic effects) ---
      if (lightStat !== 'CRITICAL' && lightVal > 5) {
          ctx.globalCompositeOperation = 'screen'; 
          const lIntensity = lightVal / 100;
          
          const drawBeam = (originX: number, originY: number, angle: number, colorHue: number, isStrobe: boolean = false) => {
              const beamLen = H * 1.2;
              const beamW = 35 + (stageVal / 3); // Fog makes beams wider
              
              const endX = originX + Math.sin(angle) * beamLen;
              const endY = originY + Math.cos(angle) * beamLen;

              // Strobe effect
              if (isStrobe && lightVal > 80) {
                  const strobePhase = Math.floor(tick / 5) % 2;
                  if (strobePhase === 0) return; // Skip drawing on strobe off
              }

              const grad = ctx.createLinearGradient(originX, originY, endX, endY);
              grad.addColorStop(0, `hsla(${colorHue}, 100%, 85%, ${lIntensity})`);
              grad.addColorStop(0.2, `hsla(${colorHue}, 100%, 70%, ${lIntensity * 0.8})`);
              grad.addColorStop(0.5, `hsla(${colorHue}, 100%, 50%, ${lIntensity * 0.4})`);
              grad.addColorStop(1, `hsla(${colorHue}, 100%, 30%, 0)`);

              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.lineTo(endX - beamW, endY);
              ctx.lineTo(endX + beamW, endY);
              ctx.fill();
              
              // Enhanced flare with glow
              const flareSize = 5 * lIntensity + 3;
              ctx.shadowBlur = 20;
              ctx.shadowColor = `hsla(${colorHue}, 100%, 80%, 0.8)`;
              ctx.beginPath();
              ctx.arc(originX, originY, flareSize, 0, Math.PI*2);
              ctx.fillStyle = '#fff';
              ctx.fill();
              ctx.shadowBlur = 0;
              
              // Light particles/dust in beam
              if (stageVal > 30) {
                  for (let p = 0; p < 5; p++) {
                      const particleX = originX + (Math.sin(angle) * beamLen * (0.3 + Math.random() * 0.4));
                      const particleY = originY + (Math.cos(angle) * beamLen * (0.3 + Math.random() * 0.4));
                      ctx.fillStyle = `rgba(255, 255, 255, ${lIntensity * 0.3})`;
                      ctx.beginPath();
                      ctx.arc(particleX, particleY, 2, 0, Math.PI*2);
                      ctx.fill();
                  }
              }
          };

          const t = tick * 0.02;
          // Moving lights with different patterns
          drawBeam(W * 0.25, 50, Math.sin(t) * 0.6, (tick * 2) % 360);
          drawBeam(W * 0.75, 50, Math.sin(t + 2) * 0.6, (tick * 2 + 120) % 360);
          drawBeam(W * 0.5, 50, Math.sin(t * 1.5) * 0.4, (tick * 2 + 240) % 360);
          
          // Strobe light (if lights are very high)
          if (lightVal > 85) {
              drawBeam(W * 0.5, 30, -0.3, 0, true);
          }
          
          ctx.globalCompositeOperation = 'source-over';
      }

      // --- 6. CROWD LOGIC (IMPROVED) ---
      // More reactive crowd with individual people
      const crowdY = H;
      const crowdHeight = H * 0.25;
      const personSpacing = 12;
      const personCount = Math.floor(W / personSpacing);
      
      // Draw individual people
      for(let i = 0; i < personCount; i++) {
          const x = (i / personCount) * W;
          
          // Calculate individual person state
          const personSeed = i * 1000; // Unique seed per person
          const personPhase = (tick * 0.15) + (personSeed * 0.01);
          
          let moodOffset = 0;
          let jump = 0;
          let personSize = 8;
          
          if (publicInterest < 30) {
              moodOffset = 25; // People leaving/sinking
              personSize = 6; // Smaller (further away)
          } else if (publicInterest > 80) {
              jump = Math.sin(personPhase) * (audioVal / 5) * 1.8; // Big jumps
              personSize = 10; // Larger (closer, more excited)
          } else {
              jump = Math.sin(personPhase) * (audioVal / 8);
              personSize = 8;
          }
          
          // Rioting effect
          let riotX = 0;
          if (publicInterest < 10) {
              riotX = Math.sin(personPhase * 2) * 8;
          }
          
          const headY = crowdY - (crowdHeight * 0.6) + moodOffset - jump;
          
          // Draw person (simple silhouette)
          ctx.fillStyle = publicInterest > 70 ? '#1a1a1a' : '#050505';
          ctx.beginPath();
          ctx.arc(x + riotX, headY, personSize, 0, Math.PI * 2);
          ctx.fill();
          
          // Arms (if jumping)
          if (jump > 5) {
              ctx.strokeStyle = '#1a1a1a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + riotX - personSize, headY);
              ctx.lineTo(x + riotX - personSize * 1.5, headY - personSize * 0.8);
              ctx.moveTo(x + riotX + personSize, headY);
              ctx.lineTo(x + riotX + personSize * 1.5, headY - personSize * 0.8);
              ctx.stroke();
          }
      }

      // Throwing things if angry (more frequent)
      if (publicInterest < 20 && Math.random() > 0.92) {
          ctx.fillStyle = '#fff';
          const px = Math.random() * W;
          const py = H - (Math.random() * 150);
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI*2);
          ctx.fill();
      }
      
      // Cell phone lights if high interest
      if (publicInterest > 60 && Math.random() > 0.7) {
          const phoneX = Math.random() * W;
          const phoneY = crowdY - (crowdHeight * 0.5) - (Math.random() * 30);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(phoneX - 1, phoneY - 2, 2, 4);
      }

      // --- 7. ARTISTS ON STAGE (Simple silhouettes) ---
      if (publicInterest > 20) {
          const stageCenterX = W * 0.5;
          const stageY = H * 0.5;
          
          // Main artist (center)
          const artistMovement = Math.sin(tick * 0.1) * 3;
          ctx.fillStyle = '#0a0a0a';
          ctx.beginPath();
          ctx.arc(stageCenterX + artistMovement, stageY, 15, 0, Math.PI * 2);
          ctx.fill();
          
          // Guitar (if audio is high)
          if (audioVal > 60) {
              ctx.strokeStyle = '#1a1a1a';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(stageCenterX + artistMovement - 10, stageY - 5);
              ctx.lineTo(stageCenterX + artistMovement - 25, stageY - 20);
              ctx.stroke();
          }
          
          // Side artist (if energy is high)
          if (publicInterest > 60) {
              const sideMovement = Math.sin(tick * 0.12 + 1) * 2;
              ctx.beginPath();
              ctx.arc(stageCenterX - 80 + sideMovement, stageY + 5, 12, 0, Math.PI * 2);
              ctx.fill();
          }
      }

      // --- 8. FOG (IMPROVED with particles) ---
      const fogDensity = stageVal / 100;
      if (fogDensity > 0.1) {
         ctx.globalCompositeOperation = 'overlay';
         ctx.fillStyle = `rgba(200, 220, 255, ${fogDensity * 0.15})`;
         ctx.fillRect(0, 0, W, H);
         
         // Fog particles
         for (let i = 0; i < 20; i++) {
             const particleX = (tick * 0.5 + i * 50) % W;
             const particleY = H * 0.4 + Math.sin(tick * 0.05 + i) * 20;
             const particleSize = 3 + Math.random() * 4;
             ctx.fillStyle = `rgba(255, 255, 255, ${fogDensity * 0.4})`;
             ctx.beginPath();
             ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
             ctx.fill();
         }
         
         ctx.globalCompositeOperation = 'source-over';
      }

  }, [tick, systemType, status, allSystems, publicInterest]);

  // Tech Stats Overlay
  const renderTechData = () => (
      <div className="absolute top-4 right-4 z-20 text-right font-mono text-[9px] text-cyan-500/80 bg-black/60 p-2 border border-cyan-900/50 rounded backdrop-blur-sm pointer-events-none">
          <div className="mb-1 border-b border-cyan-900/50 pb-1 flex justify-end items-center gap-1">
             <Disc className={`w-3 h-3 ${tick % 20 < 10 ? 'animate-spin' : ''}`} /> 
             CAM_01_FEED
          </div>
          {status === 'CRITICAL' && <div className="text-red-500 font-bold blink">ERROR DETECTED</div>}
          <div>LUX: {Math.round((allSystems?.[SystemType.LIGHTS].faderValue || 0) * 8.5)}</div>
          <div>DB: {Math.round(80 + ((allSystems?.[SystemType.SOUND].faderValue || 0) * 0.4))}</div>
      </div>
  );

  return (
    <div className="w-full h-full bg-[#050505] rounded-lg overflow-hidden border border-slate-700 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] group">
      <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full block" />
      
      {/* Dirty Lens Effect */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dust.png')] opacity-20 pointer-events-none z-20"></div>

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
