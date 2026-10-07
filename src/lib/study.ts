import { loadConfig } from './config';
import {
  getAllArticles,
  getAllBooks,
  getBookNotes,
  getAllSideProjects,
  getAllPlayboxGames,
  getAllNotes,
  getNoteBodies,
} from './data';
import { getGithubContributions } from './github';
import { bookStatus, categoryRank } from './bookCover';
import type { Article, Book, NotionBlock } from './notion';

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
 *   s1–s3  series, racked on the desk
 *   d1–d3  the newest notes of the 碎碎念 database, loose pages on the desk  mb  the book I wrote, on the display shelves
 *   p1 p3 g2 aw  side projects on the display shelves, each one a model of its project
 *   ir1–ir3  the Ironman bears   tk1 tk2  talks, on videotape
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
  /** Short text printed on a spine or a label. */
  sp?: string;
  k: string;
  t: string;
  /** What the hover tooltip says, when it isn't the title. */
  tip?: string;
  by?: string;
  b: string[];
  /** A footer line in the reader; the exhibits on the display shelves have none. */
  m?: string;
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
  /** The cover of the book I wrote, besides its title and author: the subtitle, the line across its head, the two lines on the band at its foot, the prize on its seal. */
  front?: { sub: string; head: string; foot: [string, string]; seal: [string, string] };
  /** An Ironman bear whose run took a prize holds a cup. */
  cup?: 1;
}

