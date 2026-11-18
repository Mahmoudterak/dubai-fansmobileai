'use strict';
// اختبارات ربط OAuth (Gmail وCanva) بخادم وهمي: لا اتصال حقيقي بـ Google أو Canva.
// تشغيل: node --test test/addons-oauth.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const addons = require('../app/addons/index.js');

const MASTER = crypto.randomBytes(32).toString('hex');
const CREDS = {
  gmail: { id: 'gid.apps.googleusercontent.com', secret: 'GSECRET-TEST' },
  canva: { id: 'canva-client-test', secret: 'CSECRET-TEST' },
};

// fetch وهمي: يرد على نقاط Google وCanva حسب الرابط
function fakeProviders(opts = {}) {
  const calls = [];
  const f = async (url, o = {}) => {
    const u = String(url);
    calls.push({ url: u, method: o.method, headers: o.headers || {}, body: String(o.body || '') });
    const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
    if (u.startsWith('https://oauth2.googleapis.com/token')) {
      if (opts.googleExchangeFails) return json(400, { error: 'invalid_grant' });
      return json(200, { access_token: 'AT-G', refresh_token: 'RT-G-1' });
    }
    if (u.startsWith('https://api.canva.com/rest/v1/oauth/token')) {
      // Canva يدوّر refresh token في كل تبديل: كل refresh يرجّع رمزاً جديداً
      if (opts.canvaRotated) { const isRefresh = String(o.body).includes('grant_type=refresh_token'); if (isRefresh) fakeProviders.n = (fakeProviders.n || 1) + 1; return json(200, { access_token: 'AT-C', refresh_token: 'RT-C-' + (isRefresh ? fakeProviders.n : 1) }); }
      return json(200, { access_token: 'AT-C', refresh_token: 'RT-C-1' });
    }
    if (u.includes('gmail.googleapis.com')) return json(200, { emailAddress: 'x' });
    if (u.includes('api.canva.com/rest/v1/users/me')) return json(200, { team_user: {} });
    return json(404, {});
  };
  f.calls = calls;
  return f;
}

function mk(fetch) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, disabled INTEGER NOT NULL DEFAULT 0)');
  db.exec('INSERT INTO users (id) VALUES (1)');
  let t = 1700000000000;
  const svc = addons.init(db, {
    send: (res, status, obj) => { res.status = status; res.body = obj; },
    fail: (res, status, code, message) => { res.status = status; res.body = { error: { code, message } }; },
    readJson: async (req) => req.body || {},
    rateLimited: () => false,
    now: () => ++t,
    masterKey: MASTER,
    fetch,
    publicBase: 'https://dubaifans.example',
    oauth: CREDS,
  });
  return { db, svc };
}

const fakeRes = () => {
  const r = { headers: {} };
  r.writeHead = (code, h) => { r.code = code; Object.assign(r.headers, h); };
  r.end = () => {};
  return r;
};

async function start(svc, slug) {
  const res = {};
  await svc.routes({}, res, { id: 1 }, `/api/addons/oauth/${slug}/start`, 'GET');
  return res;
}

