// Canvas ASMR Grouting Engine with drag physics, particle effects & coverage tracking

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
    this.tool = 'trowel'; // 'trowel' or 'sponge'
    this.groutColor = '#f59e0b';
    this.groutBorder = '#d97706';

    // Drag tracking
    this.isDragging = false;
    this.lastPos = null;
    this.currentPos = { x: 0, y: 0 };
    this.toolAngle = 0;
    this.strokes = []; // Array of drawn paths
    this.currentStroke = null;

    // Particles
    this.particles = [];
    this.floatingTexts = [];

    // Combo system
    this.combo = 0;
    this.comboTimer = null;
    this.totalScore = 0;
    this.isCompleted = false;

    this.spongeCleanliness = 100; // 0 to 100% polished

    this.setupListeners();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    // Set display size
    const width = Math.min(rect.width, 720);
    const height = Math.min(rect.height || width * 0.9, 640);
    
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Set actual canvas size in memory
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);

    this.width = width;
    this.height = height;

    if (this.currentLevel) {
      this.initLevel(this.currentLevel, false);
    }
  }

  loadLevel(level) {
    this.currentLevel = level;
    this.groutColor = level.groutColor || '#f59e0b';
    this.isCompleted = false;
    this.strokes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.combo = 0;
    this.tool = 'trowel';
    this.initLevel(level, true);
  }

  initLevel(level, playGreeting = true) {
    this.gaps = level.generateGaps(this.width, this.height);
    this.samplePoints = [];
    this.filledPointsCount = 0;

    // Discretize all gap lines into sample points
    const step = 8; // Sample density
    this.gaps.forEach((gap, gapIdx) => {
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
          gapIdx
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
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
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
          width: this.currentLevel ? (this.currentLevel.gapWidth || 26) : 26,
          points: [pos]
        };
        this.strokes.push(this.currentStroke);
      }
      this.checkGroutFill(pos);
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

        if (dist > 3) {
          this.toolAngle = Math.atan2(dy, dx);
          
          if (this.tool === 'trowel') {
            this.currentStroke.points.push(pos);
            audio.playSquelch(Math.min(dist / 10, 2));
            this.spawnSquelchParticles(pos.x, pos.y);
          } else if (this.tool === 'sponge') {
            audio.playSponge();
            this.spawnSpongeSparkles(pos.x, pos.y);
          }

          this.checkGroutFill(pos);
          this.lastPos = pos;
        }
      }
    };

    const onEnd = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.lastPos = null;
        this.currentStroke = null;
      }
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  }

  spawnSquelchParticles(x, y) {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3.5,
        color: this.groutColor,
        alpha: 0.9,
        decay: 0.04
      });
    }
  }

  spawnSpongeSparkles(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        radius: 2 + Math.random() * 2.5,
        color: '#ffffff',
        alpha: 1,
        decay: 0.05,
        isSparkle: true
      });
    }
  }

  spawnConfetti() {
    const colors = ['#f59e0b', '#ec4899', '#38bdf8', '#10b981', '#a855f7', '#fbbf24'];
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        radius: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.015,
        gravity: 0.15
      });
    }
  }

  addFloatingText(text, x, y, color = '#fbbf24') {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1,
      vy: -1.5
    });
  }

  checkGroutFill(pos) {
    if (this.isCompleted) return;

    let newlyFilled = 0;
    const thresholdDist = this.tool === 'sponge' ? 40 : 28;

    this.samplePoints.forEach(pt => {
      if (!pt.filled) {
        const d = Math.hypot(pt.x - pos.x, pt.y - pos.y);
        if (d <= thresholdDist) {
          pt.filled = true;
          newlyFilled++;
          this.filledPointsCount++;
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
        const praiseList = ["SQUISH! 🧱", "SMOOTH! ✨", "MISTRI OP! 🔥", "PERFECT GROUT! 💯"];
        const praise = praiseList[Math.floor(Math.random() * praiseList.length)];
        this.addFloatingText(`${praise} x${Math.min(this.combo, 10)}`, pos.x, pos.y - 20);
      }

      const total = this.samplePoints.length;
      const coverage = total > 0 ? (this.filledPointsCount / total) * 100 : 0;
      const target = this.currentLevel ? (this.currentLevel.targetFill || 88) : 88;

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
    // Left curve
    ctx.bezierCurveTo(
      x, y, 
      x - width / 2, y, 
      x - width / 2, y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x - width / 2, y + (height + topCurveHeight) / 2, 
      x, y + (height + topCurveHeight) / 2, 
      x, y + height
    );
    // Right curve
    ctx.bezierCurveTo(
      x, y + (height + topCurveHeight) / 2, 
      x + width / 2, y + (height + topCurveHeight) / 2, 
      x + width / 2, y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x + width / 2, y, 
      x, y, 
      x, y + topCurveHeight
    );
    ctx.closePath();
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#e11d48';
    ctx.stroke();
    ctx.restore();
  }

  render() {
    const { ctx, width, height } = this;
    if (!ctx || !width || !height) return;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw Substrate / Mortar bed pattern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 10, width - 20, height - 20);

    // If level is Broken Heart
    if (this.currentLevel && this.currentLevel.isHeartShape) {
      this.drawHeart(ctx, width / 2, height / 2 - height * 0.35, width * 0.7, height * 0.65);
    } else if (this.currentLevel && this.currentLevel.tiles) {
      // Draw standard tiles
      const tiles = this.currentLevel.tiles(width, height);
      tiles.forEach((tile, idx) => {
        // Tile drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(tile.x + 4, tile.y + 4, tile.w, tile.h);

        // Tile body
        ctx.fillStyle = this.currentLevel.tileColor || '#f8fafc';
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

        // Subtle tile glossy bevel
        const grad = ctx.createLinearGradient(tile.x, tile.y, tile.x + tile.w, tile.y + tile.h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);

        // Border
        ctx.strokeStyle = this.currentLevel.tileBorder || '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);

        // Tile label / branding
        if (tile.label) {
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#64748b';
          ctx.textAlign = 'center';
          ctx.fillText(tile.label, tile.x + tile.w / 2, tile.y + tile.h / 2);
        }
      });
    }

    // Draw unfilled gaps (the dark recessed crevices where grout is missing)
    this.gaps.forEach(gap => {
      ctx.beginPath();
      ctx.moveTo(gap.x1, gap.y1);
      ctx.lineTo(gap.x2, gap.y2);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = gap.width || 26;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Shadow in gap
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = (gap.width || 26) * 0.5;
      ctx.stroke();
    });

    // Draw Grout Strokes (Satisfying wet paste)
    this.strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      // Outer grout border / thickness
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.borderColor;
      ctx.lineWidth = stroke.width + 4;
      ctx.stroke();

      // Main vibrant grout paste
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.stroke();

      // Specular highlight line (wet ASMR shine)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = stroke.width * 0.25;
      ctx.stroke();
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
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.isSparkle) {
        // Star sparkle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - p.radius * 2, p.y);
        ctx.lineTo(p.x + p.radius * 2, p.y);
        ctx.moveTo(p.x, p.y - p.radius * 2);
        ctx.lineTo(p.x, p.y + p.radius * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.02;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Draw Tool Cursor
    if (this.currentPos) {
      ctx.save();
      ctx.translate(this.currentPos.x, this.currentPos.y);
      ctx.rotate(this.toolAngle);

      if (this.tool === 'trowel') {
        // Masonry Trowel
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-20, -18);
        ctx.lineTo(-24, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Grout paste dollop on trowel blade
        ctx.fillStyle = this.groutColor;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // Handle
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-36, -4, 14, 8);
      } else {
        // Sponge Tool
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.fillRect(-18, -14, 36, 28);
        ctx.strokeRect(-18, -14, 36, 28);

        // Sponge pores
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(-8, -4, 2, 0, Math.PI * 2);
        ctx.arc(6, 4, 3, 0, Math.PI * 2);
        ctx.arc(4, -6, 2, 0, Math.PI * 2);
        ctx.arc(-6, 6, 2.5, 0, Math.PI * 2);
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
