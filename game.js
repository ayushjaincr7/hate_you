(() => {
'use strict';

/* ============================================================
   FIND DHARI — a little love game (hard mode)
   This opens the site. Finding her name starts the mountain day (script.js).
   Edit the constants below to make it yours.
   ============================================================ */
const NAME = 'DHARI';                       // the hidden word (keep it uppercase)
const LOVE_LINES = [                        // shown one by one in the finale
  'I hid your name in a puzzle, a garden, and under a rose.',
  "It didn't matter where — my heart found you every single time.",
  'Always you, Dhari.'
];
const FROM = 'Ayush';                       // sign-off in the finale ('' to hide it)

// Difficulty knobs — raise or lower these to taste.
const CFG = {
  gridSize: 9,    // Chapter I:   word-search grid is gridSize x gridSize
  decoyWords: 5,   // Chapter I:   near-miss words planted in the grid (DHAR, HARI, DHARA...)
  l1Seconds: 90,   // Chapter I:   seconds before the letters reshuffle
  l2Decoys: 28,    // Chapter II:  fake letters hidden in the garden
  l2Lives: 5,      // Chapter II:  wrong taps allowed before the roses rearrange
  l2Hints: 2,      // Chapter II:  nudges available
  roses: 5,        // Chapter III: number of identical roses
  roseHue: 350,    // Chapter III: every rose uses this one colour
  shuffleStartMs: 900,  // Chapter III: time per swap at the start (bigger = slower)
  shuffleMinMs: 600     // Chapter III: the fastest it ever gets (bigger = slower)
};

const DISPLAY_NAME = NAME[0] + NAME.slice(1).toLowerCase();

/* ---------- helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const rand = n => Math.floor(Math.random() * n);
const pick = arr => arr[rand(arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const screen = $('#gScreen');
const scroller = $('#gScroll');
const fx = $('#gFx');
const dots = [...document.querySelectorAll('#gDots span')];

function setProgress(done) {
  dots.forEach((d, i) => {
    d.classList.toggle('done', i < done);
    d.classList.toggle('now', i === done);
  });
}

let toastTimer;
function toast(msg) {
  const t = $('#gToast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
}

function show(html) {
  screen.innerHTML = html;
  scroller.scrollTop = 0;
}

/* ---------- small bursts of hearts ---------- */
function burst(x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    const h = document.createElement('b');
    h.className = 'burst';
    h.textContent = '♥';
    const a = Math.random() * Math.PI * 2;
    const d = 30 + Math.random() * 60;
    h.style.cssText =
      `left:${x}px;top:${y}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 40}px;` +
      `--s:${10 + Math.random() * 14}px;color:hsl(${340 + rand(25)} 90% ${65 + rand(15)}%)`;
    fx.appendChild(h);
    setTimeout(() => h.remove(), 1300);
  }
}
function burstAt(el, n = 7) {
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, n);
}

/* ---------- ambience: stars + drifting hearts ---------- */
(function ambience() {
  const hearts = $('#gHearts');
  for (let i = 0; i < 16; i++) {
    const h = document.createElement('b');
    h.textContent = '♥';
    h.style.cssText =
      `left:${Math.random() * 100}%;--s:${10 + Math.random() * 16}px;--h:${340 + rand(25)};` +
      `--t:${14 + Math.random() * 12}s;--dl:${-Math.random() * 20}s;` +
      `--dx:${(Math.random() - 0.5) * 120}px`;
    hearts.appendChild(h);
  }
})();

/* ============================================================
   INTRO
   ============================================================ */
function intro() {
  setProgress(0);
  const old = $('#petals');
  if (old) old.remove();

  show(`
    <div class="card center">
      <p class="kicker">a little love game &middot; hard mode</p>
      <h1>Somewhere in here,<br>my favourite name<br>is <em>hiding</em>.</h1>
      <p class="sub">Five letters. Three hiding places.<br>It won't be easy &mdash; but find her, and a sunrise is waiting.</p>
      <button class="btn" id="start">Begin the search &#9829;</button>
    </div>
  `);
  $('#start').onclick = level1;
}

/* ============================================================
   CHAPTER I — word search (big grid, decoys, countdown)
   ============================================================ */
const SIZE = CFG.gridSize;
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
// Near-misses: they look like her name but none of them is it.
const DECOYS = ['DHAR', 'HARI', 'DHARA', 'DHARU', 'DHRI', 'DARI', 'DHARY', 'HARIA', 'DHAI', 'ADHARI'];

