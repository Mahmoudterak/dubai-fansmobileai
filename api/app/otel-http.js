'use strict';
// قياس زمن الاستجابة لطلبات الـAPI كـ OpenTelemetry spans (OTLP/HTTP JSON).
// يُرسل إلى Langfuse عبر /api/public/otel/v1/traces بنفس مفاتيح LANGFUSE_* الموجودة.
// يشتغل فقط عند ضبط المفاتيح. لا يُرسل نص الطلب ولا الرد ولا معرّف المستخدم.
// نستثني مسارات الإدارة (لوحة المراقبة تستعلم دورياً) حتى لا تملأ التتبعات.
// أي فشل هنا لا يوقف الرد أبداً.

const crypto = require('node:crypto');

const HOST = String(process.env.LANGFUSE_BASE_URL || '').trim().replace(/\/$/, '');
const PUB = String(process.env.LANGFUSE_PUBLIC_KEY || '').trim();
const SEC = String(process.env.LANGFUSE_SECRET_KEY || '').trim();
const ON = Boolean(HOST && PUB && SEC) && process.env.LANGFUSE_ENABLED !== '0' && process.env.OTEL_HTTP !== '0';
const AUTH = ON ? 'Basic ' + Buffer.from(PUB + ':' + SEC).toString('base64') : '';

const EXCLUDE = [/^\/api\/admin\//, /^\/api\/health/];
const MAX_QUEUE = 500;
const BATCH = 100;
const queue = [];
let timer = null;

const str = (v) => ({ stringValue: String(v) });
const int = (v) => ({ intValue: String(Math.trunc(v)) });
const attr = (key, value) => ({ key, value: typeof value === 'number' ? int(value) : str(value) });

// route بلا أرقام ولا استعلام: /api/x/123 -> /api/x/:id
function routeName(u) {
  return String(u || '').split('?')[0].replace(/\/\d+(?=\/|$)/g, '/:id').slice(0, 120);
}

// يُستدعى عند انتهاء كل طلب (res finish)
function record(method, url, status, startNs, endNs) {
  if (!ON) return;
  const path = String(url || '').split('?')[0];
  if (!path.startsWith('/api/') || EXCLUDE.some((rx) => rx.test(path))) return;
  if (queue.length >= MAX_QUEUE) return;
  const route = routeName(url);
  const isErr = status >= 500;
  queue.push({
    traceId: crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
    name: method + ' ' + route,
    kind: 2, // SERVER
    startTimeUnixNano: String(startNs),
    endTimeUnixNano: String(endNs),
    attributes: [
      attr('http.request.method', method),
      attr('http.route', route),
      attr('http.response.status_code', status),
      attr('langfuse.observation.metadata.duration_ms', Math.round(Number(BigInt(endNs) - BigInt(startNs)) / 1e6)),
      attr('langfuse.trace.name', 'http:' + route),
    ],
    status: isErr ? { code: 2, message: 'error' } : { code: 1 },
  });
  schedule();
}

function schedule() {
  if (queue.length >= BATCH) { if (!timer) timer = setTimeout(flush, 0); return; }
  if (!timer) { timer = setTimeout(flush, 5000); if (timer.unref) timer.unref(); }
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const spans = queue.splice(0, BATCH);
  const body = {
    resourceSpans: [{
      resource: { attributes: [attr('service.name', 'dfai-api')] },
      scopeSpans: [{ scope: { name: 'dfai-http' }, spans }],
    }],
  };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 5000);
  fetch(HOST + '/api/public/otel/v1/traces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  })
    .then(async (r) => {
      const text = await r.text();
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + text.slice(0, 120));
    })
    .catch((e) => console.error('otel-http export failed:', e.message))
    .finally(() => clearTimeout(to));
  if (queue.length) timer = setTimeout(flush, 0);
}

// يُربط بالـHTTP server: يقيس كل طلب من بدايته لنهايته
function middleware(req, res) {
  if (!ON) return;
  const t0 = process.hrtime.bigint();
  const method = req.method;
  const url = req.url;
  res.once('finish', () => {
    try {
      const t1 = process.hrtime.bigint();
      const endNs = BigInt(Date.now()) * 1000000n;
      const startNs = endNs - (t1 - t0);
      record(method, url, res.statusCode, startNs, endNs);
    } catch (e) {
      console.error('otel-http record failed:', e && e.message);
    }
  });
}

module.exports = { middleware, enabled: () => ON };
