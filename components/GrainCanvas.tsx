
import React, { useEffect, useRef, useState } from 'react';
import { GrainSettings, GrainTexture, APP_LIMITS } from '../types';

interface GrainCanvasProps {
  settings: GrainSettings;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

const GrainCanvas: React.FC<GrainCanvasProps> = ({ settings, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { width, height, intensity, scale, roughness, monochrome, bgColor, grainColor, texture } = settings;
    
    const finalWidth = Math.min(width, APP_LIMITS.MAX_DIMENSION);
    const finalHeight = Math.min(height, APP_LIMITS.MAX_DIMENSION);

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    setIsRendering(true);

    const renderId = requestAnimationFrame(() => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, finalWidth, finalHeight);

      const noiseScale = Math.max(1, scale);
      const noiseW = Math.ceil(finalWidth / noiseScale);
      const noiseH = Math.ceil(finalHeight / noiseScale);

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
            const u = 1 - Math.random();
            const v = 1 - Math.random();
            noise = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
            noise = (noise + 3) / 6; 
            break;
          case GrainTexture.SPECKLE:
            noise = Math.random() > (1 - intensity * 0.8) ? Math.random() : 0.5;
            break;
          case GrainTexture.FILM:
            noise = (Math.random() + Math.random() + Math.random()) / 3;
            break;
          case GrainTexture.UNIFORM:
          default:
            noise = Math.random();
            break;
        }

        const effect = noise * intensity;
        
        if (monochrome) {
            data[i] = gR;
            data[i+1] = gG;
            data[i+2] = gB;
            data[i+3] = effect * 255;
        } else {
            data[i] = Math.random() * 255;
            data[i+1] = Math.random() * 255;
            data[i+2] = Math.random() * 255;
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