// How many times does NAME read forward in any of the 8 directions?
function countName(g) {
  let n = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      for (const [dr, dc] of DIRS) {
        let ok = true;
        for (let i = 0; i < NAME.length && ok; i++) {
          const rr = r + dr * i, cc = c + dc * i;
          if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE || g[rr][cc] !== NAME[i]) ok = false;
        }
        if (ok) n++;
      }
    }
  }
  return n;
}

// Try to lay a word into the grid (cells must be empty or already match).
function plant(g, word) {
  for (let t = 0; t < 60; t++) {
    const [dr, dc] = pick(DIRS);
    const r0 = rand(SIZE), c0 = rand(SIZE);
    const rE = r0 + dr * (word.length - 1), cE = c0 + dc * (word.length - 1);
    if (rE < 0 || rE >= SIZE || cE < 0 || cE >= SIZE) continue;
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const ch = g[r0 + dr * i][c0 + dc * i];
      if (ch && ch !== word[i]) { ok = false; break; }
    }
    if (!ok) continue;
    for (let i = 0; i < word.length; i++) g[r0 + dr * i][c0 + dc * i] = word[i];
    return true;
  }
  return false;
}

function buildGrid() {
  // Lots of D/H/A/R/I in the filler makes even more accidental near-misses.
  const pool = (NAME.repeat(3) + 'BCEFGJKLMNOPQSTUVWXYZ').split('');
  for (;;) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    if (!plant(g, NAME)) continue;
    for (let i = 0; i < CFG.decoyWords; i++) plant(g, pick(DECOYS));
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++) if (!g[r][c]) g[r][c] = pick(pool);

    if (countName(g) === 1) return g; // exactly one real hiding place
  }
}

function level1() {
  setProgress(0);
  const g = buildGrid();

  show(`
    <div class="card">
      <p class="kicker">Chapter I &middot; Among the letters</p>
      <h2>Her name is hiding in here</h2>
      <p class="sub">Trace the ${NAME.length} letters of her name &mdash; across, down, diagonal, even backwards. Beware of look-alikes, and watch the clock.</p>
      <div class="timer" id="timer"><span id="secs">${CFG.l1Seconds}s</span><div class="track"><div class="bar" id="bar"></div></div></div>
      <div class="grid" id="grid" style="--n:${SIZE}"></div>
      <p class="status" id="status">Looking for ${[...NAME].join(' &middot; ')}</p>
    </div>
  `);

  const grid = $('#grid');
  const status = $('#status');
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const d = document.createElement('div');
      d.className = 'cell';
      d.textContent = g[r][c];
      grid.appendChild(d);
    }
  }
  const cellAt = (r, c) => grid.children[r * SIZE + c];
  const cellPos = el => {
    const i = [...grid.children].indexOf(el);
    return i < 0 ? null : { r: Math.floor(i / SIZE), c: i % SIZE };
  };

  let start = null;
  let line = [];
  let done = false;

  // countdown — when it runs out the letters shuffle into a fresh grid
  let left = CFG.l1Seconds;
  const secs = $('#secs');
  const bar = $('#bar');
  const timerBox = $('#timer');
  const tick = setInterval(() => {
    if (done || !document.body.contains(grid)) { clearInterval(tick); return; }
    left--;
    secs.textContent = `${left}s`;
    bar.style.width = `${(left / CFG.l1Seconds) * 100}%`;
    timerBox.classList.toggle('low', left <= 15);
    if (left <= 0) {
      clearInterval(tick);
      toast('The letters shuffled themselves — try again');
      level1();
    }
  }, 1000);

  function paint() {
    [...grid.children].forEach(el => el.classList.remove('sel'));
    line.forEach(([r, c]) => cellAt(r, c).classList.add('sel'));
  }

  function lineTo(r, c) {
    const dr = r - start.r, dc = c - start.c;
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return line;
    const len = Math.min(Math.max(Math.abs(dr), Math.abs(dc)), NAME.length - 1);
    const sr = Math.sign(dr), sc = Math.sign(dc);
    const out = [];
    for (let i = 0; i <= len; i++) out.push([start.r + sr * i, start.c + sc * i]);
    return out;
  }

  grid.addEventListener('pointerdown', e => {
    if (done) return;
    const el = e.target.closest('.cell');
    const p = el && cellPos(el);
    if (!p) return;
    start = p;
    line = [[p.r, p.c]];
    paint();
    grid.setPointerCapture(e.pointerId);
  });

  grid.addEventListener('pointermove', e => {
    if (!start || done) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest && el.closest('.cell');
    const p = cell && cellPos(cell);
    if (!p) return;
    line = lineTo(p.r, p.c);
    paint();
  });

  grid.addEventListener('pointerup', () => {
    if (!start || done) return;
    start = null;
    if (line.length === NAME.length) {
      const word = line.map(([r, c]) => g[r][c]).join('');
      const rev = [...word].reverse().join('');
      if (word === NAME || rev === NAME) {
        done = true;
        clearInterval(tick);
        line.forEach(([r, c], i) => {
          const el = cellAt(r, c);
          el.classList.remove('sel');
          el.classList.add('found');
          el.style.animationDelay = `${i * 0.08}s`;
          setTimeout(() => burstAt(el, 5), i * 120);
        });
        status.textContent = "There she is — I'd know her anywhere.";
        setTimeout(level2, 2000);
        return;
      }
    }
    line = [];
    paint();
    status.textContent = 'Not her… keep looking.';
    status.classList.remove('shake');
    void status.offsetWidth;
    status.classList.add('shake');
  });
}

