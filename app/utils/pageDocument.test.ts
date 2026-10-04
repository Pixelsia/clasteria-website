import { describe, expect, it } from 'vitest';
import {
  allowedPageSectionKinds, createDefaultPageDocument, createPageSection,
  isMultilinePageField, isPageId, isRequiredPageSection,
  isSafePageLink, maxPageDocumentBytes, maxPageSections, pageDefinitions, pageDestinations, pageFieldLabels,
  pageImages, pageSectionLabels, pageSectionTemplates, parsePageDocument, serializeArticleMarkdown,
  serializePageDocument, validatePageDocument,
} from './pageDocument';
import type { PageDocument, PageId, PageSectionKind } from './pageDocument';
import {
  createDefaultHomeDocument, createHomeSection, homeSectionTemplates, parseHomeDocument,
  serializeHomeDocument,
} from './homeDocument';
import { codingCraftFlow, faqItems, kakurenboFlow, onigokkoFlow, onigokkoRules } from './siteContent';

function withContent(page: PageId, kind: PageSectionKind, content: Record<string, unknown>): unknown {
  const document = createDefaultPageDocument(page);
  return { ...document, sections: document.sections.map(section => section.kind === kind
    ? { ...section, content: { ...section.content, ...content } }
    : section) };
}

function article(): PageDocument {
  const document = createDefaultPageDocument('article-draft');
  Object.assign(document.sections[0]!.content, { slug: '20261002-clasteria-news', publishedAt: '2026-10-02' });
  return document;
}

