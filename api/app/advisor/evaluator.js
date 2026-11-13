'use strict';
// المحلل: بعد ما المالك ينفذ توصية يدوياً ويدخل الأرقام الفعلية (صرف وعائد)،
// بيحسب العائد ويقارنه بالمتوقع. حساب بس، ما بيغيّرش أي حاجة برا الجدول ده.

const MAX_AMOUNT = 1e9;
// (الجدول advisor_evals بيتعمل في recommender.js قبل أي استعلام يعتمد عليه)

function verdictOf(roi, expected) {
  if (roi === null) return 'no_spend';
  if (expected === null || expected === undefined) return roi >= 0 ? 'positive' : 'loss';
  if (roi >= expected) return 'met';
  if (roi >= 0) return 'positive_below_expected';
  return 'loss';
}

// جدول advisor_evals بيتعمل في recommender.js (هو اللي بيملك الـ schema). هنا بس نستعمله
function init(db, deps) {
  const st = {
    rec: db.prepare('SELECT id, status, expected_roi FROM advisor_recs WHERE id = ? AND user_id = ?'),
    upsert: db.prepare(`INSERT INTO advisor_evals (rec_id, spend, revenue, roi, expected_roi, verdict, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(rec_id) DO UPDATE SET spend = excluded.spend, revenue = excluded.revenue,
                          roi = excluded.roi, expected_roi = excluded.expected_roi, verdict = excluded.verdict,
                          created_at = excluded.created_at`),
  };

  function amount(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
    return n;
  }

  // يحسب ويحفظ التقييم. الصرف لازم يكون أكبر من صفر عشان العائد يتحسب
  function evaluate(userId, recId, spendRaw, revenueRaw) {
    const rec = st.rec.get(recId, userId);
    if (!rec) return { error: 'not_found' };
    if (rec.status !== 'done') return { error: 'not_done', status: rec.status };
    const spend = amount(spendRaw);
    const revenue = amount(revenueRaw);
    if (spend === null || revenue === null) return { error: 'input' };
    const roi = spend > 0 ? (revenue - spend) / spend : null;
    const expected = rec.expected_roi === null ? null : Number(rec.expected_roi);
    const verdict = verdictOf(roi, expected);
    st.upsert.run(recId, spend, revenue, roi, expected, verdict, Date.now());
    return { ok: true, spend, revenue, roi, expected_roi: expected, verdict };
  }

  async function route(req, res, user, p, m) {
    const mm = p.match(/^\/api\/advisor\/recs\/(\d+)\/evaluate$/);
    if (!mm || m !== 'POST') return null;
    if (deps.rateLimited('advisor-eval:' + user.id, 60, 3600000)) return deps.fail(res, 429, 'rate', 'تقييمات كتير. جرّب بعد شوية.');
    const b = await deps.readJson(req, 4 * 1024);
    const out = evaluate(user.id, Number(mm[1]), b.spend, b.revenue);
    if (out.error === 'not_found') return deps.fail(res, 404, 'not_found', 'التوصية دي مش موجودة.');
    if (out.error === 'not_done') return deps.fail(res, 409, 'state', 'قيّم التوصية بعد ما تنفذها يدوياً (علّمها "تم التنفيذ").');
    if (out.error === 'input') return deps.fail(res, 400, 'input', 'الصرف والعائد لازم يكونوا أرقام موجبة.');
    return deps.send(res, 200, out);
  }

  return { route, evaluate, verdictOf };
}

module.exports = { init, verdictOf };
