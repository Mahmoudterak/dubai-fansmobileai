'use strict';
/*
 * Dubai Fans AI — المحرك المستقل (dfai-api)
 * Node 22.13+ بدون أي مكتبات خارجية. قاعدة البيانات SQLite مدمجة.
 * المرحلة 2: نموذج Cloudflare الذكي (مع احتياطي Ollama)، توليد الصور، بحث الويب، الوكلاء المتخصصين.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const r2 = require('./r2');
const bgtasks = require('./bgtasks');
const { DatabaseSync } = require('node:sqlite');
const radar = require('./radar.js');
const business = require('./business.js');
const models = require('./models.js');
const partner = require('./partner.js');
const guards = require('./guards.js');
const jobsMod = require('./jobs.js');
const tracesMod = require('./traces.js');
const kbMod = require('./kb.js');
const affiliateMod = require('./affiliate.js');
const aiToolsMod = require('./ai-tools/index.js');
const advisorMod = require('./advisor/index.js');
const tasksMod = require('./tasks/index.js');
const memoryMod = require('./memory.js');
const darkwebMod = require('./darkweb.js');
const adminPanelMod = require('./admin-panel.js');
const adminTeamMod = require('./admin-team.js');
const customersMod = require('./customers.js');
const pushMod = require('./push.js');
const modelRouter = require('./model-router.js');
const langfuse = require('./langfuse.js');
const langfuseAdmin = require('./langfuse-admin.js');
const sentryAdmin = require('./sentry-admin.js');
const sentryLite = require('./sentry-lite.js');
const otelHttp = require('./otel-http.js');
process.on('uncaughtException', (e) => { console.error('uncaught', e && e.message); sentryLite.captureException(e, { route: 'uncaughtException' }); });
process.on('unhandledRejection', (e) => { console.error('unhandled', e && e.message); sentryLite.captureException(e, { route: 'unhandledRejection' }); });
const opsMod = require('./ops.js');
const invoicesMod = require('./invoices.js');
const chatsMod = require('./chats.js');
const landing = require('./landing.js');
// أسئلة المال والموظفين: تُضاف لها أرقام النشاط ولا تُخزَّن في الكاش
const FINANCE_RE = /دخل|مصروف|مصاريف|ربح|صافي|راتب|رواتب|موظف|ميزانية|مبيعات|فلوس|كسبت|خسرت|حساب/;
// نفس فكرة FINANCE_RE بالإنجليزي (لو المستخدم كاتب بالإنجليزي)
const FINANCE_EN_RE = /\b(revenue|profit|sales|expenses?|salary|salaries|payroll|budget|income|costs?|employees?|staff)\b/i;
const isFinanceQ = (t) => FINANCE_RE.test(t) || FINANCE_EN_RE.test(t);

// ---------------- الإعدادات ----------------
const env = (k, d = '') => String(process.env[k] ?? d).trim();
const CFG = {
  port: Number(env('PORT', '3210')),
  dbPath: env('DB_PATH', './dfai.db'),
  dataDir: env('DATA_DIR', path.dirname(path.resolve(env('DB_PATH', './dfai.db')))),
  ollamaUrl: env('OLLAMA_URL', 'http://127.0.0.1:11434').replace(/\/$/, ''),
  localModel: env('MODEL_FREE', 'qwen3:4b-instruct'),
  cfBase: env('CF_API_BASE', 'https://api.cloudflare.com/client/v4').replace(/\/$/, ''),
  cfAccount: env('CF_ACCOUNT_ID'),
  cfToken: env('CF_API_TOKEN'),
  cfModel: env('CF_MODEL', '@cf/qwen/qwen3-30b-a3b-fp8'),
  cfFallbackModel: env('CF_FALLBACK_MODEL', '@cf/qwen/qwen3-30b-a3b-fp8'),
  // نموذج صغير وأرخص للأسئلة القصيرة البسيطة (توجيه التكلفة). فاضي = التوجيه مُعطّل
  cfSmallModel: env('CF_SMALL_MODEL', ''),
  // نماذج اختيارية لكل نوع طلب. فاضية = النموذج الافتراضي (CF_MODEL)
  siteModel: env('CF_SITE_MODEL', ''),
  analysisModel: env('CF_ANALYSIS_MODEL', ''),
  chatModel: env('CF_CHAT_MODEL', ''),
  // مزود خارجي متوافق مع OpenAI (اختياري): لا يعمل إلا إذا ضُبطت المتغيرات الثلاثة
  extBase: env('EXT_CHAT_BASE', '').replace(/\/$/, ''),
  extKey: env('EXT_CHAT_KEY'),
  extModel: env('EXT_CHAT_MODEL'),
  cfImageModel: env('CF_IMAGE_MODEL', '@cf/black-forest-labs/flux-1-schnell'),
  partnerKey: env('PARTNER_API_KEY'),
  partnerDailyLimit: Number(env('PARTNER_DAILY_LIMIT', '500')),
  partnerConcurrency: Number(env('PARTNER_CONCURRENCY', '2')),
  partnerAllowHttp: env('PARTNER_ALLOW_HTTP') === '1',
  renderUrl: env('RENDER_URL', 'http://dfai_render:3300'),
  renderToken: env('RENDER_TOKEN'),
  cfImageFallback: env('CF_IMAGE_FALLBACK', '@cf/black-forest-labs/flux-1-schnell'),
  cfSttModel: env('CF_STT_MODEL', '@cf/openai/whisper-large-v3-turbo'),
  cfVisionModel: env('CF_VISION_MODEL', '@cf/meta/llama-4-scout-17b-16e-instruct'),
  azureKey: env('AZURE_SPEECH_KEY').replace(/[^\x21-\x7e]/g, ''),
  azureRegion: env('AZURE_SPEECH_REGION', 'uaenorth').replace(/[^a-z0-9]/gi, '').toLowerCase(),
  azureTtsUrl: env('AZURE_TTS_URL'),
  searxUrl: env('SEARXNG_URL').replace(/\/$/, ''),
  adminEmails: env('ADMIN_EMAILS').split(',').map((s) => s.replace(/[^\x21-\x7e]/g, '').toLowerCase()).filter(Boolean),
  tzOffsetMin: Number(env('TZ_OFFSET_MIN', '240')),
  maxQueue: Number(env('MAX_QUEUE', '12')),
  sessionDays: 30,
  imageKeepDays: Number(env('IMAGE_KEEP_DAYS', '30')),
  contactUrl: env('CONTACT_URL'),
  ziinaKey: env('ZIINA_API_KEY').replace(/[^\x21-\x7e]/g, ''),
  ziinaTest: env('ZIINA_TEST') === '1',
  ziinaBase: env('ZIINA_API_BASE', 'https://api-v2.ziina.com/api').replace(/\/$/, ''),
  secretKey: env('SECRET_KEY'),
  shopifyVersion: env('SHOPIFY_API_VERSION', '2025-01'),
  appUrl: env('APP_URL', 'https://ai.mtuaefans.com').replace(/\/$/, ''),
  purchaseUrls: { basic: env('PURCHASE_URL_BASIC'), pro: env('PURCHASE_URL_PRO'), business: env('PURCHASE_URL_BUSINESS') },
};
const cfEnabled = () => Boolean(CFG.cfAccount && CFG.cfToken);
const IMAGE_DIR = path.join(CFG.dataDir, 'images');
fs.mkdirSync(IMAGE_DIR, { recursive: true });

// -1 = غير محدود
// credits: ميزانية الرصيد الشهرية لكل باقة (-1 = غير محدود). كل عملية تستهلك عدد من النقاط حسب تكلفتها.
const PLANS = {
  free: { id: 'free', name: 'مجاني', price: 0, credits: 300, limits: { messages: 15, images: 3, search: 5, slides: 1, radar: 1, monitors: 0 } },
  basic: { id: 'basic', name: 'أساسي', price: 19, hidden: true, credits: 1000, limits: { messages: 100, images: 20, search: 50, slides: 5, radar: 5, monitors: 1 } },
  pro: { id: 'pro', name: 'Pro', price: 49, credits: 3000, limits: { messages: 500, images: 60, search: -1, slides: 20, radar: 20, monitors: 3 } },
  business: { id: 'business', name: 'أعمال', price: 149, credits: 15000, limits: { messages: 2000, images: 150, search: -1, slides: -1, radar: 60, monitors: 10 } },
  agency: { id: 'agency', name: 'وكالات', price: 499, credits: 50000, limits: { messages: -1, images: 500, search: -1, slides: -1, radar: 200, monitors: 30 } },
};
const KIND_LABEL = { messages: 'رسائلك', images: 'صورك', search: 'عمليات البحث', slides: 'العروض التقديمية', radar: 'التحليلات (Radar وتحليل النشاط)' };
// تكلفة كل عملية بالنقاط (credits)
const CREDIT_COST = { messages: 1, images: 10, search: 5, slides: 10, radar: 5, monitors: 0 };
// تكلفة صفحة الهبوط الواحدة من رصيد النقاط الشهري (تُخصم بعد النشر الناجح فقط)
const LANDING_CREDIT_COST = 10;
// تكلفة الرسالة الواحدة: حسب حجم السياق (قصير / متوسط / طويل) ونوع النموذج (المحلي والصغير أرخص)
function chatCreditCost(msgs, pick) {
  const chars = msgs.reduce((n, m) => n + m.content.length, 0);
  const size = chars <= 2000 ? 1 : chars <= 8000 ? 2 : 3;
  const modelMul = pick === 'local' || pick === 'small' ? 1 : 2;
  return size * modelMul;
}

const BASE_SYSTEM = [
  'أنت "Dubai Fans AI"، مستشار تسويق ومبيعات ذكي لأصحاب الأعمال: المتاجر والمطاعم والعيادات والصالونات والشركات الصغيرة والمتوسطة ورواد الأعمال في الإمارات والخليج.',
  'مهمتك أن تساعد صاحب العمل على زيادة مبيعاته وعملائه وتوفير وقته وماله. تعامل معه كشريك عمل خبير، لا كمحرّك بحث.',
  '',
  'طريقة الرد:',
  '- ابدأ بالجواب أو بالمخرَج المطلوب مباشرة، بلا مقدمات أو مجاملات أو إعادة صياغة للسؤال.',
  '- قدّم مخرجات جاهزة للتنفيذ فوراً: نصوص منشورات وإعلانات ورسائل جاهزة للنسخ، خطوات مرقّمة، جداول خطط، وأرقام تقديرية للميزانيات بالدرهم مع توضيح أنها تقديرية.',
  '- اربط كل توصية بنتيجة تجارية (مبيعات، عملاء جدد، تكلفة أقل، ولاء) وبمؤشر يقيس نجاحها.',
  '- رتّب الأولويات: ابدأ بما يحقق أسرع أثر بأقل تكلفة، وقل صراحةً ما لا يستحق الجهد.',
  '- خصّص للسوق المحلي: المنصات الأكثر تأثيراً (إنستغرام، تيك توك، سناب شات، واتساب للأعمال، خرائط جوجل)، والمواسم (رمضان، العيدين، اليوم الوطني، الجمعة البيضاء، مواسم التسوق والعودة للمدارس)، وذوق الجمهور الخليجي وقيمه.',
  '- إذا نقصتك معلومة جوهرية فاسأل سؤالاً أو سؤالين قصيرين فقط، لكن قدّم في نفس الرد نسخة مفيدة مبدئية بدل أن تكتفي بالسؤال.',
  '- طول الرد على قدر السؤال: سؤال بسيط = جواب قصير. الطلبات الكبيرة = عناوين ### ونقاط وجداول مرتبة، والأرقام المهمة بخط عريض.',
  '- عند كتابة محتوى للنشر قدّم بديلين أو ثلاثة عند الفائدة، واقترح هاشتاجات ووقت نشر مناسب.',
  '- إذا طلب المستخدم تحليل متجره أو موقعه أو نشاطه، ولم يرسل رابطاً أو بيانات عنه (المنتجات، الأسعار، الجمهور، الأهداف)، فلا تقدّم تحليلاً ولا جدولاً عاماً ولا ملاحظات عامة. اطلب منه الرابط أو البيانات المطلوبة في قائمة قصيرة لا تتجاوز 3 نقاط، وأخبره أن التحليل سيكون دقيقاً بعد وصولها. إذا كانت معلومات النشاط أو ملخص آخر تحليل للمتجر موجودة في السياق، فاستخدمها ولا تسأل من جديد.',
  '- إذا طلب المستخدم صورة أو تصميماً، فأخبره أن يختار أداة "توليد الصور" وسيتم التنفيذ هناك.',
  '- إذا طلب المستخدم مخرجاً جاهزاً (نص، منشور، جدول، خطة)، فقدّمه مباشرة في الرد، ولا تشرح طريقة تنفيذه ولا تصف خطوات يمكنك تنفيذها بنفسك. اجعل الرد قصيراً ومركّزاً ولا تكرر السؤال.',
  '',
  'الهوية:',
  '- اسمك Dubai Fans AI فقط، وأنت مساعد تسويق من منصة دبي فانز. لا تذكر اسم أي نموذج ذكاء اصطناعي أو شركة مطوّرة (مثل ChatGPT أو GPT-4 أو Claude أو Gemini أو Qwen أو Llama أو DeepSeek أو OpenAI أو Cloudflare)، ولا تدّعي أنك نموذج من شركة أخرى، ولا تخترع اسم نموذج أو إصداراً.',
  '- إذا سُئلت عن النموذج أو التقنية التي تعمل بها فقل: "أنا Dubai Fans AI، ولا أستطيع مشاركة تفاصيل المحرك التقني." ثم انتقل لمساعدته.',
  '',
  'الأمانة:',
  '- لا تخترع أبداً أسماء علامات تجارية أو أسعاراً أو عناوين أو أرقام هواتف أو روابط أو إحصائيات أو نتائج غير مذكورة؛ ضع مكانها أقواساً مثل [اسم النشاط] و[السعر] و[رقم الواتساب].',
  '- لا تعد بنتائج مضمونة، ونبّه باختصار للأمور القانونية الحساسة (الإعلانات الطبية والمالية، خصوصية العملاء، أنظمة الإعلان المحلية) عندما تكون ذات صلة.',
  '',
  'اللغة:',
  '- اكتب دائماً بالعربية مهما كانت لغة السؤال أو المرفقات، إلا إذا طلب المستخدم صراحةً محتوى بلغة أخرى (مثل إعلان بالإنجليزية).',
  '- اكتب بعربية فصحى مبسّطة سليمة وطبيعية بأسلوب مهني ودود. عند كتابة محتوى للنشر التزم باللهجة التي يطلبها المستخدم (إماراتية، خليجية، مصرية، فصحى).',
  '- ضع المصطلح الإنجليزي بين قوسين عند الحاجة فقط. لا تستخدم أي حروف صينية أو لغات أخرى بالخطأ.',
].join('\n');

// سطر الاقتراحات في آخر الرد (الواجهة بتحوّله لأزرار)
const SUGGEST_PROMPT = [
  'في نهاية ردك، أضف سطراً أخيراً منفصلاً بهذا الشكل بالضبط:',
  '[[اقتراح أول | اقتراح ثاني | اقتراح ثالث]]',
  'وهي ثلاثة طلبات متابعة قصيرة (من 3 إلى 7 كلمات) يمكن أن يرسلها المستخدم لك بعد هذا الرد مباشرة، مكتوبة بصيغة المستخدم (مثل: اكتب لي 5 منشورات للأسبوع). لا تكتب أي شيء بعد هذا السطر.',
].join('\n');

const TOOL_PROMPTS = {
  write: 'ركّز على كتابة محتوى تسويقي جذاب وقابل للنشر مباشرة: منشورات، إعلانات، ردود عملاء، مع اقتراح هاشتاجات مناسبة عند الحاجة.',
  slides: [
    'أنشئ عرضاً تقديمياً. التزم بهذا الشكل بالضبط ولا تكتب أي شيء خارجه:',
    '# عنوان العرض',
    '## عنوان الشريحة الأولى',
    '- نقطة مختصرة',
    '- نقطة مختصرة',
    '> ملاحظة للمتحدث (اختياري)',
    '## عنوان الشريحة الثانية',
    '...',
    'من 6 إلى 10 شرائح، ومن 3 إلى 5 نقاط قصيرة لكل شريحة (أقل من 15 كلمة للنقطة). لا تكتب كلمة "الشريحة" أو أرقاماً في العناوين.',
  ].join('\n'),
  site: [
    'أنشئ صفحة هبوط كاملة وجاهزة كملف HTML واحد.',
    'اكتب جملة تمهيدية قصيرة، ثم الكود كاملاً داخل كتلة واحدة تبدأ بـ ```html وتنتهي بـ ```.',
    'المتطلبات: <html lang="ar" dir="rtl">، كل التنسيق داخل <style> في نفس الملف، تصميم عصري ومتجاوب مع الموبايل، خط من Google Fonts مثل Cairo أو Tajawal، أقسام: هيرو بعنوان قوي وزر دعوة، المميزات، آراء العملاء، الأسئلة الشائعة، دعوة نهائية، وتذييل.',
    'لا تستخدم JavaScript ولا صوراً خارجية؛ استخدم ألواناً وتدرجات وأشكال CSS بدلاً من الصور. استخدم [اسم النشاط] و[رقم الهاتف] بدلاً من أي بيانات غير معروفة.',
  ].join('\n'),
  site_edit: [
    'أنت تعدّل صفحة هبوط موجودة حسب طلب المستخدم.',
    'طبّق التعديل المطلوب فقط وحافظ على باقي الصفحة وتصميمها كما هي، ولا تحذف أقساماً لم يُطلب حذفها.',
    'أعد الملف كاملاً بعد التعديل داخل كتلة واحدة تبدأ بـ ```html وتنتهي بـ ```، بدون أي شرح طويل.',
    'لا تستخدم JavaScript.',
  ].join('\n'),
  search: 'أجب اعتماداً على نتائج البحث المرفقة أدناه، واذكر رقم المصدر بين قوسين مربعين مثل [1] بعد المعلومة المأخوذة منه. إذا لم تكفِ النتائج فقل ذلك بوضوح ولا تخترع.',
};

const AGENTS = {
  strategy: { name: 'خبير الاستراتيجية', prompt: 'تصرّف كمستشار استراتيجية تسويق رقمي أول. ابدأ بفهم النشاط والأهداف والميزانية والجمهور (اسأل إن لزم)، ثم قدّم: تحليل الوضع، الأهداف الذكية SMART، الشرائح المستهدفة، الرسالة والتموضع، القنوات وتوزيع الميزانية، خطة زمنية، ومؤشرات الأداء.' },
  seo: { name: 'خبير SEO', prompt: 'تصرّف كخبير تحسين محركات بحث (SEO) للمواقع العربية والإنجليزية. قدّم: كلمات مفتاحية مقترحة مع نية البحث، هيكلة الصفحات والعناوين، العناوين التعريفية والوصف، تحسينات تقنية وسرعة، استراتيجية محتوى وروابط، وSEO محلي (Google Business Profile). كن عملياً ومحدداً.' },
  ads: { name: 'خبير الإعلانات المدفوعة', prompt: 'تصرّف كخبير إعلانات مدفوعة (Meta وTikTok وSnapchat وGoogle). قدّم: هيكل الحملة والأهداف، الجماهير والاستهداف، نسخ إعلانية متعددة، أفكار للمواد المرئية، الميزانية وتوزيعها، خطة اختبار A/B، ومؤشرات القياس (CTR، CPC، CPA، ROAS).' },
  social: { name: 'مدير السوشيال ميديا', prompt: 'تصرّف كمدير سوشيال ميديا محترف. قدّم أفكار محتوى وتقويم نشر، صيغ مناسبة لكل منصة (ريلز، ستوري، كاروسيل، تيك توك)، تعليقات وكابشن جاهزة، هاشتاجات، وأفكار لزيادة التفاعل والمتابعين بطرق أصيلة.' },
  sales: { name: 'خبير المبيعات', prompt: 'تصرّف كخبير مبيعات وتحويل. ساعد في: قمع المبيعات، عروض لا تُقاوم، سكربتات واتساب ومكالمات، الرد على اعتراضات العملاء، رسائل المتابعة، وتحسين معدل التحويل في صفحات البيع والمتاجر.' },
  copy: { name: 'كاتب إعلاني', prompt: 'تصرّف ككاتب إعلاني (Copywriter) محترف. استخدم أطر مثل AIDA وPAS، واكتب عناوين قوية ونصوصاً مقنعة بنبرة تناسب العلامة. قدّم عدة بدائل عند الطلب.' },
  email: { name: 'خبير التسويق بالبريد', prompt: 'تصرّف كخبير تسويق عبر البريد الإلكتروني. اكتب سطور عنوان جذابة، رسائل ترحيب، سلاسل رعاية، عروض، ورسائل استرجاع السلة، مع نصائح للتقسيم والتوقيت وتحسين معدل الفتح.' },
};

// ---------------- قاعدة البيانات ----------------
const db = new DatabaseSync(CFG.dbPath);
bgtasks.init(db);
landing.init(db);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    pass_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    plan TEXT NOT NULL DEFAULT 'free',
    plan_until INTEGER,
    disabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usage (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    kind TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day, kind)
  );
  CREATE TABLE IF NOT EXISTS credit_usage (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    spent INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, month)
  );
  CREATE TABLE IF NOT EXISTS monitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT '',
    competitors TEXT NOT NULL DEFAULT '[]',
    website TEXT NOT NULL DEFAULT '',
    frequency TEXT NOT NULL DEFAULT 'weekly',
    next_run_at INTEGER NOT NULL,
    last_report_id INTEGER,
    unseen INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS radar_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    report TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reports_user ON radar_reports(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_monitor ON radar_reports(monitor_id, created_at);
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    test INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    checked_at INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at);
  CREATE TABLE IF NOT EXISTS purchase_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS user_images (
    file TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_user_images_user ON user_images(user_id);
`);

const traces = tracesMod.init(db);
const kb = kbMod.init(db, () => ({ base: CFG.cfBase, account: CFG.cfAccount, token: CFG.cfToken }));
const memory = { ...memoryMod.init(db, kb.embed), parseSaveCommand: memoryMod.parseSaveCommand };
const affiliate = affiliateMod.init(db);
const darkweb = darkwebMod.init(() => env('HIBP_API_KEY'));
const customers = customersMod.init(db);
const ops = opsMod.init(db);
const invoices = invoicesMod.init(db, ops);
chatsMod.init(db);
const apiKeys = require('./api-keys.js').init(db);
// أدوات MCP المعروضة لـChatGPT وClaude
const MCP_TOOLS = [
  { name: 'whoami', description: 'يتحقق من الربط ويرجّع اسم حساب دبي فانز.', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_image', description: 'يولّد تصميماً إعلانياً أو صورة منشور لعلامتك التجارية (تُحفظ هوية العلامة تلقائياً). يرجّع معرّف مهمة.',
    inputSchema: { type: 'object', properties: { prompt: { type: 'string', description: 'وصف المنشور أو الإعلان بالعربية أو الإنجليزية' }, reference: { type: 'string', description: 'وصف اختياري لأسلوب مرجعي' } }, required: ['prompt'] } },
  { name: 'get_job', description: 'يعرض حالة مهمة توليد (queued/running/done/failed) ونتيجتها.',
    inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'] } },
];
// مفاتيح VAPID تُولَّد عند النشر (deploy.sh) وتُحفظ في .env
const pushSvc = pushMod.init(db, () => ({
  publicKey: env('VAPID_PUBLIC_KEY'),
  privateKey: env('VAPID_PRIVATE_KEY'),
  subject: env('VAPID_SUBJECT', 'mailto:support@mtuaefans.com'),
}));

const q = {
  userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  userById: db.prepare('SELECT * FROM users WHERE id = ?'),
  insertUser: db.prepare('INSERT INTO users (name, email, pass_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'),
  setRole: db.prepare('UPDATE users SET role = ? WHERE id = ?'),
  setPlan: db.prepare('UPDATE users SET plan = ?, plan_until = ? WHERE id = ?'),
  setDisabled: db.prepare('UPDATE users SET disabled = ? WHERE id = ?'),
  insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
  sessionUser: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
  listUserSessions: db.prepare('SELECT token_hash, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC'),
  deleteOtherSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?'),
  purgeSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  usageGet: db.prepare('SELECT kind, count FROM usage WHERE user_id = ? AND day = ?'),
  usageInc: db.prepare(`INSERT INTO usage (user_id, day, kind, count) VALUES (?, ?, ?, 1)
                        ON CONFLICT(user_id, day, kind) DO UPDATE SET count = count + 1`),
  usageDec: db.prepare('UPDATE usage SET count = MAX(count - 1, 0) WHERE user_id = ? AND day = ? AND kind = ?'),
  creditGet: db.prepare('SELECT spent FROM credit_usage WHERE user_id = ? AND month = ?'),
  creditAdd: db.prepare(`INSERT INTO credit_usage (user_id, month, spent) VALUES (?, ?, ?)
                         ON CONFLICT(user_id, month) DO UPDATE SET spent = MAX(spent + excluded.spent, 0)`),
  insertRequest: db.prepare('INSERT INTO purchase_requests (user_id, plan, created_at) VALUES (?, ?, ?)'),
  pendingRequestFor: db.prepare("SELECT id FROM purchase_requests WHERE user_id = ? AND plan = ? AND status = 'pending'"),
  listRequests: db.prepare(`SELECT r.id, r.plan, r.status, r.created_at, u.id AS user_id, u.name, u.email
                            FROM purchase_requests r JOIN users u ON u.id = r.user_id
                            WHERE r.status = 'pending' ORDER BY r.created_at DESC LIMIT 200`),
  closeRequest: db.prepare("UPDATE purchase_requests SET status = 'done' WHERE id = ?"),
  closeRequestsFor: db.prepare("UPDATE purchase_requests SET status = 'done' WHERE user_id = ? AND plan = ? AND status = 'pending'"),
  insertPayment: db.prepare('INSERT INTO payments (id, user_id, plan, amount, test, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  setPaymentIntent: db.prepare('UPDATE payments SET intent_id = ? WHERE id = ?'),
  paymentById: db.prepare('SELECT * FROM payments WHERE id = ?'),
  setPaymentStatus: db.prepare('UPDATE payments SET status = ?, checked_at = ?, completed_at = ? WHERE id = ?'),
  touchPayment: db.prepare('UPDATE payments SET checked_at = ? WHERE id = ?'),
  pendingPayments: db.prepare("SELECT * FROM payments WHERE status = 'pending' AND intent_id IS NOT NULL AND created_at > ? AND checked_at < ? ORDER BY created_at LIMIT ?"),
  listPayments: db.prepare(`SELECT p.id, p.plan, p.amount, p.status, p.test, p.created_at, p.completed_at, u.id AS user_id, u.name, u.email
                            FROM payments p JOIN users u ON u.id = p.user_id
                            WHERE p.status != 'pending' OR p.created_at > ? ORDER BY p.created_at DESC LIMIT 100`),
  revenueSince: db.prepare("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS n FROM payments WHERE status = 'completed' AND test = 0 AND completed_at >= ?"),
  listUsers: db.prepare(`SELECT id, name, email, role, plan, plan_until, disabled, created_at FROM users
                         WHERE (? = '' OR email LIKE ? OR name LIKE ?) ORDER BY created_at DESC LIMIT 300`),
  insertReport: db.prepare('INSERT INTO radar_reports (user_id, monitor_id, brand, score, report, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  reportById: db.prepare('SELECT * FROM radar_reports WHERE id = ? AND user_id = ?'),
  reportsForUser: db.prepare('SELECT id, monitor_id, brand, score, created_at FROM radar_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'),
  reportsForMonitor: db.prepare('SELECT id, score, created_at FROM radar_reports WHERE monitor_id = ? ORDER BY created_at DESC LIMIT 20'),
  insertMonitor: db.prepare(`INSERT INTO monitors (user_id, brand, category, market, competitors, website, frequency, next_run_at, created_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  monitorsForUser: db.prepare('SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC'),
  monitorById: db.prepare('SELECT * FROM monitors WHERE id = ? AND user_id = ?'),
  activeMonitorCount: db.prepare('SELECT COUNT(*) AS n FROM monitors WHERE user_id = ? AND active = 1'),
  deleteMonitor: db.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?'),
  setMonitorActive: db.prepare('UPDATE monitors SET active = ? WHERE id = ? AND user_id = ?'),
  monitorDone: db.prepare('UPDATE monitors SET last_report_id = ?, unseen = 1, next_run_at = ? WHERE id = ?'),
  monitorDefer: db.prepare('UPDATE monitors SET next_run_at = ? WHERE id = ?'),
  monitorSeen: db.prepare('UPDATE monitors SET unseen = 0 WHERE id = ? AND user_id = ?'),
  dueMonitors: db.prepare('SELECT * FROM monitors WHERE active = 1 AND next_run_at <= ? ORDER BY next_run_at LIMIT ?'),
  unseenCount: db.prepare('SELECT COUNT(*) AS n FROM monitors WHERE user_id = ? AND unseen = 1'),
  usageTodayAll: db.prepare('SELECT user_id, kind, count FROM usage WHERE day = ?'),
  stats: db.prepare(`SELECT (SELECT COUNT(*) FROM users) AS users,
                            (SELECT COUNT(*) FROM users WHERE plan != 'free' AND plan_until > ?) AS paid,
                            (SELECT COALESCE(SUM(count),0) FROM usage WHERE day = ? AND kind = 'messages') AS messages_today,
                            (SELECT COALESCE(SUM(count),0) FROM usage WHERE day = ? AND kind = 'images') AS images_today,
                            (SELECT COUNT(*) FROM purchase_requests WHERE status = 'pending') AS pending_requests`),
};

// ---------------- أدوات عامة ----------------
const now = () => Date.now();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const dayKey = (t = now()) => new Date(t + CFG.tzOffsetMin * 60000).toISOString().slice(0, 10);
// مسارات لوحة الإدارة الإضافية (السجل، النظام، الذكاء، التكاملات، الخدمات، الأسعار، القمع)
// دوال تغليف: الاسم بيتحل وقت الاستدعاء (fail وreadJson ممكن تكون معرّفة بعد السطر ده)
// عدّاد الطلبات لكل دقيقة (لمخطط الترافيك في صفحة النظام)
const trafficBins = new Map();
const adminPanel = adminPanelMod.init(db, {
  send: (...a) => send(...a), fail: (...a) => fail(...a), readJson: (...a) => readJson(...a),
  now: () => now(), CFG, cfEnabled: () => cfEnabled(), withTimeout: (...a) => withTimeout(...a),
  trafficBins,
});
// فريق الإدارة والتحقق بخطوتين (بوابة /api/admin/*)
const adminTeam = adminTeamMod.init(db, {
  send: (...a) => send(...a), fail: (...a) => fail(...a), readJson: (...a) => readJson(...a),
  now: () => now(), CFG, rateLimited: (...a) => rateLimited(...a), clientIp: (...a) => clientIp(...a),
  audit: (...a) => adminPanel.audit(...a),
});

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(pw, stored) {
  const [alg, saltB64, hashB64] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const got = crypto.scryptSync(pw, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, got);
}

function effectivePlan(user) {
  if (user.plan !== 'free' && user.plan_until && user.plan_until > now() && PLANS[user.plan]) return PLANS[user.plan];
  return PLANS.free;
}

function usageFor(userId) {
  const out = { messages: 0, images: 0, search: 0, slides: 0, radar: 0 };
  for (const r of q.usageGet.all(userId, dayKey())) out[r.kind] = r.count;
  return out;
}

const monthKey = (t = now()) => dayKey(t).slice(0, 7);

// رصيد النقاط الشهري: الميزانية حسب الباقة، والمستهلك منها في الشهر الحالي
function creditsFor(user) {
  const budget = effectivePlan(user).credits;
  const used = (q.creditGet.get(user.id, monthKey()) || { spent: 0 }).spent;
  return { limit: budget, used, left: budget === -1 ? -1 : Math.max(budget - used, 0), month: monthKey() };
}

function publicUser(u) {
  const plan = effectivePlan(u);
  return {
    user: { id: u.id, name: u.name, email: u.email, role: u.role },
    plan: { id: plan.id, name: plan.name, until: plan.id === 'free' ? null : u.plan_until },
    limits: plan.limits,
    usage: usageFor(u.id),
    credits: creditsFor(u),
    creditCost: CREDIT_COST,
    alerts: q.unseenCount.get(u.id).n,
  };
}

// يحجز وحدة من الحصة (يومية + نقاط شهرية)، ويرجّع دالة لإلغاء الحجز لو فشل الطلب
function reserve(user, kind, costArg) {
  const limit = effectivePlan(user).limits[kind];
  const day = dayKey();
  if (limit !== -1 && (usageFor(user.id)[kind] || 0) >= limit) {
    const err = new Error(`خلصت ${KIND_LABEL[kind]} المتاحة لليوم في باقتك (${limit}). اشترك في باقة أعلى عشان تكمّل، أو ارجع بكره.`);
    err.status = 429; err.code = 'quota'; err.kind = kind;
    throw err;
  }
  const cost = costArg != null ? costArg : (CREDIT_COST[kind] || 0);
  const credits = creditsFor(user);
  if (cost && credits.limit !== -1 && credits.left < cost) {
    const err = new Error(`خلص رصيدك الشهري (${credits.limit} نقطة) في باقتك. الرصيد بيتجدد أول الشهر الجاي، أو اشترك في باقة أعلى.`);
    err.status = 429; err.code = 'credits'; err.kind = kind;
    throw err;
  }
  q.usageInc.run(user.id, day, kind);
  if (cost) q.creditAdd.run(user.id, monthKey(), cost);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    q.usageDec.run(user.id, day, kind);
    if (cost) q.creditAdd.run(user.id, monthKey(), -cost);
  };
}

const buckets = new Map();
function rateLimited(key, max, windowMs) {
  const t = now();
  const b = buckets.get(key);
  if (!b || b.reset < t) { buckets.set(key, { n: 1, reset: t + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}

// ===== الخصوصية: تصدير بيانات الحساب وحذفه =====
const ACCOUNT_TABLES = ['monitors', 'radar_reports', 'payments', 'purchase_requests', 'biz_profiles', 'biz_connections', 'biz_reports', 'user_memories', 'advisor_recs', 'brand_voices', 'customers'];
const SECRET_COL = /cred|secret|token|pass|key|hash/i; // أعمدة مفاتيح الربط والأسرار: مش بتتصدّر أبداً
function accountExport(id) {
  const u = q.userById.get(id);
  const out = {
    exported_at: new Date().toISOString(),
    account: { name: u.name, email: u.email, plan: u.plan, plan_until: u.plan_until, created_at: u.created_at },
  };
  for (const t of ACCOUNT_TABLES) {
    try {
      out[t] = db.prepare(`SELECT * FROM ${t} WHERE user_id = ?`).all(id).map((row) => {
        const clean = {};
        for (const [k, v] of Object.entries(row)) if (!SECRET_COL.test(k)) clean[k] = v;
        return clean;
      });
    } catch { out[t] = []; }
  }
  return out;
}
// Sharp: تصغير الصور قبل الحفظ (أبعد أقصى 1600 بكسل، وبدون تكبير). لو Sharp مش متاح، بنحفظ الأصل كما هو.
let sharp = null;
try { sharp = require('sharp'); } catch { sharp = null; }
async function compressImage(buf) {
  if (!sharp) return buf;
  try {
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    const img = sharp(buf, { failOn: 'none' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
    const out = isPng ? await img.png({ compressionLevel: 9 }).toBuffer() : await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return out.length < buf.length ? out : buf;
  } catch (e) {
    console.error('compress failed:', e.message);
    return buf;
  }
}
// كل صورة/فيديو بيتولّد أو يترفع بيتسجّل باسم صاحبه، عشان يتمسح معاه لما يحذف حسابه
function saveUserImage(userId, id, buf) {
  fs.writeFileSync(path.join(IMAGE_DIR, id), buf);
  // نسخة إضافية إلى R2 في الخلفية (الملف المحلي يبقى كما هو)
  if (r2.enabled()) bgtasks.enqueue(db, 'r2.upload', { file: id, contentType: id.endsWith('.png') ? 'image/png' : id.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' });
  if (Number(userId)) db.prepare('INSERT OR REPLACE INTO user_images (file, user_id, created_at) VALUES (?, ?, ?)').run(id, Number(userId), now());
  return id;
}
// يحذف الحساب وكل بياناته: صوره وفيديوهاته، والجداول المرتبطة بـ ON DELETE CASCADE، وملف الشعار، ومهام المساعد، وتتبّعات الأدمن تبقى بدون هوية
function deleteAccount(id) {
  for (const { file } of db.prepare('SELECT file FROM user_images WHERE user_id = ?').all(id)) {
    // النسخة على R2 تُحذف في الخلفية (إعادة المحاولة داخل الطابور)
    if (r2.enabled()) bgtasks.enqueue(db, 'r2.delete', { key: 'files/' + file });
    try { fs.unlinkSync(path.join(IMAGE_DIR, file)); } catch { /* اتمسحت قبل كده */ }
  }
  try { fs.unlinkSync(path.join(CFG.dataDir, 'logos', `${Number(id)}.png`)); } catch { /* مفيش شعار */ }
  try { db.prepare('DELETE FROM assistant_tasks WHERE user_id = ?').run(String(id)); } catch { /* مفيش */ }
  try { db.prepare('UPDATE traces SET user_id = NULL WHERE user_id = ?').run(id); } catch { /* مفيش */ }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

