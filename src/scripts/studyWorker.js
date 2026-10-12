import { paintSheets } from './studyTextures.js';

// Paints the rooms' big procedural sheets off the main thread. One message in ({ low, keys }), one message out: each sheet asked for, its
// canvases as ImageBitmaps, transferred rather than copied, ready to drop into the textures study.js has already built its materials on.
self.onmessage = ({ data }) => {
  const sets = paintSheets(data.low, data.keys), out = {}, transfer = [];
  for (const k in sets) { out[k] = {}; for (const ch in sets[k]) { const b = sets[k][ch].transferToImageBitmap(); out[k][ch] = b; transfer.push(b); } }
  self.postMessage(out, transfer);
};
