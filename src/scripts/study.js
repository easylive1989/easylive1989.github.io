import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { rng, cnv, paintSheets, spineAtlas, SPINES, pageEdges, paintLakeView, crtMask } from './studyTextures.js';
const texOf = (c, rep = [1,1], srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ================= content ================= */
// Filled at build time from Notion (src/lib/study.ts). Ids are the room's physical
// slots — a spine on the shelf, a spot in the niche, a page on the desk.
const DATA = JSON.parse(document.getElementById('study-data').textContent);
const { items: ITEMS, about: ABOUT, github: GH, site: SITE } = DATA;
const related = id => DATA.links.filter(l => l.includes(id)).map(l => l[0] === id ? l[1] : l[0]);
const IDS = Object.keys(ITEMS);
const CATS = [{ id:'shelf', name:'書架' }, { id:'display', name:'展示架' }, { id:'desk', name:'書桌' }];
const has = id => !!ITEMS[id];
const glyph = id => (ITEMS[id] && ITEMS[id].ch) || '書';
const isExt = u => /^(https?:)?\/\/|^mailto:/.test(u);
const linkAttrs = u => isExt(u) ? ' target="_blank" rel="noopener"' : '';

/* ================= palette ================= */
const css = getComputedStyle(document.documentElement);
const tok = (n, f) => css.getPropertyValue(n).trim() || f;
const cv1 = document.createElement('canvas'); cv1.width = cv1.height = 1; const cx1 = cv1.getContext('2d', { willReadFrequently:true });
const rgb = s => { cx1.clearRect(0,0,1,1); cx1.fillStyle = '#000'; cx1.fillStyle = s; cx1.fillRect(0,0,1,1); const d = cx1.getImageData(0,0,1,1).data; return '#' + [d[0],d[1],d[2]].map(v => v.toString(16).padStart(2,'0')).join(''); };
const T = n => rgb(tok(n, '#888'));
const C = {
  paper:T('--color-bg'), ink:T('--color-text'), cyan:T('--color-accent'), mag:T('--color-accent-2'), yel:rgb(tok('--color-process-yellow','#edbb00')),
  c700:T('--color-accent-700'), c800:T('--color-accent-800'), c900:T('--color-accent-900'), m700:T('--color-accent-2-700'), m800:T('--color-accent-2-800'), m900:T('--color-accent-2-900'),
  n200:T('--color-neutral-200'), n600:T('--color-neutral-600'), n800:T('--color-neutral-800'),
  wood:'#5b3522', woodD:'#3b2216', woodL:'#7a4a2c', wall:'#3a322b', wallL:'#4a4038', fabric:'#776f5c', fabricD:'#5e5747', cream:'#eadfc6', brass:'#b38b4b', terracotta:'#b4643c', cat:'#d98a46', leaf:'#5e9a3a', fur:'#3a3633',
};
const col = h => new THREE.Color(h);

/* ================= quality ================= */
// Two tiers. `low` is settled up front from what the device says about itself, or from an earlier visit that turned out slow, so a weak
// machine never builds the full room; and the first seconds of frame times can still demote one that claimed to be fast. `?quality=low|high` forces it.
const QKEY = 'study-quality';
const stored = (() => { try { return localStorage.getItem(QKEY); } catch { return null; } })();
const forced = new URLSearchParams(location.search).get('quality');
if (forced === 'low' || forced === 'high') try { localStorage.setItem(QKEY, forced); } catch {} // the override also replaces what an earlier visit remembered
const Q = { low: forced ? forced === 'low' : stored ? stored === 'low' : matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4, judged:false, armed:false };
if (Q.low) document.body.classList.add('lite');

/* ================= renderer ================= */
const byId = id => document.getElementById(id);
const stage = byId('stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias:!Q.low }); }
catch (err) {
  // no WebGL (old browser, GPU blocklist): the room can't open, so leave the doors to the rest of the site
  const intro = byId('intro'); intro.classList.remove('off'); intro.style.pointerEvents = 'auto';
  intro.innerHTML = '<div>這間書房需要 WebGL 才能走進去。<br><br><a href="' + SITE.reading + '">書單</a> · <a href="' + SITE.archive + '">全部文章</a> · <a href="' + SITE.rss + '">RSS</a></div>';
  throw err;
}
renderer.setPixelRatio(Q.low ? 1 : Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
// nothing in the room moves on its own, so the shadow map is drawn once and again only while something is being pulled or carried
renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = col('#b4bfca');
const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, .02, 60);
const HOME = { pos:new THREE.Vector3(1.05, 1.72, 2.1), tgt:new THREE.Vector3(-0.2, 1.22, -1.7) };
camera.position.set(1.6, 1.9, 3.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.tgt); controls.enableDamping = true; controls.enablePan = false; controls.rotateSpeed = .45;
controls.minDistance = .35; controls.maxDistance = 4.4; controls.minPolarAngle = .95; controls.maxPolarAngle = 1.8;
const az0 = Math.atan2(HOME.pos.x - HOME.tgt.x, HOME.pos.z - HOME.tgt.z);
controls.minAzimuthAngle = az0 - .62; controls.maxAzimuthAngle = az0 + .42;

/* ================= helpers ================= */
const std = (name, c, o = {}) => new THREE.MeshStandardMaterial({ name, color:col(c), roughness:.8, metalness:0, ...o });
const M = {
  wall:std('wall', C.wall, { roughness:.95 }), wallL:std('wall-light', C.wallL, { roughness:.95 }),
  wood:std('wood', C.wood, { roughness:.55 }), woodD:std('wood-dark', C.woodD, { roughness:.6 }), woodL:std('wood-light', C.woodL, { roughness:.5 }),
  fabric:std('fabric', C.fabric, { roughness:1 }), fabricD:std('fabric-dark', C.fabricD, { roughness:1 }),
  cream:std('cream', C.cream, { roughness:.9 }), brass:std('brass', C.brass, { roughness:.35, metalness:.8 }), ink:std('ink', C.ink, { roughness:.5 }),
  terracotta:std('terracotta', C.terracotta), leaf:std('leaf', C.leaf, { roughness:.7, side:THREE.DoubleSide }), cat:std('cat', C.cat, { roughness:.95 }), catL:std('cat-light', '#efc394', { roughness:.95 }),
  fur:std('fur-rug', C.fur, { roughness:1 }), glass:new THREE.MeshStandardMaterial({ name:'glass', color:col('#9fb7b0'), transparent:true, opacity:.08, roughness:.05, depthWrite:false }),
  alu:std('aluminium', '#9a9893', { roughness:.35, metalness:.7 }), bronze:std('bronze', '#5a3a24', { roughness:.4, metalness:.6 }),
};
const mk = (geo, m, name, p, r) => { const o = new THREE.Mesh(geo, m); o.name = name; if (p) o.position.set(...p); if (r) o.rotation.set(...r); o.castShadow = true; o.receiveShadow = true; return o; };
// `ax` forces the grain along x/y/z (0/1/2); each part is slid to its own patch of the texture so twins don't share a grain
const uvR = rng(23);
const box = (w, h, d, m, name, p, r, ax) => { const g = rboxGeo(w, h, d, Math.min(.012, Math.min(w, h, d) * .2), ax).clone(), uv = g.attributes.uv, du = uvR() * 4, dv = uvR() * 4;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv); return mk(g, m, name, p, r); };
// a wall is built from several boxes: give them room coordinates as UVs instead, so the plaster runs unbroken from one to the next
const roomUV = m => { const { position:p, normal:n, uv } = m.geometry.attributes, o = m.position;
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i)), x = p.getX(i) + o.x, y = p.getY(i) + o.y, z = p.getZ(i) + o.z;
    ax > ay && ax > az ? uv.setXY(i, z, y) : ay > az ? uv.setXY(i, x, z) : uv.setXY(i, x, y); }
  return m; };
const cyl = (rt, rb, h, seg, m, name, p, r, open) => mk(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!open), m, name, p, r);
const UP = new THREE.Vector3(0,1,0);
const rod = (a, b, rad, m, name) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A); const o = mk(new THREE.CylinderGeometry(rad, rad, d.length(), 10), m, name); o.position.copy(A).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(UP, d.normalize()); return o; };
const texts = [];
const ctex = (w, h, draw, keep = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.redraw = () => { draw(x, w, h); t.needsUpdate = true; }; if (keep) texts.push(t); return t; };
const SERIF = '"Source Serif 4", serif';
const room = new THREE.Group(); scene.add(room);
const pickables = [];
const tag = (root, data, pull = [0,.025,0]) => { root.userData.pick = data; root.userData.pull = new THREE.Vector3(...pull); root.userData.base = root.position.clone(); root.traverse(o => { if (o.isMesh) { o.userData.root = root; pickables.push(o); } }); };

/* ================= realism kit ================= */
let sd = 3; const RN = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
function smoothNormals(g, ang = .62) {
  const p = g.attributes.position, n = g.attributes.normal, map = new Map();
  for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4); let a = map.get(k); if (!a) map.set(k, a = []); a.push(i); }
  const out = new Float32Array(n.count * 3), c = Math.cos(ang), a = new THREE.Vector3(), b = new THREE.Vector3(), acc = new THREE.Vector3();
  map.forEach(ids => ids.forEach(i => { a.fromBufferAttribute(n, i); acc.set(0,0,0); ids.forEach(j => { b.fromBufferAttribute(n, j); if (a.dot(b) > c) acc.add(b); }); acc.normalize(); out[i*3] = acc.x; out[i*3+1] = acc.y; out[i*3+2] = acc.z; }));
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3));
}
const geoCache = {};
// box-projected UVs in metres, u along the longer side of each face (or along `ax`), so a wood grain runs the length of the part
function grainUV(g, dims, ax) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1).sub(a); c.fromBufferAttribute(p, i + 2).sub(a); b.cross(c);
    const n = [Math.abs(b.x), Math.abs(b.y), Math.abs(b.z)], k = n.indexOf(Math.max(...n)); let [s, t] = [0, 1, 2].filter(j => j !== k);
    if (ax != null ? t === ax : dims[t] > dims[s]) [s, t] = [t, s];
    for (let j = i; j < i + 3; j++) { uv[j*2] = p.getComponent(j, s); uv[j*2+1] = p.getComponent(j, t); }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
