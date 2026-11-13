'use strict';
// لوحة Sentry داخل ذكاء المنصة (للإدارة فقط).
// السيرفر يقرأ من Sentry API بالتوكن، والمتصفح ما يشوف التوكن أبداً.
// نرجّع بيانات وصفية فقط للمشاكل (العنوان والعدد والمستخدمين والآخر مرة)، بدون بيانات المستخدمين.
// مشروعان: تطبيق الجوال (SENTRY_PROJECT) والـAPI (SENTRY_PROJECT_API).
// الإعداد في /opt/dfai/.env:
//   SENTRY_AUTH_TOKEN=...          توكن قراءة فقط (project:read و event:read)
//   SENTRY_ORG=vision-agency
//   SENTRY_PROJECT=dubai-fans-ai-app
//   SENTRY_PROJECT_API=dfai-api    (اختياري، الافتراضي dfai-api)
//   SENTRY_BASE_URL=https://de.sentry.io   (اختياري)

const TOKEN = String(process.env.SENTRY_AUTH_TOKEN || '').trim();
const ORG = String(process.env.SENTRY_ORG || 'vision-agency').trim();
const BASE = String(process.env.SENTRY_BASE_URL || 'https://de.sentry.io').trim().replace(/\/$/, '');
const PROJECTS = [
  { label: 'تطبيق الجوال', project: String(process.env.SENTRY_PROJECT || 'dubai-fans-ai-app').trim() },
  { label: 'الـAPI', project: String(process.env.SENTRY_PROJECT_API || 'dfai-api').trim() },
];
const ON = Boolean(TOKEN) && process.env.SENTRY_ENABLED !== '0';

const TTL = 60000;
const cache = new Map();

function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN }, signal: ctrl.signal })
    .finally(() => clearTimeout(to));
}

// المشاكل غير المحلولة لمشروع واحد خلال الفترة
async function fetchProject(p, period) {
  const link = `${BASE}/organizations/${ORG}/projects/${encodeURIComponent(p.project)}/`;
  const url = `${BASE}/api/0/projects/${encodeURIComponent(ORG)}/${encodeURIComponent(p.project)}/issues/` +
    `?statsPeriod=${period}&query=${encodeURIComponent('is:unresolved')}&limit=25`;
  try {
    const r = await fetchWithTimeout(url, 8000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const list = await r.json();
    const issues = (Array.isArray(list) ? list : []).map((i) => ({
      id: i.shortId,
      title: i.title,
      culprit: i.culprit || '',
      level: i.level || '',
      count: Number(i.count) || 0,
      users: Number(i.userCount) || 0,
      lastSeen: i.lastSeen || null,
      link: i.permalink || '',
    }));
    return {
      label: p.label,
      project: p.project,
      link,
      open: issues.length,
      events: issues.reduce((s, i) => s + i.count, 0),
      users: issues.reduce((s, i) => s + i.users, 0),
      issues,
    };
  } catch (e) {
    return { label: p.label, project: p.project, link, error: e.message, open: 0, events: 0, users: 0, issues: [] };
  }
}

// ملخص المشاكل لكل المشاريع خلال الفترة (hours)
async function summary(hours) {
  if (!ON) return { enabled: false };
  const key = String(hours);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // Sentry يقبل فقط 24h و14d هنا (7d يعطي HTTP 400)
  const period = hours <= 24 ? '24h' : '14d';
  const projects = await Promise.all(PROJECTS.map((p) => fetchProject(p, period)));
  const data = {
    enabled: true,
    hours,
    open: projects.reduce((s, p) => s + p.open, 0),
    events: projects.reduce((s, p) => s + p.events, 0),
    users: projects.reduce((s, p) => s + p.users, 0),
    projects,
    host: `${BASE}/organizations/${ORG}/issues/`,
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

module.exports = { summary, enabled: () => ON };
