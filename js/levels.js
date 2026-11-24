// Five-Level Campaign + Endless ASMR Zen Mode for GROUT!
// Implements distinct geometries (Subway, Hexagon, Moroccan Mosaic, Cafe Speed-Run, Roman Restoration)

// -------------------------------------------------------------
// HELPER: HEXAGONAL GEOMETRY GENERATOR (Level 2)
// -------------------------------------------------------------
function generateHexagonLevel(w, h) {
  const radius = Math.min(w, h) * 0.14; // Hexagon circumradius
  const innerR = radius * (Math.sqrt(3) / 2);
  const cx = w / 2;
  const cy = h / 2;

  // Hexagon centers arranged in a compact 3-row cluster
  const hexCenters = [
    { x: cx, y: cy - innerR * 2, id: 'H1' },
    { x: cx - radius * 1.5, y: cy - innerR, id: 'H2' },
    { x: cx + radius * 1.5, y: cy - innerR, id: 'H3' },
    { x: cx, y: cy, id: 'H4' },
    { x: cx - radius * 1.5, y: cy + innerR, id: 'H5' },
    { x: cx + radius * 1.5, y: cy + innerR, id: 'H6' },
    { x: cx, y: cy + innerR * 2, id: 'H7' }
  ];

  const tiles = [];
  const segmentsMap = new Map();

  hexCenters.forEach((center, idx) => {
    const polygon = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const px = center.x + radius * 0.90 * Math.cos(angle);
      const py = center.y + radius * 0.90 * Math.sin(angle);
      polygon.push({ x: px, y: py });
    }

    tiles.push({
      polygon,
      color: '#E0F2FE', // Pastel sky blue
      border: '#BAE6FD',
      label: `Hex 4" (#${idx + 1})`
    });

    // Edges with full radius for joint gaps
    for (let i = 0; i < 6; i++) {
      const a1 = (Math.PI / 180) * (60 * i);
      const a2 = (Math.PI / 180) * (60 * (i + 1));
      const p1 = { x: Math.round(center.x + radius * Math.cos(a1)), y: Math.round(center.y + radius * Math.sin(a1)) };
      const p2 = { x: Math.round(center.x + radius * Math.cos(a2)), y: Math.round(center.y + radius * Math.sin(a2)) };

      // Canonical segment key
      const key = (p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y))
        ? `${p1.x},${p1.y}-${p2.x},${p2.y}`
        : `${p2.x},${p2.y}-${p1.x},${p1.y}`;

      if (!segmentsMap.has(key)) {
        segmentsMap.set(key, { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, width: 22 });
      }
    }
  });

  return { tiles, gaps: Array.from(segmentsMap.values()) };
}

