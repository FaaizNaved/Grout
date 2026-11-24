// Web Audio API procedural ASMR engine & Authentic Meme Voice Player for GROUT!

export const VOICE_ASSET_MANIFEST = {
  intro_grout_bhar_denge: {
    id: 'intro_grout_bhar_denge',
    name: '"Isme Grout Bhar Denge!"',
    hindi: '“टेंशन मत लो साब, इसमें ग्राउट भर देंगे!”',
    desc: 'The original Mistri defense anthem (Opening theme)',
    file: 'intro-grout-bhar-denge.mp3',
    category: 'signature',
    installed: false
  },
  laura_phir_agya_tu: {
    id: 'laura_phir_agya_tu',
    name: '"Laura, Phir Aa Gaya Tu!"',
    hindi: '“लौंडे, फिर आ गया तू!”',
    desc: '5x continuous combo streak reaction',
    file: 'laura-phir-agya-tu.mp3',
    category: 'streak',
    installed: false
  },
  hexagon_challenge: {
    id: 'hexagon_challenge',
    name: '"Thekedar: 3-Way Hexagon Joints!"',
    hindi: '“ये 3-वे हेक्सागोन जोड़ में हाथ कांप जाएगा!”',
    desc: 'Level 2 hexagonal bathroom floor challenge',
    file: 'hexagon-challenge.mp3',
    category: 'levels',
    installed: false
  },
  mosaic_color_reaction: {
    id: 'mosaic_color_reaction',
    name: '"Moroccan Color Harmony"',
    hindi: '“रंग गलत मत लगाना, मोरक्कन डिज़ाइन है!”',
    desc: 'Level 3 color selection & matching reaction',
    file: 'mosaic-color-reaction.mp3',
    category: 'levels',
    installed: false
  },
  cafe_timer_warning: {
    id: 'cafe_timer_warning',
    name: '"30-Second Curing Alert"',
    hindi: '“जल्दी कर भाई! 30 सेकंड में ग्राउट पत्थर बन जाएगा!”',
    desc: 'Level 4 speed-run curing countdown warning',
    file: 'cafe-timer-warning.mp3',
    category: 'levels',
    installed: false
  },
  level_complete_mistri_op: {
    id: 'level_complete_mistri_op',
    name: '"Thekedar Shocked, Mistri Rocked!"',
    hindi: '“ठेकेदार शॉक्ड, मिस्त्री रॉक्ड!”',
    desc: 'Level victory celebration fanfare',
    file: 'level-complete-mistri-op.mp3',
    category: 'outcomes',
    installed: false
  },
  level_failure_reaction: {
    id: 'level_failure_reaction',
    name: '"Paisa Barbaad BC!"',
    hindi: '“पैसा बर्बाद हो गया!”',
    desc: 'Level failure (Blowout, Wrong Color, Cured Timeout, Shattered)',
    file: 'level-failure-reaction.mp3',
    category: 'outcomes',
    installed: false
  },
  restoration_victory: {
    id: 'restoration_victory',
    name: '"UNESCO Restoration Grand Finale"',
    hindi: '“2000 साल पुराना रोमन मोज़ेक बचा लिया!”',
    desc: 'Level 5 Boss restoration masterpiece approved',
    file: 'restoration-victory.mp3',
    category: 'outcomes',
    installed: false
  }
};

