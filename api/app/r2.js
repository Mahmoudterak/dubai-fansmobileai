'use strict';
// رفع الملفات إلى Cloudflare R2 (متوافق مع S3) بدون مكتبات خارجية، بتوقيع AWS SigV4.
// الإعدادات من البيئة: R2_ENDPOINT و R2_BUCKET و R2_ACCESS_KEY_ID و R2_SECRET_ACCESS_KEY.
// لو الإعدادات ناقصة، الدالة لا تفعل شيئاً (يبقى التخزين المحلي كما هو).
const crypto = require('node:crypto');

const ENDPOINT = String(process.env.R2_ENDPOINT || '').trim().replace(/\/$/, '');
const BUCKET = String(process.env.R2_BUCKET || '').trim();
const KEY_ID = String(process.env.R2_ACCESS_KEY_ID || '').trim();
const SECRET = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
const ON = Boolean(ENDPOINT && BUCKET && KEY_ID && SECRET);
console.log(ON ? `r2: enabled (bucket ${BUCKET})` : 'r2: disabled (R2_* missing)');

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

// ترميز مفتاح الملف لمسار URL (كل جزء بعد / يُرمَّز)، مع تعديل ما يتجاهله encodeURIComponent
function encodeKey(key) {
  return key.split('/')
    .map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()))
    .join('/');
}

// يرفع ملفاً إلى R2 ويرجع true عند النجاح، ويرمي خطأ عند الفشل
async function put(key, body, contentType) {
  if (!ON) return false;
  const url = new URL(`${ENDPOINT}/${BUCKET}/${encodeKey(key)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const headers = {
    'content-type': contentType,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonicalHeaders = names.map((n) => `${n}:${String(headers[n]).trim()}\n`).join('');
  const canonicalRequest = ['PUT', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac('AWS4' + SECRET, dateStamp);
  const kSigning = hmac(hmac(hmac(kDate, 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const auth = `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': contentType, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Authorization: auth },
    body,
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error('r2 put ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return true;
}

// يحذف ملفاً من R2. الحذف لا يفشل إذا كان الملف غير موجود (404 مقبول).
async function del(key) {
  if (!ON) return false;
  const url = new URL(`${ENDPOINT}/${BUCKET}/${encodeKey(key)}`);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex('');
  const headers = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonicalHeaders = names.map((n) => `${n}:${String(headers[n]).trim()}\n`).join('');
  const canonicalRequest = ['DELETE', url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac('AWS4' + SECRET, dateStamp), 'auto'), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  const auth = `AWS4-HMAC-SHA256 Credential=${KEY_ID}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const r = await fetch(url, {
    method: 'DELETE',
    headers: { 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Authorization: auth },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok && r.status !== 404) throw new Error('r2 delete ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return true;
}

module.exports = { put, del, enabled: () => ON };