function rboxGeo(w, h, d, r, ax) {
  r = Math.min(r, w/2 - 1e-4, h/2 - 1e-4, d/2 - 1e-4);
  const key = [w,h,d,r].map(v => v.toFixed(4)).join() + ax; if (geoCache[key]) return geoCache[key];
  let g;
  if (r < .0015) g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  else {
    const iw = w - 2*r, ih = h - 2*r, rc = Math.min(r*.6, iw/2, ih/2), x0 = -iw/2, y0 = -ih/2, sh = new THREE.Shape();
    sh.moveTo(x0+rc, y0); sh.lineTo(x0+iw-rc, y0); sh.quadraticCurveTo(x0+iw, y0, x0+iw, y0+rc); sh.lineTo(x0+iw, y0+ih-rc); sh.quadraticCurveTo(x0+iw, y0+ih, x0+iw-rc, y0+ih);
    sh.lineTo(x0+rc, y0+ih); sh.quadraticCurveTo(x0, y0+ih, x0, y0+ih-rc); sh.lineTo(x0, y0+rc); sh.quadraticCurveTo(x0, y0, x0+rc, y0);
    g = new THREE.ExtrudeGeometry(sh, { depth:d - 2*r, bevelEnabled:true, bevelThickness:r, bevelSize:r, bevelSegments:3, curveSegments:3 });
    g.translate(0, 0, -(d - 2*r)/2); smoothNormals(g);
  }
  grainUV(g, [w, h, d], ax); return geoCache[key] = g;
}
/* ================= material sheets ================= */
// The big procedural sheets (wood, plaster, cloth, fur, the floor) are most of what it costs to open the room, so they are painted in a
// worker where the browser allows it, and the page stays responsive meanwhile. Every material is built at once on a 2×2 stand-in of the
// right kind; the finished sheets drop into those same texture objects when they arrive, so no shader is built twice.
const STAND_IN = { color:'#bdbdbd', normal:'#8080ff', rough:'#ffffff' }, slots = [];
const sheet = (key, ch, rep = [1, 1]) => { const t = texOf(cnv(2, 2, (x, w, h) => { x.fillStyle = STAND_IN[ch]; x.fillRect(0, 0, w, h); }), rep, ch === 'color'); slots.push([key, ch, t]); return t; };
const sheetsReady = (async () => {
  await null; // let the whole room be built (and every slot claimed) first
  let sets = null, w = null;
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try { sets = await new Promise((res, rej) => { w = new Worker(new URL('./studyWorker.js', import.meta.url), { type:'module' }); w.onmessage = e => res(e.data); w.onerror = rej; w.postMessage({ low:Q.low }); }); }
    catch (err) { console.warn('painting the room\'s sheets on the main thread instead', err); }
  }
  if (!sets) sets = paintSheets(Q.low);
  // Uploaded here and now rather than on the next frame: in Chromium a worker's bitmaps live on its GPU context and go when it does, and
  // the next frame can be a long way off (a tab opened in the background, shaders still compiling). Only then is the worker let go.
  slots.forEach(([key, ch, t]) => { t.dispose(); t.image = sets[key][ch]; t.needsUpdate = true; renderer.initTexture(t); });
  w?.terminate();
})();
// one sheet of grain, 2 m along it and 1 m across, stained three ways by the material colours
const woodTex = { map:sheet('wood', 'color', [.5, 1]), normalMap:sheet('wood', 'normal', [.5, 1]), roughnessMap:sheet('wood', 'rough', [.5, 1]), normalScale:new THREE.Vector2(.35, .35) };
// one 2.5 m sheet of plaster, painted two shades by the material colours
const plasterTex = { map:sheet('plaster', 'color', [.4, .4]), normalMap:sheet('plaster', 'normal', [.4, .4]), roughnessMap:sheet('plaster', 'rough', [.4, .4]), normalScale:new THREE.Vector2(.55, .55) };
// upholstery: one 12.5 cm swatch of 4 mm threads
const fabricTex = { map:sheet('fabric', 'color', [8, 8]), normalMap:sheet('fabric', 'normal', [8, 8]), normalScale:new THREE.Vector2(.8, .8), roughness:1, sheen:.4, sheenRoughness:.75 };
const coatTex = { normalMap:sheet('tabby', 'normal'), normalScale:new THREE.Vector2(.6, .6), roughness:1, sheen:.6, sheenRoughness:.6, sheenColor:col('#ffd9b0') };
// small things: metal that has been handled, a pot, a leaf, and a fine grit for paper and soil
const metalTex = { map:sheet('metal', 'color'), roughnessMap:sheet('metal', 'rough'), metalness:1 };
const grit = sheet('plaster', 'normal');
const plasticTex = { map:sheet('plastic', 'color', [2, 2]), normalMap:sheet('plastic', 'normal', [2, 2]), roughnessMap:sheet('plastic', 'rough', [2, 2]), normalScale:new THREE.Vector2(.35, .35) };
const lite = o => { if (Q.low) { o.clearcoat = 0; o.sheen = 0; } return o; }; // the low tier drops the coats: a second specular lobe on every pixel
const pbr = (name, c, o = {}) => new THREE.MeshPhysicalMaterial(lite({ name, color:col(c), roughness:.6, ...o }));
Object.assign(M, {
  wood: pbr('wood', '#9a5f3c', { ...woodTex, roughness:.52, clearcoat:.45, clearcoatRoughness:.28 }),
  woodD: pbr('wood-dark', '#6a3f29', { ...woodTex, roughness:.62, clearcoat:.3, clearcoatRoughness:.35 }),
  woodL: pbr('wood-light', '#b07a50', { ...woodTex, roughness:.47, clearcoat:.5, clearcoatRoughness:.25 }),
  wall: std('wall', '#544739', { ...plasterTex, roughness:1 }),
  wallL: std('wall-light', '#665645', { ...plasterTex, roughness:1 }),
  fabric: pbr('fabric', '#9a917a', { ...fabricTex, sheenColor:col('#cfc7ae') }),
  fabricD: pbr('fabric-dark', '#7a7262', { ...fabricTex, sheenColor:col('#aaa290') }),
  brass: pbr('brass', '#d2a868', { ...metalTex, roughness:.43 }), bronze: pbr('bronze', '#6a442a', { ...metalTex, metalness:.9, roughness:.63 }),
  alu: pbr('aluminium', '#b4b2ad', { ...metalTex, map:null, roughness:.53 }),
  cat: pbr('cat', '#ffffff', { map:sheet('tabby', 'color'), ...coatTex }), catL: pbr('cat-light', '#f7dcb8', coatTex),
  cream: pbr('cream', C.cream, { roughness:.6, clearcoat:.2 }), terracotta: std('terracotta', '#ffffff', { map:sheet('pot', 'color'), normalMap:sheet('pot', 'normal'), roughness:.95 }),
  leaf: pbr('leaf', '#ffffff', { map:sheet('leaf', 'color'), normalMap:sheet('leaf', 'normal'), normalScale:new THREE.Vector2(.7, .7), roughness:.5, clearcoat:.35, clearcoatRoughness:.3, side:THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial(lite({ name:'glass', color:col('#c8d8d4'), transparent:true, opacity:.14, roughness:.04, metalness:0, depthWrite:false, clearcoat:1 })),
});

/* ================= room shell ================= */
// one 3 m tile of 12.5 cm boards, laid twice each way
const [floorMap, floorNormal, floorRough] = ['color', 'normal', 'rough'].map(ch => { const t = sheet('floor', ch, [2, 2]); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
room.add(mk(new THREE.PlaneGeometry(6, 6), new THREE.MeshPhysicalMaterial(lite({ name:'floor', map:floorMap, normalMap:floorNormal, normalScale:new THREE.Vector2(.7, .7), roughnessMap:floorRough, roughness:1, clearcoat:.25, clearcoatRoughness:.35 })), 'floor', [0,0,0], [-Math.PI/2,0,0]));
room.add(roomUV(box(.1, 2.8, 6, M.wall, 'wall-left', [-3.05,1.4,0])));
room.add(roomUV(box(.1, 2.8, 6, M.wall, 'wall-right', [3.05,1.4,0])));
// back wall with niche + window openings
room.add(roomUV(box(.7, 2.8, .1, M.wall, 'wall-back', [-2.7,1.4,-2.55])));
room.add(roomUV(box(.6, 2.8, .1, M.wall, 'wall-back', [-.25,1.4,-2.55])));
room.add(roomUV(box(.4, 2.8, .1, M.wall, 'wall-back', [2.85,1.4,-2.55])));
room.add(roomUV(box(1.8, .25, .1, M.wall, 'wall-back', [-1.45,2.68,-2.55])));
room.add(roomUV(box(2.6, 1.0, .1, M.wall, 'wall-back', [1.35,.5,-2.55])));
room.add(roomUV(box(2.6, .3, .1, M.wall, 'wall-back', [1.35,2.65,-2.55])));
// crown + skirting
[[-3,0,'x'],[3,0,'x']].forEach(([x]) => { room.add(box(.08, .12, 6, M.cream, 'crown', [x*.985,2.74,0])); room.add(box(.05, .14, 6, M.woodD, 'skirting', [x*.99,.07,0])); });
room.add(box(6, .12, .08, M.cream, 'crown', [0,2.74,-2.48]));
room.add(box(6, .14, .05, M.woodD, 'skirting', [0,.07,-2.48]));

/* ================= bookshelf (left wall) ================= */
const shelf = new THREE.Group(); shelf.name = 'bookshelf'; room.add(shelf);
const SX = -2.62, SZ0 = -2.47, SZ1 = 1.6, LV = [.1, .45, .8, 1.15, 1.5, 1.85, 2.2, 2.55];
shelf.add(box(.4, 2.72, 4.1, M.woodD, 'shelf-carcass-back', [-2.98,1.36,(SZ0+SZ1)/2]));
const bays = [SZ0, -1.13, .23, SZ1];
bays.forEach(z => shelf.add(box(.4, 2.72, .05, M.wood, 'shelf-divider', [-2.81,1.36,z])));
LV.forEach(y => shelf.add(box(.4, .035, SZ1 - SZ0, M.wood, 'shelf-board', [-2.81,y,(SZ0+SZ1)/2])));
shelf.add(box(.42, .18, SZ1 - SZ0 + .05, M.wood, 'shelf-cornice', [-2.8,2.68,(SZ0+SZ1)/2]));
LV.slice(1).forEach(y => { const s = mk(new THREE.BoxGeometry(.02, .01, SZ1 - SZ0), new THREE.MeshBasicMaterial({ name:'led', color:col('#b98450') }), 'led-strip', [-2.63, y - .025, (SZ0+SZ1)/2]); s.castShadow = false; shelf.add(s); });
const spineCols = [C.c900, C.m900, C.m800, '#24402f', '#2e4a3a', '#1f2c3d', C.cream, '#6b3a26', '#8a6b45', C.n800, '#3d2a1e', C.c800, '#c9b88f', '#5a1f1f'];
const featured = { 2:{ bay:1, ids:['s1','s2','s3'], label:'系列', th:.12 }, 3:{ bay:1, ids:['w1','w2','w3','w4','w5','w6'], label:'最近寫的', th:.07 }, 4:{ bay:1, ids:['r1','r2','r3','r4'], label:'書單', th:.07 } };
Object.keys(featured).forEach(lv => { featured[lv].ids = featured[lv].ids.filter(has); if (!featured[lv].ids.length) delete featured[lv]; });
// every shelved book is one instance of a unit block; `aBook` gives each its own spine layout, and the shader tells its cloth from its paper
const bookGeo = rboxGeo(1, 1, 1, .09).clone(), bookAttr = new THREE.InstancedBufferAttribute(new Float32Array(900 * 2), 2), bookR = rng(41); bookGeo.setAttribute('aBook', bookAttr);
const bookMat = new THREE.MeshStandardMaterial({ name:'books', roughness:.68 }), spines = texOf(spineAtlas(), [1, 1], false);
bookMat.onBeforeCompile = sh => {
  sh.uniforms.uSpines = { value:spines };
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aBook;\nvarying vec3 vBookP;\nvarying vec3 vBookN;\nvarying vec2 vBook;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBookP = position; vBookN = normal; vBook = aBook;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uSpines;\nvarying vec3 vBookP;\nvarying vec3 vBookN;\nvarying vec2 vBook;\nfloat bookFoil = 0.0;').replace('#include <color_fragment>', `#include <color_fragment>
    vec3 bn = abs(vBookN);
    if ((vBookN.y > 0.0 && bn.y > bn.x && bn.y > bn.z) || (vBookN.x < 0.0 && bn.x > bn.y && bn.x > bn.z)) {
      // head and fore-edge are the paper block: sheets across the thickness, blurring into plain cream once they are too fine to draw
      float s = vBookP.z * 22.0, sheet = mix(0.84 + 0.16 * sin(s * 6.2832), 0.92, smoothstep(0.25, 0.7, fwidth(s)));
      diffuseColor.rgb = vec3(0.82, 0.74, 0.57) * sheet;
    } else {
      float across = clamp(vBookP.z + 0.5, 0.04, 0.96);
      vec3 deco = texture2D(uSpines, vec2(vBookP.y + 0.5, (vBook.x + across) / ${SPINES}.0)).rgb, cloth = diffuseColor.rgb * (0.78 + 0.22 * sin(across * 3.1416)); // the spine rounds away at its edges
      // pale cloth is stamped in dark ink, dark cloth in gold or, for one book in four, silver
      bool pale = dot(cloth, vec3(0.3, 0.6, 0.1)) > 0.22;
      vec3 foil = pale ? vec3(0.03, 0.018, 0.012) : vBook.y > 0.75 ? vec3(0.62, 0.6, 0.55) : vec3(0.69, 0.48, 0.17);
      bookFoil = pale ? 0.0 : deco.r;
      diffuseColor.rgb = mix(mix(mix(cloth, cloth * 0.4, deco.b), vec3(0.84, 0.78, 0.62), deco.g), foil, deco.r);
    }`).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.35, bookFoil);').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.85, bookFoil);');
};
const inst = new THREE.InstancedMesh(bookGeo, bookMat, 900); inst.castShadow = true; inst.receiveShadow = true;
let ni = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const featPos = {};
for (let lv = 0; lv < 7; lv++) for (let b = 0; b < 3; b++) {
  let z = bays[b] + .04; const zEnd = bays[b+1] - .04; const f = featured[lv] && featured[lv].bay === b ? featured[lv] : null;
  const fStart = f ? bays[b] + .32 : 99, fEnd = f ? fStart + f.ids.length * (f.th + .015) + .02 : 99;
  if (f) f.ids.forEach((id, i) => featPos[id] = { y:LV[lv], z:fStart + .02 + i*(f.th + .015) + f.th/2, th:f.th });
  while (z < zEnd - .02) {
    if (z >= fStart && z < fEnd) { z = fEnd; continue; }
    if (rnd() < .025) { z += .12; continue; }
    const t = .025 + rnd()*.045, h = .22 + rnd()*.1, d = .2 + rnd()*.06;
    if (z + t > zEnd) break;
    const lean = rnd() < .04 && z + .2 < zEnd ? .22 : 0;
    q.setFromEuler(new THREE.Euler(lean, 0, 0)); sc.set(d, h, t); ps.set(-2.78 + (.26 - d)/2 + .02, LV[lv] + .018 + h/2, z + t/2 + (lean ? .03 : 0));
    m4.compose(ps, q, sc); inst.setMatrixAt(ni, m4); const c = col(spineCols[Math.floor(rnd()*spineCols.length)]); c.multiplyScalar(.8 + rnd()*.35); inst.setColorAt(ni, c); bookAttr.setXY(ni, Math.floor(bookR() * SPINES), bookR()); ni++;
    z += t + .003 + (lean ? .05 : 0);
  }
}
inst.count = ni; shelf.add(inst);
// featured books with real spines
const hasCJK = s => /[\u3400-\u9fff]/.test(s);
const spineTex = (title, bg, fg) => ctex(96, 512, (x, w, h) => {
  x.fillStyle = bg; x.fillRect(0,0,w,h);
  const g = x.createLinearGradient(0, 0, w, 0); [[0,.3],[.2,0],[.8,0],[1,.3]].forEach(([p, a]) => g.addColorStop(p, 'rgba(0,0,0,' + a + ')')); x.fillStyle = g; x.fillRect(0,0,w,h); // the spine rounds away at its edges
  x.fillStyle = fg; x.fillRect(0, 26, w, 4); x.fillRect(0, h-30, w, 4); x.fillRect(0, 35, w, 1.5); x.fillRect(0, h-36.5, w, 1.5);
  const t = title.replace(/[《》]/g, ''); x.textAlign = 'center'; x.textBaseline = 'middle';
  if (hasCJK(t)) { const n = t.length, fs = Math.min(58, 400 / n); x.font = `600 ${fs}px ${SERIF}`; [...t].forEach((ch, i) => x.fillText(ch, w/2, 60 + fs/2 + i*fs*1.05)); }
  else { x.save(); x.translate(w/2, h/2); x.rotate(Math.PI/2); x.font = `600 40px ${SERIF}`; x.fillText(t, 0, 2, h - 80); x.restore(); }
});
const fPal = [[C.c800,C.cream],[C.m800,C.cream],['#2e4a3a',C.cream],[C.cream,C.ink],['#6b3a26',C.cream],[C.c900,C.yel],[C.cream,C.m700],['#1f2c3d',C.cream]];
const fCols = {}; Object.keys(featPos).forEach((id, i) => fCols[id] = id === 'r3' ? [C.cyan, C.paper] : fPal[i % fPal.length]);
const books = {}, pagesMat = std('pages', '#ffffff', { map:texOf(pageEdges()), roughness:.9 });
Object.entries(featPos).forEach(([id, p]) => {
  const [bg, fg] = fCols[id]; const h = id[0] === 's' ? .32 : id[0] === 'r' ? .29 : .3;
  const sm = new THREE.MeshStandardMaterial({ name:'spine-' + id, map:spineTex(ITEMS[id].sp || ITEMS[id].t, bg, fg), roughness:.7 });
  const cm = std('cover-' + id, bg, { roughness:.7 }), pm = pagesMat;
  const g = new THREE.Group(); g.position.set(-2.78 + .13 - .01, p.y + .018 + h/2, p.z);
  g.add(mk(new THREE.BoxGeometry(.24, h, p.th), [sm, pm, pm, pm, cm, cm], 'book-' + id)); shelf.add(g); books[id] = g;
  tag(g, { type:'item', id, view:'shelf' }, [.1, 0, 0]);
});
const plateTex = s => ctex(256, 64, (x, w, h) => { x.fillStyle = C.brass; x.fillRect(0,0,w,h); x.strokeStyle = '#6e5228'; x.lineWidth = 4; x.strokeRect(4,4,w-8,h-8); x.fillStyle = '#2a1d0e'; x.font = `600 34px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, w/2, h/2+2); });
[2, 3, 4].forEach(lv => { const f = featured[lv]; if (!f) return; const zc = bays[f.bay] + .32 + .02 + f.ids.length*(f.th + .015)/2;
  const pm = new THREE.MeshStandardMaterial({ name:'brass-plate', map:plateTex(f.label), roughness:.4, metalness:.6 });
  shelf.add(mk(new THREE.BoxGeometry(.005, .045, .18), [pm, M.brass, M.brass, M.brass, M.brass, M.brass], 'brass-plate', [-2.605, LV[lv] - .005, zc])); });
// rubber duck on top of shelf
const duck = new THREE.Group(); duck.name = 'rubber-duck'; duck.position.set(-2.75, 2.785, .9); duck.rotation.y = 1.2;
const dkM = pbr('duck', C.yel, { roughness:.35, clearcoat:.6, clearcoatRoughness:.2 });
const dkb = mk(new THREE.SphereGeometry(.05, 20, 14), dkM, 'duck-body'); dkb.scale.set(1, .75, 1.3); duck.add(dkb);
duck.add(mk(new THREE.SphereGeometry(.032, 16, 12), dkM, 'duck-head', [0,.045,.04]));
duck.add(mk(new THREE.ConeGeometry(.012, .03, 8), std('beak', '#e0742c'), 'duck-beak', [0,.042,.077], [Math.PI/2,0,0]));
room.add(duck);

/* ================= display niche ================= */
const niche = new THREE.Group(); niche.name = 'display-niche'; room.add(niche);
const NX0 = -2.35, NX1 = -.55, NZB = -2.92, NZF = -2.5;
niche.add(roomUV(box(NX1 - NX0, 1.75, .04, M.wallL, 'niche-back', [(NX0+NX1)/2, 1.725, NZB])));
[NX0, NX1].forEach(x => niche.add(box(.06, 1.75, NZF - NZB, M.wood, 'niche-side', [x, 1.725, (NZB+NZF)/2])));
niche.add(box(NX1 - NX0 + .06, .06, NZF - NZB, M.wood, 'niche-top', [(NX0+NX1)/2, 2.58, (NZB+NZF)/2]));
const NL = [.86, 1.3, 1.75, 2.2];
NL.forEach(y => niche.add(box(NX1 - NX0, .04, NZF - NZB + .02, M.woodL, 'niche-shelf', [(NX0+NX1)/2, y, (NZB+NZF)/2])));
const cabinet = new THREE.Group(); cabinet.name = 'cabinet'; niche.add(cabinet);
cabinet.add(box(NX1 - NX0 + .12, .84, .5, M.wood, 'niche-cabinet', [(NX0+NX1)/2, .42, -2.67]));
[-1.9, -1.0].forEach(x => cabinet.add(box(.8, .66, .01, M.woodD, 'cabinet-door', [x, .45, -2.415], null, 1)));
[-1.52, -1.38].forEach(x => cabinet.add(cyl(.012, .012, .05, 8, M.brass, 'knob', [x, .5, -2.4], [Math.PI/2,0,0])));
if (has('cab')) tag(cabinet, { type:'item', id:'cab', view:'niche' }, [0,0,.03]);
[[-1.9, 2.55], [-1.0, 2.55]].forEach(([x, y]) => { const s = mk(new THREE.CircleGeometry(.03, 16), new THREE.MeshBasicMaterial({ color:col('#ffe2b0') }), 'downlight', [x, y - .001, -2.72], [Math.PI/2,0,0]); niche.add(s); });
// picture textures (typographic prints)
const printTex = (ch, ink, bg = C.cream) => ctex(256, 320, (x, w, h) => { x.fillStyle = bg; x.fillRect(0,0,w,h); x.fillStyle = '#d9ccad'; x.fillRect(24,24,w-48,h-48); x.fillStyle = bg; x.fillRect(30,30,w-60,h-60);
  x.globalCompositeOperation = 'multiply'; x.font = `700 170px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = C.yel; x.fillText(ch, w/2 - 4, h/2 + 12); x.fillStyle = C.mag; x.fillText(ch, w/2 + 5, h/2 + 9); x.fillStyle = ink; x.fillText(ch, w/2, h/2 + 6); x.globalCompositeOperation = 'source-over'; });
const frame = (w, h, ch, ink, name) => { const g = new THREE.Group(); g.name = name;
  const pm = new THREE.MeshStandardMaterial({ name:'print', map:printTex(ch, ink), roughness:.9 });
  g.add(mk(new THREE.BoxGeometry(w, h, .03), [M.woodD, M.woodD, M.woodD, M.woodD, pm, M.woodD], 'frame'));
  g.add(box(w, .02, .035, M.woodD, 'frame-edge', [0, h/2, .005])); g.add(box(w, .02, .035, M.woodD, 'frame-edge', [0, -h/2, .005]));
  g.add(box(.02, h, .035, M.woodD, 'frame-edge', [w/2, 0, .005])); g.add(box(.02, h, .035, M.woodD, 'frame-edge', [-w/2, 0, .005]));
  return g; };
const exh = {};
if (has('cab')) exh.cab = cabinet;
const place = (g, id, x, y, z, ry = 0, tilt = -.1) => { if (!has(id)) return; g.position.set(x, y, z); g.rotation.set(tilt, ry, 0); niche.add(g); exh[id] = g; tag(g, { type:'item', id, view:'niche' }); };
place(frame(.5, .32, glyph('p1'), C.c800, 'frame-large'), 'p1', -1.65, 2.24 + .17, -2.8, 0, -.05);
const statue = new THREE.Group(); statue.name = 'statue';
const sPts = [[0,0],[.06,0],[.06,.02],[.035,.04],[.04,.12],[.05,.2],[.035,.27],[.045,.31],[.03,.36],[0,.38]].map(([a,b]) => new THREE.Vector2(a, b));
statue.add(mk(new THREE.LatheGeometry(sPts, 32), M.bronze, 'statue-body'));
statue.add(mk(new THREE.SphereGeometry(.03, 16, 12), M.bronze, 'statue-head', [0,.41,0]));
place(statue, 'p2', -.85, 2.22, -2.72, 0, 0);
place(frame(.4, .32, glyph('aw'), C.m800, 'frame-mid'), 'aw', -1.85, 1.77 + .16, -2.82, .08, -.08);
const deskClock = new THREE.Group(); deskClock.name = 'clock';
const clockTex = ctex(256, 256, (x, w, h) => { const d = new Date(); x.fillStyle = C.cream; x.fillRect(0,0,w,h); x.strokeStyle = '#3a2a18'; x.lineWidth = 8; x.beginPath(); x.arc(128,128,118,0,Math.PI*2); x.stroke();
  for (let i = 0; i < 12; i++) { const a = i/12*Math.PI*2; x.lineWidth = i % 3 ? 3 : 7; x.beginPath(); x.moveTo(128 + Math.sin(a)*96, 128 - Math.cos(a)*96); x.lineTo(128 + Math.sin(a)*110, 128 - Math.cos(a)*110); x.stroke(); }
  const hA = ((d.getHours() % 12) + d.getMinutes()/60)/12*Math.PI*2, mA = d.getMinutes()/60*Math.PI*2;
  x.lineCap = 'round'; x.lineWidth = 9; x.beginPath(); x.moveTo(128,128); x.lineTo(128 + Math.sin(hA)*58, 128 - Math.cos(hA)*58); x.stroke();
  x.lineWidth = 5; x.beginPath(); x.moveTo(128,128); x.lineTo(128 + Math.sin(mA)*88, 128 - Math.cos(mA)*88); x.stroke(); x.fillStyle = C.m700; x.beginPath(); x.arc(128,128,8,0,Math.PI*2); x.fill(); });
setInterval(() => clockTex.redraw(), 30000);
deskClock.add(box(.22, .06, .12, M.woodD, 'clock-base', [0,.03,0]));
deskClock.add(cyl(.075, .075, .05, 32, M.brass, 'clock-case', [0,.14,0], [Math.PI/2,0,0]));
deskClock.add(mk(new THREE.CircleGeometry(.066, 32), new THREE.MeshStandardMaterial({ name:'clock-face', map:clockTex, roughness:.5 }), 'clock-face', [0,.14,.026]));
place(deskClock, 'p3', -1.35, 1.77, -2.68, 0, 0);
const fig = new THREE.Group(); fig.name = 'figurine';
const fPts = [[0,0],[.04,0],[.04,.03],[.02,.05],[.025,.14],[.03,.2],[.018,.24],[0,.25]].map(([a,b]) => new THREE.Vector2(a, b));
fig.add(mk(new THREE.LatheGeometry(fPts, 24), std('figurine-wood', '#8a5a34', { roughness:.5 }), 'figurine'));
fig.add(mk(new THREE.SphereGeometry(.022, 12, 10), std('figurine-wood', '#8a5a34'), 'figurine-head', [0,.27,0]));
place(fig, 'g2', -.82, 1.77, -2.72, 0, 0);
const candle = new THREE.Group(); candle.name = 'candle';
candle.add(cyl(.05, .06, .015, 24, M.brass, 'candle-dish', [0,.008,0])); candle.add(cyl(.012, .016, .07, 12, M.brass, 'candle-stem', [0,.05,0]));
candle.add(cyl(.018, .018, .14, 16, M.cream, 'candle-wax', [0,.155,0]));
const flame = mk(new THREE.SphereGeometry(.012, 12, 8), new THREE.MeshBasicMaterial({ name:'flame', color:col('#ffd27a') }), 'flame', [0,.24,0]); flame.scale.set(1, 2.2, 1); flame.castShadow = false; candle.add(flame);
candle.position.set(-2.1, 1.32, -2.7); niche.add(candle);
const candleLight = new THREE.PointLight(0xffb45a, .5, 1.6, 2); candleLight.position.set(-2.1, 1.6, -2.62); room.add(candleLight);
place(frame(.2, .25, glyph('t2'), C.c700, 'frame-small'), 't2', -1.55, 1.32 + .125, -2.78, .15, -.12);
const bottle = new THREE.Group(); bottle.name = 'water-bottle';
const btPts = [[0,0],[.032,0],[.034,.01],[.034,.12],[.026,.15],[.013,.17],[.013,.19],[0,.19]].map(([a,b]) => new THREE.Vector2(a, b));
bottle.add(mk(new THREE.LatheGeometry(btPts, 32), new THREE.MeshStandardMaterial({ name:'bottle-plastic', color:col('#b9d8e6'), transparent:true, opacity:.55, roughness:.1 }), 'bottle'));
bottle.add(cyl(.031, .031, .06, 24, std('bottle-water', '#5aa8cc', { transparent:true, opacity:.6, roughness:.1 }), 'bottle-water', [0,.04,0]));
bottle.add(cyl(.015, .015, .025, 16, std('bottle-cap', C.cyan, { roughness:.4 }), 'bottle-cap', [0,.2,0]));
bottle.add(cyl(.0345, .0345, .035, 32, std('bottle-label', C.cream), 'bottle-label', [0,.09,0], null, true));
place(bottle, 'g4', -1.1, 1.32, -2.66, 0, 0);
const woodBox = new THREE.Group(); woodBox.name = 'wooden-box';
woodBox.add(box(.3, .14, .2, M.woodD, 'box-body', [0,.07,0])); woodBox.add(box(.31, .035, .21, M.wood, 'box-lid', [0,.155,0]));
woodBox.add(box(.04, .03, .01, M.brass, 'box-latch', [0,.12,.105]));
place(woodBox, 'g1', -1.95, .88, -2.7, .1, 0);
place(frame(.38, .3, glyph('g3'), C.ink, 'frame-landscape'), 'g3', -1.05, .88 + .15, -2.8, -.05, -.1);

/* ================= game cabinet: console + CRT, between the niche and the desk ================= */
const tvc = new THREE.Group(); tvc.name = 'tv-cabinet'; tvc.position.set(.055, 0, -2.2); room.add(tvc);
const CW = .7, CH = .77, CD = .42;
// a seventies TV stand: a paler teak with a tighter grain and a brighter lacquer than the rest of the room, hardboard at the back
const teak = pbr('teak', '#c48c58', { map:sheet('wood', 'color', [.8, 1.6]), normalMap:sheet('wood', 'normal', [.8, 1.6]), roughnessMap:sheet('wood', 'rough', [.8, 1.6]), normalScale:new THREE.Vector2(.35, .35), roughness:.45, clearcoat:.6, clearcoatRoughness:.18 });
const hardboard = std('hardboard', '#3b2b1f', { normalMap:grit, roughness:.92 });
[-1, 1].forEach(sx => tvc.add(box(.025, CH - .05, CD, teak, 'cab-side', [sx*(CW/2 - .0125), .05 + (CH - .05)/2, 0])));
tvc.add(box(CW + .02, .03, CD + .02, teak, 'cab-top', [0, CH - .015 + .02, 0]));
tvc.add(box(CW, .025, CD, teak, 'cab-bottom', [0, .0625, 0]));
tvc.add(box(CW - .05, .018, CD - .03, teak, 'cab-shelf', [0, .4, -.01]));
tvc.add(box(CW, CH - .05, .012, hardboard, 'cab-back', [0, .05 + (CH - .05)/2, -CD/2 + .006]));
tvc.add(box(CW, .04, .02, teak, 'cab-plinth', [0, .03, CD/2 - .02]));
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => tvc.add(cyl(.012, .009, .05, 10, teak, 'cab-foot', [a*(CW/2 - .04), .025, b*(CD/2 - .04)])));
// console
const plasticG = pbr('console-grey', '#b9b4aa', { ...plasticTex, roughness:.85, clearcoat:.3 }), plasticD = pbr('console-dark', '#2b2a2c', { ...plasticTex, roughness:.75, clearcoat:.4 });
const con = new THREE.Group(); con.name = 'game-console'; con.position.set(-.07, .41 + .009, .02); tvc.add(con);
con.add(mk(rboxGeo(.3, .06, .22, .012), plasticG, 'console-body', [0, .03, 0]));
con.add(mk(rboxGeo(.3, .02, .1, .006), plasticD, 'console-band', [0, .052, .055]));
con.add(box(.14, .012, .05, plasticD, 'cart-slot', [0, .062, -.04]));
con.add(mk(rboxGeo(.12, .07, .02, .004), std('cartridge', '#3d3b3f', { roughness:.5 }), 'cartridge', [0, .09, -.04]));
con.add(mk(new THREE.PlaneGeometry(.08, .04), std('cart-label', C.cyan, { roughness:.6 }), 'cart-label', [0, .093, -.0295]));
[-.09, -.055].forEach(x => con.add(box(.025, .01, .01, M.ink, 'console-btn', [x, .062, .095])));
const ledMat = new THREE.MeshBasicMaterial({ name:'power-led', color:col('#ff3b30') });
con.add(mk(new THREE.SphereGeometry(.004, 8, 6), ledMat, 'power-led', [.11, .045, .111]));
[.04, .075].forEach(x => con.add(box(.022, .014, .006, M.ink, 'controller-port', [x, .025, .111])));
// controller with cord
const pad = new THREE.Group(); pad.name = 'controller'; pad.position.set(.17, .41 + .009, .15); pad.rotation.y = -.35; tvc.add(pad);
pad.add(mk(rboxGeo(.13, .018, .055, .008), plasticG, 'pad-body', [0, .009, 0]));
const faceTex = texOf(cnv(256, 82, (x, w, h) => { x.fillStyle = '#2b2a2c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8c8a86'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12);
  x.fillStyle = '#1a191b'; x.fillRect(22, 27, 36, 28); x.fillRect(32, 17, 16, 48); x.fillStyle = '#3a393c'; x.beginPath(); x.arc(40, 41, 7, 0, 6.283); x.fill(); // the well the d-pad sits in
  [[170, 36], [212, 46]].forEach(([bx, by]) => { x.fillStyle = '#1a191b'; x.beginPath(); x.arc(bx, by, 14, 0, 6.283); x.fill(); x.fillStyle = '#c8c6c2'; x.font = '700 9px sans-serif'; x.textAlign = 'center'; x.fillText(bx < 200 ? 'B' : 'A', bx, by + 24); });
  x.fillStyle = '#6d6b67'; [96, 128].forEach(sx => { x.beginPath(); x.roundRect ? x.roundRect(sx, 50, 22, 7, 3) : x.rect(sx, 50, 22, 7); x.fill(); }); x.fillStyle = '#c8c6c2'; x.font = '700 7px sans-serif'; x.textAlign = 'center'; x.fillText('SELECT', 107, 47); x.fillText('START', 139, 47);
  x.fillStyle = C.mag; x.font = '700 11px sans-serif'; x.textAlign = 'left'; x.fillText('PLAYBOX', 66, 24); }));
pad.add(mk(new THREE.PlaneGeometry(.11, .035), std('pad-face', '#ffffff', { map:faceTex, roughness:.7 }), 'pad-face', [0, .0185, 0], [-Math.PI/2, 0, 0]));
pad.add(box(.026, .006, .008, plasticG, 'dpad', [-.035, .021, 0])); pad.add(box(.008, .006, .026, plasticG, 'dpad', [-.035, .021, 0]));
[[.03, -.004], [.048, .004]].forEach(([x, z]) => pad.add(cyl(.0065, .0065, .006, 14, std('pad-btn', C.mag, { roughness:.35 }), 'pad-btn', [x, .021, z])));
const cord = new THREE.CatmullRomCurve3([[.15, .428, .13], [.1, .43, .1], [.12, .427, .07], [.005, .44, .05], [.005, .447, .045]].map(p => new THREE.Vector3(...p)));
tvc.add(mk(new THREE.TubeGeometry(cord, 24, .0025, 6), M.ink, 'pad-cord'));
// cartridges on lower shelf: one per Playbox game, the last one leaning on the row
const cartCols = ['#c2412f', '#2e4a3a', C.c800, '#d9a23a', '#3b6c8f', C.m800];
const carts = has('tv') ? ITEMS.tv.list.slice(0, 10) : [];
carts.forEach(([, , name], i) => {
  const lt = ctex(64, 96, (x, w, h) => { x.fillStyle = '#3a383c'; x.fillRect(0, 0, w, h); x.fillStyle = cartCols[i % cartCols.length]; x.fillRect(4, 4, w - 8, h - 8); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(4, 4, w - 8, 10); x.fillStyle = C.cream; x.fillRect(8, h - 22, w - 16, 2); x.fillRect(8, h - 16, w - 28, 2);
    x.font = '700 30px ' + SERIF; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText([...name][0].toUpperCase(), w/2, h/2 - 4); });
  const cm = std('cart-' + i, '#3a383c', { roughness:.5 }); const lm = std('cart-label-' + i, '#fff', { map:lt, roughness:.6 });
  const last = i > 0 && i === carts.length - 1;
  const g = mk(new THREE.BoxGeometry(.022, .1, .075), [lm, cm, cm, cm, cm, cm], 'cartridge-box', [-.27 + i*.027 + (last ? .012 : 0), .075 + .05, .02 + (i % 2) * .01]);
  g.rotation.z = last ? -.28 : 0; tvc.add(g); });
tvc.add(mk(rboxGeo(.14, .016, .06, .006), plasticD, 'spare-pad', [.18, .075 + .008, .05], [0, .3, 0]));
// CRT TV
const tv = new THREE.Group(); tv.name = 'crt-tv'; tv.position.set(0, CH + .02, -.01); tvc.add(tv);
const tvShell = pbr('tv-shell', '#d8cfbd', { ...plasticTex, roughness:.8, clearcoat:.35 }), tvTrim = pbr('tv-trim', '#3a3633', { ...plasticTex, roughness:.7, clearcoat:.4 });
const TW = .42, TH = .34;
tv.add(mk(rboxGeo(TW, TH, .2, .03), tvShell, 'tv-front', [0, TH/2, .07]));
const bk = mk(new THREE.CylinderGeometry(.11, .17, .2, 4, 1), tvShell, 'tv-back', [0, TH/2 - .01, -.11], [Math.PI/2, Math.PI/4, 0]); bk.scale.set(1.05, 1, .85); tv.add(bk);
tv.add(mk(rboxGeo(.3, .26, .012, .02), tvTrim, 'tv-bezel', [-.04, TH/2 + .01, .171]));
let tvF = 0;
const tube = crtMask(512, 400);
const scrTex = ctex(512, 400, (x) => {
  x.save(); x.scale(2, 2); const w = 256, h = 200;
  const f = tvF; x.fillStyle = '#1b2b3f'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#25405e'; for (let i = 0; i < 6; i++) x.fillRect(((i*53 - f*1.5) % 300 + 300) % 300 - 40, 26 + (i % 3)*14, 34, 8);
  x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(205, 38, 14, 0, 6.283); x.fill();
  x.fillStyle = '#3d7a46'; x.fillRect(0, 150, w, 50); x.fillStyle = '#5aa55f'; for (let i = 0; i < w; i += 16) x.fillRect((i - f*3 % 16 + 16) % (w + 16) - 16, 150, 8, 6);
  x.fillStyle = '#8a5a34'; [[60, 118], [150, 100]].forEach(([bx, by]) => { const X = ((bx - f*3) % 300 + 300) % 300 - 20; x.fillRect(X, by, 30, 30); x.fillStyle = '#b07a50'; x.fillRect(X + 3, by + 3, 24, 4); x.fillStyle = '#8a5a34'; });
  const jy = 132 - Math.abs(Math.sin(f*.18))*38; x.fillStyle = C.mag; x.fillRect(48, jy, 16, 18); x.fillStyle = '#f2d2a8'; x.fillRect(50, jy - 10, 12, 10); x.fillStyle = C.cyan; x.fillRect(46, jy - 13, 20, 4);
  x.fillStyle = '#f3f2f2'; x.font = '700 18px monospace'; x.fillText('PLAYBOX', 12, 22); x.fillText(String(1200 + (f*10 % 9000)).padStart(5, '0'), 186, 22);
  if (Math.floor(f/8) % 2) { x.font = '700 14px monospace'; x.fillText('PRESS START', 82, 88); }
  x.restore(); x.globalCompositeOperation = 'multiply'; x.drawImage(tube, 0, 0); x.globalCompositeOperation = 'source-over'; });
const scrGeo = new THREE.PlaneGeometry(.27, .22, 20, 16);
{ const p = scrGeo.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i)/.135, v = p.getY(i)/.11; p.setZ(i, .012 * (1 - u*u) * (1 - v*v)); } scrGeo.computeVertexNormals(); }
const scrMat = new THREE.MeshPhysicalMaterial(lite({ name:'crt-screen', map:scrTex, emissiveMap:scrTex, emissive:col('#ffffff'), emissiveIntensity:1.35, roughness:.15, clearcoat:.6, clearcoatRoughness:.12 }));
const scr = mk(scrGeo, scrMat, 'crt-screen', [-.04, TH/2 + .01, .178]); scr.castShadow = false; tv.add(scr);
// side panel: knobs, speaker grille
tv.add(mk(rboxGeo(.07, .26, .006, .01), tvTrim, 'tv-panel', [.165, TH/2 + .01, .171]));
[.24, .19].forEach(y => tv.add(cyl(.016, .016, .018, 20, M.alu, 'tv-knob', [.165, y, .18], [Math.PI/2, 0, 0])));
for (let i = 0; i < 6; i++) tv.add(box(.044, .004, .004, M.ink, 'grille', [.165, .07 + i*.012, .176]));
tv.add(box(.02, .01, .006, M.ink, 'tv-power', [.165, .14, .176]));
const tvLed = mk(new THREE.SphereGeometry(.003, 8, 6), new THREE.MeshBasicMaterial({ name:'tv-led', color:col('#5cff8a') }), 'tv-led', [.185, .14, .177]); tv.add(tvLed);
tv.add(box(.36, .015, .16, tvTrim, 'tv-foot', [0, .0075, .04]));
// rabbit ears
const ant = new THREE.Group(); ant.name = 'antenna'; ant.position.set(0, TH + .005, -.02); tv.add(ant);
ant.add(mk(new THREE.SphereGeometry(.03, 20, 12, 0, 6.283, 0, Math.PI/2), tvTrim, 'antenna-base'));
[[-.5, .2], [.42, -.25]].forEach(([rz, rx]) => { const r = mk(new THREE.CylinderGeometry(.0018, .003, .3, 6), M.alu, 'antenna-rod', [0, 0, 0]); r.geometry.translate(0, .15, 0); r.rotation.set(rx, 0, rz); r.position.y = .02; ant.add(r); const tip = mk(new THREE.SphereGeometry(.005, 8, 6), M.alu, 'antenna-tip', [0, .3, 0]); r.add(tip); });
// cable to console
const tvCable = new THREE.CatmullRomCurve3([[-.15, CH + .06, -.19], [-.2, CH + .02, -.225], [-.2, .5, -.225], [-.2, .45, -.2], [-.14, .44, -.1]].map(p => new THREE.Vector3(...p)));
tvc.add(mk(new THREE.TubeGeometry(tvCable, 24, .003, 6), M.ink, 'av-cable'));
if (has('tv')) { exh.tv = tvc; tag(tvc, { type:'item', id:'tv', view:'niche' }, [0, 0, .02]); }
setInterval(() => { tvF++; scrTex.redraw(); }, 120);

/* ================= window + outside ================= */
const WIN = { x0:.05, x1:2.65, y0:1.0, y1:2.5 };
const outsideTex = ctex(1024, 600, () => {}, false);
// The garden is a flat backdrop that belongs behind the window. With no roof, a camera that climbs above the walls would see it
// as a billboard standing behind them, so it is only drawn where the line of sight leaves the room below the wall tops.
const gardenMat = new THREE.MeshBasicMaterial({ name:'garden', map:outsideTex });
gardenMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('void main() {', `void main() {
    vec3 d = vWP - cameraPosition;
    float tb = (-2.55 - cameraPosition.z) / d.z, tr = (3.05 - cameraPosition.x) / d.x; // where the sight line crosses the back / right wall
    if (tb > 0.0 && tb < 1.0 && cameraPosition.y + d.y * tb > 2.8) discard;
    if (tr > 0.0 && tr < 1.0 && cameraPosition.z + d.z * tr > -2.55 && cameraPosition.y + d.y * tr > 2.8) discard;`);
};
const outside = mk(new THREE.PlaneGeometry(7, 4.2), gardenMat, 'garden', [1.35, 1.75, -4.6]); outside.castShadow = false; outside.receiveShadow = false; room.add(outside);
const wf = new THREE.Group(); wf.name = 'window'; room.add(wf);
const WZ = -2.55;
wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y1 + .02, WZ]));
wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y0, WZ]));
[WIN.x0, WIN.x1].forEach(x => wf.add(box(.08, WIN.y1 - WIN.y0, .14, M.woodD, 'window-frame', [x, (WIN.y0+WIN.y1)/2, WZ])));
[.917, 1.783].forEach(x => wf.add(box(.05, WIN.y1 - WIN.y0, .08, M.woodD, 'mullion', [x, (WIN.y0+WIN.y1)/2, WZ])));
[1.55, 2.08].forEach(y => wf.add(box(WIN.x1 - WIN.x0, .045, .08, M.woodD, 'transom', [1.35, y, WZ])));
const glass = mk(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), M.glass, 'glass', [1.35, (WIN.y0+WIN.y1)/2, WZ - .02]); glass.castShadow = false; wf.add(glass);
wf.add(box(WIN.x1 - WIN.x0 + .4, .04, .1, M.cream, 'sill', [1.35, WIN.y0 - .02, -2.5]));
[WIN.x0 - .1, WIN.x1 + .1].forEach(x => wf.add(roomUV(box(.12, WIN.y1 - WIN.y0 + .3, .12, M.wallL, 'reveal', [x, (WIN.y0+WIN.y1)/2, -2.5]))));

/* ================= desk ================= */
const desk = new THREE.Group(); desk.name = 'desk'; room.add(desk);
const DY = .76, DZ = -2.0, DX = 1.675;
desk.add(box(2.15, .05, .95, M.wood, 'desk-top', [DX, DY, DZ]));
desk.add(box(2.05, .14, .05, M.woodD, 'desk-apron', [DX, DY - .1, DZ + .44]));
[[.7,-2.42],[2.64,-2.42],[.7,-1.58],[2.64,-1.58]].forEach(([x,z]) => desk.add(box(.06, DY - .025, .06, M.woodD, 'desk-leg', [x, (DY - .025)/2, z])));
desk.add(box(1.94, .03, .04, M.woodD, 'stretcher', [DX, .15, -2.4]));
desk.add(box(.6, .1, .01, M.woodL, 'drawer', [DX, DY - .1, DZ + .468])); desk.add(cyl(.012, .012, .03, 8, M.brass, 'drawer-pull', [DX, DY - .1, DZ + .48], [Math.PI/2,0,0]));
// banker lamp (left)
const lampL = new THREE.Group(); lampL.name = 'desk-lamp'; lampL.position.set(.78, DY + .025, -2.25); desk.add(lampL);
lampL.add(cyl(.09, .1, .02, 32, M.brass, 'lamp-base', [0,.01,0]));
lampL.add(rod([0,.02,0], [0,.42,0], .012, M.brass, 'lamp-stem')); lampL.add(rod([0,.42,0], [.13,.47,.06], .01, M.brass, 'lamp-arm'));
const shadeL = mk(new THREE.ConeGeometry(.09, .13, 32, 1, true), std('lamp-shade', '#2d3a2f', { roughness:.4, metalness:.5, side:THREE.DoubleSide }), 'lamp-shade', [.17,.43,.08], [0,0,-.9]); lampL.add(shadeL);
const bulbL = mk(new THREE.SphereGeometry(.025, 12, 8), new THREE.MeshBasicMaterial({ name:'bulb', color:col('#fff1c9') }), 'bulb', [.19,.39,.08]); bulbL.castShadow = false; lampL.add(bulbL);
// plant
const plant = new THREE.Group(); plant.name = 'plant'; plant.position.set(1.1, DY + .025, -2.28); desk.add(plant);
plant.add(cyl(.085, .1, .02, 24, M.terracotta, 'saucer', [0,.01,0])); plant.add(cyl(.075, .055, .12, 24, M.terracotta, 'pot', [0,.08,0]));
plant.add(cyl(.068, .068, .01, 24, std('soil', '#2a1c12', { normalMap:grit, roughness:1 }), 'soil', [0,.135,0]));
const stalk = std('stalk', '#5d8f3c', { roughness:.7 });
for (let i = 0; i < 11; i++) { const a = i * 2.4, r = .02 + (i % 3) * .02, lg = new THREE.Group(); lg.position.set(Math.cos(a)*r, .14, Math.sin(a)*r); lg.rotation.y = -a;
  lg.add(rod([0,0,0], [.04, .1 + (i%4)*.03, 0], .004, stalk, 'leaf-stem'));
  const lf = mk(new THREE.SphereGeometry(.045, 12, 8), M.leaf, 'leaf', [.07, .12 + (i%4)*.03, 0]); lf.scale.set(1.3, .15, .6); lf.rotation.z = -.5 + (i%3)*.2; lg.add(lf); plant.add(lg); }
// laptop (mermer)
const laptop = new THREE.Group(); laptop.name = 'laptop'; laptop.position.set(1.78, DY + .025, -2.08); laptop.rotation.y = -.05; desk.add(laptop);
laptop.add(box(.5, .016, .34, M.alu, 'laptop-base', [0,.008,0]));
const kbTex = ctex(256, 160, (x, w, h) => { x.fillStyle = '#86847f'; x.fillRect(0,0,w,h); x.fillStyle = '#2a2a2a'; for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) x.fillRect(10 + c*18.4, 10 + r*16, 15, 13); x.fillStyle = '#7a7873'; x.fillRect(80, 100, 96, 52); }, false);
laptop.add(mk(new THREE.PlaneGeometry(.44, .27), new THREE.MeshStandardMaterial({ name:'keyboard', map:kbTex, roughness:.5 }), 'keyboard', [0,.0165,.02], [-Math.PI/2,0,0]));
const screenTex = ctex(512, 320, (x, w, h) => { x.fillStyle = '#0d1117'; x.fillRect(0,0,w,h);
  x.fillStyle = '#e6edf3'; x.font = '600 24px ' + SERIF; x.fillText(GH.username, 30, 46); x.fillStyle = '#8b949e'; x.font = '400 16px ' + SERIF;
  x.fillText(GH.ok ? GH.total.toLocaleString() + ' contributions in ' + GH.year : 'GitHub activity', 30, 72);
  const G = ['#161b22','#0e4429','#006d32','#26a641','#39d353'], cols = 18;
  for (let c = 0; c < cols; c++) for (let d = 0; d < 7; d++) { x.fillStyle = G[(GH.weeks[c] && GH.weeks[c][d]) || 0]; x.fillRect(30 + c*24.2, 96 + d*20.2, 20, 17); }
  x.fillStyle = '#e6edf3'; x.font = '600 20px ' + SERIF; x.fillText(GH.ok ? GH.current + ' 天連續 · 最長 ' + GH.longest + ' 天' : '點開看 GitHub 活動', 30, 252);
  x.fillStyle = '#8b949e'; x.font = '400 15px ' + SERIF; x.fillText('Threads · LinkedIn · Email', 30, 282); });
const lid = new THREE.Group(); lid.position.set(0, .016, -.17); lid.rotation.x = -.28; laptop.add(lid);
lid.add(box(.5, .32, .01, M.alu, 'laptop-lid', [0,.16,-.005]));
lid.add(mk(new THREE.PlaneGeometry(.46, .29), new THREE.MeshBasicMaterial({ name:'screen', map:screenTex }), 'screen', [0,.165,.0015]));
tag(laptop, { type:'list', view:'desk' }, [0,.02,0]);
// drafts
const draftTex = (title, stamp) => ctex(256, 340, (x, w, h) => { x.fillStyle = '#efe8d8'; x.fillRect(0,0,w,h);
  const R = rng(title.length + 5); for (let i = 0; i < 700; i++) { x.fillStyle = (R() < .5 ? 'rgba(120,96,60,' : 'rgba(255,255,255,') + (.04 + R()*.1) + ')'; x.fillRect(R()*w, R()*h, 1 + R()*5, 1); } // fibres in the sheet
  x.fillStyle = C.ink; x.font = `600 22px ${SERIF}`; x.fillText(title, 22, 44, w - 44); x.fillStyle = C.m700; x.font = `italic 400 13px ${SERIF}`; x.fillText(stamp, 22, 66);
  x.strokeStyle = '#6d6a64'; x.lineWidth = 1.6; const n = 9 + title.length % 4; for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(22, 96 + i*20); const L = i === n-1 ? 70 : 190 + Math.sin(i*3.1)*20; for (let s = 0; s < L; s += 6) x.lineTo(22 + s, 96 + i*20 + Math.sin(s*.5 + i)*1.2); x.stroke(); }
  x.strokeStyle = C.m700; x.lineWidth = 2; x.beginPath(); x.moveTo(30, 96 + n*20); x.lineTo(80, 96 + n*20 + 4); x.stroke(); });
const drafts = {};
[['d1', 2.36, -2.12, .18], ['d2', 2.46, -1.98, -.22], ['d3', 2.33, -1.9, .06]].forEach(([id, x, z, r], i) => {
  if (!has(id)) return;
  const g = new THREE.Group(); g.name = 'draft-' + id; g.position.set(x, DY + .027 + i*.0025, z); g.rotation.y = r;
  g.add(mk(new THREE.PlaneGeometry(.21, .28), new THREE.MeshStandardMaterial({ name:'draft-paper', map:draftTex(ITEMS[id].t, (ITEMS[id].k.match(/\d{4}\.\d{2}\.\d{2}/) || ['舊稿'])[0]), normalMap:grit, normalScale:new THREE.Vector2(.3, .3), roughness:.9 }), 'draft-paper', [0,0,0], [-Math.PI/2,0,0]));
  desk.add(g); drafts[id] = g; tag(g, { type:'item', id, view:'desk' }, [0,.03,0]);
});
const pen = rod([2.26, DY + .033, -1.74], [2.42, DY + .033, -1.8], .006, M.ink, 'pen'); desk.add(pen);
// right lamp
const lampR = new THREE.Group(); lampR.name = 'side-lamp'; lampR.position.set(2.56, DY + .025, -2.33); desk.add(lampR);
lampR.add(cyl(.07, .08, .025, 32, M.brass, 'lamp-base', [0,.012,0])); lampR.add(rod([0,.02,0], [0,.5,0], .009, M.brass, 'lamp-stem'));
lampR.add(rod([0,.5,0], [-.12,.56,.05], .008, M.brass, 'lamp-gooseneck'));
const pleats = texOf(cnv(256, 8, (x, w, h) => { for (let i = 0; i < 32; i++) { const g = x.createLinearGradient(i*8, 0, i*8 + 8, 0); g.addColorStop(0, '#8f8f8f'); g.addColorStop(.45, '#fff'); g.addColorStop(1, '#a9a9a9'); x.fillStyle = g; x.fillRect(i*8, 0, 8, h); } }));
const shadeR = mk(new THREE.ConeGeometry(.11, .1, 64, 1, true), std('pleated-shade', '#e8d3a8', { map:pleats, emissiveMap:pleats, roughness:.9, side:THREE.DoubleSide, emissive:col('#ffb15a'), emissiveIntensity:.35 }), 'pleated-shade', [-.16,.52,.06]); lampR.add(shadeR);
// portrait (about)
const portraitTex = ctex(240, 300, (x, w, h) => { x.fillStyle = C.paper; x.fillRect(0,0,w,h);
  x.globalCompositeOperation = 'multiply'; x.font = `700 200px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = C.yel; x.fillText('P', w/2 - 6, h/2 - 2); x.fillStyle = C.mag; x.fillText('P', w/2 + 6, h/2 - 6); x.fillStyle = C.cyan; x.fillText('P', w/2, h/2 - 10);
  x.globalCompositeOperation = 'source-over'; x.fillStyle = C.ink; x.font = `italic 400 22px ${SERIF}`; x.fillText('自畫像', w/2, h - 34); });
const portrait = new THREE.Group(); portrait.name = 'self-portrait'; portrait.position.set(1.3, DY + .025, -2.3); portrait.rotation.set(0, .22, 0); desk.add(portrait);
const pf = new THREE.Group(); pf.position.y = .135; pf.rotation.x = -.16; portrait.add(pf);
const portraitMat = new THREE.MeshStandardMaterial({ name:'portrait', map:portraitTex, roughness:.85 });
pf.add(mk(new THREE.BoxGeometry(.2, .25, .015), [M.brass, M.brass, M.brass, M.brass, portraitMat, M.brass], 'portrait-frame'));
const AVATAR = ABOUT.avatar;
new THREE.TextureLoader().setCrossOrigin('anonymous').load(AVATAR, t => { t.colorSpace = THREE.SRGBColorSpace; const a = t.image.width / t.image.height, fa = .2 / .25; if (a > fa) { t.repeat.set(fa / a, 1); t.offset.set((1 - fa / a) / 2, 0); } else { t.repeat.set(1, a / fa); t.offset.set(0, (1 - a / fa) / 2); } portraitMat.map = t; portraitMat.needsUpdate = true; }, undefined, () => {});
[[.1,0],[-.1,0]].forEach(([x]) => pf.add(box(.012, .25, .02, M.brass, 'frame-edge', [x,0,.003]))); [[.125],[-.125]].forEach(([y]) => pf.add(box(.21, .012, .02, M.brass, 'frame-edge', [0,y,.003])));
portrait.add(rod([0,.01,-.07], [0,.2,-.005], .006, M.brass, 'easel-leg'));
tag(portrait, { type:'about', view:'desk' }, [0,.03,0]);
// mug
const mug = new THREE.Group(); mug.position.set(1.18, DY + .025, -1.75); desk.add(mug);
// glazed ceramic: the glaze breaks paler over the rim and pools darker at the foot
const glaze = pbr('mug', C.mag, { map:texOf(cnv(8, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); [[0,'#fff'],[.07,'#dcdcdc'],[.8,'#d2d2d2'],[1,'#a8a8a8']].forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, w, h); })), roughness:.3, clearcoat:1, clearcoatRoughness:.06 });
mug.add(cyl(.035, .032, .085, 32, glaze, 'mug', [0,.043,0])); mug.add(mk(new THREE.TorusGeometry(.022, .006, 10, 24), glaze, 'mug-handle', [.038,.045,0]));
mug.add(cyl(.031, .031, .002, 24, std('coffee', '#2a160c', { roughness:.06 }), 'coffee', [0,.075,0]));

