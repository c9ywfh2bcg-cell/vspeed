/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'START_MENU' | 'GARAGE' | 'TRACK_SELECT' | 'RACING' | 'RACE_SUMMARY' | 'RECORDS';

export interface CarTemplate {
  id: string;
  name: string;
  description: string;
  baseMaxSpeed: number; // Pixels per frame max
  baseAcceleration: number;
  baseHandling: number; // Turning speed
  spriteStyle: 'sport'|'formula'|'muscle'|'cyber';
  cost: number;
}

export interface CarCustomization {
  selectedTemplateId: string;
  color: string;
  engineLevel: number; // Upgrades Max Speed
  tiresLevel: number;  // Upgrades Handling
  turboLevel: number;  // Upgrades Acceleration
}

export interface DecorInstance {
  x: number;
  y: number;
  type: 'tree' | 'fir' | 'rock' | 'cactus' | 'neonSign' | 'barrier' | 'spectator';
  scale: number;
  id: string;
}

export interface CoinInstance {
  x: number;
  y: number;
  collected: boolean;
  id: string;
  bonus?: boolean;
}

export interface TrackPoint {
  x: number;
  y: number;
  width: number;
}

export interface RaceTrack {
  id: string;
  name: string;
  description: string;
  theme: 'forest' | 'desert' | 'cybercity';
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  backgroundColor: string;
  trackColor: string;
  borderColor: string;
  decorColor: string;
  points: TrackPoint[]; // Defines the spine of the race track
  length: number; // Total length coordinate
  laps: number;
  goldTime: number; // seconds to beat
  silverTime: number;
  bronzeTime: number;
  startingCoinsCount: number;
}

export interface TrackRecord {
  trackId: string;
  bestTime: number; // in seconds
  carName: string;
  date: string;
}

export interface RaceMetrics {
  elapsedTime: number; // milliseconds
  speed: number;
  lap: number;
  coinsCollected: number;
  isFinished: boolean;
  checkpointProgress: number; // percentage
  status: 'counting' | 'active' | 'finished' | 'crashed';
}
