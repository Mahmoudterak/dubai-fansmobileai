'use strict';
// اختبارات الوحدة للإضافات (BYOK). تعمل بدون شبكة: fetch وهمي يحاكي ردود المزودين.
// الاختبار الحقيقي مع المزودين يحتاج مفاتيح اختبار: انظر api/scripts/addons-live-test.js
// تشغيل: node --test api/test/addons.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { createSealer, parseMasterKey } = require('../app/addons/crypto.js');
const addons = require('../app/addons/index.js');

const MASTER = crypto.randomBytes(32).toString('hex');

function mkDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, disabled INTEGER NOT NULL DEFAULT 0)');
  db.exec('INSERT INTO users (id) VALUES (1), (2)');
  return db;
}

function fakeFetch(handler) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url: String(url), headers: opts.headers });
    return handler(String(url), opts);
  };
  f.calls = calls;
  return f;
}
const reply = (status) => new Response('{"error":"raw upstream body"}', { status });

function mkService({ masterKey = MASTER, fetch, rate = false } = {}) {
  const db = mkDb();
  let t = 1700000000000;
  const svc = addons.init(db, {
    send: (res, status, obj) => { res.status = status; res.body = obj; },
    fail: (res, status, code, message) => { res.status = status; res.body = { error: { code, message } }; },
    readJson: async (req) => req.body || {},
    rateLimited: () => rate,
    now: () => ++t,
    masterKey,
    fetch,
  });
  return { db, svc };
}

async function call(svc, user, method, path, body) {
  const res = {};
  await svc.routes({ body }, res, { id: user }, path, method);
  return res;
}

// ---------- التشفير ----------
test('AES-GCM: roundtrip يعمل، وAAD خاطئ أو تعديل في النص يفشل', () => {
  const s = createSealer(MASTER);
  const c = s.seal('sk-test-123456', '1|openai');
  assert.equal(s.open(c, '1|openai'), 'sk-test-123456');
  assert.throws(() => s.open(c, '2|openai'));
  assert.throws(() => s.open(c, '1|claude'));
  const tampered = c.slice(0, -2) + (c.slice(-2) === 'AA' ? 'BB' : 'AA');
  assert.throws(() => s.open(tampered, '1|openai'));
  assert.ok(!c.includes('sk-test'));
});

test('المفتاح الرئيسي: hex أو base64 بطول 32 بايت فقط', () => {
  assert.equal(parseMasterKey(MASTER).length, 32);
  assert.equal(parseMasterKey(crypto.randomBytes(32).toString('base64')).length, 32);
  assert.equal(parseMasterKey(''), null);
  assert.equal(parseMasterKey(crypto.randomBytes(31).toString('hex').slice(0, 62)), null);
  assert.equal(createSealer(undefined), null);
});

// ---------- الربط ----------
test('ربط مفتاح صالح: يُختبر أولاً ثم يُحفظ مشفّراً ولا يظهر في أي رد', async () => {
  const f = fakeFetch(() => reply(200));
  const { db, svc } = mkService({ fetch: f });
  const KEY = 'sk-proj-SECRETVALUE9876';
  const r = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openai', apiKey: KEY });
  assert.equal(r.status, 201);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://api.openai.com/v1/models');
  assert.equal(f.calls[0].headers.Authorization, 'Bearer ' + KEY);
  assert.equal(r.body.integration.keyHint, '…9876');
  assert.ok(!JSON.stringify(r.body).includes('SECRETVALUE'));

  const list = await call(svc, 1, 'GET', '/api/addons/integrations');
  assert.equal(list.body.integrations.length, 1);
  assert.ok(!JSON.stringify(list.body).includes('SECRETVALUE'));

  const stored = db.prepare('SELECT ciphertext FROM addon_credentials').all();
  assert.equal(stored.length, 1);
  assert.ok(!stored[0].ciphertext.includes('SECRETVALUE'));
  const logs = JSON.stringify(db.prepare('SELECT * FROM addon_execution_logs').all());
  assert.ok(!logs.includes('SECRETVALUE'));
});

test('مفتاح مرفوض (401): يرجع 422 ولا يُحفظ أي شيء', async () => {
  const { db, svc } = mkService({ fetch: fakeFetch(() => reply(401)) });
  const r = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'groq', apiKey: 'gsk_wrongkey1' });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'invalid_key');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_integrations').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM addon_credentials').get().n, 0);
});

test('فشل الشبكة: رسالة عامة بدون تفاصيل داخلية، ولا حفظ', async () => {
  const { db, svc } = mkService({ fetch: async () => { throw new Error('ECONNRESET'); } });
  const r = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'claude', apiKey: 'sk-ant-api-12345678' });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'network');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_integrations').get().n, 0);
});

