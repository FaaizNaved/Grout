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
    this.hazeFill = document.getElementById('hazeFill');
    this.hazePercent = document.getElementById('hazePercent');
    this.hudPhaseHint = document.getElementById('hudPhaseHint');
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

    // Opening voice autoplay attempt with graceful banner fallback
    audio.attemptOpeningVoice(
      () => {
        const promptEl = document.getElementById('autoplayPrompt');
        if (promptEl) promptEl.classList.remove('hidden');
      },
      () => {
        const promptEl = document.getElementById('autoplayPrompt');
        if (promptEl) promptEl.classList.add('hidden');
      }
    );

    window.groutApp = this;
  }

  setupEngine() {
    this.engine = new GroutEngine(
      this.canvas,
      (coverage, combo) => this.onProgress(coverage, combo),
      (level, coverage) => this.onComplete(level, coverage)
    );

    this.engine.onWaveComplete = (wave, metrics) => {
      const levelNumEl = document.getElementById('levelNumber');
      if (levelNumEl) levelNumEl.textContent = `ENDLESS ASMR — WAVE ${wave}`;
      this.showToast(`✨ Wave ${wave} Reached! Sukoon hi sukoon.`);
    };

    this.engine.onFailure = (level, title, reason) => {
      const failureModal = document.getElementById('failureModal');
      const failureTitle = document.getElementById('failureTitle');
      const failureReason = document.getElementById('failureReason');
      const failureQuote = document.getElementById('failureQuote');

      if (failureTitle) failureTitle.textContent = title || 'Level Failed';
      if (failureReason) failureReason.textContent = reason || 'Craftsmanship defect detected.';
      if (failureQuote) {
        const failureQuotes = [
          `“Paisa barbaad ho gaya! Start over with better craftsmanship.”`,
          `“Thekedar cancelled the invoice on the spot! Clean up and re-try.”`,
          `“One hasty move ruined the finish! Master mistris take no shortcuts.”`
        ];
        failureQuote.textContent = failureQuotes[Math.floor(Math.random() * failureQuotes.length)];
      }
      if (failureModal) failureModal.classList.add('active');
    };

    this.engine.onTimerTick = (seconds) => {
      const timerPill = document.getElementById('levelTimerPill');
      const timerVal = document.getElementById('timerValue');
      if (timerPill && timerVal) {
        timerVal.textContent = `${seconds}s`;
        if (seconds <= 10) {
          timerPill.classList.add('urgent');
        } else {
          timerPill.classList.remove('urgent');
        }
      }
    };

    this.engine.onFragilityChange = (pct) => {
      const fragilityPill = document.getElementById('fragilityPill');
      const fragilityVal = document.getElementById('fragilityValue');
      if (fragilityPill && fragilityVal) {
        fragilityVal.textContent = `${pct}%`;
        if (pct >= 60) {
          fragilityPill.classList.add('danger');
        } else {
          fragilityPill.classList.remove('danger');
        }
      }
    };
  }

  setupPalette() {
    const container = document.getElementById('swatchesContainer');
    if (!container) return;
    container.innerHTML = '';

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

  getUnlockedLevel() {
    try {
      const stored = localStorage.getItem('grout_unlocked_level');
      const val = parseInt(stored, 10);
      return !isNaN(val) && val >= 1 ? Math.min(val, 6) : 1;
    } catch (e) {
      return 1;
    }
  }

  unlockLevel(levelId) {
    try {
      const current = this.getUnlockedLevel();
      if (levelId > current) {
        localStorage.setItem('grout_unlocked_level', String(Math.min(levelId, 6)));
      }
    } catch (e) {
      // storage unavailable
    }
    this.setupLevelSelector();
  }

  setupLevelSelector() {
    const container = document.getElementById('levelSelectorRow');
    if (!container) return;
    container.innerHTML = '';
    const unlockedLevel = this.getUnlockedLevel();

    LEVELS.forEach((level, idx) => {
      const isLocked = level.id > unlockedLevel;
      const pill = document.createElement('button');
      pill.className = `level-pill ${idx === this.currentLevelIndex ? 'active' : ''} ${isLocked ? 'locked' : ''}`;
      const label = level.id === 6
        ? `BONUS: Endless ASMR`
        : `${level.id}. ${level.name.split(' (')[0]}`;

      if (isLocked) {
        pill.innerHTML = `<span class="lock-icon">🔒</span> ${label}`;
        pill.disabled = true;
        pill.title = `Complete Level ${level.id - 1} to unlock`;
      } else {
        pill.textContent = label;
        pill.title = level.name;
        pill.addEventListener('click', () => {
          this.loadLevel(idx);
        });
      }
      container.appendChild(pill);
    });
  }

  loadLevel(index) {
    if (index < 0 || index >= LEVELS.length) {
      index = 0;
    }
    const level = LEVELS[index];
    const unlockedLevel = this.getUnlockedLevel();
    if (level && level.id > unlockedLevel) {
      this.showToast(`Level ${level.id} is locked! Complete Level ${level.id - 1} first.`);
      return;
    }

    this.currentLevelIndex = index;

    // Dismiss modals if open
    const victoryModal = document.getElementById('victoryModal');
    if (victoryModal) victoryModal.classList.remove('active');
    const failureModal = document.getElementById('failureModal');
    if (failureModal) failureModal.classList.remove('active');
    const campaignCompleteModal = document.getElementById('campaignCompleteModal');
    if (campaignCompleteModal) campaignCompleteModal.classList.remove('active');

    // Update level HUD
    const levelNumEl = document.getElementById('levelNumber');
    if (levelNumEl) {
      levelNumEl.textContent = level.id === 6
        ? `BONUS STAGE: ENDLESS ASMR`
        : `STAGE ${level.id} / 5`;
    }

    // Toggle HUD Pills for Level 4 Timer and Level 5 Fragility
    const timerPill = document.getElementById('levelTimerPill');
    const timerVal = document.getElementById('timerValue');
    if (timerPill) {
      if (level.hasCuringTimer) {
        timerPill.classList.remove('hidden');
        timerPill.classList.remove('urgent');
        if (timerVal) timerVal.textContent = `${level.overallDeadlineSec || 75}s`;
      } else {
        timerPill.classList.add('hidden');
      }
    }

    const fragilityPill = document.getElementById('fragilityPill');
    const fragilityVal = document.getElementById('fragilityValue');
    if (fragilityPill) {
      if (level.hasRestorationPuzzle) {
        fragilityPill.classList.remove('hidden');
        fragilityPill.classList.remove('danger');
        if (fragilityVal) fragilityVal.textContent = '0%';
      } else {
        fragilityPill.classList.add('hidden');
      }
    }

    // Contextual sound reactions for campaign levels
    if (level.id === 2) {
      audio.triggerMemeSound('hexagon_challenge');
    } else if (level.id === 3) {
      audio.triggerMemeSound('mosaic_color_reaction');
    } else if (level.id === 4) {
      audio.triggerMemeSound('cafe_timer_warning');
    }

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
    if (this.hazeFill) this.hazeFill.style.width = '0%';
    if (this.hazePercent) this.hazePercent.textContent = '0%';
    if (this.hudPhaseHint) this.hudPhaseHint.textContent = 'Phase 1: Fill joints with trowel';
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

  onProgress(metrics, combo) {
    const groutPct = typeof metrics === 'object' ? metrics.groutCoverage : Math.min(Math.round(metrics), 100);
    const hazePct = typeof metrics === 'object' ? metrics.hazeCleaning : 0;
    const statusText = typeof metrics === 'object' ? metrics.statusText : '';

    this.progressFill.style.width = `${groutPct}%`;
    this.progressPercent.textContent = `${groutPct}%`;

    if (this.hazeFill) this.hazeFill.style.width = `${hazePct}%`;
    if (this.hazePercent) this.hazePercent.textContent = `${hazePct}%`;
    if (this.hudPhaseHint && statusText) this.hudPhaseHint.textContent = statusText;

    const streakValEl = this.comboPill.querySelector('.streak-val');
    if (streakValEl) {
      streakValEl.textContent = `${Math.min(combo, 10)}x`;
    }
  }

  onComplete(level, metrics) {
    // Unlock next level in sequential campaign progression
    this.unlockLevel(level.id + 1);

    if (level.id === 5 || level.isBossLevel) {
      const campaignCompleteModal = document.getElementById('campaignCompleteModal');
      if (campaignCompleteModal) {
        campaignCompleteModal.classList.add('active');
      }
      audio.triggerMemeSound('restoration_victory');
      return;
    }

    const victoryModal = document.getElementById('victoryModal');
    const verdictEl = document.getElementById('victoryVerdict');
    const victoryLevelTitle = document.getElementById('victoryLevelTitle');
    const groutPill = document.getElementById('victoryGroutPill');
    const cleanPill = document.getElementById('victoryCleanPill');

    if (victoryLevelTitle) {
      victoryLevelTitle.textContent = `${level.name} Approved`;
    }

    if (groutPill && metrics && typeof metrics === 'object') {
      groutPill.textContent = `Joint Grout: ${metrics.groutCoverage}%`;
    }
    if (cleanPill && metrics && typeof metrics === 'object') {
      cleanPill.textContent = `Haze Buffed: ${metrics.hazeCleaning}%`;
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

    const spongeBtn = document.getElementById('spongeToolBtn') || document.getElementById('toolSponge');
    if (spongeBtn) {
      spongeBtn.addEventListener('click', (e) => {
        document.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.engine.setTool('sponge');
      });
    }

    // Reset current level
    document.getElementById('btnResetLevel').addEventListener('click', () => {
      audio.triggerMemeSound('paisa_barbaad');
      this.loadLevel(this.currentLevelIndex);
      this.showToast('Joint cleared. Ready for fresh paste.');
    });

    // Retry Level button (Failure Modal)
    const btnRetry = document.getElementById('btnRetryLevel');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        const failureModal = document.getElementById('failureModal');
        if (failureModal) failureModal.classList.remove('active');
        this.loadLevel(this.currentLevelIndex);
        this.showToast('Level restarted. Make Mistri proud!');
      });
    }

    // Next Level button (Victory Modal)
    document.getElementById('btnNextLevel').addEventListener('click', () => {
      document.getElementById('victoryModal').classList.remove('active');
      adManager.showLevelTransitionAd(() => {
        const nextIdx = (this.currentLevelIndex + 1) % LEVELS.length;
        this.loadLevel(nextIdx);
      });
    });

    // Opening voice banner dismiss / play
    const btnAutoplayDismiss = document.getElementById('btnAutoplayDismiss');
    if (btnAutoplayDismiss) {
      btnAutoplayDismiss.addEventListener('click', () => {
        const promptEl = document.getElementById('autoplayPrompt');
        if (promptEl) promptEl.classList.add('hidden');
        audio.triggerMemeSound('intro_grout_bhar_denge');
      });
    }

    // Grand Campaign Modal Buttons
    const btnOpenGrandDiploma = document.getElementById('btnOpenGrandDiploma');
    if (btnOpenGrandDiploma) {
      btnOpenGrandDiploma.addEventListener('click', () => {
        const campaignModal = document.getElementById('campaignCompleteModal');
        if (campaignModal) campaignModal.classList.remove('active');
        const nameInput = document.getElementById('certNameInput');
        if (nameInput) nameInput.value = 'Master Conservator Babu Mistri';
        openCertificateModal();
      });
    }

    const btnEnterEndlessMode = document.getElementById('btnEnterEndlessMode');
    if (btnEnterEndlessMode) {
      btnEnterEndlessMode.addEventListener('click', () => {
        const campaignModal = document.getElementById('campaignCompleteModal');
        if (campaignModal) campaignModal.classList.remove('active');
        this.loadLevel(5); // Level 6 (index 5: Endless Mode)
        this.showToast('Welcome to Endless Zen ASMR Mode ✨');
      });
    }

    const btnShareCampaignWhatsApp = document.getElementById('btnShareCampaignWhatsApp');
    if (btnShareCampaignWhatsApp) {
      btnShareCampaignWhatsApp.addEventListener('click', () => {
        viralManager.shareWhatsApp('Grand UNESCO Restoration Masterpiece', 100);
      });
    }

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
      audio.refreshVoiceAvailability();
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
