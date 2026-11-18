'use strict';
// الإضافات (BYOK): المستخدم يربط مفتاحه الخاص عند المزود، نختبره فعلياً، ثم نحفظه مشفّراً،
// ويفعّل الإضافة. عندها يمكن للمحادثة استخدامها عبر Tool Router. المزود يحاسب صاحب المفتاح مباشرة.
// المسارات (كلها بجلسة الحساب، ومعزولة حسب user_id):
//   GET    /api/addons/catalog                  قائمة المزودين المدعومين
//   GET    /api/addons/integrations             ربوط المستخدم (بدون أي مفتاح، فقط آخر 4 محارف وحالة التفعيل)
//   POST   /api/addons/integrations             { addon, apiKey }: يختبر المفتاح أولاً، ثم يحفظه مشفّراً
//   POST   /api/addons/integrations/:id/test    يعيد اختبار المفتاح المحفوظ
//   DELETE /api/addons/integrations/:id         يحذف الربط والمفتاح المشفّر ويوقف الإضافة
//   PUT    /api/addons/enabled/:slug            { enabled } يفعّل الإضافة (يتطلب ربطاً صالحاً) أو يوقفها
//   GET    /api/addons/tools                    أدوات الإضافات المفعّلة للمستخدم (Tool Registry)
// المفتاح لا يُرجَّع للواجهة ولا يُسجَّل.

const { createSealer } = require('./crypto.js');
const { initSchema } = require('./schema.js');
const { ADAPTERS, bySlug } = require('./adapters/index.js');
const { createOauth, initOauthSchema } = require('./oauth.js');

const KEY_RE = /^[\x21-\x7e]{8,300}$/; // بدون مسافات أو محارف تحكم
const MODEL_RE = /^[A-Za-z0-9._/:-]{1,80}$/;
const RATE_MAX = 10;
const RATE_WINDOW_MS = 60000;
const TOOL = 'chat'; // الأداة الوحيدة في المرحلة الثانية: الدردشة بمفتاح المستخدم

const UPSTREAM_MSG = {
  invalid_key: 'المفتاح مرفوض من المزود. أعد ربطه من قائمة الإضافات.',
  rate_limited: 'المزود رجّع "كثرة طلبات". جرّب بعد دقيقة.',
  network: 'تعذّر الوصول للمزود الآن. جرّب بعد شوية.',
  empty: 'المزود رجّع رداً فارغاً. جرّب مرة ثانية.',
};

// خطأ يعرف الـ chat كيف يرد به: httpStatus لكود الرد، و addon=true يعني أنه ليس عطلاً داخلياً
function addonError(message, httpStatus) {
  const e = new Error(message);
  e.addon = true;
  e.httpStatus = httpStatus;
  return e;
}

// يمنع مطابقة أي نص داخل المحادثة لطلب من خارج الخادم: الرد يُرسل كمقطع SSE واحد بنفس شكل بقية الردود
async function* singleSseChunk(text) {
  yield Buffer.from('data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n');
  yield Buffer.from('data: [DONE]\n\n');
}

