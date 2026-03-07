import { describe, it, expect } from 'vitest';
import { loadConfig, type SiteConfig } from '../../src/lib/config';

describe('loadConfig', () => {
  it('loads and parses site.config.yaml', () => {
    const config = loadConfig();

    expect(config.site.title).toBe('Learn with Paul');
    expect(config.author.name).toBeDefined();
    expect(config.author.links).toBeInstanceOf(Array);
    expect(config.notion.databaseId).toBeDefined();
    expect(config.notion.defaultCategory).toBeDefined();
  });
});
