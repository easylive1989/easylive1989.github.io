// Procedural textures for the study room. Everything is painted on canvases at load, so the room ships no image files for its
// materials. Nothing here touches the DOM or three.js, so the same code runs inside a worker on OffscreenCanvas (see studyWorker.js).

export const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const cnv = (w, h, fn) => { const c = typeof document === 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; if (fn) fn(c.getContext('2d'), w, h); return c; };

// A hex colour nudged in hue and saturation and scaled in brightness, worked in linear light the way three.js's Color would, as a CSS rgb().
const toLin = c => c < .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4, toSrgb = c => c < .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055;
const hue = (p, q, t) => { t = (t % 1 + 1) % 1; return t < 1/6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2/3 ? p + (q - p) * 6 * (2/3 - t) : p; };
export function tint(hex, dh, ds, k) {
  const [r, g, b] = [1, 3, 5].map(i => toLin(parseInt(hex.slice(i, i + 2), 16) / 255)), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) { const d = max - min; s = l <= .5 ? d / (max + min) : d / (2 - max - min); h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) / 6; }
  h = (h + dh) % 1; s = Math.min(1, Math.max(0, s + ds));
  const q = l <= .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return 'rgb(' + [hue(p, q, h + 1/3), hue(p, q, h), hue(p, q, h - 1/3)].map(v => Math.round(toSrgb(Math.min(1, v * k)) * 255)).join(',') + ')';
}

// Tileable fractal value noise, stretched to the full 0–1 range. `base` is the number of lattice cells
// across the first octave; give it as [x, y] for noise that is streaky along one axis.
export function noiseField(w, h, { octaves = 5, base = 4, gain = .5, seed = 1 } = {}) {
  const R = rng(seed), f = new Float32Array(w * h); let [cx, cy] = Array.isArray(base) ? base : [base, base];
  for (let o = 0, amp = 1; o < octaves; o++, cx *= 2, cy *= 2, amp *= gain) {
    const g = new Float32Array(cx * cy); for (let i = 0; i < g.length; i++) g[i] = R();
    const kx = cx / w, ky = cy / h;
    for (let y = 0; y < h; y++) {
      const fy = y * ky, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = (y0 % cy) * cx, r1 = ((y0 + 1) % cy) * cx;
      for (let x = 0; x < w; x++) {
        const fx = x * kx, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), c0 = x0 % cx, c1 = (x0 + 1) % cx;
        const a = g[r0 + c0] + (g[r0 + c1] - g[r0 + c0]) * sx, b = g[r1 + c0] + (g[r1 + c1] - g[r1 + c0]) * sx;
        f[y * w + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < f.length; i++) { if (f[i] < lo) lo = f[i]; if (f[i] > hi) hi = f[i]; }
  const s = 1 / (hi - lo); for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) * s;
  return f;
}
// The same noise as a grayscale canvas, meant to be composited (overlay / soft-light / multiply) rather than shown as is.
export function noiseCanvas(n, opts) {
  const f = noiseField(n, n, opts);
  return cnv(n, n, x => { const img = x.createImageData(n, n), d = img.data;
    for (let i = 0; i < f.length; i++) { d[i*4] = d[i*4+1] = d[i*4+2] = f[i] * 255; d[i*4+3] = 255; }
    x.putImageData(img, 0, 0); });
}

// Tangent-space normal map from a grayscale height canvas (white = high). Wraps at the edges, so a tileable height stays tileable.
export function normalFromHeight(src, strength = 2) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  return cnv(w, h, x => { const img = x.createImageData(w, h), o = img.data, k = strength / 255;
    for (let y = 0; y < h; y++) { const up = ((y - 1 + h) % h) * w, dn = ((y + 1) % h) * w, row = y * w;
      for (let xx = 0; xx < w; xx++) { const l = (xx - 1 + w) % w, r = (xx + 1) % w, i = (row + xx) * 4;
        const dx = (d[(row + r) * 4] - d[(row + l) * 4]) * k, dy = (d[(dn + xx) * 4] - d[(up + xx) * 4]) * k, inv = 127.5 / Math.sqrt(dx * dx + dy * dy + 1);
        o[i] = 127.5 - dx * inv; o[i+1] = 127.5 + dy * inv; o[i+2] = 127.5 + inv; o[i+3] = 255; } }
    x.putImageData(img, 0, 0); });
}

const layer = (x, op, alpha) => { x.globalCompositeOperation = op; x.globalAlpha = alpha; };

// Short dark dashes running along y: the open pores of the wood.
const poreCanvas = (n, seed) => cnv(n, n, x => { const R = rng(seed); x.fillStyle = '#fff'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < n * 14; i++) { x.fillStyle = 'rgba(0,0,0,' + (.08 + R() * .4) + ')'; x.fillRect(R() * n, R() * n, 1, 6 + R() * 50); } });

