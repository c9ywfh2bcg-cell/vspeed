/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Settings, 
  Coins, 
  Flame, 
  Play, 
  Volume2, 
  VolumeX, 
  Compass, 
  Star, 
  ArrowRight,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';
import { GameState, CarCustomization, RaceTrack, TrackRecord } from './types';
import { RETAINED_TRACKS, CAR_TEMPLATES } from './data';
import Garage from './components/Garage';
import RaceCanvas from './components/RaceCanvas';
import Leaderboard from './components/Leaderboard';
import { audio } from './audio';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START_MENU');
  const [selectedTrack, setSelectedTrack] = useState<RaceTrack>(RETAINED_TRACKS[0]);
  
  // Persistent Car Customization State
  const [customization, setCustomization] = useState<CarCustomization>(() => {
    const saved = localStorage.getItem('vitesse_arcade_customization_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      selectedTemplateId: 'sportive',
      color: '#ef4444', // Cyber red
      engineLevel: 1,
      tiresLevel: 1,
      turboLevel: 1
    };
  });

  // Persistent user credits/coins
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('vitesse_arcade_coins_v2');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 1200; // Gift starting coins so player can purchase initial items
  });

  // Persistent track records
  const [records, setRecords] = useState<TrackRecord[]>(() => {
    const saved = localStorage.getItem('vitesse_arcade_records_v2');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  // Race Summary States
  const [summaryData, setSummaryData] = useState<{
    time: number;
    coinsCollected: number;
    creditsEarned: number;
    isNewRecord: boolean;
    medal: 'Néant' | 'Bronze' | 'Argent' | 'Or';
  } | null>(null);

  // Sync states to local storage
  useEffect(() => {
    localStorage.setItem('vitesse_arcade_customization_v2', JSON.stringify(customization));
  }, [customization]);

  useEffect(() => {
    localStorage.setItem('vitesse_arcade_coins_v2', coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('vitesse_arcade_records_v2', JSON.stringify(records));
  }, [records]);

  // Clean initialization beep
  useEffect(() => {
    audio.playBeep(523.25, 0.1, 'sine'); // Clean touch tone on load
  }, []);

  const handleStartRace = (trackToStart: RaceTrack) => {
    setSelectedTrack(trackToStart);
    setGameState('RACING');
    audio.playBeep(587.33, 0.15, 'sine');
  };

  // Callback when player completes the required track laps
  const handleFinishRace = (finalTime: number, coinsCollected: number) => {
    const currentTrackId = selectedTrack.id;
    const oldRecordObj = records.find(r => r.trackId === currentTrackId);
    const oldRecord = oldRecordObj ? oldRecordObj.bestTime : Infinity;
    
    const isNewRecord = finalTime < oldRecord;

    // Save record if it is a personal best
    if (isNewRecord) {
      const activeCar = CAR_TEMPLATES.find(c => c.id === customization.selectedTemplateId) || CAR_TEMPLATES[0];
      const newRecordItem: TrackRecord = {
        trackId: currentTrackId,
        bestTime: finalTime,
        carName: activeCar.name,
        date: new Date().toISOString()
      };

      setRecords(prev => {
        const filtered = prev.filter(r => r.trackId !== currentTrackId);
        return [...filtered, newRecordItem];
      });
    }

    // Process Medal structure
    let medal: 'Néant' | 'Bronze' | 'Argent' | 'Or' = 'Néant';
    if (finalTime <= selectedTrack.goldTime) {
      medal = 'Or';
    } else if (finalTime <= selectedTrack.silverTime) {
      medal = 'Argent';
    } else if (finalTime <= selectedTrack.bronzeTime) {
      medal = 'Bronze';
    }

    // Standard high dividend earnings: Finish bonus + (coins harvested * multipliers)
    const baseCompletionPrize = 400; // base standard reward
    const coinsCoeff = coinsCollected * 10;
    const totalCreditsEarned = baseCompletionPrize + coinsCoeff + (medal === 'Or' ? 500 : medal === 'Argent' ? 300 : medal === 'Bronze' ? 150 : 0);

    setCoins(prev => prev + totalCreditsEarned);

    setSummaryData({
      time: finalTime,
      coinsCollected,
      creditsEarned: totalCreditsEarned,
      isNewRecord,
      medal
    });

    setGameState('RACE_SUMMARY');
  };

  const handleResetAllRecords = () => {
    setRecords([]);
    localStorage.removeItem('vitesse_arcade_records_v2');
  };

  const activeCarTemplate = CAR_TEMPLATES.find(c => c.id === customization.selectedTemplateId) || CAR_TEMPLATES[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-cyan-400 selection:text-zinc-950">
      
      {/* Top universal high-octane navigation bar in Vibrant Palette styling */}
      <header className="bg-zinc-900 border-b-2 border-zinc-800 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <button 
            onClick={() => {
              audio.playBeep(440, 0.08);
              setGameState('START_MENU');
            }}
            className="flex flex-col items-center sm:items-start cursor-pointer group text-left"
          >
            <span className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase leading-none mb-1">Hyper-Drive Racing</span>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white group-hover:text-cyan-400 transition-colors">
              V-SPEED<span className="text-red-500 bg-clip-text">.</span>
            </h1>
          </button>
          
          {/* Dashboard showing user main wallet stats & parameters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-950 border-2 border-zinc-800 px-4 py-1.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Coins size={14} className="text-cyan-400 animate-pulse" />
              <span className="font-mono text-xs font-black text-cyan-400 uppercase">
                {coins} <span className="text-[9px] text-zinc-500 font-sans tracking-widest font-bold">Crédits</span>
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400 font-mono bg-zinc-950 border-2 border-zinc-800 px-4 py-1.5 rounded-xl uppercase">
              <span className="text-zinc-500">Véhicule :</span>
              <span className="font-black text-white italic">{activeCarTemplate.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container state switch routers */}
      <main className="flex-1 flex flex-col relative">
        
        {/* State : START MENU */}
        {gameState === 'START_MENU' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden" id="menu-screen-view">
            
            {/* Grid lights accents backgrounds */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-650/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full relative z-10 text-center space-y-8 py-8">
              
              {/* Retro Hero title badge */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase font-mono font-black tracking-[0.2em] px-4 py-1 rounded-full mb-1">
                  <Flame size={12} className="animate-pulse text-red-500" />
                  <span>JEU DE COURSE ARCADE SOLO</span>
                </div>
                
                <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)]">
                  V-SPEED<span className="text-red-500 text-glow">.</span>
                </h1>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed uppercase tracking-wider">
                  Pilotez, customisez, récoltez des crédits et pulvérisez les records du circuit !
                </p>
              </div>

              {/* Dynamic stylized minimalist car rendering as a premium preview box */}
              <div className="bg-gradient-to-b from-zinc-900 to-black rounded-3xl border-2 border-zinc-800 relative overflow-hidden flex flex-col items-center justify-center p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(239,68,68,0.2),transparent)] pointer-events-none" />
                <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 mb-2 uppercase">ATELIER PRÉPARATION</span>
                <div className="w-56 h-28 flex items-center justify-center relative">
                  <div className="absolute w-32 h-8 bg-red-650 rounded-full blur-2xl opacity-40 -z-10" />
                  <div className="absolute w-40 h-4 bg-zinc-950 absolute bottom-4 opacity-50 blur-sm rounded-full -z-10" />
                  <svg viewBox="0 0 100 50" className="w-full h-full max-w-full drop-shadow-[0_15px_25px_rgba(239,68,68,0.3)] animate-pulse">
                    <rect x="18" y="5" width="14" height="6" rx="2" fill="#020617" />
                    <rect x="68" y="5" width="14" height="6" rx="2" fill="#020617" />
                    <rect x="18" y="39" width="14" height="6" rx="2" fill="#020617" />
                    <rect x="68" y="39" width="14" height="6" rx="2" fill="#020617" />
                    <rect x="15" y="10" width="70" height="30" rx="8" fill={customization.color} stroke="#ffffff44" strokeWidth="0.8" />
                    <rect x="15" y="22" width="70" height="6" fill="#ffffff" opacity="0.3" />
                    <path d="M 40 14 Q 55 13 65 20 Q 55 37 40 36 Z" fill="#0f172a" stroke="#ffffff32" strokeWidth="0.5" />
                    <ellipse cx="85" cy="18" rx="2" ry="3.5" fill="#fef08a" />
                    <ellipse cx="85" cy="32" rx="2" ry="3.5" fill="#fef08a" />
                  </svg>
                </div>
              </div>

              {/* Action Buttons list with gorgeous angled layout styling */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    audio.playBeep(440, 0.08);
                    setGameState('TRACK_SELECT');
                  }}
                  className="w-full bg-white text-black hover:bg-cyan-400 hover:text-zinc-950 font-black italic uppercase text-lg py-4 px-6 skew-racing transition-all duration-200 cursor-pointer group flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_4px_25px_rgba(34,211,238,0.2)]"
                >
                  <span className="block skew-racing-reverse flex items-center gap-2">
                    <Play size={16} className="fill-current" />
                    <span>Race Now / Courir</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      audio.playBeep(440, 0.08);
                      setGameState('GARAGE');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-cyan-400 text-white font-black italic py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-205 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Settings size={14} className="text-cyan-400" />
                    <span>L'Atelier</span>
                  </button>

                  <button
                    onClick={() => {
                      audio.playBeep(440, 0.08);
                      setGameState('RECORDS');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-cyan-400 text-white font-black italic py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-205 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy size={14} className="text-red-500" />
                    <span>Records</span>
                  </button>
                </div>
              </div>

              {/* Status footer with total records indicator */}
              <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-center gap-2 tracking-widest font-black uppercase">
                <span>CIRCULATEURS ENREGISTRÉS :</span>
                <span className="text-cyan-450 font-black text-xs">{records.length} / 3</span>
              </div>

            </div>
          </div>
        )}

        {/* State : TRACK_SELECT */}
        {gameState === 'TRACK_SELECT' && (
          <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-6 py-8 w-full" id="track-selection-view">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 pb-6 border-b-2 border-zinc-800">
              <div>
                <span className="text-xs font-black tracking-[0.3em] text-cyan-400 uppercase">Select Scenery</span>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-white mt-1">
                  SÉLECTION DU TRACÉ<span className="text-red-500 font-bold">.</span>
                </h1>
                <p className="text-xs text-zinc-450 mt-2 font-medium">Choisissez une piste pour mettre vos compétences de pilote à l'épreuve !</p>
              </div>

              <button
                onClick={() => {
                  audio.playBeep(440, 0.08);
                  setGameState('START_MENU');
                }}
                className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white border-2 border-zinc-800 bg-zinc-900 hover:bg-zinc-850 px-5 py-2.5 transition-all cursor-pointer"
              >
                Retour
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {RETAINED_TRACKS.map(trackItem => {
                const isSelected = selectedTrack.id === trackItem.id;
                const trackRecord = records.find(r => r.trackId === trackItem.id);

                return (
                  <div
                    key={trackItem.id}
                    onClick={() => {
                      setSelectedTrack(trackItem);
                      audio.playBeep(500, 0.05);
                    }}
                    className={`rounded-2xl bg-zinc-900/90 border-2 p-5 flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected 
                        ? 'border-cyan-405 bg-black shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.02]' 
                        : 'border-zinc-800 hover:border-zinc-650 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Decorative backdrop glow for selected card */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-cyan-950/20 to-transparent opacity-60 pointer-events-none" />
                    )}

                    <div className="relative z-10">
                      {/* Sub-header Difficulty labels */}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-[9px] uppercase font-mono font-black tracking-widest px-2.5 py-1 rounded-md border ${
                          trackItem.difficulty === 'Facile' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          trackItem.difficulty === 'Moyen' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {trackItem.difficulty}
                        </span>

                        <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">{trackItem.laps} Tours</span>
                      </div>

                      <h3 className="text-xl font-black italic tracking-tight text-white mb-2 uppercase">{trackItem.name}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-6">{trackItem.description}</p>
                    </div>

                    {/* Circuit micro details layout */}
                    <div className="space-y-3.5 pt-4 border-t border-zinc-800/85 font-mono text-xs relative z-10">
                      
                      <div className="flex justify-between items-center text-[10px] tracking-wide">
                        <span className="text-zinc-500 uppercase font-bold">🥇 Temps Or :</span>
                        <span className="text-amber-400 font-black">{trackItem.goldTime}s</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] tracking-wide">
                        <span className="text-zinc-500 uppercase font-bold">⏱️ Mon Record :</span>
                        <span className={trackRecord ? "text-cyan-400 font-black" : "text-zinc-400 italic"}>
                          {trackRecord ? `${trackRecord.bestTime.toFixed(3)}s` : "Aucun"}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // avoid double fire
                          handleStartRace(trackItem);
                        }}
                        className={`w-full mt-4 py-3 px-4 font-black italic uppercase text-xs tracking-widest transition-all skew-racing ${
                          isSelected
                            ? 'bg-cyan-400 text-black hover:bg-white shadow-[0_4px_12px_rgba(6,182,212,0.3)] hover:shadow-[0_4px_20px_rgba(255,255,255,0.4)]'
                            : 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        <span className="block skew-racing-reverse">Lancer la Course</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Micro warning notice */}
            <div className="mt-10 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="italic uppercase tracking-wider font-bold text-[10px]">Le tracé des canyons de nuit offre une visibilité de virages réduite. Améliorez vos pneus d'abord !</span>
            </div>

          </div>
        )}

        {/* State : RACING */}
        {gameState === 'RACING' && (
          <RaceCanvas
            track={selectedTrack}
            customization={customization}
            onFinishRace={handleFinishRace}
            onExit={() => setGameState('START_MENU')}
          />
        )}

        {/* State : GARAGE */}
        {gameState === 'GARAGE' && (
          <Garage
            customization={customization}
            setCustomization={setCustomization}
            coins={coins}
            setCoins={setCoins}
            onBack={() => setGameState('START_MENU')}
          />
        )}

        {/* State : RECORDS */}
        {gameState === 'RECORDS' && (
          <Leaderboard
            records={records}
            onResetRecords={handleResetAllRecords}
            onBack={() => setGameState('START_MENU')}
          />
        )}

        {/* State : RACE_SUMMARY */}
        {gameState === 'RACE_SUMMARY' && summaryData && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md relative" id="summary-view">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            <div className="max-w-md w-full bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl text-center space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-red-500 to-cyan-400" />
              
              <div className="flex justify-center">
                <div className="bg-cyan-500/10 border-2 border-cyan-400/30 p-4 rounded-full text-cyan-450 animate-pulse">
                  <Award size={36} />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-cyan-400 font-extrabold tracking-[0.2em] uppercase">RACE FINISHED</span>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter mt-1">COURSE TERMINÉE<span className="text-red-500 font-bold">.</span></h2>
                <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Ligne d'arrivée franchie sur {selectedTrack.name}</p>
              </div>

              {/* Time stats card */}
              <div className="bg-zinc-950 border-2 border-zinc-805 p-5 rounded-2xl space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <span className="text-zinc-500 uppercase font-black tracking-wide">Chronomètre :</span>
                  <span className="text-cyan-400 font-black text-xl italic">{summaryData.time.toFixed(3)}s</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <span className="text-zinc-500 uppercase font-black tracking-wide">Pièces récoltées :</span>
                  <span className="text-cyan-300 font-black text-sm">+{summaryData.coinsCollected}</span>
                </div>

                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-zinc-405 uppercase font-black tracking-wide">Crédits Gagnés :</span>
                  <span className="text-red-500 font-black text-lg flex items-center gap-1.5 italic">
                    <Coins size={14} className="text-red-500" />
                    <span>+{summaryData.creditsEarned}</span>
                  </span>
                </div>
              </div>

              {/* Records status badge */}
              {summaryData.isNewRecord && (
                <div className="bg-red-500/15 border-2 border-red-500/30 rounded-2xl py-3 px-4 text-red-500 font-mono text-xs font-black tracking-widest animate-bounce flex items-center justify-center gap-2">
                  <Sparkles size={14} className="text-red-500 animate-spin" />
                  <span>NOUVEAU RECORD PERSONNEL ÉTABLI !</span>
                </div>
              )}

              {/* Medal award display */}
              {summaryData.medal !== 'Néant' && (
                <div className="bg-zinc-950 border-2 border-zinc-805 rounded-2xl py-3.5 px-4 flex items-center justify-between">
                  <span className="text-xs text-zinc-450 uppercase font-bold tracking-wider">Médaille :</span>
                  <span className={`text-[10px] uppercase font-mono font-black tracking-widest px-3.5 py-1.5 rounded-full border flex items-center gap-1.5 ${
                    summaryData.medal === 'Or' ? 'bg-amber-500/15 text-amber-400 border-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                    summaryData.medal === 'Argent' ? 'bg-zinc-300/15 text-zinc-350 border-zinc-300/35' :
                    'bg-amber-700/15 text-amber-600 border-amber-700/35'
                  }`}>
                    {summaryData.medal} 🏆
                  </span>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="space-y-3 pt-3 border-t-2 border-zinc-800">
                <button
                  onClick={() => {
                    audio.playBeep(440, 0.08);
                    setGameState('RACING');
                  }}
                  className="w-full bg-white text-zinc-950 font-black italic uppercase py-3.5 px-4 text-xs tracking-widest skew-racing hover:bg-cyan-400 transition-colors cursor-pointer block"
                >
                  <span className="block skew-racing-reverse">Recommencer la Course</span>
                </button>

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={() => {
                      audio.playBeep(440, 0.08);
                      setGameState('GARAGE');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-cyan-400 text-zinc-300 font-black py-3 px-3 rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Atelier (Garage)
                  </button>

                  <button
                    onClick={() => {
                      audio.playBeep(440, 0.08);
                      setGameState('START_MENU');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-cyan-400 text-zinc-305 font-black py-3 px-3 rounded-xl text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Menu Principal
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Universal Footer copyrights */}
      <footer className="bg-slate-950 border-t border-slate-900 text-[10px] text-slate-600 text-center py-4 font-mono">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 Vitesse Arcade Engine - Tous droits réservés.</span>
          <span>Ambiance synthétique motorisée par l'API Web Audio</span>
        </div>
      </footer>

    </div>
  );
}
