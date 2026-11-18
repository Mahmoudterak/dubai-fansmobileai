'use strict';
// Semrush: مفتاح API يملكه المستخدم. فحص الاتصال بطلب إلى نقطة وحدات الـAPI.
// تحذير: واجهة Semrush تأخذ المفتاح في الرابط (key=) ولا تدعم الهيدر، فقد يظهر في سجلات الطرف الثالث.
// غير مختبر مع مفتاح حقيقي بعد.
const { probe } = require('./http.js');
module.exports = {
  slug: 'semrush', name: 'Semrush', category: 'marketing', defaultModel: null,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://api.semrush.com/?type=api_units&key=' + encodeURIComponent(apiKey), {}),
};
