'use strict';
// OpenAI: فحص بقراءة قائمة النماذج (لا تُستهلك منها توكنات)، والمحادثة عبر chat/completions
const { probe } = require('./http.js');
const { makeOpenAICompatChat } = require('./openai-compat.js');
const DEFAULT_MODEL = 'gpt-4o-mini'; // اسم النموذج الافتراضي غير مختبر فعلياً بعد
module.exports = {
  slug: 'openai', name: 'OpenAI', category: 'chat', defaultModel: DEFAULT_MODEL,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.openai.com/v1/models', { Authorization: `Bearer ${apiKey}` }),
  chat: makeOpenAICompatChat({ url: 'https://api.openai.com/v1/chat/completions', defaultModel: DEFAULT_MODEL }),
};