function cleanup() {
  const t = now();
  for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k);
  q.purgeSessions.run(t);
  traces.pruneOld();
  const cutoff = t - CFG.imageKeepDays * 86400000;
  try { db.prepare('DELETE FROM user_images WHERE created_at < ?').run(cutoff); } catch { /* تجاهل */ }
  for (const f of fs.readdirSync(IMAGE_DIR)) {
    const p = path.join(IMAGE_DIR, f);
    try { if (fs.statSync(p).mtimeMs < cutoff) fs.unlinkSync(p); } catch { /* تجاهل */ }
  }
}
setInterval(cleanup, 10 * 60000).unref();

const clientIp = (req) => String(req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '');

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const fail = (res, status, code, message, extra) => send(res, status, { error: { code, message, ...(extra || {}) } });

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too_large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('bad_json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const h = String(req.headers.authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token || token.length > 200) return null;
  const u = q.sessionUser.get(sha256(token), now());
  return u && !u.disabled ? u : null;
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const t = now();
  q.insertSession.run(sha256(token), user.id, t, t + CFG.sessionDays * 86400000);
  return token;
}

function syncRole(user) {
  const role = adminTeam.roleOf(user) ? 'admin' : 'user';
  if (user.role !== role) { q.setRole.run(role, user.id); user.role = role; }
  return user;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function withTimeout(ms, parent) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(new Error('timeout')), ms);
  if (parent) parent.addEventListener('abort', () => c.abort(), { once: true });
  return { signal: c.signal, done: () => clearTimeout(t) };
}