describe('bounded page document registry and defaults', () => {
  it('exposes the eleven editable destinations without claiming hidden pages are public', () => {
    expect(pageDefinitions.map(page => page.id)).toEqual([
      'home', 'support', 'articles', 'access', 'onigokko', 'kakurenbo', 'login', 'register', 'leaderboard', 'codingcraft', 'article-draft',
    ]);
    expect(pageDefinitions.filter(page => page.published).map(page => page.id)).toEqual(['home', 'support', 'articles', 'access']);
    expect(isPageId('support')).toBe(true);
    for (const value of ['constructor', '__proto__', '', 'Home', '/support', 'article', null, {}, 1]) {
      expect(isPageId(value)).toBe(false);
    }
    expect(isRequiredPageSection('hero')).toBe(true);
    expect(isRequiredPageSection('page-hero')).toBe(true);
    expect(isRequiredPageSection('article-meta')).toBe(true);
    expect(isRequiredPageSection('faq')).toBe(false);
  });

  it.each(pageDefinitions)('validates and roundtrips complete independent $id defaults', ({ id }) => {
    const source = createDefaultPageDocument(id);
    const clean = validatePageDocument(source, id);
    expect(clean).toEqual(source);
    expect(parsePageDocument(serializePageDocument(source), id)).toEqual(source);
    expect(source.sections.length).toBeLessThanOrEqual(maxPageSections);
    expect(new TextEncoder().encode(serializePageDocument(source)).byteLength).toBeLessThan(maxPageDocumentBytes);
    for (const [index, section] of source.sections.entries()) {
      expect(allowedPageSectionKinds(id)).toContain(section.kind);
      expect(pageSectionLabels[section.kind]).toBeTruthy();
      expect(Object.keys(section.content)).toEqual(Object.keys(pageSectionTemplates[section.kind].content));
      for (const key of Object.keys(section.content)) expect(pageFieldLabels[key], key).toBeTruthy();
      expect(clean.sections[index]).not.toBe(section);
      expect(clean.sections[index]!.content).not.toBe(section.content);
      expect(clean.sections[index]!.style).not.toBe(section.style);
    }
    clean.sections[0]!.content.title = '変更';
    clean.sections[0]!.style.accent = '#abcdef';
    expect(createDefaultPageDocument(id)).toEqual(source);
  });

  it('creates independent sections without mutating templates', () => {
    for (const kind of Object.keys(pageSectionTemplates) as PageSectionKind[]) {
      const before = JSON.stringify(pageSectionTemplates[kind]);
      const created = createPageSection(kind, 'new-section');
      created.content.title = 'Changed';
      created.style.background = '#112233';
      expect(JSON.stringify(pageSectionTemplates[kind])).toBe(before);
    }
  });

  it('keeps the reviewed Support and news listing copy with the requested plaza image', () => {
    const support = createDefaultPageDocument('support');
    expect(support.sections[0]!.content).toMatchObject({
      title: 'お手伝いできることは\nありますか。',
      description: 'ゲームへの参加、ご質問、不具合のご報告。\nClasteria に関するお問い合わせはこちらから。',
      image: '/images/clasteria/portal-plaza.png', imageAlt: 'ネザーゲートのある広場',
    });
    const articles = createDefaultPageDocument('articles');
    expect(articles.sections[0]!.content).toMatchObject({
      eyebrow: 'NEWSROOM', title: 'ニュース', description: 'Clasteria のお知らせをお届けします。',
      image: '/images/clasteria/portal-plaza.png', imageAlt: 'ネザーゲートのある広場',
    });
  });

  it('preserves the legacy Home v1 data and serialization exactly', () => {
    const document = createDefaultHomeDocument();
    expect(createDefaultPageDocument('home')).toEqual(document);
    expect(serializePageDocument(document)).toBe(serializeHomeDocument(document));
    expect(parseHomeDocument(serializePageDocument(document))).toEqual(document);
    expect(parsePageDocument(serializeHomeDocument(document), 'home')).toEqual(document);
    expect(createPageSection('hero', 'another')).toEqual(createHomeSection('hero', 'another'));
    expect(pageSectionTemplates.hero).toEqual(homeSectionTemplates.hero);
    expect(() => validatePageDocument(withContent('home', 'hero', { image: '/images/clasteria/codingcraft.jpg' }))).toThrow();
    expect(() => validatePageDocument(withContent('home', 'hero', { primaryTo: '/login' }))).toThrow();
  });

  it('preserves existing game, support and CodingCraft source content', () => {
    for (const [page, items] of [
      ['onigokko', [...onigokkoFlow, ...onigokkoRules]], ['kakurenbo', kakurenboFlow], ['codingcraft', codingCraftFlow],
    ] as const) {
      const content = JSON.stringify(createDefaultPageDocument(page));
      for (const item of items) {
        expect(content).toContain(item.title);
        expect(content).toContain(item.body);
        expect(content).toContain(item.icon);
      }
    }
    const support = JSON.stringify(createDefaultPageDocument('support'));
    for (const faq of faqItems) {
      expect(support).toContain(faq.label);
      expect(support).toContain(faq.content);
    }
    expect(support).toContain('support@pixelsia.net');
    expect(support).toContain('https://discord.gg/TwTPa4Yp4h');
    const codingcraft = createDefaultPageDocument('codingcraft');
    expect(codingcraft.sections.filter(section => ['page-hero', 'cta'].includes(section.kind))
      .every(section => section.content.primaryTo === 'https://codingcraft.pixelsia.net/login')).toBe(true);
    expect(codingcraft.sections.some(section => ['login-form', 'register-form'].includes(section.kind))).toBe(false);
  });
});