function init(db, deps) {
  initSchema(db);
  initOauthSchema(db);
  const { send, fail, readJson, rateLimited, now } = deps;
  const sealer = createSealer(deps.masterKey);
  const fetchImpl = (...a) => (deps.fetch || globalThis.fetch)(...a);

  const seed = db.prepare(`INSERT INTO addons (slug, name, category, created_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category = excluded.category`);
  for (const a of ADAPTERS) seed.run(a.slug, a.name, a.category, now());

  const st = {
    upsertIntegration: db.prepare(`INSERT INTO user_integrations (user_id, addon_slug, key_hint, status, last_tested_at, created_at, updated_at)
      VALUES (?, ?, ?, 'verified', ?, ?, ?)
      ON CONFLICT(user_id, addon_slug) DO UPDATE SET key_hint = excluded.key_hint, status = 'verified',
        last_tested_at = excluded.last_tested_at, updated_at = excluded.updated_at`),
    idByUserSlug: db.prepare('SELECT id, status FROM user_integrations WHERE user_id = ? AND addon_slug = ?'),
    upsertCred: db.prepare(`INSERT INTO addon_credentials (integration_id, user_id, ciphertext, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(integration_id) DO UPDATE SET ciphertext = excluded.ciphertext, rotated_at = excluded.created_at`),
    listForUser: db.prepare(`SELECT i.id, i.addon_slug, i.key_hint, i.status, i.last_tested_at, i.updated_at,
        COALESCE(ua.enabled, 0) AS enabled
      FROM user_integrations i
      LEFT JOIN user_addons ua ON ua.user_id = i.user_id AND ua.addon_slug = i.addon_slug
      WHERE i.user_id = ? ORDER BY i.id`),
    getForUser: db.prepare('SELECT id, addon_slug, key_hint, status FROM user_integrations WHERE id = ? AND user_id = ?'),
    credForUser: db.prepare('SELECT ciphertext FROM addon_credentials WHERE integration_id = ? AND user_id = ?'),
    setStatus: db.prepare('UPDATE user_integrations SET status = ?, last_tested_at = ?, updated_at = ? WHERE id = ? AND user_id = ?'),
    delCred: db.prepare('DELETE FROM addon_credentials WHERE integration_id = ? AND user_id = ?'),
    delIntegration: db.prepare('DELETE FROM user_integrations WHERE id = ? AND user_id = ?'),
    // Tool Router: الإضافة المفعّلة + ربطها الصالح + مفتاحها المشفّر في استعلام واحد، بنفس user_id
    enabledRoute: db.prepare(`SELECT ua.enabled, ua.integration_id, i.status, c.ciphertext
      FROM user_addons ua
      JOIN user_integrations i ON i.id = ua.integration_id AND i.user_id = ua.user_id
      JOIN addon_credentials c ON c.integration_id = i.id AND c.user_id = ua.user_id
      WHERE ua.user_id = ? AND ua.addon_slug = ?`),
    upsertUserAddon: db.prepare(`INSERT INTO user_addons (user_id, addon_slug, integration_id, enabled, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, addon_slug) DO UPDATE SET integration_id = excluded.integration_id,
        enabled = excluded.enabled, updated_at = excluded.updated_at`),
    setEnabled: db.prepare('UPDATE user_addons SET enabled = ?, updated_at = ? WHERE user_id = ? AND addon_slug = ?'),
    detachAddon: db.prepare('UPDATE user_addons SET enabled = 0, integration_id = NULL, updated_at = ? WHERE integration_id = ? AND user_id = ?'),
    upsertPerm: db.prepare(`INSERT INTO addon_permissions (user_id, addon_slug, tool_name, allowed) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, addon_slug, tool_name) DO UPDATE SET allowed = excluded.allowed`),
    perm: db.prepare('SELECT allowed FROM addon_permissions WHERE user_id = ? AND addon_slug = ? AND tool_name = ?'),
    revokePerms: db.prepare('UPDATE addon_permissions SET allowed = 0 WHERE user_id = ? AND addon_slug = ?'),
    usage: db.prepare('INSERT INTO addon_usage_logs (user_id, addon_slug, units, created_at) VALUES (?, ?, ?, ?)'),
    logExec: db.prepare('INSERT INTO addon_execution_logs (user_id, addon_slug, action, status, error_code, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  };

  const aadFor = (userId, slug) => `${userId}|${slug}`;
  const publicRow = (r) => ({
    id: r.id, addon: r.addon_slug, keyHint: r.key_hint, status: r.status,
    enabled: Boolean(r.enabled), lastTestedAt: r.last_tested_at || null, updatedAt: r.updated_at,
  });
  // سجل التنفيذ بدون أي بيانات من المفتاح، والفشل في السجل لا يوقف الطلب
  const log = (userId, slug, action, status, code, ms) => {
    try { st.logExec.run(userId, slug, action, status, code || null, ms, now()); } catch { /* تجاهل */ }
  };
  const disabled = (res) => fail(res, 503, 'addons_off', 'الإضافات غير مفعّلة على السيرفر حالياً.');

  // ---------- OAuth (Gmail وCanva): مفاتيح التطبيق من البيئة، والمستخدم يوافق على حسابه ----------
  const oauthCreds = deps.oauth || {};
  const saveSecret = (userId, slug, secret, ts) => {
    const cipher = sealer.seal(secret, aadFor(userId, slug));
    db.exec('BEGIN IMMEDIATE');
    try {
      st.upsertIntegration.run(userId, slug, 'OAuth', ts, ts, ts);
      const id = st.idByUserSlug.get(userId, slug).id;
      st.upsertCred.run(id, userId, cipher, ts);
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* تجاهل */ }
      throw e;
    }
  };
  const verify = (slug, secret) => bySlug(slug).test(secret, fetchImpl, oauthCreds[slug]);
  const oauth = createOauth({ db, now, creds: oauthCreds, publicBase: deps.publicBase || '', fetch: deps.fetch, saveSecret, verify });
  // يرجّع true ويرد 429 لو تجاوز الحد
  const rateLimitedRes = (res, user) => {
    if (!rateLimited('addon:' + user.id, RATE_MAX, RATE_WINDOW_MS)) return false;
    fail(res, 429, 'rate', 'محاولات كتير. استنى دقيقة.');
    return true;
  };

  // ربط مفتاح جديد: اختبار فعلي أولاً، ولا نحفظ أي شيء إن فشل الاختبار
  async function connect(req, res, user) {
    if (!sealer) return disabled(res);
    if (rateLimitedRes(res, user)) return undefined;
    const body = await readJson(req, 4096);
    const adapter = bySlug(body.addon);
    if (!adapter) return fail(res, 400, 'addon', 'الإضافة غير معروفة.');
    if (adapter.oauth) return fail(res, 400, 'oauth', 'اربط هذه الأداة بحسابك عبر زر الربط.');
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!KEY_RE.test(apiKey)) return fail(res, 400, 'bad_key', 'اكتب مفتاح المزود كاملاً بدون مسافات.');

    const t0 = Date.now();
    const r = await adapter.test(apiKey, fetchImpl);
    log(user.id, adapter.slug, 'connect', r.ok ? 'ok' : 'failed', r.code, Date.now() - t0);
    if (!r.ok) return fail(res, 422, r.code, r.message);

    const ts = now();
    const cipher = sealer.seal(apiKey, aadFor(user.id, adapter.slug));
    const hint = '…' + apiKey.slice(-4);
    db.exec('BEGIN IMMEDIATE');
    let id;
    try {
      st.upsertIntegration.run(user.id, adapter.slug, hint, ts, ts, ts);
      id = st.idByUserSlug.get(user.id, adapter.slug).id;
      st.upsertCred.run(id, user.id, cipher, ts);
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* تجاهل */ }
      throw e;
    }
    return send(res, 201, {
      integration: { id, addon: adapter.slug, keyHint: hint, status: 'verified', enabled: false, lastTestedAt: ts, updatedAt: ts },
      message: r.message,
    });
  }

  // إعادة اختبار مفتاح محفوظ: يُفكّ داخل السيرفر فقط
  async function retest(res, user, id) {
    if (!sealer) return disabled(res);
    if (rateLimitedRes(res, user)) return undefined;
    const row = st.getForUser.get(id, user.id);
    const cred = row && st.credForUser.get(id, user.id);
    if (!row || !cred) return fail(res, 404, 'not_found', 'الربط غير موجود.');
    const adapter = bySlug(row.addon_slug);
    if (!adapter) return fail(res, 404, 'not_found', 'الإضافة غير موجودة.');
    let apiKey;
    try { apiKey = sealer.open(cred.ciphertext, aadFor(user.id, row.addon_slug)); }
    catch { return fail(res, 500, 'decrypt', 'تعذّر فك تشفير المفتاح. اربطه من جديد.'); }
    const t0 = Date.now();
    const r = await adapter.test(apiKey, fetchImpl, oauthCreds[adapter.slug]);
    if (r.ok && r.secret && r.secret !== apiKey) saveSecret(user.id, row.addon_slug, r.secret, now());
    apiKey = null;
    const ts = now();
    st.setStatus.run(r.ok ? 'verified' : 'failed', ts, ts, id, user.id);
    log(user.id, adapter.slug, 'retest', r.ok ? 'ok' : 'failed', r.code, Date.now() - t0);
    return send(res, 200, { ok: r.ok, status: r.ok ? 'verified' : 'failed', code: r.code, message: r.message });
  }

  function remove(res, user, id) {
    const row = st.getForUser.get(id, user.id);
    if (!row) return fail(res, 404, 'not_found', 'الربط غير موجود.');
    const ts = now();
    db.exec('BEGIN IMMEDIATE');
    try {
      st.detachAddon.run(ts, id, user.id);
      st.revokePerms.run(user.id, row.addon_slug);
      st.delCred.run(id, user.id);
      st.delIntegration.run(id, user.id);
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* تجاهل */ }
      throw e;
    }
    log(user.id, row.addon_slug, 'delete', 'ok', null, 0);
    return send(res, 200, { ok: true });
  }

  // تفعيل/إيقاف الإضافة: التفعيل يتطلب ربطاً صالحاً ومفتاحاً محفوظاً، ويمنح صلاحية الدردشة
  async function setEnabled(req, res, user, slug) {
    const adapter = bySlug(slug);
    if (!adapter) return fail(res, 404, 'not_found', 'الإضافة غير موجودة.');
    const body = await readJson(req, 1024);
    const on = body.enabled === true;
    const ts = now();
    if (on && !adapter.chat) return fail(res, 409, 'not_chat', 'هذه الأداة لا تدعم المحادثة بعد.');
    if (on) {
      const row = st.idByUserSlug.get(user.id, slug);
      const cred = row && st.credForUser.get(row.id, user.id);
      if (!row || !cred) return fail(res, 409, 'no_integration', 'اربط مفتاح المزود أولاً.');
      if (row.status !== 'verified') return fail(res, 409, 'not_verified', 'مفتاح هذه الإضافة لم يعد صالحاً. أعد اختباره أولاً.');
      db.exec('BEGIN IMMEDIATE');
      try {
        st.upsertUserAddon.run(user.id, slug, row.id, 1, ts);
        st.upsertPerm.run(user.id, slug, TOOL, 1);
        db.exec('COMMIT');
      } catch (e) {
        try { db.exec('ROLLBACK'); } catch { /* تجاهل */ }
        throw e;
      }
    } else {
      db.exec('BEGIN IMMEDIATE');
      try {
        st.setEnabled.run(0, ts, user.id, slug);
        st.revokePerms.run(user.id, slug);
        db.exec('COMMIT');
      } catch (e) {
        try { db.exec('ROLLBACK'); } catch { /* تجاهل */ }
        throw e;
      }
    }
    log(user.id, slug, on ? 'enable' : 'disable', 'ok', null, 0);
    return send(res, 200, { ok: true, addon: slug, enabled: on });
  }

  // ---------- Tool Registry و Tool Router ----------
  // الأداة تُسمّى addon:<slug>. المرحلة الثانية فيها أداة واحدة لكل مزود: الدردشة
  function listTools(userId) {
    const enabled = new Set(st.listForUser.all(userId).filter((r) => r.enabled).map((r) => r.addon_slug));
    return ADAPTERS.filter((a) => enabled.has(a.slug)).map((a) => ({
      name: `addon:${a.slug}`, addon: a.slug, label: a.name, tool: TOOL,
    }));
  }

  // يرمي خطأ addon إن لم تتحقق شروط التشغيل: التفعيل، والربط الصالح، والصلاحية، والمفتاح المشفّر
  function resolveTool(userId, slug) {
    const adapter = bySlug(slug);
    if (!adapter) throw addonError('الإضافة غير معروفة.', 400);
    const r = st.enabledRoute.get(userId, slug);
    if (!r || !r.enabled) throw addonError('الإضافة غير مفعّلة. فعّلها من قائمة الإضافات أولاً.', 403);
    if (r.status !== 'verified') throw addonError('مفتاح هذه الإضافة لم يعد صالحاً. أعد اختباره.', 403);
    const perm = st.perm.get(userId, slug, TOOL);
    if (!perm || !perm.allowed) throw addonError('هذه الإضافة لا تملك صلاحية الدردشة.', 403);
    return { adapter, ciphertext: r.ciphertext };
  }

  // يستدعي المزود بمفتاح المستخدم نفسه، ويرجّع stream بنفس شكل بقية محركات المحادثة
  async function openAddonStream(userId, slug, messages, maxTokens, signal, model) {
    if (!sealer) throw addonError('الإضافات غير مفعّلة على السيرفر حالياً.', 503);
    const { adapter, ciphertext } = resolveTool(userId, slug);
    if (!adapter.chat) throw addonError('هذه الأداة لا تدعم المحادثة بعد. اربطها للتأكد من المفتاح فقط.', 400);
    let apiKey;
    try { apiKey = sealer.open(ciphertext, aadFor(userId, slug)); }
    catch { throw addonError('تعذّر فك تشفير المفتاح. اربطه من جديد.', 500); }
    const opts = {
      model: typeof model === 'string' && MODEL_RE.test(model) ? model : undefined,
      maxTokens: Math.max(1, Math.min(Math.floor(Number(maxTokens)) || 1000, 4000)),
    };
    const t0 = Date.now();
    let text;
    try {
      text = await adapter.chat(apiKey, messages, opts, fetchImpl);
    } catch (e) {
      const code = e && e.code ? e.code : 'upstream';
      log(userId, slug, 'chat', 'failed', code, Date.now() - t0);
      throw addonError(UPSTREAM_MSG[code] || 'المزود رفض الطلب. جرّب لاحقاً.', 502);
    } finally {
      apiKey = null;
    }
    if (signal && signal.aborted) throw addonError('أُلغي الطلب.', 499);
    log(userId, slug, 'chat', 'ok', null, Date.now() - t0);
    try { st.usage.run(userId, slug, 1, now()); } catch { /* تجاهل */ }
    return { engine: 'addon:' + slug, body: singleSseChunk(text) };
  }

  // يرجّع null لو المسار ليس تبع الإضافات (الراوتر الرئيسي يكمّل)
  async function routes(req, res, user, p, m) {
    if (!p.startsWith('/api/addons')) return null;
    try {
      if (m === 'GET' && p === '/api/addons/catalog') {
        return send(res, 200, {
          enabled: Boolean(sealer),
          providers: ADAPTERS.map((a) => ({ slug: a.slug, name: a.name, category: a.category, oauth: Boolean(a.oauth) })),
        });
      }
      if (m === 'GET' && p === '/api/addons/integrations') {
        return send(res, 200, { integrations: st.listForUser.all(user.id).map(publicRow) });
      }
      if (m === 'GET' && p === '/api/addons/tools') return send(res, 200, { tools: listTools(user.id) });
      const os = /^\/api\/addons\/oauth\/([a-z0-9_-]{1,30})\/start$/.exec(p);
      if (os && m === 'GET') {
        if (!sealer) return disabled(res);
        const u = oauth.startUrl(user.id, os[1]);
        if (!u) return fail(res, 503, 'oauth_off', 'ربط هذه الأداة غير مفعّل على السيرفر حالياً.');
        return send(res, 200, { url: u });
      }
      if (m === 'POST' && p === '/api/addons/integrations') return await connect(req, res, user);
      const en = /^\/api\/addons\/enabled\/([a-z0-9_-]{1,30})$/.exec(p);
      if (en && m === 'PUT') return await setEnabled(req, res, user, en[1]);
      const mm = /^\/api\/addons\/integrations\/(\d+)(\/test)?$/.exec(p);
      if (mm) {
        const id = Number(mm[1]);
        if (m === 'POST' && mm[2]) return await retest(res, user, id);
        if (m === 'DELETE' && !mm[2]) return remove(res, user, id);
      }
      return fail(res, 404, 'not_found', 'المسار غير موجود.');
    } catch (e) {
      if (e && e.addon) return fail(res, e.httpStatus || 400, 'addon', e.message);
      if (e && e.status) return fail(res, e.status, 'bad_request', 'طلب غير صالح.');
      console.error('addons error:', e && e.name);
      return fail(res, 500, 'addons', 'حصل خطأ في الإضافات. جرّب مرة ثانية.');
    }
  }

  // يستدعيها الخادم بدون جلسة: المزود يعيد المستخدم هنا بعد الموافقة
  async function oauthCallback(req, res, url) {
    const dest = (deps.publicBase || '').replace(/\/+$/, '') + '/?addons=';
    let result;
    try {
      const err = url.searchParams.get('error');
      if (!sealer) result = { ok: false, code: 'config' };
      else if (err) result = { ok: false, code: 'denied' };
      else result = await oauth.finish(url.searchParams.get('state') || '', url.searchParams.get('code') || '');
    } catch (e) {
      console.error('addons oauth error:', e && e.name);
      result = { ok: false, code: 'upstream' };
    }
    const q = result.ok ? 'ok:' + result.slug : 'fail:' + result.code;
    res.writeHead(302, { Location: dest + encodeURIComponent(q) });
    res.end();
  }

  return { routes, oauthCallback, openAddonStream, listTools, enabled: Boolean(sealer) };
}

module.exports = { init, MODEL_RE };
