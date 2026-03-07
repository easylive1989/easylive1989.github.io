import { createHash } from 'node:crypto';

export function categorySlug(name: string): string {
  return createHash('md5').update(name).digest('hex').slice(0, 8);
}
