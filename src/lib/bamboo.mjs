// The bamboo by the 小書齋 (Landscape.astro), and how it bends in the wind. Landscape.astro draws the grove from here at rest;
// layouts/bambooSway.js redraws it every frame in Taichung's wind. Both use the same shapes, so the page drawn before any
// script runs and the first frame of the sway are the same picture.
//
// A grove is a set of culms standing from the mist. A culm is a chain of a few segments from its foot: each segment turns
// a little further than the one below, so the culm bends most near its tip, the way bamboo does. Leaves hang in sprays from
// the upper nodes; in the wind each leaf swings round to stream downwind, the harder the wind, the more.

/** A small seeded random, so the grove is drawn the same on every build. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const SEGMENTS = 7;
const LEAF_NODES = [0.58, 0.7, 0.8, 0.9, 1];

/**
 * The culms of a grove: `xs` are their feet along `y`, `tall` their lengths (in the study's viewBox units).
 * `sprays` is how many leaves hang from each upper node.
 */
function grove({ seed, xs, y, tall, width, sprays, opacity }) {
  const r = seeded(seed);
  const culms = xs.map((x, i) => {
    const nodes = LEAF_NODES.filter(() => r() < 0.8);
    return {
      x,
      y,
      len: tall[i],
      width: width * (0.8 + r() * 0.4),
      opacity: opacity * (0.85 + r() * 0.3),
      curl: (r() - 0.5) * 14, // how it leans at rest: no culm grows quite straight
      phase: r() * 6.28,
      speed: 0.9 + r() * 0.25,
      leaves: nodes.flatMap((u) =>
        Array.from({ length: sprays }, (_, m) => {
          const side = r() < 0.5 ? -1 : 1;
          return {
            u,
            // a leaf hangs out and down from its node, to the left (around 180°) or the right (around 0°)
            rest: side > 0 ? 24 + r() * 40 : 156 - r() * 40,
            scale: 0.75 + r() * 0.45,
            phase: r() * 6.28,
            dark: m === 0 && r() < 0.6, // drawn in the grove's darker shade of leaf
          };
        }),
      ),
    };
  });
  // its leaves in two shades of the grove's ink
  return Object.assign(culms, { leafOpacity: [opacity * 0.72, opacity * 0.95] });
}

/** The two groves: one left of the study, in mid ink, and a paler one behind it, rising over its roof. */
export const GROVES = {
  front: grove({
    seed: 7,
    xs: [36, 48, 58, 70, 82, 94, 104],
    y: 130,
    tall: [86, 112, 128, 140, 120, 132, 98],
    width: 2.6,
    sprays: 3,
    opacity: 0.42,
  }),
  back: grove({
    seed: 19,
    xs: [140, 151, 162, 173, 184, 195, 204],
    y: 96,
    tall: [70, 88, 96, 82, 92, 74, 58],
    width: 1.9,
    sprays: 2,
    opacity: 0.24,
  }),
};

/**
 * The wind as the bamboo feels it, from its speed and gusts (km/h at 10 m) and the direction it blows from (degrees).
 * `k` is 0 in a calm, 1 in a strong wind (45 km/h, Beaufort 6), up to 1.3 in a gale. `side` is which way across the screen
 * it blows: + toward the right (east), − toward the left; a wind from the north or south still pushes a little.
 */
export function feel(speed, gusts, from) {
  const k = Math.min(Math.max(speed, 0) / 45, 1.3);
  const east = -Math.sin((from * Math.PI) / 180);
  const side = Math.abs(east) < 0.35 ? (east < 0 ? -0.35 : 0.35) : east;
  return {
    k,
    side,
    bend: 26 * Math.pow(k, 1.2), // degrees the tip bends downwind, before gusts
    sway: 1.2 + 6 * k, // degrees it swings back and forth about that
    flutter: 3 + 14 * k, // degrees each leaf flutters
    pull: Math.min(k * 0.9, 0.85), // how far a leaf swings round to stream downwind
    omega: (2 * Math.PI) / (3.4 - 1.4 * Math.min(k, 1)), // how fast it sways
    gusty: Math.min(Math.max((gusts - speed) / Math.max(speed, 8), 0), 1.2),
  };
}

