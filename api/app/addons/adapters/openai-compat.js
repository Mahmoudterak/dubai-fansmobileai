'use strict';
// مزودون بواجهة متوافقة مع OpenAI (chat/completions): OpenAI وGroq وOpenRouter
const { postJson, providerError } = require('./http.js');

function makeOpenAICompatChat({ url, defaultModel }) {
  return async function chat(apiKey, messages, opts, fetchImpl) {
    const j = await postJson(fetchImpl, url, { Authorization: `Bearer ${apiKey}` }, {
      model: (opts && opts.model) || defaultModel,
      messages,
      max_tokens: opts.maxTokens,
    });
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (typeof text !== 'string' || !text) throw providerError('empty');
    return text;
  };
}

module.exports = { makeOpenAICompatChat };
