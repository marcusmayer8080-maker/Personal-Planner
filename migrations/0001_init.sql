-- Planner schema. Every data row belongs to one user (owner_id); the API scopes
-- every query to the signed-in user. Timestamps are ISO-8601 strings (UTC).

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Opaque session tokens; only their SHA-256 is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Failed sign-ins and sign-ups, for rate limiting. `key` is e.g. "login-email:x@y" or "signup-ip:1.2.3.4".
CREATE TABLE auth_attempts (
  key TEXT NOT NULL,
  at  INTEGER NOT NULL
);
CREATE INDEX idx_auth_attempts ON auth_attempts(key, at);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_projects_owner ON projects(owner_id);

CREATE TABLE tasks (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL CHECK (length(text) BETWEEN 1 AND 500),
  done       INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  due        TEXT CHECK (due IS NULL OR due GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  category   TEXT NOT NULL CHECK (category IN ('actions', 'projects', 'sport', 'fun', 'social', 'study', 'spirit')),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_owner ON tasks(owner_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);

CREATE TABLE events (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  time       TEXT NOT NULL DEFAULT '' CHECK (time = '' OR time GLOB '[0-9][0-9]:[0-9][0-9]'),
  title      TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 300),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_events_owner_date ON events(owner_id, date);
