import {
  createDefaultHomeDocument,
  createHomeSection,
  homeFieldLabels,
  homeImages,
  homeSectionLabels,
  homeSectionTemplates,
  isSafeHomeLink,
  maxHomeDocumentBytes,
  maxHomeSections,
  serializeHomeDocument,
  validateHomeDocument,
} from './homeDocument';
import type { HomeSectionKind, HomeSectionStyle } from './homeDocument';
import {
  codingCraftFlow, faqItems, kakurenboFlow, leaderboardGroups,
  onigokkoFlow, onigokkoRules, supportDiscord, supportEmail, unresolvedItems,
} from './siteContent';
import type { InfoCard } from './siteContent';

export const pageDefinitions = [
  { id: 'home', label: 'Home', path: '/', published: true, description: '現在公開している Home の下書きです。' },
  { id: 'support', label: 'お問い合わせ', path: '/support', published: true, description: 'メール・Discord 窓口と FAQ の下書きです。' },
  { id: 'articles', label: 'ニュース一覧', path: '/articles', published: true, description: '一覧の見出しや空の状態を編集します。記事本文とは別の下書きです。' },
  { id: 'onigokko', label: '鬼ごっこ', path: '/onigokko', published: false, description: '非公開の紹介ページです。保存しても公開されません。' },
  { id: 'kakurenbo', label: 'かくれんぼ', path: '/kakurenbo', published: false, description: '非公開の紹介ページです。保存しても公開されません。' },
  { id: 'login', label: 'ログイン', path: '/login', published: false, description: '非公開の画面案です。入力・ログイン機能は動作しません。' },
  { id: 'register', label: '購入・登録', path: '/register', published: false, description: '非公開の画面案です。登録・決済機能は動作しません。' },
  { id: 'leaderboard', label: 'リーダーボード', path: '/leaderboard', published: false, description: '非公開の表示案です。ランキングの実データはありません。' },
  { id: 'codingcraft', label: 'CodingCraft 紹介', path: '/codingcraft', published: false, description: '非公開の紹介文です。CodingCraft の機能は外部サービスで提供されます。' },
  { id: 'article-draft', label: '新しい記事の下書き', path: '/articles/[slug]', published: false, description: 'Clasteria の新しい記事を 1 件だけ準備する下書きです。既存記事の管理・公開は行いません。' },
] as const;

export type PageId = typeof pageDefinitions[number]['id'];
export type PageSectionKind = HomeSectionKind | 'page-hero' | 'support-contact' | 'support-guide' | 'faq' | 'article-list'
  | 'info-grid' | 'split-content' | 'cta' | 'availability' | 'login-form' | 'register-form' | 'ranking' | 'notice'
  | 'article-meta' | 'article-heading' | 'article-paragraph';
export type PageSection = {
  id: string;
  kind: PageSectionKind;
  content: Record<string, string>;
  style: HomeSectionStyle;
};
export type PageDocument = { version: 1; page: PageId; sections: PageSection[] };
export const maxPageDocumentBytes = maxHomeDocumentBytes;
export const maxPageSections = maxHomeSections;

export function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && pageDefinitions.some(page => page.id === value);
}

const lightStyle: HomeSectionStyle = { accent: '#016630', background: '#ffffff', spacing: 'normal' };
const darkStyle: HomeSectionStyle = { accent: '#7bf1a8', background: '#030712', spacing: 'normal' };

function template(kind: PageSectionKind, content: Record<string, string>, style = lightStyle): Omit<PageSection, 'id'> {
  return { kind, content, style: { ...style } };
}

function gridContent(
  eyebrow: string, title: string, description: string, items: readonly InfoCard[],
): Record<string, string> {
  return {
    eyebrow, title, description,
    ...Object.fromEntries(Array.from({ length: 5 }, (_, index) => {
      const item = items[index];
      return [[`item${index + 1}Title`, item?.title ?? ''], [`item${index + 1}Body`, item?.body ?? ''], [`item${index + 1}Icon`, item?.icon ?? 'i-heroicons-information-circle']];
    }).flat()),
  };
}