// A tileable plank floor, boards running along y. Returns colour, normal and roughness canvases;
// `size` px covers `planks` boards across, and every board that crosses the edge wraps round to the other side.
export function plankFloor({ size = 2048, planks = 24, seed = 5, tones = ['#4a2b1b','#55321f','#3f2416','#5d3823','#4d2d1c'] } = {}) {
  const R = rng(seed), S = size, u = S / 1024, N = 512;
  const figure = noiseCanvas(N, { seed:seed + 1 }), pores = poreCanvas(N, seed + 2), wear = noiseCanvas(256, { octaves:4, base:2, seed:seed + 3 });
  const color = cnv(S, S), height = cnv(S, S), rough = cnv(S / 2, S / 2);
  const c = color.getContext('2d'), hx = height.getContext('2d'), rx = rough.getContext('2d'); rx.scale(.5, .5);
  const joints = [];
  const board = (p, x, y, w, L) => {
    layer(c, 'source-over', 1); c.fillStyle = p.tone; c.fillRect(x, y, w, L);
    // the same patch of noise, stretched along the board: broad figure first, then tighter streaks
    layer(c, 'overlay', .6); c.drawImage(figure, p.fx, p.fy, w / u, L / u / 9, x, y, w, L);
    layer(c, 'overlay', .45); c.drawImage(figure, p.gx, p.gy, w / u * 2.5, L / u / 40, x, y, w, L);
    layer(c, 'multiply', .55); c.drawImage(pores, p.px, p.py, w / u, L / u / 2.5, x, y, w, L);
    if (p.arcs) { // flat-sawn boards show the growth rings as nested arches
      c.save(); c.beginPath(); c.rect(x, y, w, L); c.clip(); layer(c, 'multiply', 1); c.lineWidth = 1.4 * u;
      for (let k = 0; k < p.arcs; k++) { const yk = y + p.ay * L + k * p.gap * u, H = p.ah * L; c.strokeStyle = 'rgba(40,18,6,' + (.1 + (k % 3) * .05) + ')';
        c.beginPath(); c.moveTo(x - 2, yk + H); c.quadraticCurveTo(x + p.ax * w, yk - H, x + w + 2, yk + H); c.stroke(); }
      c.restore(); }
    layer(hx, 'source-over', 1); hx.fillStyle = p.lift; hx.fillRect(x, y, w, L);
    layer(hx, 'overlay', .15); hx.drawImage(figure, p.gx, p.gy, w / u * 2.5, L / u / 40, x, y, w, L);
    layer(hx, 'multiply', .25); hx.drawImage(pores, p.px, p.py, w / u, L / u / 2.5, x, y, w, L);
    layer(rx, 'source-over', 1); rx.fillStyle = p.sheen; rx.fillRect(x, y, w, L);
  };
  const gray = v => { v = Math.round(v); return 'rgb(' + v + ',' + v + ',' + v + ')'; };
  for (let i = 0; i < planks; i++) {
    const x = Math.round(i * S / planks), w = Math.round((i + 1) * S / planks) - x;
    let y = Math.floor(R() * S), left = S;
    while (left > 0) {
      let L = Math.round((.24 + R() * .24) * S); if (left - L < .2 * S) L = left > .55 * S ? Math.round(left / 2) : left;
      const p = { tone:tint(tones[Math.floor(R() * tones.length)], (R() - .5) * .015, (R() - .5) * .08, .85 + R() * .35),
        fx:R() * (N - w / u), fy:R() * (N - L / u / 9), gx:R() * (N - w / u * 2.5), gy:R() * (N - L / u / 40), px:R() * (N - w / u), py:R() * (N - L / u / 2.5),
        arcs:R() < .4 ? 5 + Math.floor(R() * 6) : 0, ax:.25 + R() * .5, ay:R(), ah:.15 + R() * .3, gap:18 + R() * 26,
        lift:gray(128 + (R() - .5) * 14), sheen:gray(128 + (R() - .5) * 44) };
      board(p, x, y, w, L); if (y + L > S) board(p, x, y - S, w, L);
      y = (y + L) % S; left -= L; joints.push([x, y, w]);
    }
  }
  // seams: a thin dark gap in the colour, a soft V-groove in the height, and no polish down in the gap
  const seam = (x, y, w, h) => { [0, S, -S].forEach(o => { const xx = w > h ? x : x + o, yy = w > h ? y + o : y, t = w > h ? [0, 1] : [1, 0];
    c.fillStyle = 'rgba(14,7,3,.75)'; c.fillRect(xx - t[0] * .65 * u, yy - t[1] * .65 * u, w + t[0] * 1.3 * u, h + t[1] * 1.3 * u);
    hx.fillStyle = 'rgba(0,0,0,.28)'; hx.fillRect(xx - t[0] * 3 * u, yy - t[1] * 3 * u, w + t[0] * 6 * u, h + t[1] * 6 * u);
    hx.fillStyle = 'rgba(0,0,0,.45)'; hx.fillRect(xx - t[0] * 1.8 * u, yy - t[1] * 1.8 * u, w + t[0] * 3.6 * u, h + t[1] * 3.6 * u);
    hx.fillStyle = 'rgba(0,0,0,.9)'; hx.fillRect(xx - t[0] * .8 * u, yy - t[1] * .8 * u, w + t[0] * 1.6 * u, h + t[1] * 1.6 * u);
    rx.fillStyle = 'rgba(255,255,255,.85)'; rx.fillRect(xx - t[0] * 1.5 * u, yy - t[1] * 1.5 * u, w + t[0] * 3 * u, h + t[1] * 3 * u); }); };
  [c, hx, rx].forEach(x => layer(x, 'source-over', 1));
  for (let i = 0; i < planks; i++) seam(Math.round(i * S / planks), 0, 0, S);
  joints.forEach(([x, y, w]) => seam(x, y, w, 0));
  // large soft patches: where the floor has faded, and where feet have polished it
  layer(c, 'soft-light', .35); c.drawImage(wear, 0, 0, S, S);
  layer(rx, 'overlay', .4); rx.drawImage(wear, 0, 0, S, S);
  return { color, normal:normalFromHeight(height, 3 * u), rough };
}

