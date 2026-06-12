/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  HelpCircle, 
  Trophy, 
  VolumeX, 
  Volume2, 
  Coins, 
  RotateCcw, 
  Compass, 
  ArrowLeft,
  Pause,
  ChevronRight
} from 'lucide-react';
import { RaceTrack, CarCustomization, RaceMetrics, DecorInstance, CoinInstance, TrackPoint } from '../types';
import { audio } from '../audio';
import { getInterpolatedTrackPoint, getUpgradedMaxSpeed, getUpgradedAcceleration, getUpgradedHandling } from '../data';

interface RaceCanvasProps {
  track: RaceTrack;
  customization: CarCustomization;
  onFinishRace: (finalTime: number, coinsEarned: number) => void;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  decay: number;
  type: 'exhaust' | 'skid' | 'spark' | 'sparkle';
}

export default function RaceCanvas({ track, customization, onFinishRace, onExit }: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [metrics, setMetrics] = useState<RaceMetrics>({
    elapsedTime: 0,
    speed: 0,
    lap: 1,
    coinsCollected: 0,
    isFinished: false,
    checkpointProgress: 0,
    status: 'counting',
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);
  const [countdownText, setCountdownText] = useState('3');

  // Input bindings
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // virtual touch buttons for mobile
  const [touchControls, setTouchControls] = useState({
    left: false,
    right: false,
    gas: false,
    brake: false
  });

  // Physical car coordinates & movement state
  const carState = useRef({
    x: track.points[0].x,
    y: track.points[0].y,
    angle: 0, // direction angle in radians
    speed: 0,
    skidFactor: 0,
    screenShake: 0,
    currentSpinePercent: 0, // 0..1 representing progress along track circle
    lastCheckpointIndex: 0,
    checkpointsCleared: new Set<number>(),
  });

  // Sample points to make spline collision checks hyper-fast
  const sampledSplinePoints = useRef<TrackPoint[]>([]);
  const trackDecor = useRef<DecorInstance[]>([]);
  const trackCoins = useRef<CoinInstance[]>([]);
  const particles = useRef<Particle[]>([]);

  // We need to keep a clock of true racing elapsed time
  const raceClock = useRef({
    startTime: 0,
    totalElapsed: 0,
    pausedTimeOffset: 0,
    lastTime: 0,
    countdownStart: 0,
  });

  // Generate continuous spline samples, decor, and coins once on track load
  useEffect(() => {
    // 1. Build sampled points for collision & distance tracking (300 discrete points is perfect)
    const samples: TrackPoint[] = [];
    const sampleCount = 400;
    for (let i = 0; i < sampleCount; i++) {
      samples.push(getInterpolatedTrackPoint(track.points, i / sampleCount));
    }
    sampledSplinePoints.current = samples;

    // 2. Set starting position & direction pointing from first point to second point
    const startPt = samples[0];
    const secondPt = samples[4]; // slightly ahead
    const dx = secondPt.x - startPt.x;
    const dy = secondPt.y - startPt.y;
    carState.current = {
      x: startPt.x,
      y: startPt.y,
      angle: Math.atan2(dy, dx),
      speed: 0,
      skidFactor: 0,
      screenShake: 0,
      currentSpinePercent: 0,
      lastCheckpointIndex: 0,
      checkpointsCleared: new Set<number>([0]), // starting checkpoint is clear
    };

    // 3. Generate decor instances neatly on either side of the asphalt
    const generatedDecor: DecorInstance[] = [];
    const generatedCoins: CoinInstance[] = [];

    // Place decors at regular intervals along sample spine
    for (let i = 0; i < sampleCount; i += 2) {
      const idx = i;
      const nextIdx = (i + 1) % sampleCount;
      const pt = samples[idx];
      const nextPt = samples[nextIdx];

      // normal perpendicular vector
      const tangentX = nextPt.x - pt.x;
      const tangentY = nextPt.y - pt.y;
      const dist = Math.hypot(tangentX, tangentY);
      if (dist === 0) continue;

      const normX = -tangentY / dist;
      const normY = tangentX / dist;

      // Make slightly wavy random offset distances
      const rightOffset = pt.width / 2 + 30 + Math.random() * 80;
      const leftOffset = -(pt.width / 2 + 30 + Math.random() * 80);

      // Decors can reside on left and right borders of the track
      const decorTypes: Array<'tree' | 'fir' | 'rock' | 'cactus' | 'neonSign' | 'barrier' | 'spectator'> = [];
      if (track.theme === 'forest') {
        decorTypes.push('tree', 'fir', 'rock');
      } else if (track.theme === 'desert') {
        decorTypes.push('cactus', 'rock', 'spectator');
      } else {
        decorTypes.push('neonSign', 'barrier', 'spectator');
      }

      const leftType = decorTypes[Math.floor(Math.random() * decorTypes.length)];
      const rightType = decorTypes[Math.floor(Math.random() * decorTypes.length)];

      if (Math.random() < 0.6) {
        generatedDecor.push({
          id: `dec-l-${i}`,
          type: leftType,
          x: pt.x + normX * leftOffset,
          y: pt.y + normY * leftOffset,
          scale: 0.7 + Math.random() * 0.6
        });
      }

      if (Math.random() < 0.6) {
        generatedDecor.push({
          id: `dec-r-${i}`,
          type: rightType,
          x: pt.x + normX * rightOffset,
          y: pt.y + normY * rightOffset,
          scale: 0.7 + Math.random() * 0.6
        });
      }

      // 4. Populate dynamic coins along track curves or center lanes
      if (i % 8 === 0 && Math.random() < 0.85) {
        // Place coin inside the lane boundaries (deviating slightly from middle lane)
        const laneDeviateFraction = (Math.random() - 0.5) * 0.6; // keep within 60% of center
        generatedCoins.push({
          id: `coin-${i}`,
          x: pt.x + normX * (pt.width / 2 * laneDeviateFraction),
          y: pt.y + normY * (pt.width / 2 * laneDeviateFraction),
          collected: false,
          bonus: Math.random() < 0.15 // 15% chance of blue bonus coin worth triple!
        });
      }
    }

    trackDecor.current = generatedDecor;
    trackCoins.current = generatedCoins;
    particles.current = [];

    // Trigger synth motor engine sounds
    if (soundEnabled) {
      audio.startEngine();
      audio.updateEnginePitch(0);
    }

    // Set countdown timers
    raceClock.current.countdownStart = Date.now();
    
    return () => {
      audio.stopEngine();
    };
  }, [track, soundEnabled]);

  // Keyboard Event Hooks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      
      // Prevent browser default arrow key scrolling during active racing loop
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
        e.preventDefault();
      }

      keysPressed.current[k] = true;
      keysPressed.current[e.key] = true; // safe fallback for capitalized arrow labels
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysPressed.current[k] = false;
      keysPressed.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync canvas execution loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      updateGamePhysics(dt);
      renderGameCanvas();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, touchControls, metrics.status]);

  // Handle countdown text in real-time
  useEffect(() => {
    if (metrics.status !== 'counting' || showTutorial) return;

    const timer = setInterval(() => {
      const diff = Date.now() - raceClock.current.countdownStart;
      if (diff < 1000) {
        setCountdownText('3');
        audio.playBeep(400, 0.1, 'sine');
      } else if (diff < 2000) {
        setCountdownText('2');
        audio.playBeep(400, 0.1, 'sine');
      } else if (diff < 3000) {
        setCountdownText('1');
        audio.playBeep(400, 0.1, 'sine');
      } else if (diff < 4000) {
        setCountdownText('PARTEZ !');
        setMetrics(prev => ({ ...prev, status: 'active' }));
        audio.playBeep(800, 0.35, 'sine');
        raceClock.current.startTime = Date.now();
      } else {
        setCountdownText('');
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [metrics.status, showTutorial]);

  // Main simulation model running 60Hz
  const updateGamePhysics = (dt: number) => {
    if (isPaused) return;

    const currentStatus = metrics.status;
    const isCounting = currentStatus === 'counting';
    const isFinished = currentStatus === 'finished';

    // Update screen shake decay
    if (carState.current.screenShake > 0) {
      carState.current.screenShake = Math.max(0, carState.current.screenShake - 0.5);
    }

    // Standard engine physical metrics based on user Customization levels
    // Choose actual metrics from user templates & upgrade coefficients
    const maxSpeedCoeff = getUpgradedMaxSpeed(
      customization.selectedTemplateId === 'sportive' ? 6.2 :
      customization.selectedTemplateId === 'cyber' ? 6.5 :
      customization.selectedTemplateId === 'muscle' ? 7.4 : 7.0, 
      customization.engineLevel
    );

    const accelCoeff = getUpgradedAcceleration(
      customization.selectedTemplateId === 'sportive' ? 0.16 :
      customization.selectedTemplateId === 'cyber' ? 0.22 :
      customization.selectedTemplateId === 'muscle' ? 0.13 : 0.19,
      customization.turboLevel
    );

    const turnHandling = getUpgradedHandling(
      customization.selectedTemplateId === 'sportive' ? 0.048 :
      customization.selectedTemplateId === 'cyber' ? 0.038 :
      customization.selectedTemplateId === 'muscle' ? 0.034 : 0.065,
      customization.tiresLevel
    );

    // Speed caps
    const frictionOnRoad = 0.985;
    const frictionOffRoad = 0.925; // slows down strongly
    
    let currentCar = carState.current;

    // 1. Process directional steering
    const turnLeft = keysPressed.current['arrowleft'] || keysPressed.current['q'] || keysPressed.current['a'] || touchControls.left;
    const turnRight = keysPressed.current['arrowright'] || keysPressed.current['d'] || touchControls.right;
    const gas = keysPressed.current['arrowup'] || keysPressed.current['z'] || keysPressed.current['w'] || touchControls.gas;
    const brake = keysPressed.current['arrowdown'] || keysPressed.current['s'] || touchControls.brake;

    // Turn scaling factor. Steering sensitivity correlates directly to vehicle velocity
    let steerAmount = 0;
    if (Math.abs(currentCar.speed) > 0.1) {
      // Steer sensitivity peaks at mid speed ratios
      const speedRatio = Math.min(1.0, Math.abs(currentCar.speed) / maxSpeedCoeff);
      steerAmount = turnHandling * speedRatio;
    }

    if (turnLeft && !isCounting && !isFinished) {
      currentCar.angle -= steerAmount;
    }
    if (turnRight && !isCounting && !isFinished) {
      currentCar.angle += steerAmount;
    }

    // 2. Identify road vs grass boundaries (Collision spline check!)
    let closestIndex = 0;
    let minDistance = Infinity;

    // Look up nearby spline sections to identify the car's current location relative to path Center
    const spinePoints = sampledSplinePoints.current;
    for (let i = 0; i < spinePoints.length; i++) {
      const pt = spinePoints[i];
      const dist = Math.hypot(currentCar.x - pt.x, currentCar.y - pt.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const currentSpinePt = spinePoints[closestIndex];
    const roadWidthAtCar = currentSpinePt.width;
    const isOnRoad = minDistance < (roadWidthAtCar / 2);

    // Apply friction and power
    const appliedFriction = isOnRoad ? frictionOnRoad : frictionOffRoad;
    currentCar.speed *= appliedFriction;

    if (gas && !isCounting && !isFinished) {
      currentCar.speed += accelCoeff;
    } else if (brake && !isCounting && !isFinished) {
      currentCar.speed -= accelCoeff * 0.7; // reverse decelerates
    }

    // Cap maximum speeds under various surfaces
    const currentMaxSpeed = isOnRoad ? maxSpeedCoeff : 2.5; // crawl speed offroad
    if (currentCar.speed > currentMaxSpeed) {
      currentCar.speed = currentMaxSpeed;
    } else if (currentCar.speed < -currentMaxSpeed / 2) {
      currentCar.speed = -currentMaxSpeed / 2;
    }

    // 3. Compute vector displacement coordinates
    currentCar.x += Math.cos(currentCar.angle) * currentCar.speed;
    currentCar.y += Math.sin(currentCar.angle) * currentCar.speed;

    // 4. Update Web Audio frequency based on relative velocity speed
    if (soundEnabled && currentStatus === 'active') {
      const speedPct = Math.abs(currentCar.speed) / maxSpeedCoeff;
      audio.updateEnginePitch(speedPct);
    }

    // 5. Generate tire drift sliding graphics if sliding around bends on asphalt
    if (isOnRoad && (turnLeft || turnRight) && Math.abs(currentCar.speed) > 3.5) {
      currentCar.skidFactor = Math.min(1.0, currentCar.skidFactor + 0.1);
      
      if (Math.random() < 0.45) {
        // Play skid sounds
        if (soundEnabled) audio.playDriftSqueal();
        
        // Push twin tire skid particles behind the car chassis
        const cosAngle = Math.cos(currentCar.angle);
        const sinAngle = Math.sin(currentCar.angle);
        // left tire position offset
        particles.current.push({
          x: currentCar.x - cosAngle * 10 + sinAngle * 5,
          y: currentCar.y - sinAngle * 10 - cosAngle * 5,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: 4 + Math.random() * 2,
          color: 'rgba(51, 65, 85, 0.45)', // dark dust
          life: 1.0,
          decay: 0.04,
          type: 'skid'
        });

        // right tire position offset
        particles.current.push({
          x: currentCar.x - cosAngle * 10 - sinAngle * 5,
          y: currentCar.y - sinAngle * 10 + cosAngle * 5,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: 4 + Math.random() * 2,
          color: 'rgba(51, 65, 85, 0.45)',
          life: 1.0,
          decay: 0.04,
          type: 'skid'
        });
      }
    } else {
      currentCar.skidFactor = Math.max(0.0, currentCar.skidFactor - 0.15);
    }

    // Always bubble smoke exhaust particles when engine is active
    if (Math.abs(currentCar.speed) > 0.5 && Math.random() < 0.3) {
      particles.current.push({
        x: currentCar.x - Math.cos(currentCar.angle) * 12,
        y: currentCar.y - Math.sin(currentCar.angle) * 12,
        vx: -Math.cos(currentCar.angle) * 0.5 + (Math.random() - 0.5) * 0.3,
        vy: -Math.sin(currentCar.angle) * 0.5 + (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 4,
        color: track.theme === 'cybercity' ? 'rgba(217, 70, 239, 0.3)' : 'rgba(226, 232, 240, 0.4)',
        life: 1.0,
        decay: 0.06,
        type: 'exhaust'
      });
    }

    // 6. Collate solid Decor collisions
    trackDecor.current.forEach(decor => {
      // Custom hitboxes radius depending on tree, rock, or post shape
      const hitRadius = decor.type === 'rock' ? 18 * decor.scale : 16 * decor.scale;
      const dist = Math.hypot(currentCar.x - decor.x, currentCar.y - decor.y);

      if (dist < hitRadius + 10) { // accounting for vehicle radius
        // BOOM! Collision Impact
        if (soundEnabled) audio.playCrashSound();
        
        // Shake screen!
        currentCar.screenShake = 14;

        // Bounce back vector physics
        const bounceAngle = Math.atan2(currentCar.y - decor.y, currentCar.x - decor.x);
        currentCar.x += Math.cos(bounceAngle) * 15;
        currentCar.y += Math.sin(bounceAngle) * 15;
        
        // Drastically reverse/halve velocity on hard impact
        currentCar.speed = -currentCar.speed * 0.35;

        // Erupt bright yellow/orange fire metal sparks
        for (let s = 0; s < 15; s++) {
          particles.current.push({
            x: currentCar.x,
            y: currentCar.y,
            vx: Math.cos(bounceAngle + (Math.random() - 0.5) * 1.5) * (3 + Math.random() * 5),
            vy: Math.sin(bounceAngle + (Math.random() - 0.5) * 1.5) * (3 + Math.random() * 5),
            size: 2 + Math.random() * 3,
            color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444',
            life: 1.0,
            decay: 0.04 + Math.random() * 0.05,
            type: 'spark'
          });
        }
      }
    });

    // 7. Coin collection detection
    trackCoins.current.forEach(coin => {
      if (coin.collected) return;

      const dist = Math.hypot(currentCar.x - coin.x, currentCar.y - coin.y);
      if (dist < 26) {
        coin.collected = true;
        const reward = coin.bonus ? 12 : 4; // bonus coin worth 12, standard worth 4
        
        setMetrics(prev => ({
          ...prev,
          coinsCollected: prev.coinsCollected + reward
        }));

        if (soundEnabled) audio.playCoinSound();

        // Spawn shiny gold floating sparkle layout
        for (let g = 0; g < 8; g++) {
          particles.current.push({
            x: coin.x,
            y: coin.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: 3 + Math.random() * 3,
            color: coin.bonus ? '#06b6d4' : '#fbbf24',
            life: 1.0,
            decay: 0.05,
            type: 'sparkle'
          });
        }
      }
    });

    // 8. Track Spline check point system & lap progression
    // Divide track into sequential checklist regions
    const spineIndex = closestIndex;
    const spineTotal = spinePoints.length;

    // Use spine index checkpoints (e.g., 4 regions around the looping track)
    const checkPointInterval = Math.floor(spineTotal / 8); 
    const currentCheckIdx = Math.floor(spineIndex / checkPointInterval);

    // If crossing the boundary to the next sequential checkpoint
    if (currentCheckIdx === (currentCar.lastCheckpointIndex + 1) % 8) {
      currentCar.checkpointsCleared.add(currentCheckIdx);
      currentCar.lastCheckpointIndex = currentCheckIdx;
    } else if (currentCheckIdx === 0 && currentCar.lastCheckpointIndex === 7) {
      // Player completed a structural lap loop!
      if (currentCar.checkpointsCleared.size >= 7) {
        // Complete current lap!
        if (metrics.lap < track.laps) {
          // Play loop clear synth song
          if (soundEnabled) audio.playVictoryMelody();
          
          setMetrics(prev => ({
            ...prev,
            lap: prev.lap + 1
          }));

          // Reset checkpoints
          currentCar.checkpointsCleared = new Set<number>([0]);
          currentCar.lastCheckpointIndex = 0;
        } else if (currentStatus === 'active') {
          // Race is completely cleared!
          audio.stopEngine();
          if (soundEnabled) audio.playVictoryMelody();
          
          setMetrics(prev => ({
            ...prev,
            status: 'finished',
            isFinished: true
          }));

          // Send data back immediately to top-level app wrapper
          setTimeout(() => {
            onFinishRace(metrics.elapsedTime / 1000, metrics.coinsCollected);
          }, 2400);
        }
      }
    }

    // Calculate checkpoint visual meters
    const progressPercent = (currentCar.checkpointsCleared.size / 8) * 100;

    // 9. Process active track timer updates
    if (metrics.status === 'active') {
      const now = Date.now();
      const elapsed = now - raceClock.current.startTime;
      setMetrics(prev => ({
        ...prev,
        elapsedTime: elapsed,
        speed: Math.abs(currentCar.speed),
        checkpointProgress: Math.min(100, Math.round(progressPercent))
      }));
    }

    // 10. Simulate particle lifecycles (decaying size/alpha transparency)
    particles.current = particles.current.map(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life = Math.max(0, p.life - p.decay);
      return p;
    }).filter(p => p.life > 0);
  };

  // Dedicated HTML5 Canvas drawing matrix
  const renderGameCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isGasActive = keysPressed.current['arrowup'] || keysPressed.current['z'] || keysPressed.current['w'] || touchControls.gas;

    // Adapt layout sizes dynamically (responsive frame boundaries)
    const width = canvas.width;
    const height = canvas.height;

    // Follow camera centering player car
    const car = carState.current;
    const cameraX = car.x - width / 2 + (Math.random() - 0.5) * car.screenShake;
    const cameraY = car.y - height / 2 + (Math.random() - 0.5) * car.screenShake;

    // Save state
    ctx.save();
    
    // 1. Clear background colors based on track chosen
    ctx.fillStyle = track.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Transform tracking camera coordinates
    ctx.translate(-cameraX, -cameraY);

    // 2. Draw Decorative outer grass/sand details depending on theme
    // Let's draw some faint visual elements to give a moving feeling
    ctx.strokeStyle = track.decorColor + '15';
    ctx.lineWidth = 4;
    for (let g = 0; g < 4000; g += 500) {
      ctx.beginPath();
      ctx.arc(600, 500, g, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Draw Track Asphalt road
    const spinePoints = sampledSplinePoints.current;
    if (spinePoints.length > 0) {
      // Drawing road curvature
      // First pass: Draw solid asphalt outline
      ctx.beginPath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = track.trackColor;
      
      ctx.lineWidth = spinePoints[0].width;
      ctx.moveTo(spinePoints[0].x, spinePoints[0].y);
      for (let i = 1; i < spinePoints.length; i++) {
        ctx.lineTo(spinePoints[i].x, spinePoints[i].y);
      }
      ctx.lineTo(spinePoints[0].x, spinePoints[0].y); // join loop back
      ctx.stroke();

      // Second pass: Draw beautiful neon striped curves on borders (outer margins)
      ctx.beginPath();
      ctx.strokeStyle = track.borderColor;
      ctx.lineWidth = spinePoints[0].width + 8; // thicker outer border
      ctx.moveTo(spinePoints[0].x, spinePoints[0].y);
      for (let i = 1; i < spinePoints.length; i++) {
        ctx.lineTo(spinePoints[i].x, spinePoints[i].y);
      }
      ctx.lineTo(spinePoints[0].x, spinePoints[0].y);
      ctx.stroke();

      // Third pass: Redraw asphalt directly over to lock the neon inside borders
      ctx.beginPath();
      ctx.strokeStyle = track.trackColor;
      ctx.lineWidth = spinePoints[0].width;
      ctx.moveTo(spinePoints[0].x, spinePoints[0].y);
      for (let i = 1; i < spinePoints.length; i++) {
        ctx.lineTo(spinePoints[i].x, spinePoints[i].y);
      }
      ctx.lineTo(spinePoints[0].x, spinePoints[0].y);
      ctx.stroke();

      // Fourth pass: Draw dashed core lane separator lines
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff25';
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 15]); // dashed arcade feel
      ctx.moveTo(spinePoints[0].x, spinePoints[0].y);
      for (let i = 1; i < spinePoints.length; i++) {
        ctx.lineTo(spinePoints[i].x, spinePoints[i].y);
      }
      ctx.lineTo(spinePoints[0].x, spinePoints[0].y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash structure

      // Fifth pass: Draw solid white Finish Line / départ banner at point index 0
      const startPt = spinePoints[0];
      const secondPt = spinePoints[2];
      const dx = secondPt.x - startPt.x;
      const dy = secondPt.y - startPt.y;
      const dist = Math.hypot(dx, dy);
      const nx = -dy / dist;
      const ny = dx / dist;

      // Finish line checkerboard pattern
      ctx.beginPath();
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#1e293b'; // dark base
      ctx.moveTo(startPt.x - nx * (startPt.width / 2), startPt.y - ny * (startPt.width / 2));
      ctx.lineTo(startPt.x + nx * (startPt.width / 2), startPt.y + ny * (startPt.width / 2));
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#f8fafc'; // white insert checkers
      ctx.setLineDash([8, 8]);
      ctx.moveTo(startPt.x - nx * (startPt.width / 2), startPt.y - ny * (startPt.width / 2));
      ctx.lineTo(startPt.x + nx * (startPt.width / 2), startPt.y + ny * (startPt.width / 2));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw collectible items (Coins)
    trackCoins.current.forEach(coin => {
      if (coin.collected) return;
      ctx.save();
      ctx.translate(coin.x, coin.y);
      
      // Floating pulse effect based on elapsed timer frame ticks
      const scaleFactor = 1 + Math.sin(Date.now() / 150) * 0.12;
      ctx.scale(scaleFactor, scaleFactor);

      // Gold sphere outline with gold details
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = coin.bonus ? '#22d3ee' : '#fbbf24'; // Cyan bonus, Gold regular
      ctx.strokeStyle = coin.bonus ? '#06b6d4' : '#d97706';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // inner "C" or coin star details
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = coin.bonus ? '#ffffff22' : '#ffffff33';
      ctx.fill();

      ctx.restore();
    });

    // 5. Draw drifting skids & particles
    particles.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 6. Render scenery (decor elements: Cactus, Pine, Cyber Sign)
    trackDecor.current.forEach(decor => {
      ctx.save();
      ctx.translate(decor.x, decor.y);
      ctx.scale(decor.scale, decor.scale);

      if (decor.type === 'tree' || decor.type === 'fir') {
        // Draw green layered Pine visual
        const isSpruce = decor.type === 'fir';
        ctx.fillStyle = isSpruce ? '#065f46' : '#15803d';
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 1.5;

        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-4, 4, 8, 12);

        // Leaves
        ctx.fillStyle = isSpruce ? '#065f46' : '#15803d';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(15, -4);
        ctx.lineTo(-15, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(11, -12);
        ctx.lineTo(-11, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (decor.type === 'cactus') {
        // Desert prickly saguaro cactus
        ctx.strokeStyle = '#166534';
        ctx.fillStyle = '#15803d';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';

        // Root stem
        ctx.beginPath();
        ctx.moveTo(0, 16);
        ctx.lineTo(0, -18);
        ctx.stroke();

        // Left branch
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-10, -4);
        ctx.lineTo(-10, -14);
        ctx.stroke();

        // Right branch
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(10, 4);
        ctx.lineTo(10, -8);
        ctx.stroke();
      } else if (decor.type === 'rock') {
        // Rocky barrier boulder
        ctx.fillStyle = track.theme === 'desert' ? '#92400e' : '#475569';
        ctx.strokeStyle = track.theme === 'desert' ? '#451a03' : '#1e293b';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-14, 10);
        ctx.lineTo(-10, -10);
        ctx.lineTo(4, -14);
        ctx.lineTo(14, -6);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (decor.type === 'neonSign') {
        // Cyber city tall neon structure
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#d946ef';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-6, -14, 12, 32);
        ctx.strokeRect(-6, -14, 12, 32);

        // Shiny dynamic visor lamp atop
        ctx.beginPath();
        ctx.arc(0, -14, 8, 0, Math.PI, true);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
      } else if (decor.type === 'barrier') {
        // Red and White diagonal safety barricade
        ctx.fillStyle = '#475569';
        ctx.fillRect(-2, -5, 4, 25);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-12, -2, 24, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -2, 4, 6);
        ctx.fillRect(4, -2, 4, 6);
      } else {
        // Spectator figure waving flag
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI * 2); // head
        ctx.fill();

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 12); // body
        ctx.stroke();

        // Wave yellow flag
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        const waveAngle = Math.sin(Date.now() / 100) * 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(Math.cos(waveAngle) * 12, Math.sin(waveAngle) * 12 - 2);
        ctx.stroke();
      }

      ctx.restore();
    });

    // 7. Render Player Car Sprite
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Dynamic scale/squash to mimic speed velocity stretches
    const speedRatio = Math.abs(car.speed) / 7.0;
    const bodyLengthScale = 1.0 + speedRatio * 0.08;
    ctx.scale(bodyLengthScale, 1.0);

    // Wheels (4 Black Rounded rectangles)
    ctx.fillStyle = '#090d16';
    // Front tires
    ctx.fillRect(8, -15, 8, 4);
    ctx.fillRect(8, 11, 8, 4);
    // Rear tires
    ctx.fillRect(-15, -15, 8, 4);
    ctx.fillRect(-15, 11, 8, 4);

    // Chassis core
    ctx.fillStyle = customization.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;

    // Body shape depending on aesthetic style choice
    const style = customization.selectedTemplateId;
    if (style === 'muscle') {
      // Strong robust V8 hotrod box
      ctx.fillRect(-16, -11, 32, 22);
      ctx.strokeRect(-16, -11, 32, 22);
      
      // Racing engine blower dome midhood
      ctx.fillStyle = '#64748b';
      ctx.fillRect(4, -4, 8, 8);
    } else if (style === 'formula') {
      // Monocoque formula pointy arrow
      ctx.beginPath();
      ctx.moveTo(-18, -6);
      ctx.lineTo(20, 0);
      ctx.lineTo(-18, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Side pods
      ctx.fillRect(-8, -12, 10, 3);
      ctx.fillRect(-8, 9, 10, 3);
    } else if (style === 'cyber') {
      // Angular neon cyberpunk delta wing
      ctx.beginPath();
      ctx.moveTo(-18, -11);
      ctx.lineTo(16, -8);
      ctx.lineTo(22, 0);
      ctx.lineTo(16, 8);
      ctx.lineTo(-18, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Sport car curvature
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(14, -10);
      ctx.quadraticCurveTo(20, 0, 14, 10);
      ctx.lineTo(-16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing stripe
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(-4, -10, 4, 20);
    }

    // Cab Glass visual shield visor
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, -6, 10, 12);
    ctx.fillStyle = '#06b6d4'; // teal reflection glass
    ctx.fillRect(0, -5, 5, 10);

    // Tail exhaustion orange thruster fire when speeding
    if (isGasActive && Math.abs(car.speed) > 1.5) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-17, -3);
      ctx.lineTo(-24 - Math.random() * 8, 0);
      ctx.lineTo(-17, 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    ctx.restore(); // Restore root transform
  };

  const currentSeconds = (metrics.elapsedTime / 1000).toFixed(3);
  return (
    <div className="relative w-full h-[calc(100vh-84px)] min-h-[600px] flex flex-col bg-zinc-950 select-none text-zinc-100 overflow-hidden" id="race-container-screen">
      
      {/* Top Floating HUD bar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-30 pointer-events-none">
        
        {/* Left Side: Time records & current laps */}
        <div id="hud-metrics-left" className="flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => {
              audio.playBeep(440, 0.08);
              audio.stopEngine();
              onExit();
            }}
            className="bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-805 text-zinc-400 hover:text-red-500 hover:border-red-500 p-2.5 rounded-2xl transition-all cursor-pointer shadow-lg"
            title="Quitter la course"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="bg-zinc-950 border-2 border-zinc-805 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-5 shadow-lg">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase font-black">Piste</span>
              <span className="text-xs font-black text-white italic uppercase tracking-tight">{track.name}</span>
            </div>
            
            <div className="h-6 w-px bg-zinc-800" />

            <div className="flex flex-col items-center">
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase font-black">Lap</span>
              <span className="text-sm font-black font-mono text-cyan-400 italic">{metrics.lap} / {track.laps}</span>
            </div>
          </div>
        </div>

        {/* Middle Status displays (countdown/finished/crashed banners) */}
        {countdownText && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center select-none">
            <span className="text-8xl font-black font-mono text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] animate-bounce font-mono italic">
              {countdownText}
            </span>
          </div>
        )}

        {isPaused && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-zinc-900 border-2 border-zinc-800 backdrop-blur p-5 rounded-3xl text-center pointer-events-auto shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
            <h4 className="font-black text-red-500 tracking-[0.2em] uppercase text-xs mb-1 italic">PARTIE PAUSÉE</h4>
            <p className="text-xs text-zinc-400 font-semibold">Appuyez sur Reprendre pour foncer à nouveau.</p>
          </div>
        )}

        {/* Right Side: Total clock, credits and sound toggle */}
        <div id="hud-metrics-right" className="flex items-center gap-3 pointer-events-auto">
          
          <div className="bg-zinc-950 border-2 border-zinc-805 backdrop-blur-md px-5 py-2.5 rounded-2xl flex items-center gap-5 font-mono shadow-lg">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 tracking-widest uppercase font-black">Chronomètre</span>
              <span className="text-sm font-black text-white tracking-widest italic tabular-nums">{currentSeconds}s</span>
            </div>

            <div className="h-6 w-px bg-zinc-800" />

            <div className="flex items-center gap-2">
              <Coins className="text-cyan-400" size={16} />
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-500 tracking-widest uppercase font-black">Pièces</span>
                <span className="text-sm font-black text-cyan-400 font-mono italic">+{metrics.coinsCollected}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) {
                audio.stopEngine();
              } else {
                audio.startEngine();
              }
              setSoundEnabled(!soundEnabled);
            }}
            className="bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-805 p-3 rounded-2xl transition-all text-zinc-400 hover:text-cyan-400 cursor-pointer shadow-lg"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="bg-zinc-950 hover:bg-zinc-900 border-2 border-zinc-805 p-3 rounded-2xl transition-all text-zinc-400 hover:text-cyan-400 cursor-pointer shadow-lg"
          >
            {isPaused ? <Play size={15} className="text-red-500 fill-red-500" /> : <Pause size={15} />}
          </button>
        </div>
      </div>

      {/* Tutorial splash over start */}
      {showTutorial && metrics.status === 'counting' && (
        <div className="absolute inset-0 bg-zinc-950/95 z-40 flex flex-col items-center justify-center p-6 text-center select-text">
          <div className="max-w-md w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-450 via-red-500 to-cyan-450" />
            
            <h3 className="text-xl font-black italic text-white tracking-tighter mb-2 uppercase flex items-center justify-center gap-2.5">
              <Compass className="animate-spin text-cyan-400" size={20} />
              <span>PRÊT POUR LE DÉPART<span className="text-red-550 font-bold"> ?</span></span>
            </h3>
            
            <div className="space-y-4 my-6 text-xs text-zinc-350 text-left">
              <p className="leading-relaxed text-center italic text-zinc-450 border-b-2 border-zinc-800 pb-3 font-semibold text-[11px]">
                « Pilotez votre bolide sur la trajectoire idéale, collectez des crédits et franchissez la ligne d'arrivée ! »
              </p>

              <div>
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-black">Contrôles clavier :</span>
                <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-500">Accélérer :</span>
                    <span className="text-cyan-400 font-extrabold uppercase">↑ / Z / W</span>
                  </div>
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 flex justify-between items-center text-[10px] font-bold">
                    <span className="text-zinc-500">Freiner :</span>
                    <span className="text-cyan-400 font-extrabold uppercase">↓ / S</span>
                  </div>
                  <div className="bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 flex justify-between items-center text-[10px] col-span-2 font-bold">
                    <span className="text-zinc-500">Direction :</span>
                    <span className="text-cyan-400 font-extrabold uppercase">← → / Q D / A D</span>
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-zinc-850 pt-4">
                <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-black">Astuces de course :</span>
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-zinc-400 leading-relaxed text-[11px] font-medium">
                  <li>Le hors-piste vous ralentit brutalement à <span className="text-red-500 font-black">25 km/h</span>.</li>
                  <li>Chaque collision contre un sapin, rocher ou panneau stoppe la voiture.</li>
                  <li>Lâchez brièvement l'accélérateur pour négocier les virages serrés en drift !</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playBeep(600, 0.1);
                setShowTutorial(false);
                raceClock.current.countdownStart = Date.now();
              }}
              className="w-full bg-white text-zinc-950 font-black italic uppercase py-3.5 px-4 text-xs tracking-widest skew-racing hover:bg-cyan-400 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span className="inline-flex items-center gap-1.5 skew-racing-reverse">
                <span>Démarrer</span>
                <ChevronRight size={14} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main interactive arcade canvas context */}
      <div className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={680} 
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Speedometer Gauges Floating HUD layer */}
      <div className="absolute bottom-5 left-5 pointer-events-none z-30 bg-zinc-950/90 border-2 border-zinc-800 backdrop-blur-md px-5 py-3.5 rounded-2xl flex items-center gap-4 shadow-2xl">
        {/* Dynamic circular-style speedometer analog bar representation */}
        <div className="relative w-14 h-14 flex items-center justify-center rounded-full border-4 border-zinc-850">
          <div 
            className="absolute inset-0 rounded-full border-4 border-cyan-400 transition-all duration-75"
            style={{ 
              clipPath: `polygon(50% 50%, -50% -50%, ${Math.min(100, Math.round((metrics.speed / 10) * 100))}% -50%)`,
              transform: `rotate(${Math.round(metrics.speed * 30)}deg)`,
              borderColor: metrics.speed > 5.5 ? '#ef4444' : '#22d3ee'
            }}
          />
          <span className="font-mono text-sm font-black text-white italic">{Math.round(metrics.speed * 21)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-zinc-550 font-mono tracking-wider uppercase font-black">Vitesse de pointe</span>
          <span className="text-xs font-black text-zinc-100 tracking-wide font-sans italic">
            {metrics.speed > 5.5 ? <span className="text-red-500">TURBO ACTIVÉ</span> : "Régime stabilisé"}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 font-extrabold">km/h</span>
        </div>
      </div>

      {/* Interactive virtual mobile buttons layer layout */}
      <div className="absolute bottom-5 right-5 z-30 pointer-events-auto flex items-center gap-6 sm:opacity-90 max-w-full">
        {/* Steering side paddles */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setTouchControls(prev => ({ ...prev, left: true }))}
            onMouseUp={() => setTouchControls(prev => ({ ...prev, left: false }))}
            onTouchStart={(e) => { e.preventDefault(); setTouchControls(prev => ({ ...prev, left: true })); }}
            onTouchEnd={() => setTouchControls(prev => ({ ...prev, left: false }))}
            className={`w-14 h-14 rounded-full border-2 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer font-black text-sm ${
              touchControls.left ? 'bg-cyan-500 border-cyan-400 text-zinc-950 font-black' : 'bg-zinc-950/90 border-zinc-800 hover:border-cyan-400'
            }`}
            title="Tourner à gauche"
          >
            ←
          </button>
          <button
            onMouseDown={() => setTouchControls(prev => ({ ...prev, right: true }))}
            onMouseUp={() => setTouchControls(prev => ({ ...prev, right: false }))}
            onTouchStart={(e) => { e.preventDefault(); setTouchControls(prev => ({ ...prev, right: true })); }}
            onTouchEnd={() => setTouchControls(prev => ({ ...prev, right: false }))}
            className={`w-14 h-14 rounded-full border-2 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer font-black text-sm ${
              touchControls.right ? 'bg-cyan-500 border-cyan-400 text-zinc-950 font-black' : 'bg-zinc-950/90 border-zinc-800 hover:border-cyan-400'
            }`}
            title="Tourner à droite"
          >
            →
          </button>
        </div>

        <div className="h-10 w-0.5 bg-zinc-800" />

        {/* Action paddles */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => setTouchControls(prev => ({ ...prev, brake: true }))}
            onMouseUp={() => setTouchControls(prev => ({ ...prev, brake: false }))}
            onTouchStart={(e) => { e.preventDefault(); setTouchControls(prev => ({ ...prev, brake: true })); }}
            onTouchEnd={() => setTouchControls(prev => ({ ...prev, brake: false }))}
            className={`w-14 h-14 rounded-full border-2 text-white flex items-center justify-center active:scale-95 transition-all font-black text-[10px] uppercase tracking-wider cursor-pointer ${
              touchControls.brake ? 'bg-red-500 border-red-400 text-white font-black' : 'bg-zinc-950/90 border-zinc-800'
            }`}
            title="Freiner / Arrière"
          >
            Brak
          </button>
          <button
            onMouseDown={() => setTouchControls(prev => ({ ...prev, gas: true }))}
            onMouseUp={() => setTouchControls(prev => ({ ...prev, gas: false }))}
            onTouchStart={(e) => { e.preventDefault(); setTouchControls(prev => ({ ...prev, gas: true })); }}
            onTouchEnd={() => setTouchControls(prev => ({ ...prev, gas: false }))}
            className={`w-16 h-16 rounded-full border-2 text-white flex items-center justify-center active:scale-95 transition-all font-black text-xs uppercase tracking-widest cursor-pointer ${
              touchControls.gas ? 'bg-cyan-400 border-cyan-300 text-zinc-955 font-black shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-zinc-950/90 border-zinc-800'
            }`}
            title="Accélérer le moteur"
          >
            GAZ
          </button>
        </div>
      </div>

    </div>
  );
}
