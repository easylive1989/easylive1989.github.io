import type { Client } from '@notionhq/client';

export interface Article {
  id: string;
  title: string;
  category: string;
  createdTime: string;
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
  return titleProp?.title?.[0]?.plain_text ?? 'Untitled';
}

export async function fetchDatabase(
  client: Client,
  databaseId: string,
): Promise<Article[]> {
  const pages: Article[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const response = await client.databases.query({
        database_id: databaseId,
        filter: {
          property: 'Status',
          status: { equals: 'Done' },
        },
        sorts: [{ property: 'Created time', direction: 'descending' }],
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const p = page as any;
        const props = p.properties;

        pages.push({
          id: p.id,
          title: getTitleText(props),
          category: props.Category?.select?.name ?? '',
          createdTime: p.created_time,
        });
      }

      cursor = response.has_more ? (response as any).next_cursor : undefined;
    } while (cursor);
  } catch (err: any) {
    console.warn(`Failed to fetch database ${databaseId}: ${err.message}`);
    return [];
  }

  return pages;
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
