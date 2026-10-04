import { draftObject, requireDraftKeys, draftText } from './draftValidation';
import homePage from './homePage.json' with { type: 'json' };
import { normalizeDiscordDestination, supportDiscord } from './siteContent';

export const homeDocumentVersion = 1;
export const homeDraftStorageKey = 'clasteria:home-draft:v1';
export const homePreviewStorageKey = 'clasteria:home-preview:v1';
export const maxHomeDocumentBytes = 100_000;
export const maxHomeSections = 12;

export type HomeSectionKind = 'hero' | 'about' | 'news' | 'contact';
export type HomeSectionStyle = { accent: string; button?: string; background: string; spacing: 'compact' | 'normal' | 'roomy' };
export const defaultButtonColor = '#26715b';
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

// 公開を承認された文章だけを初期値にし、試作段階のゲーム・アカウント項目を含めない。
export const homeSectionTemplates: Record<HomeSectionKind, Omit<HomeSection, 'id'>> = {
  hero: {
    kind: 'hero',
    content: {
      eyebrow: 'CLASTERIA OFFICIAL', title: '遊びから\nつながる世界へ', brand: 'Clasteria',
      description: 'Minecraft の世界を舞台に、\n新しい体験をつくる Pixelsia のプロジェクト。',
      image: '/images/clasteria/portal-plaza.png', imageAlt: '',
      primaryLabel: 'お知らせ', primaryTo: '/articles', secondaryLabel: 'お問い合わせ', secondaryTo: '/support',
      serverAddress: 'play.pixelsia.net', serverNote: '仮アドレス · 正式な接続先と公開時期は未定です',
      accessLabel: '参加・アクセスのご案内', accessTo: '/access',
    },
    style: { accent: '#7bf1a8', background: '#030712', spacing: 'normal' },
  },
  about: {
    kind: 'about',
    content: {
      eyebrow: 'ABOUT CLASTERIA', title: 'Minecraft から広がる\n遊びの世界。',
      description: 'Clasteria は Pixelsia が制作する Minecraft のプロジェクトです。このサイトでは、お知らせやお問い合わせ窓口をご案内しています。',
      cardTitle: 'Clasteria の情報はこちらから', cardBody: 'お知らせの確認はニュースへ。ご質問やご相談は、メール・Discord の窓口をご利用ください。',
      primaryLabel: 'ニュースを見る', primaryTo: '/articles', secondaryLabel: 'お問い合わせ', secondaryTo: '/support',
    },
    style: { accent: '#26715b', background: '#ffffff', spacing: 'normal' },
  },
  news: {
    kind: 'news',
    content: { eyebrow: 'NEWSROOM', title: 'ニュース', description: 'Clasteria からのお知らせをお届けします。', primaryLabel: 'すべて見る' },
    style: { accent: '#26715b', background: '#ffffff', spacing: 'normal' },
  },
  contact: {
    kind: 'contact',
    content: {
      eyebrow: 'CONTACT', title: '知りたいこと、\n困ったこと。', description: 'ゲームへの参加やご質問、不具合のご報告はこちらから。',
      primaryLabel: 'お問い合わせ', primaryTo: '/support',
    },
    style: { accent: '#7bf1a8', background: '#030712', spacing: 'normal' },
  },
};

export const homeFieldLabels: Record<string, string> = {
  eyebrow: '小見出し', title: '見出し', brand: 'ブランド名', description: '説明文', image: '背景画像', imageAlt: '画像の説明',
  cardTitle: 'カードの見出し', cardBody: 'カードの説明文', primaryLabel: 'ボタンの文字', primaryTo: 'ボタンのリンク',
  secondaryLabel: '第 2 ボタンの文字', secondaryTo: '第 2 ボタンのリンク',
  serverAddress: '仮サーバーアドレス', serverNote: '接続先についての補足', accessLabel: '参加案内のリンク文字', accessTo: '参加案内のリンク先',
};

