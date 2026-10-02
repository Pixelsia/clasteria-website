export type SiteNavItem = {
  label: string;
  to: string;
  eyebrow: string;
};

export type FeatureCard = {
  title: string;
  description: string;
  to: string;
  image: string;
  icon: string;
  eyebrow: string;
};

export type InfoCard = {
  title: string;
  body: string;
  icon: string;
};

export type LeaderboardRow = {
  rank: number;
  player: string;
  score: string;
};

export type LeaderboardGroup = {
  title: string;
  description: string;
  rows: LeaderboardRow[];
};

export type TodoItem = {
  title: string;
  body: string;
};

// Initial release: only destinations with usable, public-facing content.
export const primaryNavItems = [
  { label: 'Home', to: '/', eyebrow: 'HOME' },
  { label: 'ニュース', to: '/articles', eyebrow: 'NEWS' },
  { label: 'お問い合わせ', to: '/support', eyebrow: 'SUPPORT' },
] satisfies SiteNavItem[];

export const accountNavItems: SiteNavItem[] = [];
export const siteNavItems = primaryNavItems;

export const supportEmail = 'support@pixelsia.net';
export const supportDiscord = 'https://discord.gg/TwTPa4Yp4h';

export const relatedServices = [
  { label: 'CodingCraft', to: 'https://codingcraft.pixelsia.net/login' },
];

export const featureCards = [
  {
    title: '鬼ごっこ',
    description: '追いかける、逃げきる、仲間を助ける。ルールごとに変わる駆け引きを、Minecraft の世界で。',
    to: '/onigokko',
    image: '/images/clasteria/minigame.jpg',
    icon: 'i-heroicons-bolt',
    eyebrow: 'ONIGOKKO',
  },
  {
    title: 'かくれんぼ',
    description: '見慣れたブロックが、誰かの隠れ場所かもしれない。風景に溶けこむ逃走者と、違和感を探す鬼の勝負。',
    to: '/kakurenbo',
    image: '/images/clasteria/clasteria-hero.jpg',
    icon: 'i-heroicons-cube-transparent',
    eyebrow: 'KAKURENBO',
  },
] satisfies FeatureCard[];

export const codingCraftFlow = [
  {
    title: 'MC ログイン',
    body: 'Minecraft 側でログインしたあと、Web ログインへ進む流れが Notion 由来の仕様にあります。',
    icon: 'i-heroicons-key',
  },
  {
    title: 'Web UI',
    body: 'OTP を使った MC アカウント連携、プロジェクト一覧、blocky によるコーディング画面が整理されています。',
    icon: 'i-heroicons-window',
  },
  {
    title: '学習モード',
    body: 'StudyContent 仕様にある学習コンテンツの入口として、手順を追って制作へ進む枠です。',
    icon: 'i-heroicons-command-line',
  },
  {
    title: 'サンドボックス',
    body: '自由制作に近いモード候補です。Web UI の詳細操作は未決のため紹介枠に留めます。',
    icon: 'i-heroicons-cube',
  },
  {
    title: '対戦モード',
    body: 'モード選択候補として整理されている枠です。ランキングや評価方法は未決です。',
    icon: 'i-heroicons-sparkles',
  },
] satisfies InfoCard[];

export const onigokkoRules = [
  {
    title: '代わり鬼',
    body: '鬼がタッチすると鬼と逃走者が入れ替わり、前の鬼は 3 秒間無敵になります。',
    icon: 'i-heroicons-arrows-right-left',
  },
  {
    title: '増え鬼',
    body: 'タッチされた逃走者が鬼になり、全員が鬼になった時点でゲームを終了します。',
    icon: 'i-heroicons-user-plus',
  },
  {
    title: 'ドロケイ',
    body: 'タッチされた逃走者は牢獄へ捕縛され、逃走者のタッチで解放されます。',
    icon: 'i-heroicons-lock-closed',
  },
  {
    title: '氷鬼',
    body: 'タッチされた逃走者は凍結し、逃走者 1 人のタッチで解凍されます。',
    icon: 'i-heroicons-sparkles',
  },
  {
    title: 'バナナ鬼',
    body: 'タッチされた逃走者はバナナ化し、異なる逃走者 2 人のタッチで解除されます。',
    icon: 'i-heroicons-user-group',
  },
] satisfies InfoCard[];

