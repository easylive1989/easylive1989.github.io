// The bamboo by the 小書齋 (Landscape.astro) bends in Taichung's wind as it blows now. weather.js sets html[data-wind] to
// "speed gusts direction" (km/h at 10 m, degrees the wind blows from) from Open-Meteo, and says 'desk:wind' when a fresh
// answer comes in; until then, or if it never does, a light breeze blows (lib/bamboo.mjs has the shapes and the bending).
// ?wind=55 (or ?wind=55,85,90 for gusts and direction) on the page's address tries another wind.
//
// Every other frame (30 a second is smooth enough for ink) each culm's path is redrawn, and each grove's leaves with them.
// It runs only while the grove can be seen: the study is drawn only where the margin is wide enough (desk.css), so not on
// a phone; and not when the scene is scrolled away or the tab is in the background. With motion reduced it is drawn once,
// leaning in the wind, and left still.
import { BREEZE, GROVES, culmPath, culmPoints, feel, groveLeaves, gust } from '../lib/bamboo.mjs';

const root = document.querySelector('.ink-land .l-study .s-bamboo');

if (root) {
  const groves = Object.entries(GROVES).map(([name, culms]) => {
    const g = root.querySelector(`[data-grove="${name}"]`);
    return { culms, culmEls: [...g.querySelectorAll('.b-culm')], leafEls: [...g.querySelectorAll('.b-leaves')] };
  });

  /** The wind to bend in: ?wind= first, then what weather.js found, then the breeze. */
  function readWind() {
    const asked = new URLSearchParams(location.search).get('wind');
    const raw = asked ? asked.split(',').join(' ') : document.documentElement.getAttribute('data-wind');
    const [s, g, d] = (raw || '').split(' ').map(Number);
    if (!Number.isFinite(s) || s < 0) return BREEZE;
    return [s, Number.isFinite(g) ? Math.max(g, s) : s, Number.isFinite(d) ? d : BREEZE[2]];
  }

  let f = feel(...readWind());

  function draw(t, still = false) {
    const g = still ? 1 : gust(f, t);
    for (const grove of groves) {
      const pts = grove.culms.map((c) => culmPoints(c, f, t, g, still));
      pts.forEach((p, i) => grove.culmEls[i].setAttribute('d', culmPath(p)));
      groveLeaves(grove.culms, pts, f, t, still).forEach((d, i) => grove.leafEls[i].setAttribute('d', d));
    }
  }

  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const shown = matchMedia('(min-width: 1381px)');
  let inView = true;
  let frame = 0;
  let odd = false;

  function tick(ms) {
    odd = !odd;
    if (odd) draw(ms / 1000);
    frame = requestAnimationFrame(tick);
  }

  function run() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!shown.matches) return;
    if (still.matches) draw(0, true);
    else if (inView && !document.hidden) frame = requestAnimationFrame(tick);
  }

  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    run();
  }).observe(root.ownerSVGElement);
  document.addEventListener('desk:wind', () => {
    f = feel(...readWind());
    run();
  });
  still.addEventListener('change', run);
  shown.addEventListener('change', run);
  document.addEventListener('visibilitychange', run);
  run();
}