// A tileable sheet of furniture wood, grain running along x: glued-up boards, each cut through its own growth rings.
// Painted pale and near-neutral so the material colour can stain it. Returns colour, normal and roughness canvases.
export function woodGrain({ size = 1024, boards = 8, seed = 9 } = {}) {
  const S = size, Q = S / 4, R = rng(seed), bh = S / boards;
  // everything here changes slowly along the grain, so the noise is made a quarter as wide and stretched
  const drift = noiseField(Q, S, { octaves:3, base:[2, 5], seed:seed + 1 }), fibre = noiseField(Q, S, { octaves:3, base:[8, 256], seed:seed + 2 }), pace = noiseField(1, S, { octaves:3, base:[1, 24], seed:seed + 3 });
  // flat-sawn boards cross few rings and wander into arches; quarter-sawn ones show many straight, tight lines
  const B = Array.from({ length:boards }, () => { const flat = R() < .4; return { rings:flat ? 2.5 + R() * 3 : 7 + R() * 9, bend:flat ? 5 + R() * 4 : 1 + R() * 3, phase:R() * 9, tone:.84 + R() * .24, ring:.16 + R() * .14 }; });
  const [color, height, rough] = [0, 1, 2].map(() => new ImageData(S, S)), cd = color.data, hd = height.data, rd = rough.data;
  for (let y = 0, i = 0; y < S; y++) {
    const bi = Math.min(boards - 1, Math.floor(y / bh)), b = B[bi], row = y * Q, joint = y - bi * bh < 1 ? 1 : 0, t0 = (y / bh - bi) * b.rings + pace[y] * 1.6 + b.phase;
    for (let x = 0; x < S; x++, i++) {
      const xq = x / 4, fx = xq - (xq | 0), a0 = row + (xq | 0), a1 = row + ((xq | 0) + 1) % Q, fb = fibre[a0] + (fibre[a1] - fibre[a0]) * fx - .5;
      // a ring darkens slowly through the summer wood, then snaps back to pale
      const t = t0 + (drift[a0] + (drift[a1] - drift[a0]) * fx) * b.bend, f = t - Math.floor(t), d = f < .85 ? (f / .85) ** 2.2 : (1 - f) / .15;
      const L = 255 * b.tone * (1 - b.ring * d) * (1 + fb * .34) * (1 - joint * .15), o = i * 4;
      cd[o] = L; cd[o+1] = L * (.96 - .05 * d); cd[o+2] = L * (.9 - .1 * d);
      hd[o] = hd[o+1] = hd[o+2] = 128 + fb * 110 - d * 10 - joint * 50;
      rd[o] = rd[o+1] = rd[o+2] = 205 + fb * 70 - d * 30 + joint * 40;
      cd[o+3] = hd[o+3] = rd[o+3] = 255;
    }
  }
  const [c, hgt, r] = [color, height, rough].map(img => cnv(S, S, x => x.putImageData(img, 0, 0)));
  return { color:c, normal:normalFromHeight(hgt, S / 1024), rough:r };
}

// A tileable sheet of hand-trowelled plaster: soft clouds of tone, the sweeps of the trowel and a fine sandy tooth.
// Pale and neutral so the material colour can paint it. Returns colour, normal and roughness canvases.
export function plaster({ size = 1024, seed = 4 } = {}) {
  const S = size, u = S / 1024, R = rng(seed);
  const cloud = noiseCanvas(256, { base:3, seed:seed + 1 }), tooth = noiseCanvas(512, { octaves:3, base:96, seed:seed + 2 });
  const color = cnv(S, S), height = cnv(S, S), rough = cnv(S / 2, S / 2);
  const c = color.getContext('2d'), hx = height.getContext('2d'), rx = rough.getContext('2d'), all = [c, hx, rx]; rx.scale(.5, .5);
  c.fillStyle = '#bdbdbd'; hx.fillStyle = '#808080'; rx.fillStyle = '#f0f0f0'; all.forEach(x => { x.fillRect(0, 0, S, S); x.lineCap = 'round'; });
  layer(c, 'soft-light', .32); layer(hx, 'overlay', .3); layer(rx, 'overlay', .22); all.forEach(x => x.drawImage(cloud, 0, 0, S, S));
  all.forEach(x => layer(x, 'source-over', 1));
  for (let i = 0; i < 170; i++) {
    const x0 = R() * S, y0 = R() * S, a = R() * 6.283, L = (110 + R() * 260) * u, k = (R() - .5) * .5, w = (44 + R() * 80) * u, tone = R() < .5 ? '255,255,255,' : '0,0,0,', al = .01 + R() * .018;
    const x1 = x0 + Math.cos(a) * L, y1 = y0 + Math.sin(a) * L, mx = (x0 + x1) / 2 - Math.sin(a) * L * k, my = (y0 + y1) / 2 + Math.cos(a) * L * k;
    // a sweep that leaves the sheet comes back in on the other side
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (Math.max(x0, x1, mx) + ox < -w || Math.min(x0, x1, mx) + ox > S + w || Math.max(y0, y1, my) + oy < -w || Math.min(y0, y1, my) + oy > S + w) continue;
      const sweep = (x, style, wd) => { x.strokeStyle = style; x.lineWidth = wd; x.beginPath(); x.moveTo(x0 + ox, y0 + oy); x.quadraticCurveTo(mx + ox, my + oy, x1 + ox, y1 + oy); x.stroke(); };
      [1, .7, .4].forEach(f => { sweep(c, 'rgba(' + tone + al + ')', w * f); sweep(hx, 'rgba(' + tone + al * 2.5 + ')', w * f); });
      [1, .6].forEach(f => sweep(rx, 'rgba(0,0,0,' + al * .8 + ')', w * f)); // the trowel burnishes where it passes
    }
  }
  layer(c, 'overlay', .14); layer(hx, 'overlay', .5); layer(rx, 'overlay', .2);
  all.forEach(x => { for (const ox of [0, S / 2]) for (const oy of [0, S / 2]) x.drawImage(tooth, ox, oy, S / 2, S / 2); });
  return { color, normal:normalFromHeight(height, 2.5 * u), rough };
}

