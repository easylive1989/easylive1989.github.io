import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { rng, cnv, texOf, plankFloor, woodGrain, plaster, weave, tabbyFur, spineAtlas, SPINES, pageEdges, brushedMetal, terracotta, leaf, paintGarden } from './studyTextures.js';

/* ================= content ================= */
// Filled at build time from Notion (src/lib/study.ts). Ids are the room's physical
// slots — a spine on the shelf, a spot in the niche, a page on the desk.
const DATA = JSON.parse(document.getElementById('study-data').textContent);
const { items: ITEMS, about: ABOUT, github: GH, site: SITE } = DATA;
const EGGS = {
  e1:{t:'椅子上的貓',b:['這張椅子已經不是我的了。']},
  e2:{t:'窗外的月亮',b:['寫不出來的時候，我會盯著它看。它從來不催稿。']},
  e3:{t:'書架頂上的橡皮鴨',b:['Rubber duck debugging 的那隻。所有 bug 都是先講給它聽的。']},
};
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

/* ================= renderer ================= */
const byId = id => document.getElementById(id);
const stage = byId('stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true }); }
catch (err) {
  // no WebGL (old browser, GPU blocklist): the room can't open, so leave the doors to the rest of the site
  const intro = byId('intro'); intro.classList.remove('off'); intro.style.pointerEvents = 'auto';
  intro.innerHTML = '<div>這間書房需要 WebGL 才能走進去。<br><br><a href="' + SITE.reading + '">書單</a> · <a href="' + SITE.archive + '">全部文章</a> · <a href="' + SITE.rss + '">RSS</a></div>';
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = col('#140e0a');
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
const LOW = matchMedia('(pointer: coarse)').matches; // phones get half-size canvases
// one sheet of grain, 2 m along it and 1 m across, stained three ways by the material colours
const woodC = woodGrain({ size:LOW ? 512 : 1024 }), woodTex = { map:texOf(woodC.color, [.5, 1]), normalMap:texOf(woodC.normal, [.5, 1], false), roughnessMap:texOf(woodC.rough, [.5, 1], false), normalScale:new THREE.Vector2(.35, .35) };
// one 2.5 m sheet of plaster, painted two shades by the material colours
const plasterC = plaster({ size:LOW ? 512 : 1024 }), plasterTex = { map:texOf(plasterC.color, [.4, .4]), normalMap:texOf(plasterC.normal, [.4, .4], false), roughnessMap:texOf(plasterC.rough, [.4, .4], false), normalScale:new THREE.Vector2(.55, .55) };
// upholstery: one 12.5 cm swatch of 4 mm threads
const fabricC = weave({ size:LOW ? 256 : 512 }), fabricTex = { map:texOf(fabricC.color, [8, 8]), normalMap:texOf(fabricC.normal, [8, 8], false), normalScale:new THREE.Vector2(.8, .8), roughness:1, sheen:.4, sheenRoughness:.75 };
const tabbyC = tabbyFur({ size:LOW ? 256 : 512 }), coatTex = { normalMap:texOf(tabbyC.normal, [1, 1], false), normalScale:new THREE.Vector2(.6, .6), roughness:1, sheen:.6, sheenRoughness:.6, sheenColor:col('#ffd9b0') };
// small things: metal that has been handled, a pot, a leaf, and a fine grit for paper and soil
const metalC = brushedMetal(), metalTex = { map:texOf(metalC.color), roughnessMap:texOf(metalC.rough, [1, 1], false), metalness:1 };
const potC = terracotta(), leafC = leaf(), grit = texOf(plasterC.normal, [1, 1], false);
const pbr = (name, c, o = {}) => new THREE.MeshPhysicalMaterial({ name, color:col(c), roughness:.6, ...o });
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
  cat: pbr('cat', '#ffffff', { map:texOf(tabbyC.color), ...coatTex }), catL: pbr('cat-light', '#f7dcb8', coatTex),
  cream: pbr('cream', C.cream, { roughness:.6, clearcoat:.2 }), terracotta: std('terracotta', '#ffffff', { map:texOf(potC.color), normalMap:texOf(potC.normal, [1, 1], false), roughness:.95 }),
  leaf: pbr('leaf', '#ffffff', { map:texOf(leafC.color), normalMap:texOf(leafC.normal, [1, 1], false), normalScale:new THREE.Vector2(.7, .7), roughness:.5, clearcoat:.35, clearcoatRoughness:.3, side:THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ name:'glass', color:col('#c8d8d4'), transparent:true, opacity:.14, roughness:.04, metalness:0, depthWrite:false, clearcoat:1 }),
});