describe('multiline page content', () => {
  it('classifies prose separately from button labels, links, images and metadata across the registry', () => {
    const multiline = new Set([
      'eyebrow', 'title', 'description', 'body', 'note', 'placeholder', 'cardTitle', 'cardBody',
      'emptyTitle', 'emptyDescription', 'emailTitle', 'emailDescription', 'emailNote',
      'discordTitle', 'discordDescription', 'discordNote', 'serverNote', 'itemTitle', 'itemBody',
      ...Array.from({ length: 6 }, (_, index) => {
        const number = index + 1;
        return [`item${number}`, `item${number}Title`, `item${number}Body`, `question${number}`, `answer${number}`];
      }).flat(),
    ]);
    for (const kind of Object.keys(pageSectionTemplates) as PageSectionKind[]) {
      for (const key of Object.keys(pageSectionTemplates[kind].content)) {
        expect(isMultilinePageField(kind, key), `${kind}.${key}`).toBe(multiline.has(key) || (kind === 'hero' && key === 'brand'));
      }
    }
    expect(isMultilinePageField('hero', 'brand')).toBe(true);
    expect(isMultilinePageField('article-meta', 'brand')).toBe(false);
    for (const key of ['primaryLabel', 'secondaryLabel', 'imageAlt', 'emailLabel', 'emailButtonLabel', 'copyLabel', 'copiedLabel',
      'discordLabel', 'passwordLabel', 'rankLabel', 'playerLabel', 'scoreLabel', 'slug', 'author', 'publishedAt',
      'publicationStatus', 'primaryTo', 'secondaryTo', 'image', 'item1Icon']) {
      expect(isMultilinePageField('page-hero', key), key).toBe(false);
    }
  });

  it.each(pageDefinitions)('keeps LF, CRLF, blank lines and literal HTML intact in $id JSON', ({ id }) => {
    for (const newline of ['\n', '\r\n']) {
      const document = createDefaultPageDocument(id);
      const text = `  一行目${newline}二行目${newline}${newline}<br><script>alert("text")</script> と \\n  `;
      for (const section of document.sections) {
        for (const key of Object.keys(section.content)) {
          if (isMultilinePageField(section.kind, key)) section.content[key] = text;
        }
      }
      expect(validatePageDocument(document, id)).toEqual(document);
      const json = serializePageDocument(document);
      expect(json).toContain(JSON.stringify(text));
      expect(JSON.parse(json)).toEqual(document);
      const parsed = parsePageDocument(json, id);
      expect(parsed).toEqual(document);
      expect(serializePageDocument(parsed)).toBe(json);
      for (const section of parsed.sections) {
        for (const [key, value] of Object.entries(section.content)) {
          if (isMultilinePageField(section.kind, key)) expect(value, `${id}.${section.kind}.${key}`).toBe(text);
        }
      }
    }
  });

  it('preserves existing single-line-control values without a schema migration or newline normalization', () => {
    const document = createDefaultPageDocument('article-draft');
    const original = '既存の投稿者\r\n次の行\n\n<br> は文字列';
    document.sections[0]!.content.author = original;
    expect(isMultilinePageField('article-meta', 'author')).toBe(false);
    expect(validatePageDocument(document).sections[0]!.content.author).toBe(original);
    expect(parsePageDocument(serializePageDocument(document))).toEqual(document);
    expect(document.version).toBe(1);
  });
});

describe('page boundaries and hidden destinations', () => {
  it.each(pageDefinitions)('rejects every mismatched import into $id', ({ id }) => {
    for (const other of pageDefinitions.filter(other => other.id !== id)) {
      const source = createDefaultPageDocument(other.id);
      expect(() => validatePageDocument(source, id)).toThrow('一致');
      expect(() => parsePageDocument(serializePageDocument(source), id)).toThrow('一致');
    }
  });

  it.each(pageDefinitions.filter(page => page.published))('keeps hidden links out of published $id drafts', ({ id }) => {
    const document = createDefaultPageDocument(id);
    for (const hidden of pageDefinitions.filter(page => !page.published)) {
      expect(pageDestinations(id).map(item => item.value)).not.toContain(hidden.path);
      expect(isSafePageLink(id, hidden.path)).toBe(false);
      const hero = document.sections[0]!;
      hero.content.primaryTo = hidden.path;
      expect(() => validatePageDocument(document)).toThrow();
    }
  });

  it('allows known hidden links only in private page drafts and never the article scratch URL', () => {
    for (const { id } of pageDefinitions.filter(page => !page.published)) {
      expect(isSafePageLink(id, '/onigokko')).toBe(true);
      expect(isSafePageLink(id, '/login')).toBe(true);
      expect(isSafePageLink(id, '/articles/[slug]')).toBe(false);
    }
    expect(() => validatePageDocument(withContent('onigokko', 'cta', { primaryTo: '/kakurenbo' }))).not.toThrow();
  });

  it.each([
    'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<script>1</script>', '//example.com',
    'https://example.com', 'https://discord.gg/other', '/support?next=/login', '/support#unknown',
    '/%6cogin', '/editor', '/api/editor/home', '\\example.com', ' /support', '/support ', '',
  ])('rejects non-allowlisted links %s across pages', (link) => {
    for (const { id } of pageDefinitions) expect(isSafePageLink(id, link)).toBe(false);
    expect(() => validatePageDocument(withContent('support', 'page-hero', { primaryTo: link }))).toThrow();
    expect(() => validatePageDocument(withContent('login', 'page-hero', { primaryTo: link }))).toThrow();
  });

  it('does not permit retargeting support destinations or mismatching their labels', () => {
    for (const content of [
      { emailTo: '/support' }, { emailLabel: 'other@pixelsia.net' }, { discordTo: '/' },
    ]) expect(() => validatePageDocument(withContent('support', 'support-contact', content))).toThrow('窓口');
  });

  it('allows the game play anchor only with an existing target section', () => {
    const document = createDefaultPageDocument('onigokko');
    expect(() => validatePageDocument(document)).not.toThrow();
    document.sections = document.sections.filter(section => section.id !== 'how-to-play');
    expect(() => validatePageDocument(document)).toThrow('how-to-play');
    expect(() => validatePageDocument(withContent('support', 'page-hero', { primaryTo: '#how-to-play' }))).toThrow();
  });
});