/* ============================================================
   CHAPTER II — letters hidden in a rose garden (swaying, limited hearts)
   ============================================================ */
function level2() {
  setProgress(1);
  const decoyLetters = 'BCEFGJKLMNOPQSTUVWXYZ'.split('');

  show(`
    <div class="card">
      <p class="kicker">Chapter II &middot; The rose garden</p>
      <h2>She's tucked among the roses</h2>
      <p class="sub">Her letters are disguised as petals and leaves &mdash; and they sway. Find ${[...NAME].join(', ')} in that order. Every wrong tap costs a heart.</p>
      <div class="lives" id="lives"><small>patience</small>${Array.from({ length: CFG.l2Lives }, () => '<span>&#9829;</span>').join('')}</div>
      <div class="slots" id="slots">${[...NAME].map(() => '<span></span>').join('')}</div>
      <div class="garden" id="garden"></div>
      <div style="text-align:center">
        <button class="btn ghost" id="hint">A little nudge &middot; ${CFG.l2Hints} left</button>
      </div>
    </div>
  `);

  const garden = $('#garden');
  const slots = [...document.querySelectorAll('#slots span')];
  const hearts = [...document.querySelectorAll('#lives span')];

  // background: leaves and rose blooms
  for (let i = 0; i < 100; i++) {
    const isLeaf = Math.random() > 0.28;
    const el = document.createElement('i');
    el.className = isLeaf ? 'leaf' : 'bloom';
    const size = isLeaf ? 12 + Math.random() * 26 : 20 + Math.random() * 30;
    el.style.cssText =
      `left:${Math.random() * 100}%;top:${Math.random() * 100}%;` +
      `width:${size}px;height:${size * (isLeaf ? 0.62 : 1)}px;` +
      `--r:${rand(360)}deg;--h:${isLeaf ? 125 + rand(35) : 335 + rand(30)};--l:${18 + rand(14)}%`;
    garden.appendChild(el);
  }

  // letter positions that don't sit right on top of each other
  const spots = [];
  const randPoint = () => [6 + Math.random() * 86, 8 + Math.random() * 82];
  function spot() {
    for (let t = 0; t < 300; t++) {
      const p = randPoint();
      if (spots.every(s => Math.hypot(s[0] - p[0], s[1] - p[1]) > 9)) {
        spots.push(p);
        return p;
      }
    }
    const p = randPoint();
    spots.push(p);
    return p;
  }

  const items = [...NAME].map((ch, i) => ({ ch, idx: i }))
    .concat(Array.from({ length: CFG.l2Decoys }, () => ({ ch: pick(decoyLetters), idx: -1 })));

  shuffle(items).forEach(it => {
    const [x, y] = spot();
    const g = document.createElement('button');
    g.type = 'button';
    g.className = 'glyph';
    g.textContent = it.ch;
    g.dataset.i = it.idx;
    g.style.cssText =
      `left:${x}%;top:${y}%;--r:${rand(70) - 35}deg;--fs:${17 + rand(12)}px;` +
      `--sx:${rand(11) - 5}px;--sy:${rand(11) - 5}px;--sd:${3 + Math.random() * 3}s`;
    garden.appendChild(g);
  });

  let next = 0;
  let hints = CFG.l2Hints;
  let lives = CFG.l2Lives;
  let over = false;

  function wrongTap(g, msg) {
    toast(msg);
    g.classList.add('nope');
    setTimeout(() => g.classList.remove('nope'), 400);
    lives--;
    hearts.forEach((h, i) => h.classList.toggle('lost', i >= lives));
    if (lives <= 0) {
      over = true;
      toast('The roses rearranged themselves — start the garden again');
      setTimeout(level2, 1600);
    }
  }

  garden.addEventListener('click', e => {
    if (over) return;
    const g = e.target.closest('.glyph');
    if (!g || g.classList.contains('got')) return;
    const idx = +g.dataset.i;

    if (idx === next) {
      g.classList.add('got');
      burstAt(g, 6);
      slots[next].textContent = NAME[next];
      slots[next].classList.add('on');
      next++;
      if (next === NAME.length) {
        over = true;
        toast('Every letter, found ♥');
        setTimeout(level3, 1500);
      }
      return;
    }
    if (idx > next) wrongTap(g, `Not yet — look for ${NAME[next]} first`);
    else wrongTap(g, "That one isn't part of her name");
  });

  const hintBtn = $('#hint');
  hintBtn.onclick = () => {
    if (over || !hints || next >= NAME.length) return;
    hints--;
    hintBtn.textContent = hints ? `A little nudge · ${hints} left` : 'No nudges left';
    if (!hints) hintBtn.disabled = true;
    const t = garden.querySelector(`.glyph[data-i="${next}"]`);
    t.classList.add('pulse');
    setTimeout(() => t.classList.remove('pulse'), 2000);
  };
}

