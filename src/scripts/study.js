import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, cnv, paintSheets, spineAtlas, SPINES, pageEdges, paintLakeView, paintNearWater, LAKE_SKY, crtMask } from './studyTextures.js';
const texOf = (c, rep = [1,1], srgb = true) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };

/* ================= content ================= */
// Filled at build time from Notion (src/lib/study.ts). Ids are the room's physical
// slots — a spine on the shelf, a spot on the display shelves, a page on the desk.
const DATA = JSON.parse(document.getElementById('study-data').textContent);
const { items: ITEMS, about: ABOUT, github: GH, site: SITE } = DATA;
const IDS = Object.keys(ITEMS);
const CATS = [{ id:'shelf', name:'書架' }, { id:'display', name:'展示架' }, { id:'desk', name:'書桌' }];
const has = id => !!ITEMS[id];
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
  wood:'#5b3522', woodD:'#3b2216', woodL:'#7a4a2c', wall:'#3a322b', wallL:'#4a4038', fabric:'#776f5c', fabricD:'#5e5747', cream:'#eadfc6', brass:'#b38b4b', cat:'#d98a46',
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
renderer.setPixelRatio(Q.low ? 1 : Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight);
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
const CAM_TOP = 2.6; // as high as the camera goes: the ceiling is at 2.8
const az0 = Math.atan2(HOME.pos.x - HOME.tgt.x, HOME.pos.z - HOME.tgt.z);
controls.minAzimuthAngle = az0 - .62; controls.maxAzimuthAngle = az0 + .42;

/* ================= helpers ================= */
const std = (name, c, o = {}) => new THREE.MeshStandardMaterial({ name, color:col(c), roughness:.8, metalness:0, ...o });
const M = {
  wall:std('wall', C.wall, { roughness:.95 }), wallL:std('wall-light', C.wallL, { roughness:.95 }),
  wood:std('wood', C.wood, { roughness:.55 }), woodD:std('wood-dark', C.woodD, { roughness:.6 }), woodL:std('wood-light', C.woodL, { roughness:.5 }),
  fabric:std('fabric', C.fabric, { roughness:1 }), fabricD:std('fabric-dark', C.fabricD, { roughness:1 }),
  cream:std('cream', C.cream, { roughness:.9 }), brass:std('brass', C.brass, { roughness:.35, metalness:.8 }), ink:std('ink', C.ink, { roughness:.5 }),
  cat:std('cat', C.cat, { roughness:.95 }), catL:std('cat-light', '#efc394', { roughness:.95 }),
  glass:new THREE.MeshStandardMaterial({ name:'glass', color:col('#9fb7b0'), transparent:true, opacity:.08, roughness:.05, depthWrite:false }),
  alu:std('aluminium', '#9a9893', { roughness:.35, metalness:.7 }),
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
// small things: metal that has been handled, and a fine grit for paper and hardboard
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
  wallL: std('wall-light', '#665645', { ...plasterTex, roughness:1 }), ceil: std('ceiling', '#7d6f5e', { ...plasterTex, map:null, roughness:1 }), // painted flat: the walls' mottling would be most of a phone's screen
  fabric: pbr('fabric', '#9a917a', { ...fabricTex, sheenColor:col('#cfc7ae') }),
  fabricD: pbr('fabric-dark', '#7a7262', { ...fabricTex, sheenColor:col('#aaa290') }),
  brass: pbr('brass', '#d2a868', { ...metalTex, roughness:.43 }),
  alu: pbr('aluminium', '#b4b2ad', { ...metalTex, map:null, roughness:.53 }),
  cat: pbr('cat', '#ffffff', { map:sheet('tabby', 'color'), ...coatTex }), catL: pbr('cat-light', '#f7dcb8', coatTex),
  cream: pbr('cream', C.cream, { roughness:.6, clearcoat:.2 }),
  glass: new THREE.MeshPhysicalMaterial(lite({ name:'glass', color:col('#c8d8d4'), transparent:true, opacity:.14, roughness:.04, metalness:0, depthWrite:false, clearcoat:1 })),
});

