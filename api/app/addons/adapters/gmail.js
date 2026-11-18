'use strict';
// Gmail (Google): OAuth فقط. الربط يتم عبر تسجيل دخول المستخدم بحسابه، ونحفظ refresh token مشفّراً.
// الفحص يقرأ ملف الحساب (users/me/profile) بدون قراءة أي بريد.
const { probe } = require('./http.js');
const { accessTokenFor } = require('./oauth-token.js');
module.exports = {
  slug: 'gmail', name: 'Gmail', category: 'communication', defaultModel: null, oauth: true,
  test: async (refreshToken, fetchImpl, creds) => {
    const t = await accessTokenFor('gmail', refreshToken, creds, fetchImpl);
    if (t.error) return { ok: false, code: t.error === 'invalid_key' ? 'invalid_key' : t.error, message: 'تعذّر تأكيد ربط Gmail. سجّل الدخول من جديد.' };
    const r = await probe(fetchImpl, 'https://gmail.googleapis.com/gmail/v1/users/me/profile', { Authorization: 'Bearer ' + t.accessToken });
    return { ...r, secret: t.secret };
  },
};
