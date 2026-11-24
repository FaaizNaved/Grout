// Canvas ASMR Grouting Engine with natural tactile physics & warm rendering

import { audio } from './audio.js';

export class GroutEngine {
  constructor(canvas, onProgress, onComplete, onFailure) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onFailure = onFailure;
    this.onTimerTick = null;
    this.onFragilityChange = null;

    this.currentLevel = null;
    this.gaps = [];
    this.samplePoints = [];
    this.filledPointsCount = 0;
    this.gapIntervals = new Map();
    this.tool = 'trowel';
    this.groutColor = '#B45309';
    this.groutBorder = '#92400E';

    // Configurable gameplay thresholds
    this.config = {
      targetGroutCoverage: 84, // % of joints filled
      targetHazeCleaning: 84,   // % of excess haze buffed
      minHazeThreshold: 6      // minimum haze patches generated before level can be completed
    };

    // Haze tracking (normalized u, v coordinates for 100% resize-invariance)
    this.hazePatches = [];
    this.hazeGrid = new Map(); // spatial hash to prevent unbounded stacking
    this.totalHazeDeposited = 0;
    this.cleanedHazeCount = 0;

    // Drag tracking
    this.isDragging = false;
    this.lastPos = null;
    this.currentPos = { x: 0, y: 0 };
    this.toolAngle = 0;
    this.strokes = [];
    this.currentStroke = null;

    // Particles & Floating feedback
    this.particles = [];
    this.floatingTexts = [];
    this.blowoutMarks = [];

    // Combo system
    this.combo = 0;
    this.comboTimer = null;
    this.isCompleted = false;
    this.isFailed = false;

    // Level-specific mechanics state
    this.activeBlowouts = 0;
    this.blowoutCounter = 0;
    this.activeBlowoutsList = [];

    // Level 4 Curing & Countdown Timer
    this.timeRemaining = 75;
    this.countdownTimer = null;
    this.timeOffset = 0;

    // Level 5 Restoration Puzzle & Fragility
    this.restorationStage = 1; // 1 = Puzzle, 2 = Grouting
    this.fragility = 0;
    this.sockets = [];
    this.loosePieces = [];
    this.draggedPiece = null;
    this.dragOffset = { x: 0, y: 0 };

    // Endless Mode & Contextual Audio state
    this.endlessWave = 1;
    this.onWaveComplete = null;
    this.hasTriggeredFirstGroutMeme = false;
    this.hasTriggeredCleanMeme = false;

    this.setupListeners();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleResize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (!rect.width) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const isLandscape = windowH <= 520 && windowW > windowH;

    // Fit viewport or grid column width cleanly
    const newWidth = Math.min(Math.floor(rect.width), 720);

    let newHeight;
    if (isLandscape) {
      const maxAvailableH = Math.max(windowH - 155, 140);
      newHeight = Math.min(Math.round(newWidth * 0.48), maxAvailableH, 240);
    } else if (windowW <= 680) {
      const maxPortraitH = Math.max(Math.round(windowH * 0.42), 220);
      newHeight = Math.min(Math.round(newWidth * 0.74), maxPortraitH, 420);
    } else {
      newHeight = Math.min(Math.round(rect.height || newWidth * 0.80), 560);
    }

    const oldWidth = this.width;
    const oldHeight = this.height;

    if (oldWidth === newWidth && oldHeight === newHeight) {
      return;
    }

    this.canvas.style.width = `${newWidth}px`;
    this.canvas.style.height = `${newHeight}px`;

    this.canvas.width = newWidth * dpr;
    this.canvas.height = newHeight * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.width = newWidth;
    this.height = newHeight;

