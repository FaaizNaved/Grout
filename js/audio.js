// Web Audio API procedural sound engine & Authentic Meme Voice Player for GROUT!

export const MEME_CLIPS = {
  grout_bhar_denge: {
    id: 'grout_bhar_denge',
    name: '"Isme Grout Bhar Denge!"',
    hindi: '“टेंशन मत लो साब, इसमें ग्राउट भर देंगे!”',
    desc: 'The original Mistri defense anthem',
    file: 'meme-grout-bhar-denge.mp3',
    fallbackFile: 'meme-grout-bhar-denge.wav',
    category: 'classics',
    bundled: true
  },
  mistri_op: {
    id: 'mistri_op',
    name: '"Thekedar Shocked, Mistri Rocked!"',
    hindi: '“ठेकेदार शॉक्ड, मिस्त्री रॉक्ड!”',
    desc: 'Victory celebration fanfare',
    file: 'meme-thekedar-shocked.mp3',
    fallbackFile: 'meme-thekedar-shocked.wav',
    category: 'classics',
    bundled: true
  },
  kya_bana_diya: {
    id: 'kya_bana_diya',
    name: '"Bhai Ye Kya Bana Diya?!"',
    hindi: '“भाई ये क्या बना दिया तूने?!”',
    desc: 'Inspector site despair on crooked tiles',
    file: 'meme-kya-bana-diya.mp3',
    fallbackFile: 'meme-kya-bana-diya.wav',
    category: 'classics',
    bundled: true
  },
  sukoon_asmr: {
    id: 'sukoon_asmr',
    name: '"Sukoon Hi Sukoon"',
    hindi: '“बस अब सुकून ही सुकून है!”',
    desc: '100% clean ASMR satisfaction',
    file: 'meme-sukoon-asmr.mp3',
    fallbackFile: 'meme-sukoon-asmr.wav',
    category: 'asmr',
    bundled: true
  },
  heavy_driver: {
    id: 'heavy_driver',
    name: '"Bete Mauj Kardi (Heavy Driver)"',
    hindi: '“अरे बेटाजी मौज कर दी! तुम तो हैवी ड्राइवर निकले!”',
    desc: '12x continuous combo streak praise',
    file: 'meme-heavy-driver.mp3',
    category: 'reactions',
    bundled: false
  },
  paisa_barbaad: {
    id: 'paisa_barbaad',
    name: '"Paisa Barbaad BC!"',
    hindi: '“पैसा बर्बाद हो गया!”',
    desc: 'Level reset / wipe reaction',
    file: 'meme-paisa-barbaad.mp3',
    category: 'reactions',
    bundled: false
  },
  gajab_beizzati: {
    id: 'gajab_beizzati',
    name: '"Gajab Beizzati Hai Yaar"',
    hindi: '“गज़ब बेइज़्ज़ती है यार!”',
    desc: 'Dirty tiles 0% clean warning',
    file: 'meme-gajab-beizzati.mp3',
    category: 'reactions',
    bundled: false
  },
  control_uday: {
    id: 'control_uday',
    name: '"Control Uday Control"',
    hindi: '“कंट्रोल उदय कंट्रोल!”',
    desc: 'Excessive rapid scrubbing warning',
    file: 'meme-control-uday.mp3',
    category: 'reactions',
    bundled: false
  },
  kehna_kya_chahte_ho: {
    id: 'kehna_kya_chahte_ho',
    name: '"Arrey Kehna Kya Chahte Ho?!"',
    hindi: '“अरे कहना क्या चाहते हो?!”',
    desc: 'Complex geometry challenge',
    file: 'meme-kehna-kya-chahte-ho.mp3',
    category: 'reactions',
    bundled: false
  },
  bilkul_riks_nahi: {
    id: 'bilkul_riks_nahi',
    name: '"Bilkul Riks Nahi Lene Ka"',
    hindi: '“अपुन को बिल्कुल रिक्स नहीं लेने का!”',
    desc: 'Final 5% meticulous buffing',
    file: 'meme-bilkul-riks-nahi.mp3',
    category: 'reactions',
    bundled: false
  }
};

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = typeof localStorage !== 'undefined' && localStorage.getItem('grout_muted') === 'true';
    this.lastSquelchTime = 0;
    this.lastScrapeTime = 0;
    this.lastMemePlayTime = -10000;
    this.currentMemeAudio = null;
    this.onMemeStateChange = null;
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
      this.stopCurrentMemeAudio();
    }
    return this.muted;
  }

  vibrate(ms = 30) {
    if (this.muted) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {
        // Safe fallback
      }
    }
  }

  // Realistic wet squelchy ASMR sound when grout paste is extruded/spread
  playSquelch(intensity = 1) {
    if (this.muted) return;
    const now = performance.now();
    if (now - this.lastSquelchTime < 50) return;
    this.lastSquelchTime = now;
    this.ensureContext();
    if (!this.ctx) return;

    this.vibrate(12);

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = 85 + Math.random() * 75;
    osc.frequency.setValueAtTime(baseFreq * 2.3, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, t + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650 + Math.random() * 350, t);
    filter.Q.setValueAtTime(4 + Math.random() * 3, t);

    // Wet bubble noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.14 * intensity, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    gain.gain.setValueAtTime(0.18 * intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
    noise.start(t);
  }

  // Metallic trowel scraping against tile surface
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

  // Stop currently playing meme voice clip
  stopCurrentMemeAudio() {
    if (this.currentMemeAudio) {
      try {
        this.currentMemeAudio.pause();
        this.currentMemeAudio.currentTime = 0;
      } catch (e) {}
      this.currentMemeAudio = null;
    }
    if (this.onMemeStateChange) {
      this.onMemeStateChange(null, false);
    }
  }

  // Real meme recorded audio clip playback
  playMemeClip(clipId, onStatus, minCooldownMs = 800) {
    if (this.muted) return false;

    const now = performance.now();
    if (now - this.lastMemePlayTime < minCooldownMs) {
      return false; // Throttled to prevent spam
    }

    const clip = MEME_CLIPS[clipId];
    if (!clip) return false;

    this.ensureContext();
    this.stopCurrentMemeAudio();
    this.lastMemePlayTime = now;

    if (typeof Audio === 'undefined') {
      return false;
    }

    try {
      const audioPath = `/audio/memes/${clip.file}`;
      const audio = new Audio();
      audio.volume = 0.85;

      const cleanup = () => {
        if (this.currentMemeAudio === audio) {
          this.currentMemeAudio = null;
          if (this.onMemeStateChange) {
            this.onMemeStateChange(clipId, false);
          }
        }
      };

      audio.onplay = () => {
        this.currentMemeAudio = audio;
        if (this.onMemeStateChange) {
          this.onMemeStateChange(clipId, true);
        }
        if (onStatus) onStatus('playing', clip);
      };

      audio.onended = cleanup;
      audio.onpause = cleanup;

      audio.onerror = () => {
        if (clip.fallbackFile && audio.src && audio.src.endsWith(clip.file)) {
          audio.src = `/audio/memes/${clip.fallbackFile}`;
          audio.play().catch(() => cleanup());
          return;
        }
        cleanup();
        console.info(`[GROUT Audio] Asset slot ready for '${clipId}'. Place audio in public/audio/memes/${clip.file}`);
        if (onStatus) onStatus('missing', clip);
      };

      audio.src = audioPath;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          cleanup();
          if (onStatus) onStatus('blocked_or_missing', clip);
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Contextual soundboard & gameplay meme triggers
  triggerMemeSound(memeType, minCooldownMs = 800) {
    if (this.muted) return false;
    this.ensureContext();

    const keyMap = {
      grout_bhar_denge: 'grout_bhar_denge',
      mistri_op: 'mistri_op',
      thekedar_shocked: 'mistri_op',
      kya_karega: 'kya_bana_diya',
      kya_bana_diya: 'kya_bana_diya',
      sukoon_asmr: 'sukoon_asmr',
      satisfying_pop: 'sukoon_asmr',
      heavy_driver: 'heavy_driver',
      paisa_barbaad: 'paisa_barbaad',
      gajab_beizzati: 'gajab_beizzati',
      control_uday: 'control_uday',
      kehna_kya_chahte_ho: 'kehna_kya_chahte_ho',
      bilkul_riks_nahi: 'bilkul_riks_nahi'
    };

    const targetClip = keyMap[memeType] || 'grout_bhar_denge';
    const played = this.playMemeClip(targetClip, null, minCooldownMs);
    if (!played) return false;

    // Procedural sound reinforcement
    if (memeType === 'mistri_op' || memeType === 'thekedar_shocked') {
      this.playFanfare();
    } else if (memeType === 'grout_bhar_denge') {
      this.playSquelch(1.5);
    } else if (memeType === 'satisfying_pop' || memeType === 'sukoon_asmr') {
      this.playChime(5);
    }

    return true;
  }
}

export const audio = new AudioManager();
