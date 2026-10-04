import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vue from 'vue';
import type { Component } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { compileScript, parse } from 'vue/compiler-sfc';
import { createDefaultPageDocument, createPageSection, pageDefinitions } from '../../utils/pageDocument';
import type { PageSection } from '../../utils/pageDocument';
import type { ArticlesList } from '../../composables/articles';
import * as siteContent from '../../utils/siteContent';
import { formatDate } from '../../utils/date';

const appRoot = resolve(import.meta.dirname, '../..');
const components = new Map<string, Component>();
const articleData = vue.ref<ArticlesList>({ articles: [], total: 0 });
const useArticlesList = vi.fn(async (_options: { page: () => number; limit: number }) => articleData);

function loadComponent(path: string): Component {
  const cached = components.get(path);
  if (cached) return cached;
  const source = readFileSync(path, 'utf8');
  const { descriptor } = parse(source, { filename: path });
  const script = compileScript(descriptor, { id: path, inlineTemplate: true }).content;
  const executable = ts.transpileModule(script, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {} as { default: Component };
  const dependencies: Record<string, unknown> = {
    'vue': vue,
    '~/utils/siteContent': siteContent,
    '~/utils/date': { formatDate },
    '~/composables/articles': { useArticlesList },
    '~/composables/images': { useOgImageSrc: () => '' },
    '~/composables/siteReveal': { useSiteReveal: () => {} },
  };
  const evaluate = new Function('require', 'exports', 'computed', 'ref', executable);
  evaluate((name: string) => {
    if (name in dependencies) return dependencies[name];
    if (name.startsWith('~/') && name.endsWith('.vue')) {
      return { default: loadComponent(resolve(appRoot, name.slice(2))) };
    }
    throw new Error(`Unexpected component dependency: ${name}`);
  }, exports, vue.computed, vue.ref);
  components.set(path, exports.default);
  return exports.default;
}

function element(tag: string) {
  return vue.defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => vue.h(tag, attrs, slots.default?.()),
  });
}

async function renderSection(section: PageSection) {
  const component = loadComponent(resolve(import.meta.dirname, 'PageSection.vue'));
  const app = vue.createSSRApp(component, { section });
  app.component('UContainer', element('section'));
  app.component('UIcon', element('span'));
  app.component('NuxtPicture', element('img'));
  app.component('NuxtLink', element('a'));
  app.component('UInput', element('input'));
  app.component('UPagination', element('nav'));
  app.component('UButton', vue.defineComponent({
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => vue.h(attrs.to ? 'a' : 'button', attrs, slots.default?.()),
  }));
  app.component('UAccordion', vue.defineComponent({
    props: ['items'],
    setup: props => () => vue.h('div', props.items.map((item: { label: string; content: string }) => vue.h('details', [
      vue.h('summary', item.label), vue.h('p', item.content),
    ]))),
  }));
  return renderToString(app);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  articleData.value = { articles: [], total: 0 };
});

