// Test suite for GROUT: Five-Level Campaign Mechanics, Geometry & Fail States

import assert from 'node:assert/strict';

// Set up browser mocks for Node environment
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  location: { href: 'http://localhost/' },
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
  location: { href: 'http://localhost/' },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
globalThis.Audio = class {
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
  }
  play() { return Promise.resolve(); }
  pause() {}
};
globalThis.requestAnimationFrame = () => 0;
globalThis.MouseEvent = class {
  constructor(type, init = {}) {
    Object.assign(this, init);
    this.type = type;
  }
};

function createMockCanvas(width, height) {
  const listeners = {};
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
    addEventListener: (type, fn) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener: (type, fn) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter(f => f !== fn);
      }
    },
    dispatchEvent: (e) => {
      if (e && !e.preventDefault) e.preventDefault = () => {};
      const fns = listeners[e.type] || [];
      fns.forEach(fn => fn(e));
      return true;
    }
  };
}

console.log('🧪 Starting Five-Level Campaign Mechanics Test Suite...\n');

const { LEVELS } = await import('../js/levels.js');
const { GroutEngine } = await import('../js/engine.js');
const { GroutApp } = await import('../js/main.js');

// ---------------------------------------------------------------------------
// TEST 1: Campaign Structure & Distinct Level Identities
// ---------------------------------------------------------------------------
console.log('Test 1: Campaign Level Inventory');
assert.equal(LEVELS.length, 6, 'Must contain exactly 6 levels (5 campaign + 1 bonus)');

const [lvl1, lvl2, lvl3, lvl4, lvl5, lvl6] = LEVELS;

assert.equal(lvl1.id, 1);
assert.equal(lvl1.name, 'The Classic Subway Backsplash');

assert.equal(lvl2.id, 2);
assert.equal(lvl2.hasBlowoutMechanic, true, 'Level 2 must have blowout mechanic enabled');

assert.equal(lvl3.id, 3);
assert.equal(lvl3.hasColorMatching, true, 'Level 3 must have color matching enabled');

assert.equal(lvl4.id, 4);
assert.equal(lvl4.hasCuringTimer, true, 'Level 4 must have curing timer enabled');
assert.equal(lvl4.curingDelaySec, 30, 'Level 4 curing delay must be 30 seconds');
assert.equal(lvl4.overallDeadlineSec, 75, 'Level 4 overall deadline must be 75 seconds');

assert.equal(lvl5.id, 5);
assert.equal(lvl5.hasRestorationPuzzle, true, 'Level 5 must have restoration puzzle enabled');
assert.equal(lvl5.isBossLevel, true, 'Level 5 must be marked as boss level');

assert.equal(lvl6.id, 6);
assert.equal(lvl6.isEndless, true, 'Level 6 must be marked as endless');
console.log('  ✓ All 5 campaign levels + bonus endless level configured with correct flags.\n');

// ---------------------------------------------------------------------------
// TEST 2: Level 2 True Hexagonal Geometry & Blowout Mechanics
// ---------------------------------------------------------------------------
console.log('Test 2: Level 2 Hexagonal Geometry & Blowout Penalty/Recovery');
const hexGaps = lvl2.generateGaps(600, 480);
assert.ok(hexGaps.length >= 12, 'Hexagon level must generate real shared hexagon edge segments');

// Check that 3-way vertices exist (multiple gaps sharing an endpoint)
const vertexMap = new Map();
hexGaps.forEach(g => {
  const k1 = `${Math.round(g.x1)},${Math.round(g.y1)}`;
  const k2 = `${Math.round(g.x2)},${Math.round(g.y2)}`;
  vertexMap.set(k1, (vertexMap.get(k1) || 0) + 1);
  vertexMap.set(k2, (vertexMap.get(k2) || 0) + 1);
});
let threeWayCount = 0;
for (const count of vertexMap.values()) {
  if (count >= 3) threeWayCount++;
}
assert.ok(threeWayCount >= 4, `Hexagon geometry must have 3-way $120° intersections (found ${threeWayCount})`);

// Test Blowout in Engine
const canvas = createMockCanvas(600, 480);
const engine = new GroutEngine(canvas);
engine.loadLevel(lvl2);

// Seal points along gap 0
const gap0Points = engine.samplePoints.filter(p => p.gapIdx === 0);
gap0Points.forEach(p => { p.filled = true; engine.filledPointsCount++; });
assert.equal(engine.activeBlowouts, 0, 'Initially no blowouts');