test('Gemini يرسل المفتاح في الهيدر لا في الرابط، وClaude يرسل الهيدرات الصحيحة', async () => {
  const f = fakeFetch(() => reply(200));
  const { svc } = mkService({ fetch: f });
  await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'gemini', apiKey: 'AIzaSyKEY-123456' });
  await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'claude', apiKey: 'sk-ant-KEY-123456' });
  assert.ok(!f.calls[0].url.includes('AIzaSyKEY'));
  assert.equal(f.calls[0].headers['x-goog-api-key'], 'AIzaSyKEY-123456');
  assert.equal(f.calls[1].headers['x-api-key'], 'sk-ant-KEY-123456');
  assert.equal(f.calls[1].headers['anthropic-version'], '2023-06-01');
});

test('مدخلات غير صالحة: مزود غير معروف أو مفتاح فيه مسافات', async () => {
  const { svc } = mkService({ fetch: fakeFetch(() => reply(200)) });
  assert.equal((await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'unknown', apiKey: 'abcdefgh' })).status, 400);
  assert.equal((await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openai', apiKey: 'abc def ghi' })).status, 400);
});

test('بدون ADDONS_MASTER_KEY: الخدمة معطّلة ولا يُستدعى أي مزود', async () => {
  const f = fakeFetch(() => reply(200));
  const { svc } = mkService({ masterKey: '', fetch: f });
  const r = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openai', apiKey: 'sk-proj-12345678' });
  assert.equal(r.status, 503);
  assert.equal(f.calls.length, 0);
  const cat = await call(svc, 1, 'GET', '/api/addons/catalog');
  assert.equal(cat.body.enabled, false);
});

// ---------- إعادة الاختبار والحذف والعزل ----------
test('إعادة الاختبار تفك المفتاح داخل السيرفر وتحدّث الحالة', async () => {
  let good = true;
  const f = fakeFetch(() => reply(good ? 200 : 401));
  const { svc } = mkService({ fetch: f });
  const created = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openrouter', apiKey: 'sk-or-v1-KEY1234' });
  const id = created.body.integration.id;
  const ok = await call(svc, 1, 'POST', `/api/addons/integrations/${id}/test`);
  assert.equal(ok.body.ok, true);
  assert.equal(f.calls[1].headers.Authorization, 'Bearer sk-or-v1-KEY1234');
  good = false;
  const bad = await call(svc, 1, 'POST', `/api/addons/integrations/${id}/test`);
  assert.equal(bad.body.status, 'failed');
  const list = await call(svc, 1, 'GET', '/api/addons/integrations');
  assert.equal(list.body.integrations[0].status, 'failed');
});

test('العزل: مستخدم آخر لا يرى ولا يختبر ولا يحذف ربط غيره', async () => {
  const { db, svc } = mkService({ fetch: fakeFetch(() => reply(200)) });
  const created = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'groq', apiKey: 'gsk_USER1KEY99' });
  const id = created.body.integration.id;
  assert.equal((await call(svc, 2, 'GET', '/api/addons/integrations')).body.integrations.length, 0);
  assert.equal((await call(svc, 2, 'POST', `/api/addons/integrations/${id}/test`)).status, 404);
  assert.equal((await call(svc, 2, 'DELETE', `/api/addons/integrations/${id}`)).status, 404);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM addon_credentials').get().n, 1);
});

test('الحذف يمسح الربط والمفتاح المشفّر معاً', async () => {
  const { db, svc } = mkService({ fetch: fakeFetch(() => reply(200)) });
  const created = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openai', apiKey: 'sk-proj-DELETEME1' });
  const del = await call(svc, 1, 'DELETE', `/api/addons/integrations/${created.body.integration.id}`);
  assert.equal(del.body.ok, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM addon_credentials').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM user_integrations').get().n, 0);
});

test('الحد من المحاولات: يرجع 429 دون استدعاء المزود', async () => {
  const f = fakeFetch(() => reply(200));
  const { svc } = mkService({ fetch: f, rate: true });
  const r = await call(svc, 1, 'POST', '/api/addons/integrations', { addon: 'openai', apiKey: 'sk-proj-12345678' });
  assert.equal(r.status, 429);
  assert.equal(f.calls.length, 0);
});

test('المسارات غير المعروفة داخل /api/addons ترجع 404، والمسارات الأخرى تُترك للراوتر الرئيسي', async () => {
  const { svc } = mkService({ fetch: fakeFetch(() => reply(200)) });
  assert.equal((await call(svc, 1, 'GET', '/api/addons/nope')).status, 404);
  const res = {};
  assert.equal(await svc.routes({}, res, { id: 1 }, '/api/chat', 'POST'), null);
});
