'use strict';
// طابور مهام داخلي في قاعدة البيانات (SQLite): مهمة واحدة في كل مرة، مع إعادة محاولة حتى 3 مرات.
// يبدأ بعد تشغيل الـAPI. المهام المعلّقة من تشغيل سابق تُعاد للطابور تلقائياً.

const MAX_ATTEMPTS = 3;
const TICK_MS = 3000;

let handlers = {};
let timer = null;
let busy = false;

function init(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS bg_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at INTEGER NOT NULL,
    done_at INTEGER
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS bg_tasks_status ON bg_tasks(status, id)');
  // أي مهمة كانت "قيد التنفيذ" عند توقف الخدمة نعيدها للطابور
  db.prepare("UPDATE bg_tasks SET status = 'queued' WHERE status = 'running'").run();
}

function enqueue(db, kind, payload) {
  try {
    db.prepare('INSERT INTO bg_tasks (kind, payload, created_at) VALUES (?, ?, ?)').run(kind, JSON.stringify(payload || {}), Date.now());
  } catch (e) {
    console.error('bgtasks enqueue failed:', e.message);
  }
}

async function tick(db) {
  if (busy) return;
  const row = db.prepare("SELECT id, kind, payload, attempts FROM bg_tasks WHERE status = 'queued' ORDER BY id LIMIT 1").get();
  if (!row) return;
  busy = true;
  db.prepare("UPDATE bg_tasks SET status = 'running', attempts = attempts + 1 WHERE id = ?").run(row.id);
  try {
    const fn = handlers[row.kind];
    if (!fn) throw new Error('no handler for ' + row.kind);
    await fn(JSON.parse(row.payload));
    db.prepare("UPDATE bg_tasks SET status = 'done', error = NULL, done_at = ? WHERE id = ?").run(Date.now(), row.id);
  } catch (e) {
    const attempts = row.attempts + 1;
    const final = attempts >= MAX_ATTEMPTS;
    db.prepare('UPDATE bg_tasks SET status = ?, error = ?, done_at = ? WHERE id = ?')
      .run(final ? 'failed' : 'queued', String(e.message || e).slice(0, 300), final ? Date.now() : null, row.id);
    console.error(`bgtask ${row.kind} #${row.id} attempt ${attempts} failed: ${e.message}`);
  } finally {
    busy = false;
  }
}

// يبدأ الطابور مع قائمة المعالجات (kind -> async function(payload))
function start(db, map) {
  handlers = map || {};
  if (timer) return;
  timer = setInterval(() => { tick(db).catch(() => {}); }, TICK_MS);
  if (timer.unref) timer.unref();
}

module.exports = { init, enqueue, start };
