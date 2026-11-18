#!/usr/bin/env node
'use strict';
// اختبار اتصال حقيقي بالمزودين الخمسة باستخدام مفاتيح اختبار تضعها أنت في متغيرات البيئة.
// لا يطبع أي مفتاح، ولا يحفظ شيئاً. المزود الذي لا يوجد مفتاحه يُعلَّم SKIPPED ولا يُعتبر ناجحاً.
//
// المتغيرات: OPENAI_TEST_KEY  GEMINI_TEST_KEY  CLAUDE_TEST_KEY  GROQ_TEST_KEY  OPENROUTER_TEST_KEY
// التشغيل:   node api/scripts/addons-live-test.js
//
// ملاحظة: هذا الاختبار يستهلك طلبات قراءة فقط (قائمة النماذج أو معلومات المفتاح)، ولا يولّد توكنات.

const { ADAPTERS } = require('../app/addons/adapters/index.js');

const ENV_NAME = {
  openai: 'OPENAI_TEST_KEY',
  gemini: 'GEMINI_TEST_KEY',
  claude: 'CLAUDE_TEST_KEY',
  groq: 'GROQ_TEST_KEY',
  openrouter: 'OPENROUTER_TEST_KEY',
};

(async () => {
  let failed = 0;
  let skipped = 0;
  for (const a of ADAPTERS) {
    const key = String(process.env[ENV_NAME[a.slug]] || '').trim();
    if (!key) { skipped += 1; console.log(`${a.slug.padEnd(11)} SKIPPED  (لا يوجد ${ENV_NAME[a.slug]})`); continue; }
    const t0 = Date.now();
    const r = await a.test(key, globalThis.fetch);
    const ms = Date.now() - t0;
    if (r.ok) console.log(`${a.slug.padEnd(11)} OK       ${ms}ms`);
    else { failed += 1; console.log(`${a.slug.padEnd(11)} FAILED   ${r.code} ${ms}ms`); }
  }
  console.log(`\nنتيجة: ${ADAPTERS.length - skipped - failed} ناجح، ${failed} فاشل، ${skipped} بدون مفتاح`);
  process.exit(failed ? 1 : 0);
})();