/* ================= room shell ================= */
// one 3 m tile of 12.5 cm boards, laid twice each way
const [floorMap, floorNormal, floorRough] = ['color', 'normal', 'rough'].map(ch => { const t = sheet('floor', ch, [2, 2]); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
// the boards stop at the outer face of the back wall, where the deck takes over; the tile keeps its scale
const floorGeo = new THREE.PlaneGeometry(6, 5.6); for (let i = 0, uv = floorGeo.attributes.uv; i < uv.count; i++) uv.setY(i, uv.getY(i) * 5.6 / 6);
room.add(mk(floorGeo, new THREE.MeshPhysicalMaterial(lite({ name:'floor', map:floorMap, normalMap:floorNormal, normalScale:new THREE.Vector2(.7, .7), roughnessMap:floorRough, roughness:1, clearcoat:.25, clearcoatRoughness:.35 })), 'floor', [0,0,.2], [-Math.PI/2,0,0]));
room.add(roomUV(box(.1, 2.8, 6, M.wall, 'wall-left', [-3.05,1.4,0])));
room.add(roomUV(box(.1, 2.8, 6, M.wall, 'wall-right', [3.05,1.4,0])));
// back wall with the door and window openings
const DOOR = { x0:-2, x1:-.9, y1:2.15 };
room.add(roomUV(box(DOOR.x0 + 3.05, 2.8, .1, M.wall, 'wall-back', [(DOOR.x0 - 3.05)/2,1.4,-2.55])));
room.add(roomUV(box(.05 - DOOR.x1, 2.8, .1, M.wall, 'wall-back', [(DOOR.x1 + .05)/2,1.4,-2.55])));
room.add(roomUV(box(DOOR.x1 - DOOR.x0, 2.8 - DOOR.y1, .1, M.wall, 'wall-back', [(DOOR.x0 + DOOR.x1)/2,(2.8 + DOOR.y1)/2,-2.55])));
room.add(roomUV(box(.4, 2.8, .1, M.wall, 'wall-back', [2.85,1.4,-2.55])));
room.add(roomUV(box(2.6, 1.0, .1, M.wall, 'wall-back', [1.35,.5,-2.55])));
room.add(roomUV(box(2.6, .3, .1, M.wall, 'wall-back', [1.35,2.65,-2.55])));
room.add(roomUV(box(6.2, .1, 5.7, M.ceil, 'ceiling', [0,2.85,.15])));
// crown + skirting
[[-3,0,'x'],[3,0,'x']].forEach(([x]) => { room.add(box(.08, .12, 6, M.cream, 'crown', [x*.985,2.74,0])); room.add(box(.05, .14, 6, M.woodD, 'skirting', [x*.99,.07,0])); });
room.add(box(6, .12, .08, M.cream, 'crown', [0,2.74,-2.48]));
[[-3, DOOR.x0 - .04], [DOOR.x1 + .04, 3]].forEach(([a, b]) => room.add(box(b - a, .14, .05, M.woodD, 'skirting', [(a + b)/2,.07,-2.48])));

/* ================= bookshelf (left wall) ================= */
const shelf = new THREE.Group(); shelf.name = 'bookshelf'; room.add(shelf);
const SX = -2.62, SZ0 = -2.47, SZ1 = 1.6, LV = [.1, .45, .8, 1.15, 1.5, 1.85, 2.2, 2.55];
const bays = [SZ0, -1.13, .44, SZ1], BZ = bays[1]; // the corner bay is the display shelves; the books start at BZ. The reading list's bay is as wide as the camera can still see to the end of, turned as far left as it goes
shelf.add(box(.4, 2.72, SZ1 - BZ + .03, M.woodD, 'shelf-carcass-back', [-2.98,1.36,(BZ+SZ1)/2]));
bays.forEach(z => shelf.add(box(.4, 2.72, .05, M.wood, 'shelf-divider', [-2.81,1.36,z])));
LV.forEach((y, i) => { const z0 = i === LV.length - 1 ? SZ0 : BZ; shelf.add(box(.4, .035, SZ1 - z0, M.wood, 'shelf-board', [-2.81,y,(z0+SZ1)/2])); }); // only the top board runs the whole length
shelf.add(box(.42, .18, SZ1 - SZ0 + .05, M.wood, 'shelf-cornice', [-2.8,2.68,(SZ0+SZ1)/2]));
LV.slice(1).forEach(y => { const s = mk(new THREE.BoxGeometry(.02, .01, SZ1 - BZ), new THREE.MeshBasicMaterial({ name:'led', color:col('#b98450') }), 'led-strip', [-2.63, y - .025, (BZ+SZ1)/2]); s.castShadow = false; shelf.add(s); });
/* the bay nearer the camera: books that are only there to be looked at */
const spineCols = [C.c900, C.m900, C.m800, '#24402f', '#2e4a3a', '#1f2c3d', C.cream, '#6b3a26', '#8a6b45', C.n800, '#3d2a1e', C.c800, '#c9b88f', '#5a1f1f'];
// each is one instance of a unit block; `aBook` gives each its own spine layout, and the shader tells its cloth from its paper
const bookGeo = rboxGeo(1, 1, 1, .09).clone(), bookAttr = new THREE.InstancedBufferAttribute(new Float32Array(400 * 2), 2), bookR = rng(41); bookGeo.setAttribute('aBook', bookAttr);
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
const inst = new THREE.InstancedMesh(bookGeo, bookMat, 400); inst.castShadow = true; inst.receiveShadow = true;
let ni = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
for (let lv = 0; lv < 7; lv++) {
  let z = bays[2] + .04; const zEnd = bays[3] - .04;
  while (z < zEnd - .02) {
    if (rnd() < .025) { z += .12; continue; }
    const t = .025 + rnd()*.045, h = .22 + rnd()*.1, d = .2 + rnd()*.06;
    if (z + t > zEnd || ni === 400) break;
    const lean = rnd() < .04 && z + .2 < zEnd ? .22 : 0;
    q.setFromEuler(new THREE.Euler(lean, 0, 0)); sc.set(d, h, t); ps.set(-2.78 + (.26 - d)/2 + .02, LV[lv] + .018 + h/2, z + t/2 + (lean ? .03 : 0));
    m4.compose(ps, q, sc); inst.setMatrixAt(ni, m4); const c = col(spineCols[Math.floor(rnd()*spineCols.length)]); c.multiplyScalar(.8 + rnd()*.35); inst.setColorAt(ni, c); bookAttr.setXY(ni, Math.floor(bookR() * SPINES), bookR()); ni++;
    z += t + .003 + (lean ? .05 : 0);
  }
}
inst.count = ni; shelf.add(inst);
/* the bay beside the display shelves: every finished book of the reading list, filed by category */
const CJK = '\u2e80-\u9fff\uff00-\uffef', cjkRun = new RegExp('[' + CJK + ']|[^' + CJK + ']+', 'g');
const VERT = { '「':'﹁', '」':'﹂', '『':'﹃', '』':'﹄', '（':'︵', '）':'︶', '《':'︽', '》':'︾', '：':'︰' }; // what turns with the line when it is set downwards
// a title broken into lines no wider than `max` in the context's font: between CJK characters, or at either end of a run of Latin
const wrapText = (x, s, max) => (s.match(cjkRun) || []).reduce((ls, tok) => { const cur = ls[ls.length - 1]; if (x.measureText((cur + tok).trim()).width > max && cur.trim()) ls.push(tok); else ls[ls.length - 1] = cur + tok; return ls; }, ['']).map(l => l.trim());
// One spine, head up, in the w×h box at (x0, y0): cloth that rounds away at its edges, a double rule at head and foot, and the title set down
// its length — CJK upright one under another, a run of Latin on its side. `asp` is the spine's own width over its height, so the lettering
// keeps its shape however the box is stretched over the book.
function drawSpine(x, x0, y0, w, h, title, bg, fg, asp = w / h) {
  const lw = h * asp, u = h / 512;
  x.save(); x.translate(x0, y0); x.scale(w / lw, 1);
  x.fillStyle = bg; x.fillRect(0, 0, lw, h);
  const g = x.createLinearGradient(0, 0, lw, 0); [[0,.3],[.2,0],[.8,0],[1,.3]].forEach(([p, a]) => g.addColorStop(p, 'rgba(0,0,0,' + a + ')')); x.fillStyle = g; x.fillRect(0, 0, lw, h);
  x.fillStyle = fg; [[26, 4], [35, 1.5]].forEach(([y, t]) => { x.fillRect(0, y*u, lw, t*u); x.fillRect(0, h - (y + t)*u, lw, t*u); });
  // each run and the length it takes, in ems: a CJK character or a pair of figures is a square, a longer run of Latin lies along the spine
  x.font = `600 100px ${SERIF}`; x.textBaseline = 'middle';
  const runs = (title.replace(/[《》]/g, '').match(cjkRun) || []).map(s => { const r = s.trim(); return !r ? [null, .35] : r.length < 3 ? [VERT[r] || r, 1.05, 1] : [r, x.measureText(r).width / 100 + .18]; });
  const len = runs.reduce((a, r) => a + r[1], 0), fs = Math.min(lw * .62, h * .125, (h - 112*u) / len);
  let y = runs.some(r => r[2]) ? 58*u : (h - len * fs) / 2; // a title that is all Latin sits mid-spine
  x.font = `600 ${fs}px ${SERIF}`;
  runs.forEach(([s, l, upright]) => {
    if (upright) { x.textAlign = 'center'; x.fillText(s, lw/2, y + fs * .52, fs); }
    else if (s) { x.save(); x.translate(lw/2, y + fs * .09); x.rotate(Math.PI/2); x.textAlign = 'left'; x.fillText(s, 0, fs * .04); x.restore(); }
    y += l * fs; });
  x.restore();
}
const fPal = [[C.c800,C.cream],[C.m800,C.cream],['#2e4a3a',C.cream],[C.cream,C.ink],['#6b3a26',C.cream],[C.c900,C.yel],[C.cream,C.m700],['#1f2c3d',C.cream]];
const libPal = [...fPal, ['#8a6b45',C.cream], ['#3d2a1e','#e3cf98'], ['#c9b88f',C.ink], ['#5a1f1f',C.cream], ['#24402f','#e3cf98'], [C.n800,C.cream]];
const SERIES = ['s1','s2','s3'].filter(has); // these stand in the rack on the desk
const fCols = { mb:[C.cyan, C.paper] }; SERIES.forEach((id, i) => fCols[id] = fPal[i % fPal.length]);
const books = {}, pagesMat = std('pages', '#ffffff', { map:texOf(pageEdges()), roughness:.9 });
// a book with its spine on +x, `d` from spine to fore-edge
const bookOf = (id, d, h, th, keep = true) => { const [bg, fg] = fCols[id];
  const sm = new THREE.MeshStandardMaterial({ name:'spine-' + id, map:ctex(96, 512, (x, w, hh) => drawSpine(x, 0, 0, w, hh, ITEMS[id].sp || ITEMS[id].t, bg, fg, th / h), keep), roughness:.7 });
  const cm = std('cover-' + id, bg, { roughness:.7 }), pm = pagesMat;
  const g = new THREE.Group(); g.add(mk(new THREE.BoxGeometry(d, h, th), [sm, pm, pm, pm, cm, cm], 'book-' + id)); return books[id] = g; };
// The shelves are filled in reading order, top to bottom, and left to right as you face them, so z runs down. A section opens with a brass
// plate on the edge of its board. The whole list has to stand in this one bay, so its books are made slimmer until it does — on all
// but the bottom shelf, which is kept bare for what is read next for as long as that does not make them too slim.
const PLATE = .16, PLATE_H = .042;
function shelve(k, rows, cram) { // `k` scales every book's thickness; with `cram`, whatever is left over when the shelves are full stays off them
  const cells = [6, 5, 4, 3, 2, 1, 0].slice(0, rows).map(lv => ({ lv, z0:bays[2] - .045, z1:bays[1] + .045 }));
  const R = rng(97), bk = [], pl = []; let ci = 0, z = cells[0].z0, clear = z, last = -1; // `clear`: where the last plate ends
  for (const [name, ids] of DATA.library || []) {
    if (z < cells[ci].z0) { z = Math.min(z - .035, clear - .015); if (z - PLATE < cells[ci].z1) { if (!cells[ci + 1]) return cram ? { bk, pl } : null; z = cells[++ci].z0; } }
    let fresh = true;
    for (const id of ids) {
      const t = (.046 + R() * .03) * k, h = .235 + R() * .065, d = .2 + R() * .05; let p; do p = Math.floor(R() * libPal.length); while (p === last); last = p;
      if (z - t < cells[ci].z1) { if (!cells[ci + 1]) return cram ? { bk, pl } : null; z = cells[++ci].z0; fresh = true; } // the section runs on along the next shelf, under a plate of its own
      if (fresh) { pl.push({ name, lv:cells[ci].lv, z:z - PLATE / 2 }); clear = z - PLATE; fresh = false; }
      bk.push({ id, t, h, d, p, y:LV[cells[ci].lv] + .018 + h / 2, z:z - t / 2 }); z -= t + .003;
    }
  }
  return { bk, pl };
}
let fit = null; for (let k = 1; !fit && k > .82; k -= .04) fit = shelve(k, 6);
for (let k = 1; !fit && k > .6; k -= .04) fit = shelve(k, 7);
const { bk:shelved, pl:plates } = fit || shelve(.6, 7, true); shelved.forEach(b => fCols[b.id] = libPal[b.p]);
// Every shelved book is one instance of a unit block, and all their spines are cells of one sheet, so the whole library is a single draw.
// Each has a stand-in the room's hover and picking treat as an object of its own.
let lib = null; const libOf = {};
if (shelved.length) {
  const N = shelved.length, P = 2, cw0 = (Q.low ? 64 : 80) + 2*P, ch0 = (Q.low ? 360 : 448) + 2*P, cols = Math.ceil(Math.sqrt(N * ch0 / cw0)), rows = Math.ceil(N / cols);
  const k = Math.min(1, 4096 / (cols * cw0), 4096 / (rows * ch0)), cw = Math.floor(cw0 * k), ch = Math.floor(ch0 * k), AW = cols * cw, AH = rows * ch; // a sheet no GPU refuses
  const titles = ctex(AW, AH, x => shelved.forEach((b, i) => { const [bg, fg] = fCols[b.id], x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
    x.fillStyle = bg; x.fillRect(x0, y0, cw, ch); drawSpine(x, x0 + P, y0 + P, cw - 2*P, ch - 2*P, ITEMS[b.id].sp || ITEMS[b.id].t, bg, fg, b.t / b.h); }));
  const libGeo = rboxGeo(1, 1, 1, .09).clone(), cellAttr = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); libGeo.setAttribute('aCell', cellAttr);
  const libMat = new THREE.MeshStandardMaterial({ name:'library', roughness:.68 });
  libMat.onBeforeCompile = sh => {
    sh.uniforms.uTitles = { value:titles };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aCell;\nvarying vec3 vBookP;\nvarying vec3 vBookN;\nvarying vec4 vCell;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBookP = position; vBookN = normal; vCell = aCell;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uTitles;\nvarying vec3 vBookP;\nvarying vec3 vBookN;\nvarying vec4 vCell;').replace('#include <color_fragment>', `#include <color_fragment>
    vec3 bn = abs(vBookN);
    if ((vBookN.y > 0.0 && bn.y > bn.x && bn.y > bn.z) || (vBookN.x < 0.0 && bn.x > bn.y && bn.x > bn.z)) {
      // head and fore-edge are the paper block: sheets across the thickness, blurring into plain cream once they are too fine to draw
      float s = vBookP.z * 22.0, sheet = mix(0.84 + 0.16 * sin(s * 6.2832), 0.92, smoothstep(0.25, 0.7, fwidth(s)));
      diffuseColor.rgb = vec3(0.82, 0.74, 0.57) * sheet;
    } else if (vBookN.x > 0.0 && bn.x > bn.y && bn.x > bn.z) {
      // the spine: this book's cell of the sheet, read from the room, so across it runs against z
      diffuseColor.rgb = texture2D(uTitles, vCell.xy + clamp(vec2(0.5 - vBookP.z, vBookP.y + 0.5), 0.01, 0.99) * vCell.zw).rgb;
    }`);
  };
  lib = new THREE.InstancedMesh(libGeo, libMat, N); lib.name = 'library'; lib.castShadow = true; lib.receiveShadow = true;
  lib.userData.roots = shelved.map((b, i) => { const r = new THREE.Object3D(); r.position.set(-2.76 + (.26 - b.d)/2, b.y, b.z); r.scale.set(b.d, b.h, b.t);
    r.userData = { pick:{ type:'item', id:b.id, view:'shelf' }, pull:new THREE.Vector3(.1, 0, 0), base:r.position.clone(), inst:i };
    r.updateMatrix(); lib.setMatrixAt(i, r.matrix); lib.setColorAt(i, col(fCols[b.id][0]));
    cellAttr.setXYZW(i, ((i % cols) * cw + P) / AW, 1 - (Math.floor(i / cols) * ch + ch - P) / AH, (cw - 2*P) / AW, (ch - 2*P) / AH);
    return libOf[b.id] = r; });
  shelf.add(lib); pickables.push(lib);
  // the plates are one sheet and one mesh too: a quad each, just proud of the board's edge
  const names = [...new Set(plates.map(p => p.name))], RH = 64, pos = [], nor = [], uv = [], idx = [];
  const sheetOf = ctex(256, RH * names.length, (x, w) => names.forEach((s, i) => { const y = i * RH; x.fillStyle = C.brass; x.fillRect(0, y, w, RH); x.strokeStyle = '#6e5228'; x.lineWidth = 4; x.strokeRect(4, y + 4, w - 8, RH - 8);
    x.fillStyle = '#2a1d0e'; x.font = `600 34px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, w/2, y + RH/2 + 2, w - 28); }));
  plates.forEach((p, i) => { const r = names.indexOf(p.name), v0 = 1 - (r + 1) / names.length, v1 = 1 - r / names.length;
    [[1, -1, 0, v0], [-1, -1, 1, v0], [-1, 1, 1, v1], [1, 1, 0, v1]].forEach(([sz, sy, a, v]) => { pos.push(-2.604, LV[p.lv] - .004 + sy * PLATE_H/2, p.z + sz * PLATE/2); nor.push(1, 0, 0); uv.push(a, v); });
    idx.push(i*4, i*4 + 1, i*4 + 2, i*4, i*4 + 2, i*4 + 3); });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); pg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); pg.setIndex(idx);
  const pl = mk(pg, new THREE.MeshStandardMaterial({ name:'brass-plate', map:sheetOf, roughness:.4, metalness:.6 }), 'brass-plates'); pl.castShadow = false; shelf.add(pl);
}
// A shelved book is only an instance; the one being read is stood in for by a book of its own for as long as it is off the shelf.
const goneM = new THREE.Matrix4().makeScale(0, 0, 0);
const seat = r => { r.updateMatrix(); lib.setMatrixAt(r.userData.inst, r.matrix); lib.instanceMatrix.needsUpdate = true; };
function takeDown(id) {
  const r = libOf[id], g = bookOf(id, r.scale.x, r.scale.y, r.scale.z, false), [sm, , , , cm] = g.children[0].material;
  g.position.copy(r.position); Object.assign(g.userData, { base:r.userData.base, pull:r.userData.pull }); shelf.add(g);
  r.userData.lifted = true; lib.setMatrixAt(r.userData.inst, goneM); lib.instanceMatrix.needsUpdate = true;
  g.userData.shelved = () => { shelf.remove(g); sm.map.dispose(); sm.dispose(); cm.dispose(); g.children[0].geometry.dispose(); delete books[id];
    r.userData.lifted = false; r.position.copy(r.userData.base); seat(r); renderer.shadowMap.needsUpdate = true; };
  return g;
}

