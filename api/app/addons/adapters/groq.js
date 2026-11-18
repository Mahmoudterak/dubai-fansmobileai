'use strict';
// Groq (واجهة متوافقة مع OpenAI): فحص بقراءة قائمة النماذج، والمحادثة عبر chat/completions
const { probe } = require('./http.js');
const { makeOpenAICompatChat } = require('./openai-compat.js');
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'; // غير مختبر فعلياً بعد
module.exports = {
  slug: 'groq', name: 'Groq', category: 'chat', defaultModel: DEFAULT_MODEL,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.groq.com/openai/v1/models', { Authorization: `Bearer ${apiKey}` }),
  chat: makeOpenAICompatChat({ url: 'https://api.groq.com/openai/v1/chat/completions', defaultModel: DEFAULT_MODEL }),
};
