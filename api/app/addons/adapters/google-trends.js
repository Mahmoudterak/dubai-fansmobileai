'use strict';
// Google Trends عبر SerpApi: لا يوجد API رسمي من Google للاتجاهات، فالمستخدم يربط مفتاح SerpApi الخاص به.
// تحذير: SerpApi يأخذ المفتاح في الرابط (api_key=). غير مختبر مع مفتاح حقيقي بعد.
const { probe } = require('./http.js');
module.exports = {
  slug: 'google-trends', name: 'Google Trends (SerpApi)', category: 'marketing', defaultModel: null,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://serpapi.com/account.json?api_key=' + encodeURIComponent(apiKey), {}),
};
