'use strict';
// المستشار: بيسجّل توصيات بحالة واضحة (بانتظار الموافقة / تمت الموافقة / مرفوضة / تم التنفيذ يدوياً).
// الملف ده ما فيهوش أي تنفيذ: لا صرف ولا نشر. الموافقة بتتسجّل بس، والتنفيذ بيتم يدوياً بعدها.

const KINDS = ['budget', 'content', 'pricing', 'other'];
const TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['done'],
  rejected: [],
  done: [],
};
const MAX_TITLE = 120;
const MAX_REASON = 1000;
const MAX_ROI = 10;

function init(db, deps) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS advisor_recs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      expected_roi REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      decided_at INTEGER,
      done_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS advisor_recs_user ON advisor_recs(user_id, status);
    CREATE TABLE IF NOT EXISTS advisor_evals (
      rec_id INTEGER PRIMARY KEY REFERENCES advisor_recs(id) ON DELETE CASCADE,
      spend REAL NOT NULL,
      revenue REAL NOT NULL,
      roi REAL,
      expected_roi REAL,
      verdict TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  const st = {
    insert: db.prepare(`INSERT INTO advisor_recs (user_id, kind, title, reason, expected_roi, status, created_at)
                        VALUES (?, ?, ?, ?, ?, 'pending', ?)`),
    list: db.prepare(`SELECT r.*, e.spend, e.revenue, e.roi, e.verdict
                      FROM advisor_recs r LEFT JOIN advisor_evals e ON e.rec_id = r.id
                      WHERE r.user_id = ? ORDER BY r.id DESC LIMIT 200`),
    listByStatus: db.prepare(`SELECT r.*, e.spend, e.revenue, e.roi, e.verdict
                              FROM advisor_recs r LEFT JOIN advisor_evals e ON e.rec_id = r.id
                              WHERE r.user_id = ? AND r.status = ? ORDER BY r.id DESC LIMIT 200`),
    one: db.prepare('SELECT * FROM advisor_recs WHERE id = ? AND user_id = ?'),
    setStatus: db.prepare('UPDATE advisor_recs SET status = ?, decided_at = COALESCE(decided_at, ?), done_at = ? WHERE id = ? AND user_id = ? AND status = ?'),
  };

  // التحقق من المدخلات: يرجّع الصيغة النظيفة أو يرمي خطأ مفهوم
  function clean(b) {
    const kind = String(b.kind || '');
    if (!KINDS.includes(kind)) throw Object.assign(new Error('نوع التوصية مش معروف.'), { status: 400, code: 'input' });
    const title = String(b.title || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, MAX_TITLE);
    const reason = String(b.reason || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, MAX_REASON);
    if (title.length < 3) throw Object.assign(new Error('اكتب عنوان واضح للتوصية.'), { status: 400, code: 'input' });
    if (reason.length < 10) throw Object.assign(new Error('اكتب سبب التوصية (على الأقل 10 حروف).'), { status: 400, code: 'input' });
    let roi = null;
    if (b.expected_roi !== undefined && b.expected_roi !== null && b.expected_roi !== '') {
      roi = Number(b.expected_roi);
      if (!Number.isFinite(roi) || roi < -1 || roi > MAX_ROI) {
        throw Object.assign(new Error('العائد المتوقع لازم يكون رقم بين -100% و 1000%.'), { status: 400, code: 'input' });
      }
    }
    return { kind, title, reason, roi };
  }

  function create(userId, b) {
    const v = clean(b);
    const r = st.insert.run(userId, v.kind, v.title, v.reason, v.roi, Date.now());
    return Number(r.lastInsertRowid);
  }

  function list(userId, status) {
    const rows = status && TRANSITIONS[status] !== undefined
      ? st.listByStatus.all(userId, status)
      : st.list.all(userId);
    return rows;
  }

  // ينقل التوصية من حالة لحالة مسموح بيها بس، والتنفيذ نفسه ما بيحصلش هنا
  function move(userId, id, to) {
    const row = st.one.get(id, userId);
    if (!row) return { error: 'not_found' };
    if (!(TRANSITIONS[row.status] || []).includes(to)) return { error: 'bad_transition', from: row.status };
    const now = Date.now();
    st.setStatus.run(to, now, to === 'done' ? now : null, id, userId, row.status);
    return { ok: true, status: to };
  }

  async function route(req, res, user, p, m) {
    if (p === '/api/advisor/recs' && m === 'GET') {
      const url = new URL(req.url, 'http://x');
      return deps.send(res, 200, { recs: list(user.id, url.searchParams.get('status')) });
    }
    if (p === '/api/advisor/recs' && m === 'POST') {
      if (deps.rateLimited('advisor:' + user.id, 30, 3600000)) return deps.fail(res, 429, 'rate', 'توصيات كتير. جرّب بعد ساعة.');
      const b = await deps.readJson(req, 8 * 1024);
      try {
        const id = create(user.id, b);
        return deps.send(res, 200, { id, status: 'pending' });
      } catch (e) {
        if (e.code === 'input') return deps.fail(res, 400, 'input', e.message);
        throw e;
      }
    }
    const mm = p.match(/^\/api\/advisor\/recs\/(\d+)\/(approve|reject|done)$/);
    if (mm && m === 'POST') {
      const id = Number(mm[1]);
      const to = { approve: 'approved', reject: 'rejected', done: 'done' }[mm[2]];
      const out = move(user.id, id, to);
      if (out.error === 'not_found') return deps.fail(res, 404, 'not_found', 'التوصية دي مش موجودة.');
      if (out.error === 'bad_transition') return deps.fail(res, 409, 'state', 'الحالة الحالية (' + out.from + ') ما بتسمحش بالإجراء ده.');
      return deps.send(res, 200, out);
    }
    return null;
  }

  return { route, create, list, move };
}

module.exports = { init, KINDS, TRANSITIONS };
