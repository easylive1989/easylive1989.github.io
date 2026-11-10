// The weather over the ink landscape follows Taichung's. Open-Meteo (free, no key, callable from the browser) gives the current
// WMO weather code and whether it is day; the code becomes one of the landscape's six looks, set as
// html[data-weather] (desk.css shows the layers for it). It gives the wind too (speed and gusts in km/h at 10 m, and the
// direction it blows from): that is set as html[data-wind] = "speed gusts direction", and the bamboo by the study bends in it
// (bambooSway.js), told by a 'desk:wind' event when a fresh answer comes in.
// The answer is kept for half an hour in localStorage: DeskLayout's head applies it before the first paint, so a visitor moving
// between pages neither asks again nor sees the sun flash up first. If the service cannot be reached the sky stays clear.

const KEY = 'desk-weather';
const FRESH_MS = 30 * 60 * 1000;
const URL_NOW =
  'https://api.open-meteo.com/v1/forecast?latitude=24.1477&longitude=120.6736&current=weather_code,is_day,wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=Asia%2FTaipei';

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
  if (w.wind) {
    document.documentElement.setAttribute('data-wind', w.wind.join(' '));
    document.dispatchEvent(new CustomEvent('desk:wind'));
  }
}

/** A number from the answer, or null when it is missing. */
function num(v) {
  return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);
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
// an answer kept from before the wind was asked for is asked again, so the bamboo need not wait half an hour
if (!kept || !('wind' in kept) || Date.now() - kept.t > FRESH_MS) {
  fetch(URL_NOW)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const c = d.current || {};
      const code = Number(c.weather_code);
      const speed = num(c.wind_speed_10m);
      const w = { kind: kindOf(code, c.is_day), t: Date.now() };
      w.wind = speed === null ? null : [speed, num(c.wind_gusts_10m) ?? speed, num(c.wind_direction_10m) ?? 0];
      apply(w);
      try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
    })
    .catch(() => {});
}
