import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultHomeDocument, serializeHomeDocument } from '../../app/utils/homeDocument';
import { createDefaultPageDocument, pageDefinitions, parsePageDocument, serializePageDocument } from '../../app/utils/pageDocument';
import type { PageId } from '../../app/utils/pageDocument';
import { parseServerPageDraftResponse } from '../../app/utils/pageDraftClient';
import { handleDraftRequest, multiPageDraftsSchemaSql, connectionDraftsSchemaSql } from './drafts';
import type { DraftEnvironment } from './drafts';

const identity = vi.hoisted(() => ({ owner: 'verified-owner' as string | null }));
vi.mock('./access', () => ({
  accessConfiguration: (env: DraftEnvironment) => env.CLASTERIA_ACCESS_AUD ? {} : null,
  verifyEditorIdentity: async () => identity.owner,
}));
let db: InstanceType<typeof Database>;
let env: DraftEnvironment;
const origin = 'https://preview.pages.dev';
const scope = 'codex/preview';
const originalMigration = readFileSync(new URL('../../migrations/0001_editor_drafts.sql', import.meta.url), 'utf8');
const multiPageMigration = readFileSync(new URL('../../migrations/0002_multi_page_editor_drafts.sql', import.meta.url), 'utf8');
function request(method = 'GET', body?: unknown, headers: Record<string, string> = {}, page = 'home') {
  return new Request(`${origin}/api/editor/${page}`, {
    method, headers: { 'Origin': origin, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
function put(baseRevision = 0, page: PageId = 'home') {
  return request('PUT', { document: createDefaultPageDocument(page), baseRevision }, {}, page);
}
function applyMultiPageMigration() {
  // The additive migration is a single statement, also safe in the D1 console.
  db.exec(multiPageMigration);
}

beforeEach(() => {
  identity.owner = 'verified-owner';
  db = new Database(':memory:');
  db.exec(originalMigration);
  applyMultiPageMigration();
  env = { CLASTERIA_ACCESS_AUD: 'app', CLASTERIA_DRAFTS: {
    prepare(sql) {
      return { bind(...values) {
        return {
          bind() { throw new Error('already bound'); },
          async first<T>() { return (db.prepare(sql).get(...values) ?? null) as T | null; },
          async run() { return db.prepare(sql).run(...values); },
        };
      },
      async first<T>() { return (db.prepare(sql).get() ?? null) as T | null; },
      async run() { return db.prepare(sql).run(); } };
    },
  } };
});
afterEach(() => db.close());

describe('server draft API with real SQLite conditional writes', () => {
  it.each(['home', 'support', 'access'] as const)('reads legacy Discord in %s without writing storage, then updates only on explicit PUT', async (page) => {
    const legacy = 'https://discord.gg/TwTPa4Yp4h';
    const document = createDefaultPageDocument(page);
    Object.assign(document.sections[0]!.content, {
      title: '  保存済みの見出し\r\n二行目  ', description: `本文中の ${legacy} は保持`,
      primaryTo: legacy, image: '/images/clasteria/portal-plaza.png',
    });
    document.sections[0]!.style = { accent: '#AaBbCc', background: '#123456', button: '#654321', spacing: 'roomy' };
    const contact = document.sections.find(section => section.kind === 'support-contact');
    if (contact) contact.content.discordTo = legacy;
    document.sections.reverse();
    const raw = JSON.stringify(document, null, 1);
    const table = page === 'home' ? 'editor_drafts' : page === 'access' ? 'editor_connection_drafts' : 'editor_page_drafts';
    if (page === 'access') db.exec(connectionDraftsSchemaSql);
    db.prepare(`INSERT INTO ${table} (scope, owner, page, document, revision, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(scope, 'verified-owner', page, raw, 7, '2026-10-02T19:00:00.000Z');
    const snapshot = () => db.prepare(`SELECT document, revision, updated_at FROM ${table}`).all();
    const before = snapshot();
    const writesBefore = db.prepare('SELECT total_changes() AS count').get();
    const loaded = await handleDraftRequest(request('GET', undefined, {}, page), env, scope);
    expect(loaded.status).toBe(200);
    const draft = parseServerPageDraftResponse(await loaded.json(), page)!;
    expect(draft.document).toEqual(parsePageDocument(raw, page));
    expect(draft.revision).toBe(7);
    expect(snapshot()).toEqual(before);
    expect(db.prepare('SELECT total_changes() AS count').get()).toEqual(writesBefore);
    expect(JSON.stringify(document, null, 1)).toBe(raw);
    const conflict = await handleDraftRequest(request('PUT', { document: draft.document, baseRevision: 6 }, {}, page), env, scope);
    expect(conflict.status).toBe(409);
    expect(snapshot()).toEqual(before);
    const saved = await handleDraftRequest(request('PUT', { document: draft.document, baseRevision: 7 }, {}, page), env, scope);
    expect(saved.status).toBe(200);
    const result = parseServerPageDraftResponse(await saved.json(), page)!;
    expect(result.revision).toBe(8);
    expect(result.document).toEqual(draft.document);
    expect(snapshot()).toEqual([{
      document: serializePageDocument(draft.document), revision: 8, updated_at: result.updatedAt,
    }]);
  });
  it('exposes only the fixed editor page registry', () => {
    expect(pageDefinitions.map(({ id }) => id).sort()).toEqual([
      'home', 'support', 'articles', 'access', 'onigokko', 'kakurenbo', 'login', 'register', 'leaderboard', 'codingcraft', 'article-draft',
    ].sort());
  });
  it('saves and loads a validated document across independent requests with increasing revision', async () => {
    expect(await (await handleDraftRequest(request(), env, scope)).json()).toEqual({ draft: null });
    const first = await handleDraftRequest(put(), env, scope);
    expect(first.status).toBe(200);
    const saved = await first.json();
    expect(saved.draft.revision).toBe(1);
    expect(saved.draft.document).toEqual(createDefaultHomeDocument());
    expect(first.headers.get('Cache-Control')).toContain('no-store');
    expect(await (await handleDraftRequest(request(), env, scope)).json()).toEqual(saved);
    expect((await (await handleDraftRequest(put(1), env, scope)).json()).draft.revision).toBe(2);
  });
  it.each((['home', 'support', 'access', 'article-draft'] as const).flatMap(page => [
    { page, ending: 'LF', newline: '\n' },
    { page, ending: 'CRLF', newline: '\r\n' },
  ]))('preserves exact $ending prose bytes in $page SQLite inserts, updates and API reloads', async ({ page, newline }) => {
    const document = createDefaultPageDocument(page);
    const table = page === 'home' ? 'editor_drafts' : page === 'access' ? 'editor_connection_drafts' : 'editor_page_drafts';
    for (const baseRevision of [0, 1]) {
      const text = {
        title: `  保存 ${baseRevision + 1}${newline}二行目${newline}${newline}<br> は文字列  `,
        description: `説明の一行目${newline}${newline}説明の三行目${newline}<script>alert("text")</script> と \\n`,
      };
      Object.assign(document.sections[0]!.content, text);
      const response = await handleDraftRequest(request('PUT', { document, baseRevision }, {}, page), env, scope);
      expect(response.status).toBe(200);
      const saved = await response.json();
      const parsed = parseServerPageDraftResponse(saved, page);
      expect(parsed?.revision).toBe(baseRevision + 1);
      expect(parsed?.document).toEqual(document);
      expect(parsed?.document.sections[0]!.content).toMatchObject(text);

      const stored = db.prepare(`SELECT document, CAST(document AS BLOB) AS bytes, revision FROM ${table}
        WHERE scope = ? AND owner = ? AND page = ?`)
        .get(scope, 'verified-owner', page) as { document: string; bytes: Uint8Array; revision: number };
      const json = serializePageDocument(document);
      expect(stored.document).toBe(json);
      expect([...stored.bytes]).toEqual([...new TextEncoder().encode(json)]);
      expect(stored.revision).toBe(baseRevision + 1);
      expect(JSON.parse(stored.document).sections[0].content).toMatchObject(text);

      const reload = await handleDraftRequest(request('GET', undefined, {}, page), env, scope);
      expect(reload.status).toBe(200);
      const loaded = await reload.json();
      expect(loaded).toEqual(saved);
      expect(parseServerPageDraftResponse(loaded, page)?.document).toEqual(document);
      expect(loaded.draft.document.sections[0].content).toMatchObject(text);
    }
  });
  it.each(pageDefinitions.filter(({ id }) => id !== 'article-draft'))(
    'roundtrips the added plaza image through JSON and validated server storage for $id without changing defaults', async ({ id }) => {
      const original = createDefaultPageDocument(id);
      const document = createDefaultPageDocument(id);
      for (const section of document.sections) {
        if ('image' in section.content) section.content.image = '/images/clasteria/portal-plaza.png';
      }
      const imported = parsePageDocument(serializePageDocument(document), id);
      expect(imported).toEqual(document);
      const saved = await handleDraftRequest(request('PUT', { document: imported, baseRevision: 0 }, {}, id), env, scope);
      expect(saved.status).toBe(200);
      const response = await (await handleDraftRequest(request('GET', undefined, {}, id), env, scope)).json();
      expect(parseServerPageDraftResponse(response, id)?.document).toEqual(document);
      expect(createDefaultPageDocument(id)).toEqual(original);
    },
  );
  it('rejects stale and concurrent updates without losing the first accepted save', async () => {
    const responses = await Promise.all([handleDraftRequest(put(), env, scope), handleDraftRequest(put(), env, scope)]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await handleDraftRequest(put(100), env, scope)).status).toBe(409);
    expect((await (await handleDraftRequest(request(), env, scope)).json()).draft.revision).toBe(1);
  });
  it('isolates branches and authenticated owners', async () => {
    await handleDraftRequest(put(), env, scope);
    expect(await (await handleDraftRequest(request(), env, 'other-branch')).json()).toEqual({ draft: null });
    identity.owner = 'other-owner';
    expect(await (await handleDraftRequest(request(), env, scope)).json()).toEqual({ draft: null });
  });
  it('isolates every registered page and keeps revisions independent', async () => {
    for (const { id } of pageDefinitions) {
      expect(await (await handleDraftRequest(request('GET', undefined, {}, id), env, scope)).json()).toEqual({ draft: null });
      const saved = await handleDraftRequest(put(0, id), env, scope);
      expect(saved.status).toBe(200);
      expect((await saved.json()).draft).toMatchObject({ document: createDefaultPageDocument(id), revision: 1 });
    }
    for (const { id } of pageDefinitions) {
      const read = await handleDraftRequest(request('GET', undefined, {}, id), env, scope);
      expect((await read.json()).draft).toMatchObject({ document: createDefaultPageDocument(id), revision: 1 });
      const responses = await Promise.all([
        handleDraftRequest(put(1, id), env, scope), handleDraftRequest(put(1, id), env, scope),
      ]);
      expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
      expect((await handleDraftRequest(put(0, id), env, scope)).status).toBe(409);
    }
    expect(db.prepare('SELECT page, revision FROM editor_drafts UNION ALL SELECT page, revision FROM editor_page_drafts UNION ALL SELECT page, revision FROM editor_connection_drafts ORDER BY page').all()).toEqual(
      pageDefinitions.map(({ id }) => ({ page: id, revision: 2 })).sort((a, b) => a.page.localeCompare(b.page)),
    );
  });
  it.each(pageDefinitions.map(({ id }) => id))('isolates owners and branches when writing %s', async (page) => {
    expect((await handleDraftRequest(put(0, page), env, scope)).status).toBe(200);
    const get = () => request('GET', undefined, {}, page);
    expect(await (await handleDraftRequest(get(), env, 'other-branch')).json()).toEqual({ draft: null });
    expect((await handleDraftRequest(put(1, page), env, 'other-branch')).status).toBe(409);
    expect((await handleDraftRequest(put(0, page), env, 'other-branch')).status).toBe(200);
    identity.owner = 'other-owner';
    expect(await (await handleDraftRequest(get(), env, scope)).json()).toEqual({ draft: null });
    expect((await handleDraftRequest(put(1, page), env, scope)).status).toBe(409);
    expect((await handleDraftRequest(put(0, page), env, scope)).status).toBe(200);
    const table = page === 'home' ? 'editor_drafts' : page === 'access' ? 'editor_connection_drafts' : 'editor_page_drafts';
    expect(db.prepare(`SELECT scope, owner, page, revision FROM ${table} ORDER BY scope, owner`).all()).toEqual([
      { scope, owner: 'other-owner', page, revision: 1 },
      { scope, owner: 'verified-owner', page, revision: 1 },
      { scope: 'other-branch', owner: 'verified-owner', page, revision: 1 },
    ]);
  });
  it.each(pageDefinitions.map(({ id }) => id))('rejects a different document page at the %s endpoint', async (page) => {
    const otherPage = page === 'home' ? 'support' : 'home';
    const response = await handleDraftRequest(request('PUT', {
      document: createDefaultPageDocument(otherPage), baseRevision: 0,
    }, {}, page), env, scope);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: 'invalid_document' });
    expect(db.prepare('SELECT count(*) AS count FROM editor_drafts').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT count(*) AS count FROM editor_page_drafts').get()).toEqual({ count: 0 });
  });
  it.each(pageDefinitions.map(({ id }) => id))('fails closed when a stored %s document belongs to another page', async (page) => {
    expect((await handleDraftRequest(put(0, page), env, scope)).status).toBe(200);
    const otherPage = page === 'home' ? 'support' : 'home';
    const table = page === 'home' ? 'editor_drafts' : page === 'access' ? 'editor_connection_drafts' : 'editor_page_drafts';
    db.prepare(`UPDATE ${table} SET document = ? WHERE scope = ? AND owner = ? AND page = ?`)
      .run(JSON.stringify(createDefaultPageDocument(otherPage)), scope, 'verified-owner', page);
    const response = await handleDraftRequest(request('GET', undefined, {}, page), env, scope);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'unavailable' });
  });
  it.each([
    '', 'unknown', 'Home', 'home/', 'home/extra', 'articles/some-slug', 'article-draft/some-slug',
    '%68ome', 'ho%6de', '%2Fhome', 'home%2F', 'support%00', 'support%3Fhome', 'home;support',
    '__proto__', 'constructor', 'toString', 'Ｈｏｍｅ', 'home%27%20OR%201%3D1--',
  ])('rejects unregistered or encoded page paths: %s', async (path) => {
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    expect((await handleDraftRequest(request('GET', undefined, {}, path), env, scope)).status).toBe(404);
    expect((await handleDraftRequest(request('PUT', { document: createDefaultHomeDocument(), baseRevision: 0 }, {}, path), env, scope)).status).toBe(404);
    expect(prepare).not.toHaveBeenCalled();
  });
  it.each(['{', JSON.stringify({ version: 100, page: 'support', sections: [] }), serializeHomeDocument(createDefaultHomeDocument())])(
    'does not return invalid or cross-page stored documents', async (document) => {
      db.prepare('INSERT INTO editor_page_drafts VALUES (?, ?, ?, ?, ?, ?)').run(scope, 'verified-owner', 'support', document, 1, '2026-10-02T00:00:00.000Z');
      const response = await handleDraftRequest(request('GET', undefined, {}, 'support'), env, scope);
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: 'unavailable' });
    },
  );
  it.each(pageDefinitions.map(({ id }) => id))('fails closed before querying %s storage when setup or identity is missing', async (page) => {
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    expect((await handleDraftRequest(put(0, page), {}, scope)).status).toBe(503);
    expect((await handleDraftRequest(put(0, page), env, 'main')).status).toBe(503);
    expect((await handleDraftRequest(put(0, page), env, '')).status).toBe(503);
    identity.owner = null;
    expect((await handleDraftRequest(put(0, page), env, scope)).status).toBe(401);
    expect(prepare).not.toHaveBeenCalled();
    expect(db.prepare('SELECT count(*) AS count FROM editor_drafts').get()).toEqual({ count: 0 });
    expect(db.prepare('SELECT count(*) AS count FROM editor_page_drafts').get()).toEqual({ count: 0 });
  });
  it('rejects cross-origin writes, unsupported methods and content types', async () => {
    expect((await handleDraftRequest(request('PUT', {}, { Origin: 'https://attacker.test' }), env, scope)).status).toBe(403);
    const missingOrigin = put();
    missingOrigin.headers.delete('Origin');
    expect((await handleDraftRequest(missingOrigin, env, scope)).status).toBe(403);
    expect((await handleDraftRequest(request('PUT', {}, { 'Sec-Fetch-Site': 'cross-site' }), env, scope)).status).toBe(403);
    expect((await handleDraftRequest(request('POST', {}), env, scope)).status).toBe(405);
    expect((await handleDraftRequest(request('PUT', {}, { 'Content-Type': 'text/plain' }), env, scope)).status).toBe(415);
  });
  it('rejects invalid and oversized documents without writing', async () => {
    expect((await handleDraftRequest(request('PUT', '{'), env, scope)).status).toBe(400);
    expect((await handleDraftRequest(request('PUT', { document: {}, baseRevision: 0 }), env, scope)).status).toBe(422);
    expect((await handleDraftRequest(request('PUT', { document: createDefaultHomeDocument(), baseRevision: -1 }), env, scope)).status).toBe(400);
    expect((await handleDraftRequest(request('PUT', 'x'.repeat(102000)), env, scope)).status).toBe(413);
    const invalid = createDefaultHomeDocument();
    invalid.version = 2 as 1;
    expect((await handleDraftRequest(request('PUT', { document: invalid, baseRevision: 0 }), env, scope)).status).toBe(422);
    expect(db.prepare('SELECT count(*) AS count FROM editor_drafts').get()).toEqual({ count: 0 });
  });
  it('does not leak storage errors', async () => {
    db.exec('DROP TABLE editor_drafts');
    const response = await handleDraftRequest(put(), env, scope);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/SQLITE|editor_drafts|INSERT/);
  });
  it('initializes storage on the first valid non-Home save while leaving Home unchanged', async () => {
    db.exec('DROP TABLE editor_page_drafts');
    expect((await handleDraftRequest(put(), env, scope)).status).toBe(200);
    const before = db.prepare('SELECT * FROM editor_drafts').get();
    const unread = await handleDraftRequest(request('GET', undefined, {}, 'support'), env, scope);
    expect(await unread.json()).toEqual({ draft: null });
    const response = await handleDraftRequest(put(0, 'support'), env, scope);
    expect(response.status).toBe(200);
    expect((await response.json()).draft).toMatchObject({ document: createDefaultPageDocument('support'), revision: 1 });
    expect(db.prepare('SELECT * FROM editor_drafts').get()).toEqual(before);
    expect((await handleDraftRequest(request('GET', undefined, {}, 'support'), env, scope)).status).toBe(200);
    const home = await (await handleDraftRequest(request(), env, scope)).json();
    expect(home.draft.document).toEqual(createDefaultHomeDocument());
  });
  it('preserves an existing Home revision 1 and maintains atomic revisions after migration', async () => {
    db.exec('DROP TABLE editor_page_drafts');
    const document = `\n${serializeHomeDocument(createDefaultHomeDocument())}\n`;
    db.prepare('INSERT INTO editor_drafts VALUES (?, ?, ?, ?, ?, ?)').run(scope, 'verified-owner', 'home', document, 1, '2026-09-30T12:34:56.789Z');
    const before = db.prepare('SELECT * FROM editor_drafts').get();
    applyMultiPageMigration();
    expect(db.prepare('SELECT * FROM editor_drafts').get()).toEqual(before);
    expect((await (await handleDraftRequest(request(), env, scope)).json()).draft).toEqual({
      document: createDefaultHomeDocument(), revision: 1, updatedAt: '2026-09-30T12:34:56.789Z',
    });
    expect((await handleDraftRequest(put(0), env, scope)).status).toBe(409);
    const responses = await Promise.all([
      handleDraftRequest(put(1), env, scope), handleDraftRequest(put(1), env, scope),
    ]);
    expect(responses.map(response => response.status).sort()).toEqual([200, 409]);
    expect((await (await handleDraftRequest(request(), env, scope)).json()).draft.revision).toBe(2);
    expect((await handleDraftRequest(put(0, 'support'), env, scope)).status).toBe(200);
    expect((await (await handleDraftRequest(request(), env, scope)).json()).draft.revision).toBe(2);
  });
});

describe('validated non-Home storage initialization', () => {
  function tableExists() {
    return Boolean(db.prepare('SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'editor_page_drafts\'').get());
  }
  function homeRows() {
    return db.prepare('SELECT *, hex(CAST(document AS BLOB)) AS bytes FROM editor_drafts').all();
  }
  beforeEach(() => {
    db.exec('DROP TABLE editor_page_drafts');
    const document = `\n${serializeHomeDocument(createDefaultHomeDocument())}\n`;
    db.prepare('INSERT INTO editor_drafts VALUES (?, ?, ?, ?, ?, ?)')
      .run(scope, 'verified-owner', 'home', document, 1, '2026-09-30T12:34:56.789Z');
  });
  it('pins the runtime initializer to the exact optional migration SQL', () => {
    expect(multiPageDraftsSchemaSql).toBe(multiPageMigration.replace(/--[^\n]*/g, '').trim());
    const connectionMigration = readFileSync(new URL('../../migrations/0003_connection_editor_drafts.sql', import.meta.url), 'utf8');
    expect(connectionDraftsSchemaSql).toBe(connectionMigration.replace(/--[^\n]*/g, '').trim());
  });
  it('creates only additive connection storage after a validated save and preserves existing rows', async () => {
    const before = homeRows();
    const previousSchema = db.prepare('SELECT * FROM sqlite_master ORDER BY name').all();
    expect((await handleDraftRequest(request('GET', undefined, {}, 'access'), env, scope)).status).toBe(200);
    expect(db.prepare('SELECT * FROM sqlite_master ORDER BY name').all()).toEqual(previousSchema);
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    identity.owner = null;
    expect((await handleDraftRequest(put(0, 'access'), env, scope)).status).toBe(401);
    expect(prepare).not.toHaveBeenCalled();
    identity.owner = 'verified-owner';
    expect((await handleDraftRequest(put(0, 'access'), env, scope)).status).toBe(200);
    expect(homeRows()).toEqual(before);
    expect(tableExists()).toBe(false);
    expect(db.prepare('SELECT page, revision FROM editor_connection_drafts').all()).toEqual([{ page: 'access', revision: 1 }]);
  });
  it('keeps every GET read-only and returns no draft before initialization', async () => {
    const before = homeRows();
    const schema = db.prepare('SELECT * FROM sqlite_master ORDER BY name').all();
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    for (const { id } of pageDefinitions) {
      const response = await handleDraftRequest(request('GET', undefined, {}, id), env, scope);
      expect(response.status).toBe(200);
      const result = await response.json();
      if (id === 'home') expect(result.draft.revision).toBe(1);
      else expect(result).toEqual({ draft: null });
    }
    expect(prepare.mock.calls.every(([sql]) => sql.startsWith('SELECT '))).toBe(true);
    expect(tableExists()).toBe(false);
    expect(homeRows()).toEqual(before);
    expect(db.prepare('SELECT * FROM sqlite_master ORDER BY name').all()).toEqual(schema);
  });
  it('does not initialize new-page storage during a valid Home save', async () => {
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    expect((await handleDraftRequest(put(1), env, scope)).status).toBe(200);
    expect(tableExists()).toBe(false);
    expect(prepare.mock.calls.some(([sql]) => sql.includes('editor_page_drafts'))).toBe(false);
  });
  it.each(['GET', 'PUT'])('rejects anonymous %s before any storage access', async (method) => {
    identity.owner = null;
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    const req = method === 'GET' ? request('GET', undefined, {}, 'support') : put(0, 'support');
    expect((await handleDraftRequest(req, env, scope)).status).toBe(401);
    expect(prepare).not.toHaveBeenCalled();
    expect(tableExists()).toBe(false);
  });
  it.each(['GET', 'PUT'])('rejects production, missing scope, and missing configuration for %s without creating storage', async (method) => {
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    const req = () => method === 'GET' ? request('GET', undefined, {}, 'support') : put(0, 'support');
    expect((await handleDraftRequest(req(), env, 'main')).status).toBe(503);
    expect((await handleDraftRequest(req(), env, '')).status).toBe(503);
    expect((await handleDraftRequest(req(), { ...env, CLASTERIA_ACCESS_AUD: '' }, scope)).status).toBe(503);
    expect((await handleDraftRequest(req(), { CLASTERIA_ACCESS_AUD: 'app' }, scope)).status).toBe(503);
    expect(prepare).not.toHaveBeenCalled();
    expect(tableExists()).toBe(false);
  });
  it.each([
    { label: 'wrong origin', make: () => request('PUT', {}, { Origin: 'https://attacker.test' }, 'support'), status: 403 },
    { label: 'cross-site fetch', make: () => request('PUT', {}, { 'Sec-Fetch-Site': 'cross-site' }, 'support'), status: 403 },
    { label: 'missing origin', make: () => {
      const req = put(0, 'support');
      req.headers.delete('Origin');
      return req;
    }, status: 403 },
    { label: 'wrong content type', make: () => request('PUT', {}, { 'Content-Type': 'text/plain' }, 'support'), status: 415 },
    { label: 'malformed JSON', make: () => request('PUT', '{', {}, 'support'), status: 400 },
    { label: 'missing body', make: () => request('PUT', undefined, {}, 'support'), status: 400 },
    { label: 'invalid envelope', make: () => request('PUT', [], {}, 'support'), status: 400 },
    { label: 'invalid document', make: () => request('PUT', { document: {}, baseRevision: 0 }, {}, 'support'), status: 422 },
    { label: 'wrong document page', make: () => request('PUT', { document: createDefaultHomeDocument(), baseRevision: 0 }, {}, 'support'), status: 422 },
    { label: 'oversized streamed body', make: () => request('PUT', 'x'.repeat(102_000), {}, 'support'), status: 413 },
    { label: 'oversized declared body', make: () => request('PUT', {}, { 'Content-Length': '102000' }, 'support'), status: 413 },
    { label: 'unknown page', make: () => request('PUT', {}, {}, 'anything'), status: 404 },
    { label: 'encoded page', make: () => request('PUT', {}, {}, '%73upport'), status: 404 },
    { label: 'unsupported method', make: () => request('POST', {}, {}, 'support'), status: 405 },
  ])('does not initialize storage for $label', async ({ make, status }) => {
    const before = homeRows();
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    expect((await handleDraftRequest(make(), env, scope)).status).toBe(status);
    expect(prepare).not.toHaveBeenCalled();
    expect(tableExists()).toBe(false);
    expect(homeRows()).toEqual(before);
  });
  it.each([-1, 1.5, null, Number.MAX_SAFE_INTEGER + 1, '0'])('rejects invalid base revision %s before initialization', async (baseRevision) => {
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    const req = request('PUT', { document: createDefaultPageDocument('support'), baseRevision }, {}, 'support');
    expect((await handleDraftRequest(req, env, scope)).status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
    expect(tableExists()).toBe(false);
  });
  it('initializes safely under concurrent first saves and keeps Home bytes and revision intact', async () => {
    const before = homeRows();
    const responses = await Promise.all([
      handleDraftRequest(put(0, 'support'), env, scope),
      handleDraftRequest(put(0, 'support'), env, scope),
      handleDraftRequest(put(0, 'articles'), env, scope),
    ]);
    expect(responses.map(response => response.status)).toEqual([200, 409, 200]);
    expect(homeRows()).toEqual(before);
    expect(db.prepare('SELECT page, revision FROM editor_page_drafts ORDER BY page').all()).toEqual([
      { page: 'articles', revision: 1 }, { page: 'support', revision: 1 },
    ]);
  });
  it('preserves existing new-page rows when later valid saves repeat initialization', async () => {
    expect((await handleDraftRequest(put(0, 'support'), env, scope)).status).toBe(200);
    const before = db.prepare('SELECT * FROM editor_page_drafts WHERE page = ?').get('support');
    expect((await handleDraftRequest(put(0, 'articles'), env, scope)).status).toBe(200);
    expect(db.prepare('SELECT * FROM editor_page_drafts WHERE page = ?').get('support')).toEqual(before);
    const prepare = vi.spyOn(env.CLASTERIA_DRAFTS!, 'prepare');
    expect((await handleDraftRequest(request('GET', undefined, {}, 'support'), env, scope)).status).toBe(200);
    expect(prepare.mock.calls.every(([sql]) => sql.startsWith('SELECT '))).toBe(true);
  });
  it('fails safely if CREATE fails and can retry without changing Home', async () => {
    const before = homeRows();
    db.exec('CREATE INDEX editor_page_drafts ON editor_drafts (updated_at)');
    const response = await handleDraftRequest(put(0, 'support'), env, scope);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/SQLITE|CREATE|editor_page_drafts/);
    expect(tableExists()).toBe(false);
    expect(homeRows()).toEqual(before);
    db.exec('DROP INDEX editor_page_drafts');
    expect((await handleDraftRequest(put(0, 'support'), env, scope)).status).toBe(200);
    expect(homeRows()).toEqual(before);
  });
});
