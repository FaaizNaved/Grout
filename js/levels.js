// 8 Viral Meme Levels + Endless ASMR Mode with Warm Artisanal Palettes for GROUT!

export const LEVELS = [
  {
    id: 1,
    name: "The Ventilation Gap",
    hindiName: "बाथरूम का 2-इंच वेंटिलेशन",
    memeRef: "Confidence level: Mistri saying 'Isme grout bhar denge' on a 2-inch wide gap",
    thekedarQuote: "“Bhai ye tiles ke beech me 2 inch ka gap kyu choda hai?! Paani andar ghusega!”",
    mistriQuote: "“Saab wo bathroom me ventilation ke liye choda tha... par koi na, ISME GROUT BHAR DENGE! 🧱”",
    badge: "Level 1: Rookie Mistri",
    tileColor: "#FAF8F5",
    tileBorder: "#E5E0D8",
    gapWidth: 26,
    targetFill: 84,
    groutColor: "#B45309", // Warm Raw Ochre
    groutBorder: "#92400E",
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        { x1: w * 0.1, y1: cy, x2: w * 0.9, y2: cy, width: 28 },
        { x1: cx - 18, y1: h * 0.1, x2: cx + 18, y2: h * 0.9, width: 28 },
        { x1: w * 0.1, y1: h * 0.28, x2: cx - 18, y2: h * 0.35, width: 20 },
        { x1: cx + 18, y1: h * 0.65, x2: w * 0.9, y2: h * 0.72, width: 20 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.1, w: w * 0.37, h: h * 0.37, label: "Porcelain 30x30" },
      { x: w * 0.53, y: h * 0.1, w: w * 0.37, h: h * 0.37, label: "Porcelain 30x30" },
      { x: w * 0.1, y: h * 0.53, w: w * 0.37, h: h * 0.37, label: "Porcelain 30x30" },
      { x: w * 0.53, y: h * 0.53, w: w * 0.37, h: h * 0.37, label: "Porcelain 30x30" },
    ]
  },
  {
    id: 2,
    name: "The Viral Staircase (Original Meme)",
    hindiName: "असली वायरल सीढ़ियाँ",
    memeRef: "The exact viral video that started the whole internet trend",
    thekedarQuote: "“Ye stairs dekho! Ek step 6 inch ka, agla 14 inch ka! Customer gir ke ICU jayega!”",
    mistriQuote: "“Ye Italian zigzag architecture hai saab! Thoda plaster, baaki ISME GROUT BHAR DENGE! 😎”",
    badge: "Level 2: Senior Jugaad Mistri",
    tileColor: "#F5F2EB",
    tileBorder: "#D6CEBF",
    gapWidth: 30,
    targetFill: 84,
    groutColor: "#9A3412", // Natural Burnt Terracotta
    groutBorder: "#7C2D12",
    generateGaps: (w, h) => {
      const gaps = [];
      const steps = 3;
      for (let i = 1; i <= steps; i++) {
        const y = (h / (steps + 1)) * i;
        gaps.push({ x1: w * 0.08, y1: y - 12, x2: w * 0.48, y2: y + 16, width: 32 });
        gaps.push({ x1: w * 0.48, y1: y + 16, x2: w * 0.92, y2: y - 8, width: 30 });
      }
      gaps.push({ x1: w * 0.32, y1: h * 0.12, x2: w * 0.30, y2: h * 0.88, width: 22 });
      gaps.push({ x1: w * 0.68, y1: h * 0.15, x2: w * 0.65, y2: h * 0.88, width: 22 });
      return gaps;
    },
    tiles: (w, h) => [
      { x: w * 0.08, y: h * 0.12, w: w * 0.36, h: h * 0.20, label: "Step 1 (6 inch)" },
      { x: w * 0.50, y: h * 0.15, w: w * 0.42, h: h * 0.18, label: "Step 1 (Crooked)" },
      { x: w * 0.08, y: h * 0.38, w: w * 0.56, h: h * 0.20, label: "Step 2 (14 inch!)" },
      { x: w * 0.70, y: h * 0.40, w: w * 0.22, h: h * 0.18, label: "Cut Piece" },
      { x: w * 0.08, y: h * 0.64, w: w * 0.84, h: h * 0.22, label: "Step 3 (Danger)" },
    ]
  },
  {
    id: 3,
    name: "Heartbreak & Dhokha (Dil Me Grout)",
    hindiName: "टूटा हुआ दिल और धोखा",
    memeRef: "Bhai usne block kar diya... koi na dil me grout bhar do!",
    thekedarQuote: "“Usne 4 saal baad WhatsApp pe block kar diya! Dil ke tukde-tukde ho gaye! Ab kya karega?!”",
    mistriQuote: "“Are dil hi to toota hai bhai! 2 packet White Grout lagao, Fevicol se majboot jod denge! 💔➡️💖”",
    badge: "Level 3: Cardiac Surgeon Mistri",
    tileColor: "#9F1239",
    tileBorder: "#881337",
    gapWidth: 28,
    targetFill: 84,
    groutColor: "#F5F2EB", // Warm Chalk Limestone White
    groutBorder: "#D6CEBF",
    isHeartShape: true,
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        { x1: cx, y1: cy - h * 0.28, x2: cx - 28, y2: cy - h * 0.10, width: 28 },
        { x1: cx - 28, y1: cy - h * 0.10, x2: cx + 32, y2: cy + 12, width: 30 },
        { x1: cx + 32, y1: cy + 12, x2: cx - 18, y2: cy + h * 0.18, width: 26 },
        { x1: cx - 18, y1: cy + h * 0.18, x2: cx, y2: cy + h * 0.32, width: 24 },
        { x1: cx - 28, y1: cy - h * 0.10, x2: cx - w * 0.25, y2: cy - h * 0.04, width: 18 },
        { x1: cx + 32, y1: cy + 12, x2: cx + w * 0.25, y2: cy + 28, width: 18 },
      ];
    },
    tiles: (w, h) => []
  },
  {
    id: 4,
    name: "Corporate Deadline Crisis (Excel Grout)",
    hindiName: "कॉरपोरेट एक्सेल शीट का कांड",
    memeRef: "Missed the client deadline? Excel sheet ke gaps me grout bhar denge!",
    thekedarQuote: "“Client ki deadline miss ho gayi! Code production me phat gaya! Manager fired karne wala hai!”",
    mistriQuote: "“Tension mat lo sir! Git merge conflicts aur Excel ke blank cells me GROUT BHAR DENGE! 📊”",
    badge: "Level 4: Corporate Jugaad Lead",
    tileColor: "#FAF8F5",
    tileBorder: "#E5E0D8",
    gapWidth: 24,
    targetFill: 84,
    groutColor: "#2D6A4F", // Natural Olive Forest Sage
    groutBorder: "#1B4332",
    generateGaps: (w, h) => {
      const rows = 4;
      const cols = 3;
      const gaps = [];
      const rowH = h / rows;
      const colW = w / cols;
      for (let r = 1; r < rows; r++) {
        gaps.push({ x1: w * 0.1, y1: r * rowH, x2: w * 0.9, y2: r * rowH, width: 24 });
      }
      for (let c = 1; c < cols; c++) {
        gaps.push({ x1: c * colW, y1: h * 0.12, x2: c * colW, y2: h * 0.88, width: 24 });
      }
      return gaps;
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.12, w: w * 0.26, h: h * 0.18, label: "Q1 Rev: NULL" },
      { x: w * 0.37, y: h * 0.12, w: w * 0.26, h: h * 0.18, label: "Bug #404: FATAL" },
      { x: w * 0.64, y: h * 0.12, w: w * 0.26, h: h * 0.18, label: "Status: PANIC" },
      { x: w * 0.1, y: h * 0.37, w: w * 0.53, h: h * 0.18, label: "Deadline: Overdue" },
      { x: w * 0.64, y: h * 0.37, w: w * 0.26, h: h * 0.18, label: "#DIV/0!" },
      { x: w * 0.1, y: h * 0.62, w: w * 0.80, h: h * 0.26, label: "RESOLUTION: MISTRI GROUT" }
    ]
  },
  {
    id: 5,
    name: "The Flunked Exam Marksheet (F to A+)",
    hindiName: "फेल मार्कशीट से A+ टॉपर",
    memeRef: "Physics me 00/100... marksheet me grout bhar ke pass ho jao!",
    thekedarQuote: "“Physics me ZERO! Maths me ZERO! Papa belan aur mummy jhadu leke gate pe khade hain!”",
    mistriQuote: "“F grade ke beech me ek danda lagao, baki ISME GROUT BHAR KE A+ BANA DENGE! 💯”",
    badge: "Level 5: Academic Hacker Mistri",
    tileColor: "#FEF9C3",
    tileBorder: "#FDE047",
    gapWidth: 26,
    targetFill: 84,
    groutColor: "#15803D", // Academic Green
    groutBorder: "#166534",
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      return [
        { x1: cx - 65, y1: cy - 95, x2: cx - 65, y2: cy + 95, width: 30 },
        { x1: cx - 65, y1: cy - 95, x2: cx + 25, y2: cy - 95, width: 28 },
        { x1: cx - 65, y1: cy, x2: cx + 5, y2: cy, width: 26 },
        { x1: cx + 25, y1: cy - 95, x2: cx + 25, y2: cy + 95, width: 28 },
        { x1: cx + 65, y1: cy - 25, x2: cx + 115, y2: cy - 25, width: 22 },
        { x1: cx + 90, y1: cy - 50, x2: cx + 90, y2: cy, width: 22 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.1, y: h * 0.1, w: w * 0.8, h: h * 0.8, label: "BOARD MARKSHEET: 00/100 ❌" }
    ]
  },
  {
    id: 6,
    name: "Shattered Phone Screen (Spiderweb)",
    hindiName: "टूटा हुआ आईफ़ोन स्क्रीन",
    memeRef: "Apple store maang raha 40,000... 50 rupaye ka grout bhar do!",
    thekedarQuote: "“Naya phone haath se gir gaya! Display me 25 dararein aa gayi! Screen replacement 40,000 ka hai!”",
    mistriQuote: "“Apple store mat jao saab! 50 rupaye ka paste lo, ISME WARM GROUT BHAR DENGE! 📱”",
    badge: "Level 6: Silicon Valley Jugaad",
    tileColor: "#292524",
    tileBorder: "#44403C",
    gapWidth: 20,
    targetFill: 84,
    groutColor: "#D97706", // Amber Sandstone
    groutBorder: "#B45309",
    generateGaps: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const cracks = [];
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      angles.forEach((deg, idx) => {
        const rad = (deg * Math.PI) / 180;
        const len = (idx % 2 === 0) ? Math.min(w, h) * 0.38 : Math.min(w, h) * 0.28;
        cracks.push({
          x1: cx,
          y1: cy,
          x2: cx + Math.cos(rad) * len,
          y2: cy + Math.sin(rad) * len,
          width: 18
        });
      });
      cracks.push({ x1: cx - 65, y1: cy - 55, x2: cx + 65, y2: cy - 55, width: 14 });
      cracks.push({ x1: cx + 65, y1: cy - 55, x2: cx + 65, y2: cy + 55, width: 14 });
      cracks.push({ x1: cx + 65, y1: cy + 55, x2: cx - 65, y2: cy + 55, width: 14 });
      cracks.push({ x1: cx - 65, y1: cy + 55, x2: cx - 65, y2: cy - 55, width: 14 });
      return cracks;
    },
    tiles: (w, h) => [
      { x: w * 0.18, y: h * 0.08, w: w * 0.64, h: h * 0.84, label: "AMOLED Gorilla Glass" }
    ]
  },
  {
    id: 7,
    name: "The Sinking Titanic (Hull Fracture)",
    hindiName: "टाइटैनिक का छेद",
    memeRef: "Captain: Ship is sinking! Mistri: Iceberg ke hole me grout bhar denge!",
    thekedarQuote: "“Captain! Iceberg ne ship ke side me 50-foot ka hole kar diya! Titanic dub raha hai!”",
    mistriQuote: "“Arey tension kyu le rahe ho Captain saab! Jaldi 5 bori cement lao, ISME GROUT BHAR DENGE! 🚢”",
    badge: "Level 7: Maritime Rescue Mistri",
    tileColor: "#1E293B",
    tileBorder: "#334155",
    gapWidth: 30,
    targetFill: 84,
    groutColor: "#0D9488", // Ocean Teal Mortar
    groutBorder: "#0F766E",
    generateGaps: (w, h) => {
      return [
        { x1: w * 0.12, y1: h * 0.50, x2: w * 0.88, y2: h * 0.50, width: 34 },
        { x1: w * 0.25, y1: h * 0.25, x2: w * 0.40, y2: h * 0.75, width: 26 },
        { x1: w * 0.60, y1: h * 0.30, x2: w * 0.75, y2: h * 0.70, width: 26 },
        { x1: w * 0.45, y1: h * 0.40, x2: w * 0.55, y2: h * 0.85, width: 22 }
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.12, y: h * 0.20, w: w * 0.76, h: h * 0.60, label: "RMS TITANIC STEEL HULL" }
    ]
  },
  {
    id: 8,
    name: "The Leaning Tower of Pisa (World Wonder)",
    hindiName: "पीसा की झुकी मीनार (अंतिम परीक्षा)",
    memeRef: "UNESCO calling Babu Mistri to fix 800-year-old leaning tower with Grout",
    thekedarQuote: "“UNESCO ki 800 saal purani building 5.5 degree jhuk gayi hai! Duniya ke sabse bade engineers fail ho gaye!”",
    mistriQuote: "“Engineers ne dimag nahi lagaya! Bas foundation ke niche 20 bori GROUT BHAR DENGE! 🏛️”",
    badge: "Level 8: UNESCO Chief Mistri",
    tileColor: "#FEF08A",
    tileBorder: "#CA8A04",
    gapWidth: 32,
    targetFill: 84,
    groutColor: "#9A3412", // Terracotta
    groutBorder: "#7C2D12",
    generateGaps: (w, h) => {
      const cx = w / 2;
      return [
        { x1: w * 0.12, y1: h * 0.78, x2: w * 0.88, y2: h * 0.66, width: 40 },
        { x1: cx - 55, y1: h * 0.18, x2: cx - 22, y2: h * 0.72, width: 28 },
        { x1: cx + 45, y1: h * 0.18, x2: cx + 75, y2: h * 0.70, width: 28 },
        { x1: cx - 85, y1: h * 0.36, x2: cx + 105, y2: h * 0.34, width: 24 },
        { x1: cx - 75, y1: h * 0.54, x2: cx + 95, y2: h * 0.52, width: 24 },
      ];
    },
    tiles: (w, h) => [
      { x: w * 0.24, y: h * 0.15, w: w * 0.52, h: h * 0.55, label: "Torre di Pisa (1372 AD)" }
    ]
  },
  {
    id: 9,
    name: "Infinite Mistri ASMR (Zen Meditation)",
    hindiName: "अनंत मिस्त्री समाधि (ASMR)",
    memeRef: "Sukoon hi sukoon! Unlimited satisfying tile grouting relaxation",
    thekedarQuote: "“Saab itni shanti kyu hai site pe? Kaam ho raha hai ya so gaye sab?”",
    mistriQuote: "“Shanti se ASMR grouting enjoy karo bhai... Sukoon hi sukoon! ✨”",
    badge: "Endless: Zen Grout Master",
    tileColor: "#FAF8F5",
    tileBorder: "#E5E0D8",
    gapWidth: 24,
    targetFill: 84,
    groutColor: "#B45309",
    groutBorder: "#92400E",
    generateGaps: (w, h) => {
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
  { name: "Raw Ochre Mortar", color: "#B45309", border: "#92400E" },
  { name: "Burnt Terracotta", color: "#9A3412", border: "#7C2D12" },
  { name: "Chalk Limestone White", color: "#F5F2EB", border: "#D6CEBF" },
  { name: "Amber River Sand", color: "#D97706", border: "#B45309" },
  { name: "Slate Ash Charcoal", color: "#44403C", border: "#292524" },
  { name: "Forest Olive Sage", color: "#2D6A4F", border: "#1B4332" },
  { name: "Rose Clay", color: "#9F1239", border: "#881337" }
];
