import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ParsedContentFile } from '@nuxt/content';
import { ensureContentSymlink, generateContentSlug, resolveContentImagePaths } from './prebuild-content';

describe('external content setup', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clasteria-content-'));
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it('creates an empty content directory instead of publishing demo fixtures', async () => {
    await fs.mkdir(path.join(rootDir, 'content-demo/articles'), { recursive: true });
    await fs.writeFile(path.join(rootDir, 'content-demo/articles/demo.md'), 'Synthetic fixture');
    await ensureContentSymlink(rootDir);
    expect((await fs.lstat(path.join(rootDir, 'public/_content'))).isSymbolicLink()).toBe(false);
    expect(await fs.readdir(path.join(rootDir, 'public/_content/articles'))).toEqual([]);
    expect(await fs.readFile(path.join(rootDir, 'content-demo/articles/demo.md'), 'utf8')).toBe('Synthetic fixture');
  });

  it('preserves an external content symlink and its files', async () => {
    const sourceDir = path.join(rootDir, 'external-content');
    await fs.mkdir(path.join(sourceDir, 'articles'), { recursive: true });
    await fs.writeFile(path.join(sourceDir, 'articles/real.md'), 'External article');
    await fs.mkdir(path.join(rootDir, 'public'));
    await fs.symlink(sourceDir, path.join(rootDir, 'public/_content'), 'junction');
    await ensureContentSymlink(rootDir);
    expect(await fs.realpath(path.join(rootDir, 'public/_content'))).toBe(sourceDir);
    expect(await fs.readFile(path.join(sourceDir, 'articles/real.md'), 'utf8')).toBe('External article');
  });

  it('preserves external files when the setup runs again', async () => {
    await ensureContentSymlink(rootDir);
    const articlePath = path.join(rootDir, 'public/_content/articles/real.md');
    await fs.writeFile(articlePath, 'External article');
    await ensureContentSymlink(rootDir);
    expect(await fs.readFile(articlePath, 'utf8')).toBe('External article');
  });

  it('fails safely if a previous build still exposes the demo directory', async () => {
    const demoDir = path.join(rootDir, 'content-demo');
    await fs.mkdir(path.join(demoDir, 'articles'), { recursive: true });
    await fs.mkdir(path.join(rootDir, 'public'));
    await fs.symlink(demoDir, path.join(rootDir, 'public/_content'), 'junction');
    await expect(ensureContentSymlink(rootDir)).rejects.toThrow('points to content-demo');
    expect(await fs.realpath(path.join(rootDir, 'public/_content'))).toBe(demoDir);
  });
});

describe('article content processing', () => {
  it('preserves an explicit public slug', () => {
    expect(generateContentSlug({ slug: '20261001-news' } as ParsedContentFile)).toBe('20261001-news');
  });

  it('keeps external content images reachable under the existing public path', () => {
    const content = {
      ogImage: { url: 'ogp.jpg' },
      body: { type: 'minimark', value: [['img', { src: 'screenshot.png' }]] },
    } as unknown as ParsedContentFile;
    resolveContentImagePaths(content, path.resolve('public/_content/articles/confirmed'));
    expect(content.ogImage).toEqual({ url: '/_content/articles/confirmed/ogp.jpg' });
    expect(content.body).toEqual({
      type: 'minimark',
      value: [['img', { src: '/_content/articles/confirmed/screenshot.png' }]],
    });
  });
});