/* ============================================================
   CHAPTER III — five identical roses, one of them hides her
   ============================================================ */
function roseSVG(hue) {
  const layer = (count, rx, ry, cy, light, offset) => {
    let s = '';
    for (let i = 0; i < count; i++) {
      s += `<ellipse cx="50" cy="${cy}" rx="${rx}" ry="${ry}" ` +
           `transform="rotate(${offset + (360 / count) * i} 50 50)" ` +
           `fill="hsl(${hue} 70% ${light}%)" stroke="hsl(${hue} 70% 24% / .55)" stroke-width="1"/>`;
    }
    return s;
  };
  return `<svg viewBox="0 0 100 100" aria-hidden="true">` +
    layer(6, 17, 24, 30, 54, 0) +
    layer(5, 13, 18, 36, 46, 20) +
    layer(4, 9, 12, 42, 38, 10) +
    `<circle cx="50" cy="50" r="7" fill="hsl(${hue} 78% 28%)"/>` +
    `<path d="M50 50 m-4 0 a4 4 0 1 1 4 4" fill="none" stroke="hsl(${hue} 70% 55%)" stroke-width="1.6" stroke-linecap="round"/>` +
    `</svg>`;
}

function level3() {
  setProgress(2);
  const N = CFG.roses;
  const winner = rand(N);

  show(`
    <div class="card center">
      <p class="kicker">Chapter III &middot; One last rose</p>
      <h2>Which rose is she behind?</h2>
      <p class="sub" id="s3">Every rose looks the same now. She'll peek out just once &mdash; then they dance, sometimes two swaps at a time. Keep your eyes on her.</p>
      <div class="pots locked" id="pots" style="--n:${N}">
        ${Array.from({ length: N }, (_, i) => `
          <div class="pot" style="--slot:${i}" data-id="${i}">
            ${i === winner ? `<div class="tile">${DISPLAY_NAME} &#9829;</div>` : ''}
            <div class="cap">${roseSVG(CFG.roseHue)}</div>
            <div class="base"></div>
          </div>`).join('')}
      </div>
      <button class="btn" id="go">I'm ready &#9829;</button>
    </div>
  `);

  const potsBox = $('#pots');
  const pots = [...document.querySelectorAll('.pot')];
  const goBtn = $('#go');
  const s3 = $('#s3');
  const slotOf = Array.from({ length: N }, (_, i) => i);
  let state = 'idle';
  let attempt = 0;

  const alive = () => document.body.contains(potsBox);
  const applySlots = () => pots.forEach((p, i) => p.style.setProperty('--slot', slotOf[i]));

  async function play() {
    state = 'busy';
    goBtn.hidden = true;
    potsBox.classList.add('locked');
    pots.forEach(p => p.classList.remove('open'));
    s3.textContent = 'Watch where she hides…';

    await sleep(500);
    pots[winner].classList.add('open');
    await sleep(1000);
    pots[winner].classList.remove('open');
    await sleep(500);
    if (!alive()) return;

    const swaps = Math.min(14 + attempt * 2, 24);
    let delay = CFG.shuffleStartMs;
    for (let k = 0; k < swaps; k++) {
      const ids = shuffle(Array.from({ length: N }, (_, i) => i));
      const pairs = Math.random() < 0.3 ? [[ids[0], ids[1]], [ids[2], ids[3]]] : [[ids[0], ids[1]]];
      pairs.forEach(([a, b]) => { [slotOf[a], slotOf[b]] = [slotOf[b], slotOf[a]]; });
      // the slide always finishes a little before the next swap starts
      potsBox.style.setProperty('--swap', `${Math.round(delay * 0.8)}ms`);
      applySlots();
      await sleep(delay);
      delay = Math.max(CFG.shuffleMinMs, delay - 20);
      if (!alive()) return;
    }

    attempt++;
    state = 'pick';
    potsBox.classList.remove('locked');
    s3.textContent = 'Pick the rose hiding her.';
  }

  pots.forEach((p, i) => {
    p.addEventListener('click', async () => {
      if (state !== 'pick') return;
      state = 'done';
      potsBox.classList.add('locked');
      p.classList.add('open');

      if (i === winner) {
        s3.textContent = 'Found her!';
        burstAt(p.querySelector('.tile'), 12);
        await sleep(1300);
        if (alive()) win();
      } else {
        s3.textContent = 'Not that one… she was being shy.';
        await sleep(700);
        pots[winner].classList.add('open');
        await sleep(1100);
        if (!alive()) return;
        s3.textContent = 'So close — try again?';
        goBtn.textContent = 'Try again';
        goBtn.hidden = false;
        state = 'idle';
      }
    });
  });

  goBtn.onclick = () => { if (state === 'idle') play(); };
}