/* ================= room shell ================= */
// one 3 m tile of 12.5 cm boards, laid twice each way
const floorC = plankFloor({ size:LOW ? 1024 : 2048 });
const [floorMap, floorNormal, floorRough] = [[floorC.color, true], [floorC.normal, false], [floorC.rough, false]].map(([c, srgb]) => { const t = texOf(c, [2, 2], srgb); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
room.add(mk(new THREE.PlaneGeometry(6, 6), new THREE.MeshPhysicalMaterial({ name:'floor', map:floorMap, normalMap:floorNormal, normalScale:new THREE.Vector2(.7, .7), roughnessMap:floorRough, roughness:1, clearcoat:.25, clearcoatRoughness:.35 }), 'floor', [0,0,0], [-Math.PI/2,0,0]));
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
// rubber duck (egg 3) on top of shelf
const duck = new THREE.Group(); duck.name = 'rubber-duck'; duck.position.set(-2.75, 2.785, .9); duck.rotation.y = 1.2;
const dkM = pbr('duck', C.yel, { roughness:.35, clearcoat:.6, clearcoatRoughness:.2 });
const dkb = mk(new THREE.SphereGeometry(.05, 20, 14), dkM, 'duck-body'); dkb.scale.set(1, .75, 1.3); duck.add(dkb);
duck.add(mk(new THREE.SphereGeometry(.032, 16, 12), dkM, 'duck-head', [0,.045,.04]));
duck.add(mk(new THREE.ConeGeometry(.012, .03, 8), std('beak', '#e0742c'), 'duck-beak', [0,.042,.077], [Math.PI/2,0,0]));
room.add(duck); tag(duck, { type:'egg', id:'e3', view:'duck' });

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
[-1, 1].forEach(sx => tvc.add(box(.025, CH - .05, CD, M.wood, 'cab-side', [sx*(CW/2 - .0125), .05 + (CH - .05)/2, 0])));
tvc.add(box(CW + .02, .03, CD + .02, M.woodL, 'cab-top', [0, CH - .015 + .02, 0]));
tvc.add(box(CW, .025, CD, M.wood, 'cab-bottom', [0, .0625, 0]));
tvc.add(box(CW - .05, .018, CD - .03, M.wood, 'cab-shelf', [0, .4, -.01]));
tvc.add(box(CW, CH - .05, .012, M.woodD, 'cab-back', [0, .05 + (CH - .05)/2, -CD/2 + .006]));
tvc.add(box(CW, .04, .02, M.woodD, 'cab-plinth', [0, .03, CD/2 - .02]));
[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => tvc.add(cyl(.012, .009, .05, 10, M.woodD, 'cab-foot', [a*(CW/2 - .04), .025, b*(CD/2 - .04)])));
// console
const plasticG = pbr('console-grey', '#b9b4aa', { roughness:.45, clearcoat:.3 }), plasticD = pbr('console-dark', '#2b2a2c', { roughness:.4, clearcoat:.4 });
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
pad.add(mk(new THREE.PlaneGeometry(.11, .035), plasticD, 'pad-face', [0, .0185, 0], [-Math.PI/2, 0, 0]));
pad.add(box(.026, .006, .008, plasticG, 'dpad', [-.035, .021, 0])); pad.add(box(.008, .006, .026, plasticG, 'dpad', [-.035, .021, 0]));
[[.03, -.004], [.048, .004]].forEach(([x, z]) => pad.add(cyl(.0065, .0065, .006, 14, std('pad-btn', C.mag, { roughness:.35 }), 'pad-btn', [x, .021, z])));
const cord = new THREE.CatmullRomCurve3([[.15, .428, .13], [.1, .43, .1], [.12, .427, .07], [.005, .44, .05], [.005, .447, .045]].map(p => new THREE.Vector3(...p)));
tvc.add(mk(new THREE.TubeGeometry(cord, 24, .0025, 6), M.ink, 'pad-cord'));
// cartridges on lower shelf: one per Playbox game, the last one leaning on the row
const cartCols = ['#c2412f', '#2e4a3a', C.c800, '#d9a23a', '#3b6c8f', C.m800];
const carts = has('tv') ? ITEMS.tv.list.slice(0, 10) : [];
carts.forEach(([, , name], i) => {
  const lt = ctex(64, 96, (x, w, h) => { x.fillStyle = cartCols[i % cartCols.length]; x.fillRect(0, 0, w, h); x.fillStyle = C.cream; x.font = '700 30px ' + SERIF; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText([...name][0].toUpperCase(), w/2, h/2); });
  const cm = std('cart-' + i, '#3a383c', { roughness:.5 }); const lm = std('cart-label-' + i, '#fff', { map:lt, roughness:.6 });
  const last = i > 0 && i === carts.length - 1;
  const g = mk(new THREE.BoxGeometry(.022, .1, .075), [lm, cm, cm, cm, cm, cm], 'cartridge-box', [-.27 + i*.027 + (last ? .012 : 0), .075 + .05, .02 + (i % 2) * .01]);
  g.rotation.z = last ? -.28 : 0; tvc.add(g); });
tvc.add(mk(rboxGeo(.14, .016, .06, .006), plasticD, 'spare-pad', [.18, .075 + .008, .05], [0, .3, 0]));
// CRT TV
const tv = new THREE.Group(); tv.name = 'crt-tv'; tv.position.set(0, CH + .02, -.01); tvc.add(tv);
const tvShell = pbr('tv-shell', '#d8cfbd', { roughness:.42, clearcoat:.35 }), tvTrim = pbr('tv-trim', '#3a3633', { roughness:.35, clearcoat:.4 });
const TW = .42, TH = .34;
tv.add(mk(rboxGeo(TW, TH, .2, .03), tvShell, 'tv-front', [0, TH/2, .07]));
const bk = mk(new THREE.CylinderGeometry(.11, .17, .2, 4, 1), tvShell, 'tv-back', [0, TH/2 - .01, -.11], [Math.PI/2, Math.PI/4, 0]); bk.scale.set(1.05, 1, .85); tv.add(bk);
tv.add(mk(rboxGeo(.3, .26, .012, .02), tvTrim, 'tv-bezel', [-.04, TH/2 + .01, .171]));
let tvF = 0;
const scrTex = ctex(256, 200, (x, w, h) => {
  const f = tvF; x.fillStyle = '#1b2b3f'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#25405e'; for (let i = 0; i < 6; i++) x.fillRect(((i*53 - f*1.5) % 300 + 300) % 300 - 40, 26 + (i % 3)*14, 34, 8);
  x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(205, 38, 14, 0, 6.283); x.fill();
  x.fillStyle = '#3d7a46'; x.fillRect(0, 150, w, 50); x.fillStyle = '#5aa55f'; for (let i = 0; i < w; i += 16) x.fillRect((i - f*3 % 16 + 16) % (w + 16) - 16, 150, 8, 6);
  x.fillStyle = '#8a5a34'; [[60, 118], [150, 100]].forEach(([bx, by]) => { const X = ((bx - f*3) % 300 + 300) % 300 - 20; x.fillRect(X, by, 30, 30); x.fillStyle = '#b07a50'; x.fillRect(X + 3, by + 3, 24, 4); x.fillStyle = '#8a5a34'; });
  const jy = 132 - Math.abs(Math.sin(f*.18))*38; x.fillStyle = C.mag; x.fillRect(48, jy, 16, 18); x.fillStyle = '#f2d2a8'; x.fillRect(50, jy - 10, 12, 10); x.fillStyle = C.cyan; x.fillRect(46, jy - 13, 20, 4);
  x.fillStyle = '#f3f2f2'; x.font = '700 18px monospace'; x.fillText('PLAYBOX', 12, 22); x.fillText(String(1200 + (f*10 % 9000)).padStart(5, '0'), 186, 22);
  if (Math.floor(f/8) % 2) { x.font = '700 14px monospace'; x.fillText('PRESS START', 82, 88); }
  x.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < h; y += 3) x.fillRect(0, y, w, 1);
  const g = x.createRadialGradient(w/2, h/2, 60, w/2, h/2, 170); g.addColorStop(0, 'rgba(255,255,255,.05)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
const scrGeo = new THREE.PlaneGeometry(.27, .22, 20, 16);
{ const p = scrGeo.attributes.position; for (let i = 0; i < p.count; i++) { const u = p.getX(i)/.135, v = p.getY(i)/.11; p.setZ(i, .012 * (1 - u*u) * (1 - v*v)); } scrGeo.computeVertexNormals(); }
const scrMat = new THREE.MeshPhysicalMaterial({ name:'crt-screen', map:scrTex, emissiveMap:scrTex, emissive:col('#ffffff'), emissiveIntensity:1.1, roughness:.15, clearcoat:.6, clearcoatRoughness:.12 });
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
const tvGlow = new THREE.PointLight(0x8fc8ff, .5, 1.6, 2); tvGlow.position.set(.02, CH + .2, -1.9); room.add(tvGlow);
if (has('tv')) { exh.tv = tvc; tag(tvc, { type:'item', id:'tv', view:'niche' }, [0, 0, .02]); }
setInterval(() => { tvF++; scrTex.redraw(); tvGlow.intensity = (night ? .55 : .2) * (.85 + Math.random()*.3); }, 120);

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
const moon = mk(new THREE.SphereGeometry(.16, 32, 20), new THREE.MeshBasicMaterial({ name:'moon', color:col('#f3ead2') }), 'moon', [2.15, 2.35, -4.4]); moon.castShadow = false; room.add(moon);
tag(moon, { type:'egg', id:'e2', view:'window' }, [0,0,0]);

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
tag(lampL, { type:'lamp' }, [0,0,0]);
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
const screenLight = new THREE.PointLight(0xdfe8ff, .25, 1.2, 2); screenLight.position.set(1.62, DY + .25, -1.85); room.add(screenLight);
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
tag(cat, { type:'egg', id:'e1', view:'chair' }, [0,.01,0]);
const rugShape = new THREE.Shape(); for (let i = 0; i <= 64; i++) { const a = i/64*Math.PI*2, r = .75 + Math.sin(a*7)*.05 + Math.sin(a*13)*.03; const x = Math.cos(a)*r*1.25, y = Math.sin(a)*r; i ? rugShape.lineTo(x, y) : rugShape.moveTo(x, y); }
const rug = mk(new THREE.ShapeGeometry(rugShape), M.fur, 'fur-rug', [-1.75,.006,-.25], [-Math.PI/2,0,.4]); rug.castShadow = false; room.add(rug);
const furC = cnv(256, 256, (x, w, h) => { x.fillStyle = '#000'; x.fillRect(0,0,w,h); for (let i = 0; i < 9000; i++) { const v = Math.floor(RN()*255); x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(RN()*w, RN()*h, 1.5, 1.5); } });
const furTex = texOf(furC, [9, 9], false);
for (let i = 1; i <= 9; i++) { const sm = new THREE.MeshStandardMaterial({ name:'fur-shell', color:col('#3a3633').lerp(col('#8a8479'), i/12), alphaMap:furTex, alphaTest:.12 + i*.085, roughness:1, side:THREE.DoubleSide });
  const shell = new THREE.Mesh(rug.geometry, sm); shell.position.set(-1.75, .006 + i*.0042, -.25); shell.rotation.copy(rug.rotation); shell.scale.setScalar(1 - i*.004); shell.receiveShadow = true; room.add(shell); }
// side table + books stack front right
const side = new THREE.Group(); side.position.set(2.6, 0, .9); room.add(side);
side.add(box(.6, .04, .5, M.wood, 'side-top', [0,.6,0])); [[-.26,-.21],[.26,-.21],[-.26,.21],[.26,.21]].forEach(([x,z]) => side.add(box(.04, .58, .04, M.woodD, 'side-leg', [x,.29,z])));
side.add(box(.5, .12, .04, M.woodD, 'side-drawer', [0,.52,.23]));
[[C.c900,.035],[C.m800,.04],[C.cream,.03]].forEach(([c, t], i) => side.add(box(.22 - i*.02, t, .3 - i*.02, std('stack-book', c), 'stack-book', [-.05, .62 + .02 + i*.038, 0], [0, i*.2, 0])));

/* ================= lighting ================= */
const hemi = new THREE.HemisphereLight(0x8a9bb0, 0x2a1a10, .25); scene.add(hemi);
const amb = new THREE.AmbientLight(0x3a2a20, .5); scene.add(amb);
const lampLight = new THREE.PointLight(0xffb066, 3.2, 4.5, 1.6); lampLight.position.set(.96, DY + .36, -2.15); lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -.002; lampLight.shadow.radius = 6; room.add(lampLight);
const lampLight2 = new THREE.PointLight(0xffa850, 2.4, 3.5, 1.6); lampLight2.position.set(2.42, DY + .5, -2.25); room.add(lampLight2);
const shelfLights = [-1.8, -.45, .9].map(z => { const l = new THREE.PointLight(0xffc27a, 1.6, 2.4, 1.8); l.position.set(-2.4, 1.95, z); room.add(l); return l; });
const shelfLow = new THREE.PointLight(0xffb870, .9, 2, 1.8); shelfLow.position.set(-2.4, .8, -.4); room.add(shelfLow);
const nicheLights = [[-1.45, 2.45], [-1.45, 1.65]].map(([x, y]) => { const l = new THREE.PointLight(0xffd29a, 1.1, 1.4, 1.8); l.position.set(x, y, -2.62); room.add(l); return l; });
const moonLight = new THREE.DirectionalLight(0x8fb0d8, .35); moonLight.position.set(2, 3, -6); moonLight.target.position.set(0, 0, 0); scene.add(moonLight, moonLight.target);
const sunLight = new THREE.DirectionalLight(0xfff0d8, 0); sunLight.position.set(2.2, 3.4, -6); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
Object.assign(sunLight.shadow.camera, { left:-4, right:4, top:4, bottom:-4, near:1, far:14 }); sunLight.shadow.bias = -.0008; sunLight.target.position.set(0,0,0); scene.add(sunLight, sunLight.target);
const roomFill = new THREE.PointLight(0xffd8b0, 0, 8, 1.2); roomFill.position.set(.5, 2.4, .5); room.add(roomFill);
lampLight2.castShadow = true; lampLight2.shadow.mapSize.set(512, 512); lampLight2.shadow.bias = -.002;
renderer.toneMappingExposure = 1.05;

/* environment reflections */
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
function buildEnv(isNight) {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2.9, 6), new THREE.MeshBasicMaterial({ color: isNight ? 0x1c130d : 0x6e5a48, side:THREE.BackSide })));
  const add = (geo, c, k, p) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:new THREE.Color(c).multiplyScalar(k) })); m.position.set(...p); es.add(m); };
  add(new THREE.PlaneGeometry(2.6, 1.5), isNight ? '#1e3442' : '#dfeaf0', isNight ? 1 : 3.5, [1.35, .35, -2.9]);
  add(new THREE.SphereGeometry(.12, 12, 8), '#ffc27a', isNight ? 14 : 4, [.56, -.6, -2.15]);
  add(new THREE.SphereGeometry(.14, 12, 8), '#ffb066', isNight ? 10 : 3, [2.42, -.45, -2.25]);
  add(new THREE.BoxGeometry(.05, 2.4, 3.8), '#ffbe78', isNight ? 2.2 : .8, [-2.7, .1, -.4]);
  add(new THREE.BoxGeometry(1.6, .05, .3), '#ffd8a0', isNight ? 3 : 1, [-1.45, 1.1, -2.7]);
  add(new THREE.PlaneGeometry(5.6, 5.6).rotateX(Math.PI/2), isNight ? '#1b2a3c' : '#dfeaf0', isNight ? 1.2 : 2.2, [0, 1.38, 0]); // the open roof: sky light from above
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(es, .03); scene.environment = envRT.texture; scene.environmentIntensity = isNight ? .9 : .7;
}

