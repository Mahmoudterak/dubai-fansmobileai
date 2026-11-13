'use strict';
// المايسترو: بيجمع الإشارات من مراقب السوق + الكلمة اللي كتبها المالك (اختياري)،
// ويطلب من النموذج توصية واحدة بحقول ثابتة، ويسجلها في المستشار "بانتظار الموافقة".
// ما بيصرفش ولا بينشر ولا بيعدّل الموقع. كل قرار فعلي بيفضل يدوي بعد موافقتك.

const { gatherSignals } = require('./market-monitor.js');
const { KINDS } = require('./recommender.js');

const MAX_TOPIC = 80;

function extractJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch (e) { return null; }
}

// ينظّف الكلمة/الموضوع: من غير أحرف تحكم أو علامات اقتباس، وبحد أقصى للطول
function cleanTopic(v) {
  return String(v || '').replace(/[\u0000-\u001f"'<>`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_TOPIC);
}

const SYSTEM = 'انت محلل تسويق لسوق الإمارات. اقرأ البيانات وارجع توصية واحدة فقط بصيغة JSON بدون أي شرح خارجه، '
  + 'بالحقول: kind (واحد من: budget, content, pricing, other)، title (عنوان قصير بالعربية)، '
  + 'reason (سبب واضح من البيانات دي فقط، ومن غير ما تخترع أرقام أو نتائج). البيانات دي عينة صغيرة (حوالي 10 فيديوهات)، '
  + 'فلو بتستنتج حاجة من غيابها، اكتبها كـ"في العينة دي فقط" ومتقولش "لا يوجد" أو "السوق خالي" بشكل مطلق. '
  + 'ما تقترحش أي صرف أو نشر، بس توصية للمراجعة.';

function init(db, deps) {
  const recommender = deps.recommender;

  async function decide(userId, topicRaw) {
    const topic = cleanTopic(topicRaw);
    const sig = await gatherSignals(deps.youtubeKey);
    const sources = { youtube: sig.youtube_reason, topic: topic ? 'yes' : 'no' };
    if (!sig.youtube_items.length && !topic) return { error: 'no_data', sources };

    const ctx = {
      market: 'الإمارات',
      topic: topic || null,
      youtube_trending: sig.youtube_items.slice(0, 10).map((v) => ({ title: v.title, tags: v.tags.slice(0, 5) })),
    };
    const raw = await deps.complete([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(ctx) },
    ], 400, 60000);

    const j = extractJson(raw);
    if (!j || !KINDS.includes(j.kind)) return { error: 'model', sources };
    try {
      const id = recommender.create(userId, {
        kind: j.kind,
        title: String(j.title || ''),
        reason: String(j.reason || '') + ' (مصدر: تحليل السوق الآلي، راجعه قبل أي تنفيذ)',
        expected_roi: null,
      });
      return { ok: true, id, status: 'pending', sources };
    } catch (e) {
      if (e.code === 'input') return { error: 'model', sources };
      throw e;
    }
  }

  async function route(req, res, user, p, m) {
    if (p !== '/api/advisor/market/analyze' || m !== 'POST') return null;
    if (deps.rateLimited('market:' + user.id, 5, 3600000)) return deps.fail(res, 429, 'rate', 'تحليلات كتير. جرّب بعد ساعة.');
    const b = await deps.readJson(req, 4 * 1024);
    let out;
    try {
      out = await decide(user.id, b.topic);
    } catch (e) {
      console.error('market analyze failed:', e.message);
      return deps.fail(res, 502, 'model', 'حصلت مشكلة في التحليل. جرّب بعدين.');
    }
    if (out.error === 'no_data') return deps.fail(res, 400, 'no_data', 'اكتب كلمة أو موضوع، أو فعّل مفتاح يوتيوب عشان فيه بيانات تتحلل.');
    if (out.error === 'model') return deps.fail(res, 502, 'model', 'النموذج ما رجعش توصية صالحة. جرّب تاني.');
    return deps.send(res, 200, out);
  }

  return { route, decide };
}

module.exports = { init, extractJson, cleanTopic };
