// Canvas ASMR Grouting Engine with natural tactile physics & warm rendering

import { audio } from './audio.js';

export class GroutEngine {
  constructor(canvas, onProgress, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onProgress = onProgress;
    this.onComplete = onComplete;

    this.currentLevel = null;
    this.gaps = [];
    this.samplePoints = [];
    this.filledPointsCount = 0;
    this.gapIntervals = new Map();
    this.tool = 'trowel';
    this.groutColor = '#B45309';
    this.groutBorder = '#92400E';

    // Drag tracking
    this.isDragging = false;
    this.lastPos = null;
    this.currentPos = { x: 0, y: 0 };
    this.toolAngle = 0;
    this.strokes = [];
    this.currentStroke = null;

    // Particles (Natural plaster & stone dust)
    this.particles = [];
    this.floatingTexts = [];

    // Combo system
    this.combo = 0;
    this.comboTimer = null;
    this.isCompleted = false;

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
      // In short landscape viewports, allocate height so header, HUD, stages ribbon, canvas and tool deck
      // fit comfortably within the viewport without vertical scrolling.
      // Budget: windowH minus header(~26px) + HUD(~24px) + stages(~21px) + tool-deck(~32px) + paddings/gaps(~40px) = ~145px
      const maxAvailableH = Math.max(windowH - 155, 140);
      newHeight = Math.min(Math.round(newWidth * 0.48), maxAvailableH, 240);
    } else if (windowW <= 680) {
      // In mobile portrait viewports, ensure canvas doesn't push tool deck below initial fold
      const maxPortraitH = Math.max(Math.round(windowH * 0.42), 220);
      newHeight = Math.min(Math.round(newWidth * 0.74), maxPortraitH, 420);
    } else {
      // In desktop viewports, maintain standard spacious artisanal canvas dimensions
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

  resizeLevel(oldWidth, oldHeight, newWidth, newHeight) {
    if (!oldWidth || !oldHeight || oldWidth === 0 || oldHeight === 0) return;

    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    // 1. Rescale all recorded grout strokes proportionally to preserve geometry
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
    this.gaps = this.currentLevel.generateGaps(newWidth, newHeight);
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

        // Exact intersection calculation with canonical filled intervals on this gap
        let overlap = 0;
        for (const [s, e] of intervals) {
          const interStart = Math.max(ptStart, s);
          const interEnd = Math.min(ptEnd, e);
          if (interEnd > interStart) {
            overlap += (interEnd - interStart);
          }
        }

        // A point is filled if at least 50% of its interval was covered
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

    // 3. Update progress callback with preserved coverage
    const total = this.samplePoints.length;
    const coverage = total > 0 ? (this.filledPointsCount / total) * 100 : 0;
    if (this.onProgress) {
      this.onProgress(Math.min(coverage, 100), this.combo);
    }
  }

  loadLevel(level) {
    this.currentLevel = level;
    this.groutColor = level.groutColor || '#B45309';
    this.groutBorder = level.groutBorder || '#92400E';
    this.isCompleted = false;
    this.strokes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.combo = 0;
    this.tool = 'trowel';
    this.gapIntervals = new Map();
    this.initLevel(level, true);
  }

  initLevel(level, playGreeting = true) {
    this.gaps = level.generateGaps(this.width, this.height);
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

    if (playGreeting) {
      audio.playChime(1);
    }
  }

  setTool(tool) {
    this.tool = tool;
    if (tool === 'sponge') {
      audio.playSponge();
    } else {
      audio.playScrape();
    }
  }

  setGroutColor(color, border) {
    this.groutColor = color;
    this.groutBorder = border || color;
  }

  getPointerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  setupListeners() {
    const onStart = (e) => {
      e.preventDefault();
      audio.ensureContext();
      this.isDragging = true;
      const pos = this.getPointerPos(e);
      this.lastPos = pos;
      this.currentPos = pos;

      if (this.tool === 'trowel') {
        this.currentStroke = {
          color: this.groutColor,
          borderColor: this.groutBorder,
          width: this.currentLevel ? (this.currentLevel.gapWidth || 24) : 24,
          points: [pos]
        };
        this.strokes.push(this.currentStroke);
      }
      this.checkGroutFill(null, pos);
    };

    const onMove = (e) => {
      const pos = this.getPointerPos(e);
      this.currentPos = pos;

      if (!this.isDragging) return;
      e.preventDefault();

      if (this.lastPos) {
        const dx = pos.x - this.lastPos.x;
        const dy = pos.y - this.lastPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          this.toolAngle = Math.atan2(dy, dx);
          
          if (this.tool === 'trowel') {
            this.currentStroke.points.push(pos);
            audio.playSquelch(Math.min(dist / 10, 1.8));
            this.spawnSquelchParticles(pos.x, pos.y);
          } else if (this.tool === 'sponge') {
            audio.playSponge();
            this.spawnSpongeSparkles(pos.x, pos.y);
          }

          this.checkGroutFill(this.lastPos, pos);
          this.lastPos = pos;
        }
      }
    };

    const onEnd = () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.lastPos = null;
        this.currentStroke = null;
      }
    };

    const onLeave = () => {
      this.currentPos = null;
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
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
    // Soft limestone buff powder
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
    // Natural celebratory earth pigments
    const colors = ['#9A3412', '#B45309', '#D97706', '#2D6A4F', '#F5F2EB', '#78716C'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
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

  checkGroutFill(p1, p2) {
    if (this.isCompleted) return;

    let newlyFilled = 0;
    const thresholdDist = this.tool === 'sponge' ? 38 : 26;
    const thresholdDistSq = thresholdDist * thresholdDist;

    // Continuous point-to-segment squared distance helper
    const distToSegmentSq = (px, py, x1, y1, x2, y2) => {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) {
        return (px - x1) * (px - x1) + (py - y1) * (py - y1);
      }
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      return (px - projX) * (px - projX) + (py - projY) * (py - projY);
    };

    const hasSegment = p1 && (p1.x !== p2.x || p1.y !== p2.y);

    this.samplePoints.forEach(pt => {
      if (!pt.filled) {
        let dSq;
        if (hasSegment) {
          dSq = distToSegmentSq(pt.x, pt.y, p1.x, p1.y, p2.x, p2.y);
        } else {
          dSq = (pt.x - p2.x) * (pt.x - p2.x) + (pt.y - p2.y) * (pt.y - p2.y);
        }

        if (dSq <= thresholdDistSq) {
          pt.filled = true;
          newlyFilled++;
          this.filledPointsCount++;
          const ptStart = Math.max(0, (pt.index - 0.5) / pt.totalSteps);
          const ptEnd = Math.min(1, (pt.index + 0.5) / pt.totalSteps);
          this.addIntervalToGap(pt.gapIdx, ptStart, ptEnd);
        }
      }
    });

    if (newlyFilled > 0) {
      this.combo++;
      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
      }, 700);

      if (this.combo > 0 && this.combo % 12 === 0) {
        const chimeNote = Math.min(Math.floor(this.combo / 12), 7);
        audio.playChime(chimeNote);
        const praiseList = ["PERFECT JOINT", "SMOOTH SPREAD", "MISTRI APPROVED", "TRUE JUGAAD"];
        const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
        this.addFloatingText(`${praise} (${Math.min(this.combo, 10)}x)`, p2.x, p2.y - 20);
      }

      const total = this.samplePoints.length;
      const coverage = total > 0 ? (this.filledPointsCount / total) * 100 : 0;
      const target = this.currentLevel ? (this.currentLevel.targetFill || 84) : 84;

      if (this.onProgress) {
        this.onProgress(Math.min(coverage, 100), this.combo);
      }

      if (coverage >= target && !this.isCompleted) {
        this.isCompleted = true;
        this.spawnConfetti();
        audio.playFanfare();
        audio.triggerMemeSound('mistri_op');

        if (this.onComplete) {
          this.onComplete(this.currentLevel, coverage);
        }
      }
    }
  }

  drawHeart(ctx, x, y, width, height) {
    ctx.save();
    ctx.beginPath();
    const topCurveHeight = height * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - width / 2, y + (height + topCurveHeight) / 2, x, y + (height + topCurveHeight) / 2, x, y + height);
    ctx.bezierCurveTo(x, y + (height + topCurveHeight) / 2, x + width / 2, y + (height + topCurveHeight) / 2, x + width / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fillStyle = '#9F1239'; // Deep Rose Clay
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#881337';
    ctx.stroke();
    ctx.restore();
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

    // Render Tiles
    if (this.currentLevel && this.currentLevel.isHeartShape) {
      this.drawHeart(ctx, width / 2, height / 2 - height * 0.35, width * 0.68, height * 0.64);
    } else if (this.currentLevel && this.currentLevel.tiles) {
      const tiles = this.currentLevel.tiles(width, height);
      tiles.forEach((tile) => {
        // Natural soft tile drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(tile.x + 3, tile.y + 3, tile.w, tile.h);

        // Tile body (matte limestone/porcelain finish)
        ctx.fillStyle = this.currentLevel.tileColor || '#FAF8F5';
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

        // Subtle matte bevel
        const grad = ctx.createLinearGradient(tile.x, tile.y, tile.x + tile.w, tile.y + tile.h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

        // Border
        ctx.strokeStyle = this.currentLevel.tileBorder || '#E5E0D8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);

        // Architectural specification text on tile
        if (tile.label) {
          ctx.font = '500 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#78716C';
          ctx.textAlign = 'center';
          ctx.fillText(tile.label, tile.x + tile.w / 2, tile.y + tile.h / 2);
        }
      });
    }

    // Draw Unfilled Gap Cavities
    this.gaps.forEach(gap => {
      ctx.beginPath();
      ctx.moveTo(gap.x1, gap.y1);
      ctx.lineTo(gap.x2, gap.y2);
      ctx.strokeStyle = '#141211'; // Deep recessed cavity
      ctx.lineWidth = gap.width || 24;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = (gap.width || 24) * 0.5;
      ctx.stroke();
    });

    // Draw Satin Grout Strokes
    this.strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      // Outer joint border
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.borderColor;
      ctx.lineWidth = stroke.width + 2;
      ctx.stroke();

      // Main paste
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.stroke();

      // Soft natural satin surface highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = stroke.width * 0.28;
      ctx.stroke();
    });

    // Draw Plaster & Powder Particles
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
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Floating Achievement Labels
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.025;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#F5F1E8';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Handcrafted Masonry Tool Cursor
    if (this.currentPos) {
      ctx.save();
      ctx.translate(this.currentPos.x, this.currentPos.y);
      ctx.rotate(this.toolAngle);

      if (this.tool === 'trowel') {
        // Steel trowel blade with wood handle
        ctx.fillStyle = '#D6D3D1';
        ctx.strokeStyle = '#57534E';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-18, -16);
        ctx.lineTo(-22, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Grout paste dollop on blade
        ctx.fillStyle = this.groutColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Wood turned handle
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-34, -4, 12, 8);
      } else {
        // Natural sea sponge block
        ctx.fillStyle = '#E7E3DB';
        ctx.strokeStyle = '#D6CEBF';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-16, -12, 32, 24);
        ctx.strokeRect(-16, -12, 32, 24);

        ctx.fillStyle = '#C4BEB3';
        ctx.beginPath();
        ctx.arc(-6, -3, 2, 0, Math.PI * 2);
        ctx.arc(6, 4, 2.5, 0, Math.PI * 2);
        ctx.arc(3, -5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  animate() {
    this.render();
    requestAnimationFrame(this.animate);
  }
}