export const onigokkoFlow = [
  {
    title: '参加',
    body: 'メインワールドで参加 NPC をクリックし、4 人以上で開始カウントダウンに入ります。',
    icon: 'i-heroicons-map-pin',
  },
  {
    title: '投票',
    body: '開始カウントダウン 60 秒の中でゲームルール投票を行い、そのあとマップ投票へ進みます。',
    icon: 'i-heroicons-hand-raised',
  },
  {
    title: '試合',
    body: '鬼抽選後に逃走を開始し、残り 30 秒で捕まっていない逃走者に発光を付与します。',
    icon: 'i-heroicons-play-circle',
  },
] satisfies InfoCard[];

export const kakurenboFlow = [
  {
    title: '待機と投票',
    body: '4 人以上になったら 30 秒の開始待機と 20 秒のマップ投票を同時に進めます。',
    icon: 'i-heroicons-clock',
  },
  {
    title: '擬態',
    body: '逃走者は擬態ブロックを選び、鬼の待機時間中に隠れます。',
    icon: 'i-heroicons-cube',
  },
  {
    title: '探索',
    body: '鬼の解放後、逃走者は擬態、妨害、挑発、ミッションで生存を狙います。',
    icon: 'i-heroicons-magnifying-glass',
  },
  {
    title: 'リザルト',
    body: '結果を確認して、再戦するかメインワールドへ戻ります。',
    icon: 'i-heroicons-flag',
  },
] satisfies InfoCard[];

const createPlaceholderRows = (): LeaderboardRow[] => Array.from({ length: 10 }, (_, index) => ({
  rank: index + 1,
  player: `Player ${String(index + 1).padStart(2, '0')}`,
  score: 'TODO',
}));

export const leaderboardGroups = [
  {
    title: '鬼ごっこ Top10',
    description: 'README にある各ゲーム Top10 の枠です。データソースと更新方法は未決です。',
    rows: createPlaceholderRows(),
  },
  {
    title: 'かくれんぼ Top10',
    description: 'README にある各ゲーム Top10 の枠です。集計期間とスコア定義は未決です。',
    rows: createPlaceholderRows(),
  },
  {
    title: 'CodingCraft Top10',
    description: 'Web 機能一覧のランキングに対応する枠です。対象指標は未決です。',
    rows: createPlaceholderRows(),
  },
] satisfies LeaderboardGroup[];

export const supportTopics = [
  {
    title: 'Pixels Support',
    body: 'README のサポート項目にある Pixels Support へのコンタクト導線です。',
    icon: 'i-heroicons-lifebuoy',
  },
  {
    title: 'お問い合わせフォーム',
    body: 'フォームの送信先と受付項目は未決のため、初期実装では送信しません。',
    icon: 'i-heroicons-envelope',
  },
  {
    title: 'FAQ',
    body: 'ワイヤーフレームにある FAQ の枠を用意し、確定した項目だけを表示します。',
    icon: 'i-heroicons-question-mark-circle',
  },
] satisfies InfoCard[];

export const faqItems = [
  {
    label: 'ゲームへの参加方法を知りたいです',
    content: '現在の受付状況や参加方法については、お問い合わせ窓口へご連絡ください。公開する情報は、このサイトのお知らせでご案内します。',
  },
  {
    label: '不具合を報告するときは、何を伝えればよいですか',
    content: 'ゲーム名、起きたこと、発生した日時、利用した環境をお知らせください。パスワードや認証コードは送らないでください。',
  },
  {
    label: 'このサイトを見るためにアカウントは必要ですか',
    content: 'ゲーム紹介やニュースは、ログインせずにご覧いただけます。',
  },
];

export const unresolvedItems = [
  {
    title: 'TODO: リーダーボード',
    body: 'データソース、集計期間、更新頻度、対象指標が未決です。',
  },
  {
    title: 'TODO: サポートフォーム',
    body: '送信先、受付項目、通知先、個人情報の扱いが未決です。',
  },
  {
    title: 'TODO: ログイン',
    body: 'ID server、Google ログイン、Minecraft OTP 連携の画面分担が未決です。',
  },
  {
    title: 'TODO: 購入・登録',
    body: 'プラン、課金状態、支払い方法、サブスクリプション管理の導線が未決です。',
  },
  {
    title: 'TODO: ニュース',
    body: 'Pixelsia、Clasteria、Connectia のニュースを同一面で扱う範囲が未決です。',
  },
] as const satisfies readonly TodoItem[];
