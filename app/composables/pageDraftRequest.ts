import type { PageDocument, PageId } from '../utils/pageDocument';
import {
  pageDraftRequestTimeoutMs, pageDraftResponseError, PageDraftRequestError, parseServerPageDraftResponse,
} from '../utils/pageDraftClient';

// ページ単位で通信を所有し、画面を離れた後の応答が編集状態へ入り込むのを防ぐ。
export function usePageDraftRequest(page: PageId) {
  let activeRequest: AbortController | undefined;

  async function requestServerDraft(method: 'GET' | 'PUT', body?: { document: PageDocument; baseRevision: number }) {
    const controller = new AbortController();
    activeRequest = controller;
    const timer = setTimeout(() => controller.abort(), pageDraftRequestTimeoutMs);
    try {
      const response = await fetch(`/api/editor/${page}`, {
        method, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw pageDraftResponseError(response.status);
      let result: unknown;
      try {
        result = await response.json();
      }
      catch { throw new PageDraftRequestError('invalid_response', 'サーバーの応答を確認できませんでした。ログインと保存先の設定を確認してください。'); }
      return parseServerPageDraftResponse(result, page);
    }
    catch (cause) {
      if (cause instanceof PageDraftRequestError) throw cause;
      if (controller.signal.aborted) {
        throw new PageDraftRequestError('timeout', '通信がタイムアウトしました。保存結果は未確認です。下書きを書き出して保管し、接続を再確認してください。');
      }
      throw new PageDraftRequestError('network', '通信できませんでした。ネットワークとログイン状態を確認し、もう一度お試しください。現在の編集内容は残っています。');
    }
    finally {
      clearTimeout(timer);
      if (activeRequest === controller) activeRequest = undefined;
    }
  }

  function abortServerDraft() {
    activeRequest?.abort();
  }

  return { requestServerDraft, abortServerDraft };
}