describe('shared page section rendering', () => {
  it('renders every default non-Home section with the real shared view', async () => {
    for (const page of pageDefinitions.filter(page => page.id !== 'home')) {
      for (const section of createDefaultPageDocument(page.id).sections) {
        const html = await renderSection(section);
        expect(html).toContain(`data-section-id="${section.id}"`);
        expect(html).toContain(`page-section-${section.kind}`);
        expect(html).not.toContain('undefined');
      }
    }
    expect(useArticlesList).toHaveBeenCalled();
  });

  it('escapes article text and identifies the single draft instead of a published article', async () => {
    const meta = createPageSection('article-meta', 'article-meta');
    meta.content.title = '<script>alert(1)</script>';
    const html = await renderSection(meta);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('新規記事 1 件の下書きプレビュー');
    expect(html).toContain('公開済みの記事やニュース一覧には反映されません');
    const paragraph = createPageSection('article-paragraph', 'body');
    paragraph.content.body = '<img src=x onerror=alert(1)>';
    expect(await renderSection(paragraph)).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps both prototype forms inert even when their text is edited', async () => {
    for (const kind of ['login-form', 'register-form'] as const) {
      const section = createPageSection(kind, kind);
      section.content.primaryLabel = '今すぐ開始';
      const html = await renderSection(section);
      expect(html).not.toContain('<form');
      expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
      expect(html).toContain('今すぐ開始');
      if (kind === 'login-form') {
        expect(html.match(/<input[^>]*disabled[^>]*>/g)).toHaveLength(2);
      }
    }
  });

  it('shows exactly ten labelled placeholder rows without fabricated scores', async () => {
    const section = createPageSection('ranking', 'ranking');
    section.content.placeholder = '接続待ち';
    const html = await renderSection(section);
    expect(html.match(/<tr>/g)).toHaveLength(11);
    expect(html.match(/接続待ち/g)).toHaveLength(10);
    expect(html).toContain('実際のプレイヤー・スコアではありません');
    expect(html).not.toContain('Player 01');
  });

  it('passes only filled FAQ entries to the interactive accordion', async () => {
    const section = createPageSection('faq', 'faq');
    section.content.question4 = '追加した質問';
    section.content.answer4 = '追加した回答';
    const html = await renderSection(section);
    expect(html.match(/<details>/g)).toHaveLength(4);
    expect(html).toContain('<summary>追加した質問</summary>');
    expect(html).toContain('<p>追加した回答</p>');
  });

  it('renders only the supplied info cards and preserves bounded style values', async () => {
    const section = createPageSection('info-grid', 'cards');
    section.content.item1Title = '紹介カード';
    section.style = { accent: '#123456', background: '#abcdef', spacing: 'roomy' };
    const html = await renderSection(section);
    expect(html.match(/<h3/g)).toHaveLength(1);
    expect(html).toContain('page-spacing-roomy');
    expect(html).toContain('--page-accent:#123456');
    expect(html).toContain('--page-background:#abcdef');
  });

  it('renders published article records and keeps pagination connected to the list query', async () => {
    articleData.value = {
      articles: [{
        slug: '20261002-published', title: '公開済みのお知らせ', description: '', author: 'Pixelsia',
        publishedAt: new Date('2026-10-02T00:00:00Z'), seo: {}, tags: [], hotDays: 0,
      }],
      total: 21,
    };
    const html = await renderSection(createPageSection('article-list', 'articles'));
    expect(html).toContain('公開済みのお知らせ');
    expect(html).toContain('/articles/20261002-published');
    expect(html).toContain('ニュース一覧のページ切り替え');
    expect(html).toContain('items-per-page="20"');
    const options = useArticlesList.mock.calls.at(-1)?.[0] as unknown as { page: () => number; limit: number };
    expect(options.limit).toBe(20);
    expect(options.page()).toBe(0);
  });

  it('keeps public contact links at their fixed approved destinations', async () => {
    const html = await renderSection(createPageSection('support-contact', 'contact'));
    expect(html).toContain('mailto:support@pixelsia.net');
    expect(html).toContain('https://discord.gg/fsts95chH5');
    expect(html).toContain('メールを作成');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

describe('support clipboard behavior', () => {
  function contactScript() {
    const source = readFileSync(resolve(import.meta.dirname, 'SupportContact.vue'), 'utf8');
    const script = parse(source).descriptor.scriptSetup!.content;
    const executable = ts.transpileModule(`${script}\nexport const api = { copyEmail, emailCopied, copyFailed };`, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports = {} as { api: {
      copyEmail: () => Promise<void>;
      emailCopied: vue.Ref<boolean>;
      copyFailed: vue.Ref<boolean>;
    }; };
    new Function('require', 'exports', 'defineProps', 'ref', executable)(
      () => siteContent, exports, () => ({}), vue.ref,
    );
    return exports.api;
  }

  it('copies the approved address and reports success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const api = contactScript();
    await api.copyEmail();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('support@pixelsia.net');
    expect(api.emailCopied.value).toBe(true);
    expect(api.copyFailed.value).toBe(false);
  });

  it('reports denied clipboard access and recovers on a retry', async () => {
    const writeText = vi.fn().mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const api = contactScript();
    await api.copyEmail();
    expect(api.copyFailed.value).toBe(true);
    expect(api.emailCopied.value).toBe(false);
    await api.copyEmail();
    expect(api.copyFailed.value).toBe(false);
    expect(api.emailCopied.value).toBe(true);
  });
});
