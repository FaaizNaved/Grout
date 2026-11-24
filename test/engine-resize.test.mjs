// Automated Unit & Algorithmic Test: GroutEngine Resize Progress Preservation
// Exercises the ACTUAL production GroutEngine class from js/engine.js

import assert from 'node:assert/strict';

// Set up minimal browser globals for GroutEngine in Node environment
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  addEventListener: () => {},
  removeEventListener: () => {},
  AudioContext: class {
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { setValueAtTime() {} } }; }
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
      fillText: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

console.log('=== TEST SUITE: Exact Interval Resize Preservation (GroutEngine) ===\n');

const mockCanvas = createMockCanvas(720, 560);
let recordedCoverage = 0;
const engine = new GroutEngine(mockCanvas, (cov) => {
  recordedCoverage = cov;
});

// Load Level 1
engine.loadLevel(LEVELS[0]);
console.log(`Initial Level 1 loaded: ${engine.samplePoints.length} sample points across ${engine.gaps.length} gaps.`);
assert.equal(engine.filledPointsCount, 0, 'Initial filled count must be 0');

// Fill points along Gap 0 (horizontal centerline gap from x=72 to x=648 at y=280)
// Drag across middle portion of Gap 0 (from x=180 to x=420)
const y = 280;
engine.strokes.push({
  color: '#B45309',
  borderColor: '#92400E',
  width: 26,
  points: [{ x: 180, y }, { x: 420, y }]
});

// Simulate pointer stroke
engine.checkGroutFill(null, { x: 180, y });
for (let x = 190; x <= 420; x += 10) {
  engine.checkGroutFill({ x: x - 10, y }, { x, y });
}

const initialFilledCount = engine.filledPointsCount;
const initialTotal = engine.samplePoints.length;
const initialCoverage = (initialFilledCount / initialTotal) * 100;

console.log(`Step 1 (720x560 Initial Drag):`);
console.log(`  Sample Points: ${initialTotal}`);
console.log(`  Filled Points: ${initialFilledCount}`);
console.log(`  Exact Coverage: ${initialCoverage.toFixed(2)}%`);
console.log(`  Canonical Intervals for Gap 0:`, JSON.stringify(engine.gapIntervals.get(0)));
assert(initialCoverage > 5 && initialCoverage < 50, 'Initial coverage should be between 5% and 50%');

// Resize 1: 50% scale reduction (720x560 -> 360x280)
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 360, height: 280, top: 0, left: 0, bottom: 280, right: 360 });
globalThis.window.innerWidth = 360;
globalThis.window.innerHeight = 640;
engine.handleResize();

const r1Coverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 2 (Resize to 360x280, 50% Width Reduction):`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount}`);
console.log(`  Post-Resize Coverage: ${r1Coverage.toFixed(2)}% (Delta: ${(r1Coverage - initialCoverage).toFixed(2)}%)`);
assert.equal(engine.strokes[0].points[0].x, 90, 'Stroke x1 must scale from 180 to 90');
assert.equal(engine.strokes[0].points[1].x, 210, 'Stroke x2 must scale from 420 to 210');

// Resize 2: Restore to original (360x280 -> 720x560)
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 720, height: 560, top: 0, left: 0, bottom: 560, right: 720 });
globalThis.window.innerWidth = 1280;
globalThis.window.innerHeight = 800;
engine.handleResize();

const r2Coverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 3 (Resize Back to 720x560 Original):`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount}`);
console.log(`  Post-Resize Coverage: ${r2Coverage.toFixed(2)}% (Exact Match Delta: ${(r2Coverage - initialCoverage).toFixed(2)}%)`);
assert.equal(engine.filledPointsCount, initialFilledCount, 'Points count must return to EXACT initial count');
assert.equal(r2Coverage.toFixed(2), initialCoverage.toFixed(2), 'Coverage must match initial coverage exactly');
assert.equal(engine.strokes[0].points[0].x, 180, 'Stroke x1 must restore to 180');
assert.equal(engine.strokes[0].points[1].x, 420, 'Stroke x2 must restore to 420');

// Resize 3: Aspect ratio change to Landscape (720x560 -> 844x390, aspect ratio 1.28 -> 2.0)
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 520, height: 260, top: 0, left: 0, bottom: 260, right: 520 });
globalThis.window.innerWidth = 844;
globalThis.window.innerHeight = 390;
engine.handleResize();

const r3Coverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 4 (Resize to 844x390 Mobile Landscape):`);
console.log(`  Canvas Dimensions: ${engine.width}x${engine.height}`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount}`);
console.log(`  Post-Resize Coverage: ${r3Coverage.toFixed(2)}% (Delta: ${(r3Coverage - initialCoverage).toFixed(2)}%)`);
assert(Math.abs(r3Coverage - initialCoverage) < 3.0, 'Coverage variance in landscape must be < 3.0%');

// Resize 4: Android landscape aspect ratio (844x390 -> 740x390)
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 450, height: 240, top: 0, left: 0, bottom: 240, right: 450 });
globalThis.window.innerWidth = 740;
globalThis.window.innerHeight = 390;
engine.handleResize();

const r4Coverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 5 (Resize to 740x390 Android Landscape):`);
console.log(`  Canvas Dimensions: ${engine.width}x${engine.height}`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount}`);
console.log(`  Post-Resize Coverage: ${r4Coverage.toFixed(2)}% (Delta: ${(r4Coverage - initialCoverage).toFixed(2)}%)`);
assert(Math.abs(r4Coverage - initialCoverage) < 3.0, 'Coverage variance in Android landscape must be < 3.0%');

// Resize 5: Mobile portrait aspect ratio (740x390 -> 390x844)
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 370, height: 274, top: 0, left: 0, bottom: 274, right: 370 });
globalThis.window.innerWidth = 390;
globalThis.window.innerHeight = 844;
engine.handleResize();

const r5Coverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 6 (Resize to 390x844 Mobile Portrait):`);
console.log(`  Canvas Dimensions: ${engine.width}x${engine.height}`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount}`);
console.log(`  Post-Resize Coverage: ${r5Coverage.toFixed(2)}% (Delta: ${(r5Coverage - initialCoverage).toFixed(2)}%)`);
assert(Math.abs(r5Coverage - initialCoverage) < 3.0, 'Coverage variance in mobile portrait must be < 3.0%');

// Resize 6: Repeated cycle back to original 720x560
mockCanvas.parentElement.getBoundingClientRect = () => ({ width: 720, height: 560, top: 0, left: 0, bottom: 560, right: 720 });
globalThis.window.innerWidth = 1280;
globalThis.window.innerHeight = 800;
engine.handleResize();

const finalCoverage = (engine.filledPointsCount / engine.samplePoints.length) * 100;
console.log(`\nStep 7 (Final Return to 720x560 after 6 Multi-Directional Resizes):`);
console.log(`  Sample Points: ${engine.samplePoints.length}`);
console.log(`  Filled Points: ${engine.filledPointsCount} (Initial: ${initialFilledCount})`);
console.log(`  Final Coverage: ${finalCoverage.toFixed(2)}% (Initial: ${initialCoverage.toFixed(2)}%)`);
console.log(`  Cumulative Drift after 6 resizes: ${(finalCoverage - initialCoverage).toFixed(4)}%`);
assert.equal(engine.filledPointsCount, initialFilledCount, 'Cumulative drift must be EXACTLY ZERO');
assert.equal(finalCoverage.toFixed(2), initialCoverage.toFixed(2), 'Coverage must be preserved with 0.00% drift');

console.log('\n✔ ALL RESIZE INTERVAL PRESERVATION TESTS PASSED WITH ZERO DRIFT!\n');
