-- Apply only to the dedicated editor preview database after migration approval.
-- One additive statement is safe in the D1 console or the migrations runner.
-- Home remains in editor_drafts: no existing rows, bytes, or revisions are changed.
-- Optional setup: the first fully validated non-Home save also applies this exact schema.
CREATE TABLE IF NOT EXISTS editor_page_drafts (
  scope TEXT NOT NULL,
  owner TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page IN (
    'support', 'articles', 'onigokko', 'kakurenbo',
    'login', 'register', 'leaderboard', 'codingcraft', 'article-draft'
  )),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) <= 100000),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, owner, page)
);