// -------------------------------------------------------------
// HELPER: MOROCCAN MOSAIC GEOMETRY GENERATOR (Level 3)
// -------------------------------------------------------------
function generateMoroccanLevel(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.36;
  const half = size / 2;

  const tiles = [];
  const gaps = [];

  // Central 8-pointed Moroccan Star (Section A: Requires White Grout)
  const starRadius = size * 0.65;
  const innerRadius = starRadius * 0.52;
  const starPoly = [];
  for (let i = 0; i < 16; i++) {
    const r = (i % 2 === 0) ? starRadius : innerRadius;
    const angle = (Math.PI / 8) * i;
    starPoly.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }

  tiles.push({
    type: 'star8',
    polygon: starPoly,
    color: '#1E3A8A', // Deep Cobalt Blue
    border: '#172554',
    label: 'Cobalt Star ✦'
  });

  // Gaps along Star perimeter (Requires White Grout)
  for (let i = 0; i < starPoly.length; i++) {
    const p1 = starPoly[i];
    const p2 = starPoly[(i + 1) % starPoly.length];
    gaps.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      width: 20,
      requiredColor: '#F5F2EB', // Chalk Limestone White
      sectionId: 'star'
    });
  }

  // Four Interlocking Terracotta Cross Wings (Section B: Requires Terracotta Grout)
  const crossOffsets = [
    { dx: 0, dy: -size * 0.72, label: 'North Cross ✚' },
    { dx: size * 0.72, dy: 0, label: 'East Cross ✚' },
    { dx: 0, dy: size * 0.72, label: 'South Cross ✚' },
    { dx: -size * 0.72, dy: 0, label: 'West Cross ✚' }
  ];

  crossOffsets.forEach((off) => {
    const ccx = cx + off.dx;
    const ccy = cy + off.dy;
    const cw = size * 0.44;
    const ch = size * 0.44;
    const arm = cw * 0.33;

    // Greek cross polygon
    const crossPoly = [
      { x: ccx - arm / 2, y: ccy - ch / 2 },
      { x: ccx + arm / 2, y: ccy - ch / 2 },
      { x: ccx + arm / 2, y: ccy - arm / 2 },
      { x: ccx + cw / 2, y: ccy - arm / 2 },
      { x: ccx + cw / 2, y: ccy + arm / 2 },
      { x: ccx + arm / 2, y: ccy + arm / 2 },
      { x: ccx + arm / 2, y: ccy + ch / 2 },
      { x: ccx - arm / 2, y: ccy + ch / 2 },
      { x: ccx - arm / 2, y: ccy + arm / 2 },
      { x: ccx - cw / 2, y: ccy + arm / 2 },
      { x: ccx - cw / 2, y: ccy - arm / 2 },
      { x: ccx - arm / 2, y: ccy - arm / 2 }
    ];

    tiles.push({
      type: 'cross',
      polygon: crossPoly,
      color: '#C2410C', // Terracotta Orange
      border: '#9A3412',
      label: off.label
    });

    // Cross perimeter joints (Requires Terracotta Grout)
    for (let i = 0; i < crossPoly.length; i++) {
      const p1 = crossPoly[i];
      const p2 = crossPoly[(i + 1) % crossPoly.length];
      gaps.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        width: 20,
        requiredColor: '#9A3412', // Burnt Terracotta
        sectionId: 'cross'
      });
    }
  });

  return { tiles, gaps };
}

// -------------------------------------------------------------
// HELPER: ROMAN MOSAIC RESTORATION GENERATOR (Level 5 Boss)
// -------------------------------------------------------------
function generateRomanRestorationLevel(w, h) {
  const cx = w / 2;
  const cy = h / 2 - 25;
  const mosaicW = Math.min(w * 0.82, 540);
  const mosaicH = Math.min(h * 0.65, 330);

  const tiles = [];
  const gaps = [];

  // Base background Roman stone border
  const rows = 4;
  const cols = 5;
  const tw = mosaicW / cols;
  const th = mosaicH / rows;
  const originX = cx - mosaicW / 2;
  const originY = cy - mosaicH / 2;

  // 4 target sockets that are missing initially
  const missingSlots = [
    { row: 1, col: 1, id: 'slot_1', name: 'Imperial Eagle', color: '#D97706', shape: 'square' },
    { row: 1, col: 3, id: 'slot_2', name: 'Laurel Tessera', color: '#4D7C0F', shape: 'diamond' },
    { row: 2, col: 2, id: 'slot_3', name: 'Acanthus Relief', color: '#B45309', shape: 'square' },
    { row: 2, col: 4, id: 'slot_4', name: 'Marble Keystone', color: '#F5F5F4', shape: 'diamond' }
  ];

  const sockets = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tx = originX + c * tw;
      const ty = originY + r * th;
      const missing = missingSlots.find(s => s.row === r && s.col === c);

      if (missing) {
        // Socket target for puzzle
        sockets.push({
          id: missing.id,
          name: missing.name,
          color: missing.color,
          x: tx + 4,
          y: ty + 4,
          w: tw - 8,
          h: th - 8,
          placed: false
        });
      } else {
        // Regular ancient stone tile
        tiles.push({
          x: tx + 3,
          y: ty + 3,
          w: tw - 6,
          h: th - 6,
          color: (r + c) % 2 === 0 ? '#78716C' : '#A8A29E',
          border: '#57534E',
          label: `Tessera ${r},${c}`
        });
      }
    }
  }

  // Grid mortar joints between all cells
  for (let r = 1; r < rows; r++) {
    gaps.push({ x1: originX, y1: originY + r * th, x2: originX + mosaicW, y2: originY + r * th, width: 22 });
  }
  for (let c = 1; c < cols; c++) {
    gaps.push({ x1: originX + c * tw, y1: originY, x2: originX + c * tw, y2: originY + mosaicH, width: 22 });
  }

  // 4 Loose pieces resting in the lower tray
  const trayY = h - 55;
  const loosePieces = sockets.map((sock, i) => ({
    id: sock.id,
    name: sock.name,
    color: sock.color,
    targetX: sock.x,
    targetY: sock.y,
    w: sock.w,
    h: sock.h,
    x: w * 0.15 + i * (w * 0.22),
    y: trayY,
    placed: false
  }));

  return { tiles, gaps, sockets, loosePieces };
}

