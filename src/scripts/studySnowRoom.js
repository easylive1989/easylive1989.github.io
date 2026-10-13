// The Japanese room that goes with the lake under snow: tatami, earthen walls between cedar posts, paper screens along the water, and
// furniture for sitting on the floor. Nothing here is built until that world is first wanted (study.js, WORLDS). The bookcase, the
// display shelves and the TV's stand keep every surface where the western room has it. The desk, the chair and the side table do not:
// each of those groups sinks, with all that is on it, while this room is on show (`sink`), and their frames are built for where they
// will be then: the table's legs are only as long as from its top to the floor it comes down to.
export default function buildSnowRoom(kit) {
  const { THREE, Q, M, col, rng, mk, box, cyl, rod, std, pbr, ctex, roomUV, weld, woodTex, plasterTex, decal, aoLin, room } = kit;
  const parts = [], sink = {}; let lamp; // `sink`: how far each sunk group goes down; `lamp`: where the light is, in the desk's own frame
  const DROP = { desk:.44, chair:.375, side:.32 };
  // one piece of the room: built into a group of its own under `parent`, so that it shares the coordinates of whatever stands on it
  // there, then drawn as one mesh per material
  const piece = (parent, name, fill) => { const g = new THREE.Group(); g.name = name; parent.add(g); fill(g); weld(g); parts.push(g); return g; };
  const lone = (parent, o) => { parent.add(o); parts.push(o); return o; }; // what has to stay a mesh, or a group, of its own
  const K = Q.low ? .5 : 1; // the low tier paints this room's own sheets at half size

  /* ================= materials ================= */
  const juraku = std('snow-juraku', '#cbbd95', { ...plasterTex, roughness:1 }); // earthen plaster: the walls' relief, sand-coloured
  const hinoki = pbr('snow-hinoki', '#caa878', { ...woodTex, roughness:.55, clearcoat:.2, clearcoatRoughness:.4 }), sugi = pbr('snow-sugi', '#9c7a52', { ...woodTex, roughness:.7 });
  const kiri = pbr('snow-kiri', '#d8c095', { ...woodTex, roughness:.6, clearcoat:.15, clearcoatRoughness:.5 }), keyaki = pbr('snow-keyaki', '#a56e3e', { ...woodTex, roughness:.4, clearcoat:.55, clearcoatRoughness:.22 }), dark = pbr('snow-dark', '#5f4a33', { ...woodTex, roughness:.5, clearcoat:.3 });
  const paper = std('snow-paper', '#e9e2cf', { roughness:.95 });

  /* ================= the shell ================= */
  // The lintel the screens hang from, the plane of the back wall, and its two bays. Each bay has four screens on two tracks, the middle
  // two slid back behind the outer two, so half of it stands open.
  const KAMOI = 2.05, Z = -2.55, BAYS = [[-2.88, -.1], [.02, 2.88]], PH = KAMOI - .02;
  function shell() { const F = kit.FDOOR;
    // tatami. One sheet is 2 m × 2 m: a mat across the top, and below it the halves of the two mats of the next row, set off by half a mat
    const tatami = ctex(1024 * K, 1024 * K, (x, w) => { const R = rng(3), m = w / 2, u = w / 1024;
      for (let r = 0; r < 2; r++) { const y0 = r * m; x.fillStyle = r ? '#b9b382' : '#bdb686'; x.fillRect(0, y0, w, m);
        for (let i = 0; i < 520; i++) { x.globalAlpha = .05 + R() * .08; x.fillStyle = R() < .5 ? '#6f6a3e' : '#e2dcae'; x.fillRect(0, y0 + R() * m, w, u); } // rush, woven along the mat
        for (let i = 0; i < 1400; i++) { x.globalAlpha = .04 + R() * .06; x.fillStyle = '#5c5a34'; x.fillRect(R() * w, y0 + R() * m, u, (2 + R() * 3) * u); } x.globalAlpha = 1;
        x.fillStyle = '#2b3327'; x.fillRect(0, y0, w, 14 * u); x.fillRect(0, y0 + m - 14 * u, w, 14 * u); // the cloth borders down the long sides
        x.fillStyle = 'rgba(30,30,20,.55)'; x.fillRect((r ? m : 0) - 1.5 * u, y0 + 14 * u, 3 * u, m - 28 * u); if (!r) x.fillRect(w - 1.5 * u, y0 + 14 * u, 3 * u, m - 28 * u); } }, false);
    tatami.wrapS = tatami.wrapT = THREE.RepeatWrapping; tatami.repeat.set(3, 2.8);
    const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('snow-tatami', '#ffffff', { map:tatami, roughness:.95 }), 'snow-tatami', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; lone(room, floor);
    // a paper screen, drawn at 256 px to the metre: a frame, a grid of thin bars three across and eight down, a board along the foot.
    // The paper glows with the day behind it.
    const PW = .7, shojiTex = ctex(Math.round(PW * 256 * K), Math.round(PH * 256 * K), (x, cw, ch) => { x.save(); x.scale(K, K); const w = cw / K, h = ch / K, f = 9, wood = '#5f4a33', kh = .32 * 256;
      x.fillStyle = '#f5f0e3'; x.fillRect(0, 0, w, h); x.fillStyle = wood; x.fillRect(0, 0, w, f); x.fillRect(0, h - f, w, f); x.fillRect(0, 0, f, h); x.fillRect(w - f, 0, f, h);
      x.fillStyle = '#7a6142'; x.fillRect(f, h - f - kh, w - 2 * f, kh); x.fillStyle = wood; x.fillRect(f, h - f - kh - 4, w - 2 * f, 4);
      const top = f, bot = h - f - kh - 4; for (let i = 1; i < 3; i++) x.fillRect(f + (w - 2 * f) * i / 3 - 1.5, top, 3, bot - top); for (let j = 1; j < 8; j++) x.fillRect(f, top + (bot - top) * j / 8 - 1.5, w - 2 * f, 3); x.restore(); }, false);
    const shoji = new THREE.MeshStandardMaterial({ name:'snow-shoji', map:shojiTex, emissive:col('#fff1d6'), emissiveMap:shojiTex, emissiveIntensity:.55, roughness:.9 });
    const ceilM = pbr('snow-ceiling', '#bfa074', { ...woodTex, roughness:.85 }), deckM = pbr('snow-engawa', '#a67c4c', { ...woodTex, roughness:.4, clearcoat:.5, clearcoatRoughness:.25 });
    piece(room, 'snow-shell', g => {
      // three walls of earthen plaster; the side walls stop at the back one
      [-3.05, 3.05].forEach(x => g.add(roomUV(box(.1, 2.8, 5.6, juraku, 'wall', [x, 1.4, .2])))); g.add(roomUV(box(6.2, 2.8, .1, juraku, 'wall', [0, 1.4, 3.05])));
      // overhead: boards on thin battens, and a cornice round the walls
      g.add(box(6.2, .1, 5.7, ceilM, 'ceiling', [0, 2.85, .15])); for (let i = 0; i < 12; i++) g.add(box(6, .03, .035, sugi, 'batten', [0, 2.785, -2.3 + i * .47], null, 0));
      [-2.95, 2.95].forEach(x => g.add(box(.05, .06, 5.5, sugi, 'cornice', [x, 2.77, .2], null, 2))); [-2.47, 2.95].forEach(z => g.add(box(6, .06, .05, sugi, 'cornice', [0, 2.77, z], null, 0)));
      // posts: at the ends and the middle of the back wall, twice along the right wall, and in the two front corners; and the rail that
      // runs round the room at the head of the screens
      [[-2.94, Z], [-.04, Z], [2.94, Z], [2.94, -.7], [2.94, 1.3], [2.94, 2.94], [-2.94, 2.94]].forEach(([x, z]) => g.add(box(.12, 2.8, .12, hinoki, 'post', [x, 1.4, z], null, 1)));
      [-2.975, 2.975].forEach(x => g.add(box(.03, .09, 5.5, hinoki, 'nageshi', [x, KAMOI + .045, .2], null, 2))); g.add(box(6, .09, .03, hinoki, 'nageshi', [0, KAMOI + .045, 2.975], null, 0));
      // the back: a lintel, plaster above it, a sill; and the screens
      g.add(box(6.1, .1, .14, hinoki, 'kamoi', [0, KAMOI + .05, Z], null, 0)); g.add(roomUV(box(6.1, 2.8 - KAMOI - .1, .1, juraku, 'wall', [0, (2.8 + KAMOI + .1) / 2, Z]))); g.add(box(6.1, .03, .14, hinoki, 'shikii', [0, .002, Z], null, 0));
      BAYS.forEach(([a, b]) => { const pw = (b - a) / 4; [[0, 0], [0, .035], [3, .035], [3, 0]].forEach(([slot, dz]) => g.add(mk(new THREE.BoxGeometry(pw - .004, PH, .026), shoji, 'shoji', [a + (slot + .5) * pw, PH / 2 + .01, Z - .02 + dz]))); });
      // the veranda along the water, 2 cm proud of the jetty, which goes on from it
      g.add(box(6.1, .04, .58, deckM, 'engawa', [0, -.02, -2.91], null, 0));
      // the door into the house: two paper doors on the front wall, a frame round each and a round pull
      const fx = F.x0 - .02, fw = .86, fh = KAMOI - .02; [0, 1].forEach(i => { const cx = fx + (i + .5) * fw, cz = 2.98 - i * .012; g.add(box(fw, fh, .03, paper, 'fusuma', [cx, fh / 2 + .01, cz]));
        [[-fw / 2 + .012, 0, .024, fh], [fw / 2 - .012, 0, .024, fh], [0, fh / 2 - .012, fw, .024], [0, -fh / 2 + .012, fw, .024]].forEach(([dx, dy, bw, bh]) => g.add(box(bw, bh, .034, sugi, 'fusuma-frame', [cx + dx, fh / 2 + .01 + dy, cz - .002])));
        g.add(cyl(.028, .028, .012, 20, M.brass, 'fusuma-pull', [fx + (i ? .14 : fw - .14) + i * fw, .92, cz - .02], [Math.PI / 2, 0, 0])); }); });
    // a hanging scroll on the left wall, by the paper doors: a line of Zen in whatever regular script the machine has
    { const W = .34, H = 1.2, cw = Math.round(W * 520), ch = Math.round(H * 520), KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif';
      const tex = ctex(Math.round(cw * K), Math.round(ch * K), x => { x.save(); x.scale(K, K); x.fillStyle = '#7f8b7c'; x.fillRect(0, 0, cw, ch); x.fillStyle = '#b9b08f'; x.fillRect(cw * .1, ch * .13, cw * .8, ch * .7); x.fillStyle = '#efe8d6'; x.fillRect(cw * .17, ch * .17, cw * .66, ch * .62);
        x.fillStyle = '#1b1d20'; x.textAlign = 'center'; x.textBaseline = 'middle'; const fs = ch * .62 / 5.6; x.font = `600 ${fs}px ${KAI}`; [...'日々是好日'].forEach((c, i) => x.fillText(c, cw / 2, ch * .17 + fs * (.8 + i * 1.02)));
        x.fillStyle = '#c2272d'; x.fillRect(cw * .2, ch * .79 - fs * .55, fs * .38, fs * .38); x.restore(); }, false);
      const g = new THREE.Group(); g.name = 'snow-kakejiku'; g.position.set(-2.994, 1.42, 2.3); g.rotation.y = Math.PI / 2;
      const sheet = mk(new THREE.PlaneGeometry(W, H), std('snow-kakejiku', '#ffffff', { map:tex, roughness:.9 }), 'kakejiku', [0, 0, .006]); sheet.castShadow = false; g.add(sheet);
      g.add(cyl(.007, .007, W + .02, 8, dark, 'kakejiku-rod', [0, H / 2, .008], [0, 0, Math.PI / 2])); g.add(cyl(.013, .013, W + .06, 10, dark, 'kakejiku-rod', [0, -H / 2, .013], [0, 0, Math.PI / 2])); lone(room, g); }
    // contact shadows at the foot and the head of the walls, as light as the Chinese study's (the back has no wall to its foot)
    parts.push(decal(aoLin, 5.5, .55, [2.995, .28, .25], [0, -Math.PI / 2, Math.PI], .27), decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .27));
    parts.push(decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .22), decal(aoLin, 5.5, .5, [2.995, 2.54, .25], [0, -Math.PI / 2, 0], .22), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .22)); }

  /* ================= 本棚: the bookcase ================= */
  // Boards where the western bookcase has them, between solid ends, with a thin back. Its top board stops with the books: the bay in the
  // corner is an alcove here, with a head of its own.
  function bookcase() { const { shelf, LV, bays, SZ1, BZ } = kit;
    piece(shelf, 'snow-bookcase', g => { LV.forEach(y => g.add(box(.4, .035, SZ1 - BZ, kiri, 'shelf-board', [-2.81, y, (BZ + SZ1) / 2])));
      bays.slice(1).forEach(z => g.add(box(.4, 2.58, .03, kiri, 'shelf-end', [-2.81, 1.29, z], null, 1))); g.add(box(.014, 2.5, SZ1 - BZ, sugi, 'shelf-back', [-2.99, 1.33, (BZ + SZ1) / 2], null, 1)); }); }

  /* ================= 床脇: the display shelves as an alcove ================= */
  // Laid out in the display shelves' own frame: x across the bay (the room's back wall is at +x, the bookcase at −x), z out from the wall.
  // A low cupboard with paper doors, its top the first of the four levels; a board right across for the second; then two boards set off
  // against each other and tied by a strut, the upper one with a lip at its free end. Each board is under everything that stands at its
  // level. A post of polished log on the bookcase's side, a sleeve of wall on the other, a beam across the head.
  function alcove() { const { disp, DL, DW, DD } = kit, hw = DW / 2, zc = DD / 2 - .02, d = DD - .04;
    piece(disp, 'snow-alcove', g => {
      [DL[0], DL[1]].forEach(y => g.add(box(DW, .035, DD, kiri, 'display-shelf', [0, y, DD / 2])));
      g.add(box(hw + .5, .03, d, keyaki, 'display-shelf', [(-hw + .5) / 2, DL[2] + .0025, zc])); g.add(box(hw + .42, .03, d, keyaki, 'display-shelf', [(hw - .42) / 2, DL[3] + .0025, zc]));
      g.add(box(.025, DL[3] - DL[2] - .03, .025, keyaki, 'strut', [.485, (DL[2] + DL[3]) / 2 + .0025, zc], null, 1)); g.add(box(.02, .03, d, keyaki, 'lip', [-.41, DL[3] + .0325, zc], null, 2));
      g.add(box(DW, .76, DD - .03, kiri, 'cupboard', [0, .4, (DD - .03) / 2]));
      [-1, 1].forEach(sd => { const cx = sd * DW / 4, w = DW / 2 - .03; g.add(box(w, .62, .012, paper, 'cupboard-door', [cx, .4, DD - .022]));
        [[0, .31, w, .02], [0, -.31, w, .02], [-w / 2 + .01, 0, .02, .62], [w / 2 - .01, 0, .02, .62]].forEach(([dx, dy, bw, bh]) => g.add(box(bw, bh, .018, dark, 'cupboard-frame', [cx + dx, .4 + dy, DD - .02])));
        g.add(cyl(.018, .018, .008, 16, dark, 'cupboard-pull', [cx - sd * (w / 2 - .07), .4, DD - .012], [Math.PI / 2, 0, 0])); });
      g.add(box(.04, 2.6, DD, juraku, 'sleeve', [hw + .02, 1.3, DD / 2])); g.add(cyl(.055, .055, 2.62, 18, keyaki, 'tokobashira', [-hw - .03, 1.31, DD - .05])); g.add(box(DW + .1, .07, .05, kiri, 'head', [0, 2.52, DD - .03], null, 0)); }); }

  /* ================= 座卓: the desk as a low table, and what stands on it that is this room's own ================= */
  // The top is the western desk's. Its group sinks until that top is a floor-sitter's height, so the legs are only as long as from the
  // top to the floor it comes down to, and everything here is set out in the group's frame as it is before it sinks.
  function table() { const { desk, rack, portrait, pf, DX, DY, DZ, RKW, RKD } = kit, top = DY - .025, leg = top - DROP.desk;
    sink.desk = DROP.desk; lamp = [2.56, DY + .175, -2.33]; // the light is in the andon's paper
    piece(desk, 'snow-table', g => { g.add(box(2.15, .05, .95, keyaki, 'desk-top', [DX, DY, DZ]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.09, leg, .09, keyaki, 'table-leg', [DX + sx * .94, DROP.desk + leg / 2, DZ + sz * .37], null, 1))));
      [-1, 1].forEach(sz => g.add(box(1.8, .05, .025, keyaki, 'table-apron', [DX, top - .035, DZ + sz * .37], null, 0))); [-1, 1].forEach(sx => g.add(box(.025, .05, .66, keyaki, 'table-apron', [DX + sx * .94, top - .035, DZ], null, 2)));
      // a cup of tea on its saucer, where the pen lay
      g.add(cyl(.055, .048, .008, 20, dark, 'saucer', [2.15, DY + .029, -1.72])); g.add(cyl(.036, .03, .07, 20, pbr('snow-cup', '#e4e0d2', { roughness:.25, clearcoat:.8 }), 'cup', [2.15, DY + .068, -1.72])); g.add(cyl(.031, .031, .002, 20, std('snow-tea', '#8a9440', { roughness:.2 }), 'tea', [2.15, DY + .1, -1.72])); });
    // the stand the series are in: the western rack's shape, in paulownia
    piece(rack, 'snow-book-stand', g => { g.add(box(RKW, .018, RKD, kiri, 'rack-base', [0, .009, 0])); g.add(box(RKW - .036, .12, .014, kiri, 'rack-back', [0, .078, -RKD / 2 + .007])); [-1, 1].forEach(sd => g.add(box(.018, .19, RKD, kiri, 'rack-end', [sd * (RKW / 2 - .009), .113, 0]))); });
    // 行灯: a box of paper in a wooden frame, standing where the lamp stood
    const glow = new THREE.MeshStandardMaterial({ name:'snow-andon-paper', color:col('#f6ead0'), emissive:col('#ffb866'), emissiveIntensity:.7, roughness:.9 });
    piece(desk, 'snow-andon', g => { g.position.set(2.56, DY + .025, -2.33); g.add(box(.14, .02, .14, dark, 'andon-base', [0, .01, 0])); g.add(box(.14, .014, .14, dark, 'andon-head', [0, .283, 0]));
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => g.add(box(.012, .27, .012, dark, 'andon-post', [sx * .058, .15, sz * .058], null, 1)))); g.add(mk(new THREE.BoxGeometry(.104, .23, .104), glow, 'andon-paper', [0, .15, 0])); });
    // 盆栽: a pine in a shallow pot, where the plant stood
    piece(desk, 'snow-bonsai', g => { g.position.set(.74, DY + .025, -2.2); const bark = std('snow-bark', '#4a3628', { roughness:.9 }), needle = std('snow-needles', '#2f5a3a', { roughness:.8 });
      g.add(box(.17, .04, .11, pbr('snow-pot', '#34454f', { roughness:.3, clearcoat:.7 }), 'pot', [0, .02, 0])); g.add(box(.15, .006, .09, std('snow-soil', '#3a2a1c', { roughness:1 }), 'soil', [0, .042, 0]));
      [[[-.03, .04, 0], [.012, .12, .01], .009], [[.012, .12, .01], [-.02, .19, -.005], .0075], [[-.02, .19, -.005], [.03, .255, 0], .006]].forEach(([a0, b0, r]) => g.add(rod(a0, b0, r, bark, 'trunk')));
      [[.055, .15, .012, .055], [-.05, .215, 0, .05], [.04, .275, 0, .045]].forEach(([px, py, pz, r]) => { const m = mk(new THREE.SphereGeometry(r, 14, 10), needle, 'pad', [px, py, pz]); m.scale.set(1, .38, .8); g.add(m); }); });
    // the portrait in a plain dark frame, on two feet
    piece(pf, 'snow-frame', g => { [-.108, .108].forEach(px => g.add(box(.02, .27, .024, dark, 'frame', [px, 0, .001], null, 1))); [-.134, .134].forEach(py => g.add(box(.236, .02, .024, dark, 'frame', [0, py, .001], null, 0))); });
    piece(portrait, 'snow-frame-feet', g => { [-.09, .09].forEach(px => g.add(box(.022, .03, .1, dark, 'foot', [px, .015, -.02], null, 2))); }); }

  /* ================= the stand under the TV ================= */
  // Two ends and three boards, the boards where the western cabinet has its top, its shelf and its bottom, and a rail across the back.
  // This one does not sink: the TV stays at the height it was.
  function stand() { const { tvc, CW, CD } = kit;
    piece(tvc, 'snow-tv-stand', g => { [-1, 1].forEach(sd => g.add(box(.022, .76, CD, kiri, 'stand-end', [sd * (CW / 2 - .011), .38, 0], null, 1)));
      g.add(box(CW + .02, .03, CD + .02, kiri, 'stand-top', [0, .775, 0])); g.add(box(CW - .05, .018, CD - .03, kiri, 'stand-shelf', [0, .4, -.01])); g.add(box(CW - .044, .025, CD, kiri, 'stand-shelf', [0, .0625, 0])); g.add(box(CW - .044, .09, .014, kiri, 'stand-rail', [0, .71, -CD / 2 + .01], null, 0)); }); }

  /* ================= 座椅子 and a low stand: the armchair and the side table ================= */
  // Both groups sink. The chair is a board on the floor with a back that leans away; the armchair's cushion is its pad, and the dog is
  // asleep on it. The side table is a top on two boards, its top where the pile of books needs it once the group is down.
  function seats() { const { chair, side } = kit; sink.chair = DROP.chair; sink.side = DROP.side;
    piece(chair, 'snow-zaisu', g => { const y0 = DROP.chair; g.add(box(.66, .04, .64, keyaki, 'zaisu-seat', [0, y0 + .02, 0]));
      g.add(box(.56, .5, .025, keyaki, 'zaisu-back', [0, y0 + .28, -.39], [-.28, 0, 0], 1)); g.add(box(.6, .035, .04, dark, 'zaisu-rail', [0, y0 + .525, -.46], [-.28, 0, 0], 0)); });
    piece(side, 'snow-low-stand', g => { const y0 = DROP.side; g.add(box(.52, .04, .52, kiri, 'stand-top', [0, .6, 0])); [-1, 1].forEach(sd => g.add(box(.035, .58 - y0, .44, kiri, 'stand-leg', [sd * .2, y0 + (.58 - y0) / 2, 0], null, 1))); }); }

  shell(); bookcase(); alcove(); table(); stand(); seats();
  // the open half of the left bay, in the plane of the back wall: the duck out on the jetty answers only through it
  const [a, b] = BAYS[0], pw = (b - a) / 4;
  return { parts, sink, lamp, opening:(x, y) => y > 0 && y < PH && x > a + pw + .04 && x < a + 3 * pw - .04 };
}
