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

  shell();
  // the open half of the left bay, in the plane of the back wall: the duck out on the jetty answers only through it
  const [a, b] = BAYS[0], pw = (b - a) / 4;
  return { parts, sink, lamp, opening:(x, y) => y > 0 && y < PH && x > a + pw + .04 && x < a + 3 * pw - .04 };
}