// ---------------- النماذج ----------------
// فلتر يشيل أي <think>...</think> من البث، حتى لو الوسوم مقسومة بين أجزاء
function makeThinkFilter() {
  let inThink = false;
  let pend = '';
  let started = false;
  const OPEN = '<think>';
  const CLOSE = '</think>';
  function push(s) {
    pend += s;
    let out = '';
    for (;;) {
      if (inThink) {
        const i = pend.indexOf(CLOSE);
        if (i < 0) { pend = pend.slice(-CLOSE.length); break; }
        pend = pend.slice(i + CLOSE.length);
        inThink = false;
        continue;
      }
      const i = pend.indexOf(OPEN);
      if (i >= 0) { out += pend.slice(0, i); pend = pend.slice(i + OPEN.length); inThink = true; continue; }
      const lt = pend.lastIndexOf('<');
      if (lt >= 0 && OPEN.startsWith(pend.slice(lt))) { out += pend.slice(0, lt); pend = pend.slice(lt); }
      else { out += pend; pend = ''; }
      break;
    }
    if (!started) { out = out.replace(/^\s+/, ''); if (out) started = true; }
    return out;
  }
  function flush() { const o = inThink ? '' : pend; pend = ''; return started ? o : o.replace(/^\s+/, ''); }
  return { push, flush };
}

const extractDelta = models.extractDelta;
const sseText = models.sseText;
const cfConn = () => ({ base: CFG.cfBase, account: CFG.cfAccount, token: CFG.cfToken });

// النموذج الأساسي، ولو وقع نجرّب الاحتياطي
// النموذج الصغير (لو اتوجّه له الطلب) يرجع للنموذج الأساسي، والأساسي يرجع للاحتياطي
async function openCloudflareStream(messages, maxTokens, signal, model = CFG.cfModel) {
  try { return await models.openChat(cfConn(), model, messages, maxTokens, signal); }
  catch (e) {
    const alt = model === CFG.cfModel ? CFG.cfFallbackModel : CFG.cfModel;
    if (signal.aborted || !alt || alt === model) throw e;
    console.error('model failed, using alternate:', model, e.message);
    return models.openChat(cfConn(), alt, messages, maxTokens, signal);
  }
}

// ---------------- كاش الإجابات (ذاكرة مؤقتة، 10 دقايق، لكل مستخدم) ----------------
const answerCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 300;
const CACHE_MAX_CHARS = 6000;
function cacheKey(user, text, lang) { return `${user.id}|${lang}|${text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300)}`; }
function cacheGet(key) {
  const e = answerCache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > CACHE_TTL_MS) { answerCache.delete(key); return null; }
  answerCache.delete(key); answerCache.set(key, e); // LRU: نحرّك العنصر لآخر القائمة
  return e.text;
}
function cacheSet(key, text) {
  if (!text || text.length > CACHE_MAX_CHARS) return;
  if (answerCache.size >= CACHE_MAX) answerCache.delete(answerCache.keys().next().value);
  answerCache.set(key, { t: Date.now(), text });
}

