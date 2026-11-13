'use strict';
// مجلد أدوات الذكاء الاصطناعي: كل ميزة في ملف مستقل، والتوجيه والاعتماديات هنا.
//   voice.js       صوت العلامة التجارية (يتحقن في كل نص بيتولّد)
//   personas.js    مقيّم الجمهور الافتراضي
//   screenshot.js  من صورة لكود HTML
// الواجهة في site/ai-tools/ai-tools.js

const voiceMod = require('./voice.js');
const personasMod = require('./personas.js');
const screenshotMod = require('./screenshot.js');
const leadsMod = require('./leads.js');
const benchmarkMod = require('./ad-benchmark.js');

function init(db, deps) {
  const voice = voiceMod.init(db, deps);
  const personas = personasMod.init(db, deps);
  const screenshot = screenshotMod.init(db, deps);
  const leads = leadsMod.init(db, deps);
  const benchmark = benchmarkMod.init(db, deps);
  return {
    // يتحقن في نظام المحادثة
    contextBlock: (userId) => voice.contextBlock(userId),
    // للمهام الخلفية: نفس المقارنة اللي بتتعمل من الواجهة المباشرة
    runBenchmark: (mine, rival) => benchmark.compare(mine, rival),
    // يرجّع null لو المسار مش تبعنا، عشان الراوتر الرئيسي يكمّل
    routes: async (req, res, user, p, m) => {
      if (p.startsWith('/api/ai-tools/voice')) return voice.route(req, res, user, p, m);
      if (p === '/api/ai-tools/personas') return personas.route(req, res, user, p, m);
      if (p === '/api/ai-tools/screenshot') return screenshot.route(req, res, user, p, m);
      if (p === '/api/ai-tools/leads' || p === '/api/ai-tools/outreach') return leads.route(req, res, user, p, m);
      if (p === '/api/ai-tools/ad-benchmark') return benchmark.route(req, res, user, p, m);
      return null;
    },
  };
}

module.exports = { init };
