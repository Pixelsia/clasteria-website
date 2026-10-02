import path from 'path';
import fs from 'fs/promises';
import { hasProtocol, normalizeURL } from 'ufo';
import { textContent, visit } from 'minimark';
import type { MinimarkElement, MinimarkTree, ParsedContentFile } from '@nuxt/content';

/**
 * 外部の記事を配置するディレクトリを用意する。デモ記事は自動公開しない。
 * @remark 既存のビルド設定との互換性のため関数名は維持する。
 */
export async function ensureContentSymlink(rootDir = process.cwd()) {
  const contentDir = path.resolve(rootDir, 'public/_content');
  const demoDir = path.resolve(rootDir, 'content-demo');
  const target = await fs.realpath(contentDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });

  // 以前のビルドが作ったリンクを残したまま、架空の記事や画像を配信しない。
  // 外部コンテンツへのリンクやディレクトリには触れず、誤設定はビルドを止める。
  if (target === demoDir || target?.startsWith(`${demoDir}${path.sep}`)) {
    throw new Error('public/_content points to content-demo. Remove the demo link before building.');
  }

  await fs.mkdir(path.join(contentDir, 'articles'), { recursive: true });
}

/**
 * 公開日とファイル名から slug を生成する
 * @remark すでに slug がある場合はそれを返す
 */
export function generateContentSlug(content: ParsedContentFile): string {
  if (typeof content.slug === 'string') return content.slug;
  const yyyymmdd = (new Date(content.publishedAt as string)).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replaceAll('/', '');
  return `${yyyymmdd}-${path.basename(content.stem as string)}`;
}

/**
 * OG 画像が設定されておらず、かつ記事の隣に `ogp.[png|jpg|jpeg]` がある場合、それを OG 画像として設定する
 */
export async function detectContentOgImage(content: ParsedContentFile, dirname: string) {
  if (content.ogImage) return;
  const candidates = ['ogp.png', 'ogp.jpg', 'ogp.jpeg'];
  for (const filename of candidates) {
    const fullPath = path.resolve(dirname, filename);
    const isFile = await fs.stat(fullPath).then(stats => stats.isFile()).catch(() => false);
    if (isFile) {
      content.ogImage = { url: filename };
      return;
    }
  }
}

function resolveResourcePath(resourcePath: string, dirname: string): string {
  if (hasProtocol(resourcePath)) return resourcePath;
  if (resourcePath.startsWith('/')) return resourcePath;
  return '/' + normalizeURL(path.relative('public', path.resolve(dirname, resourcePath)));
}

/**
 * 記事内の画像の相対パスを絶対パスに変換する
 */
export function resolveContentImagePaths(content: ParsedContentFile, dirname: string) {
  if (content.ogImage && typeof content.ogImage === 'object' && 'url' in content.ogImage && typeof content.ogImage.url === 'string') {
    content.ogImage.url = resolveResourcePath(content.ogImage.url, dirname);
  }

  visit(
    content.body as MinimarkTree,
    (node): node is MinimarkElement => Array.isArray(node) && node[0] === 'img',
    (node): void => {
      const props = node[1];
      if (typeof props.src !== 'string') return;
      props.src = resolveResourcePath(props.src, dirname);
    },
  );
}

/**
 * title と description がそれぞれ設定されていない場合、中身から自動生成する
 * @remark Nuxt Content の contentHeading と違い、title に採用された h1 は削除、description の自動生成を本文から 300 文字にしている。
 */
export function contentHeading(content: ParsedContentFile) {
  const body = content.body as MinimarkTree;
  const seo = content.seo as Record<string, unknown>;
  if (!content.title && body.value[0]?.[0] === 'h1') {
    const titleNode = body.value.shift()!;
    content.title = textContent(titleNode);
    seo.title ||= content.title;
  }
  if (!content.description) {
    const inlineBody = body.value.map(node => textContent(node)).join('\n').replace(/\s+/g, ' ');
    content.description = inlineBody.slice(0, 300) + '…';
    seo.description ||= content.description;
  }
}
