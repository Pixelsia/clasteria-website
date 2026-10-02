import { serializeHomeDocument, validateHomeDocument } from './homeDocument';
import type { HomeDocument } from './homeDocument';

export const homeDraftSyncStorageKey = 'clasteria:home-draft-server:v1';
export const homeDraftRecoveryStorageKey = 'clasteria:home-draft-recovery:v1';
export const homeDraftRequestTimeoutMs = 15_000;

export type ServerHomeDraft = { document: HomeDocument; revision: number; updatedAt: string };
export type HomeDraftClientState = {
  current: string;
  base: ServerHomeDraft | null;
  generation: number;
};

export class HomeDraftRequestError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'HomeDraftRequestError';
  }
}

function invalidResponse(): never {
  throw new HomeDraftRequestError('invalid_response', 'サーバーの応答を確認できませんでした。下書きは変更していません。');
}

export function parseServerHomeDraftResponse(input: unknown): ServerHomeDraft | null {
  if (!input || typeof input !== 'object' || !('draft' in input)) return invalidResponse();
  if (input.draft === null) return null;
  const draft = input.draft;
  if (!draft || typeof draft !== 'object'
    || !('revision' in draft) || !Number.isSafeInteger(draft.revision) || Number(draft.revision) < 1
    || !('updatedAt' in draft) || typeof draft.updatedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T/.test(draft.updatedAt) || !Number.isFinite(Date.parse(draft.updatedAt))
    || !('document' in draft)) return invalidResponse();
  try {
    const document = validateHomeDocument(draft.document);
    serializeHomeDocument(document);
    return { document, revision: Number(draft.revision), updatedAt: draft.updatedAt };
  }
  catch { return invalidResponse(); }
}

export function homeDraftResponseError(status: number): HomeDraftRequestError {
  switch (status) {
    case 401:
      return new HomeDraftRequestError('authentication', 'ログインが必要です。別タブでログインしてから、もう一度お試しください。');
    case 403:
      return new HomeDraftRequestError('forbidden', 'この下書きへのアクセス権限を確認してください。ログイン後も続く場合は管理者へお問い合わせください。');
    case 409:
      return new HomeDraftRequestError('conflict', '別の編集でサーバーの下書きが更新されました。現在の下書きを書き出してから、サーバーの下書きを読み込み、変更を反映してください。');
    case 413:
      return new HomeDraftRequestError('size', '下書きの容量が大きすぎます。文章やセクションを減らしてから保存してください。');
    case 422:
      return new HomeDraftRequestError('validation', '下書きの形式を確認してください。対応していない内容はサーバーに保存できません。');
    case 404:
    case 405:
    case 503:
      return new HomeDraftRequestError('unavailable', 'この環境ではサーバー保存を利用できません。接続・保存先の設定を管理者に確認してください。ブラウザー保存と JSON 書き出しは利用できます。');
    default:
      return new HomeDraftRequestError('server', 'サーバーに接続できませんでした。下書きを書き出して保管し、時間をおいて再試行してください。');
  }
}

export function createHomeDraftClientState(document: HomeDocument): HomeDraftClientState {
  return { current: serializeHomeDocument(document), base: null, generation: 0 };
}

export function recordHomeDraftEdit(state: HomeDraftClientState, document: HomeDocument): HomeDraftClientState {
  const current = serializeHomeDocument(document);
  return current === state.current ? state : { ...state, current, generation: state.generation + 1 };
}

export function isHomeDraftServerDirty(state: HomeDraftClientState): boolean {
  return !state.base || state.current !== serializeHomeDocument(state.base.document);
}

export function canApplyServerHomeDraft(state: HomeDraftClientState, generation: number): boolean {
  return state.generation === generation;
}

export function acknowledgeHomeDraftSave(
  state: HomeDraftClientState,
  draft: ServerHomeDraft,
  submitted: { document: HomeDocument; baseRevision: number },
): HomeDraftClientState {
  if (draft.revision !== submitted.baseRevision + 1
    || serializeHomeDocument(draft.document) !== serializeHomeDocument(submitted.document)) return invalidResponse();
  // A late save response advances the baseline, never the current editor contents.
  return { ...state, base: draft };
}

export function serializeHomeDraftSyncState(state: HomeDraftClientState): string {
  return JSON.stringify({ current: state.current, base: state.base });
}

export function restoreHomeDraftSyncState(state: HomeDraftClientState, json: string | null): HomeDraftClientState {
  if (!json) return state;
  try {
    const stored: unknown = JSON.parse(json);
    if (!stored || typeof stored !== 'object' || !('current' in stored) || stored.current !== state.current
      || !('base' in stored)) return state;
    const base = parseServerHomeDraftResponse({ draft: stored.base });
    return { ...state, base };
  }
  catch { return state; }
}