/* glow halos */
const haloTex = ctex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2); g.addColorStop(0, 'rgba(255,230,180,1)'); g.addColorStop(.18, 'rgba(255,200,130,.55)'); g.addColorStop(.5, 'rgba(255,170,90,.12)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0,0,w,h); }, false);
const halos = [];
const halo = (p, size, op) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:haloTex, transparent:true, opacity:op, depthWrite:false, blending:THREE.AdditiveBlending })); sp.position.set(...p); sp.scale.set(size, size, 1); sp.userData.op = op; room.add(sp); halos.push(sp); return sp; };
halo([.97, DY + .4, -2.17], .32, .55); halo([2.4, DY + .52, -2.27], .5, .45);
const candleHalo = halo([-2.1, 1.56, -2.7], .22, .7);
[[-1.9, 2.5], [-1.0, 2.5]].forEach(([x, y]) => halo([x, y, -2.72], .16, .5));

/* dust in lamplight */
const DN = 260, dPos = new Float32Array(DN*3), dSeed = new Float32Array(DN);
for (let i = 0; i < DN; i++) { dPos[i*3] = -.2 + RN()*3; dPos[i*3+1] = .8 + RN()*1.7; dPos[i*3+2] = -2.4 + RN()*1.8; dSeed[i] = RN(); }
const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
const dustMat = new THREE.PointsMaterial({ size:.008, color:col('#ffdcaa'), transparent:true, opacity:.55, depthWrite:false, blending:THREE.AdditiveBlending, map:haloTex });
const dust = new THREE.Points(dGeo, dustMat); dust.frustumCulled = false; room.add(dust);

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

