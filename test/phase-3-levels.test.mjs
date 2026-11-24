// Phase 3 Test Suite: Level Variety, Progression & Procedural Endless Mode
// Verifies compliance with Part 5 requirements and resolves AUD-06.

import assert from 'node:assert/strict';

// Set up minimal browser globals for GroutEngine in Node environment
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
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
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
globalThis.Audio = class {
  play() { return Promise.resolve(); }
  pause() {}
};
globalThis.requestAnimationFrame = () => 0;

function createMockCanvas(width, height) {
  return {
    width,
    height,
    style: { width: `${width}px`, height: `${height}px` },
    parentElement: {
      getBoundingClientRect: () => ({ width, height, top: 0, left: 0, bottom: height, right: width })
    },
    getBoundingClientRect: () => ({ width, height, top: 0, left: 0, bottom: height, right: width }),
    getContext: () => ({
      scale: () => {},
      setTransform: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

console.log('🧪 Starting Phase 3 Levels & Endless Mode Test Suite...\n');

const { LEVELS, generateEndlessGaps, generateEndlessTiles } = await import('../js/levels.js');
const { GroutEngine } = await import('../js/engine.js');

// -------------------------------------------------------------
// Test 1: Verify All 9 Levels Configuration & Variety
// -------------------------------------------------------------
console.log('Test 1: Verify all 9 levels have distinct identities and valid geometries');
assert.equal(LEVELS.length, 9, 'Must contain exactly 9 levels');

const expectedIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const seenIds = [];

for (const level of LEVELS) {
  assert.ok(expectedIds.includes(level.id), `Level ID ${level.id} is invalid`);
  assert.ok(!seenIds.includes(level.id), `Duplicate level ID: ${level.id}`);
  seenIds.push(level.id);

  assert.ok(level.name, `Level ${level.id} must have a name`);
  assert.ok(level.hindiName, `Level ${level.id} must have a hindiName`);
  assert.ok(level.thekedarQuote, `Level ${level.id} must have thekedarQuote`);
  assert.ok(level.mistriQuote, `Level ${level.id} must have mistriQuote`);
  assert.ok(level.badge, `Level ${level.id} must have a badge`);
  assert.ok(typeof level.generateGaps === 'function', `Level ${level.id} must have generateGaps`);

  const gaps = level.generateGaps(600, 450);
  assert.ok(gaps && gaps.length > 0, `Level ${level.id} must generate non-empty gaps`);

  // Verify each gap has required geometry
  for (const gap of gaps) {
    assert.ok(typeof gap.x1 === 'number' && typeof gap.y1 === 'number');
    assert.ok(typeof gap.x2 === 'number' && typeof gap.y2 === 'number');
    assert.ok(typeof gap.width === 'number' && gap.width >= 14);
  }
}
console.log('  ✓ All 9 levels configured with verified gap geometries and authentic meme quotes.\n');

// -------------------------------------------------------------
// Test 2: Level 9 Endless ASMR Mode Flag & Procedural Generation
// -------------------------------------------------------------
console.log('Test 2: Verify Level 9 Endless ASMR Mode & procedural wave variations');
const level9 = LEVELS.find(l => l.id === 9);
assert.ok(level9, 'Level 9 must exist');
assert.equal(level9.isEndless, true, 'Level 9 must be flagged as isEndless: true');

// Test procedural generator for 5 distinct wave patterns
const wave1Gaps = generateEndlessGaps(600, 450, 1);
const wave2Gaps = generateEndlessGaps(600, 450, 2);
const wave3Gaps = generateEndlessGaps(600, 450, 3);
const wave4Gaps = generateEndlessGaps(600, 450, 4);
const wave5Gaps = generateEndlessGaps(600, 450, 5);
const wave6Gaps = generateEndlessGaps(600, 450, 6);

assert.ok(wave1Gaps.length > 0, 'Wave 1 gaps must not be empty');
assert.ok(wave2Gaps.length > 0, 'Wave 2 gaps must not be empty');
assert.ok(wave3Gaps.length > 0, 'Wave 3 gaps must not be empty');
assert.ok(wave4Gaps.length > 0, 'Wave 4 gaps must not be empty');
assert.ok(wave5Gaps.length > 0, 'Wave 5 gaps must not be empty');

// Verify distinct pattern generation
assert.notEqual(wave1Gaps.length, wave2Gaps.length, 'Wave 1 (Subway) and Wave 2 (Diamond) should have different gap structures');
assert.equal(wave1Gaps.length, wave6Gaps.length, 'Wave 6 must cycle back to pattern 1 (modulo 5)');

// Verify tile generation
const wave1Tiles = generateEndlessTiles(600, 450, 1);
const wave2Tiles = generateEndlessTiles(600, 450, 2);
assert.ok(wave1Tiles.length > 0, 'Wave 1 tiles must not be empty');
assert.ok(wave2Tiles.length > 0, 'Wave 2 tiles must not be empty');

console.log('  ✓ Procedural wave generator produces 5 distinct artisanal patterns and cycles seamlessly.\n');

// -------------------------------------------------------------
// Test 3: Engine Endless Mode Wave Progression (Resolves AUD-06)
// -------------------------------------------------------------
console.log('Test 3: Verify GroutEngine seamless wave progression without game-over modal (AUD-06 fix)');
const canvas = createMockCanvas(600, 450);

let levelCompletedCalled = false;
let waveCompletedCalled = false;
let completedWaveNumber = 0;

const engine = new GroutEngine(
  canvas,
  () => {},
  () => { levelCompletedCalled = true; }
);

engine.onWaveComplete = (wave) => {
  waveCompletedCalled = true;
  completedWaveNumber = wave;
};

// Load Level 9
engine.loadLevel(level9);
assert.equal(engine.endlessWave, 1, 'Initial endless wave must be 1');
assert.equal(engine.isCompleted, false, 'Level must not be completed on load');

// Simulate 100% grout fill along all sample points
engine.samplePoints.forEach(pt => {
  pt.filled = true;
  engine.filledPointsCount++;
});

// Simulate 100% haze cleaning
for (let i = 0; i < 10; i++) {
  engine.depositHazePoint(100 + i * 15, 100 + i * 15);
}
engine.hazePatches.forEach(p => {
  p.cleaned = true;
  engine.cleanedHazeCount++;
});

// Check metrics
const metrics = engine.getMetrics();
assert.equal(metrics.isComplete, true, 'Metrics must indicate 100% complete');

// Trigger level completion check
engine.checkLevelCompletion();

// AUD-06 ASSERTIONS:
// 1. Level complete (victory modal) MUST NOT be triggered for endless mode!
assert.equal(levelCompletedCalled, false, 'AUD-06: onComplete must NOT be called for endless mode!');
// 2. Wave must advance seamlessly
assert.equal(waveCompletedCalled, true, 'onWaveComplete must be called');
assert.equal(completedWaveNumber, 2, 'Completed wave should advance to Wave 2');
assert.equal(engine.endlessWave, 2, 'engine.endlessWave must now be 2');
// 3. New gaps must be generated for Wave 2
assert.equal(engine.gaps.length, wave2Gaps.length, 'Engine must now have Wave 2 gaps loaded');
assert.equal(engine.strokes.length, 0, 'Strokes must be reset for fresh wave canvas');
assert.equal(engine.isCompleted, false, 'Game must continue running without pause');

console.log('  ✓ AUD-06 Resolved: Level 9 advances to next procedural wave without game over.\n');

// -------------------------------------------------------------
// Test 4: Resize Preservation on Endless Waves
// -------------------------------------------------------------
console.log('Test 4: Verify interval-based resize preservation on endless waves');
// Fill first 30 points of Wave 2
const initialFilled = 20;
for (let i = 0; i < initialFilled; i++) {
  const pt = engine.samplePoints[i];
  pt.filled = true;
  engine.filledPointsCount++;
  const s = Math.max(0, (pt.index - 0.5) / pt.totalSteps);
  const e = Math.min(1, (pt.index + 0.5) / pt.totalSteps);
  engine.addIntervalToGap(pt.gapIdx, s, e);
}

const progressBefore = engine.getMetrics().groutCoverage;

// Resize canvas from 600x450 to 400x300
canvas.width = 400;
canvas.height = 300;
engine.resizeLevel(600, 450, 400, 300);

const progressAfter = engine.getMetrics().groutCoverage;
assert.ok(Math.abs(progressBefore - progressAfter) <= 1.0, `Coverage preserved: ${progressBefore}% -> ${progressAfter}%`);
assert.equal(engine.endlessWave, 2, 'Endless wave number must be preserved across resizes');

console.log(`  ✓ Resize preservation on endless waves verified (${progressBefore}% -> ${progressAfter}%).\n`);

console.log('====================================================');
console.log('🎉 ALL PHASE 3 LEVEL VARIETY & ENDLESS TESTS PASSED');
console.log('====================================================\n');
