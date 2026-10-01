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
  const layer = (x, op, alpha) => { x.globalCompositeOperation = op; x.globalAlpha = alpha; };
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
