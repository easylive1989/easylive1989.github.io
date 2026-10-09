import type { SiteConfig } from './config';

/**
 * Who Paul is, beyond what site.config.yaml says: the book he wrote, his iThome Ironman runs, his talks and where to find
 * him. The room (study.ts) and the blog's about page (pages/about.astro) both read it, so the two never tell different stories.
 */

/** The line under his name, in the room's self-portrait card and on the about page. */
export const TAGLINE = '台中 · 歡迎聊合作';

/** Where the two iThome Ironman series live outside this site. */
export const ITHOME_SERIES: Record<string, string> = {
  '30 天輕鬆學會 Flutter 測試': 'https://ithelp.ithome.com.tw/users/20129825/ironman/5974',
  'Flutter 開發設計雜談': 'https://ithelp.ithome.com.tw/users/20129825/ironman/4992',
};

/** The book he wrote. The room draws its cover itself: `front` holds the lines on it besides the title and author. */
export const MY_BOOK = {
  title: '不可不知的 Flutter App 自動化測試實戰攻略',
  author: '吳政樺（Paul）',
  blurb: '由 2023 iThome 鐵人賽佳作改寫成書，從基礎到進階一次到位。',
  url: 'https://www.tenlong.com.tw/products/9786264140010?list_name=srh',
  front: {
    sub: '從設計到測試、維持產品品質的高效實踐',
    head: '打造自動化測試策略，完美交付高品質 App！',
    foot: ['開發者必學自動化測試技術', '開發不只是做出功能，更要確保未來正常運作'] as [string, string],
    seal: ['2023', '佳作'] as [string, string],
  },
};

/** The iThome Ironman runs, oldest first, the order the room stands its bears in: [year, result, series, url, took a prize]. */
export const IRONMAN: [string, string, string, string, boolean][] = [
  ['2020', '鐵人練成', '在 Kata 中尋找 Clean Code', 'https://ithelp.ithome.com.tw/users/20129825/ironman/3440?page=1', false],
  ['2022', '佳作', 'Flutter 開發設計雜談', ITHOME_SERIES['Flutter 開發設計雜談'], true],
  ['2023', '佳作', '30 天輕鬆學會 Flutter 測試', ITHOME_SERIES['30 天輕鬆學會 Flutter 測試'], true],
];

/** Talks, newest first: [year, title, host, url]. */
export const TALKS: [string, string, string, string][] = [
  ['2025', '實踐 Flutter 測試的眉眉角角', 'Agile.Taichung', 'https://www.accupass.com/event/2503031416141112169743'],
  ['2024', 'Flutter Widget Test 深度探索', 'iThome 鐵人講堂', 'https://itplus.ithome.com.tw/webinar-page/237'],
];

/** His GitHub username, from the GitHub link in site.config.yaml. */
export function githubUsername(config: SiteConfig): string {
  const gh = config.author.links.find((l) => l.type === 'github');
  return gh?.url.match(/github\.com\/([^/]+)/)?.[1] ?? 'easylive1989';
}

/** Where to find him: [name, what to show, url], leaving out any without a url. */
export function channels(config: SiteConfig): [string, string, string][] {
  const username = githubUsername(config);
  const gh = config.author.links.find((l) => l.type === 'github');
  const threads = config.author.links.find((l) => l.type === 'threads')?.url ?? '';
  const linkedin = config.author.links.find((l) => l.type === 'linkedin')?.url ?? '';
  return [
    ['GitHub', username, gh?.url ?? `https://github.com/${username}`],
    ['Threads', threads.match(/@[^/?]+/)?.[0] ?? '@paul.ch.wu', threads],
    ['LinkedIn', config.author.name, linkedin],
    ['Email', 'easylive1989@gmail.com', 'mailto:easylive1989@gmail.com'],
  ].filter(([, , url]) => url) as [string, string, string][];
}
