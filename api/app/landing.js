'use strict';
// صفحات الهبوط للحملات: توليد من وصف، فلتر محتوى، عدم فهرسة، نشر على خادمنا، وحصص يومية.
// التوليد عبر نماذج Cloudflare الموجودة أصلاً (CF_API_TOKEN, CF_ACCOUNT_ID, CF_MODEL) بدون مفتاح جديد ومجاناً ضمن الحصة.
// النشر: ملف HTML داخل LANDING_DIR يخدمه nginx على LANDING_BASE_URL (بدون Vercel).
// لا يعتمد على server.js، وتُمرَّر له الاعتماديات (db، والرصيد) من الخارج.

const fs = require('fs');
const path = require('path');

const DAILY_LIMIT_FREE = 2;
const DAILY_LIMIT_PAID = 10;
const MAX_BRIEF = 2000;
const CF_BASE = (process.env.CF_API_BASE || 'https://api.cloudflare.com/client/v4').replace(/\/$/, '');
const MODEL = process.env.LANDING_MODEL || process.env.CF_MODEL || '@cf/qwen/qwen3-30b-a3b-fp8';
// المجلد داخل volume البيانات (/data) حتى يكون قابلاً للكتابة، وnginx يقرأه من المسار المقابل على الخادم

// الرابط العام للصفحات: LANDING_BASE_URL، ولو غير مضبوط يُشتق من APP_URL على المسار /lp
function publicBase() {
  const explicit = (process.env.LANDING_BASE_URL || '').replace(/\/$/, '');
  if (explicit) return explicit;
  const app = (process.env.APP_URL || '').replace(/\/$/, '');
  return app ? app + '/lp' : '';
}

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

// يولّد الصفحة عبر Cloudflare Workers AI (نفس الحساب والمفتاح المستخدمين في باقي المنصة)
async function generateHtml(brief, { fetchImpl = fetch, token = process.env.CF_API_TOKEN, account = process.env.CF_ACCOUNT_ID } = {}) {
  if (!token || !account) throw new Error('إعدادات Cloudflare غير مضبوطة');
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
  const res = await fetchImpl(`${CF_BASE}/accounts/${account}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 6000 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('فشل التوليد: ' + res.status);
  const r = data.result || data;
  if (typeof r.response === 'string') return r.response;
  const msg = r.choices && r.choices[0] && r.choices[0].message;
  return (msg && typeof msg.content === 'string') ? msg.content : '';
}

// ينشر الصفحة على خادمنا: ملف index.html في مجلد باسم فريد، ويرجع الرابط العام
async function publishPage(slug, html, { dir = process.env.LANDING_DIR || '/data/landing', baseUrl = publicBase(), now = Date.now() } = {}) {
  if (!baseUrl) throw new Error('LANDING_BASE_URL غير مضبوط');
  if (!cleanSlug(slug)) throw new Error('اسم الصفحة غير صالح');
  const name = `${slug}-${now.toString(36)}`;
  const folder = path.join(dir, name);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'index.html'), html, 'utf8');
  return `${baseUrl}/${name}/`;
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
    const url = await publishPage(s, html, { now });
    setStatus.run('ok', url, null, rowId);
    if (typeof charge === 'function') await charge(userId, 1);
    return { ok: true, url, used: quota.used + 1, limit: quota.limit };
  } catch (e) {
    setStatus.run('failed', null, String(e.message || e).slice(0, 300), rowId);
    return { ok: false, error: String(e.message || e) };
  }
}

module.exports = { init, checkQuota, createLandingPage, extractHtml, screenText, cleanSlug, dailyLimit, DAILY_LIMIT_FREE, DAILY_LIMIT_PAID };
