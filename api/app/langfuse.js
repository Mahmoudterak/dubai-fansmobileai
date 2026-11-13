'use strict';
// تصدير التتبع إلى Langfuse (مراقبة الأخطاء والتكلفة) — اختياري.
// يشتغل فقط لو ضُبطت: LANGFUSE_BASE_URL و LANGFUSE_PUBLIC_KEY و LANGFUSE_SECRET_KEY.
// الإرسال عبر OpenTelemetry (OTLP/HTTP JSON) إلى /api/public/otel/v1/traces،
// لأن واجهة الإدخال القديمة /api/public/ingestion توقفت عن قبول trace-create.
// الخصوصية: يرسل بيانات وصفية فقط (المسار، الحالة، المحرك، الزمن، الأحجام، اسم النموذج).
// ما يرسلش نص الرسالة ولا الرد، ومعرّف المستخدم يتحوّل لـ hash.
// أي فشل هنا ما يوقّف الرد أبداً، والإرسال بالدفعات وبمهلة 5 ثواني.

const crypto = require('node:crypto');

const HOST = String(process.env.LANGFUSE_BASE_URL || '').trim().replace(/\/$/, '');
const PUB = String(process.env.LANGFUSE_PUBLIC_KEY || '').trim();
const SEC = String(process.env.LANGFUSE_SECRET_KEY || '').trim();
const ON = Boolean(HOST && PUB && SEC) && process.env.LANGFUSE_ENABLED !== '0';
const AUTH = ON ? 'Basic ' + Buffer.from(PUB + ':' + SEC).toString('base64') : '';
console.log(ON ? `langfuse: enabled (host ${HOST}, OTLP)` : 'langfuse: disabled (LANGFUSE_* keys missing or LANGFUSE_ENABLED=0)');

const MAX_QUEUE = 500;
const BATCH = 50;
const queue = [];
let timer = null;
let failures = 0;

const hash = (v) => (v === undefined || v === null || v === '' ? ''
  : crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 16));

function modelFrom(note) {
  const m = /cfm:(\S+)/.exec(String(note || ''));
  return m ? m[1] : '';
}

const str = (v) => ({ stringValue: String(v) });
const attr = (key, value) => ({ key, value: str(value) });

// يحوّل طلب محادثة واحد إلى span OTLP بنوع generation
function toSpan(tr) {
  const now = Date.now();
  const ms = Math.max(0, now - (tr.t0 || now));
  const startNs = BigInt(now - ms) * 1000000n;
  const endNs = BigInt(now) * 1000000n;
  // أخطاء حقيقية فقط. 'aborted' = المستخدم أوقف الرد بنفسه، مش خطأ
  const isErr = ['error', 'upstream', 'stream_error'].includes(tr.status || '');
  const route = tr.route || 'chat';
  const engine = tr.engine || 'none';
  const model = modelFrom(tr.note) || engine;
  const attributes = [
    attr('langfuse.observation.type', 'generation'),
    attr('langfuse.trace.name', 'chat:' + route),
    attr('gen_ai.request.model', model),
    attr('langfuse.observation.usage_details', JSON.stringify({ input: tr.in_chars || 0, output: tr.out_chars || 0 })),
    attr('langfuse.observation.metadata.unit', 'CHARACTERS'),
    attr('langfuse.observation.metadata.tool', tr.tool || ''),
    attr('langfuse.observation.metadata.ms', ms),
    attr('langfuse.observation.metadata.rag', tr.rag || 0),
    attr('langfuse.observation.metadata.status', tr.status || 'ok'),
    attr('langfuse.observation.metadata.engine', engine),
    // لو خطأ: ما نرسلش note لأنه قد يحمل رسالة الخطأ الخام
    attr('langfuse.observation.metadata.note', isErr ? '' : String(tr.note || '').slice(0, 160)),
    { key: 'langfuse.trace.tags', value: { arrayValue: { values: [route, engine, tr.status || 'ok'].map(str) } } },
  ];
  const uid = hash(tr.user_id);
  if (uid) attributes.push(attr('langfuse.user.id', uid));
  if (isErr) attributes.push(attr('langfuse.observation.level', 'ERROR'));
  return {
    traceId: crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
    name: 'llm',
    kind: 1,
    startTimeUnixNano: startNs.toString(),
    endTimeUnixNano: endNs.toString(),
    attributes,
    status: isErr ? { code: 2, message: 'error' } : { code: 1 },
  };
}

function flush() {
  timer = null;
  if (!queue.length) return;
  const spans = queue.splice(0, BATCH);
  const body = {
    resourceSpans: [{
      resource: { attributes: [attr('service.name', 'dfai-api')] },
      scopeSpans: [{ scope: { name: 'dfai-chat' }, spans }],
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
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + text.slice(0, 200));
      // OTLP قد يرجّع 200 مع partialSuccess.rejectedSpans: نسجّل الرفض صراحة
      let rejected = 0;
      try { rejected = Number(JSON.parse(text).partialSuccess?.rejectedSpans) || 0; } catch (_) {}
      if (rejected) throw new Error(`${rejected} of ${spans.length} spans rejected: ${text.slice(0, 200)}`);
      failures = 0;
      console.log(`langfuse export ok: ${spans.length} spans sent (HTTP ${r.status})`);
    })
    .catch((e) => {
      failures++;
      console.error(`langfuse export failed: ${e.message} (batch ${spans.length} dropped, failures so far ${failures})`);
    })
    .finally(() => clearTimeout(to));
  if (queue.length) timer = setTimeout(flush, 0);
}

function schedule() {
  if (queue.length >= BATCH) { if (!timer) timer = setTimeout(flush, 0); return; }
  if (!timer) { timer = setTimeout(flush, 2000); if (timer.unref) timer.unref(); }
}

// يسجّل طلب محادثة واحد كـ span. نفس الحقول التي كانت في traces.js
function trace(tr) {
  if (!ON || !tr) return;
  try {
    queue.push(toSpan(tr));
    while (queue.length > MAX_QUEUE) queue.shift();
    schedule();
  } catch (e) { /* ما نوقفش الرد بسبب التتبع */ }
}

function enabled() { return ON; }

module.exports = { trace, enabled, modelFrom };
