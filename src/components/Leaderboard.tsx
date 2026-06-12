/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Trophy, Clock, Star, Landmark, RotateCcw, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';
import { TrackRecord, RaceTrack } from '../types';
import { RETAINED_TRACKS } from '../data';
import { audio } from '../audio';

interface LeaderboardProps {
  records: TrackRecord[];
  onResetRecords: () => void;
  onBack: () => void;
}

export default function Leaderboard({ records, onResetRecords, onBack }: LeaderboardProps) {

  const handleResetClick = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser vos records locaux ? Les données seront supprimées définitivement.")) {
      onResetRecords();
      audio.playBeep(200, 0.3, 'sawtooth');
    }
  };

  return (
    <div className="flex flex-col h-full text-zinc-100 overflow-y-auto max-w-4xl mx-auto px-4 py-6" id="leadboard-view">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b-2 border-zinc-800 pb-5">
        <h1 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2.5 uppercase">
          <Trophy className="text-cyan-400 animate-pulse" size={20} />
          <span>Tableau d'Honneur & Records</span>
        </h1>
        <button
          onClick={() => {
            audio.playBeep(440, 0.08);
            onBack();
          }}
          className="bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-xl border-2 border-zinc-800 hover:border-cyan-400 text-zinc-350 text-xs font-black uppercase tracking-wider transition-all"
        >
          Retour Menu
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        
        {/* Track Lists / Best Performance */}
        {RETAINED_TRACKS.map(track => {
          const userBest = records.find(r => r.trackId === track.id);

          return (
            <div 
              key={track.id} 
              className="bg-zinc-900 rounded-3xl p-5 border-2 border-zinc-850 relative flex flex-col justify-between overflow-hidden shadow-md hover:border-cyan-400 transition-all group"
            >
              {/* Card Title */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] uppercase font-mono font-black tracking-widest px-2.5 py-0.5 rounded ${
                    track.difficulty === 'Facile' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    track.difficulty === 'Moyen' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {track.difficulty}
                  </span>
                  
                  <Star size={16} className={userBest ? "text-cyan-400 fill-cyan-450" : "text-zinc-700"} />
                </div>

                <h3 className="font-extrabold text-base italic text-white uppercase tracking-tight mb-2 leading-tight">{track.name}</h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">{track.description}</p>
              </div>

              {/* Times division */}
              <div className="space-y-3 pt-3.5 border-t-2 border-zinc-850 font-mono text-xs text-zinc-300">
                <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-black">Mon Record :</span>
                  <div className="flex items-center gap-1 font-black">
                    <Clock size={12} className="text-cyan-450" />
                    <span className={userBest ? "text-cyan-400 text-[13px] italic font-black" : "text-zinc-650"}>
                      {userBest ? `${userBest.bestTime.toFixed(3)}s` : "Aucun"}
                    </span>
                  </div>
                </div>

                {userBest && (
                  <div className="text-[9px] text-zinc-500 text-right italic mr-1 font-bold">
                    Établi le {new Date(userBest.date).toLocaleDateString()}
                  </div>
                )}

                {/* Developer targets */}
                <div className="pt-2">
                  <span className="text-[9px] text-zinc-550 uppercase tracking-widest font-black block mb-2">TEMPS À BATTRE :</span>
                  <div className="mt-1 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-amber-500 font-black">🥇 Or :</span>
                      <span>{track.goldTime}s</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-zinc-400 font-black">🥈 Argent :</span>
                      <span>{track.silverTime}s</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="flex items-center gap-1 text-amber-700 font-black">🥉 Bronze :</span>
                      <span>{track.bronzeTime}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide to high records & drift tips */}
      <div className="bg-zinc-900 border-2 border-zinc-850 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-cyan-400/5 to-transparent pointer-events-none" />
        <h4 className="font-extrabold italic text-white uppercase text-sm mb-3 flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={15} />
          <span>Conseils de Pro pour le Record Absolu</span>
        </h4>
        <ul className="space-y-2.5 text-xs text-zinc-450 leading-relaxed font-medium">
          <li><strong>Optimisez le drift :</strong> Lâcher brièvement l'accélérateur permet de prendre les virages en épingle sans heurter le décor extérieur.</li>
          <li><strong>Le décor ralentit fortement :</strong> Chaque collision contre un arbre ou un panneau rocheux réduit temporairement votre vitesse à zéro ! Dérivez prudemment.</li>
          <li><strong>Améliorez votre châssis :</strong> Allez dans le <span className="text-cyan-400 font-bold">Garage</span> pour booster votre vitesse de pointe ou le turbo. Certains virages serrés exigent des pneus d'adhérence optimale de Niveau 5.</li>
          <li><strong>Collectez des pièces :</strong> Les pièces disposées sur la piste réapprovisionnent votre jauge de crédits en temps réel pour payer de nouvelles pièces.</li>
        </ul>
      </div>

      {/* Danger Zone: reset board */}
      <div className="mt-auto border-t-2 border-zinc-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-zinc-550 flex items-center gap-2 font-medium">
          <AlertCircle size={14} className="text-red-500/50" />
          <span>Effacer le stockage local supprime tous vos records personnels de course.</span>
        </div>
        <button
          onClick={handleResetClick}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-white border-2 border-zinc-800 hover:border-red-500 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all font-mono font-black uppercase tracking-wider cursor-pointer"
        >
          <RotateCcw size={12} />
          Réinitialiser tous les temps
        </button>
      </div>

    </div>
  );
}
