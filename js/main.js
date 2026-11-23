// Main application orchestrator for GROUT!

import { LEVELS, GROUT_PALETTES } from './levels.js';
import { GroutEngine } from './engine.js';
import { audio } from './audio.js';
import { CertificateGenerator } from './certificate.js';
import { adManager } from './ads.js';
import { viralManager } from './viral.js';

class GroutApp {
  constructor() {
    this.currentLevelIndex = 0;
    this.engine = null;
    this.canvas = document.getElementById('gameCanvas');
    this.progressFill = document.getElementById('progressFill');
    this.progressPercent = document.getElementById('progressPercent');
    this.comboPill = document.getElementById('comboPill');

    this.init();
  }

  init() {
    this.setupEngine();
    this.setupPalette();
    this.setupUIListeners();
    this.loadLevel(0);
    viralManager.initSoundboard();
    adManager.refreshAds();
  }

  setupEngine() {
    this.engine = new GroutEngine(
      this.canvas,
      (coverage, combo) => this.onProgress(coverage, combo),
      (level, coverage) => this.onComplete(level, coverage)
    );
  }

  setupPalette() {
    const container = document.getElementById('swatchesContainer');
    if (!container) return;

    GROUT_PALETTES.forEach((p, idx) => {
      const btn = document.createElement('button');
      btn.className = `swatch-btn ${idx === 0 ? 'active' : ''}`;
      btn.style.backgroundColor = p.color;
      btn.title = p.name;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.engine.setGroutColor(p.color, p.border);
        audio.playScrape();
      });
      container.appendChild(btn);
    });
  }

  loadLevel(index) {
    if (index < 0 || index >= LEVELS.length) {
      index = 0;
    }
    this.currentLevelIndex = index;
    const level = LEVELS[index];

    // Update level HUD
    document.getElementById('levelNumber').textContent = `LEVEL ${level.id} / ${LEVELS.length}`;
    document.getElementById('levelTitle').textContent = level.name;
    document.getElementById('thekedarText').textContent = level.thekedarQuote;
    document.getElementById('mistriText').textContent = level.mistriQuote;
    
    // Reset progress HUD
    this.progressFill.style.width = '0%';
    this.progressPercent.textContent = '0%';
    this.comboPill.textContent = 'x1';

    // Reset Tool active state
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('toolTrowel').classList.add('active');

    // Load into engine
    this.engine.loadLevel(level);

    // Refresh ads safely
    adManager.refreshAds();
  }

  onProgress(coverage, combo) {
    const formatted = Math.min(Math.round(coverage), 100);
    this.progressFill.style.width = `${formatted}%`;
    this.progressPercent.textContent = `${formatted}%`;
    this.comboPill.textContent = `x${Math.min(combo, 10)}`;

    if (combo > 3) {
      this.comboPill.style.transform = 'scale(1.15)';
      setTimeout(() => {
        this.comboPill.style.transform = 'scale(1)';
      }, 150);
    }
  }

  onComplete(level, coverage) {
    const victoryModal = document.getElementById('victoryModal');
    const verdictEl = document.getElementById('victoryVerdict');
    const victoryLevelTitle = document.getElementById('victoryLevelTitle');

    if (victoryLevelTitle) {
      victoryLevelTitle.textContent = `${level.name} FIXED!`;
    }

    const funnyVerdicts = [
      `“Thekedar fell on his knees! You solved it with pure Jugaad!”`,
      `“Contractor refused to pay, but Mistri took 2 samosas and declared victory!”`,
      `“Scientists are studying how Grout fixed this level. 10/10 Jugaad!”`,
      `“UNESCO added your Grout work to World Wonder list!”`
    ];
    if (verdictEl) {
      verdictEl.textContent = funnyVerdicts[Math.floor(Math.random() * funnyVerdicts.length)];
    }

    victoryModal.classList.add('active');
  }

  setupUIListeners() {
    // Tools
    document.getElementById('toolTrowel').addEventListener('click', (e) => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      this.engine.setTool('trowel');
    });

    document.getElementById('toolSponge').addEventListener('click', (e) => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      this.engine.setTool('sponge');
    });

    // Reset current level
    document.getElementById('btnResetLevel').addEventListener('click', () => {
      this.loadLevel(this.currentLevelIndex);
      this.showToast('Level reset! Fill it again!');
    });

    // Next Level button
    document.getElementById('btnNextLevel').addEventListener('click', () => {
      document.getElementById('victoryModal').classList.remove('active');
      adManager.showLevelTransitionAd(() => {
        const nextIdx = (this.currentLevelIndex + 1) % LEVELS.length;
        this.loadLevel(nextIdx);
      });
    });

    // Audio Mute toggle
    const btnMute = document.getElementById('btnMute');
    const updateMuteIcon = (isMuted) => {
      btnMute.innerHTML = isMuted ? '🔇 <span>Unmute</span>' : '🔊 <span>Mute</span>';
    };
    updateMuteIcon(audio.muted);
    btnMute.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      updateMuteIcon(isMuted);
      this.showToast(isMuted ? 'Audio muted' : 'Audio unmuted! Sound on! 🎶');
    });

    // Soundboard Modal
    const soundboardModal = document.getElementById('soundboardModal');
    document.getElementById('btnOpenSoundboard').addEventListener('click', () => {
      soundboardModal.classList.add('active');
    });
    document.getElementById('btnCloseSoundboard').addEventListener('click', () => {
      soundboardModal.classList.remove('active');
    });

    // Diploma / Certificate Modal
    const certificateModal = document.getElementById('certificateModal');
    const certCanvas = document.getElementById('certificateCanvas');
    const nameInput = document.getElementById('certNameInput');

    const updateCertificate = () => {
      const name = nameInput.value.trim() || 'Senior Mistri';
      CertificateGenerator.generateCertificate(certCanvas, name);
    };

    const openCertificateModal = () => {
      updateCertificate();
      certificateModal.classList.add('active');
    };

    document.getElementById('btnOpenDiploma').addEventListener('click', () => {
      document.getElementById('victoryModal').classList.remove('active');
      openCertificateModal();
    });

    document.getElementById('btnHeaderDiploma').addEventListener('click', openCertificateModal);

    document.getElementById('btnCloseDiploma').addEventListener('click', () => {
      certificateModal.classList.remove('active');
    });

    nameInput.addEventListener('input', updateCertificate);

    document.getElementById('btnDownloadDiploma').addEventListener('click', () => {
      const name = (nameInput.value.trim() || 'Grout-Master').replace(/\s+/g, '-');
      CertificateGenerator.download(certCanvas, `${name}-Degree.png`);
      this.showToast('🎓 Diploma Downloaded! Show it to your parents!');
    });

    // Social Sharing Buttons
    document.getElementById('btnShareWhatsApp').addEventListener('click', () => {
      const level = LEVELS[this.currentLevelIndex];
      viralManager.shareWhatsApp(level.name, 100);
    });

    document.getElementById('btnVictoryWhatsApp').addEventListener('click', () => {
      const level = LEVELS[this.currentLevelIndex];
      viralManager.shareWhatsApp(level.name, 100);
    });

    document.getElementById('btnShareTwitter').addEventListener('click', () => {
      const level = LEVELS[this.currentLevelIndex];
      viralManager.shareTwitter(level.name, 100);
    });

    document.getElementById('btnCopyLink').addEventListener('click', () => {
      viralManager.copyLink((msg) => this.showToast(msg));
    });
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }
}

// Start game after DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new GroutApp();
});