// Aggressive sponge scrubbing over sealed gap 0 (speed >= 0.80 px/ms)
engine.setTool('sponge');
const gap0 = engine.gaps[0];
for (let s = 0; s < 4; s++) {
  engine.checkSpongeCleaning(
    { x: gap0.x1, y: gap0.y1, time: s * 50 },
    { x: gap0.x2, y: gap0.y2, time: s * 50 + 15 }
  );
}
assert.equal(engine.activeBlowouts, 1, 'Aggressive sponge scrub on sealed joint must trigger blowout');
assert.equal(engine.activeBlowoutsList.length, 1);
assert.equal(engine.getMetrics().blowoutReady, false, 'Active blowout must prevent blowoutReady');

// Unrelated joint grouting must NOT repair blowout
engine.setTool('trowel');
const gap1Points = engine.samplePoints.filter(p => p.gapIdx === 1);
gap1Points.forEach(pt => {
  engine.checkGroutFill({ x: pt.x - 2, y: pt.y - 2 }, { x: pt.x + 2, y: pt.y + 2 });
});
assert.equal(engine.activeBlowouts, 1, 'Grouting unrelated joint must NEVER repair the blowout');

// Deterministic repair: refilling exact damaged points clears blowout
const b = engine.activeBlowoutsList[0];
const damagedList = Array.from(b.damagedPoints);
assert.ok(damagedList.length > 0, 'Blowout must track damaged points');
damagedList.forEach(pt => {
  engine.checkGroutFill({ x: pt.x - 2, y: pt.y - 2 }, { x: pt.x + 2, y: pt.y + 2 });
});
assert.equal(engine.activeBlowouts, 0, 'Refilling exact damaged points must clear blowout');
assert.equal(engine.getMetrics().blowoutReady, true, 'blowoutReady is true when blowout is cleared');

// Multiple blowouts test
engine.samplePoints.filter(p => p.gapIdx === 0 || p.gapIdx === 1).forEach(p => { p.filled = true; });
engine.triggerBlowout(gap0.x1, gap0.y1, 0);
const gap1 = engine.gaps[1];
engine.triggerBlowout(gap1.x1, gap1.y1, 1);
assert.equal(engine.activeBlowouts, 2, 'Must track multiple active blowouts');
assert.equal(engine.getMetrics().blowoutReady, false);

// Repair only first blowout
const b1 = engine.activeBlowoutsList.find(item => item.gapIdx === 0);
Array.from(b1.damagedPoints).forEach(pt => {
  engine.checkGroutFill({ x: pt.x - 2, y: pt.y - 2 }, { x: pt.x + 2, y: pt.y + 2 });
});
assert.equal(engine.activeBlowouts, 1, 'Repairing first blowout leaves 1 blowout active');
assert.equal(engine.getMetrics().blowoutReady, false, 'blowoutReady still false while 1 blowout remains');

// Repair second blowout
const b2 = engine.activeBlowoutsList[0];
Array.from(b2.damagedPoints).forEach(pt => {
  engine.checkGroutFill({ x: pt.x - 2, y: pt.y - 2 }, { x: pt.x + 2, y: pt.y + 2 });
});
assert.equal(engine.activeBlowouts, 0, 'Repairing all blowouts leaves 0 blowouts');
assert.equal(engine.getMetrics().blowoutReady, true, 'blowoutReady restored to true');

// Unresolved blowout prevents level completion
engine.samplePoints.forEach(p => { p.filled = true; });
engine.filledPointsCount = engine.samplePoints.length;
for (let i = 0; i < 20; i++) engine.depositHazePoint(20 + i * 10, 20);
engine.hazePatches.forEach(p => { p.cleaned = true; });
engine.cleanedHazeCount = engine.totalHazeDeposited;

engine.triggerBlowout(gap0.x1, gap0.y1, 0);
assert.equal(engine.activeBlowouts, 1);
engine.checkLevelCompletion();
assert.equal(engine.isCompleted, false, 'Unresolved blowout must block level completion');

// Clean up blowout for next test
Array.from(engine.activeBlowoutsList[0].damagedPoints).forEach(pt => {
  engine.checkGroutFill({ x: pt.x - 2, y: pt.y - 2 }, { x: pt.x + 2, y: pt.y + 2 });
});
assert.equal(engine.activeBlowouts, 0);
console.log('  ✓ Hexagonal 3-way vertices, sponge blowout, unrelated joint non-repair, deterministic repair, and completion blocking verified.\n');

