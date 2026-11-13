'use strict';
// باحث العملاء: بحث على الويب عن نشاطات في مجال ومدينة، وفحص مجاني لموقع كل واحد،
// وصياغة رسالة مقترحة. الإرسال يدوي من المستخدم دايماً، والمنصة ما بتجمعش أي أرقام أو إيميلات.

const dns = require('node:dns/promises');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');

const MAX_LEADS = 6;
const MAX_PAGE_BYTES = 300 * 1024;
const FETCH_MS = 8000;
const SKIP_HOSTS = /(^|\.)(facebook|instagram|tiktok|linkedin|twitter|x|youtube|snapchat|google|maps\.google|yelp|tripadvisor|wikipedia|pinterest|yellowpages|talabat|deliveroo|noon|amazon|booking|airbnb)\./i;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:');
  }
  return true;
}

// يتأكد إن الهوست عام (مش داخلي) قبل أي طلب، عشان ما يتحولش لأداة اختراق داخلي
async function publicHost(hostname) {
  if (net.isIP(hostname)) return !isPrivateIp(hostname);
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch (e) { return false; }
}

// يجيب الصفحة الرئيسية بحد زمني وحجم، ويتبع التحويلات بحد أقصى 3، وكل خطوة بتتفحص
// طلب واحد بـ node:https/http، والعنوان بيتفحص لحظة الاتصال نفسه (مش قبله)،
// عشان DNS rebinding ما يقدرش يوصلنا لعنوان داخلي
function safeGet(url) {
  return new Promise((resolve) => {
    const lib = url.protocol === 'https:' ? https : http;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const lookup = (hostname, opts, cb) => {
      dns.lookup(hostname, { all: true }).then((addrs) => {
        const ok = addrs.length && addrs.every((a) => !isPrivateIp(a.address));
        if (!ok) return cb(new Error('blocked address'));
        if (opts && opts.all) return cb(null, addrs);
        return cb(null, addrs[0].address, addrs[0].family);
      }, cb);
    };
    const req = lib.request(url, {
      method: 'GET',
      lookup,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DubaiFansAI-Audit/1.0)', Accept: 'text/html' },
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size <= MAX_PAGE_BYTES) chunks.push(c);
        else { res.destroy(); finish({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }); }
      });
      res.on('end', () => finish({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', () => finish(null));
    });
    req.setTimeout(FETCH_MS, () => { req.destroy(); finish(null); });
    req.on('error', () => finish(null));
    req.end();
  });
}

async function fetchPage(startUrl) {
  let url;
  try { url = new URL(startUrl); } catch (e) { return null; }
  for (let hop = 0; hop < 4; hop += 1) {
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    // العناوين الرقمية المباشرة ما بتمرّش على lookup، فنفحصها هنا
    if (!(await publicHost(url.hostname))) return null;
    const res = await safeGet(url);
    if (!res) return null;
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      try { url = new URL(res.headers.location, url); } catch (e) { return null; }
      continue;
    }
    if (res.status < 200 || res.status >= 300) return null;
    if (!/text\/html/i.test(res.headers['content-type'] || '')) return null;
    return { html: res.body.toString('utf8'), finalUrl: url.toString() };
  }
  return null;
}

function tagCount(html, re) { return (html.match(re) || []).length; }

