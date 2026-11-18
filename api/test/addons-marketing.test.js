'use strict';
// اختبارات أدوات التسويق والـSEO (BYOK): الربط والفحص فقط، بدون مفاتيح حقيقية (fetch وهمي).
// تشغيل: node --test api/test/addons-marketing.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const addons = require('../app/addons/index.js');

const MASTER = crypto.randomBytes(32).toString('hex');

function mkService(fetch) {
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
  });
  return { db, svc };
}

function recordingFetch(status) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url: String(url), headers: opts.headers || {} });
    return new Response('{}', { status });
  };
  f.calls = calls;
  return f;
}

async function call(svc, method, path, body) {
  const res = {};
  await svc.routes({ body }, res, { id: 1 }, path, method);
  return res;
}

test('Mailchimp: مفتاح بدون منطقة يُرفض دون أي اتصال بالشبكة', async () => {
  const f = recordingFetch(200);
  const { svc } = mkService(f);
  const r = await call(svc, 'POST', '/api/addons/integrations', { addon: 'mailchimp', apiKey: 'mc-fixture-key-noregion' });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.code, 'invalid_key');
  assert.equal(f.calls.length, 0);
});

test('Mailchimp: الفحص يذهب إلى منطقة المفتاح، والمفتاح في Basic auth وليس في الرابط', async () => {
  const f = recordingFetch(200);
  const { svc } = mkService(f);
  const KEY = 'mc-fixture-key-us21';
  const r = await call(svc, 'POST', '/api/addons/integrations', { addon: 'mailchimp', apiKey: KEY });
  assert.equal(r.status, 201);
  assert.equal(f.calls[0].url, 'https://us21.api.mailchimp.com/3.0/ping');
  assert.ok(!f.calls[0].url.includes(KEY));
  assert.equal(f.calls[0].headers.Authorization, 'Basic ' + Buffer.from('anystring:' + KEY).toString('base64'));
});

test('HubSpot وAhrefs: الرمز يُرسل في Authorization فقط', async () => {
  const f = recordingFetch(200);
  const { svc } = mkService(f);
  await call(svc, 'POST', '/api/addons/integrations', { addon: 'hubspot', apiKey: 'pat-na1-TESTTOKEN123' });
  await call(svc, 'POST', '/api/addons/integrations', { addon: 'ahrefs', apiKey: 'ahrefs-TESTTOKEN123' });
  assert.equal(f.calls[0].url, 'https://api.hubapi.com/account-info/v3/details');
  assert.equal(f.calls[0].headers.Authorization, 'Bearer pat-na1-TESTTOKEN123');
  assert.equal(f.calls[1].headers.Authorization, 'Bearer ahrefs-TESTTOKEN123');
});

test('أداة تسويق مربوطة لا تُفعَّل للمحادثة، ولا تُستخدم كمزود محادثة', async () => {
  const { svc } = mkService(recordingFetch(200));
  await call(svc, 'POST', '/api/addons/integrations', { addon: 'hubspot', apiKey: 'pat-na1-TESTTOKEN456' });
  const r = await call(svc, 'PUT', '/api/addons/enabled/hubspot', { enabled: true });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'not_chat');
  await assert.rejects(() => svc.openAddonStream(1, 'hubspot', [{ role: 'user', content: 'hi' }], 100, new AbortController().signal));
});
