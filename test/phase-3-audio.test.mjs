// Phase 3 Test Suite: Authentic Indian Meme Culture, Real Audio & Zero AI Voices
// Verifies compliance with Part 1, Part 2, Part 3, and Part 4 requirements.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Phase 3 Audio & Meme Culture Test Suite...\n');

// -------------------------------------------------------------
// Test 1: Complete Purge of Browser AI Speech Synthesis
// -------------------------------------------------------------
console.log('Test 1: Assert complete removal of speech synthesis and TTS APIs');
const filesToCheck = [
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'js', 'audio.js'),
  path.join(rootDir, 'js', 'viral.js'),
  path.join(rootDir, 'js', 'engine.js'),
  path.join(rootDir, 'js', 'main.js'),
  path.join(rootDir, 'js', 'levels.js'),
];

for (const filePath of filesToCheck) {
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(
    !content.includes('speechSynthesis'),
    `Violation: Found 'speechSynthesis' in ${path.relative(rootDir, filePath)}`
  );
  assert.ok(
    !content.includes('SpeechSynthesisUtterance'),
    `Violation: Found 'SpeechSynthesisUtterance' in ${path.relative(rootDir, filePath)}`
  );
  assert.ok(
    !content.includes('initSpeech'),
    `Violation: Found 'initSpeech' in ${path.relative(rootDir, filePath)}`
  );
  assert.ok(
    !content.includes('playMemeVoice'),
    `Violation: Found 'playMemeVoice' in ${path.relative(rootDir, filePath)}`
  );
}
console.log('  ✓ Zero occurrences of browser speech synthesis or dynamically generated voices found.\n');

// -------------------------------------------------------------
// Test 2: Audio Asset Directory & Bundled Files Verification
// -------------------------------------------------------------
console.log('Test 2: Verify authentic bundled meme audio files in public/audio/memes/');
const memesDir = path.join(rootDir, 'public', 'audio', 'memes');
assert.ok(fs.existsSync(memesDir), 'public/audio/memes directory must exist');

const expectedBundledFiles = [
  'meme-grout-bhar-denge.mp3',
  'meme-grout-bhar-denge.wav',
  'meme-thekedar-shocked.mp3',
  'meme-thekedar-shocked.wav',
  'meme-kya-bana-diya.mp3',
  'meme-kya-bana-diya.wav',
  'meme-sukoon-asmr.mp3',
  'meme-sukoon-asmr.wav'
];

for (const file of expectedBundledFiles) {
  const fullPath = path.join(memesDir, file);
  assert.ok(fs.existsSync(fullPath), `Bundled audio file missing: ${file}`);
  const stat = fs.statSync(fullPath);
  assert.ok(stat.size > 1000, `Audio file ${file} is unexpectedly small: ${stat.size} bytes`);
}
console.log(`  ✓ All ${expectedBundledFiles.length} bundled authentic audio files exist with valid sizes.\n`);

// -------------------------------------------------------------
// Test 3: MEME_ASSET_SOURCES.md Documentation Integrity
// -------------------------------------------------------------
console.log('Test 3: Verify MEME_ASSET_SOURCES.md documentation coverage');
const docPath = path.join(rootDir, 'MEME_ASSET_SOURCES.md');
assert.ok(fs.existsSync(docPath), 'MEME_ASSET_SOURCES.md must exist');
const docContent = fs.readFileSync(docPath, 'utf-8');

const expectedReferences = [
  'grout_bhar_denge',
  'thekedar_shocked',
  'kya_bana_diya',
  'sukoon_asmr',
  'heavy_driver',
  'paisa_barbaad',
  'gajab_beizzati',
  'control_uday',
  'kehna_kya_chahte_ho',
  'bilkul_riks_nahi'
];

for (const ref of expectedReferences) {
  assert.ok(
    docContent.includes(ref),
    `MEME_ASSET_SOURCES.md must document reference ID: ${ref}`
  );
}
console.log(`  ✓ All ${expectedReferences.length} curated Indian meme references are fully documented with source context.\n`);

// -------------------------------------------------------------
// Mock Browser Environment for AudioManager Testing
// -------------------------------------------------------------
class MockAudioElement {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
    this.isMock = true;
    this.ended = false;
    this.onended = null;
    this.onerror = null;
    this.onplay = null;
  }

  play() {
    this.paused = false;
    if (this.onplay) this.onplay();
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  simulateEnd() {
    this.ended = true;
    this.paused = true;
    if (this.onended) this.onended();
  }

  simulateError(err) {
    if (this.onerror) this.onerror(err);
  }
}

globalThis.window = {
  location: { href: 'https://grout.game/' },
  AudioContext: class {
    constructor() { this.state = 'running'; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createBiquadFilter() { return { connect() {}, frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} } }; }
    createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
    createBuffer() { return { getChannelData() { return new Float32Array(100); } }; }
    resume() { return Promise.resolve(); }
  }
};
globalThis.Audio = MockAudioElement;
globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] || null; },
  setItem(key, val) { this._data[key] = String(val); }
};

