import { describe, expect, it } from 'vitest';
import { createDefaultHomeDocument, serializeHomeDocument } from './homeDocument';
import {
  acknowledgeHomeDraftSave, canApplyServerHomeDraft, createHomeDraftClientState, homeDraftResponseError,
  isHomeDraftServerDirty, parseServerHomeDraftResponse, recordHomeDraftEdit,
  restoreHomeDraftSyncState, serializeHomeDraftSyncState,
} from './homeDraftClient';
import type { ServerHomeDraft } from './homeDraftClient';

function serverDraft(revision = 1): ServerHomeDraft {
  return { document: createDefaultHomeDocument(), revision, updatedAt: '2026-10-02T17:00:00.000Z' };
}

function editedDocument(title = '編集した下書き') {
  const document = createDefaultHomeDocument();
  document.sections[0]!.content.title = title;
  return document;
}

describe('server draft response validation', () => {
  it('accepts an absent draft and validates an independent document copy', () => {
    const draft = serverDraft();
    const parsed = parseServerHomeDraftResponse({ draft });
    expect(parseServerHomeDraftResponse({ draft: null })).toBeNull();
    expect(parsed).toEqual(draft);
    expect(parsed!.document).not.toBe(draft.document);
  });

  it.each([undefined, null, {}, [], { draft: {} }, { draft: false }])('rejects invalid envelopes %j', (value) => {
    expect(() => parseServerHomeDraftResponse(value)).toThrow('サーバーの応答');
  });

  it.each([0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1, null])('rejects revision %j', (revision) => {
    expect(() => parseServerHomeDraftResponse({ draft: { ...serverDraft(), revision } })).toThrow();
  });

  it.each(['', 'today', '2026-10-02', '2026-13-55T00:00:00Z', 123, null])('rejects timestamp %j', (updatedAt) => {
    expect(() => parseServerHomeDraftResponse({ draft: { ...serverDraft(), updatedAt } })).toThrow();
  });

  it('rejects a document outside the approved schema', () => {
    const draft = serverDraft();
    draft.document.sections[0]!.content.primaryTo = 'javascript:alert(1)';
    expect(() => parseServerHomeDraftResponse({ draft })).toThrow();
  });
});