/* ================= armchair + cat + rug ================= */
const chair = new THREE.Group(); chair.name = 'armchair'; chair.position.set(-1.95, 0, -.75); chair.rotation.y = .55; room.add(chair);
[[-.3,-.28],[.3,-.28],[-.3,.3],[.3,.3]].forEach(([x,z]) => chair.add(box(.05, .32, .05, M.woodD, 'chair-leg', [x,.16,z])));
chair.add(mk(rboxGeo(.72, .14, .7, .04), M.fabricD, 'chair-frame', [0,.36,0]));
const seatCushion = mk(rboxGeo(.6, .11, .6, .045), M.fabric, 'seat-cushion', [0,.47,.02]); chair.add(seatCushion);
chair.add(mk(rboxGeo(.66, .62, .14, .05), M.fabric, 'chair-back', [0,.8,-.31], [-.12,0,0]));
[-.34, .34].forEach(x => { chair.add(mk(rboxGeo(.09, .22, .62, .035), M.fabricD, 'chair-arm', [x,.55,0])); chair.add(box(.1, .04, .66, M.woodL, 'arm-rest', [x,.66,.01])); });
const cat = new THREE.Group(); cat.name = 'cat'; cat.position.set(-.02, .52, .03); cat.rotation.y = .4; chair.add(cat);
const catBody = mk(new THREE.SphereGeometry(.13, 40, 24), M.cat, 'cat-body', [0,.06,0]); catBody.scale.set(1.35, .55, 1); cat.add(catBody);
const head = mk(new THREE.SphereGeometry(.07, 20, 14), M.cat, 'cat-head', [.15,.06,.08]); head.scale.set(1, .85, 1); cat.add(head);
[[.02],[-.02]].forEach(([dz], i) => cat.add(mk(new THREE.ConeGeometry(.022, .05, 4), M.cat, 'cat-ear', [.17, .12, .08 + (i ? -.035 : .035)], [0,0,-.3])));
cat.add(mk(new THREE.SphereGeometry(.035, 12, 10), M.catL, 'cat-muzzle', [.205,.045,.1]));
const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,.04,0), new THREE.Vector3(-.17,.03,.12), new THREE.Vector3(-.05,.025,.17), new THREE.Vector3(.08,.025,.16)]);
cat.add(mk(new THREE.TubeGeometry(tailCurve, 24, .022, 10), M.cat, 'cat-tail'));
[[.08,.13],[.0,.14]].forEach(([x,z]) => { const p = mk(new THREE.SphereGeometry(.025, 10, 8), M.catL, 'cat-paw', [x,.02,z]); p.scale.set(1.4,.6,1); cat.add(p); });
const rugShape = new THREE.Shape(); for (let i = 0; i <= 64; i++) { const a = i/64*Math.PI*2, r = .75 + Math.sin(a*7)*.05 + Math.sin(a*13)*.03; const x = Math.cos(a)*r*1.25, y = Math.sin(a)*r; i ? rugShape.lineTo(x, y) : rugShape.moveTo(x, y); }
const rug = mk(new THREE.ShapeGeometry(rugShape), M.fur, 'fur-rug', [-1.75,.006,-.25], [-Math.PI/2,0,.4]); rug.castShadow = false; room.add(rug);
const furC = cnv(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0,0,w,h); for (let i = 0; i < 9000; i++) { const v = Math.floor(RN()*255); x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(RN()*w, RN()*h, 1.5, 1.5); } });
const furTex = texOf(furC, [9, 9], false);
// the pile is a stack of shells, each a little higher and sparser than the one below; fewer shells is a coarser but much cheaper rug
const FUR = Q.low ? 3 : 6, furShells = [];
for (let i = 1; i <= FUR; i++) { const k = i / FUR, sm = new THREE.MeshStandardMaterial({ name:'fur-shell', color:col('#3a3633').lerp(col('#8a8479'), k * .75), alphaMap:furTex, alphaTest:.12 + k * .765, roughness:1, side:THREE.DoubleSide });
  const shell = new THREE.Mesh(rug.geometry, sm); shell.position.set(-1.75, .006 + k * .038, -.25); shell.rotation.copy(rug.rotation); shell.scale.setScalar(1 - k * .036); shell.receiveShadow = true; room.add(shell); furShells.push(shell); }