// Backward-compatible alias for existing tests
export const MEME_CLIPS = VOICE_ASSET_MANIFEST;

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = typeof localStorage !== 'undefined' && localStorage.getItem('grout_muted') === 'true';
    this.lastSquelchTime = 0;
    this.lastScrapeTime = 0;
    this.lastVoicePlayTime = -10000;
    this.currentVoiceAudio = null;
    this.currentVoiceId = null;
    this.onVoiceStateChange = null;

    // Opening voice session tracking
    this.hasPlayedOpeningInSession = false;
    this.openingVoiceBlocked = false;

    // Streak reaction tracking (configurable threshold, default 5x)
    this.streakThreshold = 5;
    this.lastStreakTriggeredCombo = 0;
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('grout_muted', this.muted);
    }
    if (this.muted) {
      this.stopCurrentVoice();
    }
    return this.muted;
  }

  vibrate(pattern = 30) {
    if (this.muted) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fallback
      }
    }
  }

  // -------------------------------------------------------------
  // PROCEDURAL WEB AUDIO SOUND EFFECTS (ASMR Physics)
  // -------------------------------------------------------------

  // Wet squelch ASMR sound when grout paste is extruded/spread
  playSquelch(intensity = 1) {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastSquelchTime < 50) return;
    this.lastSquelchTime = now;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate(22);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 120 + Math.random() * 60;
    const endFreq = 220 + Math.random() * 80;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.08);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.16 * Math.min(intensity, 2), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Metallic scraping sound when trowel blade passes over stone
  playScrape() {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastScrapeTime < 100) return;
    this.lastScrapeTime = now;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate(18);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340 + Math.random() * 90, t);
    osc.frequency.linearRampToValueAtTime(250, t + 0.1);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.setValueAtTime(5, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  // Wet squeak when wiping with sponge
  playSponge() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate([15, 20, 15]);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = 620 + Math.random() * 200;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.6, t + 0.07);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.9, t + 0.14);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Combo / Success chime notes
  playChime(noteIndex = 0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const frequencies = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
    const freq = frequencies[noteIndex % frequencies.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  // Celebratory Level Complete Fanfare
  playFanfare() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate([80, 50, 120, 50, 200]);

    const chords = [
      [261.63, 329.63, 392.00],
      [329.63, 392.00, 523.25],
      [349.23, 440.00, 523.25],
      [392.00, 493.88, 587.33, 783.99]
    ];

    chords.forEach((chord, i) => {
      const t = this.ctx.currentTime + i * 0.14;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        const duration = (i === chords.length - 1) ? 0.8 : 0.18;
        gain.gain.setValueAtTime(0.15 / chord.length, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + duration);
      });
    });
  }

  // Warning/Error tone for Blowout, Color Mismatch, or Fragility disturbance
  playErrorTone() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate([120, 60, 120]);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.22);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  // -------------------------------------------------------------
  // AUTHENTIC RECORDED VOICE ASSET PLAYER (Single Voice Lock)
  // -------------------------------------------------------------

  // Stops currently playing voice audio
  stopCurrentVoice() {
    if (this.currentVoiceAudio) {
      try {
        this.currentVoiceAudio.pause();
        this.currentVoiceAudio.currentTime = 0;
      } catch (e) {}
      this.currentVoiceAudio = null;
    }
    const previousVoiceId = this.currentVoiceId;
    this.currentVoiceId = null;
    if (this.onVoiceStateChange && previousVoiceId) {
      this.onVoiceStateChange(previousVoiceId, false);
    }
  }

  // Backward-compatible alias
  stopCurrentMemeAudio() {
    this.stopCurrentVoice();
  }

  // Plays a recorded meme voice from public/audio/voices/
  playVoiceClip(voiceKey, onStatus, minCooldownMs = 800) {
    if (this.muted) return false;

    const now = performance.now();
    if (now - this.lastVoicePlayTime < minCooldownMs) {
      return false; // Cooldown throttled
    }

    const item = VOICE_ASSET_MANIFEST[voiceKey];
    if (!item) return false;

    this.ensureContext();
    this.stopCurrentVoice();
    this.lastVoicePlayTime = now;

    if (typeof Audio === 'undefined') {
      return false;
    }

    try {
      const audioPath = `/audio/voices/${item.file}`;
      const audio = new Audio();
      audio.volume = 0.90;

      const cleanup = () => {
        if (this.currentVoiceAudio === audio) {
          this.currentVoiceAudio = null;
          this.currentVoiceId = null;
          if (this.onVoiceStateChange) {
            this.onVoiceStateChange(voiceKey, false);
          }
        }
      };

      audio.onplay = () => {
        this.currentVoiceAudio = audio;
        this.currentVoiceId = voiceKey;
        item.installed = true;
        if (this.onVoiceStateChange) {
          this.onVoiceStateChange(voiceKey, true);
        }
        if (onStatus) onStatus('playing', item);
      };

      audio.onended = cleanup;
      audio.onpause = cleanup;

      audio.onerror = () => {
        cleanup();
        item.installed = false;
        console.info(`[GROUT Voice System] Asset awaiting file: public/audio/voices/${item.file}`);
        if (onStatus) onStatus('awaiting_file', item);
      };

      audio.src = audioPath;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          cleanup();
          const isAutoplay = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
          if (onStatus) onStatus(isAutoplay ? 'autoplay_blocked' : 'awaiting_file', item);
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Backward-compatible alias
  playMemeClip(clipId, onStatus, minCooldownMs = 800) {
    return this.playVoiceClip(clipId, onStatus, minCooldownMs);
  }

  // Contextual Soundboard & Gameplay Meme Trigger
  triggerMemeSound(soundType, minCooldownMs = 800) {
    const keyMap = {
      grout_bhar_denge: 'intro_grout_bhar_denge',
      intro_grout_bhar_denge: 'intro_grout_bhar_denge',
      laura_phir_agya_tu: 'laura_phir_agya_tu',
      heavy_driver: 'laura_phir_agya_tu',
      mistri_op: 'level_complete_mistri_op',
      thekedar_shocked: 'level_complete_mistri_op',
      level_complete_mistri_op: 'level_complete_mistri_op',
      level_failure_reaction: 'level_failure_reaction',
      paisa_barbaad: 'level_failure_reaction',
      hexagon_challenge: 'hexagon_challenge',
      mosaic_color_reaction: 'mosaic_color_reaction',
      cafe_timer_warning: 'cafe_timer_warning',
      restoration_victory: 'restoration_victory',
      sukoon_asmr: 'restoration_victory'
    };

    const targetKey = keyMap[soundType] || soundType;
    return this.playVoiceClip(targetKey, null, minCooldownMs);
  }

  // -------------------------------------------------------------
  // OPENING VOICE LOGIC WITH AUTOPLAY FALLBACK PROMPT
  // -------------------------------------------------------------

  attemptOpeningVoice(onAutoplayBlocked, onPlayed) {
    if (this.hasPlayedOpeningInSession || this.muted) {
      return;
    }

    if (typeof Audio === 'undefined') return;

    const item = VOICE_ASSET_MANIFEST.intro_grout_bhar_denge;
    if (!item) return;

    this.ensureContext();
    const audioPath = `/audio/voices/${item.file}`;
    const audio = new Audio();
    audio.volume = 0.90;

    audio.onplay = () => {
      this.currentVoiceAudio = audio;
      this.currentVoiceId = 'intro_grout_bhar_denge';
      this.hasPlayedOpeningInSession = true;
      this.openingVoiceBlocked = false;
      item.installed = true;
      if (this.onVoiceStateChange) {
        this.onVoiceStateChange('intro_grout_bhar_denge', true);
      }
      if (onPlayed) onPlayed();
    };

    audio.onended = () => {
      if (this.currentVoiceAudio === audio) {
        this.currentVoiceAudio = null;
        this.currentVoiceId = null;
        if (this.onVoiceStateChange) {
          this.onVoiceStateChange('intro_grout_bhar_denge', false);
        }
      }
    };

    audio.onerror = () => {
      item.installed = false;
      // File absent: graceful silence without error
    };

    audio.src = audioPath;
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        this.hasPlayedOpeningInSession = true;
        if (onPlayed) onPlayed();
      }).catch((err) => {
        // Autoplay blocked by browser policy
        this.openingVoiceBlocked = true;
        if (onAutoplayBlocked) onAutoplayBlocked();

        // Listen for first user interaction to start opening recording
        const unlock = () => {
          if (!this.hasPlayedOpeningInSession && !this.muted) {
            audio.play().then(() => {
              this.hasPlayedOpeningInSession = true;
              if (onPlayed) onPlayed();
            }).catch(() => {});
          }
          if (typeof window !== 'undefined' && window.removeEventListener) {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
          }
        };
        if (typeof window !== 'undefined' && window.addEventListener) {
          window.addEventListener('pointerdown', unlock, { once: true });
          window.addEventListener('keydown', unlock, { once: true });
        }
      });
    }
  }

  // -------------------------------------------------------------
  // STREAK VOICE LOGIC: "Laura, phir aa gaya tu!" at 5x Threshold
  // -------------------------------------------------------------

  triggerStreakReaction(combo, threshold = 5) {
    // Reset streak trigger when combo drops to 0 (must happen even if muted)
    if (combo === 0) {
      this.lastStreakTriggeredCombo = 0;
      return;
    }

    if (this.muted) return;

    // Play at most once per streak when crossing threshold
    if (combo >= threshold && this.lastStreakTriggeredCombo < threshold) {
      this.lastStreakTriggeredCombo = combo;
      this.playVoiceClip('laura_phir_agya_tu', null, 2000);
    }
  }

  // Check which voice files exist on the server (non-blocking)
  async refreshVoiceAvailability() {
    if (typeof fetch === 'undefined') return;

    for (const [key, item] of Object.entries(VOICE_ASSET_MANIFEST)) {
      try {
        const res = await fetch(`/audio/voices/${item.file}`, { method: 'HEAD' });
        item.installed = res.ok && res.status !== 404;
      } catch (e) {
        item.installed = false;
      }
    }
  }
}

export const audio = new AudioManager();