// -------------------------------------------------------------
// HELPER: PROCEDURAL ENDLESS ASMR WAVE GENERATOR (Bonus Zen Mode)
// -------------------------------------------------------------
export function generateEndlessGaps(w, h, wave = 1) {
  const patternType = (((wave || 1) - 1) % 5) + 1;
  const gaps = [];

  switch (patternType) {
    case 1: {
      const rows = 4;
      const cols = 4;
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 1; r < rows; r++) {
        gaps.push({ x1: 0, y1: r * rowH, x2: w, y2: r * rowH, width: 24 });
      }
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 0) ? 0 : colW / 2;
        for (let c = 1; c < cols; c++) {
          const x = c * colW + offset;
          if (x < w) gaps.push({ x1: x, y1: r * rowH, x2: x, y2: (r + 1) * rowH, width: 22 });
        }
      }
      break;
    }
    case 2: {
      const cx = w / 2;
      const cy = h / 2;
      const span = Math.min(w, h) * 0.40;
      gaps.push({ x1: cx, y1: cy - span, x2: cx + span, y2: cy, width: 26 });
      gaps.push({ x1: cx + span, y1: cy, x2: cx, y2: cy + span, width: 26 });
      gaps.push({ x1: cx, y1: cy + span, x2: cx - span, y2: cy, width: 26 });
      gaps.push({ x1: cx - span, y1: cy, x2: cx, y2: cy - span, width: 26 });
      gaps.push({ x1: cx, y1: cy - span, x2: cx, y2: cy + span, width: 24 });
      gaps.push({ x1: cx - span, y1: cy, x2: cx + span, y2: cy, width: 24 });
      break;
    }
    case 3: {
      const cx = w / 2;
      const cy = h / 2;
      gaps.push({ x1: cx - 40, y1: cy - 30, x2: cx + 50, y2: cy - 20, width: 26 });
      gaps.push({ x1: cx + 50, y1: cy - 20, x2: cx + 20, y2: cy + 45, width: 28 });
      gaps.push({ x1: cx + 20, y1: cy + 45, x2: cx - 45, y2: cy + 30, width: 24 });
      gaps.push({ x1: cx - 45, y1: cy + 30, x2: cx - 40, y2: cy - 30, width: 26 });
      gaps.push({ x1: cx - 40, y1: cy - 30, x2: w * 0.12, y2: h * 0.15, width: 22 });
      gaps.push({ x1: cx + 50, y1: cy - 20, x2: w * 0.88, y2: h * 0.18, width: 24 });
      break;
    }
    case 4: {
      const rows = 3;
      const rowH = h / (rows + 1);
      for (let r = 1; r <= rows; r++) {
        const y = r * rowH;
        gaps.push({ x1: w * 0.10, y1: y - 18, x2: w * 0.35, y2: y + 22, width: 24 });
        gaps.push({ x1: w * 0.35, y1: y + 22, x2: w * 0.65, y2: y - 18, width: 24 });
        gaps.push({ x1: w * 0.65, y1: y - 18, x2: w * 0.90, y2: y + 22, width: 24 });
      }
      break;
    }
    case 5: {
      const cx = w / 2;
      const cy = h / 2;
      const cw = w * 0.36;
      const ch = h * 0.36;
      gaps.push({ x1: cx - cw / 2, y1: cy - ch / 2, x2: cx + cw / 2, y2: cy - ch / 2, width: 28 });
      gaps.push({ x1: cx + cw / 2, y1: cy - ch / 2, x2: cx + cw / 2, y2: cy + ch / 2, width: 28 });
      gaps.push({ x1: cx + cw / 2, y1: cy + ch / 2, x2: cx - cw / 2, y2: cy + ch / 2, width: 28 });
      gaps.push({ x1: cx - cw / 2, y1: cy + ch / 2, x2: cx - cw / 2, y2: cy - ch / 2, width: 28 });
      break;
    }
  }

  return gaps;
}

