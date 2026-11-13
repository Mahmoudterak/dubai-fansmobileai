// تقرير تسويقي أسبوعي من Google Analytics 4 مباشرة (بدون Claude).
// يقرأ: GA_SERVICE_ACCOUNT_JSON (محتوى ملف JSON لحساب الخدمة)، GA_PROPERTY_ID (رقم الخاصية).
// يكتب التقرير إلى ملف ثم ينشئه كـissue عبر gh إن وُجد GH_TOKEN.
// لا يعدّل أي ملف في المستودع.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const SA = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON || 'null');
const PROPERTY = String(process.env.GA_PROPERTY_ID || '').trim();
if (!SA || !SA.client_email || !SA.private_key) throw new Error('GA_SERVICE_ACCOUNT_JSON غير صالح أو فارغ');
if (!/^\d+$/.test(PROPERTY)) throw new Error('GA_PROPERTY_ID يجب أن يكون أرقاماً فقط');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: SA.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), SA.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`فشل الحصول على توكن: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data.access_token;
}

async function runReport(token, body) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`فشل تقرير GA4: ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

const dateRange = [{ startDate: '7daysAgo', endDate: 'today' }];
const rows = (r) => (r.rows || []).map((x) => ({
  dims: (x.dimensionValues || []).map((d) => d.value),
  mets: (x.metricValues || []).map((m) => Number(m.value)),
}));

const token = await accessToken();

const totals = rows(await runReport(token, {
  dateRanges: dateRange,
  metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
}))[0] || { mets: [0, 0, 0] };

const pages = rows(await runReport(token, {
  dateRanges: dateRange,
  dimensions: [{ name: 'pagePath' }],
  metrics: [{ name: 'screenPageViews' }],
  orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
  limit: 5,
}));

const sources = rows(await runReport(token, {
  dateRanges: dateRange,
  dimensions: [{ name: 'sessionSourceMedium' }],
  metrics: [{ name: 'sessions' }],
  orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  limit: 5,
}));

const today = new Date().toISOString().slice(0, 10);
const lines = [
  `# تقرير تسويقي أسبوعي (${today})`,
  '',
  'المدة: آخر 7 أيام',
  '',
  '## الإجماليات',
  `- الجلسات: ${totals.mets[0] ?? 0}`,
  `- المستخدمون النشطون: ${totals.mets[1] ?? 0}`,
  `- مشاهدات الصفحات: ${totals.mets[2] ?? 0}`,
  '',
  '## أهم 5 صفحات (حسب المشاهدات)',
  ...(pages.length ? pages.map((p, i) => `${i + 1}. ${p.dims[0]} — ${p.mets[0]}`) : ['لا توجد بيانات']),
  '',
  '## أهم 5 مصادر زيارة (حسب الجلسات)',
  ...(sources.length ? sources.map((s, i) => `${i + 1}. ${s.dims[0]} — ${s.mets[0]}`) : ['لا توجد بيانات']),
  '',
  '_ملاحظة: التحويلات لم تُضمَّن في هذا التقرير._',
];
const body = lines.join('\n');
fs.writeFileSync('ga-report.md', body + '\n');
console.log(body);

if (process.env.GH_TOKEN) {
  execFileSync('gh', ['issue', 'create', '--title', `تقرير تسويقي أسبوعي (${today})`, '--body-file', 'ga-report.md'], {
    stdio: 'inherit',
    env: process.env,
  });
} else {
  console.log('GH_TOKEN غير موجود، لم يُنشأ issue.');
}
