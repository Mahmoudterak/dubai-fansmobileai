'use strict';
// لوحة Langfuse داخل ذكاء المنصة (للإدارة فقط).
// السيرفر يقرأ من Langfuse API بالمفاتيح، والمتصفح ما يشوفش المفاتيح أبداً.
// نستخدم Observations API v2 (لأن /api/public/traces القديم أصبح مُهملاً ويرجّع 410).
// نرجّع بيانات وصفية فقط (الاسم والزمن والمحرك والحالة والمعرّف)، بدون نص الرسائل ولا بيانات المستخدمين.
// الردود مخبّأة دقيقة واحدة لتقليل الطلبات على Langfuse.

const HOST = String(process.env.LANGFUSE_BASE_URL || '').trim().replace(/\/$/, '');
const PUB = String(process.env.LANGFUSE_PUBLIC_KEY || '').trim();
const SEC = String(process.env.LANGFUSE_SECRET_KEY || '').trim();
const ON = Boolean(HOST && PUB && SEC) && process.env.LANGFUSE_ENABLED !== '0';
const AUTH = ON ? 'Basic ' + Buffer.from(PUB + ':' + SEC).toString('base64') : '';

const TTL = 60000;
const PAGE = 100;
const MAX_PAGES = 5; // أقصى 500 سجل في الاستعلام الواحد
const GEN_NAME = 'llm'; // اسم الـ generation الذي نرسله في langfuse.js (كل طلب محادثة = generation واحد)
const cache = new Map();

// يرجّع صفوف الـ observations (generations) لطلبات المحادثة في الفترة (مع ترقيم بالـ cursor)
// ملاحظة: نصفّي بالاسم في الكود (ما نستخدمش filter في الاستعلام) لأن صيغة الفلتر غير مؤكدة.
async function fetchRows(fromIso) {
  const out = [];
  let cursor = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let url = `${HOST}/api/public/v2/observations?fields=core,basic,usage,trace_context&limit=${PAGE}` +
      `&fromStartTime=${encodeURIComponent(fromIso)}` +
      `&toStartTime=${encodeURIComponent(new Date().toISOString())}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { headers: { Authorization: AUTH }, signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const rows = Array.isArray(j.data) ? j.data : [];
      out.push(...rows.filter((r) => r && r.name === GEN_NAME));
      cursor = j.meta && j.meta.cursor ? j.meta.cursor : null;
      if (!cursor || !rows.length) break;
    } finally {
      clearTimeout(to);
    }
  }
  return { rows: out, truncated: Boolean(cursor) };
}

// اسم المسار: من trace_context لو موجود (الصيغة chat:<route>)، وإلا "chat"
function routeOf(row) {
  const tn = (row.traceName) || (row.trace_context && row.trace_context.name) || '';
  const m = /^chat:(.+)$/.exec(String(tn));
  return m ? m[1] : 'chat';
}

function latencyMs(row) {
  if (typeof row.latency === 'number') return Math.round(row.latency * 1000);
  const s = Date.parse(row.startTime), e = Date.parse(row.endTime);
  return Number.isFinite(s) && Number.isFinite(e) && e >= s ? e - s : null;
}

// ملخص آخر N ساعة: عدد الطلبات، الأخطاء، متوسط الزمن، التوزيع حسب المسار والمحرك، وآخر 30 طلب
async function summary(hours) {
  if (!ON) return { enabled: false };
  const key = String(hours);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const from = new Date(Date.now() - hours * 3600000).toISOString();
  let data;
  try {
    const { rows, truncated } = await fetchRows(from);
    const byRoute = {};
    const byEngine = {};
    let errors = 0;
    let latSum = 0;
    let latN = 0;
    for (const r of rows) {
      const route = routeOf(r);
      // المحرك: الموديل إذا كان مُحدداً (cfm)، وإلا "none" كما يُرسل langfuse.js
      const engine = r.providedModelName || r.model || 'none';
      const isErr = r.level === 'ERROR';
      if (isErr) errors++;
      byRoute[route] = (byRoute[route] || 0) + 1;
      byEngine[engine] = (byEngine[engine] || 0) + 1;
      const ms = latencyMs(r);
      if (ms !== null) { latSum += ms; latN++; }
    }
    const sorted = rows.slice().sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
    const recent = sorted.slice(0, 30).map((r) => ({
      id: r.traceId || r.id,
      timestamp: r.startTime,
      name: routeOf(r),
      tags: [r.providedModelName || r.model || '', r.level || ''].filter(Boolean).join(' · '),
      latencyMs: latencyMs(r),
    }));
    const toList = (obj) => Object.entries(obj).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
    data = {
      enabled: true,
      hours,
      total: rows.length,
      truncated,
      errors,
      avgLatencyMs: latN ? Math.round(latSum / latN) : null,
      byRoute: toList(byRoute),
      byEngine: toList(byEngine),
      recent,
      host: HOST,
    };
  } catch (e) {
    data = { enabled: true, hours, error: e.message, host: HOST };
  }
  cache.set(key, { at: Date.now(), data });
  return data;
}

module.exports = { summary, enabled: () => ON };