export function generateEndlessTiles(w, h, wave = 1) {
  const patternType = (((wave || 1) - 1) % 5) + 1;
  const tiles = [];
  const cx = w / 2;
  const cy = h / 2;

  switch (patternType) {
    case 1: {
      const rows = 4;
      const cols = 4;
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          tiles.push({ x: c * colW + 4, y: r * rowH + 4, w: colW - 8, h: rowH - 8, label: `Subway W${wave}` });
        }
      }
      break;
    }
    case 2: {
      const span = Math.min(w, h) * 0.36;
      tiles.push({ x: cx - span * 0.5, y: cy - span * 0.5, w: span, h: span, label: `Diamond W${wave}` });
      break;
    }
    case 3: {
      tiles.push({ x: w * 0.18, y: h * 0.20, w: w * 0.64, h: h * 0.60, label: `Mosaic W${wave}` });
      break;
    }
    case 4: {
      tiles.push({ x: w * 0.12, y: h * 0.15, w: w * 0.76, h: h * 0.70, label: `Herringbone W${wave}` });
      break;
    }
    case 5: {
      const cw = w * 0.32;
      const ch = h * 0.32;
      tiles.push({ x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, label: `Versailles W${wave}` });
      break;
    }
  }
  return tiles;
}

// -------------------------------------------------------------
// THE FIVE-LEVEL CAMPAIGN DEFINITIONS
// -------------------------------------------------------------