/** How hard the wind blows at time t (seconds), about 1: a slow swell of sines that never quite repeat, bigger when gusty. */
export function gust(f, t) {
  const n = (Math.sin(0.21 * t) + Math.sin(0.37 * t + 1) + Math.sin(0.83 * t + 2)) / 3;
  return 1 + f.gusty * Math.max(n, 0) * 1.6 - 0.15 * f.gusty;
}

/** The points of a culm, foot to tip, in wind `f` at time t (with the swell g); `still` leaves out the swaying. */
export function culmPoints(c, f, t, g, still = false) {
  const pts = [[c.x, c.y]];
  let [x, y] = [c.x, c.y];
  for (let i = 1; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    const swing = still ? 0 : f.sway * g * Math.sin(f.omega * c.speed * t - 1.2 * u - c.phase);
    const d = (f.bend * f.side * g + swing) * Math.pow(u, 1.7) + c.curl * u;
    const a = ((-90 + d) * Math.PI) / 180;
    x += (Math.cos(a) * c.len) / SEGMENTS;
    y += (Math.sin(a) * c.len) / SEGMENTS;
    pts.push([x, y]);
  }
  return pts;
}

/** A smooth path through a culm's points. */
export function culmPath(p) {
  const n = (v) => v.toFixed(1);
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    d += ` Q${n(p[i][0])} ${n(p[i][1])} ${n((p[i][0] + p[i + 1][0]) / 2)} ${n((p[i][1] + p[i + 1][1]) / 2)}`;
  }
  const l = p[p.length - 1];
  return `${d} L${n(l[0])} ${n(l[1])}`;
}

/** A leaf's blade: its outline's points along +x from its stem at (0,0), as two curves out and back. */
const BLADE = [[4, -2.2], [11, -2.2], [16, 0], [11, 1.6], [4, 1.6], [0, 0]];

/**
 * A leaf drawn where it sits on its culm's points, turned to hang from its node, swung round downwind and fluttering:
 * the outline as a path's commands. The leaves of a grove are drawn as one path (in two shades) rather than a path
 * each, so a frame sets a handful of attributes instead of a hundred and more.
 */
export function leafPath(leaf, pts, f, t, still = false) {
  const [x, y] = pts[Math.min(Math.round(leaf.u * SEGMENTS), SEGMENTS)];
  const downwind = f.side > 0 ? 8 : 172;
  const toward = ((downwind - leaf.rest + 540) % 360) - 180;
  const deg = leaf.rest + toward * f.pull + (still ? 0 : f.flutter * Math.sin(3.1 * f.omega * t + leaf.phase));
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a) * leaf.scale;
  const sin = Math.sin(a) * leaf.scale;
  const p = BLADE.map(([u, v]) => `${(x + u * cos - v * sin).toFixed(1)} ${(y + u * sin + v * cos).toFixed(1)}`);
  return `M${x.toFixed(1)} ${y.toFixed(1)}C${p[0]} ${p[1]} ${p[2]}C${p[3]} ${p[4]} ${p[5]}Z`;
}

/** A grove's leaves in wind `f` at time t, given each culm's points: the paths of its two shades, pale and dark. */
export function groveLeaves(culms, ptsOf, f, t, still = false) {
  const shades = ['', ''];
  culms.forEach((c, i) => {
    for (const l of c.leaves) shades[l.dark ? 1 : 0] += leafPath(l, ptsOf[i], f, t, still);
  });
  return shades;
}

/** The light breeze from the east the bamboo stands in until Taichung's wind is known, or if it cannot be. */
export const BREEZE = [6, 10, 90];
