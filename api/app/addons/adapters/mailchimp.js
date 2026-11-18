'use strict';
// Mailchimp: مفتاح API يملكه المستخدم، وينتهي بمنطقة الخادم (مثل -us21). المنطقة تحدد النطاق الذي نفحصه.
// غير مختبر مع مفتاح حقيقي بعد.
const { probe } = require('./http.js');
const DC_RE = /-([a-z]{2}\d{1,3})$/;
module.exports = {
  slug: 'mailchimp', name: 'Mailchimp', category: 'marketing', defaultModel: null,
  test: (apiKey, fetchImpl) => {
    const m = DC_RE.exec(apiKey);
    if (!m) return { ok: false, code: 'invalid_key', message: 'مفتاح Mailchimp لازم ينتهي بالمنطقة، مثل -us21.' };
    const auth = 'Basic ' + Buffer.from('anystring:' + apiKey).toString('base64');
    return probe(fetchImpl, `https://${m[1]}.api.mailchimp.com/3.0/ping`, { Authorization: auth });
  },
};