test('start: يرجع رابط موافقة فيه client_id وredirect_uri وstate، وCanva يستخدم PKCE', async () => {
  const { svc } = mk(fakeProviders());
  const g = await start(svc, 'gmail');
  assert.equal(g.status, 200);
  const gu = new URL(g.body.url);
  assert.equal(gu.origin + gu.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(gu.searchParams.get('client_id'), CREDS.gmail.id);
  assert.equal(gu.searchParams.get('redirect_uri'), 'https://dubaifans.example/api/addons/oauth/callback');
  assert.equal(gu.searchParams.get('access_type'), 'offline');
  assert.ok(!gu.searchParams.has('code_challenge'));
  assert.ok(!g.body.url.includes(CREDS.gmail.secret));

  const c = await start(svc, 'canva');
  const cu = new URL(c.body.url);
  assert.equal(cu.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(cu.searchParams.get('code_challenge'));
});

test('start: بدون إعدادات OAuth يرجع 503 ولا يطلب أي شيء من المزود', async () => {
  const f = fakeProviders();
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, disabled INTEGER NOT NULL DEFAULT 0)');
  db.exec('INSERT INTO users (id) VALUES (1)');
  const svc = addons.init(db, {
    send: (res, s, o) => { res.status = s; res.body = o; },
    fail: (res, s, code, message) => { res.status = s; res.body = { error: { code, message } }; },
    readJson: async () => ({}), rateLimited: () => false, now: () => 1700000000000, masterKey: MASTER, fetch: f,
  });
  const r = await start(svc, 'gmail');
  assert.equal(r.status, 503);
  assert.equal(f.calls.length, 0);
});

test('callback: ينجح، يحفظ refresh token مشفّراً، ويعيد التوجيه بنجاح', async () => {
  const f = fakeProviders();
  const { db, svc } = mk(f);
  const s = await start(svc, 'gmail');
  const state = new URL(s.body.url).searchParams.get('state');
  const res = fakeRes();
  await svc.oauthCallback({}, res, new URL(`https://x/api/addons/oauth/callback?code=CODE1&state=${state}`));
  assert.equal(res.code, 302);
  assert.equal(res.headers.Location, 'https://dubaifans.example/?addons=ok%3Agmail');
  const row = db.prepare("SELECT status, key_hint FROM user_integrations WHERE addon_slug='gmail'").get();
  assert.equal(row.status, 'verified');
  assert.equal(row.key_hint, 'OAuth');
  const cred = db.prepare('SELECT ciphertext FROM addon_credentials').get();
  assert.ok(cred.ciphertext.startsWith('v1:'));
  assert.ok(!cred.ciphertext.includes('RT-G-1'));
  // التوكن الخام لا يظهر في أي رد للواجهة
  const list = {};
  await svc.routes({}, list, { id: 1 }, '/api/addons/integrations', 'GET');
  assert.ok(!JSON.stringify(list.body).includes('RT-G-1'));
  // الكود وstate لمرة واحدة: إعادة استخدامهما تفشل
  const again = fakeRes();
  await svc.oauthCallback({}, again, new URL(`https://x/api/addons/oauth/callback?code=CODE1&state=${state}`));
  assert.equal(again.headers.Location, 'https://dubaifans.example/?addons=fail%3Astate');
});

test('callback: state مزوّر أو رفض المستخدم لا يحفظ شيئاً', async () => {
  const f = fakeProviders();
  const { db, svc } = mk(f);
  const bad = fakeRes();
  await svc.oauthCallback({}, bad, new URL('https://x/api/addons/oauth/callback?code=C&state=forged'));
  assert.equal(bad.headers.Location, 'https://dubaifans.example/?addons=fail%3Astate');
  const s = await start(svc, 'gmail');
  const state = new URL(s.body.url).searchParams.get('state');
  const denied = fakeRes();
  await svc.oauthCallback({}, denied, new URL(`https://x/api/addons/oauth/callback?error=access_denied&state=${state}`));
  assert.equal(denied.headers.Location, 'https://dubaifans.example/?addons=fail%3Adenied');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_integrations').get().n, 0);
  assert.equal(f.calls.length, 0);
});

test('callback: فشل تبادل الرمز لا يحفظ أي ربط', async () => {
  const f = fakeProviders({ googleExchangeFails: true });
  const { db, svc } = mk(f);
  const s = await start(svc, 'gmail');
  const state = new URL(s.body.url).searchParams.get('state');
  const res = fakeRes();
  await svc.oauthCallback({}, res, new URL(`https://x/api/addons/oauth/callback?code=BAD&state=${state}`));
  assert.equal(res.headers.Location, 'https://dubaifans.example/?addons=fail%3Aexchange');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_integrations').get().n, 0);
});

test('Canva يدوّر refresh token: الرمز المحفوظ يصبح الجديد بعد إعادة الاختبار', async () => {
  const f = fakeProviders({ canvaRotated: true });
  const { db, svc } = mk(f);
  const s = await start(svc, 'canva');
  const state = new URL(s.body.url).searchParams.get('state');
  const res = fakeRes();
  await svc.oauthCallback({}, res, new URL(`https://x/api/addons/oauth/callback?code=CC&state=${state}`));
  assert.equal(res.headers.Location, 'https://dubaifans.example/?addons=ok%3Acanva');
  const id = db.prepare("SELECT id FROM user_integrations WHERE addon_slug='canva'").get().id;
  const before = db.prepare('SELECT ciphertext FROM addon_credentials WHERE integration_id = ?').get(id).ciphertext;
  const rt = {};
  await svc.routes({}, rt, { id: 1 }, `/api/addons/integrations/${id}/test`, 'POST');
  assert.equal(rt.body.ok, true);
  const after = db.prepare('SELECT ciphertext FROM addon_credentials WHERE integration_id = ?').get(id).ciphertext;
  assert.notEqual(before, after);
});

test('الربط بالمفتاح اليدوي مرفوض للأدوات التي تعتمد OAuth', async () => {
  const { svc } = mk(fakeProviders());
  const r = {};
  await svc.routes({ body: { addon: 'gmail', apiKey: 'some-long-token-value' } }, r, { id: 1 }, '/api/addons/integrations', 'POST');
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'oauth');
});
