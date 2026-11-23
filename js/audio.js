// Web Audio API procedural sound engine & Meme voice soundboard for GROUT!

class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('grout_muted') === 'true';
    this.lastSquelchTime = 0;
    this.lastScrapeTime = 0;
    this.speechSynth = window.speechSynthesis;
    this.speechVoice = null;
    this.initSpeech();
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('grout_muted', this.muted);
    return this.muted;
  }

  initSpeech() {
    if (!this.speechSynth) return;
    const findVoice = () => {
      const voices = this.speechSynth.getVoices();
      this.speechVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) ||
                         voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.includes('en-US')) ||
                         voices[0];
    };
    findVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  vibrate(ms = 30) {
    if (this.muted) return;
    if (navigator.vibrate) {
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

  // Voice speech synthesis
  playMemeVoice(text, rate = 1.05, pitch = 1.1) {
    if (this.muted) return;
    if (!this.speechSynth) return;

    try {
      this.speechSynth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.speechVoice) {
        utterance.voice = this.speechVoice;
      }
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;
      this.speechSynth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  // Viral soundboard triggers
  triggerMemeSound(memeType) {
    this.ensureContext();
    switch (memeType) {
      case 'grout_bhar_denge':
        this.playMemeVoice("Tension mat lo saab, isme grout bhar denge!", 1.0, 1.15);
        this.playSquelch(1.5);
        break;
      case 'mistri_op':
        this.playMemeVoice("Thekedar shocked, mistri rocked! Grout OP!", 1.1, 1.2);
        this.playFanfare();
        break;
      case 'kya_karega':
        this.playMemeVoice("Bhai ye kya bana diya tune?! Arrey isme grout daal de!", 1.05, 0.95);
        break;
      case 'satisfying_pop':
        this.playChime(4);
        this.playSponge();
        break;
      case 'dil_toot_gaya':
        this.playMemeVoice("Breakup ho gaya? Koi tension nahi, dil me grout bhar denge!", 1.05, 1.1);
        break;
      case 'titanic_meme':
        this.playMemeVoice("Captain saab, iceberg ke gap me 5 bori grout bhar denge!", 1.05, 1.1);
        break;
      case 'corporate_excel':
        this.playMemeVoice("Deadline miss ho gayi? Excel sheet ke cells me grout bhar denge!", 1.05, 1.15);
        break;
      case 'marksheet_pass':
        this.playMemeVoice("Physics me zero aaya tha, ab A plus topper ban gaye!", 1.1, 1.2);
        this.playFanfare();
        break;
      default:
        this.playMemeVoice("Isme grout bhar denge!");
        break;
    }
  }
}

export const audio = new AudioManager();