/* ================= seasons + day/night ================= */
const SEASONS = ['春','夏','秋','冬'];
const SKY = {
  '春': { day:['#cfe2e6','#9cc79a'], trees:['#6aa35a','#87b86b','#e6a3bd','#f1c2d2','#4f8a4a'], line:'春 · 窗外落花', part:'#f1b8cc', shape:'petal', n:140, speed:.35, sway:.5, size:.035 },
  '夏': { day:['#c8dde6','#6f9f63'], trees:['#3f7a3e','#2f6232','#5c9550','#264f2a','#4b8746'], line:'夏 · 午後雷陣雨', part:'#b8d4e4', shape:'rain', n:500, speed:4.5, sway:0, size:.06 },
  '秋': { day:['#e6d9c4','#a08a52'], trees:['#c46a2c','#d9932f','#a8432a','#e2b246','#6f6a35'], line:'秋 · 晴時多雲，落葉', part:'#d4782e', shape:'leaf', n:90, speed:.45, sway:.7, size:.05 },
  '冬': { day:['#dfe5ea','#c9d1d6'], trees:['#e9eef1','#c5cfd5','#8a979e','#f4f6f7','#a7b3b9'], line:'冬 · 初雪', part:'#ffffff', shape:'snow', n:420, speed:.5, sway:.25, size:.03 },
};
let season = (() => { const mo = new Date().getMonth() + 1; return mo >= 3 && mo <= 5 ? '春' : mo >= 6 && mo <= 8 ? '夏' : mo >= 9 && mo <= 11 ? '秋' : '冬'; })();
let night = true;
function paintOutside() {
  const s = SKY[season]; scene.background.set(night ? '#0e151e' : s.day[0]);
  paintGarden(outsideTex.image, { sky:s.day, trees:s.trees, bare:season === '冬', night });
  outsideTex.needsUpdate = true;
}
const shapeTex = kind => ctex(64, 64, (x, w, h) => { x.clearRect(0,0,w,h); x.fillStyle = '#fff'; x.beginPath();
  if (kind === 'rain') x.fillRect(30, 2, 3, 60); else if (kind === 'leaf') { x.ellipse(32,32,26,13,.6,0,Math.PI*2); x.fill(); } else if (kind === 'petal') { x.ellipse(32,32,20,12,0,0,Math.PI*2); x.fill(); } else { x.arc(32,32,18,0,Math.PI*2); x.fill(); } }, false);
