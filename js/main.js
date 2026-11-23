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
    this.setupLevelSelector();
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

  setupLevelSelector() {
    const container = document.getElementById('levelSelectorRow');
    if (!container) return;
    container.innerHTML = '';

    LEVELS.forEach((level, idx) => {
      const pill = document.createElement('button');
      pill.className = `level-pill ${idx === this.currentLevelIndex ? 'active' : ''}`;
      pill.textContent = `${level.id}. ${level.name.split(' (')[0]}`;
      pill.addEventListener('click', () => {
        this.loadLevel(idx);
      });
      container.appendChild(pill);
    });
  }

  loadLevel(index) {
    if (index < 0 || index >= LEVELS.length) {
      index = 0;
    }
    this.currentLevelIndex = index;
    const level = LEVELS[index];

    // Update level HUD
    const levelNumEl = document.getElementById('levelNumber');
    if (levelNumEl) levelNumEl.textContent = `STAGE ${level.id} / ${LEVELS.length}`;

    const levelTitleEl = document.getElementById('levelTitle');
    if (levelTitleEl) levelTitleEl.textContent = level.name;

    const levelBadgeEl = document.getElementById('levelBadgeText');
    if (levelBadgeEl) levelBadgeEl.textContent = level.badge.toUpperCase();

    const thekedarTextEl = document.getElementById('thekedarText');
    if (thekedarTextEl) thekedarTextEl.textContent = level.thekedarQuote;

    const mistriTextEl = document.getElementById('mistriText');
    if (mistriTextEl) mistriTextEl.textContent = level.mistriQuote;
    
    // Reset progress HUD
    this.progressFill.style.width = '0%';
    this.progressPercent.textContent = '0%';
    const streakValEl = this.comboPill.querySelector('.streak-val');
    if (streakValEl) streakValEl.textContent = '1x';

    // Update active level pill
    document.querySelectorAll('.level-pill').forEach((pill, i) => {
      if (i === index) {
        pill.classList.add('active');
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        pill.classList.remove('active');
      }
    });

    // Reset Tool active state
    document.querySelectorAll('.deck-btn').forEach(btn => btn.classList.remove('active'));
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

    const streakValEl = this.comboPill.querySelector('.streak-val');
    if (streakValEl) {
      streakValEl.textContent = `${Math.min(combo, 10)}x`;
    }
  }

  onComplete(level) {
    const victoryModal = document.getElementById('victoryModal');
    const verdictEl = document.getElementById('victoryVerdict');
    const victoryLevelTitle = document.getElementById('victoryLevelTitle');

    if (victoryLevelTitle) {
      victoryLevelTitle.textContent = `${level.name} Approved`;
    }

    const funnyVerdicts = [
      `“Thekedar inspected the joint with a magnifying glass. He sighed, accepted defeat, and signed off.”`,
      `“Contractor refused to pay cash, but Babu Mistri accepted two hot samosas and declared victory.”`,
      `“Structural engineers were baffled. Grout achieved what modern physics deemed impossible.”`,
      `“Archaeologists cataloged your work under 'Classical 2026 Jugaad Renaissance'.”`,
      `“Engineering degrees were questioned. Babu Mistri's trowel was officially consecrated.”`
    ];
    if (verdictEl) {
      verdictEl.textContent = funnyVerdicts[Math.floor(Math.random() * funnyVerdicts.length)];
    }

    victoryModal.classList.add('active');
  }

  setupUIListeners() {
    // Tools
    document.getElementById('toolTrowel').addEventListener('click', (e) => {
      document.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      this.engine.setTool('trowel');
    });

    document.getElementById('toolSponge').addEventListener('click', (e) => {
      document.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      this.engine.setTool('sponge');
    });

    // Reset current level
    document.getElementById('btnResetLevel').addEventListener('click', () => {
      this.loadLevel(this.currentLevelIndex);
      this.showToast('Joint cleared. Ready for fresh paste.');
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
    const muteLabel = document.getElementById('muteLabel');
    const updateMuteState = (isMuted) => {
      if (muteLabel) {
        muteLabel.textContent = isMuted ? 'Sound Off' : 'Sound On';
      }
    };
    updateMuteState(audio.muted);
    btnMute.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      updateMuteState(isMuted);
      this.showToast(isMuted ? 'Audio muted' : 'Audio enabled');
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
      const name = nameInput.value.trim() || 'Senior Babu Mistri';
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
      const name = (nameInput.value.trim() || 'Babu-Mistri').replace(/\s+/g, '-');
      CertificateGenerator.download(certCanvas, `${name}-Diploma.png`);
      this.showToast('Diploma generated & downloaded.');
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
    }, 2200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new GroutApp();
});