const supportContactContent = {
  emailTitle: 'メールでお問い合わせ',
  emailDescription: 'ご相談内容をまとめて送りたいときはこちらへ。ご利用のメールアプリから送信できます。',
  emailLabel: supportEmail, emailTo: `mailto:${supportEmail}`, emailButtonLabel: 'メールを作成',
  copyLabel: 'アドレスをコピー', copiedLabel: 'コピーしました',
  emailNote: '送信前に宛先と内容をご確認ください。',
  discordTitle: 'Discord でお問い合わせ',
  discordDescription: 'Pixelsia の Discord でもご連絡いただけます。参加後は、サーバー内の案内をご確認ください。',
  discordLabel: 'Pixelsia Discord を開く', discordTo: supportDiscord,
  discordNote: '別のタブで招待ページを開きます。参加には Discord アカウントが必要です。',
};

export const pageSectionTemplates: Record<PageSectionKind, Omit<PageSection, 'id'>> = {
  ...homeSectionTemplates,
  'page-hero': template('page-hero', {
    eyebrow: 'CLASTERIA', title: 'Clasteria', description: 'Clasteria のご案内。',
    image: '/images/clasteria/portal-plaza.png', imageAlt: 'ネザーゲートのある広場',
    primaryLabel: '', primaryTo: '/support', secondaryLabel: '', secondaryTo: '/',
  }, darkStyle),
  'support-contact': template('support-contact', supportContactContent),
  'support-guide': template('support-guide', {
    eyebrow: 'BEFORE YOU CONTACT', title: 'お問い合わせの前に', description: '内容を確認しやすくするために、次のことを添えてお知らせください。',
    item1: 'ゲーム名やページ名', item2: '起きたこと・確認したいこと', item3: '発生日時や利用した環境',
    note: 'パスワード、認証コード、お支払い情報は送らないでください。',
  }),
  'faq': template('faq', {
    eyebrow: 'FAQ', title: 'よくある質問',
    ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => [[`question${index + 1}`, faqItems[index]?.label ?? ''], [`answer${index + 1}`, faqItems[index]?.content ?? '']]).flat()),
  }),
  'article-list': template('article-list', { emptyTitle: '現在、公開中のお知らせはありません', emptyDescription: '新しいお知らせは、このページでご案内します。' }),
  'info-grid': template('info-grid', gridContent('INFORMATION', 'ご案内', '', [])),
  'split-content': template('split-content', {
    eyebrow: 'INFORMATION', title: 'Clasteria のご案内', description: '', image: '', imageAlt: '',
    item1Title: '', item1Body: '', item2Title: '', item2Body: '',
  }),
  'cta': template('cta', {
    eyebrow: 'NEXT', title: 'もっと知りたい方へ', description: 'ご質問やご相談は、お問い合わせ窓口へ。',
    primaryLabel: 'お問い合わせ', primaryTo: '/support', secondaryLabel: 'Home へ', secondaryTo: '/',
  }, darkStyle),
  'availability': template('availability', {
    title: '開発中のゲームをご紹介しています', description: 'ルールや画面は変更される場合があります。参加・開催についてはお問い合わせください。',
    primaryLabel: '参加について問い合わせる', primaryTo: '/support',
  }, { ...lightStyle, background: '#f0fdf4' }),
  'login-form': template('login-form', {
    eyebrow: 'LOGIN FORM', title: 'ログインフォーム',
    description: 'ワイヤーフレームにあるメールアドレス、パスワード、開始ボタンの枠です。ID server 連携が未決のため入力は無効化しています。',
    emailLabel: 'メールアドレス', passwordLabel: 'パスワード', primaryLabel: 'Coming soon',
  }),
  'register-form': template('register-form', {
    eyebrow: 'REGISTER FLOW', title: '選択して決済へ進む枠',
    description: 'ワイヤーフレームにある「選択して決済、現状は検討中、できるだけ手順を少なめに」の枠です。プラン、課金状態、支払い方法は未決のため、初期公開では Coming soon として表示します。',
    item1Title: 'プラン選択', item1Body: '内容未決', item2Title: 'アカウント確認', item2Body: 'ID server 未接続',
    item3Title: '決済', item3Body: '支払い方法未決', primaryLabel: 'Coming soon',
  }),
  'ranking': template('ranking', {
    eyebrow: 'TOP 10', title: 'ランキング Top10', description: '実データ未接続の表示枠です。',
    rankLabel: 'Rank', playerLabel: 'Player', scoreLabel: 'Score', placeholder: '未接続',
  }),
  'notice': template('notice', { title: '未決事項', itemTitle: 'TODO', itemBody: '内容は確認中です。' }),
  'article-meta': template('article-meta', {
    title: '新しい Clasteria のお知らせ', description: '記事の要約を入力してください。', slug: '', author: 'Pixelsia',
    publishedAt: '', brand: 'clasteria', publicationStatus: 'draft',
  }),
  'article-heading': template('article-heading', { title: '見出し' }),
  'article-paragraph': template('article-paragraph', { body: 'ここに記事の本文を入力してください。' }),
};

