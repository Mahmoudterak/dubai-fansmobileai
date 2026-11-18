'use strict';
// Google Gemini: المفتاح في الهيدر x-goog-api-key (وليس في الرابط حتى لا يظهر في السجلات)
const { probe, postJson, providerError } = require('./http.js');
const DEFAULT_MODEL = 'gemini-2.0-flash'; // غير مختبر فعلياً بعد
module.exports = {
  slug: 'gemini', name: 'Google Gemini', category: 'chat', defaultModel: DEFAULT_MODEL,
  // Google يرجّع 400 (لا 401) لمفتاح غير صالح، فنحوّله إلى invalid_key. تأكّد من ذلك بنداء حقيقي بمفتاح وهمي
  test: async (apiKey, fetchImpl) => {
    const r = await probe(fetchImpl, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { 'x-goog-api-key': apiKey });
    if (!r.ok && r.status === 400) return { ok: false, code: 'invalid_key', message: 'المفتاح مرفوض من المزود. تأكد أنه صحيح وفعّال.' };
    return r;
  },
  chat: async (apiKey, messages, opts, fetchImpl) => {
    const model = opts.model || DEFAULT_MODEL;
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }],
    }));
    const body = { contents, generationConfig: { maxOutputTokens: opts.maxTokens } };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const j = await postJson(fetchImpl, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': apiKey }, body);
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const text = parts.map((p) => p.text || '').join('');
    if (!text) throw providerError('empty');
    return text;
  },
};
