'use strict';
// WhatsApp Business Platform (Meta Graph API): توكن وصول يملكه المستخدم (System User token).
// الفحص يقرأ هوية التوكن فقط ولا يرسل رسائل. غير مختبر مع توكن حقيقي بعد.
const { probe } = require('./http.js');
module.exports = {
  slug: 'whatsapp', name: 'WhatsApp Business Platform', category: 'communication', defaultModel: null,
  test: (apiKey, fetchImpl) => probe(fetchImpl, 'https://graph.facebook.com/v21.0/me?fields=id', { Authorization: 'Bearer ' + apiKey }),
};
