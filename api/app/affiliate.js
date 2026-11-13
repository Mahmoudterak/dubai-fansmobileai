'use strict';
// برنامج الإحالة: كل مستخدم ليه كود إحالة، والمسجّل بالكود بيتسجّل كمُحال.
// العمولة نسبة من أول دفعة ناجحة للمُحال (افتراضياً 20%، وتتغيّر من AFFILIATE_RATE).
// العمولات بتتسجّل "معلّقة"، والأدمن بيحدّدها "مدفوعة" بعد ما يصرفها يدوياً.
// المبالغ بالفلس (1 درهم = 100).

const crypto = require('node:crypto');

const RATE = Math.min(Math.max(Number(process.env.AFFILIATE_RATE) || 0.2, 0), 0.5);
const CODE_RE = /^[A-Z0-9]{4,20}$/;

function init(db) {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!cols.includes('ref_code')) db.exec('ALTER TABLE users ADD COLUMN ref_code TEXT');
  if (!cols.includes('referred_by')) db.exec('ALTER TABLE users ADD COLUMN referred_by INTEGER');
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_ref_code ON users(ref_code);
    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_id TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL,
      commission INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      paid_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS commissions_referrer ON commissions(referrer_id, status);
  `);

  const st = {
    byCode: db.prepare('SELECT id, name FROM users WHERE ref_code = ? AND disabled = 0'),
    getCode: db.prepare('SELECT ref_code, referred_by FROM users WHERE id = ?'),
    setCode: db.prepare('UPDATE users SET ref_code = ? WHERE id = ? AND ref_code IS NULL'),
    setRef: db.prepare('UPDATE users SET referred_by = ? WHERE id = ? AND referred_by IS NULL'),
    hasCommission: db.prepare('SELECT 1 AS x FROM commissions WHERE referred_id = ? LIMIT 1'),
    insert: db.prepare('INSERT OR IGNORE INTO commissions (referrer_id, referred_id, payment_id, amount, commission, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    countReferred: db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?'),
    sums: db.prepare('SELECT status, COALESCE(SUM(commission), 0) AS total, COUNT(*) AS n FROM commissions WHERE referrer_id = ? GROUP BY status'),
    pendingList: db.prepare(`SELECT c.id, c.referrer_id, c.referred_id, c.payment_id, c.amount, c.commission, c.created_at,
                                    u.name AS referrer_name, u.email AS referrer_email
                             FROM commissions c JOIN users u ON u.id = c.referrer_id
                             WHERE c.status = 'pending' ORDER BY c.referrer_id, c.created_at`),
    markPaid: db.prepare("UPDATE commissions SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'"),
  };

  function newCode() {
    return crypto.randomBytes(5).toString('hex').slice(0, 8).toUpperCase();
  }

  // يرجّع كود المستخدم، وينشئه لو مش موجود
  function ensureCode(userId) {
    const row = st.getCode.get(userId);
    if (row && row.ref_code) return row.ref_code;
    for (let i = 0; i < 5; i += 1) {
      try {
        const code = newCode();
        if (st.setCode.run(code, userId).changes) return code;
      } catch (e) { /* تعارض نادر في الكود: نجرّب تاني */ }
    }
    return null;
  }

  function byCode(code) {
    const c = String(code || '').trim().toUpperCase();
    if (!CODE_RE.test(c)) return null;
    return st.byCode.get(c) || null;
  }

  // يربط المستخدم الجديد بصاحب الكود. مرة واحدة بس، ومش لنفسه
  function attach(userId, code) {
    const r = byCode(code);
    if (!r || r.id === Number(userId)) return false;
    return st.setRef.run(r.id, userId).changes > 0;
  }

  // بعد أي دفعة ناجحة: لو المستخدم مُحال ولأول مرة، نسجّل العمولة
  function onPaid(payment, user) {
    const row = st.getCode.get(user.id);
    if (!row || !row.referred_by) return 0;
    if (st.hasCommission.get(user.id)) return 0;
    const commission = Math.round(Number(payment.amount) * RATE);
    if (commission <= 0) return 0;
    st.insert.run(row.referred_by, user.id, payment.id, payment.amount, commission, 'pending', Date.now());
    return commission;
  }

  function summary(userId, appUrl) {
    const code = ensureCode(userId);
    const sums = {};
    for (const r of st.sums.all(userId)) sums[r.status] = { total: r.total, n: r.n };
    return {
      code,
      link: code ? `${appUrl}/?ref=${code}` : null,
      rate: RATE,
      referred: st.countReferred.get(userId).n,
      pending_fils: sums.pending ? sums.pending.total : 0,
      paid_fils: sums.paid ? sums.paid.total : 0,
    };
  }

  function pendingForAdmin() { return st.pendingList.all(); }

  function markPaid(ids) {
    const t = Date.now();
    let n = 0;
    for (const id of ids) n += st.markPaid.run(t, Number(id)).changes;
    return n;
  }

  return { byCode, ensureCode, attach, onPaid, summary, pendingForAdmin, markPaid, RATE };
}

module.exports = { init };
