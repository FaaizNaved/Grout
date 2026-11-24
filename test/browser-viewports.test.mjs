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
      try { edgeProc.kill(); } catch {}
    }
    server.close();
    process.exit(1);
  } finally {
    if (edgeProc) {
      try { edgeProc.kill(); } catch {}
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
      if (!metrics.levelSelector.visible || metrics.levelSelector.pillsCount < 9) {
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

  // Step 1: Empty joints before application
  await client.eval('document.getElementById("btnResetLevel").click()');
  await new Promise(r => setTimeout(r, 300));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-1-empty-joints.png'));
  console.log('  Saved Step 1 Screenshot: test/evidence/phase-2-1-empty-joints.png');

  // Step 2: Joint filled with grout + haze visible on surrounding tiles (driven by real DOM MouseEvents)
  await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const r = canvas.getBoundingClientRect();
    const gap0 = window.groutApp.engine.gaps[0];
    const startX = r.left + gap0.x1;
    const startY = r.top + gap0.y1;
    const endX = r.left + gap0.x2;
    const endY = r.top + gap0.y2;

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
    const r = canvas.getBoundingClientRect();
    const gap0 = window.groutApp.engine.gaps[0];
    const startX = r.left + gap0.x1;
    const startY = r.top + gap0.y1 - 20; // Tile face above gap 0
    const endX = r.left + (gap0.x1 + (gap0.x2 - gap0.x1) * 0.5);
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

  // Step 4: Fully filled and cleaned final result
  await client.eval(`(() => {
    const canvas = document.querySelector('#gameCanvas');
    const r = canvas.getBoundingClientRect();

    // Fill all remaining gaps with real DOM MouseEvents
    document.getElementById('toolTrowel').click();
    for (const gap of window.groutApp.engine.gaps) {
      const sx = r.left + gap.x1;
      const sy = r.top + gap.y1;
      const ex = r.left + gap.x2;
      const ey = r.top + gap.y2;
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, bubbles: true }));
      for (let i = 1; i <= 10; i++) {
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          clientX: sx + (ex - sx) * (i / 10),
          clientY: sy + (ey - sy) * (i / 10),
          bubbles: true
        }));
      }
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: ex, clientY: ey, bubbles: true }));
    }

    // Clean all haze with sponge via real DOM MouseEvents across patches
    document.querySelector('#spongeToolBtn, #toolSponge').click();
    for (const p of window.groutApp.engine.hazePatches) {
      const px = r.left + p.u * window.groutApp.engine.width;
      const py = r.top + p.v * window.groutApp.engine.height;
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: px, clientY: py, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: px + 4, clientY: py + 4, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: px + 4, clientY: py + 4, bubbles: true }));
    }
  })()`);
  await new Promise(r => setTimeout(r, 400));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-4-fully-cleaned-inspected.png'));
  await client.screenshot(path.join(EVIDENCE_DIR, 'phase-2-5-fully-filled-cleaned.png'));
  console.log('  Saved Step 4 Screenshot: test/evidence/phase-2-4-fully-cleaned-inspected.png');

  const finalCheck = await client.eval(`(() => {
    const m = window.groutApp.engine.getMetrics();
    return {
      groutCoverage: m.groutCoverage,
      hazeCleaning: m.hazeCleaning,
      isComplete: m.isComplete,
      engineComplete: window.groutApp.engine.isCompleted
    };
  })()`);
  console.log(`Final Level Completion State: Grout=${finalCheck.groutCoverage}%, Clean=${finalCheck.hazeCleaning}%, isComplete=${finalCheck.isComplete}`);
  if (!finalCheck.isComplete || !finalCheck.engineComplete) {
    throw new Error('Level failed to reach complete status after full fill and full sponge cleaning');
  }
  console.log('✔ Full two-phase workflow verified in real browser DOM!');

  console.log('\n========================================');
  console.log('ALL PHASE 2 REGRESSION ASSERTIONS PASSED!');
  console.log('========================================\n');

  try { await client.send('Page.close'); } catch {}
  edgeProc.kill();
  process.exit(0);
}
