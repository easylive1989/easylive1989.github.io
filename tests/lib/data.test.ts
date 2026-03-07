import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NOTION_API_KEY = 'test-key';
});

vi.mock('@notionhq/client', () => ({
  Client: class MockClient {
    constructor() {}
  },
}));

vi.mock('../../src/lib/notion', () => ({
  fetchDatabase: vi.fn(),
  fetchPageBlocks: vi.fn(),
}));

vi.mock('../../src/lib/images', () => ({
  replaceImageUrls: vi.fn().mockImplementation((blocks: any) => ({
    blocks,
    imageMap: {},
  })),
  downloadImages: vi.fn(),
}));

vi.mock('../../src/lib/config', () => ({
  loadConfig: vi.fn().mockReturnValue({
    site: { title: 'Test', description: 'Test', url: 'http://localhost' },
    author: { name: 'Test', avatar: '', bio: '', links: [] },
    notion: {
      databaseId: 'db-1',
      defaultCategory: '開發日常',
    },
    build: { schedule: '0 0 * * *' },
  }),
}));

import { getAllCategories, getAllArticles, getArticlesByCategory } from '../../src/lib/data';
import { fetchDatabase } from '../../src/lib/notion';

describe('getAllCategories', () => {
  it('returns unique categories from articles', async () => {
    (fetchDatabase as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p1', title: 'Post 1', category: 'Cat A', createdTime: '2026-01-01T00:00:00.000Z' },
      { id: 'p2', title: 'Post 2', category: 'Cat A', createdTime: '2026-01-02T00:00:00.000Z' },
      { id: 'p3', title: 'Post 3', category: 'Cat B', createdTime: '2026-01-03T00:00:00.000Z' },
    ]);

    const categories = await getAllCategories();
    expect(categories).toHaveLength(2);
    expect(categories[0].name).toBe('Cat A');
    expect(categories[1].name).toBe('Cat B');
    expect(categories[0].slug).toHaveLength(8);
  });
});
