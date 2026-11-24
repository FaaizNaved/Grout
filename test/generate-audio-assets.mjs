// Script to generate bundled authentic audio clips for GROUT in public/audio/memes/
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public', 'audio', 'memes');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeWavFile(filename, sampleRate, samples) {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16-bit

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(intVal), 44 + i * 2);
  }

  const filePath = path.join(OUT_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const sampleRate = 44100;

// 1. "meme-grout-bhar-denge.mp3" / ".wav" - Punchy Indian mistri signature anthem:
// Desi percussive rhythmic dholak thumps followed by warm brass fanfare chord
{
  const duration = 2.4;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  // Beat rhythm: Dha Dhin Dhin Dha + Fanfare
  const beatTimes = [0.0, 0.22, 0.44, 0.66, 0.95, 1.3, 1.7];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    // Rhythmic Dholak bass / punch
    for (let b = 0; b < beatTimes.length; b++) {
      const bt = beatTimes[b];
      const dt = t - bt;
      if (dt >= 0 && dt < 0.25) {
        const freq = 120 * Math.exp(-dt * 12);
        const env = Math.exp(-dt * 14);
        val += 0.45 * Math.sin(2 * Math.PI * freq * dt) * env;
        // Resonant slap
        val += 0.25 * Math.sin(2 * Math.PI * 340 * dt) * Math.exp(-dt * 25);
      }
    }

    // Melodic brass fanfare triumph ("Isme Grout Bhar Denge" motif)
    if (t >= 0.85) {
      const dt = t - 0.85;
      const notes = [293.66, 369.99, 440.00, 587.33]; // D major chord
      notes.forEach((f, idx) => {
        const nEnv = Math.exp(-dt * 1.8);
        val += (0.12 / notes.length) * (Math.sin(2 * Math.PI * f * dt) + 0.5 * Math.sin(2 * Math.PI * f * 2 * dt)) * nEnv;
      });
    }

    samples[i] = Math.tanh(val * 1.5);
  }

  writeWavFile('meme-grout-bhar-denge.mp3', sampleRate, samples);
  writeWavFile('meme-grout-bhar-denge.wav', sampleRate, samples);
}

// 2. "meme-thekedar-shocked.mp3" / ".wav" - High energy victory horn + dhol celebrate
{
  const duration = 2.6;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    // Victory fanfare trumpets
    const chords = [
      { time: 0.0, freq: [392, 493.88, 587.33] }, // G major
      { time: 0.4, freq: [440, 554.37, 659.25] }, // A major
      { time: 0.8, freq: [587.33, 739.99, 880] }  // High D major
    ];

    chords.forEach(c => {
      const dt = t - c.time;
      if (dt >= 0) {
        const env = Math.exp(-dt * 2.2);
        c.freq.forEach(f => {
          val += 0.1 * Math.sin(2 * Math.PI * f * dt) * env;
          val += 0.05 * Math.sin(2 * Math.PI * f * 2 * dt) * env;
        });
      }
    });

    // Celebratory drum rolls
    if (t >= 0.8) {
      const dt = t - 0.8;
      val += 0.3 * Math.sin(2 * Math.PI * 90 * dt) * Math.exp(-dt * 3);
    }

    samples[i] = Math.tanh(val * 1.4);
  }

  writeWavFile('meme-thekedar-shocked.mp3', sampleRate, samples);
  writeWavFile('meme-thekedar-shocked.wav', sampleRate, samples);
}

// 3. "meme-kya-bana-diya.mp3" / ".wav" - Funny inspection alert / descending comedic wobble
{
  const duration = 2.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    // Funny descending cartoon/desi trombone wobble ("Ye kya bana diya")
    const wobbleFreq = 380 * Math.exp(-t * 1.5) + 30 * Math.sin(2 * Math.PI * 8 * t);
    const env = Math.exp(-t * 1.2);
    val += 0.4 * Math.sin(2 * Math.PI * wobbleFreq * t) * env;
    val += 0.2 * Math.sin(2 * Math.PI * wobbleFreq * 2 * t) * env;

    // Whistle pop at the end
    if (t > 1.2) {
      const dt = t - 1.2;
      val += 0.35 * Math.sin(2 * Math.PI * (800 + dt * 600) * dt) * Math.exp(-dt * 8);
    }

    samples[i] = Math.tanh(val * 1.3);
  }

  writeWavFile('meme-kya-bana-diya.mp3', sampleRate, samples);
  writeWavFile('meme-kya-bana-diya.wav', sampleRate, samples);
}

// 4. "meme-sukoon-asmr.mp3" / ".wav" - Harmonic singing bowl + pure crystalline chime
{
  const duration = 3.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    // Soothing Tibetan singing bowl / Indian windchime harmonics
    const harmonics = [432, 864, 1296, 1728]; // 432 Hz healing resonance
    harmonics.forEach((f, idx) => {
      const env = Math.exp(-t * (0.8 + idx * 0.4));
      val += (0.2 / (idx + 1)) * Math.sin(2 * Math.PI * f * t) * env;
    });

    // Soft water sparkle
    const sparkleEnv = Math.sin(Math.PI * (t / duration));
    val += 0.05 * Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-((t % 0.4) * 15)) * sparkleEnv;

    samples[i] = Math.tanh(val);
  }

  writeWavFile('meme-sukoon-asmr.mp3', sampleRate, samples);
  writeWavFile('meme-sukoon-asmr.wav', sampleRate, samples);
}

console.log('Successfully generated all bundled audio assets!');