describe('strict page document validation', () => {
  it.each([null, undefined, [], '', 1, false].map(value => [value]))('rejects a non-document value %j', (value) => {
    expect(() => validatePageDocument(value)).toThrow();
  });

  it.each([0, 2, '1', null])('rejects unsupported version %j', (version) => {
    expect(() => validatePageDocument({ ...createDefaultPageDocument('support'), version })).toThrow();
  });

  it.each(['__proto__', 'constructor', 'unknown', '/support', null])('rejects unsupported page %j', (page) => {
    expect(() => validatePageDocument({ ...createDefaultPageDocument('support'), page })).toThrow();
  });

  it('rejects missing/unknown keys and own pollution keys at every level', () => {
    const document = createDefaultPageDocument('support');
    const source = document.sections[0]!;
    const levels = [
      [document, (value: unknown) => value],
      [source, (value: unknown) => ({ ...document, sections: [value] })],
      [source.content, (value: unknown) => ({ ...document, sections: [{ ...source, content: value }] })],
      [source.style, (value: unknown) => ({ ...document, sections: [{ ...source, style: value }] })],
    ] as const;
    for (const [object, wrap] of levels) {
      for (const key of Object.keys(object)) {
        const missing = Object.fromEntries(Object.entries(object).filter(([name]) => name !== key));
        expect(() => validatePageDocument(wrap(missing))).toThrow();
      }
      for (const key of ['extra', '__proto__', 'constructor', 'prototype']) {
        expect(() => parsePageDocument(JSON.stringify(wrap({ ...object, ...JSON.parse(`{"${key}":"value"}`) }))))
          .toThrow();
      }
      for (const value of [null, [], '', 1]) expect(() => validatePageDocument(wrap(value))).toThrow();
    }
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it.each(['', 'Hero', 'a'.repeat(65), 'a b', 'a_b', '__proto__', 1, null])('rejects invalid section ID %j', (id) => {
    const document = createDefaultPageDocument('support');
    expect(() => validatePageDocument({ ...document, sections: [{ ...document.sections[0], id }] })).toThrow();
  });

  it('rejects duplicate IDs and another page’s valid section kind', () => {
    const document = createDefaultPageDocument('support');
    document.sections[1]!.id = document.sections[0]!.id;
    expect(() => validatePageDocument(document)).toThrow();
    for (const kind of ['login-form', 'article-meta', 'hero'] as const) {
      expect(() => validatePageDocument({ ...document, sections: [createPageSection(kind, 'hero')] })).toThrow();
    }
    for (const kind of ['__proto__', 'constructor', 'unknown', null]) {
      expect(() => validatePageDocument({ ...document, sections: [{ ...document.sections[0], kind }] })).toThrow();
    }
  });

  it('enforces exactly one required section for each page', () => {
    for (const { id } of pageDefinitions) {
      const source = createDefaultPageDocument(id);
      const required = source.sections.find(section => isRequiredPageSection(section.kind))!;
      const removed = source.sections.filter(section => !isRequiredPageSection(section.kind));
      expect(() => validatePageDocument({ ...source, sections: removed })).toThrow();
      expect(() => validatePageDocument({ ...source, sections: [...source.sections, { ...required, id: 'duplicate-required' }] }))
        .toThrow();
    }
  });

  it('enforces the section cap and permits a full bounded article', () => {
    const document = createDefaultPageDocument('article-draft');
    document.sections = [document.sections[0]!, ...Array.from({ length: maxPageSections - 1 }, (_, index) =>
      createPageSection('article-paragraph', `paragraph-${index}`))];
    expect(validatePageDocument(document)).toEqual(document);
    document.sections.push(createPageSection('article-heading', 'over-limit'));
    expect(() => validatePageDocument(document)).toThrow();
    for (const value of [null, {}, [], 'sections']) {
      expect(() => validatePageDocument({ ...document, sections: value })).toThrow();
    }
  });

  it.each([null, false, 1, {}, [], 'x'.repeat(2001), '\u0000', '\u000b', '\u001f'].map(value => [value]))(
    'rejects invalid text case %#', (title) => {
      expect(() => validatePageDocument(withContent('support', 'page-hero', { title }))).toThrow();
    },
  );

  it('supports plain text including punctuation, Unicode, tabs and line breaks', () => {
    expect(() => validatePageDocument(withContent('support', 'page-hero', { title: '文'.repeat(2000) }))).not.toThrow();
    expect(() => validatePageDocument(withContent('support', 'page-hero', { title: 'One\nTwo\r\n\t"Three" <text>' })))
      .not.toThrow();
  });

  it.each(pageImages.filter(image => image.value))('accepts registered hero asset $value', ({ value }) => {
    expect(() => validatePageDocument(withContent('support', 'page-hero', { image: value }))).not.toThrow();
  });

  it.each([
    '', 'data:image/png,x', 'https://example.com/a.png', '/images/private.jpg', '/images/clasteria/../a.png',
  ])('rejects unregistered hero image %s', (image) => {
    expect(() => validatePageDocument(withContent('support', 'page-hero', { image }))).toThrow();
  });

  it('allows no image for split content but rejects unregistered icons', () => {
    expect(() => validatePageDocument(withContent('kakurenbo', 'split-content', { image: '' }))).not.toThrow();
    expect(() => validatePageDocument(withContent('onigokko', 'info-grid', { item1Icon: 'url(https://example.com)' }))).toThrow();
  });

  it.each(['#fff', '#12345678', 'red', 'url(x)', '#123456;display:none', '', 1, null])('rejects unsafe color %j', (value) => {
    const document = createDefaultPageDocument('support');
    for (const key of ['accent', 'background']) {
      expect(() => validatePageDocument({ ...document, sections: [{
        ...document.sections[0], style: { ...document.sections[0]!.style, [key]: value },
      }] })).toThrow();
    }
  });

  it.each(['wide', '', 1, null])('rejects unsupported spacing %j', (spacing) => {
    const document = createDefaultPageDocument('support');
    expect(() => validatePageDocument({ ...document, sections: [{
      ...document.sections[0], style: { ...document.sections[0]!.style, spacing },
    }] })).toThrow();
  });

  it.each(['compact', 'normal', 'roomy'])('accepts safe styles and %s spacing', (spacing) => {
    const document = createDefaultPageDocument('support');
    expect(() => validatePageDocument({ ...document, sections: [{
      ...document.sections[0], style: { accent: '#AaBbCc', background: '#012345', spacing },
    }] })).not.toThrow();
  });

  it('rejects malformed JSON and measures the byte limit as UTF-8', () => {
    for (const json of ['', 'x', '{', '{"version":1,}']) expect(() => parsePageDocument(json)).toThrow('JSON');
    const json = serializePageDocument(createDefaultPageDocument('support'));
    const atLimit = json + ' '.repeat(maxPageDocumentBytes - new TextEncoder().encode(json).byteLength);
    expect(() => parsePageDocument(atLimit)).not.toThrow();
    expect(() => parsePageDocument(`${atLimit} `)).toThrow('100 KB');
    expect(() => parsePageDocument(json + ' '.repeat(maxPageDocumentBytes - json.length))).toThrow('100 KB');
    const document = createDefaultPageDocument('onigokko');
    document.sections = [document.sections[0]!, document.sections[2]!];
    for (let index = 0; index < 9; index++) {
      const section = createPageSection('info-grid', `large-${index}`);
      for (const key of Object.keys(section.content).filter(key => !key.endsWith('Icon'))) section.content[key] = '文'.repeat(2000);
      document.sections.push(section);
    }
    expect(() => serializePageDocument(document)).toThrow('100 KB');
  });
});

describe('separate new-article draft and safe Markdown export', () => {
  it('has fixed draft/Clasteria metadata and no existing article identity', () => {
    const document = createDefaultPageDocument('article-draft');
    expect(document.sections.map(section => section.kind)).toEqual(['article-meta', 'article-heading', 'article-paragraph']);
    expect(document.sections[0]!.content).toMatchObject({ brand: 'clasteria', publicationStatus: 'draft', slug: '', publishedAt: '' });
    expect(() => serializeArticleMarkdown(document)).toThrow('公開予定日');
    expect(() => serializeArticleMarkdown(createDefaultPageDocument('home'))).toThrow('一致');
    for (const content of [{ brand: 'pixelsia' }, { publicationStatus: 'published' }]) {
      expect(() => validatePageDocument(withContent('article-draft', 'article-meta', content))).toThrow();
    }
  });

  it.each(['../../secret', 'news', '20261002-x/../../y', '20261002-<script>', '20261002-A'])('rejects unsafe slug %s', (slug) => {
    expect(() => validatePageDocument(withContent('article-draft', 'article-meta', { slug }))).toThrow();
  });

  it.each(['2026-02-30', '2026-13-01', 'October 2', '2026-10-02T00:00:00Z', '2026-1-1'])('rejects invalid date %s', (publishedAt) => {
    expect(() => validatePageDocument(withContent('article-draft', 'article-meta', { publishedAt }))).toThrow();
  });

  it('exports quoted source-compatible metadata and ordered structured sections', () => {
    const document = article();
    const markdown = serializeArticleMarkdown(document);
    expect(markdown).toContain('slug: "20261002-clasteria-news"');
    expect(markdown).toContain('publishedAt: "2026-10-02"');
    expect(markdown).toContain('author: "Pixelsia"');
    expect(markdown).toContain('publicationStatus: "draft"\nbrand: "clasteria"');
    expect(markdown).toContain('## 見出し\n\nここに記事の本文を入力してください。');
    expect(markdown).not.toContain('publicationStatus: published');
  });

  it('escapes YAML injection, HTML, Markdown links and component syntax as plain text', () => {
    const document = article();
    document.sections[0]!.content.title = 'Title"\n---\npublicationStatus: published\n<script>x</script>';
    document.sections[1]!.content.title = 'Heading\n::component';
    document.sections[2]!.content.body = '<script>alert(1)</script>\n[click](javascript:alert(1))\n![image](https://example.com)\n```html\n::component\n    code';
    const markdown = serializeArticleMarkdown(document);
    expect(markdown).toContain(`title: ${JSON.stringify(document.sections[0]!.content.title)}`);
    expect(markdown.split('\n').filter(line => line === '---')).toHaveLength(2);
    expect(markdown).toContain('&lt;script&gt;alert\\(1\\)&lt;/script&gt;');
    expect(markdown).not.toContain('\n<script>');
    expect(markdown).not.toContain('\n[click]');
    expect(markdown).not.toContain('\n![image]');
    expect(markdown).not.toContain('\n```');
    expect(markdown).not.toContain('\n::component');
    expect(markdown).not.toContain('\n    code');
  });
});
