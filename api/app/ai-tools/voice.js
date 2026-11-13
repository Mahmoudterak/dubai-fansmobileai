'use strict';
// صوت العلامة التجارية: المستخدم يلصق نصوص كتبها (منشورات، إعلانات، رسائل)،
// والنموذج بيستخرج "ملف أسلوب" قصير. الملف ده بس هو اللي بيتحفظ، النصوص الأصلية لا.
// بعدها أي نص بيتولّد في المنصة بيتكتب بنفس الأسلوب.

const MIN_CHARS = 300;
const MAX_CHARS = 20000;
const MAX_PROFILE = 1200;

function init(db, deps) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_voices (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  const st = {
    get: db.prepare('SELECT profile, updated_at FROM brand_voices WHERE user_id = ?'),
    upsert: db.prepare(`INSERT INTO brand_voices (user_id, profile, updated_at) VALUES (?, ?, ?)
                        ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`),
    del: db.prepare('DELETE FROM brand_voices WHERE user_id = ?'),
  };

  const EXTRACT_PROMPT = 'انت محلل أسلوب كتابة. اقرأ النصوص دي وارجع ملف أسلوب قصير بالعربية (حتى 120 كلمة) يوصف: '
    + 'نبرة الكلام، طول الجمل، الكلمات والعبارات اللي بتتكرر، طريقة الترحيب والختام، استخدام الإيموجي والهاشتاجات، '
    + 'والعامية أو الفصحى وأي لهجة. ما تنسخش أي جملة كاملة من النصوص. نص عادي بدون markdown.';

  async function extract(samples) {
    const raw = await deps.complete([
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: samples },
    ], 350, 60000);
    return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROFILE);
  }

  function status(userId) {
    const row = st.get.get(userId);
    return { profile: row ? row.profile : null, updated_at: row ? row.updated_at : null };
  }

  // نص يُحقن في النظام للشات والتوليد. فاضي لو مفيش صوت محفوظ
  function contextBlock(userId) {
    const row = st.get.get(userId);
    if (!row) return '';
    return '\n\nصوت العلامة التجارية لهذا المستخدم (اكتب بنفس الأسلوب في أي نص تنتجه، ومن غير ما تنسخ جمل بعينها):\n' + row.profile;
  }

  async function route(req, res, user, p, m) {
    if (p === '/api/ai-tools/voice' && m === 'GET') return deps.send(res, 200, status(user.id));
    if (p === '/api/ai-tools/voice' && m === 'DELETE') {
      st.del.run(user.id);
      return deps.send(res, 200, { ok: true });
    }
    if (p === '/api/ai-tools/voice' && m === 'POST') {
      if (deps.rateLimited('voice:' + user.id, 5, 3600000)) return deps.fail(res, 429, 'rate', 'محاولات كتير. جرّب بعد ساعة.');
      const b = await deps.readJson(req, 64 * 1024);
      const samples = String(b.samples || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim();
      if (samples.length < MIN_CHARS) return deps.fail(res, 400, 'input', `الصق على الأقل ${MIN_CHARS} حرف من نصوص كتبتها.`);
      if (samples.length > MAX_CHARS) return deps.fail(res, 400, 'input', `النصوص طويلة. خليها أقل من ${MAX_CHARS} حرف.`);
      let profile;
      try { profile = await extract(samples); }
      catch (e) { console.error('voice extract failed:', e.message); return deps.fail(res, 502, 'model', 'مقدرناش نحلل الأسلوب دلوقتي. جرّب بعدين.'); }
      if (!profile) return deps.fail(res, 502, 'model', 'مقدرناش نطلع ملف أسلوب من النصوص دي. جرّب نصوص أطول.');
      st.upsert.run(user.id, profile, Date.now());
      return deps.send(res, 200, status(user.id));
    }
    return null;
  }

  return { route, contextBlock, status };
}

module.exports = { init };
