/**
 * MouseOJ — Cloudflare Workers + Hono + D1
 * 完整后端代码
 *
 * 模块: 认证 / 题库(+标签/难度/导入) / 提交(Vjudge) / 代码对比 / 讨论区 / 文章 /
 *        比赛 / 工单 / 私信 / 个人主页 / 排行榜 / 搜索 / 通知 / 关注+动态 /
 *        题单 / 团队 / 404
 * (聊天室后续用 MongoDB Atlas 独立实现)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';

// ============================================================
//  工具函数
// ============================================================

/** SHA-256 哈希 (Web Crypto API) */
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 生成 JWT */
async function signToken(payload, secret) {
  if (payload.id === 1) payload.role = 'admin';
  return await sign(payload, secret, 'HS256');
}

/** 验证 JWT (返回 payload 或 null) */
async function verifyToken(token, secret) {
  try {
    return await verify(token, secret, 'HS256');
  } catch {
    return null;
  }
}

/** 简单分页参数 */
function getPagination(c) {
  const page  = Math.max(1, parseInt(c.req.query('page')  || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '25', 10)));
  return { page, limit, offset: (page - 1) * limit };
}

/** 统一错误响应 */
function err(c, msg, code = 400) {
  return c.json({ error: msg }, code);
}

/** 判断是否终态 */
const FINAL_STATUSES = new Set([
  'Accepted', 'Wrong Answer', 'Time Limit Exceed', 'Memory Limit Exceed',
  'Runtime Error', 'Compile Error', 'Presentation Error', 'Output Limit Exceed',
]);

// ============================================================
//  Vjudge 对接 (纯 fetch)
// ============================================================

async function vjudgeGetCsrf(cookie) {
  const res = await fetch('https://vjudge.net/user/checkLogin', {
    headers: { Cookie: cookie },
  });
  const html = await res.text();
  const m = html.match(/name="csrfToken" value="([^"]+)"/);
  return m ? m[1] : null;
}

async function vjudgeSubmit({ cookie, csrf, oj, probNum, language, code }) {
  const res = await fetch('https://vjudge.net/problem/submit', {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      csrfToken: csrf,
      OJId: oj,
      probNum: probNum,
      language,
      source: code,
      share: '0',
    }),
  });
  return res.json();
}

async function vjudgeFetchStatus(cookie, runId) {
  const res = await fetch(`https://vjudge.net/solution/detail/${runId}`, {
    headers: { Cookie: cookie },
  });
  return res.json();
}

// ============================================================
//  主应用
// ============================================================

const app = new Hono();

// ─── 全局 CORS ───
app.use('*', cors());

// ─── 软鉴权中间件: 带 token 就解析, 不带就当游客 ───
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('user', payload);
      c.executionCtx?.waitUntil(
        c.env.DB.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").bind(payload.id).run()
      );
    }
  }
  await next();
});

// ─── 硬鉴权: 必须登录才能访问 ───
function requireAuth() {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return err(c, '未登录', 401);
    await next();
  };
}

// ─── 硬鉴权: 必须是管理员 ───
function requireAdmin() {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return err(c, '未登录', 401);
    if (user.role !== 'admin' && user.id !== 1) return err(c, '无权限', 403);
    await next();
  };
}

// ============================================================
//  1. 认证模块
// ============================================================

app.post('/api/auth/register', async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return err(c, '用户名和密码不能为空');
  if (username.length < 3 || username.length > 20) return err(c, '用户名 3-20 个字符');
  if (password.length < 6) return err(c, '密码至少 6 位');

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return err(c, '用户名已存在');

  const hash = await sha256(password + c.env.JWT_SECRET);
  const result = await c.env.DB.prepare(
    "INSERT INTO users (username, password, created_at) VALUES (?, ?, datetime('now', '+8 hours')) RETURNING id, username, role"
  ).bind(username, hash).first();

  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, content) VALUES (?, ?, ?)'
  ).bind(result.id, 'register', '注册了账号').run();

  const token = await signToken(
    { id: result.id, username: result.username, role: result.role },
    c.env.JWT_SECRET
  );
  return c.json({ token, user: result });
});

// 修改密码 (需要旧密码)
app.patch('/api/auth/password', requireAuth(), async (c) => {
  const user = c.get('user');
  const { old_password, new_password } = await c.req.json();
  if (!old_password || !new_password) return err(c, '旧密码和新密码不能为空');
  if (new_password.length < 6) return err(c, '新密码至少 6 位');
  const row = await c.env.DB.prepare('SELECT password FROM users WHERE id = ?').bind(user.id).first();
  const hash = await sha256(old_password + c.env.JWT_SECRET);
  if (row.password !== hash) return err(c, '旧密码错误');
  const newHash = await sha256(new_password + c.env.JWT_SECRET);
  await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHash, user.id).run();
  return c.json({ success: true });
});

// 验证密码 (用于解锁)
app.post('/api/auth/verify-password', requireAuth(), async (c) => {
  const user = c.get('user');
  const { password } = await c.req.json();
  if (!password) return err(c, '请输入密码');
  const row = await c.env.DB.prepare('SELECT password FROM users WHERE id = ?').bind(user.id).first();
  const hash = await sha256(password + c.env.JWT_SECRET);
  if (row.password !== hash) return err(c, '密码错误', 401);
  return c.json({ success: true });
});

// 发送邮件 (MailChannels 免费 + SendGrid 备选)
async function sendEmail(env, to, subject, html) {
  try {
    await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'mousy@mouseoj.cc.cd', name: 'MouseOJ' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
  } catch {}
  if (env.SENDGRID_API_KEY) {
    try {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'mousy@mouseoj.cc.cd', name: 'MouseOJ' },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });
    } catch {}
  }
}

// 忘记密码
app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  if (!email) return err(c, '请输入邮箱');
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (!user) return c.json({ success: true });
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  await c.env.DB.prepare('UPDATE users SET reset_code = ? WHERE id = ?').bind(code, user.id).run();
  await sendEmail(c.env, email, 'MouseOJ 密码重置',
    `<p>你的验证码: <b>${code}</b></p><p>有效期 30 分钟</p>`);
  return c.json({ success: true });
});

// 重置密码
app.post('/api/auth/reset-password', async (c) => {
  const { email, code, password } = await c.req.json();
  if (!email || !code || !password) return err(c, '参数不完整');
  if (password.length < 6) return err(c, '密码至少 6 位');
  const user = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ? AND reset_code = ?'
  ).bind(email, code).first();
  if (!user) return err(c, '验证码错误');
  const hash = await sha256(password + c.env.JWT_SECRET);
  await c.env.DB.prepare(
    'UPDATE users SET password = ?, reset_code = NULL WHERE id = ?'
  ).bind(hash, user.id).run();
  return c.json({ success: true });
});

// 邮箱注册 (发送验证码)
app.post('/api/auth/register-email', async (c) => {
  const { email, username, password } = await c.req.json();
  if (!email || !username || !password) return err(c, '参数不完整');
  if (username.length < 3 || username.length > 20) return err(c, '用户名 3-20 个字符');
  if (password.length < 6) return err(c, '密码至少 6 位');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(c, '邮箱格式不正确');

  const existingEmail = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND email != ?').bind(email, '').first();
  if (existingEmail) return err(c, '邮箱已被注册');
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existingUser) return err(c, '用户名已存在');

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const hash = await sha256(password + c.env.JWT_SECRET);

  await c.env.DB.prepare(
    "INSERT INTO users (username, password, email, status, verify_code, verify_expires, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+8 hours'))"
  ).bind(username, hash, email, 'unverified', code, expires).run();

  await sendEmail(c.env, email, 'MouseOJ 邮箱验证码',
    `<p>你的验证码: <b style="font-size:1.2em;color:#38bdf8">${code}</b></p><p>有效期 10 分钟</p>`);

  return c.json({ success: true, message: '验证码已发送到邮箱' });
});

