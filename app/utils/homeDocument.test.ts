import { describe, expect, it } from 'vitest';
import {
  createDefaultHomeDocument,
  createHomeSection,
  homeDocumentVersion,
  homeImages,
  homeSectionTemplates,
  isSafeHomeLink,
  maxHomeDocumentBytes,
  maxHomeSections,
  parseHomeDocument,
  serializeHomeDocument,
  validateHomeDocument,
} from './homeDocument';

function withHero(overrides: Record<string, unknown>) {
  const document = createDefaultHomeDocument();
  return {
    ...document,
    sections: [{ ...createHomeSection('hero', 'hero'), ...overrides }, ...document.sections.slice(1)],
  };
}

function withHeroContent(overrides: Record<string, unknown>) {
  return withHero({ content: { ...homeSectionTemplates.hero.content, ...overrides } });
}

function withHeroStyle(overrides: Record<string, unknown>) {
  return withHero({ style: { ...homeSectionTemplates.hero.style, ...overrides } });
}

describe('home document defaults', () => {
  it('contains only approved public section templates and one hero', () => {
    const document = createDefaultHomeDocument();

    expect(document.version).toBe(homeDocumentVersion);
    expect(document.page).toBe('home');
    expect(Object.keys(homeSectionTemplates)).toEqual(['hero', 'about', 'news', 'contact']);
    expect(document.sections.map(section => section.kind)).toEqual(['hero', 'about', 'news', 'contact']);
    expect(new Set(document.sections.map(section => section.id)).size).toBe(document.sections.length);
    expect(validateHomeDocument(document)).toEqual(document);
    for (const section of document.sections) {
      for (const [key, value] of Object.entries(section.content)) {
        if (key.endsWith('To')) expect(isSafeHomeLink(value)).toBe(true);
      }
    }
  });

  it('keeps the reviewed Home export copy and new-section defaults aligned', () => {
    const document = createDefaultHomeDocument();
    expect(document.sections[0]!.content).toMatchObject({
      title: '遊びから\nつながる世界へ', primaryLabel: 'お知らせ', image: '/images/clasteria/portal-plaza.png',
    });
    expect(document.sections[1]!.content.title).toBe('Minecraft から広がる\n遊びの世界。');
    expect(document.sections[2]!.content.eyebrow).toBe('NEWSROOM');
    expect(document.sections[3]!.content.title).toBe('知りたいこと、\n困ったこと。');
    for (const section of document.sections) {
      expect(createHomeSection(section.kind, section.id)).toEqual(section);
    }
  });

  it('creates independent documents, sections, content, and styles', () => {
    const original = createDefaultHomeDocument();
    const edited = createDefaultHomeDocument();
    const section = createHomeSection('hero', 'extra-hero');
    const template = JSON.stringify(homeSectionTemplates.hero);

    edited.sections[0]!.content.title = 'Edited title';
    edited.sections[0]!.style.accent = '#123456';
    edited.sections.reverse();
    section.content.title = 'Separate section';
    section.style.background = '#abcdef';

    expect(createDefaultHomeDocument()).toEqual(original);
    expect(JSON.stringify(homeSectionTemplates.hero)).toBe(template);
    expect(createHomeSection('hero', 'extra-hero').content.title).toBe(original.sections[0]!.content.title);
    expect(edited.sections).not.toBe(original.sections);
  });

  it('returns a clean independent copy after validation', () => {
    const source = createDefaultHomeDocument();
    const validated = validateHomeDocument(source);

    expect(validated).toEqual(source);
    expect(validated).not.toBe(source);
    expect(validated.sections).not.toBe(source.sections);
    for (const [index, section] of validated.sections.entries()) {
      expect(section).not.toBe(source.sections[index]);
      expect(section.content).not.toBe(source.sections[index]!.content);
      expect(section.style).not.toBe(source.sections[index]!.style);
    }
    validated.sections[0]!.content.title = 'Changed after validation';
    validated.sections[0]!.style.background = '#112233';
    expect(source).toEqual(createDefaultHomeDocument());
  });
});