// side table + books stack front right
const side = new THREE.Group(); side.position.set(2.6, 0, .9); room.add(side);
side.add(box(.6, .04, .5, M.wood, 'side-top', [0,.6,0])); [[-.26,-.21],[.26,-.21],[-.26,.21],[.26,.21]].forEach(([x,z]) => side.add(box(.04, .58, .04, M.woodD, 'side-leg', [x,.29,z])));
side.add(box(.5, .12, .04, M.woodD, 'side-drawer', [0,.52,.23]));
[[C.c900,.035],[C.m800,.04],[C.cream,.03]].forEach(([c, t], i) => side.add(box(.22 - i*.02, t, .3 - i*.02, std('stack-book', c), 'stack-book', [-.05, .62 + .02 + i*.038, 0], [0, i*.2, 0])));

/* ================= lighting ================= */
const hemi = new THREE.HemisphereLight(0xc6d2dc, 0x4a3a2c, .7); scene.add(hemi);
const amb = new THREE.AmbientLight(0x5a5048, .4); scene.add(amb);
const lampLight = new THREE.PointLight(0xffb066, 1.2, 4.5, 1.6); lampLight.position.set(.96, DY + .36, -2.15); room.add(lampLight);
const lampLight2 = new THREE.PointLight(0xffa850, .8, 3.5, 1.6); lampLight2.position.set(2.42, DY + .5, -2.25); room.add(lampLight2);
// every point light is paid for on every pixel, so the shelf strip and the niche downlights are each one light, placed between the fittings they stand for
const shelfLight = new THREE.PointLight(0xffc27a, 1.2, 4.2, 1.5); shelfLight.position.set(-2.4, 1.9, -.45); room.add(shelfLight);
const nicheLight = new THREE.PointLight(0xffd29a, .8, 1.9, 1.8); nicheLight.position.set(-1.45, 2.05, -2.62); room.add(nicheLight);
// an overcast day's light through the window: cool, soft-edged, from high over the lake
const sunLight = new THREE.DirectionalLight(0xe6edf5, 2.2); sunLight.position.set(2.2, 3.4, -6); sunLight.castShadow = true; sunLight.shadow.mapSize.set(1024, 1024);
Object.assign(sunLight.shadow.camera, { left:-4, right:4, top:4, bottom:-4, near:1, far:14 }); sunLight.shadow.bias = -.0008; sunLight.shadow.radius = 5; sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);
const roomFill = new THREE.PointLight(0xffd8b0, 1.6, 8, 1.2); roomFill.position.set(.5, 2.4, .5); room.add(roomFill);

