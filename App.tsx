
import React, { useState, useCallback, useRef } from 'react';
import { GrainSettings, GrainTexture, AIRecipe, APP_LIMITS } from './types';
import GrainCanvas from './components/GrainCanvas';
import { fetchGrainRecipes } from './services/geminiService';

const DEFAULT_SETTINGS: GrainSettings = {
  width: 1920,
  height: 1080,
  ppi: 72,
  intensity: 0.15,
  scale: 1,
  roughness: 0,
  opacity: 1,
  bgColor: '#FFFFFF',
  grainColor: '#000000',
  texture: GrainTexture.UNIFORM,
  monochrome: true,
};

const PRESETS = [
  { name: 'EDITORIAL STORY', w: 1080, h: 1920 },
  { name: 'MUSEUM POST', w: 1080, h: 1080 },
  { name: 'A4 ART PAPER', w: 2480, h: 3508, ppi: 300 },
];

const App: React.FC = () => {
  const [settings, setSettings] = useState<GrainSettings>(DEFAULT_SETTINGS);
  const [unit, setUnit] = useState<'PX' | 'MM'>('PX');
  const [aiRecipes, setAiRecipes] = useState<AIRecipe[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pxToMm = (px: number, ppi: number) => parseFloat(((px * 25.4) / ppi).toFixed(1));
  const mmToPx = (mm: number, ppi: number) => Math.round((mm / 25.4) * ppi);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Grainy_Editorial_${settings.width}x${settings.height}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const updateSetting = <K extends keyof GrainSettings>(key: K, value: GrainSettings[K]) => {
    let finalValue = value;
    if (key === 'width' || key === 'height') {
      finalValue = Math.min(Math.max(APP_LIMITS.MIN_DIMENSION, Number(value)), APP_LIMITS.MAX_DIMENSION) as any;
    }
    setSettings(prev => ({ ...prev, [key]: finalValue }));
  };

  const handleDimensionChange = (key: 'width' | 'height', val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    
    if (unit === 'PX') {
       updateSetting(key, num);
    } else {
       const px = mmToPx(num, settings.ppi);
       updateSetting(key, px);
    }
  };

  const handlePpiChange = (val: string) => {
    const newPpi = Number(val);
    if (isNaN(newPpi) || newPpi < 1) return;

    if (unit === 'MM') {
        // Maintain physical size, update pixels to match new PPI
        const wMm = pxToMm(settings.width, settings.ppi);
        const hMm = pxToMm(settings.height, settings.ppi);
        
        const newW = mmToPx(wMm, newPpi);
        const newH = mmToPx(hMm, newPpi);
        
        setSettings(prev => ({
            ...prev,
            width: Math.min(Math.max(APP_LIMITS.MIN_DIMENSION, newW), APP_LIMITS.MAX_DIMENSION),
            height: Math.min(Math.max(APP_LIMITS.MIN_DIMENSION, newH), APP_LIMITS.MAX_DIMENSION),
            ppi: newPpi
        }));
    } else {
        // Maintain pixels, just update PPI
        setSettings(prev => ({ ...prev, ppi: newPpi }));
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setLoadingAI(true);
    try {
      const recipes = await fetchGrainRecipes(aiPrompt);
      setAiRecipes(recipes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAI(false);
    }
  };

  const applyRecipe = (recipe: AIRecipe) => {
    setSettings(prev => ({ ...prev, ...recipe.settings }));
  };

  const onCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white selection:bg-black selection:text-white">
      {/* Sidebar - Left Editorial Nav */}
      <aside className="w-80 flex-shrink-0 border-r border-black bg-white flex flex-col z-20 overflow-hidden">
        <div className="p-10 border-b-4 border-black relative">
          <h1 className="text-6xl font-display font-black tracking-tighter uppercase italic leading-[0.8]">
            GRAINY
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl tracking-widest font-mono font-bold block">.AI</span>
            <button 
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="text-black hover:rotate-180 transition-transform duration-500 ease-in-out p-1"
              title="Reset Configuration"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scrollbar-none">
          {/* Engine Section - Model Selection */}
          <section>
            <div className="grid grid-cols-1 border-b-2 border-black">
              {Object.values(GrainTexture).map(type => (
                <button
                  key={type}
                  onClick={() => updateSetting('texture', type)}
                  className={`py-5 px-10 text-[10px] font-mono uppercase font-bold tracking-[0.2em] text-left border-b border-zinc-200 last:border-b-0 transition-colors ${
                    settings.texture === type ? 'bg-black text-white' : 'hover:bg-zinc-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          <div className="p-8 space-y-12">
            {/* Canvas Layout Section */}
            <section className="space-y-6">
              <div className="flex justify-between items-baseline">
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 italic">01 / Layout</h3>
                <div className="flex border border-black">
                  <button 
                    onClick={() => setUnit('PX')}
                    className={`px-2 py-1 text-[9px] font-mono font-bold transition-colors ${unit === 'PX' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}
                  >PX</button>
                  <button 
                    onClick={() => setUnit('MM')}
                    className={`px-2 py-1 text-[9px] font-mono font-bold transition-colors ${unit === 'MM' ? 'bg-black text-white' : 'hover:bg-zinc-100'}`}
                  >MM</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest opacity-50">Width</label>
                  <input 
                    type="number" 
                    value={unit === 'PX' ? settings.width : pxToMm(settings.width, settings.ppi)}
                    onChange={e => handleDimensionChange('width', e.target.value)}
                    className="w-full bg-transparent border-b border-black py-2 text-sm font-mono focus:outline-none focus:border-b-4 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest opacity-50">Height</label>
                  <input 
                    type="number" 
                    value={unit === 'PX' ? settings.height : pxToMm(settings.height, settings.ppi)}
                    onChange={e => handleDimensionChange('height', e.target.value)}
                    className="w-full bg-transparent border-b border-black py-2 text-sm font-mono focus:outline-none focus:border-b-4 transition-all"
                  />
                </div>
              </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase tracking-widest opacity-50">Density (PPI)</label>
                  <input 
                    type="number" 
                    value={settings.ppi}
                    onChange={e => handlePpiChange(e.target.value)}
                    className="w-full bg-transparent border-b border-black py-2 text-sm font-mono focus:outline-none focus:border-b-4 transition-all"
                  />
                </div>

              <div className="space-y-4 pt-2">
                {PRESETS.map(p => (
                  <button 
                    key={p.name}
                    onClick={() => setSettings(s => ({...s, width: p.w, height: p.h, ppi: p.ppi || s.ppi}))}
                    className="w-full text-left text-[11px] font-mono uppercase tracking-widest hover:pl-2 transition-all group flex items-center justify-between border-b border-zinc-100 pb-2 last:border-0"
                  >
                    <span>{p.name}</span>
                    <span className="opacity-0 group-hover:opacity-100 font-bold">→</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Chromatics Section */}
            <section className="space-y-8">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 italic">03 / Chromatics</h3>
              <div className="grid grid-cols-2 border border-black">
                <div className="p-4 border-r border-black space-y-2">
                  <label className="text-[8px] font-mono uppercase font-bold">Bg</label>
                  <input 
                    type="color" 
                    value={settings.bgColor}
                    onChange={e => updateSetting('bgColor', e.target.value)}
                    className="w-full h-8 bg-transparent cursor-pointer border border-black p-0.5"
                  />
                  <div className="text-[8px] font-mono text-center opacity-50">{settings.bgColor}</div>
                </div>
                <div className="p-4 space-y-2">
                  <label className="text-[8px] font-mono uppercase font-bold">Grain</label>
                  <input 
                    type="color" 
                    value={settings.grainColor}
                    onChange={e => updateSetting('grainColor', e.target.value)}
                    className="w-full h-8 bg-transparent cursor-pointer border border-black p-0.5"
                  />
                  <div className="text-[8px] font-mono text-center opacity-50">{settings.grainColor}</div>
                </div>
              </div>
            </section>

            {/* AI Section */}
            <section className="pt-8 border-t-4 border-black space-y-6">
               <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 italic">AI Curation</h3>
               <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="EX: VOGUE COVER, BRUTALIST..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                    className="w-full bg-zinc-900 border-none py-4 px-4 text-[11px] font-mono uppercase text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button 
                    onClick={handleGenerateAI}
                    className="absolute right-4 bottom-4 font-mono font-black text-sm text-zinc-500 hover:text-white transition-colors"
                  >
                    {loadingAI ? '...' : '→'}
                  </button>
               </div>

               <div className="space-y-4">
                  {aiRecipes.map((recipe, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyRecipe(recipe)}
                      className="w-full text-left p-4 border border-black hover:bg-black hover:text-white transition-colors duration-100"
                    >
                      <p className="text-[11px] font-display font-bold uppercase tracking-tight italic">{recipe.name}</p>
                      <p className="text-[9px] font-mono mt-2 opacity-60 leading-tight line-clamp-2 uppercase">{recipe.description}</p>
                    </button>
                  ))}
               </div>
            </section>
          </div>
        </div>

        {/* Fixed Download */}
        <div className="p-10 border-t-4 border-black bg-white">
          <button 
            onClick={handleDownload}
            className="w-full bg-black text-white font-mono font-bold uppercase text-[11px] tracking-[0.4em] py-5 hover:bg-white hover:text-black border-2 border-black transition-all active:scale-[0.98]"
          >
            Export Pattern
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col relative bg-white">
        <header className="h-24 border-b border-black flex items-center justify-between px-16 z-10 bg-white/80 backdrop-blur-md">
           <div className="flex items-center gap-16 font-mono text-[11px] font-bold tracking-[0.3em] uppercase">
              <span className="flex items-center gap-3">
                <div className="w-2 h-2 bg-black rotate-45"></div>
                Live Preview
              </span>
           </div>
           
           <div className="font-mono text-[11px] uppercase font-bold tracking-[0.2em] bg-black text-white px-6 py-2">
             {unit === 'PX' ? `${settings.width}x${settings.height} PX` : `${pxToMm(settings.width, settings.ppi)}x${pxToMm(settings.height, settings.ppi)} MM`}
           </div>
        </header>

        <div className="flex-1 p-24 flex items-center justify-center overflow-hidden">
           <GrainCanvas settings={settings} onCanvasReady={onCanvasReady} />
        </div>
      </main>
    </div>
  );
};

export default App;