/* ================= display shelves (the bookshelf's corner bay) ================= */
// Laid out in a frame of its own, x across the bay and z out from the wall, then turned to face the room.
const disp = new THREE.Group(); disp.name = 'display-shelves'; disp.position.set(-2.98, 0, (SZ0 + BZ)/2); disp.rotation.y = Math.PI/2; room.add(disp); disp.updateMatrixWorld();
const dispAt = (x, y, z) => disp.localToWorld(new THREE.Vector3(x, y, z)).toArray(); // for what has to live in the room: lights and halos
const DW = BZ - SZ0 - .05, DD = .37, DL = [.8, 1.24, 1.68, 2.12], on = i => DL[i] + .018;
disp.add(roomUV(box(DW, 1.75, .02, M.wallL, 'display-back', [0, 1.675, .01])));
DL.forEach(y => disp.add(box(DW, .035, DD, M.woodL, 'display-shelf', [0, y, DD/2])));
const cabinet = new THREE.Group(); cabinet.name = 'cabinet'; disp.add(cabinet);
cabinet.add(box(DW, .78, DD + .01, M.wood, 'display-cabinet', [0, .39, (DD + .01)/2]));
[-.315, .315].forEach(x => cabinet.add(box(.6, .64, .012, M.woodD, 'cabinet-door', [x, .41, DD + .016], null, 1)));
[-.06, .06].forEach(x => cabinet.add(cyl(.012, .012, .05, 8, M.brass, 'knob', [x, .46, DD + .03], [Math.PI/2,0,0])));
[-.3, .3].forEach(x => { const s = mk(new THREE.CircleGeometry(.03, 16), new THREE.MeshBasicMaterial({ color:col('#ffe2b0') }), 'downlight', [x, 2.531, .2], [Math.PI/2,0,0]); disp.add(s); });
const exh = {};
const place = (g, id, x, y, z, ry = 0, tilt = -.1) => { if (!has(id)) return; g.position.set(x, y, z); g.rotation.set(tilt, ry, 0); disp.add(g); exh[id] = g; tag(g, { type:'item', id, view:'display' }); };
// an exhibit built from many small parts is drawn as one mesh per material
const weld = g => { g.updateMatrixWorld(true); const inv = g.matrixWorld.clone().invert(), by = new Map();
  g.traverse(o => { if (!o.isMesh) return; const c = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); c.applyMatrix4(o.matrixWorld.clone().premultiply(inv));
    if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    by.has(o.material) ? by.get(o.material).push(c) : by.set(o.material, [c]); });
  g.clear(); by.forEach((gs, m) => g.add(mk(mergeGeometries(gs), m, m.name))); return g; };
/* Lorescape, as its mark: two peaks leaning back on one slope, snow on both, and a trail of stepping stones down from the pass between them */
const peaks = new THREE.Group(); peaks.name = 'lorescape-peaks'; peaks.scale.setScalar(.85);
{ // drawn on the mark's own artboard — x to the right, y down, the ground line at y = 215 — and stood up on the slope
  const S = .0019, LEAN = .3, cL = Math.cos(LEAN), sL = Math.sin(LEAN), PH = .016, ZF = .092, LR = 5 * S, V3 = (...p) => new THREE.Vector3(...p);
  const blue = pbr('lore-blue', '#2f6bbd', { roughness:.42, clearcoat:.5, clearcoatRoughness:.3 }), rock = pbr('lore-rock', '#c6cedb', { roughness:.75 }), snow = pbr('lore-snow', '#ffffff', { roughness:.5, clearcoat:.3, clearcoatRoughness:.4 });
  const at = (x, y) => { const v = (215 - y) * S; return V3((x - 160) * S, PH + v * cL, ZF - v * sL); };
  const ZIG = [[0, 1], [.2, .74], [.38, .98], [.56, .68], [.78, .96], [1, 1]]; // the snow line across a face: how far along its foot, how far down from the summit
  // a peak is a pyramid whose front face lies in the slope, so the two fronts run into each other without a seam
  const peak = (x0, x1, ax, ay, snowTo) => { const A = at(ax, ay), d = 2 * (ZF - A.z), F0 = at(x0, 215), F1 = at(x1, 215), B0 = V3(F0.x, PH, ZF - d), B1 = V3(F1.x, PH, ZF - d), body = [], cap = [];
    [[F0, F1], [F1, B1], [B1, B0], [B0, F0]].forEach(([a, b]) => { body.push(a, b, A);
      const top = b.clone().sub(a).cross(A.clone().sub(a)).normalize().multiplyScalar(.0012).add(A), line = ZIG.map(([s, k]) => a.clone().lerp(b, s).sub(A).multiplyScalar(snowTo * k).add(top));
      for (let i = 1; i < line.length; i++) cap.push(line[i - 1], line[i], top); });
    [[body, rock, 'peak'], [cap, snow, 'peak-snow']].forEach(([pts, m, name]) => { const g = new THREE.BufferGeometry().setFromPoints(pts); g.computeVertexNormals(); peaks.add(mk(g, m, name)); });
    return [F0, F1, B0, B1, A]; };
  const [L, , LB, , A1] = peak(35, 201, 118, 80, .3), [, R, , RB, A2] = peak(95, 285, 190, 52, .3), pass = at(146.6, 126.5); // the pass is where the two inner slopes cross
  // the mark's line: over both summits by way of the pass, along the ground as far as the trail, and down the outer ridges behind
  const bead = new THREE.SphereGeometry(LR, 14, 10), beaded = new Set();
  [[L, A1, pass, A2, R], [A1, LB, L, at(138, 215)], [A2, RB, R, at(207, 215)]].forEach(run => run.forEach((p, i) => { if (!beaded.has(p)) { beaded.add(p); peaks.add(mk(bead, blue, 'peak-line', p.toArray())); }
    if (i) peaks.add(rod(run[i - 1].toArray(), p.toArray(), LR, blue, 'peak-line')); }));
  // the trail: the mark's dashes as stepping stones, each a white pebble set in a blue rim
  const slope = new THREE.Group(); slope.position.set(0, PH, ZF); slope.rotation.x = -LEAN; peaks.add(slope);
  const trail = new THREE.CatmullRomCurve3([[150,131], [166,144], [186,151], [202,163], [208,181], [200,198], [184,206], [163,209]].map(([x, y]) => V3((x - 160) * S, (215 - y) * S, 0)));
  const rim = rboxGeo(13 * S, 8.5 * S, .006, .0029), pebble = rboxGeo(8.6 * S, 4.2 * S, .006, .0029);
  for (let i = 0; i < 8; i++) { const p = trail.getPointAt((i + .5) / 8), t = trail.getTangentAt((i + .5) / 8), rz = Math.atan2(t.y, t.x);
    slope.add(mk(rim, blue, 'trail-stone', [p.x, p.y, .002], [0, 0, rz])); slope.add(mk(pebble, snow, 'trail-stone', [p.x, p.y, .0035], [0, 0, rz])); }
  peaks.add(box(.525, PH, .22, M.woodD, 'peaks-plinth', [0, PH/2, 0]));
  weld(peaks); }
place(peaks, 'p1', -.15, on(3), .19, -.12, 0);
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
place(deskClock, 'p3', .07, on(2), .21, 0, 0);
// the game bot's board: chequered, stood on a plate stand beside the print — the top shelf is above eye level, where a board laid flat would only show its edge
const board = new THREE.Group(); board.name = 'game-board';
{ const BS = .26, lean = new THREE.Group(); lean.position.set(0, .012, .028); lean.rotation.x = -.16; board.add(lean);
  const squares = ctex(256, 256, (x, w) => { const s = w/8; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.fillStyle = (r + c) % 2 ? '#1b1917' : C.cream; x.fillRect(c*s, r*s, s, s); } }, false);
  lean.add(box(BS, BS, .016, M.woodD, 'board-frame', [0, BS/2, -.008]));
  lean.add(mk(new THREE.PlaneGeometry(BS - .036, BS - .036), pbr('board-squares', '#ffffff', { map:squares, roughness:.4, clearcoat:.4, clearcoatRoughness:.25 }), 'board-squares', [0, BS/2, .0004]));
  lean.add(box(.03, .17, .01, M.wood, 'stand-back', [0, .085, -.021]));
  board.add(box(.15, .012, .085, M.wood, 'stand-base', [0, .006, 0])); board.add(box(.15, .012, .01, M.wood, 'stand-lip', [0, .018, .0375])); }