/* environment reflections */
const pmrem = new THREE.PMREMGenerator(renderer);
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2.9, 6), new THREE.MeshBasicMaterial({ color:0x6e5a48, side:THREE.BackSide })));
  const add = (geo, c, k, p) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:new THREE.Color(c).multiplyScalar(k) })); m.position.set(...p); es.add(m); };
  add(new THREE.PlaneGeometry(2.6, 1.5), '#dfeaf0', 3.5, [1.35, .35, -2.9]);
  add(new THREE.SphereGeometry(.12, 12, 8), '#ffc27a', 4, [.56, -.6, -2.15]);
  add(new THREE.SphereGeometry(.14, 12, 8), '#ffb066', 3, [2.42, -.45, -2.25]);
  add(new THREE.BoxGeometry(.05, 2.4, 3.8), '#ffbe78', .8, [-2.7, .1, -.4]);
  add(new THREE.BoxGeometry(1.6, .05, .3), '#ffd8a0', 1, [-1.45, 1.1, -2.7]);
  add(new THREE.PlaneGeometry(5.6, 5.6).rotateX(Math.PI/2), '#dfeaf0', 2.2, [0, 1.38, 0]); // the open roof: sky light from above
  scene.environment = pmrem.fromScene(es, .03).texture; scene.environmentIntensity = .7;
}

/* glow halos */
const haloTex = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2); g.addColorStop(0, 'rgba(255,230,180,1)'); g.addColorStop(.18, 'rgba(255,200,130,.55)'); g.addColorStop(.5, 'rgba(255,170,90,.12)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0,0,w,h); }, false);
const halo = (p, size, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:haloTex, transparent:true, opacity:op, depthWrite:false, blending:THREE.AdditiveBlending })); sp.position.set(...p); sp.scale.set(size, size, 1); sp.userData.op = op; room.add(sp); return sp; };
halo([.97, DY + .4, -2.17], .32, .2); halo([2.4, DY + .52, -2.27], .5, .16);
const candleHalo = halo([-2.1, 1.56, -2.7], .22, .28);
[[-1.9, 2.5], [-1.0, 2.5]].forEach(([x, y]) => halo([x, y, -2.72], .16, .18));

/* dust in lamplight */
const DN = 160, dPos = new Float32Array(DN*3), dSeed = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dPos[i*3] = -.2 + RN()*3; dPos[i*3+1] = .8 + RN()*1.7; dPos[i*3+2] = -2.4 + RN()*1.8; dSeed[i] = RN(); }
const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
const dustMat = new THREE.PointsMaterial({ size:.008, color:col('#ffdcaa'), transparent:true, opacity:.25, depthWrite:false, blending:THREE.AdditiveBlending, map:haloTex });
const dust = new THREE.Points(dGeo, dustMat); dust.frustumCulled = false; room.add(dust);
let dustN = Q.low ? DN / 2 : DN; dGeo.setDrawRange(0, dustN);

/* contact shadows / ambient occlusion decals */
const aoRad = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.55, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0,0,w,h); }, false);
const aoLin = ctex(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(.4, 'rgba(0,0,0,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0,0,w,h); }, false);
const decal = (tex, w, h, p, r, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:tex, color:0x000000, transparent:true, opacity:op, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2 })); m.position.set(...p); m.rotation.set(...r); m.renderOrder = 1; room.add(m); return m; };
const FL = [-Math.PI/2, 0, 0];
decal(aoRad, 1.3, 1.25, [-1.95, .004, -.75], [-Math.PI/2, 0, -.55], .9);
decal(aoRad, 2.55, 1.4, [1.675, .004, -1.95], FL, .75);
decal(aoRad, .9, .8, [2.6, .004, .9], FL, .8);
decal(aoRad, 2.2, .9, [-1.45, .004, -2.42], FL, .8);
decal(aoRad, .95, .62, [.055, .004, -2.2], FL, .85);
decal(aoLin, 6, .45, [0, .005, -2.27], [-Math.PI/2, 0, Math.PI], .8);
decal(aoLin, 4.2, .5, [-2.33, .005, -.43], [-Math.PI/2, 0, -Math.PI/2], .85);
decal(aoLin, 6, .5, [2.77, .005, 0], [-Math.PI/2, 0, Math.PI/2], .7);
decal(aoLin, 6, .55, [0, .28, -2.494], [0, 0, Math.PI], .6);
decal(aoLin, 6, .55, [2.995, .28, 0], [0, -Math.PI/2, Math.PI], .6);
const DT = DY + .0265;
[[1.78, -2.08, .62, .46], [.78, -2.25, .26, .26], [1.1, -2.28, .26, .26], [2.56, -2.33, .22, .22], [1.3, -2.3, .26, .18], [1.18, -1.75, .12, .12]].forEach(([x, z, w, d]) => decal(aoRad, w, d, [x, DT, z], FL, .7));
LV.slice(1, 8).forEach(y => decal(aoLin, SZ1 - SZ0, .12, [-2.788, y - .02, (SZ0 + SZ1)/2], [0, Math.PI/2, Math.PI], .55));

