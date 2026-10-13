// The Japanese room that goes with the lake under snow. For now only a floor to stand on: its screens and its furniture come next.
export default function buildSnowRoom(kit) {
  const { THREE, mk, std, room } = kit, parts = [];
  const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('snow-tatami', '#bdb686', { roughness:.95 }), 'snow-tatami', [0, 0, .2], [-Math.PI / 2, 0, 0]); floor.castShadow = false; room.add(floor); parts.push(floor);
  return { parts, opening:(x, y) => y > 0 && y < 2.03 && x > -2.145 && x < -.835 };
}
