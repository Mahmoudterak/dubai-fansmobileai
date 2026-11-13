'use strict';
// مهام المساعد في الخلفية: أي ميزة طويلة تسجّل نوعها هنا، والمستخدم يبدأها ويرجع يشوف النتيجة بعدين.
// (منفصلة عن jobs.js اللي بيشتغل بالصور والفيديو.)
// طابور واحد بيشتغل مهمة واحدة في نفس الوقت (السيرفر صغير). النتايج بتتحفظ في قاعدة البيانات، فبتفضل حتى لو الصفحة اتقفلت.
// الحصة بتتحجز وقت البدء، وبتتسترد لو المهمة فشلت أو اتلغت.

const crypto = require('crypto');

const MAX_RESULT = 200 * 1024;   // بالحروف
const MAX_ACTIVE = 3;            // أقصى عدد مهام شغالة/مستنية لكل مستخدم

function init(db, deps) {
  db.exec(`CREATE TABLE IF NOT EXISTS assistant_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    payload TEXT NOT NULL,
    result TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS assistant_tasks_user ON assistant_tasks(user_id, created_at)');
  // أي مهمة كانت شغالة وقت إعادة تشغيل السيرفر تتقفل كفاشلة (مش هتكمل)
  db.prepare("UPDATE assistant_tasks SET status = 'failed', error = ?, updated_at = ? WHERE status IN ('queued', 'running')")
    .run('انقطع التشغيل قبل ما تخلص. ابدأها تاني.', Date.now());

  const handlers = new Map();   // kind -> { quota, run(user, payload) }
  const queue = [];             // ids مستنية
  const releases = new Map();   // id -> دالة استرداد الحصة
  let busy = false;

  const st = {
    insert: db.prepare('INSERT INTO assistant_tasks (id, user_id, kind, status, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    one: db.prepare('SELECT * FROM assistant_tasks WHERE id = ?'),
    mine: db.prepare('SELECT * FROM assistant_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'),
    active: db.prepare("SELECT COUNT(*) AS n FROM assistant_tasks WHERE user_id = ? AND status IN ('queued', 'running')"),
    setStatus: db.prepare('UPDATE assistant_tasks SET status = ?, result = COALESCE(?, result), error = COALESCE(?, error), updated_at = ? WHERE id = ?'),
  };

  function update(id, status, result, error) {
    st.setStatus.run(status, result === undefined ? null : result, error === undefined ? null : error, Date.now(), id);
  }

  function refund(id) {
    const rel = releases.get(id);
    releases.delete(id);
    if (rel) { try { rel(); } catch (e) { /* الحصة اتسجلت أصلاً */ } }
  }

  function view(row) {
    let result = null;
    if (row.status === 'done' && row.result) { try { result = JSON.parse(row.result); } catch (e) { result = null; } }
    return { id: row.id, kind: row.kind, status: row.status, result, error: row.error || null, created_at: row.created_at, updated_at: row.updated_at };
  }

  async function pump() {
    if (busy) return;
    const id = queue.shift();
    if (!id) return;
    const row = st.one.get(id);
    if (!row || row.status !== 'queued') return pump();
    const def = handlers.get(row.kind);
    if (!def) { update(id, 'failed', undefined, 'نوع المهمة مش موجود.'); refund(id); return pump(); }
    busy = true;
    update(id, 'running');
    try {
      const out = await def.run({ id: row.user_id }, JSON.parse(row.payload));
      let json = JSON.stringify(out == null ? {} : out);
      if (json.length > MAX_RESULT) json = JSON.stringify({ truncated: true });
      update(id, 'done', json);
      releases.delete(id); // الحصة اتصرفت فعلاً، ما بتترجعش
    } catch (e) {
      update(id, 'failed', undefined, String((e && e.message) || 'تعذّرت المهمة.').slice(0, 300));
      refund(id);
    } finally {
      busy = false;
    }
    pump();
  }

  function register(kind, def) { handlers.set(kind, def); }

  async function route(req, res, user, p, m) {
    if (!p.startsWith('/api/tasks')) return null;

    if (p === '/api/tasks' && m === 'GET') {
      return deps.send(res, 200, { tasks: st.mine.all(user.id).map(view) });
    }

    if (p === '/api/tasks' && m === 'POST') {
      if (deps.rateLimited('tasks:' + user.id, 20, 3600000)) return deps.fail(res, 429, 'rate', 'مهام كتير. جرّب بعد شوية.');
      const b = await deps.readJson(req, 8 * 1024 * 1024);
      const kind = String(b.kind || '');
      const def = handlers.get(kind);
      if (!def) return deps.fail(res, 400, 'input', 'نوع المهمة مش معروف.');
      if (st.active.get(user.id).n >= MAX_ACTIVE) return deps.fail(res, 429, 'rate', 'عندك ' + MAX_ACTIVE + ' مهام شغالة. استنى واحدة تخلص.');
      let release = null;
      if (def.quota) {
        try { release = deps.reserve(user, def.quota); }
        catch (e) { return deps.fail(res, e.status || 429, e.code || 'quota', e.message, { kind: e.kind }); }
      }
      const id = crypto.randomUUID();
      const now = Date.now();
      st.insert.run(id, user.id, kind, 'queued', JSON.stringify(b.payload || {}), now, now);
      if (release) releases.set(id, release);
      queue.push(id);
      pump().catch(() => {});
      return deps.send(res, 202, { id, status: 'queued' });
    }

    const one = p.match(/^\/api\/tasks\/([0-9a-f-]{36})(\/cancel)?$/);
    if (one) {
      const row = st.one.get(one[1]);
      if (!row || row.user_id !== user.id) return deps.fail(res, 404, 'notfound', 'المهمة مش موجودة.');
      if (!one[2] && m === 'GET') return deps.send(res, 200, { task: view(row) });
      if (one[2] && m === 'POST') {
        if (row.status !== 'queued') return deps.fail(res, 400, 'input', 'ما ينفعش تلغي مهمة بدأت.');
        const i = queue.indexOf(row.id);
        if (i !== -1) queue.splice(i, 1);
        update(row.id, 'cancelled');
        refund(row.id);
        return deps.send(res, 200, { task: view(st.one.get(row.id)) });
      }
    }
    return null;
  }

  return { route, register };
}

module.exports = { init };
