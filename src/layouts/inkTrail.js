// 墨痕: the mouse leaves a trail of pale ink on the plaster as it moves, the way a brush tip dragged over 宣紙 would. Each
// drop soaks outward a little and fades, so in two or three seconds the wall is clean again; nothing gathers where the
// mouse rests. A slow hand leaves fuller, darker drops, a fast one a thin, dry streak.
//
// The ink sits on the page, not the screen: scroll and the trail goes up with the words it was drawn over. It is laid on
// with multiply, so it reads as ink soaked into the wall and never as a film over the type; it is pale enough not to
// get in the way of reading.
//
// Only for a mouse (a fine pointer that hovers): touch screens and pens go without it, and so does reduced motion. The
// canvas draws only while some ink is still drying, and stops when the tab is in the background.
// ?ink=0 on the page's address turns it off.

const LIFE = 2600; // ms a drop takes to soak in and fade away
const STEP = 7; // px between drops along the stroke
const MAX = 520; // drops at once, oldest let go first
const INK = [44, 43, 40]; // --ink

const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const off = new URLSearchParams(location.search).get('ink') === '0';

/** A soft, uneven blot of ink, drawn once and stamped many times: a few overlapping washes, darker toward the middle. */
function blot(seed) {
  const S = 96;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * S * 0.12;
    const x = S / 2 + Math.cos(a) * d;
    const y = S / 2 + Math.sin(a) * d;
    const r = S * (0.26 + rnd() * 0.2);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const [R, G, B] = INK;
    grad.addColorStop(0, `rgba(${R},${G},${B},0.34)`);
    grad.addColorStop(0.55, `rgba(${R},${G},${B},0.16)`);
    grad.addColorStop(1, `rgba(${R},${G},${B},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

if (!off) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ink-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const blots = [11, 4271, 90001, 333667].map(blot);
  /** drops: page x, page y, birth time, starting radius, how dark, which blot, its turn */
  const drops = [];
  let last = null; // the last place a drop was laid, in page coordinates, with its time
  let frame = 0;
  let dpr = 1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }

  function lay(x, y, speed, now) {
    // slow: a full drop (r ≈ 13, dark); fast: a thin, dry one (r ≈ 5, pale)
    const k = Math.min(speed / 2.2, 1); // px per ms
    drops.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      t: now,
      r: 12 - 6 * k + Math.random() * 3,
      a: 0.2 - 0.1 * k,
      b: (Math.random() * blots.length) | 0,
      rot: Math.random() * Math.PI * 2,
    });
    if (drops.length > MAX) drops.splice(0, drops.length - MAX);
  }

  function move(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const now = performance.now();
    const x = e.clientX + scrollX;
    const y = e.clientY + scrollY;
    if (!last || now - last.t > 120) {
      // the brush comes down afresh after a pause
      last = { x, y, t: now };
      lay(x, y, 0, now);
    } else {
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < STEP) return;
      const speed = dist / Math.max(now - last.t, 1);
      const n = Math.floor(dist / STEP);
      for (let i = 1; i <= n; i++) lay(last.x + (dx * i) / n, last.y + (dy * i) / n, speed, now);
      last = { x, y, t: now };
    }
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let i = 0;
    while (i < drops.length && now - drops[i].t > LIFE) i++;
    if (i) drops.splice(0, i);
    const ox = scrollX;
    const oy = scrollY;
    for (const d of drops) {
      const p = Math.max(0, now - d.t) / LIFE; // 0 → 1 over its life
      const spread = 1 + 2.2 * Math.sqrt(p); // soaks outward fast at first, then slower
      const r = d.r * spread;
      const x = d.x - ox;
      const y = d.y - oy;
      if (x < -r || y < -r || x > innerWidth + r || y > innerHeight + r) continue;
      ctx.globalAlpha = d.a * (1 - p) * (1 - p) / spread; // the same ink spread thinner, then dry
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.rot);
      ctx.drawImage(blots[d.b], -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (drops.length && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function setup() {
    const on = mouse.matches && !reduce.matches;
    if (on && !canvas.isConnected) {
      size();
      document.body.append(canvas);
      addEventListener('pointermove', move, { passive: true });
    } else if (!on && canvas.isConnected) {
      removeEventListener('pointermove', move);
      cancelAnimationFrame(frame);
      frame = 0;
      drops.length = 0;
      canvas.remove();
    }
  }

  addEventListener('resize', () => {
    if (!canvas.isConnected) return;
    size();
    if (!frame) frame = requestAnimationFrame(draw);
  });
  addEventListener('scroll', () => {
    if (canvas.isConnected && drops.length && !frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && drops.length && !frame) frame = requestAnimationFrame(draw);
  });
  mouse.addEventListener('change', setup);
  reduce.addEventListener('change', setup);
  setup();
}
