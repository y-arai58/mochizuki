-- 望月 / D1 schema
-- 実行: npx wrangler d1 execute mochizuki --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS entries (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL,          -- 'shared' または 'solo:<email>'
  ym           TEXT NOT NULL,          -- 記録した人のローカル月 'YYYY-MM'
  created_at   INTEGER NOT NULL,       -- epoch ms
  author_email TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  text         TEXT NOT NULL
);

-- D1は「読んだ行数」で課金される。絞り込みに使う列には必ずインデックスを張る
CREATE INDEX IF NOT EXISTS idx_entries_group_time ON entries (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_group_ym   ON entries (group_id, ym);

CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY,
  name  TEXT NOT NULL
);
