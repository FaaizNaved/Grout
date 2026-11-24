// Automated Test Suite for Phase 2 Real Grouting Mechanics
// Tests the ACTUAL production GroutEngine class from js/engine.js
// Covers all 17 requirements across Grout, Sponge, Completion, and Regression suites.

import assert from 'node:assert/strict';

// Set up minimal browser globals for GroutEngine in Node environment
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  AudioContext: class {
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
globalThis.requestAnimationFrame = () => 0;

// Import the actual production engine & levels
const { GroutEngine } = await import('../js/engine.js');
const { LEVELS } = await import('../js/levels.js');

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
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      save: () => {},
      restore: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillText: () => {},
      setLineDash: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

console.log('===========================================================');
console.log('PHASE 2 REAL GROUTING MECHANICS — AUTOMATED VERIFICATION');
console.log('===========================================================\n');

// -------------------------------------------------------------
// SECTION 1: GROUT TROWEL MECHANICS TESTS
// -------------------------------------------------------------
console.log('--- SUITE 1: Trowel Joint Filling & Haze Generation ---');

{
  const canvas = createMockCanvas(720, 560);
  let progressReported = null;
  const engine = new GroutEngine(canvas, (m) => { progressReported = m; });
  engine.loadLevel(LEVELS[0]);

  // Initial state assertions
  assert.equal(engine.tool, 'trowel');
  assert.equal(engine.filledPointsCount, 0);
  assert.equal(engine.totalHazeDeposited, 0);
  assert.equal(engine.cleanedHazeCount, 0);

  const gap0 = engine.gaps[0];

  // Test 1: Trowel click away from every grout joint creates 0 haze and 0 coverage
  engine.checkGroutFill(null, { x: 75, y: 60 });
  assert.equal(engine.filledPointsCount, 0, 'Click on tile face must not fill grout points');
  assert.equal(engine.getMetrics().groutCoverage, 0, 'Coverage must remain 0%');
  assert.equal(engine.totalHazeDeposited, 0, 'Click on tile face must not deposit haze');
  assert.equal(engine.hazePatches.length, 0, 'Haze patches array must remain empty');
  console.log(`✔ Test 1 Passed: Single click on tile face creates 0 haze patches and 0% coverage`);

  // Test 2: Dragging trowel entirely across ordinary tile away from all joints
  engine.checkGroutFill({ x: 60, y: 55 }, { x: 90, y: 65 });
  assert.equal(engine.filledPointsCount, 0, 'Dragging across tile face must not fill grout points');
  assert.equal(engine.getMetrics().groutCoverage, 0, 'Grout coverage must be 0%');
  assert.equal(engine.totalHazeDeposited, 0, 'Dragging across tile face must not deposit haze');
  assert.equal(engine.hazePatches.length, 0, 'Haze patches array must remain empty');
  assert.equal(engine.getMetrics().hazeCleaning, 0, 'Haze cleaning progress must remain 0%');
  console.log(`✔ Test 2 Passed: Trowel drag entirely across tile face creates 0 points, 0% grout, 0 haze`);

  // Test 3: Trowel fills an empty joint
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  const pointsFilled = engine.filledPointsCount;
  assert.ok(pointsFilled > 0, `Expected points to be filled, got ${pointsFilled}`);
  const m1 = engine.getMetrics();
  assert.ok(m1.groutCoverage > 0, `Expected groutCoverage > 0, got ${m1.groutCoverage}%`);
  console.log(`✔ Test 3 Passed: Trowel filled empty joint (filled ${pointsFilled} sample points, coverage: ${m1.groutCoverage}%)`);

  // Test 4: Trowel partially fills a joint
  engine.loadLevel(LEVELS[0]);
  const quarterX = gap0.x1 + (gap0.x2 - gap0.x1) * 0.25;
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: quarterX, y: gap0.y1 });
  const partialMetrics = engine.getMetrics();
  assert.ok(partialMetrics.groutCoverage > 0 && partialMetrics.groutCoverage < 15,
    `Expected partial coverage (0-15%), got ${partialMetrics.groutCoverage}%`);
  console.log(`✔ Test 4 Passed: Trowel partially filled joint (partial coverage: ${partialMetrics.groutCoverage}%)`);

  // Test 5: Repeated strokes do not double-count coverage
  const filledBeforeRepeat = engine.filledPointsCount;
  const covBeforeRepeat = engine.getMetrics().groutCoverage;
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: quarterX, y: gap0.y1 });
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: quarterX, y: gap0.y1 });
  assert.equal(engine.filledPointsCount, filledBeforeRepeat, 'Repeated strokes must not increase filled points count');
  assert.equal(engine.getMetrics().groutCoverage, covBeforeRepeat, 'Repeated strokes must not increase grout coverage');
  console.log(`✔ Test 5 Passed: Repeated trowel strokes do not double-count (coverage remained: ${covBeforeRepeat}%)`);

  // Test 6: Trowel application deposits haze only on adjacent tiles, leaving distant tile faces clean
  assert.ok(engine.hazePatches.length > 0, 'Trowel stroke must deposit haze patches');
  assert.ok(engine.totalHazeDeposited > 0, 'totalHazeDeposited must be greater than zero');
  for (const patch of engine.hazePatches) {
    const hx = patch.u * engine.width;
    const hy = patch.v * engine.height;
    const dSq = engine.distToSegmentSq(hx, hy, gap0.x1, gap0.y1, gap0.x2, gap0.y2);
    const dist = Math.sqrt(dSq);
    assert.ok(dist >= 11, `Haze patch must be on tile face outside joint cavity, got dist=${dist.toFixed(1)}px`);
    assert.ok(dist <= 50, `Haze patch must be within adjacent tile area (<= 50px), got dist=${dist.toFixed(1)}px`);
    assert.ok(Math.abs(hy - gap0.y1) <= 50, `Distant tile faces must remain clean, got y=${hy.toFixed(1)}px (gap y=${gap0.y1})`);
  }
  const samplePatch = engine.hazePatches[0];
  assert.ok(samplePatch.u >= 0 && samplePatch.u <= 1, 'Haze u coordinate must be normalized');
  assert.ok(samplePatch.v >= 0 && samplePatch.v <= 1, 'Haze v coordinate must be normalized');
  assert.equal(samplePatch.cleaned, false, 'New haze patch must not be marked cleaned');
  assert.ok(samplePatch.opacity > 0, 'Haze opacity must be > 0');
  console.log(`✔ Test 6 Passed: Trowel application deposited ${engine.totalHazeDeposited} haze patches strictly on adjacent tiles`);

  // Test 7: Dragging across 100%-filled joint preserves coverage but re-soils cleaned haze and immediately notifies HUD
  engine.loadLevel(LEVELS[0]);
  // 1. Fill Gap 0 completely (100% filled joint)
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  const filledGap0 = engine.filledPointsCount;
  const covGap0 = engine.getMetrics().groutCoverage;
  assert.ok(filledGap0 > 0);

  // 2. Clean all haze along Gap 0 with sponge
  engine.setTool('sponge');
  for (const patch of engine.hazePatches) {
    const px = patch.u * engine.width;
    const py = patch.v * engine.height;
    engine.checkSpongeCleaning(null, { x: px, y: py });
  }
  const cleanCountAtMax = engine.cleanedHazeCount;
  const cleanPctAtMax = engine.getMetrics().hazeCleaning;
  assert.equal(cleanPctAtMax, 100, 'All haze cleaned to 100%');

  // 3. Track immediate onProgress dispatch
  let resoilNotified = null;
  engine.onProgress = (metrics) => {
    resoilNotified = metrics;
  };

  // 4. Re-apply trowel along Gap 0 (the already 100%-filled joint)
  engine.setTool('trowel');
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });

  assert.equal(engine.filledPointsCount, filledGap0, 'Grout coverage must not increase on already filled joint');
  assert.equal(engine.getMetrics().groutCoverage, covGap0, 'Grout coverage must remain unchanged');
  assert.ok(engine.cleanedHazeCount < cleanCountAtMax,
    `cleanedHazeCount must decrease on re-soiling: got ${engine.cleanedHazeCount} vs pre-clean ${cleanCountAtMax}`);
  const postResoilCleanPct = engine.getMetrics().hazeCleaning;
  assert.ok(postResoilCleanPct < 100, `hazeCleaning must decrease immediately on re-soiling: got ${postResoilCleanPct}%`);
  assert.notEqual(resoilNotified, null, 'onProgress callback must be invoked immediately on re-soiling interaction');
  assert.equal(resoilNotified.hazeCleaning, postResoilCleanPct, 'HUD notification must receive exact updated cleaning percentage');
  console.log(`✔ Test 7 Passed: Re-soiling 100%-filled joint decrements cleanedHazeCount (${engine.cleanedHazeCount}/${cleanCountAtMax}) and fires immediate HUD sync (${postResoilCleanPct}%)`);
}

