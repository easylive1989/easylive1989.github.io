import { loadConfig } from './config';
import {
  getAllArticles,
  getAllBooks,
  getBookNotes,
  getAllSideProjects,
  getAllPlayboxGames,
} from './data';
import { getGithubContributions } from './github';
import { bookStatus } from './bookCover';
import type { Article, Book } from './notion';

/**
 * Everything the 3D study room shows, shaped for study.js. Item ids are the
 * room's physical slots (a spine position on the shelf, a spot on the display
 * shelves, a sheet of paper on the desk), not content ids — the scene is built
 * once and the slots are filled from Notion at build time.
 *
 * Nothing here links to another page of this site: a book opens in the room and
 * its article, or the notes kept in it, are fetched from /study/{id}/ (see
 * pages/study/[id].astro).
 *
 *   b1…    every finished book of the reading list, by category, in the bookshelf's bay beside the display shelves
 *   s1–s3  series, racked on the desk   w1–w6  newest articles, in the same rack
 *   d1–d3  older articles on the desk   mb  the book I wrote, on the display shelves
 *   p1 p3 g2  side projects on the display shelves
 *   g1 g3 g4 t2 p2  Playbox games   aw  awards & talks   cab  the cabinet
 *   tv  the game cabinet beside the desk: every Playbox game
 */

export interface StudyLink {
  l: string;
  u: string;
  p?: 1;
}

export interface StudyItem {
  cat: 'shelf' | 'display' | 'desk';
  kind: string;
  /** Short text printed on a spine. */
  sp?: string;
  /** Glyph printed on a framed print. */
  ch?: string;
  k: string;
  t: string;
  by?: string;
  b: string[];
  m: string;
  links?: StudyLink[];
  tech?: string[];
  /** Reading progress, 0–100. */
  pct?: number;
  /** Rows of [kicker-left, kicker-right, title, subtitle, url]. */
  list?: [string, string, string, string, string][];
  /** The article whose full text this book or page holds. */
  aid?: string;
  /** A series' contents: rows of [article id, title, date]. */
  toc?: [string, string, string][];
  /** Cover image of a book on the reading list. */
  cover?: string;
}

export interface StudyData {
  items: Record<string, StudyItem>;
  links: [string, string][];
  /** The bookshelf, section by section in shelving order: [category, the slots of its books]. */
  library: [string, string[]][];
  about: {
    name: string;
    bio: string;
    tagline: string;
    summary: string;
    avatar: string;
    channels: [string, string, string][];
  };
  site: { reading: string; archive: string; rss: string; url: string; study: string };
  github: {
    ok: boolean;
    username: string;
    year: number;
    total: number;
    current: number;
    longest: number;
    /** Contribution level 0–4 per day, oldest week first. */
    weeks: number[][];
  };
}

const BASE = import.meta.env.BASE_URL;
const WRITING_SLOTS = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
const SERIES_SLOTS = ['s1', 's2', 's3'];
const DESK_SLOTS = ['d1', 'd2', 'd3'];
const GAME_SLOTS = ['g3', 't2', 'g4', 'g1', 'p2'];
const PROJECT_SLOTS = ['p1', 'p3', 'g2'];

// Spine text for series whose full title is too long to stand on a spine.
const SERIES_SPINE: Record<string, string> = {
  '30 天輕鬆學會 Flutter 測試': 'Flutter 測試',
  'Flutter 開發設計雜談': '設計雜談',
};

// Where the two iThome Ironman series live outside this site.
const ITHOME_SERIES: Record<string, string> = {
  '30 天輕鬆學會 Flutter 測試': 'https://ithelp.ithome.com.tw/users/20129825/ironman/5974',
  'Flutter 開發設計雜談': 'https://ithelp.ithome.com.tw/users/20129825/ironman/4992',
};

const MY_BOOK_URL = 'https://www.tenlong.com.tw/products/9786264140010?list_name=srh';
const PLAYBOX_REPO = 'https://github.com/easylive1989/paul-playbox';

