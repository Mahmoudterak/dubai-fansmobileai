'use strict';
// قاعدة المعرفة (RAG): مستندات يرفعها الأدمن (أسعار، سياسات، خدمات، أسئلة شائعة)،
// تُقسَّم لمقاطع، ولكل مقطع متجه (embedding) من Cloudflare (bge-m3).
// عند كل سؤال نجيب أقرب المقاطع ونحقنها في النظام. لو القاعدة فاضية ما نعمل أي استدعاء (توفير).

const crypto = require('node:crypto');

const EMBED_MODEL = '@cf/baai/bge-m3';
const CHUNK = 700;        // حروف لكل مقطع
const OVERLAP = 100;      // تداخل بين المقاطع حتى ما تنقطع الفكرة
const TOP_K = 4;
const MIN_SCORE = 0.35;   // أقل تشابه مقبول
const MIN_QUERY = 12;     // أسئلة أقصر من كده (تحية مثلاً) ما نبحث لها: توفير
const MAX_DOC_CHARS = 60000;
const EMBED_BATCH = 16;

function chunkText(text) {
  const clean = String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const out = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + CHUNK, clean.length);
    if (end < clean.length) {
      const cut = clean.lastIndexOf('\n', end);
      if (cut > i + CHUNK / 2) end = cut;
    }
    const piece = clean.slice(i, end).trim();
    if (piece) out.push(piece);
    if (end >= clean.length) break;
    i = Math.max(end - OVERLAP, i + 1);
  }
  return out;
}

function cosine(a, b) {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function init(db, cfgFn) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      chars INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kb_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT NOT NULL REFERENCES kb_docs(id) ON DELETE CASCADE,
      idx INTEGER NOT NULL,
      text TEXT NOT NULL,
      vec TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS kb_chunks_doc ON kb_chunks(doc_id);
  `);
  db.exec('PRAGMA foreign_keys = ON;');

  const st = {
    insDoc: db.prepare('INSERT INTO kb_docs (id, title, chars, created_at) VALUES (?, ?, ?, ?)'),
    insChunk: db.prepare('INSERT INTO kb_chunks (doc_id, idx, text, vec) VALUES (?, ?, ?, ?)'),
    listDocs: db.prepare(`SELECT d.id, d.title, d.chars, d.created_at, COUNT(c.id) AS chunks
                          FROM kb_docs d LEFT JOIN kb_chunks c ON c.doc_id = d.id GROUP BY d.id ORDER BY d.created_at DESC`),
    delDoc: db.prepare('DELETE FROM kb_docs WHERE id = ?'),
    allChunks: db.prepare('SELECT c.text, c.vec, d.title FROM kb_chunks c JOIN kb_docs d ON d.id = c.doc_id'),
    count: db.prepare('SELECT COUNT(*) AS n FROM kb_chunks'),
  };

  // كاش المتجهات في الذاكرة، يتحدّث عند كل تعديل
  let index = null;
  const loadIndex = () => {
    if (index) return index;
    index = st.allChunks.all().map((r) => ({ text: r.text, title: r.title, vec: JSON.parse(r.vec) }));
    return index;
  };
  const dirty = () => { index = null; };

  async function embed(texts) {
    const cfg = cfgFn();
    if (!cfg || !cfg.account || !cfg.token) throw new Error('Cloudflare غير مضبوط');
    const out = [];
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(`${cfg.base}/accounts/${cfg.account}/ai/run/${EMBED_MODEL}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: batch }),
          signal: ctrl.signal,
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`embed ${res.status}`);
        const data = (j.result && j.result.data) || j.data;
        if (!Array.isArray(data) || data.length !== batch.length) throw new Error('embed: شكل رد غير متوقع');
        out.push(...data);
      } finally { clearTimeout(timer); }
    }
    return out;
  }

  // يضيف مستنداً: يقسّمه، يحسب المتجهات، ويحفظ كل شيء في معاملة واحدة
  async function addDoc(title, text) {
    const body = String(text || '').slice(0, MAX_DOC_CHARS);
    const chunks = chunkText(body);
    if (!chunks.length) throw Object.assign(new Error('المستند فاضي'), { status: 400 });
    const vectors = await embed(chunks);
    const id = crypto.randomBytes(8).toString('hex');
    db.exec('BEGIN');
    try {
      st.insDoc.run(id, String(title || 'بدون عنوان').slice(0, 120), body.length, Date.now());
      chunks.forEach((c, i) => st.insChunk.run(id, i, c, JSON.stringify(vectors[i].map((v) => Math.round(v * 1e5) / 1e5))));
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
    dirty();
    return { id, title, chunks: chunks.length };
  }

  function listDocs() { return st.listDocs.all(); }
  function removeDoc(id) { const r = st.delDoc.run(String(id)); dirty(); return r.changes > 0; }

  // يرجّع أقرب المقاطع للسؤال. لو فشل أو القاعدة فاضية يرجّع [] ولا يوقف الرد
  async function retrieve(query) {
    const qtext = String(query || '').trim();
    if (qtext.length < MIN_QUERY) return [];
    if (!st.count.get().n) return [];
    try {
      const idx = loadIndex();
      const [qv] = await embed([qtext.slice(0, 1000)]);
      return idx
        .map((c) => ({ title: c.title, text: c.text, score: cosine(qv, c.vec) }))
        .filter((c) => c.score >= MIN_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_K);
    } catch (e) {
      console.error('kb retrieve failed:', e.message);
      return [];
    }
  }

  // نص جاهز للحقن في نظام الرسالة
  function contextBlock(hits) {
    if (!hits.length) return '';
    return '\n\nمعلومات من قاعدة معرفة النشاط (استخدمها كمرجع أساسي إن كانت ذات صلة، ولا تخترع ما ليس فيها):\n'
      + hits.map((h, i) => `[${i + 1}] ${h.title}: ${h.text}`).join('\n');
  }

  return { addDoc, listDocs, removeDoc, retrieve, contextBlock, embed };
}

module.exports = { init, chunkText, cosine, MIN_QUERY };
