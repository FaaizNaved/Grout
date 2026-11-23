// Level definitions & narrative jokes for GROUT!

export const LEVELS = [
  {
    id: 1,
    name: "The Crooked Bathroom",
    hindiName: "बाथरूम का कांड",
    subtitle: "Tiles with a 2-inch canyon gap",
    thekedarQuote: "“Bhai ye tiles ke beech me 2 inch ka gap kyu choda hai?! Paani andar ghusega!”",
    mistriQuote: "“Saab wo ventilation ke liye tha... par tension mat lo, ISME GROUT BHAR DENGE! 🧱”",
    badge: "Rookie Mistri",
    tileColor: "#e2e8f0",
    tileBorder: "#94a3b8",
    gapWidth: 26,
    targetFill: 88,
    groutColor: "#fbbf24", // Construction yellow grout
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        // Horizontal main gap
        { x1: w * 0.1, y1: cy, x2: w * 0.9, y2: cy, width: 28 },
        // Vertical main gap (slightly crooked for hilarious realism)
        { x1: cx - 15, y1: h * 0.1, x2: cx + 15, y2: h * 0.9, width: 28 },
        // Accidental crooked diagonal gap
        { x1: w * 0.1, y1: h * 0.25, x2: cx - 15, y2: h * 0.35, width: 20 },
        { x1: cx + 15, y1: h * 0.65, x2: w * 0.9, y2: h * 0.75, width: 20 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.1, w: w * 0.38, h: h * 0.38, label: "Porcelain 30x30" },
      { x: w * 0.52, y: h * 0.1, w: w * 0.38, h: h * 0.38, label: "Porcelain 30x30" },
      { x: w * 0.1, y: h * 0.52, w: w * 0.38, h: h * 0.38, label: "Porcelain 30x30" },
      { x: w * 0.52, y: h * 0.52, w: w * 0.38, h: h * 0.38, label: "Porcelain 30x30" },
    ]
  },
  {
    id: 2,
    name: "The Viral Staircase (Original Meme)",
    hindiName: "वायरल सीढ़ियाँ (असली मीम)",
    subtitle: "The legendary misaligned stairs that broke the internet",
    thekedarQuote: "“Ye stairs dekho! Ek step 6 inch ka, agla 14 inch ka! Customer gir ke hospital jayega!”",
    mistriQuote: "“Are nahi girega saab! Thoda plaster, aur baaki ISME GROUT BHAR DENGE! 😎”",
    badge: "Senior Jugaad Expert",
    tileColor: "#f1f5f9",
    tileBorder: "#cbd5e1",
    gapWidth: 32,
    targetFill: 88,
    groutColor: "#f59e0b",
    generateGaps: (w, h) => {
      // 3 zig-zag stair steps with crazy jagged gaps
      const gaps = [];
      const steps = 3;
      for (let i = 1; i <= steps; i++) {
        const y = (h / (steps + 1)) * i;
        gaps.push({ x1: w * 0.1, y1: y - 10, x2: w * 0.45, y2: y + 15, width: 34 });
        gaps.push({ x1: w * 0.45, y1: y + 15, x2: w * 0.9, y2: y - 5, width: 30 });
      }
      // Vertical riser cracks
      gaps.push({ x1: w * 0.3, y1: h * 0.15, x2: w * 0.32, y2: h * 0.85, width: 22 });
      gaps.push({ x1: w * 0.65, y1: h * 0.2, x2: w * 0.62, y2: h * 0.85, width: 24 });
      return gaps;
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.12, w: w * 0.33, h: h * 0.22, label: "Step 1 (6 inch)" },
      { x: w * 0.47, y: h * 0.15, w: w * 0.43, h: h * 0.20, label: "Step 1 Right" },
      { x: w * 0.1, y: h * 0.38, w: w * 0.52, h: h * 0.21, label: "Step 2 (14 inch!)" },
      { x: w * 0.65, y: h * 0.40, w: w * 0.25, h: h * 0.19, label: "Offcut Piece" },
      { x: w * 0.1, y: h * 0.64, w: w * 0.80, h: h * 0.22, label: "Step 3 (Crooked)" },
    ]
  },
  {
    id: 3,
    name: "The Broken Heart",
    hindiName: "टूटा हुआ दिल",
    subtitle: "4-Year Relationship Shattered into Two Pieces",
    thekedarQuote: "“Usne WhatsApp pe block kar diya! 4 saal ka pyaar khatam! Ab life kaise chalegi?!”",
    mistriQuote: "“Arey dil hi to toota hai bhai! 2 minute ruko, ISME GROUT BHAR DENGE! 💔➡️💖”",
    badge: "Heart Surgeon Mistri",
    tileColor: "#fecdd3",
    tileBorder: "#f43f5e",
    gapWidth: 30,
    targetFill: 85,
    groutColor: "#ec4899", // Pink love grout
    isHeartShape: true,
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        // Jagged lightning crack splitting the heart
        { x1: cx, y1: cy - h * 0.28, x2: cx - 25, y2: cy - h * 0.12, width: 28 },
        { x1: cx - 25, y1: cy - h * 0.12, x2: cx + 30, y2: cy + 10, width: 32 },
        { x1: cx + 30, y1: cy + 10, x2: cx - 15, y2: cy + h * 0.18, width: 26 },
        { x1: cx - 15, y1: cy + h * 0.18, x2: cx, y2: cy + h * 0.32, width: 24 },
        // Side heartbreak branches
        { x1: cx - 25, y1: cy - h * 0.12, x2: cx - w * 0.22, y2: cy - h * 0.05, width: 18 },
        { x1: cx + 30, y1: cy + 10, x2: cx + w * 0.22, y2: cy + 30, width: 18 },
      ];
    },
    tiles: (w, h) => []
  },
  {
    id: 4,
    name: "The Flunked Exam Marksheet",
    hindiName: "फेल मार्कशीट",
    subtitle: "Score: 00/100 in Physics & Maths",
    thekedarQuote: "“Saare subjects me ZERO! Papa belan aur mummy jhadu leke wait kar rahe hain!”",
    mistriQuote: "“F ko A+ banana hai? टेंशन मत लो! ISME GROUT BHAR DENGE! 💯”",
    badge: "Academic Hacker Mistri",
    tileColor: "#fef3c7",
    tileBorder: "#f59e0b",
    gapWidth: 26,
    targetFill: 85,
    groutColor: "#10b981", // Emerald A+ passing grout
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        // Transforming the giant 'F' into an 'A+'
        // F vertical stem
        { x1: cx - 60, y1: cy - 90, x2: cx - 60, y2: cy + 90, width: 30 },
        // F top bar
        { x1: cx - 60, y1: cy - 90, x2: cx + 20, y2: cy - 90, width: 28 },
        // F mid bar
        { x1: cx - 60, y1: cy, x2: cx, y2: cy, width: 26 },
        // Extra jugaad stroke to make it 'A'
        { x1: cx + 20, y1: cy - 90, x2: cx + 20, y2: cy + 90, width: 28 },
        // Plus symbol '+'
        { x1: cx + 60, y1: cy - 20, x2: cx + 100, y2: cy - 20, width: 22 },
        { x1: cx + 80, y1: cy - 40, x2: cx + 80, y2: cy, width: 22 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8, label: "CBSE EXAM BOARD: FAIL ❌" }
    ]
  },
  {
    id: 5,
    name: "The Shattered Smartphone",
    hindiName: "टूटा हुआ आईफ़ोन",
    subtitle: "Display shattered into spiderweb glass",
    thekedarQuote: "“Display replacement ka 25,000 maang raha hai! Screen touch bhi nahi ho rahi!”",
    mistriQuote: "“Apple store mat jaao bhai! 50 rupaye ka paste lo, ISME GROUT BHAR DENGE! 📱”",
    badge: "Silicon Valley Jugaad Tech",
    tileColor: "#0f172a",
    tileBorder: "#334155",
    gapWidth: 22,
    targetFill: 85,
    groutColor: "#38bdf8", // Cyberpunk cyan neon grout
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const cracks = [];
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      // Radial spiderweb cracks
      angles.forEach((deg, idx) => {
        const rad = (deg * Math.PI) / 180;
        const len = (idx % 2 === 0) ? Math.min(w, h) * 0.38 : Math.min(w, h) * 0.28;
        cracks.push({
          x1: cx,
          y1: cy,
          x2: cx + Math.cos(rad) * len,
          y2: cy + Math.sin(rad) * len,
          width: 20
        });
      });
      // Concentric web rings
      cracks.push({ x1: cx - 60, y1: cy - 50, x2: cx + 60, y2: cy - 50, width: 16 });
      cracks.push({ x1: cx + 60, y1: cy - 50, x2: cx + 60, y2: cy + 50, width: 16 });
      cracks.push({ x1: cx + 60, y1: cy + 50, x2: cx - 60, y2: cy + 50, width: 16 });
      cracks.push({ x1: cx - 60, y1: cy + 50, x2: cx - 60, y2: cy - 50, width: 16 });
      return cracks;
    },
    tiles: (w, h) => [
      { x: w * 0.2, y: h * 0.08, w: w * 0.6, h: h * 0.84, label: "AMOLED Super Retina XDR" }
    ]
  },
  {
    id: 6,
    name: "The Leaning Tower of Pisa",
    hindiName: "पीसा की झुकी मीनार",
    subtitle: "800-Year-Old Monument Tilting at 5.5 Degrees",
    thekedarQuote: "“UNESCO World Heritage site girne wala hai! World's greatest engineers couldn't fix it!”",
    mistriQuote: "“Engineers ne dimag nahi lagaya! Bas base ke gap me 10 bori GROUT BHAR DENGE! 🏛️”",
    badge: "UNESCO Chief Mistri",
    tileColor: "#fef08a",
    tileBorder: "#ca8a04",
    gapWidth: 34,
    targetFill: 85,
    groutColor: "#f97316", // Terracotta heritage grout
    generateGaps: (w, h) => {
      const cx = w / 2;
      return [
        // Huge tilting foundation crack
        { x1: w * 0.15, y1: h * 0.78, x2: w * 0.85, y2: h * 0.68, width: 40 },
        // Vertical architectural shift lines
        { x1: cx - 50, y1: h * 0.2, x2: cx - 20, y2: h * 0.72, width: 28 },
        { x1: cx + 40, y1: h * 0.2, x2: cx + 70, y2: h * 0.70, width: 28 },
        // Balcony fractures
        { x1: cx - 80, y1: h * 0.35, x2: cx + 100, y2: h * 0.33, width: 24 },
        { x1: cx - 70, y1: h * 0.52, x2: cx + 90, y2: h * 0.50, width: 24 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.25, y: h * 0.15, w: w * 0.5, h: h * 0.55, label: "Torre di Pisa (1372 AD)" }
    ]
  },
  {
    id: 7,
    name: "Infinite Mistri ASMR (Endless Sandbox)",
    hindiName: "अनंत मिस्त्री समाधि",
    subtitle: "Endless satisfying tile patterns with custom grout colors",
    thekedarQuote: "“Saab itni shanti kyu hai? Kaam kaisa chal raha hai?”",
    mistriQuote: "“Shanti se ASMR grouting enjoy karo bhai... Sukoon hi sukoon! ✨”",
    badge: "Zen Grout Master",
    tileColor: "#f8fafc",
    tileBorder: "#cbd5e1",
    gapWidth: 24,
    targetFill: 85,
    groutColor: "#a855f7", // Royal purple
    generateGaps: (w, h) => {
      // Procedural subway tile brick pattern
      const rows = 4;
      const cols = 4;
      const gaps = [];
      const rowH = h / rows;
      const colW = w / cols;

      for (let r = 1; r < rows; r++) {
        gaps.push({ x1: 0, y1: r * rowH, x2: w, y2: r * rowH, width: 24 });
      }

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2 === 0) ? 0 : colW / 2;
        for (let c = 1; c < cols; c++) {
          const x = c * colW + offset;
          if (x < w) {
            gaps.push({ x1: x, y1: r * rowH, x2: x, y2: (r + 1) * rowH, width: 24 });
          }
        }
      }
      return gaps;
    },
    tiles: (w, h) => []
  }
];

export const GROUT_PALETTES = [
  { name: "Classic Gold (Mistri Choice)", color: "#f59e0b", border: "#d97706" },
  { name: "Pure White Porcelain", color: "#f8fafc", border: "#cbd5e1" },
  { name: "Cyberpunk Neon Cyan", color: "#06b6d4", border: "#0891b2" },
  { name: "Barbie Pink (Breakup Special)", color: "#ec4899", border: "#db2777" },
  { name: "Desi Terracotta Red", color: "#ea580c", border: "#c2410c" },
  { name: "Emerald A+ Passing Grade", color: "#10b981", border: "#059669" },
  { name: "Galaxy Royal Purple", color: "#8b5cf6", border: "#7c3aed" }
];
