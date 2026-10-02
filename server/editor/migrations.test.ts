import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultHomeDocument, serializeHomeDocument } from '../../app/utils/homeDocument';

const originalMigration = readFileSync(new URL('../../migrations/0001_editor_drafts.sql', import.meta.url), 'utf8');
const multiPageMigration = readFileSync(new URL('../../migrations/0002_multi_page_editor_drafts.sql', import.meta.url), 'utf8');
const nonHomePages = ['support', 'articles', 'onigokko', 'kakurenbo', 'login', 'register', 'leaderboard', 'codingcraft', 'article-draft'];
let db: InstanceType<typeof Database>;

function legacyRows() {
  return db.prepare('SELECT *, hex(CAST(document AS BLOB)) AS document_bytes FROM editor_drafts ORDER BY scope, owner, page').all();
}
function legacySchema() {
  return db.prepare('SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE tbl_name = \'editor_drafts\' ORDER BY type, name').all();
}

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(originalMigration);
  const insert = db.prepare('INSERT INTO editor_drafts VALUES (?, ?, ?, ?, ?, ?)');
  // Preserve raw whitespace/UTF-8 bytes and opaque identity/scope metadata, not reserialized JSON.
  const document = `\n${serializeHomeDocument(createDefaultHomeDocument())}\n`;
  insert.run('codex/preview', 'opaque-owner-a', 'home', document, 1, '2026-09-30T12:34:56.789Z');
  insert.run('codex/preview', 'opaque-owner-b', 'home', document, 37, '2026-10-01T12:00:00.000Z');
  insert.run('another-branch', 'opaque-owner-a', 'home', document, 2, '2026-10-02T01:00:00.000Z');
});
afterEach(() => db.close());

describe('additive D1 multi-page migration with real SQLite', () => {
  it('is a single idempotent CREATE statement with no data mutation or transaction commands', () => {
    const sql = multiPageMigration.replace(/--[^\n]*/g, '');
    const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS editor_page_drafts\s*\(/);
    expect(sql).not.toMatch(/\b(DROP|DELETE|UPDATE|INSERT|ALTER|BEGIN|COMMIT|ROLLBACK)\b/i);
  });
  it('preserves every Home row byte-for-byte, revisions, owners, scopes, and original schema', () => {
    const rows = legacyRows();
    const schema = legacySchema();
    db.exec(multiPageMigration);
    expect(legacyRows()).toEqual(rows);
    expect(legacySchema()).toEqual(schema);
    expect(db.prepare('SELECT count(*) AS count FROM editor_page_drafts').get()).toEqual({ count: 0 });
    // Reapplying the console statement cannot change either table's stored data.
    db.prepare('INSERT INTO editor_page_drafts VALUES (?, ?, ?, ?, ?, ?)').run('codex/preview', 'opaque-owner-a', 'support', '{}', 4, 'kept');
    const newRows = db.prepare('SELECT * FROM editor_page_drafts').all();
    db.exec(multiPageMigration);
    expect(legacyRows()).toEqual(rows);
    expect(legacySchema()).toEqual(schema);
    expect(db.prepare('SELECT * FROM editor_page_drafts').all()).toEqual(newRows);
  });
  it('permits exactly the nine non-Home IDs in the new table and retains the Home-only table check', () => {
    db.exec(multiPageMigration);
    const insert = db.prepare('INSERT INTO editor_page_drafts VALUES (?, ?, ?, ?, ?, ?)');
    for (const page of nonHomePages) insert.run('scope', 'owner', page, '{}', 1, 'time');
    expect(db.prepare('SELECT page FROM editor_page_drafts ORDER BY page').all()).toEqual(
      [...nonHomePages].sort().map(page => ({ page })),
    );
    for (const page of ['home', 'unknown', 'article-draft/nested', 'support/', '%73upport', '', '__proto__']) {
      expect(() => insert.run('scope', 'owner', page, '{}', 1, 'time')).toThrow(/CHECK constraint/);
    }
    expect(() => db.prepare('INSERT INTO editor_drafts VALUES (?, ?, ?, ?, ?, ?)').run('scope', 'owner', 'support', '{}', 1, 'time')).toThrow(/CHECK constraint/);
  });
  it('preserves byte limits, positive revisions, required fields, and compound uniqueness', () => {
    db.exec(multiPageMigration);
    const insert = db.prepare('INSERT INTO editor_page_drafts VALUES (?, ?, ?, ?, ?, ?)');
    expect(() => insert.run('scope', 'owner', 'support', 'あ'.repeat(33_334), 1, 'time')).toThrow(/CHECK constraint/);
    expect(() => insert.run('scope', 'owner', 'support', '{}', 0, 'time')).toThrow(/CHECK constraint/);
    expect(() => insert.run('scope', null, 'support', '{}', 1, 'time')).toThrow(/NOT NULL constraint/);
    insert.run('scope', 'owner', 'support', 'x'.repeat(100_000), 1, 'time');
    expect(() => insert.run('scope', 'owner', 'support', '{}', 2, 'other-time')).toThrow(/UNIQUE constraint/);
    insert.run('scope', 'other-owner', 'support', '{}', 1, 'time');
    insert.run('other-scope', 'owner', 'support', '{}', 1, 'time');
    insert.run('scope', 'owner', 'articles', '{}', 1, 'time');
  });
  it('leaves Home untouched if the new migration fails and permits a safe retry', () => {
    const rows = legacyRows();
    const schema = legacySchema();
    // A name collision with an index makes CREATE fail before any schema/data change.
    db.exec('CREATE INDEX editor_page_drafts ON editor_drafts (updated_at)');
    expect(() => db.exec(multiPageMigration)).toThrow();
    expect(legacyRows()).toEqual(rows);
    expect(db.prepare('SELECT name FROM sqlite_schema WHERE type = \'table\' AND name = \'editor_page_drafts\'').get()).toBeUndefined();
    db.exec('DROP INDEX editor_page_drafts');
    expect(legacySchema()).toEqual(schema);
    db.exec(multiPageMigration);
    expect(legacyRows()).toEqual(rows);
    expect(legacySchema()).toEqual(schema);
  });
  it('can add the new table without an existing legacy table and never fabricates Home data', () => {
    db.exec('DROP TABLE editor_drafts');
    db.exec(multiPageMigration);
    expect(db.prepare('SELECT name FROM sqlite_schema WHERE type = \'table\' ORDER BY name').all()).toEqual([{ name: 'editor_page_drafts' }]);
  });
});