/* ================= seasons ================= */
const SKY = {
  '春': { trees:['#6aa35a','#87b86b','#e6a3bd','#f1c2d2','#4f8a4a'], part:'#f1b8cc', shape:'petal', n:140, speed:.35, sway:.5, size:.035 },
  '夏': { trees:['#3f7a3e','#2f6232','#5c9550','#264f2a','#4b8746'], part:'#b8d4e4', shape:'rain', n:500, speed:4.5, sway:0, size:.06 },
  '秋': { trees:['#c46a2c','#d9932f','#a8432a','#e2b246','#6f6a35'], part:'#d4782e', shape:'leaf', n:90, speed:.45, sway:.7, size:.05 },
  '冬': { trees:['#e9eef1','#c5cfd5','#8a979e','#f4f6f7','#a7b3b9'], part:'#ffffff', shape:'snow', n:420, speed:.5, sway:.25, size:.03 },
};
const season = (() => { const mo = new Date().getMonth() + 1; return mo >= 3 && mo <= 5 ? '春' : mo >= 6 && mo <= 8 ? '夏' : mo >= 9 && mo <= 11 ? '秋' : '冬'; })();
const shapeTex = kind => ctex(64, 64, (x, w, h) => { x.clearRect(0,0,w,h); x.fillStyle = '#fff'; x.beginPath();
  if (kind === 'rain') x.fillRect(30, 2, 3, 60); else if (kind === 'leaf') { x.ellipse(32,32,26,13,.6,0,Math.PI*2); x.fill(); } else if (kind === 'petal') { x.ellipse(32,32,20,12,0,0,Math.PI*2); x.fill(); } else { x.arc(32,32,18,0,Math.PI*2); x.fill(); } }, false);
const PN = 500, pPos = new Float32Array(PN*3), pSeed = new Float32Array(PN);
const OUT = { x0:-.6, x1:3.3, z0:-4.3, z1:-2.75, y0:0, y1:3.2 };
for (let i = 0; i < PN; i++) { pPos[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); pPos[i*3+1] = Math.random()*OUT.y1; pPos[i*3+2] = OUT.z0 + Math.random()*(OUT.z1-OUT.z0); pSeed[i] = Math.random(); }
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ size:.05, transparent:true, depthWrite:false, alphaTest:.2 });
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; room.add(points);
let partN = 0;
{ const w = SKY[season]; // dress the window for the season: the garden behind the glass, and what falls past it
  paintLakeView(outsideTex.image, { trees:w.trees, bare:season === '冬' }); outsideTex.needsUpdate = true;
  pMat.map = shapeTex(w.shape); pMat.color.set(w.part); pMat.size = w.size; pMat.needsUpdate = true; partN = Q.low ? Math.ceil(w.n / 2) : w.n; pGeo.setDrawRange(0, partN); }

/* ================= UI ================= */
const st = { seen:{}, cur:null };
const $ = id => document.getElementById(id);
let toastT; const toast = t => { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); };
const panel = $('panel'), pbody = $('pbody');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const where = id => ({ shelf:'書架', display:'展示架', desk:'書桌' }[ITEMS[id].cat]);
const ghostBtn = 'justify-content:flex-start;margin-left:-6px;text-align:left;text-decoration:none';
const linkBtns = ls => ls && ls.length ? `<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin:var(--space-4) 0">${ls.map(l => `<a class="btn ${l.p ? 'btn-primary' : 'btn-secondary'}" href="${esc(l.u)}"${linkAttrs(l.u)} style="text-decoration:none">${esc(l.l)}</a>`).join('')}</div>` : '';
function renderPanel(mode) {
  let h = '';
  if (mode === 'about') { h = '<span class="card-kicker">書桌 · 自畫像</span><div style="display:flex;gap:var(--space-4);align-items:center;margin:var(--space-3) 0 var(--space-4)"><img src="' + esc(AVATAR) + '" alt="' + esc(ABOUT.name) + '" style="width:88px;height:88px;object-fit:cover;border-radius:var(--radius-md);box-shadow:var(--shadow-sm)"><div><div style="font-size:14px;font-style:italic">Hi, I&#39;m</div><h2 style="margin:0">' + esc(ABOUT.name) + '</h2><div style="font-size:14px;margin-top:4px">' + esc(ABOUT.tagline) + '</div></div></div>'
      + '<div class="body"><p>' + esc(ABOUT.bio) + '</p><p>' + esc(ABOUT.summary) + '</p></div>'
      + '<div class="rel"><span class="lab card-kicker">Find me at</span>' + ABOUT.channels.map(([k, v, u]) => '<a class="btn btn-ghost" href="' + esc(u) + '"' + linkAttrs(u) + ' style="' + ghostBtn + '">' + esc(k) + '：' + esc(v) + '</a>').join('') + '</div>'
; }
  else if (mode === 'list') { const recent = IDS.filter(k => /^w\d$/.test(k));
    h = '<span class="card-kicker">書桌 · 筆電</span><h2>GitHub 活動</h2><p class="intro">' + (GH.ok ? `過去 18 週，${GH.year} 年共 ${GH.total.toLocaleString()} 次 contributions。目前連續 ${GH.current} 天，最長 ${GH.longest} 天。` : '活動統計暫時讀不到，直接去 GitHub 看吧。') + '</p>'
      + linkBtns(ABOUT.channels.filter(c => c[0] === 'GitHub' || c[0] === 'Threads').map(c => c[0] === 'GitHub' ? { l:`GitHub · ${c[1]} ↗`, u:c[2], p:1 } : { l:'Threads ↗', u:c[2] }))
      + (recent.length ? '<div class="rel"><span class="lab card-kicker">最近 ' + recent.length + ' 篇 →</span>' + recent.map(k => '<button class="btn btn-ghost" data-item="' + k + '" style="' + ghostBtn + '">' + esc(ITEMS[k].t) + '</button>').join('') + '</div>' : ''); }
  else { const it = ITEMS[st.cur];
    const accent2 = it.kind === 'older';
    h += `<div style="margin-top:var(--space-2)"><span class="card-kicker"${accent2 ? ' style="color:var(--color-accent-2-700)"' : ''}>${esc(it.k)}</span><h3>${esc(it.t)}</h3>${it.by ? `<div style="font-size:15px;font-style:italic;margin-top:-6px">${esc(it.by)}</div>` : ''}</div>`;
    if (it.tech && it.tech.length) h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:var(--space-2) 0 var(--space-3)">${it.tech.map(t => `<span class="tag tag-neutral">${esc(t)}</span>`).join('')}</div>`;
    if (it.list) h += `<div class="list" style="gap:var(--space-4);margin-bottom:var(--space-4)">${it.list.map(([y, kind, t, org, u]) => `<a href="${esc(u)}"${linkAttrs(u)} style="display:flex;flex-direction:column;gap:2px;text-decoration:none;color:var(--color-text)"><span class="card-kicker">${esc(y)} · ${esc(kind)}</span><span style="font-family:var(--font-heading);font-weight:600;font-size:20px;line-height:1.3">${esc(t)} ↗</span>${org ? `<span style="font-size:14px">${esc(org)}</span>` : ''}</a>`).join('')}</div>`;
    if (it.pct != null) h += `<div style="margin:var(--space-4) 0 var(--space-3)"><div class="prog"><i style="width:${it.pct}%"></i></div><span style="font-size:13px">已讀 ${it.pct}%</span></div>`;
    h += `<div class="body">${it.b.map(p => `<p${p.startsWith('（') ? ' style="font-style:italic"' : ''}>${esc(p)}</p>`).join('')}</div>`;
    h += linkBtns(it.links);
    h += `<div class="meta">${esc(it.m)}</div>`;
    const rel = related(st.cur);
    if (rel.length) h += `<div class="rel"><span class="lab card-kicker">順手再翻 →</span>${rel.map(r => `<button class="btn btn-ghost" data-rel="${r}" style="${ghostBtn}">${where(r)}：${esc(ITEMS[r].t)}</button>`).join('')}</div>`;
  }
  pbody.innerHTML = h; panel.scrollTop = 0; panel.classList.add('open'); document.body.classList.add('reading');
}
panel.addEventListener('click', e => {
  const a = e.target.closest('[data-act],[data-item],[data-rel]'); if (!a) return;
  if (a.dataset.item) return openItem(a.dataset.item);
  if (a.dataset.rel) return openItem(a.dataset.rel);
  if (a.dataset.act === 'close') closePanel();
});

/* ================= camera focus ================= */
const objOf = id => books[id] || exh[id] || drafts[id] || null;
const VIEWS = { shelf:new THREE.Vector3(1, .12, .25), niche:new THREE.Vector3(.12, .1, 1), desk:new THREE.Vector3(-.1, .75, 1) };
const DIST = { shelf:1.15, niche:1.55, desk:1.35 };
let tween = null, focused = false;
function flyTo(tgt, pos, d = 1) { tween = { t:0, d, ft:controls.target.clone(), tt:tgt.clone(), fp:camera.position.clone(), tp:pos.clone() }; controls.enabled = false; }
function focus(obj, view) { obj.updateMatrixWorld(); const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()); const dir = VIEWS[view].clone(); if (view === 'niche' && c.y < 1.5) dir.y = .55; dir.normalize(); flyTo(c, c.clone().addScaledVector(dir, DIST[view])); focused = true; }
function goHome() { flyTo(HOME.tgt, HOME.pos, 1.1); focused = false; }
function mark(id) { if (!st.seen[id]) { st.seen[id] = true; const c = ITEMS[id].cat, ids = IDS.filter(k => ITEMS[k].cat === c); if (ids.every(k => st.seen[k])) toast(`${CATS.find(x => x.id === c).name}的東西都翻過了`); if (IDS.every(k => st.seen[k]) && !st.allDone) { st.allDone = true; setTimeout(() => toast('整間書房都翻遍了。貓表示佩服。'), 2700); } } }
function openItem(id) { const it = ITEMS[id];
  if (books[id]) return openBook(id);
  if (drafts[id]) return openDraft(id);
  if (it.kind === 'play' && GAMES.length) { if (id !== 'tv') mark(id); return openTV(id === 'tv' ? 0 : Math.max(0, gameAt(id))); }
  st.cur = id; mark(id); const o = objOf(id); if (o) focus(o, exh[id] ? 'niche' : 'desk'); renderPanel('item'); }
function openList() { focus(laptop, 'desk'); renderPanel('list'); }
function openAbout() { focus(portrait, 'desk'); renderPanel('about'); }
function closePanel() { panel.classList.remove('open'); document.body.classList.remove('reading'); goHome(); }
addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if (TV.on) { if (e.key === 'Escape') TV.play ? tvMenu() : exitTV(); else if (!TV.play && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); tvSel((TV.sel + (e.key === 'ArrowDown' ? 1 : -1) + GAMES.length) % GAMES.length); } else if (!TV.play && e.key === 'Enter') tvPlay(); return; }
  if (RD.mode) { const nx = e.key === 'ArrowRight', pv = e.key === 'ArrowLeft';
    if (e.key === 'Escape') closeReader(); else if (nx || pv) { e.preventDefault(); RD.mode === 'book' ? flip(nx ? 1 : -1) : stepDraft(nx ? 1 : -1); } return; }
  if (e.key === 'Escape') closePanel(); });

/* ================= pick-up readers + TV ================= */
// Books, the pages on the desk and the TV don't open the side panel: the thing itself comes to the camera
// (or the camera goes to it), and a DOM stand-in takes over from the mesh once it is close enough to read.
scene.add(camera);
let lockCam = false;
const KLAB = { reading:'書單', mybook:'我出的書', writing:'文章', series:'系列', older:'較早的文章', cabinet:'作品櫃', project:'Side Project', play:'Playbox', award:'競賽與演講' };
const DRAFTS = IDS.filter(k => drafts[k]);
const GAMES = has('tv') ? ITEMS.tv.list : [];
const gameAt = id => GAMES.findIndex(r => r[4] === ((ITEMS[id].links || [])[0] || {}).u);
const TV = { on:false, vis:false, play:false, sel:0 };
const RD = { mode:null, busy:false, id:null }, BK = { pages:[], i:0, single:false, D:null, art:null, ret:null };
const LF = { obj:null, anim:0, t:0, dur:.8, cb:null };
const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
const reader = $('reader'), robj = $('robj'), rnav = $('rnav'), tvui = $('tvui'), crt = $('crt'), tvbar = $('tvbar');
const pad2 = n => String(n).padStart(2, '0');

/* article bodies, fetched the first time something that holds one is picked up */
const artCache = {};
function tidyArticle(html) {
  const t = document.createElement('template'); t.innerHTML = html; const f = t.content;
  f.querySelectorAll('.anchor-link, script, style, link').forEach(e => e.remove());
  f.querySelectorAll('details').forEach(e => e.setAttribute('open', ''));
  f.querySelectorAll('img').forEach(e => e.setAttribute('loading', 'eager'));
  // a page is drawn several times over while it turns, so a live embed becomes a way out to it instead
  f.querySelectorAll('iframe').forEach(e => { const a = document.createElement('a'); a.className = 'embed-out'; a.href = e.getAttribute('src'); a.textContent = (e.getAttribute('title') || '內嵌內容') + ' ↗'; (e.closest('.dartpad-container, .video-container') || e).replaceWith(a); });
  f.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  return t.innerHTML.trim();
}
const loadArticle = aid => artCache[aid] || (artCache[aid] = fetch(SITE.study + aid + '/').then(r => r.ok ? r.text() : Promise.reject(r.status)).then(tidyArticle).catch(() => { delete artCache[aid]; return ''; }));

function grab(obj, kind) {
  Object.assign(LF, { obj, kind, parent:obj.parent, lp:obj.userData.base.clone(), lq:obj.quaternion.clone(), ls:obj.scale.clone(), dur:kind === 'book' ? 1.0 : .8 });
  obj.userData.lifted = true; camera.updateMatrixWorld(); obj.updateWorldMatrix(true, false); camera.attach(obj);
  LF.s = obj.position.clone(); LF.qs = obj.quaternion.clone();
  const dir = obj.userData.pull.clone().normalize().applyQuaternion(LF.parent.getWorldQuaternion(_q)).applyQuaternion(camera.quaternion.clone().invert());
  LF.c = LF.s.clone().addScaledVector(dir, kind === 'book' ? .34 : .16);
  const hgt = kind === 'book' ? .3 : .28, d = (hgt / (kind === 'book' ? .5 : .56)) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  LF.e = new THREE.Vector3(0, -.01, -d);
  LF.qe = new THREE.Quaternion().setFromEuler(kind === 'book' ? new THREE.Euler(.06, Math.PI + .38, 0) : new THREE.Euler(Math.PI / 2 - .16, 0, .05));
}
function release() { const o = LF.obj; if (!o) return; LF.parent.add(o); o.position.copy(LF.lp); o.quaternion.copy(LF.lq); o.scale.copy(LF.ls); o.visible = true; o.userData.lifted = false; LF.obj = null; }
function liftStep(dt) {
  if (!LF.anim) return;
  LF.t = Math.min(1, Math.max(0, LF.t + LF.anim * dt / LF.dur));
  const t = LF.t, k = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2, u = 1 - k, o = LF.obj;
  o.position.set(0, 0, 0).addScaledVector(LF.s, u*u).addScaledVector(LF.c, 2*u*k).addScaledVector(LF.e, k*k);
  const kq = Math.min(1, Math.max(0, (k - .12) / .88)); o.quaternion.slerpQuaternions(LF.qs, LF.qe, kq*kq*(3 - 2*kq));
  if ((LF.anim > 0 && t >= 1) || (LF.anim < 0 && t <= 0)) { const back = LF.anim < 0; LF.anim = 0; if (back) release(); const cb = LF.cb; LF.cb = null; cb && cb(); }
}
function projRect(obj) {
  obj.updateWorldMatrix(true, true); camera.updateMatrixWorld(); const b = new THREE.Box3().setFromObject(obj); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < 8; i++) { _v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera); const X = (_v.x + 1) / 2 * innerWidth, Y = (1 - _v.y) / 2 * innerHeight; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
  return { x:x0, y:y0, w:x1 - x0, h:y1 - y0 };
}
const flipT = (F, P) => 'translate(' + (P.x - F.left) + 'px, ' + (P.y - F.top) + 'px) scale(' + (P.w / F.width) + ', ' + (P.h / F.height) + ')';
function immerse() { if (panel.classList.contains('open')) { panel.classList.remove('open'); document.body.classList.remove('reading'); } document.body.classList.add('immerse'); tween = null; lockCam = true; controls.enabled = false; tip.style.opacity = 0; hoverRoot = null; }
function unimmerse() { lockCam = false; if (!tween) controls.enabled = true; document.body.classList.remove('immerse'); }

