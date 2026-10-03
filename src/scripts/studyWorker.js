import { paintSheets } from './studyTextures.js';

// Paints the room's big procedural sheets off the main thread. One message in ({ low }), one message out: every sheet's canvases as
// ImageBitmaps, transferred rather than copied, ready to drop into the textures study.js has already built its materials on.
self.onmessage = ({ data }) => {
  const sets = paintSheets(data.low), out = {}, transfer = [];
  for (const k in sets) { out[k] = {}; for (const ch in sets[k]) { const b = sets[k][ch].transferToImageBitmap(); out[k][ch] = b; transfer.push(b); } }
  self.postMessage(out, transfer);
};
