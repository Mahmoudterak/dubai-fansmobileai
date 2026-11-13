'use strict';
// مجلد المستشار: توصيات بحالة (بانتظار موافقة) + محلل نتائج بعد التنفيذ اليدوي.
// ما فيهوش أي كود بيصرف فلوس أو بينشر. كل إجراء فعلي بيفضل يدوي.
//   recommender.js  التوصيات وحالاتها
//   evaluator.js    العائد الفعلي مقابل المتوقع بعد التنفيذ

const recommenderMod = require('./recommender.js');
const evaluatorMod = require('./evaluator.js');
const orchestratorMod = require('./orchestrator.js');

function init(db, deps) {
  const recommender = recommenderMod.init(db, deps);
  const evaluator = evaluatorMod.init(db, deps);
  const orchestrator = orchestratorMod.init(db, Object.assign({}, deps, { recommender }));
  return {
    // للمهام الخلفية: نفس التحليل اللي بيتعمل من زرار المستشار
    decide: (userId, topic) => orchestrator.decide(userId, topic),
    routes: async (req, res, user, p, m) => {
      if (!p.startsWith('/api/advisor')) return null;
      const r = await recommender.route(req, res, user, p, m);
      if (r !== null) return r;
      const e = await evaluator.route(req, res, user, p, m);
      if (e !== null) return e;
      return orchestrator.route(req, res, user, p, m);
    },
  };
}

module.exports = { init };
