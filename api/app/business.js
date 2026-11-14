'use strict';
// Dubai Fans AI — "نشاطي التجاري": ملف النشاط، تحليل الموقع، ربط متجر Shopify / WooCommerce، والتحليل الشامل.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const net = require('node:net');

let db, q, D, KEY;

// ---------------- التهيئة ----------------
function init(database, deps) {
  db = database;
  D = deps; // { readJson, send, fail, complete, reserve, rateLimited, now, dataDir, secret, shopifyVersion }
  db.exec(`
    CREATE TABLE IF NOT EXISTS biz_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      profile TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS biz_connections (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      label TEXT,
      secret TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, kind)
    );
    CREATE TABLE IF NOT EXISTS biz_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      score INTEGER,
      facts TEXT,
      report TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_biz_reports ON biz_reports(user_id, created_at);
  `);
  q = {
    getProfile: db.prepare('SELECT profile, updated_at FROM biz_profiles WHERE user_id = ?'),
    setProfile: db.prepare(`INSERT INTO biz_profiles (user_id, profile, updated_at) VALUES (?, ?, ?)
                            ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, updated_at = excluded.updated_at`),
    conns: db.prepare('SELECT kind, label, created_at FROM biz_connections WHERE user_id = ?'),
    conn: db.prepare('SELECT * FROM biz_connections WHERE user_id = ? AND kind = ?'),
    setConn: db.prepare(`INSERT INTO biz_connections (user_id, kind, label, secret, created_at) VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(user_id, kind) DO UPDATE SET label = excluded.label, secret = excluded.secret, created_at = excluded.created_at`),
    delConn: db.prepare('DELETE FROM biz_connections WHERE user_id = ? AND kind = ?'),
    delStoreConns: db.prepare("DELETE FROM biz_connections WHERE user_id = ? AND kind IN ('shopify','woo')"),
    addReport: db.prepare('INSERT INTO biz_reports (user_id, kind, title, score, facts, report, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    reports: db.prepare('SELECT id, kind, title, score, created_at FROM biz_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'),
    report: db.prepare('SELECT * FROM biz_reports WHERE id = ? AND user_id = ?'),
    latest: db.prepare('SELECT * FROM biz_reports WHERE user_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1'),
    delReport: db.prepare('DELETE FROM biz_reports WHERE id = ? AND user_id = ?'),
  };
  KEY = loadKey();
}

// مفتاح التشفير: من .env لو موجود، وإلا بيتعمل مرة واحدة ويتحفظ جنب قاعدة البيانات
function loadKey() {
  if (D.secret) return crypto.createHash('sha256').update(D.secret).digest();
  const f = path.join(D.dataDir, 'secret.key');
  try { return Buffer.from(fs.readFileSync(f, 'utf8').trim(), 'hex'); } catch { /* أول مرة */ }
  const k = crypto.randomBytes(32);
  fs.writeFileSync(f, k.toString('hex'), { mode: 0o600 });
  return k;
}
function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}
function decrypt(s) {
  const [iv, tag, enc] = String(s).split('.').map((x) => Buffer.from(x, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}

// ---------------- ملف النشاط ----------------
const PROFILE_FIELDS = {
  name: 80, category: 100, description: 600, audience: 300, market: 100, offers: 400,
  prices: 200, tone: 60, website: 200, instagram: 100, tiktok: 100, facebook: 150, whatsapp: 40, goals: 300,
};
function cleanProfile(b) {
  const out = {};
  for (const [k, n] of Object.entries(PROFILE_FIELDS)) {
    const v = String((b && b[k]) || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
    if (v) out[k] = v;
  }
  for (const k of ['brandPrimary', 'brandAccent']) {
    const v = String((b && b[k]) || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v.toUpperCase();
  }
  out.useInChat = !(b && b.useInChat === false);
  return out;
}

// ---------------- هوية العلامة: اللوجو بيتحفظ كملف على السيرفر ----------------
function logoPath(userId) { return path.join(D.dataDir, 'logos', `${Number(userId)}.png`); }
function hasLogo(userId) { try { return fs.statSync(logoPath(userId)).size > 0; } catch { return false; } }
function brand(userId) {
  const p = getProfile(userId) || {};
  return { primary: p.brandPrimary || '', accent: p.brandAccent || '', name: p.name || '' };
}
function getProfile(userId) {
  const r = q.getProfile.get(userId);
  if (!r) return null;
  try { return JSON.parse(r.profile); } catch { return null; }
}

const LABELS = {
  name: 'اسم النشاط', category: 'المجال', description: 'وصف النشاط', audience: 'الجمهور المستهدف', market: 'السوق/المدينة',
  offers: 'المنتجات والخدمات والعروض', prices: 'الأسعار', tone: 'نبرة الكلام', website: 'الموقع', instagram: 'إنستغرام',
  tiktok: 'تيك توك', facebook: 'فيسبوك', whatsapp: 'واتساب', goals: 'الأهداف',
};
function profileText(p) {
  return Object.keys(LABELS).filter((k) => p[k]).map((k) => `- ${LABELS[k]}: ${p[k]}`).join('\n');
}

// بيتضاف لتعليمات المساعد في كل محادثة لو العميل مفعّل الخيار
function chatContext(userId) {
  const p = getProfile(userId);
  if (!p || p.useInChat === false) return '';
  const lines = profileText(p);
  if (!lines) return '';
  let extra = '';
  const st = q.latest.get(userId, 'store');
  if (st && st.facts) {
    try {
      const f = JSON.parse(st.facts);
      if (f.mode !== 'url') extra = `\nملخص آخر تحليل لمتجره (${new Date(st.created_at).toISOString().slice(0, 10)}): ` +
        `${f.orders} طلب خلال ${f.days} يوم، متوسط الطلب ${f.aov} ${f.currency}` +
        (f.top && f.top.length ? `، الأكثر مبيعاً: ${f.top.slice(0, 5).map((t) => t.name).join('، ')}` : '') + '.';
    } catch { /* تجاهل */ }
  }
  return ('\n\nمعلومات عن نشاط المستخدم التجاري (خصّص ردودك عليها، ولا تخترع معلومات غيرها، ولو طلب حاجة عامة مش عن نشاطه ماتقحمهاش):\n' + lines + extra).slice(0, 2200);
}

// ---------------- جلب آمن من الإنترنت (ضد SSRF) ----------------
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const s = ip.toLowerCase();
  if (s.startsWith('::ffff:')) return privateIp(s.slice(7));
  return s === '::1' || s === '::' || s.startsWith('fc') || s.startsWith('fd') || s.startsWith('fe8') || s.startsWith('fe9') || s.startsWith('fea') || s.startsWith('feb');
}
async function checkUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { throw userErr('الرابط مش صحيح.'); }
  if (process.env.DFAI_TEST_ALLOW_PRIVATE === '1') return u; // للاختبارات المحلية بس
  if (!/^https?:$/.test(u.protocol) || (u.port && !['80', '443'].includes(u.port)) || u.username || u.password) throw userErr('الرابط مش مدعوم.');
  if (net.isIP(u.hostname) || /^localhost$|\.local$|\.internal$/i.test(u.hostname)) throw userErr('الرابط مش مدعوم.');
  let addrs;
  try { addrs = await dns.lookup(u.hostname, { all: true }); } catch { throw userErr('مقدرناش نوصل للموقع ده. اتأكد من الرابط.'); }
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw userErr('الرابط مش مدعوم.');
  return u;
}
function userErr(m, status = 400) { const e = new Error(m); e.user = true; e.status = status; return e; }

async function safeFetch(rawUrl, opts = {}, maxBytes = 2 * 1024 * 1024) {
  let url = String(rawUrl);
  for (let hop = 0; hop < 4; hop++) {
    const u = await checkUrl(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout || 12000);
    const t0 = Date.now();
    let r;
    try {
      r = await fetch(u.href, {
        method: opts.method || 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DubaiFansAI/1.0; +https://ai.mtuaefans.com)', Accept: opts.accept || 'text/html,application/json;q=0.9,*/*;q=0.5', ...(opts.headers || {}) },
        redirect: 'manual', signal: ctrl.signal,
      });
    } catch (e) { clearTimeout(timer); throw userErr(e.name === 'AbortError' ? 'الموقع اتأخر في الرد.' : 'مقدرناش نوصل للموقع.'); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      clearTimeout(timer);
      url = new URL(r.headers.get('location'), u).href;
      continue;
    }
    const reader = r.body ? r.body.getReader() : null;
    const chunks = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read().catch(() => ({ done: true }));
        if (done) break;
        size += value.length;
        if (size > maxBytes) { ctrl.abort(); break; }
        chunks.push(value);
      }
    }
    clearTimeout(timer);
    return { status: r.status, url: u.href, headers: r.headers, ms: Date.now() - t0, bytes: size, body: opts.binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8') };
  }
  throw userErr('الموقع بيحوّل كتير.');
}

// ---------------- تحليل الموقع ----------------
const decode = (s) => String(s || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n));
const stripTags = (h) => decode(String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
function meta(html, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i');
  const tag = (html.match(re) || [])[0];
  return tag ? decode((tag.match(/content=["']([^"']*)["']/i) || [])[1] || '').trim() : '';
}
function analyzePage(res) {
  const h = res.body;
  const text = stripTags(h);
  const imgs = h.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt=["'][^"']+["']/i.test(t)).length;
  const h1 = (h.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || []).map(stripTags).filter(Boolean);
  const h2 = (h.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || []).map(stripTags).filter(Boolean);
  const ld = (h.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []).map((s) => (s.match(/"@type"\s*:\s*"([^"]+)"/) || [])[1]).filter(Boolean);
  return {
    url: res.url, status: res.status, ms: res.ms, kb: Math.round(res.bytes / 1024),
    title: stripTags((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').slice(0, 120),
    description: meta(h, 'description').slice(0, 200),
    h1: h1.slice(0, 3).map((x) => x.slice(0, 100)), h2: h2.slice(0, 6).map((x) => x.slice(0, 80)),
    words: text ? text.split(' ').length : 0,
    images: imgs.length, imagesNoAlt: noAlt,
    viewport: /<meta[^>]+name=["']viewport["']/i.test(h),
    lang: (h.match(/<html[^>]*\blang=["']([^"']+)["']/i) || [])[1] || '',
    canonical: /<link[^>]+rel=["']canonical["']/i.test(h),
    ogImage: Boolean(meta(h, 'og:image')), ogTitle: Boolean(meta(h, 'og:title')),
    schema: [...new Set(ld)].slice(0, 6),
    whatsapp: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(h), phone: /href=["']tel:/i.test(h),
    forms: (h.match(/<form\b/gi) || []).length,
    social: ['instagram.com', 'tiktok.com', 'facebook.com', 'snapchat.com', 'x.com/', 'twitter.com', 'youtube.com', 'linkedin.com'].filter((d) => h.includes(d)).map((d) => d.replace(/\.com\/?$|\/$/, '')),
    analytics: /googletagmanager|gtag\(|google-analytics/i.test(h), pixel: /connect\.facebook\.net|fbq\(/i.test(h), tiktokPixel: /analytics\.tiktok\.com|ttq\./i.test(h),
    sample: text.slice(0, 700),
  };
}
function internalLinks(res, limit) {
  const base = new URL(res.url);
  const seen = new Set([base.pathname]);
  const out = [];
  for (const m of res.body.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    let u;
    try { u = new URL(decode(m[1]), base); } catch { continue; }
    if (u.host !== base.host || !/^https?:$/.test(u.protocol)) continue;
    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|css|js)$/i.test(u.pathname) || /cart|checkout|account|login|wp-admin|feed/i.test(u.pathname)) continue;
    if (seen.has(u.pathname)) continue;
    seen.add(u.pathname);
    out.push(u.origin + u.pathname);
  }
  return out.sort((a, b) => a.split('/').length - b.split('/').length || a.length - b.length).slice(0, limit);
}
function siteScore(home, pages) {
  let s = 100;
  const issues = [];
  const pen = (n, msg) => { s -= n; issues.push(msg); };
  if (!home.url.startsWith('https://')) pen(15, 'الموقع مش شغال بـ HTTPS');
  if (!home.title) pen(10, 'الصفحة الرئيسية من غير عنوان (title)');
  else if (home.title.length < 15 || home.title.length > 65) pen(4, 'طول عنوان الصفحة الرئيسية مش مناسب');
  if (!home.description) pen(8, 'مفيش وصف (meta description) للصفحة الرئيسية');
  if (!home.h1.length) pen(6, 'مفيش عنوان رئيسي H1');
  if (!home.viewport) pen(12, 'الموقع مش مظبوط للموبايل (viewport)');
  if (home.ms > 3000) pen(8, 'الصفحة الرئيسية بطيئة');
  else if (home.ms > 1500) pen(4, 'سرعة الصفحة الرئيسية متوسطة');
  if (home.kb > 1500) pen(4, 'حجم الصفحة الرئيسية كبير');
  if (home.images && home.imagesNoAlt / home.images > 0.3) pen(5, 'صور كتير من غير نص بديل (alt)');
  if (!home.ogImage) pen(4, 'مفيش صورة مشاركة (og:image) للسوشيال');
  if (!home.schema.length) pen(4, 'مفيش بيانات منظمة (Schema)');
  if (!home.whatsapp && !home.phone && !home.forms) pen(8, 'مفيش طريقة تواصل واضحة (واتساب/اتصال/فورم)');
  if (!home.analytics && !home.pixel) pen(5, 'مفيش أدوات تتبع (Google Analytics / Meta Pixel)');
  if (home.words < 150) pen(5, 'محتوى الصفحة الرئيسية قليل');
  const noDesc = pages.filter((p) => !p.description).length;
  if (pages.length && noDesc / pages.length > 0.5) pen(4, 'أغلب الصفحات من غير وصف');
  return { score: Math.max(5, Math.min(100, s)), issues };
}

async function siteAudit(user, url, profile) {
  const homeRes = await safeFetch(url);
  if (homeRes.status >= 400) throw userErr(`الموقع رجّع خطأ (${homeRes.status}).`);
  const home = analyzePage(homeRes);
  const pages = [];
  for (const link of internalLinks(homeRes, 5)) {
    try { const r = await safeFetch(link, { timeout: 8000 }); if (r.status < 400) pages.push(analyzePage(r)); } catch { /* نكمل */ }
  }
  const origin = new URL(homeRes.url).origin;
  const robots = await safeFetch(origin + '/robots.txt', { timeout: 6000 }, 200000).then((r) => r.status === 200).catch(() => false);
  const sitemap = await safeFetch(origin + '/sitemap.xml', { timeout: 6000 }, 500000).then((r) => r.status === 200 && /<urlset|<sitemapindex/i.test(r.body)).catch(() => false);
  const { score, issues } = siteScore(home, pages);
  if (!sitemap) issues.push('مفيش خريطة موقع sitemap.xml');
  const facts = { url: homeRes.url, score, issues, robots, sitemap, home: { ...home, sample: undefined }, pages: pages.map((p) => ({ url: p.url, title: p.title, description: Boolean(p.description), h1: p.h1[0] || '', words: p.words, ms: p.ms })) };
  const prompt = [
    { role: 'system', content: 'أنت خبير تسويق رقمي وSEO وتجربة مستخدم. اكتب تقرير تحليل موقع بالعربية الواضحة، عملي ومباشر، بتنسيق Markdown. لا تخترع أرقاماً غير الموجودة في البيانات.' },
    { role: 'user', content:
      (profile ? 'عن النشاط:\n' + profileText(profile) + '\n\n' : '') +
      'نتائج الفحص الآلي للموقع (JSON):\n' + JSON.stringify(facts).slice(0, 7000) +
      '\n\nمقتطف من نص الصفحة الرئيسية:\n' + home.sample +
      '\n\nاكتب التقرير بالأقسام دي بالترتيب:\n## الخلاصة\n(3 جمل: الموقع بيقدم إيه، تقييمه، وأهم فرصة)\n## نقاط القوة\n## المشاكل حسب الأولوية\n(عالية / متوسطة / بسيطة)\n## أهم 10 تحسينات عملية\n(مرقّمة، كل واحدة إزاي تتنفذ)\n## زيادة التحويل والمبيعات\n(CTA، واتساب، الثقة، العروض)\n## أفكار محتوى للموقع\n(5 أفكار صفحات أو مقالات)' },
  ];
  const report = await D.complete(prompt, 2200, 150000);
  return { title: 'تحليل موقع ' + new URL(homeRes.url).host, score, facts, report };
}

// ---------------- حسابات السوشيال بالروابط العامة (بدون ربط) ----------------
// نقرأ بيانات الصفحة العامة اللي تظهر للكل (العنوان والوصف ومعلومات og)، من غير تسجيل دخول ومن غير مفاتيح.
// ما نقراش المنشورات الخاصة ولا الرسائل ولا الإعلانات.
const SOCIAL_HOSTS = [['instagram.com', 'إنستغرام'], ['tiktok.com', 'تيك توك'], ['facebook.com', 'فيسبوك'], ['fb.com', 'فيسبوك']];
function socialTarget(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { throw userErr('اكتب رابط الحساب الكامل، يبدأ بـ https://'); }
  if (u.protocol !== 'https:') throw userErr('الرابط لازم يبدأ بـ https://');
  const h = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const hit = SOCIAL_HOSTS.find(([d]) => h === d || h.endsWith('.' + d));
  if (!hit) throw userErr('الرابط لازم يكون من إنستغرام أو تيك توك أو فيسبوك.');
  return { platform: hit[1], url: u.href };
}
function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i');
  const m = html.match(re) || html.match(re2);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim().slice(0, 500) : '';
}
async function socialAudit(user, rawUrl, profile) {
  const t = socialTarget(rawUrl);
  const res = await safeFetch(t.url, { timeout: 12000 }, 1024 * 1024);
  if (res.status === 429 || res.status === 403) {
    throw userErr(`${t.platform} حدّدت الطلبات من السيرفر دلوقتي. جرّب بعد شوية، أو اكتب وصف الحساب يدوياً في بيانات النشاط.`);
  }
  if (res.status >= 400) throw userErr(`الصفحة رجّعت خطأ (${res.status}). تأكد إن الحساب عام.`);
  const html = res.body || '';
  const ogTitle = metaContent(html, 'og:title');
  const ogDesc = metaContent(html, 'og:description') || metaContent(html, 'description');
  const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const title = ogTitle || (titleTag ? titleTag.replace(/\s+/g, ' ').trim().slice(0, 200) : '');
  if (!ogTitle && !ogDesc) {
    throw userErr(`${t.platform} ما سمحت بقراءة معلومات الصفحة العامة دي. جرّب تكتب وصف الحساب يدوياً في بيانات النشاط.`);
  }
  const facts = { platform: t.platform, url: t.url, title, description: ogDesc };
  const prompt = [
    { role: 'system', content: 'أنت خبير تسويق على السوشيال ميديا. اكتب تقرير بالعربية الواضحة، عملي ومباشر، بتنسيق Markdown. البيانات من الصفحة العامة فقط. لا تخترع متابعين أو أرقام تفاعل غير الموجودة في البيانات.' },
    { role: 'user', content:
      (profile ? 'عن النشاط:\n' + profileText(profile) + '\n\n' : '') +
      'بيانات الحساب العامة (JSON):\n' + JSON.stringify(facts).slice(0, 3000) +
      '\n\nاكتب التقرير بالأقسام دي:\n## الخلاصة\n(3 جمل: الحساب بيقدم إيه، وتقييمه، وأهم فرصة)\n## ملاحظات على البروفايل\n(الاسم، الوصف، الرابط، الصورة لو ظاهرة في البيانات)\n## أفكار منشورات (5)\n(كل فكرة بسطر واحد وفكرتها)\n## أهم 3 خطوات الأسبوع الجاي\n(مرقّمة)' },
  ];
  const report = await D.complete(prompt, 1800, 150000);
  return { title: 'تحليل حساب ' + t.platform + (title ? ': ' + title.slice(0, 80) : ''), score: null, facts, report };
}

// ---------------- المتاجر ----------------
function normShop(s) {
  let h = String(s || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (h && !h.includes('.')) h += '.myshopify.com';
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(h)) throw userErr('اكتب رابط المتجر بالشكل ده: اسم-متجرك.myshopify.com');
  return h;
}
// Shopify: يا إما Access Token قديم (shpat_)، يا إما Client ID + Secret من Dev Dashboard (توكن بيتجدد كل 24 ساعة)
const shopTokens = new Map();
const shopBase = (cred) => process.env.DFAI_TEST_SHOPIFY_BASE || `https://${cred.shop}`;
async function shopifyToken(cred) {
  if (cred.token) return cred.token;
  const c = shopTokens.get(cred.shop);
  if (c && c.exp > Date.now() + 120000) return c.token;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let r, j = {};
  try {
    await checkUrl(shopBase(cred));
    r = await fetch(`${shopBase(cred)}/admin/oauth/access_token`, {
      method: 'POST', signal: ctrl.signal, redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cred.clientId, client_secret: cred.clientSecret }).toString(),
    });
    j = await r.json().catch(() => ({}));
  } catch (e) { if (e.user) throw e; throw userErr('مقدرناش نوصل لـ Shopify.'); } finally { clearTimeout(timer); }
  if (!r.ok || !j.access_token) {
    const code = String(j.error || j.errors || '');
    if (/shop_not_permitted/.test(code)) throw userErr('التطبيق والمتجر مش في نفس الحساب (Organization) على Shopify. اعمل التطبيق من Dev Dashboard بنفس حساب صاحب المتجر.');
    if (/application_cannot_be_found|invalid_client/.test(code)) throw userErr('Client ID أو Client secret غلط، أو التطبيق مش متثبّت على المتجر.');
    throw userErr('Shopify رفض بيانات التطبيق. اتأكد إن التطبيق متثبّت على المتجر وإن الصلاحيات (read_products وread_orders) متفعّلة.');
  }
  shopTokens.set(cred.shop, { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 86399) * 1000 });
  return j.access_token;
}
async function shopify(cred, pathPart) {
  const token = await shopifyToken(cred);
  const r = await safeFetch(`${shopBase(cred)}/admin/api/${D.shopifyVersion}/${pathPart}`, { headers: { 'X-Shopify-Access-Token': token }, accept: 'application/json', timeout: 20000 }, 8 * 1024 * 1024);
  if (r.status === 401 || r.status === 403) throw userErr('Shopify رفض المفتاح. اتأكد من الـ Access Token والصلاحيات (read_products وread_orders).');
  if (r.status === 404) throw userErr('المتجر مش موجود. اتأكد من الرابط.');
  if (r.status >= 400) throw userErr(`Shopify رجّع خطأ (${r.status}).`);
  let json;
  try { json = JSON.parse(r.body); } catch { throw userErr('رد غير متوقع من Shopify.'); }
  const link = r.headers.get('link') || '';
  const next = (link.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/) || [])[1];
  return { json, next };
}
async function woo(cred, pathPart) {
  const auth = 'Basic ' + Buffer.from(cred.ck + ':' + cred.cs).toString('base64');
  const url = cred.site.replace(/\/$/, '') + '/wp-json/wc/v3/' + pathPart;
  let r = await safeFetch(url, { headers: { Authorization: auth }, accept: 'application/json', timeout: 20000 }, 8 * 1024 * 1024);
  if (r.status === 401) {
    // بعض الاستضافات بتشيل هيدر Authorization، فنجرب المفاتيح في الرابط (HTTPS بس)
    const sep = url.includes('?') ? '&' : '?';
    r = await safeFetch(url + sep + 'consumer_key=' + encodeURIComponent(cred.ck) + '&consumer_secret=' + encodeURIComponent(cred.cs), { accept: 'application/json', timeout: 20000 }, 8 * 1024 * 1024);
  }
  if (r.status === 401 || r.status === 403) throw userErr('WooCommerce رفض المفاتيح. اتأكد إن الصلاحية "Read" وإن المفاتيح صح.');
  if (r.status === 404) throw userErr('مالقيناش WooCommerce على الرابط ده. اتأكد من رابط الموقع وإن الروابط الدائمة (Permalinks) مفعّلة.');
  if (r.status >= 400) throw userErr(`WooCommerce رجّع خطأ (${r.status}).`);
  try { return JSON.parse(r.body); } catch { throw userErr('رد غير متوقع من WooCommerce.'); }
}

async function testConnection(kind, b) {
  if (kind === 'shopify') {
    const shop = normShop(b.shop);
    let cred;
    if (b.clientId || b.clientSecret) {
      cred = { shop, clientId: String(b.clientId || '').trim(), clientSecret: String(b.clientSecret || '').trim() };
      if (!/^[A-Za-z0-9_-]{16,}$/.test(cred.clientId) || cred.clientSecret.length < 16 || /\s/.test(cred.clientSecret)) throw userErr('اكتب Client ID وClient secret زي ما هما من إعدادات التطبيق.');
    } else {
      cred = { shop, token: String(b.token || '').trim() };
      if (!/^shpat_[A-Za-z0-9]{16,}$|^[A-Za-z0-9_]{20,}$/.test(cred.token)) throw userErr('الـ Access Token شكله مش صح. بيبدأ غالباً بـ shpat_');
    }
    const { json } = await shopify(cred, 'shop.json');
    return { cred, label: (json.shop && json.shop.name) || cred.shop, currency: (json.shop && json.shop.currency) || '' };
  }
  if (kind === 'woo') {
    const u = await checkUrl(String(b.site || ''));
    if (u.protocol !== 'https:' && process.env.DFAI_TEST_ALLOW_PRIVATE !== '1') throw userErr('لازم الموقع يكون HTTPS عشان نحمي مفاتيحك.');
    const cred = { site: (u.origin + u.pathname).replace(/\/+$/, '').replace(/\/wp-json.*$/, ''), ck: String(b.ck || '').trim(), cs: String(b.cs || '').trim() };
    if (!/^ck_[a-f0-9]{20,}$/i.test(cred.ck) || !/^cs_[a-f0-9]{20,}$/i.test(cred.cs)) throw userErr('المفاتيح شكلها مش صح. Consumer key بيبدأ بـ ck_ وConsumer secret بيبدأ بـ cs_');
    await woo(cred, 'products?per_page=1');
    return { cred, label: u.host + (u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : ''), currency: '' };
  }
  throw userErr('نوع الربط مش مدعوم.');
}

const num = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : 0; };
const round = (n) => Math.round(n * 100) / 100;
const plainLen = (h) => stripTags(h).length;