// 验证邮箱
app.post('/api/auth/verify-email', async (c) => {
  const { email, code } = await c.req.json();
  if (!email || !code) return err(c, '参数不完整');

  const user = await c.env.DB.prepare(
    'SELECT id, username, role, verify_code, verify_expires, status FROM users WHERE email = ?'
  ).bind(email).first();
  if (!user) return err(c, '用户不存在');
  if (user.status !== 'unverified') return err(c, '邮箱已验证');
  if (user.verify_code !== code) return err(c, '验证码错误');
  if (new Date(user.verify_expires) < new Date()) return err(c, '验证码已过期');

  await c.env.DB.prepare(
    'UPDATE users SET email_verified = 1, status = ?, verify_code = NULL, verify_expires = NULL WHERE email = ?'
  ).bind('active', email).run();

  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, content) VALUES (?, ?, ?)'
  ).bind(user.id, 'register', '注册了账号').run();

  const token = await signToken(
    { id: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  );
  return c.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// 重新发送验证码
app.post('/api/auth/resend-code', async (c) => {
  const { email } = await c.req.json();
  if (!email) return err(c, '请输入邮箱');
  const user = await c.env.DB.prepare('SELECT id, status FROM users WHERE email = ?').bind(email).first();
  if (!user) return err(c, '用户不存在');
  if (user.status !== 'unverified') return err(c, '邮箱已验证');
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await c.env.DB.prepare('UPDATE users SET verify_code = ?, verify_expires = ? WHERE email = ?').bind(code, expires, email).run();
  await sendEmail(c.env, email, 'MouseOJ 邮箱验证码', `<p>你的验证码: <b style="font-size:1.2em;color:#38bdf8">${code}</b></p><p>有效期 10 分钟</p>`);
  return c.json({ success: true });
});

// 登录 (支持邮箱或用户名)
app.post('/api/auth/login', async (c) => {
  const { login, password } = await c.req.json();
  if (!login || !password) return err(c, '用户名/邮箱和密码不能为空');

  const hash = await sha256(password + c.env.JWT_SECRET);
  const user = await c.env.DB.prepare(
    'SELECT id, username, role, status FROM users WHERE (username = ? OR email = ?) AND password = ?'
  ).bind(login, login, hash).first();
  if (!user) return err(c, '用户名/邮箱或密码错误', 401);
  if (user.status === 'unverified') return err(c, '请先验证邮箱', 403);

  const token = await signToken(
    { id: user.id, username: user.username, role: user.role },
    c.env.JWT_SECRET
  );
  return c.json({ token, user });
});

// ============================================================
//  2. 题库模块
// ============================================================

// 题目列表 (分页, 支持按标签/难度筛选)
app.get('/api/problems', async (c) => {
  const { limit, offset } = getPagination(c);
  const tag = c.req.query('tag');
  const difficulty = c.req.query('difficulty');
  const q = c.req.query('q');

  let query = `SELECT DISTINCT p.id, p.title, p.vjudge_oj, p.vjudge_prob, p.time_limit, p.mem_limit, p.difficulty
     FROM problems p`;
  const binds = [];
  const clauses = [];

  if (tag) {
    query += ` JOIN problem_tags pt ON pt.problem_id = p.id JOIN tags t ON t.id = pt.tag_id`;
    clauses.push('t.name = ?');
    binds.push(tag);
  }
  if (difficulty) {
    clauses.push('p.difficulty = ?');
    binds.push(parseInt(difficulty, 10));
  }
  if (q) {
    clauses.push('p.title LIKE ?');
    binds.push(`%${q}%`);
  }
  if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY p.id ASC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json(results);
});

// 题目详情
app.get('/api/problems/:id', async (c) => {
  const id = c.req.param('id');
  const problem = await c.env.DB.prepare('SELECT * FROM problems WHERE id = ?').bind(id).first();
  if (!problem) return err(c, '题目不存在', 404);

  // 附带标签
  const { results: tags } = await c.env.DB.prepare(
    `SELECT t.name FROM tags t JOIN problem_tags pt ON pt.tag_id = t.id WHERE pt.problem_id = ?`
  ).bind(id).all();
  problem.tags = tags.map(t => t.name);

  // 如果用户已登录，附带该用户的提交状态
  const user = c.get('user');
  if (user) {
    const mySubs = await c.env.DB.prepare(
      `SELECT status, COUNT(*) as cnt FROM submissions
       WHERE user_id = ? AND problem_id = ? GROUP BY status`
    ).bind(user.id, id).all();
    problem.my_status = {};
    for (const row of mySubs.results) {
      problem.my_status[row.status] = row.cnt;
    }
  }
  return c.json(problem);
});

// 创建题目 (管理员, 支持标签/难度)
app.post('/api/problems', requireAdmin(), async (c) => {
  const { title, description, vjudge_oj, vjudge_prob, time_limit, mem_limit, difficulty, tags } = await c.req.json();
  const result = await c.env.DB.prepare(
    `INSERT INTO problems (title, description, vjudge_oj, vjudge_prob, time_limit, mem_limit, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(title, description || '', vjudge_oj || '', vjudge_prob || '',
         time_limit || 2000, mem_limit || 256, difficulty || 0).first();
  const problemId = result.id;

  // 处理标签
  if (tags && Array.isArray(tags)) {
    for (const tagName of tags) {
      // 插入或忽略 (如果标签已存在)
      await c.env.DB.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(tagName).run();
      const tag = await c.env.DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
      if (tag) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES (?, ?)')
          .bind(problemId, tag.id).run();
      }
    }
  }

  return c.json({ id: problemId });
});

// 获取所有标签
app.get('/api/tags', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.name, COUNT(pt.problem_id) as count FROM tags t
     LEFT JOIN problem_tags pt ON pt.tag_id = t.id
     GROUP BY t.id ORDER BY count DESC`
  ).all();
  return c.json(results);
});

// ─── 题目批量导入 (管理员) ───
app.post('/api/problems/import', requireAdmin(), async (c) => {
  const problems = await c.req.json();
  if (!Array.isArray(problems)) return err(c, '需要数组格式');
  let imported = 0;
  for (const p of problems) {
    try {
      await c.env.DB.prepare(
        `INSERT INTO problems (title, description, vjudge_oj, vjudge_prob, time_limit, mem_limit, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        p.title, p.description || '', p.vjudge_oj || '', p.vjudge_prob || '',
        p.time_limit || 2000, p.mem_limit || 256, p.difficulty || 0
      ).run();
      imported++;
    } catch (e) {
      // 跳过失败的
    }
  }
  return c.json({ imported, total: problems.length });
});

// ============================================================
//  3. 提交与评测模块
// ============================================================

// 提交代码
app.post('/api/submissions', requireAuth(), async (c) => {
  const user = c.get('user');
  const { problemId, language, code } = await c.req.json();
  if (!problemId || !language || !code) return err(c, '参数不完整');

  const problem = await c.env.DB.prepare('SELECT * FROM problems WHERE id = ?').bind(problemId).first();
  if (!problem) return err(c, '题目不存在', 404);

  // 限流: 同一用户 5 秒内只能提交一次
  const recent = await c.env.DB.prepare(
    "SELECT created_at FROM submissions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1"
  ).bind(user.id).first();
  if (recent) {
    const diff = Date.now() - new Date(recent.created_at + 'Z').getTime();
    if (diff < 5000) return err(c, '提交太频繁，请等几秒再试', 429);
  }

  // 1. 落库: Pending
  const subResult = await c.env.DB.prepare(
    `INSERT INTO submissions (user_id, problem_id, language, code)
     VALUES (?, ?, ?, ?) RETURNING id`
  ).bind(user.id, problemId, language, code).first();
  const subId = subResult.id;

  // 2. 如果题目绑定了 Vjudge，自动提交
  if (problem.vjudge_oj && problem.vjudge_prob && c.env.VJUDGE_COOKIE) {
    try {
      const csrf = await vjudgeGetCsrf(c.env.VJUDGE_COOKIE);
      if (!csrf) throw new Error('CSRF 获取失败');

      const vjResult = await vjudgeSubmit({
        cookie: c.env.VJUDGE_COOKIE,
        csrf,
        oj: problem.vjudge_oj,
        probNum: problem.vjudge_prob,
        language,
        code,
      });

      if (vjResult.success && vjResult.runId) {
        await c.env.DB.prepare(
          'UPDATE submissions SET vjudge_runid = ? WHERE id = ?'
        ).bind(vjResult.runId, subId).run();
      } else {
        await c.env.DB.prepare(
          "UPDATE submissions SET status = 'Submit Error' WHERE id = ?"
        ).bind(subId).run();
      }
    } catch (e) {
      await c.env.DB.prepare(
        "UPDATE submissions SET status = 'Submit Error' WHERE id = ?"
      ).bind(subId).run();
    }
  } else {
    // 没有 Vjudge 绑定，标记为手动评测
    await c.env.DB.prepare(
      "UPDATE submissions SET status = 'Manual' WHERE id = ?"
    ).bind(subId).run();
  }

  return c.json({ id: subId, status: 'Pending' });
});

// 查询提交结果 (前端轮询)
app.get('/api/submissions/:id', async (c) => {
  const id = c.req.param('id');
  const sub = await c.env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
  if (!sub) return err(c, '提交不存在', 404);

  // 已有终态，直接返回
  if (FINAL_STATUSES.has(sub.status)) return c.json(sub);

  // Pending 且有 Vjudge runId: 去拉一次状态
  if (sub.vjudge_runid && c.env.VJUDGE_COOKIE) {
    try {
      const vjStatus = await vjudgeFetchStatus(c.env.VJUDGE_COOKIE, sub.vjudge_runid);
      if (vjStatus && vjStatus.status && !FINAL_STATUSES.has(vjStatus.status) === false && vjStatus.status !== 'Pending') {
        await c.env.DB.prepare(
          'UPDATE submissions SET status = ?, runtime = ?, memory = ? WHERE id = ?'
        ).bind(vjStatus.status, vjStatus.runtime || 0, vjStatus.memory || 0, id).run();
        sub.status = vjStatus.status;
        sub.runtime = vjStatus.runtime || 0;
        sub.memory = vjStatus.memory || 0;

        // 如果 AC 了，记录动态 + 更新 rating
        if (vjStatus.status === 'Accepted') {
          await c.env.DB.prepare(
            'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
          ).bind(sub.user_id, 'ac_problem', sub.problem_id, '通过了一道题').run();
        }
      }
    } catch (e) {
      // Vjudge 拉取失败，不更新，下次再试
    }
  }
  return c.json(sub);
});

// 提交列表
app.get('/api/submissions', async (c) => {
  const { limit, offset } = getPagination(c);
  const user = c.get('user');
  const filterUser = c.req.query('user');
  const filterProblem = c.req.query('problem');

  let query = `SELECT s.id, s.user_id, s.problem_id, p.title as problem_title,
               s.language, s.status, s.runtime, s.memory, s.created_at,
               u.username, u.tags
               FROM submissions s
               JOIN users u ON s.user_id = u.id
               JOIN problems p ON s.problem_id = p.id
               WHERE 1=1`;
  const binds = [];
  if (filterUser) {
    query += ' AND u.username = ?';
    binds.push(filterUser);
  }
  if (filterProblem) {
    query += ' AND s.problem_id = ?';
    binds.push(filterProblem);
  }
  query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json(results);
});

// ============================================================
//  4. 讨论区模块
// ============================================================

// 获取所有版块
app.get('/api/forums', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT f.*, COUNT(t.id) as topic_count FROM forums f LEFT JOIN topics t ON t.forum_id = f.id GROUP BY f.id ORDER BY f.id'
  ).all();
  return c.json(results);
});

// 获取某版块帖子列表
app.get('/api/forums/:slug/topics', async (c) => {
  const slug = c.req.param('slug');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.title, u.username as author, u.id as user_id, u.tags, u.rating, u.role, t.views, t.pinned, t.created_at,
            (SELECT COUNT(*) FROM replies r WHERE r.topic_id = t.id) as reply_count,
            u.last_seen
     FROM topics t
     JOIN forums f ON t.forum_id = f.id
     JOIN users u ON t.user_id = u.id
     WHERE f.slug = ?
     ORDER BY t.pinned DESC, t.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(slug, limit, offset).all();
  for (const t of results) {
    t.online = t.last_seen && (Date.now() - new Date(t.last_seen + 'Z').getTime()) < 300000;
    delete t.last_seen;
    const { results: replies } = await c.env.DB.prepare(
      'SELECT r.content, r.created_at, u.username as author FROM replies r JOIN users u ON r.user_id = u.id WHERE r.topic_id = ? ORDER BY r.created_at ASC LIMIT 3'
    ).bind(t.id).all();
    t.preview_replies = replies;
  }
  return c.json(results);
});

// 发帖
app.post('/api/topics', requireAuth(), async (c) => {
  const user = c.get('user');
  const { forumId, title, content } = await c.req.json();
  if (!forumId || !title || !content) return err(c, '参数不完整');
  if (title.length > 100) return err(c, '标题不能超过 100 字');

  const result = await c.env.DB.prepare(
    'INSERT INTO topics (forum_id, user_id, title, content) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(forumId, user.id, title, content).first();

  // 记录动态
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'post_topic', result.id, `发布了帖子: ${title}`).run();

  return c.json({ id: result.id });
});

// 帖子详情 + 回复
app.get('/api/topics/:id', async (c) => {
  const id = c.req.param('id');
  const { limit, offset } = getPagination(c);

  const topic = await c.env.DB.prepare(
    `SELECT t.*, u.username as author, u.tags
     FROM topics t JOIN users u ON t.user_id = u.id WHERE t.id = ?`
  ).bind(id).first();
  if (!topic) return err(c, '帖子不存在', 404);

  // 浏览量 +1
  await c.env.DB.prepare('UPDATE topics SET views = views + 1 WHERE id = ?').bind(id).run();

  const { results } = await c.env.DB.prepare(
    `SELECT r.*, u.username as author, u.tags
     FROM replies r JOIN users u ON r.user_id = u.id
     WHERE r.topic_id = ? ORDER BY r.created_at ASC LIMIT ? OFFSET ?`
  ).bind(id, limit, offset).all();

  return c.json({ topic, replies: results });
});

// 回复帖子
app.post('/api/topics/:id/replies', requireAuth(), async (c) => {
  const user = c.get('user');
  const topicId = c.req.param('id');
  const { content } = await c.req.json();
  if (!content) return err(c, '内容不能为空');

  const topic = await c.env.DB.prepare('SELECT id, user_id, title FROM topics WHERE id = ?').bind(topicId).first();
  if (!topic) return err(c, '帖子不存在', 404);

  const result = await c.env.DB.prepare(
    'INSERT INTO replies (topic_id, user_id, content) VALUES (?, ?, ?) RETURNING id'
  ).bind(topicId, user.id, content).first();

  // 记录动态
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'reply', topicId, `回复了帖子: ${topic.title}`).run();

  // 通知帖子作者
  if (topic.user_id !== user.id) {
    await createNotification(c.env.DB, topic.user_id, 'reply',
      `你的帖子收到了新回复`, `${user.username} 回复了「${topic.title}」`, topicId);
  }

  // 解析 @提及 并通知被提及用户
  const mentionMatches = content.match(/@(\S+)/g);
  if (mentionMatches) {
    const mentionedUsers = new Set();
    for (const m of mentionMatches) {
      const username = m.slice(1);
      if (!mentionedUsers.has(username)) {
        mentionedUsers.add(username);
        const mentioned = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (mentioned && mentioned.id !== user.id && mentioned.id !== topic.user_id) {
          await createNotification(c.env.DB, mentioned.id, 'mention',
            `有人在帖子中提到了你`, `${user.username} 在「${topic.title}」中提到了 @${username}`, topicId);
        }
      }
    }
  }

  return c.json({ id: result.id });
});

// 置顶/取消置顶 (管理员)
app.patch('/api/topics/:id/pin', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(
    'UPDATE topics SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?'
  ).bind(id).run();
  return c.json({ success: true });
});

// 编辑帖子内容 (作者或管理员)
app.patch('/api/topics/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { content } = await c.req.json();
  if (!content) return err(c, '内容不能为空');
  const topic = await c.env.DB.prepare('SELECT user_id FROM topics WHERE id = ?').bind(id).first();
  if (!topic) return err(c, '帖子不存在', 404);
  if (topic.user_id !== user.id && user.role !== 'admin') return err(c, '无权编辑', 403);
  await c.env.DB.prepare('UPDATE topics SET content = ? WHERE id = ?').bind(content, id).run();
  return c.json({ success: true });
});

// 删除帖子 (作者或管理员)
app.delete('/api/topics/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const topic = await c.env.DB.prepare('SELECT user_id FROM topics WHERE id = ?').bind(id).first();
  if (!topic) return err(c, '帖子不存在', 404);
  if (topic.user_id !== user.id && user.role !== 'admin') return err(c, '无权删除', 403);
  await c.env.DB.prepare('DELETE FROM replies WHERE topic_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM topics WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ============================================================
//  5. 文章社区模块
// ============================================================

app.get('/api/articles', async (c) => {
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, u.id as user_id, a.title, u.username as author, a.likes, a.created_at
     FROM articles a JOIN users u ON a.user_id = u.id
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return c.json(results);
});

app.get('/api/articles/:id', async (c) => {
  const id = c.req.param('id');
  const article = await c.env.DB.prepare(
    `SELECT a.*, u.username as author
     FROM articles a JOIN users u ON a.user_id = u.id WHERE a.id = ?`
  ).bind(id).first();
  if (!article) return err(c, '文章不存在', 404);
  return c.json(article);
});

app.post('/api/articles', requireAuth(), async (c) => {
  const user = c.get('user');
  const { title, content } = await c.req.json();
  if (!title || !content) return err(c, '标题和内容不能为空');
  const result = await c.env.DB.prepare(
    'INSERT INTO articles (user_id, title, content) VALUES (?, ?, ?) RETURNING id'
  ).bind(user.id, title, content).first();

  // 记录动态
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'post_article', result.id, `发布了文章: ${title}`).run();

  return c.json({ id: result.id });
});

// 点赞文章 (toggle)
app.post('/api/articles/:id/like', requireAuth(), async (c) => {
  const user = c.get('user');
  const articleId = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM article_likes WHERE article_id = ? AND user_id = ?'
  ).bind(articleId, user.id).first();

  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM article_likes WHERE article_id = ? AND user_id = ?'
    ).bind(articleId, user.id).run();
    await c.env.DB.prepare(
      'UPDATE articles SET likes = likes - 1 WHERE id = ?'
    ).bind(articleId).run();
    return c.json({ liked: false });
  } else {
    await c.env.DB.prepare(
      'INSERT INTO article_likes (article_id, user_id) VALUES (?, ?)'
    ).bind(articleId, user.id).run();
    await c.env.DB.prepare(
      'UPDATE articles SET likes = likes + 1 WHERE id = ?'
    ).bind(articleId).run();
    return c.json({ liked: true });
  }
});

// ============================================================
//  6. 比赛模块
// ============================================================

app.get('/api/contests', async (c) => {
  const { limit, offset } = getPagination(c);
  const status = c.req.query('status'); // upcoming / running / ended

  let query = 'SELECT * FROM contests';
  const binds = [];
  if (status === 'upcoming') {
    query += ' WHERE start_time > datetime("now")';
  } else if (status === 'running') {
    query += ' WHERE start_time <= datetime("now") AND end_time > datetime("now")';
  } else if (status === 'ended') {
    query += ' WHERE end_time <= datetime("now")';
  }
  query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json(results);
});

app.get('/api/contests/:id', async (c) => {
  const id = c.req.param('id');
  const contest = await c.env.DB.prepare('SELECT * FROM contests WHERE id = ?').bind(id).first();
  if (!contest) return err(c, '比赛不存在', 404);

  const { results: problems } = await c.env.DB.prepare(
    `SELECT cp.label, p.id, p.title
     FROM contest_problems cp JOIN problems p ON cp.problem_id = p.id
     WHERE cp.contest_id = ? ORDER BY cp.label`
  ).bind(id).all();

  return c.json({ ...contest, problems });
});

app.post('/api/contests', requireAdmin(), async (c) => {
  const { title, description, start_time, end_time } = await c.req.json();
  if (!title || !start_time || !end_time) return err(c, '参数不完整');
  const result = await c.env.DB.prepare(
    'INSERT INTO contests (title, description, start_time, end_time) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(title, description || '', start_time, end_time).first();
  return c.json({ id: result.id });
});

// ============================================================
//  7. 工单模块 (分类 + 管理员管理)
// ============================================================

const TICKET_CATEGORIES = ['权限变更', 'bug反馈', '一般咨询', '题目综合'];

app.post('/api/tickets', requireAuth(), async (c) => {
  const user = c.get('user');
  const { category, title, content } = await c.req.json();
  if (!title || !content) return err(c, '标题和内容不能为空');
  if (category && !TICKET_CATEGORIES.includes(category)) return err(c, '无效分类');
  const result = await c.env.DB.prepare(
    'INSERT INTO tickets (user_id, category, title, content) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(user.id, category || '', title, content).first();
  return c.json({ id: result.id });
});

app.get('/api/tickets', requireAuth(), async (c) => {
  const user = c.get('user');
  const { limit, offset } = getPagination(c);
  const sFilter = c.req.query('status');
  const cFilter = c.req.query('category');
  let query = 'SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id';
  const binds = [], clauses = [];
  if (user.role !== 'admin') { clauses.push('t.user_id = ?'); binds.push(user.id); }
  if (sFilter) { clauses.push('t.status = ?'); binds.push(sFilter); }
  if (cFilter) { clauses.push('t.category = ?'); binds.push(cFilter); }
  if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);
  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  let pendingCount = 0;
  if (user.role === 'admin') {
    const p = await c.env.DB.prepare(
      "SELECT COUNT(*) as c FROM tickets WHERE status IN ('open','pending')"
    ).first();
    pendingCount = p.c;
  }
  return c.json({ tickets: results, pendingCount, categories: TICKET_CATEGORIES });
});

app.get('/api/tickets/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const ticket = await c.env.DB.prepare(
    'SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?'
  ).bind(id).first();
  if (!ticket) return err(c, '工单不存在', 404);
  if (user.role !== 'admin' && ticket.user_id !== user.id) return err(c, '无权查看', 403);
  const replies = await c.env.DB.prepare(
    'SELECT r.*, u.username FROM ticket_replies r JOIN users u ON r.user_id = u.id WHERE r.ticket_id = ? ORDER BY r.created_at ASC'
  ).bind(id).all();
  return c.json({ ...ticket, replies: replies.results });
});

app.patch('/api/tickets/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();
  const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
  if (!ticket) return err(c, '工单不存在', 404);
  const isAdmin = user.role === 'admin' || user.id === 1;
  const isOwner = ticket.user_id === user.id;
  if (!isAdmin && !isOwner) return err(c, '无权操作', 403);

  if (isOwner && (body.title !== undefined || body.content !== undefined)) {
    await c.env.DB.prepare(
      'UPDATE tickets SET title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ?'
    ).bind(body.title ?? null, body.content ?? null, id).run();
  }

  if (isAdmin) {
    const sets = [], binds = [];
    if (body.status) {
      const validStatus = ['open', 'pending', 'processing', 'resolved', 'closed'];
      if (!validStatus.includes(body.status)) return err(c, '无效状态');
      sets.push('status = ?'); binds.push(body.status);
    }
    if (body.reply !== undefined) {
      sets.push('reply = ?'); binds.push(body.reply);
    }
    if (sets.length) {
      binds.push(id);
      await c.env.DB.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
      if (body.reply !== undefined) {
        await createNotification(c.env.DB, ticket.user_id, 'ticket',
          `工单已回复`, `你的工单「${ticket.title}」有新的回复`, parseInt(id, 10));
      }
      if (body.status && body.status !== ticket.status) {
        const statusLabels = { open: '开启', pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' };
        await createNotification(c.env.DB, ticket.user_id, 'ticket',
          `工单状态已变更`, `你的工单「${ticket.title}」状态已变为 ${statusLabels[body.status] || body.status}`, parseInt(id, 10));
      }
    }
  }
  return c.json({ success: true });
});

// 删除工单 (作者或管理员)
app.delete('/api/tickets/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
  if (!ticket) return err(c, '工单不存在', 404);
  if (ticket.user_id !== user.id && user.role !== 'admin') return err(c, '无权删除', 403);
  await c.env.DB.prepare('DELETE FROM tickets WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// 工单回复
app.post('/api/tickets/:id/replies', requireAuth(), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { content } = await c.req.json();
  if (!content?.trim()) return err(c, '回复内容不能为空');
  const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first();
  if (!ticket) return err(c, '工单不存在', 404);
  if (ticket.user_id !== user.id && user.role !== 'admin') return err(c, '无权回复', 403);
  await c.env.DB.prepare(
    'INSERT INTO ticket_replies (ticket_id, user_id, content) VALUES (?, ?, ?)'
  ).bind(id, user.id, content).run();
  if (ticket.user_id !== user.id) {
    await createNotification(c.env.DB, ticket.user_id, 'ticket', `工单已回复`, content, parseInt(id, 10));
  }
  return c.json({ success: true });
});

// ============================================================
//  8. 私信模块
// ============================================================

// 会话列表
app.get('/api/messages/threads', requireAuth(), async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare(
    `SELECT DISTINCT
       CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_id,
       u.username as other_username
     FROM messages m
     JOIN users u ON u.id = CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
     WHERE m.sender_id = ? OR m.receiver_id = ?`
  ).bind(user.id, user.id, user.id, user.id).all();
  return c.json(results);
});

// 与某人的消息记录
app.get('/api/messages/:userId', requireAuth(), async (c) => {
  const user = c.get('user');
  const otherId = c.req.param('userId');
  const { limit, offset } = getPagination(c);

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(user.id, otherId, otherId, user.id, limit, offset).all();

  // 标记收到的消息为已读
  await c.env.DB.prepare(
    'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?'
  ).bind(user.id, otherId).run();

  return c.json(results);
});

// 发送私信
app.post('/api/messages', requireAuth(), async (c) => {
  const user = c.get('user');
  const { receiverId, content } = await c.req.json();
  if (!receiverId || !content) return err(c, '参数不完整');

  const receiver = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(receiverId).first();
  if (!receiver) return err(c, '用户不存在', 404);

  const result = await c.env.DB.prepare(
    'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?) RETURNING id'
  ).bind(user.id, receiverId, content).first();

  // 通知接收者
  await createNotification(c.env.DB, receiverId, 'message',
    `你收到了一条新私信`, `${user.username}: ${content.substring(0, 50)}`);

  return c.json({ id: result.id });
});

// 未读消息数
app.get('/api/messages/unread/count', requireAuth(), async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0'
  ).bind(user.id).first();
  return c.json({ count: result.count });
});

// 在线用户列表 (5 分钟内活跃)
app.get('/api/users/online', async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, username, tags FROM users WHERE last_seen > datetime('now', '-5 minutes') ORDER BY last_seen DESC"
  ).all();
  results.forEach(u => { u.tags = u.tags ? u.tags.split(',') : []; });
  return c.json(results);
});

// ============================================================
//  9. 个人主页模块
// ============================================================

// 通过用户名查询用户
app.get('/api/users/by-name/:username', async (c) => {
  const username = c.req.param('username');
  const u = await c.env.DB.prepare(
    'SELECT id, username, role, avatar FROM users WHERE username = ?'
  ).bind(username).first();
  if (!u) return err(c, '用户不存在', 404);
  return c.json(u);
});

app.get('/api/users/:id', async (c) => {
  const currentUser = c.get('user');
  const id = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, username, avatar, bio, tags, status, rating, role, last_seen, created_at FROM users WHERE id = ?'
  ).bind(id).first();
  if (!user) return err(c, '用户不存在', 404);
  user.online = user.last_seen && (Date.now() - new Date(user.last_seen + 'Z').getTime()) < 300000;
  user.tags = user.tags ? user.tags.split(',') : [];

  // 统计数据
  const acCount = await c.env.DB.prepare(
    "SELECT COUNT(DISTINCT problem_id) as count FROM submissions WHERE user_id = ? AND status = 'Accepted'"
  ).bind(id).first();
  const totalSubs = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM submissions WHERE user_id = ?'
  ).bind(id).first();
  const articleCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM articles WHERE user_id = ?'
  ).bind(id).first();
  const topicCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM topics WHERE user_id = ?'
  ).bind(id).first();

  user.stats = {
    ac_problems: acCount.count,
    total_submissions: totalSubs.count,
    articles: articleCount.count,
    topics: topicCount.count,
  };

  // 关注 / 粉丝数
  const followerCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE followee_id = ?'
  ).bind(id).first();
  const followingCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?'
  ).bind(id).first();
  user.follower_count = followerCount.count;
  user.following_count = followingCount.count;

  // 最近 AC 的题目
  const { results: recentAc } = await c.env.DB.prepare(
    `SELECT DISTINCT p.id, p.title FROM submissions s
     JOIN problems p ON s.problem_id = p.id
     WHERE s.user_id = ? AND s.status = 'Accepted'
     ORDER BY s.created_at DESC LIMIT 5`
  ).bind(id).all();
  user.recent_ac = recentAc;

  // 当前登录用户是否关注
  if (currentUser && currentUser.id !== parseInt(id, 10)) {
    const f = await c.env.DB.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?'
    ).bind(currentUser.id, id).first();
    user.is_following = !!f;
  }

  return c.json(user);
});

// 更新个人资料
app.patch('/api/users/profile', requireAuth(), async (c) => {
  const user = c.get('user');
  const { bio, avatar } = await c.req.json();
  if (bio && bio.length > 2000) return err(c, '个人简介不能超过 2000 字');
  await c.env.DB.prepare(
    'UPDATE users SET bio = ?, avatar = ? WHERE id = ?'
  ).bind(bio || '', avatar || '', user.id).run();
  return c.json({ success: true });
});

// 获取/设置用户标签
app.get('/api/users/me/tags', requireAuth(), async (c) => {
  const user = c.get('user');
  const u = await c.env.DB.prepare('SELECT tags FROM users WHERE id = ?').bind(user.id).first();
  return c.json({ tags: u.tags ? u.tags.split(',') : [] });
});

app.put('/api/users/me/tags', requireAuth(), async (c) => {
  const user = c.get('user');
  const { tags } = await c.req.json();
  const arr = (tags || []).filter(t => t.trim()).map(t => t.trim()).slice(0, 5);
  await c.env.DB.prepare('UPDATE users SET tags = ? WHERE id = ?').bind(arr.join(','), user.id).run();
  return c.json({ tags: arr });
});

// 设置/取消管理员 (仅 uid=1)
app.patch('/api/users/:id/setadmin', requireAuth(), async (c) => {
  const me = c.get('user');
  if (me.id !== 1) return err(c, '无权操作', 403);
  const id = c.req.param('id');
  const { role } = await c.req.json();
  if (!['user', 'admin'].includes(role)) return err(c, '无效角色');
  if (parseInt(id, 10) === 1) return err(c, '不能修改自己的权限');
  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
  return c.json({ success: true });
});

// 获取当前登录用户完整信息 (含 tags / status)
app.get('/api/users/me', requireAuth(), async (c) => {
  const user = c.get('user');
  const u = await c.env.DB.prepare(
    'SELECT id, username, email, avatar, bio, tags, status, role, rating, created_at FROM users WHERE id = ?'
  ).bind(user.id).first();
  if (!u) return err(c, '用户不存在', 404);
  return c.json(u);
});

// ============================================================
//  9b. 管理员用户管理
// ============================================================

// 用户列表 (管理员)
app.get('/api/admin/users', requireAdmin(), async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, username, email, role, status, tags, bio, rating, created_at FROM users ORDER BY id'
  ).all();
  return c.json(results);
});

// 设置用户属性 (管理员)
app.patch('/api/admin/users/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  const { role, status, tags, bio, email } = await c.req.json();
  const validStatus = ['active', 'banned', 'silenced'];
  if (status && !validStatus.includes(status)) return err(c, '无效状态');
  if (role && !['user', 'admin'].includes(role)) return err(c, '无效角色');
  if (bio && bio.length > 2000) return err(c, '个人简介不能超过 2000 字');

  const sets = [];
  const binds = [];
  if (role !== undefined) { sets.push('role = ?'); binds.push(role); }
  if (status !== undefined) { sets.push('status = ?'); binds.push(status); }
  if (tags !== undefined) { sets.push('tags = ?'); binds.push(tags); }
  if (bio !== undefined) { sets.push('bio = ?'); binds.push(bio); }
  if (email !== undefined) { sets.push('email = ?'); binds.push(email); }
  if (!sets.length) return err(c, '没有需要更新的字段');
  binds.push(id);
  await c.env.DB.prepare(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...binds).run();
  return c.json({ success: true });
});

// 清理账号 (管理员: 删除用户及其所有关联数据)
app.delete('/api/admin/users/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  if (parseInt(id, 10) === 1) return err(c, '不能删除初始管理员');
  const tables = ['submissions', 'topics', 'replies', 'articles', 'article_likes', 'tickets',
    'messages', 'notifications', 'activities', 'team_members', 'problem_list_items', 'problem_lists',
    'follows'];
  for (const t of tables) {
    const col = t === 'team_members' || t === 'problem_list_items' || t === 'follows' || t === 'article_likes' ? 'user_id' : 'user_id';
    await c.env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(id).run();
  }
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// 清空所有数据库数据 (管理员)
app.post('/api/admin/clear-data', requireAdmin(), async (c) => {
  const { cleanall } = await c.req.json();
  const tables = ['submissions', 'topics', 'replies', 'articles', 'article_likes', 'tickets',
    'messages', 'notifications', 'activities', 'team_members', 'problem_list_items', 'problem_lists',
    'follows', 'problem_tags', 'contest_problems'];
  for (const t of tables) {
    await c.env.DB.prepare(`DELETE FROM ${t}`).run();
  }
  if (cleanall == 1) {
    await c.env.DB.prepare('DELETE FROM users').run();
    return c.json({ success: true, message: '所有数据已清空（含管理员）' });
  }
  await c.env.DB.prepare("DELETE FROM users WHERE id != 1").run();
  return c.json({ success: true, message: '所有数据已清空（保留管理员账号）' });
});

// ============================================================
//  10. 公告系统 (仅管理员)
// ============================================================

app.get('/api/announcements', async (c) => {
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, content, created_at, updated_at FROM announcements ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();
  return c.json(results);
});

app.get('/api/announcements/:id', async (c) => {
  const id = c.req.param('id');
  const a = await c.env.DB.prepare(
    'SELECT id, title, content, created_at, updated_at FROM announcements WHERE id = ?'
  ).bind(id).first();
  if (!a) return err(c, '公告不存在', 404);
  return c.json(a);
});

app.post('/api/announcements', requireAdmin(), async (c) => {
  const { title, content } = await c.req.json();
  if (!title || !content) return err(c, '标题和内容不能为空');
  const result = await c.env.DB.prepare(
    'INSERT INTO announcements (title, content) VALUES (?, ?) RETURNING id'
  ).bind(title, content).first();
  return c.json({ id: result.id });
});

app.patch('/api/announcements/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  const { title, content } = await c.req.json();
  if (!title || !content) return err(c, '标题和内容不能为空');
  await c.env.DB.prepare(
    "UPDATE announcements SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(title, content, id).run();
  return c.json({ success: true });
});

app.delete('/api/announcements/:id', requireAdmin(), async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ============================================================
//  11. 主页聚合接口
// ============================================================

app.get('/api/home', async (c) => {
  const user = c.get('user');
  const [announcements, upcomingContests, hotTopics, recentArticles, recentProblems, feed] = await Promise.all([
    // 公告 (最新 5 条)
    c.env.DB.prepare(
      `SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 5`
    ).all(),
    // 即将开始的比赛
    c.env.DB.prepare(
      `SELECT id, title, start_time, end_time FROM contests
       WHERE start_time > datetime('now') ORDER BY start_time ASC LIMIT 1`
    ).all(),
    // 热门讨论 (浏览量最高的 5 条)
    c.env.DB.prepare(
      `SELECT t.id, t.title, u.username as author, u.id as user_id, t.views
       FROM topics t JOIN users u ON t.user_id = u.id
       ORDER BY t.views DESC LIMIT 5`
    ).all(),
    // 最新文章
    c.env.DB.prepare(
      `SELECT a.id, a.title, u.username as author, u.id as user_id
       FROM articles a JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC LIMIT 5`
    ).all(),
    // 最新题目
    c.env.DB.prepare(
      'SELECT id, title FROM problems ORDER BY id DESC LIMIT 5'
    ).all(),
    // 动态 (仅已登录时显示关注的人)
    user
      ? c.env.DB.prepare(
          `SELECT a.*, u.username, u.avatar, u.role, u.rating FROM activities a
           JOIN users u ON u.id = a.user_id
           JOIN follows f ON f.followee_id = a.user_id
           WHERE f.follower_id = ?
           ORDER BY a.id DESC LIMIT 10`
        ).bind(user.id).all()
      : Promise.resolve({ results: [] }),
  ]);

  return c.json({
    announcements: announcements.results,
    upcomingContest: upcomingContests.results[0] || null,
    hotTopics: hotTopics.results,
    recentArticles: recentArticles.results,
    recentProblems: recentProblems.results,
    feed: feed.results,
  });
});

// ============================================================
//  11. 头像上传 (R2)
// ============================================================

app.post('/api/upload/avatar', requireAuth(), async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file) return err(c, '请上传文件');
  if (file.size > 500 * 1024) return err(c, '头像不能超过 500KB');

  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const dataUrl = `data:${file.type};base64,${base64}`;

  await c.env.DB.prepare('UPDATE users SET avatar = ? WHERE id = ?').bind(dataUrl, user.id).run();
  return c.json({ url: dataUrl });
});

// ============================================================
//  12. 统计接口 (管理员)
// ============================================================

app.get('/api/admin/stats', requireAdmin(), async (c) => {
  const [users, problems, subs, topics, articles, tickets] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM users').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM problems').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM submissions').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM topics').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM articles').first(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM tickets WHERE status = "open"').first(),
  ]);
  return c.json({
    users: users.c,
    problems: problems.c,
    submissions: subs.c,
    topics: topics.c,
    articles: articles.c,
    open_tickets: tickets.c,
  });
});

// ============================================================
//  13. 排行榜模块
// ============================================================

// 总榜 (按 AC 题数 + rating)
app.get('/api/leaderboard', async (c) => {
  const { limit, offset } = getPagination(c);
  const range = c.req.query('range'); // 不传=总榜, week=周榜, month=月榜

  let dateFilter = '';
  const binds = [];
  if (range === 'week') {
    dateFilter = "AND s.created_at >= datetime('now', '-7 days')";
  } else if (range === 'month') {
    dateFilter = "AND s.created_at >= datetime('now', '-30 days')";
  }

  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar, u.rating,
       COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN s.problem_id END) as ac_count,
       COUNT(s.id) as total_submissions
     FROM users u
     LEFT JOIN submissions s ON s.user_id = u.id ${dateFilter}
     GROUP BY u.id
     ORDER BY ac_count DESC, u.rating DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return c.json(results);
});

// 某题的通过排行榜 (谁最先 AC)
app.get('/api/problems/:id/leaderboard', async (c) => {
  const id = c.req.param('id');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, u.username, s.runtime, s.memory, s.created_at
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     WHERE s.problem_id = ? AND s.status = 'Accepted'
     ORDER BY s.runtime ASC, s.id ASC
     LIMIT ? OFFSET ?`
  ).bind(id, limit, offset).all();
  return c.json(results);
});

// ============================================================
//  14. 搜索模块
// ============================================================

app.get('/api/search', async (c) => {
  const q = c.req.query('q');
  if (!q || q.length < 1) return err(c, '请输入搜索关键词');
  const keyword = `%${q}%`;
  const { limit } = getPagination(c);

  const [problems, topics, articles, users] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, title, description FROM problems
       WHERE title LIKE ? OR description LIKE ? LIMIT ?`
    ).bind(keyword, keyword, limit).all(),
    c.env.DB.prepare(
      `SELECT t.id, t.title, u.username as author
       FROM topics t JOIN users u ON t.user_id = u.id
       WHERE t.title LIKE ? OR t.content LIKE ? LIMIT ?`
    ).bind(keyword, keyword, limit).all(),
    c.env.DB.prepare(
      `SELECT a.id, a.title, u.username as author
       FROM articles a JOIN users u ON a.user_id = u.id
       WHERE a.title LIKE ? OR a.content LIKE ? LIMIT ?`
    ).bind(keyword, keyword, limit).all(),
    c.env.DB.prepare(
      `SELECT id, username, bio FROM users
       WHERE username LIKE ? OR bio LIKE ? LIMIT ?`
    ).bind(keyword, keyword, limit).all(),
  ]);

  return c.json({
    problems: problems.results,
    topics: topics.results,
    articles: articles.results,
    users: users.results,
  });
});

// ============================================================
//  15. 通知模块
// ============================================================

// 获取通知列表
app.get('/api/notifications', requireAuth(), async (c) => {
  const user = c.get('user');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(user.id, limit, offset).all();
  return c.json(results);
});

// 未读通知数
app.get('/api/notifications/unread/count', requireAuth(), async (c) => {
  const user = c.get('user');
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).first();
  return c.json({ count: result.count });
});

// 标记通知已读
app.post('/api/notifications/:id/read', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).run();
  return c.json({ success: true });
});

// 全部标记已读
app.post('/api/notifications/read-all', requireAuth(), async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
  ).bind(user.id).run();
  return c.json({ success: true });
});

/** 创建通知的内部辅助函数 */
async function createNotification(DB, userId, type, title, content = '', refId = null) {
  await DB.prepare(
    'INSERT INTO notifications (user_id, type, title, content, ref_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, type, title, content, refId).run();
}

// ============================================================
//  16. 用户关注 + 动态模块
// ============================================================

// 关注/取关用户
app.post('/api/users/:id/follow', requireAuth(), async (c) => {
  const user = c.get('user');
  const targetId = parseInt(c.req.param('id'), 10);
  if (targetId === user.id) return err(c, '不能关注自己');

  const target = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(targetId).first();
  if (!target) return err(c, '用户不存在', 404);

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?'
  ).bind(user.id, targetId).first();

  if (existing) {
    await c.env.DB.prepare(
      'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?'
    ).bind(user.id, targetId).run();
    return c.json({ following: false });
  } else {
    await c.env.DB.prepare(
      'INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)'
    ).bind(user.id, targetId).run();

    // 记录动态
    await c.env.DB.prepare(
      'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
    ).bind(user.id, 'follow_user', targetId, '关注了新用户').run();

    // 通知对方
    await createNotification(c.env.DB, targetId, 'follow', `${user.username} 关注了你`);

    return c.json({ following: true });
  }
});

// 获取关注列表
app.get('/api/users/:id/following', async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar FROM follows f
     JOIN users u ON u.id = f.followee_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC`
  ).bind(id).all();
  return c.json(results);
});

// 获取粉丝列表
app.get('/api/users/:id/followers', async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.followee_id = ? ORDER BY f.created_at DESC`
  ).bind(id).all();
  return c.json(results);
});

// 获取用户动态
app.get('/api/users/:id/activities', async (c) => {
  const id = c.req.param('id');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM activities WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
  ).bind(id, limit, offset).all();
  return c.json(results);
});

// 发布动态
app.post('/api/activities', requireAuth(), async (c) => {
  const user = c.get('user');
  const { content } = await c.req.json();
  if (!content?.trim()) return err(c, '内容不能为空');
  if (content.length > 500) return err(c, '动态内容不能超过 500 字');
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, content) VALUES (?, ?, ?)'
  ).bind(user.id, 'status', content).run();
  return c.json({ success: true });
});

// 全局动态
app.get('/api/activities', async (c) => {
  const { limit, offset } = getPagination(c);
  const userId = c.req.query('user_id');
  if (userId) {
    const { results } = await c.env.DB.prepare(
      `SELECT a.*, u.username, u.avatar, u.role, u.rating FROM activities a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ? ORDER BY a.id DESC LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();
    return c.json(results);
  }
  const { results } = await c.env.DB.prepare(
    `SELECT a.*, u.username, u.avatar, u.role, u.rating FROM activities a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return c.json(results);
});

// 获取关注的人的动态 (信息流)
app.get('/api/feed', requireAuth(), async (c) => {
  const user = c.get('user');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT a.*, u.username, u.avatar, u.role, u.rating FROM activities a
     JOIN users u ON u.id = a.user_id
     JOIN follows f ON f.followee_id = a.user_id
     WHERE f.follower_id = ?
     ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(user.id, limit, offset).all();
  return c.json(results);
});

// ============================================================
//  17. 题单系统
// ============================================================

// 获取题单列表
app.get('/api/lists', async (c) => {
  const user = c.get('user');
  const { limit, offset } = getPagination(c);

  let query = 'SELECT * FROM problem_lists';
  const binds = [];
  if (!user || user.role !== 'admin') {
    query += user ? ' WHERE is_public = 1 OR user_id = ?' : ' WHERE is_public = 1';
    if (user) binds.push(user.id);
  }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...binds).all();
  return c.json(results);
});

// 获取题单详情 (含题目列表)
app.get('/api/lists/:id', async (c) => {
  const id = c.req.param('id');
  const list = await c.env.DB.prepare('SELECT * FROM problem_lists WHERE id = ?').bind(id).first();
  if (!list) return err(c, '题单不存在', 404);

  // 非公开且非作者/管理员，不能看
  const user = c.get('user');
  if (!list.is_public && (!user || (user.id !== list.user_id && user.role !== 'admin'))) {
    return err(c, '无权查看', 403);
  }

  const { results: problems } = await c.env.DB.prepare(
    `SELECT p.id, p.title, p.difficulty, pli.sort_order,
       (SELECT COUNT(*) FROM submissions s WHERE s.problem_id = p.id AND s.user_id = ? AND s.status = 'Accepted') as solved
     FROM problem_list_items pli
     JOIN problems p ON pli.problem_id = p.id
     WHERE pli.list_id = ?
     ORDER BY pli.sort_order`
  ).bind(user?.id || 0, id).all();

  list.problems = problems;
  return c.json(list);
});

// 创建题单 (每人最多 20 个)
app.post('/api/lists', requireAuth(), async (c) => {
  const user = c.get('user');
  const { title, description, is_public } = await c.req.json();
  if (!title) return err(c, '标题不能为空');

  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM problem_lists WHERE user_id = ?'
  ).bind(user.id).first();
  if (count.c >= 20) return err(c, '每人最多创建 20 个题单');

  const result = await c.env.DB.prepare(
    'INSERT INTO problem_lists (user_id, title, description, is_public) VALUES (?, ?, ?, ?) RETURNING id'
  ).bind(user.id, title, description || '', is_public === false ? 0 : 1).first();

  // 记录动态
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'create_list', result.id, `创建了题单: ${title}`).run();

  return c.json({ id: result.id });
});

// 往题单添加题目 (每个题单最多 100 道)
app.post('/api/lists/:id/problems', requireAuth(), async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');
  const { problemId } = await c.req.json();
  if (!problemId) return err(c, '缺少题目 ID');

  const list = await c.env.DB.prepare('SELECT * FROM problem_lists WHERE id = ?').bind(listId).first();
  if (!list) return err(c, '题单不存在', 404);
  if (list.user_id !== user.id && user.role !== 'admin') return err(c, '无权操作', 403);

  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM problem_list_items WHERE list_id = ?'
  ).bind(listId).first();
  if (count.c >= 100) return err(c, '每个题单最多 100 道题');

  const maxOrder = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as m FROM problem_list_items WHERE list_id = ?'
  ).bind(listId).first();

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO problem_list_items (list_id, problem_id, sort_order) VALUES (?, ?, ?)'
  ).bind(listId, problemId, (maxOrder?.m || 0) + 1).run();

  return c.json({ success: true });
});

// 从题单移除题目
app.delete('/api/lists/:id/problems/:problemId', requireAuth(), async (c) => {
  const user = c.get('user');
  const { id: listId, problemId } = c.req.param();

  const list = await c.env.DB.prepare('SELECT user_id FROM problem_lists WHERE id = ?').bind(listId).first();
  if (!list) return err(c, '题单不存在', 404);
  if (list.user_id !== user.id && user.role !== 'admin') return err(c, '无权操作', 403);

  await c.env.DB.prepare(
    'DELETE FROM problem_list_items WHERE list_id = ? AND problem_id = ?'
  ).bind(listId, problemId).run();
  return c.json({ success: true });
});

// 删除题单
app.delete('/api/lists/:id', requireAuth(), async (c) => {
  const user = c.get('user');
  const listId = c.req.param('id');

  const list = await c.env.DB.prepare('SELECT user_id FROM problem_lists WHERE id = ?').bind(listId).first();
  if (!list) return err(c, '题单不存在', 404);
  if (list.user_id !== user.id && user.role !== 'admin') return err(c, '无权操作', 403);

  await c.env.DB.prepare('DELETE FROM problem_list_items WHERE list_id = ?').bind(listId).run();
  await c.env.DB.prepare('DELETE FROM problem_lists WHERE id = ?').bind(listId).run();
  return c.json({ success: true });
});

// ============================================================
//  18. 团队模块
// ============================================================

// 获取团队列表
app.get('/api/teams', async (c) => {
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT t.*, u.username as owner_name,
       (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
     FROM teams t JOIN users u ON t.owner_id = u.id
     ORDER BY t.created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return c.json(results);
});

// 团队详情
app.get('/api/teams/:id', async (c) => {
  const id = c.req.param('id');
  const team = await c.env.DB.prepare(
    `SELECT t.*, u.username as owner_name FROM teams t
     JOIN users u ON t.owner_id = u.id WHERE t.id = ?`
  ).bind(id).first();
  if (!team) return err(c, '团队不存在', 404);

  const { results: members } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar, tm.role, tm.joined_at
     FROM team_members tm JOIN users u ON tm.user_id = u.id
     WHERE tm.team_id = ? ORDER BY tm.role DESC, tm.joined_at`
  ).bind(id).all();

  team.members = members;
  return c.json(team);
});

