/* ============================================================================
   A Day Between the Mountains and the Sky — for Dhari

   One timeline drives everything. `q` runs from 0 to 5: each whole number is
   a chapter, and the fraction is how far through it we are. From q the script
   works out the sky, the light, the sun and moon, the mist, the birds, the
   sound, and which words are on screen.

   Nothing is downloaded except the fonts. Every mountain, tree and cloud is
   drawn here, so the page works by simply opening index.html.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Small helpers
     ---------------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionQuery.matches;
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', (e) => { reduceMotion = e.matches; });
  }

  // Seeded random numbers: the mountains look the same every time she opens it.
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // One-dimensional value noise, used to shape the ridgelines.
  const makeNoise = (seed) => {
    const r = rng(seed);
    const table = new Float32Array(512);
    for (let i = 0; i < 512; i++) table[i] = r();
    return (x) => {
      const i = Math.floor(x);
      const f = x - i;
      const a = table[i & 511];
      const b = table[(i + 1) & 511];
      return a + (b - a) * smooth(f);
    };
  };

  const hex = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgb = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const triplet = (c) => `${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])}`;

  const svgEl = (name, attrs, parent) => {
    const el = document.createElementNS(SVGNS, name);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(el);
    return el;
  };

  /* ------------------------------------------------------------------------
     The five chapters
     ---------------------------------------------------------------------- */
  const STAGES = [
    { name: 'First Light',          seconds: 16, from: 330,  to: 480,  quoteOn: 0.05, quoteOff: 0.9 },
    { name: 'The Golden Morning',   seconds: 15, from: 480,  to: 690,  quoteOn: 0.05, quoteOff: 0.9 },
    { name: 'A Peaceful Afternoon', seconds: 15, from: 690,  to: 930,  quoteOn: 0.05, quoteOff: 0.9 },
    { name: 'The Golden Hour',      seconds: 16, from: 930,  to: 1065, quoteOn: 0.05, quoteOff: 0.9 },
    { name: 'The Sunset',           seconds: 26, from: 1065, to: 1110, quoteOn: 0.05, quoteOff: 0.46 },
  ];
  const LETTER_AT = 4.56; // q at which the handwritten message appears
  const LETTER_MIN_PX = 14; // the handwriting never shrinks below this
  const TOTAL = STAGES.length;

  /* ------------------------------------------------------------------------
     Time-of-day keyframes
     Each row is the state of the world at one moment (q). Anything not listed
     falls back to DEFAULTS, which is bright midday. Values are blended with a
     smooth curve, so the sky never "jumps" between moments.
       top/mid/hor   sky colours, zenith to horizon
       dark          how much the land has sunk into night (0-1)
       warm/warmCol  how much golden light is on the land, and its colour
       alt           sun height (0 = horizon, negative = hidden)
       glowW/glowB   warm halo and bright halo around the sun
       gold/rose     light shafts between the ranges
       fog           mist in the valleys, tinted by `mist`
       cloudA/cHi/cLo cloud opacity, lit side, shadow side
       litE/litW     sunlit mountain faces (east = morning, west = evening)
       shadow        long evening shadows in the valley
       bird          how likely a flock is to cross
       mote          floating specks: colour and strength
     ---------------------------------------------------------------------- */
  const DEFAULTS = {
    top: '#3f95df', mid: '#7cbdf0', hor: '#cde8fa',
    dark: 0, warm: 0, warmCol: '#ffd6a0',
    alt: 0.8, core: '#fff4c4', glowW: 0, glowB: 0.55,
    gold: 0, rose: 0, fog: 0.2, mist: '#ffffff',
    cloudA: 1, cHi: '#ffffff', cLo: '#c9d6e8',
    stars: 0, moon: 0,
    litE: 0, litW: 0, litCol: '#ffd9a0', shadow: 0,
    bird: 0.25, birdCol: '#1a2440', snow: '#ffffff',
    mote: '#fff6d8', moteA: 0.35,
  };

  const KEY_DATA = [
    { q: 0,    top: '#050b22', mid: '#0d1840', hor: '#27306c', dark: 0.95, alt: -0.34, core: '#ffb36b', glowB: 0, fog: 0.75, mist: '#7f86c8',
      cloudA: 0.25, cHi: '#5a6aa8', cLo: '#1e2a5a', stars: 1, bird: 0, birdCol: '#0a1030', snow: '#6c78b8', mote: '#9fb0ff', moteA: 0.25 },
    { q: 0.45, top: '#16235a', mid: '#4a3f86', hor: '#e87d5a', dark: 0.8, warm: 0.5, warmCol: '#ff9a5a', alt: -0.1, core: '#ffb36b', glowW: 0.85, glowB: 0,
      rose: 0.5, fog: 0.8, mist: '#f0a6a0', cloudA: 0.5, cHi: '#ffb596', cLo: '#5a3f78', stars: 0.5, litE: 0.5, litCol: '#ffb070',
      bird: 0.5, birdCol: '#171c3c', snow: '#f4b5a8', mote: '#ffd2a0', moteA: 0.4 },
    { q: 0.9,  top: '#4a74b8', mid: '#f2b183', hor: '#ffd9a0', dark: 0.35, warm: 0.8, warmCol: '#ffc27a', alt: 0.2, core: '#ffd98a', glowW: 0.7, glowB: 0.35,
      gold: 0.8, fog: 0.65, mist: '#ffd9c4', cloudA: 0.75, cHi: '#fff0d8', cLo: '#c8a4b8', litE: 1, litCol: '#ffd08a',
      bird: 0.8, snow: '#ffe2c4', mote: '#ffe2a8', moteA: 0.5 },
    { q: 1.5,  top: '#5ba3e0', mid: '#a9d3ee', hor: '#f9e4b8', dark: 0.05, warm: 0.55, warmCol: '#ffe0a0', alt: 0.46, core: '#ffeaa8', glowW: 0.25, glowB: 0.5,
      gold: 0.95, fog: 0.5, mist: '#fff1dc', cloudA: 0.95, cLo: '#d4d9e8', litE: 0.6, litCol: '#fff0c0',
      bird: 0.6, snow: '#fffaf0', mote: '#fff0c0', moteA: 0.55 },
    { q: 2.0,  top: '#3f95df', mid: '#7cbdf0', hor: '#cde8fa', warm: 0.1, alt: 0.66, gold: 0.3, fog: 0.25, litE: 0.1, bird: 0.35 },
    { q: 2.5,  top: '#2e86da', mid: '#6bb6ee', hor: '#bfe3f9', alt: 0.88, fog: 0.15, bird: 0.3, moteA: 0.3 },
    { q: 3.0,  top: '#6b93d0', mid: '#f4c796', hor: '#ffe0b0', warm: 0.55, warmCol: '#ffcb8a', alt: 0.5, core: '#ffe9a8', glowW: 0.4, glowB: 0.45,
      gold: 0.6, fog: 0.3, mist: '#ffe6cc', cloudA: 0.95, cHi: '#fff1dc', cLo: '#e8c4c0', litW: 0.6, litCol: '#ffcf90', shadow: 0.35,
      bird: 0.45, birdCol: '#2a2744', snow: '#ffe6d0', mote: '#ffe0a8', moteA: 0.5 },
    { q: 3.5,  top: '#7a82cc', mid: '#f4a99a', hor: '#ffc78e', dark: 0.1, warm: 0.85, warmCol: '#ff9f70', alt: 0.3, core: '#ffc880', glowW: 0.75, glowB: 0.3,
      gold: 0.3, rose: 0.6, fog: 0.4, mist: '#ffc6b0', cloudA: 0.95, cHi: '#ffd9c0', cLo: '#d890a8', litW: 1, litCol: '#ffb27a', shadow: 0.7,
      bird: 0.55, birdCol: '#2a2244', snow: '#ffc8b8', mote: '#ffd0a0', moteA: 0.5 },
    { q: 4.0,  top: '#4b4a98', mid: '#e07f90', hor: '#ffa264', dark: 0.22, warm: 1, warmCol: '#ff8a5a', alt: 0.14, core: '#ffb070', glowW: 1, glowB: 0.15,
      rose: 0.8, fog: 0.5, mist: '#f5a2a8', cloudA: 0.9, cHi: '#ffb89a', cLo: '#a85c92', litW: 1, litCol: '#ff9a70', shadow: 0.9,
      bird: 0.6, birdCol: '#241d40', snow: '#ffa890', mote: '#ffc090', moteA: 0.5 },
    { q: 4.4,  top: '#2a2570', mid: '#8a3f86', hor: '#f06a52', dark: 0.55, warm: 1, warmCol: '#ff6a4a', alt: -0.14, core: '#ff9a60', glowW: 0.85, glowB: 0,
      rose: 0.55, fog: 0.6, mist: '#b76a9c', cloudA: 0.85, cHi: '#e9808e', cLo: '#6a3a86', stars: 0.25, litW: 0.45, litCol: '#ff7a6a', shadow: 0.6,
      bird: 0.2, birdCol: '#1a1536', snow: '#c06a98', mote: '#ff9a7a', moteA: 0.4 },
    { q: 4.75, top: '#0d1245', mid: '#2a2a74', hor: '#7a3f80', dark: 0.85, warm: 0.4, warmCol: '#c05a8a', alt: -0.28, core: '#ff9a60', glowW: 0.35, glowB: 0,
      fog: 0.7, mist: '#5a5aa6', cloudA: 0.55, cHi: '#9a6aa0', cLo: '#3a2a6a', stars: 0.85, moon: 0.9, shadow: 0.3,
      bird: 0, birdCol: '#0a1030', snow: '#6a6aa8', mote: '#e8f0a0', moteA: 0.55 },
    { q: 5,    top: '#060a26', mid: '#0e1745', hor: '#2a2c6a', dark: 0.95, alt: -0.34, core: '#ff9a60', glowB: 0, fog: 0.7, mist: '#6870b8',
      cloudA: 0.35, cHi: '#5a6aa8', cLo: '#1e2a5a', stars: 1, moon: 1, bird: 0, birdCol: '#0a1030', snow: '#6c78b8', mote: '#f0f6a8', moteA: 0.6 },
  ];

  // Colour strings become [r, g, b] once, so the per-frame blend is only arithmetic.
  const KEYS = KEY_DATA.map((row) => {
    const full = Object.assign({}, DEFAULTS, row);
    for (const k in full) if (typeof full[k] === 'string') full[k] = hex(full[k]);
    return full;
  });
  const FIELDS = Object.keys(DEFAULTS);
  const UNCLAMPED = { alt: true };

  // Catmull-Rom: passes through every keyframe without stop-and-go speed changes.
  const spline = (p0, p1, p2, p3, t) =>
    0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

  function sampleLight(q) {
    q = clamp(q, 0, TOTAL);
    let i = 0;
    while (i < KEYS.length - 2 && q > KEYS[i + 1].q) i++;
    const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
    const t = clamp((q - k1.q) / (k2.q - k1.q));
    const out = {};
    for (const f of FIELDS) {
      if (typeof k1[f] === 'number') {
        const v = spline(k0[f], k1[f], k2[f], k3[f], t);
        out[f] = UNCLAMPED[f] ? v : clamp(v);
      } else {
        out[f] = [0, 1, 2].map((c) => clamp(spline(k0[f][c], k1[f][c], k2[f][c], k3[f][c], t), 0, 255));
      }
    }
    return out;
  }

  // Clock time for a position on the timeline: 5:30 AM at the start, 6:30 PM at the end.
  function clockFor(q) {
    const i = Math.min(TOTAL - 1, Math.floor(q));
    const s = STAGES[i];
    const minutes = lerp(s.from, s.to, clamp(q - i));
    const h24 = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
  }

  /* ------------------------------------------------------------------------
     Scenery
     Everything is drawn on a 1400 x 600 grid, but we draw well past both
     edges (X0..X1) so wide screens never show a gap beside the mountains.
     Colours come from CSS variables (--c-l0 and friends) that the lighting
     code updates as the day moves on.
     ---------------------------------------------------------------------- */
  const X0 = -900;
  const X1 = 2300;
  const FLOOR = 900; // how far below the grid the land is filled in
  const f1 = (n) => n.toFixed(1);

  const ridgeAt = (pts, x) => {
    const step = pts[1].x - pts[0].x;
    const i = clamp((x - pts[0].x) / step, 0, pts.length - 1.001);
    const a = pts[Math.floor(i)];
    const b = pts[Math.floor(i) + 1];
    return lerp(a.y, b.y, i - Math.floor(i));
  };

  // A pine drawn as stacked skirts: tip, then a wider skirt for every tier.
  function tieredPine(x, y, h, w, tiers) {
    const right = [];
    const left = [];
    for (let i = 0; i < tiers; i++) {
      const wi = w * (0.4 + (0.6 * (i + 1)) / tiers);
      const yb = y - h + (h * (i + 1)) / tiers;
      right.push([x + wi, yb], [x + wi * 0.42, yb]);
      left.push([x - wi, yb], [x - wi * 0.42, yb]);
    }
    right.pop();
    left.pop();
    let d = `M${f1(x)},${f1(y - h)}`;
    for (const p of right) d += `L${f1(p[0])},${f1(p[1])}`;
    for (let i = left.length - 1; i >= 0; i--) d += `L${f1(left[i][0])},${f1(left[i][1])}`;
    return d + 'Z';
  }

  // A jagged white cap near the top of a tall peak.
  function snowCap(pts, i, depth) {
    const a = pts[i];
    const cut = a.y + depth;
    let l = i;
    let r = i;
    while (r < pts.length - 1 && pts[r + 1].y < cut) r++;
    while (l > 0 && pts[l - 1].y < cut) l--;
    if (r === i || l === i) return '';
    let d = `M${f1(a.x)},${f1(a.y)}`;
    for (let j = i + 1; j <= r; j++) d += `L${f1(pts[j].x)},${f1(pts[j].y)}`;
    const n = 4;
    for (let k = 1; k < n; k++) {
      const x = lerp(pts[r].x, pts[l].x, k / n);
      d += `L${f1(x)},${f1(cut + (k % 2 ? 1 : -1) * depth * 0.22)}`;
    }
    for (let j = l; j < i; j++) d += `L${f1(pts[j].x)},${f1(pts[j].y)}`;
    return d + 'Z';
  }

  /**
   * One mountain range: a silhouette, plus overlays for the faces that catch
   * the sun. The sun rises on the left of the sky and sets on the right, so
   * morning light falls on left-hand slopes and evening light on right-hand ones.
   */
  function buildRange(svg, o) {
    const noise = makeNoise(o.seed);
    const rand = rng(o.seed * 13 + 5);
    const step = 8;
    const pts = [];
    for (let x = X0; x <= X1; x += step) {
      let h = 0;
      let total = 0;
      let amp = 1;
      let freq = o.freq;
      for (let k = 0; k < o.oct; k++) {
        h += amp * (1 - Math.abs(2 * noise(x * freq + k * 17.3) - 1));
        total += amp;
        amp *= o.gain;
        freq *= 2.15;
      }
      h /= total;
      const envelope = 0.4 + 0.6 * noise(x * o.freq * 0.3 + 91.7);
      pts.push({ x, y: o.base - o.amp * Math.pow(h, o.pow) * envelope * 1.15 });
    }

    // The land runs well below the screen so the scene can be lifted (see --lift) without a gap.
    let d = `M${X0},${FLOOR}`;
    for (const p of pts) d += `L${f1(p.x)},${f1(p.y)}`;
    const outline = d + `L${X1},${FLOOR}Z`;
    svg.appendChild(svgEl('path', { d: outline, style: `fill:var(${o.color})` }));

    // Find the peaks, then build the sunlit faces and snow caps around them.
    const win = Math.round(o.peakWin / step);
    let litR = '';
    let litL = '';
    let snow = '';
    for (let i = win; i < pts.length - win; i++) {
      let isPeak = true;
      for (let j = 1; j <= win && isPeak; j++) isPeak = pts[i - j].y > pts[i].y && pts[i + j].y > pts[i].y;
      if (!isPeak) continue;

      const a = pts[i];
      let l = i;
      let r = i;
      while (l > 0 && pts[l - 1].y >= pts[l].y && i - l < 70) l--;
      while (r < pts.length - 1 && pts[r + 1].y >= pts[r].y && r - i < 70) r++;
      const riseL = pts[l].y - a.y;
      const riseR = pts[r].y - a.y;
      if (Math.min(riseL, riseR) < o.minRise) continue;

      const vy = Math.max(pts[l].y, pts[r].y);
      const s1 = { x: a.x + (rand() - 0.5) * 10, y: a.y + 0.36 * (vy - a.y) };
      const s2 = { x: a.x + (rand() - 0.5) * 20, y: a.y + 0.76 * (vy - a.y) };
      const spine = `L${f1(s2.x)},${f1(s2.y)}L${f1(s1.x)},${f1(s1.y)}Z`;

      let dr = `M${f1(a.x)},${f1(a.y)}`;
      for (let j = i + 1; j <= r; j++) dr += `L${f1(pts[j].x)},${f1(pts[j].y)}`;
      litR += dr + spine;

      let dl = `M${f1(a.x)},${f1(a.y)}`;
      for (let j = i - 1; j >= l; j--) dl += `L${f1(pts[j].x)},${f1(pts[j].y)}`;
      litL += dl + spine;

      if (o.snow && Math.max(riseL, riseR) > o.snow) snow += snowCap(pts, i, Math.max(riseL, riseR) * 0.2);
    }

    const make = (path, attrs) => (path ? svg.appendChild(svgEl('path', Object.assign({ d: path }, attrs))) : null);
    const refs = {
      snow: make(snow, { style: 'fill:var(--c-snow)' }),
      litR: make(litR, { fill: 'url(#litGrad)', opacity: 0 }),
      litL: make(litL, { fill: 'url(#litGrad)', opacity: 0 }),
      weight: o.lit,
    };
    return { pts, refs, outline };
  }

  /** Rows of small pines along a ridge. Each cluster sways as one patch of forest. */
  function buildForestRow(svg, pts, o) {
    const rand = rng(o.seed);
    let cluster = [];
    const flush = () => {
      if (!cluster.length) return;
      const path = svgEl('path', {
        d: cluster.join(''),
        class: 'sway',
        style: `fill:var(${o.color});--dur:${lerp(5, 8, rand()).toFixed(1)}s;--delay:-${(rand() * 8).toFixed(1)}s;--sw:${o.sway}deg`,
      });
      svg.appendChild(path);
      cluster = [];
    };
    for (let x = X0; x <= X1; x += o.gap * (0.7 + rand() * 0.7)) {
      const h = lerp(o.h[0], o.h[1], rand());
      cluster.push(tieredPine(x, ridgeAt(pts, x) + 4, h, h * 0.3, 3));
      if (cluster.length >= 13) flush();
    }
    flush();
  }

  /**
   * The waterfall: a thin cascade down the face of the middle range, in three
   * drops. Its foot slips behind the forest ridge in front, so the water seems
   * to pour into the trees. `clip` keeps it inside the mountain's outline.
   */
  function buildWaterfall(svg, clip, top, bottom, wx) {
    const g = svgEl('g', { 'clip-path': `url(#${clip})` }, svg);
    const rand = rng(88);
    const h = bottom - top;
    const ts = [0, 0.34, 0.68, 1];          // where the three drops start and end
    const xs = [wx, wx + 2.5, wx - 1.5, wx + 1]; // each ledge nudges the stream sideways
    const ws = [3.6, 5.2, 7.2, 11];              // and the water widens as it falls
    const ys = ts.map((t) => top + h * t);

    for (let i = 0; i < 3; i++) {
      const w0 = ws[i];
      const w1 = ws[i + 1] * 1.1;
      svgEl('path', {
        d: `M${f1(xs[i] - w0 / 2)},${f1(ys[i])}L${f1(xs[i] + w0 / 2)},${f1(ys[i])}` +
           `L${f1(xs[i + 1] + w1 / 2)},${f1(ys[i + 1])}L${f1(xs[i + 1] - w1 / 2)},${f1(ys[i + 1])}Z`,
        fill: 'url(#fallGrad)',
      }, g);
      // A few bright streaks that slide down the water.
      for (const k of [-0.22, 0.22]) {
        svgEl('path', {
          d: `M${f1(xs[i] + k * w0)},${f1(ys[i])}L${f1(xs[i + 1] + k * w1)},${f1(ys[i + 1])}`,
          class: 'fall-flow',
          fill: 'none',
          stroke: '#fff',
          'stroke-width': 0.9,
          'stroke-opacity': 0.9,
          style: `animation-delay:-${(rand() * 1.1).toFixed(2)}s`,
        }, g);
      }
      if (i > 0) svgEl('ellipse', { cx: xs[i], cy: f1(ys[i]), rx: 7 + 2 * i, ry: 2.4, fill: 'url(#foamGrad)' }, g);
    }

    // Spray at the foot, half hidden by the ridge and trees in front.
    svgEl('ellipse', { class: 'foam', cx: xs[3], cy: f1(bottom - 15), rx: 24, ry: 9, fill: 'url(#foamGrad)' }, g);
    return g;
  }

  /** Meadow, river, pines, wildflowers and the long evening shadows. */
  function buildValley(svg, riverX) {
    const noise = makeNoise(412);
    const rand = rng(909);
    const ground = (x) => 500 + 28 * noise(x * 0.0042 + 8.2);
    const nearer = (x) => 549 + 22 * noise(x * 0.0058 + 40.3);

    const land = (fn, step, attrs) => {
      let d = `M${X0},${FLOOR}`;
      for (let x = X0; x <= X1; x += step) d += `L${x},${f1(fn(x))}`;
      return svg.appendChild(svgEl('path', Object.assign({ d: d + `L${X1},${FLOOR}Z` }, attrs)));
    };
    land(ground, 10, { style: 'fill:var(--c-valley)' });
    land(nearer, 12, { style: 'fill:var(--c-meadow)' });

    // River: it leaves the spray at the foot of the falls, winds toward the
    // viewer and widens as it comes. A bank shadow gives it an edge.
    const y0 = ground(riverX) + 2;
    const centre = (t) => ({
      x: riverX - 120 * t + 50 * Math.sin(t * 6.2 + 0.5) * (0.3 + 0.7 * t),
      y: y0 + t * (650 - y0),
      w: 2.5 + 50 * Math.pow(t, 1.7),
    });
    const ribbon = (extra) => {
      const left = [];
      const right = [];
      for (let k = 0; k <= 28; k++) {
        const c = centre(k / 28);
        left.push(`${f1(c.x - c.w / 2 - extra)},${f1(c.y)}`);
        right.unshift(`${f1(c.x + c.w / 2 + extra)},${f1(c.y)}`);
      }
      return `M${left.join('L')}L${right.join('L')}Z`;
    };
    const river = svgEl('g', {}, svg);
    svgEl('path', { d: ribbon(2.2), fill: '#10301c', opacity: 0.32 }, river);
    svgEl('path', { d: ribbon(0), fill: 'url(#riverGrad)' }, river);
    for (const off of [-0.3, 0, 0.3]) {
      let line = '';
      for (let k = 3; k <= 28; k++) {
        const c = centre(k / 28);
        line += `${k === 3 ? 'M' : 'L'}${f1(c.x + off * c.w)},${f1(c.y)}`;
      }
      svgEl('path', {
        d: line, class: 'flow', fill: 'none', stroke: '#fff', 'stroke-width': 1.4,
        'stroke-linecap': 'round', 'stroke-opacity': 0.55, style: `animation-delay:-${Math.abs(off) * 4}s`,
      }, river);
    }
    svgEl('ellipse', { class: 'foam', cx: f1(riverX), cy: f1(y0 + 1), rx: 17, ry: 4.5, fill: 'url(#foamGrad)' }, river);

    const inWater = (x, y, pad) => {
      const c = centre(clamp((y - y0) / (650 - y0)));
      return Math.abs(x - c.x) < c.w / 2 + pad;
    };

    // Wildflowers, kept out of the water.
    const flowers = svgEl('g', {}, svg);
    const colours = ['#ffd1dc', '#ffe38a', '#ffffff', '#d6c4ff'];
    for (let k = 0; k < 140; k++) {
      const x = lerp(-300, 1700, rand());
      const y = lerp(ground(x) + 10, 610, rand());
      if (inWater(x, y, 14)) continue;
      svgEl('circle', { cx: f1(x), cy: f1(y), r: f1(lerp(1, 2.3, rand())), fill: colours[k % 4] }, flowers);
    }

    // Pines at the sides, each with a long shadow for the golden hour.
    // The sun is low on the right by then, so the shadows stretch to the left.
    const shadows = svgEl('g', { opacity: 0 }, svg);
    const trees = svgEl('g', {}, svg);
    const spots = [90, 175, 260, 345, 420, 505, 590, 960, 1040, 1125, 1210, 1300, 1390, -160, -40, 1520, 1650];
    for (const sx of spots) {
      const x = sx + (rand() - 0.5) * 40;
      const y = ground(x) + 6;
      if (inWater(x, y, 30)) continue;
      const h = lerp(44, 88, rand());
      const w = h * 0.3;
      svgEl('path', {
        d: tieredPine(x, y, h, w, 4), class: 'sway', style: `fill:var(--c-tree);--dur:${lerp(5, 8, rand()).toFixed(1)}s;--delay:-${(rand() * 8).toFixed(1)}s;--sw:1.1deg`,
      }, trees);
      svgEl('path', { d: `M${f1(x + w * 0.4)},${f1(y - 3)}L${f1(x - h * 3.3)},${f1(y + 4)}L${f1(x - h * 3.3)},${f1(y + 7)}L${f1(x + w * 0.4)},${f1(y + 11)}Z`, fill: 'url(#shadowGrad)' }, shadows);
    }

    const wash = land(ground, 10, { fill: 'url(#shadeWash)', opacity: 0 });
    return { flowers, shadows, wash, river };
  }

  /** Dark pines that frame both lower corners of the screen. */
  function buildForeground(svg, seed, xs, heights) {
    const rand = rng(seed);
    xs.forEach((x, i) => {
      const h = heights[i];
      svgEl('path', {
        d: tieredPine(x, 730, h, h * 0.3, 6),
        class: 'sway',
        style: `fill:var(${i % 2 ? '--c-fg2' : '--c-fg'});--dur:${lerp(6, 9, rand()).toFixed(1)}s;--delay:-${(rand() * 9).toFixed(1)}s;--sw:0.8deg`,
      }, svg);
    });
  }

  function buildScenery() {
    const ranges = [
      { id: 'svg-l0', seed: 11, color: '--c-l0', base: 330, amp: 215, freq: 0.0042, oct: 4, gain: 0.5,  pow: 1.25, peakWin: 70, minRise: 38, snow: 80, lit: 1 },
      { id: 'svg-l1', seed: 29, color: '--c-l1', base: 385, amp: 185, freq: 0.0052, oct: 4, gain: 0.5,  pow: 1.25, peakWin: 60, minRise: 34, snow: 90, lit: 0.9 },
      { id: 'svg-l2', seed: 47, color: '--c-l2', base: 440, amp: 150, freq: 0.0064, oct: 4, gain: 0.48, pow: 1.2,  peakWin: 50, minRise: 28, snow: 0,  lit: 0.7 },
      { id: 'svg-l3', seed: 63, color: '--c-l3', base: 492, amp: 95,  freq: 0.0078, oct: 4, gain: 0.46, pow: 1.15, peakWin: 44, minRise: 20, snow: 0,  lit: 0.45 },
    ];
    const built = ranges.map((o) => buildRange($(o.id), o));
    const l3 = built[3];

    buildForestRow($('svg-l3t'), l3.pts, { seed: 5, color: '--c-trees', gap: 9, h: [26, 52], sway: 0.45 });

    // The falls go on a broad slope of the middle range, near the middle of the picture,
    // where it stands well clear of the forest ridge in front of it.
    const mid = built[2];
    const widthAt = (pts, x, y) => {
      let l = x;
      let r = x;
      while (l > X0 && ridgeAt(pts, l - 8) <= y) l -= 8;
      while (r < X1 && ridgeAt(pts, r + 8) <= y) r += 8;
      return r - l;
    };
    let wx = 720;
    let best = -Infinity;
    for (let x = 640; x <= 800; x += 8) {
      const gap = ridgeAt(l3.pts, x) - ridgeAt(mid.pts, x);
      const y = ridgeAt(mid.pts, x) + gap * 0.3;
      const score = gap + 0.6 * Math.min(widthAt(mid.pts, x, y), 170);
      if (score > best) { best = score; wx = x; }
    }
    const fallTop = ridgeAt(mid.pts, wx) + (ridgeAt(l3.pts, wx) - ridgeAt(mid.pts, wx)) * 0.2;
    const clip = svgEl('clipPath', { id: 'clip-mid' }, svgEl('defs', {}, $('svg-l2')));
    svgEl('path', { d: mid.outline }, clip);
    const waterfall = buildWaterfall($('svg-l2'), 'clip-mid', fallTop, ridgeAt(l3.pts, wx) + 14, wx);
    const valley = buildValley($('svg-valley'), wx);

    buildForeground($('fgL'), 21, [70, 160, 250, 335, 410], [690, 590, 640, 450, 340]);
    buildForeground($('fgR'), 34, [450, 365, 280, 195, 115], [660, 560, 610, 420, 330]);

    return { ranges: built.map((b) => b.refs), waterfall, valley };
  }

  /* ------------------------------------------------------------------------
     Clouds and birds
     ---------------------------------------------------------------------- */
  function buildClouds(container) {
    const r = rng(77);
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('div');
      el.className = 'cloud';
      el.style.setProperty('--s', lerp(0.55, 1.35, r()).toFixed(2));
      el.style.setProperty('--d', `${Math.round(lerp(150, 330, r()))}s`);
      el.style.setProperty('--delay', `-${Math.round(r() * 300)}s`);
      el.style.setProperty('--x', Math.round(r() * 80));
      el.style.top = `${(3 + r() * 36).toFixed(1)}vh`;
      el.style.opacity = lerp(0.55, 1, r()).toFixed(2);

      const n = 8 + Math.floor(r() * 3);
      const puffs = [];
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const bump = Math.sin(t * Math.PI);
        const rx = 30 + 36 * bump * (0.7 + r() * 0.5);
        puffs.push({ cx: 30 + 240 * t + (r() - 0.5) * 18, cy: 78 - bump * 22 * (0.4 + r() * 0.6), rx, ry: rx * (0.6 + r() * 0.22) });
      }
      const shade = puffs.map((p) => `<ellipse cx="${f1(p.cx)}" cy="${f1(p.cy + 8)}" rx="${f1(p.rx)}" ry="${f1(p.ry)}" fill="url(#puffLo)"/>`).join('');
      const lit = puffs.map((p) => `<ellipse cx="${f1(p.cx)}" cy="${f1(p.cy - 4)}" rx="${f1(p.rx * 0.94)}" ry="${f1(p.ry * 0.94)}" fill="url(#puffHi)"/>`).join('');
      el.innerHTML = `<svg viewBox="0 0 300 110" aria-hidden="true">${shade}${lit}</svg>`;
      container.appendChild(el);
    }
  }

  const BIRD_SVG =
    '<svg class="bird" viewBox="0 0 36 20" aria-hidden="true">' +
    '<path class="wing-l" d="M18 10Q11 1 1 5Q10 6 18 12Z"/>' +
    '<path class="wing-r" d="M18 10Q25 1 35 5Q26 6 18 12Z"/></svg>';

  /* ------------------------------------------------------------------------
     The world: sky, light, sun, moon, stars, specks, birds, parallax
     ---------------------------------------------------------------------- */
  const stage = $('stage');
  const view = { w: window.innerWidth, h: window.innerHeight, u: 1, lift: 0, dpr: 1, moon: 100 };

  // Base and night colours for each depth, and how much sky haze settles on it.
  const LAND = [
    { v: '--c-l0',     base: hex('#9fb4d6'), night: hex('#1b2552'), haze: 0.62 },
    { v: '--c-l1',     base: hex('#84a0c6'), night: hex('#151e47'), haze: 0.46 },
    { v: '--c-l2',     base: hex('#5f8aa6'), night: hex('#101839'), haze: 0.3 },
    { v: '--c-l3',     base: hex('#3f7a5a'), night: hex('#0b122d'), haze: 0.15 },
    { v: '--c-trees',  base: hex('#2c6048'), night: hex('#080e26'), haze: 0.08 },
    { v: '--c-valley', base: hex('#4e8f4a'), night: hex('#0a1229'), haze: 0.05 },
    { v: '--c-meadow', base: hex('#5fa557'), night: hex('#0c1630'), haze: 0.03 },
    { v: '--c-tree',   base: hex('#2b5a3c'), night: hex('#070c22'), haze: 0.02 },
    { v: '--c-fg',     base: hex('#183827'), night: hex('#04071a'), haze: 0 },
    { v: '--c-fg2',    base: hex('#1e4631'), night: hex('#050a1e'), haze: 0 },
  ];

  const landColour = (l, L) => {
    let c = mix(l.base, l.night, L.dark);
    c = mix(c, L.warmCol, L.warm * 0.3 * (0.4 + 0.6 * l.haze));
    return mix(c, L.hor, l.haze * (0.4 + 0.6 * (1 - L.dark * 0.55)));
  };

  const dom = {
    sky: $('sky'),
    sunRig: $('sunRig'),
    rays: $('rays'),
    moon: $('moon'),
    clouds: $('clouds'),
    glowWarm: $('glowWarm'),
    glowBright: $('glowBright'),
    mists: [$('mistA'), $('mistB'), $('mistC')],
  };
  const mistWeight = [0.9, 0.8, 0.65];
  let scenery = null;
  let rayGroups = null;
  let stops = null;

  function buildRays(container) {
    const r = rng(303);
    const groups = {};
    for (const kind of ['gold', 'rose']) {
      const g = document.createElement('div');
      g.className = `ray-group ${kind}`;
      for (let i = 0; i < 9; i++) {
        const ray = document.createElement('i');
        ray.style.setProperty('--a', `${(lerp(-55, 55, (i + 0.5) / 9) + (r() - 0.5) * 8).toFixed(1)}deg`);
        ray.style.setProperty('--w', `${lerp(4, 12, r()).toFixed(1)}vmax`);
        ray.style.setProperty('--o', lerp(0.35, 0.9, r()).toFixed(2));
        g.appendChild(ray);
      }
      container.appendChild(g);
      groups[kind] = g;
    }
    return groups;
  }

  function buildWorld() {
    scenery = buildScenery();
    buildClouds(dom.clouds);
    rayGroups = buildRays(dom.rays);
    const all = (sel) => Array.from(document.querySelectorAll(sel));
    stops = { hi: all('.puff-hi'), lo: all('.puff-lo'), lit: all('.lit'), riverTop: $('riverTop'), riverBot: $('riverBot') };
  }

  /** Cheap, every frame: where the sun, rays and moon are on screen. */
  function placeCelestials(L, q) {
    const { w, h, u } = view;
    const horizon = h - view.lift - 300 * u;
    const peak = Math.max(86, h * 0.2);
    const x = w * lerp(0.3, 0.7, clamp(q / 4.4));
    const y = L.alt >= 0 ? lerp(horizon, peak, Math.pow(L.alt, 0.9)) : horizon - L.alt * 420 * u;
    const move = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    dom.sunRig.style.transform = move;
    dom.rays.style.transform = move;

    const t = clamp((q - 4.3) / 0.7);
    // On wide screens keep the moon just clear of the letter card instead of behind it.
    const clearOfLetter = w / 2 + Math.min(350, (w - 36) / 2) + view.moon * 0.75;
    const cx = clearOfLetter + view.moon / 2 <= w ? Math.max(w * 0.74, clearOfLetter) : w * 0.74;
    const mx = cx - view.moon / 2;
    const my = h * lerp(0.3, 0.2, smooth(t)) - view.moon / 2;
    dom.moon.style.transform = `translate3d(${mx.toFixed(1)}px,${my.toFixed(1)}px,0)`;
    dom.moon.style.opacity = L.moon.toFixed(3);
  }

  /** A little slower: every colour in the scene. Called about 30 times a second. */
  function paintWorld(L) {
    dom.sky.style.background =
      `linear-gradient(180deg,${rgb(L.top)} 0%,${rgb(L.mid)} 46%,${rgb(L.hor)} 78%,${rgb(L.hor)} 100%)`;

    for (const l of LAND) stage.style.setProperty(l.v, rgb(landColour(l, L)));
    stage.style.setProperty('--c-snow', rgb(L.snow));
    stage.style.setProperty('--mist', triplet(L.mist));
    stage.style.setProperty('--bird', rgb(L.birdCol));
    stage.style.setProperty('--sun-core', rgb(L.core));

    dom.glowWarm.style.opacity = L.glowW.toFixed(3);
    dom.glowBright.style.opacity = L.glowB.toFixed(3);
    rayGroups.gold.style.opacity = L.gold.toFixed(3);
    rayGroups.rose.style.opacity = L.rose.toFixed(3);
    dom.mists.forEach((m, i) => { m.style.opacity = (L.fog * mistWeight[i]).toFixed(3); });
    dom.clouds.style.opacity = L.cloudA.toFixed(3);

    const setStops = (list, colour) => list.forEach((s) => s.setAttribute('stop-color', colour));
    setStops(stops.hi, rgb(L.cHi));
    setStops(stops.lo, rgb(L.cLo));
    setStops(stops.lit, rgb(L.litCol));

    const nightRiver = [10, 16, 50];
    stops.riverTop.setAttribute('stop-color', rgb(mix(mix(L.hor, [255, 255, 255], 0.3), nightRiver, L.dark * 0.75)));
    stops.riverBot.setAttribute('stop-color', rgb(mix(mix(L.mid, [40, 90, 130], 0.45), nightRiver, L.dark * 0.7)));

    for (const r of scenery.ranges) {
      // Morning sun is on the left, so left-hand slopes glow; at sunset it is on the right.
      if (r.litL) r.litL.setAttribute('opacity', (L.litE * r.weight).toFixed(3));
      if (r.litR) r.litR.setAttribute('opacity', (L.litW * r.weight).toFixed(3));
    }
    const v = scenery.valley;
    v.shadows.setAttribute('opacity', (L.shadow * 0.5).toFixed(3));
    v.wash.setAttribute('opacity', (L.shadow * 0.8).toFixed(3));
    v.flowers.setAttribute('opacity', (1 - L.dark * 0.7).toFixed(3));
    v.river.setAttribute('opacity', (1 - L.dark * 0.35).toFixed(3));
    scenery.waterfall.setAttribute('opacity', (1 - L.dark * 0.55).toFixed(3));
  }

  /* ------------------------------------------------------------------------
     Stars (and one shooting star)
     ---------------------------------------------------------------------- */
  const starField = (() => {
    const canvas = $('starCanvas');
    const ctx = canvas.getContext('2d');
    let stars = [];
    let shot = null;
    let shotDone = false;
    let wasVisible = false;

    function resize() {
      canvas.width = Math.round(view.w * view.dpr);
      canvas.height = Math.round(view.h * view.dpr);
      const r = rng(2024);
      const n = Math.round(clamp((view.w * view.h) / 5500, 110, 330));
      stars = Array.from({ length: n }, () => ({
        x: r() * view.w,
        y: Math.pow(r(), 1.5) * view.h * 0.66,
        r: lerp(0.35, 1.5, Math.pow(r(), 2.2)),
        speed: lerp(0.6, 2.4, r()),
        phase: r() * 6.28,
      }));
    }

    function draw(time, L, q) {
      const a = L.stars;
      if (a < 0.01 && !shot) {
        if (wasVisible) ctx.clearRect(0, 0, canvas.width, canvas.height);
        wasVisible = false;
        return;
      }
      wasVisible = true;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        const tw = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(time * 0.001 * s.speed + s.phase);
        ctx.globalAlpha = a * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
      }

      // One slow shooting star, late in the evening.
      if (q < 4.6) shotDone = false;
      if (!shot && !shotDone && !reduceMotion && q > 4.8 && q < 4.95) {
        shot = { t0: time, x: view.w * lerp(0.15, 0.4, Math.random()), y: view.h * 0.1 };
        shotDone = true;
      }
      if (shot) {
        const p = (time - shot.t0) / 1100;
        if (p >= 1) {
          shot = null;
        } else {
          const x = shot.x + p * view.w * 0.28;
          const y = shot.y + p * view.h * 0.14;
          const g = ctx.createLinearGradient(x, y, x - view.w * 0.09, y - view.h * 0.045);
          g.addColorStop(0, 'rgba(255,255,255,0.9)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = Math.sin(p * Math.PI);
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - view.w * 0.09, y - view.h * 0.045);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    return { resize, draw };
  })();

  /* ------------------------------------------------------------------------
     Floating specks: pollen in the light by day, fireflies by night
     ---------------------------------------------------------------------- */
  const motes = (() => {
    const canvas = $('motes');
    const ctx = canvas.getContext('2d');
    let items = [];
    let sprite = null;
    let tint = '';
    let tintAt = 0;

    function resize() {
      canvas.width = Math.round(view.w * view.dpr);
      canvas.height = Math.round(view.h * view.dpr);
      const r = rng(88);
      const n = view.w < 700 ? 26 : 46;
      items = Array.from({ length: n }, () => ({
        x: r() * view.w, y: r() * view.h,
        size: lerp(5, 17, Math.pow(r(), 1.6)),
        rise: lerp(2, 9, r()), drift: lerp(4, 16, r()),
        phase: r() * 6.28, pulse: lerp(0.4, 1.4, r()),
      }));
    }

    function makeSprite(colour) {
      const s = document.createElement('canvas');
      s.width = s.height = 32;
      const c = s.getContext('2d');
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, `rgba(${colour},1)`);
      g.addColorStop(0.35, `rgba(${colour},0.4)`);
      g.addColorStop(1, `rgba(${colour},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    }

    function draw(time, dt, L) {
      const colour = triplet(L.mote).replace(/ /g, ',');
      if (!sprite || (colour !== tint && time - tintAt > 250)) {
        sprite = makeSprite(colour);
        tint = colour;
        tintAt = time;
      }
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      ctx.clearRect(0, 0, view.w, view.h);
      const step = reduceMotion ? 0 : dt;
      const night = L.dark;
      for (const m of items) {
        m.y -= m.rise * step * (1 - night * 0.6);
        m.x += Math.sin(time * 0.0004 + m.phase) * m.drift * step;
        if (m.y < -20) { m.y = view.h + 20; m.x = Math.random() * view.w; }
        if (m.x < -20) m.x = view.w + 20;
        if (m.x > view.w + 20) m.x = -20;
        const glow = reduceMotion ? 0.6 : 0.5 + 0.5 * Math.sin(time * 0.001 * m.pulse + m.phase);
        ctx.globalAlpha = L.moteA * (0.25 + 0.75 * glow);
        const s = m.size * (1 + night * 0.5);
        ctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    return { resize, draw };
  })();

  /* ------------------------------------------------------------------------
     Birds: a few small flocks cross the sky while the light is good
     ---------------------------------------------------------------------- */
  const birds = (() => {
    const layer = $('birds');
    const flying = new Set();
    let wait = 3;
    let paused = false;

    function spawn() {
      const flock = document.createElement('div');
      flock.className = 'flock';
      const count = 3 + Math.floor(Math.random() * 4);
      const size = lerp(18, 32, Math.random());
      for (let i = 0; i < count; i++) {
        const wrap = document.createElement('div');
        wrap.innerHTML = BIRD_SVG;
        const bird = wrap.firstChild;
        const rank = Math.ceil(i / 2);
        const side = i % 2 ? 1 : -1;
        bird.style.left = `${(-rank * size * 0.9).toFixed(1)}px`;
        bird.style.top = `${(i ? side * rank * size * 0.55 : 0).toFixed(1)}px`;
        bird.style.setProperty('--bs', `${(size * lerp(0.8, 1, Math.random())).toFixed(1)}px`);
        bird.style.setProperty('--fl', `${lerp(0.45, 0.8, Math.random()).toFixed(2)}s`);
        bird.style.setProperty('--fd', `-${(Math.random() * 0.6).toFixed(2)}s`);
        flock.appendChild(bird);
      }
      layer.appendChild(flock);

      const rightward = Math.random() < 0.7;
      const y0 = view.h * lerp(0.1, 0.36, Math.random());
      const drift = view.h * lerp(-0.07, 0.05, Math.random());
      const from = rightward ? -160 : view.w + 160;
      const to = rightward ? view.w + 160 : -160;
      const at = (x, y) => ({ transform: `translate3d(${x}px,${y.toFixed(1)}px,0)` });
      const anim = flock.animate(
        [at(from, y0), at((from + to) / 2, y0 + drift * 0.4 - 14), at(to, y0 + drift)],
        { duration: lerp(17000, 27000, Math.random()), easing: 'linear' }
      );
      if (paused) anim.pause();
      flying.add(anim);
      anim.onfinish = () => { flying.delete(anim); flock.remove(); };
    }

    function tick(dt, L, playing) {
      if (!playing || reduceMotion) return;
      wait -= dt;
      if (wait > 0) return;
      wait = lerp(3.5, 8, Math.random());
      if (flying.size < 4 && Math.random() < L.bird) spawn();
    }

    function setPaused(p) {
      paused = p;
      flying.forEach((a) => (p ? a.pause() : a.play()));
    }

    function clear() {
      flying.forEach((a) => a.cancel());
      flying.clear();
      layer.textContent = '';
      wait = 2;
    }
    return { tick, setPaused, clear };
  })();

  /* ------------------------------------------------------------------------
     Parallax: the nearer the layer, the more it shifts with the pointer,
     plus a slow idle sway so phones feel alive too.
     ---------------------------------------------------------------------- */
  const parallax = (() => {
    const items = Array.from(document.querySelectorAll('.layer, .fg')).map((el) => ({ el, depth: parseFloat(el.dataset.depth) || 0, last: '' }));
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    function update(time) {
      const ax = Math.min(40, view.w * 0.015);
      const idle = reduceMotion ? 0 : Math.sin(time * 0.00007) * 0.22;
      const px = reduceMotion ? 0 : target.x;
      const py = reduceMotion ? 0 : target.y;
      now.x += (px + idle - now.x) * 0.05;
      now.y += (py - now.y) * 0.05;
      for (const it of items) {
        const t = `translate3d(${(-now.x * ax * it.depth).toFixed(1)}px,${((now.y + 0.5) * 10 * it.depth).toFixed(1)}px,0)`;
        if (t !== it.last) { it.el.style.transform = t; it.last = t; }
      }
    }
    return { update };
  })();

  /* ------------------------------------------------------------------------
     Ambient sound: wind, a river, birdsong by day, crickets at night.
     Synthesised with the Web Audio API, so there is nothing to download.
     Muted by default; the audio engine only starts when she presses the
     speaker button.
     ---------------------------------------------------------------------- */
  const sound = (() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const supported = Boolean(AudioCtx);
    let ctx = null;
    let on = false;
    let q = 0;
    let birdTimer = 0;
    let suspendTimer = 0;
    const nodes = {};

    function noiseBuffer(seconds, brown) {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = white;
        }
      }
      return buffer;
    }

    function loopNoise(brown) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(4, brown);
      src.loop = true;
      src.start();
      return src;
    }

    // A slow oscillator that nudges another parameter up and down.
    function wobble(param, hz, depth) {
      const lfo = ctx.createOscillator();
      const amount = ctx.createGain();
      lfo.frequency.value = hz;
      amount.gain.value = depth;
      lfo.connect(amount);
      amount.connect(param);
      lfo.start();
    }

    function build() {
      ctx = new AudioCtx();
      nodes.master = ctx.createGain();
      nodes.master.gain.value = 0;
      nodes.master.connect(ctx.destination);

      // Wind: low, breathing noise.
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 420;
      windFilter.Q.value = 0.6;
      nodes.wind = ctx.createGain();
      nodes.wind.gain.value = 0.4;
      loopNoise(true).connect(windFilter);
      windFilter.connect(nodes.wind);
      nodes.wind.connect(nodes.master);
      wobble(nodes.wind.gain, 0.11, 0.18);
      wobble(windFilter.frequency, 0.07, 180);

      // River: bright, bubbling noise that swells in the afternoon.
      const waterFilter = ctx.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.value = 1700;
      waterFilter.Q.value = 0.5;
      nodes.water = ctx.createGain();
      nodes.water.gain.value = 0.06;
      loopNoise(false).connect(waterFilter);
      waterFilter.connect(nodes.water);
      nodes.water.connect(nodes.master);
      wobble(nodes.water.gain, 0.37, 0.012);
      wobble(waterFilter.frequency, 0.23, 420);

      // Crickets: a high tone chopped into quick pulses.
      const cricket = ctx.createOscillator();
      cricket.frequency.value = 4300;
      const chop = ctx.createGain();
      chop.gain.value = 0.5;
      const pulse = ctx.createOscillator();
      pulse.type = 'square';
      pulse.frequency.value = 13;
      const pulseDepth = ctx.createGain();
      pulseDepth.gain.value = 0.5;
      pulse.connect(pulseDepth);
      pulseDepth.connect(chop.gain);
      nodes.crickets = ctx.createGain();
      nodes.crickets.gain.value = 0;
      cricket.connect(chop);
      chop.connect(nodes.crickets);
      nodes.crickets.connect(nodes.master);
      cricket.start();
      pulse.start();

      // Birdsong goes through its own bus so it can sit softly in the mix.
      nodes.birds = ctx.createGain();
      nodes.birds.gain.value = 0.1;
      nodes.birds.connect(nodes.master);
    }

    function phrase(start) {
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.random() * 1.6 - 0.8;
        pan.connect(nodes.birds);
      }
      const base = lerp(2200, 4200, Math.random());
      const notes = 2 + Math.floor(Math.random() * 4);
      let t = start;
      for (let i = 0; i < notes; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const from = base * lerp(0.9, 1.3, Math.random());
        osc.type = 'sine';
        osc.frequency.setValueAtTime(from, t);
        osc.frequency.exponentialRampToValueAtTime(from * (Math.random() < 0.5 ? 1.25 : 0.78), t + 0.07);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(gain);
        gain.connect(pan || nodes.birds);
        osc.start(t);
        osc.stop(t + 0.1);
        t += 0.09 + Math.random() * 0.07;
      }
    }

    function birdLoop() {
      if (!on) return;
      const density = clamp(1.15 - sampleLight(q).dark * 1.3);
      if (density > 0.08 && Math.random() < density) phrase(ctx.currentTime + 0.05);
      birdTimer = setTimeout(birdLoop, lerp(900, 4200, Math.random()) / (0.4 + density));
    }

    /** Called a few times a second so the soundscape follows the day. */
    function setQ(value) {
      q = value;
      if (!ctx) return;
      const t = ctx.currentTime;
      const afternoon = clamp(1 - Math.abs(q - 2.5) / 1.6);
      const dark = sampleLight(q).dark;
      const night = Math.max(clamp((q - 4.2) / 0.6) * 0.05, clamp(1 - q / 0.5) * 0.035);
      nodes.wind.gain.setTargetAtTime(0.4 + 0.2 * smooth(clamp((q - 1.5) / 1)) - dark * 0.12, t, 0.6);
      nodes.water.gain.setTargetAtTime(0.05 + 0.1 * afternoon, t, 0.6);
      nodes.crickets.gain.setTargetAtTime(night, t, 0.8);
    }

    /** Turns the sound on or off. Returns the new state. */
    function toggle() {
      if (!supported) return false;
      if (!ctx) build();
      on = !on;
      clearTimeout(suspendTimer);
      clearTimeout(birdTimer);
      if (on) {
        ctx.resume();
        setQ(q);
        nodes.master.gain.setTargetAtTime(0.7, ctx.currentTime, 0.5);
        birdTimer = setTimeout(birdLoop, 600);
      } else {
        nodes.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        suspendTimer = setTimeout(() => { if (!on) ctx.suspend(); }, 1200);
      }
      return on;
    }

    document.addEventListener('visibilitychange', () => {
      if (!ctx || !on) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });

    return { supported, toggle, setQ };
  })();

  /* ------------------------------------------------------------------------
     The journey: timeline, words, controls
     ---------------------------------------------------------------------- */
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const stopButtons = Array.from(document.querySelectorAll('.stop'));
  const stopBars = stopButtons.map((b) => ({ el: b.querySelector('.stop-bar i'), last: -1 }));
  const ui = {
    letter: $('letter'),
    letterCard: $('letterCard'),
    timeText: $('timeText'),
    phaseText: $('phaseText'),
    pause: $('btnPause'),
    replay: $('btnReplay'),
    sound: $('btnSound'),
    start: $('btnStart'),
    veil: $('veil'),
    status: $('srStatus'),
  };

  const state = {
    phase: 'intro',   // intro | playing | paused | done
    q: 0,             // position on the timeline, 0 to 5
    scrub: null,      // a glide to another chapter: { from, to, t, dur }
    hold: 0,          // seconds to wait before the day starts moving
    locked: false,    // true while the screen fades for a replay
    chapter: -1,      // which quote is showing
    letterOpen: false,
    stage: -1,        // which chapter the clock and progress bar show
    clock: '',
  };

  const currentStage = () => Math.min(TOTAL - 1, Math.floor(state.q));

  /** Splits the letter into words so they can be written out one by one. */
  function prepareLetter() {
    let index = 0;
    ui.letterCard.querySelectorAll('p').forEach((p) => {
      const words = p.textContent.trim().split(/\s+/);
      p.textContent = '';
      words.forEach((word, i) => {
        const span = document.createElement('span');
        span.className = 'word';
        span.style.setProperty('--i', index++);
        span.textContent = word;
        p.appendChild(span);
        if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
      });
    });
    ui.letter.style.setProperty('--n', index);
  }

  /**
   * Sizes the handwriting so the whole message, sign-off and button included,
   * fits on this screen. It measures the real layout, so it stays right
   * whichever font ends up loading. The card still scrolls on a very small
   * screen, where the text can only shrink so far.
   */
  function fitLetter() {
    const card = ui.letterCard;
    const pad = getComputedStyle(ui.letter);
    const room = ui.letter.clientHeight - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    if (room <= 0) return;
    card.style.fontSize = '';
    card.style.maxHeight = 'none';
    let size = parseFloat(getComputedStyle(card).fontSize);
    while (card.offsetHeight > room && size > LETTER_MIN_PX) {
      size -= 0.5;
      card.style.fontSize = `${size}px`;
    }
    card.style.maxHeight = '';
  }

  let letterScroll = 0;

  function setLetter(open) {
    state.letterOpen = open;
    ui.letter.classList.toggle('is-open', open);
    ui.letter.setAttribute('aria-hidden', String(!open));
    ui.letterCard.tabIndex = open ? 0 : -1;
    clearTimeout(letterScroll);
    if (!open) return;
    fitLetter();
    ui.letterCard.scrollTop = 0;
    // Only on a screen too small to fit it: follow the writing down to the sign-off.
    if (ui.letterCard.scrollHeight > ui.letterCard.clientHeight + 4) {
      const words = Number(ui.letter.style.getPropertyValue('--n')) || 100;
      letterScroll = setTimeout(() => {
        ui.letterCard.scrollTo({ top: ui.letterCard.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
      }, words * 85 + 1000);
    }
  }

  /** Shows the quote that belongs to this moment, and the letter at the very end. */
  function updateWords() {
    let want = -1;
    const active = state.phase !== 'intro' && !state.scrub;
    if (active && state.q < TOTAL) {
      const i = currentStage();
      const local = state.q - i;
      if (local >= STAGES[i].quoteOn && local <= STAGES[i].quoteOff) want = i;
    }
    if (want !== state.chapter) {
      chapters.forEach((c, k) => c.classList.toggle('is-on', k === want));
      state.chapter = want;
    }
    const wantLetter = active && state.q >= LETTER_AT;
    if (wantLetter !== state.letterOpen) setLetter(wantLetter);
  }

  /** Clock, chapter name and the five progress bars. */
  function updateHud() {
    const clock = clockFor(state.q);
    if (clock !== state.clock) {
      ui.timeText.textContent = clock;
      state.clock = clock;
    }
    const stage = currentStage();
    if (stage !== state.stage) {
      state.stage = stage;
      ui.phaseText.textContent = STAGES[stage].name;
      stopButtons.forEach((b, k) => {
        b.classList.toggle('is-active', k === stage);
        if (k === stage) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
      if (state.phase !== 'intro') ui.status.textContent = `${STAGES[stage].name}, ${clock}`;
    }
    stopBars.forEach((bar, k) => {
      const p = clamp(state.q - k);
      if (Math.abs(p - bar.last) > 0.002) {
        bar.el.style.transform = `scaleX(${p.toFixed(3)})`;
        bar.last = p;
      }
    });
  }

  function advance(dt) {
    if (state.scrub) {
      const s = state.scrub;
      s.t += dt;
      const p = clamp(s.t / s.dur);
      state.q = lerp(s.from, s.to, smooth(p));
      if (p >= 1) state.scrub = null;
      return;
    }
    if (state.phase !== 'playing' || state.locked) return;
    if (state.hold > 0) {
      state.hold -= dt;
      return;
    }
    state.q += dt / STAGES[currentStage()].seconds;
    if (state.q >= TOTAL) {
      state.q = TOTAL;
      state.phase = 'done';
      stage.dataset.phase = 'done';
      ui.pause.hidden = true;
    }
  }

  /* ------------------------------------------------------------------------
     Controls
     ---------------------------------------------------------------------- */
  function setPhase(phase) {
    state.phase = phase;
    stage.dataset.phase = phase;
    const paused = phase === 'paused';
    ui.pause.hidden = phase === 'intro' || phase === 'done';
    ui.pause.classList.toggle('is-paused', paused);
    ui.pause.setAttribute('aria-label', paused ? 'Resume the day' : 'Pause the day');
    birds.setPaused(paused);
  }

  function begin() {
    if (state.phase !== 'intro') return;
    ui.replay.hidden = false;
    state.hold = 0.9;
    setPhase('playing');
    ui.pause.focus({ preventScroll: true });
  }

  function togglePause() {
    if (state.phase === 'playing') setPhase('paused');
    else if (state.phase === 'paused') setPhase('playing');
  }

  function goTo(index) {
    if (state.phase === 'intro' || state.locked) return;
    index = clamp(index, 0, TOTAL - 1);
    const distance = Math.abs(index - state.q);
    state.scrub = { from: state.q, to: index, t: 0, dur: clamp(distance * 0.55 + 0.9, 1.1, 2.6) };
    state.hold = 0;
    if (state.phase === 'done') setPhase('playing');
  }

  function replay() {
    if (state.phase === 'intro' || state.locked) return;
    state.locked = true;
    ui.veil.classList.add('on');
    setTimeout(() => {
      state.q = 0;
      state.scrub = null;
      state.hold = 0.8;
      birds.clear();
      setLetter(false);
      setPhase('playing');
      state.locked = false;
      ui.veil.classList.remove('on');
      ui.pause.focus({ preventScroll: true });
    }, 950);
  }

  function toggleSound() {
    const on = sound.toggle();
    ui.sound.setAttribute('aria-pressed', String(on));
    ui.sound.setAttribute('aria-label', on ? 'Turn nature sounds off' : 'Turn nature sounds on');
  }

  function bindControls() {
    ui.start.addEventListener('click', begin);
    ui.pause.addEventListener('click', togglePause);
    ui.replay.addEventListener('click', replay);
    $('btnReplayLetter').addEventListener('click', replay);
    ui.sound.addEventListener('click', toggleSound);
    stopButtons.forEach((b) => b.addEventListener('click', () => goTo(Number(b.dataset.stage))));
    if (!sound.supported) ui.sound.hidden = true;

    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || state.phase === 'intro') return;
      const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
      if (e.key === ' ' && !onButton) {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'ArrowRight') {
        goTo(currentStage() + 1);
      } else if (e.key === 'ArrowLeft') {
        goTo(state.q - currentStage() > 0.15 ? currentStage() : currentStage() - 1);
      } else if (e.key === 'm' || e.key === 'M') {
        if (sound.supported) toggleSound();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Size, loop, start
     ---------------------------------------------------------------------- */
  function resize() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fill = Math.max(view.w / 1400, view.h / 1000);
    view.u = Math.min(fill, Math.max(view.w / 1400, view.h * 0.00135));
    stage.style.setProperty('--u', `${view.u.toFixed(4)}px`);
    // The whole landscape sits a little above the bottom edge, so the meadow and
    // river show above the progress bar instead of hiding behind it.
    view.lift = clamp(view.h * 0.075, 26, 80);
    stage.style.setProperty('--lift', `${view.lift.toFixed(1)}px`);
    view.moon = dom.moon.offsetWidth || 100;
    starField.resize();
    motes.resize();
  }

  let lastTime = 0;
  let paintedAt = -1000;
  let soundedAt = -1000;
  let frameCount = 0;

  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000 || 0);
    lastTime = now;
    frameCount++;

    advance(dt);
    const L = sampleLight(state.q);
    placeCelestials(L, state.q);
    if (state.scrub || now - paintedAt > 33) {
      paintWorld(L);
      paintedAt = now;
    }
    if (frameCount % 2 === 0) starField.draw(now, L, state.q);
    motes.draw(now, dt, L);
    parallax.update(now);
    birds.tick(dt, L, state.phase === 'playing');
    updateWords();
    updateHud();
    if (now - soundedAt > 250) {
      sound.setQ(state.q);
      soundedAt = now;
    }
    requestAnimationFrame(frame);
  }

  function init() {
    prepareLetter();
    buildWorld();
    resize();
    fitLetter();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLetter);
    bindControls();

    let resizing = 0;
    const onResize = () => {
      cancelAnimationFrame(resizing);
      resizing = requestAnimationFrame(() => {
        resize();
        fitLetter();
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    requestAnimationFrame(frame);
  }

  init();
})();