async function loadStore(kind, cred, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const products = [];
  const orders = [];
  let currency = '';
  if (kind === 'shopify') {
    let page = await shopify(cred, 'products.json?limit=250&fields=id,title,status,variants,images,body_html,product_type');
    products.push(...(page.json.products || []));
    if (page.next) { page = await shopify(cred, 'products.json?limit=250&page_info=' + page.next); products.push(...(page.json.products || [])); }
    let op = await shopify(cred, 'orders.json?status=any&limit=250&created_at_min=' + encodeURIComponent(since) + '&fields=id,created_at,total_price,currency,line_items,cancelled_at,financial_status');
    orders.push(...(op.json.orders || []));
    for (let i = 0; op.next && i < 3; i++) { op = await shopify(cred, 'orders.json?limit=250&page_info=' + op.next); orders.push(...(op.json.orders || [])); }
    return {
      currency: (orders[0] && orders[0].currency) || currency,
      products: products.map((p) => ({
        id: String(p.id), name: p.title, active: p.status === 'active',
        price: num(p.variants && p.variants[0] && p.variants[0].price),
        stock: (p.variants || []).reduce((s, v) => s + (Number.isFinite(v.inventory_quantity) ? v.inventory_quantity : 0), 0),
        tracked: (p.variants || []).some((v) => v.inventory_management),
        images: (p.images || []).length, descLen: plainLen(p.body_html),
      })),
      orders: orders.filter((o) => !o.cancelled_at).map((o) => ({
        at: Date.parse(o.created_at), total: num(o.total_price),
        items: (o.line_items || []).map((l) => ({ id: String(l.product_id || l.title), name: l.title, qty: l.quantity || 1, amount: num(l.price) * (l.quantity || 1) })),
      })),
    };
  }
  for (let pg = 1; pg <= 3; pg++) {
    const list = await woo(cred, `products?per_page=100&page=${pg}&status=any`);
    products.push(...list);
    if (list.length < 100) break;
  }
  for (let pg = 1; pg <= 5; pg++) {
    const list = await woo(cred, `orders?per_page=100&page=${pg}&after=${encodeURIComponent(since)}`);
    orders.push(...list);
    if (list.length < 100) break;
  }
  currency = (orders[0] && orders[0].currency) || '';
  return {
    currency,
    products: products.map((p) => ({
      id: String(p.id), name: p.name, active: p.status === 'publish', price: num(p.price),
      stock: Number.isFinite(p.stock_quantity) ? p.stock_quantity : 0, tracked: Boolean(p.manage_stock),
      images: (p.images || []).length, descLen: plainLen(p.description || p.short_description),
    })),
    orders: orders.filter((o) => !['cancelled', 'failed', 'refunded', 'trash'].includes(o.status)).map((o) => ({
      at: Date.parse(o.date_created_gmt ? o.date_created_gmt + 'Z' : o.date_created), total: num(o.total),
      items: (o.line_items || []).map((l) => ({ id: String(l.product_id || l.name), name: l.name, qty: l.quantity || 1, amount: num(l.total) })),
    })),
  };
}