// A tileable plain weave: warp and weft threads passing over and under each other, no two spun quite alike.
// Neutral in colour so the material can dye it. Returns colour and normal canvases.
export function weave({ size = 512, threads = 32, seed = 12 } = {}) {
  const S = size, p = S / threads, R = rng(seed), fuzz = noiseField(S, S, { octaves:2, base:96, seed:seed + 1 });
  const warp = Array.from({ length:threads }, () => .95 + R() * .08), weft = Array.from({ length:threads }, () => .88 + R() * .08);
  // a thread is round across its width, and humped where it rides over the one beneath
  const round = Array.from({ length:p }, (_, k) => Math.sin((k + .5) / p * Math.PI) ** .7), hump = Array.from({ length:p }, (_, k) => .55 + .45 * Math.sin((k + .5) / p * Math.PI));
  const [color, height] = [0, 1].map(() => new ImageData(S, S)), cd = color.data, hd = height.data;
  for (let y = 0, k = 0; y < S; y++) for (let x = 0; x < S; x++, k++) {
    const i = Math.floor(x / p), j = Math.floor(y / p), xk = x - i * p, yk = y - j * p, over = (i + j) & 1;
    const lift = over ? round[xk] * hump[yk] : round[yk] * hump[xk], f = fuzz[k] - .5, o = k * 4;
    cd[o] = cd[o+1] = cd[o+2] = 255 * (over ? warp[i] : weft[j]) * (.6 + .4 * lift) * (1 + f * .3);
    hd[o] = hd[o+1] = hd[o+2] = 255 * lift * (.85 + f * .3); cd[o+3] = hd[o+3] = 255;
  }
  const [c, hgt] = [color, height].map(img => cnv(S, S, x => x.putImageData(img, 0, 0)));
  return { color:c, normal:normalFromHeight(hgt, 1.2 * S / 512) };
}

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Eight spine layouts for the shelved books, one per 64 px row, each read along the spine from its foot (x = 0) to its head.
// The channels are masks, not colours: red is foil stamping, green a paper label, blue a darkened panel. The books' shader colours them per book.
export const SPINES = 8;
export function spineAtlas() {
  const W = 512, RH = 64;
  return cnv(W, RH * SPINES, x => {
    const FOIL = '#f00', PAPER = '#0f0', DARK = '#00f';
    const bar = (r, c, u0, u1, v0 = 0, v1 = 1) => { x.fillStyle = c; x.fillRect(u0 * W, (r + v0) * RH, (u1 - u0) * W, (v1 - v0) * RH); };
    // a line of lettering: a run of word-sized dashes along the spine
    const words = (r, c, u0, u1, th, v = .5) => { const R = rng(r * 7 + 3); for (let u = u0; u < u1 - .03;) { const L = Math.min(u1 - u, .05 + R() * .09); bar(r, c, u, u + L, v - th / 2, v + th / 2); u += L + .018; } };
    x.fillStyle = '#000'; x.fillRect(0, 0, W, RH * SPINES);
    [.07, .1, .893, .915].forEach((u, i) => bar(0, FOIL, u, u + (i % 3 ? .007 : .015))); bar(0, DARK, .6, .8); words(0, FOIL, .62, .78, .16);                   // classic: double rules, a title panel
    [.18, .34, .5, .66, .82].forEach(u => bar(1, FOIL, u, u + .012)); words(1, FOIL, .69, .81, .14);                                                         // raised bands
    bar(2, PAPER, .68, .88, .14, .86); words(2, DARK, .71, .85, .1, .38); words(2, DARK, .71, .82, .1, .62);                                                 // a pasted paper label
    bar(3, DARK, .5, .9); bar(3, FOIL, .5, .508); bar(3, FOIL, .892, .9); words(3, FOIL, .55, .85, .2); bar(3, FOIL, .1, .16, .4, .6);                         // a deep title panel
    bar(4, DARK, 0, .3); words(4, PAPER, .36, .9, .22);                                                                                                      // a modern jacket
    bar(5, FOIL, .05, .058); bar(5, FOIL, .942, .95); words(5, FOIL, .62, .86, .14); words(5, FOIL, .16, .36, .1);
    x.save(); x.translate(.5 * W, 5.5 * RH); x.rotate(Math.PI / 4); x.fillStyle = FOIL; x.fillRect(-9, -9, 18, 18); x.restore();                             // rules and a lozenge
    bar(6, PAPER, .3, .7); words(6, DARK, .34, .66, .18);                                                                                                    // a broad paper band
    bar(7, FOIL, .08, .1, .35, .65); words(7, FOIL, .5, .85, .12);                                                                                           // plain cloth
  });
}

