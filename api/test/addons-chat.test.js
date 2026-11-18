'use strict';
// اختبارات المرحلة الثانية: التفعيل، والصلاحيات، والـ Tool Router، ونداء المزود (fetch وهمي).
// تشغيل: node --test api/test/addons-chat.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const addons = require('../app/addons/index.js');
const claude = require('../app/addons/adapters/claude.js');
const gemini = require('../app/addons/adapters/gemini.js');
const openai = require('../app/addons/adapters/openai.js');

const MASTER = crypto.randomBytes(32).toString('hex');

function mkService(fetch) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, disabled INTEGER NOT NULL DEFAULT 0)');
  db.exec('INSERT INTO users (id) VALUES (1), (2)');
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

const okFetch = (replyBody) => {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url: String(url), headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null });
    if (opts.method === 'POST') return new Response(JSON.stringify(replyBody), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response('{}', { status: 200 });
  };
  f.calls = calls;
  return f;
};

async function call(svc, user, method, path, body) {
  const res = {};
  await svc.routes({ body }, res, { id: user }, path, method);
  return res;
}

async function connect(svc, user, addon, key) {
  return call(svc, user, 'POST', '/api/addons/integrations', { addon, apiKey: key });
}

// يقرأ مقاطع SSE كما يقرأها الخادم (سطر data: لكل مقطع)، بدون الاعتماد على وحدات أخرى
async function collect(stream) {
  let out = '';
  for await (const buf of stream.body) {
    const line = buf.toString('utf8').trim();
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    out += JSON.parse(payload).choices[0].delta.content;
  }
  return out;
}

// ---------- التفعيل والصلاحيات ----------
test('لا يمكن تفعيل إضافة بدون ربط مفتاح', async () => {
  const { svc } = mkService(okFetch({}));
  const r = await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'no_integration');
});

test('التفعيل بعد ربط صالح يظهر في الربوط والأدوات، والإيقاف يسحب الأداة', async () => {
  const { svc } = mkService(okFetch({}));
  await connect(svc, 1, 'openai', 'sk-proj-ENABLEME1');
  assert.equal((await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true })).status, 200);
  let tools = (await call(svc, 1, 'GET', '/api/addons/tools')).body.tools;
  assert.deepEqual(tools.map((x) => x.name), ['addon:openai']);
  assert.equal((await call(svc, 1, 'GET', '/api/addons/integrations')).body.integrations[0].enabled, true);

  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: false });
  tools = (await call(svc, 1, 'GET', '/api/addons/tools')).body.tools;
  assert.equal(tools.length, 0);
});

test('التفعيل لا يتم لربط فاشل الحالة', async () => {
  const { db, svc } = mkService(okFetch({}));
  await connect(svc, 1, 'groq', 'gsk_STATUSFAIL1');
  db.prepare("UPDATE user_integrations SET status = 'failed'").run();
  const r = await call(svc, 1, 'PUT', '/api/addons/enabled/groq', { enabled: true });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, 'not_verified');
});

test('العزل: تفعيل مستخدم لا يفعّل شيئاً لمستخدم آخر', async () => {
  const { svc } = mkService(okFetch({}));
  await connect(svc, 1, 'openai', 'sk-proj-USERONE123');
  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  assert.equal((await call(svc, 2, 'GET', '/api/addons/tools')).body.tools.length, 0);
  await assert.rejects(() => svc.openAddonStream(2, 'openai', [{ role: 'user', content: 'hi' }], 100, new AbortController().signal));
});

test('حذف الربط يوقف الإضافة ويسحب صلاحيتها', async () => {
  const { svc } = mkService(okFetch({}));
  const c = await connect(svc, 1, 'openai', 'sk-proj-DELETEFLOW1');
  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  await call(svc, 1, 'DELETE', `/api/addons/integrations/${c.body.integration.id}`);
  assert.equal((await call(svc, 1, 'GET', '/api/addons/tools')).body.tools.length, 0);
});

// ---------- Tool Router ونداء المزود ----------
test('Tool Router: مزود غير مفعّل يرفض النداء ولا يستدعي الشبكة', async () => {
  const f = okFetch({});
  const { svc } = mkService(f);
  await connect(svc, 1, 'openai', 'sk-proj-NOTENABLED1');
  const callsBefore = f.calls.length;
  await assert.rejects(() => svc.openAddonStream(1, 'openai', [{ role: 'user', content: 'hi' }], 100, new AbortController().signal), (e) => e.addon === true && e.httpStatus === 403);
  assert.equal(f.calls.length, callsBefore);
});

