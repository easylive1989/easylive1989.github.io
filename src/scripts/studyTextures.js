import * as THREE from 'three';

// Procedural textures for the study room. Everything is painted on canvases at load,
// so the room ships no image files for its materials.

export const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const cnv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; if (fn) fn(c.getContext('2d'), w, h); return c; };
export const texOf = (c, rep = [1,1], srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

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
      const p = { tone:new THREE.Color(tones[Math.floor(R() * tones.length)]).offsetHSL((R() - .5) * .015, (R() - .5) * .08, 0).multiplyScalar(.85 + R() * .35).getStyle(),
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

// A ginger tabby's coat, laid out for a sphere whose long axis is x: bands across the body, a dark line down the spine, a pale belly.
// Returns colour and normal canvases.
export function tabbyFur({ size = 512, seed = 8 } = {}) {
  const W = size, H = size / 2, u = W / 512, R = rng(seed), waver = noiseField(W, H, { octaves:3, base:[4, 2], seed:seed + 1 }), patch = noiseField(W, H, { octaves:4, base:[6, 3], seed:seed + 2 });
  const coat = new ImageData(W, H), d = coat.data;
  for (let y = 0, k = 0; y < H; y++) { const pol = (y + .5) / H * Math.PI, sp = Math.sin(pol), sy = Math.cos(pol);
    for (let x = 0; x < W; x++, k++) { const lon = x / W * 6.2832, sx = sp * Math.cos(lon), sz = sp * Math.sin(lon), o = k * 4;
      // where this texel sits on the sphere decides its marking, so the bands stay parallel instead of fanning out from the pole
      const band = sstep(.2, .65, Math.sin((sx * 6 + (waver[k] - .5) * 1.8) * Math.PI)) * sstep(-.5, .1, sy), spine = sstep(.14, .03, Math.abs(sz)) * sstep(.15, .7, sy);
      const dark = Math.max(band, spine) * .78, belly = sstep(-.2, -.75, sy), lum = 1 + (patch[k] - .5) * .22;
      d[o] = ((238 - 106 * dark) * lum) * (1 - belly) + 250 * belly; d[o+1] = ((159 - 97 * dark) * lum) * (1 - belly) + 229 * belly; d[o+2] = ((90 - 68 * dark) * lum) * (1 - belly) + 198 * belly; d[o+3] = 255; } }
  const color = cnv(W, H, x => x.putImageData(coat, 0, 0)), height = cnv(W, H), c = color.getContext('2d'), hx = height.getContext('2d');
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, W, H);
  // the fur itself: short hairs lying roughly downwards, some catching the light and some in shadow
  [c, hx].forEach(x => { x.lineCap = 'round'; });
  for (let i = 0; i < 9000; i++) {
    const x0 = R() * W, y0 = R() * H, a = (R() - .5) * .8, L = (5 + R() * 9) * u, pale = R() < .5, al = .05 + R() * .16;
    c.strokeStyle = (pale ? 'rgba(255,236,204,' : 'rgba(96,42,12,') + al + ')'; hx.strokeStyle = (pale ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + al * 2 + ')'; c.lineWidth = hx.lineWidth = (.7 + R() * .8) * u;
    for (const ox of x0 < 16 * u ? [0, W] : x0 > W - 16 * u ? [0, -W] : [0]) [c, hx].forEach(x => { x.beginPath(); x.moveTo(x0 + ox, y0); x.lineTo(x0 + ox + Math.sin(a) * L, y0 + Math.cos(a) * L); x.stroke(); });
  }
  return { color, normal:normalFromHeight(height, 1.6 * u) };
}

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

// The wall of a terracotta pot, x round the pot and y from the rim down to the foot: throwing rings, a chalky bloom of salts,
// and a darker damp band above the foot. Carries its own colour. Returns colour and normal canvases.
export function terracotta({ size = 256, seed = 21 } = {}) {
  const W = size, H = size / 2, cloud = noiseField(W, H, { octaves:4, base:[6, 3], seed:seed + 1 }), tooth = noiseField(W, H, { octaves:2, base:[64, 32], seed:seed + 2 });
  const [color, height] = [0, 1].map(() => new ImageData(W, H)), cd = color.data, hd = height.data;
  for (let y = 0, i = 0; y < H; y++) { const v = y / H, damp = sstep(.7, .95, v) * .28;
    for (let x = 0; x < W; x++, i++) { const ring = Math.sin(v * 88 + cloud[i] * 2), bloom = sstep(.5, .9, cloud[i]) * .55, L = (1 - damp) * (1 + (tooth[i] - .5) * .16 + ring * .03), o = i * 4;
      cd[o] = 190 * L * (1 - bloom) + 226 * bloom; cd[o+1] = 104 * L * (1 - bloom) + 196 * bloom; cd[o+2] = 62 * L * (1 - bloom) + 172 * bloom;
      hd[o] = hd[o+1] = hd[o+2] = 128 + ring * 40 + (tooth[i] - .5) * 120; cd[o+3] = hd[o+3] = 255; } }
  const [c, hgt] = [color, height].map(img => cnv(W, H, x => x.putImageData(img, 0, 0)));
  return { color:c, normal:normalFromHeight(hgt, 1.5 * W / 256) };
}

// A leaf for a flattened sphere whose long axis is x, stalk at -x and tip at +x: a pale midrib with side veins sweeping towards the tip,
// darker towards the margin, paler underneath. Carries its own colour. Returns colour and normal canvases.
export function leaf({ size = 256, seed = 27 } = {}) {
  const W = size, H = size / 2, blotch = noiseField(W, H, { octaves:4, base:[4, 2], seed });
  const [color, height] = [0, 1].map(() => new ImageData(W, H)), cd = color.data, hd = height.data;
  for (let y = 0, i = 0; y < H; y++) { const pol = (y + .5) / H * Math.PI, sp = Math.sin(pol), sy = Math.cos(pol);
    for (let x = 0; x < W; x++, i++) { const lon = x / W * 6.2832, sx = -sp * Math.cos(lon), az = Math.abs(sp * Math.sin(lon)), o = i * 4;
      const q = sx * 4.5 - az * 3.6, off = Math.abs(q - Math.round(q)), rib = sstep(.07 - sx * .025, .01, az), vein = Math.max(rib, sstep(.09, .03, off) * sstep(.92, .55, az) * .7);
      const under = sstep(.05, -.3, sy), L = (1 - .3 * az * az) * (1 + (blotch[i] - .5) * .3), mix = (g, pale, dull) => (g * L * (1 - vein * .6) + pale * vein * .6) * (1 - under * .45) + dull * under * .45;
      cd[o] = mix(70, 176, 138); cd[o+1] = mix(140, 208, 170); cd[o+2] = mix(52, 118, 104); cd[o+3] = hd[o+3] = 255;
      hd[o] = hd[o+1] = hd[o+2] = 60 + 150 * sstep(0, .5, off) * (1 - rib); } } // the blade quilts up between the veins
  const [c, hgt] = [color, height].map(img => cnv(W, H, x => x.putImageData(img, 0, 0)));
  return { color:c, normal:normalFromHeight(hgt, 1.2 * W / 256) };
}

// The garden behind the window, painted onto `c` in three depths: far woods, the garden's own trees, a hedge under the sill.
// Each depth is drawn small and scaled up, so the farthest is the softest — an out-of-focus blur that needs no canvas filter.
export function paintGarden(c, { sky, trees, bare = false, night = false, seed = 11 }) {
  const x = c.getContext('2d'), w = c.width, h = c.height, R = rng(seed), pick = () => trees[Math.floor(R() * trees.length)];
  const depth = (k, draw) => x.drawImage(cnv(Math.round(w * k), Math.round(h * k), lx => { lx.scale(k, k); lx.lineCap = 'round'; draw(lx); }), 0, 0, w, h);
  const blob = (lx, bx, by, r, col, a) => { lx.globalAlpha = a; lx.fillStyle = col; lx.beginPath(); lx.arc(bx, by, r, 0, 6.2832); lx.fill(); };
  // tint whatever the layer already holds, and nothing else
  const wash = (lx, style, a = 1) => { lx.globalCompositeOperation = 'source-atop'; lx.globalAlpha = a; lx.fillStyle = style; lx.fillRect(0, 0, w, h); lx.globalCompositeOperation = 'source-over'; };
  const fade = (lx, x0, y0, x1, y1, from, to) => { const g = lx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, from); g.addColorStop(1, to); return g; };
  const tree = (lx, tx, base, H) => {
    const lean = (R() - .5) * .3, crown = H * (.3 + R() * .1), main = pick(), cx = tx + Math.sin(lean) * H * .66, cy = base - H * .66;
    const bough = (x0, y0, ang, len, wd, n) => { const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len; lx.lineWidth = wd; lx.beginPath(); lx.moveTo(x0, y0); lx.lineTo(x1, y1); lx.stroke();
      if (n) for (let k = 0; k < (bare ? 3 : 2); k++) bough(x1, y1, ang + (R() - .5) * 1.6, len * (.5 + R() * .25), wd * .62, n - 1); };
    lx.globalAlpha = 1; lx.strokeStyle = '#2a2018'; bough(tx, base, lean, H * .46, H * .055, bare ? 4 : 2);
    // foliage: clumps gathered into a crown — or, on a bare tree, what little still clings to the boughs
    for (let k = 0, n = bare ? 30 : 150; k < n; k++) { const a = R() * 6.2832, d = Math.sqrt(R()), bx = cx + Math.cos(a) * d * crown * 1.15, by = cy + Math.sin(a) * d * crown * .85, r = crown * (bare ? .07 + R() * .08 : .1 + R() * .13);
      blob(lx, bx, by, r, R() < .72 ? main : pick(), bare ? .85 : .8 + R() * .2);
      const lit = -(Math.cos(a) * .6 + Math.sin(a) * .8) * d; blob(lx, bx, by, r, lit > 0 ? '#fff' : '#000', Math.abs(lit) * (lit > 0 ? .22 : .32)); } // lit from the upper left
  };
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.fillStyle = fade(x, 0, 0, 0, h * .72, sky[0], sky[1]); x.fillRect(0, 0, w, h);
  depth(.1, lx => { for (let i = 0; i < 110; i++) blob(lx, R() * w, h * (.46 + R() * .22), 26 + R() * 48, pick(), .6); wash(lx, sky[0], .5); }); // haze
  x.fillStyle = sky[1]; x.fillRect(0, h * .7, w, h * .3); x.fillStyle = fade(x, 0, h * .68, 0, h, 'rgba(0,0,0,0)', 'rgba(0,0,0,.3)'); x.fillRect(0, h * .68, w, h * .32); // the lawn, darker towards the house
  depth(.18, lx => { for (let i = 0; i < 6; i++) tree(lx, (i + .2 + R() * .6) / 6 * w, h * (.69 + R() * .05), h * (.42 + R() * .16));
    wash(lx, fade(lx, 0, h * .35, 0, h * .8, 'rgba(0,0,0,0)', 'rgba(0,0,0,.3)')); }); // shade gathers under the crowns
  depth(.3, lx => { for (let i = 0; i < 160; i++) blob(lx, R() * w, h * (.82 + R() * .14), 12 + R() * 22, pick(), .9); wash(lx, '#000', .3); });
  if (night) { x.fillStyle = 'rgba(6,14,22,.58)'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(40,70,60,.25)'; x.fillRect(0, h * .3, w, h * .7); }
}