/* pages off the desk: lift one, read it top to bottom, bookmarks switch to the others */
function openDraft(id) { if (RD.mode || RD.busy || LF.anim || TV.on) return; immerse(); RD.busy = true; mark(id); st.cur = id; loadArticle(ITEMS[id].aid); grab(drafts[id], 'paper'); LF.t = 0; LF.anim = 1; LF.cb = () => showPaper(id); }
function fillPaper(id) {
  const it = ITEMS[id], p = $('paper'), pg = p.querySelector('.pg'), lead = '<p>' + esc(it.b[0] || '') + '</p>';
  pg.innerHTML = '<span class="kick">' + esc(it.k) + '</span><h3 class="ttl">' + esc(it.t) + '</h3><div class="prose paper">' + lead + '<p class="loading">翻開稿紙……</p></div><div class="foot"><span>' + esc(it.m) + '</span><span>' + (DRAFTS.indexOf(id) + 1) + ' / ' + DRAFTS.length + '</span></div>';
  pg.scrollTop = 0;
  p.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === id));
  loadArticle(it.aid).then(html => { const b = pg.querySelector('.prose'); if (RD.mode === 'paper' && RD.id === id && b) b.innerHTML = html || lead + '<p class="loading">（全文暫時讀不到。）</p>'; });
}
function showPaper(id) {
  RD.mode = 'paper'; RD.id = id;
  const h = Math.min(innerHeight * .84, 880), w = Math.min(h * .75, innerWidth * .8), u = Math.min(1, w / 525), extra = Math.min(2, DRAFTS.length - 1);
  robj.innerHTML = '<div id="paper" class="obj" style="--u:' + u.toFixed(3) + ';width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;left:' + Math.round((innerWidth - w) / 2 - 18 * u) + 'px;top:' + Math.max(8, Math.round((innerHeight - h) / 2 - 24)) + 'px">'
    + ['rotate(2.4deg) translate(1.5%, 1%)', 'rotate(-1.6deg) translate(-.5%, .5%)'].slice(0, extra).map(t => '<div class="stack" style="transform:' + t + '"></div>').join('')
    + '<article class="pg" tabindex="0"></article>' + DRAFTS.map((d, i) => '<button class="tab" data-tab="' + d + '" style="top:calc(var(--u) * ' + (56 + i * 166) + 'px)">' + pad2(i + 1) + '　' + esc(ITEMS[d].sp || ITEMS[d].t) + '</button>').join('') + '</div>';
  fillPaper(id); reader.classList.add('on'); updNav(); requestAnimationFrame(() => reader.classList.add('vis'));
  const el = $('paper'), F = el.getBoundingClientRect(), P = projRect(LF.obj);
  el.animate([{ transform:flipT(F, P), opacity:0 }, { opacity:1, offset:.28 }, { transform:'none', opacity:1 }], { duration:640, easing:'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => { RD.busy = false; el.querySelector('.pg').focus({ preventScroll:true }); };
  setTimeout(() => LF.obj && (LF.obj.visible = false), 200);
}
function switchDraft(id) {
  if (RD.mode !== 'paper' || RD.busy || id === RD.id) return; RD.busy = true; mark(id); st.cur = id;
  const dir = DRAFTS.indexOf(id) > DRAFTS.indexOf(RD.id) ? 1 : -1; RD.id = id;
  release(); grab(drafts[id], 'paper'); LF.obj.position.copy(LF.e); LF.obj.quaternion.copy(LF.qe); LF.t = 1; LF.obj.visible = false;
  const pg = $('paper').querySelector('.pg');
  const a1 = pg.animate([{ transform:'none', opacity:1 }, { transform:'translate(' + (-dir * 26) + '%, ' + (dir * 3) + '%) rotate(' + (-dir * 7) + 'deg)', opacity:0 }], { duration:300, easing:'cubic-bezier(.5,0,.75,0)', fill:'forwards' });
  a1.onfinish = () => { fillPaper(id); updNav(); a1.cancel(); pg.animate([{ transform:'translate(' + (dir * 4) + '%, 2%) rotate(' + (dir * 1.5) + 'deg)', opacity:0 }, { transform:'none', opacity:1 }], { duration:380, easing:'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => { RD.busy = false; }; };
}
const stepDraft = d => switchDraft(DRAFTS[(DRAFTS.indexOf(RD.id) + d + DRAFTS.length) % DRAFTS.length]);

/* books: pull off the shelf, open the cover, turn pages */
const FG = 40, TOC_ROWS = 6; // gap between the columns an article is poured into; contents entries per page
function bookDims() {
  const single = innerWidth < 760; let H = Math.min(innerHeight * .78, 720), pw;
  if (single) { pw = Math.min(innerWidth * .86, H * .7); H = pw / .7; } else { pw = H * .7; const mx = innerWidth * .9 / 2.06; if (pw > mx) { pw = mx; H = pw / .7; } }
  const u = H / 640;
  return { single, H, pw, u, m:Math.round(H * .022), W:single ? pw : pw * 2, fw:Math.floor(pw - 100 * u), fh:Math.floor(H - 124 * u), fs:Math.max(13, 16.5 * u) };
}
const flowCss = D => 'width:' + D.fw + 'px;height:' + D.fh + 'px;column-width:' + D.fw + 'px;column-gap:' + FG + 'px;font-size:' + D.fs.toFixed(1) + 'px;--fh:' + D.fh + 'px';
// how many pages an article runs to: pour it into page-sized columns off screen and count them
async function countCols(html, D) {
  const el = document.createElement('div'); el.className = 'prose flow'; el.style.cssText = flowCss(D) + ';position:fixed;left:0;top:0;visibility:hidden;pointer-events:none'; el.innerHTML = html; document.body.appendChild(el);
  const imgs = [...el.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }));
  await Promise.race([Promise.all([document.fonts && document.fonts.ready, ...imgs]), new Promise(r => setTimeout(r, 2500))]);
  const n = Math.max(1, Math.round((el.scrollWidth + FG) / (D.fw + FG))); el.remove(); return n;
}
const endpaper = kind => '<div class="endp"><div class="exlib"><span>EX LIBRIS</span><b>' + esc(ABOUT.name.split(' ')[0]) + ' 的書房</b><span>' + KLAB[kind] + '</span></div></div>';
function closePages(P, id) {
  const rel = id ? related(id) : [];
  if (rel.length) P.push('<span class="sec">順手再翻</span><div class="rel">' + rel.map(r => '<button class="btn btn-ghost" data-rel="' + r + '">' + where(r) + '：' + esc(ITEMS[r].t) + ' →</button>').join('') + '</div>');
  if (P.length % 2) P.push('<div class="colo">— 完 —</div>');
  return P;
}
function articlePages(it, html, n, id) {
  const P = [endpaper(it.kind), '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + (it.b && it.b[0] ? '<p class="by">' + esc(it.b[0]) + '</p>' : '') + '<span class="foot">' + esc(it.m) + '</span>'];
  if (html) for (let k = 0; k < n; k++) P.push({ col:k });
  else P.push('<span class="sec">內容</span><div class="body"><p><em>（全文暫時讀不到。）</em></p></div>');
  return closePages(P, id);
}
async function bookPages(id, D) {
  const it = ITEMS[id];
  if (it.aid) { const html = await loadArticle(it.aid); return { art:{ t:it.t, html }, pages:articlePages(it, html, html ? await countCols(html, D) : 0, id) }; }
  const body = '<div class="body">' + it.b.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>';
  if (it.toc) {
    const P = [endpaper(it.kind), '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + body + linkBtns(it.links) + '<span class="foot">' + esc(it.m) + '</span>'];
    for (let a = 0; a < it.toc.length; a += TOC_ROWS) P.push('<span class="sec">目錄 · ' + (a + 1) + '–' + Math.min(a + TOC_ROWS, it.toc.length) + ' / ' + it.toc.length + '</span><div class="toc">'
      + it.toc.slice(a, a + TOC_ROWS).map(([aid, t, d]) => '<button data-art="' + aid + '"><span>' + esc(d) + '</span><b>' + esc(t) + '</b></button>').join('') + '</div>');
    return { art:null, pages:closePages(P, id) };
  }
  // a book from the reading list: its card
  return { art:null, pages:closePages([endpaper(it.kind),
    (it.cover ? '<img class="cover-img" src="' + esc(it.cover) + '" alt="">' : '') + '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + (it.by ? '<p class="by">' + esc(it.by) + '</p>' : '') + '<span class="foot">' + esc(ABOUT.name) + ' 的書單</span>',
    '<span class="sec">書卡</span>' + body + (it.pct != null ? '<div><div class="prog"><i style="width:' + it.pct + '%"></i></div><span style="font-size:13px">已讀 ' + it.pct + '%</span></div>' : '') + linkBtns(it.links) + '<span class="foot">' + esc(it.m) + '</span>'], id) };
}
function openBook(id) {
  if (RD.mode || RD.busy || LF.anim || TV.on) return; immerse(); RD.busy = true; mark(id); st.cur = id;
  const D = bookDims(), prep = bookPages(id, D); grab(books[id], 'book'); LF.t = 0; LF.anim = 1; LF.cb = () => prep.then(b => showBook(id, D, b));
}
function pageHTML(i) {
  const p = BK.pages[i], D = BK.D; if (p == null) return '';
  const body = typeof p === 'string' ? p : '<span class="rh">' + esc(BK.art.t) + '</span><div class="win" style="width:' + D.fw + 'px;height:' + D.fh + 'px"><div class="prose flow" style="' + flowCss(D) + ';transform:translateX(' + (-p.col * (D.fw + FG)) + 'px)">' + BK.art.html + '</div></div>';
  return '<div class="pc">' + body + '</div>' + (i > 0 ? '<span class="pn">' + i + '</span>' : '');
}
const setPage = (el, i) => { el.innerHTML = pageHTML(i); };
const coverHTML = it => '<i class="band" style="top:6%"></i><i class="band" style="bottom:6%"></i><span class="ck">' + KLAB[it.kind] + '</span><b>' + esc(it.t) + '</b>' + (it.by ? '<span class="cb">' + esc(it.by) + '</span>' : '') + '<span class="cf">' + esc(ABOUT.name.split(' ')[0]) + ' 的書房</span>';
function showBook(id, D, b) {
  Object.assign(BK, { pages:b.pages, art:b.art, ret:null, D, single:D.single, i:D.single ? 1 : 0 }); RD.mode = 'book'; RD.id = id;
  const it = ITEMS[id], [bg, fg] = fCols[id] || [C.c800, C.cream], { H, m, W } = D, bw = W + 2 * m, bh = H + 2 * m;
  robj.innerHTML = '<div id="book" class="obj" style="--u:' + D.u.toFixed(3) + ';--bg:' + bg + ';--fg:' + fg + ';width:' + Math.round(bw) + 'px;height:' + Math.round(bh) + 'px;left:' + Math.round((innerWidth - bw) / 2) + 'px;top:' + Math.max(8, Math.round((innerHeight - bh) / 2 - 30)) + 'px">'
    + (BK.single ? '<div class="board S"></div>' : '<div class="board L" style="visibility:hidden"></div><div class="board R"></div>')
    + '<div class="pages' + (BK.single ? ' single' : '') + '" style="left:' + m + 'px;top:' + m + 'px;width:' + Math.round(W) + 'px;height:' + Math.round(H) + 'px">' + (BK.single ? '' : '<div class="page L sL" style="visibility:hidden"></div>') + '<div class="page R sR"></div></div></div>';
  const el = $('book'); setPage(el.querySelector('.page.R'), 1);
  reader.classList.add('on'); updNav(); requestAnimationFrame(() => reader.classList.add('vis'));
  const F = el.getBoundingClientRect(), P = projRect(LF.obj);
  setTimeout(() => LF.obj && (LF.obj.visible = false), 220);
  if (BK.single) { el.animate([{ transform:flipT(F, P), opacity:0 }, { opacity:1, offset:.3 }, { transform:'none', opacity:1 }], { duration:650, easing:'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => { RD.busy = false; }; return; }
  const cov = document.createElement('div'); cov.className = 'lf cov';
  cov.innerHTML = '<div class="pf cvr">' + coverHTML(it) + '</div><div class="pf back cvb"><div style="position:absolute;top:' + m + 'px;bottom:' + m + 'px;left:' + m + 'px;right:0">' + BK.pages[0] + '</div></div>';
  el.appendChild(cov);
  const sc = P.h / F.height, T = 1300;
  el.animate([{ transform:'translate(' + (P.x - F.left - F.width / 2 * sc) + 'px, ' + (P.y - F.top) + 'px) scale(' + sc + ')', opacity:0, easing:'cubic-bezier(.2,.7,.3,1)' }, { opacity:1, offset:.12 }, { transform:'translate(' + (-F.width / 4) + 'px, 0px) scale(1)', offset:.42, easing:'cubic-bezier(.45,.05,.35,1)' }, { transform:'translate(0px, 0px) scale(1)', opacity:1 }], { duration:T });
  cov.animate([{ transform:'rotateY(0deg)' }, { transform:'rotateY(0deg)', offset:.42, easing:'cubic-bezier(.45,.05,.35,1)' }, { transform:'rotateY(-180deg)' }], { duration:T }).onfinish = () => {
    el.querySelector('.board.L').style.visibility = ''; const Lp = el.querySelector('.page.L'); Lp.style.visibility = ''; setPage(Lp, 0); cov.remove(); RD.busy = false; };
}
function flip(d) {
  if (RD.mode !== 'book' || RD.busy) return; const pg = $('book').querySelector('.pages'), Lp = pg.querySelector('.page.L'), Rp = pg.querySelector('.page.R'), N = BK.pages.length;
  const mkLeaf = (cls, fi, fc, bi, bc) => { const lf = document.createElement('div'); lf.className = 'lf ' + cls; lf.innerHTML = '<div class="pf ' + fc + '">' + pageHTML(fi) + '<i class="sh"></i></div><div class="pf back ' + bc + '">' + pageHTML(bi) + '<i class="sh"></i></div>'; pg.appendChild(lf); return lf; };
  const o = { duration:820, easing:'cubic-bezier(.45,.05,.35,1)' };
  const shade = lf => { const [a, b] = lf.querySelectorAll('.sh'); a.animate([{ opacity:0 }, { opacity:.3 }], { duration:410, fill:'forwards', easing:'ease-in' }); b.animate([{ opacity:.3 }, { opacity:0 }], { duration:410, delay:410, fill:'both', easing:'ease-out' }); };
  const done = () => { RD.busy = false; updNav(); };
  if (BK.single) {
    const ni = BK.i + d; if (ni < 1 || ni >= N) return; RD.busy = true;
    if (d > 0) { const lf = mkLeaf('R', BK.i, 'sR', -1, 'sL'); setPage(Rp, ni); shade(lf); lf.animate([{ transform:'rotateY(0deg)', opacity:1 }, { opacity:1, offset:.55 }, { transform:'rotateY(-180deg)', opacity:0 }], o).onfinish = () => { lf.remove(); BK.i = ni; done(); }; }
    else { const lf = mkLeaf('R', ni, 'sR', -1, 'sL'); lf.animate([{ transform:'rotateY(-180deg)', opacity:0 }, { opacity:1, offset:.45 }, { transform:'rotateY(0deg)', opacity:1 }], o).onfinish = () => { setPage(Rp, ni); lf.remove(); BK.i = ni; done(); }; }
    return;
  }
  if (d > 0 ? BK.i + 2 >= N : BK.i - 2 < 0) return; RD.busy = true;
  if (d > 0) { const lf = mkLeaf('R', BK.i + 1, 'sR', BK.i + 2, 'sL'); setPage(Rp, BK.i + 3); shade(lf); lf.animate([{ transform:'rotateY(0deg)' }, { transform:'rotateY(-180deg)' }], o).onfinish = () => { setPage(Lp, BK.i + 2); lf.remove(); BK.i += 2; done(); }; }
  else { const lf = mkLeaf('L', BK.i, 'sL', BK.i - 1, 'sR'); setPage(Lp, BK.i - 2); shade(lf); lf.animate([{ transform:'rotateY(0deg)' }, { transform:'rotateY(180deg)' }], o).onfinish = () => { setPage(Rp, BK.i - 1); lf.remove(); BK.i -= 2; done(); }; }
}
// swap everything between the boards at once: into an article from a series' contents, and back out
function swapSpread() {
  const pg = $('book').querySelector('.pages');
  pg.animate([{ opacity:1 }, { opacity:0 }], { duration:160, fill:'forwards' }).onfinish = e => {
    if (BK.single) setPage(pg.querySelector('.page.R'), BK.i); else { setPage(pg.querySelector('.page.L'), BK.i); setPage(pg.querySelector('.page.R'), BK.i + 1); }
    updNav(); e.target.cancel(); pg.animate([{ opacity:0 }, { opacity:1 }], { duration:240 }).onfinish = () => { RD.busy = false; }; };
}
function readEntry(aid) {
  if (RD.mode !== 'book' || RD.busy) return; const sid = RD.id, s = ITEMS[sid], row = (s.toc || []).find(r => r[0] === aid); if (!row) return; RD.busy = true;
  loadArticle(aid).then(async html => { const n = html ? await countCols(html, BK.D) : 0; if (RD.mode !== 'book' || RD.id !== sid) return;
    BK.ret = { pages:BK.pages, i:BK.i, art:BK.art }; BK.art = { t:row[1], html };
    BK.pages = articlePages({ kind:'writing', k:s.t + ' · ' + row[2], t:row[1], m:s.t }, html, n); BK.i = BK.single ? 1 : 0; swapSpread(); });
}
function backToContents() { if (RD.mode !== 'book' || RD.busy || !BK.ret) return; RD.busy = true; Object.assign(BK, BK.ret, { ret:null }); swapSpread(); }
function updNav() {
  if (RD.mode === 'book') { const N = BK.pages.length, a = BK.single ? BK.i <= 1 : BK.i <= 0, z = BK.single ? BK.i >= N - 1 : BK.i + 2 >= N;
    rnav.innerHTML = (BK.ret ? '<button class="btn btn-ghost" data-act="toc">‹ 回目錄</button>' : '') + '<button class="btn btn-ghost" data-act="prev"' + (a ? ' disabled' : '') + '>‹ 上一頁</button><span class="cnt">' + (BK.single ? BK.i + ' / ' + (N - 1) : (BK.i / 2 + 1) + ' / ' + (N / 2)) + '</span><button class="btn btn-ghost" data-act="next"' + (z ? ' disabled' : '') + '>下一頁 ›</button><button class="btn btn-secondary" data-act="shelve">放回書架</button>'; }
  else if (RD.mode === 'paper') rnav.innerHTML = '<button class="btn btn-ghost" data-act="prev">‹</button><span class="cnt">第 ' + (DRAFTS.indexOf(RD.id) + 1) + ' / ' + DRAFTS.length + ' 張</span><button class="btn btn-ghost" data-act="next">›</button><button class="btn btn-secondary" data-act="shelve">放回桌上</button>';
}
function closeReader(cb) {
  if (!RD.mode || RD.busy) return; RD.busy = true;
  const el = robj.firstElementChild, P = projRect(LF.obj); reader.classList.remove('vis');
  let a;
  if (RD.mode === 'paper') { const F = el.getBoundingClientRect(); a = el.animate([{ transform:'none', opacity:1 }, { opacity:1, offset:.6 }, { transform:flipT(F, P), opacity:0 }], { duration:460, easing:'cubic-bezier(.5,0,.6,1)', fill:'forwards' }); setTimeout(() => LF.obj && (LF.obj.visible = true), 260); }
  else { a = el.animate([{ transform:'none', opacity:1 }, { transform:'translate(0px, 24px) scale(.95)', opacity:0 }], { duration:340, easing:'ease-in', fill:'forwards' }); setTimeout(() => LF.obj && (LF.obj.visible = true), 140); }
  a.onfinish = () => { reader.classList.remove('on'); robj.innerHTML = ''; rnav.innerHTML = ''; RD.mode = null; LF.t = 1; LF.anim = -1; LF.cb = () => { RD.busy = false; unimmerse(); cb && cb(); }; };
}
reader.addEventListener('click', e => {
  const a = e.target.closest('a,[data-act],[data-rel],[data-tab],[data-art]');
  if (a && a.tagName === 'A') return;
  if (a) { if (a.dataset.tab) return switchDraft(a.dataset.tab); if (a.dataset.art) return readEntry(a.dataset.art); if (a.dataset.rel) { const r = a.dataset.rel; return closeReader(() => openItem(r)); }
    const act = a.dataset.act; if (act === 'shelve' || act === 'rclose') return closeReader(); if (act === 'toc') return backToContents(); if (act === 'next' || act === 'prev') { const d = act === 'next' ? 1 : -1; return RD.mode === 'book' ? flip(d) : stepDraft(d); } return; }
  if (e.target.classList.contains('bd')) return closeReader();
  if (RD.mode === 'book') { const p = e.target.closest('.page'); if (!p) return; if (BK.single) { const r = p.getBoundingClientRect(); flip(e.clientX < r.left + r.width * .35 ? -1 : 1); } else flip(p.classList.contains('L') ? -1 : 1); }
});

/* TV: push in on the CRT, pick a cartridge, the game plays on the screen */
function openTV(sel = 0) {
  if (RD.mode || RD.busy || LF.anim) return; immerse();
  Object.assign(TV, { on:true, vis:false, play:false, sel }); mark('tv'); st.cur = 'tv';
  scr.updateWorldMatrix(true, false); const c = scr.getWorldPosition(new THREE.Vector3()), n = new THREE.Vector3(0, 0, 1).applyQuaternion(scr.getWorldQuaternion(new THREE.Quaternion()));
  const th = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), d = Math.max((.22 / .6) / th, (.27 / .84) / (th * camera.aspect));
  flyTo(c, c.clone().addScaledVector(n, d), 1.4); tvui.classList.add('on'); tvMenu();
}
function tvMenu() {
  TV.play = false;
  crt.innerHTML = '<div class="menu"><div class="hd"><span>PLAYBOX</span><span>' + pad2(GAMES.length) + ' CARTS</span></div><div class="sub">選擇卡帶</div><div class="gl">'
    + GAMES.map((g, i) => '<button class="gi" data-g="' + i + '"><span class="c">▶</span><span>' + esc(g[2]) + '</span><span class="k">' + pad2(i + 1) + '</span></button>').join('')
    + '</div><div class="ht">↑↓ 選擇　ENTER 開始　ESC 離開</div></div><div class="scan"></div>';
  tvSel(TV.sel); tvBar();
}
function tvSel(i) { TV.sel = i; crt.querySelectorAll('.gi').forEach((b, j) => { b.classList.toggle('on', j === i); if (j === i) b.scrollIntoView({ block:'nearest' }); }); }
function tvPlay() {
  TV.play = true; const g = GAMES[TV.sel], slot = IDS.find(k => k !== 'tv' && ITEMS[k].kind === 'play' && gameAt(k) === TV.sel); if (slot) mark(slot);
  crt.innerHTML = '<iframe src="' + esc(g[4]) + '" title="' + esc(g[2]) + '" allow="autoplay; fullscreen; gamepad"></iframe><div class="ld"><span>插入卡帶中…<br>' + esc(g[2]) + '</span></div><div class="scan" style="opacity:.4"></div>';
  crt.querySelector('iframe').addEventListener('load', () => { const l = crt.querySelector('.ld'); l && l.remove(); });
  tvBar(); positionTV();
}
function tvBar() {
  const repo = (ITEMS.tv.links || [])[0];
  tvbar.innerHTML = (TV.play
    ? '<button class="btn btn-ghost" data-tv="menu">‹ 換卡帶</button><a class="btn btn-ghost" href="' + esc(GAMES[TV.sel][4]) + '" target="_blank" rel="noopener" style="text-decoration:none">開新分頁玩 ↗</a>'
    : repo ? '<a class="btn btn-ghost" href="' + esc(repo.u) + '" target="_blank" rel="noopener" style="text-decoration:none">' + esc(repo.l) + '</a>' : '') + '<button class="btn btn-secondary" data-tv="exit">關電視 ✕</button>';
}
function positionTV() {
  camera.updateMatrixWorld(); scr.updateWorldMatrix(true, false); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { _v.set(a * .131, b * .107, .012).applyMatrix4(scr.matrixWorld).project(camera); const X = (_v.x + 1) / 2 * innerWidth, Y = (1 - _v.y) / 2 * innerHeight; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); });
  const w = x1 - x0, h = y1 - y0; Object.assign(crt.style, { left:x0 + 'px', top:y0 + 'px', width:w + 'px', height:h + 'px', fontSize:(h / 18).toFixed(1) + 'px' });
  const f = crt.querySelector('iframe'); if (f) { const sc = w / 900; f.style.width = '900px'; f.style.height = Math.round(h / sc) + 'px'; f.style.transform = 'scale(' + sc + ')'; }
  tvbar.style.left = (x0 + w / 2) + 'px'; tvbar.style.top = Math.min(innerHeight - 64, y1 + h * .4) + 'px';
}
function exitTV() { Object.assign(TV, { on:false, vis:false, play:false }); tvui.classList.remove('vis', 'on'); crt.innerHTML = ''; tvbar.innerHTML = ''; lockCam = false; document.body.classList.remove('immerse'); goHome(); }
tvui.addEventListener('click', e => { const a = e.target.closest('[data-g],[data-tv]'); if (!a) return; if (a.dataset.g != null) { tvSel(+a.dataset.g); tvPlay(); } else if (a.dataset.tv === 'menu') tvMenu(); else if (a.dataset.tv === 'exit') exitTV(); });
tvui.addEventListener('pointerover', e => { const a = e.target.closest('[data-g]'); if (a && !TV.play) tvSel(+a.dataset.g); });

/* ================= picking ================= */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $('tip');
let hoverRoot = null, down = null;
function tipText(p) {
  if (p.type === 'item') { const it = ITEMS[p.id]; return `${KLAB[it.kind]} · ${it.t}`; }
  if (p.type === 'list') return '筆電 · GitHub 活動';
  if (p.type === 'about') return '自畫像 · 關於 Paul';
  return '';
}
const setMouse = e => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left)/r.width*2-1, -(e.clientY - r.top)/r.height*2+1); ray.setFromCamera(mouse, camera); };
renderer.domElement.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; });
renderer.domElement.addEventListener('pointermove', e => {
  if (lockCam) { tip.style.opacity = 0; hoverRoot = null; renderer.domElement.style.cursor = TV.on ? 'zoom-out' : 'default'; return; }
  setMouse(e); const hit = ray.intersectObjects(pickables, false)[0]; hoverRoot = hit ? hit.object.userData.root : null;
  renderer.domElement.style.cursor = hoverRoot ? 'pointer' : 'grab';
  if (hoverRoot) { tip.textContent = tipText(hoverRoot.userData.pick); tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.style.opacity = 1; } else tip.style.opacity = 0;
});
renderer.domElement.addEventListener('pointerleave', () => { tip.style.opacity = 0; hoverRoot = null; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
  if (TV.on) { exitTV(); return; } if (lockCam) return;
  setMouse(e); const hit = ray.intersectObjects(pickables, false)[0];
  if (!hit) { if (panel.classList.contains('open')) closePanel(); return; }
  const root = hit.object.userData.root, p = root.userData.pick;
  if (p.type === 'item') openItem(p.id); else if (p.type === 'list') openList(); else if (p.type === 'about') openAbout();
});

