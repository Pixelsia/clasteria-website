import { describe, expect, it } from 'vitest';
import { createDefaultPageDocument, parsePageDocument, serializePageDocument } from './pageDocument';
import { parseHomeDocument } from './homeDocument';
import { createPageDraftClientState, parseServerPageDraftResponse, restorePageDraftSyncState,
  acknowledgePageDraftSave, isPageDraftServerDirty } from './pageDraftClient';
import { createHomeDraftClientState, restoreHomeDraftSyncState } from './homeDraftClient';
import { supportDiscord } from './siteContent';

const legacy = 'https://discord.gg/TwTPa4Yp4h';
const updatedAt = '2026-10-02T19:00:00.000Z';

describe('existing Discord draft compatibility', () => {
  it.each(['home', 'support', 'access'] as const)('reads old %s JSON and server response without losing user edits or mutating sources', (page) => {
    const source = createDefaultPageDocument(page);
    const hero = source.sections[0]!;
    hero.content.primaryTo = legacy;
    hero.content.title = '  自分の見出し\r\n二行目  ';
    hero.content.description = `説明に引用された ${legacy} は文章として保持`;
    hero.content.image = '/images/clasteria/portal-plaza.png';
    hero.style = { accent: '#AaBbCc', background: '#123456', button: '#654321', spacing: 'roomy' };
    const contact = source.sections.find(section => section.kind === 'support-contact');
    if (contact) contact.content.discordTo = legacy;
    source.sections.reverse();
    const raw = JSON.stringify(source, null, 1);
    const expected = structuredClone(source);
    for (const section of expected.sections) {
      for (const key of Object.keys(section.content)) {
        if (key.endsWith('To') && section.content[key] === legacy) section.content[key] = supportDiscord;
      }
    }
    const parsed = parsePageDocument(raw, page);
    expect(parsed).toEqual(expected);
    if (page === 'home') expect(parseHomeDocument(raw)).toEqual(expected);
    expect(JSON.stringify(source, null, 1)).toBe(raw);
    const response = { draft: { document: source, revision: 7, updatedAt } };
    const server = parseServerPageDraftResponse(response, page)!;
    expect(server.document).toEqual(expected);
    expect(response.draft.document).toEqual(JSON.parse(raw));
    const state = createPageDraftClientState(parsed);
    const restored = restorePageDraftSyncState(state, JSON.stringify({ current: raw, base: response.draft }));
    expect(restored.base).toEqual(server);
    expect(isPageDraftServerDirty(restored)).toBe(false);
    const submitted = { document: parsed, baseRevision: server.revision };
    const saved = acknowledgePageDraftSave(restored, { ...server, revision: 8 }, submitted);
    expect(saved.current).toBe(serializePageDocument(expected));
    expect(saved.base?.revision).toBe(8);
    expect(isPageDraftServerDirty(saved)).toBe(false);
    expect(parsePageDocument(serializePageDocument(parsed), page)).toEqual(expected);
    if (page === 'home') {
      const homeState = createHomeDraftClientState(parseHomeDocument(raw));
      const restoredHome = restoreHomeDraftSyncState(homeState, JSON.stringify({ current: raw, base: response.draft }));
      expect(restoredHome.base?.document).toEqual(expected);
      expect(restoredHome.base?.revision).toBe(7);
    }
  });
  it.each(['home', 'support', 'access'] as const)('continues rejecting unknown invitation destinations in %s', (page) => {
    for (const value of ['https://discord.gg/other', `${legacy}?x=1`, `${legacy}/`, 'https://discord.gg/twtpa4yp4h']) {
      const source = createDefaultPageDocument(page);
      source.sections[0]!.content.primaryTo = value;
      expect(() => parsePageDocument(JSON.stringify(source), page)).toThrow();
      expect(() => parseServerPageDraftResponse(
        { draft: { document: source, revision: 1, updatedAt } }, page,
      )).toThrow();
    }
  });
});