const DAYS_AR = ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'];
function storeStats(data, days) {
  const now = Date.now();
  const o = data.orders;
  const revenue = o.reduce((s, x) => s + x.total, 0);
  const last30 = o.filter((x) => now - x.at <= 30 * 86400000);
  const prev30 = o.filter((x) => now - x.at > 30 * 86400000 && now - x.at <= 60 * 86400000);
  const sum = (a) => a.reduce((s, x) => s + x.total, 0);
  const byProd = new Map();
  for (const ord of o) for (const it of ord.items) {
    const cur = byProd.get(it.id) || { name: it.name, qty: 0, revenue: 0 };
    cur.qty += it.qty; cur.revenue += it.amount;
    byProd.set(it.id, cur);
  }
  const top = [...byProd.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10).map((x) => ({ ...x, revenue: round(x.revenue) }));
  const active = data.products.filter((p) => p.active);
  const sold = new Set(byProd.keys());
  const noSales = active.filter((p) => !sold.has(p.id)).slice(0, 12).map((p) => p.name);
  const lowStock = active.filter((p) => p.tracked && p.stock > 0 && p.stock <= 3).slice(0, 10).map((p) => p.name);
  const outStock = active.filter((p) => p.tracked && p.stock <= 0).slice(0, 10).map((p) => p.name);
  const weakDesc = active.filter((p) => p.descLen < 80).length;
  const noImages = active.filter((p) => !p.images).length;
  const wd = new Array(7).fill(0);
  for (const x of o) wd[new Date(x.at + 4 * 3600000).getUTCDay()] += 1;
  const bestDay = o.length ? DAYS_AR[wd.indexOf(Math.max(...wd))] : '';
  const prices = active.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  return {
    days, currency: data.currency || '', orders: o.length, revenue: round(revenue), aov: o.length ? round(revenue / o.length) : 0,
    revenue30: round(sum(last30)), revenuePrev30: round(sum(prev30)), orders30: last30.length, ordersPrev30: prev30.length,
    products: data.products.length, activeProducts: active.length, top, noSales, noSalesCount: active.filter((p) => !sold.has(p.id)).length,
    lowStock, outStock, weakDesc, noImages, bestDay,
    priceRange: prices.length ? [prices[0], prices[prices.length - 1]] : null,
  };
}

