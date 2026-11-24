// Automated End-to-End Viewport & Ergonomics Regression Test Suite
// Exercises the built GROUT application in Chromium/Edge via DevTools Protocol (CDP)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const PORT = 4180;
const ROOT = path.resolve('dist');
const EVIDENCE_DIR = path.resolve('test/evidence');

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.json': 'application/json'
};

let edgeProc;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Test server running at http://127.0.0.1:${PORT}`);
  try {
    await runViewportTests();
  } catch (err) {
    console.error('Test execution error:', err);
    if (edgeProc) {
      try { edgeProc.kill(); } catch { }
    }
    server.close();
    process.exit(1);
  } finally {
    if (edgeProc) {
      try { edgeProc.kill(); } catch { }
    }
    server.close();
  }
});

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(new Error(JSON.stringify(data.error)));
          else cb.resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`CDP command timed out: ${method} (${id})`));
      }, 5000);
      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`  Saved screenshot: ${path.relative(process.cwd(), filePath)}`);
  }
}

async function runViewportTests() {
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const userDataDir = path.join(os.tmpdir(), 'edge-test-profile-' + Date.now());

  edgeProc = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--autoplay-policy=no-user-gesture-required',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=EdgeFre,SyncConfirmation',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    `http://127.0.0.1:${PORT}`
  ]);

  await new Promise(r => setTimeout(r, 2000));

  let versionInfo;
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      versionInfo = await res.json();
      break;
    } catch {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!versionInfo) throw new Error('Could not connect to Edge DevTools port 9222');
  console.log(`Connected to headless browser: ${versionInfo.Browser}\n`);

  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await listRes.json();
  const pageTab = tabs.find(t => t.url && t.url.includes(String(PORT))) || tabs.find(t => t.type === 'page');
  console.log(`Connecting to page tab: ${pageTab.title} (${pageTab.url})`);
  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.init();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1000));

  console.log('=== TEST 1: Advertising & Editorial Fallback Hygiene ===');
  const adLabels = await client.eval(`(() => {
    return Array.from(document.querySelectorAll('.ad-meta-label')).map(el => el.textContent.trim());
  })()`);
  console.log(`Found .ad-meta-label elements:`, adLabels);
  if (adLabels.includes('Advertisement') || adLabels.includes('Sponsored')) {
    throw new Error('Misleading Advertisement/Sponsored label found on fallback editorial content');
  }
  console.log('✔ No misleading Advertisement/Sponsored labels on editorial fallback content.');

  const normalClearance = await client.eval(`(() => {
    const toolDeck = document.querySelector('.tool-deck').getBoundingClientRect();
    const bottomAd = document.querySelector('#bottomAdSlot').getBoundingClientRect();
    return Math.round(bottomAd.top - toolDeck.bottom);
  })()`);
  console.log(`Disabled Ad Clearance above bottom fallback banner: ${normalClearance}px`);
  if (normalClearance > 60) {
    throw new Error(`Unnecessary whitespace reserved when ad is disabled: ${normalClearance}px (must be <= 60px)`);
  }
  console.log('✔ No unnecessary 150px whitespace reserved when ad units are disabled.');

  console.log('\n=== TEST 2: Multi-Viewport Geometry & Layout Assertions ===\n');

  const targetViewports = [
    { name: 'Desktop (1280x800)', w: 1280, h: 800, mobile: false, file: 'desktop-1280x800.png', assertFold: false },
    { name: 'Mobile Portrait (390x844)', w: 390, h: 844, mobile: true, file: 'mobile-portrait-390x844.png', assertFold: true },
    { name: 'Mobile Landscape 1 (844x390)', w: 844, h: 390, mobile: true, file: 'mobile-landscape-844x390.png', assertFold: true },
    { name: 'Mobile Landscape 2 (844x430)', w: 844, h: 430, mobile: true, file: 'mobile-landscape-844x430.png', assertFold: true },
    { name: 'Mobile Landscape 3 (740x390)', w: 740, h: 390, mobile: true, file: 'mobile-landscape-740x390.png', assertFold: true }
  ];

  for (const vp of targetViewports) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.w,
      height: vp.h,
      deviceScaleFactor: vp.mobile ? 2 : 1,
      mobile: vp.mobile
    });
    await client.eval('window.scrollTo(0, 0); window.dispatchEvent(new Event("resize"))');
    await new Promise(r => setTimeout(r, 600));

    const metrics = await client.eval(`(() => {
      const c = document.querySelector('#gameCanvas');
      const td = document.querySelector('.tool-deck');
      const stages = document.querySelector('#levelSelectorRow');
      const hud = document.querySelector('.canvas-hud');
      const sidebar = document.querySelector('.inspection-report');
      const trowel = document.querySelector('#toolTrowel');
      const sponge = document.querySelector('#toolSponge');

      const cRect = c.getBoundingClientRect();
      const tdRect = td.getBoundingClientRect();
      const sRect = stages ? stages.getBoundingClientRect() : null;
      const hRect = hud ? hud.getBoundingClientRect() : null;
      const sbRect = sidebar ? sidebar.getBoundingClientRect() : null;
      const trRect = trowel ? trowel.getBoundingClientRect() : null;
      const spRect = sponge ? sponge.getBoundingClientRect() : null;

      const pills = stages ? Array.from(stages.querySelectorAll('.level-pill')) : [];
      const pillsCount = pills.length;
      const firstPill = pills[0] ? pills[0].getBoundingClientRect() : null;

      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;

      // Overlap checks
      const overlaps = [];
      if (sRect && cRect && sRect.bottom > cRect.top + 1) {
        overlaps.push('stages overlaps canvas vertically');
      }
      if (cRect && tdRect && cRect.bottom > tdRect.top + 1) {
        overlaps.push('canvas overlaps tool deck vertically');
      }
      if (hRect && sRect && hRect.bottom > sRect.top + 1) {
        overlaps.push('HUD overlaps stages ribbon vertically');
      }
      if (sbRect && cRect && sbRect.width > 0 && sbRect.right > cRect.left + 1 && window.innerHeight <= 520) {
        overlaps.push('sidebar overlaps canvas horizontally');
      }
      if (trRect && spRect && trRect.right > spRect.left + 1) {
        overlaps.push('tool trowel overlaps tool sponge');
      }

      return {
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        scrollWidth,
        clientWidth,
        canvas: {
          top: Math.round(cRect.top),
          bottom: Math.round(cRect.bottom),
          left: Math.round(cRect.left),
          right: Math.round(cRect.right),
          width: Math.round(cRect.width),
          height: Math.round(cRect.height),
          visible: cRect.width > 0 && cRect.height > 0
        },
        toolDeck: {
          top: Math.round(tdRect.top),
          bottom: Math.round(tdRect.bottom),
          left: Math.round(tdRect.left),
          right: Math.round(tdRect.right),
          width: Math.round(tdRect.width),
          height: Math.round(tdRect.height),
          visible: tdRect.width > 0 && tdRect.height > 0
        },
        levelSelector: {
          top: sRect ? Math.round(sRect.top) : 0,
          bottom: sRect ? Math.round(sRect.bottom) : 0,
          width: sRect ? Math.round(sRect.width) : 0,
          height: sRect ? Math.round(sRect.height) : 0,
          visible: sRect ? sRect.width > 0 && sRect.height > 0 : false,
          pillsCount,
          firstPillWidth: firstPill ? Math.round(firstPill.width) : 0
        },
        overlaps
      };
    })()`);

    console.log(`Viewport: ${vp.name}`);
    console.log(`  Canvas:         top=${metrics.canvas.top}px, bottom=${metrics.canvas.bottom}px, width=${metrics.canvas.width}px, height=${metrics.canvas.height}px (visible: ${metrics.canvas.visible})`);
    console.log(`  Level Selector: top=${metrics.levelSelector.top}px, bottom=${metrics.levelSelector.bottom}px, pills=${metrics.levelSelector.pillsCount} (visible: ${metrics.levelSelector.visible})`);
    console.log(`  Tool Deck:      top=${metrics.toolDeck.top}px, bottom=${metrics.toolDeck.bottom}px, width=${metrics.toolDeck.width}px, height=${metrics.toolDeck.height}px (visible: ${metrics.toolDeck.visible})`);
    console.log(`  Scroll Width:   ${metrics.scrollWidth}px vs Viewport Width: ${vp.w}px`);
    console.log(`  Overlaps:       ${metrics.overlaps.length === 0 ? 'None ✔' : metrics.overlaps.join(', ')}`);

    // Genuinely Assert Requirements for Mobile Viewports
    if (vp.assertFold) {
      if (!metrics.canvas.visible || metrics.canvas.width <= 0 || metrics.canvas.height <= 0) {
        throw new Error(`[Assertion Failed in ${vp.name}] Canvas is not visible or has zero dimensions: ${metrics.canvas.width}x${metrics.canvas.height}`);
      }
      if (metrics.toolDeck.bottom > vp.h) {
        throw new Error(`[Assertion Failed in ${vp.name}] Tool deck bottom (${metrics.toolDeck.bottom}px) exceeds viewport height (${vp.h}px) by ${metrics.toolDeck.bottom - vp.h}px`);
      }
      if (!metrics.levelSelector.visible || metrics.levelSelector.pillsCount < 6) {
        throw new Error(`[Assertion Failed in ${vp.name}] Level selector is not accessible or missing stage pills (found ${metrics.levelSelector.pillsCount})`);
      }
      if (metrics.scrollWidth > vp.w + 1) {
        throw new Error(`[Assertion Failed in ${vp.name}] Horizontal document overflow detected: scrollWidth (${metrics.scrollWidth}px) > viewport width (${vp.w}px)`);
      }
      if (metrics.overlaps.length > 0) {
        throw new Error(`[Assertion Failed in ${vp.name}] Control overlaps detected: ${metrics.overlaps.join('; ')}`);
      }
      console.log(`  ✔ ALL ASSERTIONS PASSED FOR ${vp.name}!`);
    }

    await client.screenshot(path.join(EVIDENCE_DIR, vp.file));
    console.log('');
  }

  console.log('=== TEST 3A: Gameplay Mouse Drag Interaction ===');
  // Back to desktop for mouse stroke
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.eval('window.scrollTo(0, 0); window.dispatchEvent(new Event("resize"))');
  await new Promise(r => setTimeout(r, 400));

  // Reset to clean Level 1
  await client.eval('document.getElementById("btnResetLevel").click()');
  await new Promise(r => setTimeout(r, 200));

  const mouseInitial = await client.eval(`(() => {
    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount
    };
  })()`);
  console.log(`Initial state before mouse stroke: progress=${mouseInitial.progress}, strokes=${mouseInitial.strokes}, filledPoints=${mouseInitial.filledPoints}`);
  if (mouseInitial.progress !== '0%' || mouseInitial.filledPoints !== 0) {
    throw new Error('Canvas was not reset to 0% before mouse interaction test');
  }

  const mouseDragResult = await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const r = canvas.getBoundingClientRect();
    const startX = r.left + r.width * 0.15;
    const startY = r.top + r.height * 0.5;
    const endX = r.left + r.width * 0.85;
    const endY = r.top + r.height * 0.5;

    // 1. Trowel drag using real MouseEvents
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    for (let i = 1; i <= 8; i++) {
      const stepX = startX + (endX - startX) * (i / 8);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: stepX, clientY: startY, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));

    const afterTrowelGrout = window.groutApp.engine.getMetrics().groutCoverage;
    const afterTrowelHaze = window.groutApp.engine.totalHazeDeposited;

    // 2. Sponge buffing via DOM events
    const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
    spongeBtn.click();
    const activeTool = window.groutApp.engine.tool;

    // Buff adjacent hazy tile face with MouseEvents (offset 22px above joint)
    const buffStartY = startY - 22;
    const buffEndY = endY - 22;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: buffStartY, bubbles: true }));
    for (let i = 1; i <= 8; i++) {
      const stepX = startX + (endX - startX) * (i / 8);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: stepX, clientY: buffStartY, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: buffEndY, bubbles: true }));

    const afterBuffMetrics = window.groutApp.engine.getMetrics();

    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount,
      groutCoverage: afterTrowelGrout,
      totalHaze: afterTrowelHaze,
      activeTool: activeTool,
      cleanedHaze: afterBuffMetrics.cleanedHaze,
      hazeCleaning: afterBuffMetrics.hazeCleaning,
      groutAfterBuff: afterBuffMetrics.groutCoverage
    };
  })()`);

  console.log(`Mouse Drag Result: Grout=${mouseDragResult.groutCoverage}%, TotalHaze=${mouseDragResult.totalHaze}, Tool=${mouseDragResult.activeTool}, CleanedHaze=${mouseDragResult.cleanedHaze}, CleanPct=${mouseDragResult.hazeCleaning}%`);
  if (mouseDragResult.groutCoverage === 0 || mouseDragResult.totalHaze === 0) {
    throw new Error(`Mouse trowel drag failed: coverage=${mouseDragResult.groutCoverage}%, totalHaze=${mouseDragResult.totalHaze}`);
  }
  if (mouseDragResult.activeTool !== 'sponge') {
    throw new Error(`Sponge button click failed: activeTool=${mouseDragResult.activeTool}`);
  }
  if (mouseDragResult.cleanedHaze === 0 || mouseDragResult.hazeCleaning === 0) {
    throw new Error(`Mouse sponge buffing failed: cleanedHaze=${mouseDragResult.cleanedHaze}, cleanPct=${mouseDragResult.hazeCleaning}%`);
  }
  if (mouseDragResult.groutAfterBuff < mouseDragResult.groutCoverage) {
    throw new Error(`Sponge reduced grout coverage: ${mouseDragResult.groutAfterBuff}% < ${mouseDragResult.groutCoverage}%`);
  }
  console.log('✔ Genuine Mouse drag trowel and sponge buffing interactions verified!');
  await client.screenshot(path.join(EVIDENCE_DIR, 'gameplay-mouse-filled.png'));

  console.log('\n=== TEST 3B: Genuine Touch Drag Interaction ===');
  // Emulate touch mobile device
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await client.eval('window.scrollTo(0, 0); window.dispatchEvent(new Event("resize"))');
  await new Promise(r => setTimeout(r, 400));

  // Reset to clean Level 1
  await client.eval('document.getElementById("btnResetLevel").click()');
  await new Promise(r => setTimeout(r, 200));

  const touchInitial = await client.eval(`(() => {
    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount
    };
  })()`);
  console.log(`Initial state before touch stroke: progress=${touchInitial.progress}, strokes=${touchInitial.strokes}, filledPoints=${touchInitial.filledPoints}`);
  if (touchInitial.progress !== '0%' || touchInitial.filledPoints !== 0) {
    throw new Error('Canvas was not reset to 0% before touch interaction test');
  }

  const touchDragResult = await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const canvas = document.querySelector('#gameCanvas');
    const r = canvas.getBoundingClientRect();
    const startX = r.left + r.width * 0.15;
    const startY = r.top + r.height * 0.5;
    const endX = r.left + r.width * 0.85;
    const endY = r.top + r.height * 0.5;

    function createTouch(x, y) {
      return new Touch({
        identifier: Math.floor(Math.random() * 100000),
        target: canvas,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        radiusX: 12,
        radiusY: 12,
        rotationAngle: 0,
        force: 1
      });
    }

    // 1. Trowel touch drag
    const tStart = createTouch(startX, startY);
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [tStart],
      targetTouches: [tStart],
      changedTouches: [tStart]
    }));

    for (let i = 1; i <= 8; i++) {
      const stepX = startX + (endX - startX) * (i / 8);
      const tMove = createTouch(stepX, startY);
      canvas.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [tMove],
        targetTouches: [tMove],
        changedTouches: [tMove]
      }));
    }

    const tEnd = createTouch(endX, endY);
    canvas.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [tEnd]
    }));

    const afterTrowelGrout = window.groutApp.engine.getMetrics().groutCoverage;
    const afterTrowelHaze = window.groutApp.engine.totalHazeDeposited;

    // 2. Sponge touch drag
    const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
    spongeBtn.click();
    const activeTool = window.groutApp.engine.tool;

    const buffStartY = startY - 22;
    const buffEndY = endY - 22;
    const tbStart = createTouch(startX, buffStartY);
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [tbStart],
      targetTouches: [tbStart],
      changedTouches: [tbStart]
    }));

    for (let i = 1; i <= 8; i++) {
      const stepX = startX + (endX - startX) * (i / 8);
      const tbMove = createTouch(stepX, buffStartY);
      canvas.dispatchEvent(new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [tbMove],
        targetTouches: [tbMove],
        changedTouches: [tbMove]
      }));
    }

    const tbEnd = createTouch(endX, buffEndY);
    canvas.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [tbEnd]
    }));

    const afterBuffMetrics = window.groutApp.engine.getMetrics();

    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount,
      groutCoverage: afterTrowelGrout,
      totalHaze: afterTrowelHaze,
      activeTool: activeTool,
      cleanedHaze: afterBuffMetrics.cleanedHaze,
      hazeCleaning: afterBuffMetrics.hazeCleaning,
      groutAfterBuff: afterBuffMetrics.groutCoverage
    };
  })()`);

  console.log(`Touch Drag Result: Grout=${touchDragResult.groutCoverage}%, TotalHaze=${touchDragResult.totalHaze}, Tool=${touchDragResult.activeTool}, CleanedHaze=${touchDragResult.cleanedHaze}, CleanPct=${touchDragResult.hazeCleaning}%`);
  if (touchDragResult.groutCoverage === 0 || touchDragResult.totalHaze === 0) {
    throw new Error(`Touch trowel drag failed: coverage=${touchDragResult.groutCoverage}%, totalHaze=${touchDragResult.totalHaze}`);
  }
  if (touchDragResult.activeTool !== 'sponge') {
    throw new Error(`Touch sponge button click failed: activeTool=${touchDragResult.activeTool}`);
  }
  if (touchDragResult.cleanedHaze === 0 || touchDragResult.hazeCleaning === 0) {
    throw new Error(`Touch sponge buffing failed: cleanedHaze=${touchDragResult.cleanedHaze}, cleanPct=${touchDragResult.hazeCleaning}%`);
  }
  if (touchDragResult.groutAfterBuff < touchDragResult.groutCoverage) {
    throw new Error(`Touch sponge reduced grout coverage: ${touchDragResult.groutAfterBuff}% < ${touchDragResult.groutCoverage}%`);
  }
  console.log('✔ Genuine Touch drag trowel and sponge buffing interactions verified!');
  await client.screenshot(path.join(EVIDENCE_DIR, 'gameplay-touch-filled.png'));

  console.log('\n=== TEST 4: Phase 2 Two-Tool Workflow & Visual Progression Evidence ===');
  // Emulate spacious desktop for clear visual evidence
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.eval('window.scrollTo(0, 0); window.dispatchEvent(new Event("resize"))');
  await new Promise(r => setTimeout(r, 400));

  // Step 0: Genuinely verify initial clean browser profile & sequential level locking
  console.log('\n--- Verifying Initial Clean State & Sequential Level Locks ---');
  const initialProgressionCheck = await client.eval(`(() => {
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    const unlockedPills = pills.filter(p => !p.classList.contains('locked'));
    const lockedPills = pills.filter(p => p.classList.contains('locked'));

    // Try clicking locked Level 2 pill
    if (pills[1]) pills[1].click();
    const currentLvlAfterClick = window.groutApp.currentLevelIndex;

    return {
      stored,
      totalPills: pills.length,
      unlockedCount: unlockedPills.length,
      lockedCount: lockedPills.length,
      level1Unlocked: pills[0] && !pills[0].classList.contains('locked') && !pills[0].disabled,
      level2Locked: pills[1] && pills[1].classList.contains('locked') && pills[1].disabled,
      level6Locked: pills[5] && pills[5].classList.contains('locked') && pills[5].disabled,
      currentLvlAfterClick
    };
  })()`);
  console.log(`Initial Locks: Stored=${initialProgressionCheck.stored}, Total=${initialProgressionCheck.totalPills}, Unlocked=${initialProgressionCheck.unlockedCount}, Locked=${initialProgressionCheck.lockedCount}`);
  if (initialProgressionCheck.unlockedCount !== 1 || initialProgressionCheck.lockedCount !== 5 || !initialProgressionCheck.level1Unlocked || !initialProgressionCheck.level2Locked) {
    throw new Error('Initial state assertion failed: only Level 1 must be unlocked initially: ' + JSON.stringify(initialProgressionCheck));
  }
  if (initialProgressionCheck.currentLvlAfterClick !== 0) {
    throw new Error('Clicking locked Level 2 loaded level unexpectedly: index=' + initialProgressionCheck.currentLvlAfterClick);
  }
  console.log('✔ Verified initial clean state: Only Level 1 is accessible, Levels 2..6 are strictly locked.');

  // Step 1: Empty joints before application
  await client.eval('document.getElementById("btnResetLevel").click()');
  await new Promise(r => setTimeout(r, 300));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-1-empty-joints.png'));
  console.log('  Saved Step 1 Screenshot: test/evidence/phase-2-1-empty-joints.png');

  // Step 2: Joint filled with grout + haze visible on surrounding tiles (driven by real DOM MouseEvents)
  await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const engine = window.groutApp.engine;
    const r = canvas.getBoundingClientRect();
    const toX = x => r.left + x * (r.width / engine.width);
    const toY = y => r.top + y * (r.height / engine.height);
    const gap0 = engine.gaps[0];
    const startX = toX(gap0.x1);
    const startY = toY(gap0.y1);
    const endX = toX(gap0.x2);
    const endY = toY(gap0.y2);

    document.getElementById('toolTrowel').click();
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    for (let i = 1; i <= 15; i++) {
      const stepX = startX + (endX - startX) * (i / 15);
      const stepY = startY + (endY - startY) * (i / 15);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: stepX, clientY: stepY, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 300));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-2-joint-filled-haze-visible.png'));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-2-partially-filled.png'));
  console.log('  Saved Step 2 Screenshot: test/evidence/phase-2-2-joint-filled-haze-visible.png');

  // Step 3: Partially cleaned haze with sponge (driven by real DOM MouseEvents)
  await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const engine = window.groutApp.engine;
    const r = canvas.getBoundingClientRect();
    const toX = x => r.left + x * (r.width / engine.width);
    const toY = y => r.top + y * (r.height / engine.height);
    const gap0 = engine.gaps[0];
    const startX = toX(gap0.x1);
    const startY = toY(gap0.y1 - 20); // Tile face above gap 0
    const endX = toX(gap0.x1 + (gap0.x2 - gap0.x1) * 0.5);
    const endY = startY;

    document.querySelector('#spongeToolBtn, #toolSponge').click();
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    for (let i = 1; i <= 10; i++) {
      const stepX = startX + (endX - startX) * (i / 10);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: stepX, clientY: startY, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 300));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-3-partially-cleaned-haze.png'));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-4-sponge-cleaning-progress.png'));
  console.log('  Saved Step 3 Screenshot: test/evidence/phase-2-3-partially-cleaned-haze.png');

  // Step 4: Fully filled and cleaned final result (completes Level 1 through real gameplay)
  await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const engine = window.groutApp.engine;
    const r = canvas.getBoundingClientRect();
    const toX = x => r.left + x * (r.width / engine.width);
    const toY = y => r.top + y * (r.height / engine.height);

    // Fill all remaining gaps with real DOM MouseEvents
    document.getElementById('toolTrowel').click();
    for (const gap of engine.gaps) {
      const sx = toX(gap.x1);
      const sy = toY(gap.y1);
      const ex = toX(gap.x2);
      const ey = toY(gap.y2);
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, bubbles: true }));
      for (let i = 1; i <= 12; i++) {
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          clientX: sx + (ex - sx) * (i / 12),
          clientY: sy + (ey - sy) * (i / 12),
          bubbles: true
        }));
      }
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: ex, clientY: ey, bubbles: true }));
    }

    // Clean all haze with sponge via real DOM MouseEvents across patches
    document.querySelector('#spongeToolBtn, #toolSponge').click();
    for (let pass = 0; pass < 2; pass++) {
      for (const p of engine.hazePatches) {
        if (p.cleaned) continue;
        const px = toX(p.u * engine.width);
        const py = toY(p.v * engine.height);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: px - 12, clientY: py, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: px, clientY: py - 10, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: px + 12, clientY: py, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: px, clientY: py + 10, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: px + 12, clientY: py + 10, bubbles: true }));
      }
    }
  })()`);
  await new Promise(r => setTimeout(r, 400));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-4-fully-cleaned-inspected.png'));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-5-fully-filled-cleaned.png'));
  console.log('  Saved Step 4 Screenshot: test/evidence/phase-2-4-fully-cleaned-inspected.png');

  const finalCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      isComplete: m.isComplete,
      engineComplete: window.groutApp.engine.isCompleted,
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level2Unlocked: !pills[1].classList.contains('locked'),
      level3Locked: pills[2].classList.contains('locked')
    };
  })()`);
  console.log(`Final Level 1 State: Grout=${finalCheck.groutCoverage}%, Clean=${finalCheck.hazeCleaning}%, isComplete=${finalCheck.isComplete}, StoredUnlocked=${finalCheck.stored}`);
  if (!finalCheck.isComplete || !finalCheck.engineComplete || finalCheck.stored !== '2' || !finalCheck.level2Unlocked || !finalCheck.level3Locked) {
    throw new Error('Level 1 completion failed to unlock Level 2: ' + JSON.stringify(finalCheck));
  }
  console.log('✔ Full two-phase workflow verified in real browser DOM; Level 2 unlocked, Level 3 remains locked!');

  // Verify Page Reload Persistence via CDP
  console.log('\n--- Verifying Sequential Persistence on Page Reload via CDP ---');
  await client.send('Page.reload');
  await new Promise(r => setTimeout(r, 800));

  const reloadCheck = await client.eval(`(() => {
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level1Unlocked: !pills[0].classList.contains('locked'),
      level2Unlocked: !pills[1].classList.contains('locked'),
      level3Locked: pills[2].classList.contains('locked') && pills[2].disabled,
      level6Locked: pills[5].classList.contains('locked') && pills[5].disabled
    };
  })()`);
  console.log(`After Page Reload: Stored=${reloadCheck.stored}, Unlocked=${reloadCheck.unlockedCount}, Locked=${reloadCheck.lockedCount}`);
  if (reloadCheck.stored !== '2' || reloadCheck.unlockedCount !== 2 || reloadCheck.lockedCount !== 4 || !reloadCheck.level2Unlocked || !reloadCheck.level3Locked) {
    throw new Error('Page reload persistence failed: ' + JSON.stringify(reloadCheck));
  }
  console.log('✔ Reload persistence verified: Level 2 remains unlocked, Level 3 remains strictly locked.');

  console.log('\n=== TEST 5: Authentic Soundboard & Five-Level Campaign Verification ===');

  // Step 1: Open and verify redesigned Soundboard Modal with 4 categories
  await client.eval('document.getElementById("btnOpenSoundboard").click()');
  await new Promise(r => setTimeout(r, 400));

  const soundboardState = await client.eval(`(() => {
    const modal = document.getElementById('soundboardModal');
    const chips = Array.from(document.querySelectorAll('.sound-chip'));
    const awaitingChips = document.querySelectorAll('.chip-status-pill.awaiting, .chip-status-pill.slot');
    return {
      isOpen: modal.classList.contains('active'),
      totalChips: chips.length,
      awaitingCount: awaitingChips.length
    };
  })()`);

  console.log(`Soundboard State: Open=${soundboardState.isOpen}, Chips=${soundboardState.totalChips}, Awaiting=${soundboardState.awaitingCount}`);
  if (!soundboardState.isOpen || soundboardState.totalChips !== 8) {
    throw new Error(`Soundboard modal validation failed: ${JSON.stringify(soundboardState)}`);
  }

  // Click signature meme sound chip and verify playing visual state
  await client.eval(`(() => {
    const chip = document.querySelector('.sound-chip[data-sound="intro_grout_bhar_denge"]');
    if (chip) chip.click();
  })()`);
  await new Promise(r => setTimeout(r, 200));

  const playingState = await client.eval(`(() => {
    const chip = document.querySelector('.sound-chip[data-sound="intro_grout_bhar_denge"]');
    const icon = chip.querySelector('.chip-play-icon');
    return {
      isPlaying: chip.classList.contains('is-playing'),
      iconText: icon ? icon.textContent : ''
    };
  })()`);
  console.log(`Playing Chip State: isPlaying=${playingState.isPlaying}, icon='${playingState.iconText}'`);
  await client.screenshot(path.join(EVIDENCE_DIR, 'soundboard-4-categories.png'));
  console.log('  Saved Screenshot: test/evidence/soundboard-4-categories.png');

  // Close Soundboard Modal
  await client.eval('document.getElementById("btnCloseSoundboard").click()');
  await new Promise(r => setTimeout(r, 300));

  // Inject DOM Helper Functions for Authentic Gameplay Interactions
  await client.eval(`(() => {
    window.__testHelpers = {
      toClient: (x, y) => {
        const canvas = window.groutApp.canvas;
        const engine = window.groutApp.engine;
        const r = canvas.getBoundingClientRect();
        return {
          clientX: r.left + x * (r.width / engine.width),
          clientY: r.top + y * (r.height / engine.height)
        };
      },
      strokeLine: (x1, y1, x2, y2, steps = 14) => {
        const canvas = window.groutApp.canvas;
        const p1 = window.__testHelpers.toClient(x1, y1);
        const p2 = window.__testHelpers.toClient(x2, y2);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: p1.clientX, clientY: p1.clientY, bubbles: true }));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          canvas.dispatchEvent(new MouseEvent('mousemove', {
            clientX: p1.clientX + (p2.clientX - p1.clientX) * t,
            clientY: p1.clientY + (p2.clientY - p1.clientY) * t,
            bubbles: true
          }));
        }
        canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: p2.clientX, clientY: p2.clientY, bubbles: true }));
      },
      buffPoint: (px, py) => {
        const canvas = window.groutApp.canvas;
        const p = window.__testHelpers.toClient(px, py);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: p.clientX, clientY: p.clientY, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: p.clientX + 4, clientY: p.clientY, bubbles: true }));
        canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: p.clientX + 4, clientY: p.clientY, bubbles: true }));
      },
      strokeAllGaps: (filterFn) => {
        const engine = window.groutApp.engine;
        document.getElementById('toolTrowel').click();
        const gaps = filterFn ? engine.gaps.filter(filterFn) : engine.gaps;
        for (const gap of gaps) {
          window.__testHelpers.strokeLine(gap.x1, gap.y1, gap.x2, gap.y2, 14);
          window.__testHelpers.strokeLine(gap.x2, gap.y2, gap.x1, gap.y1, 14);
        }
      },
      buffAllHaze: () => {
        const engine = window.groutApp.engine;
        const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
        if (spongeBtn) spongeBtn.click();
        for (let pass = 0; pass < 3; pass++) {
          const uncleaned = engine.hazePatches.filter(p => !p.cleaned);
          if (uncleaned.length === 0) break;
          for (const p of uncleaned) {
            window.__testHelpers.buffPoint(p.u * engine.width, p.v * engine.height);
          }
        }
      }
    };
  })()`);

  // Step 2: Level 2 The Hexagon Bathroom Floor Verification & Blowout Mechanics
  console.log('\n--- Verifying Level 2: Hexagon Bathroom Floor & Blowout Mechanics ---');
  // Load Level 2 by clicking the real unlocked Level 2 pill in the UI! (Zero direct unlockLevel() calls)
  await client.eval('document.querySelectorAll(".level-pill")[1].click()');
  await new Promise(r => setTimeout(r, 400));

  const level2State = await client.eval(`(() => {
    const lvlNum = document.getElementById('levelNumber').textContent;
    const hasBlowout = window.groutApp.engine.currentLevel.hasBlowoutMechanic;
    const gapsCount = window.groutApp.engine.gaps.length;
    return { lvlNum, hasBlowout, gapsCount };
  })()`);
  console.log(`Level 2 State: Header="${level2State.lvlNum}", hasBlowout=${level2State.hasBlowout}, gaps=${level2State.gapsCount}`);
  if (!level2State.hasBlowout || level2State.gapsCount < 12) {
    throw new Error(`Level 2 Hexagon validation failed: ${JSON.stringify(level2State)}`);
  }

  // Real Player Interaction: Trowel grout onto gap 0 to seal it
  await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const gap0 = window.groutApp.engine.gaps[0];
    window.__testHelpers.strokeLine(gap0.x1, gap0.y1, gap0.x2, gap0.y2, 12);
  })()`);
  await new Promise(r => setTimeout(r, 200));

  // Real Player Interaction: Switch to sponge and scrub aggressively over sealed joint -> Triggers Blowout!
  await client.eval(`(() => {
    const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
    if (spongeBtn) spongeBtn.click();
    const gap0 = window.groutApp.engine.gaps[0];
    const p1 = window.__testHelpers.toClient(gap0.x1, gap0.y1);
    const p2 = window.__testHelpers.toClient(gap0.x2, gap0.y2);
    const canvas = window.groutApp.canvas;
    for (let pass = 0; pass < 6; pass++) {
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: p1.clientX, clientY: p1.clientY, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: p2.clientX, clientY: p2.clientY, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: p2.clientX, clientY: p2.clientY, bubbles: true }));
    }
  })()`);
  await new Promise(r => setTimeout(r, 200));

  const blowoutEval = await client.eval(`(() => {
    return {
      activeBlowouts: window.groutApp.engine.activeBlowouts,
      blowoutMarksCount: window.groutApp.engine.blowoutMarks.length,
      blowoutReady: window.groutApp.engine.getMetrics().blowoutReady,
      isComplete: window.groutApp.engine.getMetrics().isComplete
    };
  })()`);
  console.log(`Level 2 Blowout Test: activeBlowouts=${blowoutEval.activeBlowouts}, marks=${blowoutEval.blowoutMarksCount}, ready=${blowoutEval.blowoutReady}, isComplete=${blowoutEval.isComplete}`);
  if (blowoutEval.activeBlowouts < 1 || blowoutEval.blowoutReady || blowoutEval.isComplete) {
    throw new Error('Aggressive sponge scrub did not trigger Level 2 blowout or completion was not blocked: ' + JSON.stringify(blowoutEval));
  }

  // Real Player Interaction: Switch back to trowel and repair the damaged points!
  await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const engine = window.groutApp.engine;
    const b = engine.activeBlowoutsList[0];
    if (b) {
      const pts = Array.from(b.damagedPoints);
      pts.forEach(pt => {
        window.__testHelpers.buffPoint(pt.x, pt.y);
      });
    }
  })()`);
  await new Promise(r => setTimeout(r, 200));

  const repairEval = await client.eval(`(() => {
    return {
      activeBlowouts: window.groutApp.engine.activeBlowouts,
      blowoutReady: window.groutApp.engine.getMetrics().blowoutReady
    };
  })()`);
  console.log(`Level 2 Blowout Repair: activeBlowouts=${repairEval.activeBlowouts}, ready=${repairEval.blowoutReady}`);
  if (repairEval.activeBlowouts !== 0 || !repairEval.blowoutReady) {
    throw new Error('Re-troweling damaged joint did not repair blowout: ' + JSON.stringify(repairEval));
  }

  // Complete Level 2 through genuine gameplay: grout all gaps, buff all haze
  await client.eval(`(() => {
    window.__testHelpers.strokeAllGaps();
    window.__testHelpers.buffAllHaze();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const level2CompletionCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      isComplete: m.isComplete,
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level3Unlocked: !pills[2].classList.contains('locked'),
      level4Locked: pills[3].classList.contains('locked')
    };
  })()`);
  console.log(`Level 2 Completion: isComplete=${level2CompletionCheck.isComplete}, Grout=${level2CompletionCheck.groutCoverage}%, Clean=${level2CompletionCheck.hazeCleaning}%, Stored=${level2CompletionCheck.stored}`);
  if (!level2CompletionCheck.isComplete || level2CompletionCheck.stored !== '3' || !level2CompletionCheck.level3Unlocked || !level2CompletionCheck.level4Locked) {
    throw new Error('Level 2 genuine completion failed to unlock Level 3: ' + JSON.stringify(level2CompletionCheck));
  }
  console.log('✔ Level 2 completed via real gameplay; Level 3 unlocked, Level 4 remains locked.');
  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-2-hexagon.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-2-hexagon.png');

  // Step 2.5: Campaign Replayability Verification
  console.log('\n--- Verifying Campaign Replayability of Completed Levels ---');
  // Replay Level 1
  await client.eval('document.querySelectorAll(".level-pill")[0].click()');
  await new Promise(r => setTimeout(r, 300));
  const replayLvl1 = await client.eval('document.getElementById("levelNumber").textContent');
  if (!replayLvl1.includes('STAGE 1')) throw new Error('Failed to replay Level 1: ' + replayLvl1);

  // Replay Level 2
  await client.eval('document.querySelectorAll(".level-pill")[1].click()');
  await new Promise(r => setTimeout(r, 300));
  const replayLvl2 = await client.eval('document.getElementById("levelNumber").textContent');
  if (!replayLvl2.includes('STAGE 2')) throw new Error('Failed to replay Level 2: ' + replayLvl2);

  // Advance to newly unlocked Level 3
  await client.eval('document.querySelectorAll(".level-pill")[2].click()');
  await new Promise(r => setTimeout(r, 400));
  const lvl3Header = await client.eval('document.getElementById("levelNumber").textContent');
  if (!lvl3Header.includes('STAGE 3')) throw new Error('Failed to load Level 3: ' + lvl3Header);
  console.log('✔ Replayability verified: completed Levels 1 and 2 can be replayed freely without locking.');

  // Step 3: Level 3 The Moroccan Mosaic & Defect Failure Modal
  console.log('\n--- Verifying Level 3: Moroccan Mosaic & Color Matching Modal ---');
  const level3State = await client.eval(`(() => {
    const lvlNum = document.getElementById('levelNumber').textContent;
    const hasColorMatching = window.groutApp.engine.currentLevel.hasColorMatching;
    return { lvlNum, hasColorMatching };
  })()`);
  console.log(`Level 3 State: Header="${level3State.lvlNum}", hasColorMatching=${level3State.hasColorMatching}`);
  if (!level3State.hasColorMatching) {
    throw new Error(`Level 3 Moroccan Mosaic validation failed: ${JSON.stringify(level3State)}`);
  }

  // Real Player Interaction: Click Terracotta color swatch in palette deck
  await client.eval(`(() => {
    const swatches = document.querySelectorAll('.swatch-btn');
    if (swatches.length > 1) swatches[1].click(); // Select Burnt Terracotta
  })()`);
  await new Promise(r => setTimeout(r, 200));

  // Trowel stroke on Star section gap (which strictly requires Chalk Limestone White) -> triggers failure modal!
  await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const starGap = window.groutApp.engine.gaps.find(g => g.sectionId === 'star');
    if (starGap) {
      window.__testHelpers.strokeLine(starGap.x1, starGap.y1, starGap.x2, starGap.y2, 10);
    }
  })()`);
  await new Promise(r => setTimeout(r, 300));

  const failureState = await client.eval(`(() => {
    const modal = document.getElementById('failureModal');
    const title = document.getElementById('failureTitle').textContent;
    return {
      isOpen: modal.classList.contains('active'),
      title
    };
  })()`);
  console.log(`Failure Modal State: Open=${failureState.isOpen}, Title="${failureState.title}"`);
  if (!failureState.isOpen) {
    throw new Error('Failure modal did not open upon wrong color trowel application');
  }
  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-3-failure-modal.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-3-failure-modal.png');

  // Dismiss Failure Modal via Retry button
  await client.eval('document.getElementById("btnRetryLevel").click()');
  await new Promise(r => setTimeout(r, 300));

  // Genuinely complete Level 3: White on star gaps, Terracotta on cross gaps, buff haze
  await client.eval(`(() => {
    const swatches = Array.from(document.querySelectorAll('.swatch-btn'));
    const whiteSwatch = swatches.find(s => s.title && s.title.includes('White')) || swatches[2];
    const terraSwatch = swatches.find(s => s.title && s.title.includes('Terracotta')) || swatches[1];

    // Select White swatch for star gaps
    if (whiteSwatch) whiteSwatch.click();
    window.__testHelpers.strokeAllGaps(g => g.sectionId === 'star');

    // Select Terracotta swatch for cross gaps
    if (terraSwatch) terraSwatch.click();
    window.__testHelpers.strokeAllGaps(g => g.sectionId === 'cross');

    // Clean haze
    window.__testHelpers.buffAllHaze();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const level3CompletionCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      isComplete: m.isComplete,
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level4Unlocked: !pills[3].classList.contains('locked'),
      level5Locked: pills[4].classList.contains('locked')
    };
  })()`);
  console.log(`Level 3 Completion: isComplete=${level3CompletionCheck.isComplete}, Grout=${level3CompletionCheck.groutCoverage}%, Clean=${level3CompletionCheck.hazeCleaning}%, Stored=${level3CompletionCheck.stored}`);
  if (!level3CompletionCheck.isComplete || level3CompletionCheck.stored !== '4' || !level3CompletionCheck.level4Unlocked || !level3CompletionCheck.level5Locked) {
    throw new Error('Level 3 genuine completion failed to unlock Level 4: ' + JSON.stringify(level3CompletionCheck));
  }
  console.log('✔ Level 3 completed via real gameplay; Level 4 unlocked, Level 5 remains locked.');

  // Step 4: Level 4 The Speed-Run Café Counter (Curing Timer)
  console.log('\n--- Verifying Level 4: Speed-Run Café Counter & Timer HUD ---');
  // Load Level 4 by clicking the real Level 4 pill in the UI! (Zero unlockLevel() call)
  await client.eval('document.querySelectorAll(".level-pill")[3].click()');
  await new Promise(r => setTimeout(r, 400));

  const level4State = await client.eval(`(() => {
    const lvlNum = document.getElementById('levelNumber').textContent;
    const timerPill = document.getElementById('levelTimerPill');
    const timerVal = document.getElementById('timerValue').textContent;
    const timerVisible = timerPill && !timerPill.classList.contains('hidden');
    return { lvlNum, timerVisible, timerVal };
  })()`);
  console.log(`Level 4 State: Header="${level4State.lvlNum}", timerVisible=${level4State.timerVisible}, val="${level4State.timerVal}"`);
  if (!level4State.timerVisible) {
    throw new Error('Level 4 Countdown Timer pill was not visible in HUD');
  }

  // Trowel gap 0 with real MouseEvents to deposit fresh haze
  await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const gap0 = window.groutApp.engine.gaps[0];
    window.__testHelpers.strokeLine(gap0.x1, gap0.y1, gap0.x2, gap0.y2, 12);
  })()`);
  await new Promise(r => setTimeout(r, 200));

  // Verify fresh haze cleans in 1 pass
  const freshBuffResult = await client.eval(`(() => {
    const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
    if (spongeBtn) spongeBtn.click();
    const patch0 = window.groutApp.engine.hazePatches[0];
    if (!patch0) return { error: 'No haze patch found' };
    window.__testHelpers.buffPoint(patch0.u * window.groutApp.engine.width, patch0.v * window.groutApp.engine.height);
    return {
      cleaned: patch0.cleaned,
      isCured: patch0.isCured
    };
  })()`);
  console.log(`Fresh Haze Cleaning: cleaned=${freshBuffResult.cleaned}, isCured=${freshBuffResult.isCured}`);
  if (!freshBuffResult.cleaned || freshBuffResult.isCured) {
    throw new Error('Fresh haze did not clean in 1 pass before curing delay: ' + JSON.stringify(freshBuffResult));
  }

  // Trowel gap 0 again to deposit new haze for curing test
  await client.eval(`(() => {
    document.getElementById('toolTrowel').click();
    const gap0 = window.groutApp.engine.gaps[0];
    window.__testHelpers.strokeLine(gap0.x1, gap0.y1, gap0.x2, gap0.y2, 12);
  })()`);
  await new Promise(r => setTimeout(r, 200));

  // Advance time by 35 seconds to exceed 30s curing threshold
  console.log('Advancing engine clock by 35,000ms past 30s curing threshold...');
  await client.eval('window.groutApp.engine.advanceTime(35000)');

  // Sponge pass 1 over cured haze -> must require multiple passes (drops to 2 passes left, not cleaned)
  const curedPass1 = await client.eval(`(() => {
    const spongeBtn = document.querySelector('#spongeToolBtn, #toolSponge');
    if (spongeBtn) spongeBtn.click();
    const uncleaned = window.groutApp.engine.hazePatches.find(p => !p.cleaned);
    if (!uncleaned) return { error: 'No uncleaned patch' };
    window.__testHelpers.buffPoint(uncleaned.u * window.groutApp.engine.width, uncleaned.v * window.groutApp.engine.height);
    return {
      isCured: uncleaned.isCured,
      passesRequired: uncleaned.passesRequired,
      cleaned: uncleaned.cleaned
    };
  })()`);
  console.log(`Cured Haze Pass 1: isCured=${curedPass1.isCured}, passesRequired=${curedPass1.passesRequired}, cleaned=${curedPass1.cleaned}`);
  if (!curedPass1.isCured || curedPass1.passesRequired !== 2 || curedPass1.cleaned) {
    throw new Error('Cured haze did not require multiple passes after 30s: ' + JSON.stringify(curedPass1));
  }

  // Sponge pass 2 over cured haze -> drops to 1 pass left
  const curedPass2 = await client.eval(`(() => {
    const uncleaned = window.groutApp.engine.hazePatches.find(p => !p.cleaned && p.isCured);
    if (!uncleaned) return { error: 'No cured patch' };
    window.__testHelpers.buffPoint(uncleaned.u * window.groutApp.engine.width, uncleaned.v * window.groutApp.engine.height);
    return {
      passesRequired: uncleaned.passesRequired,
      cleaned: uncleaned.cleaned
    };
  })()`);
  console.log(`Cured Haze Pass 2: passesRequired=${curedPass2.passesRequired}, cleaned=${curedPass2.cleaned}`);
  if (curedPass2.passesRequired !== 1 || curedPass2.cleaned) {
    throw new Error('Cured haze pass 2 failed: ' + JSON.stringify(curedPass2));
  }

  // Sponge pass 3 over cured haze -> cleans completely!
  const curedPass3 = await client.eval(`(() => {
    const uncleaned = window.groutApp.engine.hazePatches.find(p => !p.cleaned && p.isCured);
    if (!uncleaned) return { error: 'No cured patch' };
    window.__testHelpers.buffPoint(uncleaned.u * window.groutApp.engine.width, uncleaned.v * window.groutApp.engine.height);
    return {
      cleaned: uncleaned.cleaned
    };
  })()`);
  console.log(`Cured Haze Pass 3: cleaned=${curedPass3.cleaned}`);
  if (!curedPass3.cleaned) {
    throw new Error('Cured haze pass 3 failed to clean patch: ' + JSON.stringify(curedPass3));
  }
  console.log('✔ Curing mechanics verified: fresh haze cleans in 1 pass, 35s aged haze requires 3 passes.');

  // Test deterministic tickCountdown in live browser
  const preTick = await client.eval('window.groutApp.engine.timeRemaining');
  await client.eval('window.groutApp.engine.tickCountdown(10)');
  await new Promise(r => setTimeout(r, 100));
  const postTick = await client.eval('window.groutApp.engine.timeRemaining');
  const tickedVal = await client.eval('document.getElementById("timerValue").textContent');
  const drop = preTick - postTick;
  console.log(`Level 4 tickCountdown(10): pre=${preTick}s, post=${postTick}s, drop=${drop}s, timerValue="${tickedVal}"`);
  if (drop < 10 || drop > 12 || !tickedVal.includes(`${postTick}s`)) {
    throw new Error(`Expected timeRemaining to drop by at least 10s from ${preTick}s, got ${postTick}s (drop: ${drop}s, timerValue: "${tickedVal}")`);
  }

  // Test 75s deadline failure flow
  console.log('Testing Level 4 deadline expiration failure flow...');
  await client.eval('window.groutApp.engine.tickCountdown(75)');
  await new Promise(r => setTimeout(r, 300));
  const deadlineFailureCheck = await client.eval(`(() => {
    const modal = document.getElementById('failureModal');
    const title = document.getElementById('failureTitle').textContent;
    return {
      isOpen: modal.classList.contains('active'),
      title
    };
  })()`);
  console.log(`Deadline Failure Modal: Open=${deadlineFailureCheck.isOpen}, Title="${deadlineFailureCheck.title}"`);
  if (!deadlineFailureCheck.isOpen || (!deadlineFailureCheck.title.includes('DEADLINE') && !deadlineFailureCheck.title.includes('CAFE SHUTDOWN'))) {
    throw new Error('Deadline expiration failure modal did not open: ' + JSON.stringify(deadlineFailureCheck));
  }

  // Retry Level 4 and complete through genuine gameplay
  await client.eval('document.getElementById("btnRetryLevel").click()');
  await new Promise(r => setTimeout(r, 300));

  await client.eval(`(() => {
    window.__testHelpers.strokeAllGaps();
    window.__testHelpers.buffAllHaze();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const level4CompletionCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      isComplete: m.isComplete,
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level5Unlocked: !pills[4].classList.contains('locked'),
      level6Locked: pills[5].classList.contains('locked')
    };
  })()`);
  console.log(`Level 4 Completion: isComplete=${level4CompletionCheck.isComplete}, Grout=${level4CompletionCheck.groutCoverage}%, Clean=${level4CompletionCheck.hazeCleaning}%, Stored=${level4CompletionCheck.stored}`);
  if (!level4CompletionCheck.isComplete || level4CompletionCheck.stored !== '5' || !level4CompletionCheck.level5Unlocked || !level4CompletionCheck.level6Locked) {
    throw new Error('Level 4 genuine completion failed to unlock Level 5: ' + JSON.stringify(level4CompletionCheck));
  }
  console.log('✔ Level 4 completed via real gameplay; Level 5 unlocked, Endless ASMR strictly locked.');
  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-4-cafe-timer.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-4-cafe-timer.png');

  // Step 5: Level 5 Masterpiece Restoration & Grand Finale
  console.log('\n--- Verifying Level 5: Masterpiece Restoration & Grand Finale ---');
  // Load Level 5 by clicking the real Level 5 pill in the UI! (Zero unlockLevel() call)
  await client.eval('document.querySelectorAll(".level-pill")[4].click()');
  await new Promise(r => setTimeout(r, 400));

  const level5State = await client.eval(`(() => {
    const lvlNum = document.getElementById('levelNumber').textContent;
    const fragilityPill = document.getElementById('fragilityPill');
    const fragVal = document.getElementById('fragilityValue').textContent;
    const fragVisible = fragilityPill && !fragilityPill.classList.contains('hidden');
    const engine = window.groutApp.engine;
    return {
      lvlNum,
      fragVisible,
      fragVal,
      stage: engine.restorationStage,
      looseCount: engine.loosePieces.length,
      socketsCount: engine.sockets.length
    };
  })()`);
  console.log(`Level 5 State: Header="${level5State.lvlNum}", fragVisible=${level5State.fragVisible}, stage=${level5State.stage}, pieces=${level5State.looseCount}`);
  if (!level5State.fragVisible || level5State.stage !== 1 || level5State.looseCount !== 4) {
    throw new Error(`Level 5 Restoration validation failed: ${JSON.stringify(level5State)}`);
  }

  // Real Player Interaction: Drag piece 0 away and drop to test fragility penalty (+15%)
  await client.eval(`(() => {
    const canvas = window.groutApp.canvas;
    const engine = window.groutApp.engine;
    const p0 = engine.loosePieces[0];
    const r = canvas.getBoundingClientRect();
    const sx = r.left + (p0.x + 5) * (r.width / engine.width);
    const sy = r.top + (p0.y + 5) * (r.height / engine.height);
    const ex = r.left + 50 * (r.width / engine.width);
    const ey = r.top + 50 * (r.height / engine.height);
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: ex, clientY: ey, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: ex, clientY: ey, bubbles: true }));
  })()`);
  await new Promise(r => setTimeout(r, 200));

  const fragilityAfterDrop = await client.eval('document.getElementById("fragilityValue").textContent');
  console.log(`Level 5 Fragility after jarring drop: "${fragilityAfterDrop}"`);
  if (!fragilityAfterDrop.includes('15%')) {
    throw new Error(`Expected fragility to be 15%, got "${fragilityAfterDrop}"`);
  }

  // Reset Level 5 to clean state for full authentic campaign completion
  await client.eval('document.getElementById("btnResetLevel").click()');
  await new Promise(r => setTimeout(r, 200));

  // Real Player Interaction: Drag all 4 loose pieces into their target sockets using real mouse events!
  await client.eval(`(() => {
    const canvas = window.groutApp.canvas;
    const engine = window.groutApp.engine;
    const r = canvas.getBoundingClientRect();
    engine.loosePieces.forEach(p => {
      const sx = r.left + (p.x + 5) * (r.width / engine.width);
      const sy = r.top + (p.y + 5) * (r.height / engine.height);
      const ex = r.left + (p.targetX + 5) * (r.width / engine.width);
      const ey = r.top + (p.targetY + 5) * (r.height / engine.height);
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: ex, clientY: ey, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: ex, clientY: ey, bubbles: true }));
    });
  })()`);
  await new Promise(r => setTimeout(r, 300));

  const stageAfterSnap = await client.eval('window.groutApp.engine.restorationStage');
  console.log(`Level 5 Restoration Stage after snapping 4 pieces: Stage ${stageAfterSnap}`);
  if (stageAfterSnap !== 2) {
    throw new Error(`Expected stage 2 after snapping 4 pieces, got ${stageAfterSnap}`);
  }

  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-5-restoration.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-5-restoration.png');

  // Complete Level 5 Stage 2 Grouting & Cleaning with ZERO DIRECT STATE MUTATION
  // Trowel joints via genuine mouse events; sponge buff haze via genuine mouse events!
  console.log('Completing Level 5 Stage 2 via 100% genuine trowel and sponge mouse events (zero state mutation)...');
  await client.eval(`(() => {
    window.__testHelpers.strokeAllGaps();
    window.__testHelpers.buffAllHaze();
  })()`);
  await new Promise(r => setTimeout(r, 400));

  const stage2GameplayCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    const modal = document.getElementById('campaignCompleteModal');
    const stored = localStorage.getItem('grout_unlocked_level');
    const pills = Array.from(document.querySelectorAll('.level-pill'));
    return {
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      isComplete: m.isComplete,
      isOpen: modal ? modal.classList.contains('active') : false,
      stored,
      unlockedCount: pills.filter(p => !p.classList.contains('locked')).length,
      lockedCount: pills.filter(p => p.classList.contains('locked')).length,
      level6Unlocked: pills[5] && !pills[5].classList.contains('locked')
    };
  })()`);
  console.log(`Level 5 Genuine Completion Check: Grout=${stage2GameplayCheck.groutCoverage}%, Clean=${stage2GameplayCheck.hazeCleaning}%, isComplete=${stage2GameplayCheck.isComplete}, GrandModalOpen=${stage2GameplayCheck.isOpen}, Stored=${stage2GameplayCheck.stored}`);
  if (stage2GameplayCheck.groutCoverage < 85 || stage2GameplayCheck.hazeCleaning < 84 || !stage2GameplayCheck.isComplete || !stage2GameplayCheck.isOpen) {
    throw new Error('Level 5 genuine gameplay completion failed: ' + JSON.stringify(stage2GameplayCheck));
  }
  if (stage2GameplayCheck.stored !== '6' || !stage2GameplayCheck.level6Unlocked || stage2GameplayCheck.unlockedCount !== 6) {
    throw new Error('Level 5 completion failed to unlock Level 6 Endless ASMR: ' + JSON.stringify(stage2GameplayCheck));
  }
  console.log('✔ Level 5 completed via 100% genuine gameplay without state mutation; Grand Finale modal displayed!');
  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-5-grand-finale.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-5-grand-finale.png');

  // Step 6: Transition into Bonus Endless ASMR Zen Mode
  console.log('\n--- Verifying Transition into Bonus Endless ASMR Mode ---');
  await client.eval('document.getElementById("btnEnterEndlessMode").click()');
  await new Promise(r => setTimeout(r, 400));

  const endlessState = await client.eval(`(() => {
    const lvlNum = document.getElementById('levelNumber').textContent;
    const isEndless = window.groutApp.engine.currentLevel.isEndless;
    const wave = window.groutApp.engine.endlessWave;
    const grandModalActive = document.getElementById('campaignCompleteModal').classList.contains('active');
    return { lvlNum, isEndless, wave, grandModalActive };
  })()`);
  console.log(`Endless Mode State: Header="${endlessState.lvlNum}", isEndless=${endlessState.isEndless}, Wave=${endlessState.wave}, GrandModalClosed=${!endlessState.grandModalActive}`);
  if (!endlessState.isEndless || endlessState.grandModalActive) {
    throw new Error(`Bonus Endless Mode transition failed: ${JSON.stringify(endlessState)}`);
  }
  await client.screenshot(path.join(EVIDENCE_DIR, 'campaign-level-6-endless.png'));
  console.log('  Saved Screenshot: test/evidence/campaign-level-6-endless.png');

  console.log('\n========================================');
  console.log('ALL FIVE-LEVEL CAMPAIGN & VIEWPORT ASSERTIONS PASSED!');
  console.log('========================================\n');

  try { await client.send('Page.close'); } catch { }
  edgeProc.kill();
  process.exit(0);
}