describe('home document JSON import and export', () => {
  it('roundtrips edited text, styles, section IDs, and section order', () => {
    const document = createDefaultHomeDocument();
    document.sections[0]!.content.title = '変更した見出し\nwith "quotes" & text';
    document.sections[0]!.style = { accent: '#AaBbCc', background: '#123456', spacing: 'roomy' };
    document.sections.push(createHomeSection('about', 'about-second'));
    document.sections.reverse();

    const serialized = serializeHomeDocument(document);
    const imported = parseHomeDocument(serialized);

    expect(imported).toEqual(document);
    expect(imported.sections.map(section => section.id)).toEqual([
      'about-second', 'contact', 'news', 'about', 'hero',
    ]);
    expect(serializeHomeDocument(imported)).toBe(serialized);
  });

  it('validates documents before exporting them', () => {
    const document = createDefaultHomeDocument();
    document.sections[0]!.content.primaryTo = 'javascript:alert(1)';

    expect(() => serializeHomeDocument(document)).toThrow();
  });

  it.each(['', '{', 'not json', '{"version":1,}', '{"sections":[]'])('rejects malformed JSON %j', (json) => {
    expect(() => parseHomeDocument(json)).toThrow('JSON');
  });

  it('accepts the byte limit and rejects one byte above it', () => {
    const document = createDefaultHomeDocument();
    const json = serializeHomeDocument(document);
    const padding = maxHomeDocumentBytes - new TextEncoder().encode(json).byteLength;
    const atLimit = json + ' '.repeat(padding);

    expect(new TextEncoder().encode(atLimit).byteLength).toBe(maxHomeDocumentBytes);
    expect(parseHomeDocument(atLimit)).toEqual(document);
    expect(() => parseHomeDocument(`${atLimit} `)).toThrow('100 KB');
  });

  it('measures UTF-8 bytes rather than JavaScript string length', () => {
    const json = serializeHomeDocument(createDefaultHomeDocument());
    const oversized = json + ' '.repeat(maxHomeDocumentBytes - json.length);

    expect(oversized.length).toBe(maxHomeDocumentBytes);
    expect(new TextEncoder().encode(oversized).byteLength).toBeGreaterThan(maxHomeDocumentBytes);
    expect(() => parseHomeDocument(oversized)).toThrow('100 KB');
  });
});

describe('home document structure validation', () => {
  it.each([null, undefined, false, 1, 'home', []].map(value => [value]))('rejects a non-document value %j', (value) => {
    expect(() => validateHomeDocument(value)).toThrow();
  });

  it.each([0, 2, '1', null])('rejects unsupported version %j', (version) => {
    expect(() => validateHomeDocument({ ...createDefaultHomeDocument(), version })).toThrow();
  });

  it.each(['about', '/home', null])('rejects unsupported page %j', (page) => {
    expect(() => validateHomeDocument({ ...createDefaultHomeDocument(), page })).toThrow();
  });

  it.each(['game', 'account', 'codingcraft', '__proto__', 'constructor', 'toString', '', null])(
    'rejects unsupported section kind %j', (kind) => {
      expect(() => validateHomeDocument(withHero({ kind }))).toThrow();
    },
  );

  it.each([
    ['document', () => ({ ...createDefaultHomeDocument(), extra: true })],
    ['section', () => withHero({ extra: true })],
    ['content', () => withHeroContent({ extra: 'value' })],
    ['style', () => withHeroStyle({ extra: 'value' })],
  ] as const)('rejects unknown %s keys', (_level, createInput) => {
    expect(() => validateHomeDocument(createInput())).toThrow();
  });

  it.each(['id', 'kind', 'content', 'style'])('rejects a section missing %s', (key) => {
    const section = Object.fromEntries(Object.entries(createHomeSection('hero', 'hero'))
      .filter(([field]) => field !== key));

    expect(() => validateHomeDocument({ ...createDefaultHomeDocument(), sections: [section] })).toThrow();
  });

  it.each([null, [], '', 1].map(value => [value]))('rejects invalid content and style objects %j', (value) => {
    expect(() => validateHomeDocument(withHero({ content: value }))).toThrow();
    expect(() => validateHomeDocument(withHero({ style: value }))).toThrow();
  });

  it.each(['', 'Hero', 'with space', 'hero_1', '-hero', 'a'.repeat(65), 1, null])(
    'rejects invalid section ID %j', (id) => {
      expect(() => validateHomeDocument(withHero({ id }))).toThrow();
    },
  );

  it('rejects duplicate IDs even for different section kinds', () => {
    expect(() => validateHomeDocument(withHero({ id: 'about' }))).toThrow();
  });

  it.each([null, {}, [], 'sections'].map(value => [value]))('rejects invalid or empty section lists %j', (sections) => {
    expect(() => validateHomeDocument({ ...createDefaultHomeDocument(), sections })).toThrow();
  });

  it('rejects documents without a hero', () => {
    const document = createDefaultHomeDocument();
    document.sections = document.sections.filter(section => section.kind !== 'hero');

    expect(() => validateHomeDocument(document)).toThrow();
  });

  it('rejects multiple heroes with unique IDs', () => {
    const document = createDefaultHomeDocument();
    document.sections.push(createHomeSection('hero', 'hero-second'));

    expect(() => validateHomeDocument(document)).toThrow();
  });

  it('accepts a single hero and the maximum section count, then rejects one extra', () => {
    const document = { ...createDefaultHomeDocument(), sections: [createHomeSection('hero', 'hero')] };
    expect(validateHomeDocument(document)).toEqual(document);

    document.sections.push(...Array.from({ length: maxHomeSections - 1 }, (_, index) => {
      return createHomeSection('about', `about-${index}`);
    }));
    expect(validateHomeDocument(document)).toEqual(document);

    document.sections.push(createHomeSection('contact', 'contact-extra'));
    expect(() => validateHomeDocument(document)).toThrow();
  });

  it.each(['__proto__', 'constructor', 'prototype'])('rejects own pollution key %s at every level', (key) => {
    const extra = JSON.parse(`{"${key}":{"polluted":true}}`) as Record<string, unknown>;
    const inputs = [
      { ...createDefaultHomeDocument(), ...extra },
      withHero(extra),
      withHeroContent(extra),
      withHeroStyle(extra),
    ];

    for (const input of inputs) {
      expect(() => parseHomeDocument(JSON.stringify(input))).toThrow();
    }
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });
});

