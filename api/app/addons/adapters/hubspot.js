'use strict';
// HubSpot: رمز التطبيق الخاص (Private App Token) يملكه المستخدم، يُرسل في Authorization. غير مختبر مع رمز حقيقي بعد.
const { probe } = require('./http.js');
module.exports = {
  slug: 'hubspot', name: 'HubSpot', category: 'marketing', defaultModel: null,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.hubapi.com/account-info/v3/details', { Authorization: `Bearer ${apiKey}` }),
};
