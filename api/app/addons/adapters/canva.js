'use strict';
// Canva: OAuth فقط (Canva Connect). الربط عبر تسجيل دخول المستخدم، ونحفظ refresh token مشفّراً.
// الفحص يقرأ هوية المستخدم فقط.
const { probe } = require('./http.js');
const { accessTokenFor } = require('./oauth-token.js');
module.exports = {
  slug: 'canva', name: 'Canva', category: 'design', defaultModel: null, oauth: true,
  test: async (refreshToken, fetchImpl, creds) => {
    const t = await accessTokenFor('canva', refreshToken, creds, fetchImpl);
    if (t.error) return { ok: false, code: t.error, message: 'تعذّر تأكيد ربط Canva. سجّل الدخول من جديد.' };
    const r = await probe(fetchImpl, 'https://api.canva.com/rest/v1/users/me', { Authorization: 'Bearer ' + t.accessToken });
    return { ...r, secret: t.secret };
  },
};