// The top of a closed book: cream paper, its sheets showing as faint lines across the thickness (canvas y).
export const pageEdges = () => cnv(64, 64, (x, w, h) => { const R = rng(31); x.fillStyle = '#eadfc6'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 1 + Math.floor(R() * 2)) { x.fillStyle = 'rgba(90,70,40,' + (.05 + R() * .16) + ')'; x.fillRect(0, y, w, 1); } });

// Turned or brushed metal: fine scratches running along x and a cloudy tarnish. Pale, to be tinted by the metal's colour.
// Returns colour and roughness canvases.
export function brushedMetal({ size = 256, seed = 17 } = {}) {
  const S = size, scratch = noiseField(S, S, { octaves:3, base:[3, 96], seed:seed + 1 }), cloud = noiseField(S, S, { octaves:4, base:3, seed:seed + 2 });
  const [color, rough] = [0, 1].map(() => new ImageData(S, S)), cd = color.data, rd = rough.data;
  for (let i = 0; i < S * S; i++) { const sc = scratch[i] - .5, t = sstep(.5, .9, cloud[i]), L = 255 * (1 - t * .2) * (1 + sc * .12), o = i * 4; // tarnish gathers in the cloudier patches
    cd[o] = L; cd[o+1] = L * (1 - t * .05); cd[o+2] = L * (1 - t * .14); rd[o] = rd[o+1] = rd[o+2] = 255 * (.6 + sc * .32 + t * .3); cd[o+3] = rd[o+3] = 255; }
  const [c, r] = [color, rough].map(img => cnv(S, S, x => x.putImageData(img, 0, 0)));
  return { color:c, rough:r };
}