// فحص ثابت للصفحة الرئيسية: أشياء بتأثر على الظهور في جوجل وعلى الموبايل
function auditHtml(html, finalUrl) {
  const issues = [];
  const head = html.slice(0, 200000);
  if (!finalUrl.startsWith('https://')) issues.push('الموقع بدون HTTPS، وده بيأثر على الثقة وترتيب جوجل');
  if (!/<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(head)) issues.push('مفيش عنوان (title) واضح للصفحة');
  if (!/<meta[^>]+name=["']description["'][^>]*content=["'][^"']{20,}/i.test(head)) issues.push('مفيش وصف (meta description) للصفحة في جوجل');
  if (!/<meta[^>]+name=["']viewport["']/i.test(head)) issues.push('الموقع مش متجهز للموبايل (مفيش viewport)');
  if (!/<html[^>]+lang=/i.test(head)) issues.push('مفيش تحديد لغة الصفحة (lang)');
  const h1 = tagCount(head, /<h1[\s>]/gi);
  if (h1 === 0) issues.push('مفيش عنوان رئيسي (H1) في الصفحة');
  if (h1 > 1) issues.push('أكتر من H1 في الصفحة، وده بيشتت جوجل');
  const imgs = head.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/\balt=/i.test(t)).length;
  if (noAlt) issues.push(`${noAlt} صورة بدون وصف alt`);
  const noDim = imgs.filter((t) => !/\bwidth=/i.test(t) || !/\bheight=/i.test(t)).length;
  if (noDim > 2) issues.push('صور كتير من غير أبعاد، وده بيبطّئ التحميل');
  const blocking = (head.match(/<script[^>]+src=[^>]*>/gi) || []).filter((t) => !/\b(defer|async)\b/i.test(t)).length;
  if (blocking > 2) issues.push(`${blocking} ملف JS بيعطّل التحميل`);
  if (!/property=["']og:title["']/i.test(head)) issues.push('مفيش بيانات مشاركة (Open Graph) للسوشيال');
  return issues;
}

function nameFromTitle(title, url) {
  const t = String(title || '').split(/[|\-–—]/)[0].trim();
  return (t || new URL(url).hostname).slice(0, 80);
}

function init(db, deps) {
  async function search(category, city) {
    const q = `${category} ${city} official website`;
    const results = await deps.search(q);
    const seen = new Set();
    const out = [];
    for (const r of results) {
      let host;
      try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch (e) { continue; }
      if (SKIP_HOSTS.test(host) || seen.has(host)) continue;
      seen.add(host);
      out.push({ title: r.title, url: r.url, host });
      if (out.length >= MAX_LEADS) break;
    }
    return out;
  }

  async function auditOne(c) {
    const page = await fetchPage(c.url);
    if (!page) return { name: nameFromTitle(c.title, c.url), url: c.url, reachable: false, issues: ['الموقع مش بيرد أو مش متاح للفحص'] };
    return { name: nameFromTitle(c.title, page.finalUrl), url: page.finalUrl, reachable: true, issues: auditHtml(page.html, page.finalUrl) };
  }

  async function route(req, res, user, p, m) {
    if (p === '/api/ai-tools/leads' && m === 'POST') {
      if (deps.rateLimited('leads:' + user.id, 3, 3600000)) return deps.fail(res, 429, 'rate', 'بحوث كتير. جرّب بعد ساعة.');
      const b = await deps.readJson(req, 4 * 1024);
      const category = String(b.category || '').replace(/[\u0000-\u001f"'<>]/g, ' ').trim().slice(0, 60);
      const city = String(b.city || '').replace(/[\u0000-\u001f"'<>]/g, ' ').trim().slice(0, 40);
      if (category.length < 2 || city.length < 2) return deps.fail(res, 400, 'input', 'اكتب نوع النشاط والمدينة.');
      let release;
      try { release = deps.reserve(user, 'radar'); }
      catch (e) { return deps.fail(res, e.status || 429, e.code || 'quota', e.message, { kind: e.kind }); }
      try {
        const cands = await search(category, city);
        if (!cands.length) { release(); return deps.send(res, 200, { leads: [], note: 'مالقيتش نتايج. جرّب كلمة تانية.' }); }
        const leads = [];
        for (const c of cands) leads.push(await auditOne(c));
        return deps.send(res, 200, {
          leads,
          note: 'الفحص ده على الصفحة الرئيسية بس وبيتعمل تلقائياً. اتأكد إنك مسموح تتواصل مع النشاط قبل ما ترسل له أي رسالة.',
        });
      } catch (e) {
        release();
        console.error('leads failed:', e.message);
        return deps.fail(res, 502, 'search', 'حصلت مشكلة في البحث. جرّب بعدين.');
      }
    }

    if (p === '/api/ai-tools/outreach' && m === 'POST') {
      const b = await deps.readJson(req, 8 * 1024);
      const name = String(b.name || '').slice(0, 80);
      const issues = (Array.isArray(b.issues) ? b.issues : []).slice(0, 8).map((x) => String(x).slice(0, 160));
      const mine = String(b.yourBusiness || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 200);
      if (!name || !issues.length) return deps.fail(res, 400, 'input', 'اختار نشاط فيه ملاحظات الأول.');
      if (deps.rateLimited('outreach:' + user.id, 20, 3600000)) return deps.fail(res, 429, 'rate', 'رسايل كتير. جرّب بعد شوية.');
      try {
        const text = await deps.complete([
          { role: 'system', content: 'اكتب رسالة واتساب قصيرة ومهذبة بالعربية (4 أسطر كحد أقصى) لصاحب نشاط، تعرض عليه ملاحظات فحص موقعه وتقترح مساعدة بدون ضغط. ما تخترعش أرقام أو نتائج. لا تكتب أي اسم شخص. نص عادي.' },
          { role: 'user', content: `اسم النشاط: ${name}\nملاحظات الفحص:\n- ${issues.join('\n- ')}\n${mine ? 'نشاطي: ' + mine : ''}` },
        ], 300, 30000);
        return deps.send(res, 200, { draft: String(text || '').trim().slice(0, 1000) });
      } catch (e) {
        console.error('outreach failed:', e.message);
        return deps.fail(res, 502, 'model', 'مقدرناش نكتب الرسالة دلوقتي. جرّب بعدين.');
      }
    }
    return null;
  }

  return { route };
}

module.exports = { init, auditHtml, isPrivateIp };
