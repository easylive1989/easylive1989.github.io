// The Chinese study that goes with the landscape in ink: a white wall with a moon gate and a lattice window, timbers overhead, and Ming
// furniture standing where the western room's does. Nothing here is built until that world is first wanted (study.js, WORLDS). Every
// surface that something rests on (a shelf's boards, the table's top, the stand under the TV) is where the western room has it, so the
// books and the exhibits, which belong to neither room, never move.
export default function buildInkRoom(kit) {
  const { THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room } = kit;
  const parts = [];
  // one piece of the room: built into a group of its own under `parent`, so that it shares the coordinates of whatever stands on it
  // there, then drawn as one mesh per material
  const piece = (parent, name, fill) => { const g = new THREE.Group(); g.name = name; parent.add(g); fill(g); weld(g); parts.push(g); return g; };
  const lone = (parent, o) => { parent.add(o); parts.push(o); return o; }; // what has to stay a mesh, or a group, of its own
  const seg = (x, a, b, c, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
  const K = Q.low ? .5 : 1; // the low tier paints this room's own sheets at half size

  /* ================= materials ================= */
  const plaster = std('ink-plaster', '#ece7da', { ...plasterTex, roughness:1 }); // whitewash: the plaster's relief with no colour of its own over it
  const timber = pbr('ink-timber', '#2c1b14', { ...woodTex, roughness:.6, clearcoat:.25, clearcoatRoughness:.4 }), matte = std('ink-rafter', '#2a1b15', { roughness:.9 });
  const rose = pbr('ink-rosewood', '#45251a', { ...woodTex, roughness:.45, clearcoat:.5, clearcoatRoughness:.25 }), roseD = pbr('ink-rosewood-dark', '#2e1812', { ...woodTex, roughness:.5, clearcoat:.4, clearcoatRoughness:.3 });
  const stone = std('ink-stone', '#70767a', { roughness:.95 }), brick = std('ink-brick', '#4e5559', { roughness:.9 }), boards = std('ink-boards', '#a89c86', { roughness:1 });
  // the floor: grey bricks half a metre square, four each way to a sheet
  const tiles = ctex(1024 * K, 1024 * K, (x, w) => { const R = rng(7), n = 4, s = w / n, u = w / 1024;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = `hsl(${195 + R() * 20}, ${4 + R() * 4}%, ${36 + R() * 9}%)`; x.fillRect(i * s, j * s, s, s);
      for (let q = 0; q < 220; q++) { x.globalAlpha = .04 + R() * .07; x.fillStyle = R() < .5 ? '#000' : '#fff'; const r = (1 + R() * 5) * u; x.beginPath(); x.ellipse(i * s + R() * s, j * s + R() * s, r * (1 + R() * 2), r, R() * 3, 0, 6.3); x.fill(); } x.globalAlpha = 1; }
    x.fillStyle = 'rgba(18,20,22,.8)'; for (let i = 0; i <= n; i++) { x.fillRect(i * s - 2 * u, 0, 4 * u, w); x.fillRect(0, i * s - 2 * u, w, 4 * u); } }, false);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 2.8);

  /* ================= lattice ================= */
  // White lines on nothing, drawn in metres: alphaTest cuts the pane out of them, and the material stains them. The sun throws their shadow.
  const PX = 512 * K;
  const lattice = (w, h, draw) => new THREE.MeshStandardMaterial({ name:'ink-lattice', color:col('#33211a'), alphaTest:.4, side:THREE.DoubleSide, roughness:.6,
    map:ctex(Math.round(w * PX), Math.round(h * PX), (x, cw, ch) => { x.clearRect(0, 0, cw, ch); x.save(); x.scale(PX, PX); x.strokeStyle = '#fff'; x.lineCap = 'square'; draw(x, w, h); x.restore(); }, false) });
  const pane = (w, h, draw, p) => mk(new THREE.PlaneGeometry(w, h), lattice(w, h, draw), 'lattice', p);
  // cracked ice: the pane is split by a chord, and each piece again, until the pieces are small. A chord runs from the longest edge of a
  // piece to the edge across from it (the one whose middle stands furthest off the first one's line), so no piece is cut into slivers.
  const ice = seed => (x, w, h) => { const R = rng(seed), todo = [[[0, 0], [w, 0], [w, h], [0, h]]], done = [];
    const area = p => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2, len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (let guard = 0; todo.length && guard < 3000; guard++) { const p = todo.pop(), n = p.length; if (area(p) < .03 * (.6 + R() * .8)) { done.push(p); continue; }
      const mid = q => [(p[q][0] + p[(q + 1) % n][0]) / 2, (p[q][1] + p[(q + 1) % n][1]) / 2];
      let i = 0, L = 0; for (let q = 0; q < n; q++) { const l = len(p[q], p[(q + 1) % n]); if (l > L) { L = l; i = q; } }
      let j = -1, D = -1; const e = p[(i + 1) % n], nx = -(e[1] - p[i][1]) / L, ny = (e[0] - p[i][0]) / L;
      for (let q = 0; q < n; q++) { if (q === i) continue; const m = mid(q), d = Math.abs((m[0] - p[i][0]) * nx + (m[1] - p[i][1]) * ny); if (d > D) { D = d; j = q; } }
      const cut = (q, t) => { const a = p[q], b = p[(q + 1) % n]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }, ci = cut(i, .3 + R() * .4), cj = cut(j, .3 + R() * .4);
      const A = [ci], B = [cj]; for (let q = (i + 1) % n; ; q = (q + 1) % n) { A.push(p[q]); if (q === j) break; } A.push(cj);
      for (let q = (j + 1) % n; ; q = (q + 1) % n) { B.push(p[q]); if (q === i) break; } B.push(ci); todo.push(A, B); }
    x.lineWidth = .02; done.forEach(p => { x.beginPath(); p.forEach(([px, py], q) => q ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.stroke(); });
    x.lineWidth = .04; x.strokeRect(.02, .02, w - .04, h - .04); };

  /* ================= scrolls ================= */
  // Paper between two rods, hung flat on a wall. The sheet is its mount, and inside the mount the picture, which `draw` paints in a box
  // w × h at 520 px to the metre. The lettering is in whatever regular script the machine has; a machine with none sets it in its serif.
  const INK = '#1b1d20', SEAL = '#c2272d', KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif';
  const scrollMat = (W, H, draw) => { const w = Math.round(W * 520), h = Math.round(H * 520), mx = Math.round(w * .09), top = Math.round(h * .1), bot = Math.round(h * .14);
    return std('ink-scroll', '#ffffff', { roughness:.9, map:ctex(Math.round(w * K), Math.round(h * K), x => { x.save(); x.scale(K, K); x.fillStyle = '#d8ceb4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ece4cf'; x.fillRect(mx, top, w - 2 * mx, h - top - bot);
      x.translate(mx, top); x.beginPath(); x.rect(0, 0, w - 2 * mx, h - top - bot); x.clip(); draw(x, w - 2 * mx, h - top - bot); x.restore(); }, false) }); };
  // `p` is the middle of the sheet; it faces +z, turned by `ry`
  const scroll = (W, H, p, ry, draw) => { const g = new THREE.Group(); g.name = 'ink-scroll'; g.position.set(...p); g.rotation.y = ry;
    const paper = mk(new THREE.PlaneGeometry(W, H), scrollMat(W, H, draw), 'scroll-paper', [0, 0, .006]); paper.castShadow = false; g.add(paper);
    g.add(cyl(.008, .008, W + .02, 8, timber, 'scroll-rod', [0, H / 2, .008], [0, 0, Math.PI / 2])); g.add(cyl(.014, .014, W + .07, 10, timber, 'scroll-rod', [0, -H / 2, .014], [0, 0, Math.PI / 2]));
    return lone(room, g); };
  const seal = (x, px, py, s = 15) => { x.globalAlpha = .9; x.fillStyle = SEAL; x.fillRect(px, py, s, s); x.globalAlpha = 1; };
  // three stalks of bamboo, the nearest darkest, each a run of joints; leaves in clusters over them
  const bamboo = (x, w, h) => { const R = rng(5); x.strokeStyle = INK; x.lineCap = 'round';
    [[.3, 5, .9], [.55, 3.5, .55], [.72, 2.5, .35]].forEach(([bx, lw, a], s) => { x.globalAlpha = a; x.lineWidth = lw; const lean = (s - 1) * .05 + .03;
      for (let y = h - 4; y > h * .08;) { const l = 46 + R() * 26; seg(x, bx * w + (h - y) * lean, y, bx * w + (h - y + l) * lean, y - l + 3); y -= l; } });
    x.fillStyle = INK; for (let i = 0; i < 26; i++) { const lx = w * (.2 + R() * .65), ly = h * (.06 + R() * .5), a = -1.2 + R() * 1.6, l = 18 + R() * 20; x.globalAlpha = .45 + R() * .5;
      x.save(); x.translate(lx, ly); x.rotate(a); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(l * .5, -4, l, 0); x.quadraticCurveTo(l * .5, 4, 0, 0); x.fill(); x.restore(); }
    seal(x, w * .76, h * .88); };
  // three ranges, each fading out at its foot, and a hut under a tree on the near bank
  const hills = (x, w, h) => { const R = rng(12);
    [[.34, .1, .3], [.46, .07, .55], [.6, .05, .85]].forEach(([base, amp, a], q) => { x.globalAlpha = a * .7; x.beginPath(); x.moveTo(0, h * (base + .16));
      for (let i = 0; i <= 30; i++) { const u = i / 30; x.lineTo(u * w, h * (base - amp * Math.abs(Math.sin(u * (2.2 + q) + q * 1.7)) - R() * .008)); } x.lineTo(w, h * (base + .16));
      const g = x.createLinearGradient(0, h * (base - amp), 0, h * (base + .16)); g.addColorStop(0, q ? INK : '#55626a'); g.addColorStop(1, 'rgba(236,228,207,0)'); x.fillStyle = g; x.fill(); });
    x.globalAlpha = .85; x.strokeStyle = INK; x.lineWidth = 2; seg(x, w * .2, h * .8, w * .5, h * .79); seg(x, w * .3, h * .8, w * .32, h * .73); x.lineWidth = 6; seg(x, w * .27, h * .735, w * .37, h * .73); seal(x, w * .78, h * .08); };
  // lines of characters set down the sheet, the first on the right
  const writing = lines => (x, w, h) => { const n = Math.max(...lines.map(l => l.length)), fs = Math.min(w / (lines.length + .6), h / (n + 1.2)); x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 ${fs}px ${KAI}`; x.globalAlpha = .88;
    lines.forEach((l, c) => [...l].forEach((ch, r) => x.fillText(ch, w - fs * (.8 + c * 1.05), fs * (.9 + r * 1.02)))); seal(x, fs * .35, h - fs * .9, fs * .4); };

  /* ================= the shell ================= */
  // The moon gate: a circle in the back wall that the floor cuts off, so that its foot is a metre of threshold.
  const GATE = { x:-1.45, y:.92, r:1.05 };
  function shell() { const W = kit.WIN, F = kit.FDOOR, half = r => Math.sqrt(r * r - GATE.y * GATE.y), R2 = GATE.r + .09; // `R2`: the outside of the gate's trim
    // the gate's arc at radius `r`, from the floor on one side over the top to the floor on the other: left to right, or back again
    const arc = (s, r, over) => s.absarc(GATE.x, GATE.y, r, Math.atan2(-GATE.y, over ? -half(r) : half(r)), Math.atan2(-GATE.y, over ? half(r) : -half(r)), over);
    const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('ink-floor', '#ffffff', { map:tiles, roughness:.85 }), 'ink-floor', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; lone(room, floor);
    piece(room, 'ink-shell', g => {
      // three walls, whitewashed; the side walls stop at the back one
      [-3.05, 3.05].forEach(x => g.add(roomUV(box(.1, 2.8, 5.6, plaster, 'wall', [x, 1.4, .2])))); g.add(roomUV(box(6.2, 2.8, .1, plaster, 'wall', [0, 1.4, 3.05])));
      // overhead: boards on rafters on two beams, and a plate round the head of the walls
      g.add(box(6.2, .1, 5.7, boards, 'ceiling', [0, 2.85, .15]));
      [-.7, 1.3].forEach(z => g.add(box(6, .22, .18, timber, 'beam', [0, 2.69, z], null, 0)));
      for (let i = 0; i < 19; i++) g.add(box(.06, .07, 5.5, matte, 'rafter', [-2.85 + i * 5.7 / 18, 2.765, .2], null, 2));
      [-2.96, 2.96].forEach(x => g.add(box(.08, .18, 5.5, timber, 'plate', [x, 2.6, .2], null, 2))); [-2.46, 2.96].forEach(z => g.add(box(6, .18, .08, timber, 'plate', [0, 2.6, z], null, 0)));
      // columns on stone bases: under the beams along the right wall, and in three of the corners (the bookcase fills the fourth)
      [[2.93, -.7], [2.93, 1.3], [2.93, 2.93], [2.93, -2.45], [-2.93, -2.45]].forEach(([x, z]) => { g.add(cyl(.1, .1, 2.7, 20, timber, 'column', [x, 1.4, z])); g.add(cyl(.15, .17, .1, 20, stone, 'plinth', [x, .05, z])); });
      // the back wall, 20 cm thick, with the gate and the window cut out of it. The gate's hole is cut a little wide, so that its edge is
      // inside the trim of grey brick, which stands proud of the wall on both faces, and not on the trim's own inner face
      const cutR = GATE.r + .04, sh = new THREE.Shape(); sh.moveTo(-3.05, 0); sh.lineTo(GATE.x - half(cutR), 0); arc(sh, cutR, true); sh.lineTo(3.05, 0); sh.lineTo(3.05, 2.8); sh.lineTo(-3.05, 2.8); sh.closePath();
      const hole = new THREE.Path(); hole.moveTo(W.x0, W.y0); hole.lineTo(W.x0, W.y1); hole.lineTo(W.x1, W.y1); hole.lineTo(W.x1, W.y0); hole.closePath(); sh.holes.push(hole);
      const wg = new THREE.ExtrudeGeometry(sh, { depth:.2, bevelEnabled:false, curveSegments:64 }); wg.translate(0, 0, -2.7); g.add(mk(wg, plaster, 'wall-back'));
      const ring = new THREE.Shape(); ring.moveTo(GATE.x - half(R2), 0); arc(ring, R2, true); ring.lineTo(GATE.x + half(GATE.r), 0); arc(ring, GATE.r, false); ring.closePath();
      const rg = new THREE.ExtrudeGeometry(ring, { depth:.26, bevelEnabled:false, curveSegments:64 }); rg.translate(0, 0, -2.73); g.add(mk(rg, brick, 'gate-trim'));
      g.add(box(2 * half(GATE.r) + .1, .04, .3, stone, 'threshold', [GATE.x, .005, -2.6]));
      // the window: four leaves, the outer two shut and latticed, the middle two folded away
      const wy = (W.y0 + W.y1) / 2, wh = W.y1 - W.y0, wx = (W.x0 + W.x1) / 2, lw = (W.x1 - W.x0) / 4, wz = -2.6;
      [W.y0, W.y1].forEach(y => g.add(box(W.x1 - W.x0 + .12, .07, .22, timber, 'window-frame', [wx, y, wz], null, 0)));
      for (let i = 0; i <= 4; i++) g.add(box(i % 4 ? .05 : .07, wh, i % 4 ? .08 : .22, timber, 'window-frame', [W.x0 + i * lw, wy, wz], null, 1));
      [0, 3].forEach(i => g.add(pane(lw - .05, wh - .07, ice(11 + i * 7), [W.x0 + (i + .5) * lw, wy, wz])));
      g.add(box(W.x1 - W.x0 + .3, .04, .14, stone, 'sill', [wx, W.y0 - .05, -2.46]));
      // the door into the house: two leaves of plank, a brass boss and a ring on each
      const cx = (F.x0 + F.x1) / 2, fw = F.x1 - F.x0, fh = F.y1, fz = 2.985;
      [F.x0 - .04, F.x1 + .04].forEach(x => g.add(box(.09, fh + .05, .09, timber, 'door-jamb', [x, (fh + .05) / 2, fz])));
      g.add(box(fw + .34, .1, .1, timber, 'door-head', [cx, fh + .05, fz], null, 0)); g.add(box(fw + .17, .06, .1, timber, 'door-sill', [cx, .03, fz], null, 0));
      [-1, 1].forEach(s => { g.add(box(fw / 2 - .004, fh - .06, .035, roseD, 'door-leaf', [cx + s * fw / 4, fh / 2 + .03, fz + .01], null, 1));
        g.add(cyl(.045, .045, .008, 24, M.brass, 'door-boss', [cx + s * .07, 1.05, fz - .012], [Math.PI / 2, 0, 0])); g.add(mk(new THREE.TorusGeometry(.032, .005, 8, 24), M.brass, 'door-ring', [cx + s * .07, 1.02, fz - .02])); }); });
    // bamboo on the pier between the gate and the window; hills and a line of the Analects on the left wall, by the door into the house
    scroll(.3, .98, [-.24, 1.78, -2.497], 0, bamboo); scroll(.34, 1.05, [-2.994, 1.62, 2.5], Math.PI / 2, hills); scroll(.26, .9, [-2.994, 1.62, 1.95], Math.PI / 2, writing(['學而時習之', '不亦說乎']));
    // contact shadows at the foot and the head of the walls: light ones, where the western room's are heavy, for these walls are white
    const foot = half(R2);
    [[-3, GATE.x - foot], [GATE.x + foot, 3]].forEach(([a, b]) => parts.push(decal(aoLin, b - a, .55, [(a + b) / 2, .28, -2.494], [0, 0, Math.PI], .27)));
    parts.push(decal(aoLin, 5.5, .55, [2.995, .28, .25], [0, -Math.PI / 2, Math.PI], .27), decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .27));
    parts.push(decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .22), decal(aoLin, 5.5, .5, [2.995, 2.54, .25], [0, -Math.PI / 2, 0], .22), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .22)); }

  /* ================= 書格: the bookcase as open stands ================= */
  // The boards are where the western bookcase has them. What holds them is a post at the front and the back of each bay's ends, with
  // nothing behind the books or beside them, so the white wall shows through. Under the lowest board an apron runs from post to post.
  function bookcase() { const { shelf, LV, bays, SZ0, SZ1, BZ } = kit;
    piece(shelf, 'ink-bookcase', g => {
      LV.forEach((y, i) => { const z0 = i === LV.length - 1 ? SZ0 : BZ; g.add(box(.4, .035, SZ1 - z0, rose, 'shelf-board', [-2.81, y, (z0 + SZ1) / 2])); }); // only the top board runs the whole length, over the display shelves too
      bays.slice(1).forEach(z => [-2.635, -2.985].forEach(x => g.add(box(.045, 2.57, .045, rose, 'post', [x, 1.285, z], null, 1))));
      for (let i = 1; i < bays.length - 1; i++) { const a = bays[i], b = bays[i + 1];
        g.add(box(.016, .045, b - a - .045, rose, 'apron', [-2.632, .06, (a + b) / 2], null, 2));
        [a + .07, b - .07].forEach(z => g.add(box(.016, .08, .1, rose, 'apron-head', [-2.632, .043, z], null, 2))); } }); }

  shell(); bookcase();
  // the moon gate, in the plane of the back wall: the duck out on the jetty answers only through it
  return { parts, opening:(x, y) => y > 0 && Math.hypot(x - GATE.x, y - GATE.y) < GATE.r - .04 };
}
