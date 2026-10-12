// The western study that goes with the lake in autumn: plastered walls, a plank floor, a mullioned window, and the frames of its furniture
// (the bookcase, the display shelves and their cupboard, the desk, the TV stand, the armchair, the side table). It is built the first time
// that world is wanted (study.js, WORLDS). What rests on the furniture (the books, the exhibits, the laptop, the TV, the dog on its cushion)
// belongs to neither room and stays in study.js; each frame is hung on the group its contents are in, so the two share coordinates.
export default function buildWestRoom(kit) {
  const { THREE, renderer, C, M, col, rng, cnv, texOf, ctex, mk, box, cyl, rod, std, pbr, lite, sheet, roomUV, weld, mergeGeometries, rboxGeo, plasterTex, grit, decal, aoLin, halo, dispAt } = kit;
  const { room, shelf, disp, desk, rack, tvc, chair, side, portrait, pf } = kit;
  const { LV, bays, SZ0, SZ1, BZ, DL, DW, DD, DX, DY, DZ, CW, CH, CD, RKW, RKD, WIN, WZ, DOOR, DCX, FDOOR } = kit;
  const parts = [], put = (parent, o) => { parent.add(o); parts.push(o); return o; };
  // the plaster's colour, laid over the relief that every room's walls share
  const plasterMap = sheet('plaster', 'color', [.4, .4]);
  const wall = std('wall', '#544739', { ...plasterTex, map:plasterMap, roughness:1 }), wallL = std('wall-light', '#665645', { ...plasterTex, map:plasterMap, roughness:1 });
  const ceil = std('ceiling', '#7d6f5e', { ...plasterTex, roughness:1 }); // painted flat: the walls' mottling would be most of a phone's screen
  const glassM = new THREE.MeshPhysicalMaterial(lite({ name:'glass', color:col('#c8d8d4'), transparent:true, opacity:.14, roughness:.04, metalness:0, depthWrite:false, clearcoat:1 }));

  /* ================= room shell ================= */
  // one 3 m tile of 12.5 cm boards, laid twice each way
  const [floorMap, floorNormal, floorRough] = ['color', 'normal', 'rough'].map(ch => { const t = sheet('floor', ch, [2, 2]); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; });
  // the boards stop at the outer face of the back wall, where the deck takes over; the tile keeps its scale
  const floorGeo = new THREE.PlaneGeometry(6, 5.6); for (let i = 0, uv = floorGeo.attributes.uv; i < uv.count; i++) uv.setY(i, uv.getY(i) * 5.6 / 6);
  put(room, mk(floorGeo, new THREE.MeshPhysicalMaterial(lite({ name:'floor', map:floorMap, normalMap:floorNormal, normalScale:new THREE.Vector2(.7, .7), roughnessMap:floorRough, roughness:1, clearcoat:.25, clearcoatRoughness:.35 })), 'floor', [0,0,.2], [-Math.PI/2,0,0]));
  put(room, roomUV(box(.1, 2.8, 6, wall, 'wall-left', [-3.05,1.4,0])));
  put(room, roomUV(box(.1, 2.8, 6, wall, 'wall-right', [3.05,1.4,0])));
  // back wall with the door and window openings
  put(room, roomUV(box(DOOR.x0 + 3.05, 2.8, .1, wall, 'wall-back', [(DOOR.x0 - 3.05)/2,1.4,-2.55])));
  put(room, roomUV(box(.05 - DOOR.x1, 2.8, .1, wall, 'wall-back', [(DOOR.x1 + .05)/2,1.4,-2.55])));
  put(room, roomUV(box(DOOR.x1 - DOOR.x0, 2.8 - DOOR.y1, .1, wall, 'wall-back', [(DOOR.x0 + DOOR.x1)/2,(2.8 + DOOR.y1)/2,-2.55])));
  put(room, roomUV(box(.4, 2.8, .1, wall, 'wall-back', [2.85,1.4,-2.55])));
  put(room, roomUV(box(2.6, 1.0, .1, wall, 'wall-back', [1.35,.5,-2.55])));
  put(room, roomUV(box(2.6, .3, .1, wall, 'wall-back', [1.35,2.65,-2.55])));
  // the front wall, behind the eye: whole, the door into the house only laid on it (it stays shut, so there is nothing to see through it)
  put(room, roomUV(box(6.2, 2.8, .1, wall, 'wall-front', [0,1.4,3.05])));
  put(room, roomUV(box(6.2, .1, 5.7, ceil, 'ceiling', [0,2.85,.15])));
  // crown + skirting
  [[-3,0,'x'],[3,0,'x']].forEach(([x]) => { put(room, box(.08, .12, 6, M.cream, 'crown', [x*.985,2.74,0])); put(room, box(.05, .14, 6, M.woodD, 'skirting', [x*.99,.07,0])); });
  [-2.48, 2.98].forEach(z => put(room, box(6, .12, .08, M.cream, 'crown', [0,2.74,z])));
  [[-3, DOOR.x0 - .04], [DOOR.x1 + .04, 3]].forEach(([a, b]) => put(room, box(b - a, .14, .05, M.woodD, 'skirting', [(a + b)/2,.07,-2.48])));
  [[-3, FDOOR.x0 - .04], [FDOOR.x1 + .04, 3]].forEach(([a, b]) => put(room, box(b - a, .14, .05, M.woodD, 'skirting', [(a + b)/2,.07,2.98])));

  /* ================= bookshelf (left wall): its carcass ================= */
  put(shelf, box(.4, 2.72, SZ1 - BZ + .03, M.woodD, 'shelf-carcass-back', [-2.98,1.36,(BZ+SZ1)/2]));
  bays.forEach(z => put(shelf, box(.4, 2.72, .05, M.wood, 'shelf-divider', [-2.81,1.36,z])));
  LV.forEach((y, i) => { const z0 = i === LV.length - 1 ? SZ0 : BZ; put(shelf, box(.4, .035, SZ1 - z0, M.wood, 'shelf-board', [-2.81,y,(z0+SZ1)/2])); }); // only the top board runs the whole length
  put(shelf, box(.42, .18, SZ1 - SZ0 + .05, M.wood, 'shelf-cornice', [-2.8,2.68,(SZ0+SZ1)/2]));
  LV.slice(1).forEach(y => { const s = mk(new THREE.BoxGeometry(.02, .01, SZ1 - BZ), new THREE.MeshBasicMaterial({ name:'led', color:col('#b98450') }), 'led-strip', [-2.63, y - .025, (BZ+SZ1)/2]); s.castShadow = false; put(shelf, s); });

  /* ================= display shelves: back, boards, cupboard, downlights ================= */
  put(disp, roomUV(box(DW, 1.75, .02, wallL, 'display-back', [0, 1.675, .01])));
  DL.forEach(y => put(disp, box(DW, .035, DD, M.woodL, 'display-shelf', [0, y, DD/2])));
  const cabinet = new THREE.Group(); cabinet.name = 'cabinet'; put(disp, cabinet);
  cabinet.add(box(DW, .78, DD + .01, M.wood, 'display-cabinet', [0, .39, (DD + .01)/2]));
  [-.315, .315].forEach(x => cabinet.add(box(.6, .64, .012, M.woodD, 'cabinet-door', [x, .41, DD + .016], null, 1)));
  [-.06, .06].forEach(x => cabinet.add(cyl(.012, .012, .05, 8, M.brass, 'knob', [x, .46, DD + .03], [Math.PI/2,0,0])));
  [-.3, .3].forEach(x => { const s = mk(new THREE.CircleGeometry(.03, 16), new THREE.MeshBasicMaterial({ color:col('#ffe2b0') }), 'downlight', [x, 2.531, .2], [Math.PI/2,0,0]); put(disp, s); });
  [-.3, .3].forEach(x => parts.push(halo(dispAt(x, 2.48, .2), .16, .18)));

  /* ================= game cabinet ================= */
  // a seventies TV stand: a paler teak with a tighter grain and a brighter lacquer than the rest of the room, hardboard at the back
  const teak = pbr('teak', '#c48c58', { map:sheet('wood', 'color', [.8, 1.6]), normalMap:sheet('wood', 'normal', [.8, 1.6]), roughnessMap:sheet('wood', 'rough', [.8, 1.6]), normalScale:new THREE.Vector2(.35, .35), roughness:.45, clearcoat:.6, clearcoatRoughness:.18 });
  const hardboard = std('hardboard', '#3b2b1f', { normalMap:grit, roughness:.92 });
  [-1, 1].forEach(sx => put(tvc, box(.025, CH - .05, CD, teak, 'cab-side', [sx*(CW/2 - .0125), .05 + (CH - .05)/2, 0])));
  put(tvc, box(CW + .02, .03, CD + .02, teak, 'cab-top', [0, CH - .015 + .02, 0]));
  put(tvc, box(CW, .025, CD, teak, 'cab-bottom', [0, .0625, 0]));
  put(tvc, box(CW - .05, .018, CD - .03, teak, 'cab-shelf', [0, .4, -.01]));
  put(tvc, box(CW, CH - .05, .012, hardboard, 'cab-back', [0, .05 + (CH - .05)/2, -CD/2 + .006]));
  put(tvc, box(CW, .04, .02, teak, 'cab-plinth', [0, .03, CD/2 - .02]));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => put(tvc, cyl(.012, .009, .05, 10, teak, 'cab-foot', [a*(CW/2 - .04), .025, b*(CD/2 - .04)])));

  /* ================= window ================= */
  const wf = new THREE.Group(); wf.name = 'window'; put(room, wf);
  wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y1 + .02, WZ]));
  wf.add(box(WIN.x1 - WIN.x0 + .1, .08, .14, M.woodD, 'window-frame', [1.35, WIN.y0, WZ]));
  [WIN.x0, WIN.x1].forEach(x => wf.add(box(.08, WIN.y1 - WIN.y0, .14, M.woodD, 'window-frame', [x, (WIN.y0+WIN.y1)/2, WZ])));
  [.917, 1.783].forEach(x => wf.add(box(.05, WIN.y1 - WIN.y0, .08, M.woodD, 'mullion', [x, (WIN.y0+WIN.y1)/2, WZ])));
  [1.55, 2.08].forEach(y => wf.add(box(WIN.x1 - WIN.x0, .045, .08, M.woodD, 'transom', [1.35, y, WZ])));
  const glass = mk(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), glassM, 'glass', [1.35, (WIN.y0+WIN.y1)/2, WZ - .02]); glass.castShadow = false; wf.add(glass);
  wf.add(box(WIN.x1 - WIN.x0 + .4, .04, .1, M.cream, 'sill', [1.35, WIN.y0 - .02, -2.5]));
  [WIN.x0 - .1, WIN.x1 + .1].forEach(x => wf.add(roomUV(box(.12, WIN.y1 - WIN.y0 + .3, .12, wallL, 'reveal', [x, (WIN.y0+WIN.y1)/2, -2.5]))));

  /* ================= door ================= */
  // an open doorway in the back wall: a frame and a threshold, no leaf
  const df = new THREE.Group(); df.name = 'door'; put(room, df);
  [DOOR.x0, DOOR.x1].forEach(x => df.add(box(.08, DOOR.y1, .14, M.woodD, 'door-frame', [x, DOOR.y1/2, WZ])));
  df.add(box(DOOR.x1 - DOOR.x0 + .16, .08, .14, M.woodD, 'door-frame', [DCX, DOOR.y1 + .02, WZ]));
  df.add(box(DOOR.x1 - DOOR.x0 + .08, .03, .2, M.woodD, 'threshold', [DCX, .008, WZ - .01]));

  /* ================= the front corner: the door into the house, and two paintings ================= */
  // The front wall is only ever seen from the bookshelf's side of the room, and then only its corner end: the door is there, and the
  // paintings hang on the stretch of the left wall between that corner and the bookshelf. No sun reaches either wall, so none of it throws
  // a shadow, and it is drawn as one mesh per material.
  const fw = new THREE.Group(); fw.name = 'front-corner'; put(room, fw);
  const FZ = 3, FCX = (FDOOR.x0 + FDOOR.x1)/2, FW = FDOOR.x1 - FDOOR.x0;
  [FDOOR.x0, FDOOR.x1].forEach(x => fw.add(box(.08, FDOOR.y1, .1, M.woodD, 'door-casing', [x, FDOOR.y1/2, FZ - .01])));
  fw.add(box(FW + .16, .08, .1, M.woodD, 'door-casing', [FCX, FDOOR.y1 + .02, FZ - .01]));
  fw.add(box(FW, FDOOR.y1, .04, M.wood, 'door-leaf', [FCX, FDOOR.y1/2, FZ - .02], null, 1));
  [[1.5, .8], [.55, .7]].forEach(([y, h]) => fw.add(box(FW - .2, h, .014, M.wood, 'door-panel', [FCX, y, FZ - .047], null, 1)));
  // the knob on the side away from the hinges, which are by the corner
  fw.add(cyl(.028, .028, .012, 16, M.brass, 'door-rose', [FDOOR.x1 - .08, .98, FZ - .046], [Math.PI/2,0,0]));
  fw.add(cyl(.01, .01, .03, 8, M.brass, 'door-knob', [FDOOR.x1 - .08, .98, FZ - .065], [Math.PI/2,0,0]));
  fw.add(mk(new THREE.SphereGeometry(.026, 16, 12), M.brass, 'door-knob', [FDOOR.x1 - .08, .98, FZ - .09]));
  // a painting is a canvas of its own at 4 px a centimetre, in a frame standing just off the left wall
  const painting = (w, h, z, y, frame, draw) => { fw.add(box(.03, h + .07, w + .07, frame, 'picture-frame', [-2.985, y, z]));
    fw.add(mk(new THREE.PlaneGeometry(w, h), std('painting', '#fff', { map:ctex(Math.round(w*400), Math.round(h*400), draw, false), roughness:.85 }), 'painting', [-2.969, y, z], [0, Math.PI/2, 0])); };
  // hills going blue towards a low sun, in a gilt frame
  painting(.62, .44, 2.5, 1.55, M.brass, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h*.7); g.addColorStop(0, '#34506a'); g.addColorStop(.6, '#b98a73'); g.addColorStop(1, '#e8b47a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#f6dfae'; x.beginPath(); x.arc(w*.68, h*.5, h*.08, 0, Math.PI*2); x.fill();
    [['#7b8a78', .52, .07, 1.7], ['#55665a', .64, .06, 2.9], ['#33423a', .78, .05, 4.3]].forEach(([c, b, a, f]) => { x.fillStyle = c; x.beginPath(); x.moveTo(0, h);
      for (let i = 0; i <= 40; i++) { const u = i/40; x.lineTo(u*w, h*(b - a*Math.sin(u*f + b*9) - a*.5*Math.sin(u*f*2.3))); } x.lineTo(w, h); x.fill(); });
    const r = rng(7); x.globalAlpha = .06; for (let i = 0; i < 300; i++) { x.fillStyle = r() < .5 ? '#fff' : '#000'; x.fillRect(r()*w, r()*h, 2 + r()*6, 1); } x.globalAlpha = 1; });
  // two soft fields of colour, one over the other, in dark wood
  painting(.28, .36, 1.92, 1.5, M.woodD, (x, w, h) => { x.fillStyle = '#3b2420'; x.fillRect(0, 0, w, h);
    [['#b0442e', .07, .48], ['#d79a3e', .6, .32]].forEach(([c, y0, hh]) => { x.fillStyle = c; x.globalAlpha = .35; for (let k = 0; k < 4; k++) x.fillRect(w*.1 + k*1.5, h*y0 + k*1.5, w*.8 - k*3, h*hh - k*3); });
    x.globalAlpha = 1; });
  weld(fw).traverse(o => { o.castShadow = false; });

  /* ================= desk: its frame, and what stands on it that is this room's own ================= */
  put(desk, box(2.15, .05, .95, M.wood, 'desk-top', [DX, DY, DZ]));
  put(desk, box(2.05, .14, .05, M.woodD, 'desk-apron', [DX, DY - .1, DZ + .44]));
  [[.7,-2.42],[2.64,-2.42],[.7,-1.58],[2.64,-1.58]].forEach(([x,z]) => put(desk, box(.06, DY - .025, .06, M.woodD, 'desk-leg', [x, (DY - .025)/2, z])));
  put(desk, box(1.94, .03, .04, M.woodD, 'stretcher', [DX, .15, -2.4]));
  put(desk, box(.6, .1, .01, M.woodL, 'drawer', [DX, DY - .1, DZ + .468])); put(desk, cyl(.012, .012, .03, 8, M.brass, 'drawer-pull', [DX, DY - .1, DZ + .48], [Math.PI/2,0,0]));
  // the rack the series stand in
  put(rack, box(RKW, .018, RKD, M.woodL, 'rack-base', [0, .009, 0])); put(rack, box(RKW - .036, .12, .014, M.woodL, 'rack-back', [0, .078, -RKD/2 + .007]));
  [-1, 1].forEach(s => put(rack, box(.018, .19, RKD, M.woodL, 'rack-end', [s * (RKW/2 - .009), .113, 0])));
  // a snake plant at the rack's left end: a glazed pot on its saucer, and a rosette of blades, the inner ones tallest
  const plant = new THREE.Group(); plant.name = 'potted-plant'; plant.position.set(.74, DY + .025, -2.2); put(desk, plant);
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
  put(desk, rod([2.26, DY + .033, -1.74], [2.42, DY + .033, -1.8], .006, M.ink, 'pen'));
  // right lamp
  const lampR = new THREE.Group(); lampR.name = 'side-lamp'; lampR.position.set(2.56, DY + .025, -2.33); put(desk, lampR);
  lampR.add(cyl(.07, .08, .025, 32, M.brass, 'lamp-base', [0,.012,0])); lampR.add(rod([0,.02,0], [0,.5,0], .009, M.brass, 'lamp-stem'));
  // the arm runs right to the apex of the shade, which hangs from a brass cap there
  lampR.add(rod([0,.5,0], [-.16,.572,.06], .008, M.brass, 'lamp-gooseneck')); lampR.add(cyl(.012, .02, .022, 24, M.brass, 'lamp-cap', [-.16,.562,.06]));
  const pleats = texOf(cnv(256, 8, (x, w, h) => { for (let i = 0; i < 32; i++) { const g = x.createLinearGradient(i*8, 0, i*8 + 8, 0); g.addColorStop(0, '#8f8f8f'); g.addColorStop(.45, '#fff'); g.addColorStop(1, '#a9a9a9'); x.fillStyle = g; x.fillRect(i*8, 0, 8, h); } }));
  lampR.add(mk(new THREE.ConeGeometry(.11, .1, 64, 1, true), std('pleated-shade', '#e8d3a8', { map:pleats, emissiveMap:pleats, roughness:.9, side:THREE.DoubleSide, emissive:col('#ffb15a'), emissiveIntensity:.35 }), 'pleated-shade', [-.16,.52,.06]));
  // the portrait's brass edges and the leg it leans on
  [[.1,0],[-.1,0]].forEach(([x]) => put(pf, box(.012, .25, .02, M.brass, 'frame-edge', [x,0,.003]))); [[.125],[-.125]].forEach(([y]) => put(pf, box(.21, .012, .02, M.brass, 'frame-edge', [0,y,.003])));
  put(portrait, rod([0,.01,-.07], [0,.2,-.005], .006, M.brass, 'easel-leg'));

  /* ================= armchair: all of it but the cushion ================= */
  [[-.3,-.28],[.3,-.28],[-.3,.3],[.3,.3]].forEach(([x,z]) => put(chair, box(.05, .32, .05, M.woodD, 'chair-leg', [x,.16,z])));
  put(chair, mk(rboxGeo(.72, .14, .7, .04), M.fabricD, 'chair-frame', [0,.36,0]));
  put(chair, mk(rboxGeo(.66, .62, .14, .05), M.fabric, 'chair-back', [0,.8,-.31], [-.12,0,0]));
  [-.34, .34].forEach(x => { put(chair, mk(rboxGeo(.09, .22, .62, .035), M.fabricD, 'chair-arm', [x,.55,0])); put(chair, box(.1, .04, .66, M.woodL, 'arm-rest', [x,.66,.01])); });

  /* ================= side table ================= */
  put(side, box(.6, .04, .5, M.wood, 'side-top', [0,.6,0])); [[-.26,-.21],[.26,-.21],[-.26,.21],[.26,.21]].forEach(([x,z]) => put(side, box(.04, .58, .04, M.woodD, 'side-leg', [x,.29,z])));
  put(side, box(.5, .12, .04, M.woodD, 'side-drawer', [0,.52,.23]));

  /* ================= contact shadows on the walls, and under the shelves' boards ================= */
  [[-3, DOOR.x0], [DOOR.x1, 3]].forEach(([a, b]) => parts.push(decal(aoLin, b - a, .55, [(a + b)/2, .28, -2.494], [0, 0, Math.PI], .6)));
  parts.push(decal(aoLin, 6, .55, [2.995, .28, 0], [0, -Math.PI/2, Math.PI], .6), decal(aoLin, 6, .5, [0, 2.54, -2.494], [0, 0, 0], .5), decal(aoLin, 6, .5, [2.995, 2.54, 0], [0, -Math.PI/2, 0], .5));
  parts.push(decal(aoLin, 6, .55, [0, .28, 2.994], [0, Math.PI, Math.PI], .6), decal(aoLin, 6, .5, [0, 2.54, 2.994], [0, Math.PI, 0], .5));
  LV.slice(1, 8).forEach(y => parts.push(decal(aoLin, SZ1 - BZ, .12, [-2.788, y - .02, (BZ + SZ1)/2], [0, Math.PI/2, Math.PI], .55)));
  [...DL.slice(1), LV[7]].forEach(y => parts.push(decal(aoLin, DW, .12, [-2.957, y - .02, (SZ0 + BZ)/2], [0, Math.PI/2, Math.PI], .55)));

  // the doorway onto the jetty, in the plane of the back wall
  return { parts, opening:(x, y) => x > DOOR.x0 + .04 && x < DOOR.x1 - .04 && y > 0 && y < DOOR.y1 };
}