export const pageSectionLabels: Record<PageSectionKind, string> = {
  ...homeSectionLabels,
  'page-hero': 'ページのメインビジュアル', 'support-contact': 'メール・Discord 窓口', 'support-guide': 'お問い合わせの前に',
  'faq': 'よくある質問', 'article-list': 'ニュース一覧', 'info-grid': '紹介カード', 'split-content': '画像と紹介文',
  'cta': '次のページへの案内', 'availability': '開発中のご案内', 'login-form': 'ログイン画面案（入力不可）',
  'register-form': '購入・登録画面案（決済不可）', 'ranking': 'ランキング表示枠（未接続）', 'notice': '未決事項',
  'article-meta': '新しい記事の情報', 'article-heading': '記事の見出し', 'article-paragraph': '記事の本文',
};

export const pageFieldLabels: Record<string, string> = {
  ...homeFieldLabels,
  body: '本文', note: '補足', emptyTitle: '記事がないときの見出し', emptyDescription: '記事がないときの説明',
  emailTitle: 'メール窓口の見出し', emailDescription: 'メール窓口の説明', emailLabel: 'メールアドレスの表示', emailTo: 'メールの宛先',
  emailButtonLabel: 'メール作成ボタン', copyLabel: 'コピーボタン', copiedLabel: 'コピー後の表示', emailNote: 'メール窓口の補足',
  discordTitle: 'Discord 窓口の見出し', discordDescription: 'Discord 窓口の説明', discordLabel: 'Discord ボタン', discordTo: 'Discord のリンク', discordNote: 'Discord 窓口の補足',
  passwordLabel: 'パスワード欄の表示', rankLabel: '順位の見出し', playerLabel: 'プレイヤーの見出し', scoreLabel: 'スコアの見出し',
  placeholder: '未接続時の表示', itemTitle: '項目の見出し', itemBody: '項目の説明', slug: '記事の識別子（YYYYMMDD-名前）',
  author: '投稿者', publishedAt: '公開日案（YYYY-MM-DD・予約ではありません）', publicationStatus: '公開状態（draft 固定）',
  ...Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
    const number = index + 1;
    return [[`item${number}`, `項目 ${number}`], [`item${number}Title`, `カード ${number} の見出し`], [`item${number}Body`, `カード ${number} の説明`], [`item${number}Icon`, `カード ${number} のアイコン`], [`question${number}`, `質問 ${number}`], [`answer${number}`, `回答 ${number}`]];
  }).flat()),
};

export const pageImages = [
  ...homeImages,
  { label: 'ミニゲーム', value: '/images/clasteria/minigame.jpg' },
  { label: 'CodingCraft', value: '/images/clasteria/codingcraft.jpg' },
  { label: '画像なし（紹介文のみ）', value: '' },
];

export const pageIcons = [
  'i-heroicons-information-circle', 'i-heroicons-key', 'i-heroicons-window', 'i-heroicons-command-line',
  'i-heroicons-cube', 'i-heroicons-sparkles', 'i-heroicons-arrows-right-left', 'i-heroicons-user-plus',
  'i-heroicons-lock-closed', 'i-heroicons-user-group', 'i-heroicons-map-pin', 'i-heroicons-hand-raised',
  'i-heroicons-play-circle', 'i-heroicons-clock', 'i-heroicons-magnifying-glass', 'i-heroicons-flag',
] as const;

