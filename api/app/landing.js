'use strict';
// صفحات الهبوط للحملات: توليد من وصف، فلتر محتوى، عدم فهرسة، نشر معاينة على Vercel، وحصص يومية.
// الإعدادات من البيئة: ANTHROPIC_API_KEY, VERCEL_TOKEN, LANDING_MODEL (اختياري).
// لا يعتمد على server.js، وتُمرَّر له الاعتماديات (db، والرصيد) من الخارج.

const DAILY_LIMIT_FREE = 2;
const DAILY_LIMIT_PAID = 10;
const MAX_BRIEF = 2000;
const MODEL = process.env.LANDING_MODEL || 'claude-sonnet-5-5';

// أنماط مرفوضة قبل التوليد وبعده. قائمة أولية، وليست كاملة.
const BLOCKED = [
  /كلمة المرور|رقم البطاقة|cvv|card number|password/i,
  /ربح مضمون|مضمون 100%|guaranteed profit|double your money/i,
  /تحويل العملات المشفرة إلى|send (us )?bitcoin|crypto giveaway/i,
  /<\s*script/i,
  /<\s*iframe/i,
];

function init(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS landing_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    day TEXT NOT NULL,
    status TEXT NOT NULL,
    url TEXT,
    error TEXT,
    created_at INTEGER NOT NULL
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS landing_pages_user_day ON landing_pages(user_id, day)');
}

function dailyLimit(paid) {
  return paid ? DAILY_LIMIT_PAID : DAILY_LIMIT_FREE;
}

// عدد الصفحات الناجحة أو الجارية اليوم. الفاشلة لا تُحسب.
function usedToday(db, userId, day) {
  return db.prepare("SELECT COUNT(*) AS n FROM landing_pages WHERE user_id = ? AND day = ? AND status IN ('pending','ok')").get(userId, day).n;
}

function checkQuota(db, userId, day, paid) {
  const used = usedToday(db, userId, day);
  const limit = dailyLimit(paid);
  return { allowed: used < limit, used, limit };
}

function screenText(text) {
  for (const re of BLOCKED) if (re.test(text)) return 'المحتوى يخالف سياسة المنصة';
  return null;
}

function cleanSlug(slug) {
  const s = String(slug || '').toLowerCase().trim();
  return /^[a-z0-9-]{3,40}$/.test(s) ? s : null;
}

// يستخرج HTML من رد النموذج، ويزيل السكربتات والإطارات مهما كان الرد
function extractHtml(raw) {
  const m = String(raw || '').match(/<!doctype html[\s\S]*<\/html>|<html[\s\S]*<\/html>/i);
  if (!m) return null;
  return m[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<\/head>/i, '<meta name="robots" content="noindex, nofollow, noarchive"></head>');
}

async function generateHtml(brief, { fetchImpl = fetch, apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY غير مضبوط');
  const prompt = [
    'أنشئ صفحة هبوط واحدة كاملة لحملة تسويقية بناءً على هذا الوصف.',
    'أعد HTML فقط بين <html> و</html>، بالعربية، واتجاه RTL، وتصميم متجاوب.',
    'CSS داخل الصفحة فقط، بدون سكربتات أو مكتبات خارجية أو إطارات.',
    'لا تضع أي مفاتيح أو بيانات دفع أو كلمات مرور. استخدم عناصر نائبة واضحة.',
    'زر دعوة لاتخاذ إجراء واحد.',
    '',
    'الوصف:',
    String(brief).slice(0, MAX_BRIEF),
  ].join('\n');
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('فشل التوليد: ' + res.status);
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return text;
}

// ينشر الصفحة معاينة على Vercel مع ترويسة عدم الفهرسة
async function deployPreview(slug, html, { fetchImpl = fetch, token = process.env.VERCEL_TOKEN } = {}) {
  if (!token) throw new Error('VERCEL_TOKEN غير مضبوط');
  const vercelConfig = { headers: [{ source: '/(.*)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] }] };
  const files = [
    { file: 'index.html', data: Buffer.from(html, 'utf8').toString('base64'), encoding: 'base64' },
    { file: 'vercel.json', data: Buffer.from(JSON.stringify(vercelConfig), 'utf8').toString('base64'), encoding: 'base64' },
  ];
  const name = `dfai-lp-${slug}-${Date.now().toString(36)}`;
  const res = await fetchImpl('https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ name, files, projectSettings: { framework: null } }),
  });
  const data = await res.json();
  if (!res.ok || !data.url) throw new Error('فشل النشر على Vercel: ' + res.status);
  return 'https://' + data.url;
}

// الدالة الرئيسية: تتحقق من الحصة والمحتوى، ثم تولّد وتنشر وتخصم الرصيد
async function createLandingPage(db, { userId, paid, brief, slug, day, charge, now = Date.now(), fetchImpl } = {}) {
  const s = cleanSlug(slug);
  if (!s) return { ok: false, error: 'اسم الصفحة غير صالح' };
  const b = String(brief || '').trim();
  if (b.length < 10) return { ok: false, error: 'الوصف قصير جداً' };

  const quota = checkQuota(db, userId, day, paid);
  if (!quota.allowed) return { ok: false, error: `بلغت الحد اليومي (${quota.limit} صفحات)` };

  const blockedBrief = screenText(b);
  if (blockedBrief) return { ok: false, error: blockedBrief };

  const ins = db.prepare('INSERT INTO landing_pages (user_id, slug, day, status, created_at) VALUES (?, ?, ?, ?, ?)');
  const rowId = Number(ins.run(userId, s, day, 'pending', now).lastInsertRowid);
  const setStatus = db.prepare('UPDATE landing_pages SET status = ?, url = ?, error = ? WHERE id = ?');

  try {
    const raw = await generateHtml(b, { fetchImpl });
    const html = extractHtml(raw);
    if (!html) throw new Error('لم يُنتج النموذج صفحة صالحة');
    const blockedOut = screenText(html);
    if (blockedOut) throw new Error(blockedOut);
    const url = await deployPreview(s, html, { fetchImpl });
    setStatus.run('ok', url, null, rowId);
    if (typeof charge === 'function') await charge(userId, 1);
    return { ok: true, url, used: quota.used + 1, limit: quota.limit };
  } catch (e) {
    setStatus.run('failed', null, String(e.message || e).slice(0, 300), rowId);
    return { ok: false, error: String(e.message || e) };
  }
}

module.exports = { init, checkQuota, createLandingPage, extractHtml, screenText, cleanSlug, dailyLimit, DAILY_LIMIT_FREE, DAILY_LIMIT_PAID };