const { audio, MEME_CLIPS } = await import('../js/audio.js');

// -------------------------------------------------------------
// Test 4: MEME_CLIPS Registry Verification
// -------------------------------------------------------------
console.log('Test 4: Verify MEME_CLIPS metadata and asset configuration');
for (const [key, clip] of Object.entries(MEME_CLIPS)) {
  assert.equal(clip.id, key);
  assert.ok(clip.name, `Clip ${key} must have a name`);
  assert.ok(clip.desc, `Clip ${key} must have a description`);
  assert.ok(clip.file, `Clip ${key} must have an audio file mapped`);
  assert.ok(typeof clip.bundled === 'boolean', `Clip ${key} must explicitly declare bundled status`);
}
console.log(`  ✓ MEME_CLIPS properly configures ${Object.keys(MEME_CLIPS).length} audio clips.\n`);

// -------------------------------------------------------------
// Test 5: Single-Voice Concurrency Lock & Stop Previous Clip
// -------------------------------------------------------------
console.log('Test 5: Verify single-voice concurrency lock');
audio.muted = false;
audio.lastMemePlayTime = -10000;

let stateChanges = [];
audio.onMemeStateChange = (clipId, isPlaying) => {
  stateChanges.push({ clipId, isPlaying });
};

// Play clip 1
const result1 = audio.triggerMemeSound('grout_bhar_denge');
assert.equal(result1, true, 'Trigger meme sound should return true');
assert.ok(audio.currentMemeAudio, 'Current meme audio should be active');
const audio1 = audio.currentMemeAudio;
assert.equal(audio1.paused, false, 'Audio 1 should be playing');

// Reset throttle timer to simulate subsequent interaction
audio.lastMemePlayTime = -10000;

// Trigger clip 2 -> Audio 1 must be paused/stopped
const result2 = audio.playMemeClip('mistri_op');
assert.equal(result2, true, 'Play meme clip should return true');
const audio2 = audio.currentMemeAudio;
assert.equal(audio1.paused, true, 'Audio 1 must be stopped when Audio 2 starts');
assert.equal(audio2.paused, false, 'Audio 2 must be currently playing');
assert.equal(audio.currentMemeAudio, audio2, 'Current meme audio must now be Audio 2');

// Stop audio
audio.stopCurrentMemeAudio();
assert.equal(audio.currentMemeAudio, null, 'Current meme audio must be cleared');
assert.equal(audio2.paused, true, 'Audio 2 must be paused after stopCurrentMemeAudio');
console.log('  ✓ Single-voice concurrency lock verified: Starting a clip terminates the previous clip.\n');

// -------------------------------------------------------------
// Test 6: Mute Compliance
// -------------------------------------------------------------
console.log('Test 6: Verify mute compliance');
audio.toggleMute();
assert.equal(audio.muted, true, 'Audio must be muted');

const mutedResult = audio.triggerMemeSound('grout_bhar_denge');
assert.equal(mutedResult, false, 'Playing meme sound while muted must return false');
assert.equal(audio.currentMemeAudio, null, 'No audio should be playing when muted');

// Unmute
audio.toggleMute();
assert.equal(audio.muted, false, 'Audio must be unmuted');
console.log('  ✓ Mute compliance verified.\n');

// -------------------------------------------------------------
// Test 7: Cooldown / Throttling Enforcement
// -------------------------------------------------------------
console.log('Test 7: Verify cooldown throttling to prevent sound spam');
audio.lastMemePlayTime = -10000;
// First call
const firstPlay = audio.triggerMemeSound('grout_bhar_denge', 5000);
assert.equal(firstPlay, true, 'First trigger should succeed');

// Immediate second call with 5s cooldown should be throttled
const immediateSpam = audio.triggerMemeSound('grout_bhar_denge', 5000);
assert.equal(immediateSpam, false, 'Immediate spam trigger within 5s cooldown must be throttled (returns false)');

// Stop clip
audio.stopCurrentMemeAudio();
console.log('  ✓ Cooldown throttling verified: Rapid repetitive triggers are blocked.\n');

// -------------------------------------------------------------
// Test 8: Procedural Web Audio SFX Independence
// -------------------------------------------------------------
console.log('Test 8: Verify procedural Web Audio SFX operation');
assert.doesNotThrow(() => audio.playSquelch(1.5));
assert.doesNotThrow(() => audio.playScrape());
assert.doesNotThrow(() => audio.playSponge());
assert.doesNotThrow(() => audio.playChime(3));
assert.doesNotThrow(() => audio.playFanfare());
console.log('  ✓ Procedural Web Audio SFX operate cleanly and independently of meme audio clips.\n');

console.log('====================================================');
console.log('🎉 ALL PHASE 3 AUDIO & MEME TESTS PASSED SUCCESSFULLY');
console.log('====================================================\n');