// The lake behind the window, after an autumn morning in the Alps: a low overcast, snow on the far peaks, mist along the slopes,
// a wooded hillside running down from the left to a boathouse on the shore, a strip of meadow, and all of it again in the still
// water. Each depth is drawn small and scaled up, so the farthest is the softest — a blur that needs no canvas filter.
export const SKY = { top:'#3a78bf', mid:'#7eb2e2', horizon:'#dbe9f4' }; // a clear day: deep overhead, paling down to the haze over the far range; the strip of sky behind the paintings is its top
export function paintLakeView(c, { trees, seed = 11, boathouse = true, feather = 0 }) {
  const x = c.getContext('2d'), w = c.width, h = c.height, R = rng(seed), pick = () => trees[Math.floor(R() * trees.length)];
  const SHORE = h * .55; // where the water begins
  const layer = (k, draw) => cnv(Math.round(w * k), Math.round(h * k), lx => { lx.scale(k, k); lx.lineCap = lx.lineJoin = 'round'; draw(lx); });
  const depth = (k, draw) => x.drawImage(layer(k, draw), 0, 0, w, h);
  const blob = (lx, bx, by, r, col, a, ry = r, rot = 0) => { lx.globalAlpha = a; lx.fillStyle = col; lx.beginPath(); lx.ellipse(bx, by, r, ry, rot, 0, 6.2832); lx.fill(); };
  // tint whatever the layer already holds, and nothing else
  const wash = (lx, style, a = 1) => { lx.globalCompositeOperation = 'source-atop'; lx.globalAlpha = a; lx.fillStyle = style; lx.fillRect(0, 0, w, h); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1; };
  const fade = (lx, x0, y0, x1, y1, ...stops) => { const g = lx.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  const poly = (lx, pts, style, a = 1) => { lx.globalAlpha = a; lx.fillStyle = style; lx.beginPath(); pts.forEach(([px, py], i) => i ? lx.lineTo(px, py) : lx.moveTo(px, py)); lx.closePath(); lx.fill(); };
  const curve = (pts, t) => { let i = 1; while (i < pts.length - 1 && pts[i][0] < t) i++; const [a, b] = [pts[i - 1], pts[i]], k = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (.5 - Math.cos(Math.min(1, Math.max(0, k)) * Math.PI) / 2); };
  const DARK = ['#2c4631', '#243b29', '#365636', '#1d3024', '#2f4d35'], conif = () => DARK[Math.floor(R() * DARK.length)];
  const conifer = (lx, tx, base, H, col) => { // a spruce: two tiers of a narrow triangle, and a lit edge on the left
    lx.globalAlpha = .95; lx.fillStyle = col;
    [[1, .3], [.7, .22], [.42, .14]].forEach(([k, half]) => { lx.beginPath(); lx.moveTo(tx, base - H); lx.lineTo(tx + H * half, base - H * (1 - k)); lx.lineTo(tx - H * half, base - H * (1 - k)); lx.closePath(); lx.fill(); });
    lx.globalAlpha = .12; lx.fillStyle = '#dfe8d8'; lx.beginPath(); lx.moveTo(tx, base - H); lx.lineTo(tx - H * .3, base); lx.lineTo(tx - H * .12, base); lx.closePath(); lx.fill(); };
  const crown = (lx, cx, cy, r, main) => { // a broadleaf crown: clumps gathered round a centre, lit from the upper left
    for (let k = 0, n = 10 + r; k < n; k++) { const a = R() * 6.2832, d = Math.sqrt(R()), bx = cx + Math.cos(a) * d * r, by = cy + Math.sin(a) * d * r * .85, rr = r * (.22 + R() * .2);
      blob(lx, bx, by, rr, R() < .7 ? main : pick(), .85 + R() * .15);
      const lit = -(Math.cos(a) * .6 + Math.sin(a) * .8) * d; blob(lx, bx, by, rr, lit > 0 ? '#fff' : '#000', Math.abs(lit) * (lit > 0 ? .18 : .3)); } };
  // the hillside's ridge, as a fraction of height against a fraction of width: high on the left, down to the lake on the right,
  // then the near trees climb again at the right edge
  const RIDGE = [[0, .02], [.12, .11], [.25, .22], [.38, .34], [.5, .43], [.6, .47], [.72, .49], [.84, .49], [.92, .465], [1, .41]];
  const ridge = t => h * curve(RIDGE, t);

  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  // sky: clear blue, deepest overhead and paling into the haze over the range, with nothing on it but a few thin streaks of cloud.
  // They draw on their own run of chance, so how many there are does not move the trees below.
  x.fillStyle = fade(x, 0, 0, 0, h * .46, SKY.top, SKY.mid, SKY.horizon); x.fillRect(0, 0, w, h);
  const C = rng(seed * 7 + 3);
  depth(.3, lx => { for (let i = 0; i < 3; i++) blob(lx, C() * w, h * C() * .12, 90 + C() * 120, '#eef3f8', .2 + C() * .2, 5 + C() * 6, (C() - .5) * .2); });

  // the far range: a jagged ridge, snow above the snowline, rock showing through, and haze gathering at its foot
  depth(.5, lx => {
    const pts = [[.2, .5], [.28, .36], [.34, .27], [.4, .32], [.46, .2], [.51, .29], [.57, .235], [.63, .27], [.69, .22], [.75, .3], [.81, .255], [.87, .33], [.92, .18], [.96, .24], [1.02, .21], [1.08, .5]]
      .map(([px, py]) => [px * w, (py + (R() - .5) * .02) * h]);
    const jag = []; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; jag.push([ax, ay]); for (let k = 1; k < 4; k++) jag.push([ax + (bx - ax) * k / 4, ay + (by - ay) * k / 4 + (R() - .5) * h * .018]); }
    jag.push(pts[pts.length - 1], [w * 1.06, h * .62], [w * .22, h * .62]);
    poly(lx, jag, fade(lx, 0, h * .18, 0, h * .52, '#46576c', '#5e6f84', '#8795a6'));
    pts.forEach(([px, py], i) => { if (i && i < pts.length - 1 && py < pts[i - 1][1] && py < pts[i + 1][1]) poly(lx, [[px, py], [pts[i + 1][0] + w * .02, h * .55], [px - w * .01, h * .55]], '#2f3d4f', .35); }); // the faces turned from the light
    wash(lx, fade(lx, 0, h * .18, 0, h * .36, 'rgba(244,247,250,.95)', 'rgba(244,247,250,.55)', 'rgba(244,247,250,0)')); // snow, thinning down the slopes
    lx.globalCompositeOperation = 'source-atop'; lx.strokeStyle = '#3e4c5d'; for (let i = 0; i < 70; i++) { const sx = w * (.24 + R() * .82), sy = h * (.2 + R() * .14), dx = (R() - .5) * 18; lx.globalAlpha = .2 + R() * .3; lx.lineWidth = 1.5 + R() * 2; lx.beginPath(); lx.moveTo(sx, sy); lx.lineTo(sx + dx, sy + 8 + R() * 16); lx.stroke(); } lx.globalCompositeOperation = 'source-over'; // rock showing through, kept to the range so none of it streaks the sky
    wash(lx, fade(lx, 0, h * .36, 0, h * .52, 'rgba(186,204,224,0)', 'rgba(186,204,224,.45)')); });
  depth(.06, lx => { for (let i = 0; i < 14; i++) blob(lx, w * (.4 + R() * .62), h * (.38 + R() * .12), 60 + R() * 110, '#e8eef5', .22 + R() * .28, 10 + R() * 14); }); // mist along the slopes

  // the hillside behind: a wooded slope in haze
  depth(.18, lx => {
    const pts = []; for (let i = 0; i <= 40; i++) pts.push([w * i / 40, ridge(i / 40) + (R() - .5) * h * .01]); pts.push([w, SHORE + 2], [0, SHORE + 2]);
    poly(lx, pts, '#33503a');
    for (let i = 0; i < 420; i++) { const tx = R() * w, top = ridge(tx / w), ty = top + R() * (SHORE - top), s = 10 + R() * 16;
      if (R() < .6) conifer(lx, tx, ty, s * 2.2, conif()); else crown(lx, tx, ty - s * .6, s, pick()); }
    wash(lx, fade(lx, 0, 0, 0, SHORE, 'rgba(168,193,220,.5)', 'rgba(168,193,220,.3)', 'rgba(168,193,220,.05)')); });
  // the trees along the shore, and the tall ones at the right edge: nearer, so sharper and darker under the crowns
  depth(.28, lx => {
    const mx0 = w * .56, mx1 = w * .985, mp = [[mx0, SHORE]]; for (let i = 0; i <= 12; i++) mp.push([mx0 + (mx1 - mx0) * i / 12, SHORE - h * (.012 + R() * .012)]); mp.push([mx1, SHORE]);
    poly(lx, mp, fade(lx, 0, SHORE - h * .03, 0, SHORE, '#8aa456', '#66844a'), .95); // the meadow, down to a pale gravel edge
    lx.fillStyle = 'rgba(205,208,196,.6)'; lx.fillRect(mx0, SHORE - 1.5, mx1 - mx0, 2.5);
    for (let i = 0; i < 150; i++) { const tx = R() * w, ty = SHORE - R() * h * .03, s = 16 + R() * 18; if (tx > w * .6 && tx < w * .97 && R() < .7) continue; // the meadow keeps the right shore open
      if (R() < .4) conifer(lx, tx, ty, s * 2.4, conif()); else crown(lx, tx, ty - s * .55, s, pick()); }
    for (let i = 0; i < 9; i++) { const tx = w * (.93 + R() * .1), ty = SHORE - R() * h * .02; crown(lx, tx, ty - h * .07 - R() * h * .1, 38 + R() * 22, pick()); }
    wash(lx, fade(lx, 0, SHORE - h * .25, 0, SHORE, 'rgba(0,0,0,0)', 'rgba(0,0,0,.35)')); });

  // the boathouse: a flat roof over open bays on the water, a boarded wall on the left, a few boats in under it
  if (boathouse) depth(.5, lx => {
    const bx = w * .21, bw = w * .15, top = SHORE - h * .062, wall = bx + bw * .4;
    lx.globalAlpha = 1; lx.fillStyle = '#2a2521'; lx.fillRect(wall, top, bx + bw - wall, SHORE - top); // the dark of the bays
    lx.fillStyle = fade(lx, 0, top, 0, SHORE, '#cfae7c', '#b08f60'); lx.fillRect(bx, top, wall - bx, SHORE - top); // boards
    lx.strokeStyle = 'rgba(90,65,35,.45)'; lx.lineWidth = 1; for (let px = bx + 4; px < wall; px += 6) { lx.beginPath(); lx.moveTo(px, top + 3); lx.lineTo(px, SHORE); lx.stroke(); }
    lx.fillStyle = '#bf9c6a'; for (let px = wall + 5; px < bx + bw; px += bw * .11) lx.fillRect(px, top + 3, 3, SHORE - top - 3); // posts
    lx.fillStyle = '#a88a5c'; lx.fillRect(wall, top + 3, bx + bw - wall, 4); // the beam under the roof
    poly(lx, [[bx - 6, top], [bx + bw + 8, top + 2], [bx + bw + 8, top + 7], [bx - 6, top + 5]], '#3c3f42'); // roof
    poly(lx, [[bx - 6, top - 1], [bx + bw + 8, top + 1], [bx + bw + 8, top + 2.5], [bx - 6, top + .5]], '#6b6e70'); // its lit edge
    lx.fillStyle = '#8a7a62'; lx.fillRect(bx - 5, SHORE - 3, bw + 12 + w * .045, 3); // the deck and the jetty off to the right
    [['#e3ebf0', .5], ['#4f9bc9', .63], ['#ece6d6', .76], ['#5e9fcf', .89], ['#e3ebf0', 1.12]].forEach(([col, k]) => blob(lx, wall + (bx + bw - wall) * k, SHORE - 2.5, 7, col, 1, 2.8)); }); // boats

  // the water: the far shore again, upside down, broken by a slow ripple, under a green-tinted glass
  x.fillStyle = fade(x, 0, SHORE, 0, h, '#33503f', '#223d35'); x.fillRect(0, SHORE, w, h - SHORE);
  const K = .35, refl = layer(K, lx => lx.drawImage(c, 0, 0)), phase = R() * 6;
  x.globalAlpha = .62;
  for (let sy = 0; sy < h - SHORE; sy += 2) { const dx = Math.sin(sy * .07 + phase) * (1 + sy * .012), sq = 1 + sy * .0004; // the mirror stretches a little towards the near shore
    x.drawImage(refl, 0, Math.max(0, (SHORE - (sy + 2) * sq) * K), w * K, 2 * K * sq, dx, SHORE + sy, w, 2); }
  x.globalAlpha = 1; x.fillStyle = fade(x, 0, SHORE, 0, h, 'rgba(30,60,50,.42)', 'rgba(40,75,65,.22)', 'rgba(55,80,80,.12)'); x.fillRect(0, SHORE, w, h - SHORE);
  x.fillStyle = fade(x, 0, SHORE, 0, SHORE + h * .03, 'rgba(0,0,0,.35)', 'rgba(0,0,0,0)'); x.fillRect(0, SHORE, w, h * .03); // the shadow of the bank
  // what has blown onto the water: leaves drifting, thickest near the window
  for (let i = 0; i < 260; i++) { const k = Math.pow(R(), .55), ly = SHORE + h * .04 + k * (h - SHORE - h * .04), r = 1.2 + k * 4;
    blob(x, R() * w, ly, r, R() < .3 ? '#e8c06a' : pick(), .6 + R() * .35, r * .45, R() * 3); }
  x.globalAlpha = 1;
  // the top runs out into plain sky, so the view has no edge against the strip of sky behind it
  x.fillStyle = fade(x, 0, 0, 0, h * .1, SKY.top, SKY.top + '00'); x.fillRect(0, 0, w, h * .1);
  // a view that is laid over the edge of another gives way to it along its own left edge
  if (feather) { x.globalCompositeOperation = 'destination-out'; x.fillStyle = fade(x, 0, 0, w * feather, 0, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)'); x.fillRect(0, 0, w * feather, h); x.globalCompositeOperation = 'source-over'; }
}

// The water between the house and the painted lake. It leaves the far edge in the colour the painting ends on and darkens as it comes
// under the eye, with the same leaves adrift on it. Tiles from side to side.
export function paintNearWater(c, lake, { trees, seed = 19 }) {
  const x = c.getContext('2d'), w = c.width, h = c.height, R = rng(seed);
  const [r, g, b] = cnv(1, 1, lx => lx.drawImage(lake, 0, lake.height - 6, lake.width, 6, 0, 0, 1, 1)).getContext('2d').getImageData(0, 0, 1, 1).data;
  const grad = x.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, `rgb(${r},${g},${b})`); grad.addColorStop(1, `rgb(${Math.round(r * .42)},${Math.round(g * .52)},${Math.round(b * .48)})`);
  x.globalAlpha = 1; x.fillStyle = grad; x.fillRect(0, 0, w, h);
  const wrap = (bx, draw) => [-w, 0, w].forEach(dx => draw(bx + dx));
  for (let i = 0; i < 70; i++) { const by = R() * h, len = 20 + R() * 60, bx = R() * w, th = 1 + R(); x.globalAlpha = .05 + R() * .08; x.fillStyle = R() < .5 ? '#dfe8ea' : '#0c1a18'; wrap(bx, px => x.fillRect(px, by, len, th)); } // a slow ripple
  for (let i = 0; i < 40; i++) { const bx = R() * w, by = h * (.15 + R() * .85), rr = 1.5 + R() * 2.5, col = R() < .3 ? '#e8c06a' : trees[Math.floor(R() * trees.length)], rot = R() * 3;
    x.globalAlpha = .6 + R() * .35; x.fillStyle = col; wrap(bx, px => { x.beginPath(); x.ellipse(px, by, rr, rr * .5, rot, 0, 6.2832); x.fill(); }); }
  x.globalAlpha = 1;
}

