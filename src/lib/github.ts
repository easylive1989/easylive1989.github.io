export type ContribCell = {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
  inRange: boolean;
};

export type ContribData = {
  weeks: ContribCell[][];
  monthLabels: string[];
  totalThisYear: number;
  currentStreak: number;
  longestStreak: number;
  fetchedAt: string;
  ok: boolean;
};

const WEEKS = 18;
const DAYS = 7;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function emptyData(): ContribData {
  const weeks: ContribCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: ContribCell[] = [];
    for (let d = 0; d < DAYS; d++) {
      week.push({ date: '', level: 0, count: 0, inRange: false });
    }
    weeks.push(week);
  }
  return {
    weeks,
    monthLabels: [],
    totalThisYear: 0,
    currentStreak: 0,
    longestStreak: 0,
    fetchedAt: new Date().toISOString(),
    ok: false,
  };
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type RawCell = { date: string; level: 0 | 1 | 2 | 3 | 4; count: number };

function parseHtml(html: string): { cells: Map<string, RawCell>; totalThisYear: number } {
  const cells = new Map<string, RawCell>();
  const idToCount = new Map<string, number>();

  const tipRe = /<tool-tip[^>]*for="(contribution-day-component-[^"]+)"[^>]*>([^<]+)<\/tool-tip>/g;
  let tm: RegExpExecArray | null;
  while ((tm = tipRe.exec(html)) !== null) {
    const id = tm[1];
    const text = tm[2];
    const noMatch = /^No contributions/i.test(text);
    const numMatch = text.match(/^([\d,]+)\s+contribution/i);
    const count = noMatch ? 0 : numMatch ? parseInt(numMatch[1].replace(/,/g, ''), 10) : 0;
    idToCount.set(id, count);
  }

  const cellRe = /<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g;
  let cm: RegExpExecArray | null;
  while ((cm = cellRe.exec(html)) !== null) {
    const tag = cm[0];
    const dateMatch = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
    const levelMatch = tag.match(/data-level="(\d)"/);
    const idMatch = tag.match(/id="(contribution-day-component-[^"]+)"/);
    if (!dateMatch || !levelMatch) continue;
    const date = dateMatch[1];
    const level = Math.min(4, Math.max(0, parseInt(levelMatch[1], 10))) as 0 | 1 | 2 | 3 | 4;
    const count = idMatch ? idToCount.get(idMatch[1]) ?? 0 : 0;
    cells.set(date, { date, level, count });
  }

  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+\d{4}/i);
  const totalThisYear = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : 0;

  return { cells, totalThisYear };
}

function computeStreaks(cells: Map<string, RawCell>, endDate: Date): { current: number; longest: number } {
  const sorted = Array.from(cells.values()).sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let run = 0;
  for (const c of sorted) {
    if (c.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  const cur = new Date(endDate);
  while (true) {
    const key = isoDate(cur);
    const c = cells.get(key);
    if (!c) break;
    if (c.count > 0) {
      current += 1;
      cur.setDate(cur.getDate() - 1);
    } else {
      if (current === 0 && isoDate(cur) === isoDate(endDate)) {
        cur.setDate(cur.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return { current, longest };
}

function buildWindow(cells: Map<string, RawCell>, endDate: Date) {
  const dow = endDate.getDay();
  const start = new Date(endDate);
  start.setDate(start.getDate() - dow - (WEEKS - 1) * 7);

  const weeks: ContribCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const week: ContribCell[] = [];
    for (let d = 0; d < DAYS; d++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + w * 7 + d);
      const date = isoDate(cur);
      const raw = cells.get(date);
      const inRange = cur <= endDate;
      week.push({
        date,
        level: raw ? raw.level : 0,
        count: raw ? raw.count : 0,
        inRange,
      });
    }
    weeks.push(week);
  }

  const monthLabels: string[] = [];
  const seen = new Set<number>();
  const cur = new Date(start);
  while (cur <= endDate) {
    const m = cur.getMonth();
    if (!seen.has(m)) {
      seen.add(m);
      monthLabels.push(MONTHS[m]);
    }
    cur.setDate(cur.getDate() + 1);
  }

  return { weeks, monthLabels };
}

function reportFailure(username: string, reason: string): void {
  console.error(`[github-fetch-failed] user=${username} reason=${reason}`);
}

export async function getGithubContributions(username: string): Promise<ContribData> {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    const url = `https://github.com/users/${encodeURIComponent(username)}/contributions?from=${from}&to=${to}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'paul-learning.dev build (Astro)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      reportFailure(username, `HTTP ${res.status} ${res.statusText}`);
      return emptyData();
    }
    const html = await res.text();
    const { cells, totalThisYear } = parseHtml(html);
    if (cells.size === 0) {
      reportFailure(username, 'parse returned 0 cells (markup may have changed)');
      return emptyData();
    }
    const { weeks, monthLabels } = buildWindow(cells, today);
    const { current, longest } = computeStreaks(cells, today);
    return {
      weeks,
      monthLabels,
      totalThisYear,
      currentStreak: current,
      longestStreak: longest,
      fetchedAt: today.toISOString(),
      ok: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reportFailure(username, `exception: ${msg}`);
    return emptyData();
  }
}
