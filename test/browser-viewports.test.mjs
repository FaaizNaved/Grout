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

  console.log('\n=== TEST 2: Multi-Viewport Geometry & Layout Measurements ===\n');

  const targetViewports = [
    { name: 'Desktop (1280x800)', w: 1280, h: 800, mobile: false, file: 'desktop-1280x800.png' },
    { name: 'Mobile Portrait (390x844)', w: 390, h: 844, mobile: true, file: 'mobile-portrait-390x844.png' },
    { name: 'Mobile Landscape 1 (844x390)', w: 844, h: 390, mobile: true, file: 'mobile-landscape-844x390.png' },
    { name: 'Mobile Landscape 2 (844x430)', w: 844, h: 430, mobile: true, file: 'mobile-landscape-844x430.png' },
    { name: 'Mobile Landscape 3 (740x390)', w: 740, h: 390, mobile: true, file: 'mobile-landscape-740x390.png' }
  ];

  const results = [];

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
      const cRect = c.getBoundingClientRect();
      const tdRect = td.getBoundingClientRect();
      return {
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        canvas: {
          top: Math.round(cRect.top),
          bottom: Math.round(cRect.bottom),
          width: Math.round(cRect.width),
          height: Math.round(cRect.height)
        },
        toolDeck: {
          top: Math.round(tdRect.top),
          bottom: Math.round(tdRect.bottom),
          width: Math.round(tdRect.width),
          height: Math.round(tdRect.height)
        }
      };
    })()`);

    const fitsInViewport = metrics.toolDeck.bottom <= vp.h;
    results.push({ name: vp.name, metrics, fitsInViewport });

    console.log(`Viewport: ${vp.name}`);
    console.log(`  Canvas:    top=${metrics.canvas.top}px, bottom=${metrics.canvas.bottom}px, width=${metrics.canvas.width}px, height=${metrics.canvas.height}px`);
    console.log(`  Tool Deck: top=${metrics.toolDeck.top}px, bottom=${metrics.toolDeck.bottom}px, width=${metrics.toolDeck.width}px, height=${metrics.toolDeck.height}px`);
    console.log(`  Fits within ${vp.h}px viewport fold without scrolling: ${fitsInViewport ? 'YES ✔' : 'NO ✖'}`);

    await client.screenshot(path.join(EVIDENCE_DIR, vp.file));
    console.log('');
  }

  console.log('=== TEST 3: Gameplay Interaction & Rapid Drag Stroke ===');
  // Back to desktop
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1200,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await client.eval('window.scrollTo(0, 0); window.dispatchEvent(new Event("resize"))');
  await new Promise(r => setTimeout(r, 500));

  const dragResult = await client.eval(`(() => {
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

    return document.getElementById('progressPercent').textContent;
  })()`);

  console.log(`Progress after horizontal stroke: ${dragResult}`);
  if (dragResult === '0%') throw new Error('Pointer drag failed to fill sample points');
  await client.screenshot(path.join(EVIDENCE_DIR, 'gameplay-filled.png'));

  console.log('\n========================================');
  console.log('ALL PHASE 1.1 REPRODUCIBLE TESTS PASSED!');
  console.log('========================================\n');

  try { await client.send('Page.close'); } catch {}
  edgeProc.kill();
  process.exit(0);
}