place(board, 'g2', .4, on(3), .15, -.15, 0);
// the book I wrote, face out and leaning on the back of the shelf: built like any other book, then turned so its front board faces the room
if (has('mb')) { const g = bookOf('mb', .17, .24, .03), [bg, fg] = fCols.mb;
  g.children[0].material[5] = new THREE.MeshStandardMaterial({ name:'cover-mb-front', roughness:.7, map:ctex(340, 480, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h);
    x.fillStyle = fg; [[30, 4], [40, 1.5]].forEach(([y, t]) => { x.fillRect(24, y, w - 48, t); x.fillRect(24, h - y - t, w - 48, t); });
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `600 40px ${SERIF}`;
    const lines = wrapText(x, ITEMS.mb.t, w - 60);
    lines.forEach((l, i) => x.fillText(l, w/2, h * .4 + (i - (lines.length - 1) / 2) * 56));
    x.font = `400 19px ${SERIF}`; x.fillText(ABOUT.name, w/2, h - 84); }) });
  place(g, 'mb', .5, on(1) + .12, .055, Math.PI, -.1); }

/* the award ceremony: a black-and-gold podium with the star on its top step, and beside it the envelope — seal broken, the winner's card half drawn */
const podium = new THREE.Group(); podium.name = 'award-podium';
{ const black = pbr('award-black', '#17140f', { roughness:.3, clearcoat:.7, clearcoatRoughness:.15 }), gold = pbr('award-gold', '#f2c14e', { ...metalTex, roughness:.3 }), paper = pbr('award-card', C.cream, { roughness:.8 }), wax = pbr('award-wax', '#a8261d', { roughness:.4, clearcoat:.6 });
  const SD = .09, steps = [[-.094, .09, .058, '2'], [0, .1, .085, '1'], [.094, .09, .04, '3']]; // x, width, height, place
  const places = ctex(192, 64, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = `700 54px ${SERIF}`; x.textAlign = 'center'; x.textBaseline = 'middle'; steps.forEach((s, i) => x.fillText(s[3], (i + .5) * w / 3, h/2 + 3)); });
  const numeral = pbr('award-numeral', '#f2c14e', { ...metalTex, roughness:.3, alphaMap:places, alphaTest:.5 });
  steps.forEach(([x, w, h], i) => { podium.add(mk(rboxGeo(w, h, SD, .004), black, 'podium-step', [x, h/2, 0])); podium.add(mk(rboxGeo(w + .006, .005, SD + .006, .002), gold, 'podium-trim', [x, h + .0025, 0]));
    const n = new THREE.PlaneGeometry(.03, .03), uv = n.attributes.uv; for (let j = 0; j < 4; j++) uv.setX(j, (uv.getX(j) + i) / 3); podium.add(mk(n, numeral, 'podium-numeral', [x, h/2, SD/2 + .0005])); });
  // the trophy: a star on a stem
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = i % 2 ? .0145 : .034; star[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); }
  const starGeo = new THREE.ExtrudeGeometry(star, { depth:.006, bevelEnabled:true, bevelThickness:.003, bevelSize:.002, bevelSegments:2 }).translate(0, 0, -.003);
  podium.add(cyl(.02, .024, .012, 24, black, 'trophy-base', [0, .096, 0])); podium.add(cyl(.016, .016, .004, 24, gold, 'trophy-collar', [0, .104, 0]));
  podium.add(cyl(.004, .006, .046, 12, gold, 'trophy-stem', [0, .129, 0])); podium.add(mk(starGeo, gold, 'trophy-star', [0, .164, 0]));
  // the envelope, stood on the second step: the card rises out of the pocket, the opened flap behind it
  const env = new THREE.Group(); env.position.set(-.094, .063, .006); env.rotation.x = -.2; podium.add(env);
  env.add(mk(rboxGeo(.08, .052, .005, .0015), black, 'envelope', [0, .026, 0])); env.add(mk(rboxGeo(.068, .046, .0012, .0005), paper, 'winner-card', [0, .052, 0]));
  env.add(mk(starGeo.clone().scale(.22, .22, .1), gold, 'card-star', [0, .0635, .001]));
  const flap = new THREE.Shape(); flap.moveTo(-.04, 0); flap.lineTo(.04, 0); flap.lineTo(0, .03);
  env.add(mk(new THREE.ExtrudeGeometry(flap, { depth:.0008, bevelEnabled:false }), black, 'envelope-flap', [0, .052, -.0034], [-.15, 0, 0]));
  [-1, 1].forEach(sx => env.add(rod([sx*.038, .05, .003], [0, .024, .003], .0007, gold, 'envelope-seam')));
  env.add(cyl(.007, .007, .003, 20, wax, 'wax-seal', [0, .024, .0035], [Math.PI/2, 0, 0]));
  // what is left of the gold shower
  const fleck = new THREE.BoxGeometry(.007, .0006, .007), fr = rng(11);
  for (let i = 0; i < 18; i++) { const x = (fr() - .5) * .3, z = (fr() - .35) * .16, st = steps.find(s => Math.abs(x - s[0]) < s[1]/2);
    podium.add(mk(fleck, gold, 'confetti', [x, (st && Math.abs(z) < SD/2 ? st[2] + .005 : 0) + .0006, z], [0, fr() * 3, 0])); }
  weld(podium); }
place(podium, 'aw', .42, on(2), .19, -.15, 0);

