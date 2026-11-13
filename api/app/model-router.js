'use strict';
// اختيار النموذج حسب نوع الطلب (المرحلة 1 من الموجّه).
// كل نوع طلب له مسار، ولكل مسار نموذج اختياري من متغيرات البيئة:
//   CF_SITE_MODEL      بناء المواقع وتعديلها
//   CF_ANALYSIS_MODEL  الأسئلة المعقدة والوكلاء (خطط، تحليل، تقارير)
//   CF_CHAT_MODEL      المحادثة العادية
//   CF_SMALL_MODEL     الأسئلة القصيرة والصوت (سريع وأرخص)
// لو المتغير فاضي يرجع للنموذج الافتراضي (CF_MODEL) = نفس السلوك القديم بالظبط.

const COMPLEX_RE = /خطة|استراتيجي|تحليل|قارن|مقارن|ميزانية|تقرير|تفصيل|خطوات|جدول|اشرح|لماذا|ليش|كيف|حلل|توقع/;

// يرجّع { kind, model } — model = null يعني النموذج الافتراضي
function pickRoute({ tool, agent, voice, msgCount, text, models }) {
  const t = String(text || '');
  const m = models || {};
  if (tool === 'site' || tool === 'site_edit') return { kind: 'site', model: m.site || null };
  if (agent) return { kind: 'analysis', model: m.analysis || null };
  if (voice) return { kind: 'voice', model: m.chat || null };
  if (tool) return { kind: 'tool', model: m.chat || null };
  if (t.length > 160 || COMPLEX_RE.test(t)) return { kind: 'analysis', model: m.analysis || null };
  if (m.small && msgCount <= 2) return { kind: 'quick', model: m.small };
  return { kind: 'chat', model: m.chat || null };
}

module.exports = { pickRoute, COMPLEX_RE };
