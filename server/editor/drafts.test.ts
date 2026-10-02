import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultHomeDocument } from '../../app/utils/homeDocument';
import { handleDraftRequest } from './drafts';
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
function request(method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`${origin}/api/editor/home`, {
    method, headers: { 'Origin': origin, 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
function put(baseRevision = 0) {
  return request('PUT', { document: createDefaultHomeDocument(), baseRevision });
}

beforeEach(() => {
  identity.owner = 'verified-owner';
  db = new Database(':memory:');
  db.exec(readFileSync(new URL('../../migrations/0001_editor_drafts.sql', import.meta.url), 'utf8'));
  env = { CLASTERIA_ACCESS_AUD: 'app', CLASTERIA_DRAFTS: {
    prepare(sql) {
      return { bind(...values) {
        return {
          bind() { throw new Error('already bound'); },
          async first<T>() { return (db.prepare(sql).get(...values) ?? null) as T | null; },
        };
      }, async first() { throw new Error('not bound'); } };
    },
  } };
});
afterEach(() => db.close());

describe('server draft API with real SQLite conditional writes', () => {
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
  it('fails closed before querying storage when setup or identity is missing', async () => {
    expect((await handleDraftRequest(put(), {}, scope)).status).toBe(503);
    expect((await handleDraftRequest(put(), env, 'main')).status).toBe(503);
    identity.owner = null;
    expect((await handleDraftRequest(put(), env, scope)).status).toBe(401);
    expect(db.prepare('SELECT count(*) AS count FROM editor_drafts').get()).toEqual({ count: 0 });
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
});
