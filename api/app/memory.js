'use strict';
// الذاكرة طويلة الأمد: حقائق قصيرة يحفظها المستخدم بموافقته ("احفظ: ...") أو من لوحة نشاطه.
// تُضاف للنظام في كل محادثة لاحقة، ويقدر المستخدم يعرضها ويحذف أي عنصر.
// ما نحفظ أي شيء حساس (بطاقات، هوية، IBAN) ولا محاولات كسر التعليمات.

const guards = require('./guards.js');
const { cosine } = require('./kb.js');

const MAX_PER_USER = 100;
const MAX_CHARS = 300;
const MIN_CHARS = 3;
const CONTEXT_ITEMS = 30;  // رجوع للأحدث لو التضمين فشل
const RECALL_TOP = 8;      // أقصى عدد معلومات بتتحقن لكل رسالة
const RECALL_MIN = 0.3;    // أقل تشابه مقبول بين السؤال والمعلومة
const MIN_QUERY = 8;       // رسايل أقصر من كده (تحية مثلاً) ما نبحث لها

// "احفظ ..." / "تذكّر ..." / "خزّن ..." في أول الرسالة
const SAVE_RE = /^\s*(?:احفظ|تذكّر|تذكر|خزّن|خزن)\s*(?:لي|ان|إن|أن)?\s*[:،,\-]?\s*([\s\S]+)$/;

function clean(text) {
  return String(text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
}

// يرجّع نص الحفظ إن كانت الرسالة أمر حفظ، أو null
function parseSaveCommand(text) {
  const t = String(text || '').trim();
  if (t.length > MAX_CHARS + 20) return null;
  const m = t.match(SAVE_RE);
  return m ? clean(m[1]) : null;
}

// يتحقق من النص قبل الحفظ ويرجّع {ok, text} أو {ok:false, message}
function validate(raw) {
  const text = clean(raw);
  if (text.length < MIN_CHARS) return { ok: false, message: 'اكتب المعلومة اللي عايزني أحفظها (3 حروف على الأقل).' };
  if (text.length > MAX_CHARS) return { ok: false, message: `المعلومة طويلة. خليها أقل من ${MAX_CHARS} حرف.` };
  if (guards.isJailbreak(text)) return { ok: false, message: guards.BLOCK_MESSAGE };
  // الرسالة تمر بإخفاء البيانات قبل وصولها، فنرفض أي صيغة مخفية أيضاً
  if (/\[(بطاقة|هوية|IBAN) محجوب/.test(text) || guards.maskPII(text) !== text) return { ok: false, message: 'ما أحفظش أرقام بطاقات أو هوية أو حسابات بنكية. احفظ المعلومة من غير الأرقام دي.' };
  return { ok: true, text };
}

function init(db, embedFn) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_memories_user ON user_memories(user_id, created_at);
  `);
  // عمود المتجه (JSON). بيتضاف مرة واحدة للجداول القديمة
  if (!db.prepare('PRAGMA table_info(user_memories)').all().some((c) => c.name === 'vec')) {
    db.exec('ALTER TABLE user_memories ADD COLUMN vec TEXT');
  }

  const st = {
    count: db.prepare('SELECT COUNT(*) AS n FROM user_memories WHERE user_id = ?'),
    dup: db.prepare('SELECT id FROM user_memories WHERE user_id = ? AND lower(text) = lower(?)'),
    insert: db.prepare('INSERT INTO user_memories (user_id, text, created_at) VALUES (?, ?, ?)'),
    list: db.prepare('SELECT id, text, created_at FROM user_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
    withVec: db.prepare('SELECT id, text, vec FROM user_memories WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
    setVec: db.prepare('UPDATE user_memories SET vec = ? WHERE id = ?'),
    del: db.prepare('DELETE FROM user_memories WHERE id = ? AND user_id = ?'),
  };

  // يحسب متجهات المعلومات اللي لسه ما اتحسبتش (معلومة جديدة أو فشل سابق)
  async function fillVectors(rows) {
    const missing = rows.filter((r) => !r.vec);
    if (!missing.length || !embedFn) return;
    const vecs = await embedFn(missing.map((r) => r.text));
    missing.forEach((r, i) => {
      r.vec = JSON.stringify(vecs[i].map((v) => Math.round(v * 1e5) / 1e5));
      st.setVec.run(r.vec, r.id);
    });
  }

  // يحفظ معلومة. يرجّع {ok, id?, duplicate?, message?}
  function add(userId, raw) {
    const v = validate(raw);
    if (!v.ok) return v;
    const dup = st.dup.get(userId, v.text);
    if (dup) return { ok: true, id: dup.id, duplicate: true };
    if (st.count.get(userId).n >= MAX_PER_USER) {
      return { ok: false, message: `وصلت للحد (${MAX_PER_USER} معلومة). احذف بعضها عشان أحفظ جديد.` };
    }
    const r = st.insert.run(userId, v.text, Date.now());
    const id = Number(r.lastInsertRowid);
    // التضمين في الخلفية؛ لو فشل بيتعاد لاحقاً في الاسترجاع
    if (embedFn) fillVectors([{ id, text: v.text, vec: null }]).catch((e) => console.error('memory embed failed:', e.message));
    return { ok: true, id };
  }

  function list(userId) { return st.list.all(userId, MAX_PER_USER); }

  function remove(userId, id) { return st.del.run(Number(id), userId).changes > 0; }

  // يرجّع المعلومات الأقرب للرسالة الحالية. لو التضمين مش متاح يرجّع الأحدث
  async function retrieve(userId, query) {
    const qtext = String(query || '').trim();
    const latest = () => st.list.all(userId, CONTEXT_ITEMS).map((i) => i.text);
    if (!embedFn || qtext.length < MIN_QUERY) return latest();
    try {
      const rows = st.withVec.all(userId, MAX_PER_USER);
      if (!rows.length) return [];
      await fillVectors(rows);
      const [qv] = await embedFn([qtext.slice(0, 1000)]);
      return rows
        .map((r) => ({ text: r.text, score: cosine(qv, JSON.parse(r.vec)) }))
        .filter((r) => r.score >= RECALL_MIN)
        .sort((a, b) => b.score - a.score)
        .slice(0, RECALL_TOP)
        .map((r) => r.text);
    } catch (e) {
      console.error('memory retrieve failed:', e.message);
      return latest();
    }
  }

  // نص يُضاف لنظام المحادثة من المعلومات المختارة. فاضي لو مفيش ما يناسب السؤال
  function contextBlock(texts) {
    if (!texts || !texts.length) return '';
    return '\n\nمعلومات حفظها هذا المستخدم بنفسه في محادثات سابقة. استخدمها عند الصلة فقط، ولا تذكرها من غير سبب:\n'
      + texts.map((t) => `- ${t}`).join('\n');
  }

  return { add, list, remove, retrieve, contextBlock };
}

module.exports = { init, parseSaveCommand, validate, MAX_PER_USER };
