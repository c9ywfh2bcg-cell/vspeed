/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CarTemplate, RaceTrack } from './types';

export const CAR_TEMPLATES: CarTemplate[] = [
  {
    id: 'sportive',
    name: 'La Sportive (Aero-S)',
    description: 'Une voiture polyvalente équilibrée, idéale pour les débutants.',
    baseMaxSpeed: 6.2,
    baseAcceleration: 0.16,
    baseHandling: 0.048,
    spriteStyle: 'sport',
    cost: 0,
  },
  {
    id: 'cyber',
    name: 'La Cyber-V (Futuriste)',
    description: 'Accélération fulgurante avec un look néon agressif.',
    baseMaxSpeed: 6.5,
    baseAcceleration: 0.22,
    baseHandling: 0.038,
    spriteStyle: 'cyber',
    cost: 1500,
  },
  {
    id: 'muscle',
    name: 'Le Faucon Muscle (V8)',
    description: 'Une bête de vitesse de pointe, mais glisse plus dans les virages.',
    baseMaxSpeed: 7.4,
    baseAcceleration: 0.13,
    baseHandling: 0.034,
    spriteStyle: 'muscle',
    cost: 3000,
  },
  {
    id: 'formula',
    name: 'La Furtive (Formula-1)',
    description: 'Une monoplace ultra-légère avec une maniabilité chirurgicale.',
    baseMaxSpeed: 7.0,
    baseAcceleration: 0.19,
    baseHandling: 0.065,
    spriteStyle: 'formula',
    cost: 5000,
  }
];

export const UPGRADE_MAX_LEVEL = 5;

// Cost formulas for upgrading parts in the Garage
export const getUpgradeCost = (currentLevel: number): number => {
  if (currentLevel >= UPGRADE_MAX_LEVEL) return 0;
  return (currentLevel + 1) * 450;
};

// Calculate actual stats based on levels
export const getUpgradedMaxSpeed = (baseSpeed: number, level: number): number => {
  return baseSpeed + level * 0.45;
};

export const getUpgradedAcceleration = (baseAcc: number, level: number): number => {
  return baseAcc + level * 0.025;
};

export const getUpgradedHandling = (baseHandling: number, level: number): number => {
  return baseHandling + level * 0.006;
};

// Help construct circuit tracks with smooth key coordinates
// Width is the road width at that track coordinate
export const RETAINED_TRACKS: RaceTrack[] = [
  {
    id: 'forest_run',
    name: 'Forêt de Pins (Pine Forest)',
    description: 'Un tracé d\'initiation entouré de grands sapins verts et de lignes droites rapides.',
    theme: 'forest',
    difficulty: 'Facile',
    backgroundColor: '#14532d', // dark forest green
    trackColor: '#334155', // dark slate grey
    borderColor: '#e2e8f0', // ice slate line
    decorColor: '#16a34a', // light green foliage
    length: 0, // calculated dynamically below
    laps: 2,
    goldTime: 25,
    silverTime: 32,
    bronzeTime: 40,
    startingCoinsCount: 15,
    points: [
      { x: 300, y: 150, width: 90 },
      { x: 700, y: 150, width: 90 },
      { x: 1000, y: 250, width: 90 },
      { x: 1100, y: 550, width: 95 },
      { x: 950, y: 800, width: 95 },
      { x: 500, y: 850, width: 90 },
      { x: 250, y: 700, width: 90 },
      { x: 150, y: 400, width: 90 },
    ]
  },
  {
    id: 'neon_desert',
    name: 'Désert Flamboyant (Neon Desert)',
    description: 'Virages serrés, sable glissant, cactus et nids de poule accidentés.',
    theme: 'desert',
    difficulty: 'Moyen',
    backgroundColor: '#7c2d12', // dusty warm terracotta
    trackColor: '#1e293b', // asphalt
    borderColor: '#f97316', // blazing orange
    decorColor: '#ca8a04', // desert orange gold
    length: 0,
    laps: 2,
    goldTime: 35,
    silverTime: 46,
    bronzeTime: 55,
    startingCoinsCount: 22,
    points: [
      { x: 200, y: 150, width: 85 },
      { x: 600, y: 150, width: 85 },
      { x: 700, y: 350, width: 80 },
      { x: 1000, y: 350, width: 80 },
      { x: 1150, y: 550, width: 85 },
      { x: 1000, y: 800, width: 80 },
      { x: 550, y: 800, width: 85 },
      { x: 450, y: 600, width: 80 }, // S-curve bend
      { x: 250, y: 600, width: 80 },
      { x: 150, y: 400, width: 85 },
    ]
  },
  {
    id: 'cyber_run',
    name: 'Nuit Urbaine (Canyon Run)',
    description: 'Une course de nuit spectaculaire avec des virages en épingle extrêmement étroits.',
    theme: 'cybercity',
    difficulty: 'Difficile',
    backgroundColor: '#0c0a09', // pitch-dark volcanic / cyber
    trackColor: '#1a1a24', // high contrast neon road
    borderColor: '#06b6d4', // cyan synth line
    decorColor: '#d946ef', // fuchsia magenta lighting
    length: 0,
    laps: 3,
    goldTime: 50,
    silverTime: 65,
    bronzeTime: 80,
    startingCoinsCount: 30,
    points: [
      { x: 200, y: 150, width: 75 },
      { x: 800, y: 150, width: 75 },
      { x: 1050, y: 300, width: 75 },
      { x: 1100, y: 600, width: 70 },
      { x: 850, y: 550, width: 70 }, // sharp chicane
      { x: 750, y: 800, width: 75 },
      { x: 500, y: 700, width: 70 }, // hairpin
      { x: 300, y: 850, width: 75 },
      { x: 120, y: 600, width: 70 },
      { x: 180, y: 350, width: 75 },
    ]
  }
];

// Helper to interpolate between standard list indices smoothly (Catmull-Rom spline or simple Linear Interpolation)
// To construct the continuous virtual looping road
export const getInterpolatedTrackPoint = (points: { x: number; y: number; width: number }[], t: number) => {
  const count = points.length;
  // Make sure t wraps around 0..1 representing the loop
  const normalizedT = ((t % 1) + 1) % 1;
  const rawIdx = normalizedT * count;
  const idx0 = Math.floor(rawIdx) % count;
  const idx1 = (idx0 + 1) % count;
  const localPercent = rawIdx - Math.floor(rawIdx);

  const p0 = points[idx0];
  const p1 = points[idx1];

  // Also take p-1 and p+2 for smoother Catmull-Rom spline curve!
  const idxMinus = (idx0 - 1 + count) % count;
  const idxPlus2 = (idx1 + 1) % count;

  const pm = points[idxMinus];
  const pp2 = points[idxPlus2];

  // Catmull-Rom formula
  const solveSpline = (v0: number, v1: number, v2: number, v3: number, x: number) => {
    return 0.5 * (
      (2 * v1) +
      (-v0 + v2) * x +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * x * x +
      (-v0 + 3 * v1 - 3 * v2 + v3) * x * x * x
    );
  };

  return {
    x: solveSpline(pm.x, p0.x, p1.x, pp2.x, localPercent),
    y: solveSpline(pm.y, p0.y, p1.y, pp2.y, localPercent),
    width: solveSpline(pm.width, p0.width, p1.width, pp2.width, localPercent)
  };
};
