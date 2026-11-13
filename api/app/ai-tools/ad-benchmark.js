'use strict';
// قارن إعلانك بإعلان منافس: المستخدم بيرفع الإعلانين بنفسه (صورة أو نص لكل واحد).
// تقدير إبداعي على المادة المرفوعة بس، مش توقع مبيعات. بيستهلك من حصة الـ Radar في الباقة.
// المقارنة نفسها (compare) بتتستخدم في الرد المباشر وفي المهام الخلفية.

const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 3.5 * 1024 * 1024;   // بالحروف بعد base64
const MAX_TEXT = 1500;

const PROMPT = 'You compare two ads for the UAE market: "mine" (the user\'s new ad) and "rival" (a competitor ad the user supplied). '
  + 'Judge only what is visible in the images or written in the text; do not invent facts about the brand or the offer. '
  + 'Score the user\'s ad from 1 to 10 on three criteria: visual appeal (attention in the first second, composition, readability), '
  + 'hook strength (does the first line or image stop the scroll), and offer clarity (is the offer, price and call to action clear). '
  + 'Be honest and specific. The score is an estimate of creative quality, not a prediction of sales. '
  + 'Then give up to 5 concrete changes to the user\'s ad that would help it stand out against the rival ad, each tied to what you saw. '
  + 'Write all text in simple Arabic that Gulf readers understand. '
  + 'Return ONLY a JSON object, no other text, in this shape: '
  + '{"score": number, "criteria": [{"name": "...", "score": number, "note": "..."}], "summary": "...", '
  + '"recommendations": [{"title": "...", "change": "..."}], "caveat": "..."}';

const DEFAULT_CAVEAT = 'التقييم تقدير إبداعي على المادة المرفوعة بس، ومش توقع للمبيعات.';

function sideBlocks(label, side) {
  const parts = [{ type: 'text', text: label + (side.text ? ':\n' + side.text : ':') }];
  if (side.image) parts.push({ type: 'image_url', image_url: { url: side.image } });
  return parts;
}

function clampScore(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(1, Math.min(10, Math.round(v * 10) / 10));
}

function parseResult(raw) {
  const text = String(raw || '');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j;
  try { j = JSON.parse(m[0]); } catch (e) { return null; }
  const score = clampScore(j.score);
  if (score == null) return null;
  const criteria = (Array.isArray(j.criteria) ? j.criteria : []).slice(0, 3).map((c) => ({
    name: String((c && c.name) || '').slice(0, 60),
    score: clampScore(c && c.score),
    note: String((c && c.note) || '').slice(0, 300),
  })).filter((c) => c.name && c.score != null);
  const recommendations = (Array.isArray(j.recommendations) ? j.recommendations : []).slice(0, 5).map((r) => ({
    title: String((r && r.title) || '').slice(0, 120),
    change: String((r && r.change) || '').slice(0, 400),
  })).filter((r) => r.title && r.change);
  return {
    score,
    criteria,
    summary: String(j.summary || '').slice(0, 600),
    recommendations,
    caveat: String(j.caveat || DEFAULT_CAVEAT).slice(0, 300),
  };
}

function fail(code, message) {
  return Object.assign(new Error(message), { code });
}

function init(db, deps) {
  // يرجّع النص والصورة بعد التنظيف، أو null لو الطرف فاضي
  function cleanSide(s) {
    const text = String((s && s.text) || '').trim().slice(0, MAX_TEXT);
    const image = s && s.image ? String(s.image) : '';
    if (image && (!IMG_RE.test(image) || image.length > MAX_IMAGE)) return { error: true };
    return { text, image };
  }

  // يتأكد من المدخلات ويرجّع الطرفين، وبيرمي خطأ input لو فيه مشكلة
  function checkSides(mineIn, rivalIn) {
    const mine = cleanSide(mineIn);
    const rival = cleanSide(rivalIn);
    if (mine.error || rival.error) throw fail('input', 'ارفع صورة PNG أو JPG أو WebP، وحجمها أقل من 2.5 ميجا.');
    if (!(mine.text || mine.image) || !(rival.text || rival.image)) throw fail('input', 'محتاج إعلانك وإعلان المنافس: صورة أو نص لكل واحد.');
    return { mine, rival };
  }

  // المقارنة نفسها: بتستخدم في الرد المباشر وفي المهام الخلفية
  async function compare(mineIn, rivalIn) {
    const { mine, rival } = checkSides(mineIn, rivalIn);
    const content = [{ type: 'text', text: PROMPT }, ...sideBlocks('mine', mine), ...sideBlocks('rival', rival)];
    const r = await deps.cfRun(deps.visionModel, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content }], max_tokens: 2000 }),
    }, 120000);
    const raw = (r && (r.response || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || '';
    const result = parseResult(raw);
    if (!result) throw fail('model', 'مقدرناش نقرأ نتيجة المقارنة. جرّب بصورة أوضح أو نص أوضح.');
    return result;
  }

  async function route(req, res, user, p, m) {
    if (p !== '/api/ai-tools/ad-benchmark' || m !== 'POST') return null;
    if (deps.rateLimited('bench:' + user.id, 10, 3600000)) return deps.fail(res, 429, 'rate', 'مقارنات كتير. جرّب بعد شوية.');
    const b = await deps.readJson(req, 8 * 1024 * 1024);
    try { checkSides(b.mine, b.rival); }
    catch (e) { return deps.fail(res, 400, 'input', e.message); }

    let release;
    try { release = deps.reserve(user, 'radar'); }
    catch (e) { return deps.fail(res, e.status || 429, e.code || 'quota', e.message, { kind: e.kind }); }
    try {
      const result = await compare(b.mine, b.rival);
      return deps.send(res, 200, result);
    } catch (e) {
      release();
      if (e.code === 'model') return deps.fail(res, 502, 'model', e.message);
      console.error('ad benchmark failed:', e.message);
      return deps.fail(res, 502, 'model', 'حصلت مشكلة في المقارنة. جرّب بعدين.');
    }
  }

  return { route, compare };
}

module.exports = { init };
