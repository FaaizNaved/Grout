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

    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: startX, clientY: startY, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: startX + (endX - startX) * 0.35, clientY: startY, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: startX + (endX - startX) * 0.70, clientY: startY, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: endX, clientY: endY, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: endX, clientY: endY, bubbles: true }));

    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount,
      intervalsCount: window.groutApp.engine.gapIntervals.size
    };
  })()`);

  console.log(`Mouse Drag Result: progress=${mouseDragResult.progress}, strokes=${mouseDragResult.strokes}, filledPoints=${mouseDragResult.filledPoints}`);
  if (mouseDragResult.progress === '0%' || mouseDragResult.filledPoints === 0 || mouseDragResult.strokes === 0) {
    throw new Error(`Mouse drag interaction failed: progress=${mouseDragResult.progress}, filledPoints=${mouseDragResult.filledPoints}`);
  }
  console.log('✔ Genuine Mouse drag interaction verified!');
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
    const canvas = document.querySelector('#gameCanvas');
    const r = canvas.getBoundingClientRect();
    const startX = r.left + r.width * 0.15;
    const startY = r.top + r.height * 0.5;
    const endX = r.left + r.width * 0.85;
    const endY = r.top + r.height * 0.5;

    function createTouch(x, y) {
      return new Touch({
        identifier: Date.now(),
        target: canvas,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        radiusX: 10,
        radiusY: 10,
        rotationAngle: 0,
        force: 1
      });
    }

    const tStart = createTouch(startX, startY);
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [tStart],
      targetTouches: [tStart],
      changedTouches: [tStart]
    }));

    const tMid1 = createTouch(startX + (endX - startX) * 0.35, startY);
    window.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [tMid1],
      targetTouches: [tMid1],
      changedTouches: [tMid1]
    }));

    const tMid2 = createTouch(startX + (endX - startX) * 0.70, startY);
    window.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [tMid2],
      targetTouches: [tMid2],
      changedTouches: [tMid2]
    }));

    const tEnd = createTouch(endX, endY);
    window.dispatchEvent(new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [tEnd],
      targetTouches: [tEnd],
      changedTouches: [tEnd]
    }));

    window.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [tEnd]
    }));

    return {
      progress: document.getElementById('progressPercent').textContent,
      strokes: window.groutApp.engine.strokes.length,
      filledPoints: window.groutApp.engine.filledPointsCount,
      intervalsCount: window.groutApp.engine.gapIntervals.size
    };
  })()`);

  console.log(`Touch Drag Result: progress=${touchDragResult.progress}, strokes=${touchDragResult.strokes}, filledPoints=${touchDragResult.filledPoints}`);
  if (touchDragResult.progress === '0%' || touchDragResult.filledPoints === 0 || touchDragResult.strokes === 0) {
    throw new Error(`Touch drag interaction failed to register: progress=${touchDragResult.progress}, filledPoints=${touchDragResult.filledPoints}`);
  }
  console.log('✔ Genuine Touch drag interaction verified!');
  await client.screenshot(path.join(EVIDENCE_DIR, 'gameplay-touch-filled.png'));

  console.log('\n========================================');
  console.log('ALL PHASE 1.2 REGRESSION ASSERTIONS PASSED!');
  console.log('========================================\n');

  try { await client.send('Page.close'); } catch {}
  edgeProc.kill();
  process.exit(0);
}
