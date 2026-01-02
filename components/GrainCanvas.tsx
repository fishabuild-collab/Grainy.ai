
import React, { useEffect, useRef, useState } from 'react';
import { GrainSettings, GrainTexture, APP_LIMITS } from '../types';

interface GrainCanvasProps {
  settings: GrainSettings;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

// Simple seeded PRNG (Mulberry32)
const createRandom = (seed: number) => {
  let s = seed;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const GrainCanvas: React.FC<GrainCanvasProps> = ({ settings, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { width, height, intensity, scale, roughness, monochrome, bgColor, grainColor, texture, seed, randomness } = settings;
    
    const finalWidth = Math.min(width, APP_LIMITS.MAX_DIMENSION);
    const finalHeight = Math.min(height, APP_LIMITS.MAX_DIMENSION);

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    setIsRendering(true);

    const renderId = requestAnimationFrame(() => {
      const rng = createRandom(seed);

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      const noiseScale = Math.max(1, scale);
      const noiseW = Math.ceil(finalWidth / noiseScale);
      const noiseH = Math.ceil(finalHeight / noiseScale);

      // --- Clumping / Randomness Map Generation ---
      let clutterData: Uint8ClampedArray | null = null;
      if (randomness > 0.05) {
        // Create a low-res map for clumping
        const clutterScale = 50; // How "large" the clumps are
        const cW = Math.ceil(noiseW / clutterScale) + 2;
        const cH = Math.ceil(noiseH / clutterScale) + 2;
        
        const clutterCanvas = document.createElement('canvas');
        clutterCanvas.width = cW;
        clutterCanvas.height = cH;
        const cCtx = clutterCanvas.getContext('2d');
        if (cCtx) {
          const cImgData = cCtx.createImageData(cW, cH);
          const cData = cImgData.data;
          for (let i = 0; i < cData.length; i += 4) {
            const val = rng() * 255;
            cData[i] = val;     // R
            cData[i+1] = val;   // G
            cData[i+2] = val;   // B
            cData[i+3] = 255;   // A
          }
          cCtx.putImageData(cImgData, 0, 0);

          // Upscale to noise dimension to get smooth interpolation
          const smoothCanvas = document.createElement('canvas');
          smoothCanvas.width = noiseW;
          smoothCanvas.height = noiseH;
          const sCtx = smoothCanvas.getContext('2d');
          if (sCtx) {
            sCtx.imageSmoothingEnabled = true; // Essential for soft clouds
            sCtx.imageSmoothingQuality = 'high';
            sCtx.drawImage(clutterCanvas, 0, 0, noiseW, noiseH);
            clutterData = sCtx.getImageData(0, 0, noiseW, noiseH).data;
          }
        }
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = noiseW;
      offscreen.height = noiseH;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return;

      const noiseImageData = offCtx.createImageData(noiseW, noiseH);
      const data = noiseImageData.data;

      const gR = parseInt(grainColor.slice(1, 3), 16) || 0;
      const gG = parseInt(grainColor.slice(3, 5), 16) || 0;
      const gB = parseInt(grainColor.slice(5, 7), 16) || 0;

      for (let i = 0; i < data.length; i += 4) {
        let noise = 0;
        
        switch (texture) {
          case GrainTexture.GAUSSIAN:
            const u = 1 - rng();
            const v = 1 - rng();
            noise = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            noise = (noise + 3) / 6; 
            break;
          case GrainTexture.SPECKLE:
            noise = rng() > (1 - intensity * 0.8) ? rng() : 0.5;
            break;
          case GrainTexture.FILM:
            noise = (rng() + rng() + rng()) / 3;
            break;
          case GrainTexture.UNIFORM:
          default:
            noise = rng();
            break;
        }

        let effect = noise * intensity;

        // Apply Clumping / Randomness
        if (clutterData) {
          // Normalize clutter value 0-1
          const mapVal = clutterData[i] / 255; 
          
          // If randomness is high, we want more distinct gaps.
          // mapVal is smooth noise 0-1.
          // We can use it as a mask.
          
          // Contrast curve based on randomness
          // If mapVal < randomness, suppress grain.
          // To make it smoother:
          
          const threshold = randomness * 0.8; // Max threshold 0.8 to always leave some spots
          
          // Soft threshold
          let mask = (mapVal - threshold) / (1 - threshold);
          if (mask < 0) mask = 0;
          if (mask > 1) mask = 1;
          
          // If randomness is low (e.g. 0.1), threshold is low, mask is mostly 1.
          // If randomness is high (e.g. 0.9), threshold is high, mask is mostly 0 (gaps).
          
          effect *= (mask * 0.8 + 0.2); // Never fully remove grain, just suppress
        }
        
        if (monochrome) {
            data[i] = gR;
            data[i+1] = gG;
            data[i+2] = gB;
            data[i+3] = effect * 255;
        } else {
            data[i] = rng() * 255;
            data[i+1] = rng() * 255;
            data[i+2] = rng() * 255;
            data[i+3] = effect * 255;
        }
      }

      offCtx.putImageData(noiseImageData, 0, 0);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = settings.opacity;
      ctx.drawImage(offscreen, 0, 0, finalWidth, finalHeight);
      ctx.restore();

      if (roughness > 0.01) {
        ctx.filter = `blur(${roughness * 10}px)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }
      
      onCanvasReady(canvas);
      setIsRendering(false);
    });

    return () => cancelAnimationFrame(renderId);
  }, [settings, onCanvasReady]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-white overflow-hidden relative group">
      <div className="max-w-full max-h-full border-2 border-black shadow-[30px_30px_0px_rgba(0,0,0,0.05)] transition-all duration-300 rounded-none overflow-hidden relative" 
           style={{ 
             width: 'auto', 
             height: 'auto',
             maxWidth: '85%',
             maxHeight: '80%'
           }}>
        <canvas 
          ref={canvasRef} 
          className={`w-full h-auto object-contain bg-white transition-opacity duration-100 ${isRendering ? 'opacity-30' : 'opacity-100'}`}
          style={{ imageRendering: settings.scale > 1 ? 'pixelated' : 'auto' }}
        />
        
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] z-20 pointer-events-none">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-1 border-4 border-black border-t-transparent animate-spin"></div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-black">Calculating Texture</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 flex gap-10 px-8 py-3 border border-black bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-400 font-mono font-bold uppercase tracking-widest">Dimensions</span>
          <span className="text-[11px] text-black font-mono font-bold uppercase">{settings.width} × {settings.height}</span>
        </div>
        <div className="w-px h-6 bg-black/10 self-center"></div>
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-400 font-mono font-bold uppercase tracking-widest">Density</span>
          <span className="text-[11px] text-black font-mono font-bold uppercase">{settings.ppi} DPI</span>
        </div>
        <div className="w-px h-6 bg-black/10 self-center"></div>
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-400 font-mono font-bold uppercase tracking-widest">Model</span>
          <span className="text-[11px] text-black font-mono font-bold uppercase">{settings.texture}</span>
        </div>
      </div>
    </div>
  );
};

export default GrainCanvas;