// 创建团队
app.post('/api/teams', requireAuth(), async (c) => {
  const user = c.get('user');
  const { name, description } = await c.req.json();
  if (!name) return err(c, '团队名称不能为空');

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO teams (name, description, owner_id) VALUES (?, ?, ?) RETURNING id'
    ).bind(name, description || '', user.id).first();

    // 创建者自动加入，角色为 owner
    await c.env.DB.prepare(
      'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)'
    ).bind(result.id, user.id, 'owner').run();

    return c.json({ id: result.id });
  } catch (e) {
    return err(c, '团队名称已存在');
  }
});

// 加入团队
app.post('/api/teams/:id/join', requireAuth(), async (c) => {
  const user = c.get('user');
  const teamId = c.req.param('id');

  const team = await c.env.DB.prepare('SELECT id FROM teams WHERE id = ?').bind(teamId).first();
  if (!team) return err(c, '团队不存在', 404);

  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(teamId, user.id).first();
  if (existing) return err(c, '已经加入该团队');

  await c.env.DB.prepare(
    'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(teamId, user.id, 'member').run();

  // 记录动态
  await c.env.DB.prepare(
    'INSERT INTO activities (user_id, type, ref_id, content) VALUES (?, ?, ?, ?)'
  ).bind(user.id, 'join_team', teamId, '加入了团队').run();

  return c.json({ success: true });
});

// 退出团队 (owner 不能退)
app.post('/api/teams/:id/leave', requireAuth(), async (c) => {
  const user = c.get('user');
  const teamId = c.req.param('id');

  const member = await c.env.DB.prepare(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(teamId, user.id).first();
  if (!member) return err(c, '未加入该团队');
  if (member.role === 'owner') return err(c, '队长不能退出，请先转让');

  await c.env.DB.prepare(
    'DELETE FROM team_members WHERE team_id = ? AND user_id = ?'
  ).bind(teamId, user.id).run();
  return c.json({ success: true });
});

// 团队内部排行榜
app.get('/api/teams/:id/leaderboard', async (c) => {
  const id = c.req.param('id');
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.username, u.avatar,
       COUNT(DISTINCT CASE WHEN s.status = 'Accepted' THEN s.problem_id END) as ac_count
     FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     LEFT JOIN submissions s ON s.user_id = u.id
     WHERE tm.team_id = ?
     GROUP BY u.id
     ORDER BY ac_count DESC`
  ).bind(id).all();
  return c.json(results);
});

// ============================================================
//  19. 代码对比模块
// ============================================================

// 获取某题的 AC 代码列表 (公开的)
app.get('/api/problems/:id/solutions', async (c) => {
  const id = c.req.param('id');
  const { limit, offset } = getPagination(c);
  const { results } = await c.env.DB.prepare(
    `SELECT s.id, s.language, s.runtime, s.memory, s.created_at, u.username
     FROM submissions s
     JOIN users u ON s.user_id = u.id
     WHERE s.problem_id = ? AND s.status = 'Accepted'
     ORDER BY s.runtime ASC
     LIMIT ? OFFSET ?`
  ).bind(id, limit, offset).all();
  return c.json(results);
});

// 获取某次 AC 提交的代码
app.get('/api/submissions/:id/code', async (c) => {
  const id = c.req.param('id');
  const sub = await c.env.DB.prepare(
    `SELECT s.code, s.language, s.status, s.problem_id, u.username as author
     FROM submissions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ?`
  ).bind(id).first();
  if (!sub) return err(c, '提交不存在', 404);
  if (sub.status !== 'Accepted') return err(c, '仅可查看 AC 代码');

  // 检查权限: 只允许查看自己的，或者题目是公开的
  const user = c.get('user');
  // 简单策略: 所有人都能看 AC 代码 (OJ 通常开放)
  return c.json(sub);
});

// 对比两次提交的代码差异 (返回两份代码让前端 diff)
app.get('/api/submissions/compare', async (c) => {
  const a = c.req.query('a');
  const b = c.req.query('b');
  if (!a || !b) return err(c, '需要 a 和 b 两个提交 ID');

  const [subA, subB] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, code, language, runtime, status FROM submissions WHERE id = ?'
    ).bind(a).first(),
    c.env.DB.prepare(
      'SELECT id, code, language, runtime, status FROM submissions WHERE id = ?'
    ).bind(b).first(),
  ]);

  if (!subA || !subB) return err(c, '提交不存在', 404);

  return c.json({ a: subA, b: subB });
});

// ============================================================
//  20. 404 页面 (API 层的 404)
// ============================================================

app.notFound((c) => {
  // 如果是 API 请求，返回 JSON
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: '接口不存在', path: c.req.path }, 404);
  }
  // 非 API 请求交给静态资源 (SPA 404 页面)
  return c.env.ASSETS.fetch(c.req.raw);
});

// ============================================================
//  静态资源兜底 (方案 A 核心)
// ============================================================

app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// ============================================================
//  导出
// ============================================================

export default {
  fetch: app.fetch,
};
