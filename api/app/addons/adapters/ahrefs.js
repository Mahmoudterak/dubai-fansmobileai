'use strict';
// Ahrefs API v3: رمز API يملكه المستخدم في الهيدر Authorization. غير مختبر مع مفتاح حقيقي بعد.
const { probe } = require('./http.js');
module.exports = {
  slug: 'ahrefs', name: 'Ahrefs', category: 'marketing', defaultModel: null,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.ahrefs.com/v3/subscription-info', { Authorization: `Bearer ${apiKey}` }),
};
