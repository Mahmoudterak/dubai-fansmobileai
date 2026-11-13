'use strict';
// تقارير أخطاء السيرفر إلى Sentry بدون حزم إضافية: نرسل الحدث مباشرة عبر Envelope API.
// مفعّل فقط إذا وُجد SENTRY_DSN في البيئة. بدون DSN لا يحدث شيء.
// لا نرسل نص الرسائل ولا بيانات المستخدمين، فقط نوع الخطأ ورسالته وتتبّع الأكواد والمسار المختصر.

const RAW = String(process.env.SENTRY_DSN || '').trim();
const ENV_NAME = String(process.env.SENTRY_ENVIRONMENT || 'production');

let parsed = null;
try {
  if (RAW) {
    const u = new URL(RAW);
    parsed = {
      key: u.username,
      host: u.host,
      projectId: u.pathname.replace(/^\//, ''),
      endpoint: `${u.protocol}//${u.host}/api/${u.pathname.replace(/^\//, '')}/envelope/`,
    };
  }
} catch (_) { parsed = null; }

const ON = Boolean(parsed) && process.env.SENTRY_ENABLED !== '0';
const SENT = new Map(); // تخفيف: نفس الرسالة لا تُرسل أكثر من مرة في الدقيقة
const WINDOW = 60000;

function sanitizePath(u) {
  // نزيل الاستعلام (قد يحمل بيانات) ونستبدل الأرقام الطويلة والمعرفات
  return String(u || '').split('?')[0].replace(/\/\d+/g, '/:id').slice(0, 200);
}

function frames(err) {
  const lines = String((err && err.stack) || '').split('\n').slice(1, 25);
  return lines.map((l) => {
    const m = /at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(l.trim());
    if (!m) return null;
    return { function: m[1] || '<anonymous>', filename: m[2], lineno: Number(m[3]), colno: Number(m[4]), in_app: !m[2].includes('node_modules') };
  }).filter(Boolean).reverse();
}

function captureException(err, ctx) {
  if (!ON) return;
  const e = err instanceof Error ? err : new Error(String(err));
  const key = (e.name || 'Error') + ':' + (e.message || '').slice(0, 120);
  const now = Date.now();
  const last = SENT.get(key);
  if (last && now - last < WINDOW) return;
  SENT.set(key, now);
  for (const [k, t] of SENT) if (now - t > WINDOW) SENT.delete(k);

  const eventId = require('crypto').randomUUID().replace(/-/g, '');
  const event = {
    event_id: eventId,
    timestamp: now / 1000,
    platform: 'node',
    level: 'error',
    environment: ENV_NAME,
    server_name: 'dfai-api',
    logger: 'dfai-api',
    tags: { service: 'dfai-api' },
    transaction: ctx && ctx.route ? sanitizePath(ctx.route) : undefined,
    request: ctx && ctx.method ? { method: ctx.method, url: sanitizePath(ctx.route) } : undefined,
    exception: { values: [{ type: e.name || 'Error', value: String(e.message || '').slice(0, 500), stacktrace: { frames: frames(e) } }] },
  };
  const header = JSON.stringify({ event_id: eventId, sent_at: new Date(now).toISOString(), dsn: RAW });
  const item = JSON.stringify({ type: 'event' });
  const body = header + '\n' + item + '\n' + JSON.stringify(event);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 4000);
  fetch(parsed.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=dfai-lite/1.0`,
    },
    body,
    signal: ctrl.signal,
  }).catch(() => {}).finally(() => clearTimeout(to));
}

module.exports = { captureException, enabled: () => ON };