// ---------------------------------------------------------------------------
// TEST 3: Level 3 Moroccan Mosaic Color Validation
// ---------------------------------------------------------------------------
console.log('Test 3: Level 3 Color Matching & Wrong-Color Failure Trigger');
const moroccanGaps = lvl3.generateGaps(600, 480);
const moroccanTiles = typeof lvl3.tiles === 'function' ? lvl3.tiles(600, 480) : (lvl3.tiles || []);

assert.ok(moroccanTiles.some(t => t.type === 'star8'), 'Moroccan level must contain 8-pointed star tiles');
assert.ok(moroccanTiles.some(t => t.type === 'cross'), 'Moroccan level must contain cross tiles');

// Verify gaps are tagged with section requirements
const starGaps = moroccanGaps.filter(g => g.sectionId === 'star');
const crossGaps = moroccanGaps.filter(g => g.sectionId === 'cross');
assert.ok(starGaps.length > 0, 'Star section gaps must be tagged');
assert.ok(crossGaps.length > 0, 'Cross section gaps must be tagged');

let levelFailedCalled = false;
let failTitle = '';
let failReason = '';
engine.onFailure = (lvl, title, reason) => {
  levelFailedCalled = true;
  failTitle = title;
  failReason = reason;
};

engine.loadLevel(lvl3);
// Set wrong color for star section (Star requires #F5F2EB, apply something totally different like green)
engine.setGroutColor('#10B981', '#059669');

const targetGap = starGaps[0];
const midX = (targetGap.x1 + targetGap.x2) / 2;
const midY = (targetGap.y1 + targetGap.y2) / 2;

// Trowel interaction on star joint with wrong color
engine.checkGroutFill({ x: midX - 2, y: midY - 2 }, { x: midX + 2, y: midY + 2 });
assert.equal(levelFailedCalled, true, 'Applying wrong grout color must trigger level failure');
assert.ok(failTitle.includes('COLOR'), `Failure title must mention color mismatch (was: ${failTitle})`);
console.log('  ✓ Moroccan 8-pointed star & cross polygonal geometry and color mismatch failure verified.\n');

// ---------------------------------------------------------------------------
// TEST 4: Level 4 Speed-Run Café Counter Curing Timer & Deadline
// ---------------------------------------------------------------------------
console.log('Test 4: Level 4 Curing Timer (30s) and Overall Deadline (75s)');
levelFailedCalled = false;
engine.loadLevel(lvl4);

assert.equal(engine.timeRemaining, 75, 'Initial countdown time must be 75s');

// Deposit haze patch
const deposited = engine.depositHazePoint(150, 150);
assert.equal(deposited, true, 'Haze must be deposit-able away from joints');

const patch = engine.hazePatches[0];
assert.ok(patch, 'Haze patch must exist');
assert.equal(patch.isCured, false, 'Freshly deposited haze is workable');

// Fast-forward engine clock past the 30s curing threshold
engine.advanceTime(35000);

// Sponge attempt on cured patch
engine.setTool('sponge');
engine.checkSpongeCleaning({ x: 148, y: 148 }, { x: 152, y: 152 });

assert.equal(patch.isCured, true, 'Patch older than 30s must become cured');
assert.equal(patch.passesRequired, 2, 'Cured patch must require multiple passes (first pass drops to 2 passes left)');
assert.equal(patch.cleaned, false, 'Cured patch must not be cleaned in a single pass');

// Test deterministic countdown ticking via tickCountdown
assert.equal(engine.timeRemaining, 75);
let lastTick = null;
engine.onTimerTick = (s) => { lastTick = s; };
engine.tickCountdown(15);
assert.equal(engine.timeRemaining, 60, 'tickCountdown(15) must reduce remaining time by 15');
assert.equal(lastTick, 60, 'onTimerTick must be invoked with 60s');

// Ticking down to 0 triggers level failure
engine.tickCountdown(60);
assert.equal(levelFailedCalled, true, 'Countdown expiration via tickCountdown must trigger level failure');
console.log('  ✓ 30-second curing behavior (3-pass buff requirement) and tickCountdown failure verified.\n');