async function storeAnalysis(user, profile) {
  const row = [q.conn.get(user.id, 'shopify'), q.conn.get(user.id, 'woo')].filter(Boolean)[0];
  if (!row) throw userErr('اربط متجرك الأول.');
  let cred;
  try { cred = decrypt(row.secret); } catch { throw userErr('حصلت مشكلة في بيانات الربط. افصل المتجر واربطه تاني.'); }
  const days = 90;
  const data = await loadStore(row.kind, cred, days);
  const facts = storeStats(data, days);
  facts.platform = row.kind === 'shopify' ? 'Shopify' : 'WooCommerce';
  facts.store = row.label;
  const prompt = [
    { role: 'system', content: 'أنت خبير تجارة إلكترونية ونمو مبيعات في الإمارات والخليج. اكتب تقرير تحليل متجر بالعربية الواضحة بتنسيق Markdown. استخدم الأرقام الموجودة فقط ولا تخترع أرقاماً.' },
    { role: 'user', content:
      (profile ? 'عن النشاط:\n' + profileText(profile) + '\n\n' : '') +
      'بيانات المتجر لآخر ' + days + ' يوم (JSON):\n' + JSON.stringify(facts).slice(0, 7000) +
      '\n\nاكتب التقرير بالأقسام دي:\n## الصورة العامة\n(المبيعات، الاتجاه آخر 30 يوم مقابل اللي قبلها، متوسط الطلب)\n## الأكثر مبيعاً وإزاي نستغلهم\n## منتجات محتاجة دفعة\n(اللي مابتبيعش، والمخزون)\n## 3 عروض مقترحة\n(باندل، زيادة متوسط الطلب، استرجاع العملاء)\n## 5 منشورات جاهزة للسوشيال\n(نص كامل لكل منشور عن منتجات حقيقية من القائمة)\n## تحسينات المتجر\n(أوصاف، صور، صفحة المنتج، الدفع والشحن)' },
  ];
  const report = await D.complete(prompt, 2400, 150000);
  return { title: 'تحليل متجر ' + row.label, score: null, facts, report };
}