describe('home document content validation', () => {
  it.each([null, false, 42, {}, [], 'x'.repeat(2001), 'text\u0000', 'text\u000b', 'text\u001f'].map(value => [value]))(
    'rejects invalid or oversized text case %#', (title) => {
      expect(() => validateHomeDocument(withHeroContent({ title }))).toThrow();
    },
  );

  it('accepts text at the character limit, line breaks, and tabs', () => {
    expect(() => validateHomeDocument(withHeroContent({ title: '文'.repeat(2000) }))).not.toThrow();
    expect(() => validateHomeDocument(withHeroContent({ description: 'line one\nline two\r\n\tend' }))).not.toThrow();
  });

  it.each([
    '/', '/articles', '/support', 'https://codingcraft.pixelsia.net/login',
    'https://discord.gg/TwTPa4Yp4h', 'mailto:support@pixelsia.net',
  ])('accepts approved public link %s', (link) => {
    expect(isSafeHomeLink(link)).toBe(true);
    expect(() => validateHomeDocument(withHeroContent({ primaryTo: link, secondaryTo: link }))).not.toThrow();
  });

  it.each([
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
    '//example.com', '\\example.com', 'https://example.com', 'https://discord.gg/other',
    '/onigokko', '/kakurenbo', '/codingcraft', '/login', '/account', '/editor',
    '/articles?redirect=https://example.com', '/support#unknown', ' /support', '/support ', '',
  ])('rejects unsafe or unpublished link %s', (link) => {
    expect(isSafeHomeLink(link)).toBe(false);
    for (const section of createDefaultHomeDocument().sections) {
      for (const key of Object.keys(section.content).filter(key => key.endsWith('To'))) {
        const content = { ...section.content, [key]: link };
        const document = createDefaultHomeDocument();
        document.sections = document.sections.map(item => item.id === section.id ? { ...item, content } : item);
        expect(() => parseHomeDocument(JSON.stringify(document))).toThrow();
      }
    }
  });

  it.each(homeImages)('accepts registered image $value', ({ value }) => {
    expect(() => validateHomeDocument(withHeroContent({ image: value }))).not.toThrow();
  });

  it.each([
    'javascript:alert(1)', 'data:image/svg+xml,<svg onload="alert(1)"/>',
    '//example.com/image.png', 'https://example.com/image.png', '/images/unregistered.png',
    '/images/clasteria/../private.png', '/images/clasteria/home-main-visual.png?extra=1', '',
  ])('rejects unsafe or unregistered image %s', (image) => {
    expect(() => parseHomeDocument(JSON.stringify(withHeroContent({ image })))).toThrow();
  });
});

describe('home document style validation', () => {
  it.each(['compact', 'normal', 'roomy'])('accepts supported spacing %s', (spacing) => {
    expect(() => validateHomeDocument(withHeroStyle({ accent: '#ABCdef', background: '#012345', spacing })))
      .not.toThrow();
  });

  it.each([
    '#fff', '#12345678', '#gggggg', 'red', 'rgb(0, 0, 0)', 'url(javascript:alert(1))',
    '#123456;display:none', '', null, 123456, {}, [],
  ].map(value => [value]))('rejects invalid accent and background %j', (value) => {
    expect(() => validateHomeDocument(withHeroStyle({ accent: value }))).toThrow();
    expect(() => validateHomeDocument(withHeroStyle({ background: value }))).toThrow();
  });

  it.each(['wide', 'NORMAL', '', null, 1, {}, [], ['normal']].map(value => [value]))('rejects invalid spacing %j', (spacing) => {
    expect(() => parseHomeDocument(JSON.stringify(withHeroStyle({ spacing })))).toThrow();
  });
});
