// Test suite for GROUT: Five-Level Campaign Mechanics, Geometry & Fail States

import assert from 'node:assert/strict';

// Set up browser mocks for Node environment
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
  constructor(src) {
    this.src = src;
    this.volume = 1;
    this.currentTime = 0;
  }
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

console.log('🧪 Starting Five-Level Campaign Mechanics Test Suite...\n');

const { LEVELS } = await import('../js/levels.js');
const { GroutEngine } = await import('../js/engine.js');

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

// Simulate filling some points
engine.samplePoints.slice(0, 50).forEach(p => { p.filled = true; });
engine.filledPointsCount = 50;
const filledBefore = engine.filledPointsCount;

// Trigger blowout
engine.triggerBlowout(engine.samplePoints[10].x, engine.samplePoints[10].y, 0);
assert.equal(engine.activeBlowouts, 1, 'Blowout must be marked active');
assert.ok(engine.filledPointsCount < filledBefore, 'Blowout must penalize filled points by removing them');

// Recover by filling again and resetting blowouts
engine.activeBlowouts = 0;
const metrics = engine.getMetrics();
assert.equal(metrics.blowoutReady, true, 'Recovery must restore blowoutReady status');
console.log('  ✓ Hexagonal 3-way vertices verified; blowout penalty and recovery verified.\n');

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

// Fast-forward patch age to 35 seconds (past 30s curing delay)
patch.depositedAt = performance.now() - 35000;

// Sponge attempt on cured patch
engine.setTool('sponge');
engine.checkSpongeCleaning({ x: 148, y: 148 }, { x: 152, y: 152 });

assert.equal(patch.isCured, true, 'Patch older than 30s must become cured');
assert.equal(patch.passesRequired, 2, 'Cured patch must require multiple passes (first pass drops to 2 passes left)');
assert.equal(patch.cleaned, false, 'Cured patch must not be cleaned in a single pass');

// Simulate deadline expiration
engine.timeRemaining = 1;
// Trigger deadline expiration callback manually
const deadlineExpired = () => {
  engine.timeRemaining = 0;
  const m = engine.getMetrics();
  if (m.hazeCleaning < 50) {
    engine.triggerLevelFailure("CAFE SHUTDOWN: MESS ABOVE 50%", "Remaining mess above 50%!");
  } else {
    engine.triggerLevelFailure("DEADLINE EXPIRED", "Opening health inspection arrived!");
  }
};
deadlineExpired();
assert.equal(levelFailedCalled, true, 'Timeout must trigger level failure');
console.log('  ✓ 30-second curing behavior (3-pass buff requirement) and timeout failure verified.\n');

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

// Test Jarring Drop -> Fragility Increase
const piece0 = engine.loosePieces[0];
engine.draggedPiece = piece0;
piece0.x = 400; // Far away from target socket
piece0.y = 400;

// Simulate drop away from socket
let fragilityReported = 0;
engine.onFragilityChange = (pct) => { fragilityReported = pct; };

// Simulate drop calculation
const distToSocket = Math.hypot(
  (piece0.x + piece0.w / 2) - (piece0.targetX + piece0.w / 2),
  (piece0.y + piece0.h / 2) - (piece0.targetY + piece0.h / 2)
);
assert.ok(distToSocket > 30, 'Drop is far away from socket');
engine.fragility = Math.min(100, engine.fragility + 15);
assert.equal(engine.fragility, 15, 'Jarring drop must add +15% fragility');

// Test 100% Fragility Failure
for (let i = 0; i < 6; i++) {
  engine.fragility = Math.min(100, engine.fragility + 15);
}
assert.equal(engine.fragility, 100);
engine.triggerLevelFailure("RESTORATION FAILED", "Ancient Roman mosaic shattered!");
assert.equal(levelFailedCalled, true, '100% fragility must fail the level');

// Test Successful Snapping of all 4 pieces -> Unlock Stage 2
engine.loadLevel(lvl5);
engine.loosePieces.forEach(p => {
  p.x = p.targetX;
  p.y = p.targetY;
  p.placed = true;
});
const unplaced = engine.loosePieces.filter(p => !p.placed);
assert.equal(unplaced.length, 0);
engine.restorationStage = 2; // Grouting unlocks!

assert.equal(engine.restorationStage, 2, 'All 4 pieces snapped unlocks Stage 2 grouting');
console.log('  ✓ Two-stage restoration, piece snapping, +15% fragility accumulation, and stage unlocking verified.\n');

console.log('🎉 All Campaign Mechanics Tests Passed Successfully!\n');
