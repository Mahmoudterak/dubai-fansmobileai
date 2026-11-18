'use strict';
// OpenRouter: نقطة معلومات المفتاح للفحص، والمحادثة عبر chat/completions
const { probe } = require('./http.js');
const { makeOpenAICompatChat } = require('./openai-compat.js');
const DEFAULT_MODEL = 'openai/gpt-4o-mini'; // غير مختبر فعلياً بعد
module.exports = {
  slug: 'openrouter', name: 'OpenRouter', category: 'chat', defaultModel: DEFAULT_MODEL,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://openrouter.ai/api/v1/auth/key', { Authorization: `Bearer ${apiKey}` }),
  chat: makeOpenAICompatChat({ url: 'https://openrouter.ai/api/v1/chat/completions', defaultModel: DEFAULT_MODEL }),
};