// Moulded plastic that has sat in a room for years: a faint pebble grain, clouds of yellowing, smudges where it is handled,
// a scuff or two. Pale, to be tinted by the part's colour. Returns colour, normal and roughness canvases.
export function agedPlastic({ size = 512, seed = 33 } = {}) {
  const S = size, u = S / 512, R = rng(seed), yellow = noiseField(S, S, { octaves:4, base:3, seed:seed + 1 }), smudge = noiseField(S, S, { octaves:3, base:6, seed:seed + 2 }), grain = noiseField(S, S, { octaves:2, base:128, seed:seed + 3 });
  const [color, height, rough] = [0, 1, 2].map(() => new ImageData(S, S)), cd = color.data, hd = height.data, rd = rough.data;
  for (let i = 0; i < S * S; i++) { const y = sstep(.35, .85, yellow[i]), o = i * 4, L = 255 * (1 - y * .08) * (1 + (grain[i] - .5) * .04);
    cd[o] = L; cd[o+1] = L * (1 - y * .06); cd[o+2] = L * (1 - y * .2);
    hd[o] = hd[o+1] = hd[o+2] = 128 + (grain[i] - .5) * 70; rd[o] = rd[o+1] = rd[o+2] = 255 * (.52 + (smudge[i] - .5) * .3 + (grain[i] - .5) * .08); cd[o+3] = hd[o+3] = rd[o+3] = 255; }
  const [c, hgt, r] = [color, height, rough].map(img => cnv(S, S, x => x.putImageData(img, 0, 0)));
  const cx = c.getContext('2d'), hx = hgt.getContext('2d'), rx = r.getContext('2d'); [cx, hx, rx].forEach(x => { x.lineCap = 'round'; });
  for (let i = 0; i < 24; i++) { // scuffs: short pale lines, a little lower than the surface and duller
    const x0 = R() * S, y0 = R() * S, a = R() * 6.283, L = (10 + R() * 50) * u, al = .08 + R() * .18, w = (.6 + R() * 1.2) * u;
    const line = (x, style) => { x.strokeStyle = style; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L); x.stroke(); };
    line(cx, 'rgba(255,255,255,' + al + ')'); line(hx, 'rgba(0,0,0,' + al * 2 + ')'); line(rx, 'rgba(255,255,255,' + al * 2 + ')'); }
  return { color:c, normal:normalFromHeight(hgt, 1.2 * u), rough:r };
}