const PN = 500, pPos = new Float32Array(PN*3), pSeed = new Float32Array(PN);
const OUT = { x0:-.6, x1:3.3, z0:-4.3, z1:-2.75, y0:0, y1:3.2 };
for (let i = 0; i < PN; i++) { pPos[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); pPos[i*3+1] = Math.random()*OUT.y1; pPos[i*3+2] = OUT.z0 + Math.random()*(OUT.z1-OUT.z0); pSeed[i] = Math.random(); }
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ size:.05, transparent:true, depthWrite:false, alphaTest:.2 });
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; room.add(points);
const texCache = {};
function setSeason(s) {
  season = s; const w = SKY[s]; paintOutside();
  pMat.map = texCache[w.shape] || (texCache[w.shape] = shapeTex(w.shape)); pMat.color.set(w.part); pMat.size = w.size; pMat.needsUpdate = true; pGeo.setDrawRange(0, w.n);
  (document.getElementById('wxline') || {}).textContent = w.line + (night ? ' · 夜' : ' · 白天');
  document.getElementById('bSeason').textContent = '窗外：' + s;
}
function setNight(n) {
  night = n; paintOutside(); buildEnv(n); halos.forEach(h => h.material.opacity = n ? h.userData.op : h.userData.op * .35); dustMat.opacity = n ? .55 : .25;
  moon.visible = n; stars.visible = n;
  lampLight.intensity = n ? 3.2 : 1.2; lampLight2.intensity = n ? 2.4 : .8; shelfLights.forEach(l => l.intensity = n ? 1.6 : .6); nicheLights.forEach(l => l.intensity = n ? 1.1 : .5); shelfLow.intensity = n ? .9 : .3;
  hemi.intensity = n ? .16 : .7; amb.intensity = n ? .22 : .4; moonLight.intensity = n ? .35 : 0; sunLight.intensity = n ? 0 : 2.6; roomFill.intensity = n ? .5 : 1.6;
  renderer.toneMappingExposure = n ? 1.3 : 1.05;
  document.getElementById('bLight').textContent = n ? '天亮' : '入夜';
  (document.getElementById('wxline') || {}).textContent = SKY[season].line + (n ? ' · 夜' : ' · 白天');
}
/* stars for the open roof — a far dome, on at night only */
const SN = 240, sPos = new Float32Array(SN*3);
for (let i = 0; i < SN; i++) { const th = Math.random()*Math.PI*2, ph = Math.acos(.15 + Math.random()*.83); sPos[i*3] = Math.sin(ph)*Math.cos(th)*40; sPos[i*3+1] = Math.cos(ph)*40; sPos[i*3+2] = Math.sin(ph)*Math.sin(th)*40; }
const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ size:2, sizeAttenuation:false, color:col('#dfe8ff'), transparent:true, opacity:.8, depthWrite:false })); stars.frustumCulled = false; scene.add(stars);
setSeason(season); setNight(night);

