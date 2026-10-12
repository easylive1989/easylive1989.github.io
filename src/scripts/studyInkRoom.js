// The Chinese study that goes with the landscape in ink. For now only a floor to stand on: its walls and its furniture come next.
export default function buildInkRoom(kit) {
  const { THREE, mk, std, room } = kit, parts = [];
  const floor = mk(new THREE.PlaneGeometry(6, 5.6), std('ink-floor', '#6f7477', { roughness:.85 }), 'ink-floor', [0, 0, .2], [-Math.PI/2, 0, 0]); floor.castShadow = false; room.add(floor); parts.push(floor);
  return { parts, opening:(x, y) => y > 0 && Math.hypot(x + 1.45, y - .92) < 1.01 };
}
