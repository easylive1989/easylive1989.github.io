import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { NotionBlock } from './notion';

export function getLocalImagePath(
  url: string,
  seriesSlug: string,
  articleSlug: string,
): string {
  const urlObj = new URL(url);
  const basePath = urlObj.origin + urlObj.pathname;
  const hash = createHash('md5').update(basePath).digest('hex').slice(0, 12);
  const ext = path.extname(urlObj.pathname) || '.png';

  return `/assets/notion/${seriesSlug}/${articleSlug}/${hash}${ext}`;
}

interface ImageMap {
  [remoteUrl: string]: string;
}

export function replaceImageUrls(
  blocks: NotionBlock[],
  seriesSlug: string,
  articleSlug: string,
): { blocks: NotionBlock[]; imageMap: ImageMap } {
  const imageMap: ImageMap = {};

  function processBlocks(blocks: NotionBlock[]): NotionBlock[] {
    return blocks.map((block) => {
      const updated = { ...block };

      if (block.type === 'image') {
        const img = (block as any).image;
        const url = img?.file?.url ?? img?.external?.url;
        if (url) {
          const localPath = getLocalImagePath(url, seriesSlug, articleSlug);
          imageMap[url] = localPath;

          if (img.file) {
            updated.image = { ...img, file: { ...img.file, url: localPath } };
          } else if (img.external) {
            updated.image = { ...img, external: { ...img.external, url: localPath } };
          }
        }
      }

      if (block.children) {
        updated.children = processBlocks(block.children);
      }

      return updated;
    });
  }

  const updatedBlocks = processBlocks(blocks);
  return { blocks: updatedBlocks, imageMap };
}

export async function downloadImages(
  imageMap: ImageMap,
  publicDir: string,
  distDir?: string,
): Promise<void> {
  const isProductionBuild = process.env.NODE_ENV === 'production';

  for (const [remoteUrl, localPath] of Object.entries(imageMap)) {
    const publicFilePath = path.join(publicDir, localPath);

    if (fs.existsSync(publicFilePath)) {
      // Already downloaded — but still copy to dist/ if needed (build mode)
      if (distDir) {
        copyToDist(publicFilePath, path.join(distDir, localPath));
      }
      continue;
    }

    fs.mkdirSync(path.dirname(publicFilePath), { recursive: true });

    try {
      const response = await fetch(remoteUrl);
      if (!response.ok) {
        const msg = `Failed to download image: ${remoteUrl} (${response.status})`;
        if (isProductionBuild) throw new Error(msg);
        console.warn(msg);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(publicFilePath, buffer);

      // Astro copies public/ to dist/ before page generation, so images
      // downloaded during rendering must also be written to dist/ directly.
      if (distDir) {
        const distFilePath = path.join(distDir, localPath);
        fs.mkdirSync(path.dirname(distFilePath), { recursive: true });
        fs.writeFileSync(distFilePath, buffer);
      }
    } catch (err) {
      if (isProductionBuild) throw err;
      console.warn(`Failed to download image: ${remoteUrl}`, err);
    }
  }
}

function copyToDist(src: string, dest: string): void {
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// The prose column is 660px wide: a 2x screen takes the 1320px file, anything else the 660px one, and nothing larger is ever drawn.
const IMAGE_WIDTHS = [660, 1320];
export const IMAGE_SIZES = '(max-width: 660px) 100vw, 660px';

export interface ResponsiveImage {
  src: string;
  /** Each width it was written at, smallest first; empty when the original is passed through. */
  variants: { src: string; width: number }[];
  width?: number;
  height?: number;
}

/**
 * A downloaded Notion image as WebP (animated where the GIF was) at the widths the prose column can use, plus the size of the largest
 * so the page holds its place before it loads. The files sit next to the original in public/, where the CI cache keeps them between
 * builds, and are copied into dist/ as downloadImages does. SVGs, and anything sharp cannot read, are passed through as they are.
 */
export async function responsiveImage(localPath: string): Promise<ResponsiveImage> {
  const passThrough = { src: localPath, variants: [] };
  if (!/\.(png|jpe?g|gif|webp)$/i.test(localPath)) return passThrough;
  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  const original = path.join(publicDir, localPath);
  if (!fs.existsSync(original)) return passThrough;
  try {
    const animated = /\.gif$/i.test(localPath);
    const meta = await sharp(original, { animated }).metadata();
    const w = meta.width ?? 0;
    const h = (animated && meta.pageHeight) || meta.height || 0; // a GIF of a single frame has no pageHeight
    if (!w || !h) return passThrough;
    const widths = [...new Set([...IMAGE_WIDTHS.filter((x) => x < w), Math.min(w, IMAGE_WIDTHS.at(-1)!)])];
    const variants = [];
    for (const width of widths) {
      const src = localPath.replace(/\.[^.]+$/, `-${width}.webp`);
      const file = path.join(publicDir, src);
      if (!fs.existsSync(file)) await sharp(original, { animated }).resize({ width }).webp({ quality: 80 }).toFile(file);
      copyToDist(file, path.join(distDir, src));
      variants.push({ src, width });
    }
    const top = variants.at(-1)!;
    return { src: top.src, variants, width: top.width, height: Math.round((h * top.width) / w) };
  } catch (err) {
    console.warn(`Could not make WebP of ${localPath}`, err);
    return passThrough;
  }
}