export interface StudyData {
  items: Record<string, StudyItem>;
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
const SERIES_SLOTS = ['s1', 's2', 's3'];
const DESK_SLOTS = ['d1', 'd2', 'd3'];
// A side project's exhibit is modelled after it, so the slots go by title, not by order; a project with no model is not shown.
const PROJECT_SLOTS: Record<string, string> = {
  Lorescape: 'p1',
  'YouTube 運動計時器': 'p3',
  小遊戲機器人: 'g2',
  有趣頒獎動畫: 'aw',
};
const IRONMAN_SLOTS = ['ir1', 'ir2', 'ir3'];
const TALK_SLOTS = ['tk1', 'tk2'];

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

// The iThome Ironman runs, oldest first, a bear for each: [year, result, series, url, took a prize].
const IRONMAN: [string, string, string, string, boolean][] = [
  ['2020', '鐵人練成', '在 Kata 中尋找 Clean Code', 'https://ithelp.ithome.com.tw/users/20129825/ironman/3440?page=1', false],
  ['2022', '佳作', 'Flutter 開發設計雜談', ITHOME_SERIES['Flutter 開發設計雜談'], true],
  ['2023', '佳作', '30 天輕鬆學會 Flutter 測試', ITHOME_SERIES['30 天輕鬆學會 Flutter 測試'], true],
];

// Talks, newest first, a videotape for each: [year, title, host, url].
const TALKS: [string, string, string, string][] = [
  ['2025', '實踐 Flutter 測試的眉眉角角', 'Agile.Taichung', 'https://www.accupass.com/event/2503031416141112169743'],
  ['2024', 'Flutter Widget Test 深度探索', 'iThome 鐵人講堂', 'https://itplus.ithome.com.tw/webinar-page/237'],
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

/** The first line of a note's body, in plain text, for the lead of the page before the rest is fetched. */
function firstLine(blocks: NotionBlock[]): string {
  for (const b of blocks) {
    const text = (((b as any)[b.type]?.rich_text ?? []) as { plain_text?: string }[]).map((t) => t.plain_text ?? '').join('').trim();
    if (text) return text;
  }
  return '';
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

function bookItem(b: Book, hasNotes: boolean): StudyItem {
  const category = b.categories[0] || UNFILED;
  const [title, subtitle] = splitBookTitle(b.title);
  return {
    cat: 'shelf',
    kind: 'reading',
    sp: bookSpine(b.title),
    k: `讀過的書 · ${category}`,
    t: title,
    ...(subtitle ? { by: subtitle } : {}),
    b: [],
    m: `書架 · ${category}`,
    ...(hasNotes ? { aid: b.id } : {}),
    ...(b.coverUrl ? { cover: b.coverUrl } : {}),
  };
}

/** Finished books in shelving order: the categories in their fixed order, and within one the latest read first. */
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
  // a category the list does not know, or a book with none, comes after all of them; the sort is stable, so those keep the order of their latest book
  return [...sections].sort(([a], [b]) => categoryRank(a) - categoryRank(b));
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
  const [articles, books, notes, projects, games, noteList, noteBodies] = await Promise.all([
    getAllArticles(),
    getAllBooks(),
    getBookNotes(),
    getAllSideProjects(),
    getAllPlayboxGames(),
    getAllNotes(),
    getNoteBodies(),
  ]);
  const { username, channels } = githubLabel(config);
  const contrib = await getGithubContributions(username);

  const items: Record<string, StudyItem> = {};

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
    k: '我出的書 · Book',
    t: '不可不知的 Flutter App 自動化測試實戰攻略',
    by: '吳政樺（Paul）',
    b: ['由 2023 iThome 鐵人賽佳作改寫成書，從基礎到進階一次到位。'],
    links: [{ l: '購書 ↗', u: MY_BOOK_URL, p: 1 }],
    front: {
      sub: '從設計到測試、維持產品品質的高效實踐',
      head: '打造自動化測試策略，完美交付高品質 App！',
      foot: ['開發者必學自動化測試技術', '開發不只是做出功能，更要確保未來正常運作'],
      seal: ['2023', '佳作'],
    },
  };

  /* ── display shelves: side projects ── */
  projects.forEach((p) => {
    const slot = PROJECT_SLOTS[p.title];
    if (!slot) return;
    const links: StudyLink[] = [];
    if (p.mainUrl) links.push({ l: '玩玩看 ↗', u: p.mainUrl, p: 1 });
    if (p.githubUrl) links.push({ l: 'GitHub ↗', u: p.githubUrl, ...(p.mainUrl ? {} : { p: 1 as const }) });
    items[slot] = {
      cat: 'display',
      kind: 'project',
      k: `Side Project · ${[...p.platforms, p.status].filter(Boolean).join(' · ')}`,
      t: p.subtitle ? `${p.title} · ${p.subtitle}` : p.title,
      b: p.description ? [p.description] : [],
      tech: p.tags,
      links,
    };
  });

  /* ── display shelves: a bear for every Ironman run, a tape for every talk ── */
  IRONMAN.forEach(([year, result, series, url, prize], i) => {
    items[IRONMAN_SLOTS[i]] = {
      cat: 'display',
      kind: 'ironman',
      k: `鐵人賽 · ${year} ${result}`,
      t: series,
      b: [prize ? `連續三十天、一天一篇，拿下${result}。` : `連續三十天、一天一篇，完賽，${result}。`],
      links: [{ l: 'iThome 鐵人賽 ↗', u: url, p: 1 }],
      ...(prize ? { cup: 1 as const } : {}),
    };
  });
  TALKS.forEach(([year, title, host, url], i) => {
    items[TALK_SLOTS[i]] = {
      cat: 'display',
      kind: 'talk',
      sp: year,
      k: `演講 · ${year}`,
      t: title,
      by: host,
      b: [],
      links: [{ l: '活動頁 ↗', u: url, p: 1 }],
    };
  });

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
      tip: '遊樂器',
      b: ['窗邊小櫃子上的老電視，接著一台遊戲機。所有小遊戲都收在 Playbox 裡，按下開關就能玩。'],
      list: gameRows,
      links: [{ l: 'Playbox GitHub ↗', u: PLAYBOX_REPO, p: 1 }],
    };
  }

  /* ── desk: the newest notes with something written on them, as loose pages; the newest articles if there are none ── */
  const written = noteList.filter((n) => noteBodies.has(n.id)).slice(0, DESK_SLOTS.length);
  if (written.length) {
    written.forEach((n, i) => {
      items[DESK_SLOTS[i]] = {
        cat: 'desk',
        kind: 'note',
        k: `碎碎念 · ${dotted(n.createdTime)}`,
        t: n.title,
        b: [firstLine(noteBodies.get(n.id)!)],
        m: `桌上的稿紙 · ${dotted(n.createdTime)}`,
        aid: n.id,
      };
    });
  } else {
    articles.slice(0, DESK_SLOTS.length).forEach((a, i) => {
      items[DESK_SLOTS[i]] = {
        ...articleItem(a, `最新文章 · ${a.category} · ${dotted(a.createdTime)}`, 'latest', 'desk'),
        m: `桌上的稿紙 · ${dotted(a.createdTime)}`,
      };
    });
  }

  const firstYear = articles.length ? new Date(articles[articles.length - 1].createdTime).getFullYear() : new Date().getFullYear();
  return {
    items,
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