// ---------------- تحليل متجر من رابطه فقط (بدون مفاتيح ربط) ----------------
// بيقرأ صفحات المتجر العامة: خريطة الموقع أو روابط الصفحة، وبيقرأ بيانات المنتج من JSON-LD.
// ما فيهوش بيانات طلبات ولا مبيعات، فالتقرير عن المنتجات والمحتوى بس.
const PRODUCT_RE = /\/(products?|p|items?)\/[^/?#]+/i;
function detectPlatform(h) {
  if (/cdn\.shopify\.com|Shopify\.theme/i.test(h)) return 'Shopify';
  if (/woocommerce|wp-content/i.test(h)) return 'WooCommerce';
  if (/salla\.(sa|com)|cdn\.salla/i.test(h)) return 'Salla';
  if (/zid\.(sa|store)|cdn\.zid/i.test(h)) return 'Zid';
  if (/easy-?orders?/i.test(h)) return 'Easy Order';
  return 'غير معروف';
}
function parseProduct(html) {
  let prod = null;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    const nodes = [].concat(data, (data && data['@graph']) || []).flat();
    const found = nodes.find((n) => n && [].concat(n['@type'] || []).some((t) => /^Product$/i.test(String(t))));
    if (found) { prod = found; break; }
  }
  const off = prod ? ([].concat(prod.offers || [])[0] || {}) : {};
  const img = prod ? (Array.isArray(prod.image) ? prod.image[0] : (prod.image && prod.image.url) || prod.image) : '';
  const price = Number(off.price != null ? off.price : (off.lowPrice != null ? off.lowPrice : meta(html, 'product:price:amount')));
  const desc = (prod && prod.description) || meta(html, 'description') || '';
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '';
  return {
    name: stripTags((prod && prod.name) || meta(html, 'og:title') || h1).slice(0, 80),
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: String(off.priceCurrency || meta(html, 'product:price:currency') || ''),
    inStock: !/OutOfStock|SoldOut/i.test(String(off.availability || '')),
    hasImage: Boolean(img || meta(html, 'og:image')),
    descLen: String(desc).trim().length,
  };
}