/* ================= adaptive quality ================= */
// Once the camera has settled, watch a few seconds of frame times; a machine that cannot hold 40 fps is moved to the low tier for
// everything that can change without rebuilding shaders, and remembered as slow so the next visit starts there.
const qSamples = [];
function judge(dt) {
  if (!Q.armed || Q.low || Q.judged || tween || document.hidden) return;
  qSamples.push(dt); if (qSamples.length < 150) return;
  Q.judged = true; const s = [...qSamples].sort((a, b) => a - b);
  if (s[s.length >> 1] > .025) demote();
}
function demote() {
  Q.low = true; document.body.classList.add('lite');
  renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight);
  furShells.forEach((s, i) => s.visible = i < 3);
  dustN = DN / 2; dGeo.setDrawRange(0, dustN); partN = Math.ceil(SKY[season].n / 2); pGeo.setDrawRange(0, partN);
  try { localStorage.setItem(QKEY, 'low'); } catch {}
  toast('這台電腦跑得有點吃力，書房已切到輕量模式');
}

/* ================= loop ================= */
const clock = new THREE.Timer(); let viewX = 0, viewY = 0;
const roots = [...new Set(pickables.map(m => m.userData.root))];
function loop(ts) {
  clock.update(ts); const dt = Math.min(clock.getDelta(), .05), t = clock.getElapsed(); judge(dt);
  let moved = LF.anim !== 0; // the only things that cast moving shadows: an object sliding out under the cursor, or one being lifted
  roots.forEach(r => { if (r.userData.lifted) return; const want = r === hoverRoot ? r.userData.base.clone().add(r.userData.pull) : r.userData.base; if (r.position.distanceToSquared(want) > 1e-10) { r.position.lerp(want, Math.min(1, dt * 10)); moved = true; } });
  if (moved) renderer.shadowMap.needsUpdate = true;
  const fl = .85 + Math.sin(t*13) * .06 + Math.sin(t*7.3) * .08 + (Math.random() - .5) * .06; candleLight.intensity = .2 * fl; flame.scale.set(1, 2.2 * fl, 1);
  catBody.scale.y = .55 + Math.sin(t*1.6) * .02; head.rotation.z = Math.sin(t*.4) * .03;
  const w = SKY[season], pa = pGeo.attributes.position.array;
  for (let i = 0; i < partN; i++) { const s = pSeed[i]; pa[i*3+1] -= w.speed * (.7 + s*.6) * dt; pa[i*3] += Math.sin(t*1.1 + s*30) * w.sway * dt; if (pa[i*3+1] < 0) { pa[i*3+1] = OUT.y1; pa[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); } }
  pGeo.attributes.position.needsUpdate = true;
  const da = dGeo.attributes.position.array; for (let i = 0; i < dustN; i++) { const s0 = dSeed[i]; da[i*3] += Math.sin(t*.3 + s0*40) * .0009; da[i*3+1] += Math.sin(t*.21 + s0*30) * .0006 - .00012; da[i*3+2] += Math.cos(t*.27 + s0*20) * .0008; if (da[i*3+1] < .75) da[i*3+1] = 2.5; } dGeo.attributes.position.needsUpdate = true;
  candleHalo.material.opacity = candleHalo.userData.op * fl;
  if (tween) { tween.t = Math.min(1, tween.t + dt / tween.d); const k = 1 - Math.pow(1 - tween.t, 3); controls.target.lerpVectors(tween.ft, tween.tt, k); camera.position.lerpVectors(tween.fp, tween.tp, k); if (tween.t >= 1) { tween = null; controls.enabled = !lockCam; } }
  liftStep(dt);
  // the panel covers the right 460px, or the bottom 58% on a phone — slide the view so the subject stays in the open part
  const open = panel.classList.contains('open'), phone = innerWidth <= 760, k = Math.min(1, dt * 6);
  viewX += ((open && !phone ? 230 : 0) - viewX) * k; viewY += ((open && phone ? innerHeight * .29 : 0) - viewY) * k;
  if (Math.abs(viewX) > .5 || Math.abs(viewY) > .5) camera.setViewOffset(innerWidth, innerHeight, viewX, viewY, innerWidth, innerHeight); else camera.clearViewOffset();
  controls.update();
  if (TV.on) { positionTV(); if (!tween && !TV.vis) { TV.vis = true; tvui.classList.add('vis'); } }
  renderer.render(scene, camera);
}
// the shaders are built while the sheets are still being painted; the room opens once both are done
renderer.compileAsync(scene, camera).catch(() => {}).then(() => renderer.setAnimationLoop(loop));
window.__study = { loop, openItem, openList, openAbout, openTV, exitTV, flip, closeReader, switchDraft, state:{ RD, BK, TV, LF } };
Promise.all([sheetsReady, new Promise(r => setTimeout(r, 300))]).then(() => { flyTo(HOME.tgt, HOME.pos, 2.2); Q.armed = true; $('intro').classList.add('off'); });
// a portrait screen would crop the room to a sliver, so widen the vertical field of view as it narrows
const fitCamera = () => { camera.aspect = innerWidth/innerHeight; camera.fov = camera.aspect >= 1 ? 52 : Math.min(85, 52 + (1 - camera.aspect) * 60); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };
addEventListener('resize', fitCamera); fitCamera();
document.fonts && document.fonts.ready.then(() => texts.forEach(t => t.redraw()));
