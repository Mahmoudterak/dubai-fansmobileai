'use strict';
// مقيّم الجمهور الافتراضي: ثلاث شخصيات ثابتة من الجمهور الخليجي والمقيم بيقرأوا الإعلان أو العرض ويقولوا رد فعلهم.
// ده تقدير بالذكاء الاصطناعي، مش بيانات جمهور حقيقي، والرد بيوضح كده للمستخدم.

const MAX_CONTENT = 2000;

const PERSONAS = [
  { id: 'majid', name: 'ماجد', profile: 'مواطن إماراتي يفضل الجودة العالية والبراندات المحلية، ولا تهمه العروض الرخيصة، وحساس للاحترام والذوق الخليجي في الإعلانات.' },
  { id: 'lina', name: 'لينا', profile: 'مقيمة عربية في دبي، تبحث عن التوصيل السريع والخصومات الواضحة، وتقارن الأسعار قبل ما تشتري.' },
  { id: 'david', name: 'ديفيد', profile: 'مقيم أجنبي في الإمارات، يبحث عن منتجات طبيعية ومستدامة، ويفضّل الكلام الواضح بالإنجليزية وبدون مبالغة.' },
];

function init(db, deps) {
  const PROMPT = 'انت بتمثل ثلاث شخصيات مستهلكين خليجيين ومقيمين، وكل واحد بيقرأ المحتوى التسويقي ده ويرد بصدق كأنه العميل الحقيقي.\n'
    + 'الشخصيات:\n' + PERSONAS.map((x) => `- ${x.name} (id: ${x.id}): ${x.profile}`).join('\n') + '\n\n'
    + 'لكل شخصية أرجع: reaction (رد فعل قصير بصيغة الشخصية، جملة واحدة)، objection (اعتراض حقيقي أو "لا يوجد")، suggestion (تحسين عملي واحد).\n'
    + 'ارجع JSON فقط بالشكل ده، بدون أي نص قبله أو بعده: [{"id":"majid","reaction":"...","objection":"...","suggestion":"..."}, ...] لكل الشخصيات الثلاثة.';

  function parse(raw) {
    const m = String(raw || '').match(/\[[\s\S]*\]/);
    if (!m) return null;
    try {
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr)) return null;
      return arr
        .filter((x) => x && PERSONAS.some((p) => p.id === x.id))
        .map((x) => {
          const p = PERSONAS.find((q) => q.id === x.id);
          return {
            id: p.id,
            name: p.name,
            reaction: String(x.reaction || '').slice(0, 300),
            objection: String(x.objection || '').slice(0, 300),
            suggestion: String(x.suggestion || '').slice(0, 300),
          };
        });
    } catch (e) { return null; }
  }

  async function route(req, res, user, p, m) {
    if (p !== '/api/ai-tools/personas' || m !== 'POST') return null;
    if (deps.rateLimited('personas:' + user.id, 10, 3600000)) return deps.fail(res, 429, 'rate', 'تجارب كتير. جرّب بعد شوية.');
    const b = await deps.readJson(req, 16 * 1024);
    const content = String(b.content || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, MAX_CONTENT);
    if (content.length < 10) return deps.fail(res, 400, 'input', 'اكتب الإعلان أو العرض اللي عايز تجربه.');
    let raw;
    try {
      raw = await deps.complete([
        { role: 'system', content: PROMPT },
        { role: 'user', content: 'المحتوى التسويقي:\n"""\n' + content + '\n"""' },
      ], 900, 60000);
    } catch (e) {
      console.error('personas failed:', e.message);
      return deps.fail(res, 502, 'model', 'مقدرناش نجيب ردود الشخصيات دلوقتي. جرّب بعدين.');
    }
    const critiques = parse(raw);
    if (!critiques || !critiques.length) return deps.fail(res, 502, 'model', 'الردود جت بشكل غير مفهوم. جرّب تاني.');
    return deps.send(res, 200, {
      critiques,
      note: 'ده تقدير بالذكاء الاصطناعي لشخصيات افتراضية، مش بيانات جمهور حقيقي.',
    });
  }

  return { route, personas: PERSONAS };
}

module.exports = { init };
