'use strict';
// تبديل الـ refresh token بـ access token قصير العمر لمزودي OAuth (Gmail وCanva).
// المفاتيح العامة للتطبيق (client id/secret) تُقرأ من متغيرات البيئة على السيرفر فقط، ولا تُرسل للواجهة.
// يرجّع { accessToken, secret } حيث secret هو refresh token الجديد إن دوّره المزود، وإلا نفس القديم.

const TIMEOUT_MS = 10000;
const CONFIG = {
  gmail: { tokenUrl: 'https://oauth2.googleapis.com/token', auth: 'body' },
  canva: { tokenUrl: 'https://api.canva.com/rest/v1/oauth/token', auth: 'basic' },
};

async function accessTokenFor(slug, refreshToken, creds, fetchImpl) {
  const cfg = CONFIG[slug];
  if (!cfg || !creds || !creds.id || !creds.secret) return { error: 'oauth_off' };
  const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (cfg.auth === 'basic') headers.Authorization = 'Basic ' + Buffer.from(`${creds.id}:${creds.secret}`).toString('base64');
  else { form.set('client_id', creds.id); form.set('client_secret', creds.secret); }
  let res;
  try {
    res = await fetchImpl(cfg.tokenUrl, { method: 'POST', headers, body: form.toString(), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { error: 'network' };
  }
  if (res.status === 400 || res.status === 401) return { error: 'invalid_key' };
  if (res.status === 429) return { error: 'rate_limited' };
  if (res.status !== 200) return { error: 'upstream' };
  let j;
  try { j = await res.json(); } catch { return { error: 'upstream' }; }
  if (!j || typeof j.access_token !== 'string') return { error: 'upstream' };
  return { accessToken: j.access_token, secret: typeof j.refresh_token === 'string' ? j.refresh_token : refreshToken };
}

module.exports = { accessTokenFor };