/* ============================================================
   FINALE
   ============================================================ */
function win() {
  setProgress(3);
  const lines = LOVE_LINES.map((t, i) => `<p style="--i:${i}">${t}</p>`).join('');
  const sign = FROM
    ? `<p class="from" style="--i:${LOVE_LINES.length}">&mdash; ${FROM} &#9829;</p>`
    : '';

  show(`
    <div class="card center" id="finale">
      <p class="kicker">found you</p>
      <div class="name">${[...DISPLAY_NAME].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
      <div class="love">${lines}${sign}</div>
      <div class="actions">
        <button class="btn" id="sunrise">Watch the sunrise &#9728;</button>
        <button class="btn ghost" id="again">Play again</button>
      </div>
    </div>
  `);
  $('#again').onclick = intro;
  $('#sunrise').onclick = startDay;
  $('#finale').addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    burst(e.clientX, e.clientY, 9);
  });
  rainPetals();
  const nameEl = $('.name');
  setTimeout(() => burstAt(nameEl, 16), 1500);
}

function rainPetals() {
  const old = $('#petals');
  if (old) old.remove();
  const layer = document.createElement('div');
  layer.className = 'petals';
  layer.id = 'petals';
  for (let i = 0; i < 44; i++) {
    const p = document.createElement('i');
    p.style.cssText =
      `left:${Math.random() * 100}%;--w:${8 + Math.random() * 10}px;` +
      `--h:${pick([340, 348, 355, 12, 325])};--t:${5 + Math.random() * 5}s;` +
      `--dl:${-Math.random() * 8}s;--dx:${(Math.random() - 0.5) * 160}px`;
    layer.appendChild(p);
  }
  fx.appendChild(layer);
}

/* ============================================================
   HAND-OFF TO THE MOUNTAIN DAY
   The mountain page (script.js) stays at night, in its intro, while the
   game is open. Finding her name fades the game out and starts the day.
   ============================================================ */
const stageEl = document.getElementById('stage');
const gameEl = document.getElementById('game');
const press = id => { const b = document.getElementById(id); if (b) b.click(); };

function startDay() {
  gameEl.classList.add('is-off');
  stageEl.classList.remove('game-on');
  // First time: start the day from its intro. Coming back later: replay it.
  press(stageEl.dataset.phase === 'intro' ? 'btnStart' : 'btnReplay');
  setTimeout(() => { const p = $('#petals'); if (p) p.remove(); }, 1600);
}

function openGame() {
  stageEl.classList.add('game-on');
  gameEl.classList.remove('is-off');
  intro();
}

const again = document.getElementById('btnPlayAgain');
if (again) again.addEventListener('click', openGame);

intro();
})();