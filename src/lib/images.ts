import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

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
 * A downloaded picture as WebP (animated where the GIF was) at the widths the prose column can use, plus the size of the largest
 * so the page holds its place before it loads. The files sit next to the original in public/, where the CI cache keeps them between
 * builds, and are copied into dist/. SVGs, and anything sharp cannot read, are passed through as they are.
 */
export async function responsiveImage(localPath: string, sizes: number[] = IMAGE_WIDTHS): Promise<ResponsiveImage> {
  const passThrough = { src: localPath, variants: [] };
  if (!/\.(png|jpe?g|gif|webp)$/i.test(localPath)) return passThrough;
  const publicDir = path.resolve(process.cwd(), 'public');
  const distDir = path.resolve(process.cwd(), 'dist');
  const original = path.join(publicDir, localPath);
  if (!fs.existsSync(original)) return passThrough;
  try {
    // a GIF, or a WebP Think Space made from one, keeps moving
    const animated = /\.gif$/i.test(localPath) || (/\.webp$/i.test(localPath) && ((await sharp(original).metadata()).pages ?? 1) > 1);
    const meta = await sharp(original, { animated }).metadata();
    const w = meta.width ?? 0;
    const h = (animated && meta.pageHeight) || meta.height || 0; // a GIF of a single frame has no pageHeight
    if (!w || !h) return passThrough;
    const widths = [...new Set([...sizes.filter((x) => x < w), Math.min(w, sizes.at(-1)!)])];
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