describe('server draft revisions and editor changes', () => {
  it('does not mark a default or legacy local draft as saved to the server', () => {
    const state = createHomeDraftClientState(createDefaultHomeDocument());
    expect(state.base).toBeNull();
    expect(isHomeDraftServerDirty(state)).toBe(true);
  });

  it('marks the submitted snapshot as saved without changing current contents', () => {
    const document = createDefaultHomeDocument();
    const state = createHomeDraftClientState(document);
    const saved = acknowledgeHomeDraftSave(state, serverDraft(), { document, baseRevision: 0 });
    expect(saved.current).toBe(state.current);
    expect(saved.base?.revision).toBe(1);
    expect(isHomeDraftServerDirty(saved)).toBe(false);
    expect(state.base).toBeNull();
  });

  it('keeps newer edits dirty when an earlier save finishes', () => {
    const document = createDefaultHomeDocument();
    const state = recordHomeDraftEdit(createHomeDraftClientState(document), editedDocument());
    const saved = acknowledgeHomeDraftSave(state, serverDraft(), { document, baseRevision: 0 });
    expect(saved.current).toBe(serializeHomeDocument(editedDocument()));
    expect(saved.base?.revision).toBe(1);
    expect(isHomeDraftServerDirty(saved)).toBe(true);
    expect(saved.generation).toBe(state.generation);
  });

  it('retains the loaded baseline through import, reset and undo-like changes', () => {
    const document = createDefaultHomeDocument();
    const loaded = { ...createHomeDraftClientState(document), base: serverDraft(7) };
    const imported = recordHomeDraftEdit(loaded, editedDocument());
    expect(imported.base?.revision).toBe(7);
    expect(isHomeDraftServerDirty(imported)).toBe(true);
    const reset = recordHomeDraftEdit(imported, document);
    expect(reset.base?.revision).toBe(7);
    expect(isHomeDraftServerDirty(reset)).toBe(false);
  });

  it('refuses a pending load after any newer content change, even if later undone', () => {
    const state = createHomeDraftClientState(createDefaultHomeDocument());
    expect(canApplyServerHomeDraft(state, state.generation)).toBe(true);
    const newer = recordHomeDraftEdit(state, editedDocument());
    expect(canApplyServerHomeDraft(newer, state.generation)).toBe(false);
    const undone = recordHomeDraftEdit(newer, createDefaultHomeDocument());
    expect(canApplyServerHomeDraft(undone, state.generation)).toBe(false);
  });

  it('does not invalidate a pending load for unchanged editor update events', () => {
    const state = createHomeDraftClientState(createDefaultHomeDocument());
    expect(recordHomeDraftEdit(state, createDefaultHomeDocument())).toBe(state);
  });

  it('rejects an unexpected saved revision without advancing the baseline', () => {
    const document = createDefaultHomeDocument();
    const state = { ...createHomeDraftClientState(document), base: serverDraft(2) };
    expect(() => acknowledgeHomeDraftSave(state, serverDraft(5), { document, baseRevision: 2 })).toThrow();
    expect(state.base.revision).toBe(2);
  });

  it('rejects a success response for different content', () => {
    const document = createDefaultHomeDocument();
    const state = createHomeDraftClientState(document);
    expect(() => acknowledgeHomeDraftSave(state, { ...serverDraft(), document: editedDocument() }, {
      document, baseRevision: 0,
    })).toThrow();
    expect(state.base).toBeNull();
  });
});

describe('paired local backup metadata', () => {
  it('restores an acknowledged baseline with its newer local edits still dirty', () => {
    const state = { ...createHomeDraftClientState(editedDocument()), base: serverDraft(4) };
    const restored = restoreHomeDraftSyncState(createHomeDraftClientState(editedDocument()),
      serializeHomeDraftSyncState(state));
    expect(restored.base?.revision).toBe(4);
    expect(isHomeDraftServerDirty(restored)).toBe(true);
  });

  it('rejects stale metadata when another tab or a partial write changed the local backup', () => {
    const state = { ...createHomeDraftClientState(editedDocument()), base: serverDraft(4) };
    const current = createHomeDraftClientState(editedDocument('別タブの編集'));
    expect(restoreHomeDraftSyncState(current, serializeHomeDraftSyncState(state))).toBe(current);
    expect(current.base).toBeNull();
  });

  it.each([null, '', '{', '{}', '{"current":null,"base":null}'])(
    'ignores legacy or corrupt metadata %j', (json) => {
      const state = createHomeDraftClientState(editedDocument());
      expect(restoreHomeDraftSyncState(state, json)).toBe(state);
    },
  );

  it('rejects invalid baseline metadata without losing local content', () => {
    const state = createHomeDraftClientState(editedDocument());
    const metadata = JSON.stringify({ current: state.current, base: { revision: 99 } });
    const restored = restoreHomeDraftSyncState(state, metadata);
    expect(restored).toBe(state);
  });
});

describe('server draft recovery messages', () => {
  it.each([
    [401, 'authentication'], [403, 'forbidden'], [409, 'conflict'], [413, 'size'], [422, 'validation'],
    [404, 'unavailable'], [405, 'unavailable'], [503, 'unavailable'], [500, 'server'],
  ])('provides recovery guidance for HTTP %i', (status, code) => {
    const error = homeDraftResponseError(Number(status));
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(10);
  });

  it('explains export and load rather than offering to overwrite a conflict', () => {
    const error = homeDraftResponseError(409);
    expect(error.message).toContain('書き出して');
    expect(error.message).toContain('読み込み');
  });
});
