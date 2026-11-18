'use strict';
// سجل المزودين: كل مزود Adapter مستقل في ملفه. إضافة مزود جديد = ملف + سطر هنا.
const ADAPTERS = [
  require('./openai.js'),
  require('./gemini.js'),
  require('./claude.js'),
  require('./groq.js'),
  require('./openrouter.js'),
  require('./semrush.js'),
  require('./ahrefs.js'),
  require('./hubspot.js'),
  require('./mailchimp.js'),
  require('./google-trends.js'),
  require('./whatsapp.js'),
  require('./gmail.js'),
  require('./canva.js'),
];
const BY_SLUG = new Map(ADAPTERS.map((a) => [a.slug, a]));
const bySlug = (slug) => BY_SLUG.get(String(slug || '')) || null;
module.exports = { ADAPTERS, bySlug };
