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
  // The saying is in a running hand, Zhi Mang Xing, fetched for its four characters only so that every machine shows the same; until it
  // has come, or if it never does, in the machine's own running hand or regular script.
  const INK = '#1b1d20', SEAL = '#c2272d', KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif', XING = '"Zhi Mang Xing", "Xingkai TC", "Xingkai SC", "STXingkai", ' + KAI;
  const HAND = 'https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap&text=' + encodeURIComponent('上善若水');
  const scrollMat = (W, H, draw) => { const w = Math.round(W * 520), h = Math.round(H * 520), mx = Math.round(w * .09), top = Math.round(h * .1), bot = Math.round(h * .14);
    return std('ink-scroll', '#ffffff', { roughness:.9, map:ctex(Math.round(w * K), Math.round(h * K), x => { x.save(); x.scale(K, K); x.fillStyle = '#d8ceb4'; x.fillRect(0, 0, w, h); x.fillStyle = '#ece4cf'; x.fillRect(mx, top, w - 2 * mx, h - top - bot);
      x.translate(mx, top); x.beginPath(); x.rect(0, 0, w - 2 * mx, h - top - bot); x.clip(); draw(x, w - 2 * mx, h - top - bot); x.restore(); }, false) }); };
  // `p` is the middle of the sheet; it faces +z, turned by `ry`
  const scroll = (W, H, p, ry, draw) => { const g = new THREE.Group(); g.name = 'ink-scroll'; g.position.set(...p); g.rotation.y = ry;
    const paper = mk(new THREE.PlaneGeometry(W, H), scrollMat(W, H, draw), 'scroll-paper', [0, 0, .006]); paper.castShadow = false; g.add(paper);
    g.add(cyl(.008, .008, W + .02, 8, timber, 'scroll-rod', [0, H / 2, .008], [0, 0, Math.PI / 2])); g.add(cyl(.014, .014, W + .07, 10, timber, 'scroll-rod', [0, -H / 2, .014], [0, 0, Math.PI / 2]));
    return lone(room, g); };
  const seal = (x, px, py, s = 15) => { x.globalAlpha = .9; x.fillStyle = SEAL; x.fillRect(px, py, s, s); x.globalAlpha = 1; };
  // a saying in large characters down the middle of the sheet, and a seal under them to the left
  const motto = text => (x, w, h) => { const cs = [...text], fs = Math.min(w * .72, (h - 44) / (cs.length * 1.05)); x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `400 ${fs}px ${XING}`; x.globalAlpha = .9;
    cs.forEach((ch, r) => x.fillText(ch, w / 2, fs * (.62 + r * 1.05))); x.globalAlpha = 1; seal(x, w * .16, h - 34, 20); };
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
      // columns on stone bases, all along the right wall: under the two beams, and in its corners. The left wall has none: the curio stand
      // fills its back corner, and the door into the house its front one
      [[2.93, -.7], [2.93, 1.3], [2.93, 2.93], [2.93, -2.45]].forEach(([x, z]) => { g.add(cyl(.1, .1, 2.7, 20, timber, 'column', [x, 1.4, z])); g.add(cyl(.15, .17, .1, 20, stone, 'plinth', [x, .05, z])); });
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
    // 上善若水 on the pier between the gate and the window, hung high enough for its lower rod to clear the gate's trim, which widens
    // downwards; hills and a line of the Analects on the left wall, by the door into the house
    const saying = scroll(.3, .98, [-.2, 1.89, -2.497], 0, motto('上善若水')); scroll(.34, 1.05, [-2.994, 1.62, 2.5], Math.PI / 2, hills); scroll(.26, .9, [-2.994, 1.62, 1.95], Math.PI / 2, writing(['學而時習之', '不亦說乎']));
    if (!document.querySelector(`link[href="${HAND}"]`)) { const l = Object.assign(document.createElement('link'), { rel:'stylesheet', href:HAND });
      l.addEventListener('load', () => document.fonts.load('80px "Zhi Mang Xing"', '上善若水').then(() => saying.getObjectByName('scroll-paper').material.map.redraw(), () => {}), { once:true }); document.head.append(l); }
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
        [a + .07, b - .07].forEach(z => g.add(box(.012, .08, .1, rose, 'apron-head', [-2.632, .043, z], null, 2))); } }); } // thinner than the apron, so that the two share no face

  /* ================= 博古架: the display shelves as a stand of unequal compartments, over a cupboard ================= */
  // Laid out in the display shelves' own frame: x across the bay, z out from the wall. The four boards are where the western shelves have
  // them. Three of the levels are broken by an upright, each at a different place and none where an exhibit stands, and the one
  // compartment that holds nothing has a step in it, and a vase.
  function curio() { const { disp, DL, DW, DD } = kit, hx = DW / 2 - .0225, d = DD - .03, head = 2.5325; // `head`: the underside of the bookcase's top board, which runs on over this bay
    const celadon = pbr('ink-celadon', '#a9c4b4', { roughness:.18, clearcoat:1, clearcoatRoughness:.1 });
    piece(disp, 'ink-curio', g => {
      DL.forEach(y => g.add(box(DW, .035, DD, rose, 'display-shelf', [0, y, DD / 2])));
      [-hx, hx].forEach(x => [.0225, DD - .0225].forEach(z => g.add(box(.045, 2.57, .045, rose, 'post', [x, 1.285, z], null, 1))));
      [[3, .14], [2, 0], [0, -.05]].forEach(([i, x]) => { const y0 = DL[i] + .0175, y1 = i < 3 ? DL[i + 1] - .0175 : head; g.add(box(.022, y1 - y0, d, rose, 'upright', [x, (y0 + y1) / 2, DD / 2], null, 1)); });
      g.add(box(.345, .022, d, rose, 'step', [.47, 1.03, DD / 2], null, 0)); g.add(box(.022, .22, d, rose, 'upright', [.3, .928, DD / 2], null, 1));
      // the cupboard: two doors that meet on a bar, a round brass plate over the join with a pull either side, and an apron between its feet
      g.add(box(DW - .05, .62, DD - .02, rose, 'cupboard', [0, .47, DD / 2]));
      [-1, 1].forEach(s => g.add(box(DW / 2 - .075, .54, .012, roseD, 'cupboard-door', [s * (DW / 4 - .008), .47, DD - .004], null, 1)));
      g.add(box(.03, .56, .016, rose, 'cupboard-bar', [0, .47, DD - .002], null, 1));
      g.add(cyl(.055, .055, .004, 28, M.brass, 'cupboard-plate', [0, .5, DD + .008], [Math.PI / 2, 0, 0])); [-.02, .02].forEach(x => g.add(box(.008, .055, .004, M.brass, 'cupboard-pull', [x, .47, DD + .012])));
      g.add(box(DW - .09, .05, .016, rose, 'apron', [0, .135, DD - .03], null, 0));
      const profile = [[0, 0], [.034, 0], [.038, .015], [.058, .1], [.06, .135], [.046, .165], [.02, .182], [.019, .198], [.027, .205]].map(([r, y]) => new THREE.Vector2(r, y));
      g.add(mk(new THREE.LatheGeometry(profile, 32), celadon, 'vase', [.12, DL[0] + .0175, .2])); }); }

  /* ================= 畫案: the desk as a painting table, and what stands on it that is this room's own ================= */
  // The top is the western desk's, to the centimetre. Under it: legs set in from the ends, a long apron front and back with a spandrel at
  // each leg, and two stretchers between the legs at each end. No drawer.
  function table() { const { desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD } = kit, top = DY - .025, lx = .8, lz = .4;
    const clay = std('ink-clay', '#5b3a2e', { roughness:.7 }), cane = std('ink-bamboo', '#a98b55', { roughness:.6 }), soot = pbr('ink-inkstone', '#1c1e20', { roughness:.5, clearcoat:.3 }), wet = pbr('ink-wet-ink', '#060708', { roughness:.08, clearcoat:1 });
    piece(desk, 'ink-table', g => {
      g.add(box(2.15, .05, .95, rose, 'desk-top', [DX, DY, DZ]));
      [-1, 1].forEach(sx => { [-1, 1].forEach(sz => { g.add(box(.055, top, .055, rose, 'table-leg', [DX + sx * lx, top / 2, DZ + sz * lz], null, 1));
          g.add(box(.16, .11, .012, rose, 'table-spandrel', [DX + sx * lx, top - .075, DZ + sz * (lz + .02)], null, 0)); }); // thinner than the apron it stands behind: no shared face
        [.3, .46].forEach(y => g.add(box(.03, .03, 2 * lz, rose, 'table-stretcher', [DX + sx * lx, y, DZ], null, 2))); });
      [-1, 1].forEach(sz => g.add(box(2.05, .05, .016, rose, 'table-apron', [DX, top - .03, DZ + sz * (lz + .02)], null, 0)));
      // an inkstone with ink in its well, and a brush laid on a rest shaped like three peaks
      g.add(box(.12, .022, .17, soot, 'inkstone', [2.12, DY + .036, -1.7])); g.add(cyl(.038, .038, .003, 24, wet, 'ink', [2.12, DY + .0485, -1.72]));
      g.add(box(.11, .022, .022, clay, 'brush-rest', [2.34, DY + .036, -1.66])); [-.035, 0, .035].forEach((dx, i) => g.add(mk(new THREE.ConeGeometry(.014, i === 1 ? .04 : .028, 12), clay, 'brush-rest', [2.34 + dx, DY + .047 + (i === 1 ? .018 : .012), -1.66])));
      g.add(rod([2.2, DY + .034, -1.6], [2.36, DY + .066, -1.67], .0045, cane, 'brush')); g.add(rod([2.36, DY + .066, -1.67], [2.39, DY + .072, -1.683], .0055, soot, 'brush-tip')); });
    // the box the series stand in: the western rack's shape, in rosewood
    piece(rack, 'ink-book-box', g => { g.add(box(RKW, .018, RKD, rose, 'rack-base', [0, .009, 0])); g.add(box(RKW - .036, .12, .014, rose, 'rack-back', [0, .078, -RKD / 2 + .007]));
      [-1, 1].forEach(s => g.add(box(.018, .19, RKD, rose, 'rack-end', [s * (RKW / 2 - .009), .113, 0]))); });
    // The lamp: a paper lantern of six sides hung from the arm of a stand. The lantern is where the western lamp's shade is, for the
    // light and its glow are the stage's and stay put.
    const paper = new THREE.MeshStandardMaterial({ name:'ink-lamp-paper', color:col('#f3e2bd'), emissive:col('#ffb15a'), emissiveIntensity:.6, roughness:.9 });
    piece(desk, 'ink-lamp', g => { g.position.set(2.56, DY + .025, -2.33);
      g.add(box(.11, .022, .11, rose, 'lamp-base', [0, .011, 0])); g.add(box(.022, .62, .022, rose, 'lamp-stem', [0, .32, 0], null, 1)); g.add(rod([0, .62, 0], [-.18, .625, .068], .009, rose, 'lamp-arm'));
      g.add(rod([-.16, .62, .06], [-.16, .585, .06], .003, soot, 'lamp-cord')); g.add(cyl(.055, .055, .14, 6, paper, 'lamp-paper', [-.16, .51, .06]));
      [.585, .435].forEach(y => g.add(cyl(.06, .06, .012, 6, roseD, 'lamp-cap', [-.16, y, .06]))); g.add(cyl(.005, .003, .06, 8, std('ink-tassel', '#c2272d', { roughness:.8 }), 'lamp-tassel', [-.16, .4, .06])); });
    // an orchid in a clay pot, where the snake plant stands: long narrow leaves that rise and fall over, and one stalk in flower
    piece(desk, 'ink-orchid', g => { g.position.set(.705, DY + .025, -2.2); const R = rng(31), leaf = std('ink-orchid-leaf', '#3f6e3c', { roughness:.55, side:THREE.DoubleSide });
      g.add(cyl(.052, .04, .07, 6, clay, 'pot', [0, .035, 0])); g.add(cyl(.046, .046, .004, 12, std('ink-soil', '#2a1d14', { roughness:1 }), 'soil', [0, .068, 0]));
      for (let i = 0; i < 11; i++) { const H = .2 + R() * .16, Wd = .011 + R() * .006, a = i * 2.4 + R() * .5, bow = .35 + R() * .5, geo = new THREE.PlaneGeometry(1, 1, 1, 10), p = geo.attributes.position;
        for (let q = 0; q < p.count; q++) { const u = p.getX(q), v = p.getY(q) + .5; p.setXYZ(q, u * Wd * Math.sin(Math.PI * (.12 + v * .86)), H * (v - bow * .55 * v * v), bow * H * v * v * .9 + .006); }
        geo.computeVertexNormals(); geo.rotateY(a); g.add(mk(geo, leaf, 'orchid-leaf', [0, .068, 0])); }
      g.add(rod([0, .068, 0], [.03, .3, .02], .0025, std('ink-orchid-stalk', '#6b7d3e'), 'orchid-stalk')); const bloom = std('ink-orchid-bloom', '#efe7c9', { roughness:.6 }); [[.012, .2, .012], [.022, .25, .02], [.032, .3, .018]].forEach(p => g.add(mk(new THREE.SphereGeometry(.011, 10, 8), bloom, 'orchid-bloom', p))); });
    // the portrait, out of its brass edges and into a table screen: a wooden frame round the panel, and two feet on a rail
    piece(pf, 'ink-screen-frame', g => { [-.108, .108].forEach(x => g.add(box(.024, .274, .026, rose, 'screen-frame', [x, 0, .001], null, 1))); [-.134, .134].forEach(y => g.add(box(.24, .024, .026, rose, 'screen-frame', [0, y, .001], null, 0))); });
    piece(portrait, 'ink-screen-stand', g => { [-.1, .1].forEach(x => g.add(box(.028, .05, .12, rose, 'screen-foot', [x, .025, -.02], null, 2))); g.add(box(.2, .02, .03, rose, 'screen-rail', [0, .02, -.012], null, 0)); }); }

  /* ================= the stand under the TV ================= */
  // Four legs and three boards, the boards where the western cabinet has its top, its shelf and its bottom: the TV, the console and the
  // cartridges stay where they are. Open at the back; a low rail round three sides of the middle board.
  function stand() { const { tvc, CW, CH, CD } = kit, hx = CW / 2 - .02, hz = CD / 2 - .02, top = CH + .005, under = top - .015; // the top board's middle, where the western cabinet's is, and its underside
    piece(tvc, 'ink-stand', g => {
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.04, under, .04, rose, 'stand-leg', [sx * hx, under / 2, sz * hz], null, 1))));
      g.add(box(CW + .02, .03, CD + .02, rose, 'stand-top', [0, top, 0])); g.add(box(CW - .05, .018, CD - .03, rose, 'stand-shelf', [0, .4, -.01])); g.add(box(CW - .01, .025, CD - .01, rose, 'stand-shelf', [0, .0625, 0]));
      [-1, 1].forEach(s => { g.add(box(CW - .08, .04, .014, rose, 'stand-apron', [0, under - .02, s * hz], null, 0)); g.add(box(.014, .04, CD - .08, rose, 'stand-apron', [s * hx, under - .02, 0], null, 2));
        g.add(box(.014, .03, CD - .08, rose, 'stand-rail', [s * hx, .47, 0], null, 2)); });
      g.add(box(CW - .08, .03, .014, rose, 'stand-rail', [0, .47, -hz], null, 0)); }); }

  /* ================= 圈椅 and 方几: the armchair and the side table ================= */
  // The chair keeps the armchair's cushion, and the dog asleep on it. Round it: a seat frame, front legs that run up to the ends of the
  // arms and back legs that run up to the rail, the rail itself in one horseshoe from arm to arm over the back, a splat, a spindle under
  // each arm, and stretchers low down. The table keeps its top's height: a waist under the top, four legs, a stretcher on each side.
  function seats() { const { chair, side } = kit;
    piece(chair, 'ink-chair', g => {
      g.add(box(.7, .05, .66, rose, 'chair-seat', [0, .39, 0]));
      [-1, 1].forEach(s => { g.add(cyl(.022, .022, .72, 12, rose, 'chair-leg', [s * .31, .36, .29])); g.add(cyl(.022, .022, .9, 12, rose, 'chair-leg', [s * .29, .45, -.29]));
        g.add(rod([s * .33, .415, 0], [s * .352, .775, .02], .012, rose, 'chair-spindle')); g.add(box(.028, .025, .58, rose, 'chair-stretcher', [s * .3, .15, 0], null, 2)); g.add(box(.012, .05, .52, rose, 'chair-apron', [s * .31, .34, 0], null, 2)); });
      const rail = [[-.37, .7, .37], [-.345, .715, .28], [-.355, .76, .05], [-.29, .9, -.27], [0, .97, -.345], [.29, .9, -.27], [.355, .76, .05], [.345, .715, .28], [.37, .7, .37]].map(p => new THREE.Vector3(...p));
      g.add(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 48, .019, 10), rose, 'chair-rail'));
      g.add(box(.15, .56, .014, rose, 'chair-splat', [0, .69, -.325], [-.055, 0, 0], 1));
      g.add(box(.62, .03, .035, rose, 'chair-stretcher', [0, .1, .29], null, 0)); g.add(box(.58, .025, .028, rose, 'chair-stretcher', [0, .1, -.29], null, 0)); g.add(box(.56, .05, .012, rose, 'chair-apron', [0, .34, .3], null, 0)); });
    piece(side, 'ink-side-table', g => {
      g.add(box(.52, .04, .52, rose, 'table-top', [0, .6, 0])); g.add(box(.45, .03, .45, roseD, 'table-waist', [0, .565, 0]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.04, .58, .04, rose, 'table-leg', [sx * .23, .29, sz * .23], null, 1))));
      [-1, 1].forEach(s => { g.add(box(.42, .025, .025, rose, 'table-stretcher', [0, .2, s * .23], null, 0)); g.add(box(.025, .025, .42, rose, 'table-stretcher', [s * .23, .2, 0], null, 2)); }); }); }

  shell(); bookcase(); curio(); table(); stand(); seats();
  // the moon gate, in the plane of the back wall: the duck out on the jetty answers only through it
  return { parts, opening:(x, y) => y > 0 && Math.hypot(x - GATE.x, y - GATE.y) < GATE.r - .04 };
}