async function storeUrlAnalysis(user, profile, rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) throw userErr('اكتب رابط متجرك.');
  const homeRes = await safeFetch(url);
  if (homeRes.status >= 400) throw userErr(`المتجر رجّع خطأ (${homeRes.status}).`);
  const origin = new URL(homeRes.url).origin;
  const platform = detectPlatform(homeRes.body);
  const sm = await safeFetch(origin + '/sitemap.xml', { timeout: 6000 }, 800000).then((r) => (r.status === 200 ? r.body : '')).catch(() => '');
  const fromSitemap = [...sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]));
  let prodLinks = fromSitemap.filter((u) => { try { return PRODUCT_RE.test(new URL(u).pathname); } catch { return false; } });
  if (!prodLinks.length) prodLinks = internalLinks(homeRes, 200).filter((u) => PRODUCT_RE.test(new URL(u).pathname));
  prodLinks = [...new Set(prodLinks)].slice(0, 25);
  const items = [];
  for (let i = 0; i < prodLinks.length; i += 5) {
    const batch = await Promise.all(prodLinks.slice(i, i + 5).map((u) =>
      safeFetch(u, { timeout: 8000 }).then((r) => (r.status < 400 ? parseProduct(r.body) : null)).catch(() => null)));
    for (const it of batch) if (it && it.name) items.push(it);
  }
  if (!items.length) throw userErr('ما لقيناش صفحات منتجات في الرابط ده. جرّب رابط المتجر الرئيسي، أو اربط المتجر بالمفاتيح لو منصته مدعومة.');
  const prices = items.map((x) => x.price).filter((n) => n).sort((a, b) => a - b);
  const facts = {
    mode: 'url', platform, store: new URL(homeRes.url).host, days: null,
    currency: (items.find((x) => x.currency) || {}).currency || '',
    products: items.length, activeProducts: items.length, scanned: prodLinks.length,
    outStock: items.filter((x) => !x.inStock).map((x) => x.name).slice(0, 10),
    weakDesc: items.filter((x) => x.descLen < 80).length,
    noImages: items.filter((x) => !x.hasImage).length,
    priceRange: prices.length ? [prices[0], prices[prices.length - 1]] : null,
    noSalesCount: 0, noSales: [], lowStock: [], top: [], orders: null, revenue: null,
  };
  const prompt = [
    { role: 'system', content: 'أنت خبير تجارة إلكترونية في الإمارات والخليج. اكتب تقرير تحليل متجر بالعربية الواضحة بتنسيق Markdown. استخدم الأرقام الموجودة فقط ولا تخترع أرقاماً. ممنوع تكتب أسماء الحقول البرمجية (زي weakDesc أو noImages أو outStock أو noSalesCount) ولا تعرض قيم صفر أو قوائم فاضية لبيانات مش متاحة؛ اكتب الكلام بالعربي الواضح بس.' },
    { role: 'user', content:
      (profile ? 'عن النشاط:\n' + profileText(profile) + '\n\n' : '') +
      'تحليل من صفحات المتجر العامة فقط (من غير بيانات طلبات أو مبيعات). البيانات (JSON):\n' + JSON.stringify(facts).slice(0, 6000) +
      '\n\nاكتب التقرير بالأقسام دي:\n## الصورة العامة\n(المنصة، عدد المنتجات اللي اتقرأت، نطاق الأسعار)\n## منتجات محتاجة شغل\n(أوصاف قصيرة، صور ناقصة، منتجات خلص مخزونها)\n## 3 عروض مقترحة\n## 5 منشورات جاهزة للسوشيال\n(نص كامل لكل منشور عن منتجات حقيقية من القائمة)\n## تحسينات المتجر\n(أوصاف، صور، صفحة المنتج، الدفع والشحن)\n## اللي محتاج ربط المتجر عشان نعرفه\n(المبيعات، الأكثر مبيعاً، الطلبات المتروكة)' },
  ];
  const report = await D.complete(prompt, 2400, 150000);
  return { title: 'تحليل متجر ' + facts.store, score: null, facts, report };
}

