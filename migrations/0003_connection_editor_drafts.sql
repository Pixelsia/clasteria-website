-- Additive, optional connection-page backup storage. Existing rows and schemas are untouched.
-- Reads do not initialize storage; the first validated backup can create this table.
CREATE TABLE IF NOT EXISTS editor_connection_drafts (
  scope TEXT NOT NULL,
  owner TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page = 'access'),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) <= 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, owner, page)
);
