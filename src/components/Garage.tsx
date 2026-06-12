/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Palette, 
  Gauge, 
  Flame, 
  Settings, 
  Coins, 
  ArrowLeft, 
  Sparkles, 
  ChevronRight, 
  Plus
} from 'lucide-react';
import { CarTemplate, CarCustomization } from '../types';
import { CAR_TEMPLATES, UPGRADE_MAX_LEVEL, getUpgradeCost } from '../data';
import { audio } from '../audio';

interface GarageProps {
  customization: CarCustomization;
  setCustomization: React.Dispatch<React.SetStateAction<CarCustomization>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
}

const PAINT_COLORS = [
  '#ef4444', // Rouge Cyberpunk
  '#ec4899', // Rose Néon
  '#06b6d4', // Cyan Électrique
  '#10b981', // Vert Émeraude
  '#f59e0b', // Jaune Ambre
  '#8b5cf6', // Violet Galaxie
  '#f8fafc', // Blanc Boréal
  '#1e293b', // Noir Carbone
];

export default function Garage({ 
  customization, 
  setCustomization, 
  coins, 
  setCoins, 
  onBack 
}: GarageProps) {

  // Current active template
  const currentTemplate = CAR_TEMPLATES.find(c => c.id === customization.selectedTemplateId) || CAR_TEMPLATES[0];

  const handleSelectTemplate = (template: CarTemplate) => {
    if (template.cost > coins) {
      audio.playBeep(250, 0.15, 'triangle'); // Error tone
      return;
    }

    if (template.id !== customization.selectedTemplateId) {
      if (template.cost > 0) {
        // Only deduct cost if buying a new car
        setCoins(prev => prev - template.cost);
        // Free permanently now (mock purchase logic)
        template.cost = 0; 
      }
      setCustomization(prev => ({
        ...prev,
        selectedTemplateId: template.id
      }));
      audio.playVictoryMelody();
    } else {
      audio.playBeep(500, 0.05);
    }
  };

  const handleColorChange = (color: string) => {
    setCustomization(prev => ({ ...prev, color }));
    audio.playBeep(700, 0.05, 'sine');
  };

  // Upgrade handlers
  const handleUpgradeEngine = () => {
    const cost = getUpgradeCost(customization.engineLevel);
    if (customization.engineLevel < UPGRADE_MAX_LEVEL && coins >= cost) {
      setCoins(prev => prev - cost);
      setCustomization(prev => ({ ...prev, engineLevel: prev.engineLevel + 1 }));
      audio.playBeep(600 + customization.engineLevel * 100, 0.15, 'sine');
    } else {
      audio.playBeep(250, 0.2, 'triangle');
    }
  };

  const handleUpgradeTires = () => {
    const cost = getUpgradeCost(customization.tiresLevel);
    if (customization.tiresLevel < UPGRADE_MAX_LEVEL && coins >= cost) {
      setCoins(prev => prev - cost);
      setCustomization(prev => ({ ...prev, tiresLevel: prev.tiresLevel + 1 }));
      audio.playBeep(600 + customization.tiresLevel * 100, 0.15, 'sine');
    } else {
      audio.playBeep(250, 0.2, 'triangle');
    }
  };

  const handleUpgradeTurbo = () => {
    const cost = getUpgradeCost(customization.turboLevel);
    if (customization.turboLevel < UPGRADE_MAX_LEVEL && coins >= cost) {
      setCoins(prev => prev - cost);
      setCustomization(prev => ({ ...prev, turboLevel: prev.turboLevel + 1 }));
      audio.playBeep(600 + customization.turboLevel * 100, 0.15, 'sine');
    } else {
      audio.playBeep(250, 0.2, 'triangle');
    }
  };

  // Cost calculations
  const engineCost = getUpgradeCost(customization.engineLevel);
  const tiresCost = getUpgradeCost(customization.tiresLevel);
  const turboCost = getUpgradeCost(customization.turboLevel);

  return (
    <div id="garage-view" className="flex flex-col h-full text-zinc-100 overflow-y-auto max-w-5xl mx-auto px-4 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 border-b-2 border-zinc-800 pb-5">
        <button 
          onClick={() => {
            audio.playBeep(440, 0.08);
            onBack();
          }}
          className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 font-black italic uppercase text-xs tracking-wider transition-colors"
          id="btn-garage-back"
        >
          <ArrowLeft size={16} />
          Retour au Menu
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl px-5 py-2.5 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            <Coins className="text-cyan-400 animate-pulse" size={16} />
            <span className="font-mono text-cyan-400 font-extrabold tracking-wider text-sm">{coins} <span className="text-[10px] text-zinc-500 font-sans font-black uppercase">Crédits</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Car Selection & Style Visual */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-850 flex flex-col items-center relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(6,182,212,0.1),transparent)] pointer-events-none" />
            
            {/* Grid background effect */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(rgba(34,211,238,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.01)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:linear-gradient(to_top,black,transparent)] pointer-events-none" />

            <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 mb-3 uppercase">Aperçu Atelier / Tuning Stage</span>
            
            {/* Animated Car rendering via custom chemical SVGs */}
            <div className="w-64 h-36 flex items-center justify-center relative mb-6">
              
              <div 
                className="absolute w-44 h-24 rounded-full filter blur-2xl opacity-40 transition-all duration-300"
                style={{ backgroundColor: customization.color }}
              />

              {/* Dynamic Retro Car SVG Preview */}
              <svg 
                viewBox="0 0 100 50" 
                className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] z-10"
              >
                {/* Wheels */}
                <rect x="18" y="5" width="14" height="6" rx="2" fill="#090d16" />
                <rect x="68" y="5" width="14" height="6" rx="2" fill="#090d16" />
                <rect x="18" y="39" width="14" height="6" rx="2" fill="#090d16" />
                <rect x="68" y="39" width="14" height="6" rx="2" fill="#090d16" />

                {/* Main Body */}
                <rect 
                  x="15" y="10" width="70" height="30" rx="8" 
                  fill={customization.color} 
                  stroke="#FFFFFF33" 
                  strokeWidth="0.7"
                />

                {/* Details based on car template style */}
                {currentTemplate.spriteStyle === 'sport' && (
                  <>
                    {/* Racing stripe */}
                    <rect x="15" y="22" width="70" height="6" fill="#ffffff" opacity="0.4" />
                    {/* Cockpit glass */}
                    <path d="M 40 14 L 62 14 L 68 25 L 68 25 L 62 36 L 40 36 Z" fill="#0f172a" stroke="#ffffff33" strokeWidth="0.5" />
                    {/* Spoiler */}
                    <rect x="10" y="8" width="5" height="34" rx="1" fill="#0f172a" />
                  </>
                )}

                {currentTemplate.spriteStyle === 'formula' && (
                  <>
                    {/* Sleek F1 arrows */}
                    <path d="M 15 10 L 90 25 L 15 40 Z" fill="#ffffff22" />
                    <rect x="8" y="6" width="3" height="38" fill={customization.color} />
                    <path d="M 35 15 L 60 15 L 65 25 L 60 35 L 35 35 Z" fill="#020617" />
                    {/* Left Wing and Right Wing */}
                    <rect x="75" y="4" width="12" height="4" fill="#0f172a" />
                    <rect x="75" y="42" width="12" height="4" fill="#0f172a" />
                  </>
                )}

                {currentTemplate.spriteStyle === 'muscle' && (
                  <>
                    {/* Double Stripe */}
                    <rect x="15" y="15" width="70" height="3" fill="#1e293b" />
                    <rect x="15" y="32" width="70" height="3" fill="#1e293b" />
                    {/* Hot Engine block */}
                    <rect x="62" y="20" width="12" height="10" rx="1" fill="#94a3b8" />
                    <circle cx="68" cy="25" r="2" fill="#dc2626" />
                    {/* Square windshield */}
                    <rect x="42" y="13" width="15" height="24" rx="2" fill="#1e1b4b" />
                  </>
                )}

                {currentTemplate.spriteStyle === 'cyber' && (
                  <>
                    {/* Hexagon neon grids */}
                    <line x1="20" y1="25" x2="80" y2="25" stroke="#ffffff55" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Side intake wings */}
                    <polygon points="15,10 32,10 25,5" fill="#f43f5e" opacity="0.7" />
                    <polygon points="15,40 32,40 25,45" fill="#f43f5e" opacity="0.7" />
                    {/* Futuristic visor face cockpit */}
                    <polygon points="45,15 72,18 72,32 45,35" fill="#06b6d4" />
                  </>
                )}

                {/* Headlights */}
                <ellipse cx="83" cy="16" rx="2" ry="3" fill="#fef08a" />
                <ellipse cx="83" cy="34" rx="2" ry="3" fill="#fef08a" />
                {/* Tail lights */}
                <rect x="15" y="13" width="1.5" height="4" fill="#ef4444" />
                <rect x="15" y="33" width="1.5" height="4" fill="#ef4444" />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mb-2" id="selected-car-name">{currentTemplate.name}</h2>
              <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">{currentTemplate.description}</p>
            </div>

            {/* Custom Palette color picker */}
            <div className="w-full border-t border-zinc-800 pt-5 mt-2 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-450 font-mono tracking-widest font-black uppercase mb-4">
                <Palette size={14} className="text-cyan-400" />
                <span>NUANCIER CHÂSSIS / CHROME PAINT</span>
              </div>
              <div className="flex items-center gap-3.5 flex-wrap justify-center">
                {PAINT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      customization.color === color 
                        ? 'border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                        : 'border-transparent hover:scale-110 hover:border-zinc-500'
                    }`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Model Catalogue Cards */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-1 font-black">Bolides Disponibles / Garage Shop</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAR_TEMPLATES.map(template => {
                const isSelected = template.id === customization.selectedTemplateId;
                const canBuy = coins >= template.cost;
                const isLocked = template.cost > 0;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`text-left p-5 rounded-2xl border-2 flex flex-col justify-between transition-all relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                        : isLocked && !canBuy
                          ? 'bg-zinc-900/40 border-zinc-900/50 opacity-50 cursor-not-allowed text-zinc-500'
                          : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-550'
                    }`}
                  >
                    <div className="w-full relative z-10">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="font-extrabold text-sm tracking-wide uppercase italic">{template.name}</span>
                        {isSelected ? (
                          <span className="bg-white text-red-650 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border border-white">
                            OWNED
                          </span>
                        ) : (
                          isLocked && (
                            <span className="bg-zinc-950 text-amber-400 border border-zinc-800 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded">
                              BOUTIQUE
                            </span>
                          )
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isSelected ? 'text-red-100' : 'text-zinc-450'}`}>
                        {template.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-850 w-full relative z-10">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                        <span className={isSelected ? 'text-red-100' : 'text-zinc-550'}>Vitesse :</span>
                        <span className={`font-black ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{Math.round(template.baseMaxSpeed * 10)} km/h</span>
                      </div>
                      
                      {isLocked ? (
                        <div className="flex items-center gap-1.5 font-mono text-amber-400 font-extrabold text-[11px] bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/25">
                          <Coins size={11} className="text-amber-400 animate-pulse" />
                          <span>{template.cost}</span>
                        </div>
                      ) : (
                        !isSelected && (
                          <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1">
                            Choisir <ChevronRight size={12} />
                          </span>
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Performance Upgrades */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-850 flex flex-col justify-between shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
              <Settings size={120} className="text-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-cyan-400 animate-pulse" size={16} />
                <h3 className="text-xs font-mono font-black tracking-[0.2em] text-cyan-400 uppercase">UPGRADES PERFORMANCE</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Améliorez votre bolide avec vos crédits pour pulvériser les records à battre !
              </p>

              {/* Engine module */}
              <div className="space-y-6">
                
                {/* Engine block */}
                <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-850">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gauge size={16} className="text-cyan-450" />
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">Moteur (V-Max)</span>
                    </div>
                    <span className="font-mono text-[10px] font-black uppercase text-zinc-500">Niv. {customization.engineLevel}/{UPGRADE_MAX_LEVEL}</span>
                  </div>
                  
                  {/* Upgrade progress spots */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {Array.from({ length: UPGRADE_MAX_LEVEL }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-2 rounded-sm transition-all ${
                          i < customization.engineLevel 
                            ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]' 
                            : 'bg-zinc-850'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-550 font-mono tracking-wider font-bold">
                      BONUS : <span className="font-black text-cyan-400">+{Math.round(customization.engineLevel * 7)}% V-Max</span>
                    </span>

                    {customization.engineLevel < UPGRADE_MAX_LEVEL ? (
                      <button
                        onClick={handleUpgradeEngine}
                        disabled={coins < engineCost}
                        className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all skew-racing ${
                          coins >= engineCost
                            ? 'bg-cyan-405 text-zinc-950 shadow-md cursor-pointer'
                            : 'bg-zinc-850 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={11} className="block skew-racing-reverse" />
                        <span className="block skew-racing-reverse">{engineCost} Cr.</span>
                      </button>
                    ) : (
                      <span className="text-[9px] tracking-widest uppercase font-mono font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-md border border-cyan-400/20">Max</span>
                    )}
                  </div>
                </div>

                {/* Tire Handling block */}
                <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-850">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Palette size={16} className="text-red-500" />
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">Pneus & Adhérence</span>
                    </div>
                    <span className="font-mono text-[10px] font-black uppercase text-zinc-500">Niv. {customization.tiresLevel}/{UPGRADE_MAX_LEVEL}</span>
                  </div>
                  
                  {/* Upgrade progress spots */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {Array.from({ length: UPGRADE_MAX_LEVEL }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-2 rounded-sm transition-all ${
                          i < customization.tiresLevel 
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                            : 'bg-zinc-850'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-550 font-mono tracking-wider font-bold">
                      BONUS : <span className="font-black text-red-500">+{Math.round(customization.tiresLevel * 12)}% Grip</span>
                    </span>

                    {customization.tiresLevel < UPGRADE_MAX_LEVEL ? (
                      <button
                        onClick={handleUpgradeTires}
                        disabled={coins < tiresCost}
                        className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all skew-racing ${
                          coins >= tiresCost
                            ? 'bg-red-500 text-white shadow-md cursor-pointer'
                            : 'bg-zinc-850 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={11} className="block skew-racing-reverse" />
                        <span className="block skew-racing-reverse">{tiresCost} Cr.</span>
                      </button>
                    ) : (
                      <span className="text-[9px] tracking-widest uppercase font-mono font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20">Max</span>
                    )}
                  </div>
                </div>

                {/* Turbo Acceleration block */}
                <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-850">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Flame size={16} className="text-amber-500" />
                      <span className="font-extrabold text-xs text-white uppercase tracking-wider">Turbo (Accélérateur)</span>
                    </div>
                    <span className="font-mono text-[10px] font-black uppercase text-zinc-500">Niv. {customization.turboLevel}/{UPGRADE_MAX_LEVEL}</span>
                  </div>
                  
                  {/* Upgrade progress spots */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {Array.from({ length: UPGRADE_MAX_LEVEL }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-2 rounded-sm transition-all ${
                          i < customization.turboLevel 
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                            : 'bg-zinc-850'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-550 font-mono tracking-wider font-bold">
                      BONUS : <span className="font-black text-amber-500">+{Math.round(customization.turboLevel * 14)}% Accél.</span>
                    </span>

                    {customization.turboLevel < UPGRADE_MAX_LEVEL ? (
                      <button
                        onClick={handleUpgradeTurbo}
                        disabled={coins < turboCost}
                        className={`px-3.5 py-2 font-mono text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all skew-racing ${
                          coins >= turboCost
                            ? 'bg-amber-500 text-zinc-950 shadow-md cursor-pointer'
                            : 'bg-zinc-850 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Plus size={11} className="block skew-racing-reverse" />
                        <span className="block skew-racing-reverse">{turboCost} Cr.</span>
                      </button>
                    ) : (
                      <span className="text-[9px] tracking-widest uppercase font-mono font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20">Max</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-8 border-t border-zinc-850 pt-5 text-center text-[10px] text-zinc-500 italic uppercase tracking-wider font-bold">
              « Chaque pièce mécanique est ajustée à la main par nos meilleurs mécaniciens hologrammes. »
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
