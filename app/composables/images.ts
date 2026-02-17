import { joinURL, parseFilename } from 'ufo';
import { getOgImagePath } from '#og-image/app/utils';

export type OgImageOptions = NonNullable<Parameters<typeof defineOgImageComponent>[2]>;

/**
 * defineOgImage に渡す options が URL 指定のとき、その画像を最適化・オリジン付与した options にする。
 */
export function useResolvedOgImage(options?: OgImageOptions): OgImageOptions {
  if (!options) return {};

  const src = toValue(options.url)?.trim();
  if (!src) return { ...options, url: undefined };

  let width = toValue(options.width);
  let height = toValue(options.height);
  let scale = 1.0;
  if (width) scale = width / 1200;
  if (height) scale = height / 630;
  width ||= Math.round(1200 * scale);
  height ||= Math.round(630 * scale);

  let format = parseFilename(src)?.split('.').at(-1)?.toLowerCase() ?? '';
  if (!['png', 'jpg', 'jpeg'].includes(format)) format = 'png';

  const img = useImage();
  let url = img(src, { width, height, format, fit: 'cover' });
  url = joinURL(import.meta.server ? getNitroOrigin() : window.location.origin, url);

  return { ...options, url, width, height };
}

export function useOgImageSrc(pagePath: string, options?: OgImageOptions): string {
  const optimizedOgImage = useResolvedOgImage(options);
  if (optimizedOgImage.url) return toValue(options?.url)!;
  return getOgImagePath(pagePath, optimizedOgImage);
}