// The sheets the room's materials are built on, at full size or, for the low tier, half. Worth a worker: together they are most of the
// time it takes to open the room.
export function paintSheets(low) {
  const s = low ? 1 : 0;
  return { wood:woodGrain({ size:[1024, 512][s] }), plaster:plaster({ size:[1024, 512][s] }), fabric:weave({ size:[512, 256][s] }),
    metal:brushedMetal(), plastic:agedPlastic(), floor:plankFloor({ size:[1536, 768][s] }) };
}

// What a CRT puts between you and the picture: phosphor stripes, scanlines, and the dim corners of the tube. Multiplied over each frame.
export const crtMask = (w, h) => cnv(w, h, x => {
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  ['rgba(255,205,205,1)', 'rgba(205,255,205,1)', 'rgba(205,205,255,1)'].forEach((c, k) => { x.fillStyle = c; for (let i = k; i < w; i += 3) x.fillRect(i, 0, 1, h); });
  x.fillStyle = 'rgba(0,0,0,.32)'; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 1); x.fillStyle = 'rgba(0,0,0,.1)'; for (let y = 1; y < h; y += 4) x.fillRect(0, y, w, 1);
  const g = x.createRadialGradient(w / 2, h / 2, h * .35, w / 2, h / 2, h * .9); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
});