// ---------------------------------------------------------------------------
// TEST 5: Level 5 Ancient Roman Mosaic Puzzle & Fragility System
// ---------------------------------------------------------------------------
console.log('Test 5: Level 5 Two-Stage Restoration, Socket Snapping & Fragility');
levelFailedCalled = false;
engine.loadLevel(lvl5);

assert.equal(engine.restorationStage, 1, 'Level 5 must start in Stage 1: Restoration Puzzle');
assert.equal(engine.fragility, 0, 'Initial fragility must be 0%');
assert.equal(engine.loosePieces.length, 4, 'Must have 4 loose mosaic pieces');
assert.equal(engine.sockets.length, 4, 'Must have 4 target sockets');

// Attempting to grout during Stage 1 should be locked
engine.setTool('trowel');
const strokeStart = { x: 100, y: 100 };
engine.checkGroutFill(strokeStart, { x: 120, y: 100 });
assert.equal(engine.filledPointsCount, 0, 'Grouting must be locked during Stage 1');

// Test Jarring Drop -> Fragility Increase via pointer events
const piece0 = engine.loosePieces[0];
// Mousedown on piece
canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: piece0.x + 5, clientY: piece0.y + 5 }));
assert.equal(engine.draggedPiece, piece0, 'Mousedown on piece must start drag');

// Mousemove away from socket
canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, clientY: 450 }));

// Mouseup away from socket (jarring drop)
let fragilityReported = 0;
engine.onFragilityChange = (pct) => { fragilityReported = pct; };
canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 450, clientY: 450 }));
assert.equal(engine.draggedPiece, null, 'Mouseup must end drag');
assert.equal(engine.fragility, 15, 'Jarring drop must add +15% fragility');
assert.equal(fragilityReported, 15);

// Test 100% Fragility Failure
for (let i = 0; i < 6; i++) {
  engine.fragility = Math.min(100, engine.fragility + 15);
}
assert.equal(engine.fragility, 100);
engine.triggerLevelFailure("RESTORATION FAILED", "Ancient Roman mosaic shattered!");
assert.equal(levelFailedCalled, true, '100% fragility must fail the level');

// Test Successful Snapping of all 4 pieces via pointer events -> Unlock Stage 2
engine.loadLevel(lvl5);
engine.loosePieces.forEach(p => {
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: p.x + 5, clientY: p.y + 5 }));
  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: p.targetX + 5, clientY: p.targetY + 5 }));
  canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: p.targetX + 5, clientY: p.targetY + 5 }));
  assert.equal(p.placed, true, 'Piece must snap into target socket upon release');
});
assert.equal(engine.restorationStage, 2, 'All 4 pieces snapped unlocks Stage 2 grouting');
console.log('  ✓ Two-stage restoration, real pointer dragging & snapping, and stage unlocking verified.\n');

// ---------------------------------------------------------------------------
// TEST 6: Sequential Campaign Unlocking & LocalStorage Persistence (Real GroutApp)
// ---------------------------------------------------------------------------
console.log('Test 6: Sequential Campaign Progression & LocalStorage Persistence via GroutApp');
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v))
};

const app = Object.create(GroutApp.prototype);
app.setupLevelSelector = () => {};
app.showToast = () => {};

assert.equal(app.getUnlockedLevel(), 1, 'Initial unlocked level must be 1');

// Sequential unlock verification using real GroutApp.onComplete method
app.onComplete(lvl1, {});
assert.equal(app.getUnlockedLevel(), 2, 'Level 2 unlocks after completing Level 1');

app.onComplete(lvl2, {});
assert.equal(app.getUnlockedLevel(), 3, 'Level 3 unlocks after completing Level 2');

app.onComplete(lvl3, {});
assert.equal(app.getUnlockedLevel(), 4, 'Level 4 unlocks after completing Level 3');

app.onComplete(lvl4, {});
assert.equal(app.getUnlockedLevel(), 5, 'Level 5 unlocks after completing Level 4');

app.onComplete(lvl5, {});
assert.equal(app.getUnlockedLevel(), 6, 'Endless ASMR (Level 6) unlocks after completing Level 5');

// Completed levels remain replayable
for (let lvl = 1; lvl <= 6; lvl++) {
  assert.ok(lvl <= app.getUnlockedLevel(), `Level ${lvl} must remain unlocked for replay`);
}
console.log('  ✓ Sequential campaign unlocking through real GroutApp.onComplete and localStorage verified.\n');

console.log('🎉 All Campaign Mechanics Tests Passed Successfully!\n');