/* ================= UI ================= */
const st = { seen:{}, eggs:{}, cur:null, about:false };
const $ = id => document.getElementById(id);
let toastT; const toast = t => { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); };
function renderChips() {
  $('chips').innerHTML = CATS.map(c => { const ids = IDS.filter(k => ITEMS[k].cat === c.id), n = ids.filter(k => st.seen[k]).length; if (!ids.length) return '';
    return `<span class="tag ${n === ids.length ? 'tag-accent' : n ? 'tag-outline' : 'tag-neutral'}">${n === ids.length ? '✓ ' : ''}${c.name} ${n}/${ids.length}</span>`; }).join('')
    + `<span class="tag ${st.about ? 'tag-accent' : 'tag-neutral'}">${st.about ? '✓ ' : ''}自畫像</span><span class="count">彩蛋 ${Object.keys(st.eggs).length} / 3</span>`;
}
const panel = $('panel'), pbody = $('pbody');
const esc = s => s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const where = id => ({ shelf:'書架', display:'展示架', desk:'書桌' }[ITEMS[id].cat]);
const ghostBtn = 'justify-content:flex-start;margin-left:-6px;text-align:left;text-decoration:none';
const linkBtns = ls => ls && ls.length ? `<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin:var(--space-4) 0">${ls.map(l => `<a class="btn ${l.p ? 'btn-primary' : 'btn-secondary'}" href="${esc(l.u)}"${linkAttrs(l.u)} style="text-decoration:none">${esc(l.l)}</a>`).join('')}</div>` : '';
function renderPanel(mode) {
  let h = '';
  if (mode === 'egg') { const e = EGGS[st.cur]; h = `<span class="card-kicker" style="color:var(--color-accent-2-700)">彩蛋 · ${Object.keys(st.eggs).length} / 3</span><h2>${e.t}</h2><div class="body">${e.b.map(p => `<p>${p}</p>`).join('')}</div>`; }
  else if (mode === 'about') { h = '<span class="card-kicker">書桌 · 自畫像</span><div style="display:flex;gap:var(--space-4);align-items:center;margin:var(--space-3) 0 var(--space-4)"><img src="' + esc(AVATAR) + '" alt="' + esc(ABOUT.name) + '" style="width:88px;height:88px;object-fit:cover;border-radius:var(--radius-md);box-shadow:var(--shadow-sm)"><div><div style="font-size:14px;font-style:italic">Hi, I&#39;m</div><h2 style="margin:0">' + esc(ABOUT.name) + '</h2><div style="font-size:14px;margin-top:4px">' + esc(ABOUT.tagline) + '</div></div></div>'
      + '<div class="body"><p>' + esc(ABOUT.bio) + '</p><p>' + esc(ABOUT.summary) + '</p></div>'
      + '<div class="rel"><span class="lab card-kicker">Find me at</span>' + ABOUT.channels.map(([k, v, u]) => '<a class="btn btn-ghost" href="' + esc(u) + '"' + linkAttrs(u) + ' style="' + ghostBtn + '">' + esc(k) + '：' + esc(v) + '</a>').join('') + '</div>'
      + '<div class="rel"><span class="lab card-kicker">站內</span><a class="btn btn-ghost" href="' + esc(SITE.reading) + '" style="' + ghostBtn + '">書單</a><a class="btn btn-ghost" href="' + esc(SITE.archive) + '" style="' + ghostBtn + '">全部文章</a><a class="btn btn-ghost" href="' + esc(SITE.rss) + '" style="' + ghostBtn + '">RSS</a></div>'; }
  else if (mode === 'list') { const recent = IDS.filter(k => /^w\d$/.test(k));
    h = '<span class="card-kicker">書桌 · 筆電</span><h2>GitHub 活動</h2><p class="intro">' + (GH.ok ? `過去 18 週，${GH.year} 年共 ${GH.total.toLocaleString()} 次 contributions。目前連續 ${GH.current} 天，最長 ${GH.longest} 天。` : '活動統計暫時讀不到，直接去 GitHub 看吧。') + '</p>'
      + linkBtns(ABOUT.channels.filter(c => c[0] === 'GitHub' || c[0] === 'Threads').map(c => c[0] === 'GitHub' ? { l:`GitHub · ${c[1]} ↗`, u:c[2], p:1 } : { l:'Threads ↗', u:c[2] }))
      + (recent.length ? '<div class="rel"><span class="lab card-kicker">最近 ' + recent.length + ' 篇 →</span>' + recent.map(k => '<button class="btn btn-ghost" data-item="' + k + '" style="' + ghostBtn + '">' + esc(ITEMS[k].t) + '</button>').join('') + '</div>' : '')
      + '<div class="rel"><a class="btn btn-ghost" href="' + esc(SITE.archive) + '" style="' + ghostBtn + '">全部文章 →</a></div>'; }
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
const VIEWS = { shelf:new THREE.Vector3(1, .12, .25), niche:new THREE.Vector3(.12, .1, 1), desk:new THREE.Vector3(-.1, .75, 1), chair:new THREE.Vector3(.5, .6, 1), window:new THREE.Vector3(-.3, 0, 1), duck:new THREE.Vector3(1, -.3, .3) };
const DIST = { shelf:1.15, niche:1.55, desk:1.35, chair:1.4, window:2.6, duck:1.1 };
let tween = null, focused = false;
function flyTo(tgt, pos, d = 1) { tween = { t:0, d, ft:controls.target.clone(), tt:tgt.clone(), fp:camera.position.clone(), tp:pos.clone() }; controls.enabled = false; }
function focus(obj, view) { obj.updateMatrixWorld(); const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()); const dir = VIEWS[view].clone(); if (view === 'niche' && c.y < 1.5) dir.y = .55; dir.normalize(); flyTo(c, c.clone().addScaledVector(dir, DIST[view])); focused = true; }
function goHome() { flyTo(HOME.tgt, HOME.pos, 1.1); focused = false; }
function mark(id) { if (!st.seen[id]) { st.seen[id] = true; renderChips(); const c = ITEMS[id].cat, ids = IDS.filter(k => ITEMS[k].cat === c); if (ids.every(k => st.seen[k])) toast(`${CATS.find(x => x.id === c).name}的東西都翻過了`); if (IDS.every(k => st.seen[k]) && !st.allDone) { st.allDone = true; setTimeout(() => toast('整間書房都翻遍了。貓表示佩服。'), 2700); } } }
function openItem(id) { st.cur = id; mark(id); const o = objOf(id); if (o) focus(o, books[id] ? 'shelf' : exh[id] ? 'niche' : 'desk'); renderPanel('item'); }
function openList() { focus(laptop, 'desk'); renderPanel('list'); }
function openAbout() { st.about = true; renderChips(); focus(portrait, 'desk'); renderPanel('about'); }
function openEgg(id, obj, view) { if (!st.eggs[id]) { st.eggs[id] = true; toast(`找到彩蛋 ${Object.keys(st.eggs).length} / 3`); renderChips(); } st.cur = id; focus(obj, view); renderPanel('egg'); }
function closePanel() { panel.classList.remove('open'); document.body.classList.remove('reading'); goHome(); }
$('bRandom').onclick = () => { const pool = IDS.filter(k => !st.seen[k]); const p = pool.length ? pool : IDS; openItem(p[Math.floor(Math.random()*p.length)]); };
$('bLight').onclick = () => { setNight(!night); toast(night ? '入夜了。檯燈亮起來。' : '天亮了。'); };
$('bSeason').onclick = () => { setSeason(SEASONS[(SEASONS.indexOf(season)+1) % 4]); toast('窗外換季：' + SKY[season].line); };
addEventListener('keydown', e => { if (/INPUT|TEXTAREA/.test(e.target.tagName)) return; if (e.key === 'Escape') closePanel(); });