const TALKS: [string, string, string, string, string][] = [
  ['2025', '演講', '實踐 Flutter 測試的眉眉角角', 'Agile.Taichung', 'https://www.accupass.com/event/2503031416141112169743'],
  ['2024', '演講', 'Flutter Widget Test 深度探索', 'iThome 鐵人講堂', 'https://itplus.ithome.com.tw/webinar-page/237'],
  ['2023', '鐵人賽佳作', '30 天輕鬆學會 Flutter 測試', 'iThome', 'https://ithelp.ithome.com.tw/users/20129825/ironman/5974'],
  ['2022', '鐵人賽佳作', 'Flutter 開發設計雜談', 'iThome', 'https://ithelp.ithome.com.tw/users/20129825/ironman/4992'],
  ['2020', '鐵人賽完賽', '在 Kata 中尋找 Clean Code', 'iThome', 'https://ithelp.ithome.com.tw/users/20129825/ironman/3440?page=1'],
];

// Which framed object / figure a Playbox game gets, by what its name says.
const GAME_FITS: [RegExp, string][] = [
  [/tiny\s*swords|rts|戰/i, 'g3'],
  [/stock|股/i, 't2'],
  [/bottle|瓶/i, 'g4'],
  [/sokoban|推箱/i, 'g1'],
  [/moon|月/i, 'p2'],
];

const isCJK = (ch: string) => /[㐀-鿿]/.test(ch);

/** A few characters of a title that fit on a book spine. */
export function spineLabel(title: string, max = 8): string {
  const parts = title.split(/\s[-–—]\s|[：:｜|]/).map((s) => s.trim()).filter(Boolean);
  let s = parts.length > 1 ? parts[parts.length - 1] : title;
  s = (s.split(/[！？，。!?,]/)[0] ?? s).trim() || s;
  s = s.replace(/[（(].*?[）)]/g, '').trim() || s;
  let out = '';
  let w = 0;
  for (const ch of s) {
    const cw = isCJK(ch) ? 1 : 0.5;
    if (w + cw > max) break;
    out += ch;
    w += cw;
  }
  return out.trim() || title.slice(0, max);
}

/** The single character a framed print is typeset with. */
function printGlyph(...sources: string[]): string {
  for (const s of sources) {
    const cjk = [...s].find(isCJK);
    if (cjk) return cjk;
  }
  const latin = sources.join('').match(/[A-Za-z]/)?.[0];
  return (latin ?? '書').toUpperCase();
}

