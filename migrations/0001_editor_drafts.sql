-- Apply only to the dedicated editor preview database after provisioning approval.
-- The public site does not read this table. No credentials or emails are stored.
CREATE TABLE IF NOT EXISTS editor_drafts (
  scope TEXT NOT NULL,
  owner TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page = 'home'),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) <= 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, owner, page)
);
