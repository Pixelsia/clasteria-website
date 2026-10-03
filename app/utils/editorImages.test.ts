import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import { createImage } from '@nuxt/image/runtime';
import ipxProvider from '@nuxt/image/runtime/providers/ipx';
import noneProvider from '@nuxt/image/runtime/providers/none';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as vue from 'vue';
import type { Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { compileScript, parse } from 'vue/compiler-sfc';
import { createEditorSectionVNode } from '../composables/editorSection';
import { createDefaultPageDocument, createPageSection, pageDefinitions, pageImages, parsePageDocument, serializePageDocument } from './pageDocument';
import type { PageDocument, PageSection } from './pageDocument';
import * as homeDocument from './homeDocument';
import * as siteContent from './siteContent';
import { formatDate } from './date';

const appRoot = resolve(import.meta.dirname, '..');
const publicRoot = resolve(appRoot, '../public');
const components = new Map<string, Component>();
const providers = {
  none: { setup: () => ({ ...noneProvider(), defaults: {} }), defaults: {} },
  ipx: { setup: ipxProvider, defaults: {} },
};
const image = createImage({
  providers,
  provider: 'ipx',
  nuxt: { baseURL: '/' },
  presets: {},
  screens: { sm: 640, md: 768 },
  alias: {},
  domains: [],
  densities: [1, 2],
  format: ['avif', 'webp'],
  quality: 75,
  // These built-in URL providers never read Nuxt's unrelated runtime settings.
  runtimeConfig: {} as Parameters<typeof createImage>[0]['runtimeConfig'],
});

function loadComponent(path: string): Component {
  const cached = components.get(path);
  if (cached) return cached;
  const { descriptor, errors } = parse(readFileSync(path, 'utf8'), { filename: path });
  expect(errors, path).toEqual([]);
  const script = compileScript(descriptor, { id: path, inlineTemplate: true }).content;
  const executable = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { default: Component };
  const dependencies: Record<string, unknown> = {
    'vue': vue,
    '~/utils/homeDocument': homeDocument,
    '~/utils/siteContent': siteContent,
    '~/utils/date': { formatDate },
    '~/composables/articles': { useArticlesList: async () => vue.ref({ articles: [], total: 0 }) },
    '~/composables/images': { useOgImageSrc: () => '' },
    '~/composables/siteReveal': { useSiteReveal: () => {} },
  };
  new Function('require', 'exports', 'computed', 'ref', executable)((name: string) => {
    if (name in dependencies) return dependencies[name];
    if (name.startsWith('~/') && name.endsWith('.vue')) {
      return { default: loadComponent(resolve(appRoot, name.slice(2))) };
    }
    throw new Error(`Unexpected component dependency: ${name}`);
  }, exports, vue.computed, vue.ref);
  components.set(path, exports.default);
  return exports.default;
}

type ImageCall = { src: string; provider: string | undefined; url: string; srcset: string };
type View = 'canvas' | 'preview' | 'public';

async function renderImages(view: View, document: PageDocument) {
  const calls: ImageCall[] = [];
  const warnings: string[] = [];
  const sectionView = loadComponent(resolve(appRoot, 'components/editor/PageSection.vue'));
  const documentView = loadComponent(resolve(appRoot,
    `components/${view === 'public' ? 'content' : 'editor'}/PageDocument.vue`));
  const app = vue.createSSRApp(vue.defineComponent({
    setup: () => () => view === 'canvas'
      ? vue.h('div', document.sections.map(section =>
          createEditorSectionVNode(sectionView, section, app._context, document.page)))
      : vue.h(documentView, { document }),
  }));
  app.config.warnHandler = message => warnings.push(message);
  app.component('TopHero', loadComponent(resolve(appRoot, 'components/top/Hero.vue')));
  for (const name of ['UContainer', 'UButton', 'UIcon', 'UAccordion', 'NuxtLink', 'TopAbout', 'TopNews', 'SiteCtaBand']) {
    app.component(name, vue.defineComponent({
      setup: (_, { slots }) => () => vue.h('div', slots.default?.()),
    }));
  }
  // Observe the real SFC chain, including the canvas VNode factory. Only
  // NuxtPicture's boundary is adapted, using Nuxt Image's actual URL providers.
  // This checks URL selection, not network delivery in a deployed browser.
  app.component('NuxtPicture', vue.defineComponent({
    props: {
      src: { type: String, required: true },
      provider: { type: String, default: undefined },
      imgAttrs: { type: Object, default: () => ({}) },
    },
    setup(props) {
      const sources = image.getSizes(props.src, {
        provider: props.provider,
        sizes: { sm: '100vw', md: '768px' },
        modifiers: { format: 'webp', quality: 75 },
      });
      calls.push({ src: props.src, provider: props.provider, url: sources.src!, srcset: sources.srcset });
      return () => vue.h('picture', vue.h('img', { ...props.imgAttrs, src: sources.src, srcset: sources.srcset }));
    },
  }));
  const html = await renderToString(app);
  expect(warnings, `${view}: unresolved components or Vue warnings`).toEqual([]);
  return { calls, html };
}

function withSections(page: PageDocument['page'], sections: PageSection[]): PageDocument {
  return { version: 1, page, sections };
}

function expectRawImage(call: ImageCall, src: string) {
  expect(call.src).toBe(src);
  expect(call.provider).toBe('none');
  expect(call.url).toBe(src);
  expect(call.srcset.split(', ').map(source => source.split(' ')[0])).toEqual(
    expect.arrayContaining([src]),
  );
  expect(call.srcset).not.toContain('/_ipx/');
  expect(call.srcset.split(', ').every(source => source.split(' ')[0] === src)).toBe(true);
}

describe('editor image delivery', () => {
  it.each(['canvas', 'preview', 'public'] as const)('uses the same brighter Home hero treatment in %s without changing document data', async (view) => {
    const document = createDefaultPageDocument('home');
    const hero = document.sections.find(section => section.kind === 'hero')!;
    hero.content.image = '/images/clasteria/portal-plaza.png';
    hero.style = { accent: '#aabbcc', background: '#112233', spacing: 'roomy' };
    const original = structuredClone(document);
    const { html } = await renderImages(view, document);
    expect(html).toContain('class="size-full object-cover opacity-75"');
    expect(html).toContain('from-neutral-950/55 via-neutral-950/40 to-neutral-950/65');
    expect(html).toContain('--home-accent:#aabbcc;--home-background:#112233');
    expect(html).toContain('home-spacing-roomy');
    expect(document).toEqual(original);
  });

  it.each(['canvas', 'preview', 'public'] as const)('matches Home brightness for every other page hero in %s', async (view) => {
    for (const page of pageDefinitions.filter(page => !['home', 'article-draft'].includes(page.id))) {
      const document = createDefaultPageDocument(page.id);
      const hero = document.sections.find(section => section.kind === 'page-hero')!;
      hero.style = { accent: '#aabbcc', background: '#112233', spacing: 'roomy' };
      const original = structuredClone(document);
      const { html } = await renderImages(view, withSections(page.id, [hero]));
      expect(html).toContain('class="size-full object-cover opacity-75"');
      expect(html).toContain('from-neutral-950/55 via-neutral-950/40 to-neutral-950/65');
      expect(html).toContain('--page-background-overlay:color-mix(in srgb, #112233 55%, transparent)');
      expect(html).toContain('--page-background-overlay-middle:color-mix(in srgb, #112233 40%, transparent)');
      expect(html).toContain('--page-background-overlay-end:color-mix(in srgb, #112233 65%, transparent)');
      expect(html).toContain('--page-accent:#aabbcc;--page-background:#112233');
      expect(html).toContain('page-spacing-roomy');
      expect(html).not.toContain('opacity-35');
      expect(document).toEqual(original);
    }
  });

  it('keeps the supplied plaza PNG intact and uses it for all default page heroes only', async () => {
    const value = '/images/clasteria/portal-plaza.png';
    const expected = { label: 'ネザーゲートのある広場', value };
    expect(homeDocument.homeImages).toContainEqual(expected);
    expect(pageImages).toContainEqual(expected);
    const bytes = readFileSync(resolve(publicRoot, `.${value}`));
    expect(bytes.byteLength).toBe(2_868_100);
    expect(createHash('sha256').update(bytes).digest('hex'))
      .toBe('cc59fab33d1ab36da0423400942919b725b7ac7ef59cff39fe7d0cac3a5837a2');
    expect(await sharp(bytes).metadata()).toMatchObject({ format: 'png', width: 1920, height: 1009 });
    let heroCount = 0;
    for (const page of pageDefinitions) {
      const document = createDefaultPageDocument(page.id);
      for (const section of document.sections) {
        if (['hero', 'page-hero'].includes(section.kind)) {
          expect(section.content.image, page.id).toBe(value);
          heroCount++;
        }
        else {
          expect(section.content.image, `${page.id}/${section.id}`).not.toBe(value);
        }
      }
    }
    expect(heroCount).toBe(9);
    expect(createPageSection('hero', 'new-home-hero').content.image).toBe(value);
    expect(createPageSection('page-hero', 'new-page-hero').content.image).toBe(value);
    expect(createDefaultPageDocument('codingcraft').sections.find(section => section.kind === 'split-content')?.content.image)
      .toBe('/images/clasteria/home-main-visual.png');
    expect(siteContent.featureCards.map(card => card.image))
      .toEqual(['/images/clasteria/minigame.jpg', '/images/clasteria/clasteria-hero.jpg']);
  });

  it.each(['canvas', 'preview', 'public'] as const)('preserves saved custom hero images, text and style in %s', async (view) => {
    for (const page of pageDefinitions.filter(page => page.id !== 'article-draft')) {
      const document = createDefaultPageDocument(page.id);
      const hero = document.sections.find(section => ['hero', 'page-hero'].includes(section.kind))!;
      Object.assign(hero.content, { image: '/images/clasteria/home-main-visual.png', title: '保存済みの見出し' });
      hero.style = { accent: '#aabbcc', background: '#112233', spacing: 'compact' };
      const imported = parsePageDocument(serializePageDocument(document), page.id);
      const { calls, html } = await renderImages(view, withSections(page.id, [imported.sections[0]!]));
      expect(calls[0]?.src).toBe('/images/clasteria/home-main-visual.png');
      expect(html).toContain('保存済みの見出し');
      expect(imported).toEqual(document);
    }
  });

  it('registers the none provider without changing the public default', () => {
    const path = resolve(appRoot, '../nuxt.config.ts');
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ES2022, true);
    const definition = source.statements.find(ts.isExportAssignment)?.expression;
    if (!definition || !ts.isCallExpression(definition)) throw new Error('Missing defineNuxtConfig call');
    const options = definition.arguments[0];
    if (!options || !ts.isObjectLiteralExpression(options)) throw new Error('Missing Nuxt options');
    const imageOption = options.properties.find(property => property.name?.getText(source) === 'image');
    if (!imageOption || !ts.isPropertyAssignment(imageOption)
      || !ts.isObjectLiteralExpression(imageOption.initializer)) throw new Error('Missing image options');
    const properties = imageOption.initializer.properties;
    const none = properties.find(property => property.name?.getText(source) === 'none');
    expect(none && ts.isPropertyAssignment(none) && ts.isObjectLiteralExpression(none.initializer)).toBe(true);
    expect(properties.some(property => property.name?.getText(source) === 'provider')).toBe(false);
  });

  it('ships every registered image as a nonempty file inside public', () => {
    const registered = pageImages.filter(image => image.value);
    expect(registered.length).toBeGreaterThan(0);
    for (const { value } of registered) {
      expect(value).toMatch(/^\/images\//);
      const path = resolve(publicRoot, `.${value}`);
      expect(path.startsWith(`${publicRoot}${sep}`), value).toBe(true);
      const file = statSync(path);
      expect(file.isFile(), value).toBe(true);
      expect(file.size, value).toBeGreaterThan(0);
    }
  });

  describe.each(['canvas', 'preview'] as const)('%s', (view) => {
    it('uses raw registered assets for every default page image, including unpublished pages', async () => {
      for (const page of pageDefinitions) {
        const document = createDefaultPageDocument(page.id);
        const sections = document.sections.filter(section => section.content.image);
        if (!sections.length) continue;
        const { calls } = await renderImages(view, withSections(page.id, sections));
        expect(calls, page.id).toHaveLength(sections.length);
        sections.forEach((section, index) => expectRawImage(calls[index]!, section.content.image!));
      }
    });

    it.each(['page-hero', 'split-content'] as const)('keeps newly selected %s images out of IPX', async (kind) => {
      for (const { value } of pageImages.filter(image => image.value)) {
        const section = createPageSection(kind, 'changed-image');
        section.content.image = value;
        const { calls, html } = await renderImages(view, withSections('codingcraft', [section]));
        expect(calls).toHaveLength(1);
        expectRawImage(calls[0]!, value);
        expect(html).toContain(`src="${value}"`);
        expect(html).not.toContain('/_ipx/');
      }
    });

    it('passes the raw provider through the Home section and hero', async () => {
      for (const { value } of homeDocument.homeImages) {
        const section = createPageSection('hero', 'hero');
        section.content.image = value;
        const { calls } = await renderImages(view, withSections('home', [section]));
        expect(calls).toHaveLength(1);
        expectRawImage(calls[0]!, value);
      }
    });

    it('does not create an image for a text-only split section', async () => {
      const section = createPageSection('split-content', 'text-only');
      const { calls, html } = await renderImages(view, withSections('codingcraft', [section]));
      expect(calls).toEqual([]);
      expect(html).not.toContain('<picture');
    });
  });

  it('leaves public support images on the default optimizing provider', async () => {
    const document = createDefaultPageDocument('support');
    const { calls } = await renderImages('public', document);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.provider).toBeUndefined();
    expect(calls[0]!.url).toMatch(/^\/_ipx\//);
    expect(calls[0]!.url).toContain(document.sections[0]!.content.image);
    expect(calls[0]!.srcset).toContain('/_ipx/');
  });

  it.each(['hero', 'split-content'] as const)('keeps public %s optimization enabled', async (kind) => {
    const section = createPageSection(kind, 'public-image');
    section.content.image = homeDocument.homeImages[0]!.value;
    const { calls } = await renderImages('public', withSections(kind === 'hero' ? 'home' : 'codingcraft', [section]));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.provider).toBeUndefined();
    expect(calls[0]!.url).toMatch(/^\/_ipx\//);
    expect(calls[0]!.srcset).toContain('/_ipx/');
  });
});
