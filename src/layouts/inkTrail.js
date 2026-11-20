// 船痕: the mouse moves over the page like a little boat over still water, and behind it the water parts — two thin lines
// of ripple open out from its bow to either side, the way a wake spreads in a V, with a fainter ripple inside each. The
// lines keep drifting outward as they fade, so in two or three seconds the water is still again. A quick boat throws a
// wide wake; a slow one barely stirs the water; a boat at rest leaves none.
//
// The wake is on the page, not the screen: scroll and it goes up with the words it was drawn over. It is drawn the way a
// real ripple shows on still water, by the light it bends: each crest is a breath of shadow on its near side and a thin
// glint of light on its far side, and almost nothing else, so it reads as water over the wall and never as a mark on it.
//
// Only for a mouse (a fine pointer that hovers): touch screens and pens go without it, and so does reduced motion. The
// canvas draws only while a wake is still fading, and stops when the tab is in the background.
// ?ink=0 on the page's address turns it off.

const LIFE = 2400; // ms a stretch of wake takes to spread out and settle
const STEP = 6; // px of travel between points on the wake
const MAX = 480; // points at once, oldest let go first
const PAUSE = 150; // ms without moving before the next movement starts a new wake
const SHADE = '70, 82, 90'; // the shadow side of a crest: a little grey-blue
const GLINT = '255, 255, 252'; // the light side
/** the lines of each wake, on both sides: how far out they spread (of the whole), and how strong */
const LINES = [
  { k: 1, a: 1 },
  { k: 0.58, a: 0.6 },
];

const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const off = new URLSearchParams(location.search).get('ink') === '0';

if (!off) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ink-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  /** points the boat passed: page x, y, time, the normal to its heading (nx, ny), how far its wake spreads, which wake */
  const pts = [];
  let last = null; // where the boat last was, in page coordinates, its time and smoothed heading
  let wake = 0;
  let frame = 0;
  let dpr = 1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }

  function move(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const now = performance.now();
    const x = e.clientX + scrollX;
    const y = e.clientY + scrollY;
    if (!last || now - last.t > PAUSE) {
      wake++;
      last = { x, y, t: now, hx: 0, hy: 0, v: 0 };
      return;
    }
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < STEP) return;
    // the heading and speed, smoothed so a shaky hand still steers a steady boat
    const v = dist / Math.max(now - last.t, 1);
    const hx = last.hx * 0.6 + (dx / dist) * 0.4;
    const hy = last.hy * 0.6 + (dy / dist) * 0.4;
    const hl = Math.hypot(hx, hy) || 1;
    const sv = last.v ? last.v * 0.7 + v * 0.3 : v;
    const spread = Math.min(Math.max(sv * 55, 8), 64); // px the outer line drifts out to
    const n = Math.floor(dist / STEP);
    for (let i = 1; i <= n; i++) {
      pts.push({
        x: last.x + (dx * i) / n,
        y: last.y + (dy * i) / n,
        t: now - ((n - i) / n) * (now - last.t),
        nx: -hy / hl,
        ny: hx / hl,
        s: spread,
        w: wake,
      });
    }
    if (pts.length > MAX) pts.splice(0, pts.length - MAX);
    last = { x, y, t: now, hx, hy, v: sv };
    if (!frame) frame = requestAnimationFrame(draw);
  }

  /** where a line of the wake is now, for the point p, `age` ms after the boat passed it */
  function at(p, age, side, k, edge = 0) {
    const out = edge + p.s * k * 1.7 * Math.pow(Math.min(age / LIFE, 1), 0.75); // keeps opening as it goes, so the arms run out in a V
    const ripple = Math.sin(age * 0.004 + p.x * 0.05 + p.y * 0.05) * 1.2; // the water is never quite flat
    const d = side * (out + ripple * k);
    return [p.x + p.nx * d - scrollX, p.y + p.ny * d - scrollY];
  }

  /** one line of the wake from point j to end, `edge` px further out than the crest */
  function trace(j, end, now, side, k, edge) {
    ctx.beginPath();
    for (let q = j; q <= end; q++) {
      const [x, y] = at(pts[q], Math.max(0, now - pts[q].t), side, k, edge);
      if (q === j) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function draw(now) {
    frame = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let i = 0;
    while (i < pts.length && now - pts[i].t > LIFE) i++;
    if (i) pts.splice(0, i);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // in short runs, each one path, so the line flows on unbroken and only its darkness steps down with age
    const RUN = 4;
    for (let j = 0; j < pts.length - 1; j += RUN) {
      let end = Math.min(j + RUN, pts.length - 1);
      while (end > j && pts[end].w !== pts[j].w) end--;
      if (end === j) continue;
      const age = Math.max(0, now - pts[end].t);
      const life = 1 - age / LIFE;
      // fades as it settles, and rises out of the water just behind the bow
      const alpha = life * life * Math.min(1, age / 120);
      if (alpha <= 0.01) continue;
      for (const side of [-1, 1]) {
        for (const line of LINES) {
          // the shadow, just inside the crest
          trace(j, end, now, side, line.k, -0.8);
          ctx.strokeStyle = `rgba(${SHADE}, ${line.a * alpha * 0.07})`;
          ctx.lineWidth = 2.6;
          ctx.stroke();
          // the glint, just outside it
          trace(j, end, now, side, line.k, 1.4);
          ctx.strokeStyle = `rgba(${GLINT}, ${line.a * alpha * 0.6})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    }
    if (pts.length && !document.hidden) frame = requestAnimationFrame(draw);
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
      pts.length = 0;
      last = null;
      canvas.remove();
    }
  }

  addEventListener('resize', () => {
    if (!canvas.isConnected) return;
    size();
    if (!frame) frame = requestAnimationFrame(draw);
  });
  addEventListener('scroll', () => {
    if (canvas.isConnected && pts.length && !frame) frame = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && pts.length && !frame) frame = requestAnimationFrame(draw);
  });
  mouse.addEventListener('change', setup);
  reduce.addEventListener('change', setup);
  setup();
}
