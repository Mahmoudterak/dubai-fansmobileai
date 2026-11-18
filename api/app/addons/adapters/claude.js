'use strict';
// Anthropic Claude: فحص بقراءة قائمة النماذج، والمحادثة عبر Messages API (النظام يُرسل في حقل system)
const { probe, postJson, providerError } = require('./http.js');
const DEFAULT_MODEL = 'claude-haiku-4-5'; // غير مختبر فعلياً بعد
module.exports = {
  slug: 'claude', name: 'Anthropic Claude', category: 'chat', defaultModel: DEFAULT_MODEL,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.anthropic.com/v1/models?limit=1', { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }),
  chat: async (apiKey, messages, opts, fetchImpl) => {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    let conv = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));
    while (conv.length && conv[0].role !== 'user') conv = conv.slice(1); // يجب أن تبدأ المحادثة برسالة مستخدم
    const j = await postJson(fetchImpl, 'https://api.anthropic.com/v1/messages',
      { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      { model: opts.model || DEFAULT_MODEL, max_tokens: opts.maxTokens, system, messages: conv });
    const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!text) throw providerError('empty');
    return text;
  },
};
