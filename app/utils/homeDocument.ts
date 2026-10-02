import homePage from './homePage.json' with { type: 'json' };

export const homeDocumentVersion = 1;
export const homeDraftStorageKey = 'clasteria:home-draft:v1';
export const homePreviewStorageKey = 'clasteria:home-preview:v1';
export const maxHomeDocumentBytes = 100_000;
export const maxHomeSections = 12;

export type HomeSectionKind = 'hero' | 'about' | 'news' | 'contact';
export type HomeSectionStyle = { accent: string; background: string; spacing: 'compact' | 'normal' | 'roomy' };
export type HomeSection = {
  id: string;
  kind: HomeSectionKind;
  content: Record<string, string>;
  style: HomeSectionStyle;
};
export type HomeDocument = { version: 1; page: 'home'; sections: HomeSection[] };

export const homeSectionLabels: Record<HomeSectionKind, string> = {
  hero: 'メインビジュアル', about: 'Clasteria の紹介', news: 'ニュース', contact: 'お問い合わせ',
};

// Approved public content only. Prototype game/account sections are intentionally absent.
export const homeSectionTemplates: Record<HomeSectionKind, Omit<HomeSection, 'id'>> = {
  hero: {
    kind: 'hero',
    content: {
      eyebrow: 'CLASTERIA OFFICIAL', title: '遊びから、\nつながる世界へ。', brand: 'Clasteria',
      description: 'Minecraft の世界を舞台に、\n新しい体験をつくる Pixelsia のプロジェクト。',
      image: '/images/clasteria/home-main-visual.png', imageAlt: '',
      primaryLabel: 'お知らせを見る', primaryTo: '/articles', secondaryLabel: 'お問い合わせ', secondaryTo: '/support',
    },
    style: { accent: '#7bf1a8', background: '#030712', spacing: 'normal' },
  },
  about: {
    kind: 'about',
    content: {
      eyebrow: 'ABOUT CLASTERIA', title: 'Minecraft から広がる、遊びの世界。',
      description: 'Clasteria は Pixelsia が制作する Minecraft のプロジェクトです。このサイトでは、お知らせやお問い合わせ窓口をご案内しています。',
      cardTitle: 'Clasteria の情報はこちらから', cardBody: 'お知らせの確認はニュースへ。ご質問やご相談は、メール・Discord の窓口をご利用ください。',
      primaryLabel: 'ニュースを見る', primaryTo: '/articles', secondaryLabel: 'お問い合わせ', secondaryTo: '/support',
    },
    style: { accent: '#016630', background: '#ffffff', spacing: 'normal' },
  },
  news: {
    kind: 'news',
    content: { eyebrow: 'NEWS', title: 'ニュース', description: 'Clasteria からのお知らせをお届けします。', primaryLabel: 'すべて見る' },
    style: { accent: '#016630', background: '#ffffff', spacing: 'normal' },
  },
  contact: {
    kind: 'contact',
    content: {
      eyebrow: 'CONTACT', title: '知りたいこと、困ったこと。', description: 'ゲームへの参加やご質問、不具合のご報告はこちらから。',
      primaryLabel: 'お問い合わせ', primaryTo: '/support',
    },
    style: { accent: '#7bf1a8', background: '#030712', spacing: 'normal' },
  },
};

export const homeFieldLabels: Record<string, string> = {
  eyebrow: '小見出し', title: '見出し', brand: 'ブランド名', description: '説明文', image: '背景画像', imageAlt: '画像の説明',
  cardTitle: 'カードの見出し', cardBody: 'カードの説明文', primaryLabel: 'ボタンの文字', primaryTo: 'ボタンのリンク',
  secondaryLabel: '第 2 ボタンの文字', secondaryTo: '第 2 ボタンのリンク',
};

export const homeImages = [
  { label: 'Home メインビジュアル', value: '/images/clasteria/home-main-visual.png' },
  { label: 'Clasteria の風景', value: '/images/clasteria/clasteria-hero.jpg' },
];

