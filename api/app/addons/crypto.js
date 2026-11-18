'use strict';
// تشفير مفاتيح المزودين الخارجيين (AES-256-GCM).
// المفتاح الرئيسي من متغير البيئة ADDONS_MASTER_KEY فقط: 32 بايت بصيغة hex (64 حرف) أو base64 (44 حرف).
// إن لم يكن موجوداً أو غير صالح تبقى الإضافات معطّلة، ولا نولّد مفتاحاً تلقائياً ولا نحفظ شيئاً بدون تشفير.
// الـ AAD يربط كل سجل بـ user_id واسم الإضافة، فلا يمكن نقل سر مشفّر من مستخدم لآخر وفكّه.

const crypto = require('node:crypto');

function parseMasterKey(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  let buf = null;
  if (/^[0-9a-fA-F]{64}$/.test(s)) buf = Buffer.from(s, 'hex');
  else if (/^[A-Za-z0-9+/]{43}=?$/.test(s)) buf = Buffer.from(s, 'base64');
  return buf && buf.length === 32 ? buf : null;
}

// يرجّع null لو المفتاح الرئيسي غير صالح (الميزة تكون معطّلة)
function createSealer(masterKeyRaw) {
  const key = parseMasterKey(masterKeyRaw);
  if (!key) return null;
  return {
    seal(plain, aad) {
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', key, iv);
      c.setAAD(Buffer.from(String(aad), 'utf8'));
      const ct = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
      return 'v1:' + Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64');
    },
    open(stored, aad) {
      const s = String(stored || '');
      if (!s.startsWith('v1:')) throw new Error('bad_format');
      const b = Buffer.from(s.slice(3), 'base64');
      const d = crypto.createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
      d.setAAD(Buffer.from(String(aad), 'utf8'));
      d.setAuthTag(b.subarray(12, 28));
      return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
    },
  };
}

module.exports = { createSealer, parseMasterKey };