/* the Ironman bears: one for every run, beside the book the last run became; a run that took a prize has a cup in its raised hand */
// a box rolled over a radius at every edge and corner, its six faces keeping their own UVs and material slots; `warp` reshapes it afterwards
function softBox(w, h, d, r, seg, warp) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), cl = THREE.MathUtils.clamp;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(cl(v.x, r - w/2, w/2 - r), cl(v.y, r - h/2, h/2 - r), cl(v.z, r - d/2, d/2 - r)); v.sub(c).normalize(); n.setXYZ(i, v.x, v.y, v.z);
    v.multiplyScalar(r).add(c); if (warp) warp(v); p.setXYZ(i, v.x, v.y, v.z); }
  if (warp) { g.computeVertexNormals(); smoothNormals(g, 1); }
  return g;
}
const ironBear = (() => {
  const FUR = '#895629', MUZZLE = '#eec069', vinyl = (name, c, o) => pbr(name, c, { roughness:.45, clearcoat:.5, clearcoatRoughness:.3, ...o });
  const fur = vinyl('bear-fur', FUR), white = vinyl('bear-white', '#f6f1e6'), stand = pbr('bear-stand', '#24160f', { roughness:.35, clearcoat:.6, clearcoatRoughness:.2 }), printed = (name, map) => vinyl(name, '#ffffff', { map });
  const cape = vinyl('bear-cape', '#d22d25', { roughness:.6, clearcoat:.2, side:THREE.DoubleSide }), gold = pbr('cup-gold', '#f2c14e', { ...metalTex, roughness:.3 });
  // the head: narrower at the crown, a face printed on the front. The muzzle's colour runs round under the jaw and stops short of the back
  const HW = .09, HH = .105, HD = .078, headGeo = softBox(HW, HH, HD, .022, 14, v => { const t = v.y / HH + .5; v.x *= 1 - .2 * t; v.z *= 1 - .1 * t; });
  const face = ctex(256, 300, (x, w, h) => { x.fillStyle = FUR; x.fillRect(0, 0, w, h);
    x.fillStyle = MUZZLE; x.beginPath(); x.moveTo(0, h*.7); x.lineTo(w/2, h*.56); x.lineTo(w, h*.7); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.fillStyle = '#c6302a'; x.beginPath(); x.moveTo(w*.27, h*.8); x.bezierCurveTo(w*.27, h*.72, w*.34, h*.675, w*.41, h*.68); x.quadraticCurveTo(w*.56, h*.69, w*.71, h*.74);
    x.bezierCurveTo(w*.76, h*.78, w*.77, h*.85, w*.73, h*.89); x.bezierCurveTo(w*.62, h*.93, w*.4, h*.93, w*.33, h*.89); x.bezierCurveTo(w*.29, h*.86, w*.27, h*.83, w*.27, h*.8); x.fill();
    x.fillStyle = '#ffffff'; [0, 1].forEach(m => { const X = f => m ? w - f*w : f*w; x.beginPath(); x.moveTo(X(.13), h*.29); x.lineTo(X(.46), h*.35); x.bezierCurveTo(X(.44), h*.46, X(.19), h*.48, X(.13), h*.29); x.fill(); }); }, false);
  const cheek = back => ctex(128, 150, (x, w, h) => { x.setTransform(back ? -1 : 1, 0, 0, 1, back ? w : 0, 0); x.fillStyle = FUR; x.fillRect(0, 0, w, h); // drawn front edge first; `back` mirrors it for the side whose u runs the other way
    x.fillStyle = MUZZLE; x.beginPath(); x.moveTo(0, h*.7); x.bezierCurveTo(w*.4, h*.72, w*.62, h*.8, w*.62, h); x.lineTo(0, h); x.fill(); }, false);
  const jaw = ctex(64, 64, (x, w, h) => { x.fillStyle = FUR; x.fillRect(0, 0, w, h); x.fillStyle = MUZZLE; x.fillRect(0, 0, w, h*.62); }, false);
  const headMat = [printed('bear-cheek', cheek(false)), printed('bear-cheek', cheek(true)), fur, printed('bear-jaw', jaw), printed('bear-face', face), fur];
  const chest = ctex(128, 128, (x, w, h) => { x.fillStyle = FUR; x.fillRect(0, 0, w, h); x.fillStyle = x.strokeStyle = '#fbef4f'; x.font = '900 96px "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 6; x.strokeText('B', w/2, h/2 + 6); x.fillText('B', w/2, h/2 + 6); }, false);
  const bodyGeo = softBox(.054, .05, .04, .018, 8), bodyMat = [fur, fur, fur, fur, printed('bear-chest', chest), fur];
  const earGeo = new THREE.SphereGeometry(.019, 20, 14).scale(1, 1, .5), earInGeo = new THREE.SphereGeometry(.009, 16, 10).scale(1, 1, .5), legGeo = new THREE.CapsuleGeometry(.0085, .014, 6, 12);
  const limb = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 20, r, 10);
  const armUp = limb([[.018,.054,0], [.05,.05,.003], [.074,.06,.005], [.079,.09,.007], [.079,.112,.008]], .0115), armHip = limb([[-.02,.055,0], [-.04,.052,.006], [-.043,.04,.012], [-.038,.033,.016]], .0085);
  const fistGeo = softBox(.058, .05, .046, .021, 8), thumbGeo = new THREE.CapsuleGeometry(.0075, .02, 4, 10), handGeo = new THREE.SphereGeometry(.0115, 16, 12);
  // the cape: a sheet from the collar, blown out past the bear's right hand; its upper edge runs to the tip, its lower edge comes round from behind the back, so the sheet faces the room
  const capeGeo = new THREE.PlaneGeometry(1, 1, 10, 8), V = (...p) => new THREE.Vector3(...p);
  { const upper = new THREE.QuadraticBezierCurve3(V(-.026,.066,-.012), V(-.06,.07,-.016), V(-.105,.058,-.026)), lower = new THREE.QuadraticBezierCurve3(V(.02,.064,-.02), V(0,.034,-.036), V(-.056,.012,-.04));
    const p = capeGeo.attributes.position, uv = capeGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const s = uv.getX(i), t = 1 - uv.getY(i), belly = Math.sin(Math.PI * s), v = upper.getPoint(t).lerp(lower.getPoint(t), s);
      p.setXYZ(i, v.x - .008 * belly * t * t, v.y, v.z - .006 * belly * (1 - t) - (.006 * belly + .003 * Math.sin(s * 9)) * t); }
    capeGeo.computeVertexNormals(); }
  const cupGeo = new THREE.LatheGeometry([[0,0],[.0045,0],[.0045,.026],[.008,.03],[.0045,.034],[.006,.038],[.014,.043],[.021,.054],[.0245,.07],[.0255,.088],[.0235,.088],[.022,.07],[.0185,.056],[.01,.047],[0,.045]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
  const handleGeo = new THREE.TorusGeometry(.011, .0022, 8, 14, Math.PI);
  const standGeo = new THREE.LatheGeometry([[0,0],[.05,0],[.052,.003],[.052,.008],[.047,.012],[0,.012]].map(([a, b]) => new THREE.Vector2(a, b)), 32);
  return cup => { const g = new THREE.Group(), b = new THREE.Group(); g.name = 'ironman-bear'; g.scale.setScalar(1.1); b.position.y = .012; g.add(mk(standGeo, stand, 'bear-stand'), b);
    [-1, 1].forEach(s => { b.add(mk(legGeo, fur, 'bear-leg', [s*.013, .0155, 0], [0, 0, s*.12]));
      b.add(mk(earGeo, fur, 'bear-ear', [s*.027, .173, 0])); b.add(mk(earInGeo, white, 'bear-ear-inner', [s*.027, .173, .0062])); });
    b.add(mk(bodyGeo, bodyMat, 'bear-body', [0, .043, 0])); b.add(mk(headGeo, headMat, 'bear-head', [0, .1145, 0])); b.add(mk(capeGeo, cape, 'bear-cape'));
    b.add(mk(armHip, fur, 'bear-arm')); b.add(mk(handGeo, fur, 'bear-hand', [-.038, .032, .016]));
    b.add(mk(armUp, fur, 'bear-arm')); b.add(mk(fistGeo, fur, 'bear-fist', [.079, .13, .008])); b.add(mk(thumbGeo, fur, 'bear-thumb', [.074, .121, .03], [0, 0, 1.45]));
    if (cup) { const c = new THREE.Group(); c.name = 'cup'; c.position.set(.079, .148, .008); c.add(mk(cupGeo, gold, 'cup-bowl'));
      [-1, 1].forEach(s => c.add(mk(handleGeo, gold, 'cup-handle', [s*.023, .066, 0], [0, 0, -s*Math.PI/2]))); b.add(c); }
    return g; };
})();
['ir1', 'ir2', 'ir3'].forEach((id, i) => has(id) && place(ironBear(ITEMS[id].cup), id, -.45 + i*.24, on(1), .2, -.18, 0));

/* the talks, kept on tape where the certificates used to hang: a cassette each, stood on its long edge, the talk written on the label between its reels */
const VW = .215, VH = .118, VD = .029, tapeShell = pbr('tape-shell', '#1d1c1e', { ...plasticTex, roughness:.7, clearcoat:.3 });
const tapeOf = (id, ink) => { const it = ITEMS[id], g = new THREE.Group(); g.name = 'tape-' + id; g.add(mk(rboxGeo(VW, VH, VD, .004), tapeShell, 'tape-shell'));
  const faceTex = ctex(640, 340, (x, w, h) => { x.fillStyle = '#1d1c1e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2f2d30'; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20);
    const pane = (px, py, pw, ph, r) => { x.beginPath(); x.roundRect ? x.roundRect(px, py, pw, ph, r) : x.rect(px, py, pw, ph); };
    // a window over each reel: the full one on the left, the empty one on the right
    [[36, 78], [462, 46]].forEach(([wx, pack]) => { x.save(); pane(wx, 62, 142, 176, 12); x.fillStyle = '#0c0b0c'; x.fill(); x.clip(); const cx = wx + (wx < 300 ? 86 : 56), cy = 150;
      x.fillStyle = '#2b1a12'; x.beginPath(); x.arc(cx, cy, pack, 0, 6.283); x.fill(); x.fillStyle = '#e6e2d8'; x.beginPath(); x.arc(cx, cy, 36, 0, 6.283); x.fill();
      x.fillStyle = '#0c0b0c'; x.beginPath(); x.arc(cx, cy, 13, 0, 6.283); x.fill(); x.strokeStyle = '#e6e2d8'; x.lineWidth = 5; for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.moveTo(wx + 20, 62); x.lineTo(wx + 70, 62); x.lineTo(wx + 10, 238); x.lineTo(wx - 40, 238); x.fill(); x.restore(); });
    x.fillStyle = C.cream; pane(196, 50, 248, 200, 5); x.fill(); x.fillStyle = ink; x.fillRect(196, 50, 248, 44);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = C.cream; x.font = `700 24px ${SERIF}`; x.fillText('TALK · ' + (it.sp || ''), 320, 73);
    x.fillStyle = '#2a1d0e'; x.font = `600 25px ${SERIF}`; const lines = wrapText(x, it.t, 228); lines.forEach((l, i) => x.fillText(l, 320, 152 + (i - (lines.length - 1) / 2) * 32));
    x.font = `400 17px ${SERIF}`; x.fillStyle = ink; x.fillText(it.by || '', 320, 230);
    x.fillStyle = '#6d6b67'; x.font = '700 20px sans-serif'; x.textAlign = 'right'; x.fillText('VHS', w - 34, h - 40); x.textAlign = 'left'; x.fillText('E-180', 34, h - 40); });
  g.add(mk(new THREE.PlaneGeometry(VW - .01, VH - .01), std('tape-face-' + id, '#ffffff', { map:faceTex, roughness:.6 }), 'tape-face', [0, 0, VD/2 + .0004]));
  const spineTex = ctex(420, 48, (x, w, h) => { x.fillStyle = C.cream; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.fillRect(0, 0, 12, h); x.fillStyle = '#2a1d0e'; x.font = `600 22px ${SERIF}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText((it.sp ? it.sp + '　' : '') + it.t, 24, h/2 + 1, w - 36); });
  g.add(mk(new THREE.PlaneGeometry(.16, .018), std('tape-spine-' + id, '#ffffff', { map:spineTex, roughness:.7 }), 'tape-spine', [0, VH/2 + .0004, 0], [-Math.PI/2, 0, 0]));
  return g; };
[['tk1', C.c800, -.47, .16, .14], ['tk2', C.m800, -.235, .13, -.1]].forEach(([id, ink, x, z, ry]) => has(id) && place(tapeOf(id, ink), id, x, on(2) + VH/2, z, ry, 0));

/* ================= game cabinet: console + CRT, between the door and the desk ================= */
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
if (has('tv')) { exh.tv = tvc; tag(tvc, { type:'item', id:'tv', view:'back' }, [0, 0, .02]); }
setInterval(() => { tvF++; scrTex.redraw(); }, 120);

/* ================= window + outside ================= */
const WIN = { x0:.05, x1:2.65, y0:1.0, y1:2.5 };
const outsideTex = ctex(1024, 600, () => {}, false);
// the lake is a flat backdrop a little way behind the window
const outside = mk(new THREE.PlaneGeometry(7, 4.2), new THREE.MeshBasicMaterial({ name:'garden', map:outsideTex }), 'garden', [1.35, 1.75, -4.6]); outside.castShadow = false; outside.receiveShadow = false; room.add(outside);
// What the door looks out on: the same lake further along the shore, painted on its own canvas and laid over the left edge of the first.
// It is drawn mirrored, so its hillside rises towards the join, and mirrored again beyond that for the sight lines that leave the door almost along the wall.
const sideTex = ctex(1024, 600, () => {}, false); sideTex.wrapS = THREE.MirroredRepeatWrapping; sideTex.repeat.x = -2; sideTex.offset.x = 2;
const outsideL = mk(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ name:'garden-side', map:sideTex, transparent:true }), 'garden-side', [-8.45, 1.75, -4.59]); outsideL.castShadow = false; outsideL.receiveShadow = false; room.add(outsideL);
// The far shore is a long way off, so it should stay level with the eye. When the camera drops, both paintings sink with it (the loop
// does that), and this strip of their own sky stands behind to show above them.
const sky = mk(new THREE.PlaneGeometry(22, 3), new THREE.MeshBasicMaterial({ name:'sky', color:col(LAKE_SKY) }), 'sky', [-5.6, 3.6, -4.61]); sky.castShadow = false; sky.receiveShadow = false; room.add(sky);
// the lake itself, from under the house out to the foot of the painting
const waterTex = ctex(256, 256, () => {}, false); waterTex.wrapS = THREE.RepeatWrapping; waterTex.repeat.x = 10;
const water = mk(new THREE.PlaneGeometry(22, 2.2), new THREE.MeshBasicMaterial({ name:'water', map:waterTex }), 'water', [-5.6, -.35, -3.5], [-Math.PI/2,0,0]); water.castShadow = false; water.receiveShadow = false; room.add(water);
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

/* ================= door + deck ================= */
// an open doorway in the back wall: a frame and a threshold, no leaf
const DCX = (DOOR.x0 + DOOR.x1)/2, df = new THREE.Group(); df.name = 'door'; room.add(df);
[DOOR.x0, DOOR.x1].forEach(x => df.add(box(.08, DOOR.y1, .14, M.woodD, 'door-frame', [x, DOOR.y1/2, WZ])));
df.add(box(DOOR.x1 - DOOR.x0 + .16, .08, .14, M.woodD, 'door-frame', [DCX, DOOR.y1 + .02, WZ]));
df.add(box(DOOR.x1 - DOOR.x0 + .08, .03, .2, M.woodD, 'threshold', [DCX, .008, WZ - .01]));
// a jetty off the door: boards laid across and weathered grey, on two beams and four posts standing in the lake
const deckM = pbr('deck', '#81796c', { ...woodTex, roughness:.88 }), deckD = pbr('deck-dark', '#5d564c', { ...woodTex, roughness:.92 });
const deck = new THREE.Group(); deck.name = 'deck'; room.add(deck);
const DKW = 2.6, DKD = 1.5, DKZ = -2.62;
for (let i = 0; i < 10; i++) deck.add(box(DKW, .03, .138, deckM, 'deck-board', [DCX, -.035, DKZ - .074 - i*.148], null, 0));
[-1, 1].forEach(sd => { const x = DCX + sd*(DKW/2 - .12);
  deck.add(box(.07, .12, DKD, deckD, 'deck-beam', [x, -.11, DKZ - DKD/2], null, 2));
  [DKZ - .12, DKZ - DKD + .06].forEach(z => deck.add(cyl(.05, .05, .7, 12, deckD, 'deck-post', [x, -.4, z])));
  deck.add(cyl(.06, .065, 1.25, 14, deckD, 'piling', [DCX + sd*(DKW/2 + .1), -.15, DKZ - DKD + .12])); }); // a piling stands proud of each far corner
deck.add(box(DKW, .1, .04, deckD, 'deck-fascia', [DCX, -.07, DKZ - DKD - .005], null, 0));
// the rubber duck has come out with it
const duck = new THREE.Group(); duck.name = 'rubber-duck'; duck.position.set(DCX - .3, .018, -3.35); duck.rotation.y = .4;
const dkM = pbr('duck', C.yel, { roughness:.35, clearcoat:.6, clearcoatRoughness:.2 });
const dkb = mk(new THREE.SphereGeometry(.05, 20, 14), dkM, 'duck-body'); dkb.scale.set(1, .75, 1.3); duck.add(dkb);
duck.add(mk(new THREE.SphereGeometry(.032, 16, 12), dkM, 'duck-head', [0,.045,.04]));
duck.add(mk(new THREE.ConeGeometry(.012, .03, 8), std('beak', '#e0742c'), 'duck-beak', [0,.042,.077], [Math.PI/2,0,0]));
room.add(duck);

/* ================= desk ================= */
const desk = new THREE.Group(); desk.name = 'desk'; room.add(desk);
const DY = .76, DZ = -2.0, DX = 1.675;
desk.add(box(2.15, .05, .95, M.wood, 'desk-top', [DX, DY, DZ]));
desk.add(box(2.05, .14, .05, M.woodD, 'desk-apron', [DX, DY - .1, DZ + .44]));
[[.7,-2.42],[2.64,-2.42],[.7,-1.58],[2.64,-1.58]].forEach(([x,z]) => desk.add(box(.06, DY - .025, .06, M.woodD, 'desk-leg', [x, (DY - .025)/2, z])));
desk.add(box(1.94, .03, .04, M.woodD, 'stretcher', [DX, .15, -2.4]));
desk.add(box(.6, .1, .01, M.woodL, 'drawer', [DX, DY - .1, DZ + .468])); desk.add(cyl(.012, .012, .03, 8, M.brass, 'drawer-pull', [DX, DY - .1, DZ + .48], [Math.PI/2,0,0]));
// book rack (left): one book per series, spines to the room
const rack = new THREE.Group(); rack.name = 'book-rack'; rack.position.set(1.05, DY + .025, -2.24); rack.rotation.y = .12; desk.add(rack);
const RKW = .38, RKD = .22, BH = .29, BT = .105;
rack.add(box(RKW, .018, RKD, M.woodL, 'rack-base', [0, .009, 0])); rack.add(box(RKW - .036, .12, .014, M.woodL, 'rack-back', [0, .078, -RKD/2 + .007]));
[-1, 1].forEach(k => rack.add(box(.018, .19, RKD, M.woodL, 'rack-end', [k * (RKW/2 - .009), .113, 0])));
SERIES.forEach((id, i) => { const g = bookOf(id, .2, BH, BT); g.position.set((i - 1) * (BT + .006), .018 + BH/2, .006); g.rotation.y = -Math.PI/2; rack.add(g);
  tag(g, { type:'item', id, view:'desk' }, [0, .02, .06]); });
// a snake plant at the rack's left end: a glazed pot on its saucer, and a rosette of blades, the inner ones tallest
const plant = new THREE.Group(); plant.name = 'potted-plant'; plant.position.set(.74, DY + .025, -2.2); desk.add(plant);
const potM = pbr('pot', C.cream, { roughness:.4, clearcoat:.8, clearcoatRoughness:.15 });
plant.add(cyl(.06, .05, .012, 32, potM, 'saucer', [0,.006,0])); plant.add(cyl(.058, .042, .1, 32, potM, 'pot', [0,.062,0]));
plant.add(mk(new THREE.TorusGeometry(.057, .006, 10, 32), potM, 'pot-rim', [0,.112,0], [Math.PI/2,0,0]));
plant.add(cyl(.054, .054, .004, 24, std('soil', '#2a1d14', { roughness:1 }), 'soil', [0,.106,0]));
// each blade is a strip pinched to a point, creased down its middle and bowed away from the heart of the plant; banded across, with a pale margin
const bladeTex = texOf(cnv(32, 128, (x, w, h) => { const R = rng(7); x.fillStyle = '#2c5733'; x.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3 + R()*6) { x.fillStyle = 'rgba(132,170,112,' + (.25 + R()*.4) + ')'; x.fillRect(0, y, w, 1 + R()*3); }
  x.fillStyle = '#c9b65a'; x.fillRect(0, 0, 4, h); x.fillRect(w - 4, 0, 4, h); }));
const bladeR = rng(31), blades = [];
for (let i = 0; i < 11; i++) {
  const inner = i < 4, H = inner ? .26 + bladeR()*.08 : .15 + bladeR()*.1, W = .046 + bladeR()*.014, a = i*2.4 + bladeR()*.5, bow = inner ? .05 + bladeR()*.08 : .18 + bladeR()*.16, tw = (bladeR() - .5)*.9;
  const g = new THREE.PlaneGeometry(1, 1, 2, 8), p = g.attributes.position;
  for (let k = 0; k < p.count; k++) { const u = p.getX(k), v = p.getY(k) + .5, w = W * Math.min(1, .55 + v*1.5) * Math.pow(1 - Math.pow(v, 2.2), .8), c = Math.cos(tw*v), s = Math.sin(tw*v), z = -Math.abs(u)*w*.5;
    p.setXYZ(k, u*w*c + z*s, v*H, z*c - u*w*s + bow*Math.pow(v, 1.6)*H); }
  g.computeVertexNormals(); g.rotateY(a); const r = inner ? .008 : .024 + bladeR()*.01; g.translate(Math.sin(a)*r, .106, Math.cos(a)*r); blades.push(g);
}
plant.add(mk(mergeGeometries(blades), std('blade', '#fff', { map:bladeTex, roughness:.55, side:THREE.DoubleSide }), 'blades'));
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
  g.add(mk(new THREE.PlaneGeometry(.21, .28), new THREE.MeshStandardMaterial({ name:'draft-paper', map:draftTex(ITEMS[id].t, (ITEMS[id].k.match(/\d{4}\.\d{2}\.\d{2}/) || ['新稿'])[0]), normalMap:grit, normalScale:new THREE.Vector2(.3, .3), roughness:.9 }), 'draft-paper', [0,0,0], [-Math.PI/2,0,0]));
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
const portrait = new THREE.Group(); portrait.name = 'self-portrait'; portrait.position.set(2.22, DY + .025, -2.33); portrait.rotation.set(0, -.22, 0); desk.add(portrait);
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

/* ================= armchair + cat ================= */
const chair = new THREE.Group(); chair.name = 'armchair'; chair.position.set(2.4, 0, -.55); chair.rotation.y = -.6; room.add(chair); // by the right wall, in front of the desk's far end, turned to the room
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
// side table + books stack front right
const side = new THREE.Group(); side.position.set(2.6, 0, .9); room.add(side);
side.add(box(.6, .04, .5, M.wood, 'side-top', [0,.6,0])); [[-.26,-.21],[.26,-.21],[-.26,.21],[.26,.21]].forEach(([x,z]) => side.add(box(.04, .58, .04, M.woodD, 'side-leg', [x,.29,z])));
side.add(box(.5, .12, .04, M.woodD, 'side-drawer', [0,.52,.23]));
[[C.c900,.035],[C.m800,.04],[C.cream,.03]].forEach(([c, t], i) => side.add(box(.22 - i*.02, t, .3 - i*.02, std('stack-book', c), 'stack-book', [-.05, .62 + .02 + i*.038, 0], [0, i*.2, 0])));

/* ================= lighting ================= */
const hemi = new THREE.HemisphereLight(0xc6d2dc, 0x6b5440, 1); scene.add(hemi); // daylight off the walls from above, lamplight off the floor from below
const amb = new THREE.AmbientLight(0x5a5048, .6); scene.add(amb);
const lampLight2 = new THREE.PointLight(0xffa850, .8, 3.5, 1.6); lampLight2.position.set(2.42, DY + .5, -2.25); room.add(lampLight2);
// every point light is paid for on every pixel, so the shelf strip and the display downlights are each one light, placed between the fittings they stand for
const shelfLight = new THREE.PointLight(0xffc27a, 1.2, 4.2, 1.5); shelfLight.position.set(-2.4, 1.9, .1); room.add(shelfLight);
const displayLight = new THREE.PointLight(0xffd29a, .8, 1.9, 1.8); displayLight.position.set(...dispAt(0, 2.05, DD + .06)); room.add(displayLight);
// an overcast day's light through the window: cool, soft-edged, from high over the lake
const sunLight = new THREE.DirectionalLight(0xe6edf5, 2.2); sunLight.position.set(2.2, 3.4, -6); sunLight.castShadow = true; sunLight.shadow.mapSize.set(1024, 1024);
Object.assign(sunLight.shadow.camera, { left:-4, right:4, top:4, bottom:-4, near:1, far:14 }); sunLight.shadow.bias = -.0008; sunLight.shadow.radius = 5; sunLight.target.position.set(0, 0, 0); scene.add(sunLight, sunLight.target);
const roomFill = new THREE.PointLight(0xffd8b0, 2.3, 8, 1.2); roomFill.position.set(.5, 2.4, .5); room.add(roomFill);

/* environment reflections */
const pmrem = new THREE.PMREMGenerator(renderer);
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2.9, 6), new THREE.MeshBasicMaterial({ color:0x6e5a48, side:THREE.BackSide })));
  const add = (geo, c, k, p) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:new THREE.Color(c).multiplyScalar(k) })); m.position.set(...p); es.add(m); };
  add(new THREE.PlaneGeometry(2.6, 1.5), '#dfeaf0', 3.5, [1.35, .35, -2.9]);
  add(new THREE.PlaneGeometry(1.1, 2.15), '#dfeaf0', 3.5, [DCX, -.325, -2.9]);
  add(new THREE.SphereGeometry(.14, 12, 8), '#ffb066', 3, [2.42, -.45, -2.25]);
  add(new THREE.BoxGeometry(.05, 2.4, 2.7), '#ffbe78', .8, [-2.7, .1, .24]);
  add(new THREE.BoxGeometry(.3, .05, 1.2), '#ffd8a0', 1, [-2.8, 1.1, -1.8]);
  add(new THREE.PlaneGeometry(5.6, 5.6).rotateX(Math.PI/2), '#8a7a66', 1, [0, 1.38, 0]); // the ceiling, catching what the lamps and the daylight throw up
  scene.environment = pmrem.fromScene(es, .03).texture; scene.environmentIntensity = .85;
}

/* glow halos */
const haloTex = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2); g.addColorStop(0, 'rgba(255,230,180,1)'); g.addColorStop(.18, 'rgba(255,200,130,.55)'); g.addColorStop(.5, 'rgba(255,170,90,.12)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0,0,w,h); }, false);
const halo = (p, size, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:haloTex, transparent:true, opacity:op, depthWrite:false, blending:THREE.AdditiveBlending })); sp.position.set(...p); sp.scale.set(size, size, 1); room.add(sp); };
halo([2.4, DY + .52, -2.27], .5, .16);
[-.3, .3].forEach(x => halo(dispAt(x, 2.48, .2), .16, .18));

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
decal(aoRad, 1.3, 1.25, [2.4, .004, -.55], [-Math.PI/2, 0, .6], .9);
decal(aoRad, 2.55, 1.4, [1.675, .004, -1.95], FL, .75);
decal(aoRad, .9, .8, [2.6, .004, .9], FL, .8);
decal(aoRad, .95, .62, [.055, .004, -2.2], FL, .85);
[[-3, DOOR.x0], [DOOR.x1, 3]].forEach(([a, b]) => { decal(aoLin, b - a, .45, [(a + b)/2, .005, -2.27], [-Math.PI/2, 0, Math.PI], .8); decal(aoLin, b - a, .55, [(a + b)/2, .28, -2.494], [0, 0, Math.PI], .6); });
decal(aoLin, 4.2, .5, [-2.33, .005, -.43], [-Math.PI/2, 0, -Math.PI/2], .85);
decal(aoLin, 6, .5, [2.77, .005, 0], [-Math.PI/2, 0, Math.PI/2], .7);
decal(aoLin, 6, .55, [2.995, .28, 0], [0, -Math.PI/2, Math.PI], .6);
decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .5);
decal(aoLin, 6, .5, [2.995, 2.54, 0], [0, -Math.PI/2, 0], .5);
const DT = DY + .0265;
[[1.78, -2.08, .62, .46], [1.05, -2.24, .5, .34], [2.56, -2.33, .22, .22], [2.22, -2.33, .26, .18], [1.18, -1.75, .12, .12]].forEach(([x, z, w, d]) => decal(aoRad, w, d, [x, DT, z], FL, .7));
LV.slice(1, 8).forEach(y => decal(aoLin, SZ1 - BZ, .12, [-2.788, y - .02, (BZ + SZ1)/2], [0, Math.PI/2, Math.PI], .55));
[...DL.slice(1), LV[7]].forEach(y => decal(aoLin, DW, .12, [-2.957, y - .02, (SZ0 + BZ)/2], [0, Math.PI/2, Math.PI], .55));

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
const OUT = { x0:-3.3, x1:3.3, z0:-4.3, z1:-2.75, y0:0, y1:3.2 };
for (let i = 0; i < PN; i++) { pPos[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); pPos[i*3+1] = Math.random()*OUT.y1; pPos[i*3+2] = OUT.z0 + Math.random()*(OUT.z1-OUT.z0); pSeed[i] = Math.random(); }
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ size:.05, transparent:true, depthWrite:false, alphaTest:.2 });
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; room.add(points);
let partN = 0;
{ const w = SKY[season], bare = season === '冬'; // dress the window and the door for the season: the lake outside, and what falls past them
  paintLakeView(outsideTex.image, { trees:w.trees, bare }); outsideTex.needsUpdate = true;
  paintLakeView(sideTex.image, { trees:w.trees, bare, seed:23, boathouse:false, feather:.1 }); sideTex.needsUpdate = true;
  paintNearWater(waterTex.image, outsideTex.image, { trees:w.trees, bare }); waterTex.needsUpdate = true;
  pMat.map = shapeTex(w.shape); pMat.color.set(w.part); pMat.size = w.size; pMat.needsUpdate = true; partN = Q.low ? Math.ceil(w.n / 2) : w.n; pGeo.setDrawRange(0, partN); }

/* ================= UI ================= */
const st = { seen:{}, cur:null };
const $ = id => document.getElementById(id);
let toastT; const toast = t => { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); };
const panel = $('panel'), pbody = $('pbody');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const ghostBtn = 'justify-content:flex-start;margin-left:-6px;text-align:left;text-decoration:none';
const linkBtns = ls => ls && ls.length ? `<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin:var(--space-4) 0">${ls.map(l => `<a class="btn ${l.p ? 'btn-primary' : 'btn-secondary'}" href="${esc(l.u)}"${linkAttrs(l.u)} style="text-decoration:none">${esc(l.l)}</a>`).join('')}</div>` : '';
function renderPanel(mode) {
  let h = '';
  if (mode === 'about') { h = '<span class="card-kicker">書桌 · 自畫像</span><div style="display:flex;gap:var(--space-4);align-items:center;margin:var(--space-3) 0 var(--space-4)"><img src="' + esc(AVATAR) + '" alt="' + esc(ABOUT.name) + '" style="width:88px;height:88px;object-fit:cover;border-radius:var(--radius-md);box-shadow:var(--shadow-sm)"><div><div style="font-size:14px;font-style:italic">Hi, I&#39;m</div><h2 style="margin:0">' + esc(ABOUT.name) + '</h2><div style="font-size:14px;margin-top:4px">' + esc(ABOUT.tagline) + '</div></div></div>'
      + '<div class="body"><p>' + esc(ABOUT.bio) + '</p><p>' + esc(ABOUT.summary) + '</p></div>'
      + '<div class="rel"><span class="lab card-kicker">Find me at</span>' + ABOUT.channels.map(([k, v, u]) => '<a class="btn btn-ghost" href="' + esc(u) + '"' + linkAttrs(u) + ' style="' + ghostBtn + '">' + esc(k) + '：' + esc(v) + '</a>').join('') + '</div>'
; }
  else if (mode === 'list') { const recent = DRAFTS;
    h = '<span class="card-kicker">書桌 · 筆電</span><h2>GitHub 活動</h2><p class="intro">' + (GH.ok ? `過去 18 週，${GH.year} 年共 ${GH.total.toLocaleString()} 次 contributions。目前連續 ${GH.current} 天，最長 ${GH.longest} 天。` : '活動統計暫時讀不到，直接去 GitHub 看吧。') + '</p>'
      + linkBtns(ABOUT.channels.filter(c => c[0] === 'GitHub' || c[0] === 'Threads').map(c => c[0] === 'GitHub' ? { l:`GitHub · ${c[1]} ↗`, u:c[2], p:1 } : { l:'Threads ↗', u:c[2] }))
      + (recent.length ? '<div class="rel"><span class="lab card-kicker">最近 ' + recent.length + ' 篇 →</span>' + recent.map(k => '<button class="btn btn-ghost" data-item="' + k + '" style="' + ghostBtn + '">' + esc(ITEMS[k].t) + '</button>').join('') + '</div>' : ''); }
  else { const it = ITEMS[st.cur];
    const accent2 = it.kind === 'latest';
    h += `<div style="margin-top:var(--space-2)"><span class="card-kicker"${accent2 ? ' style="color:var(--color-accent-2-700)"' : ''}>${esc(it.k)}</span><h3>${esc(it.t)}</h3>${it.by ? `<div style="font-size:15px;font-style:italic;margin-top:-6px">${esc(it.by)}</div>` : ''}</div>`;
    if (it.tech && it.tech.length) h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:var(--space-2) 0 var(--space-3)">${it.tech.map(t => `<span class="tag tag-neutral">${esc(t)}</span>`).join('')}</div>`;
    if (it.list) h += `<div class="list" style="gap:var(--space-4);margin-bottom:var(--space-4)">${it.list.map(([y, kind, t, org, u]) => `<a href="${esc(u)}"${linkAttrs(u)} style="display:flex;flex-direction:column;gap:2px;text-decoration:none;color:var(--color-text)"><span class="card-kicker">${esc(y)} · ${esc(kind)}</span><span style="font-family:var(--font-heading);font-weight:600;font-size:20px;line-height:1.3">${esc(t)} ↗</span>${org ? `<span style="font-size:14px">${esc(org)}</span>` : ''}</a>`).join('')}</div>`;
    if (it.pct != null) h += `<div style="margin:var(--space-4) 0 var(--space-3)"><div class="prog"><i style="width:${it.pct}%"></i></div><span style="font-size:13px">已讀 ${it.pct}%</span></div>`;
    h += `<div class="body">${it.b.map(p => `<p${p.startsWith('（') ? ' style="font-style:italic"' : ''}>${esc(p)}</p>`).join('')}</div>`;
    h += linkBtns(it.links);
  }
  pbody.innerHTML = h; panel.scrollTop = 0; panel.classList.add('open'); document.body.classList.add('reading');
}
panel.addEventListener('click', e => {
  const a = e.target.closest('[data-act],[data-item]'); if (!a) return;
  if (a.dataset.item) return openItem(a.dataset.item);
  if (a.dataset.act === 'close') closePanel();
});

/* ================= camera focus ================= */
const objOf = id => books[id] || exh[id] || drafts[id] || null;
const VIEWS = { shelf:new THREE.Vector3(1, .12, .25), display:new THREE.Vector3(1, .1, .12), back:new THREE.Vector3(.12, .1, 1), desk:new THREE.Vector3(-.1, .75, 1) };
const DIST = { shelf:1.15, display:1.55, back:1.55, desk:1.35 };
// The orbit is held to a range of bearings that keeps the camera in the room while it faces the back wall and the desk. The display
// shelves are on the left wall and are looked at from the middle of the room, so they have a range of their own. A flight is held to
// neither (the loop sees to that) and lands inside the range it was given.
const AZ = { home:[controls.minAzimuthAngle, controls.maxAzimuthAngle], display:[.9, 1.6] };
let tween = null, focused = false, azWin = AZ.home;
const _sph = new THREE.Spherical();
function flyTo(tgt, pos, d = 1, az = AZ.home) { const o = pos.clone().sub(tgt); _sph.setFromVector3(o); _sph.theta = Math.max(az[0], Math.min(az[1], _sph.theta)); azWin = az;
  tween = { t:0, d, ft:controls.target.clone(), tt:tgt.clone(), fp:camera.position.clone(), tp:tgt.clone().add(o.setFromSpherical(_sph)) }; controls.enabled = false; }
function focus(obj, view) { obj.updateMatrixWorld(); const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()); const dir = VIEWS[view].clone(); if ((view === 'display' || view === 'back') && c.y < 1.5) dir.y = .55; dir.normalize(); flyTo(c, c.clone().addScaledVector(dir, DIST[view]), 1, AZ[view] || AZ.home); focused = true; }
function goHome() { flyTo(HOME.tgt, HOME.pos, 1.1); focused = false; }
function mark(id) { if (!st.seen[id]) { st.seen[id] = true; const c = ITEMS[id].cat, ids = IDS.filter(k => ITEMS[k].cat === c); if (ids.every(k => st.seen[k])) toast(`${CATS.find(x => x.id === c).name}的東西都翻過了`); if (IDS.every(k => st.seen[k]) && !st.allDone) { st.allDone = true; setTimeout(() => toast('整間書房都翻遍了。貓表示佩服。'), 2700); } } }
function openItem(id) { const it = ITEMS[id];
  if (books[id] || libOf[id]) return openBook(id);
  if (drafts[id]) return openDraft(id);
  if (it.kind === 'play' && GAMES.length) return openTV();
  st.cur = id; mark(id); const o = objOf(id); if (o) focus(o, o.userData.pick.view); renderPanel('item'); }
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
const KLAB = { reading:'書單', mybook:'我出的書', writing:'文章', series:'系列', latest:'最新文章', project:'Side Project', play:'Playbox' };
const DRAFTS = IDS.filter(k => drafts[k]);
const GAMES = has('tv') ? ITEMS.tv.list : [];
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
function release() { const o = LF.obj; if (!o) return; LF.parent.add(o); o.position.copy(LF.lp); o.quaternion.copy(LF.lq); o.scale.copy(LF.ls); o.visible = true; o.userData.lifted = false; LF.obj = null; o.userData.shelved && o.userData.shelved(); }
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
function closePages(P) {
  if (P.length % 2) P.push('<div class="colo">— 完 —</div>');
  return P;
}
function articlePages(it, html, n) {
  const by = it.by || (it.b && it.b[0]);
  const P = [endpaper(it.kind), (it.cover ? '<img class="cover-img" src="' + esc(it.cover) + '" alt="">' : '') + '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + (by ? '<p class="by">' + esc(by) + '</p>' : '') + '<span class="foot">' + esc(it.m) + '</span>'];
  if (html) for (let k = 0; k < n; k++) P.push({ col:k });
  else P.push('<span class="sec">內容</span><div class="body"><p><em>（全文暫時讀不到。）</em></p></div>');
  return closePages(P);
}
async function bookPages(id, D) {
  const it = ITEMS[id];
  if (it.aid) { const html = await loadArticle(it.aid); return { art:{ t:it.t, html }, pages:articlePages(it, html, html ? await countCols(html, D) : 0) }; }
  const body = '<div class="body">' + it.b.map(p => '<p>' + esc(p) + '</p>').join('') + '</div>';
  if (it.toc) {
    const P = [endpaper(it.kind), '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + body + linkBtns(it.links) + '<span class="foot">' + esc(it.m) + '</span>'];
    for (let a = 0; a < it.toc.length; a += TOC_ROWS) P.push('<span class="sec">目錄 · ' + (a + 1) + '–' + Math.min(a + TOC_ROWS, it.toc.length) + ' / ' + it.toc.length + '</span><div class="toc">'
      + it.toc.slice(a, a + TOC_ROWS).map(([aid, t, d]) => '<button data-art="' + aid + '"><span>' + esc(d) + '</span><b>' + esc(t) + '</b></button>').join('') + '</div>');
    return { art:null, pages:closePages(P) };
  }
  // a book from the reading list: its title page, and a card after it when there is something to put on one
  const card = it.b.length || it.pct != null || (it.links && it.links.length);
  return { art:null, pages:closePages([endpaper(it.kind),
    (it.cover ? '<img class="cover-img" src="' + esc(it.cover) + '" alt="">' : '') + '<span class="kick">' + esc(it.k) + '</span><h2>' + esc(it.t) + '</h2>' + (it.by ? '<p class="by">' + esc(it.by) + '</p>' : '') + '<span class="foot">' + esc(ABOUT.name) + ' 的書單</span>',
    ...(card ? ['<span class="sec">書卡</span>' + body + (it.pct != null ? '<div><div class="prog"><i style="width:' + it.pct + '%"></i></div><span style="font-size:13px">已讀 ' + it.pct + '%</span></div>' : '') + linkBtns(it.links) + (it.m ? '<span class="foot">' + esc(it.m) + '</span>' : '')] : [])]) };
}
function openBook(id) {
  if (RD.mode || RD.busy || LF.anim || TV.on) return; immerse(); RD.busy = true; mark(id); st.cur = id;
  const D = bookDims(), prep = bookPages(id, D); grab(books[id] || takeDown(id), 'book'); LF.t = 0; LF.anim = 1; LF.cb = () => prep.then(b => showBook(id, D, b));
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
  const a = e.target.closest('a,[data-act],[data-tab],[data-art]');
  if (a && a.tagName === 'A') return;
  if (a) { if (a.dataset.tab) return switchDraft(a.dataset.tab); if (a.dataset.art) return readEntry(a.dataset.art);
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
  TV.play = true; const g = GAMES[TV.sel];
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
const rootOf = hit => hit ? hit.object.userData.roots ? hit.object.userData.roots[hit.instanceId] : hit.object.userData.root : null; // the library is one mesh: its books answer by instance
function tipText(p) {
  if (p.type === 'item') return ITEMS[p.id].t; // everything in the room goes by its title alone
  if (p.type === 'list') return 'GitHub 活動';
  if (p.type === 'about') return '關於 Paul';
  return '';
}
const setMouse = e => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left)/r.width*2-1, -(e.clientY - r.top)/r.height*2+1); ray.setFromCamera(mouse, camera); };
renderer.domElement.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; });
renderer.domElement.addEventListener('pointermove', e => {
  if (lockCam) { tip.style.opacity = 0; hoverRoot = null; renderer.domElement.style.cursor = TV.on ? 'zoom-out' : 'default'; return; }
  setMouse(e); hoverRoot = rootOf(ray.intersectObjects(pickables, false)[0]);
  renderer.domElement.style.cursor = hoverRoot ? 'pointer' : 'grab';
  if (hoverRoot) { tip.textContent = tipText(hoverRoot.userData.pick); tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.style.opacity = 1; } else tip.style.opacity = 0;
});
renderer.domElement.addEventListener('pointerleave', () => { tip.style.opacity = 0; hoverRoot = null; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
  if (TV.on) { exitTV(); return; } if (lockCam) return;
  setMouse(e); const root = rootOf(ray.intersectObjects(pickables, false)[0]);
  if (!root) { if (panel.classList.contains('open')) closePanel(); return; }
  const p = root.userData.pick;
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
  dustN = DN / 2; dGeo.setDrawRange(0, dustN); partN = Math.ceil(SKY[season].n / 2); pGeo.setDrawRange(0, partN);
  try { localStorage.setItem(QKEY, 'low'); } catch {}
  toast('這台電腦跑得有點吃力，書房已切到輕量模式');
}

/* ================= loop ================= */
const clock = new THREE.Timer(); let viewX = 0, viewY = 0;
const roots = [...new Set(pickables.flatMap(m => m.userData.roots || m.userData.root))];
function loop(ts) {
  clock.update(ts); const dt = Math.min(clock.getDelta(), .05), t = clock.getElapsed(); judge(dt);
  let moved = LF.anim !== 0; // the only things that cast moving shadows: an object sliding out under the cursor, or one being lifted
  roots.forEach(r => { if (r.userData.lifted) return; const want = r === hoverRoot ? r.userData.base.clone().add(r.userData.pull) : r.userData.base; if (r.position.distanceToSquared(want) > 1e-10) { r.position.lerp(want, Math.min(1, dt * 10)); moved = true; if (r.userData.inst != null) seat(r); } });
  if (moved) renderer.shadowMap.needsUpdate = true;
  catBody.scale.y = .55 + Math.sin(t*1.6) * .02; head.rotation.z = Math.sin(t*.4) * .03;
  const w = SKY[season], pa = pGeo.attributes.position.array;
  for (let i = 0; i < partN; i++) { const s = pSeed[i]; pa[i*3+1] -= w.speed * (.7 + s*.6) * dt; pa[i*3] += Math.sin(t*1.1 + s*30) * w.sway * dt; if (pa[i*3+1] < 0) { pa[i*3+1] = OUT.y1; pa[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); } }
  pGeo.attributes.position.needsUpdate = true;
  const da = dGeo.attributes.position.array; for (let i = 0; i < dustN; i++) { const s0 = dSeed[i]; da[i*3] += Math.sin(t*.3 + s0*40) * .0009; da[i*3+1] += Math.sin(t*.21 + s0*30) * .0006 - .00012; da[i*3+2] += Math.cos(t*.27 + s0*20) * .0008; if (da[i*3+1] < .75) da[i*3+1] = 2.5; } dGeo.attributes.position.needsUpdate = true;
  if (tween) { tween.t = Math.min(1, tween.t + dt / tween.d); const k = 1 - Math.pow(1 - tween.t, 3); controls.target.lerpVectors(tween.ft, tween.tt, k); camera.position.lerpVectors(tween.fp, tween.tp, k); if (tween.t >= 1) { tween = null; controls.enabled = !lockCam; } }
  liftStep(dt);
  // the panel covers the right 460px, or the bottom 58% on a phone — slide the view so the subject stays in the open part
  const open = panel.classList.contains('open'), phone = innerWidth <= 760, k = Math.min(1, dt * 6);
  viewX += ((open && !phone ? 230 : 0) - viewX) * k; viewY += ((open && phone ? innerHeight * .29 : 0) - viewY) * k;
  if (Math.abs(viewX) > .5 || Math.abs(viewY) > .5) camera.setViewOffset(innerWidth, innerHeight, viewX, viewY, innerWidth, innerHeight); else camera.clearViewOffset();
  controls.minAzimuthAngle = tween ? -Infinity : azWin[0]; controls.maxAzimuthAngle = tween ? Infinity : azWin[1];
  controls.minPolarAngle = Math.max(.95, Math.acos(Math.min(1, (CAM_TOP - controls.target.y) / camera.position.distanceTo(controls.target)))); // the further out, the less it can climb
  controls.update();
  outside.position.y = outsideL.position.y = 1.75 + Math.min(0, camera.position.y - HOME.pos.y); // the far shore keeps level with a low eye
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
