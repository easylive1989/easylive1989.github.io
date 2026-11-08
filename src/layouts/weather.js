// The weather over the ink landscape follows Taichung's. Open-Meteo (free, no key, callable from the browser) gives the current
// WMO weather code, whether it is day, and the temperature; the code becomes one of the landscape's six looks, set as
// html[data-weather] (desk.css shows the layers for it), and a line such as 「台中・小雨 21°C」 goes in the landscape's corner.
// The answer is kept for half an hour in localStorage: DeskLayout's head applies it before the first paint, so a visitor moving
// between pages neither asks again nor sees the sun flash up first. If the service cannot be reached the sky stays clear.

const KEY = 'desk-weather';
const FRESH_MS = 30 * 60 * 1000;
const URL_NOW =
  'https://api.open-meteo.com/v1/forecast?latitude=24.1477&longitude=120.6736&current=temperature_2m,weather_code,is_day&timezone=Asia%2FTaipei';

const WORDS = {
  0: '晴', 1: '大致晴朗', 2: '多雲', 3: '陰', 45: '霧', 48: '霧',
  51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨', 56: '凍雨', 57: '凍雨',
  61: '小雨', 63: '雨', 65: '大雨', 66: '凍雨', 67: '凍雨',
  71: '小雪', 73: '雪', 75: '大雪', 77: '雪粒',
  80: '陣雨', 81: '陣雨', 82: '大陣雨', 95: '雷雨', 96: '雷雨', 99: '雷雨',
};

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
  document.querySelectorAll('.ink-land .w-label').forEach((el) => { el.textContent = w.label; });
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
      const kind = kindOf(code, c.is_day);
      const word = (WORDS[code] || '') + (kind === 'night' ? '的夜' : '');
      const temp = Number.isFinite(c.temperature_2m) ? ` ${Math.round(c.temperature_2m)}°C` : '';
      const w = { kind, label: `台中・${word || '天氣'}${temp}`, t: Date.now() };
      apply(w);
      try { localStorage.setItem(KEY, JSON.stringify(w)); } catch {}
    })
    .catch(() => {});
}
