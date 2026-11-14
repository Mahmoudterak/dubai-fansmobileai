// مقارنة ردود نموذجين على نفس الأسئلة العربية: Cloudflare (الحالي) والمزوّد الخارجي (EXT_CHAT_*).
// الاستخدام على السيرفر (المفاتيح تُقرأ من .env ولا تُطبع):
//   cd /root/dfai-src && set -a && . /opt/dfai/.env && set +a && node api/scripts/compare-models.js
// يكتب النتائج في compare-out.json ويطبع ملخص قصير (الطول، الزمن، أول 200 حرف).

const fs = require('fs');
const path = require('path');

const QUESTIONS = [
  'اكتب إعلان قصير لمقهى صغير في دبي يقدم قهوة مختصة، ٣ جمل، بالعامية الإماراتية.',
  'اقترح ٥ أفكار لمنشورات إنستغرام لمتجر عطور شرقية، وكل فكرة في سطر.',
  'اشرح الفرق بين الـ CTR والـ CPC لشخص مبتدئ في الإعلانات، بالفصحى المبسطة.',
  'اكتب رد لطيف على عميل يشتكي إن الطلب وصل متأخر يوم.',
  'لخّص أهم ٣ خطوات لتحسين صفحة هبوط لمتجر إلكتروني، في نقاط مرقّمة.',
];

const SYSTEM = 'أنت مساعد تسويق رقمي عربي. اكتب بالعربية الواضحة، ومباشر، وبدون مقدمات طويلة.';

async function askCloudflare(q) {
  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  const model = process.env.CF_MODEL || '@cf/openai/gpt-oss-120b';
  if (!acct || !token) throw new Error('CF_ACCOUNT_ID أو CF_API_TOKEN مش موجودين');
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: q }], max_tokens: 800 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`cloudflare ${r.status}`);
  const res = j.result || {};
  return res.response || (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) || '';
}

async function askExternal(q) {
  const base = process.env.EXT_CHAT_BASE;
  const key = process.env.EXT_CHAT_KEY;
  const model = process.env.EXT_CHAT_MODEL;
  if (!base || !key || !model) throw new Error('EXT_CHAT_BASE أو EXT_CHAT_KEY أو EXT_CHAT_MODEL فاضي');
  const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: q }], max_tokens: 800 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`external ${r.status}`);
  return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
}

async function run(name, fn) {
  const out = [];
  for (const q of QUESTIONS) {
    const t0 = Date.now();
    try {
      const text = await fn(q);
      out.push({ q, ok: true, ms: Date.now() - t0, chars: text.length, text });
    } catch (e) {
      out.push({ q, ok: false, ms: Date.now() - t0, error: e.message });
    }
  }
  return { name, results: out };
}

(async () => {
  const runs = [];
  if (process.env.CF_API_TOKEN) runs.push(await run('cloudflare', askCloudflare));
  if (process.env.EXT_CHAT_BASE) runs.push(await run('external', askExternal));
  if (!runs.length) { console.error('ما في مزوّد مضبوط للمقارنة'); process.exit(1); }

  const file = path.join(__dirname, 'compare-out.json');
  fs.writeFileSync(file, JSON.stringify(runs, null, 2), 'utf8');
  for (const r of runs) {
    console.log(`\n=== ${r.name} ===`);
    for (const x of r.results) {
      if (x.ok) console.log(`[${x.ms}ms · ${x.chars} حرف] ${x.q}\n  ${x.text.slice(0, 200).replace(/\n/g, ' ')}`);
      else console.log(`[فشل] ${x.q}\n  ${x.error}`);
    }
  }
  console.log(`\nالنتائج الكاملة: ${file}`);
})();
