// Test suite for GROUT Authentic Voice System & Streak Reactions
// Verifies zero AI/TTS voices, public/audio/voices/ asset directory, opening voice autoplay fallback, and streak triggers.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🧪 Starting Authentic Voice System Test Suite...\n');

// -------------------------------------------------------------
// TEST 1: Absolute Purge of Browser AI Speech Synthesis
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
console.log('  ✓ Zero occurrences of browser speech synthesis or dynamic AI voices found across all source files.\n');

// -------------------------------------------------------------
// TEST 2: Dedicated Voice Asset Folder & User Recording README
// -------------------------------------------------------------
console.log('Test 2: Verify public/audio/voices/ and README.md');
const voicesDir = path.join(rootDir, 'public', 'audio', 'voices');
assert.ok(fs.existsSync(voicesDir), 'public/audio/voices directory must exist');

const readmePath = path.join(voicesDir, 'README.md');
assert.ok(fs.existsSync(readmePath), 'public/audio/voices/README.md must exist');

const readmeContent = fs.readFileSync(readmePath, 'utf-8');
const expectedVoiceFiles = [
  'intro-grout-bhar-denge.mp3',
  'laura-phir-agya-tu.mp3',
  'hexagon-challenge.mp3',
  'mosaic-color-reaction.mp3',
  'cafe-timer-warning.mp3',
  'level-complete-mistri-op.mp3',
  'level-failure-reaction.mp3',
  'restoration-victory.mp3'
];

for (const file of expectedVoiceFiles) {
  assert.ok(
    readmeContent.includes(file),
    `README.md must document exact filename: ${file}`
  );
}
console.log(`  ✓ All ${expectedVoiceFiles.length} voice filenames documented with clear instructions in README.md.\n`);

// -------------------------------------------------------------
// TEST 3: Manifest Verification & 4 Clean Categories
// -------------------------------------------------------------
console.log('Test 3: Verify VOICE_ASSET_MANIFEST in js/audio.js');

// Mock browser Audio environment
class MockAudio {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
    this.paused = true;
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
}

globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
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
globalThis.Audio = MockAudio;
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

const { audio, VOICE_ASSET_MANIFEST } = await import('../js/audio.js');

const manifestKeys = Object.keys(VOICE_ASSET_MANIFEST);
assert.equal(manifestKeys.length, 8, 'VOICE_ASSET_MANIFEST must contain all 8 voice assets');

const categories = new Set(Object.values(VOICE_ASSET_MANIFEST).map(v => v.category));
assert.ok(categories.has('signature'), 'Must have signature category');
assert.ok(categories.has('streak'), 'Must have streak category');
assert.ok(categories.has('levels'), 'Must have levels category');
assert.ok(categories.has('outcomes'), 'Must have outcomes category');

console.log('  ✓ Manifest correctly structured with 8 voice recordings across 4 categories.\n');

// -------------------------------------------------------------
// TEST 4: Opening Voice Autoplay Fallback Prompt Logic
// -------------------------------------------------------------
console.log('Test 4: Verify opening voice attempt and autoplay blocked fallback');

// Test successful opening voice attempt
let blockedReported = false;
let playedReported = false;
audio.hasPlayedOpeningInSession = false;

audio.attemptOpeningVoice(
  () => { blockedReported = true; },
  () => { playedReported = true; }
);

assert.equal(playedReported, true, 'Opening voice triggers played callback when autoplay succeeds');
assert.equal(audio.hasPlayedOpeningInSession, true, 'hasPlayedOpeningInSession must be true to prevent duplicate plays');

// Calling again in same session should do nothing
let secondPlayed = false;
audio.attemptOpeningVoice(null, () => { secondPlayed = true; });
assert.equal(secondPlayed, false, 'Opening voice must play at most once per session');

// Test blocked autoplay simulation
audio.hasPlayedOpeningInSession = false;
const originalAudio = globalThis.Audio;
globalThis.Audio = class BlockedAudio extends MockAudio {
  play() {
    const err = new Error('Autoplay blocked');
    err.name = 'NotAllowedError';
    return Promise.reject(err);
  }
};

let blockedTriggered = false;
audio.attemptOpeningVoice(() => { blockedTriggered = true; });

// Wait a tick for microtask
await new Promise(r => setTimeout(r, 10));
assert.equal(blockedTriggered, true, 'NotAllowedError must trigger onAutoplayBlocked callback to show banner');

globalThis.Audio = originalAudio;
console.log('  ✓ Opening voice plays at most once per session and notifies fallback prompt when blocked.\n');

// -------------------------------------------------------------
// TEST 5: Streak Reaction at 5x Threshold ("Laura, Phir Aa Gaya Tu!")
// -------------------------------------------------------------
console.log('Test 5: Verify 5x combo streak reaction triggers exactly once per streak');

let voiceTriggered = null;
const origPlayVoiceClip = audio.playVoiceClip.bind(audio);
audio.playVoiceClip = (key) => {
  voiceTriggered = key;
  return true;
};

// Combo 1 to 4: should NOT trigger streak voice
audio.triggerStreakReaction(1, 5);
assert.equal(voiceTriggered, null, 'Combo 1 should not trigger streak reaction');
audio.triggerStreakReaction(4, 5);
assert.equal(voiceTriggered, null, 'Combo 4 should not trigger streak reaction');

// Combo 5: MUST trigger laura_phir_agya_tu
audio.triggerStreakReaction(5, 5);
assert.equal(voiceTriggered, 'laura_phir_agya_tu', 'Reaching 5x threshold must trigger laura_phir_agya_tu');

// Combo 6, 7, 8 in same streak: must NOT trigger again
voiceTriggered = null;
audio.triggerStreakReaction(6, 5);
assert.equal(voiceTriggered, null, 'Combo 6 in same streak must not re-trigger');
audio.triggerStreakReaction(8, 5);
assert.equal(voiceTriggered, null, 'Combo 8 in same streak must not re-trigger');

// Reset combo to 0 (streak broken)
audio.triggerStreakReaction(0, 5);
assert.equal(audio.lastStreakTriggeredCombo, 0, 'Streak reset must clear streak tracker');

// New streak reaches 5: MUST trigger again
audio.triggerStreakReaction(5, 5);
assert.equal(voiceTriggered, 'laura_phir_agya_tu', 'New streak reaching 5x threshold must trigger again');

audio.playVoiceClip = origPlayVoiceClip;
console.log('  ✓ Streak voice triggers at 5x threshold, at most once per streak, and resets on combo 0.\n');

// -------------------------------------------------------------
// TEST 6: Missing File Resilience (Graceful Handling)
// -------------------------------------------------------------
console.log('Test 6: Verify missing audio file graceful degradation');

globalThis.Audio = class ErroredAudio extends MockAudio {
  play() {
    if (this.onerror) this.onerror(new Error('404 Not Found'));
    return Promise.reject(new Error('404 Not Found'));
  }
};

let statusReported = null;
const played = audio.playVoiceClip('laura_phir_agya_tu', (st) => {
  statusReported = st;
}, 0);

assert.equal(played, true, 'Method returns true indicating attempt was made');
// Wait for error event
await new Promise(r => setTimeout(r, 10));
assert.equal(VOICE_ASSET_MANIFEST.laura_phir_agya_tu.installed, false, 'Missing file leaves installed as false');
console.log('  ✓ Missing files handled cleanly without throwing or crashing.\n');

globalThis.Audio = originalAudio;
console.log('🎉 All Authentic Voice System Tests Passed Successfully!\n');