async function fullAnalysis(user, profile) {
  const site = q.latest.get(user.id, 'site');
  const store = q.latest.get(user.id, 'store');
  if (!profile && !site && !store) throw userErr('املأ بيانات نشاطك أو حلّل موقعك ومتجرك الأول.');
  const brief = (r) => r ? ('\n' + r.report.slice(0, 2500)) : ' (لسه ماتعملش)';
  const prompt = [
    { role: 'system', content: 'أنت مستشار تسويق رقمي أول. اكتب خطة نمو عملية بالعربية الواضحة بتنسيق Markdown لنشاط في الإمارات، مبنية على المعلومات المتاحة فقط ولا تخترع أرقاماً.' },
    { role: 'user', content:
      'بيانات النشاط:\n' + (profile ? profileText(profile) : '(مش متاحة)') +
      '\n\nملخص تحليل الموقع:' + brief(site) +
      '\n\nملخص تحليل المتجر:' + brief(store) +
      '\n\nاكتب:\n## التشخيص\n(أهم 3 نقاط قوة و3 مشاكل)\n## الهدف في 30 يوم\n## خطة 30 يوم\n(أسبوع 1، 2، 3، 4: مهام محددة لكل أسبوع)\n## خطة المحتوى\n(جدول بسيط: اليوم، المنصة، فكرة المنشور، لـ 14 يوم)\n## الإعلانات المدفوعة\n(المنصة، الجمهور، الميزانية المقترحة كنسبة، نوع الإعلان)\n## مؤشرات نتابعها\n## 3 حاجات تعملها النهارده' },
  ];
  const report = await D.complete(prompt, 3000, 180000);
  return { title: 'خطة نمو شاملة' + (profile && profile.name ? ' — ' + profile.name : ''), score: null, facts: { site: Boolean(site), store: Boolean(store) }, report };
}