test('النداء بمفتاح المستخدم نفسه، والرد يصل كمقطع SSE بنفس شكل المحادثة', async () => {
  const f = okFetch({ choices: [{ message: { content: 'مرحبا من OpenAI' } }] });
  const { db, svc } = mkService(f);
  await connect(svc, 1, 'openai', 'sk-proj-CHATKEY1234');
  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  const stream = await svc.openAddonStream(1, 'openai', [{ role: 'system', content: 'S' }, { role: 'user', content: 'hi' }], 500, new AbortController().signal);
  assert.equal(stream.engine, 'addon:openai');
  assert.equal(await collect(stream), 'مرحبا من OpenAI');
  const chatCall = f.calls.find((c) => c.url.endsWith('/chat/completions'));
  assert.equal(chatCall.headers.Authorization, 'Bearer sk-proj-CHATKEY1234');
  assert.equal(chatCall.body.max_tokens, 500);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM addon_usage_logs WHERE user_id = 1').get().n, 1);
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM addon_execution_logs').all()).includes('CHATKEY'));
});

test('فشل المزود (429): رسالة عامة وكود 502، بدون نص رد المزود', async () => {
  const f = async (url, opts) => (opts.method === 'POST' ? new Response('{"secret":"echo"}', { status: 429 }) : new Response('{}', { status: 200 }));
  const { svc } = mkService(f);
  await connect(svc, 1, 'openai', 'sk-proj-RATEFAIL123');
  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  await assert.rejects(() => svc.openAddonStream(1, 'openai', [{ role: 'user', content: 'hi' }], 100, new AbortController().signal), (e) => {
    assert.equal(e.httpStatus, 502);
    assert.ok(!e.message.includes('echo'));
    return true;
  });
});

test('Claude: النظام في حقل system، والمحادثة تبدأ برسالة مستخدم', async () => {
  const f = okFetch({ content: [{ type: 'text', text: 'رد كلود' }] });
  const text = await claude.chat('sk-ant-KEYX1234', [
    { role: 'system', content: 'تعليمات' }, { role: 'assistant', content: 'قديم' }, { role: 'user', content: 'سؤال' },
  ], { maxTokens: 300 }, f);
  assert.equal(text, 'رد كلود');
  assert.equal(f.calls[0].headers['x-api-key'], 'sk-ant-KEYX1234');
  assert.equal(f.calls[0].body.system, 'تعليمات');
  assert.equal(f.calls[0].body.messages[0].role, 'user');
});

test('Gemini: المفتاح في الهيدر، والنموذج في المسار، والنظام في systemInstruction', async () => {
  const f = okFetch({ candidates: [{ content: { parts: [{ text: 'رد جيميناي' }] } }] });
  const text = await gemini.chat('AIzaKEYX1234', [{ role: 'system', content: 'S' }, { role: 'user', content: 'q' }], { maxTokens: 100, model: 'gemini-x' }, f);
  assert.equal(text, 'رد جيميناي');
  assert.ok(f.calls[0].url.includes('/models/gemini-x:generateContent'));
  assert.ok(!f.calls[0].url.includes('AIzaKEY'));
  assert.equal(f.calls[0].headers['x-goog-api-key'], 'AIzaKEYX1234');
  assert.equal(f.calls[0].body.systemInstruction.parts[0].text, 'S');
});

test('رد فارغ من المزود يعتبر فشلاً', async () => {
  const f = okFetch({ choices: [{ message: { content: '' } }] });
  await assert.rejects(() => openai.chat('sk-proj-EMPTY12345', [{ role: 'user', content: 'q' }], { maxTokens: 10 }, f), (e) => e.code === 'empty');
});

test('نموذج غير صالح من المستخدم يُتجاهل ويُستخدم الافتراضي', async () => {
  const f = okFetch({ choices: [{ message: { content: 'ok' } }] });
  const { svc } = mkService(f);
  await connect(svc, 1, 'openai', 'sk-proj-MODELCHK123');
  await call(svc, 1, 'PUT', '/api/addons/enabled/openai', { enabled: true });
  await collect(await svc.openAddonStream(1, 'openai', [{ role: 'user', content: 'q' }], 10, new AbortController().signal, 'bad model; rm -rf'));
  const chatCall = f.calls.find((c) => c.url.endsWith('/chat/completions'));
  assert.equal(chatCall.body.model, 'gpt-4o-mini');
});
