-- ============================================================
--  MouseOJ 数据库 Schema
--  使用方法:
--    npx wrangler d1 execute mouse-oj-db --local  --file=./schema.sql
--    npx wrangler d1 execute mouse-oj-db --remote --file=./schema.sql
-- ============================================================

-- ─── 用户 ───
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,            -- SHA-256 哈希
  avatar     TEXT DEFAULT '',           -- R2 里的 key 或外部 URL
  bio        TEXT DEFAULT '',
  role       TEXT DEFAULT 'user',       -- user / admin
  rating     INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── 题库 ───
CREATE TABLE IF NOT EXISTS problems (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  vjudge_oj   TEXT DEFAULT '',          -- 如 'CodeForces'
  vjudge_prob TEXT DEFAULT '',          -- 如 '159A'
  time_limit  INTEGER DEFAULT 2000,    -- ms
  mem_limit   INTEGER DEFAULT 256,     -- MB
  difficulty  INTEGER DEFAULT 0,       -- 0 未定, 1-5 星
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── 题目标签 ───
CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS problem_tags (
  problem_id INTEGER NOT NULL,
  tag_id     INTEGER NOT NULL,
  PRIMARY KEY (problem_id, tag_id),
  FOREIGN KEY (problem_id) REFERENCES problems(id),
  FOREIGN KEY (tag_id)     REFERENCES tags(id)
);

-- ─── 提交记录 ───
CREATE TABLE IF NOT EXISTS submissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  problem_id    INTEGER NOT NULL,
  language      TEXT NOT NULL,
  code          TEXT NOT NULL,
  vjudge_runid  INTEGER,
  status        TEXT DEFAULT 'Pending',
  runtime       INTEGER DEFAULT 0,
  memory        INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);
CREATE INDEX IF NOT EXISTS idx_sub_user  ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_prob  ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_sub_stat  ON submissions(status);

-- ─── 讨论区版块 ───
CREATE TABLE IF NOT EXISTS forums (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);
-- 初始版块（启动时自动插入）
INSERT OR IGNORE INTO forums (id, name, slug) VALUES (1, '站务公告', 'announce');
INSERT OR IGNORE INTO forums (id, name, slug) VALUES (2, '算法交流', 'algorithm');
INSERT OR IGNORE INTO forums (id, name, slug) VALUES (3, '灌水闲聊', 'water');
INSERT OR IGNORE INTO forums (id, name, slug) VALUES (4, '其他',     'other');

-- ─── 讨论帖 ───
CREATE TABLE IF NOT EXISTS topics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  forum_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  views      INTEGER DEFAULT 0,
  pinned     INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (forum_id) REFERENCES forums(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_topic_forum ON topics(forum_id);

-- ─── 帖子回复 ───
CREATE TABLE IF NOT EXISTS replies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id   INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_reply_topic ON replies(topic_id);

-- ─── 文章社区 ───
CREATE TABLE IF NOT EXISTS articles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  likes      INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── 文章点赞记录 (防重复点赞) ───
CREATE TABLE IF NOT EXISTS article_likes (
  article_id INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  PRIMARY KEY (article_id, user_id)
);

-- ─── 比赛 ───
CREATE TABLE IF NOT EXISTS contests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── 比赛题目关联 ───
CREATE TABLE IF NOT EXISTS contest_problems (
  contest_id INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  label      TEXT DEFAULT 'A',
  PRIMARY KEY (contest_id, problem_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id),
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

-- ─── 工单 ───
CREATE TABLE IF NOT EXISTS tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT DEFAULT 'open',      -- open / resolved / closed
  reply      TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── 私信 ───
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content    TEXT NOT NULL,
  is_read    INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id)   REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_msg_recv ON messages(receiver_id, is_read);

-- 聊天室功能后续用 MongoDB Atlas 独立实现，不在 D1 中建表

-- ─── 题单系统 ───
CREATE TABLE IF NOT EXISTS problem_lists (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_public   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS problem_list_items (
  list_id    INTEGER NOT NULL,
  problem_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (list_id, problem_id),
  FOREIGN KEY (list_id)    REFERENCES problem_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id)
);

-- ─── 团队 ───
CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  owner_id    INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role    TEXT DEFAULT 'member',   -- owner / admin / member
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── 用户关注 ───
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followee_id) REFERENCES users(id)
);

-- ─── 用户动态 ───
CREATE TABLE IF NOT EXISTS activities (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  type       TEXT NOT NULL,          -- ac_problem / post_topic / post_article / create_list / join_team / follow_user
  ref_id     INTEGER,                -- 关联的记录 ID (题目ID/帖子ID/文章ID等)
  content    TEXT DEFAULT '',        -- 冗余描述, 方便展示
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_act_user ON activities(user_id, id);

-- ─── 通知 ───
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,       -- 接收者
  type       TEXT NOT NULL,          -- reply / mention / ticket / contest / follow / message
  title      TEXT NOT NULL,
  content    TEXT DEFAULT '',
  ref_id     INTEGER,                -- 关联记录 ID
  is_read    INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
