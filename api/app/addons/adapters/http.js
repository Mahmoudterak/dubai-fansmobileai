'use strict';
// فحص اتصال حقيقي بالمزود: طلب GET لنقطة قراءة بسيطة بالمفتاح، ونقرأ الحالة فقط.
// لا نرجّع نص رد المزود للمستخدم ولا نسجّله، حتى لا يتسرب شيء من المفتاح.

const TIMEOUT_MS = 10000;
const CHAT_TIMEOUT_MS = 60000;

function providerError(code, upstreamStatus) {
  const e = new Error(code);
  e.code = code;
  if (upstreamStatus) e.upstreamStatus = upstreamStatus;
  return e;
}

const codeForStatus = (s) => (s === 401 || s === 403 ? 'invalid_key' : s === 429 ? 'rate_limited' : 'upstream');

async function probe(fetchImpl, url, headers) {
  let res;
  try {
    res = await fetchImpl(url, { method: 'GET', headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return { ok: false, code: 'network', message: 'تعذّر الوصول للمزود الآن. جرّب بعد شوية.' };
  }
  try { await res.body?.cancel(); } catch { /* تجاهل */ }
  if (res.status === 200) return { ok: true, code: null, message: 'تم الاتصال بالمزود بنجاح.' };
  if (res.status === 401 || res.status === 403) return { ok: false, code: 'invalid_key', message: 'المفتاح مرفوض من المزود. تأكد أنه صحيح وفعّال.' };
  if (res.status === 429) return { ok: false, code: 'rate_limited', message: 'المزود رجّع "كثرة طلبات". جرّب بعد دقيقة.' };
  return { ok: false, code: 'upstream', message: `المزود رجّع خطأ ${res.status}. جرّب لاحقاً.` };
}

// طلب POST بجسم JSON لنداء محادثة. يرمي خطأ بكود فقط، بدون نص رد المزود
async function postJson(fetchImpl, url, headers, body) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
  } catch {
    throw providerError('network');
  }
  if (!res.ok) {
    try { await res.body?.cancel(); } catch { /* تجاهل */ }
    throw providerError(codeForStatus(res.status), res.status);
  }
  try { return await res.json(); } catch { throw providerError('upstream'); }
}

module.exports = { probe, postJson, providerError, TIMEOUT_MS };
