/* Dubai Fans AI — اللغة: عربي (الافتراضي) أو English.
   يتحمّل قبل app.js. الترجمة بتتم بالتطابق مع النص العربي الأصلي:
   - ترجمة نصوص الصفحة (DOM) والخصائص (placeholder / aria-label / title / alt) وأي نص يتضاف بعدين
   - النصوص الديناميكية لها قواعد (RULES) بتلقط الأجزاء المتغيّرة زي اسم المستخدم
   - تغيير اللغة بيعمل إعادة تحميل للصفحة (عشان كل الواجهة تتبني من أول وجديد) */
(function () {
  'use strict';

  var KEY = 'dfai_lang';
  var lang = 'ar';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'ar') lang = saved;
  } catch (e) { /* التخزين مقفول: نفضل على العربي */ }

  var root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'en' ? 'ltr' : 'rtl';
  root.setAttribute('data-dfai-lang', lang);
  window.DFAI_LANG = lang;

  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var AR_RE = /[؀-ۿ]/;

  var EN = {
    /* ---- الدخول ---- */
    'أهلاً بك من جديد': 'Welcome back',
    'سجّل دخولك لمساعدك الذكي في التسويق الرقمي.': 'Sign in to your AI digital marketing assistant.',
    'تسجيل الدخول': 'Sign in',
    'حساب جديد مجاناً': 'Create a free account',
    'ابدأ مجاناً': 'Start for free',
    'اعمل حسابك في ثواني، ولك رسائل مجانية كل يوم.': 'Create your account in seconds, with free messages every day.',
    'الاسم': 'Name',
    'اسمك أو اسم نشاطك': 'Your name or business name',
    'البريد الإلكتروني': 'Email',
    'كلمة المرور': 'Password',
    '8 حروف على الأقل.': 'At least 8 characters.',
    'ادخل إلى المساعد': 'Open the assistant',
    'أنشئ حسابي': 'Create my account',
    'جارٍ إنشاء الحساب…': 'Creating account…',
    'جارٍ الدخول…': 'Signing in…',
    'اكتب البريد الإلكتروني وكلمة المرور.': 'Enter your email and password.',
    'اكتب اسمك.': 'Enter your name.',
    'كلمة المرور لازم تكون 8 حروف على الأقل.': 'Password must be at least 8 characters.',
    'انتهت الجلسة، سجّل دخولك تاني.': 'Your session has expired. Please sign in again.',
    'تعرّف على Dubai Fans AI': 'Learn about Dubai Fans AI',
    'المنتج': 'Product',
    'الأسعار': 'Pricing',
    'الذكاء الاصطناعي للتسويق': 'AI for marketing',
    'كتابة محتوى عربي': 'Arabic content writing',
    'تصميم إعلانات': 'Ad design',
    'تحليل SEO': 'SEO analysis',
    'المساعدة': 'Help',
    'الخصوصية': 'Privacy',
    'الشروط': 'Terms',
    'مساعد التسويق الرقمي': 'Digital Marketing Assistant',
    'عقل تسويقي واحد لكل أعمالك': 'One marketing brain for all your businesses',
    'محتوى، إعلانات، خطط، وعروض تقديمية لأي نشاط تجاري، من مكان واحد.': 'Content, ads, plans and presentations for any business, in one place.',
    'دبي فانز': 'Dubai Fans',

    /* ---- الشريط الجانبي والشريط العلوي ---- */
    'القائمة الجانبية': 'Sidebar',
    'الدخول أو إنشاء حساب': 'Sign in or create an account',
    'روابط': 'Links',
    'المساعد جاهز': 'Assistant is ready',
    'شعار دبي فانز': 'Dubai Fans logo',
    'أدوات المحرر': 'Editor tools',
    'اطلب تعديلاً من الذكاء الاصطناعي': 'Request an AI edit',
    'محادثة جديدة': 'New chat',
    'الأدوات': 'Tools',
    'المحادثات': 'Chats',
    'ابحث في محادثاتك': 'Search your chats',
    'ابحث في المحادثات': 'Search chats',
    'ثبّت التطبيق على موبايلك': 'Install the app on your phone',
    'رسائل اليوم': "Today's messages",
    'رصيد النقاط الشهري': 'Monthly credit balance',
    'يفكّر': 'Thinking',
    'رصيدك قارب على النفاد. الرصيد بيتجدد أول الشهر الجاي.': 'Your balance is almost used up. It renews at the start of next month.',
    'خلص رصيدك الشهري. الرصيد بيتجدد أول الشهر الجاي.': 'Your monthly balance is used up. It renews at the start of next month.',
    'الرسالة من 1 إلى 6 نقاط حسب طولها والنموذج · الصورة 10 · البحث 5 · العرض 10 · التحليل 5': 'A message costs 1 to 6 points by length and model · image 10 · search 5 · presentation 10 · analysis 5',
    'أهلاً بك في Dubai Fans AI': 'Welcome to Dubai Fans AI',
    'خطوات قليلة نجهّز بيها مساعدك على نشاطك': 'A few steps to set up your assistant for your business',
    'تخطي': 'Skip',
    'التالي': 'Next',
    'ابدأ': 'Start',
    'ما نوع نشاطك؟': 'What type of business do you run?',
    'متجر إلكتروني': 'Online store',
    'مطعم أو كافيه': 'Restaurant or café',
    'عيادة أو خدمات صحية': 'Clinic or health services',
    'صالون أو خدمات تجميل': 'Salon or beauty services',
    'شركة أو وكالة': 'Company or agency',
    'صانع محتوى': 'Content creator',
    'أين سوقك؟': 'Where is your market?',
    'الإمارات': 'UAE',
    'السعودية': 'Saudi Arabia',
    'الخليج': 'The Gulf',
    'مصر': 'Egypt',
    'أخرى': 'Other',
    'بأي لهجة تحب أكتب لك؟': 'Which dialect should I write in?',
    'خليجية': 'Gulf',
    'مصرية': 'Egyptian',
    'شامية': 'Levantine',
    'فصحى': 'Modern Standard Arabic',
    'إنجليزي': 'English',
    'عرّفنا بعلامتك': 'Tell us about your brand',
    'اسم العلامة': 'Brand name',
    'موقعك أو متجرك (اختياري)': 'Your website or store (optional)',
    'ماتقلقش، تقدر تغيّر ده في أي وقت': "Don't worry, you can change this any time",
    'ما الذي تريد أن نبدأ به؟': 'What would you like to start with?',
    'أنشئ محتواك الأول': 'Create your first content',
    'حلّل نشاطك التجاري': 'Analyse your business',
    'اكتشف فرص النمو': 'Find growth opportunities',
    'ترقية الباقة': 'Upgrade plan',
    'الباقات': 'Plans',
    'لوحة الإدارة': 'Admin panel',
    'الإعدادات': 'Settings',
    'الباقات والاشتراك': 'Plans & subscription',
    'تسجيل الخروج': 'Sign out',
    'مستخدم': 'User',
    'مسؤول النظام': 'System admin',
    'القائمة': 'Menu',
    'النموذج المستخدم': 'Model in use',
    'باقتك الحالية': 'Your current plan',
    'مجاني': 'Free',
    'غير محدود': 'Unlimited',
    'لسه مفيش محادثات': 'No chats yet',
    'محادثة': 'Chat',
    'حذف المحادثة': 'Delete chat',
    'حذف المحادثة دي؟': 'Delete this chat?',

    /* ---- الشاشة الرئيسية وحقل الكتابة ---- */
    'بماذا نبدأ اليوم؟': 'What shall we start today?',
    'اختر اقتراحاً أو اكتب طلبك مباشرة، والمساعد يتكفّل بالباقي.': 'Pick a suggestion or type your request, and the assistant takes care of the rest.',
    'اكتب طلبك': 'Write your request',
    'اسأل Dubai Fans AI': 'Ask Dubai Fans AI',
    'إرسال': 'Send',
    'قد يخطئ الذكاء الاصطناعي أحياناً، راجِع المعلومات المهمة قبل نشرها.': 'AI can make mistakes. Please check important information before you publish it.',

    /* ---- الأدوات (الشريط الجانبي وحقل الكتابة) ---- */
    'نشاطي التجاري': 'My business',
    'مراقبة الويب المظلم': 'Dark web monitoring',
    'كتابة': 'Writing',
    'توليد الصور': 'Image generation',
    'إنشاء فيديو': 'Create video',
    'بحث الويب': 'Web search',
    'عروض تقديمية': 'Presentations',
    'عرض تطبيقك وموقعك': 'Show your app & website',
    'افحص حساب Instagram': 'Check an Instagram account',
    'مركز الأدوات الذكية': 'AI Tools Hub',
    'المهام': 'Tasks',
    'شغّلها في الخلفية': 'Run in background',
    'هتلاقي النتيجة في تبويب المهام': 'You will find the result in the Tasks tab',
    'هتلاقي التوصية في تبويب المهام': 'You will find the recommendation in the Tasks tab',
    'هنا كل المهام اللي شغالة في الخلفية. المهمة بتكمل حتى لو قفلت الصفحة، والنتيجة بتفضل هنا.': 'Here are all the tasks running in the background. A task keeps going even if you close the page, and its result stays here.',
    'لسه ما فيش مهام.': 'No tasks yet.',
    'في الانتظار': 'Queued',
    'جارٍ التنفيذ': 'Running',
    'خلصت': 'Done',
    'فشلت': 'Failed',
    'ملغاة': 'Cancelled',
    'إلغاء': 'Cancel',
    'تحديث': 'Refresh',
    'مقارنة إعلان': 'Ad comparison',
    'توصيات المستشار': 'Advisor recommendations',
    'اتضافت توصية جديدة في تبويب المستشار ✅': 'A new recommendation was added in the Advisor tab ✅',
    'قارن بالمنافس': 'Compare with a rival',
    'ابدأ بتحليل قوة الريلز بتاعك': 'Analyze the strength of your Reels',
    'حسابي': 'My account',
    'المدفوعات': 'Payments',
    'الاستخدام': 'Usage',
    'التصميم': 'Design',
    'الاسم': 'Name',
    'البريد': 'Email',
    'الباقة': 'Plan',
    'الباقة الحالية': 'Current plan',
    'اللغة': 'Language',
    'الحالة': 'Status',
    'مشترك': 'Subscribed',
    'مجاني': 'Free',
    'التبديل للعربية': 'Switch to Arabic',
    'سجل الفواتير بيتعرض هنا قريباً. لو عايز فاتورة دلوقتي، تواصل مع الدعم.': 'Invoice history will appear here soon. For an invoice now, contact support.',
    'تغيير الباقة': 'Change plan',
    'رسائل اليوم': "Today's messages",
    'الرسائل': 'Messages',
    'الصور والإعلانات': 'Images & ads',
    'بحث الويب': 'Web search',
    'العروض التقديمية': 'Presentations',
    'المتابعة التلقائية': 'Auto monitoring',
    'جارٍ التحميل…': 'Loading…',
    'غير متاح في باقتك': 'Not available in your plan',
    'المظهر': 'Theme',
    'فاتح': 'Light',
    'داكن': 'Dark',
    'حسب الجهاز': 'System',
    'خط الواجهة': 'Interface font',
    'الافتراضي': 'Default',
    'خط النظام': 'System font',
    'خط الردود': 'Response font',
    'مطابق للواجهة': 'Match interface',
    'خط بسيط': 'Simple font',
    'حجم نص المحادثة': 'Chat text size',
    'صغير': 'Small',
    'متوسط': 'Medium',
    'كبير': 'Large',
    'عرض المحادثة': 'Chat width',
    'ضيق': 'Narrow',
    'عريض': 'Wide',
    'موقع إلكتروني': 'Website',
    'وكلاء متخصصين': 'Specialist agents',
    'مولد المحتوى': 'Content generator',
    'المتابعة التلقائية': 'Auto monitoring',
    'مثال: اكتب 3 منشورات إنستغرام لعرض نهاية الأسبوع بنبرة حماسية…': 'Example: write 3 Instagram posts for a weekend offer, with an energetic tone…',
    'اوصف الصورة: مثال: صورة إعلانية لكوب قهوة على طاولة رخام بإضاءة صباحية دافئة…': 'Describe the image: e.g. an ad photo of a coffee cup on a marble table with warm morning light…',
    'اوصف الفيديو: مثال: فيديو ريلز لعطر العود بخصم 20% بمناسبة عيد الاتحاد… (وتقدر ترفق صورة منتجك)': 'Describe the video: e.g. a Reels video for oud perfume with 20% off for National Day… (you can attach your product photo)',
    'ابحث في الويب: مثال: أحدث اتجاهات التسويق على تيك توك في الإمارات…': 'Search the web: e.g. the latest TikTok marketing trends in the UAE…',
    'موضوع العرض: مثال: عرض لحملة إطلاق متجر عطور أونلاين…': 'Presentation topic: e.g. a launch campaign deck for an online perfume store…',
    'اوصف الموقع: مثال: صفحة هبوط لصالون تجميل في دبي مع حجز عبر واتساب…': 'Describe the site: e.g. a landing page for a beauty salon in Dubai with WhatsApp booking…',

    /* ---- الوكلاء ---- */
    'استعن بوكيل متخصص': 'Get help from a specialist agent',
    'اختار الخبير المناسب، وقوله محتاج إيه بس.': 'Pick the right expert and tell them what you need.',
    'وكيل متخصص': 'Specialist agent',
    'خبير الاستراتيجية': 'Strategy expert',
    'خبير SEO': 'SEO expert',
    'خبير الإعلانات المدفوعة': 'Paid ads expert',
    'مدير السوشيال ميديا': 'Social media manager',
    'خبير المبيعات': 'Sales expert',
    'كاتب إعلاني': 'Ad copywriter',
    'خبير التسويق بالبريد': 'Email marketing expert',
    'خطط تسويق متكاملة وأهداف ومؤشرات أداء': 'Full marketing plans, goals and KPIs',
    'كلمات مفتاحية وتحسين ترتيب موقعك في جوجل': 'Keywords and improving your Google ranking',
    'حملات Meta وTikTok وSnap وGoogle': 'Meta, TikTok, Snap and Google campaigns',
    'محتوى وتقويم نشر وزيادة التفاعل': 'Content, posting calendar and more engagement',
    'عروض، سكربتات واتساب، وزيادة التحويل': 'Offers, WhatsApp scripts and higher conversion',
    'عناوين ونصوص إعلانية مقنعة': 'Persuasive headlines and ad copy',
    'رسائل وحملات بريد تزوّد الفتح والمبيعات': 'Email messages and campaigns that boost opens and sales',
    'احكيلي عن نشاطك وهدفك، وأنا أبنيلك الاستراتيجية…': 'Tell me about your business and goal, and I will build the strategy…',
    'ابعت رابط أو وصف موقعك، ونوع عملائك…': 'Send your website link or a description, and the type of your customers…',
    'إيه المنتج والميزانية والهدف من الحملة؟': 'What is the product, the budget and the goal of the campaign?',
    'إيه حسابك ونوع جمهورك؟': 'What is your account and who is your audience?',
    'إيه اللي بتبيعه، وفين العملاء بيقفوا؟': 'What do you sell, and where do customers drop off?',
    'إيه اللي محتاج تكتبه، ولمين؟': 'What do you need to write, and for whom?',
    'إيه نوع الإيميل اللي محتاجه؟': 'What kind of email do you need?',

    /* ---- اقتراحات الشاشة الرئيسية ---- */
    '📈 خطة تسويق': '📈 Marketing plan',
    'لمتجر إلكتروني جديد': 'For a new online store',
    'اعمل خطة تسويق رقمي لمدة شهر لمتجر إلكتروني جديد، مع القنوات المناسبة والميزانية التقريبية': 'Create a one-month digital marketing plan for a new online store, with suitable channels and an approximate budget',
    '📣 إعلان ممول': '📣 Paid ad',
    'لإنستغرام وسناب شات': 'For Instagram and Snapchat',
    'اكتب 3 نسخ إعلانية قصيرة لإعلان ممول على إنستغرام وسناب شات لمطعم، مع دعوة واضحة لاتخاذ إجراء': 'Write 3 short ad versions for a paid Instagram and Snapchat campaign for a restaurant, with a clear call to action',
    '🖼️ صورة إعلانية': '🖼️ Ad image',
    'لمنتج على السوشيال': 'For a product on social media',
    'صورة إعلانية احترافية لزجاجة عطر فاخرة على خلفية رخام داكن مع إضاءة ذهبية ناعمة': 'A professional ad image of a luxury perfume bottle on a dark marble background with soft golden lighting',
    '🔎 اتجاهات السوق': '🔎 Market trends',
    'بحث ويب محدّث': 'Updated web search',
    'إيه أحدث اتجاهات التسويق عبر السوشيال ميديا في الإمارات هذا العام؟': 'What are the latest social media marketing trends in the UAE this year?',
    '📊 عرض تقديمي': '📊 Presentation',
    'لحملة تسويقية': 'For a marketing campaign',
    'اعمل عرض تقديمي لحملة إطلاق منتج جديد لعميل': 'Create a presentation for a client’s new product launch campaign',
    '🌐 صفحة هبوط': '🌐 Landing page',
    'موقع جاهز في دقيقة': 'A ready site in a minute',
    'صفحة هبوط لمقهى مختص في دبي، مع قائمة المشروبات المميزة وزر طلب عبر واتساب': 'A landing page for a specialty café in Dubai, with a featured drinks menu and a WhatsApp order button',

    /* ---- الباقات والحدود ---- */
    'اختر الباقة المناسبة لنشاطك': 'Choose the right plan for your business',
    'ابدأ مجاناً، وطوّر باقتك وقت ما تحتاج. الأسعار بالدرهم الإماراتي.': 'Start for free and upgrade whenever you need. Prices are in UAE dirhams.',
    'كل أدوات التسويق بالذكاء الاصطناعي، بحدود أكبر بكتير وصوت إماراتي.': 'All AI marketing tools, with much higher limits and a UAE voice.',
    'رسالة يومياً': 'Messages per day',
    'صورة يومياً': 'Images per day',
    'بحث ويب يومياً': 'Web searches per day',
    'عرض تقديمي يومياً': 'Presentations per day',
    'تحليل Radar يومياً': 'Radar analyses per day',
    'الرسائل يومياً': 'Messages per day',
    'الصور والإعلانات يومياً': 'Images and ads per day',
    'بحث الويب يومياً': 'Web searches per day',
    'العروض التقديمية يومياً': 'Presentations per day',
    'تحليلات Radar يومياً': 'Radar analyses per day',
    'متابعة تلقائية لعلامتك ومنافسينك': 'Automatic monitoring of your brand and competitors',
    'المميزات': 'Features',
    'المجانية': 'Free',
    'بلا حد': 'Unlimited',
    'متاح': 'Available',
    'غير متاح': 'Not available',
    'مفعّلة': 'Active',
    'اشتراك لمدة 30 يوم، وتقدر تجدّده وقت ما تحب. الدفع آمن عن طريق زينة.': 'Subscription for 30 days. You can renew it whenever you like. Payment is secured by Ziina.',
    'صور': 'images',
    'بحث': 'search',
    'عروض': 'presentations',
    'صور:': 'images:',
    'بحث:': 'search:',
    'عروض:': 'presentations:',
    'شوف الباقات': 'See plans',

    /* ---- معاينة الموقع والمحرر ---- */
    'معاينة الموقع': 'Site preview',
    'كمبيوتر': 'Desktop',
    'موبايل': 'Mobile',
    'تحميل HTML': 'Download HTML',
    'حجم المعاينة': 'Preview size',
    'إغلاق': 'Close',
    'إغلاق المحرر': 'Close editor',
    'اختار نوع المحتوى، واملأ بيانات بسيطة، والباقي علينا.': 'Choose a content type, fill in a few simple details, and we will do the rest.',
    'محرر الموقع': 'Site editor',
    '✨ عدّل بالذكاء الاصطناعي: مثال: خلّي الألوان ذهبي وأسود وزوّد قسم أسعار': '✨ Edit with AI: e.g. make the colours gold and black and add a pricing section',
    'نفّذ': 'Apply',
    'تراجع': 'Undo',
    'حفظ': 'Save',
    'الأقسام': 'Sections',
    'التنسيق': 'Style',
    'اسحب الأقسام لترتيبها، واضغط على أي نص في الصفحة عشان تعدّله مباشرة.': 'Drag sections to reorder them, and click any text on the page to edit it directly.',
    'أقسام جاهزة': 'Ready-made sections',
    'اسحب قسم لأي مكان في القائمة اللي فوق، أو اضغط عليه عشان يتضاف بعد القسم المحدد.': 'Drag a section to any place in the list above, or click it to add it after the selected section.',
    'الذكاء الاصطناعي بيعدّل الصفحة…': 'AI is editing the page…',
    'الموقع في المحرر': 'Site in the editor',

    /* ---- الرسائل والمرفقات والردود ---- */
    'المساعد مرجّعش رد. جرّب تاني.': 'The assistant did not reply. Please try again.',
    'اتوقف الرد.': 'The reply was stopped.',
    'تعذّر الاتصال بالسيرفر. اتأكد من الإنترنت وجرّب تاني.': 'Could not reach the server. Check your connection and try again.',
    'حدث خطأ.': 'Something went wrong.',
    'المساعد عليه ضغط دلوقتي. جرّب بعد دقيقة.': 'The assistant is busy right now. Try again in a minute.',
    'تعذّر الوصول لمحرك الذكاء الاصطناعي. جرّب بعد شوية.': 'Could not reach the AI engine. Try again shortly.',
    'الرسالة فاضية.': 'The message is empty.',
    'رسائل كتير ورا بعض. استنى دقيقة.': 'Too many messages in a row. Wait a minute.',
    'نسخ الرد': 'Copy reply',
    'اتنسخ ✅': 'Copied ✅',
    'اتنسخ ✓': 'Copied ✓',
    'مقدرتش أنسخ، حدّد النص وانسخه يدوياً': "Couldn't copy. Select the text and copy it manually.",
    'مقدرناش ننزّل الملف. جرّب تاني.': 'Could not download the file. Please try again.',
    'تحميل الفيديو (MP4)': 'Download video (MP4)',
    'تحميل العرض PowerPoint': 'Download presentation (PowerPoint)',
    'العرض اتحمّل ✅': 'Presentation downloaded ✅',
    'افتح في المحرر': 'Open in editor',
    'تحميل التصميم': 'Download design',
    'تحميل الصورة': 'Download image',
    'الصورة بدون كتابة': 'Image without text',
    'عدّل الكتابة واللوجو': 'Edit text and logo',
    'أضف كتابة ولوجو': 'Add text and logo',
    'فيديو ريلز / تيك توك': 'Reels / TikTok video',
    'نسخة تانية': 'Another version',
    'جرّب شكل تاني لنفس الإعلان:': 'Try another look for the same ad:',
    'المصادر': 'Sources',
    'الكابشن جاهز للنشر': 'Caption ready to publish',
    'نسخ الكابشن': 'Copy caption',
    'استنى ثواني لحد ما المرفقات تجهز ⏳': 'Wait a moment until the attachments are ready ⏳',
    'المرفقات ماتقريتش. شيلها وجرّب تاني.': 'The attachments could not be read. Remove them and try again.',
    'تعذّر تحميل المكتبة': 'Could not load the library',
    'صورة مرفقة': 'Attached image',
    'صورة مولّدة': 'Generated image',
    'يكتب': 'typing',
    'إيقاف': 'Stop',
    'إنستغرام': 'Instagram',
    'تيك توك': 'TikTok',
    'عرض تقديمي': 'Presentation',
    'حملة': 'Campaign',
    'جارٍ رسم الصورة… (10 إلى 30 ثانية)': 'Drawing the image… (10 to 30 seconds)',
    'جارٍ تجهيز منتجك في مشهد احترافي… (15 إلى 40 ثانية)': 'Preparing your product in a professional scene… (15 to 40 seconds)',
    'خطأ من المحرك': 'Engine error',
    'تعذّر إكمال الصورة.': 'Could not finish the image.',
    'جارٍ فتح صفحة الدفع…': 'Opening the payment page…',
    'أو تواصل معنا مباشرة على واتساب': 'Or contact us directly on WhatsApp',
    'المحادثة الصوتية بصوت إماراتي': 'Voice chat with a UAE voice',
    'أولوية في السرعة والمميزات الجديدة': 'Priority speed and early access to new features',

    /* ---- مراجعة اللغة: نصوص الباقات والدفع والمحادثة والإعلانات ---- */
    'فتحنالك صفحة الدفع لباقة': 'We opened the payment page for the plan:',
    'بعد الدفع، هيتفعّل اشتراكك خلال ساعات قليلة.': 'After payment, your subscription will be activated within a few hours.',
    'استلمنا طلب اشتراكك في باقة': 'We received your subscription request for the plan:',
    'فريقنا هيتواصل معاك على بريدك لإتمام الدفع وتفعيل الباقة.': 'Our team will contact you by email to complete the payment and activate the plan.',
    'نسخ': 'Copy',
    'الصورة دي اتمسحت من السيرفر (الصور بتتحفظ 30 يوم).': 'This image was deleted from the server (images are kept for 30 days).',
    'جارٍ تخطيط الحملة…': 'Planning the campaign…',
    'بجهّز الفيديو من نفس التصميم…': 'Preparing the video from the same design…',
    'بدون عنوان': 'Untitled',
    'الصورة الأصلية طلعت فاضية، فما نقدرش نعمل منها فيديو. ولّد الصورة من جديد.': 'The original image came out empty, so we cannot make a video from it. Generate the image again.',
    'الصورة الأصلية طلعت فاضية، فما نقدرش نعمل منها فيديو. ولّد التصميم من جديد.': 'The original image came out empty, so we cannot make a video from it. Generate the design again.',
    'مقدرناش نعمل الفيديو على الجهاز ده. جرّب من كروم أو سفاري محدّث.': 'We could not make the video on this device. Try an up-to-date Chrome or Safari.',
    'المتصفح ده بيطلّع الفيديو WebM. افتح من كروم أو سفاري عشان يطلع MP4.': 'This browser exports WebM video. Open the site in Chrome or Safari to get MP4.',
    'الفيديو 8 ثواني بمقاس الريلز (9:16) ومن غير صوت، ضيف عليه موسيقى من مكتبة إنستغرام أو تيك توك وانت بتنشره.': 'The video is 8 seconds in Reels size (9:16) with no sound. Add music from the Instagram or TikTok library when you publish it.',
    'جهّزت فيديو ريلز 8 ثواني (9:16) من نفس التصميم اللي اعتمدته، من غير صوت. ضيف عليه موسيقى وانت بتنشره.': 'I prepared an 8-second Reels video (9:16) from the design you approved, with no sound. Add music when you publish it.',
    'جهّزت فيديو ريلز 8 ثواني (9:16) من نفس التصميم، من غير صوت. ضيف عليه موسيقى وانت بتنشره.': 'I prepared an 8-second Reels video (9:16) from the same design, with no sound. Add music when you publish it.',
    'الحملة محتاجة رسائل وصور متاحة في باقتك النهارده. اشترك في Pro عشان تجهّز حملات كاملة.': 'The campaign needs messages and images available on your plan today. Subscribe to Pro to prepare full campaigns.',
    'اشترك في Pro عشان تجهّز حملات كاملة.': 'Subscribe to Pro to prepare full campaigns.',
    'جهّز لي حملة': 'Prepare a campaign for me',
    'اعمل إعلان احترافي للمنتج اللي في الصورة.': 'Create a professional ad for the product in the image.',
    'شوف الصورة المرفقة وساعدني أعمل حاجة مشابهة ليها لنشاطي.': 'Look at the attached image and help me create something similar for my business.',
    'اقرأ الملف المرفق وساعدني أعمل حاجة مشابهة ليه.': 'Read the attached file and help me create something similar to it.',
    'الفيديو جاهز في محادثة': 'The video is ready in chat',
    'الصورة جاهزة في محادثة': 'The image is ready in chat',
    'المساعد عليه ضغط دلوقتي': 'The assistant is busy right now',
    'خلصت': 'You have used up',
    'رسائلك': 'your messages',
    'صورك': 'your images',
    'عمليات البحث': 'your web searches',
    'العروض التقديمية': 'your presentations',
    'المتاحة لليوم في باقتك. اشترك في باقة أعلى عشان تكمّل، أو ارجع بكره.': 'for today on your plan. Subscribe to a higher plan to continue, or come back tomorrow.',
    'جارٍ تجهيز الفيديو…': 'Preparing the video…',
    '(ستوري)': '(Story)',
    '— العرض:': '— Offer:',

    /* ---- مراجعة اللغة: محرر الموقع (الأدوات والقوائم) ---- */
    'لون النص': 'Text colour',
    'لون الخلفية': 'Background colour',
    'حجم الخط:': 'Font size:',
    'يمين': 'Right',
    'شمال': 'Left',
    'محاذاة النص': 'Text alignment',
    'رابط الزر': 'Button link',
    'رابط الصورة': 'Image link',
    'تكرار العنصر': 'Duplicate item',
    'حذف العنصر': 'Delete item',
    'تكرار القسم': 'Duplicate section',
    'حذف القسم': 'Delete section',
    'تحريك لفوق': 'Move up',
    'تحريك لتحت': 'Move down',
    'المحدد:': 'Selected:',
    'الخط الحالي': 'Current font',
    'خط الصفحة كلها': 'Font for the whole page',
    'خلفية الصفحة': 'Page background',
    'مش لاقي كود الموقع في الرد ده.': 'Could not find the site code in this reply.',
    'اتحفظ ✅': 'Saved ✅',
    'اتعدّلت الصفحة ✨ (تقدر تتراجع لو مش عاجبك)': 'Page updated ✨ (you can undo it if you don’t like it)',
    'في تعديلات ماتحفظتش. تخرج من غير حفظ؟': 'There are unsaved changes. Leave without saving?',
    'الذكاء الاصطناعي مارجّعش صفحة كاملة. جرّب تكتب الطلب بشكل أوضح.': 'The AI did not return a full page. Try writing your request more clearly.',
    'اضغط على أي عنصر في الصفحة (عنوان، زر، قسم…) عشان تغيّر لونه وحجمه ومحاذاته.': 'Click any element on the page (heading, button, section…) to change its colour, size and alignment.',
    'الصفحة فاضية. ضيف أقسام من تبويب "إضافة".': 'The page is empty. Add sections from the "Add" tab.',
    'الصفحة فاضية. ضيف أقسام من تبويب "إضافة"': 'The page is empty. Add sections from the "Add" tab',
    'اتضاف قسم': 'Section added',
    'الهيدر': 'Header',
    'التذييل': 'Footer',
    'هيدر': 'Header',
    'تذييل': 'Footer',
    'قسم': 'Section',
    'المحتوى': 'Content',
    'عنوان رئيسي': 'Main heading',
    'عنوان فرعي': 'Subheading',
    'عنوان': 'Heading',
    'فقرة': 'Paragraph',
    'رابط / زر': 'Link / button',
    'زر': 'Button',
    'صندوق': 'Box',
    'نص': 'Text',
    'عنصر قائمة': 'List item',
    'واجهة رئيسية': 'Hero',
    'التواصل': 'Contact',

    /* ---- مراجعة اللغة: قوالب الموقع الجاهزة (تُكتب بالإنجليزي في الوضع الإنجليزي) ---- */
    '[العنوان الرئيسي]': '[Main heading]',
    '[جملة قصيرة توضح القيمة اللي بتقدمها]': '[A short line that explains your value]',
    'ابدأ الآن': 'Start now',
    'ليه تختارنا؟': 'Why choose us?',
    '[ميزة 1]': '[Feature 1]',
    '[ميزة 2]': '[Feature 2]',
    '[ميزة 3]': '[Feature 3]',
    '[وصف قصير للميزة]': '[Short feature description]',
    'الباقات والأسعار': 'Plans & pricing',
    'أساسي': 'Basic',
    'مميز': 'Premium',
    'احترافي': 'Pro',
    '[السعر]': '[Price]',
    '[ماذا تشمل الباقة]': '[What the plan includes]',
    'عملاؤنا بيقولوا': 'What our customers say',
    '"[رأي العميل]"': '"[Customer review]"',
    '— [اسم العميل]': '— [Customer name]',
    'الأسئلة الشائعة': 'Frequently asked questions',
    '[السؤال الأول]': '[First question]',
    '[الإجابة]': '[Answer]',
    '[السؤال الثاني]': '[Second question]',
    '[السؤال الثالث]': '[Third question]',
    'جاهز تبدأ؟': 'Ready to start?',
    'كلمنا على واتساب ونرد عليك في دقايق': 'Message us on WhatsApp and we will reply within minutes',
    '💬 تواصل عبر واتساب': '💬 Chat on WhatsApp',
    'تواصل معنا': 'Contact us',
    '📍 [العنوان]': '📍 [Address]',
    '📞 [رقم الهاتف]': '📞 [Phone number]',
    '✉️ [البريد الإلكتروني]': '✉️ [Email]',
    '© [السنة] [اسم النشاط]. جميع الحقوق محفوظة.': '© [Year] [Business name]. All rights reserved.',

    /* ---- الإعدادات (settings.js) ---- */
    'حسابك': 'Your account',
    'الباقة المجانية': 'Free plan',
    'الترقية': 'Upgrade',
    'تخصيص': 'Personalization',
    'التخصيص': 'Customize',
    'الذاكرة': 'Memory',
    'المكونات الإضافية': 'Plugins',
    'الحساب': 'Account',
    'البريد الإلكتروني': 'Email',
    'الاشتراك': 'Subscription',
    'إعدادات التطبيق': 'App settings',
    'عام': 'General',
    'الصوت': 'Voice',
    'رجوع': 'Back',
    'الأمان وتسجيل الدخول': 'Security and login',
    'التحكم في البيانات': 'Data controls',
    'الدردشة المؤقتة': 'Temporary chat',
    'نشاطي التجاري': 'My business',
    'مركز المساعدة': 'Help center',
    'مركز الخصوصية': 'Privacy center',
    'الشروط والأحكام': 'Terms and conditions',
    'الدردشة': 'Chat',
    'شاشة البداية': 'Start screen',
    'لغة التطبيق': 'App language',
    'تصحيح الإملاء تلقائياً': 'Auto-correct spelling',
    'الاهتزاز اللمسي': 'Haptic feedback',
    'مستوى الذكاء': 'Intelligence level',
    'التبديل التلقائي': 'Automatic switching',
    'اقتراحات': 'Suggestions',
    'اقتراحات البحث': 'Search suggestions',
    'عمليات البحث الشائعة': 'Popular searches',
    'الاستخدام التلقائي': 'Automatic use',
    'البحث على الويب': 'Web search',
    'الردود': 'Replies',
    'الحملات': 'Campaigns',
    'مغلق': 'Off',
    'داخل التطبيق': 'In app',
    'داخل التطبيق وبريد إلكتروني': 'In app and email',
    'افتراضي': 'Default',
    'اللغة': 'Language',
    'تلقائي': 'Auto',
    'البدء بالصوت': 'Start with voice',
    'المحادثات في الخلفية': 'Background conversations',
    'الأسلوب والنبرة الأساسيان': 'Base style and tone',
    'احترافي': 'Professional',
    'ودّي': 'Friendly',
    'مباشر': 'Direct',
    'درجة الود': 'Warmth',
    'الحماس': 'Enthusiasm',
    'رموز تعبيرية': 'Emoji',
    'إجابات مرئية': 'Visual answers',
    'أقل': 'Less',
    'أكثر': 'More',
    'التعليمات المخصصة': 'Custom instructions',
    'ماذا تريد من المساعد؟': 'What should the assistant do?',
    'مثلاً: اجعل الإجابات موجزة': 'For example: keep answers short',
    'إجابات سريعة': 'Quick answers',
    'قد نستخدم معرفتنا العامة لتقديم إجابات أسرع. الإجابات دي مش بتستخدم ذاكرتك.': 'We may use general knowledge for faster answers. These answers do not use your memory.',
    'تمكين الذاكرة': 'Enable memory',
    'خلي Dubai Fans AI يتعلم من محادثاتك عشان يساعدك أكتر.': 'Let Dubai Fans AI learn from your chats to help you better.',
    'معلوماتك': 'About you',
    'الاسم المستعار': 'Nickname',
    'اسمك اللي تحب نناديك بيه': 'What you want us to call you',
    'مهنتك': 'Your work',
    'مثلاً: مدير تسويق': 'For example: marketing manager',
    'المزيد عنك': 'More about you',
    'أي حاجة تساعدنا نفهم احتياجك': 'Anything that helps us understand your needs',
    'المعلومات دي محفوظة على الجهاز ده، والمساعد مش بيقراها لسه.': 'This information is saved on this device, and the assistant does not read it yet.',
    'الأذونات': 'Permissions',
    'اطلب الإذن عند الاستخدام': 'Ask when used',
    'السماح بالإجراءات منخفضة المخاطر': 'Allow low-risk actions',
    'اختر متى يجب أن يطلب Dubai Fans AI الإذن عند استخدام المكونات.': 'Choose when Dubai Fans AI should ask permission to use plugins.',
    'بحث في المكونات الإضافية': 'Search plugins',
    'المضافة': 'Added',
    'ما فيش نتائج': 'No results',
    'اختر من أين تبدأ عند فتح Dubai Fans AI.': 'Choose where you start when you open Dubai Fans AI.',
    'استخدم ذكاءً أعلى للأسئلة المعقدة': 'Use a stronger model for complex questions',
    'ابحث في الويب للحصول على معلومات آنية.': 'Search the web for up-to-date information.',
    'واصل المحادثة في التطبيقات الأخرى أو عندما تكون شاشتك مطفأة.': 'Keep talking while you use other apps or your screen is off.',
    'افتح الصوت تلقائياً عند فتح التطبيق.': 'Open voice automatically when you open the app.',
    'التفضيلات دي بتتحفظ على الجهاز ده دلوقتي، وربطها بالتطبيق كله جاي في تحديث قادم.': 'These preferences are saved on this device for now. Linking them to the whole app is coming in an update.',
    'مفاتيح المرور': 'Passkeys',
    'سجّل دخولك بالبصمة أو قفل الجهاز بدل كلمة المرور.': 'Sign in with fingerprint or device lock instead of a password.',
    'المصادقة متعددة العوامل (MFA)': 'Multi-factor authentication (MFA)',
    'تطبيق المصادقة': 'Authenticator app',
    'الرسائل النصية': 'Text messages',
    'اطلب تحدياً أمنياً إضافياً عند تسجيل الدخول. لو تعذّر عليك اجتياز هذا التحدي، هيكون ممكن استرداد حسابك.': 'Ask for an extra security check when you sign in. If you cannot complete it, you can still recover your account.',
    'الجلسات': 'Sessions',
    'هذا الجهاز': 'This device',
    'نشط الآن': 'Active now',
    'تسجيل الخروج من كل الأجهزة': 'Log out of all devices',
    'عرض كل الجلسات النشطة وإنهاءها قريباً.': 'Viewing and ending all active sessions is coming soon.',
    'تسجيل الدخول': 'Sign-in',
    'المساهمة في تحسين النموذج': 'Help improve the model',
    'التفضيل ده محفوظ على الجهاز دلوقتي، ولسه مش مربوط بالخادم.': 'This choice is saved on this device for now and is not yet linked to the server.',
    'سجل الدردشة': 'Chat history',
    'أرشفة جميع المحادثات': 'Archive all chats',
    'تصدير البيانات': 'Export data',
    'ملف JSON فيه محادثاتك على هذا الجهاز وإعداداتك.': 'A JSON file with the chats on this device and your settings.',
    'حذف جميع المحادثات': 'Delete all chats',
    'بيتحذف من هذا الجهاز بس.': 'Deleted from this device only.',
    'الدردشة المؤقتة مش بتظهر في السجل. اختر كيف تتعامل معها:': 'Temporary chats do not appear in your history. Choose how they behave:',
    'مخصّصة': 'Personalized',
    'غير مخصّصة': 'Not personalized',
    'يمكن لهذه الدردشة الرجوع إلى الذاكرة والمكونات الإضافية والتعليمات المخصصة': 'This chat can use memory, plugins and custom instructions.',
    'ستتجاهل هذه الدردشة الذاكرة والمكونات الإضافية والتعليمات المخصصة': 'This chat ignores memory, plugins and custom instructions.',
    'تم': 'Done',
    'الاختيار ده بيتحفظ دلوقتي، وتطبيقه على الدردشة جاي لاحقاً.': 'Your choice is saved now. Applying it to chats is coming later.',

    /* ---- الاستكشاف، القائمة الكاملة، الجلسات، الأرشيف ---- */
    'استكشاف': 'Explore',
    'تلقائي': 'Auto',
    'الخبير': 'Expert',
    'سريع': 'Fast',
    'النموذج الخارجي': 'External model',
    'النموذج المحلي': 'Local model',
    'اختيار النموذج': 'Choose model',
    'حسابي والإعدادات': 'My account and settings',
    'جهاز آخر': 'Another device',
    'ما فيش جلسات': 'No sessions',
    'مقدرناش نحمّل الجلسات دلوقتي': 'Could not load sessions right now',
    'بيقفل كل الأجهزة التانية. الجهاز ده هيتسجّل خروجه كمان.': 'Signs out every other device. This device signs out too.',
    'مقدرناش نقفل الأجهزة التانية. جرّب تاني.': 'Could not sign out the other devices. Try again.',
    'بتتنقل للأرشيف على الجهاز ده، وتقدر ترجعها في أي وقت.': 'Moved to the archive on this device. You can restore them anytime.',
    'المحادثات المؤرشفة': 'Archived chats',
    'رجّعها للقائمة الجانبية.': 'Bring them back to the sidebar.',
    'ما فيش محادثات تتأرشف.': 'There are no chats to archive.',
    'مقدرناش نأرشف المحادثات.': 'Could not archive the chats.',
    'ما فيش محادثات مؤرشفة.': 'No archived chats.',
    'مقدرناش نرجّع المحادثات.': 'Could not restore the chats.',
    'ادعُ واكسب': 'Invite and earn'
  };

  // أسماء الباقات كما بتجي من السيرفر (عربي) ومقابلها بالإنجليزي
  var PLAN_NAMES = { 'مجاني': 'Free', 'أساسي': 'Basic', 'أعمال': 'Business', 'احترافي': 'Pro', 'مميز': 'Premium' };

  // قواعد للنصوص اللي فيها أجزاء متغيّرة (اسم المستخدم، اسم الباقة، الأرقام)
  var RULES = [
    { re: /^بماذا نبدأ اليوم يا (.+)؟$/, fn: function (m) { return 'What shall we start today, ' + m[1] + '?'; } },
    { re: /^متبقي (.+) من (.+)$/, fn: function (m) { return m[1] + ' left of ' + m[2]; } },
    { re: /^خلص رصيدك الشهري \((\d+) نقطة\) في باقتك\. الرصيد بيتجدد أول الشهر الجاي، أو اشترك في باقة أعلى\.$/, fn: function (m) { return 'Your monthly balance of ' + m[1] + ' points on your plan is used up. It renews at the start of next month, or subscribe to a higher plan.'; } },
    { re: /^باقة (.+)$/, fn: function (m) { return (PLAN_NAMES[m[1]] || m[1]) + ' plan'; } },
    { re: /^خلصت (.+) المتاحة لليوم في باقتك\. اشترك في باقة أعلى عشان تكمّل، أو ارجع بكره\.$/, fn: function (m) {
        var what = { 'رسائلك': 'messages', 'صورك': 'images', 'عمليات البحث': 'web searches', 'العروض التقديمية': 'presentations' }[m[1]] || m[1];
        return 'You have used today’s ' + what + ' on your plan. Upgrade to continue, or come back tomorrow.';
      } },
    { re: /^اشترك في Dubai Fans AI (.+)$/, fn: function (m) { return 'Subscribe to Dubai Fans AI ' + (PLAN_NAMES[m[1]] || m[1]); } },
    { re: /^أهلاً بيك (.+) 👋 حسابك جاهز$/, fn: function (m) { return 'Welcome, ' + m[1] + ' 👋 your account is ready'; } },
    { re: /^حدث خطأ \((\d+)\)$/, fn: function (m) { return 'Something went wrong (' + m[1] + ')'; } },
    { re: /^جارٍ تجهيز الفيديو… (\d+)%$/, fn: function (m) { return 'Preparing the video… ' + m[1] + '%'; } },
    { re: /^جارٍ الرسم في الخلفية… تقدر تكمل كلامك، والصورة هتظهر هنا لما تخلص\.$/, fn: function () { return 'Drawing in the background… you can keep chatting, and the image will appear here when it is ready.'; } },
    { re: /^عندك حالياً باقة (.+) لحد (.+)\.$/, fn: function (m) { return 'You are currently on the ' + (PLAN_NAMES[m[1]] || m[1]) + ' plan until ' + m[2] + '.'; } },
    { re: /^اشتراكك في (.+) شغّال لحد (.+) ✅$/, fn: function (m) { return 'Your ' + m[1] + ' subscription is active until ' + m[2] + ' ✅'; } },
    { re: /^جدّد شهر إضافي مقابل (.+) د\.إ\.$/, fn: function (m) { return 'Renew for one more month for AED ' + m[1]; } },
    { re: /^الترقية مقابل (.+) د\.إ\.$/, fn: function (m) { return 'Upgrade for AED ' + m[1]; } },
    { re: /^أفضل وقت على (.+):$/, fn: function (m) {
        var pl = { 'إنستغرام': 'Instagram', 'فيسبوك': 'Facebook', 'تيك توك': 'TikTok', 'سناب شات': 'Snapchat', 'لينكدإن': 'LinkedIn', 'يوتيوب': 'YouTube', 'تويتر': 'X' }[m[1]] || m[1];
        return 'Best time on ' + pl + ':';
      } },
    { re: /^بجهّز الفيديو من نفس التصميم… (\d+)%$/, fn: function (m) { return 'Preparing the video from the same design… ' + m[1] + '%'; } },
    { re: /^الفيديو جاهز في محادثة "(.*)"$/, fn: function (m) { return 'The video is ready in chat "' + m[1] + '"'; } },
    { re: /^الصورة جاهزة في محادثة "(.*)"$/, fn: function (m) { return 'The image is ready in chat "' + m[1] + '"'; } },
    { re: /^باقي (\d+) تصاميم من الحملة\. اشترك في Pro عشان تكمّل الحملة كاملة\.$/, fn: function (m) { return m[1] + ' designs left in the campaign. Subscribe to Pro to finish the full campaign.'; } },
    { re: /^اتضاف قسم "(.*)"$/, fn: function (m) { return 'Section "' + m[1] + '" added'; } },
    { re: /^متبقي (\d+) تحليل اليوم(?: · التحليل بياخد حوالي دقيقة)?$/, fn: function (m) { return m[1] + ' analyses left today' + (m[0].indexOf('·') > -1 ? ' · the analysis takes about a minute' : ''); } },
    { re: /^\((\d+) من (\d+) في باقتك\)$/, fn: function (m) { return '(' + m[1] + ' of ' + m[2] + ' in your plan)'; } },
    { re: /^إيميلك ظهر في (\d+) تسريب:$/, fn: function (m) { return 'Your email appeared in ' + m[1] + ' breach(es):'; } },
    { re: /^(Shopify|WooCommerce) · متربط من (.+)$/, fn: function (m) { return m[1] + ' · connected since ' + m[2]; } },
    { re: /^المتابعة التلقائية متاحة في (.+)$/, fn: function (m) { return 'Automatic monitoring is available on the ' + (PLAN_NAMES[m[1]] || m[1]) + ' plan'; } },
    { re: /^اشترك في (.+) مقابل (.+) د\.إ\.$/, fn: function (m) { return 'Subscribe to ' + (PLAN_NAMES[m[1]] || m[1]) + ' for AED ' + m[2]; } },
    { re: /^ضريبة (.+): مبيعات خاضعة$/, fn: function (m) { return 'VAT ' + m[1] + ': taxable sales'; } },
    { re: /^درهم \(من\s+فاتورة مدفوعة\)$/, fn: function () { return 'AED (from paid invoices)'; } }
  ];

  // نصوص طويلة فيها روابط أو تنسيق: الإنجليزي بيتكتب في data-en-html
  var EN_TITLE = 'Dubai Fans AI | AI digital marketing assistant for UAE businesses';

  function hasArabic(s) { return AR_RE.test(s); }

  // يرجّع النص المترجم، ولو مفيش ترجمة يرجّع النص زي ما هو
  function tr(s) {
    if (lang !== 'en' || typeof s !== 'string' || !hasArabic(s)) return s;
    var k = s.trim();
    if (!k) return s;
    var v = EN[k];
    if (v === undefined) {
      for (var i = 0; i < RULES.length; i++) {
        var m = k.match(RULES[i].re);
        if (m) { v = RULES[i].fn(m); break; }
      }
    }
    if (v === undefined) return s;
    var at = s.indexOf(k);
    return s.slice(0, at) + v + s.slice(at + k.length);
  }

  // كلام المستخدم نفسه ما بنترجموش (بيفضل زي ما كتبه)، باقي الرسائل زي رسائل الخطأ بتتترجم
  function skipNode(el) { return !!(el && el.closest && el.closest('.msg-user, script, style, textarea')); }

  function translateText(node) {
    var p = node.parentNode;
    if (!p || skipNode(p)) return;
    var v = tr(node.nodeValue);
    if (v !== node.nodeValue) node.nodeValue = v;
  }

  // الخصائص (placeholder وغيرها) بتتترجم حتى في الـ textarea، بس كلام المستخدم نفسه ما بيتترجمش
  function translateAttrs(el) {
    if (!el || el.nodeType !== 1 || (el.closest && el.closest('.msg-user, script, style'))) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var s = el.getAttribute(ATTRS[i]);
      if (s && hasArabic(s)) {
        var v = tr(s);
        if (v !== s) el.setAttribute(ATTRS[i], v);
      }
    }
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) return translateText(node);
    if (node.nodeType !== 1) return;
    translateAttrs(node);
    var tw = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 1) translateAttrs(n); else translateText(n);
    }
  }

  function applyStaticHtml() {
    var els = document.querySelectorAll('[data-en-html]');
    for (var i = 0; i < els.length; i++) {
      if (lang === 'en') els[i].innerHTML = els[i].getAttribute('data-en-html');
    }
  }

  // زرار التبديل: بيتحط في شاشة الدخول وفي الشريط العلوي
  function makeSwitch() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-switch';
    btn.textContent = lang === 'en' ? 'العربية' : 'English';
    btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Arabic' : 'التبديل للإنجليزية');
    btn.addEventListener('click', function () {
      var next = lang === 'en' ? 'ar' : 'en';
      try { localStorage.setItem(KEY, next); } catch (e) { /* تجاهل */ }
      location.reload();
    });
    return btn;
  }

  function addSwitch() {
    var loginHost = document.querySelector('.login-form-side');
    // زرار اللغة في شاشة الدخول بس. داخل التطبيق بقى في صفحة "حسابي"
    if (loginHost) loginHost.insertBefore(makeSwitch(), loginHost.firstChild);
  }

  // بيانات الـ SEO (الوصف وروابط المشاركة وJSON-LD) بتتحوّل للإنجليزي عشان محركات البحث والمعاينات
  function setMeta(sel, val) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute('content', val);
  }
  function translateSeo() {
    var desc = 'Arabic AI digital marketing assistant for the UAE and the Gulf: write content and Instagram posts, design Arabic ads, a UAE voice, and SEO analysis for your website and store. Start free.';
    var ogDesc = 'Write your content, design your ads in Arabic, and analyse your website and store with AI. Start free.';
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', EN_TITLE);
    setMeta('meta[property="og:description"]', ogDesc);
    setMeta('meta[property="og:locale"]', 'en_US');
    var ld = document.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        var obj = JSON.parse(ld.textContent);
        obj.alternateName = 'Dubai Fans for AI';
        obj.inLanguage = 'en';
        ld.textContent = JSON.stringify(obj);
      } catch (e) { /* JSON غير صالح: نسيبه زي ما هو */ }
    }
  }

  function start() {
    applyStaticHtml();
    if (lang === 'en') {
      document.title = EN_TITLE;
      translateSeo();
    }
    walk(document.body);
    addSwitch();
    if (typeof MutationObserver !== 'function') return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        } else if (m.type === 'attributes') {
          translateAttrs(m.target);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATTRS });
  }

  window.DFAI_I18N = {
    lang: function () { return lang; },
    tr: tr,
    // ملفات الترجمة الإضافية (شاشات الميزات) بتسجّل قاموسها هنا قبل ما الصفحة تتبني
    add: function (dict) { for (var k in dict) if (Object.prototype.hasOwnProperty.call(dict, k)) EN[k] = dict[k]; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
