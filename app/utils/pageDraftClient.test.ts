import { describe, expect, it } from 'vitest';
import { homeDraftStorageKey, homePreviewStorageKey, createDefaultHomeDocument } from './homeDocument';
import { homeDraftRecoveryStorageKey, homeDraftSyncStorageKey } from './homeDraftClient';
import { createDefaultPageDocument, pageDefinitions, serializePageDocument } from './pageDocument';
import {
  acknowledgePageDraftSave, createPageDraftClientState, isPageDraftServerDirty,
  pageStorageKeys, parseServerPageDraftResponse, recordPageDraftEdit,
  restorePageDraftSyncState, serializePageDraftSyncState,
} from './pageDraftClient';

const updatedAt = '2026-10-02T19:00:00.000Z';
describe('page draft isolation and Home compatibility', () => {
  it('retains every existing Home storage key', () => {
    expect(pageStorageKeys('home')).toEqual({
      draft: homeDraftStorageKey, preview: homePreviewStorageKey,
      sync: homeDraftSyncStorageKey, recovery: homeDraftRecoveryStorageKey,
    });
  });
  it('allocates separate draft, preview, revision and recovery storage for every page', () => {
    const keys = pageDefinitions.flatMap(page => Object.values(pageStorageKeys(page.id)));
    expect(new Set(keys).size).toBe(pageDefinitions.length * 4);
  });
  it('accepts original Home JSON and response without migration', () => {
    const document = createDefaultHomeDocument();
    expect(parseServerPageDraftResponse({ draft: { document, revision: 1, updatedAt } }, 'home')?.document).toEqual(document);
  });
  for (const page of pageDefinitions) {
    it(`saves and restores only the ${page.id} baseline`, () => {
      const document = createDefaultPageDocument(page.id);
      const draft = { document, revision: 1, updatedAt };
      const state = createPageDraftClientState(document);
      const saved = acknowledgePageDraftSave(state, draft, { document, baseRevision: 0 });
      expect(isPageDraftServerDirty(saved)).toBe(false);
      expect(restorePageDraftSyncState(state, serializePageDraftSyncState(saved)).base).toEqual(draft);
      const otherPage = page.id === 'home' ? 'support' : 'home';
      expect(() => parseServerPageDraftResponse({ draft }, otherPage)).toThrow();
      const other = createDefaultPageDocument(otherPage);
      expect(() => recordPageDraftEdit(state, other)).toThrow();
      expect(restorePageDraftSyncState(state, JSON.stringify({ current: state.current,
        base: { document: other, revision: 1, updatedAt } })).base).toBeNull();
    });
  }
  it('rejects a late save from another page instead of advancing its baseline', () => {
    const document = createDefaultPageDocument('support');
    const state = createPageDraftClientState(createDefaultPageDocument('home'));
    expect(() => acknowledgePageDraftSave(state, { document, revision: 1, updatedAt },
      { document, baseRevision: 0 })).toThrow();
    expect(state.current).toBe(serializePageDocument(createDefaultPageDocument('home')));
  });
});
