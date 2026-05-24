import type { Client } from '@notionhq/client';

export interface PlayboxGame {
  id: string;
  name: string;
  url: string;
  imageUrl: string | null;
  order: number;
}

const PROPS = {
  name: '名稱',
  url: '連結',
  image: '截圖',
  order: '排序',
};

function readTitle(props: any, name: string): string {
  const arr = props[name]?.title;
  if (!Array.isArray(arr) || arr.length === 0) return 'Untitled';
  return arr.map((t: any) => t.plain_text ?? '').join('').trim();
}

function readFirstFileUrl(props: any, name: string): string | null {
  const files = props[name]?.files;
  if (!Array.isArray(files) || files.length === 0) return null;
  const f = files[0];
  return f?.file?.url ?? f?.external?.url ?? null;
}

export async function fetchPlayboxGames(
  client: Client,
  databaseId: string,
): Promise<PlayboxGame[]> {
  const games: PlayboxGame[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await client.databases.query({
        database_id: databaseId,
        sorts: [{ property: PROPS.order, direction: 'ascending' }],
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const p = page as any;
        const props = p.properties;
        const order =
          typeof props[PROPS.order]?.number === 'number'
            ? props[PROPS.order].number
            : 0;
        games.push({
          id: p.id,
          name: readTitle(props, PROPS.name),
          url: props[PROPS.url]?.url ?? '#',
          imageUrl: readFirstFileUrl(props, PROPS.image),
          order,
        });
      }

      cursor = response.has_more ? (response as any).next_cursor : undefined;
    } while (cursor);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to fetch playbox database ${databaseId}: ${err.message}`);
    }
    console.warn(`Failed to fetch playbox database ${databaseId}: ${err.message}`);
    return [];
  }

  return games;
}
