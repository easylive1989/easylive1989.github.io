import type { Client } from '@notionhq/client';

export interface SideProject {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  platforms: string[];
  tags: string[];
  status: string;
  icon: string;
  iconBg: string;
  githubUrl: string | null;
  mainUrl: string | null;
  coverUrl: string | null;
  order: number;
}

const PROPS = {
  title: '標題',
  subtitle: '副標',
  description: '描述',
  platforms: '平台',
  tags: '標籤',
  status: '狀態',
  icon: 'Icon',
  iconBg: 'Icon 背景色',
  github: 'GitHub 網址',
  mainUrl: '主連結',
  cover: '封面圖',
  order: '排序',
};

function readTitle(props: any, name: string): string {
  const arr = props[name]?.title;
  if (!Array.isArray(arr) || arr.length === 0) return 'Untitled';
  return arr.map((t: any) => t.plain_text ?? '').join('').trim();
}

function readRichText(props: any, name: string): string {
  const arr = props[name]?.rich_text;
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.map((t: any) => t.plain_text ?? '').join('').trim();
}

function readMultiSelect(props: any, name: string): string[] {
  const arr = props[name]?.multi_select;
  if (!Array.isArray(arr)) return [];
  return arr.map((m: any) => m.name).filter(Boolean);
}

function readSelect(props: any, name: string): string {
  return props[name]?.select?.name ?? '';
}

function readUrl(props: any, name: string): string | null {
  const v = props[name]?.url;
  return v && v.length > 0 ? v : null;
}

function readFirstFileUrl(props: any, name: string): string | null {
  const files = props[name]?.files;
  if (!Array.isArray(files) || files.length === 0) return null;
  const f = files[0];
  return f?.file?.url ?? f?.external?.url ?? null;
}

function readNumber(props: any, name: string): number {
  const n = props[name]?.number;
  return typeof n === 'number' ? n : 0;
}

export async function fetchSideProjects(
  client: Client,
  databaseId: string,
): Promise<SideProject[]> {
  const pages: SideProject[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await client.databases.query({
        database_id: databaseId,
        filter: {
          property: PROPS.status,
          select: { equals: '活著' },
        },
        sorts: [{ property: PROPS.order, direction: 'ascending' }],
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const p = page as any;
        const props = p.properties;
        pages.push({
          id: p.id,
          title: readTitle(props, PROPS.title),
          subtitle: readRichText(props, PROPS.subtitle),
          description: readRichText(props, PROPS.description),
          platforms: readMultiSelect(props, PROPS.platforms),
          tags: readMultiSelect(props, PROPS.tags),
          status: readSelect(props, PROPS.status),
          icon: readRichText(props, PROPS.icon),
          iconBg: readRichText(props, PROPS.iconBg),
          githubUrl: readUrl(props, PROPS.github),
          mainUrl: readUrl(props, PROPS.mainUrl),
          coverUrl: readFirstFileUrl(props, PROPS.cover),
          order: readNumber(props, PROPS.order),
        });
      }

      cursor = response.has_more ? (response as any).next_cursor : undefined;
    } while (cursor);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to fetch side projects database ${databaseId}: ${err.message}`);
    }
    console.warn(`Failed to fetch side projects database ${databaseId}: ${err.message}`);
    return [];
  }

  return pages;
}