/* ================= picking ================= */
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $('tip');
let hoverRoot = null, down = null;
function tipText(p) {
  if (p.type === 'item') { const it = ITEMS[p.id]; const lab = { reading:'書單', mybook:'我出的書', writing:'文章', series:'系列', older:'較早的文章', cabinet:'作品櫃', project:'Side Project', play:'Playbox', award:'競賽與演講' }[it.kind]; return `${lab} · ${it.t}`; }
  if (p.type === 'list') return '筆電 · GitHub 活動';
  if (p.type === 'about') return '自畫像 · 關於 Paul';
  if (p.type === 'lamp') return night ? '檯燈 · 點一下天亮' : '檯燈 · 點一下入夜';
  if (p.type === 'egg') return st.eggs[p.id] ? EGGS[p.id].t : '……咦？';
  return '';
}
const setMouse = e => { const r = renderer.domElement.getBoundingClientRect(); mouse.set((e.clientX - r.left)/r.width*2-1, -(e.clientY - r.top)/r.height*2+1); ray.setFromCamera(mouse, camera); };
renderer.domElement.addEventListener('pointerdown', e => { down = { x:e.clientX, y:e.clientY }; });
renderer.domElement.addEventListener('pointermove', e => {
  setMouse(e); const hit = ray.intersectObjects(pickables, false)[0]; hoverRoot = hit ? hit.object.userData.root : null;
  renderer.domElement.style.cursor = hoverRoot ? 'pointer' : 'grab';
  if (hoverRoot) { tip.textContent = tipText(hoverRoot.userData.pick); tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; tip.style.opacity = 1; } else tip.style.opacity = 0;
});
renderer.domElement.addEventListener('pointerleave', () => { tip.style.opacity = 0; hoverRoot = null; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
  setMouse(e); const hit = ray.intersectObjects(pickables, false)[0];
  if (!hit) { if (panel.classList.contains('open')) closePanel(); return; }
  const root = hit.object.userData.root, p = root.userData.pick;
  if (p.type === 'item') openItem(p.id); else if (p.type === 'list') openList(); else if (p.type === 'about') openAbout();
  else if (p.type === 'lamp') $('bLight').onclick(); else if (p.type === 'egg') openEgg(p.id, root, p.view);
});

