import { isPageId, maxPageDocumentBytes, parsePageDocument, serializePageDocument, validatePageDocument } from '../../app/utils/pageDocument';
import type { PageId } from '../../app/utils/pageDocument';
import { accessConfiguration, verifyEditorIdentity } from './access';
import type { AccessConfig } from './access';

type Statement = {
  bind: (...values: (string | number)[]) => Statement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
};
export type DraftEnvironment = AccessConfig & { CLASTERIA_DRAFTS?: { prepare: (sql: string) => Statement } };
type DraftRow = { document: string; revision: number; updated_at: string };

// Fixed additive schema only. A drift test pins this to migration 0002; no request data enters this SQL.
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

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie, Cf-Access-Jwt-Assertion',
  } });
}
function envelope(row: DraftRow | null, page: PageId) {
  // Treat invalid or cross-page stored data as unavailable instead of returning it.
  const draft = row && {
    document: parsePageDocument(row.document, page), revision: row.revision, updatedAt: row.updated_at,
  };
  return { draft };
}
async function readBody(request: Request) {
  // Limit streamed bytes as well as Content-Length; never buffer an unbounded request.
  const limit = maxPageDocumentBytes + 1024;
  if (Number(request.headers.get('Content-Length')) > limit) throw new ApiError(413, 'too_large', '下書きは 100 KB 以下にしてください。');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_request', '下書きがありません。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(413, 'too_large', '下書きは 100 KB 以下にしてください。');
      }
      chunks.push(value);
    }
  }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  }
  catch { throw new ApiError(400, 'invalid_json', 'JSON を読み取れませんでした。'); }
}

export async function handleDraftRequest(request: Request, env: DraftEnvironment, scope: string): Promise<Response> {
  try {
    const path = new URL(request.url).pathname;
    const page = path.startsWith('/api/editor/') ? path.slice('/api/editor/'.length) : undefined;
    // Do not decode paths or accept nested/trailing segments: only exact registered IDs.
    if (!isPageId(page)) return json({ error: 'not_found', message: '見つかりません。' }, 404);
    if (!['GET', 'PUT'].includes(request.method)) return json({ error: 'method_not_allowed', message: '未対応の操作です。' }, 405);
    const config = accessConfiguration(env);
    if (!config || !env.CLASTERIA_DRAFTS || !scope || scope === 'main') {
      throw new ApiError(503, 'not_configured', 'サーバー保存はまだ設定されていません。端末の下書きと JSON 書き出しを利用できます。');
    }
    const owner = await verifyEditorIdentity(request, config);
    if (!owner) throw new ApiError(401, 'unauthorized', '認証を確認できません。許可されたアカウントで再ログインしてください。');
    // Bind the document to this build's branch and verified identity. Neither is client supplied.
    const db = env.CLASTERIA_DRAFTS;
    // Only these server-selected literals reach SQL. Keep legacy Home storage unchanged.
    const table = page === 'home' ? 'editor_drafts' : 'editor_page_drafts';
    if (request.method === 'GET') {
      if (page !== 'home') {
        // Reads never initialize storage. An absent new table means no non-Home drafts yet.
        const exists = await db.prepare('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'editor_page_drafts\'')
          .first<{ name: string }>();
        if (!exists) return json({ draft: null });
      }
      const row = await db.prepare(`SELECT document, revision, updated_at FROM ${table} WHERE scope = ? AND owner = ? AND page = ?`)
        .bind(scope, owner, page).first<DraftRow>();
      return json(envelope(row, page));
    }
    if (request.headers.get('Origin') !== new URL(request.url).origin
      || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      throw new ApiError(403, 'invalid_origin', '同じ編集画面から保存してください。');
    }
    if (request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
      throw new ApiError(415, 'invalid_content_type', 'JSON 形式で保存してください。');
    }
    const body = await readBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 2 || !('document' in body) || !('baseRevision' in body)
      || !Number.isSafeInteger(body.baseRevision) || (body.baseRevision as number) < 0) {
      throw new ApiError(400, 'invalid_request', '下書きの保存形式が正しくありません。');
    }
    let document: string;
    try {
      document = serializePageDocument(validatePageDocument(body.document, page));
    }
    catch { throw new ApiError(422, 'invalid_document', '下書きの内容またはバージョンが正しくありません。'); }
    // Only a fully authenticated, preview-scoped, same-origin, validated non-Home save may create this table.
    // IF NOT EXISTS is safe when independent first saves race; Home schema and data are never touched.
    if (page !== 'home') await db.prepare(multiPageDraftsSchemaSql).run();
    const baseRevision = body.baseRevision as number;
    const timestamp = new Date().toISOString();
    // A single conditional write is the revision check. A read-then-write or KV put would lose concurrent edits.
    const row = baseRevision === 0
      ? await db.prepare(`INSERT INTO ${table} (scope, owner, page, document, revision, updated_at)
          VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT (scope, owner, page) DO NOTHING
          RETURNING document, revision, updated_at`).bind(scope, owner, page, document, timestamp).first<DraftRow>()
      : await db.prepare(`UPDATE ${table} SET document = ?, revision = revision + 1, updated_at = ?
          WHERE scope = ? AND owner = ? AND page = ? AND revision = ?
          RETURNING document, revision, updated_at`).bind(document, timestamp, scope, owner, page, baseRevision).first<DraftRow>();
    if (!row) throw new ApiError(409, 'revision_conflict', '別の端末で下書きが更新されました。現在の内容を書き出してから、サーバーの下書きを読み込んでください。');
    return json(envelope(row, page));
  }
  catch (cause) {
    if (cause instanceof ApiError) return json({ error: cause.code, message: cause.message }, cause.status);
    // Do not return database statements, identity claims, or exception details to the browser.
    return json({ error: 'unavailable', message: 'サーバー保存を利用できません。端末の下書きは保持されています。時間をおいて再試行してください。' }, 503);
  }
}
