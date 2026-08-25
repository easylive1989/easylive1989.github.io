import type { Client } from '@notionhq/client';

export interface Article {
  id: string;
  title: string;
  category: string;
  createdTime: string;
  lastEditedTime: string;
  summary: string;
}

export interface Book {
  id: string;
  title: string;
  progress: number;            // 0..100
  categories: string[];
  finishedDate: string | null; // ISO date or null
  isbn: string | null;
  coverUrl?: string | null;    // populated by enrichBookCovers at build time
}

export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
  [key: string]: unknown;
}

function getTitleText(props: any): string {
  const titleProp = props.Title ?? props.Name ?? props.name;
  const titleArr = titleProp?.title;
  if (!titleArr || titleArr.length === 0) return 'Untitled';
  return titleArr.map((t: any) => t.plain_text).join('');
}

function getSummaryText(props: any): string {
  const candidates = ['Summary', 'Description', 'Excerpt', 'Subtitle', '摘要', 'summary'];
  for (const name of candidates) {
    const prop = props[name];
    if (!prop) continue;
    const rt = prop.rich_text;
    if (Array.isArray(rt) && rt.length > 0) {
      return rt.map((t: any) => t.plain_text).join('').trim();
    }
  }
  return '';
}

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

// Notion times out or rate-limits occasionally on larger databases. A single
// transient failure used to publish a half-empty site, so retry those before
// letting the error surface.
const TRANSIENT_CODES = new Set([
  'notionhq_client_request_timeout',
  'notionhq_client_response_error',
  'rate_limited',
  'internal_server_error',
  'service_unavailable',
  'conflict_error',
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const transient = TRANSIENT_CODES.has(err?.code);
      if (!transient || attempt >= MAX_ATTEMPTS) throw err;
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `${label} failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err.message} — retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }
}

export async function fetchDatabase(
  client: Client,
  databaseId: string,
): Promise<Article[]> {
  const pages: Article[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await withRetry(`Query database ${databaseId}`, () =>
        client.databases.query({
          database_id: databaseId,
          filter: {
            property: 'Status',
            status: { equals: 'Done' },
          },
          sorts: [{ property: 'Created time', direction: 'descending' }],
          start_cursor: cursor,
        }),
      );

      for (const page of response.results) {
        const p = page as any;
        const props = p.properties;

        pages.push({
          id: p.id,
          title: getTitleText(props),
          category: props.Category?.select?.name ?? '',
          createdTime: p.created_time,
          lastEditedTime: p.last_edited_time,
          summary: getSummaryText(props),
        });
      }

      cursor = response.has_more ? (response as any).next_cursor : undefined;
    } while (cursor);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to fetch database ${databaseId}: ${err.message}`);
    }
    console.warn(`Failed to fetch database ${databaseId}: ${err.message}`);
    return [];
  }

  return pages;
}

const BOOK_PROPS = {
  title: '書名',
  progress: '閱讀進度',
  categories: '類型',
  finishedDate: '閱讀時間(月份)',
  isbn: 'ISBN',
};

function getBookIsbn(props: any): string | null {
  const candidates = [BOOK_PROPS.isbn, 'isbn'];
  for (const name of candidates) {
    const p = props[name];
    if (!p) continue;
    const rt = p.rich_text;
    if (Array.isArray(rt) && rt.length > 0) {
      const raw = rt.map((t: any) => t.plain_text ?? '').join('').trim();
      return raw || null;
    }
    if (typeof p.number === 'number') return String(p.number);
  }
  return null;
}

function getBookTitle(props: any): string {
  const arr = props[BOOK_PROPS.title]?.title;
  if (!Array.isArray(arr) || arr.length === 0) return 'Untitled';
  return arr.map((t: any) => t.plain_text).join('').trim();
}

function getBookProgress(props: any): number {
  const raw = props[BOOK_PROPS.progress]?.number;
  if (typeof raw !== 'number' || Number.isNaN(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getBookCategories(props: any): string[] {
  const p = props[BOOK_PROPS.categories];
  if (!p) return [];
  if (Array.isArray(p.multi_select)) return p.multi_select.map((m: any) => m.name).filter(Boolean);
  if (p.select?.name) return [p.select.name];
  return [];
}

function getBookFinishedDate(props: any): string | null {
  const p = props[BOOK_PROPS.finishedDate];
  return p?.date?.start ?? null;
}

export async function fetchBooksDatabase(
  client: Client,
  databaseId: string,
): Promise<Book[]> {
  const books: Book[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await withRetry(`Query books database ${databaseId}`, () =>
        client.databases.query({
          database_id: databaseId,
          start_cursor: cursor,
        }),
      );

      for (const page of response.results) {
        const p = page as any;
        const props = p.properties;
        books.push({
          id: p.id,
          title: getBookTitle(props),
          progress: getBookProgress(props),
          categories: getBookCategories(props),
          finishedDate: getBookFinishedDate(props),
          isbn: getBookIsbn(props),
        });
      }

      cursor = response.has_more ? (response as any).next_cursor : undefined;
    } while (cursor);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to fetch books database ${databaseId}: ${err.message}`);
    }
    console.warn(`Failed to fetch books database ${databaseId}: ${err.message}`);
    return [];
  }

  return books;
}

export async function fetchPageBlocks(
  client: Client,
  pageId: string,
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });

    for (const block of response.results) {
      const b = block as any;
      const notionBlock: NotionBlock = { ...b };

      if (b.has_children) {
        notionBlock.children = await fetchPageBlocks(client, b.id);
      }

      blocks.push(notionBlock);
    }

    cursor = response.has_more ? (response as any).next_cursor : undefined;
  } while (cursor);

  return blocks;
}