const allowedKinds: Record<PageId, readonly PageSectionKind[]> = {
  'home': ['hero', 'about', 'news', 'contact'],
  'support': ['page-hero', 'support-contact', 'support-guide', 'faq', 'cta'],
  'articles': ['page-hero', 'article-list', 'cta'],
  'onigokko': ['page-hero', 'availability', 'info-grid', 'split-content', 'cta', 'notice'],
  'kakurenbo': ['page-hero', 'availability', 'info-grid', 'split-content', 'cta', 'notice'],
  'login': ['page-hero', 'login-form', 'notice', 'cta'],
  'register': ['page-hero', 'register-form', 'notice', 'cta'],
  'leaderboard': ['page-hero', 'ranking', 'notice', 'cta'],
  'codingcraft': ['page-hero', 'info-grid', 'split-content', 'cta', 'notice'],
  'article-draft': ['article-meta', 'article-heading', 'article-paragraph'],
};

export function allowedPageSectionKinds(page: PageId): readonly PageSectionKind[] {
  return [...allowedKinds[page]];
}

export function isRequiredPageSection(kind: PageSectionKind): boolean {
  return ['hero', 'page-hero', 'article-meta'].includes(kind);
}

export function pageDestinations(page: PageId): { label: string; value: string }[] {
  const published = pageDefinitions.find(definition => definition.id === page)!.published;
  const destinations = pageDefinitions.filter(definition => definition.id !== 'article-draft' && (!published || definition.published))
    .map(definition => ({ label: `${definition.label}${definition.published ? '' : '（非公開）'}`, value: definition.path as string }));
  destinations.push(
    { label: 'CodingCraft（外部サービス）', value: 'https://codingcraft.pixelsia.net/login' },
    { label: 'Pixelsia Discord', value: supportDiscord },
    { label: 'メールでお問い合わせ', value: `mailto:${supportEmail}` },
  );
  if (page === 'onigokko' || page === 'kakurenbo') destinations.push({ label: 'このページの遊び方', value: '#how-to-play' });
  return destinations;
}

export function createPageSection(kind: PageSectionKind, id: string): PageSection {
  if (Object.hasOwn(homeSectionTemplates, kind)) return createHomeSection(kind as HomeSectionKind, id);
  const source = pageSectionTemplates[kind];
  return { id, kind, content: { ...source.content }, style: { ...source.style } };
}

function section(
  kind: PageSectionKind, id: string, content: Record<string, string> = {}, style: Partial<HomeSectionStyle> = {},
): PageSection {
  const result = createPageSection(kind, id);
  return { ...result, content: { ...result.content, ...content }, style: { ...result.style, ...style } };
}

function notice(index: number, title: string): PageSection {
  const item = unresolvedItems[index]!;
  return section('notice', 'notice', { title, itemTitle: item.title, itemBody: item.body });
}

