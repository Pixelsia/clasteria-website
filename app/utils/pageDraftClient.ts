import { serializePageDocument, validatePageDocument } from './pageDocument';
import type { PageDocument } from './pageDocument';

export function pageStorageKeys(page: PageDocument['page']) {
  // The Home keys are an existing data contract; keep every previous local draft.
  return { draft: `clasteria:${page}-draft:v1`, preview: `clasteria:${page}-preview:v1`,
    sync: `clasteria:${page}-draft-server:v1`, recovery: `clasteria:${page}-draft-recovery:v1` };
}
export const pageDraftRequestTimeoutMs = 15_000;

export type ServerPageDraft = { document: PageDocument; revision: number; updatedAt: string };
export type PageDraftClientState = {
  current: string;
  base: ServerPageDraft | null;
  generation: number;
};

export class PageDraftRequestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'PageDraftRequestError';
  }
}

function invalidResponse(): never {
  throw new PageDraftRequestError('invalid_response', 'サーバーの応答を確認できませんでした。下書きは変更していません。');
}

export function parseServerPageDraftResponse(input: unknown, page?: PageDocument['page']): ServerPageDraft | null {
  if (!input || typeof input !== 'object' || !('draft' in input)) return invalidResponse();
  if (input.draft === null) return null;
  const draft = input.draft;
  if (!draft || typeof draft !== 'object'
    || !('revision' in draft) || !Number.isSafeInteger(draft.revision) || Number(draft.revision) < 1
    || !('updatedAt' in draft) || typeof draft.updatedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T/.test(draft.updatedAt) || !Number.isFinite(Date.parse(draft.updatedAt))
    || !('document' in draft)) return invalidResponse();
  try {
    const document = validatePageDocument(draft.document);
    if (page && document.page !== page) return invalidResponse();
    serializePageDocument(document);
    return { document, revision: Number(draft.revision), updatedAt: draft.updatedAt };
  }
  catch { return invalidResponse(); }
}

export function pageDraftResponseError(status: number): PageDraftRequestError {
  switch (status) {
    case 401:
      return new PageDraftRequestError('authentication', 'ログインが必要です。別タブでログインしてから、もう一度お試しください。');
    case 403:
      return new PageDraftRequestError('forbidden', 'この下書きへのアクセス権限を確認してください。ログイン後も続く場合は管理者へお問い合わせください。');
    case 409:
      return new PageDraftRequestError('conflict', '別の編集でサーバーの下書きが更新されました。現在の下書きを書き出してから、サーバーの下書きを読み込み、変更を反映してください。');
    case 413:
      return new PageDraftRequestError('size', '下書きの容量が大きすぎます。文章やセクションを減らしてから保存してください。');
    case 422:
      return new PageDraftRequestError('validation', '下書きの形式を確認してください。対応していない内容はサーバーに保存できません。');
    case 404:
    case 405:
    case 503:
      return new PageDraftRequestError('unavailable', 'この環境ではサーバー保存を利用できません。接続・保存先の設定を管理者に確認してください。ブラウザー保存と JSON 書き出しは利用できます。');
    default:
      return new PageDraftRequestError('server', 'サーバーに接続できませんでした。下書きを書き出して保管し、時間をおいて再試行してください。');
  }
}

export function createPageDraftClientState(document: PageDocument): PageDraftClientState {
  return { current: serializePageDocument(document), base: null, generation: 0 };
}

export function recordPageDraftEdit(state: PageDraftClientState, document: PageDocument): PageDraftClientState {
  const current = serializePageDocument(document);
  if (JSON.parse(state.current).page !== document.page) return invalidResponse();
  return current === state.current ? state : { ...state, current, generation: state.generation + 1 };
}

export function isPageDraftServerDirty(state: PageDraftClientState): boolean {
  return !state.base || state.current !== serializePageDocument(state.base.document);
}

export function canApplyServerPageDraft(state: PageDraftClientState, generation: number): boolean {
  return state.generation === generation;
}

export function acknowledgePageDraftSave(
  state: PageDraftClientState,
  draft: ServerPageDraft,
  submitted: { document: PageDocument; baseRevision: number },
): PageDraftClientState {
  if (JSON.parse(state.current).page !== submitted.document.page
    || draft.document.page !== submitted.document.page
    || draft.revision !== submitted.baseRevision + 1
    || serializePageDocument(draft.document) !== serializePageDocument(submitted.document)) return invalidResponse();
  // A late save response advances the baseline, never the current editor contents.
  return { ...state, base: draft };
}

export function serializePageDraftSyncState(state: PageDraftClientState): string {
  return JSON.stringify({ current: state.current, base: state.base });
}

export function restorePageDraftSyncState(state: PageDraftClientState, json: string | null): PageDraftClientState {
  if (!json) return state;
  try {
    const stored: unknown = JSON.parse(json);
    if (!stored || typeof stored !== 'object' || !('current' in stored) || stored.current !== state.current
      || !('base' in stored)) return state;
    const base = parseServerPageDraftResponse({ draft: stored.base }, JSON.parse(state.current).page);
    return { ...state, base };
  }
  catch { return state; }
}
