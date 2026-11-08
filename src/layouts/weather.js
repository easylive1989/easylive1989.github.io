// The weather over the ink landscape follows Taichung's. Open-Meteo (free, no key, callable from the browser) gives the current
// WMO weather code and whether it is day; the code becomes one of the landscape's six looks, set as
// html[data-weather] (desk.css shows the layers for it).
// The answer is kept for half an hour in localStorage: DeskLayout's head applies it before the first paint, so a visitor moving
// between pages neither asks again nor sees the sun flash up first. If the service cannot be reached the sky stays clear.

const KEY = 'desk-weather';
const FRESH_MS = 30 * 60 * 1000;
const URL_NOW =
  'https://api.open-meteo.com/v1/forecast?latitude=24.1477&longitude=120.6736&current=weather_code,is_day&timezone=Asia%2FTaipei';

/** A WMO weather code and day or night, as one of the landscape's looks. */
function kindOf(code, isDay) {
  const kind = code >= 95 ? 'storm'
    : (code >= 51 && code <= 67) || (code >= 80 && code <= 82) ? 'rain'
    : code === 45 || code === 48 || (code >= 71 && code <= 77) ? 'fog'
    : code === 2 || code === 3 ? 'cloudy'
    : 'clear';
  // a clear or cloudy night is the moon's; rain, fog and storms look the same by night
  return isDay === 0 && (kind === 'clear' || kind === 'cloudy') ? 'night' : kind;
}

function apply(w) {
  document.documentElement.setAttribute('data-weather', w.kind);
}

function read() {
  try {
    const w = JSON.parse(localStorage.getItem(KEY) || 'null');
    return w && typeof w.kind === 'string' ? w : null;
  } catch {
    return null;
  }
}

const kept = read();
if (kept) apply(kept);
if (!kept || Date.now() - kept.t > FRESH_MS) {
  fetch(URL_NOW)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const c = d.current || {};
      const code = Number(c.weather_code);
      const w = { kind: kindOf(code, c.is_day), t: Date.now() };
      apply(w);
      try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
    })
    .catch(() => {});
}