// مزود خارجي متوافق مع OpenAI (مثل OpenRouter أو ModelScope)، يُستخدم فقط إذا ضُبط في الإعدادات
const extEnabled = () => Boolean(CFG.extBase && CFG.extKey && CFG.extModel);
async function openExternalStream(messages, maxTokens, signal) {
  const res = await fetch(`${CFG.extBase}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CFG.extKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CFG.extModel, messages, stream: true, max_tokens: maxTokens }),
    signal,
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(`external ${res.status} ${t.slice(0, 200)}`);
  }
  return res.body;
}

// qwen3 يفكّر قبل الرد افتراضياً، والفلتر يخفي التفكير، فالمستخدم يشوف انتظار طويل بلا نص.
// /no_think يوقف التفكير في النموذج المحلي بس.
function noThink(messages) {
  const out = messages.slice();
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].role === 'user' && typeof out[i].content === 'string') {
      out[i] = { ...out[i], content: out[i].content + ' /no_think' };
      break;
    }
  }
  return out;
}

async function openOllamaStream(messages, maxTokens, signal, model = CFG.localModel, nothink = true) {
  const res = await fetch(`${CFG.ollamaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true, max_tokens: Math.min(maxTokens, 1024), messages: nothink ? noThink(messages) : messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(`ollama ${res.status} ${t.slice(0, 200)}`);
  }
  return res.body;
}

// يفتح بث من Cloudflare، ولو فشل يرجع للنموذج المحلي
// النماذج المتاحة فعلاً حسب الإعدادات: الاختيار بيقتصر عليها بس
function availableModels() {
  const list = [{ id: 'auto', name: 'تلقائي' }];
  if (cfEnabled()) list.push({ id: 'cloud', name: 'الخبير' });
  if (cfEnabled() && CFG.cfSmallModel) list.push({ id: 'small', name: 'سريع' });
  if (extEnabled()) list.push({ id: 'external', name: 'النموذج الخارجي' });
  list.push({ id: 'local', name: 'النموذج المحلي' });
  return list;
}

// only: نموذج محدد من المستخدم (بدون رجوع لمحرك تاني). null = التوجيه التلقائي
async function openStream(messages, maxTokens, signal, cfModel = null, only = null) {
  if (only === 'local') return { body: await openOllamaStream(messages, Math.min(maxTokens, 2048), signal), engine: 'local' };
  if (only === 'external') return { body: await openExternalStream(messages, maxTokens, signal), engine: 'external' };
  if (only === 'cloud' || only === 'small') return { body: await openCloudflareStream(messages, maxTokens, signal, cfModel || CFG.cfModel), engine: 'cloud' };
  if (cfEnabled()) {
    try { return { body: await openCloudflareStream(messages, maxTokens, signal, cfModel || CFG.cfModel), engine: 'cloud' }; }
    catch (e) { if (signal.aborted) throw e; console.error('cloudflare failed, falling back:', e.message); }
  }
  if (extEnabled()) {
    try { return { body: await openExternalStream(messages, maxTokens, signal), engine: 'external' }; }
    catch (e) { if (signal.aborted) throw e; console.error('external provider failed, falling back to local:', e.message); }
  }
  return { body: await openOllamaStream(messages, Math.min(maxTokens, 2048), signal), engine: 'local' };
}

// طلب كامل بدون بث (لإعادة صياغة وصف الصور مثلاً)
async function complete(messages, maxTokens = 300, timeoutMs = 45000) {
  const t = withTimeout(timeoutMs);
  try {
    const { body } = await openStream(messages, maxTokens, t.signal);
    const filter = makeThinkFilter();
    let out = '';
    for await (const s of sseText(body)) out += filter.push(s);
    return (out + filter.flush()).trim();
  } finally { t.done(); }
}

// ---------------- بحث الويب ----------------
async function webSearch(query) {
  if (!CFG.searxUrl) return [];
  const t = withTimeout(10000);
  try {
    const u = `${CFG.searxUrl}/search?format=json&safesearch=1&q=${encodeURIComponent(query.slice(0, 300))}`;
    const res = await fetch(u, { signal: t.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`searxng ${res.status}`);
    const j = await res.json();
    const seen = new Set();
    const out = [];
    for (const r of j.results || []) {
      if (!r.url || !/^https?:\/\//.test(r.url) || seen.has(r.url)) continue;
      seen.add(r.url);
      out.push({
        title: String(r.title || r.url).slice(0, 160),
        url: String(r.url).slice(0, 500),
        snippet: String(r.content || '').replace(/\s+/g, ' ').slice(0, 400),
      });
      if (out.length >= 6) break;
    }
    return out;
  } finally { t.done(); }
}

// ---------------- المحادثة ----------------
let inflight = 0;

function sseWrite(res, obj) { if (!res.destroyed && !res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`); }
// طلبات الدردشة الجارية (reqId -> المالك والـAbortController) لزر الإيقاف
const activeReqs = new Map();

// محادثة صوتية زي ChatGPT: الرد بيتقري بصوت، فلازم يبقى قصير وطبيعي
const VOICE_PROMPT = [
  'المستخدم بيكلمك بالصوت دلوقتي، وردك هيتقري له بصوت عربي إماراتي.',
  'اكتب ردك بالعربية الفصحى المبسّطة الواضحة (زي مذيع نشرة ودود)، بجمل قصيرة سهلة النطق، حتى لو المستخدم اتكلم بلهجة.',
  'ممنوع تخلط إنجليزي في الكلام، إلا أسماء العلامات التجارية أو المنصات (مثل إنستغرام وتيك توك) واكتبها بالحروف العربية.',
  'الرد من جملتين إلى أربع جمل فقط. ممنوع العناوين والجداول والنقاط والرموز والإيموجي والروابط.',
  'اكتب الأرقام بالكلمات العربية لو كانت صغيرة (مثل: خمسة بالمية، مية درهم).',
  'لو الموضوع محتاج تفصيل، قدّم الخلاصة واسأله في الآخر لو يحب تكمل أو تكتبهوله في الشات.',
].join('\n');

// وضع الإنجليزي: يتضاف في آخر الـ system prompt عشان يتغلّب على قواعد اللغة العربية اللي فوقه
const ENGLISH_MODE = [
  'IMPORTANT, THIS OVERRIDES ALL EARLIER LANGUAGE RULES: the user chose English for this interface.',
  '- Write every reply in clear, natural, professional English. Keep the friendly, practical tone of the rest of this prompt.',
  '- Even if the user writes in Arabic or an Arabic dialect, reply in English.',
  '- Exception: if the user explicitly asks for content in another language (for example an Arabic ad or an Arabic caption), write that content in the requested language and keep the rest of your reply in English.',
  '- Keep brand and platform names as they are. Use English examples with UAE and GCC market context where relevant.',
  '- Any HTML page you create must use <html lang="en" dir="ltr"> unless the user explicitly asks for Arabic content.',
  '- The final suggestions line must also be in English, in the same format.',
  '- Do not switch to Arabic unless the user asks. The Dubai Fans AI identity rules still apply.',
].join('\n');

const BLOCK_MESSAGE_EN = "I can't help with this request. I can help with content, marketing, ads and day-to-day business tasks. Tell me what you need.";

// يغلّف المحادثة ويسجّل صفاً واحداً في التتبع لكل طلب (نجاح أو رفض أو خطأ)
async function handleChat(req, res, user) {
  const tr = { t0: Date.now(), user_id: user.id, route: 'chat', status: 'ok', engine: '', tool: '', in_chars: 0, out_chars: 0, rag: 0, note: '' };
  try { await handleChatInner(req, res, user, tr); }
  catch (e) { tr.status = 'error'; tr.note = e.message; throw e; }
  finally { traces.record(tr); langfuse.trace(tr); adminPanel.recordChat(tr); }
}

async function handleChatInner(req, res, user, tr) {
  const body = await readJson(req, 400 * 1024);
  tr.tool = typeof body.tool === 'string' ? body.tool.slice(0, 20) : '';
  const tool = TOOL_PROMPTS[body.tool] ? body.tool : null;
  const agent = AGENTS[body.agent] ? body.agent : null;
  // اللغة: عربي افتراضياً، والإنجليزي بيتفعّل لو الواجهة اتحطّت على English
  const lang = body.lang === 'en' ? 'en' : 'ar';
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => {
      const cut = m.content.slice(0, tool === 'site_edit' ? 60000 : 12000);
      // إخفاء البيانات الحساسة (بطاقات، هوية، IBAN) قبل ما توصل للنموذج
      return { role: m.role, content: m.role === 'user' ? guards.maskPII(cut) : cut };
    });
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return fail(res, 400, 'bad_request', 'الرسالة فاضية.');

  // حاجز كسر التعليمات: نرد برسالة ثابتة بدون ما نكلّم النموذج ولا نحسب الحصة
  if (guards.isJailbreak(msgs[msgs.length - 1].content)) {
    console.warn('guard: blocked prompt-injection attempt, user', user.id);
    tr.status = 'blocked'; tr.engine = 'guard';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    sseWrite(res, { meta: { engine: 'guard' } });
    sseWrite(res, { choices: [{ delta: { content: lang === 'en' ? BLOCK_MESSAGE_EN : guards.BLOCK_MESSAGE } }] });
    res.write('data: [DONE]\n\n');
    return res.end();
  }
  const lastText = msgs[msgs.length - 1].content;
  tr.in_chars = lastText.length;
  if (inflight >= CFG.maxQueue) { tr.status = 'busy'; return fail(res, 503, 'busy', 'المساعد عليه ضغط دلوقتي. جرّب بعد دقيقة.'); }

  // أمر "احفظ: ..." يتنفّذ مباشرة في الذاكرة بدون النموذج، ولا يُحسب من الحصة
  const saveText = memory.parseSaveCommand(lastText);
  if (saveText !== null) {
    const r = memory.add(user.id, saveText);
    const reply = r.ok
      ? (lang === 'en'
        ? (r.duplicate ? 'I already have this saved ✓' : 'Saved to my memory ✓. You can view or delete it under "My business".')
        : (r.duplicate ? 'المعلومة دي محفوظة عندي من قبل ✓' : 'تمام، حفظتها في ذاكرتي ✓. تقدر تشوفها أو تحذفها من "نشاطي التجاري".'))
      : r.message;
    tr.status = 'memory'; tr.engine = 'memory'; tr.out_chars = reply.length;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    sseWrite(res, { meta: { engine: 'memory' } });
    sseWrite(res, { choices: [{ delta: { content: reply } }] });
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // كاش: سؤال واحد بسيط بدون أداة ولا وكيل ولا صوت. الرد المخزّن ما يستهلكش حصة الرسائل ولا المحرك
  // عملاء المستخدم المذكورون في الرسالة يُضافون للسياق، والرد عليهم لا يُخزَّن في الكاش (قد يتغير بتعديل العميل)
  const custCtx = !tool && !agent ? customers.contextFor(user.id, lastText) : '';
  const cacheable = !tool && !agent && body.voice !== true && msgs.length === 1 && lastText.length <= 300 && !custCtx && !isFinanceQ(lastText);
  const ck = cacheable ? cacheKey(user, lastText, lang) : null;
  const hit = ck ? cacheGet(ck) : null;
  if (hit) {
    tr.status = 'cache'; tr.engine = 'cache'; tr.out_chars = hit.length;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    sseWrite(res, { meta: { engine: 'cache' } });
    for (let i = 0; i < hit.length; i += 60) sseWrite(res, { choices: [{ delta: { content: hit.slice(i, i + 60) } }] });
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const kind = tool === 'search' ? 'search' : tool === 'slides' ? 'slides' : 'messages';
  let release;
  // الرسائل تُحسب حسب حجم السياق والنموذج المختار؛ البحث والعروض بتكلفتها الثابتة
  const chatCost = kind === 'messages' ? chatCreditCost(msgs, typeof body.model === 'string' ? body.model : 'auto') : undefined;
  try { release = reserve(user, kind, chatCost); }
  catch (e) { tr.status = 'quota'; return fail(res, e.status, e.code, e.message, { kind: e.kind }); }

  inflight += 1;
  const controller = new AbortController();
  let finished = false;
  // المحادثات المحفوظة على السيرفر: الرد يكمل حتى لو أُغلقت الصفحة، ويُحفظ عند اكتماله.
  // الإيقاف الصريح يتم عبر /api/chat/stop فقط.
  const chatId = typeof body.chatId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.chatId) ? body.chatId : null;
  const reqId = typeof body.reqId === 'string' ? body.reqId.slice(0, 64) : '';
  const persistUserText = String(([...raw].reverse().find((m) => m && m.role === 'user' && typeof m.content === 'string') || {}).content || '').slice(0, 20000);
  if (reqId) activeReqs.set(reqId, { uid: user.id, c: controller });
  res.on('close', () => { if (!finished && !chatId) controller.abort(); });

  try {
    let system = BASE_SYSTEM + (body.useProfile === false ? '' : business.chatContext(user.id));
    // ذاكرة المستخدم: أقرب المعلومات للسؤال الحالي (مع رجوع للأحدث لو التضمين فشل)
    const memHits = body.useMemory !== false && !tool && !agent ? await memory.retrieve(user.id, lastText) : [];
    if (body.useMemory !== false && !tool && !agent) system += memory.contextBlock(memHits);
    if (!agent) system += aiTools.contextBlock(user.id);
    system += custCtx;
    // أرقام النشاط (دخل ومصروفات ورواتب) تُضاف فقط لو السؤال عن المال أو الموظفين
    if (!tool && !agent && isFinanceQ(lastText)) {
      system += ops.contextBlock(user.id);
    }
    if (agent) system += '\n\n' + AGENTS[agent].prompt;
    if (tool) system += '\n\n' + TOOL_PROMPTS[tool];
    // الصوت العربي (ردّ مقروء بصوت إماراتي) بس للعربي؛ في وضع الإنجليزي بنرد نص عادي
    const voice = lang === 'ar' && body.voice === true && (!tool || tool === 'write' || tool === 'search');
    // النموذج ما يعرفش تاريخ اليوم، فنحطه صراحة عشان ما يخمّنش
    system += `\n\nتاريخ اليوم (توقيت الإمارات): ${dayKey()}. لو سُئلت عن اليوم أو التاريخ، استخدم هذا التاريخ بالضبط.`;
    // قاعدة المعرفة: للأسئلة العامة (بدون وكيل أو صوت)، والبحث يتم فقط لو القاعدة فيها محتوى
    if (!agent && !voice && !tool) {
      const hits = await kb.retrieve(lastText);
      tr.rag = hits.length;
      system += kb.contextBlock(hits);
    }
    if (voice) system += '\n\n' + VOICE_PROMPT;
    else if (!tool || tool === 'write' || tool === 'search') system += '\n\n' + SUGGEST_PROMPT;

    let sources = [];
    if (tool === 'search') {
      try { sources = await webSearch(msgs[msgs.length - 1].content); }
      catch (e) { console.error('search failed:', e.message); }
      system += sources.length
        ? '\n\nنتائج البحث (بتاريخ اليوم):\n' + sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n')
        : '\n\nلم يرجع البحث أي نتائج. أخبر المستخدم بذلك وأجب من معرفتك العامة مع التنبيه.';
    }

    // آخر تعليمة في الـ system prompt: وضع الإنجليزي بيتغلّب على قواعد العربية اللي فوقه
    if (lang === 'en') system += '\n\n' + ENGLISH_MODE;
    const maxTokens = tool === 'site' || tool === 'site_edit' ? 8000 : voice ? 600 : 2500;
    let stream;
    // توجيه التكلفة: الأسئلة القصيرة البسيطة للنموذج الصغير، والباقي للنموذج الأساسي
    // اختيار النموذج حسب نوع الطلب (model-router.js): كل نوع له نموذجه، والافتراضي زي ما كان
    const route = modelRouter.pickRoute({ tool, agent, voice, msgCount: msgs.length, text: lastText,
      models: { small: CFG.cfSmallModel, site: CFG.siteModel, analysis: CFG.analysisModel, chat: CFG.chatModel } });
    if (route.kind !== 'chat') tr.note = 'route:' + route.kind;
    // اختيار المستخدم من القائمة: لو مش auto، بنستخدم النموذج ده بالتحديد (من غير رجوع لمحرك تاني)
    const pick = typeof body.model === 'string' ? body.model : 'auto';
    if (!availableModels().some((m) => m.id === pick)) { release(); tr.status = 'bad_request'; return fail(res, 400, 'model', 'النموذج المختار غير متاح.'); }
    if (pick !== 'auto') tr.note = 'model:' + pick;
    const only = pick === 'auto' ? null : pick;
    // النموذج داخل كل مسار: لو المستخدم اختار نموذج بعينه بنحترمه، لو auto بنستخدم نموذج المسار (null = الافتراضي)
    const cfPick = pick === 'small' ? CFG.cfSmallModel : pick === 'auto' ? route.model : null;
    // نسجّل اسم النموذج المستخدم فعلاً عشان نتحقق من الاختيار من السجل
    if (cfPick) tr.note = (tr.note ? tr.note + ' ' : '') + 'cfm:' + cfPick;
    try { stream = await openStream([{ role: 'system', content: system }, ...msgs], maxTokens, controller.signal, cfPick, only); }
    catch (e) {
      release();
      if (controller.signal.aborted) { tr.status = 'aborted'; return; }
      tr.status = 'upstream';
      console.error('model unavailable:', e.message);
      return fail(res, 500, 'upstream', 'تعذّر الوصول لمحرك الذكاء الاصطناعي. جرّب بعد شوية.');
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    sseWrite(res, { meta: { engine: stream.engine } });
    tr.engine = stream.engine;
    if (sources.length) sseWrite(res, { sources });

    const filter = makeThinkFilter();
    const scrub = guards.makeNameScrubber();
    const loop = guards.makeLoopGuard();
    let got = false;
    let looped = false;
    let rawTail = ''; // آخر ما أخرجه النموذج، للتشخيص لو الحارس أوقف الرد
    let full = '';
    const emit = (text) => { if (text) { got = true; full += text; sseWrite(res, { choices: [{ delta: { content: text } }] }); } };
    try {
      for await (const s of sseText(stream.body)) {
        const clean = filter.push(s);
        if (!clean) continue;
        rawTail = (rawTail + clean).slice(-300);
        if (loop.push(clean)) { looped = true; break; } // يوقف قراءة البث من المحرك
        emit(scrub.push(clean));
      }
      if (!looped) {
        const rest = filter.flush();
        if (rest && loop.push(rest)) looped = true;
        else { emit(scrub.push(rest)); emit(scrub.flush()); }
      }
      tr.out_chars = full.length;
      if (looped) {
        tr.status = 'degenerate';
        console.error('degenerate model output stopped', 'engine=' + stream.engine, JSON.stringify(rawTail));
        sseWrite(res, { error: { code: 'degenerate', message: 'الرد طلع مش مفهوم فتوقّف. اطلب نفس الطلب بصيغة أبسط وجرّب تاني.' } });
      } else {
        // نحفظ الدورة قبل [DONE]: حين تصل الواجهة للنهاية يكون الرد محفوظاً على السيرفر
        if (chatId && got) {
          try { chatsMod.persistTurn(db, user.id, chatId, { userText: persistUserText, reply: full, sources, tool: tool || '', agent: agent || '' }); }
          catch (e) { console.error('chat persist failed:', e.message); }
        }
        if (!res.destroyed && !res.writableEnded) res.write('data: [DONE]\n\n');
        if (ck && got) cacheSet(ck, full.trim());
      }
    } catch (e) {
      tr.status = controller.signal.aborted ? 'aborted' : 'stream_error';
      tr.note = e.message;
      if (!controller.signal.aborted) {
        console.error('stream error:', e.message);
        if (!got) sseWrite(res, { error: { message: 'المحرك وقف فجأة. جرّب تاني.' } });
      }
    }
    // ما نحسبش الرسالة لو مفيش رد مفيد أو الرد اتوقف كمخرجات معطوبة
    if (!got || looped) release();
    if (!res.writableEnded) res.end();
  } finally {
    inflight -= 1;
    finished = true;
    if (reqId) activeReqs.delete(reqId);
  }
}

// ---------------- توليد الصور ----------------
let imageInflight = 0;

// نماذج الصور مبتكتبش عربي، فالكلام بيتفصل عن الصورة ويتركّب فوقها في المتصفح بخط عربي حقيقي.
const IMAGE_PLANNER = [
  'You are a senior art director at a top advertising agency in Dubai. The user (often writing in Arabic) asks for a marketing image or ad.',
  'You plan ONE professional social-media ad: a photo generated by an AI image model, plus Arabic text that our designer will typeset on it in a fixed layout.',
  'Return ONLY a JSON object, no markdown, with these keys:',
  '"prompt": an English prompt (60-110 words) for the photo, written like a commercial photographer brief: the hero subject (product, dish, service, place or people), styling and props, setting, camera angle and lens (e.g. 50mm, macro, top-down), lighting (softbox, golden hour, rim light), color grading, depth of field, and "high-end commercial advertising photography, ultra detailed, sharp focus". Gulf/UAE context when relevant (modest clothing, local architecture) without clichés.',
  '  The photo must contain NO text, letters, numbers, signs, labels, packaging text, brand names or logos.',
  '"layout": one of "hero" (full photo, text over a dark fade at the bottom; best for lifestyle, food, places), "split" (photo on top, solid color panel with text below; best for products, services, explanations with bullets), "frame" (brand color background with the photo in a rounded card; elegant, good for beauty, clinics, real estate), "offer" (photo with a big round badge; ONLY when the user gives a discount, price or offer), "minimal" (light clean background, luxury/quiet brands), "clean" (no text at all).',
  '"headline": main Arabic text (max 6 words), punchy and benefit-led, like real Gulf ad copy. Use the exact text the user asked to write if they gave one.',
  '"sub": supporting line (max 12 words) or "". Never describe the image and never use the words صورة or إعلان.',
  '"bullets": array of 0-3 very short benefit points (max 4 words each); only for "split" or "frame", else [].',
  '"cta": short button text like "اطلب الآن" or "احجز موعدك" or "تسوّق الآن" or "".',
  '"badge": short badge text ONLY if the user gave it (e.g. "خصم 30%", "99 درهم", "جديد") else "".',
  '"palette": {"primary": "#hex", "accent": "#hex"}: a refined brand-like pair that matches the subject (primary = deep background/panel color, accent = button/highlight color with good contrast).',
  '"caption": the ready-to-post Arabic caption for Instagram/TikTok (3-6 short lines): a hook first line, the benefit/offer, a clear call to action. Natural Gulf-friendly Arabic in the dialect the user writes in (or simple MSA), 1-3 fitting emojis max. Use placeholders like [رقم الواتساب] or [الرابط] instead of inventing contact details.',
  '"hashtags": array of 8-12 relevant hashtags without spaces (mix Arabic and English, local ones like #دبي #الامارات when relevant), each starting with #.',
  '"best_time": {"instagram": "...", "tiktok": "..."}: short Arabic advice on the best days/hours to post for a UAE/Gulf audience in this industry (UAE time), e.g. "الأحد إلى الخميس 8–10 مساءً".',
  'If the user asks for a plain photo, or says no text (بدون كتابة / بدون نص / صورة فقط / without text), set layout "clean" and headline, sub, cta, badge to "" and bullets to [].',
  'Never invent prices, discounts, phone numbers, addresses, dates or brand names the user did not give. If business info is provided, match its industry and audience.',
].join('\n');

const PRODUCT_MODE = [
  'PRODUCT MODE: the user attached a photo of a real item (its description is given below).',
  'Add the key "use_product": true if they want to advertise THIS exact item (default when they say منتجي / المنتج / هذا / ده / دي / حطه / or give no other subject), or false if they only want a new image in a similar style (مشابه / زيها / نفس الستايل / مستوحى).',
  'When use_product is true, the "prompt" MUST start with: "Use the exact product from image 0, unchanged (same shape, colors, label and proportions)," and then describe only the new professional scene around it: surface, background, props, lighting, camera angle. Never re-describe or redesign the product itself.',
].join('\n');

const LAYOUTS = ['hero', 'split', 'frame', 'offer', 'minimal', 'clean'];
const COMPOSITION = {
  hero: ', subject placed in the upper two thirds, calm darker area in the lower third',
  split: ', subject centered with breathing room, clean background',
  frame: ', subject centered, elegant clean background',
  offer: ', subject slightly off-center to the left, clean area on the right',
  minimal: ', subject centered on a light minimal background, lots of negative space',
  clean: '',
};

function parsePlan(raw) {
  const s = String(raw || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const j = JSON.parse(s.slice(a, b + 1));
    const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || '').trim()) ? String(v).trim() : '');
    const prompt = clean(j.prompt, 1800);
    if (!prompt) return null;
    const layout = LAYOUTS.includes(j.layout) ? j.layout : 'hero';
    const pal = j.palette && typeof j.palette === 'object' ? j.palette : {};
    const overlay = {
      layout,
      headline: clean(j.headline, 80),
      sub: clean(j.sub, 140),
      cta: clean(j.cta, 30),
      badge: clean(j.badge, 24),
      bullets: Array.isArray(j.bullets) ? j.bullets.map((x) => clean(x, 40)).filter(Boolean).slice(0, 3) : [],
      primary: hex(pal.primary),
      accent: hex(pal.accent),
    };
    const bt = j.best_time && typeof j.best_time === 'object' ? j.best_time : {};
    const tags = Array.isArray(j.hashtags) ? j.hashtags.map((x) => String(x || '').trim().replace(/\s+/g, '_')).filter(Boolean)
      .map((x) => (x[0] === '#' ? x : '#' + x)).slice(0, 15).map((x) => x.slice(0, 40)) : [];
    const caption = String(j.caption || '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, 1200);
    const post = caption ? { caption, hashtags: tags, times: { instagram: clean(bt.instagram, 120), tiktok: clean(bt.tiktok, 120) } } : null;
    if (layout === 'clean') Object.assign(overlay, { headline: '', sub: '', cta: '', badge: '', bullets: [] });
    if (layout === 'offer' && !overlay.badge) overlay.layout = 'hero';
    return { prompt, overlay, post, useProduct: j.use_product === true };
  } catch { return null; }
}

// نماذج الصور بتكتب العربي معكوس ومكسّر، فممنوع أي حرف عربي أو كلام مقتبس يوصلها
function cleanImagePrompt(t) {
  return String(t || '')
    .replace(/<think>[\s\S]*?<\/think>/g, ' ')
    .replace(/["“”«»][^"“”«»]{0,120}["“”«»]/g, ' ')
    .replace(/[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, ' ')
    .replace(/\b(text|words?|letters?|typography|caption|headline|title|slogan|logo)\s+(that\s+)?(says|saying|reads|reading|written)[^,.]*[,.]?/gi, ' ')
    .replace(/\b(arabic|english)\s+(text|letters|calligraphy|script|words|font|typography|writing)\b/gi, ' ')
    .replace(/\s+/g, ' ').replace(/^[\s"',.:-]+|[\s"',.:-]+$/g, '').slice(0, 1500);
}
// لو المستخدم طلب كلام معيّن على الصورة ("اكتب عليها: ...") ناخده زي ما هو
function askedText(p) {
  const m = /(?:اكتب(?:\s*عليها|\s*عليه)?|مكتوب(?:\s*عليها|\s*عليه)?|بعنوان|عنوانها|النص|الجملة)\s*[:：-]?\s*["«“]?([^"»”\n،,.]{2,70})/.exec(String(p || ''));
  return m ? m[1].trim() : '';
}

// بيولّد إعلان كامل: خطة (كلام وتنسيق وكابشن) + صورة. بيستخدمه المساعد وواجهة الشركاء (API)
// opts: { prompt, reference, productBuf, bizInfo, brand: {primary, accent}, occasionColors }
async function generateAd(opts) {
  const prompt = opts.prompt;
  const productBuf = opts.productBuf || null;
  const NO_TEXT = ', clean image without any text, no letters, no words, no typography, no captions, no logos, no watermark';
  let english = '';
  let post = null;
  let useProduct = false;
  let overlay = { layout: 'hero', headline: '', sub: '', cta: '', badge: '', bullets: [], primary: '', accent: '' };
  const bizInfo = String(opts.bizInfo || '').slice(0, 900);
  const userMsg = (opts.reference
    ? `${prompt}\n\nReference image the user uploaded (create a NEW original image with a similar style, composition, colors and mood; do not copy logos or brand names):\n${opts.reference}`
    : prompt) + (bizInfo ? `\n\nBusiness info:${bizInfo}` : '');
  // محاولتين للخطة (JSON)، وبعدين ترجمة بسيطة لو فشلت
  for (let attempt = 0; attempt < 2 && !english; attempt += 1) {
    try {
      const raw = await complete([
        { role: 'system', content: IMAGE_PLANNER + (productBuf ? '\n' + PRODUCT_MODE : '') + (attempt ? '\nIMPORTANT: reply with the JSON object only.' : '') },
        { role: 'user', content: userMsg },
      ], 1300, 50000);
      const plan = parsePlan(raw);
      if (plan) { english = plan.prompt; overlay = plan.overlay; post = plan.post; useProduct = !!(productBuf && plan.useProduct); }
    } catch (e) { console.error('image plan failed:', e.message); }
  }
  if (!english) {
    try {
      english = await complete([
        { role: 'system', content: 'Translate the image request into one vivid English prompt for a text-to-image model (subject, composition, style, lighting, colors). Never include any text, letters, words or names to write in the image. Output only the English prompt.' },
        { role: 'user', content: userMsg },
      ], 200, 30000);
    } catch (e) { console.error('prompt translate failed:', e.message); }
  }
  if (!overlay.headline) overlay.headline = askedText(prompt);
  // ألوان هوية العلامة المحفوظة ليها الأولوية (إلا في حملات المواسم لو طلبت ألوان المناسبة)
  const br = opts.brand || {};
  if (opts.occasionColors !== true) {
    if (br.primary) overlay.primary = br.primary;
    if (br.accent) overlay.accent = br.accent;
  }
  if (useProduct && !/image 0/i.test(english)) english = 'Use the exact product from image 0, unchanged (same shape, colors, label and proportions), ' + english;
  english = cleanImagePrompt(english) || 'professional modern marketing advertisement photo, studio lighting, clean composition, empty space for a headline';
  if (overlay.layout && COMPOSITION[overlay.layout]) english += COMPOSITION[overlay.layout];
  let buf = null;
  const chain = [CFG.cfImageModel, CFG.cfImageFallback].filter((m, i, arr) => m && arr.indexOf(m) === i);
  for (const model of chain) {
    const t = withTimeout(90000);
    const withRef = useProduct && models.acceptsImages(model);
    const suffix = withRef ? ', do not add any new text, letters or logos to the scene, keep the product and its original label exactly as in image 0' : NO_TEXT;
    try { buf = await models.genImage(cfConn(), model, english + suffix, { width: 1024, height: 1024, images: withRef ? [productBuf] : [] }, t.signal); break; }
    catch (e) { console.error('image model failed:', e.message); }
    finally { t.done(); }
  }
  if (!buf) throw new Error('all image models failed');
  buf = await compressImage(buf);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const id = crypto.randomBytes(16).toString('hex') + (isPng ? '.png' : '.jpg');
  saveUserImage(opts.userId, id, buf);
  return { id, buf, url: `/api/images/${id}`, prompt: english, overlay, post, product: useProduct };
}
function productFromDataUrl(s) {
  const pm = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ''));
  if (!pm || !models.acceptsImages(CFG.cfImageModel)) return null;
  const b = Buffer.from(pm[1], 'base64');
  return b.length > 1000 && b.length < 900 * 1024 ? b : null;
}

async function handleImage(req, res, user) {
  if (!cfEnabled()) return fail(res, 503, 'unavailable', 'توليد الصور مش متاح حالياً.');
  const body = await readJson(req, 1024 * 1024);
  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  const reference = String(body.reference || '').trim().slice(0, 2500);
  if (prompt.length < 3) return fail(res, 400, 'bad_request', 'اكتب وصف الصورة.');
  const productBuf = productFromDataUrl(body.productImage);
  if (imageInflight >= 4) return fail(res, 503, 'busy', 'في صور كتير بتترسم دلوقتي. جرّب بعد ثواني.');

  let release;
  try { release = reserve(user, 'images'); }
  catch (e) { return fail(res, e.status, e.code, e.message, { kind: e.kind }); }

  imageInflight += 1;
  try {
    const r = await generateAd({ userId: user.id, prompt, reference, productBuf, bizInfo: business.chatContext(user.id), brand: business.brand(user.id), occasionColors: body.occasionColors === true });
    return send(res, 200, { url: r.url, prompt: r.prompt, overlay: r.overlay, post: r.post, product: r.product });
  } catch (e) {
    release();
    console.error('image failed:', e.message);
    return fail(res, 500, 'upstream', 'مقدرناش نرسم الصورة دلوقتي. جرّب تاني أو غيّر الوصف.');
  } finally {
    imageInflight -= 1;
  }
}

// ---------------- الصوت إلى نص ----------------
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('too_large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function cfRun(model, init, ms) {
  const t = withTimeout(ms);
  try {
    const r = await fetch(`${CFG.cfBase}/accounts/${CFG.cfAccount}/ai/run/${model}`, {
      method: 'POST',
      ...init,
      headers: { Authorization: `Bearer ${CFG.cfToken}`, ...(init.headers || {}) },
      signal: t.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${model} ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    return j.result || j;
  } finally { t.done(); }
}

async function handleTranscribe(req, res, user) {
  if (!cfEnabled()) return fail(res, 503, 'unavailable', 'الكتابة بالصوت مش متاحة حالياً.');
  const daily = effectivePlan(user).id === 'free' ? 30 : 300;
  if (rateLimited('stt-day:' + user.id, daily, 86400000)) return fail(res, 429, 'rate', 'استخدمت الكتابة بالصوت كتير النهارده. جرّب بكره.');
  let audio;
  try { audio = await readRaw(req, 4 * 1024 * 1024); }
  catch (e) { return fail(res, 413, 'too_large', 'التسجيل طويل. سجّل أقل من دقيقتين.'); }
  if (audio.length < 1500) return fail(res, 400, 'empty', 'التسجيل قصير أوي. اتكلم شوية وبعدين دوس إيقاف.');
  try {
    let text = '';
    try {
      const r = await cfRun(CFG.cfSttModel, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audio.toString('base64'),
          task: 'transcribe',
          language: 'ar',
          initial_prompt: 'محادثة باللغة العربية عن التسويق الرقمي والإعلانات والسوشيال ميديا والمبيعات في الإمارات.',
        }),
      }, 60000);
      text = r.text || (Array.isArray(r.segments) ? r.segments.map((x) => x.text).join(' ') : '');
    } catch (e) {
      console.error('stt turbo failed:', e.message);
      const r = await cfRun('@cf/openai/whisper', { headers: { 'Content-Type': 'application/octet-stream' }, body: audio }, 60000);
      text = r.text || '';
    }
    text = String(text).replace(/\s+/g, ' ').trim().slice(0, 4000);
    if (!text) return fail(res, 422, 'no_speech', 'مسمعناش كلام واضح. قرّب من المايك وجرّب تاني.');
    return send(res, 200, { text });
  } catch (e) {
    console.error('stt failed:', e.message);
    return fail(res, 500, 'upstream', 'مقدرناش نحوّل الصوت لكلام دلوقتي. جرّب تاني.');
  }
}

// ---------------- الصوت الإماراتي (Azure) ----------------
const TTS_VOICES = {
  hamdan: { name: 'ar-AE-HamdanNeural', label: 'حمدان' },
  fatima: { name: 'ar-AE-FatimaNeural', label: 'فاطمة' },
};
const ttsEnabled = () => Boolean(CFG.azureKey && CFG.azureRegion);
const ttsUsage = new Map(); // user:day -> حروف
const xmlEsc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function handleTts(req, res, user) {
  if (!ttsEnabled()) return fail(res, 503, 'unavailable', 'الصوت الإماراتي مش متفعّل.');
  const body = await readJson(req);
  const text = String(body.text || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '')
    .replace(/[*#_`>|~]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 3000);
  if (!text) return fail(res, 400, 'bad_request', 'مفيش كلام يتقري.');
  const voice = TTS_VOICES[body.voice] || TTS_VOICES.hamdan;
  const key = user.id + ':' + dayKey();
  const used = ttsUsage.get(key) || 0;
  const cap = effectivePlan(user).id === 'free' ? 4000 : 40000;
  if (used + text.length > cap) return fail(res, 429, 'quota', 'خلص رصيد الصوت النهارده. الردود هتتقري بصوت الجهاز.');
  ttsUsage.set(key, used + text.length);
  const rate = Math.max(-20, Math.min(20, Number(body.rate) || -4));
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ar-AE"><voice name="${voice.name}"><prosody rate="${rate >= 0 ? '+' : ''}${rate}%">${xmlEsc(text)}</prosody></voice></speak>`;
  const t = withTimeout(30000);
  try {
    const r = await fetch(CFG.azureTtsUrl || `https://${CFG.azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': CFG.azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'dubai-fans-ai',
      },
      body: ssml,
      signal: t.signal,
    });
    if (!r.ok) {
      ttsUsage.set(key, Math.max(0, (ttsUsage.get(key) || 0) - text.length));
      const msg = await r.text().catch(() => '');
      console.error('tts failed:', r.status, msg.slice(0, 200));
      return fail(res, r.status === 429 ? 429 : 500, 'upstream', 'الصوت الإماراتي مش متاح دلوقتي.');
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
    return res.end(buf);
  } catch (e) {
    ttsUsage.set(key, Math.max(0, (ttsUsage.get(key) || 0) - text.length));
    console.error('tts error:', e.message);
    return fail(res, 500, 'upstream', 'الصوت الإماراتي مش متاح دلوقتي.');
  } finally { t.done(); }
}
setInterval(() => { const d = dayKey(); for (const k of ttsUsage.keys()) if (!k.endsWith(':' + d)) ttsUsage.delete(k); }, 3600000).unref();

// ---------------- فهم الصور المرفوعة ----------------
const VISION_PROMPT = 'Describe this image for a marketing assistant who must help the user create something similar. ' +
  'Cover: what it is (ad, social media post, product photo, logo, website or app screenshot, document, menu, etc.), the subject and products, ' +
  'layout and composition, color palette (approximate hex codes), typography style, mood and visual style, and transcribe ANY text in the image exactly in its original language (Arabic stays Arabic). ' +
  'Be specific and concise, max 180 words. Plain text, no markdown.';
let visionAgreed = false;

async function describeImage(dataUrl) {
  const errors = [];
  const pick = (r) => String((r && (r.response || r.description || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || '').trim();
  // 1) نموذج حديث بصيغة الرسائل المتعددة الوسائط
  try {
    const r = await cfRun(CFG.cfVisionModel, {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: [{ type: 'text', text: VISION_PROMPT }, { type: 'image_url', image_url: { url: dataUrl } }] }],
        max_tokens: 500,
      }),
    }, 60000);
    const t = pick(r);
    if (t) return t;
    errors.push('empty');
  } catch (e) { errors.push(e.message); }
  // 2) احتياطي: Llama 3.2 Vision (محتاج موافقة على الترخيص أول مرة)
  const llama32 = '@cf/meta/llama-3.2-11b-vision-instruct';
  const call32 = () => cfRun(llama32, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: VISION_PROMPT }], image: dataUrl, max_tokens: 500 }),
  }, 60000);
  try {
    let r;
    try { r = await call32(); }
    catch (e) {
      if (!visionAgreed && /agree|licen[cs]e/i.test(e.message)) {
        await cfRun(llama32, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'agree' }) }, 30000).catch(() => {});
        visionAgreed = true;
        r = await call32();
      } else throw e;
    }
    const t = pick(r);
    if (t) return t;
    errors.push('empty32');
  } catch (e) { errors.push(e.message); }
  throw new Error('vision failed: ' + errors.join(' | ').slice(0, 400));
}

async function handleVision(req, res, user) {
  if (!cfEnabled()) return fail(res, 503, 'unavailable', 'قراءة الصور مش متاحة حالياً.');
  const body = await readJson(req, 3 * 1024 * 1024);
  const image = String(body.image || '');
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 2.8 * 1024 * 1024) {
    return fail(res, 400, 'bad_request', 'الصورة مش مدعومة. جرّب صورة JPG أو PNG.');
  }
  let release;
  try { release = reserve(user, 'messages'); }
  catch (e) { return fail(res, e.status, e.code, e.message, { kind: e.kind }); }
  try {
    const description = (await describeImage(image)).slice(0, 2500);
    return send(res, 200, { description });
  } catch (e) {
    release();
    console.error(e.message);
    return fail(res, 500, 'upstream', 'مقدرناش نقرا الصورة دلوقتي. جرّب تاني أو صورة تانية.');
  }
}

// ---------------- توجيه طلبات أداة الصور: صورة؟ تصميم نصوص؟ ولا كلام عادي؟ ----------------
const DESIGN_ROUTER = [
  'You route requests inside the "image generation" tool of an Arabic marketing assistant. Read the recent conversation and decide what the LATEST user message needs.',
  'Return ONLY a JSON object with keys:',
  '"action": one of',
  '  "chat" = the user is talking, giving instructions for later ("I will send you..."), asking a question, giving feedback, or the request is unclear. Nothing to draw yet.',
  '  "text_design" = the user wants TEXT laid out as designed image(s): lists, comments, quotes, tips, steps, FAQs, price lists, menus, schedules, offers, testimonials they provided, or a list of text they pasted (now or in an earlier message) to be put in a design.',
  '  "image" = the user wants a visual picture/photo/ad scene drawn.',
  '"reply": for "chat": a short helpful reply in the user\'s Arabic dialect (max 3 sentences). For "text_design" and "image": one short Arabic sentence saying what you will make now. Do NOT ask questions when the request is clear enough to act on; the user wants the design immediately.',
  'IMPORTANT: act first, do not interrogate. For a design request, choose sensible defaults yourself (portrait 1080x1350, dark theme, a clean professional layout). If the brand name or details are missing, use a generic professional wording instead of asking. Ask at most ONE short question, and only when the request has no content at all.',
  '"title": for text_design: short Arabic title for the design (e.g. "التعليقات المقترحة").',
  '"subtitle": optional short Arabic line or "".',
  '"items": for text_design ONLY when the user did NOT paste the list themselves: write the requested items in Arabic (max 12, each max 140 chars). Otherwise [].',
  '"size": "portrait" (default, 1080x1350), "square", or "story" if the user asked.',
  '"theme": "dark" (default), "light", or "brand".',
  'Never invent prices, phone numbers or names the user did not give.',
].join('\n');

function listFromText(t) {
  const lines = String(t || '').split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-*•▪◦·]|\(?\d{1,3}[).:\-]|[٠-٩]{1,3}[).:\-])\s*/, '').trim()).filter((l) => l.length >= 2);
  return lines.length >= 3 ? lines.slice(0, 200).map((l) => l.slice(0, 300)) : [];
}

// ---------------- حملات المواسم ----------------
// التواريخ الهجرية تقريبية (بتتحدد برؤية الهلال)
const OCCASIONS = [
  { id: 'white_friday', name: 'الجمعة البيضاء', date: '2026-11-27', colors: false, idea: 'أكبر موسم تخفيضات في الخليج' },
  { id: 'uae_union', name: 'عيد الاتحاد الـ55 (اليوم الوطني الإماراتي)', date: '2026-12-02', colors: true, idea: 'الاحتفال بذكرى قيام اتحاد دولة الإمارات، بروح الفخر والانتماء وألوان العلم (الأحمر والأخضر والأبيض والأسود) بدون رسم علم أو شعارات رسمية' },
  { id: 'new_year', name: 'رأس السنة 2027', date: '2027-01-01', colors: false, idea: 'بداية سنة جديدة وعروض ومناسبات نهاية العام' },
  { id: 'ramadan', name: 'شهر رمضان المبارك', date: '2027-02-08', approx: true, colors: false, idea: 'أجواء رمضانية روحانية وعائلية: فوانيس وهلال وإفطار وسحور، وعروض رمضان' },
  { id: 'eid_fitr', name: 'عيد الفطر', date: '2027-03-10', approx: true, colors: false, idea: 'تهنئة وفرحة العيد والعيدية وهدايا وعروض العيد' },
  { id: 'mothers_day', name: 'عيد الأم', date: '2027-03-21', colors: false, idea: 'تكريم الأم وهدايا لها' },
  { id: 'eid_adha', name: 'عيد الأضحى', date: '2027-05-16', approx: true, colors: false, idea: 'تهنئة عيد الأضحى وأجواء العيد والعائلة' },
  { id: 'back_to_school', name: 'العودة للمدارس', date: '2027-08-23', approx: true, colors: false, idea: 'تجهيزات العودة للمدارس وعروض للأهالي والطلاب' },
];
function upcomingOccasions(n) {
  const today = Date.now() - 86400000;
  return OCCASIONS.filter((o) => Date.parse(o.date + 'T23:59:59+04:00') >= today).slice(0, n || 3)
    .map((o) => ({ id: o.id, name: o.name, date: o.date, approx: !!o.approx, days: Math.max(0, Math.ceil((Date.parse(o.date + 'T00:00:00+04:00') - Date.now()) / 86400000)) }));
}
const CAMPAIGN_PLANNER = [
  'أنت مدير حملات تسويقية في دبي. صمّم حملة سوشيال ميديا قصيرة لمناسبة معيّنة لنشاط تجاري.',
  'أعد كائن JSON فقط بدون أي شرح، بهذه المفاتيح:',
  '"title": اسم قصير وجذاب للحملة.',
  '"intro": 2-4 جمل للعميل تشرح فكرة الحملة وخطة النشر (متى ينشر كل تصميم بالنسبة لتاريخ المناسبة).',
  '"posts": مصفوفة من 5 عناصر، كل عنصر {"role": وصف قصير لدور المنشور (مثل: تهنئة، العرض، منتج مميز، ستوري تذكير، شكر للعملاء)، "when": متى ينشر (مثل: قبل المناسبة بـ 3 أيام)، "size": "portrait" أو "story" أو "square"، "brief": طلب تصميم إعلان واضح بالعربية (جملة أو جملتان) يصف المشهد المطلوب والفكرة والنص الرئيسي المقترح، مرتبط بالمناسبة وبنشاط العميل}.',
  'نوّع الأفكار: تهنئة بالمناسبة، العرض (فقط إذا ذكر العميل عرضاً، واكتبه كما هو بلا تغيير)، إبراز منتج أو خدمة، ستوري واحدة على الأقل، وتذكير أو شكر.',
  'لا تخترع أسعاراً أو خصومات أو أرقاماً لم يذكرها العميل. لا تطلب رسم أعلام أو شعارات رسمية أو صور شخصيات حقيقية.',
].join('\n');

async function handleCampaign(req, res, user) {
  const body = await readJson(req, 32 * 1024);
  const occ = OCCASIONS.find((o) => o.id === body.occasion);
  if (!occ) return fail(res, 400, 'bad_request', 'المناسبة مش معروفة.');
  const offer = String(body.offer || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 300);
  let release;
  try { release = reserve(user, 'messages'); }
  catch (e) { return fail(res, e.status, e.code, e.message, { kind: e.kind }); }
  try {
    const biz = business.chatContext(user.id).slice(0, 1500);
    const msg = `المناسبة: ${occ.name} بتاريخ ${occ.date}${occ.approx ? ' (تقريبي)' : ''}.\nروح المناسبة: ${occ.idea}.\n` +
      (offer ? `عرض العميل للمناسبة: ${offer}\n` : 'العميل لم يذكر عرضاً، فلا تخترع خصومات.\n') +
      (biz ? `\nبيانات النشاط:${biz}` : '\nلا توجد بيانات عن النشاط، فاجعل الحملة مناسبة لأي نشاط تجاري.');
    let plan = null;
    for (let attempt = 0; attempt < 2 && !plan; attempt += 1) {
      const out = await complete([{ role: 'system', content: CAMPAIGN_PLANNER + (attempt ? '\nأعد JSON فقط.' : '') }, { role: 'user', content: msg }], 1800, 50000);
      const a = out.indexOf('{'), b = out.lastIndexOf('}');
      try {
        const j = JSON.parse(out.slice(a, b + 1));
        const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
        const posts = (Array.isArray(j.posts) ? j.posts : []).map((x) => ({
          role: clean(x && x.role, 60), when: clean(x && x.when, 80),
          size: ['portrait', 'story', 'square'].includes(x && x.size) ? x.size : 'portrait',
          brief: clean(x && x.brief, 600),
        })).filter((x) => x.brief).slice(0, 5);
        if (posts.length >= 3) plan = { title: clean(j.title, 80) || ('حملة ' + occ.name), intro: clean(j.intro, 800), posts };
      } catch { /* محاولة تانية */ }
    }
    if (!plan) throw new Error('bad campaign plan');
    plan.posts.forEach((x) => { x.brief = `${x.brief}\n(المناسبة: ${occ.name})`; });
    return send(res, 200, { occasion: { id: occ.id, name: occ.name, date: occ.date, approx: !!occ.approx, colors: occ.colors }, ...plan });
  } catch (e) {
    release();
    console.error('campaign failed:', e.message);
    return fail(res, 500, 'upstream', 'مقدرناش نجهّز الحملة دلوقتي. جرّب تاني.');
  }
}

async function handleDesignRoute(req, res, user) {
  const body = await readJson(req, 200 * 1024);
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const msgs = raw.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 6000) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return fail(res, 400, 'bad_request', 'الرسالة فاضية.');
  let release;
  try { release = reserve(user, 'messages'); }
  catch (e) { return fail(res, e.status, e.code, e.message, { kind: e.kind }); }
  try {
    const convo = msgs.map((m) => (m.role === 'user' ? 'USER: ' : 'ASSISTANT: ') + m.content.slice(0, 1500)).join('\n\n');
    const out = await complete([{ role: 'system', content: DESIGN_ROUTER }, { role: 'user', content: convo }], 1600, 45000);
    const a = out.indexOf('{'), b = out.lastIndexOf('}');
    let j = {};
    try { j = JSON.parse(out.slice(a, b + 1)); } catch { j = {}; }
    let action = ['chat', 'text_design', 'image'].includes(j.action) ? j.action : 'image';
    // القائمة من كلام المستخدم نفسه (بنفس النص بالظبط) لو موجودة في آخر رسايله
    let items = [];
    if (action === 'text_design') {
      // 1) قائمة في الرسالة الأخيرة نفسها  2) نصوص كتبها المساعد لطلب جديد  3) قائمة بعتها المستخدم قبل كده
      const users = msgs.filter((m) => m.role === 'user');
      items = listFromText(users[users.length - 1].content);
      if (!items.length && Array.isArray(j.items)) items = j.items.map((x) => String(x || '').trim().slice(0, 300)).filter(Boolean).slice(0, 40);
      if (!items.length) for (const m of users.slice(-3, -1).reverse()) { items = listFromText(m.content); if (items.length) break; }
      if (!items.length) action = 'chat';
    } else if (action === 'image' && listFromText(msgs[msgs.length - 1].content).length >= 5) {
      action = 'text_design';
      items = listFromText(msgs[msgs.length - 1].content);
    }
    if (action === 'image') release();
    const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
    return send(res, 200, {
      action,
      reply: clean(j.reply, 600) || (action === 'chat' ? 'تمام، ابعتلي التفاصيل وأنا أجهّزها لك.' : ''),
      title: clean(j.title, 80) || 'قائمة',
      subtitle: clean(j.subtitle, 120),
      items,
      size: ['portrait', 'square', 'story'].includes(j.size) ? j.size : 'portrait',
      theme: ['dark', 'light', 'brand'].includes(j.theme) ? j.theme : 'dark',
    });
  } catch (e) {
    release();
    console.error('design route failed:', e.message);
    return send(res, 200, { action: 'image' }); // لو فشل التوجيه نكمل زي الأول
  }
}

function serveImage(req, res, id) {
  if (!/^[a-f0-9]{32}\.(jpg|png|mp4)$/.test(id)) return fail(res, 404, 'not_found', 'الصورة مش موجودة.');
  const p = path.join(IMAGE_DIR, id);
  fs.stat(p, (err, st) => {
    if (err) return fail(res, 404, 'not_found', 'الصورة مش موجودة.');
    const type = id.endsWith('.png') ? 'image/png' : id.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
    const head = { 'Content-Type': type, 'Cache-Control': 'public, max-age=2592000, immutable', 'Accept-Ranges': 'bytes' };
    // الفيديو على الأيفون محتاج Range
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
      let end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, Object.assign(head, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }));
      return fs.createReadStream(p, { start, end }).pipe(res);
    }
    res.writeHead(200, Object.assign(head, { 'Content-Length': st.size }));
    fs.createReadStream(p).pipe(res);
  });
}

// أدوات الذكاء الاصطناعي (صوت العلامة، مقيّم الجمهور، من صورة لكود)
const aiTools = aiToolsMod.init(db, {
  readJson, send, fail, reserve, rateLimited,
  complete: (m, t, ms) => complete(m, t, ms),
  cfRun: (model, init, ms) => cfRun(model, init, ms),
  visionModel: CFG.cfVisionModel,
  search: (qq) => webSearch(qq),
});

// المستشار: توصيات بانتظار الموافقة + محلل النتائج (ما بينفذش أي صرف أو نشر)
const advisor = advisorMod.init(db, {
  readJson, send, fail, rateLimited,
  complete: (m, t, ms) => complete(m, t, ms),
  youtubeKey: process.env.YOUTUBE_API_KEY || '',
});

// مهام المساعد في الخلفية (منفصلة عن مهام الصور والفيديو): كل ميزة طويلة تسجّل نوعها هنا
const tasks = tasksMod.init(db, { readJson, send, fail, rateLimited, reserve });
tasks.register('ad-benchmark', {
  quota: 'radar',
  run: (user, payload) => aiTools.runBenchmark(payload.mine, payload.rival),
});
tasks.register('advisor-market', {
  quota: null,
  run: async (user, payload) => {
    const out = await advisor.decide(user.id, payload.topic);
    if (out.error === 'no_data') throw new Error('ما لقيتش بيانات كفاية عن الموضوع. جرّب كلمة تانية.');
    if (out.error) throw new Error('مقدرناش نطلع توصية دلوقتي. جرّب موضوع تاني.');
    return { id: out.id, status: out.status };
  },
});

// ---------------- Radar والمتابعات ----------------
let radarInflight = 0;
const radarDeps = { search: (qq) => webSearch(qq), complete: (m, t, ms) => complete(m, t, ms) };
business.init(db, {
  readJson, send, fail, reserve, rateLimited, now,
  complete: (m, t, ms) => complete(m, t, ms),
  dataDir: CFG.dataDir, secret: CFG.secretKey, shopifyVersion: CFG.shopifyVersion,
});

// كود HTML من رد النموذج (```html ... ``` أو الملف نفسه)
function extractHtmlBlock(t) {
  t = String(t || '');
  const m = /```html\s*([\s\S]*?)(?:```|$)/i.exec(t);
  if (m && /<html|<!doctype/i.test(m[1])) return m[1].trim();
  const a = t.search(/<!doctype html|<html/i);
  if (a < 0) return '';
  const b = t.lastIndexOf('</html>');
  return t.slice(a, b > a ? b + 7 : undefined).trim();
}
partner.init(db, {
  readJson, send, fail, now, cfg: CFG, imageDir: IMAGE_DIR, business, cfEnabled,
  generateAd, describeImage, complete: (m, t, ms) => complete(m, t, ms),
  sitePrompt: TOOL_PROMPTS.site, baseSystem: BASE_SYSTEM, extractHtml: extractHtmlBlock,
});

async function runAndStore(userId, monitorId, input) {
  radarInflight += 1;
  try {
    const report = await radar.runRadar(input, radarDeps);
    const info = q.insertReport.run(userId, monitorId, report.input.brand, report.score, JSON.stringify(report), now());
    return { id: Number(info.lastInsertRowid), report };
  } finally { radarInflight -= 1; }
}

function monitorView(m) {
  const history = q.reportsForMonitor.all(m.id).map((r) => ({ id: r.id, score: r.score, at: r.created_at }));
  return {
    id: m.id, brand: m.brand, category: m.category, market: m.market, website: m.website,
    competitors: JSON.parse(m.competitors || '[]'), frequency: m.frequency, active: Boolean(m.active),
    unseen: Boolean(m.unseen), nextRunAt: m.next_run_at, lastReportId: m.last_report_id, history,
  };
}

// ---------------- الدفع عن طريق زينة ----------------
const ziinaEnabled = () => Boolean(CFG.ziinaKey);
const PLAN_DAYS = 30;

async function ziina(method, pathPart, body) {
  const t = withTimeout(20000);
  try {
    const r = await fetch(CFG.ziinaBase + pathPart, {
      method,
      headers: { Authorization: `Bearer ${CFG.ziinaKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: t.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`ziina ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return j;
  } finally { t.done(); }
}

// بيتنفّذ مرة واحدة بس لكل دفعة، وبيتأكد من المبلغ والعملة قبل التفعيل
function applyPaymentResult(row, intent) {
  const fresh = q.paymentById.get(row.id);
  if (!fresh || fresh.status !== 'pending') return fresh;
  const st = String(intent && intent.status || '');
  if (st === 'completed') {
    const amountOk = Number(intent.amount) === fresh.amount && String(intent.currency_code || '').toUpperCase() === 'AED';
    if (!amountOk) {
      console.error('payment amount mismatch', fresh.id, intent.amount, intent.currency_code);
      q.setPaymentStatus.run('mismatch', now(), null, fresh.id);
      return q.paymentById.get(fresh.id);
    }
    const u = q.userById.get(fresh.user_id);
    if (u) {
      const base = u.plan === fresh.plan && u.plan_until > now() ? u.plan_until : now();
      q.setPlan.run(fresh.plan, base + PLAN_DAYS * 86400000, u.id);
      q.closeRequestsFor.run(u.id, fresh.plan);
      affiliate.onPaid(fresh, u);
    }
    q.setPaymentStatus.run('completed', now(), now(), fresh.id);
    console.log('payment completed', fresh.id, fresh.plan, fresh.amount, fresh.test ? '(test)' : '');
  } else if (st === 'failed' || st === 'canceled') {
    q.setPaymentStatus.run(st, now(), null, fresh.id);
  } else {
    q.touchPayment.run(now(), fresh.id);
  }
  return q.paymentById.get(fresh.id);
}

async function checkPayment(row) {
  if (!row.intent_id || row.status !== 'pending') return row;
  const intent = await ziina('GET', `/payment_intent/${encodeURIComponent(row.intent_id)}`);
  return applyPaymentResult(row, intent);
}

async function handlePayRoutes(req, res, user, p, m) {
  if (m === 'POST' && p === '/api/pay') {
    if (!ziinaEnabled()) return fail(res, 503, 'manual', 'الدفع الأونلاين مش متاح دلوقتي.');
    if (rateLimited('pay:' + user.id, 5, 60000)) return fail(res, 429, 'rate', 'استنى دقيقة وجرّب تاني.');
    const b = await readJson(req);
    const plan = PLANS[b.plan];
    if (!plan || plan.id === 'free' || plan.hidden || !(plan.price > 0)) return fail(res, 400, 'plan', 'باقة غير صحيحة.');
    const id = crypto.randomBytes(12).toString('hex');
    const amount = Math.round(plan.price * 100);
    q.insertPayment.run(id, user.id, plan.id, amount, CFG.ziinaTest ? 1 : 0, now());
    try {
      const back = `${CFG.appUrl}/?pay=${id}`;
      const intent = await ziina('POST', '/payment_intent', {
        amount,
        currency_code: 'AED',
        message: `Dubai Fans AI — باقة ${plan.name} (${PLAN_DAYS} يوم)`,
        success_url: back,
        cancel_url: back + '&r=cancel',
        failure_url: back + '&r=failed',
        test: CFG.ziinaTest,
      });
      if (!intent.id || !intent.redirect_url) throw new Error('no redirect_url');
      q.setPaymentIntent.run(String(intent.id), id);
      return send(res, 200, { id, url: intent.redirect_url, test: CFG.ziinaTest });
    } catch (e) {
      console.error('ziina create failed:', e.message);
      q.setPaymentStatus.run('failed', now(), null, id);
      return fail(res, 500, 'upstream', 'مقدرناش نفتح صفحة الدفع دلوقتي. جرّب كمان شوية أو كلّمنا على واتساب.');
    }
  }

  const mm = p.match(/^\/api\/pay\/([a-f0-9]{24})$/);
  if (m === 'GET' && mm) {
    let row = q.paymentById.get(mm[1]);
    if (!row || row.user_id !== user.id) return fail(res, 404, 'not_found', 'الدفعة مش موجودة.');
    if (row.status === 'pending' && ziinaEnabled() && !rateLimited('paychk:' + user.id, 30, 60000)) {
      try { row = await checkPayment(row); }
      catch (e) { console.error('ziina check failed:', e.message); }
    }
    return send(res, 200, {
      status: row.status, plan: row.plan, planName: (PLANS[row.plan] || {}).name || row.plan,
      test: Boolean(row.test), me: publicUser(syncRole(q.userById.get(user.id))),
    });
  }
  return null;
}

// احتياطي: لو العميل قفل الصفحة بعد الدفع، بنراجع الدفعات المعلّقة كل دقيقة
let payBusy = false;
async function paymentsTick() {
  if (payBusy || !ziinaEnabled()) return;
  payBusy = true;
  try {
    const t = now();
    for (const row of q.pendingPayments.all(t - 6 * 3600000, t - 120000, 5)) {
      try { await checkPayment(row); }
      catch (e) { console.error('payment poll failed', row.id, e.message); q.touchPayment.run(now(), row.id); }
    }
  } finally { payBusy = false; }
}
setInterval(() => { paymentsTick().catch((e) => console.error('payments', e.message)); }, 60000).unref();

let schedulerBusy = false;
async function schedulerTick() {
  if (schedulerBusy || radarInflight >= 2) return;
  schedulerBusy = true;
  try {
    for (const m of q.dueMonitors.all(now(), 2)) {
      const owner = q.userById.get(m.user_id);
      const limit = owner && !owner.disabled ? effectivePlan(owner).limits.monitors : 0;
      if (!limit) { q.monitorDefer.run(now() + 86400000, m.id); continue; }
      try {
        const { id } = await runAndStore(m.user_id, m.id, {
          brand: m.brand, category: m.category, market: m.market, website: m.website, competitors: JSON.parse(m.competitors || '[]'),
        });
        q.monitorDone.run(id, now() + (radar.FREQ_MS[m.frequency] || radar.FREQ_MS.weekly), m.id);
      } catch (e) {
        console.error('monitor run failed', m.id, e.message);
        q.monitorDefer.run(now() + 3600000, m.id);
      }
    }
  } finally { schedulerBusy = false; }
}
setInterval(() => { schedulerTick().catch((e) => console.error('scheduler', e.message)); }, 60000).unref();

async function handleRadarRoutes(req, res, user, p, m) {
  if (m === 'POST' && p === '/api/radar') {
    if (rateLimited('radar:' + user.id, 3, 60000)) return fail(res, 429, 'rate', 'استنى دقيقة قبل تحليل جديد.');
    if (radarInflight >= 3) return fail(res, 503, 'busy', 'في تحليلات كتير شغّالة دلوقتي. جرّب بعد دقيقة.');
    const body = await readJson(req);
    const input = radar.sanitizeInput(body);
    if (input.brand.length < 2 || input.category.length < 2) return fail(res, 400, 'bad_request', 'اكتب اسم العلامة ومجال النشاط.');
    let release;
    try { release = reserve(user, 'radar'); }
    catch (e) { return fail(res, e.status, e.code, e.message, { kind: e.kind }); }
    try {
      const { id, report } = await runAndStore(user.id, null, input);
      return send(res, 200, { id, report });
    } catch (e) {
      release();
      console.error('radar failed', e.message);
      return fail(res, e.status || 502, e.code || 'upstream', e.status === 400 ? e.message : 'مقدرناش نكمّل التحليل دلوقتي. جرّب تاني بعد شوية.');
    }
  }

  if (m === 'GET' && p === '/api/radar/reports') {
    return send(res, 200, { reports: q.reportsForUser.all(user.id).map((r) => ({ id: r.id, monitorId: r.monitor_id, brand: r.brand, score: r.score, at: r.created_at })) });
  }

  let mm = p.match(/^\/api\/radar\/reports\/(\d+)$/);
  if (m === 'GET' && mm) {
    const r = q.reportById.get(Number(mm[1]), user.id);
    if (!r) return fail(res, 404, 'not_found', 'التقرير مش موجود.');
    if (r.monitor_id) q.monitorSeen.run(r.monitor_id, user.id);
    return send(res, 200, { id: r.id, monitorId: r.monitor_id, report: JSON.parse(r.report) });
  }

  if (m === 'GET' && p === '/api/monitors') {
    const limit = effectivePlan(user).limits.monitors;
    return send(res, 200, { limit, monitors: q.monitorsForUser.all(user.id).map(monitorView) });
  }

  if (m === 'POST' && p === '/api/monitors') {
    const limit = effectivePlan(user).limits.monitors;
    if (!limit) return fail(res, 429, 'quota', 'المتابعة التلقائية متاحة في الباقات المدفوعة. اشترك عشان Dubai Fans AI يتابع علامتك ومنافسينك لوحده.', { kind: 'monitors' });
    if (q.activeMonitorCount.get(user.id).n >= limit) return fail(res, 429, 'quota', `وصلت للحد الأقصى للمتابعات في باقتك (${limit}). احذف متابعة أو رقّي باقتك.`, { kind: 'monitors' });
    const body = await readJson(req);
    const input = radar.sanitizeInput(body);
    if (input.brand.length < 2 || input.category.length < 2) return fail(res, 400, 'bad_request', 'اكتب اسم العلامة ومجال النشاط.');
    const frequency = body.frequency === 'daily' ? 'daily' : 'weekly';
    const info = q.insertMonitor.run(user.id, input.brand, input.category, input.market, JSON.stringify(input.competitors), input.website, frequency, now(), now());
    setTimeout(() => { schedulerTick().catch(() => {}); }, 500);
    return send(res, 201, { monitor: monitorView(q.monitorById.get(Number(info.lastInsertRowid), user.id)) });
  }

  mm = p.match(/^\/api\/monitors\/(\d+)$/);
  if (m === 'DELETE' && mm) { q.deleteMonitor.run(Number(mm[1]), user.id); return send(res, 200, { ok: true }); }

  mm = p.match(/^\/api\/monitors\/(\d+)\/active$/);
  if (m === 'POST' && mm) {
    const body = await readJson(req);
    const mon = q.monitorById.get(Number(mm[1]), user.id);
    if (!mon) return fail(res, 404, 'not_found', 'المتابعة مش موجودة.');
    if (body.active && !mon.active) {
      const limit = effectivePlan(user).limits.monitors;
      if (q.activeMonitorCount.get(user.id).n >= limit) return fail(res, 429, 'quota', `وصلت للحد الأقصى للمتابعات في باقتك (${limit}).`, { kind: 'monitors' });
    }
    q.setMonitorActive.run(body.active ? 1 : 0, mon.id, user.id);
    return send(res, 200, { ok: true });
  }
  return null;
}

// ---------------- الموجّه ----------------
// ---------------- مهام الخلفية ----------------
// توليد الصورة كمهمة: نفس منطق handleImage، لكن النتيجة تُحفظ في جدول المهام
async function runImageJob(input, userId) {
  const user = q.userById.get(Number(userId));
  if (!user) throw new Error('الحساب مش موجود.');
  if (!cfEnabled()) throw new Error('توليد الصور مش متاح حالياً.');
  const release = reserve(user, 'images'); // يرمي خطأ برسالة عربية لو الحصة خلصت
  try {
    const r = await generateAd({
      userId: user.id,
      prompt: String(input.prompt || '').slice(0, 1500),
      reference: String(input.reference || '').slice(0, 2500),
      productBuf: productFromDataUrl(input.productImage),
      bizInfo: business.chatContext(user.id),
      brand: business.brand(user.id),
      occasionColors: input.occasionColors === true,
    });
    return { url: r.url, prompt: r.prompt, overlay: r.overlay, post: r.post, product: r.product };
  } catch (e) {
    release();
    throw new Error('مقدرناش نرسم الصورة دلوقتي. جرّب تاني أو غيّر الوصف.');
  }
}
// فيديو الريلز من نفس التصميم: خدمة الرسم (dfai-render) بتطلع MP4 على السيرفر
async function renderCall(pathPart, body, ms) {
  if (!CFG.renderUrl || !CFG.renderToken) throw new Error('خدمة الفيديو مش متاحة حالياً.');
  const r = await fetch(CFG.renderUrl.replace(/\/$/, '') + pathPart, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + CFG.renderToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error('render ' + r.status);
  return r;
}

async function runVideoJob(input, userId) {
  const user = q.userById.get(Number(userId));
  if (!user) throw new Error('الحساب مش موجود.');
  const im = /^([a-f0-9]{32}\.(?:jpg|png))$/.exec(String(input.imageId || ''));
  if (!im) throw new Error('الصورة مش صالحة للفيديو.');
  const file = path.join(IMAGE_DIR, im[1]);
  if (!fs.existsSync(file)) throw new Error('الصورة اتمسحت. ولّد التصميم من جديد.');
  const buf = fs.readFileSync(file);
  const ov = input.overlay || {};
  const design = {
    layout: String(ov.layout || 'hero'),
    headline: String(ov.headline || '').slice(0, 80),
    sub: String(ov.sub || '').slice(0, 140),
    cta: String(ov.cta || '').slice(0, 80),
    badge: String(ov.badge || '').slice(0, 80),
    bullets: Array.isArray(ov.bullets) ? ov.bullets.map((x) => String(x).slice(0, 40)).slice(0, 3) : [],
    primary: /^#[0-9a-fA-F]{6}$/.test(ov.primary) ? ov.primary : '#0B0D13',
    accent: /^#[0-9a-fA-F]{6}$/.test(ov.accent) ? ov.accent : '#7C5CFF',
    font: 'Readex Pro',
    logo: false,
    size: 'portrait',
  };
  const b = business.brand(user.id) || {};
  const brand = {
    name: b.name || '',
    whatsapp: b.whatsapp || '',
    site: String(b.website || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    instagram: b.instagram || '',
  };
  const duration = Math.max(6, Math.min(15, Number(input.duration) || 8));
  const release = reserve(user, 'images');
  const photo = `data:image/${buf[0] === 0x89 ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`;
  let mp4;
  try {
    const r = await renderCall('/video', { photo, logo: null, design, brand, duration }, 180000);
    mp4 = Buffer.from(await r.arrayBuffer());
  } catch (e) {
    release();
    console.error('video render failed:', e.message);
    throw new Error('مقدرناش نعمل الفيديو دلوقتي. جرّب تاني بعد شوية.');
  }
  if (mp4.length < 10000) { release(); throw new Error('الفيديو طلع فاضي. جرّب تصميم تاني.'); }
  const id = crypto.randomBytes(16).toString('hex') + '.mp4';
  saveUserImage(userId, id, mp4);
  return { url: `/api/images/${id}`, duration };
}

const jobs = jobsMod.init(db);
// إشعار عند اكتمال المهمة: لو فشل الإرسال ما يأثرش على المهمة نفسها
const notifyJob = (title, body) => (fn) => async (input, userId) => {
  const result = await fn(input, userId);
  pushSvc.notifyUser(userId, { title, body, url: '/' }).catch(() => {});
  return result;
};
jobs.startWorker({
  image: notifyJob('دبي فانز AI', 'صورتك جاهزة ✅ افتح التطبيق تشوفها')(runImageJob),
  video: notifyJob('دبي فانز AI', 'الفيديو جاهز ✅ افتح التطبيق تشوفه')(runVideoJob),
});

async function route(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  const ip = clientIp(req);

  if (m === 'GET' && p === '/api/health') return send(res, 200, { ok: true, cloud: cfEnabled(), search: Boolean(CFG.searxUrl) });

  const img = p.match(/^\/api\/images\/([^/]+)$/);
  if (m === 'GET' && img) return serveImage(req, res, img[1]);

  if (m === 'GET' && p === '/api/config') {
    return send(res, 200, {
      plans: Object.values(PLANS).filter((pl) => !pl.hidden).map((pl) => ({ ...pl, currency: 'AED', purchaseUrl: CFG.purchaseUrls[pl.id] || '' })),
      agents: Object.entries(AGENTS).map(([id, a]) => ({ id, name: a.name })),
      features: { images: cfEnabled(), search: Boolean(CFG.searxUrl), voice: cfEnabled(), attach: cfEnabled(), tts: ttsEnabled() ? Object.keys(TTS_VOICES).map((id) => ({ id, label: TTS_VOICES[id].label })) : [] },
      contactUrl: CFG.contactUrl,
      onlinePay: ziinaEnabled(),
    });
  }

  // تجربة الزائر بدون تسجيل: نص إعلاني واحد، 3 مرات كل 24 ساعة لكل IP
  if (m === 'POST' && p === '/api/guest/generate') {
    const gip = clientIp(req);
    if (!cfEnabled() || process.env.GUEST_TRIAL === '0') return fail(res, 503, 'off', 'التجربة مش متاحة دلوقتي. سجّل حساب مجاني عشان تكمّل.');
    if (rateLimited('guest-day:' + gip, 3, 86400000)) return fail(res, 429, 'quota', 'خلصت تجاربك الثلاثة النهارده. سجّل حساب مجاني عشان تكمّل.');
    if (rateLimited('guest-hr:' + gip, 10, 3600000)) return fail(res, 429, 'rate', 'طلبات كتير. جرّب بعد شوية.');
    const gb = await readJson(req);
    const brief = String(gb.text || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (brief.length < 5) return fail(res, 400, 'input', 'اكتب وصف قصير للمنتج أو النشاط.');
    if (guards.isJailbreak(brief)) return fail(res, 400, 'blocked', guards.BLOCK_MESSAGE);
    const GUEST_PROMPT = 'انت مساعد تسويق. اكتب نص إعلاني قصير ومقنع بالعربية (وبالإنجليزية لو الوصف إنجليزي)، في 3 إلى 5 أسطر، مع هاشتاجين. لا تخترع أسعاراً أو عروضاً غير مذكورة في الوصف.';
    try {
      const text = await complete([{ role: 'system', content: GUEST_PROMPT }, { role: 'user', content: guards.maskPII(brief) }], 350, 30000);
      return send(res, 200, { text });
    } catch (e) {
      console.error('guest generate failed:', e.message);
      return fail(res, 502, 'model', 'حصلت مشكلة في توليد النص. جرّب بعدين.');
    }
  }

  if (m === 'POST' && p === '/api/auth/register') {
    if (rateLimited('reg:' + ip, 8, 3600000)) return fail(res, 429, 'rate', 'محاولات كتير. جرّب بعد شوية.');
    const b = await readJson(req);
    const name = String(b.name || '').trim().slice(0, 80);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (name.length < 2) return fail(res, 400, 'name', 'اكتب اسمك.');
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'email', 'البريد الإلكتروني مش صحيح.');
    if (password.length < 8 || password.length > 200) return fail(res, 400, 'password', 'كلمة المرور لازم تكون 8 حروف على الأقل.');
    if (q.userByEmail.get(email)) return fail(res, 409, 'exists', 'البريد ده مسجّل قبل كده. سجّل دخولك.');
    const role = CFG.adminEmails.includes(email) ? 'admin' : 'user';
    const info = q.insertUser.run(name, email, hashPassword(password), role, now());
    if (b.ref) affiliate.attach(Number(info.lastInsertRowid), b.ref);
    const user = q.userById.get(Number(info.lastInsertRowid));
    return send(res, 201, { token: createSession(user), ...publicUser(user) });
  }

  if (m === 'POST' && p === '/api/auth/login') {
    if (rateLimited('login:' + ip, 20, 900000)) return fail(res, 429, 'rate', 'محاولات كتير. جرّب بعد 15 دقيقة.');
    const b = await readJson(req);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const user = email ? q.userByEmail.get(email) : null;
    if (!user || !verifyPassword(password, user.pass_hash)) return fail(res, 401, 'invalid', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    if (user.disabled) return fail(res, 403, 'disabled', 'الحساب ده متوقف. تواصل معنا.');
    syncRole(user);
    return send(res, 200, { token: createSession(user), ...publicUser(user) });
  }

  const ph = await partner.routes(req, res, p, m);
  if (ph !== null) return;

  // ---- MCP (بروتوكول JSON-RPC عبر HTTP) لـChatGPT وClaude: مفتاح المستخدم dfk_... ----
  if (p === '/api/mcp' && m === 'POST') {
    const h = String(req.headers.authorization || '');
    const uid = apiKeys.resolve(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
    const mUser = uid ? q.userById.get(uid) : null;
    if (!mUser || mUser.disabled) return fail(res, 401, 'auth', 'المفتاح غير صالح أو ملغي.');
    if (rateLimited('mcp:' + mUser.id, 30, 60000)) return fail(res, 429, 'rate', 'طلبات كتير. استنى دقيقة.');
    const msg = await readJson(req, 64 * 1024);
    const reply = (result) => send(res, 200, { jsonrpc: '2.0', id: msg.id ?? null, result });
    const rpcErr = (code, message) => send(res, 200, { jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });
    if (msg.id === undefined) return send(res, 202, {}); // إشعار بدون رد
    if (msg.method === 'initialize') return reply({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'dubai-fans-ai', version: '1.0.0' } });
    if (msg.method === 'ping') return reply({});
    if (msg.method === 'tools/list') return reply({ tools: MCP_TOOLS });
    if (msg.method === 'tools/call') {
      const name = msg.params && msg.params.name;
      const a = (msg.params && msg.params.arguments) || {};
      const out = (obj, isError) => reply({ content: [{ type: 'text', text: JSON.stringify(obj) }], isError: Boolean(isError) });
      if (name === 'whoami') return out({ ok: true, name: mUser.name });
      if (name === 'create_image') {
        const prompt = String(a.prompt || '').trim();
        if (prompt.length < 3) return out({ error: 'اكتب وصف الصورة.' }, true);
        if (!cfEnabled()) return out({ error: 'توليد الصور مش متاح حالياً.' }, true);
        const job = jobs.create(mUser.id, 'image', { prompt: prompt.slice(0, 1500), reference: String(a.reference || '').trim().slice(0, 2500), productImage: null, occasionColors: false });
        return out({ jobId: job.id, status: job.status || 'queued', hint: 'استخدم get_job بالمعرّف لتعرف النتيجة بعد لحظات.' });
      }
      if (name === 'get_job') {
        const job = jobs.get(mUser.id, String(a.jobId || ''));
        return job ? out({ jobId: job.id, status: job.status, result: job.result || null, error: job.error || null }) : out({ error: 'المهمة غير موجودة.' }, true);
      }
      return rpcErr(-32602, 'أداة غير معروفة: ' + name);
    }
    return rpcErr(-32601, 'الطريقة غير مدعومة: ' + msg.method);
  }

  // ---- MCP: مفتاح خاص بالمستخدم (dfk_...) يعمل على هذه المسارات فقط ----
  if (p.startsWith('/api/mcp/')) {
    const h = String(req.headers.authorization || '');
    const uid = apiKeys.resolve(h.startsWith('Bearer ') ? h.slice(7).trim() : '');
    const mcpUser = uid ? q.userById.get(uid) : null;
    if (!mcpUser || mcpUser.disabled) return fail(res, 401, 'auth', 'المفتاح غير صالح أو ملغي.');
    if (rateLimited('mcp:' + mcpUser.id, 30, 60000)) return fail(res, 429, 'rate', 'طلبات كتير. استنى دقيقة.');
    if (m === 'GET' && p === '/api/mcp/whoami') return send(res, 200, { ok: true, name: mcpUser.name });
    if (m === 'POST' && p === '/api/mcp/image') {
      const body = await readJson(req, 64 * 1024);
      const prompt = String(body.prompt || '').trim();
      if (prompt.length < 3) return fail(res, 400, 'bad_request', 'اكتب وصف الصورة.');
      if (!cfEnabled()) return fail(res, 503, 'unavailable', 'توليد الصور مش متاح حالياً.');
      const job = jobs.create(mcpUser.id, 'image', {
        prompt: prompt.slice(0, 1500),
        reference: String(body.reference || '').trim().slice(0, 2500),
        productImage: null,
        occasionColors: false,
      });
      return send(res, 202, { job });
    }
    const jm = /^\/api\/mcp\/jobs\/([^/]+)$/.exec(p);
    if (m === 'GET' && jm) {
      const job = jobs.get(mcpUser.id, jm[1]);
      return job ? send(res, 200, { job }) : fail(res, 404, 'not_found', 'المهمة غير موجودة.');
    }
    return fail(res, 404, 'not_found', 'المسار غير موجود.');
  }

  const user = authUser(req);
  if (!user) return fail(res, 401, 'auth', 'سجّل دخولك الأول.');

  // مفاتيح MCP الخاصة بالحساب: إنشاء وعرض وإلغاء (بجلسة الحساب فقط)
  if (m === 'GET' && p === '/api/keys') return send(res, 200, { keys: apiKeys.list(user.id) });
  if (m === 'POST' && p === '/api/keys') {
    const body = await readJson(req, 4 * 1024);
    try { return send(res, 201, apiKeys.create(user.id, body.label)); }
    catch (e) { return fail(res, e.status || 500, 'keys', e.message); }
  }
  const kd = /^\/api\/keys\/(\d+)$/.exec(p);
  if (m === 'DELETE' && kd) {
    return apiKeys.revoke(user.id, kd[1]) ? send(res, 200, { ok: true }) : fail(res, 404, 'not_found', 'المفتاح غير موجود.');
  }

  // برنامج الإحالة: كود المستخدم ورابطه وعمولاته
  if (p === '/api/affiliate' && m === 'GET') return send(res, 200, affiliate.summary(user.id, CFG.appUrl));

  // مراقبة الويب المظلم: فحص كلمة مرور (بدون حفظها) وفحص إيميل الحساب
  if (p === '/api/darkweb/status' && m === 'GET') return send(res, 200, { emailEnabled: darkweb.enabled() });
  if (p === '/api/darkweb/password' && m === 'POST') {
    const b = await readJson(req, 4 * 1024);
    const r = await darkweb.checkPassword(user.id, b.password);
    return r.ok ? send(res, 200, r) : fail(res, 400, 'darkweb', r.message);
  }
  if (p === '/api/darkweb/email' && m === 'POST') {
    const r = await darkweb.checkEmail(user.id, user.email);
    return r.ok ? send(res, 200, r) : fail(res, r.configured === false ? 503 : 400, 'darkweb', r.message);
  }

  // ذاكرة المستخدم: عرض، إضافة يدوية، وحذف
  if (p === '/api/memory' && m === 'GET') return send(res, 200, { items: memory.list(user.id), max: memoryMod.MAX_PER_USER });
  if (p === '/api/memory' && m === 'POST') {
    const b = await readJson(req);
    const r = memory.add(user.id, b.text);
    return r.ok ? send(res, 201, r) : fail(res, 400, 'memory', r.message);
  }
  const memDel = p.match(/^\/api\/memory\/(\d+)$/);
  if (m === 'DELETE' && memDel) return send(res, 200, { ok: memory.remove(user.id, memDel[1]) });

  // الإشعارات: المفتاح العام، الاشتراك، الإلغاء، وإرسال تجريبي
  if (p === '/api/push/key' && m === 'GET') return send(res, 200, { publicKey: pushSvc.publicKey(), enabled: pushSvc.enabled() });
  if (p === '/api/push/subscribe' && m === 'POST') {
    const r = pushSvc.add(user.id, (await readJson(req)).subscription);
    return r.ok ? send(res, 201, r) : fail(res, 400, 'push', r.message);
  }
  if (p === '/api/push/unsubscribe' && m === 'POST') {
    return send(res, 200, { ok: pushSvc.remove(user.id, (await readJson(req)).endpoint) });
  }
  if (p === '/api/push/test' && m === 'POST') {
    if (!pushSvc.enabled()) return fail(res, 503, 'push', 'الإشعارات مش مفعّلة على السيرفر بعد.');
    const sent = await pushSvc.notifyUser(user.id, { title: 'دبي فانز AI', body: 'الإشعارات شغّالة ✅', url: '/' });
    return send(res, 200, { ok: true, sent });
  }

  // الموارد البشرية: موظفون وملخص الرواتب
  if (p === '/api/ops/employees' && m === 'GET') return send(res, 200, { items: ops.listEmployees(user.id), payroll: ops.payrollSummary(user.id) });
  if (p === '/api/ops/employees' && m === 'POST') {
    const r = ops.addEmployee(user.id, await readJson(req));
    return r.ok ? send(res, 201, r) : fail(res, 400, 'hr', r.message);
  }
  const empOne = p.match(/^\/api\/ops\/employees\/(\d+)$/);
  if (empOne && m === 'PUT') {
    const r = ops.updateEmployee(user.id, empOne[1], await readJson(req));
    return r.ok ? send(res, 200, r) : fail(res, r.message.includes('مش موجود') ? 404 : 400, 'hr', r.message);
  }
  if (empOne && m === 'DELETE') return send(res, 200, { ok: ops.removeEmployee(user.id, empOne[1]) });

  // دفتر دبي: بيانات الفاتورة (الرقم الضريبي ونوع النشاط)
  if (p === '/api/ops/settings' && m === 'GET') return send(res, 200, { settings: invoices.getSettings(user.id) });
  if (p === '/api/ops/settings' && m === 'PUT') {
    const r = invoices.saveSettings(user.id, await readJson(req));
    return r.ok ? send(res, 200, r) : fail(res, 400, 'settings', r.message);
  }

  // الفواتير: إنشاء، عرض، دفع، حذف (غير المدفوعة)، وHTML قابل للطباعة
  if (p === '/api/ops/invoices' && m === 'GET') return send(res, 200, { items: invoices.listInvoices(user.id) });
  if (p === '/api/ops/invoices' && m === 'POST') {
    const r = invoices.createInvoice(user.id, await readJson(req));
    return r.ok ? send(res, 201, r) : fail(res, 400, 'invoice', r.message);
  }
  const invOne = p.match(/^\/api\/ops\/invoices\/(\d+)$/);
  if (invOne && m === 'GET') {
    const inv = invoices.getInvoice(user.id, invOne[1]);
    return inv ? send(res, 200, inv) : fail(res, 404, 'not_found', 'الفاتورة مش موجودة.');
  }
  if (invOne && m === 'DELETE') return send(res, 200, { ok: invoices.removeInvoice(user.id, invOne[1]) });
  const invPaid = p.match(/^\/api\/ops\/invoices\/(\d+)\/paid$/);
  if (invPaid && m === 'POST') {
    const r = invoices.markPaid(user.id, invPaid[1]);
    return r.ok ? send(res, 200, r) : fail(res, 400, 'invoice', r.message);
  }
  const invHtml = p.match(/^\/api\/ops\/invoices\/(\d+)\/html$/);
  if (invHtml && m === 'GET') {
    const inv = invoices.getInvoice(user.id, invHtml[1]);
    if (!inv) return fail(res, 404, 'not_found', 'الفاتورة مش موجودة.');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(invoices.invoiceHtml(inv));
  }
  if (p === '/api/ops/vat' && m === 'GET') return send(res, 200, invoices.vatReport(user.id, url.searchParams.get('month') || ''));

  // المحاسبة: قيود الدخل والمصروف وملخص الشهر
  if (p === '/api/ops/ledger' && m === 'GET') {
    const month = url.searchParams.get('month') || '';
    return send(res, 200, { ...ops.listEntries(user.id, month), summary: ops.monthSummary(user.id, month) });
  }
  if (p === '/api/ops/ledger' && m === 'POST') {
    const r = ops.addEntry(user.id, await readJson(req));
    return r.ok ? send(res, 201, r) : fail(res, 400, 'ledger', r.message);
  }
  const entOne = p.match(/^\/api\/ops\/ledger\/(\d+)$/);
  if (entOne && m === 'PUT') {
    const r = ops.updateEntry(user.id, entOne[1], await readJson(req));
    return r.ok ? send(res, 200, r) : fail(res, r.message.includes('مش موجود') ? 404 : 400, 'ledger', r.message);
  }
  if (entOne && m === 'DELETE') return send(res, 200, { ok: ops.removeEntry(user.id, entOne[1]) });
  if (p === '/api/ops/payroll' && m === 'POST') return send(res, 200, ops.postPayroll(user.id, (await readJson(req)).month));
  if (p === '/api/ops/year' && m === 'GET') return send(res, 200, ops.yearSummary(user.id, url.searchParams.get('year') || ''));
  if (p === '/api/ops/export' && m === 'GET') {
    const out = ops.exportCsv(user.id, url.searchParams.get('month') || '');
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dfai-ledger-${out.month}.csv"`,
      'Cache-Control': 'no-store',
    });
    return res.end(out.csv);
  }

  // العملاء: بحث وعرض وإضافة وتعديل وحذف (كل مستخدم يرى عملاءه فقط)
  if (p === '/api/customers' && m === 'GET') {
    return send(res, 200, { items: customers.find(user.id, url.searchParams.get('q') || '', Number(url.searchParams.get('limit')) || 100), max: customersMod.MAX_PER_USER });
  }
  if (p === '/api/customers' && m === 'POST') {
    const r = customers.add(user.id, await readJson(req));
    return r.ok ? send(res, 201, r) : fail(res, 400, 'customer', r.message);
  }
  const custOne = p.match(/^\/api\/customers\/(\d+)$/);
  if (custOne && m === 'PUT') {
    const r = customers.update(user.id, custOne[1], await readJson(req));
    return r.ok ? send(res, 200, r) : fail(res, r.message.includes('مش موجود') ? 404 : 400, 'customer', r.message);
  }
  if (custOne && m === 'DELETE') return send(res, 200, { ok: customers.remove(user.id, custOne[1]) });

  // الجلسات النشطة: القائمة بدون أي بيانات حساسة (مفيش توكن ولا hash)
  if (m === 'GET' && p === '/api/auth/sessions') {
    const cur = sha256(String(req.headers.authorization || '').slice(7).trim());
    const rows = q.listUserSessions.all(user.id, now());
    return send(res, 200, { sessions: rows.map((r) => ({ created_at: r.created_at, expires_at: r.expires_at, current: r.token_hash === cur })) });
  }
  // النماذج المتاحة للاختيار في الشات (من غير أسماء المزوّدين)
  if (m === 'GET' && p === '/api/models') return send(res, 200, { models: availableModels() });
  // إنهاء كل الجلسات التانية (الجلسة الحالية بتفضل)
  if (m === 'POST' && p === '/api/auth/logout-others') {
    const cur = sha256(String(req.headers.authorization || '').slice(7).trim());
    const r = q.deleteOtherSessions.run(user.id, cur);
    return send(res, 200, { ok: true, removed: Number(r.changes || 0) });
  }

  if (m === 'POST' && p === '/api/auth/logout') {
    q.deleteSession.run(sha256(String(req.headers.authorization || '').slice(7).trim()));
    return send(res, 200, { ok: true });
  }

  if (m === 'GET' && p === '/api/me') return send(res, 200, publicUser(syncRole(user)));

  // تصدير بيانات الحساب (JSON) من غير أي مفاتيح أو أسرار
  if (m === 'GET' && p === '/api/me/export') {
    if (rateLimited('export:' + user.id, 5, 3600000)) return fail(res, 429, 'rate', 'طلبات كتير. جرّب بعد ساعة.');
    return send(res, 200, accountExport(user.id));
  }
  // حذف الحساب نهائياً: لازم كلمة المرور وكتابة DELETE للتأكيد
  if (m === 'POST' && p === '/api/me/delete') {
    if (rateLimited('delete:' + user.id, 5, 3600000)) return fail(res, 429, 'rate', 'محاولات كتير. جرّب بعد ساعة.');
    const b = await readJson(req);
    if (String(b.confirm || '') !== 'DELETE') return fail(res, 400, 'confirm', 'اكتب DELETE للتأكيد.');
    const fresh = q.userById.get(user.id);
    if (!fresh || !verifyPassword(String(b.password || ''), fresh.pass_hash)) return fail(res, 401, 'invalid', 'كلمة المرور غير صحيحة.');
    deleteAccount(user.id);
    return send(res, 200, { ok: true });
  }

  // زر الإيقاف: يوقف رد الدردشة الجاري (وما يتحفظش) لو المستخدم هو صاحبه
  if (m === 'POST' && p === '/api/chat/stop') {
    const b = await readJson(req, 4096);
    const r = activeReqs.get(String(b.reqId || '').slice(0, 64));
    if (r && r.uid === user.id) r.c.abort();
    return send(res, 200, { ok: true });
  }

  if (m === 'POST' && p === '/api/chat') {
    if (rateLimited('chat:' + user.id, 30, 60000)) return fail(res, 429, 'rate', 'رسائل كتير ورا بعض. استنى دقيقة.');
    return handleChat(req, res, user);
  }

  if (m === 'POST' && p === '/api/image') {
    if (rateLimited('img:' + user.id, 6, 60000)) return fail(res, 429, 'rate', 'صور كتير ورا بعض. استنى دقيقة.');
    return handleImage(req, res, user);
  }

  // نفس توليد الصورة، لكن المهمة تتنفذ في الخلفية ويرجع المستخدم برقم المهمة فوراً
  if (m === 'POST' && p === '/api/jobs/image') {
    if (rateLimited('jimg:' + user.id, 10, 60000)) return fail(res, 429, 'rate', 'صور كتير ورا بعض. استنى دقيقة.');
    const body = await readJson(req, 1024 * 1024);
    const prompt = String(body.prompt || '').trim();
    if (prompt.length < 3) return fail(res, 400, 'bad_request', 'اكتب وصف الصورة.');
    if (!cfEnabled()) return fail(res, 503, 'unavailable', 'توليد الصور مش متاح حالياً.');
    const job = jobs.create(user.id, 'image', {
      prompt: prompt.slice(0, 1500),
      reference: String(body.reference || '').trim().slice(0, 2500),
      productImage: typeof body.productImage === 'string' ? body.productImage : null,
      occasionColors: body.occasionColors === true,
    });
    return send(res, 202, { job });
  }
  // فيديو ريلز من صورة مولّدة: يتنفذ في الخلفية على السيرفر
  if (m === 'POST' && p === '/api/jobs/video') {
    if (rateLimited('jvid:' + user.id, 4, 3600000)) return fail(res, 429, 'rate', 'فيديوهات كتير. جرّب بعد شوية.');
    const body = await readJson(req, 64 * 1024);
    const im = /^\/api\/images\/([a-f0-9]{32}\.(?:jpg|png))$/.exec(String(body.imageUrl || ''));
    if (!im) return fail(res, 400, 'bad_request', 'الصورة مش صالحة للفيديو.');
    if (!body.overlay || typeof body.overlay !== 'object') return fail(res, 400, 'bad_request', 'التصميم ناقص. ولّد التصميم من جديد.');
    const job = jobs.create(user.id, 'video', { imageId: im[1], overlay: body.overlay, duration: 8 });
    return send(res, 202, { job });
  }
  // سجل المحادثات على السيرفر (تسجيل الدخول مطلوب، والاحتفاظ 90 يوماً داخل chats.js)
  if (p === '/api/chats' || p.startsWith('/api/chats/')) {
    if (await chatsMod.handle({ db, req, res, user, p, m, readJson, send, fail })) return;
  }
  if (m === 'GET' && p === '/api/jobs') return send(res, 200, { jobs: jobs.list(user.id) });
  if (m === 'POST' && p === '/api/jobs/seen') { jobs.markAllSeen(user.id); return send(res, 200, { ok: true }); }
  const jobMatch = p.match(/^\/api\/jobs\/([a-f0-9]{24})$/);
  if (m === 'GET' && jobMatch) {
    const job = jobs.get(user.id, jobMatch[1]);
    return job ? send(res, 200, { job }) : fail(res, 404, 'not_found', 'المهمة مش موجودة.');
  }

  // صفحات الهبوط: حصة يومية (مجاني 2، مدفوع 10)، وتُخصم من رصيد النقاط بعد النشر فقط
  if (p === '/api/landing') {
    if (m === 'GET') {
      const paid = effectivePlan(user).id !== 'free';
      const quota = landing.checkQuota(db, user.id, dayKey(), paid);
      const pages = db.prepare('SELECT id, slug, status, url, error, created_at FROM landing_pages WHERE user_id = ? ORDER BY id DESC LIMIT 20').all(user.id);
      return send(res, 200, { used: quota.used, limit: quota.limit, costPerPage: LANDING_CREDIT_COST, pages });
    }
    if (m === 'POST') {
      if (rateLimited('landing:' + user.id, 3, 60000)) return fail(res, 429, 'rate', 'طلبات كتير ورا بعض. استنى دقيقة.');
      const body = await readJson(req, 400 * 1024);
      const paid = effectivePlan(user).id !== 'free';
      const credits = creditsFor(user);
      if (credits.limit !== -1 && credits.left < LANDING_CREDIT_COST) return fail(res, 429, 'credits', `رصيدك لا يكفي لصفحة الهبوط (${LANDING_CREDIT_COST} نقطة).`);
      const r = await landing.createLandingPage(db, {
        userId: user.id, paid, brief: body.brief, slug: body.slug, html: body.html, day: dayKey(),
        charge: (uid) => { q.creditAdd.run(uid, monthKey(), LANDING_CREDIT_COST); },
      });
      if (!r.ok) return fail(res, 400, 'landing', r.error);
      return send(res, 200, { ok: true, url: r.url, used: r.used, limit: r.limit });
    }
  }

  if (m === 'POST' && p === '/api/campaign') return handleCampaign(req, res, user);
  if (m === 'GET' && p === '/api/occasions') return send(res, 200, { occasions: upcomingOccasions(4) });
  if (m === 'POST' && p === '/api/design/route') {
    if (rateLimited('droute:' + user.id, 20, 60000)) return fail(res, 429, 'rate', 'طلبات كتير ورا بعض. استنى دقيقة.');
    return handleDesignRoute(req, res, user);
  }

  if (m === 'POST' && p === '/api/images/upload') {
    // صور بيعملها المستخدم في المتصفح (زي الموكب) بتتحفظ زي الصور المولّدة
    if (rateLimited('upl:' + user.id, 30, 60000) || rateLimited('upl-day:' + user.id, 200, 86400000)) return fail(res, 429, 'rate', 'صور كتير. استنى شوية.');
    const b = await readJson(req, 4 * 1024 * 1024);
    const mt = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
    if (!mt) return fail(res, 400, 'bad_request', 'الصورة مش مدعومة.');
    const buf = Buffer.from(mt[2], 'base64');
    const isJpg = buf[0] === 0xff && buf[1] === 0xd8, isPng = buf[0] === 0x89 && buf[1] === 0x50;
    if ((!isJpg && !isPng) || buf.length < 1000 || buf.length > 3 * 1024 * 1024) return fail(res, 400, 'bad_request', 'الصورة مش مدعومة.');
    const small = await compressImage(buf);
    const id = crypto.randomBytes(16).toString('hex') + (isPng ? '.png' : '.jpg');
    saveUserImage(user.id, id, small);
    return send(res, 200, { url: `/api/images/${id}` });
  }

  if (m === 'POST' && p === '/api/vision') {
    if (rateLimited('vision:' + user.id, 10, 60000)) return fail(res, 429, 'rate', 'صور كتير ورا بعض. استنى دقيقة.');
    return handleVision(req, res, user);
  }

  if (m === 'POST' && p === '/api/tts') {
    if (rateLimited('tts:' + user.id, 30, 60000)) return fail(res, 429, 'rate', 'طلبات صوت كتير ورا بعض.');
    return handleTts(req, res, user);
  }

  if (m === 'POST' && p === '/api/transcribe') {
    if (rateLimited('stt:' + user.id, 12, 60000)) return fail(res, 429, 'rate', 'تسجيلات كتير ورا بعض. استنى دقيقة.');
    return handleTranscribe(req, res, user);
  }

  if (p.startsWith('/api/tasks')) {
    const handled = await tasks.route(req, res, user, p, m);
    if (handled !== null) return handled;
  }

  if (p.startsWith('/api/ai-tools')) {
    const handled = await aiTools.routes(req, res, user, p, m);
    if (handled !== null) return handled;
  }

  if (p.startsWith('/api/advisor')) {
    const handled = await advisor.routes(req, res, user, p, m);
    if (handled !== null) return handled;
  }

  if (p.startsWith('/api/business')) {
    const handled = await business.routes(req, res, user, p, m);
    if (handled !== null) return handled;
  }

  if (p.startsWith('/api/radar') || p.startsWith('/api/monitors')) {
    const handled = await handleRadarRoutes(req, res, user, p, m);
    if (handled !== null) return handled;
    if (res.headersSent) return undefined;
  }

  if (p === '/api/pay' || p.startsWith('/api/pay/')) {
    const handled = await handlePayRoutes(req, res, user, p, m);
    if (handled !== null) return handled;
  }

  if (m === 'POST' && p === '/api/purchase-request') {
    const b = await readJson(req);
    const plan = PLANS[b.plan];
    if (!plan || plan.id === 'free') return fail(res, 400, 'plan', 'باقة غير صحيحة.');
    if (!q.pendingRequestFor.get(user.id, plan.id)) q.insertRequest.run(user.id, plan.id, now());
    return send(res, 200, { ok: true, purchaseUrl: CFG.purchaseUrls[plan.id] || '', contactUrl: CFG.contactUrl });
  }

  if (p.startsWith('/api/admin/')) {
    syncRole(user);
    if (user.role !== 'admin') return fail(res, 403, 'forbidden', 'مش مسموح.');
    if (await adminTeam.handle(req, res, user, p, m)) return;
    if (await adminPanel.routes(req, res, user, p, m, url)) return;

    if (m === 'GET' && p === '/api/admin/stats') {
      const d = dayKey();
      return send(res, 200, { ...q.stats.get(now(), d, d), cloud: cfEnabled(), search: Boolean(CFG.searxUrl) });
    }

    if (m === 'GET' && p === '/api/admin/users') {
      const s = String(url.searchParams.get('q') || '').trim().slice(0, 100);
      const like = `%${s}%`;
      const usage = {};
      for (const r of q.usageTodayAll.all(dayKey())) (usage[r.user_id] ||= {})[r.kind] = r.count;
      // عدد مفاتيح الربط النشطة (ChatGPT / Claude) لكل مستخدم
      const keyCounts = {};
      for (const r of db.prepare('SELECT user_id, COUNT(*) AS n FROM mcp_keys WHERE revoked_at IS NULL GROUP BY user_id').all()) keyCounts[r.user_id] = r.n;
      const users = q.listUsers.all(s, like, like).map((u) => ({ ...u, effective_plan: effectivePlan(u).id, usage_today: usage[u.id] || {}, keys_active: keyCounts[u.id] || 0 }));
      return send(res, 200, { users });
    }

    // مؤشرات المساعد (قراءة فقط): أرقام وعدّادات فقط، بدون أي نص محادثات أو ردود
    if (m === 'GET' && p === '/api/admin/assistant') {
      const day = dayKey();
      const dayStart = Date.parse(day + 'T00:00:00Z') - CFG.tzOffsetMin * 60000;
      const msgs = db.prepare('SELECT m.role AS role, COUNT(*) AS n FROM chat_messages m WHERE m.created_at >= ? GROUP BY m.role').all(dayStart);
      const msgCount = (role) => (msgs.find((x) => x.role === role) || {}).n || 0;
      const activeUsers = db.prepare('SELECT COUNT(DISTINCT c.user_id) AS n FROM chat_messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at >= ?').get(dayStart).n;
      const chatsToday = db.prepare('SELECT COUNT(*) AS n FROM chats WHERE updated_at >= ?').get(dayStart).n;
      const byTool = db.prepare("SELECT COALESCE(NULLIF(tool, ''), 'chat') AS tool, COUNT(*) AS n FROM chats WHERE updated_at >= ? GROUP BY 1 ORDER BY n DESC LIMIT 20").all(dayStart);
      const totals = db.prepare(`SELECT
          (SELECT COUNT(*) FROM chats) AS chats,
          (SELECT COUNT(DISTINCT user_id) FROM chats) AS users,
          (SELECT COUNT(*) FROM chat_messages) AS messages,
          (SELECT COALESCE(SUM(LENGTH(content) + COALESCE(LENGTH(extra), 0)), 0) FROM chat_messages) AS chars`).get();
      const bgCounts = {};
      for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM bg_tasks GROUP BY status').all()) bgCounts[r.status] = r.n;
      const bgFailed = db.prepare("SELECT id, kind, attempts, error, created_at, done_at FROM bg_tasks WHERE status = 'failed' ORDER BY id DESC LIMIT 20").all();
      return send(res, 200, {
        day,
        today: {
          chats_active: chatsToday,
          active_users: activeUsers,
          messages_user: msgCount('user'),
          messages_assistant: msgCount('assistant'),
          by_tool: byTool,
        },
        totals: { chats: totals.chats, users: totals.users, messages: totals.messages, chars: totals.chars },
        retention_days: Math.round(chatsMod.RETENTION_MS / 86400000),
        r2_enabled: r2.enabled(),
        bg: { counts: bgCounts, failed: bgFailed },
      });
    }

    // نتيجة آخر اختبار دخان (يكتبها run-smoke.sh عبر docker cp إلى مجلد البيانات)
    if (m === 'GET' && p === '/api/admin/smoke') {
      const file = path.join(CFG.dataDir, 'smoke-last-run.json');
      if (!fs.existsSync(file)) return send(res, 200, { available: false });
      try {
        const r = JSON.parse(fs.readFileSync(file, 'utf8'));
        const failures = [];
        const walk = (suite, trail) => {
          for (const s of suite.specs || []) {
            if (!s.ok) failures.push({ title: [...trail, s.title].join(' › '), file: suite.file || '' });
          }
          for (const sub of suite.suites || []) walk(sub, [...trail, sub.title].filter(Boolean));
        };
        for (const s of r.suites || []) walk(s, s.title ? [s.title] : []);
        const st = r.stats || {};
        return send(res, 200, {
          available: true,
          ran_at: st.startTime || null,
          duration_ms: Math.round(st.duration || 0),
          passed: st.expected || 0,
          failed: st.unexpected || 0,
          flaky: st.flaky || 0,
          ok: (st.unexpected || 0) === 0,
          failures: failures.slice(0, 50),
        });
      } catch (e) {
        return send(res, 200, { available: true, error: 'تعذّر قراءة نتيجة الاختبار' });
      }
    }

    if (m === 'GET' && p === '/api/admin/requests') return send(res, 200, { requests: q.listRequests.all() });

    if (m === 'GET' && p === '/api/admin/payments') {
      const d = new Date(now() + CFG.tzOffsetMin * 60000);
      const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - CFG.tzOffsetMin * 60000;
      return send(res, 200, {
        payments: q.listPayments.all(now() - 86400000),
        month: q.revenueSince.get(monthStart),
        online: ziinaEnabled(), test: CFG.ziinaTest,
      });
    }

    if (m === 'GET' && p === '/api/admin/traces') {
      const hours = Math.min(Math.max(Number(url.searchParams.get('hours')) || 24, 1), 336);
      return send(res, 200, traces.report(hours, Number(url.searchParams.get('limit')) || 100));
    }

    if (m === 'GET' && p === '/api/admin/langfuse') {
      const hours = Math.min(Math.max(Number(url.searchParams.get('hours')) || 24, 1), 168);
      return send(res, 200, await langfuseAdmin.summary(hours));
    }

    if (m === 'GET' && p === '/api/admin/sentry') {
      const hours = Math.min(Math.max(Number(url.searchParams.get('hours')) || 24, 1), 336);
      return send(res, 200, await sentryAdmin.summary(hours));
    }

    if (m === 'GET' && p === '/api/admin/affiliate') return send(res, 200, { pending: affiliate.pendingForAdmin(), rate: affiliate.RATE });
    if (m === 'POST' && p === '/api/admin/affiliate/paid') {
      const ab = await readJson(req);
      return send(res, 200, { paid: affiliate.markPaid(Array.isArray(ab.ids) ? ab.ids.slice(0, 500) : []) });
    }

    if (m === 'GET' && p === '/api/admin/kb') return send(res, 200, { docs: kb.listDocs() });

    if (m === 'POST' && p === '/api/admin/kb') {
      const b = await readJson(req, 400 * 1024);
      try {
        const doc = await kb.addDoc(b.title, b.text);
        return send(res, 201, { ok: true, doc });
      } catch (e) {
        return fail(res, e.status || 502, 'kb', e.status ? e.message : 'تعذّر حساب تمثيل المستند الآن. جرّب بعد شوية.');
      }
    }

    const kbDel = p.match(/^\/api\/admin\/kb\/([a-f0-9]{16})$/);
    if (m === 'DELETE' && kbDel) return send(res, 200, { ok: kb.removeDoc(kbDel[1]) });

    let mm = p.match(/^\/api\/admin\/users\/(\d+)\/plan$/);
    if (m === 'POST' && mm) {
      const b = await readJson(req);
      const target = q.userById.get(Number(mm[1]));
      if (!target) return fail(res, 404, 'not_found', 'المستخدم مش موجود.');
      const plan = PLANS[b.plan];
      if (!plan) return fail(res, 400, 'plan', 'باقة غير صحيحة.');
      const days = Math.max(1, Math.min(Number(b.days) || 30, 3660));
      if (plan.id === 'free') q.setPlan.run('free', null, target.id);
      else {
        const base = target.plan === plan.id && target.plan_until > now() ? target.plan_until : now();
        q.setPlan.run(plan.id, base + days * 86400000, target.id);
      }
      return send(res, 200, { ok: true, user: publicUser(q.userById.get(target.id)) });
    }

    mm = p.match(/^\/api\/admin\/users\/(\d+)\/disable$/);
    if (m === 'POST' && mm) {
      const b = await readJson(req);
      const id = Number(mm[1]);
      if (id === user.id) return fail(res, 400, 'self', 'مينفعش توقف حسابك.');
      q.setDisabled.run(b.disabled ? 1 : 0, id);
      if (b.disabled) q.deleteUserSessions.run(id);
      return send(res, 200, { ok: true });
    }

    mm = p.match(/^\/api\/admin\/requests\/(\d+)\/done$/);
    if (m === 'POST' && mm) { q.closeRequest.run(Number(mm[1])); return send(res, 200, { ok: true }); }
  }

  return fail(res, 404, 'not_found', 'المسار غير موجود.');
}

const server = http.createServer((req, res) => {
  otelHttp.middleware(req, res);
  if (req.url && req.url.startsWith('/api/')) {
    const mn = Math.floor(Date.now() / 60000);
    trafficBins.set(mn, (trafficBins.get(mn) || 0) + 1);
    for (const k of trafficBins.keys()) if (k < mn - 30) trafficBins.delete(k);
  }
  route(req, res).catch((e) => {
    console.error('error', req.method, req.url, e && e.message);
    if (!(e && e.status && e.status < 500)) sentryLite.captureException(e, { method: req.method, route: req.url });
    if (!res.headersSent) fail(res, e.status || 500, 'server', e.status === 413 ? 'الطلب كبير جداً.' : 'حصل خطأ في السيرفر.');
    else if (!res.writableEnded) res.end();
  });
});
server.requestTimeout = 0;
server.headersTimeout = 30000;
bgtasks.start(db, {
  'r2.upload': async (p) => {
    const file = path.join(IMAGE_DIR, p.file);
    if (!fs.existsSync(file)) return; // الملف حُذف (الحساب أُغلق قبل الرفع): لا نعيد رفعه
    await r2.put('files/' + p.file, fs.readFileSync(file), p.contentType);
  },
  'r2.delete': async (p) => { await r2.del(p.key); },
});
chatsMod.start(db);
server.listen(CFG.port, () => {
  console.log(`dfai-api :${CFG.port} · cloud=${cfEnabled() ? CFG.cfModel : 'off'} · local=${CFG.localModel} · search=${CFG.searxUrl ? 'on' : 'off'} · admins=${CFG.adminEmails.length}`);
});

function shutdown() { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