export function createDefaultPageDocument(page: PageId): PageDocument {
  if (page === 'home') return createDefaultHomeDocument();
  const sections: Record<Exclude<PageId, 'home'>, PageSection[]> = {
    'support': [
      section('page-hero', 'hero', { eyebrow: 'SUPPORT', title: 'お手伝いできることは、ありますか。', description: 'ゲームへの参加、ご質問、不具合のご報告。Clasteria に関するお問い合わせはこちらから。' }),
      section('support-contact', 'contact'), section('support-guide', 'before-contact'), section('faq', 'faq'),
    ],
    'articles': [
      section('page-hero', 'hero', { eyebrow: 'NEWS', title: 'ニュース', description: 'Clasteria のお知らせをお届けします。' }),
      section('article-list', 'article-list'),
    ],
    'onigokko': [
      section('page-hero', 'hero', { eyebrow: 'ONIGOKKO', title: '投票でルールを決めて、鬼から逃げ切る', description: '鬼ごっこは、Clasteria のメインワールドから参加し、ゲームルール投票とマップ投票で遊び方を決めたあと、鬼役のプレイヤーから制限時間まで逃げ切るミニゲームです。', primaryLabel: '遊び方を見る', primaryTo: '#how-to-play', secondaryLabel: 'サポート', secondaryTo: '/support' }),
      section('availability', 'availability'),
      section('info-grid', 'how-to-play', gridContent('HOW TO PLAY', '予定している遊び方', 'まずはゲームの流れをチェック。ルールとマップを選んだら、追いかけっこの始まりです。', onigokkoFlow)),
      section('info-grid', 'rules', gridContent('RULES', '5種類のゲームルール', '代わり鬼、増え鬼、ドロケイ、氷鬼、バナナ鬼は、タッチされた逃走者の扱いと救出手段、終了条件が異なります。', onigokkoRules), { background: '#fafafa' }),
      section('cta', 'next', { eyebrow: 'NEXT', title: 'かくれんぼも見る', description: '同じ Clasteria のミニゲームとして、かくれんぼの参加からリザルトまでの流れも確認できます。', primaryLabel: 'かくれんぼへ', primaryTo: '/kakurenbo' }),
    ],
    'kakurenbo': [
      section('page-hero', 'hero', { eyebrow: 'KAKURENBO', title: 'ブロックに擬態し、鬼の探索から隠れる', description: 'かくれんぼは、メインワールドから参加し、待機部屋で人数確認とマップ投票を行ったあと、逃走者がブロックに擬態して隠れ、鬼が制限時間内に捕獲を狙うミニゲームです。', primaryLabel: '遊び方を見る', primaryTo: '#how-to-play', secondaryLabel: '鬼ごっこへ', secondaryTo: '/onigokko' }),
      section('availability', 'availability'),
      section('info-grid', 'how-to-play', gridContent('FLOW', '予定している遊び方', '風景の一部になるか、小さな違和感を見つけるか。立場が変わると、同じ景色の見え方も変わります。', kakurenboFlow)),
      section('split-content', 'player-actions', { eyebrow: 'PLAYER ACTIONS', title: '隠れる側も、探す側も。', description: '逃走者はブロックに擬態し、見つからない場所を探します。鬼はマップを観察して、風景に隠れた逃走者を探し出します。', item1Title: '逃走者', item1Body: '擬態ブロックを選び、鬼待機時間中に隠れます。', item2Title: '鬼', item2Body: '鬼解放後に探索し、制限時間内に捕獲を狙います。' }, { background: '#fafafa' }),
      section('cta', 'next', { title: '次は、鬼ごっこの世界へ。', description: 'ルールによって変わる追いかけっこ。仲間を助ける駆け引きも、鬼ごっこの楽しさです。', primaryLabel: '鬼ごっこを見る', primaryTo: '/onigokko', secondaryLabel: 'サポートへ', secondaryTo: '/support' }),
    ],
    'login': [
      section('page-hero', 'hero', { eyebrow: 'LOGIN', title: 'ログイン機能は Coming soon', description: 'README では、ログインは今後実装で、初期公開では飛べるけど Coming soon とする指定があります。ID server、Google ログイン、Minecraft OTP 連携の画面分担は未決です。', primaryLabel: 'Home へ戻る', primaryTo: '/', secondaryLabel: 'サポート', secondaryTo: '/support' }),
      section('login-form', 'login-form'), notice(2, 'ログイン関連の未決事項'),
    ],
    'register': [
      section('page-hero', 'hero', { eyebrow: 'REGISTER', title: '購入・登録は Coming soon', description: 'README では、購入・登録は今後実装で、初期公開では飛べるけど Coming soon とする指定があります。プラン、課金状態、支払い方法、サブスクリプション管理の導線は未決です。', primaryLabel: 'Home へ戻る', primaryTo: '/', secondaryLabel: 'リーダーボード', secondaryTo: '/leaderboard' }),
      section('register-form', 'register-form'), notice(3, '購入・登録関連の未決事項'),
    ],
    'leaderboard': [
      section('page-hero', 'hero', { eyebrow: 'LEADERBOARD', title: '各ゲームの Top10 枠', description: 'HP 仕様書では、リーダーボードは各ゲームのランキング Top10 を紹介するページです。データソース、集計期間、更新頻度は未決のため、初期実装では TODO として枠だけを表示します。', primaryLabel: '鬼ごっこへ', primaryTo: '/onigokko', secondaryLabel: 'かくれんぼへ', secondaryTo: '/kakurenbo' }),
      ...leaderboardGroups.map((group, index) => section('ranking', `ranking-${index + 1}`, { title: group.title, description: group.description })),
      notice(0, 'リーダーボードの未決事項'),
    ],
    'codingcraft': [
      section('page-hero', 'hero', { eyebrow: 'CODINGCRAFT', title: 'Minecraft とビジュアルプログラミングで学ぶ', description: 'CodingCraft は、ブロックを用いたビジュアルプログラミングと Minecraft でプログラミングを学習するコンテンツです。コース学習、サンドボックス、サバイバル、対戦モードの候補が仕様に整理されています。', primaryLabel: 'CodingCraft を開く', primaryTo: 'https://codingcraft.pixelsia.net/login', secondaryLabel: 'サポート', secondaryTo: '/support' }),
      section('info-grid', 'flow', gridContent('FLOW', 'CodingCraft の入口', 'Notion 由来の仕様では、MC ログイン、Web ログイン、CodingCraft Lobby のモード選択へ進む流れが整理されています。', codingCraftFlow)),
      section('split-content', 'web-ui', { eyebrow: 'WEB UI', title: 'プロジェクトを選び、blocky で組み立てる', description: 'Web UI 仕様では、OTP を利用した MC アカウントログイン、プロジェクト一覧、blocky を使ったコーディング画面、学習モード時の課題表示が整理されています。実操作の画面詳細は未決です。', image: '/images/clasteria/home-main-visual.png', imageAlt: 'Clasteria のワールド', item1Title: '使い方', item1Body: '概要ページとして操作の流れだけを案内します。', item2Title: 'マップコンテンツ', item2Body: '詳細なステージ構成は未決のため発明しません。' }, { background: '#fafafa' }),
      section('cta', 'service', { eyebrow: 'CODINGCRAFT', title: 'CodingCraft の外部サービスへ', description: 'CodingCraft のログインやプログラミング機能は外部サービスをご利用ください。この紹介ページには実装されていません。', primaryLabel: 'CodingCraft を開く', primaryTo: 'https://codingcraft.pixelsia.net/login', secondaryLabel: 'サポートへ', secondaryTo: '/support' }),
    ],
    'article-draft': [section('article-meta', 'article-meta'), section('article-heading', 'heading'), section('article-paragraph', 'body')],
  };
  return validatePageDocument({ version: 1, page, sections: sections[page] }, page);
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

/** Validates drafts only; it does not change public route or publication policy. */
export function validatePageDocument(input: unknown, expectedPage?: PageId): PageDocument {
  const value = object(input, '下書き');
  exactKeys(value, ['version', 'page', 'sections'], '下書き');
  if (value.version !== 1 || !isPageId(value.page)) fail('この下書きのバージョンまたはページには対応していません。');
  const page = value.page;
  if (expectedPage !== undefined && page !== expectedPage) fail('選択中のページと下書きのページが一致しません。');
  // Keep legacy Home schema, field limits, links, images and hero rules unchanged.
  if (page === 'home') return validateHomeDocument(input);
  if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > maxPageSections) fail(`セクション数は 1〜${maxPageSections} 個にしてください。`);
  const ids = new Set<string>();
  const destinations = new Set(pageDestinations(page).map(destination => destination.value));
  const sections = value.sections.map((input, index): PageSection => {
    const value = object(input, `セクション ${index + 1}`);
    exactKeys(value, ['id', 'kind', 'content', 'style'], 'セクション');
    if (typeof value.id !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(value.id) || ids.has(value.id)) fail('セクション ID が無効または重複しています。');
    ids.add(value.id);
    if (typeof value.kind !== 'string' || !allowedKinds[page].includes(value.kind as PageSectionKind)) fail('このページでは使用できないセクションです。');
    const kind = value.kind as PageSectionKind;
    const content = object(value.content, '文章');
    exactKeys(content, Object.keys(pageSectionTemplates[kind].content), '文章');
    const cleanContent: Record<string, string> = {};
    for (const [key, field] of Object.entries(content)) {
      if (typeof field !== 'string' || field.length > 2000 || Array.from(field).some(character => character.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(character))) fail(`${pageFieldLabels[key] ?? key} が無効です。`);
      if (key.endsWith('To') && !destinations.has(field)) fail('リンクはこのページで使用できる移動先を選んでください。');
      if (key === 'image' && (!pageImages.some(image => image.value === field) || (kind === 'page-hero' && field === ''))) fail('画像は登録済みの素材を選んでください。');
      if (key.endsWith('Icon') && !pageIcons.some(icon => icon === field)) fail('アイコンは登録済みのものを選んでください。');
      // Contact destinations and their displayed address must stay in agreement.
      if (kind === 'support-contact' && ((key === 'emailLabel' && field !== supportEmail) || (key === 'emailTo' && field !== `mailto:${supportEmail}`) || (key === 'discordTo' && field !== supportDiscord))) fail('お問い合わせ先は承認済みの窓口を使用してください。');
      if (kind === 'article-meta') {
        if (key === 'brand' && field !== 'clasteria') fail('記事のブランドは clasteria にしてください。');
        if (key === 'publicationStatus' && field !== 'draft') fail('この記事は draft（下書き）で保存してください。');
        if (key === 'slug' && field !== '' && (field.length > 120 || !/^\d{8}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(field))) fail('記事の識別子は YYYYMMDD-名前 の形式にしてください。');
        if (key === 'publishedAt' && field !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(field) || !Number.isFinite(Date.parse(`${field}T00:00:00Z`)) || new Date(`${field}T00:00:00Z`).toISOString().slice(0, 10) !== field)) fail('公開予定日は有効な YYYY-MM-DD 形式にしてください。');
      }
      cleanContent[key] = field;
    }
    const style = object(value.style, 'スタイル');
    exactKeys(style, ['accent', 'background', 'spacing'], 'スタイル');
    if (typeof style.accent !== 'string' || !/^#[\da-f]{6}$/i.test(style.accent) || typeof style.background !== 'string' || !/^#[\da-f]{6}$/i.test(style.background)) fail('色は 6 桁の HEX 形式にしてください。');
    if (typeof style.spacing !== 'string' || !['compact', 'normal', 'roomy'].includes(style.spacing)) fail('余白の指定が無効です。');
    return { id: value.id, kind, content: cleanContent, style: { accent: style.accent, background: style.background, spacing: style.spacing as HomeSectionStyle['spacing'] } };
  });
  const requiredKind = page === 'article-draft' ? 'article-meta' : 'page-hero';
  if (sections.filter(section => section.kind === requiredKind).length !== 1) fail(`${pageSectionLabels[requiredKind]}は 1 個必要です。`);
  if (sections.some(section => Object.values(section.content).includes('#how-to-play')) && !sections.some(section => section.id === 'how-to-play')) fail('「遊び方」へのリンクには how-to-play セクションが必要です。');
  return { version: 1, page, sections };
}