// ---------------- المسارات ----------------
let inflight = 0;
async function routes(req, res, user, p, m) {
  if (!p.startsWith('/api/business')) return null;

  if (m === 'GET' && p === '/api/business') {
    return D.send(res, 200, {
      profile: getProfile(user.id),
      hasLogo: hasLogo(user.id),
      connections: q.conns.all(user.id),
      reports: q.reports.all(user.id),
    });
  }
  if (p === '/api/business/logo') {
    if (m === 'GET') {
      if (!hasLogo(user.id)) return D.send(res, 200, { image: null });
      return D.send(res, 200, { image: 'data:image/png;base64,' + fs.readFileSync(logoPath(user.id)).toString('base64') });
    }
    if (m === 'PUT') {
      const b = await D.readJson(req, 700 * 1024);
      const mm = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
      if (!mm) return D.fail(res, 400, 'bad_request', 'اللوجو لازم يكون صورة PNG.');
      const buf = Buffer.from(mm[1], 'base64');
      if (buf.length < 100 || buf.length > 500 * 1024 || buf[0] !== 0x89 || buf[1] !== 0x50) return D.fail(res, 400, 'bad_request', 'اللوجو كبير أو مش صورة صالحة.');
      fs.mkdirSync(path.dirname(logoPath(user.id)), { recursive: true });
      fs.writeFileSync(logoPath(user.id), buf);
      return D.send(res, 200, { ok: true });
    }
    if (m === 'DELETE') {
      try { fs.unlinkSync(logoPath(user.id)); } catch { /* مش موجود */ }
      return D.send(res, 200, { ok: true });
    }
  }
  if (m === 'PUT' && p === '/api/business') {
    const b = await D.readJson(req);
    const prof = cleanProfile(b.profile || {});
    q.setProfile.run(user.id, JSON.stringify(prof), D.now());
    return D.send(res, 200, { ok: true, profile: prof });
  }
  if (m === 'POST' && p === '/api/business/connect') {
    if (D.rateLimited('bizconn:' + user.id, 8, 600000)) return D.fail(res, 429, 'rate', 'محاولات كتير. استنى شوية.');
    const b = await D.readJson(req);
    const kind = b.kind === 'shopify' ? 'shopify' : b.kind === 'woo' ? 'woo' : '';
    try {
      const t = await testConnection(kind, b);
      q.delStoreConns.run(user.id);
      q.setConn.run(user.id, kind, String(t.label).slice(0, 120), encrypt(t.cred), D.now());
      return D.send(res, 200, { ok: true, label: t.label, connections: q.conns.all(user.id) });
    } catch (e) {
      if (e.user) return D.fail(res, e.status || 400, 'connect', e.message);
      console.error('connect failed', e.message);
      return D.fail(res, 500, 'connect', 'مقدرناش نربط المتجر دلوقتي.');
    }
  }
  let mm = p.match(/^\/api\/business\/connect\/(shopify|woo)$/);
  if (m === 'DELETE' && mm) { q.delConn.run(user.id, mm[1]); return D.send(res, 200, { ok: true, connections: q.conns.all(user.id) }); }

  const kinds = { '/api/business/site-audit': 'site', '/api/business/store-analysis': 'store', '/api/business/store-url': 'store', '/api/business/full-analysis': 'full', '/api/business/social-audit': 'social' };
  if (m === 'POST' && kinds[p]) {
    if (D.rateLimited('bizrun:' + user.id, 4, 300000)) return D.fail(res, 429, 'rate', 'استنى شوية قبل تحليل جديد.');
    if (inflight >= 3) return D.fail(res, 503, 'busy', 'في تحليلات كتير شغّالة دلوقتي. جرّب بعد دقيقة.');
    const b = await D.readJson(req);
    const profile = getProfile(user.id);
    let release;
    try { release = D.reserve(user, 'radar'); }
    catch (e) { return D.fail(res, e.status, e.code, e.message, { kind: e.kind }); }
    inflight += 1;
    try {
      let out;
      if (kinds[p] === 'site') {
        const url = String(b.url || (profile && profile.website) || '').trim();
        if (!url) throw userErr('اكتب رابط موقعك.');
        out = await siteAudit(user, url, profile);
      } else if (p === '/api/business/social-audit') out = await socialAudit(user, b.url, profile);
      else if (p === '/api/business/store-url') out = await storeUrlAnalysis(user, profile, b.url);
      else if (kinds[p] === 'store') out = await storeAnalysis(user, profile);
      else out = await fullAnalysis(user, profile);
      const info = q.addReport.run(user.id, kinds[p], out.title.slice(0, 160), out.score, JSON.stringify(out.facts || {}), out.report, D.now());
      return D.send(res, 200, { id: Number(info.lastInsertRowid), kind: kinds[p], title: out.title, score: out.score, facts: out.facts, report: out.report, created_at: D.now() });
    } catch (e) {
      release();
      if (e.user) return D.fail(res, e.status || 400, 'analysis', e.message);
      console.error('business analysis failed', kinds[p], e.message);
      return D.fail(res, 500, 'upstream', 'مقدرناش نكمّل التحليل دلوقتي. جرّب كمان شوية.');
    } finally { inflight -= 1; }
  }
  mm = p.match(/^\/api\/business\/reports\/(\d+)$/);
  if (mm && m === 'GET') {
    const r = q.report.get(Number(mm[1]), user.id);
    if (!r) return D.fail(res, 404, 'not_found', 'التقرير مش موجود.');
    let facts = {};
    try { facts = JSON.parse(r.facts || '{}'); } catch { /* */ }
    return D.send(res, 200, { id: r.id, kind: r.kind, title: r.title, score: r.score, facts, report: r.report, created_at: r.created_at });
  }
  if (mm && m === 'DELETE') { q.delReport.run(Number(mm[1]), user.id); return D.send(res, 200, { ok: true }); }
  return D.fail(res, 404, 'not_found', 'المسار غير موجود.');
}

module.exports = { init, routes, chatContext, brand, safeFetch, checkUrl, _test: { checkUrl, privateIp, analyzePage, storeStats, normShop, cleanProfile, siteScore } };
