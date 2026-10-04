import type { PageId } from '../../app/utils/pageDocument';

type Statement = {
  bind: (...values: (string | number)[]) => Statement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
export type DraftDatabase = { prepare: (sql: string) => Statement };
export type DraftRow = { document: string; revision: number; updated_at: string };
type DraftKey = { scope: string; owner: string; page: PageId };

// 固定の追加スキーマを migration 0002 と照合する。リクエスト値を SQL 定義へ埋め込まない。
export const multiPageDraftsSchemaSql = `CREATE TABLE IF NOT EXISTS editor_page_drafts (
  scope TEXT NOT NULL,
  owner TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page IN (
    'support', 'articles', 'onigokko', 'kakurenbo',
    'login', 'register', 'leaderboard', 'codingcraft', 'article-draft'
  )),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) <= 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, owner, page)
);`;

// 接続案内には専用テーブルを追加し、既存テーブルの制約と下書きを維持する。
export const connectionDraftsSchemaSql = `CREATE TABLE IF NOT EXISTS editor_connection_drafts (
  scope TEXT NOT NULL,
  owner TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page = 'access'),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) <= 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, owner, page)
);`;

function draftTable(page: PageId) {
  // 識別子はサーバー側の固定値から選び、従来の Home 保存先も維持する。
  return page === 'home' ? 'editor_drafts' : page === 'access' ? 'editor_connection_drafts' : 'editor_page_drafts';
}

export async function readDraftRow(db: DraftDatabase, { scope, owner, page }: DraftKey): Promise<DraftRow | null> {
  const table = draftTable(page);
  if (page !== 'home') {
    // 読み込みではテーブルを作らない。未作成なら下書きなしとして扱う。
    const exists = await db.prepare('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = ?')
      .bind(table).first<{ name: string }>();
    if (!exists) return null;
  }
  return db.prepare(`SELECT document, revision, updated_at FROM ${table} WHERE scope = ? AND owner = ? AND page = ?`)
    .bind(scope, owner, page).first<DraftRow>();
}

// 認証・送信元・文書の検証を完了した呼び出し元だけが保存を実行する。
export async function writeDraftRow(
  db: DraftDatabase, { scope, owner, page }: DraftKey, document: string, baseRevision: number,
): Promise<DraftRow | null> {
  const table = draftTable(page);
  // 初回保存の競合でも安全な追加だけを行い、Home のスキーマは変更しない。
  if (page !== 'home') await db.prepare(page === 'access' ? connectionDraftsSchemaSql : multiPageDraftsSchemaSql).run();
  const timestamp = new Date().toISOString();
  // リビジョン照合と更新を単一文で行う。事前読み込み方式では同時編集を失う。
  return baseRevision === 0
    ? await db.prepare(`INSERT INTO ${table} (scope, owner, page, document, revision, updated_at)
          VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT (scope, owner, page) DO NOTHING
          RETURNING document, revision, updated_at`).bind(scope, owner, page, document, timestamp).first<DraftRow>()
    : await db.prepare(`UPDATE ${table} SET document = ?, revision = revision + 1, updated_at = ?
          WHERE scope = ? AND owner = ? AND page = ? AND revision = ?
          RETURNING document, revision, updated_at`).bind(document, timestamp, scope, owner, page, baseRevision).first<DraftRow>();
}