function dotted(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function articleItem(a: Article, kicker: string, kind = 'writing', cat: StudyItem['cat'] = 'shelf'): StudyItem {
  return {
    cat,
    kind,
    sp: spineLabel(a.title),
    k: kicker,
    t: a.title,
    b: [a.summary || `${a.category}系列文章。`],
    m: `${a.category} · ${dotted(a.createdTime)}`,
    aid: a.id,
  };
}

const UNFILED = '未分類';
// Sections that are a remainder rather than a subject go to the end of the shelf.
const LAST_SECTIONS = ['其他', UNFILED];
const SPINE_MAX = 14;
const SPINE_MAX_LATIN = 20;

const textWidth = (s: string) => [...s].reduce((w, ch) => w + (isCJK(ch) || /[\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.5), 0);

/** A book's title and the subtitle that publishers hang after a colon or a dash. */
export function splitBookTitle(title: string): [string, string] {
  const m = title.match(/\s[-–—]\s|\s*[：:︰｜|－]\s*|――|——/);
  if (!m || !m.index) return [title.trim(), ''];
  return [title.slice(0, m.index).trim(), title.slice(m.index + m[0].length).trim()];
}

/** What a book's spine says: its title without the subtitle, cut at a pause if it is still too long to stand there. */
export function bookSpine(title: string): string {
  let s = splitBookTitle(title)[0].replace(/[（(].*?[）)]/g, '').trim() || title;
  if (textWidth(s) > SPINE_MAX) {
    const pause = s.search(/[？！，。、?!,]/);
    if (pause >= 3) s = s.slice(0, pause);
  }
  // A title in Latin lies along the spine, where there is more room for it; one that still has to be cut is not cut mid-word.
  const max = [...s].some(isCJK) ? SPINE_MAX : SPINE_MAX_LATIN;
  if (textWidth(s) <= max) return s;
  let out = '';
  for (const ch of s) {
    if (textWidth(out + ch) > max) break;
    out += ch;
  }
  const cutInWord = /[A-Za-z0-9]$/.test(out) && /^[A-Za-z0-9]/.test(s.slice(out.length));
  return (cutInWord && out.includes(' ') ? out.slice(0, out.lastIndexOf(' ')) : out).trim();
}

/** The reading list keeps the month a book was finished in, not the day. */
function finishedMonth(b: Book): string {
  return dotted(b.finishedDate).slice(0, 7);
}

function bookItem(b: Book, hasNotes: boolean): StudyItem {
  const category = b.categories[0] || UNFILED;
  const month = finishedMonth(b);
  const [title, subtitle] = splitBookTitle(b.title);
  return {
    cat: 'shelf',
    kind: 'reading',
    sp: bookSpine(b.title),
    k: `讀過的書 · ${category}`,
    t: title,
    ...(subtitle ? { by: subtitle } : {}),
    b: month ? [`${month} 讀完。`] : [],
    m: `書架 · ${category}${month ? ` · ${month} 讀完` : ''}`,
    ...(hasNotes ? { aid: b.id } : {}),
    ...(b.coverUrl ? { cover: b.coverUrl } : {}),
  };
}

/** Finished books in shelving order: the fullest category first, and within one the latest read first. */
function shelveBooks(books: Book[]): [string, Book[]][] {
  const sections = new Map<string, Book[]>();
  const read = books
    .filter((b) => bookStatus(b) === 'read')
    .sort((a, b) => (b.finishedDate ?? '').localeCompare(a.finishedDate ?? '') || a.title.localeCompare(b.title, 'zh-Hant'));
  for (const b of read) {
    const name = b.categories[0] || UNFILED;
    if (!sections.has(name)) sections.set(name, []);
    sections.get(name)!.push(b);
  }
  const last = (name: string) => LAST_SECTIONS.indexOf(name);
  // the sort is stable, so equally full sections keep the order of their latest book
  return [...sections].sort(([a, x], [b, y]) => last(a) - last(b) || y.length - x.length);
}

function githubLabel(config: ReturnType<typeof loadConfig>): { username: string; channels: [string, string, string][] } {
  const gh = config.author.links.find((l) => l.type === 'github');
  const username = gh?.url.match(/github\.com\/([^/]+)/)?.[1] ?? 'easylive1989';
  const threads = config.author.links.find((l) => l.type === 'threads')?.url ?? '';
  const linkedin = config.author.links.find((l) => l.type === 'linkedin')?.url ?? '';
  return {
    username,
    channels: [
      ['GitHub', username, gh?.url ?? `https://github.com/${username}`],
      ['Threads', threads.match(/@[^/?]+/)?.[0] ?? '@paul.ch.wu', threads],
      ['LinkedIn', config.author.name, linkedin],
      ['Email', 'easylive1989@gmail.com', 'mailto:easylive1989@gmail.com'],
    ].filter(([, , url]) => url) as [string, string, string][],
  };
}

export async function buildStudyData(): Promise<StudyData> {
  const config = loadConfig();
  const [articles, books, notes, projects, games] = await Promise.all([
    getAllArticles(),
    getAllBooks(),
    getBookNotes(),
    getAllSideProjects(),
    getAllPlayboxGames(),
  ]);
  const { username, channels } = githubLabel(config);
  const contrib = await getGithubContributions(username);

  const items: Record<string, StudyItem> = {};
  const owner: Record<string, string> = {}; // article id → series slot, for "順手再翻"

  /* ── desk, the book rack: one book per series, newest series first ── */
  const categories: string[] = [];
  for (const a of articles) if (a.category && !categories.includes(a.category)) categories.push(a.category);
  categories.slice(0, SERIES_SLOTS.length).forEach((name, i) => {
    const slot = SERIES_SLOTS[i];
    const inSeries = articles.filter((a) => a.category === name);
    const links: StudyLink[] = ITHOME_SERIES[name] ? [{ l: 'iThome 鐵人賽 ↗', u: ITHOME_SERIES[name], p: 1 }] : [];
    items[slot] = {
      cat: 'desk',
      kind: 'series',
      sp: SERIES_SPINE[name] ?? spineLabel(name),
      k: `系列 · ${inSeries.length} 篇`,
      t: name,
      b: [`最新一篇寫於 ${dotted(inSeries[0]?.createdTime)}：${inSeries[0]?.title ?? ''}`],
      m: `共 ${articles.length} 篇文章 · ${categories.length} 個系列`,
      links,
      toc: inSeries.map((a) => [a.id, a.title, dotted(a.createdTime)]),
    };
    for (const a of inSeries) owner[a.id] = slot;
  });

  /* ── desk, the book rack: the six newest articles, beside the series ── */
  const recent = articles.slice(0, WRITING_SLOTS.length);
  recent.forEach((a, i) => {
    items[WRITING_SLOTS[i]] = articleItem(a, `${i === 0 ? '★ 最新文章 · ' : ''}${a.category} · ${dotted(a.createdTime)}`, 'writing', 'desk');
  });

  /* ── the bookshelf: every finished book of the reading list, filed by category ── */
  const library: StudyData['library'] = [];
  let shelved = 0;
  for (const [category, inCategory] of shelveBooks(books)) {
    const slots = inCategory.map((b) => {
      const slot = `b${++shelved}`;
      items[slot] = bookItem(b, notes.has(b.id));
      return slot;
    });
    library.push([category, slots]);
  }

  /* ── display shelves: the book I wrote ── */
  items.mb = {
    cat: 'display',
    kind: 'mybook',
    sp: 'Flutter 測試',
    k: '我出的書 · Book',
    t: '30 天輕鬆學會 Flutter 測試',
    b: ['由 2023 iThome 鐵人賽佳作改寫成書，從基礎到進階一次到位。'],
    m: '展示架 · 出版書籍',
    links: [{ l: '看書 ↗', u: MY_BOOK_URL, p: 1 }],
  };

  /* ── display shelves: side projects ── */
  projects.slice(0, PROJECT_SLOTS.length).forEach((p, i) => {
    const links: StudyLink[] = [];
    if (p.mainUrl) links.push({ l: '玩玩看 ↗', u: p.mainUrl, p: 1 });
    if (p.githubUrl) links.push({ l: 'GitHub ↗', u: p.githubUrl, ...(p.mainUrl ? {} : { p: 1 as const }) });
    items[PROJECT_SLOTS[i]] = {
      cat: 'display',
      kind: 'project',
      ch: printGlyph(p.subtitle, p.title),
      k: `Side Project · ${[...p.platforms, p.status].filter(Boolean).join(' · ')}`,
      t: p.subtitle ? `${p.title} · ${p.subtitle}` : p.title,
      b: p.description ? [p.description] : [],
      tech: p.tags,
      m: ['展示架 · 大相框', '展示架 · 座鐘', '展示架 · 棋子'][i],
      links,
    };
  });

  /* ── display shelves: Playbox games, matched to the object that suits their name ── */
  const free = [...GAME_SLOTS];
  const placed: [string, (typeof games)[number]][] = [];
  const rest: (typeof games)[number][] = [];
  for (const g of games) {
    const fit = GAME_FITS.find(([re, slot]) => re.test(g.name) && free.includes(slot));
    if (fit) {
      free.splice(free.indexOf(fit[1]), 1);
      placed.push([fit[1], g]);
    } else rest.push(g);
  }
  for (const g of rest) {
    const slot = free.shift();
    if (slot) placed.push([slot, g]);
  }
  const objectName: Record<string, string> = { g3: '戰場畫', t2: '小相框', g4: '水瓶', g1: '木箱', p2: '銅像' };
  for (const [slot, g] of placed) {
    items[slot] = {
      cat: 'display',
      kind: 'play',
      ch: printGlyph(g.name),
      k: 'Playbox · 小遊戲',
      t: g.name,
      b: [`Playbox 裡的小遊戲：${g.name}。`],
      m: `展示架 · ${objectName[slot]}`,
      links: [{ l: '▶ 玩', u: g.url, p: 1 }, { l: 'Playbox ↗', u: PLAYBOX_REPO }],
    };
  }

  items.aw = {
    cat: 'display',
    kind: 'award',
    ch: '獎',
    k: '競賽與演講 · Awards & Talks',
    t: '獎狀與講稿',
    b: [],
    list: TALKS,
    m: '展示架 · 獎狀',
  };

  /* ── the game cabinet between the door and the desk: the whole Playbox ── */
  const gameRows = games
    .filter((g) => g.url && g.url !== '#')
    .map((g): [string, string, string, string, string] => ['Playbox', '小遊戲', g.name, '', g.url]);
  if (gameRows.length) {
    items.tv = {
      cat: 'display',
      kind: 'play',
      k: `Playbox · 電視遊樂器 · ${gameRows.length} 款`,
      t: `${config.author.name.split(' ')[0]} 的 Playbox`,
      b: ['窗邊小櫃子上的老電視，接著一台遊戲機。所有小遊戲都收在 Playbox 裡，按下開關就能玩。'],
      list: gameRows,
      m: '窗邊 · 遊戲櫃',
      links: [{ l: 'Playbox GitHub ↗', u: PLAYBOX_REPO, p: 1 }],
    };
  }

  /* ── the cabinet under the display shelves: everything that has no shelf space of its own ── */
  const cabinetRows: StudyItem['list'] = [
    ...projects.map((p): [string, string, string, string, string] => [
      'Side Project',
      p.status || '作品',
      p.title,
      p.subtitle || p.description.slice(0, 40),
      p.mainUrl ?? p.githubUrl ?? '',
    ]),
    ...games.map((g): [string, string, string, string, string] => ['Playbox', '小遊戲', g.name, '', g.url]),
  ].filter((r) => r[4]);
  if (cabinetRows.length) {
    items.cab = {
      cat: 'display',
      kind: 'cabinet',
      k: `作品櫃 · ${cabinetRows.length} 件`,
      t: '作品櫃',
      b: ['展示架放不下的，都收在這裡。'],
      list: cabinetRows,
      m: '展示架 · 櫃子',
      links: [{ l: 'Playbox ↗', u: PLAYBOX_REPO }],
    };
  }

  /* ── desk: the next three older articles, as loose pages ── */
  articles.slice(WRITING_SLOTS.length, WRITING_SLOTS.length + DESK_SLOTS.length).forEach((a, i) => {
    items[DESK_SLOTS[i]] = {
      ...articleItem(a, `較早的文章 · ${a.category} · ${dotted(a.createdTime)}`, 'older', 'desk'),
      m: `桌上的舊稿 · ${dotted(a.createdTime)}`,
    };
  });

  /* ── "順手再翻" ── */
  const links: [string, string][] = [];
  const add = (a: string, b: string) => items[a] && items[b] && links.push([a, b]);
  recent.forEach((a, i) => owner[a.id] && add(WRITING_SLOTS[i], owner[a.id]));
  articles
    .slice(WRITING_SLOTS.length, WRITING_SLOTS.length + DESK_SLOTS.length)
    .forEach((a, i) => owner[a.id] && add(DESK_SLOTS[i], owner[a.id]));
  const flutterSeries = SERIES_SLOTS.find((s) => items[s]?.t === '30 天輕鬆學會 Flutter 測試');
  if (flutterSeries) add('mb', flutterSeries);
  add('aw', 'mb');
  add('w1', 'd3');
  placed.forEach(([slot], i) => i > 0 && add(slot, placed[i - 1][0]));
  PROJECT_SLOTS.forEach((slot, i) => i > 0 && add(slot, PROJECT_SLOTS[i - 1]));

  const firstYear = articles.length ? new Date(articles[articles.length - 1].createdTime).getFullYear() : new Date().getFullYear();
  return {
    items,
    links,
    library,
    about: {
      name: config.author.name,
      bio: config.author.bio.replace(/\n/g, ' '),
      tagline: '台中 · Available for chat',
      summary: `從 ${firstYear} 寫到現在：${articles.length} 篇文章、${categories.length} 個系列，還出了一本書。`,
      avatar: `${BASE}${config.author.avatar}`,
      channels,
    },
    site: {
      reading: `${BASE}reading/`,
      archive: `${BASE}archive/`,
      rss: '/rss.xml',
      study: `${BASE}study/`,
      url: config.site.url,
    },
    github: {
      ok: contrib.ok,
      username,
      year: new Date().getFullYear(),
      total: contrib.totalThisYear,
      current: contrib.currentStreak,
      longest: contrib.longestStreak,
      weeks: contrib.weeks.map((w) => w.map((c) => (c.inRange ? c.level : 0))),
    },
  };
}