export const homeImages = [
  { label: 'Home メインビジュアル', value: '/images/clasteria/home-main-visual.png' },
  { label: 'Clasteria の風景', value: '/images/clasteria/clasteria-hero.jpg' },
  { label: 'ネザーゲートのある広場', value: '/images/clasteria/portal-plaza.png' },
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

export function isSafeHomeLink(value: string): boolean {
  // 許可した移動先だけを復元し、未公開ルートへのリンクも防ぐ。
  return ['/', '/articles', '/support', '/access', 'https://codingcraft.pixelsia.net/login', supportDiscord, 'mailto:support@pixelsia.net'].includes(value);
}

/** ボタン色は省略可能にし、既存 v1 ファイルとサーバー下書きの内容を維持する。 */
export function validateSectionStyle(input: unknown): HomeSectionStyle {
  const style = draftObject(input, 'スタイル');
  requireDraftKeys(style, ['accent', 'background', 'spacing', ...(Object.hasOwn(style, 'button') ? ['button'] : [])], 'スタイル');
  for (const key of ['accent', 'background', ...(Object.hasOwn(style, 'button') ? ['button'] : [])]) {
    if (typeof style[key] !== 'string' || !/^#[\da-f]{6}$/i.test(style[key] as string)) fail('色は 6 桁の HEX 形式にしてください。');
  }
  if (typeof style.spacing !== 'string' || !['compact', 'normal', 'roomy'].includes(style.spacing)) fail('余白の指定が無効です。');
  return { accent: style.accent as string, background: style.background as string, spacing: style.spacing as HomeSectionStyle['spacing'],
    ...(Object.hasOwn(style, 'button') ? { button: style.button as string } : {}) };
}

function restoreHomeHeroFields(content: Record<string, unknown>): Record<string, unknown> {
  // 旧 v1 に不足する案内項目だけを追加し、保存済みの文章と項目順は維持する。
  const restored = { ...content };
  for (const key of ['serverAddress', 'serverNote', 'accessLabel', 'accessTo']) {
    if (!Object.hasOwn(content, key)) restored[key] = homeSectionTemplates.hero.content[key];
  }
  return restored;
}

export function validateHomeDocument(input: unknown): HomeDocument {
  const value = draftObject(input, '下書き');
  requireDraftKeys(value, ['version', 'page', 'sections'], '下書き');
  if (value.version !== 1 || value.page !== 'home') fail('この下書きのバージョンまたはページには対応していません。');
  if (!Array.isArray(value.sections) || !value.sections.length || value.sections.length > maxHomeSections) fail(`セクション数は 1〜${maxHomeSections} 個にしてください。`);
  const ids = new Set<string>();
  const sections = value.sections.map((input, index): HomeSection => {
    const section = draftObject(input, `セクション ${index + 1}`);
    requireDraftKeys(section, ['id', 'kind', 'content', 'style'], 'セクション');
    if (typeof section.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(section.id) || ids.has(section.id)) fail('セクション ID が無効または重複しています。');
    ids.add(section.id);
    if (typeof section.kind !== 'string' || !Object.hasOwn(homeSectionTemplates, section.kind)) fail('未対応のセクションです。');
    const kind = section.kind as HomeSectionKind;
    const sourceContent = draftObject(section.content, '文章');
    const content = kind === 'hero' ? restoreHomeHeroFields(sourceContent) : sourceContent;
    requireDraftKeys(content, Object.keys(homeSectionTemplates[kind].content), '文章');
    const cleanContent: Record<string, string> = {};
    for (const [key, storedField] of Object.entries(content)) {
      const text = draftText(storedField, homeFieldLabels[key] ?? key);
      const field = key.endsWith('To') ? normalizeDiscordDestination(text) : text;
      if (key.endsWith('To') && !isSafeHomeLink(field)) fail('リンクは公開済みの移動先を選んでください。');
      if (key === 'image' && !homeImages.some(image => image.value === field)) fail('画像は登録済みの素材を選んでください。');
      cleanContent[key] = field;
    }
    return { id: section.id, kind, content: cleanContent, style: validateSectionStyle(section.style) };
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
