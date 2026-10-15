// 《字與墨》: the escape game's chapter in the Chinese study (studyEscape.js starts it, studyInkRoom.js hands over what it plays with).
// Two round leaves shut the moon gate, with a brass lock on them. The key is in the cupboard under the curio stand, and the cupboard
// is sealed with a strip of paper that wants four characters written in its four squares. The characters are on a seal that has
// rolled into the celadon vase; a seal's face reads backwards, and comes out right only stamped on paper. Writing wants the brush on
// the painting table, and the brush wants ink, and the ink has dried in its stone.
export default function inkChapter(stage, ui) {
  const { THREE, kit, room, renderer, scene, camera } = stage, { mk, box, cyl, ctex, col, rng, std, M, disp, desk, DL, DD, DY } = kit;
  const P = stage.props(), { GATE, mats } = P, { roseD, wet } = mats, S = ui.state;
  // S: g the ink ground (0–3), b the brush taken, s the seal out of the vase, t the seal taken, p the paper stamped, o the cupboard open,
  // k the key taken, d done, w wrong writings on the strip
  const SEAL = '#c2272d', INK = '#1b1d20', KAI = '"Kaiti TC", "BiauKai", "DFKai-SB", "Kaiti SC", "Songti TC", serif';
  const WORD = [...'柳暗花明'], CANDS = [['卯', '柳', '柯', '抑'], ['晴', '喑', '暗', '音'], ['化', '花', '苑', '華'], ['胡', '明', '朋', '盟']];
  const OPEN = 1.9, DOOR = 1.9; // how far the gate's leaves and the cupboard's doors swing
  const fibres = (x, w, h, n, seed) => { const R = rng(seed); x.fillStyle = 'rgba(120,90,50,.12)'; for (let i = 0; i < n; i++) x.fillRect(R() * w, R() * h, 1, 2 + R() * 6); };

  /* ================= what is drawn on ================= */
  // the strip: a red seal at its head and four squares down it; the characters, once they are written
  const written = [];
  const stripTex = ctex(96, 800, (x, w, h) => { x.fillStyle = '#e8dbbd'; x.fillRect(0, 0, w, h); fibres(x, w, h, 300, 5); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.globalAlpha = .88; x.fillStyle = SEAL; x.fillRect(17, 20, 62, 62); x.globalAlpha = 1; x.fillStyle = '#e8dbbd'; x.font = `600 46px ${KAI}`; x.fillText('封', 48, 53);
    for (let i = 0; i < 4; i++) { const y = 130 + i * 150; x.strokeStyle = 'rgba(140,40,40,.75)'; x.lineWidth = 3; x.strokeRect(14, y, 68, 68);
      if (written[i]) { x.fillStyle = INK; x.font = `600 56px ${KAI}`; x.fillText(written[i], 48, y + 36); } } }, false);
  // a sheet of paper, and the seal's impression on it once it has been stamped: the right way round
  const paperTex = ctex(160, 224, (x, w, h) => { x.fillStyle = '#f0e9d6'; x.fillRect(0, 0, w, h); fibres(x, w, h, 200, 9);
    if (S.p) { x.globalAlpha = .9; x.strokeStyle = SEAL; x.lineWidth = 4; x.strokeRect(58, 26, 44, 172); x.fillStyle = SEAL; x.font = `600 34px ${KAI}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      WORD.forEach((c, i) => x.fillText(c, 80, 48 + i * 42)); x.globalAlpha = 1; } }, false);
  // the seal's face, looked at: cut backwards, as a seal is
  const drawFace = c => { const x = c.getContext('2d'), w = c.width, h = c.height; x.fillStyle = '#5f6468'; x.fillRect(0, 0, w, h); x.fillStyle = '#767b7f'; x.fillRect(6, 6, w - 12, h - 12);
    x.save(); x.translate(w, 0); x.scale(-1, 1); x.fillStyle = '#8f2520'; x.font = `600 58px ${KAI}`; x.textAlign = 'center'; x.textBaseline = 'middle'; WORD.forEach((ch, i) => x.fillText(ch, w / 2, 42 + i * 72)); x.restore(); };

  /* ================= the props, built once for the page ================= */
  const G = P.game || (P.game = (() => {
    const g = {}, hide = new THREE.MeshBasicMaterial({ name:'reach', visible:false });
    // a hit volume a pointer can find from across the room, round a thing too small to hit on its own (the duck has one too)
    const reach = (r, p) => { const m = mk(new THREE.SphereGeometry(r, 10, 8), hide, 'reach', p); m.castShadow = m.receiveShadow = false; return m; };
    // the leaves of the moon gate: each a disc of the gate's size cut off by the floor and down the middle, hung on a pin at the gate's
    // side, with a boss and a ring by the meeting edge like the door into the house. They swing outward, onto the jetty.
    const r = GATE.r - .02, y0 = .03, half = Math.sqrt(r * r - (GATE.y - y0) ** 2), a = Math.atan2(GATE.y - y0, half);
    g.leaves = [-1, 1].map(s => { const sh = new THREE.Shape(); sh.moveTo(-s * r, y0); sh.lineTo(-s * r, GATE.y + r); sh.absarc(-s * r, GATE.y, r, Math.PI / 2, s > 0 ? -a : Math.PI + a, s > 0); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth:.03, bevelEnabled:false, curveSegments:40 }); geo.translate(0, 0, -.015);
      const leaf = new THREE.Group(); leaf.name = 'gate-leaf'; leaf.userData.s = s; leaf.position.set(GATE.x + s * r, 0, -2.62);
      leaf.add(mk(geo, roseD, 'gate-leaf'), cyl(.045, .045, .008, 24, M.brass, 'gate-boss', [-s * (r - .13), 1.12, .019], [Math.PI / 2, 0, 0]), mk(new THREE.TorusGeometry(.032, .005, 8, 24), M.brass, 'gate-ring', [-s * (r - .13), 1.09, .027]));
      leaf.visible = false; room.add(leaf); return leaf; });
    // the lock: a hasp across the join, and a padlock hanging through it
    g.lock = new THREE.Group(); g.lock.name = 'gate-lock'; g.lock.position.set(GATE.x, .98, -2.605);
    g.lock.add(box(.14, .03, .006, M.brass, 'hasp', [0, .045, .003]), box(.055, .07, .02, M.brass, 'padlock', [0, -.025, .012]), mk(new THREE.TorusGeometry(.02, .004, 8, 16, Math.PI), M.brass, 'shackle', [0, .014, .012]), reach(.16));
    g.lock.visible = false; room.add(g.lock);
    // the seal, lying on the shelf by the vase once the vase has given it up: a block of warm stone with its red face turned to the room
    const sealStone = std('seal-stone', '#a08b70', { roughness:.6 }), sealFace = std('seal-face', SEAL, { roughness:.7 });
    g.seal = new THREE.Group(); g.seal.name = 'seal'; g.seal.position.set(-.01, DL[0] + .0175 + .014, .25); g.seal.rotation.y = -.35; // on the side of the vase away from the tip that stands at the pointer
    const lying = new THREE.Group(); lying.rotation.x = Math.PI / 2; lying.add(box(.028, .085, .028, sealStone, 'seal'), box(.027, .003, .027, sealFace, 'seal-face', [0, .044, 0]), reach(.08)); g.seal.add(lying);
    g.seal.visible = false; disp.add(g.seal);
    // the key, on the floor of the cupboard: brass with a glow of its own, for little light gets in there
    const brass = new THREE.MeshStandardMaterial({ name:'key-brass', color:col('#d9b35a'), emissive:col('#6a4a12'), emissiveIntensity:.6, metalness:.6, roughness:.4 });
    g.key = new THREE.Group(); g.key.name = 'key'; g.key.position.set(.05, .192, DD - .11); g.key.rotation.set(-Math.PI / 2, 0, .5); g.key.scale.setScalar(1.5);
    g.key.add(mk(new THREE.TorusGeometry(.011, .003, 8, 20), brass, 'key-bow', [0, .012, 0]), cyl(.0035, .0035, .06, 8, brass, 'key-shaft', [0, -.03, 0]), box(.014, .008, .004, brass, 'key-bit', [.006, -.052, 0]), reach(.09));
    g.key.visible = false; disp.add(g.key);
    // a sheet of paper on the painting table, for the seal
    g.paper = mk(new THREE.PlaneGeometry(.2, .28), new THREE.MeshStandardMaterial({ name:'xuan', map:paperTex, roughness:.95 }), 'paper', [1.45, DY + .0265, -1.68], [-Math.PI / 2, 0, .06]); g.paper.castShadow = false; g.paper.visible = false; desk.add(g.paper);
    // the strip, pasted down the cupboard's join over the plate and the pulls
    g.strip = new THREE.Group(); g.strip.name = 'strip'; g.strip.position.set(0, .47, DD + .018);
    const sp = mk(new THREE.PlaneGeometry(.06, .5), new THREE.MeshStandardMaterial({ name:'strip', map:stripTex, roughness:.9 }), 'strip'); sp.castShadow = false;
    g.strip.add(sp, reach(.12)); g.strip.visible = false; disp.add(g.strip);
    // the things of the room that the game takes hold of get hit volumes of their own
    P.vase.add(reach(.1, [0, .1, 0])); P.inkstone.add(reach(.1, [2.12, DY + .04, -1.7])); P.brush.add(reach(.07, [2.3, DY + .05, -1.64]));
    g.vaseY = P.vase.position.y; return g; })());

  /* ================= what the room shows of the state ================= */
  const ground = () => (S.g || 0) >= 3; // the ink has been ground (S.g is unset until the first rub)
  const dry = () => { wet.color.set('#303236'); wet.roughness = .95; wet.clearcoatRoughness = .9; };
  const damp = () => { wet.color.set('#060708'); wet.roughness = .08; wet.clearcoatRoughness = 0; };
  let shut = false, ending = false, out = false; // `out`: the eye is on the jetty and the chapter is over; any click goes back in
  // What answers the pointer, and what is seen, follow the state. A hidden thing still answers a ray, so each is tagged only while it
  // is there to be clicked, and everything is untagged when the chapter is put away.
  const picked = new Set();
  const pick = (o, id, tip, on) => { if (on && !picked.has(o)) { stage.tag(o, { id, tip }); picked.add(o); } else if (!on && picked.has(o)) { stage.untag(o); picked.delete(o); } };
  function sync() {
    pick(P.inkstone, 'ink', '硯台', true); pick(P.brush, 'brush', '毛筆', !S.b); pick(P.vase, 'vase', '青瓷瓶', true);
    pick(G.seal, 'seal', '印章', !!(S.s && !S.t)); pick(G.paper, 'paper', '宣紙', true); pick(G.strip, 'strip', '封條', !S.o);
    P.doors.forEach(d => pick(d, 'door', '櫃門', true)); pick(G.key, 'key', '鑰匙', !!(S.o && !S.k));
    G.leaves.forEach(l => pick(l, 'gate', '月洞門', true)); pick(G.lock, 'lock', '銅鎖', shut);
    P.brush.visible = !S.b; G.seal.visible = !!(S.s && !S.t); G.strip.visible = !S.o; G.key.visible = !!(S.o && !S.k); G.paper.visible = true; G.lock.visible = shut; }
  function apply() { ground() ? damp() : dry(); paperTex.redraw(); if (S.o) written.push(...WORD); stripTex.redraw(); P.doors.forEach((d, i) => { d.rotation.y = S.o ? (i ? 1 : -1) * DOOR : 0; }); }
  const carry = () => ui.inv([S.b && ['brush', '毛筆'], S.t && ['seal', '印章'], S.k && ['key', '鑰匙']].filter(Boolean));

  /* ================= movement ================= */
  const anims = [], ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const anim = (d, step, done) => anims.push({ t:0, d, step, done });
  function tick(dt) { for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i]; a.t = Math.min(a.d, a.t + dt); a.step(ease(a.t / a.d)); if (a.t >= a.d) { anims.splice(i, 1); a.done && a.done(); } } }

  /* ================= the puzzles ================= */
  function grind() { if (ground()) { ui.toast(S.b ? '墨已經磨好了' : '墨磨好了，筆在筆架上'); return; } S.g = (S.g || 0) + 1; ui.save();
    if (S.g < 3) ui.toast(['硯台是乾的。磨墨……', '再磨一會兒……'][S.g - 1]); else { damp(); ui.toast('墨磨好了，泛著光。筆架上的筆可以用了'); ui.lead('墨磨好了，筆可以用了'); } }
  function takeBrush() { if (!ground()) { ui.toast('筆是乾的，要先磨墨。硯台就在旁邊'); ui.lead('筆是乾的，硯台也乾了'); return; } S.b = 1; ui.save(); sync(); carry(); ui.toast('拿起毛筆'); ui.lead(S.w != null || S.sawStrip ? '手上有筆了。封條上的空格等著寫字' : '手上有筆了。哪裡要寫字？'); }
  let shaking = false;
  function shake() { if (shaking) return; if (S.s) { ui.toast('瓶子空了'); return; }
    // lifted, rocked and set down; the seal is out at the top of the rock
    const v = P.vase; S.s = 1; shaking = true; ui.save();
    anim(1.1, k => { const l = Math.sin(k * Math.PI); v.position.y = G.vaseY + l * .04; v.rotation.z = Math.sin(k * Math.PI * 3) * .18 * l; v.rotation.x = l * .35;
      if (k > .5 && !G.seal.visible) { sync(); ui.toast('瓶裡滾出一枚印章，落在架上'); ui.lead('瓶裡滾出一枚印章'); } }, () => { v.position.y = G.vaseY; v.rotation.set(0, 0, 0); shaking = false; stage.shadows(); }); }
  function takeSeal() { S.t = 1; ui.save(); sync(); carry(); ui.toast('一枚石印。印面刻著四個字，是反的；點下面的「印章」可以看'); ui.lead('印面的字是反的。蓋在紙上才正'); }
  function stamp() { if (!S.t) { ui.toast(S.p ? '紙上蓋著紅印' : '一張空白的宣紙。要是有印章，可以蓋蓋看'); return; } if (S.p) { ui.toast('蓋過了，字是正的：' + WORD.join('')); return; } S.p = 1; ui.save(); paperTex.redraw(); ui.toast('蓋下去。印泥是紅的，字正過來了：' + WORD.join('')); ui.lead('紙上的字：' + WORD.join('')); }
  let picks = [];
  function openStrip() { if (!S.b) { S.sawStrip = 1; ui.toast('封條上有四個空格，像是要寫字。手上沒有筆'); ui.lead('櫃子的封條上有四個空格，要用筆寫字'); return; } picks = [null, null, null, null];
    ui.box('<span class="card-kicker">封條</span><h3>四個空格</h3><p>照著印面的字，一格一格寫上去。</p><div class="slots">' + CANDS.map((cs, i) => '<div class="slot">' + cs.map(c => '<button class="opt" data-esc="ch" data-i="' + i + '" data-c="' + c + '">' + c + '</button>').join('') + '</div>').join('') + '</div><div class="acts"><button class="opt p" data-esc="write">寫上去</button><button class="opt" data-esc="close">先不寫</button></div>'); }
  function unseal() { S.o = 1; ui.save(); written.push(...WORD); stripTex.redraw(); ui.toast('四個字寫上封條，紙自己裂開了'); ui.lead('封條裂開了，櫃門開了');
    anim(.8, k => { G.strip.scale.y = 1 - k * .98; G.strip.position.y = .47 - k * .22; }, () => { G.strip.scale.y = 1; G.strip.position.y = .47; sync();
      anim(1.2, k => { P.doors.forEach((d, i) => { d.rotation.y = (i ? 1 : -1) * DOOR * k; }); stage.shadows(); }, () => { stage.shadows(); ui.toast('櫃子開了。裡面有東西閃著光'); }); }); }
  function takeKey() { S.k = 1; ui.save(); sync(); carry(); ui.toast('一把銅鑰匙。月洞門上的鎖，就等它'); ui.lead('有鑰匙了。月洞門的鎖在門板中間'); }
  function unlock() { if (!S.k) { ui.toast('鎖著，要鑰匙'); return; } if (ending) return; ending = true; const took = ui.end(); ui.toast('鎖開了'); ui.lead('');
    pick(G.lock, 'lock', '', false); G.lock.visible = false; G.leaves.forEach(l => pick(l, 'gate', '', false)); stage.$('tip').style.opacity = 0; // the lock's name was still up at the pointer
    anim(1.6, k => { G.leaves.forEach(l => { l.rotation.y = -l.userData.s * OPEN * k; }); stage.shadows(); }, () => { stage.shadows();
      // out through the gate, onto the jetty, and a look back into the room
      stage.flyTo(new THREE.Vector3(GATE.x - .05, 1.1, -1.4), new THREE.Vector3(GATE.x + .3, 1.5, -3.3), 2.2, [-Infinity, Infinity]);
      setTimeout(() => { out = true; stage.label('回書齋'); ui.box('<span class="card-kicker">字與墨</span><h3>你走出了書齋。</h3><p>用了 ' + took + '。' + (S.w ? '封條寫錯了 ' + S.w + ' 次。' : '封條一次就寫對了。') + '</p><p>看夠了，點房間任何地方回去。</p><div class="acts"><button class="opt p" data-esc="back">回書齋</button></div>'); }, 1800); }); }
  // the chapter is over and put away: the eye goes back to the middle of the room, which is the room again
  function back() { if (ending && !out) return; ui.closeBox(); teardown(); stage.goHome(); ui.finish(); }

  /* ================= what study.js and the card call ================= */
  function click(root, any) {
    if (ending) { if (out) back(); return; }
    if (!root) { if (any) ui.toast('現在不是看書的時候。先找鑰匙出去'); return; }
    const id = root.userData.pick.id;
    if (id === 'ink') grind(); else if (id === 'brush') takeBrush(); else if (id === 'vase') shake(); else if (id === 'seal') takeSeal(); else if (id === 'paper') stamp();
    else if (id === 'strip') openStrip(); else if (id === 'door') { ui.toast(S.o ? '櫃子開著' : '櫃門貼著封條，拉不開'); if (!S.o) ui.lead('櫃門上貼著封條'); } else if (id === 'key') takeKey();
    else if (id === 'gate') ui.toast(shut ? '月洞門關上了，鎖著。鑰匙還在書齋裡' : '月洞門'); else if (id === 'lock') unlock(); }
  function act(a, b) {
    if (a === 'ch') { picks[+b.dataset.i] = b.dataset.c; b.parentElement.querySelectorAll('.opt').forEach(o => o.classList.toggle('on', o === b)); }
    else if (a === 'write') { if (picks.some(c => !c)) { ui.toast('還有空格沒寫'); return; }
      if (picks.join('') === WORD.join('')) { ui.closeBox(); unseal(); } else { S.w = (S.w || 0) + 1; ui.save(); ui.toast(S.w >= 2 ? '寫錯了。印面是反的，蓋在紙上才看得正' : '寫錯了，墨跡暈開'); } }
    else if (a === 'back') back(); }
  function use(id) {
    if (id === 'seal') { ui.box('<div class="face"><canvas width="96" height="300"></canvas><div><span class="card-kicker">印章</span><h3>印面</h3><p>刻著四個字，是反的。蓋在紙上，字才正過來。</p><div class="acts"><button class="opt p" data-esc="close">收起</button></div></div></div>'); drawFace(document.querySelector('#esc .face canvas')); }
    else if (id === 'brush') ui.toast('毛筆，筆尖是濕的'); else if (id === 'key') ui.toast('一把銅鑰匙，不知道開哪裡'); }
  function hint() { if (!ground()) return '畫案上的硯台乾了，磨一磨'; if (!S.b) return '墨磨好了。筆在筆架上'; if (!S.s) return '博古架上那只青瓷瓶，搖一搖'; if (!S.t) return '印章滾到架上了';
    if (!S.o) return S.p ? '紙上的四個字，寫到封條上' : '印面是反的。畫案上有紙，蓋蓋看'; if (!S.k) return '櫃子裡的東西，拿起來'; return '鑰匙開月洞門上的銅鎖'; }
  // the room is shut: the leaves swing to, and the lock is on. The props' materials are compiled first, so the swing does not stutter
  function begin() { apply(); sync(); carry(); G.leaves.forEach(l => { l.rotation.y = -l.userData.s * OPEN; l.visible = true; });
    renderer.compileAsync(scene, camera).catch(() => {}).then(() => anim(1.3, k => { G.leaves.forEach(l => { l.rotation.y = -l.userData.s * OPEN * (1 - k); }); stage.shadows(); },
      () => { shut = true; sync(); stage.shadows(); ui.lead('門鎖了。鑰匙還在書齋裡的某處');
        // what the game is, said once, in the card: the goal, how the room answers the pointer, and where help is
        ui.box('<span class="card-kicker">字與墨</span><h3>' + (ui.resumed ? '月洞門又關上了。' : '月洞門關上了。') + '</h3><p>門上掛著一把銅鎖。鑰匙還在這間書齋裡，找到它，開鎖出去。</p>'
          + '<p>滑過房間裡的東西，會動的會亮出名字，點它就是動手。上面的「展示架」「書桌」能走近看。卡住了，按「提示」。</p>'
          + (ui.resumed ? '<p>接著上次的進度。</p>' : '') + '<div class="acts"><button class="opt p" data-esc="close">開始找</button></div>'); })); }
  // the chapter is put away: the room is as it was, and nothing of the game answers the pointer
  function teardown() { anims.length = 0; shaking = false; [...picked].forEach(o => pick(o, '', '', false)); shut = false; ending = out = false;
    G.leaves.forEach(l => { l.visible = false; }); G.lock.visible = G.seal.visible = G.key.visible = G.paper.visible = G.strip.visible = false; G.strip.scale.y = 1; G.strip.position.y = .47;
    P.brush.visible = true; damp(); P.doors.forEach(d => { d.rotation.y = 0; }); P.vase.position.y = G.vaseY; P.vase.rotation.set(0, 0, 0); stage.shadows(); }
  return { click, act, use, hint, tick, begin, teardown, back, get busy() { return anims.length > 0; }, get ending() { return ending; } };
}
