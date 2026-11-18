'use strict';
// ربط OAuth لـ Gmail وCanva: المستخدم يوافق على حسابه، والسيرفر يستبدل الرمز بـ refresh token ويفحصه
// ثم يحفظه مشفّراً كأي مفتاح. مفاتيح التطبيق (client id/secret) من متغيرات البيئة فقط.
// الحالة (state) لمرة واحدة، صلاحيتها 10 دقائق، ومرتبطة بالمستخدم والمزود. Canva يستخدم PKCE.
const crypto = require('node:crypto');

const STATE_TTL_MS = 10 * 60 * 1000;

const PROVIDERS = {
  gmail: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    extra: { access_type: 'offline', prompt: 'consent' },
    pkce: false,
  },
  canva: {
    authUrl: 'https://www.canva.com/api/oauth/authorize',
    scope: 'profile:read design:meta:read design:content:read',
    extra: {},
    pkce: true,
  },
};

function initOauthSchema(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS addon_oauth_states (
    state TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addon_slug TEXT NOT NULL,
    code_verifier TEXT,
    created_at INTEGER NOT NULL
  )`);
}

const b64url = (buf) => buf.toString('base64url');

// deps: { db, now, creds: { gmail:{id,secret}, canva:{id,secret} }, publicBase, redirectPath, fetch, saveSecret(userId, slug, secret, ts), verify(slug, secret) }
function createOauth(deps) {
  const { db, now, creds, publicBase, saveSecret, verify } = deps;
  const fetchImpl = (...a) => (deps.fetch || globalThis.fetch)(...a);
  const redirectUri = () => `${publicBase.replace(/\/+$/, '')}/api/addons/oauth/callback`;
  const configured = (slug) => Boolean(PROVIDERS[slug] && creds[slug] && creds[slug].id && creds[slug].secret && publicBase);

  const st = {
    put: db.prepare('INSERT INTO addon_oauth_states (state, user_id, addon_slug, code_verifier, created_at) VALUES (?, ?, ?, ?, ?)'),
    take: db.prepare('SELECT state, user_id, addon_slug, code_verifier, created_at FROM addon_oauth_states WHERE state = ?'),
    del: db.prepare('DELETE FROM addon_oauth_states WHERE state = ?'),
    purge: db.prepare('DELETE FROM addon_oauth_states WHERE created_at < ?'),
  };

  // يرجّع رابط الموافقة، أو null إن لم تكن إعدادات OAuth موجودة
  function startUrl(userId, slug) {
    if (!configured(slug)) return null;
    const cfg = PROVIDERS[slug];
    const ts = now();
    st.purge.run(ts - STATE_TTL_MS);
    const state = b64url(crypto.randomBytes(24));
    const verifier = cfg.pkce ? b64url(crypto.randomBytes(32)) : null;
    st.put.run(state, userId, slug, verifier, ts);
    const u = new URL(cfg.authUrl);
    u.searchParams.set('client_id', creds[slug].id);
    u.searchParams.set('redirect_uri', redirectUri());
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', cfg.scope);
    u.searchParams.set('state', state);
    if (verifier) {
      u.searchParams.set('code_challenge', b64url(crypto.createHash('sha256').update(verifier).digest()));
      u.searchParams.set('code_challenge_method', 'S256');
    }
    for (const [k, v] of Object.entries(cfg.extra)) u.searchParams.set(k, v);
    return u.toString();
  }

  // يستبدل الرمز بـ refresh token ثم يفحصه ويحفظه. يرجّع { ok, slug, code } للتوجيه
  async function finish(state, code) {
    const row = st.take.get(state);
    if (row) st.del.run(state);
    if (!row || now() - row.created_at > STATE_TTL_MS) return { ok: false, code: 'state' };
    if (!code || !configured(row.addon_slug)) return { ok: false, code: 'config', slug: row.addon_slug };
    const cfg = PROVIDERS[row.addon_slug];
    const form = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() });
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (row.addon_slug === 'canva') {
      headers.Authorization = 'Basic ' + Buffer.from(`${creds.canva.id}:${creds.canva.secret}`).toString('base64');
      form.set('code_verifier', row.code_verifier);
    } else {
      form.set('client_id', creds[row.addon_slug].id);
      form.set('client_secret', creds[row.addon_slug].secret);
    }
    const tokenUrl = row.addon_slug === 'canva' ? 'https://api.canva.com/rest/v1/oauth/token' : 'https://oauth2.googleapis.com/token';
    let j = null;
    try {
      const res = await fetchImpl(tokenUrl, { method: 'POST', headers, body: form.toString(), signal: AbortSignal.timeout(10000) });
      if (res.status === 200) j = await res.json();
    } catch { j = null; }
    if (!cfg || !j || typeof j.refresh_token !== 'string') return { ok: false, code: 'exchange', slug: row.addon_slug };

    const r = await verify(row.addon_slug, j.refresh_token);
    if (!r || !r.ok) return { ok: false, code: (r && r.code) || 'verify', slug: row.addon_slug };
    saveSecret(row.user_id, row.addon_slug, r.secret || j.refresh_token, now());
    return { ok: true, slug: row.addon_slug, userId: row.user_id };
  }

  return { startUrl, finish, configured };
}

module.exports = { createOauth, initOauthSchema, PROVIDERS };