/* ================= loop ================= */
const clock = new THREE.Timer(); let viewX = 0, viewY = 0;
const roots = [...new Set(pickables.map(m => m.userData.root))];
renderChips();
function loop(ts) {
  clock.update(ts); const dt = Math.min(clock.getDelta(), .05), t = clock.getElapsed();
  roots.forEach(r => { const want = r === hoverRoot ? r.userData.base.clone().add(r.userData.pull) : r.userData.base; r.position.lerp(want, Math.min(1, dt * 10)); });
  const fl = .85 + Math.sin(t*13) * .06 + Math.sin(t*7.3) * .08 + (Math.random() - .5) * .06; candleLight.intensity = .5 * fl; flame.scale.set(1, 2.2 * fl, 1);
  catBody.scale.y = .55 + Math.sin(t*1.6) * .02; head.rotation.z = Math.sin(t*.4) * .03;
  const w = SKY[season], pa = pGeo.attributes.position.array;
  for (let i = 0; i < w.n; i++) { const s = pSeed[i]; pa[i*3+1] -= w.speed * (.7 + s*.6) * dt; pa[i*3] += Math.sin(t*1.1 + s*30) * w.sway * dt; if (pa[i*3+1] < 0) { pa[i*3+1] = OUT.y1; pa[i*3] = OUT.x0 + Math.random()*(OUT.x1-OUT.x0); } }
  pGeo.attributes.position.needsUpdate = true;
  const da = dGeo.attributes.position.array; for (let i = 0; i < DN; i++) { const s0 = dSeed[i]; da[i*3] += Math.sin(t*.3 + s0*40) * .0009; da[i*3+1] += Math.sin(t*.21 + s0*30) * .0006 - .00012; da[i*3+2] += Math.cos(t*.27 + s0*20) * .0008; if (da[i*3+1] < .75) da[i*3+1] = 2.5; } dGeo.attributes.position.needsUpdate = true;
  candleHalo.material.opacity = candleHalo.userData.op * fl * (night ? 1 : .4);
  if (tween) { tween.t = Math.min(1, tween.t + dt / tween.d); const k = 1 - Math.pow(1 - tween.t, 3); controls.target.lerpVectors(tween.ft, tween.tt, k); camera.position.lerpVectors(tween.fp, tween.tp, k); if (tween.t >= 1) { tween = null; controls.enabled = true; } }
  // the panel covers the right 460px, or the bottom 58% on a phone — slide the view so the subject stays in the open part
  const open = panel.classList.contains('open'), phone = innerWidth <= 760, k = Math.min(1, dt * 6);
  viewX += ((open && !phone ? 230 : 0) - viewX) * k; viewY += ((open && phone ? innerHeight * .29 : 0) - viewY) * k;
  if (Math.abs(viewX) > .5 || Math.abs(viewY) > .5) camera.setViewOffset(innerWidth, innerHeight, viewX, viewY, innerWidth, innerHeight); else camera.clearViewOffset();
  controls.update(); renderer.render(scene, camera);
}
renderer.setAnimationLoop(loop);
window.__study = { loop, openItem, openList, openAbout, setNight, setSeason };
flyTo(HOME.tgt, HOME.pos, 2.2);
setTimeout(() => $('intro').classList.add('off'), 300);
// a portrait screen would crop the room to a sliver, so widen the vertical field of view as it narrows
const fitCamera = () => { camera.aspect = innerWidth/innerHeight; camera.fov = camera.aspect >= 1 ? 52 : Math.min(85, 52 + (1 - camera.aspect) * 60); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };
addEventListener('resize', fitCamera); fitCamera();
if (matchMedia('(pointer: coarse)').matches) { const hint = document.querySelector('#dock .hint'); if (hint) hint.textContent = '拖曳環顧 · 雙指縮放 · 點房間裡的東西'; }
document.fonts && document.fonts.ready.then(() => texts.forEach(t => t.redraw()));
