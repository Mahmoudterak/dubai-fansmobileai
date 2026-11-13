'use strict';
// سجل المحادثات على السيرفر: جدولان (chats و chat_messages)، والاحتفاظ 90 يوماً، وحدود ثابتة.
// كل المسارات تحت /api/chats وتتطلب تسجيل دخول (المستخدم يأتي من الراوتر الرئيسي).

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_CHATS = 40;
const MAX_MESSAGES = 200;
const MAX_CHARS = 20000;
const MAX_TITLE = 120;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function init(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    tool TEXT,
    agent TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT,
    created_at INTEGER NOT NULL
  )`);
  // عمود إضافي لحفظ باقي حقول الرسالة (المرفقات، المصدر، مهمة الفيديو...)
  const cols = db.prepare('PRAGMA table_info(chat_messages)').all().map((c) => c.name);
  if (!cols.includes('extra')) db.exec('ALTER TABLE chat_messages ADD COLUMN extra TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, updated_at)');
  db.exec('CREATE INDEX IF NOT EXISTS chat_messages_chat ON chat_messages(chat_id, id)');
}

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

function ownsChat(db, userId, id) {
  return Boolean(db.prepare('SELECT 1 FROM chats WHERE id = ? AND user_id = ?').get(id, userId));
}

function listChats(db, userId) {
  return db.prepare('SELECT id, title, tool, agent, created_at, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
    .all(userId, MAX_CHATS);
}

function getChat(db, userId, id) {
  const chat = db.prepare('SELECT id, title, tool, agent, created_at, updated_at FROM chats WHERE id = ? AND user_id = ?').get(id, userId);
  if (!chat) return null;
  const messages = db.prepare('SELECT role, content, sources, extra, created_at FROM chat_messages WHERE chat_id = ? ORDER BY id LIMIT ?')
    .all(id, MAX_MESSAGES)
    .map(toMessage);
  return { ...chat, messages };
}

// ينشئ المحادثة أو يحدّث عنوانها/أداتها
function upsertChat(db, userId, id, meta) {
  const now = Date.now();
  if (ownsChat(db, userId, id)) {
    db.prepare('UPDATE chats SET title = ?, tool = ?, agent = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(clip(meta.title, MAX_TITLE), clip(meta.tool, 40), clip(meta.agent, 40), now, id, userId);
    return { ok: true };
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM chats WHERE user_id = ?').get(userId).n >= MAX_CHATS) return { error: 'limit' };
  const taken = db.prepare('SELECT 1 FROM chats WHERE id = ?').get(id);
  if (taken) return { error: 'taken' };
  db.prepare('INSERT INTO chats (id, user_id, title, tool, agent, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, clip(meta.title, MAX_TITLE), clip(meta.tool, 40), clip(meta.agent, 40), now, now);
  return { ok: true };
}

const MAX_EXTRA = 32000;

// يحوّل صف الرسالة إلى الشكل الذي تستعمله الواجهة (يُعيد باقي الحقول من extra)
function toMessage(m) {
  let extra = {};
  try { extra = m.extra ? JSON.parse(m.extra) : {}; } catch { extra = {}; }
  return { ...extra, role: m.role, content: m.content, sources: m.sources ? JSON.parse(m.sources) : null, created_at: m.created_at };
}

// يتحقق من رسالة واحدة ويجهّزها للتخزين؛ يرجع null إذا كانت غير صالحة
function normalize(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (!['user', 'assistant'].includes(msg.role)) return null;
  const content = String(msg.content == null ? '' : msg.content);
  const hasMedia = Boolean(msg.image || msg.video || msg.att || msg.pendingJob);
  if (content.length > MAX_CHARS) return null;
  if (!content.trim() && !hasMedia) return null;
  const sources = Array.isArray(msg.sources) && msg.sources.length ? JSON.stringify(msg.sources.slice(0, 10)) : null;
  const rest = { ...msg };
  delete rest.role; delete rest.content; delete rest.sources; delete rest.created_at;
  let extra = Object.keys(rest).length ? JSON.stringify(rest) : null;
  if (extra && extra.length > MAX_EXTRA) extra = null;
  return { role: msg.role, content, sources, extra };
}

function appendMessage(db, userId, chatId, msg) {
  if (!ownsChat(db, userId, chatId)) return { error: 'not_found' };
  const row = normalize(msg);
  if (!row) return { error: 'bad_content' };
  if (db.prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE chat_id = ?').get(chatId).n >= MAX_MESSAGES) return { error: 'limit' };
  const now = Date.now();
  db.prepare('INSERT INTO chat_messages (chat_id, role, content, sources, extra, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(chatId, row.role, row.content, row.sources, row.extra, now);
  db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);
  return { ok: true };
}

// يستبدل كل رسائل المحادثة بالقائمة المرسلة (الواجهة ترسل الحالة الكاملة).
// يحتفظ بتاريخ إنشاء كل رسالة موجودة حسب ترتيبها، حتى لا تتجدد مدة الـ90 يوماً مع كل مزامنة.
function replaceMessages(db, userId, chatId, list) {
  if (!ownsChat(db, userId, chatId)) return { error: 'not_found' };
  if (!Array.isArray(list)) return { error: 'bad_content' };
  const rows = list.slice(-MAX_MESSAGES).map(normalize).filter(Boolean);
  const old = db.prepare('SELECT created_at FROM chat_messages WHERE chat_id = ? ORDER BY id').all(chatId);
  const now = Date.now();
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM chat_messages WHERE chat_id = ?').run(chatId);
    const ins = db.prepare('INSERT INTO chat_messages (chat_id, role, content, sources, extra, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    rows.forEach((r, i) => {
      const ts = i < old.length ? old[i].created_at : now;
      ins.run(chatId, r.role, r.content, r.sources, r.extra, ts);
    });
    db.prepare('UPDATE chats SET updated_at = ? WHERE id = ?').run(now, chatId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { ok: true, saved: rows.length };
}

function deleteChat(db, userId, id) {
  db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?').run(id, userId);
}

function deleteAll(db, userId) {
  db.prepare('DELETE FROM chats WHERE user_id = ?').run(userId);
}

// الاحتفاظ: تحذف الرسائل الأقدم من 90 يوماً، ثم المحادثات الفارغة الأقدم منه
function purgeOld(db) {
  const cutoff = Date.now() - RETENTION_MS;
  const a = db.prepare('DELETE FROM chat_messages WHERE created_at < ?').run(cutoff).changes;
  const b = db.prepare('DELETE FROM chats WHERE updated_at < ? AND id NOT IN (SELECT chat_id FROM chat_messages)').run(cutoff).changes;
  if (a || b) console.log(`chats purge: ${a} messages, ${b} empty chats`);
  return { messages: a, chats: b };
}

function start(db) {
  purgeOld(db);
  const t = setInterval(() => { try { purgeOld(db); } catch (e) { console.error('chats purge failed:', e.message); } }, 6 * 60 * 60 * 1000);
  if (t.unref) t.unref();
}

// يرجع true لو الطلب خاص بالمحادثات (وتم الرد عليه)
async function handle({ db, req, res, user, p, m, readJson, send, fail }) {
  if (p !== '/api/chats' && !p.startsWith('/api/chats/')) return false;
  const parts = p.slice('/api/chats'.length).split('/').filter(Boolean);
  const id = parts[0];
  if (id && !ID_RE.test(id)) { fail(res, 400, 'bad_request', 'معرّف المحادثة غير صالح.'); return true; }

  if (parts.length === 0) {
    if (m === 'GET') { send(res, 200, { chats: listChats(db, user.id) }); return true; }
    if (m === 'DELETE') { deleteAll(db, user.id); send(res, 200, { ok: true }); return true; }
  }
  if (parts.length === 1) {
    if (m === 'GET') {
      const chat = getChat(db, user.id, id);
      if (!chat) fail(res, 404, 'not_found', 'المحادثة مش موجودة.');
      else send(res, 200, { chat });
      return true;
    }
    if (m === 'PUT') {
      const body = await readJson(req, 16 * 1024);
      const r = upsertChat(db, user.id, id, body || {});
      if (r.error === 'limit') fail(res, 409, 'limit', 'وصلت للحد الأقصى من المحادثات. احذف محادثة قديمة.');
      else if (r.error === 'taken') fail(res, 409, 'taken', 'المعرّف مستخدم.');
      else send(res, 200, { ok: true });
      return true;
    }
    if (m === 'DELETE') { deleteChat(db, user.id, id); send(res, 200, { ok: true }); return true; }
  }
  if (parts.length === 2 && parts[1] === 'messages' && m === 'POST') {
    const body = await readJson(req, 64 * 1024);
    const r = appendMessage(db, user.id, id, body || {});
    if (r.error === 'not_found') fail(res, 404, 'not_found', 'المحادثة مش موجودة.');
    else if (r.error) fail(res, 400, r.error, 'الرسالة غير صالحة أو وصلت للحد.');
    else send(res, 200, { ok: true });
    return true;
  }
  if (parts.length === 2 && parts[1] === 'messages' && m === 'PUT') {
    const body = await readJson(req, 4 * 1024 * 1024);
    const r = replaceMessages(db, user.id, id, Array.isArray(body) ? body : (body && body.messages));
    if (r.error === 'not_found') fail(res, 404, 'not_found', 'المحادثة مش موجودة.');
    else if (r.error) fail(res, 400, r.error, 'الرسائل غير صالحة.');
    else send(res, 200, { ok: true, saved: r.saved });
    return true;
  }
  return false;
}

// نفس منطق الواجهة: يحذف سطر الاقتراحات [[...]] من آخر الرد قبل حفظه
function splitSuggestText(t) {
  t = String(t || '');
  const i = t.lastIndexOf('[[');
  if (i < 0) {
    const k = t.lastIndexOf('[');
    if (k >= 0 && k >= t.length - 2 && (k === 0 || t[k - 1] === '\n')) return t.slice(0, k).replace(/\s+$/, '');
    return t;
  }
  const rest = t.slice(i);
  if (!/^\[\[[^\n\]]*(\]\]?)?\s*$/.test(rest)) return t;
  return t.slice(0, i).replace(/\s+$/, '');
}

// يحفظ دورة كاملة (سؤال + رد) بعد اكتمال الرد، حتى لو كان المستخدم قد أغلق الصفحة.
// السؤال يُحفظ مرة واحدة فقط: إذا كانت آخر رسالة محفوظة هي نفس السؤال فلا يُكرَّر.
function persistTurn(db, userId, chatId, turn) {
  const reply = splitSuggestText(turn.reply).trim();
  if (!reply) return { error: 'empty' };
  if (!ownsChat(db, userId, chatId)) {
    // محادثة جديدة لم تُرفع بعد: ننشئها بعنوان من السؤال
    const r = upsertChat(db, userId, chatId, { title: String(turn.userText || '').slice(0, 48), tool: turn.tool, agent: turn.agent });
    if (r.error) return r;
  }
  const last = db.prepare('SELECT role, content FROM chat_messages WHERE chat_id = ? ORDER BY id DESC LIMIT 1').get(chatId);
  if (!(last && last.role === 'user' && last.content === turn.userText)) {
    const u = appendMessage(db, userId, chatId, { role: 'user', content: turn.userText });
    if (u.error) return u;
  }
  return appendMessage(db, userId, chatId, { role: 'assistant', content: reply, sources: turn.sources || null, tool: turn.tool || undefined, agent: turn.agent || undefined });
}

module.exports = { init, start, handle, purgeOld, listChats, getChat, upsertChat, appendMessage, replaceMessages, persistTurn, ownsChat, deleteChat, deleteAll, RETENTION_MS };
