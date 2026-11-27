// Yesterday's page views from GoatCounter, sent to Discord: how many, against the day before, the pages read most and
// where readers came from. Run each morning by .github/workflows/goatcounter-daily.yml.
// "Yesterday" is a day in Taipei (UTC+8), 00:00 to 24:00 there.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://paulchwu.goatcounter.com';
const TOP = 5;
const TZ_HOURS = 8;
const DAY_MS = 24 * 3600 * 1000;

/** The start of the Taipei day `daysAgo` days before the one `now` falls in, as a UTC instant. */
export function taipeiDayStart(now, daysAgo) {
  const local = new Date(now.getTime() + TZ_HOURS * 3600 * 1000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TZ_HOURS * 3600 * 1000;
  return new Date(midnight - daysAgo * DAY_MS);
}

/** 2026-11-26 for the Taipei day that starts at this instant. */
const dayLabel = (start) => new Date(start.getTime() + TZ_HOURS * 3600 * 1000).toISOString().slice(0, 10);

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

async function api(token, page, start, end, extra = {}) {
  const q = new URLSearchParams({ start: iso(start), end: iso(end), ...extra });
  const res = await fetch(`${SITE}/api/v0/stats/${page}?${q}`, {
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GoatCounter ${page}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** The Discord message, from what GoatCounter answered. */
export function formatReport({ day, total, previous, hits, refs }) {
  const diff = total - previous;
  const trend = previous === 0 ? '' : `（前一天 ${previous}，${diff >= 0 ? '+' : ''}${diff}）`;
  const lines = [`📊 **${day} 瀏覽數：${total}**${trend}`];
  const pages = hits.filter((h) => !h.event && h.count > 0).slice(0, TOP);
  if (pages.length) {
    lines.push('', '**讀最多的頁面**');
    for (const h of pages) lines.push(`- ${h.title || h.path}（${h.count}）`);
  }
  const from = refs.filter((r) => r.count > 0).slice(0, TOP);
  if (from.length) {
    lines.push('', '**從哪裡來**');
    for (const r of from) lines.push(`- ${r.name || '直接開啟'}（${r.count}）`);
  }
  return lines.join('\n');
}

async function discord(message) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) {
    console.log(message);
    return;
  }
  const res = await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: message.slice(0, 1900) }),
  });
  if (!res.ok) throw new Error(`Discord: HTTP ${res.status}`);
}

async function main() {
  const token = process.env.GOATCOUNTER_TOKEN;
  if (!token) throw new Error('GOATCOUNTER_TOKEN is not set');
  const now = new Date();
  const start = taipeiDayStart(now, 1);
  const end = taipeiDayStart(now, 0);
  const before = taipeiDayStart(now, 2);

  const total = await api(token, 'total', start, end);
  const previous = await api(token, 'total', before, start);
  const hits = await api(token, 'hits', start, end, { limit: String(TOP * 2) });
  const refs = await api(token, 'toprefs', start, end, { limit: String(TOP) });

  await discord(
    formatReport({
      day: dayLabel(start),
      total: total.total ?? 0,
      previous: previous.total ?? 0,
      hits: hits.hits ?? [],
      refs: refs.stats ?? [],
    }),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (err) => {
    console.error(err.message);
    try {
      await discord(`❌ **GoatCounter 每日報告失敗**\n${err.message}`);
    } catch {}
    process.exit(1);
  });
}