export const LEVELS = [
  // LEVEL 1: THE CLASSIC SUBWAY BACKSPLASH (Tutorial)
  {
    id: 1,
    name: "The Classic Subway Backsplash",
    hindiName: "क्लासिक सबवे किचन टाइल्स (ट्यूटोरियल)",
    memeRef: "Confidence level: 'Tension mat lo, isme grout bhar denge!'",
    thekedarQuote: "“New kitchen backsplash installation! Make sure every empty joint is filled before wiping.”",
    mistriQuote: "“Step 1: Use Trowel to fill empty joints. Step 2: Use Sponge to wipe excess surface haze! 🧱”",
    badge: "Level 1: Backsplash Apprentice",
    tileColor: "#FAF8F5", // Clean porcelain white glaze
    tileBorder: "#E5E0D8",
    gapWidth: 24,
    targetFill: 84,
    groutColor: "#B45309", // Warm Raw Ochre
    groutBorder: "#92400E",
    isTutorial: true,
    generateGaps: (w, h) => {
      const rows = 4;
      const cols = 4;
      const gaps = [];
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 1; r < rows; r++) {
        gaps.push({ x1: w * 0.05, y1: r * rowH, x2: w * 0.95, y2: r * rowH, width: 24 });
      }
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 0) ? 0 : colW / 2;
        for (let c = 1; c < cols; c++) {
          const x = c * colW + offset;
          if (x < w * 0.95) {
            gaps.push({ x1: x, y1: r * rowH + 6, x2: x, y2: (r + 1) * rowH - 6, width: 22 });
          }
        }
      }
      return gaps;
    },
    tiles: (w, h) => {
      const rows = 4;
      const cols = 4;
      const tiles = [];
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 0) ? 0 : colW / 2;
        for (let c = 0; c <= cols; c++) {
          const x = c * colW + offset;
          if (x < w * 0.95) {
            tiles.push({
              x: x + 4,
              y: r * rowH + 4,
              w: Math.min(colW - 8, w * 0.95 - x - 4),
              h: rowH - 8,
              label: 'Glazed 3x6'
            });
          }
        }
      }
      return tiles;
    }
  },

  // LEVEL 2: THE HEXAGON BATHROOM FLOOR (Blowout Mechanic)
  {
    id: 2,
    name: "The Hexagon Bathroom Floor",
    hindiName: "हेक्सागोन बाथरूम फ़्लोर (3-वे जोड़)",
    memeRef: "Thekedar: 3-way hexagon joints me haath kaanp jayega! Mistri: Grout bhar denge!",
    thekedarQuote: "“Look at these 120-degree three-way intersections! Aggressive scrubbing will blow out the joints!”",
    mistriQuote: "“Careful with the trowel! Violent scrubbing causes a blowout (-10% penalty). Grout smoothly! 😎”",
    badge: "Level 2: Geometric Craftsman",
    tileColor: "#E0F2FE", // Soft pastel sky blue
    tileBorder: "#BAE6FD",
    gapWidth: 22,
    targetFill: 85,
    groutColor: "#9A3412", // Burnt Terracotta
    groutBorder: "#7C2D12",
    hasBlowoutMechanic: true,
    generateGaps: (w, h) => generateHexagonLevel(w, h).gaps,
    tiles: (w, h) => generateHexagonLevel(w, h).tiles
  },

  // LEVEL 3: THE MOROCCAN MOSAIC (Grout Color Selection)
  {
    id: 3,
    name: "The Moroccan Mosaic",
    hindiName: "मोरक्कन स्टार मोज़ेक (रंग मिलान)",
    memeRef: "Rang galat mat lagao, Moroccan carpet jaisa design hai!",
    thekedarQuote: "“This Moroccan pattern has two distinct zones! Cobalt Star sections need White Grout, Terracotta sections need Burnt Mortar!”",
    mistriQuote: "“Select the correct grout color before applying! One wrong-color stroke ruins the harmony! 🎨”",
    badge: "Level 3: Master Colorist",
    tileColor: "#1E3A8A", // Deep Cobalt Blue
    tileBorder: "#172554",
    gapWidth: 20,
    targetFill: 85,
    groutColor: "#F5F2EB", // Default White
    groutBorder: "#D6CEBF",
    hasColorMatching: true,
    colorSections: [
      { id: 'star', name: 'Cobalt Star Joints', requiredColor: '#F5F2EB', label: 'Chalk Limestone White' },
      { id: 'cross', name: 'Terracotta Cross Joints', requiredColor: '#9A3412', label: 'Burnt Terracotta' }
    ],
    generateGaps: (w, h) => generateMoroccanLevel(w, h).gaps,
    tiles: (w, h) => generateMoroccanLevel(w, h).tiles
  },

  // LEVEL 4: THE SPEED-RUN CAFÉ COUNTER (Curing Timer + Deadline)
  {
    id: 4,
    name: "The Speed-Run Café Counter",
    hindiName: "कैफ़े काउंटर स्पीड-रन (30s क्योरिंग)",
    memeRef: "Jaldi kar bhai! Grout 30 second me cement ban jayega!",
    thekedarQuote: "“The coffee shop opens in 75 seconds! And remember: quick-set grout begins curing after 30 seconds!”",
    mistriQuote: "“Cured haze turns rock-hard and takes 3x sponge passes to buff! Balance filling and cleaning fast! ⏱️☕”",
    badge: "Level 4: Rapid Response Mistri",
    tileColor: "#065F46", // Glossy Emerald Green
    tileBorder: "#047857",
    gapWidth: 22,
    targetFill: 85,
    groutColor: "#F5F2EB", // White Mortar
    groutBorder: "#D6CEBF",
    hasCuringTimer: true,
    curingDelaySec: 30,
    overallDeadlineSec: 75,
    generateGaps: (w, h) => {
      const rows = 4;
      const cols = 5;
      const gaps = [];
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 1; r < rows; r++) {
        gaps.push({ x1: w * 0.08, y1: r * rowH, x2: w * 0.92, y2: r * rowH, width: 22 });
      }
      for (let c = 1; c < cols; c++) {
        gaps.push({ x1: c * colW, y1: h * 0.08, x2: c * colW, y2: h * 0.92, width: 22 });
      }
      return gaps;
    },
    tiles: (w, h) => {
      const rows = 4;
      const cols = 5;
      const tiles = [];
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          tiles.push({
            x: c * colW + 4,
            y: r * rowH + 4,
            w: colW - 8,
            h: rowH - 8,
            color: '#065F46',
            border: '#047857',
            label: 'Emerald Glaze'
          });
        }
      }
      return tiles;
    }
  },

  // LEVEL 5: MASTERPIECE RESTORATION (Boss Level - Two Stages)
  {
    id: 5,
    name: "Masterpiece Restoration",
    hindiName: "प्राचीन रोमन मोज़ेक बहाली (बॉस लेवल)",
    memeRef: "UNESCO Calling Babu Mistri: 2000 saal purani floor bacha li!",
    thekedarQuote: "“Ancient 2nd-century Roman mosaic floor! Fragile artifacts must be placed into their exact vacant sockets before grouting!”",
    mistriQuote: "“Stage 1: Drag the 4 loose mosaic pieces into their sockets. Watch the FRAGILITY meter! Stage 2: Seal with Roman mortar! 🏛️”",
    badge: "Level 5: UNESCO Chief Conservator",
    tileColor: "#78716C", // Weathered ancient stone
    tileBorder: "#57534E",
    gapWidth: 22,
    targetFill: 85,
    groutColor: "#B45309", // Roman Pozzolanic Mortar
    groutBorder: "#78350F",
    isBossLevel: true,
    hasRestorationPuzzle: true,
    maxFragility: 100,
    generateGaps: (w, h) => generateRomanRestorationLevel(w, h).gaps,
    tiles: (w, h) => generateRomanRestorationLevel(w, h).tiles,
    getRestorationData: (w, h) => generateRomanRestorationLevel(w, h)
  },

  // BONUS MODE: ENDLESS MISTRI ASMR (Zen Meditation)
  {
    id: 6,
    name: "Endless Mistri ASMR (Zen Meditation)",
    hindiName: "अनंत मिस्त्री समाधि (असीमित ASMR)",
    memeRef: "Sukoon hi sukoon! Unlimited satisfying tile grouting relaxation",
    thekedarQuote: "“Site is completely calm. Relax and enjoy limitless satisfying tile grouting without deadlines or penalties.”",
    mistriQuote: "“Pure ASMR meditation mode. Infinite procedural waves with calming chimes. Sukoon hi sukoon! ✨”",
    badge: "Bonus: Zen Grout Master",
    tileColor: "#FAF8F5",
    tileBorder: "#E5E0D8",
    gapWidth: 24,
    targetFill: 84,
    groutColor: "#B45309",
    groutBorder: "#92400E",
    isEndless: true,
    generateGaps: (w, h, wave = 1) => generateEndlessGaps(w, h, wave),
    tiles: (w, h, wave = 1) => generateEndlessTiles(w, h, wave)
  }
];

export const GROUT_PALETTES = [
  { name: "Raw Ochre Mortar", color: "#B45309", border: "#92400E" },
  { name: "Burnt Terracotta", color: "#9A3412", border: "#7C2D12" },
  { name: "Chalk Limestone White", color: "#F5F2EB", border: "#D6CEBF" },
  { name: "Amber River Sand", color: "#D97706", border: "#B45309" },
  { name: "Slate Ash Charcoal", color: "#44403C", border: "#292524" },
  { name: "Forest Olive Sage", color: "#2D6A4F", border: "#1B4332" },
  { name: "Rose Clay", color: "#9F1239", border: "#881337" }
];