    if (this.currentLevel) {
      if (!oldWidth || !oldHeight || oldWidth === 0 || oldHeight === 0) {
        this.initLevel(this.currentLevel, false);
      } else {
        this.resizeLevel(oldWidth, oldHeight, newWidth, newHeight);
      }
    }
  }

  addIntervalToGap(gapIdx, start, end) {
    if (!this.gapIntervals.has(gapIdx)) {
      this.gapIntervals.set(gapIdx, []);
    }
    const intervals = this.gapIntervals.get(gapIdx);
    const result = [];
    let inserted = false;

    for (const [s, e] of intervals) {
      if (end < s) {
        if (!inserted) {
          result.push([start, end]);
          inserted = true;
        }
        result.push([s, e]);
      } else if (start > e) {
        result.push([s, e]);
      } else {
        start = Math.min(start, s);
        end = Math.max(end, e);
      }
    }
    if (!inserted) {
      result.push([start, end]);
    }
    this.gapIntervals.set(gapIdx, result);
  }

  rebuildGapIntervals(gapIdx) {
    const pts = this.samplePoints.filter(p => p.gapIdx === gapIdx && p.filled);
    const intervals = [];
    pts.forEach(p => {
      const s = Math.max(0, (p.index - 0.5) / p.totalSteps);
      const e = Math.min(1, (p.index + 0.5) / p.totalSteps);
      intervals.push([s, e]);
    });
    this.gapIntervals.set(gapIdx, intervals);
  }

  resizeLevel(oldWidth, oldHeight, newWidth, newHeight) {
    if (newWidth === undefined && newHeight === undefined) {
      newWidth = oldWidth;
      newHeight = oldHeight;
      oldWidth = this.width;
      oldHeight = this.height;
    }
    if (!oldWidth || !oldHeight || oldWidth === 0 || oldHeight === 0) return;

    this.width = newWidth;
    this.height = newHeight;

    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    // 1. Rescale all recorded grout strokes proportionally
    this.strokes.forEach(stroke => {
      if (stroke.points) {
        stroke.points.forEach(p => {
          p.x *= scaleX;
          p.y *= scaleY;
        });
      }
      if (stroke.width) {
        stroke.width *= (scaleX + scaleY) / 2;
      }
    });

    // 2. Re-generate gaps for new dimensions
    this.gaps = this.currentLevel.generateGaps(newWidth, newHeight, this.endlessWave || 1);
    this.samplePoints = [];
    this.filledPointsCount = 0;

    const step = 8;
    this.gaps.forEach((gap, gapIdx) => {
      const dx = gap.x2 - gap.x1;
      const dy = gap.y2 - gap.y1;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(Math.floor(dist / step), 1);
      const intervals = this.gapIntervals.get(gapIdx) || [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ptStart = Math.max(0, (i - 0.5) / steps);
        const ptEnd = Math.min(1, (i + 0.5) / steps);
        const ptWidth = ptEnd - ptStart;

        let overlap = 0;
        for (const [s, e] of intervals) {
          const interStart = Math.max(ptStart, s);
          const interEnd = Math.min(ptEnd, e);
          if (interEnd > interStart) {
            overlap += (interEnd - interStart);
          }
        }

        const isFilled = ptWidth > 0 && (overlap / ptWidth) >= 0.50;

        if (isFilled) {
          this.filledPointsCount++;
        }

        this.samplePoints.push({
          x: gap.x1 + dx * t,
          y: gap.y1 + dy * t,
          radius: (gap.width || 24) * 0.6,
          filled: isFilled,
          gapIdx,
          index: i,
          totalSteps: steps,
          t
        });
      }
    });

    // Level 5 puzzle pieces coordinate rescaling
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle) {
      const restoData = this.currentLevel.getRestorationData(newWidth, newHeight);
      this.sockets = restoData.sockets;
      // Preserve placed status
      if (this.loosePieces) {
        this.loosePieces.forEach((p, i) => {
          const fresh = restoData.loosePieces[i];
          if (fresh) {
            if (p.placed) {
              fresh.placed = true;
              fresh.x = fresh.targetX;
              fresh.y = fresh.targetY;
            }
          }
        });
        this.loosePieces = restoData.loosePieces;
      }
    }

    this.notifyProgress();
  }

  loadLevel(level) {
    this.currentLevel = level;
    this.groutColor = level.groutColor || '#B45309';
    this.groutBorder = level.groutBorder || '#92400E';
    this.isCompleted = false;
    this.isFailed = false;
    this.strokes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.blowoutMarks = [];
    this.combo = 0;
    this.tool = 'trowel';
    this.gapIntervals = new Map();
    this.hazePatches = [];
    this.hazeGrid = new Map();
    this.totalHazeDeposited = 0;
    this.cleanedHazeCount = 0;
    this.endlessWave = 1;
    this.hasTriggeredFirstGroutMeme = false;
    this.hasTriggeredCleanMeme = false;

    // Reset level-specific mechanics
    this.activeBlowouts = 0;
    this.blowoutCounter = 0;
    this.activeBlowoutsList = [];
    this.timeOffset = 0;
    this.strokeBuffedPatches = null;
    this.timeRemaining = level.overallDeadlineSec || 75;
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    if (level.hasCuringTimer) {
      this.countdownTimer = setInterval(() => {
        this.tickCountdown(1);
      }, 1000);
    }

    if (level.hasRestorationPuzzle) {
      this.restorationStage = 1; // Stage 1 Puzzle
      this.fragility = 0;
      this.draggedPiece = null;
      if (this.onFragilityChange) this.onFragilityChange(0);
    } else {
      this.restorationStage = 2; // Normal grouting
    }

    this.initLevel(level, true);
    this.notifyProgress();
  }

  initLevel(level, playGreeting = true) {
    this.gaps = level.generateGaps(this.width, this.height, this.endlessWave || 1);
    this.samplePoints = [];
    this.filledPointsCount = 0;

    const step = 8;
    this.gaps.forEach((gap, gapIdx) => {
      if (!this.gapIntervals.has(gapIdx)) {
        this.gapIntervals.set(gapIdx, []);
      }
      const dx = gap.x2 - gap.x1;
      const dy = gap.y2 - gap.y1;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(Math.floor(dist / step), 1);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this.samplePoints.push({
          x: gap.x1 + dx * t,
          y: gap.y1 + dy * t,
          radius: (gap.width || 24) * 0.6,
          filled: false,
          gapIdx,
          index: i,
          totalSteps: steps,
          t
        });
      }
    });

    if (level.hasRestorationPuzzle && level.getRestorationData) {
      const restoData = level.getRestorationData(this.width, this.height);
      this.sockets = restoData.sockets;
      this.loosePieces = restoData.loosePieces;
    }

    if (playGreeting) {
      audio.playChime(1);
    }
  }

  setTool(tool) {
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle && this.restorationStage === 1) {
      // Locked during puzzle stage
      audio.playErrorTone();
      this.addFloatingText("🔒 RESTORATION PUZZLE IN PROGRESS: Place missing pieces first!", this.width / 2, this.height * 0.4);
      return;
    }
    this.tool = tool;
    if (tool === 'sponge') {
      audio.playSponge();
    } else {
      audio.playScrape();
    }
  }

  tickCountdown(dt = 1) {
    if (this.isCompleted || this.isFailed) {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      return;
    }
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    if (this.onTimerTick) {
      this.onTimerTick(this.timeRemaining);
    }
    if (this.timeRemaining <= 0) {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      const metrics = this.getMetrics();
      if (metrics.hazeCleaning < 50) {
        this.triggerLevelFailure(
          "CAFE SHUTDOWN: MESS ABOVE 50%",
          "Remaining mess above 50%! Barista counter covered in hardened grout."
        );
      } else {
        this.triggerLevelFailure(
          "DEADLINE EXPIRED",
          "Opening health inspection arrived before the café counter was fully sealed!"
        );
      }
    }
  }

  now() {
    return performance.now() + (this.timeOffset || 0);
  }

  advanceTime(ms) {
    this.timeOffset = (this.timeOffset || 0) + ms;
  }

  setGroutColor(color, border) {
    this.groutColor = color;
    this.groutBorder = border || color;
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const touch = (e.touches && e.touches.length > 0)
      ? e.touches[0]
      : ((e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null);
    const clientX = touch ? touch.clientX : (e.clientX !== undefined ? e.clientX : 0);
    const clientY = touch ? touch.clientY : (e.clientY !== undefined ? e.clientY : 0);
    const scaleX = rect.width && this.width ? this.width / rect.width : 1;
    const scaleY = rect.height && this.height ? this.height / rect.height : 1;
    const time = (e && e.timeStamp) ? e.timeStamp : this.now();
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      time
    };
  }

  setupListeners() {
    const onStart = (e) => {
      e.preventDefault();
      audio.ensureContext();
      if (this.isFailed || this.isCompleted) return;

      const pos = this.getPointerPos(e);
      this.lastPos = pos;
      this.currentPos = pos;
      this.isDragging = true;
      this.strokeBuffedPatches = new Set();

      // Stage 1 Restoration Puzzle drag check
      if (this.currentLevel && this.currentLevel.hasRestorationPuzzle && this.restorationStage === 1) {
        if (this.loosePieces) {
          for (let i = this.loosePieces.length - 1; i >= 0; i--) {
            const piece = this.loosePieces[i];
            if (!piece.placed) {
              const inside = (pos.x >= piece.x - 5 && pos.x <= piece.x + piece.w + 5 &&
                              pos.y >= piece.y - 5 && pos.y <= piece.y + piece.h + 5);
              if (inside) {
                this.draggedPiece = piece;
                this.dragOffset = { x: pos.x - piece.x, y: pos.y - piece.y };
                audio.playScrape();
                return;
              }
            }
          }
        }
        return;
      }

      if (this.tool === 'trowel') {
        this.currentStroke = {
          color: this.groutColor,
          borderColor: this.groutBorder,
          width: this.currentLevel ? (this.currentLevel.gapWidth || 24) : 24,
          points: [pos]
        };
        this.strokes.push(this.currentStroke);
        this.checkGroutFill(null, pos);
      } else if (this.tool === 'sponge') {
        this.checkSpongeCleaning(null, pos);
      }
    };

    const onMove = (e) => {
      const pos = this.getPointerPos(e);
      this.currentPos = pos;

      if (!this.isDragging || this.isFailed || this.isCompleted) return;
      e.preventDefault();

      // Stage 1 Restoration Puzzle drag update
      if (this.draggedPiece) {
        this.draggedPiece.x = pos.x - this.dragOffset.x;
        this.draggedPiece.y = pos.y - this.dragOffset.y;
        return;
      }

      if (this.lastPos) {
        const dx = pos.x - this.lastPos.x;
        const dy = pos.y - this.lastPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          this.toolAngle = Math.atan2(dy, dx);
          
          if (this.tool === 'trowel') {
            if (this.currentStroke) {
              this.currentStroke.points.push(pos);
            }
            audio.playSquelch(Math.min(dist / 10, 1.8));
            this.spawnSquelchParticles(pos.x, pos.y);
            this.checkGroutFill(this.lastPos, pos);
          } else if (this.tool === 'sponge') {
            audio.playSponge();
            this.spawnSpongeSparkles(pos.x, pos.y);
            this.checkSpongeCleaning(this.lastPos, pos);
          }

          this.lastPos = pos;
        }
      }
    };

    const onEnd = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.lastPos = null;
      this.currentStroke = null;
      this.strokeBuffedPatches = null;

      // Stage 1 Puzzle piece drop resolution
      if (this.draggedPiece) {
        const p = this.draggedPiece;
        const centerDist = Math.hypot(
          (p.x + p.w / 2) - (p.targetX + p.w / 2),
          (p.y + p.h / 2) - (p.targetY + p.h / 2)
        );

        if (centerDist <= 30) {
          // Snap correctly into place
          p.x = p.targetX;
          p.y = p.targetY;
          p.placed = true;
          audio.playScrape();
          audio.playChime(3);
          this.addFloatingText("✦ RESTORED & SNAPPED!", p.x + p.w / 2, p.y - 12);
          this.spawnSpongeSparkles(p.x + p.w / 2, p.y + p.h / 2);

          const unplaced = this.loosePieces.filter(item => !item.placed);
          if (unplaced.length === 0) {
            // Stage 1 complete! Unlock Stage 2
            this.restorationStage = 2;
            audio.playFanfare();
            this.addFloatingText("STAGE 1 COMPLETE! GROUTING UNLOCKED 🏛️", this.width / 2, this.height * 0.45);
          }
        } else {
          // Jarring drop -> increase fragility
          this.fragility = Math.min(100, this.fragility + 15);
          audio.playErrorTone();
          this.addFloatingText("⚠️ FRAGILITY +15% (Jarring Drop)", p.x + p.w / 2, p.y - 15);
          if (this.onFragilityChange) this.onFragilityChange(this.fragility);

          if (this.fragility >= 100) {
            this.triggerLevelFailure(
              "RESTORATION FAILED",
              "Ancient Roman mosaic shattered under excessive impact pressure! Fragility reached 100%."
            );
          }
        }
        this.draggedPiece = null;
        this.notifyProgress();
      }
    };

    const onLeave = () => {
      this.currentPos = null;
    };

    this.canvas.addEventListener('mousedown', onStart);
    this.canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mousemove', onMove);
    this.canvas.addEventListener('mouseup', onEnd);
    window.addEventListener('mouseup', onEnd);
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    this.canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    this.canvas.addEventListener('touchend', onEnd);
    window.addEventListener('touchend', onEnd);
    this.canvas.addEventListener('touchcancel', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }

  triggerLevelFailure(title, reason) {
    if (this.isFailed || this.isCompleted) return;
    this.isFailed = true;
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    audio.playErrorTone();
    audio.triggerMemeSound('level_failure_reaction');

    if (this.onFailure) {
      this.onFailure(this.currentLevel, title, reason);
    }
  }

  triggerBlowout(x, y, gapIdx) {
    this.blowoutCounter = (this.blowoutCounter || 0) + 1;
    const blowoutId = this.blowoutCounter;
    audio.playErrorTone();
    this.addFloatingText("⚠️ GROUT BLOWOUT! (-10% Progress)", x, y - 20);

    // Penalize 10% of total filled points around this location
    const penaltyCount = Math.max(1, Math.round(this.samplePoints.length * 0.10));
    const damagedPoints = new Set();

    // Prioritize points on the affected gap, then nearby points
    const candidates = this.samplePoints
      .filter(pt => pt.filled)
      .map(pt => ({
        pt,
        dSq: (pt.x - x) * (pt.x - x) + (pt.y - y) * (pt.y - y),
        sameGap: gapIdx !== undefined && pt.gapIdx === gapIdx
      }))
      .sort((a, b) => {
        if (a.sameGap !== b.sameGap) return a.sameGap ? -1 : 1;
        return a.dSq - b.dSq;
      });

    for (const item of candidates) {
      if (damagedPoints.size >= penaltyCount) break;
      if (item.dSq < 80 * 80 || item.sameGap) {
        item.pt.filled = false;
        item.pt.blowoutId = blowoutId;
        damagedPoints.add(item.pt);
        this.filledPointsCount = Math.max(0, this.filledPointsCount - 1);
      }
    }

    if (damagedPoints.size > 0) {
      if (!this.activeBlowoutsList) this.activeBlowoutsList = [];
      this.activeBlowoutsList.push({
        id: blowoutId,
        gapIdx,
        x,
        y,
        damagedPoints
      });
      this.activeBlowouts = this.activeBlowoutsList.length;

      if (gapIdx !== undefined && this.gapIntervals.has(gapIdx)) {
        this.rebuildGapIntervals(gapIdx);
      }
      this.blowoutMarks.push({ id: blowoutId, x, y, radius: 20, color: '#DC2626', alpha: 0.90 });
      this.notifyProgress();
    }
  }

  spawnSquelchParticles(x, y) {
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        color: this.groutColor,
        alpha: 0.8,
        decay: 0.04
      });
    }
  }

  spawnSpongeSparkles(x, y) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -0.5 - Math.random() * 1.5,
        radius: 1.2 + Math.random() * 1.8,
        color: '#FAF8F5',
        alpha: 0.85,
        decay: 0.04,
        isSparkle: true
      });
    }
  }

  spawnConfetti() {
    const colors = ['#9A3412', '#B45309', '#D97706', '#2D6A4F', '#F5F2EB', '#78716C'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: this.width / 2,
        y: this.height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        radius: 3 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        decay: 0.018,
        gravity: 0.12
      });
    }
  }

  addFloatingText(text, x, y) {
    this.floatingTexts.push({
      text,
      x,
      y,
      alpha: 1,
      vy: -1.2
    });
  }

  getMetrics() {
    const total = this.samplePoints.length;
    const groutCoverage = total > 0 ? (this.filledPointsCount / total) * 100 : 0;
    
    const hazeCleaning = this.totalHazeDeposited > 0
      ? (this.cleanedHazeCount / this.totalHazeDeposited) * 100
      : 0;

    const targetGrout = this.currentLevel && this.currentLevel.targetFill !== undefined
      ? this.currentLevel.targetFill
      : this.config.targetGroutCoverage;
    const targetClean = this.config.targetHazeCleaning;

    const groutReady = groutCoverage >= targetGrout;
    const hazeReady = hazeCleaning >= targetClean && this.totalHazeDeposited >= this.config.minHazeThreshold;
    
    // Level-specific readiness requirements
    let blowoutReady = true;
    if (this.currentLevel && this.currentLevel.hasBlowoutMechanic) {
      blowoutReady = this.activeBlowouts === 0;
    }

    let restorationReady = true;
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle) {
      restorationReady = (this.restorationStage === 2) && (this.fragility < 100);
    }

    let timeReady = true;
    if (this.currentLevel && this.currentLevel.hasCuringTimer) {
      timeReady = this.timeRemaining > 0;
    }

    const isComplete = groutReady && hazeReady && blowoutReady && restorationReady && timeReady;

    const roundedGrout = Math.min(Math.round(groutCoverage), 100);
    const roundedHaze = Math.min(Math.round(hazeCleaning), 100);
    const compositeScore = Math.min(Math.round((roundedGrout * 0.5) + (roundedHaze * 0.5)), 100);

    let statusText = 'Phase 1: Fill joints with trowel';
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle && this.restorationStage === 1) {
      statusText = 'Stage 1: Drag loose mosaic pieces into vacant sockets';
    } else if (this.currentLevel && this.currentLevel.hasBlowoutMechanic && this.activeBlowouts > 0) {
      statusText = '⚠️ Blowout active! Re-trowel damaged joint carefully';
    } else if (groutReady && !hazeReady) {
      statusText = 'Phase 2: Buff excess haze with sponge';
    } else if (isComplete) {
      statusText = 'Level Complete! Babu Mistri Approved';
    } else if (!groutReady && this.totalHazeDeposited > 0) {
      statusText = 'Keep grouting empty joints';
    }

    return {
      groutCoverage: roundedGrout,
      hazeCleaning: roundedHaze,
      compositeScore,
      targetGrout,
      targetClean,
      groutReady,
      hazeReady,
      blowoutReady,
      restorationReady,
      timeReady,
      isComplete,
      totalHaze: this.totalHazeDeposited,
      cleanedHaze: this.cleanedHazeCount,
      activeBlowouts: this.activeBlowouts,
      fragility: this.fragility,
      timeRemaining: this.timeRemaining,
      restorationStage: this.restorationStage,
      statusText
    };
  }

  notifyProgress() {
    if (this.onProgress) {
      const metrics = this.getMetrics();
      this.onProgress(metrics, this.combo);
    }
  }

  checkLevelCompletion() {
    if (this.isCompleted || this.isFailed) return;

    const metrics = this.getMetrics();
    if (metrics.isComplete) {
      if (this.countdownTimer) clearInterval(this.countdownTimer);

      if (this.currentLevel && (this.currentLevel.id === 6 || this.currentLevel.isEndless)) {
        this.advanceEndlessWave(metrics);
        return;
      }

      this.isCompleted = true;
      this.spawnConfetti();
      audio.playFanfare();

      if (this.currentLevel && this.currentLevel.isBossLevel) {
        audio.triggerMemeSound('restoration_victory');
      } else {
        audio.triggerMemeSound('level_complete_mistri_op');
      }

      if (this.onComplete) {
        this.onComplete(this.currentLevel, metrics);
      }
    }
  }

  advanceEndlessWave(metrics) {
    this.endlessWave = (this.endlessWave || 1) + 1;
    this.spawnConfetti();
    audio.playChime(5);
    audio.triggerMemeSound('sukoon_asmr');
    this.addFloatingText(`WAVE ${this.endlessWave} REACHED! SUKOON ✨`, this.width / 2, this.height / 2);

    this.strokes = [];
    this.gapIntervals = new Map();
    this.hazePatches = [];
    this.hazeGrid = new Map();
    this.totalHazeDeposited = 0;
    this.cleanedHazeCount = 0;
    this.hasTriggeredFirstGroutMeme = false;
    this.hasTriggeredCleanMeme = false;
    this.activeBlowouts = 0;
    this.blowoutCounter = 0;
    this.activeBlowoutsList = [];
    this.blowoutMarks = [];

    this.initLevel(this.currentLevel, false);
    this.notifyProgress();

    if (this.onWaveComplete) {
      this.onWaveComplete(this.endlessWave, metrics);
    }
  }

  distToSegmentSq(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return (px - projX) * (px - projX) + (py - projY) * (py - projY);
  }

  isNearAnyGap(px, py, maxDist = 28) {
    if (!this.gaps || this.gaps.length === 0) return false;
    for (const gap of this.gaps) {
      const threshold = (gap.width || 24) * 0.5 + maxDist;
      const dSq = this.distToSegmentSq(px, py, gap.x1, gap.y1, gap.x2, gap.y2);
      if (dSq <= threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  isInsideAnyJoint(px, py) {
    if (!this.gaps || this.gaps.length === 0) return false;
    for (const gap of this.gaps) {
      const jointHalfWidth = (gap.width || 24) * 0.48;
      const dSq = this.distToSegmentSq(px, py, gap.x1, gap.y1, gap.x2, gap.y2);
      if (dSq < jointHalfWidth * jointHalfWidth) {
        return true;
      }
    }
    return false;
  }

  depositHazePoint(x, y) {
    if (!this.width || !this.height) return false;
    if (x < 10 || x > this.width - 10 || y < 10 || y > this.height - 10) return false;
    if (this.isInsideAnyJoint(x, y)) return false;

    const u = x / this.width;
    const v = y / this.height;

    const cellX = Math.floor(u * 45);
    const cellY = Math.floor(v * 35);
    const key = `${cellX}_${cellY}`;

    if (this.hazeGrid.has(key)) {
      const patch = this.hazeGrid.get(key);
      if (patch.cleaned) {
        patch.cleaned = false;
        patch.opacity = 0.65;
        patch.depositedAt = this.now();
        patch.isCured = false;
        patch.passesRequired = 1;
        patch.color = this.groutColor;
        this.cleanedHazeCount = Math.max(0, this.cleanedHazeCount - 1);
        return true;
      } else {
        patch.opacity = Math.min(patch.opacity + 0.15, 0.85);
        return false;
      }
    } else {
      const patch = {
        u,
        v,
        radius: 14 + Math.random() * 8,
        opacity: 0.60 + Math.random() * 0.20,
        cleaned: false,
        color: this.groutColor,
        depositedAt: this.now(),
        passesRequired: 1,
        isCured: false
      };
      this.hazeGrid.set(key, patch);
      this.hazePatches.push(patch);
      this.totalHazeDeposited++;
      return true;
    }
  }

  depositHazeAround(cx, cy) {
    if (!this.isNearAnyGap(cx, cy, 28)) return false;

    let nearestGap = null;
    let minDSq = Infinity;
    for (const gap of this.gaps) {
      const dSq = this.distToSegmentSq(cx, cy, gap.x1, gap.y1, gap.x2, gap.y2);
      if (dSq < minDSq) {
        minDSq = dSq;
        nearestGap = gap;
      }
    }

    let anyChanged = false;
    if (nearestGap) {
      const gdx = nearestGap.x2 - nearestGap.x1;
      const gdy = nearestGap.y2 - nearestGap.y1;
      const glen = Math.hypot(gdx, gdy) || 1;
      const nx = -gdy / glen;
      const ny = gdx / glen;
      const halfW = (nearestGap.width || 24) * 0.5;

      const l2 = gdx * gdx + gdy * gdy;
      const t = Math.max(0, Math.min(1, ((cx - nearestGap.x1) * gdx + (cy - nearestGap.y1) * gdy) / l2));
      const anchorX = nearestGap.x1 + t * gdx;
      const anchorY = nearestGap.y1 + t * gdy;

      const offsets = [
        { mult: 1, dist: halfW + 8 + Math.random() * 8, tang: -8 + Math.random() * 16 },
        { mult: -1, dist: halfW + 8 + Math.random() * 8, tang: -8 + Math.random() * 16 },
        { mult: 1, dist: halfW + 14 + Math.random() * 10, tang: -12 + Math.random() * 24 },
        { mult: -1, dist: halfW + 14 + Math.random() * 10, tang: -12 + Math.random() * 24 }
      ];

      for (const off of offsets) {
        const hx = anchorX + (gdx / glen) * off.tang + nx * (off.mult * off.dist);
        const hy = anchorY + (gdy / glen) * off.tang + ny * (off.mult * off.dist);
        if (this.depositHazePoint(hx, hy)) {
          anyChanged = true;
        }
      }
    }
    return anyChanged;
  }

  depositHazeAlongStroke(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return false;

    let anyChanged = false;
    const steps = Math.max(1, Math.floor(dist / 16));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = p1.x + dx * t;
      const py = p1.y + dy * t;

      if (!this.isNearAnyGap(px, py, 28)) {
        continue;
      }

      let nearestGap = null;
      let minDSq = Infinity;
      for (const gap of this.gaps) {
        const dSq = this.distToSegmentSq(px, py, gap.x1, gap.y1, gap.x2, gap.y2);
        if (dSq < minDSq) {
          minDSq = dSq;
          nearestGap = gap;
        }
      }

      let gapNx = -(p2.y - p1.y) / dist;
      let gapNy = (p2.x - p1.x) / dist;
      let anchorX = px;
      let anchorY = py;

      if (nearestGap) {
        const gdx = nearestGap.x2 - nearestGap.x1;
        const gdy = nearestGap.y2 - nearestGap.y1;
        const glen = Math.hypot(gdx, gdy) || 1;
        gapNx = -gdy / glen;
        gapNy = gdx / glen;
        const l2 = gdx * gdx + gdy * gdy;
        const u = Math.max(0, Math.min(1, ((px - nearestGap.x1) * gdx + (py - nearestGap.y1) * gdy) / l2));
        anchorX = nearestGap.x1 + u * gdx;
        anchorY = nearestGap.y1 + u * gdy;
      }

      const halfW = nearestGap ? (nearestGap.width || 24) * 0.5 : 12;
      const offsetDist1 = halfW + 8 + Math.random() * 10;
      const offsetDist2 = halfW + 8 + Math.random() * 10;

      if (this.depositHazePoint(anchorX + gapNx * offsetDist1, anchorY + gapNy * offsetDist1)) {
        anyChanged = true;
      }
      if (this.depositHazePoint(anchorX - gapNx * offsetDist2, anchorY - gapNy * offsetDist2)) {
        anyChanged = true;
      }
    }
    return anyChanged;
  }

  checkGroutFill(p1, p2) {
    if (this.isCompleted || this.isFailed) return;
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle && this.restorationStage === 1) return;

    let newlyFilled = 0;
    let hazeChanged = false;
    const thresholdDist = 26;
    const thresholdDistSq = thresholdDist * thresholdDist;
    const hasSegment = p1 && (p1.x !== p2.x || p1.y !== p2.y);

    // LEVEL 3 COLOR VALIDATION CHECK
    if (this.currentLevel && this.currentLevel.hasColorMatching) {
      const nearbyPoints = this.samplePoints.filter(pt => {
        const dSq = hasSegment
          ? this.distToSegmentSq(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y)
          : (pt.x - p2.x) * (pt.x - p2.x) + (pt.y - p2.y) * (pt.y - p2.y);
        return dSq <= thresholdDistSq;
      });

      if (nearbyPoints.length > 0) {
        const activeColor = (this.groutColor || '').toLowerCase();
        const matchesAny = nearbyPoints.some(pt => {
          const gap = this.gaps[pt.gapIdx];
          return gap && (gap.requiredColor || '').toLowerCase() === activeColor;
        });

        if (!matchesAny) {
          const expectedGap = this.gaps[nearbyPoints[0].gapIdx];
          const reqName = expectedGap && expectedGap.requiredColor === '#F5F2EB'
            ? 'Chalk Limestone White'
            : 'Burnt Terracotta';
          this.triggerLevelFailure(
            "COLOR MISMATCH FAILURE",
            `Babu Mistri applied the wrong grout color to this Moroccan section! This section requires ${reqName}. Moroccan master demands restart.`
          );
          return;
        }
      }
    }

    this.samplePoints.forEach(pt => {
      let dSq;
      if (hasSegment) {
        dSq = this.distToSegmentSq(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y);
      } else {
        dSq = (pt.x - p2.x) * (pt.x - p2.x) + (pt.y - p2.y) * (pt.y - p2.y);
      }

      if (dSq <= thresholdDistSq) {
        if (this.currentLevel && this.currentLevel.hasColorMatching) {
          const gap = this.gaps[pt.gapIdx];
          if (gap && gap.requiredColor) {
            const activeColor = (this.groutColor || '').toLowerCase();
            const reqColor = (gap.requiredColor || '').toLowerCase();
            if (activeColor !== reqColor) return;
          }
        }

        if (!pt.filled) {
          pt.filled = true;
          newlyFilled++;
          this.filledPointsCount++;
          const ptStart = Math.max(0, (pt.index - 0.5) / pt.totalSteps);
          const ptEnd = Math.min(1, (pt.index + 0.5) / pt.totalSteps);
          this.addIntervalToGap(pt.gapIdx, ptStart, ptEnd);
          if (this.depositHazeAround(pt.x, pt.y)) {
            hazeChanged = true;
          }

          // Deterministic blowout repair: clear active blowout if its damaged points are re-filled
          if (this.activeBlowoutsList && this.activeBlowoutsList.length > 0) {
            for (let bIdx = this.activeBlowoutsList.length - 1; bIdx >= 0; bIdx--) {
              const b = this.activeBlowoutsList[bIdx];
              if (b.damagedPoints.has(pt)) {
                b.damagedPoints.delete(pt);
                if (b.damagedPoints.size === 0) {
                  this.activeBlowoutsList.splice(bIdx, 1);
                  this.activeBlowouts = this.activeBlowoutsList.length;
                  this.blowoutMarks = this.blowoutMarks.filter(m => m.id !== b.id);
                  audio.playScrape();
                  audio.playChime(4);
                  this.addFloatingText("BLOWOUT REPAIRED! 🧱", b.x, b.y - 15);
                }
              }
            }
          }
        }
      }
    });

    if (hasSegment) {
      if (this.depositHazeAlongStroke(p1, p2)) {
        hazeChanged = true;
      }
    } else {
      if (this.isNearAnyGap(p2.x, p2.y, 28)) {
        if (this.depositHazeAround(p2.x, p2.y)) {
          hazeChanged = true;
        }
      }
    }

    if (newlyFilled > 0) {
      this.combo++;
      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
        audio.triggerStreakReaction(0, 5); // resets streak trigger
      }, 800);

      // Streak Voice reaction at 5x threshold
      audio.triggerStreakReaction(this.combo, 5);

      if (this.combo > 0 && this.combo % 12 === 0) {
        const chimeNote = Math.min(Math.floor(this.combo / 12), 7);
        audio.playChime(chimeNote);
        const praiseList = ["PERFECT JOINT", "SMOOTH SPREAD", "MISTRI APPROVED", "TRUE JUGAAD"];
        const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
        this.addFloatingText(`${praise} (${Math.min(this.combo, 10)}x)`, p2.x, p2.y - 20);
      }
    }

    if (newlyFilled > 0 || hazeChanged) {
      this.notifyProgress();
      this.checkLevelCompletion();
    }
  }

  checkSpongeCleaning(p1, p2) {
    if (this.isCompleted || this.isFailed) return;
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle && this.restorationStage === 1) return;

    const spongeRadius = 36;
    const spongeRadiusSq = spongeRadius * spongeRadius;
    const hasSegment = p1 && (p1.x !== p2.x || p1.y !== p2.y);
    const now = this.now();

    // LEVEL 2 BLOWOUT MECHANIC: Aggressive sponge scrubbing over already-sealed joints
    if (this.currentLevel && this.currentLevel.hasBlowoutMechanic && hasSegment) {
      const rawDt = (p2.time && p1.time) ? (p2.time - p1.time) : 16;
      const dt = rawDt >= 8 ? rawDt : 16;
      const strokeDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const speed = strokeDist / dt; // px/ms

      if (speed >= 0.80) {
        this.gaps.forEach((gap, gapIdx) => {
          const filledInGap = this.samplePoints.filter(pt => pt.gapIdx === gapIdx && pt.filled);
          if (filledInGap.length >= 3) {
            const nearFilled = filledInGap.find(pt => this.distToSegmentSq(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y) <= spongeRadiusSq);
            if (nearFilled) {
              if (gap.lastScrubTime && (now - gap.lastScrubTime > 700)) {
                gap.scrubHeat = Math.max(0, (gap.scrubHeat || 0) - 20);
              }
              gap.lastScrubTime = now;
              gap.scrubHeat = (gap.scrubHeat || 0) + strokeDist;
              if (gap.scrubHeat >= 50) {
                gap.scrubHeat = 0;
                this.triggerBlowout(nearFilled.x, nearFilled.y, gapIdx);
              }
            }
          }
        });
      }
    }

    if (this.totalHazeDeposited === 0) return;

    let newlyCleaned = 0;

    for (let i = 0; i < this.hazePatches.length; i++) {
      const patch = this.hazePatches[i];
      if (patch.cleaned) continue;

      const px = patch.u * this.width;
      const py = patch.v * this.height;

      const dSq = hasSegment
        ? this.distToSegmentSq(px, py, p1.x, p1.y, p2.x, p2.y)
        : (px - p2.x) * (px - p2.x) + (py - p2.y) * (py - p2.y);

      if (dSq <= spongeRadiusSq) {
        // LEVEL 4 CURING CHECK: After 30s, haze becomes cured and takes 3 passes
        if (this.currentLevel && this.currentLevel.hasCuringTimer) {
          const ageSec = (now - (patch.depositedAt || now)) / 1000;
          if (ageSec >= (this.currentLevel.curingDelaySec || 30)) {
            if (!patch.isCured) {
              patch.isCured = true;
              patch.passesRequired = 3;
            }
          }
        }

        if (patch.isCured) {
          if (this.isDragging) {
            if (!this.strokeBuffedPatches) this.strokeBuffedPatches = new Set();
            if (this.strokeBuffedPatches.has(patch)) continue;
            this.strokeBuffedPatches.add(patch);
          }

          if (patch.passesRequired === undefined) patch.passesRequired = 3;
          patch.passesRequired -= 1;
          if (patch.passesRequired > 0) {
            patch.opacity = Math.max(0.2, patch.opacity * 0.65);
            this.addFloatingText(`HARDENED CEMENT (${patch.passesRequired} pass left)`, px, py - 10);
            this.spawnSpongeSparkles(px, py);
            continue; // Needs more scrubs
          }
        }

        patch.cleaned = true;
        patch.opacity = 0;
        newlyCleaned++;
        this.cleanedHazeCount++;
        this.spawnSpongeSparkles(px, py);
      }
    }

    if (newlyCleaned > 0) {
      this.combo++;
      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
        audio.triggerStreakReaction(0, 5); // resets streak trigger
      }, 800);

      // Streak Voice reaction at 5x threshold
      audio.triggerStreakReaction(this.combo, 5);

      if (this.combo > 0 && this.combo % 12 === 0) {
        const chimeNote = Math.min(Math.floor(this.combo / 12), 7);
        audio.playChime(chimeNote);
        const cleanPraises = ["SPARKLING TILE", "HAZE BUFFED", "CLEAN GLAZE", "MISTRI SHINE"];
        const praise = cleanPraises[Math.floor(Math.random() * cleanPraises.length)];
        this.addFloatingText(`${praise} (${Math.min(this.combo, 10)}x)`, p2.x, p2.y - 20);
      }

      const metrics = this.getMetrics();
      if (metrics.hazeReady && !this.hasTriggeredCleanMeme) {
        this.hasTriggeredCleanMeme = true;
        audio.triggerMemeSound('sukoon_asmr');
      }

      this.notifyProgress();
      this.checkLevelCompletion();
    }
  }

  render() {
    const { ctx, width, height } = this;
    if (!ctx || !width || !height) return;

    // Substrate Stone Background
    ctx.fillStyle = '#1C1917';
    ctx.fillRect(0, 0, width, height);

    // Bed Cavity
    ctx.fillStyle = '#292524';
    ctx.fillRect(8, 8, width - 16, height - 16);

    // Render Tiles (Polygonal or Rectangular)
    if (this.currentLevel && this.currentLevel.tiles) {
      const tiles = this.currentLevel.tiles(width, height, this.endlessWave || 1);
      tiles.forEach((tile) => {
        if (tile.polygon) {
          // Render Polygonal Tile (Level 2 Hexagons, Level 3 Moroccan Stars/Crosses)
          ctx.beginPath();
          tile.polygon.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x + 2, pt.y + 2);
            else ctx.lineTo(pt.x + 2, pt.y + 2);
          });
          ctx.closePath();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fill();

          ctx.beginPath();
          tile.polygon.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fillStyle = tile.color || this.currentLevel.tileColor || '#FAF8F5';
          ctx.fill();

          ctx.strokeStyle = tile.border || this.currentLevel.tileBorder || '#E5E0D8';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (tile.label) {
            let cx = 0, cy = 0;
            tile.polygon.forEach(pt => { cx += pt.x; cy += pt.y; });
            cx /= tile.polygon.length;
            cy /= tile.polygon.length;
            ctx.font = '500 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            ctx.fillText(tile.label, cx, cy + 3);
          }
        } else {
          // Render Rectangular Tile
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(tile.x + 3, tile.y + 3, tile.w, tile.h);

          ctx.fillStyle = tile.color || this.currentLevel.tileColor || '#FAF8F5';
          ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

          const grad = ctx.createLinearGradient(tile.x, tile.y, tile.x + tile.w, tile.y + tile.h);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
          ctx.fillStyle = grad;
          ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

          ctx.strokeStyle = tile.border || this.currentLevel.tileBorder || '#E5E0D8';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);

          if (tile.label) {
            ctx.font = '500 10px "JetBrains Mono", monospace';
            ctx.fillStyle = '#78716C';
            ctx.textAlign = 'center';
            ctx.fillText(tile.label, tile.x + tile.w / 2, tile.y + tile.h / 2 + 3);
          }
        }
      });
    }

    // Level 5 Boss Restoration Sockets & Puzzle Pieces
    if (this.currentLevel && this.currentLevel.hasRestorationPuzzle) {
      // Draw target sockets
      if (this.sockets) {
        this.sockets.forEach(sock => {
          ctx.save();
          ctx.setLineDash([5, 4]);
          ctx.strokeStyle = '#D97706'; // Gold dashed target outline
          ctx.lineWidth = 2;
          ctx.strokeRect(sock.x, sock.y, sock.w, sock.h);
          ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
          ctx.fillRect(sock.x, sock.y, sock.w, sock.h);
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#D97706';
          ctx.textAlign = 'center';
          ctx.fillText(`Target: ${sock.name}`, sock.x + sock.w / 2, sock.y + sock.h / 2 + 3);
          ctx.restore();
        });
      }

      // Draw loose puzzle pieces (tray & dragged)
      if (this.loosePieces) {
        this.loosePieces.forEach(piece => {
          ctx.save();
          if (piece === this.draggedPiece) {
            ctx.shadowColor = 'rgba(217, 119, 6, 0.6)';
            ctx.shadowBlur = 12;
          }
          ctx.fillStyle = piece.color || '#D97706';
          ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
          ctx.strokeStyle = piece.placed ? '#22C55E' : '#FFFFFF';
          ctx.lineWidth = piece.placed ? 2 : 1.5;
          ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);

          ctx.font = '700 9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(piece.placed ? '✓ Restored' : piece.name, piece.x + piece.w / 2, piece.y + piece.h / 2 + 3);
          ctx.restore();
        });
      }
    }

    // Draw Unfilled Gap Cavities
    this.gaps.forEach(gap => {
      ctx.beginPath();
      ctx.moveTo(gap.x1, gap.y1);
      ctx.lineTo(gap.x2, gap.y2);
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = gap.width || 24;
      ctx.lineCap = 'round';
      ctx.stroke();
    });

    // Draw Filled Grout Intervals
    this.gaps.forEach((gap, gapIdx) => {
      const intervals = this.gapIntervals.get(gapIdx) || [];
      const dx = gap.x2 - gap.x1;
      const dy = gap.y2 - gap.y1;
      const color = gap.requiredColor || this.currentLevel.groutColor || this.groutColor;
      const border = gap.requiredColor || this.currentLevel.groutBorder || this.groutBorder;

      intervals.forEach(([startT, endT]) => {
        const sx = gap.x1 + dx * startT;
        const sy = gap.y1 + dy * startT;
        const ex = gap.x1 + dx * endT;
        const ey = gap.y1 + dy * endT;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = border;
        ctx.lineWidth = (gap.width || 24) * 0.95;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = color;
        ctx.lineWidth = (gap.width || 24) * 0.85;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
    });

    // Draw Grout Strokes
    this.strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.borderColor || stroke.color;
      ctx.lineWidth = stroke.width || 24;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = (stroke.width || 24) * 0.85;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    // Draw Excess Surface Grout Haze
    const now = this.now();
    for (let i = 0; i < this.hazePatches.length; i++) {
      const p = this.hazePatches[i];
      if (p.cleaned || p.opacity <= 0.02) continue;

      const px = p.u * width;
      const py = p.v * height;

      // Check curing age for Level 4
      let isCured = p.isCured;
      if (this.currentLevel && this.currentLevel.hasCuringTimer && !isCured) {
        if ((now - (p.depositedAt || now)) / 1000 >= (this.currentLevel.curingDelaySec || 30)) {
          p.isCured = true;
          p.passesRequired = 3;
          isCured = true;
        }
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);

      if (isCured) {
        // Hardened cured cement texture
        ctx.fillStyle = `rgba(51, 65, 85, ${p.opacity * 0.95})`;
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Fresh workable haze
        ctx.fillStyle = `rgba(180, 83, 9, ${p.opacity * 0.50})`;
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Blowout Damage Marks
    this.blowoutMarks.forEach(b => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 38, 38, ${b.alpha})`;
      ctx.fill();
      ctx.strokeStyle = '#B91C1C';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    // Draw Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.restore();
    }

    // Draw Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FEF3C7';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = ft.alpha;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Draw Tool Cursor in Canvas
    if (this.currentPos && !this.isCompleted && !this.isFailed) {
      const { x, y } = this.currentPos;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.toolAngle);

      if (this.tool === 'trowel') {
        // Trowel shape
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fillStyle = '#D97706';
        ctx.fill();
        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Sponge circle
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  animate() {
    this.render();
    requestAnimationFrame(this.animate);
  }
}
