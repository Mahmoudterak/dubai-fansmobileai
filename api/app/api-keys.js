'use strict';
// مفاتيح API لكل مستخدم (للربط مع ChatGPT وClaude عبر MCP).
// المفتاح يظهر للمستخدم مرة واحدة عند الإنشاء، ونحفظ هاش SHA-256 له فقط.
// المفتاح يعمل على مسارات /api/mcp/* فقط، ولا يفتح جلسة الحساب الكاملة.
// الإلغاء فوري: revoked_at يمنع أي طلب بعده.

const crypto = require('node:crypto');

const PREFIX = 'dfk_';
const MAX_KEYS = 10;

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function init(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_hint TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER,
      revoked_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS mcp_keys_user ON mcp_keys(user_id);
  `);
  const st = {
    insert: db.prepare('INSERT INTO mcp_keys (user_id, label, key_hash, key_hint, created_at) VALUES (?, ?, ?, ?, ?)'),
    countActive: db.prepare('SELECT COUNT(*) AS n FROM mcp_keys WHERE user_id = ? AND revoked_at IS NULL'),
    list: db.prepare('SELECT id, label, key_hint, created_at, last_used_at, revoked_at FROM mcp_keys WHERE user_id = ? ORDER BY id DESC'),
    byHash: db.prepare('SELECT k.id, k.user_id, u.disabled FROM mcp_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ? AND k.revoked_at IS NULL'),
    touch: db.prepare('UPDATE mcp_keys SET last_used_at = ? WHERE id = ?'),
    revoke: db.prepare('UPDATE mcp_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL'),
  };

  // يرجّع المفتاح الخام مرة واحدة فقط
  function create(userId, label) {
    const n = st.countActive.get(userId).n;
    if (n >= MAX_KEYS) { const e = new Error('وصلت للحد الأقصى من المفاتيح (10). ألغِ مفتاحاً قديماً أولاً.'); e.status = 400; throw e; }
    const clean = String(label || '').trim().slice(0, 60) || 'مفتاح';
    const token = PREFIX + crypto.randomBytes(24).toString('base64url');
    const hint = '…' + token.slice(-4);
    st.insert.run(userId, clean, sha256(token), hint, Date.now());
    return { token, label: clean, hint };
  }

  function list(userId) {
    return st.list.all(userId).map((r) => ({
      id: r.id, label: r.label, hint: r.key_hint, createdAt: r.created_at,
      lastUsedAt: r.last_used_at, revoked: Boolean(r.revoked_at),
    }));
  }

  // يرجّع user_id لو المفتاح صالح ولم يُلغَ ولم يُعطَّل الحساب
  function resolve(token) {
    if (!token || !token.startsWith(PREFIX) || token.length > 200) return null;
    const r = st.byHash.get(sha256(token));
    if (!r || r.disabled) return null;
    st.touch.run(Date.now(), r.id);
    return r.user_id;
  }

  function revoke(userId, id) {
    return st.revoke.run(Date.now(), Number(id), userId).changes > 0;
  }

  return { create, list, resolve, revoke, PREFIX };
}

module.exports = { init };