export function parsePageDocument(json: string, expectedPage?: PageId): PageDocument {
  if (new TextEncoder().encode(json).byteLength > maxPageDocumentBytes) fail('下書きファイルは 100 KB 以下にしてください。');
  let input: unknown;
  try {
    input = JSON.parse(json);
  }
  catch { return fail('JSON ファイルを読み取れませんでした。'); }
  return validatePageDocument(input, expectedPage);
}

export function serializePageDocument(document: PageDocument): string {
  const clean = validatePageDocument(document);
  if (clean.page === 'home') return serializeHomeDocument(validateHomeDocument(clean));
  const json = JSON.stringify(clean, null, 2);
  if (new TextEncoder().encode(json).byteLength > maxPageDocumentBytes) fail('下書きファイルは 100 KB 以下にしてください。');
  return json;
}

export function isSafePageLink(page: PageId, value: string): boolean {
  return page === 'home' ? isSafeHomeLink(value) : pageDestinations(page).some(destination => destination.value === value);
}

/** Exports a new draft source file; publication still requires a separate reviewed workflow. */
export function serializeArticleMarkdown(document: PageDocument): string {
  const clean = validatePageDocument(document, 'article-draft');
  const metadata = clean.sections.find(section => section.kind === 'article-meta')!.content;
  if (!metadata.title?.trim() || !metadata.author?.trim() || !metadata.slug || !metadata.publishedAt) fail('Markdown の書き出しには、記事名・投稿者・識別子・公開予定日を入力してください。');
  const yaml = [
    '---',
    ...['title', 'description', 'slug', 'author', 'publishedAt'].map(key => `${key}: ${JSON.stringify(metadata[key])}`),
    'publicationStatus: "draft"', 'brand: "clasteria"', 'tags: []', '---',
  ];
  const text = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_{}[\]()#+.!|~:-]/g, '\\$&').split(/\r\n|\r|\n/).map(line => line.trimStart()).join('\n');
  const body = clean.sections.filter(section => section.kind !== 'article-meta').map((section) => {
    const value = section.kind === 'article-heading'
      ? `## ${text(section.content.title!).replace(/\n/g, ' ')}`
      : text(section.content.body!);
    return value;
  }).join('\n\n');
  return `${yaml.join('\n')}\n\n${body}\n`;
}