// -------------------------------------------------------------
// SECTION 2: SPONGE CLEANING MECHANICS TESTS
// -------------------------------------------------------------
console.log('\n--- SUITE 2: Sponge Cleaning Mechanics ---');

{
  const canvas = createMockCanvas(720, 560);
  const engine = new GroutEngine(canvas);
  engine.loadLevel(LEVELS[0]);

  // Apply grout on Gap 0 to create joints + haze
  const gap0 = engine.gaps[0];
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  const initialGroutCoverage = engine.getMetrics().groutCoverage;
  const initialFilledCount = engine.filledPointsCount;
  const initialTotalHaze = engine.totalHazeDeposited;
  assert.ok(initialTotalHaze > 0, 'Must have deposited haze for sponge test');

  // Switch to sponge
  engine.setTool('sponge');
  assert.equal(engine.tool, 'sponge');

  // Test 8: Sponge removes haze
  assert.equal(engine.cleanedHazeCount, 0);
  assert.equal(engine.getMetrics().hazeCleaning, 0);

  // Sweep sponge across all haze patches
  for (const patch of engine.hazePatches) {
    const px = patch.u * engine.width;
    const py = patch.v * engine.height;
    engine.checkSpongeCleaning(null, { x: px, y: py });
  }

  assert.ok(engine.cleanedHazeCount > 0, `Expected cleanedHazeCount > 0, got ${engine.cleanedHazeCount}`);
  const postCleanMetrics = engine.getMetrics();
  assert.ok(postCleanMetrics.hazeCleaning > 0, `Expected hazeCleaning > 0%, got ${postCleanMetrics.hazeCleaning}%`);
  console.log(`✔ Test 8 Passed: Sponge removed haze (cleaned ${engine.cleanedHazeCount}/${initialTotalHaze} patches, haze cleaning: ${postCleanMetrics.hazeCleaning}%)`);

  // Test 9: Sponge does NOT fill empty joints and cleans 0 haze on empty joints
  engine.loadLevel(LEVELS[0]);
  engine.setTool('sponge');
  assert.equal(engine.filledPointsCount, 0);
  assert.equal(engine.getMetrics().groutCoverage, 0);
  assert.equal(engine.cleanedHazeCount, 0);
  // Stroke sponge directly over empty Gap 0
  engine.checkSpongeCleaning({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  assert.equal(engine.filledPointsCount, 0, 'Sponge must not fill joint points');
  assert.equal(engine.getMetrics().groutCoverage, 0, 'Sponge must not increase grout coverage');
  assert.equal(engine.cleanedHazeCount, 0, 'Sponge on empty joint must clean 0 haze');
  assert.equal(engine.getMetrics().hazeCleaning, 0, 'Haze cleaning must remain 0%');
  console.log(`✔ Test 9 Passed: Sponge does NOT fill empty joints (coverage strictly 0.00%, clean count: 0)`);

  // Test 10: Sponge dragged across clean tile surface produces 0 cleaned haze
  engine.checkSpongeCleaning({ x: 450, y: 80 }, { x: 550, y: 120 });
  assert.equal(engine.cleanedHazeCount, 0, 'Sponge on clean tile must clean 0 haze');
  assert.equal(engine.getMetrics().hazeCleaning, 0, 'Haze cleaning must remain 0%');
  console.log(`✔ Test 10 Passed: Sponge dragged across clean tile surface produces 0 cleaned haze (0%)`);

  // Test 11: Sponge does NOT reduce grout coverage
  engine.setTool('trowel');
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  const filledWithTrowel = engine.filledPointsCount;
  const covWithTrowel = engine.getMetrics().groutCoverage;
  assert.ok(filledWithTrowel > 0);

  engine.setTool('sponge');
  engine.checkSpongeCleaning({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x2, y: gap0.y2 });
  assert.equal(engine.filledPointsCount, filledWithTrowel, 'Sponge must not remove joint grout');
  assert.equal(engine.getMetrics().groutCoverage, covWithTrowel, 'Sponge must not reduce joint coverage');
  console.log(`✔ Test 11 Passed: Sponge does NOT reduce existing joint grout (coverage preserved at ${covWithTrowel}%)`);

  // Test 12: Cleaning an already-clean surface does not increase cleaning progress
  // Clean all remaining haze
  for (const patch of engine.hazePatches) {
    const px = patch.u * engine.width;
    const py = patch.v * engine.height;
    engine.checkSpongeCleaning(null, { x: px, y: py });
  }
  const cleanCountAtMax = engine.cleanedHazeCount;
  const cleanPctAtMax = engine.getMetrics().hazeCleaning;

  // Pass sponge again over already-clean surface
  engine.checkSpongeCleaning({ x: 100, y: 100 }, { x: 500, y: 500 });
  assert.equal(engine.cleanedHazeCount, cleanCountAtMax, 'Cleaning clean surface must not increase clean count');
  assert.equal(engine.getMetrics().hazeCleaning, cleanPctAtMax, 'Cleaning clean surface must not increase clean pct');
  console.log(`✔ Test 12 Passed: Cleaning already-clean surface does not increment progress (${cleanPctAtMax}%)`);

  // Test 13: Fast sponge movement does not leave sampling gaps (segment-to-point distance check)
  engine.loadLevel(LEVELS[0]);
  // Manually deposit haze patches along a line
  engine.depositHazePoint(100, 200);
  engine.depositHazePoint(150, 200);
  engine.depositHazePoint(200, 200);
  engine.depositHazePoint(250, 200);
  engine.depositHazePoint(300, 200);
  assert.equal(engine.totalHazeDeposited, 5);
  assert.equal(engine.cleanedHazeCount, 0);

  engine.setTool('sponge');
  // Rapid stroke: single step jumping 200px from (100, 200) directly to (300, 200)
  engine.checkSpongeCleaning({ x: 100, y: 200 }, { x: 300, y: 200 });
  assert.equal(engine.cleanedHazeCount, 5, 'Continuous segment check must clean all intermediate patches');
  assert.equal(engine.getMetrics().hazeCleaning, 100, 'All 5 patches must be cleaned');
  console.log(`✔ Test 13 Passed: Fast continuous sponge movement cleaned all intermediate patches (5/5 cleaned, 100%)`);
}

// -------------------------------------------------------------
// SECTION 3: COMPLETION & SCORING MECHANICS TESTS
// -------------------------------------------------------------
console.log('\n--- SUITE 3: Level Completion & Scoring Mechanics ---');

{
  const canvas = createMockCanvas(720, 560);
  let completedLevel = null;
  const engine = new GroutEngine(canvas, null, (lvl) => { completedLevel = lvl; });
  engine.loadLevel(LEVELS[0]);

  // Test 14: Filled joints with remaining haze do NOT complete the level
  // Fill all 4 gaps completely
  for (const gap of engine.gaps) {
    engine.checkGroutFill({ x: gap.x1, y: gap.y1 }, { x: gap.x2, y: gap.y2 });
  }
  const mFullGrout = engine.getMetrics();
  assert.ok(mFullGrout.groutCoverage >= 90, `Expected grout coverage >= 90%, got ${mFullGrout.groutCoverage}%`);
  assert.ok(mFullGrout.hazeCleaning < 90, `Expected haze cleaning < 90%, got ${mFullGrout.hazeCleaning}%`);
  assert.equal(mFullGrout.groutReady, true, 'Grout should be ready');
  assert.equal(mFullGrout.hazeReady, false, 'Haze should NOT be ready');
  assert.equal(mFullGrout.isComplete, false, 'Level must NOT be complete with dirty tiles');
  assert.equal(engine.isCompleted, false, 'Engine must not trigger victory modal');
  assert.equal(completedLevel, null, 'onComplete callback must not be invoked');
  console.log(`✔ Test 14 Passed: 100% Grout coverage with 0% haze cleaning does NOT complete level (groutReady: true, hazeReady: false)`);

  // Test 15: Clean surfaces with empty joints do NOT complete the level
  engine.loadLevel(LEVELS[0]);
  engine.setTool('sponge');
  for (let x = 50; x < 650; x += 30) {
    engine.checkSpongeCleaning({ x, y: 50 }, { x, y: 500 });
  }
  const mCleanEmpty = engine.getMetrics();
  assert.equal(mCleanEmpty.groutCoverage, 0);
  assert.equal(mCleanEmpty.groutReady, false);
  assert.equal(mCleanEmpty.isComplete, false);
  assert.equal(engine.isCompleted, false);
  console.log(`✔ Test 15 Passed: Clean surfaces with 0% grout coverage do NOT complete level`);

  // Test 16: Both thresholds satisfied results in level completion
  // 1. Fill joints
  engine.setTool('trowel');
  for (const gap of engine.gaps) {
    engine.checkGroutFill({ x: gap.x1, y: gap.y1 }, { x: gap.x2, y: gap.y2 });
  }
  // 2. Clean haze with sponge
  engine.setTool('sponge');
  for (const patch of engine.hazePatches) {
    const px = patch.u * engine.width;
    const py = patch.v * engine.height;
    engine.checkSpongeCleaning(null, { x: px, y: py });
  }
  const mBoth = engine.getMetrics();
  assert.ok(mBoth.groutCoverage >= 84, `Grout coverage ${mBoth.groutCoverage}% >= 84%`);
  assert.ok(mBoth.hazeCleaning >= 84, `Haze cleaning ${mBoth.hazeCleaning}% >= 84%`);
  assert.equal(mBoth.groutReady, true);
  assert.equal(mBoth.hazeReady, true);
  assert.equal(mBoth.isComplete, true);
  assert.equal(engine.isCompleted, true);
  assert.notEqual(completedLevel, null);
  console.log(`✔ Test 16 Passed: Both thresholds satisfied completes level! (Grout: ${mBoth.groutCoverage}%, Clean: ${mBoth.hazeCleaning}%, isComplete: true)`);

  // Test 17: Scoring reflects both coverage and cleaning
  const expectedScore = Math.round((mBoth.groutCoverage * 0.5) + (mBoth.hazeCleaning * 0.5));
  assert.equal(mBoth.compositeScore, expectedScore, `Composite score must be 50% grout + 50% clean: ${mBoth.compositeScore}% vs ${expectedScore}%`);
  console.log(`✔ Test 17 Passed: Final composite score reflects both operations (compositeScore: ${mBoth.compositeScore}%)`);
}

// -------------------------------------------------------------
// SECTION 4: REGRESSION & STATE STABILITY TESTS
// -------------------------------------------------------------
console.log('\n--- SUITE 4: Resize & Tool Switching Regression ---');

{
  const canvas = createMockCanvas(720, 560);
  const engine = new GroutEngine(canvas);
  engine.loadLevel(LEVELS[0]);

  // Partial fill Gap 0 with trowel
  const gap0 = engine.gaps[0];
  engine.checkGroutFill({ x: gap0.x1, y: gap0.y1 }, { x: gap0.x1 + (gap0.x2 - gap0.x1) * 0.5, y: gap0.y1 });
  const preGroutCov = engine.getMetrics().groutCoverage;
  const preHazeTotal = engine.totalHazeDeposited;

  // Clean half of the haze with sponge
  engine.setTool('sponge');
  const halfHaze = Math.floor(engine.hazePatches.length / 2);
  for (let i = 0; i < halfHaze; i++) {
    const p = engine.hazePatches[i];
    engine.checkSpongeCleaning(null, { x: p.u * engine.width, y: p.v * engine.height });
  }
  const preCleanCount = engine.cleanedHazeCount;
  const preCleanPct = engine.getMetrics().hazeCleaning;

  // Test 18: Resize preserves grout coverage
  engine.resizeLevel(720, 560, 360, 280);
  engine.resizeLevel(360, 280, 844, 390);
  engine.resizeLevel(844, 390, 720, 560);
  const postGroutCov = engine.getMetrics().groutCoverage;
  assert.equal(postGroutCov, preGroutCov, `Grout coverage must match exactly: ${postGroutCov}% vs ${preGroutCov}%`);
  console.log(`✔ Test 18 Passed: Multi-directional resize preserves grout coverage exactly (0.0000% drift)`);

  // Test 19: Resize preserves haze distribution and cleaning progress
  assert.equal(engine.totalHazeDeposited, preHazeTotal, 'Total haze count must be preserved across resize');
  assert.equal(engine.cleanedHazeCount, preCleanCount, 'Cleaned haze count must be preserved across resize');
  assert.equal(engine.getMetrics().hazeCleaning, preCleanPct, 'Haze cleaning percentage must be preserved across resize');
  console.log(`✔ Test 19 Passed: Resize preserves haze count (${engine.totalHazeDeposited}) and clean progress (${preCleanPct}%) with zero drift`);

  // Test 20: Tool switching preserves all gameplay state
  for (let i = 0; i < 5; i++) {
    engine.setTool('trowel');
    engine.setTool('sponge');
  }
  assert.equal(engine.getMetrics().groutCoverage, preGroutCov);
  assert.equal(engine.getMetrics().hazeCleaning, preCleanPct);
  assert.equal(engine.totalHazeDeposited, preHazeTotal);
  console.log(`✔ Test 20 Passed: Frequent tool switching preserves all joint and haze state`);
}

console.log('\n===========================================================');
console.log('ALL 20 PHASE 2 MECHANICS TESTS PASSED WITH ZERO ERRORS!');
console.log('===========================================================\n');