export function createHomeSection(kind: HomeSectionKind, id: string): HomeSection {
  const template = homeSectionTemplates[kind];
  return { id, kind, content: { ...template.content }, style: { ...template.style } };
}

export function createDefaultHomeDocument(): HomeDocument {
  return validateHomeDocument(homePage);
}

function fail(message: string): never {
  throw new Error(message);
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} の形式が正しくありません。`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], label: string) {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) fail(`${label} に未対応の項目があります。`);
}

export function isSafeHomeLink(value: string): boolean {
  // A small public-destination allowlist also prevents restoring unpublished routes.
  return ['/', '/articles', '/support', 'https://codingcraft.pixelsia.net/login', 'https://discord.gg/TwTPa4Yp4h', 'mailto:support@pixelsia.net'].includes(value);
}

export function validateHomeDocument(input: unknown): HomeDocument {
  const value = object(input, '下書き');
  exactKeys(value, ['version', 'page', 'sections'], '下書き');
  if (value.version !== 1 || value.page !== 'home') fail('この下書きのバージョンまたはページには対応していません。');
  if (!Array.isArray(value.sections) || !value.sections.length || value.sections.length > maxHomeSections) fail(`セクション数は 1〜${maxHomeSections} 個にしてください。`);
  const ids = new Set<string>();
  const sections = value.sections.map((input, index): HomeSection => {
    const section = object(input, `セクション ${index + 1}`);
    exactKeys(section, ['id', 'kind', 'content', 'style'], 'セクション');
    if (typeof section.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(section.id) || ids.has(section.id)) fail('セクション ID が無効または重複しています。');
    ids.add(section.id);
    if (typeof section.kind !== 'string' || !Object.hasOwn(homeSectionTemplates, section.kind)) fail('未対応のセクションです。');
    const kind = section.kind as HomeSectionKind;
    const content = object(section.content, '文章');
    exactKeys(content, Object.keys(homeSectionTemplates[kind].content), '文章');
    const cleanContent: Record<string, string> = {};
    for (const [key, field] of Object.entries(content)) {
      if (typeof field !== 'string' || field.length > 2000 || Array.from(field).some(character => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character))) fail(`${homeFieldLabels[key] ?? key} が無効です。`);
      if (key.endsWith('To') && !isSafeHomeLink(field)) fail('リンクは公開済みの移動先を選んでください。');
      if (key === 'image' && !homeImages.some(image => image.value === field)) fail('画像は登録済みの素材を選んでください。');
      cleanContent[key] = field;
    }
    const style = object(section.style, 'スタイル');
    exactKeys(style, ['accent', 'background', 'spacing'], 'スタイル');
    if (typeof style.accent !== 'string' || !/^#[\da-f]{6}$/i.test(style.accent) || typeof style.background !== 'string' || !/^#[\da-f]{6}$/i.test(style.background)) fail('色は 6 桁の HEX 形式にしてください。');
    if (typeof style.spacing !== 'string' || !['compact', 'normal', 'roomy'].includes(style.spacing)) fail('余白の指定が無効です。');
    return { id: section.id, kind, content: cleanContent, style: { accent: style.accent, background: style.background, spacing: style.spacing as HomeSectionStyle['spacing'] } };
  });
  if (sections.filter(section => section.kind === 'hero').length !== 1) fail('メインビジュアルは 1 個必要です。');
  return { version: 1, page: 'home', sections };
}

export function parseHomeDocument(json: string): HomeDocument {
  if (new TextEncoder().encode(json).byteLength > maxHomeDocumentBytes) fail('下書きファイルは 100 KB 以下にしてください。');
  let input: unknown;
  try {
    input = JSON.parse(json);
  }
  catch { return fail('JSON ファイルを読み取れませんでした。'); }
  return validateHomeDocument(input);
}

export function serializeHomeDocument(document: HomeDocument): string {
  const json = JSON.stringify(validateHomeDocument(document), null, 2);
  if (new TextEncoder().encode(json).byteLength > maxHomeDocumentBytes) fail('下書きファイルは 100 KB 以下にしてください。');
  return json;
}
