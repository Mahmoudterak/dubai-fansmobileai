/* Dubai Fans AI — الإعدادات: الصفحة الرئيسية للإعدادات وصفحاتها الفرعية.
   كل الشاشات بتفتح في لوحة الشاشات الإضافية (D.showPanel). التفضيلات بتتحفظ على الجهاز (localStorage). */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var ID = 'settings';
  var KEY = 'dfai.settings';
  var DEF = {
    startPage: 'chat', autoCorrect: true, haptic: true, autoModel: true,
    searchSuggest: true, popularSearch: true, webSearch: true,
    notif_resp: 'app', notif_usage: 'app', notif_camp: 'app', notif_tasks: 'app',
    voice: 'default', voiceLang: 'auto', voiceStart: false, voiceBg: false,
    style: 'pro', warmth: 'less', enthusiasm: 'less', emoji: 'more', visual: 'default',
    custom: '', quickAnswers: true,
    memOn: true, memAlias: '', memJob: '', memAbout: '',
    improveModel: true, tempChat: 'custom', permissions: 'ask'
  };
  var NOTE = 'التفضيلات دي بتتحفظ على الجهاز ده دلوقتي، وربطها بالتطبيق كله جاي في تحديث قادم.';

  var ICON_X = '<path d="M18 6 6 18M6 6l12 12"/>';
  var ICON_CHEV = '<path d="m9 6 6 6-6 6"/>';

  function isEn() { return document.documentElement.getAttribute('data-dfai-lang') === 'en'; }
  function T(ar, en) { return isEn() ? en : ar; }

  function read() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    return Object.assign({}, DEF, s);
  }
  function get(k) { return read()[k]; }
  function set(k, v) {
    var s = read();
    s[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { D.toast('مقدرناش نحفظ الإعداد على الجهاز.'); }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(d, cls) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" class="' + (cls || '') + '">' + d + '</svg>';
  }
  function iconBtn(label, d, cls, fn) {
    var b = el('button', 'st-icon');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = svg(d, cls);
    b.addEventListener('click', fn);
    return b;
  }

  // صفحة جديدة في لوحة الشاشات الإضافية. back = دالة الرجوع، ولو مفيش بيبان زرار الإغلاق بس.
  function page(title, back) {
    var p = D.showPanel(ID);
    p.innerHTML = '';
    var wrap = el('div', 'st-page');
    var head = el('div', 'st-head');
    if (back) head.appendChild(iconBtn('رجوع', ICON_CHEV, 'st-back', back));
    else head.appendChild(el('span'));
    head.appendChild(el('h2', 'st-title', title));
    head.appendChild(iconBtn('إغلاق', ICON_X, '', D.hidePanel));
    wrap.appendChild(head);
    p.appendChild(wrap);
    return wrap;
  }

  function heading(t) { return el('div', 'st-h', t); }
  function hint(t) { return el('p', 'st-hint', t); }
  function group(rows) {
    var g = el('div', 'st-group');
    rows.forEach(function (r) { g.appendChild(r); });
    return g;
  }

  // صف واحد: اسم + (قيمة أو تحكم أو سهم). opts: fn (يخلّيه زرار), value, sub, control, soon, danger
  function row(label, opts) {
    opts = opts || {};
    var clickable = typeof opts.fn === 'function' && !opts.soon;
    var r = el(clickable ? 'button' : 'div', 'st-row' + (clickable ? ' link' : '') +
      (opts.danger ? ' danger' : '') + (opts.soon ? ' is-soon' : ''));
    if (clickable) { r.type = 'button'; r.addEventListener('click', opts.fn); }
    var l = el('span', 'st-label', label);
    if (opts.sub) l.appendChild(el('span', 'st-sub', opts.sub));
    r.appendChild(l);
    if (opts.soon) r.appendChild(el('span', 'st-tag', T('قريباً', 'Soon')));
    else if (opts.value != null) r.appendChild(el('span', 'st-val', String(opts.value)));
    if (opts.control) r.appendChild(opts.control);
    if (clickable) r.insertAdjacentHTML('beforeend', svg(ICON_CHEV, 'st-chev'));
    return r;
  }

  function toggle(label, key, onChange) {
    var b = el('button', 'st-switch');
    b.type = 'button';
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-checked', String(!!get(key)));
    b.addEventListener('click', function () {
      var v = b.getAttribute('aria-checked') !== 'true';
      b.setAttribute('aria-checked', String(v));
      set(key, v);
      if (onChange) onChange(v);
    });
    return b;
  }
  function select(label, key, opts, onChange) {
    var s = el('select', 'st-select');
    s.setAttribute('aria-label', label);
    opts.forEach(function (o) {
      var op = el('option', '', o[1]);
      op.value = o[0];
      s.appendChild(op);
    });
    s.value = String(get(key));
    s.addEventListener('change', function () {
      set(key, s.value);
      if (onChange) onChange(s.value);
    });
    return s;
  }
  function toggleRow(label, key, sub, onChange) {
    return row(label, { sub: sub, control: toggle(label, key, onChange) });
  }
  function selectRow(label, key, opts, onChange) {
    return row(label, { control: select(label, key, opts, onChange) });
  }
  function field(label, key, placeholder, multiline) {
    var f = el('label', 'st-field');
    f.appendChild(el('span', '', label));
    var i = el(multiline ? 'textarea' : 'input', 'st-input');
    if (!multiline) i.type = 'text';
    i.placeholder = placeholder || '';
    i.value = get(key) || '';
    i.maxLength = 1500;
    i.addEventListener('change', function () { set(key, i.value.trim()); });
    f.appendChild(i);
    return f;
  }
  function fieldGroup(rows) {
    var g = el('div', 'st-group');
    rows.forEach(function (r) { g.appendChild(r); });
    return g;
  }
  function plainBtn(label, cls, fn) {
    var b = el('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  // ---------- الرئيسية ----------
  function openSettings() {
    var me = (D.state && D.state.me) || {};
    var u = me.user || {};
    var body = page(T('الإعدادات', 'Settings'), null);

    var prof = el('div', 'st-profile');
    prof.appendChild(el('div', 'st-avatar', (u.name || '?').trim().charAt(0).toUpperCase()));
    prof.appendChild(el('strong', '', u.name || T('حسابك', 'Your account')));
    body.appendChild(prof);

    var planName = (me.plan && me.plan.name) || T('الباقة المجانية', 'Free plan');
    var plan = el('div', 'st-plan');
    plan.appendChild(el('span', 'st-label', planName));
    plan.appendChild(plainBtn(T('الترقية', 'Upgrade'), 'btn-primary sm', function () { D.openPlans(); }));
    body.appendChild(plan);

    body.appendChild(group([
      row(T('ادعُ واكسب', 'Invite and earn'), { fn: function () { D.hidePanel(); if (D.openReferral) D.openReferral(); } }),
      row(T('اللغة', 'Language'), {
        value: isEn() ? 'English' : 'العربية',
        fn: function () {
          try { localStorage.setItem('dfai_lang', isEn() ? 'ar' : 'en'); } catch (e) { /* تجاهل */ }
          location.reload();
        }
      })
    ]));

    body.appendChild(heading(T('تخصيص', 'Personalization')));
    body.appendChild(group([
      row(T('التخصيص', 'Customize'), { fn: openPersonal }),
      row(T('الذاكرة', 'Memory'), { fn: openMemory }),
      row(T('المكونات الإضافية', 'Plugins'), { fn: openPlugins })
    ]));

    body.appendChild(heading(T('الحساب', 'Account')));
    body.appendChild(group([
      row(T('البريد الإلكتروني', 'Email'), { value: u.email || '—' }),
      row(T('الاشتراك', 'Subscription'), { fn: function () { D.openPlans(); }, value: planName }),
      row(T('الاستخدام', 'Usage'), { fn: function () { D.hidePanel(); D.openUsage(); } }),
      row(T('مفاتيح الربط (ChatGPT / Claude)', 'Connection keys (ChatGPT / Claude)'), { fn: openMcpKeys }),
      row(T('المظهر', 'Appearance'), { fn: function () { D.hidePanel(); D.openDesign(); } })
    ]));

    body.appendChild(heading(T('إعدادات التطبيق', 'App settings')));
    body.appendChild(group([
      row(T('عام', 'General'), { fn: openGeneral }),
      row(T('الإشعارات', 'Notifications'), { fn: openNotif }),
      row(T('الصوت', 'Voice'), { fn: openVoice }),
      row(T('الأمان وتسجيل الدخول', 'Security and login'), { fn: openSecurity }),
      row(T('التحكم في البيانات', 'Data controls'), { fn: openData }),
      row(T('الدردشة المؤقتة', 'Temporary chat'), { fn: openTemp })
    ]));

    body.appendChild(heading(T('المساعدة', 'Help')));
    body.appendChild(group([
      row(T('مركز المساعدة', 'Help center'), { fn: function () { window.open('help.html', '_blank', 'noopener'); } }),
      row(T('مركز الخصوصية', 'Privacy center'), { fn: function () { window.open('privacy.html', '_blank', 'noopener'); } }),
      row(T('الشروط والأحكام', 'Terms'), { fn: function () { window.open('terms.html', '_blank', 'noopener'); } }),
      row(T('تسجيل الخروج', 'Log out'), {
        danger: true,
        fn: function () { D.hidePanel(); var o = document.querySelector('[data-um="logout"]'); if (o) o.click(); }
      })
    ]));
  }

  // ---------- مفاتيح الربط (MCP) ----------
  // المفتاح بيظهر مرة واحدة بس عند الإنشاء. الإلغاء فوري.
  function openMcpKeys() {
    var b = page(T('مفاتيح الربط', 'Connection keys'), openSettings);
    var MCP_URL = 'https://ai.mtuaefans.com/api/mcp';
    function codeBox(text) {
      var p = el('pre', '', text);
      p.style.cssText = 'direction:ltr;text-align:left;white-space:pre-wrap;word-break:break-all;font-size:12px;background:rgba(127,127,127,.12);padding:10px;border-radius:10px;margin:6px 0 12px;';
      return p;
    }

    b.appendChild(heading(T('ما الذي يفعله المفتاح؟', 'What does a key do?')));
    b.appendChild(hint(T(
      'يربط ChatGPT أو Claude بحسابك، فيقدر يطلب توليد صور من Dubai Fans AI ويتابع حالتها. المفتاح ما يفتح حسابك كاملاً، وينقطع الربط فوراً لو ألغيته. المفتاح يظهر مرة واحدة فقط، فاحفظه في مكان آمن ولا تشاركه مع أحد.',
      'A key lets ChatGPT or Claude connect to your account to request image generation from Dubai Fans AI and track its status. It does not open your full account, and the link stops immediately if you revoke it. The key is shown only once, so save it somewhere safe and do not share it.'
    )));
    b.appendChild(heading(T('الخطوات', 'Steps')));
    b.appendChild(hint(T(
      '1) أنشئ مفتاحاً باسم واضح مثل ChatGPT. 2) انسخ المفتاح فوراً. 3) أضفه في التطبيق اللي تستخدمه حسب الشرح تحت.',
      '1) Create a key with a clear name such as ChatGPT. 2) Copy the key right away. 3) Add it in the app you use, following the steps below.'
    )));
    b.appendChild(heading(T('عنوان الخادم', 'Server URL')));
    b.appendChild(codeBox(MCP_URL));

    b.appendChild(heading('Claude Desktop'));
    b.appendChild(hint(T(
      'افتح Claude Desktop ← Settings ← Developer ← Edit Config، والصق الإعداد التالي واستبدل YOUR_KEY بالمفتاح. يحتاج Node.js مثبتاً على جهازك.',
      'Open Claude Desktop ← Settings ← Developer ← Edit Config, paste the setting below and replace YOUR_KEY with your key. Node.js must be installed on your computer.'
    )));
    b.appendChild(codeBox('{\n  "mcpServers": {\n    "dubai-fans-ai": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "' + MCP_URL + '", "--header", "Authorization: Bearer YOUR_KEY"]\n    }\n  }\n}'));
    b.appendChild(hint(T('بعد الحفظ أعد تشغيل Claude Desktop، وستجد أدوات Dubai Fans AI في قائمة الأدوات.', 'After saving, restart Claude Desktop. You will find the Dubai Fans AI tools in the tools menu.')));

    b.appendChild(heading('ChatGPT'));
    b.appendChild(hint(T(
      'في ChatGPT أضف خادم MCP مخصصاً (Settings ← Apps / Connectors ← Create) وضع العنوان أعلاه. إن طلب منك ChatGPT تسجيل دخول (OAuth) بدل المفتاح، فهذا النوع من الربط لم نفعّله بعد، أخبرني لنضيفه.',
      'In ChatGPT, add a custom MCP server (Settings ← Apps / Connectors ← Create) and enter the URL above. If ChatGPT asks for a sign-in (OAuth) instead of the key, this connection type is not enabled yet; tell us and we will add it.'
    )));

    b.appendChild(heading(T('اختبار سريع', 'Quick test')));
    b.appendChild(hint(T('لو عندك Terminal، هذا الأمر يتأكد أن المفتاح شغّال ويعرض الأدوات. استبدل YOUR_KEY.', 'If you have a terminal, this command checks that the key works and lists the tools. Replace YOUR_KEY.')));
    b.appendChild(codeBox('curl -s -X POST ' + MCP_URL + ' -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\''));

    b.appendChild(heading(T('الأدوات المتاحة', 'Available tools')));
    b.appendChild(hint(T(
      'whoami: يعرض اسم حسابك وباقتك. create_image: يولّد صورة ويستهلك من رصيد حسابك مثل توليدها داخل التطبيق. get_job: يعرض حالة صورة طلبتها برقم المهمة.',
      'whoami: shows your account name and plan. create_image: generates an image and uses your account quota, the same as generating in the app. get_job: shows the status of an image request by its job ID.'
    )));
    var tokenBox = el('div', '');
    var list = el('div', '');
    var inp = el('input', 'st-input');
    inp.type = 'text';
    inp.maxLength = 60;
    inp.placeholder = T('اسم المفتاح، مثلاً ChatGPT', 'Key name, e.g. ChatGPT');
    var go = plainBtn(T('إنشاء مفتاح', 'Create key'), 'btn-primary sm', create);
    var f = el('div', 'st-field');
    f.appendChild(inp);
    f.appendChild(go);
    b.appendChild(f);
    b.appendChild(tokenBox);
    b.appendChild(heading(T('المفاتيح الحالية', 'Current keys')));
    b.appendChild(list);

    function create() {
      go.disabled = true;
      D.apiJson('/api/keys', { method: 'POST', body: JSON.stringify({ label: inp.value.trim() }) })
        .then(function (r) { inp.value = ''; showToken(r.token); load(); })
        .catch(function (e) { D.toast(e.message || T('تعذّر إنشاء المفتاح.', 'Could not create the key.')); })
        .then(function () { go.disabled = false; });
    }

    function showToken(token) {
      tokenBox.innerHTML = '';
      var g = el('div', 'st-group');
      g.appendChild(el('div', 'st-label', T('انسخ المفتاح دلوقتي، مش هيظهر تاني:', 'Copy the key now, it will not be shown again:')));
      var code = el('code', 'st-val', token);
      code.style.wordBreak = 'break-all';
      g.appendChild(code);
      g.appendChild(plainBtn(T('نسخ', 'Copy'), 'btn-primary sm', function () {
        try {
          navigator.clipboard.writeText(token);
          D.toast(T('اتنسخ', 'Copied'));
        } catch (e) { D.toast(T('انسخه يدوياً', 'Copy it manually')); }
      }));
      tokenBox.appendChild(g);
    }

    function load() {
      D.apiJson('/api/keys').then(function (r) {
        list.innerHTML = '';
        var active = (r.keys || []).filter(function (k) { return !k.revoked; });
        if (!active.length) { list.appendChild(hint(T('مفيش مفاتيح لسه.', 'No keys yet.'))); return; }
        var g = el('div', 'st-group');
        active.forEach(function (k) {
          var when = new Date(k.createdAt).toLocaleDateString(isEn() ? 'en-GB' : 'ar-AE', { day: 'numeric', month: 'short', year: 'numeric' });
          g.appendChild(row(k.label, {
            sub: k.hint + ' · ' + T('اتعمل ', 'Created ') + when,
            control: plainBtn(T('إلغاء', 'Revoke'), 'sm ghost', function () {
              if (!window.confirm(T('تلغي المفتاح ده؟ أي ربط بيستخدمه هيقف.', 'Revoke this key? Any connection using it will stop.'))) return;
              D.apiJson('/api/keys/' + k.id, { method: 'DELETE' }).then(load).catch(function (e) { D.toast(e.message); });
            })
          }));
        });
        list.appendChild(g);
      }).catch(function (e) { list.appendChild(hint(e.message)); });
    }

    load();
  }

  // ---------- عام ----------
  function openGeneral() {
    var b = page(T('عام', 'General'), openSettings);
    set('appLang', document.documentElement.getAttribute('data-dfai-lang') === 'en' ? 'en' : 'ar');
    b.appendChild(group([
      selectRow(T('شاشة البداية', 'Start screen'), 'startPage', [['chat', T('الدردشة', 'Chat')], ['tools', T('الأدوات', 'Tools')]])
    ]));
    b.appendChild(hint(T('اختر من أين تبدأ عند فتح Dubai Fans AI.', 'Choose where you start when you open Dubai Fans AI.')));
    b.appendChild(group([
      selectRow(T('لغة التطبيق', 'App language'), 'appLang', [['ar', 'العربية'], ['en', 'English']], function (v) {
        try { localStorage.setItem('dfai_lang', v); } catch (e) { /* تجاهل */ }
        location.reload();
      }),
      toggleRow(T('تصحيح الإملاء تلقائياً', 'Auto-correct spelling'), 'autoCorrect'),
      toggleRow(T('الاهتزاز اللمسي', 'Haptic feedback'), 'haptic')
    ]));
    b.appendChild(heading(T('مستوى الذكاء', 'Intelligence level')));
    b.appendChild(group([
      toggleRow(T('التبديل التلقائي', 'Automatic switching'), 'autoModel', T('استخدم ذكاءً أعلى للأسئلة المعقدة', 'Use a stronger model for complex questions'))
    ]));
    b.appendChild(heading(T('اقتراحات', 'Suggestions')));
    b.appendChild(group([
      toggleRow(T('اقتراحات البحث', 'Search suggestions'), 'searchSuggest'),
      toggleRow(T('عمليات البحث الشائعة', 'Popular searches'), 'popularSearch')
    ]));
    b.appendChild(heading(T('الاستخدام التلقائي', 'Automatic use')));
    b.appendChild(group([
      toggleRow(T('البحث على الويب', 'Web search'), 'webSearch', T('ابحث في الويب للحصول على معلومات آنية.', 'Search the web for up-to-date information.'))
    ]));
    b.appendChild(hint(NOTE));
  }

  // ---------- الإشعارات ----------
  function openNotif() {
    var b = page(T('الإشعارات', 'Notifications'), openSettings);
    var opts = [['none', T('مغلق', 'Off')], ['app', T('داخل التطبيق', 'In app')], ['both', T('داخل التطبيق وبريد إلكتروني', 'In app and email')]];
    b.appendChild(group([
      selectRow(T('الردود', 'Replies'), 'notif_resp', opts),
      selectRow(T('الاستخدام', 'Usage'), 'notif_usage', opts),
      selectRow(T('الحملات', 'Campaigns'), 'notif_camp', opts),
      selectRow(T('المهام', 'Tasks'), 'notif_tasks', opts)
    ]));
    b.appendChild(hint(NOTE));
  }

  // ---------- الصوت ----------
  function openVoice() {
    var b = page(T('الصوت', 'Voice'), openSettings);
    b.appendChild(group([
      selectRow(T('الصوت', 'Voice'), 'voice', [['default', T('افتراضي', 'Default')]]),
      selectRow(T('اللغة', 'Language'), 'voiceLang', [['auto', T('تلقائي', 'Auto')], ['ar', 'العربية'], ['en', 'English']])
    ]));
    b.appendChild(group([
      toggleRow(T('البدء بالصوت', 'Start with voice'), 'voiceStart', T('افتح الصوت تلقائياً عند فتح التطبيق.', 'Open voice automatically when you open the app.')),
      toggleRow(T('المحادثات في الخلفية', 'Background conversations'), 'voiceBg', T('واصل المحادثة في التطبيقات الأخرى أو عندما تكون شاشتك مطفأة.', 'Keep talking while you use other apps or your screen is off.'))
    ]));
    b.appendChild(hint(NOTE));
  }

  // ---------- الأمان وتسجيل الدخول ----------
  function openSecurity() {
    var b = page(T('الأمان وتسجيل الدخول', 'Security and login'), openSettings);
    b.appendChild(heading(T('الجلسات', 'Sessions')));
    var sessGroup = el('div', 'st-group');
    sessGroup.appendChild(row(T('جارٍ التحميل…', 'Loading…')));
    b.appendChild(sessGroup);
    loadSessions(sessGroup);
    b.appendChild(group([
      row(T('تسجيل الخروج من كل الأجهزة', 'Log out of all devices'), {
        fn: logoutOthers, danger: true,
        sub: T('بيقفل كل الأجهزة التانية. الجهاز ده هيتسجّل خروجه كمان.', 'Signs out every other device. This device signs out too.')
      })
    ]));
  }

  function loadSessions(g) {
    D.apiJson('/api/auth/sessions').then(function (d) {
      g.innerHTML = '';
      var list = (d && d.sessions) || [];
      if (!list.length) { g.appendChild(row(T('ما فيش جلسات', 'No sessions'))); return; }
      list.forEach(function (s) {
        var date = new Date(s.created_at).toLocaleString(isEn() ? 'en-GB' : 'ar-EG');
        g.appendChild(row(s.current ? T('هذا الجهاز', 'This device') : T('جهاز آخر', 'Another device'), {
          sub: date, value: s.current ? T('نشط الآن', 'Active now') : ''
        }));
      });
    }).catch(function () {
      g.innerHTML = '';
      g.appendChild(row(T('مقدرناش نحمّل الجلسات دلوقتي', 'Could not load sessions right now')));
    });
  }

  function logoutOthers() {
    if (!confirm(T('هنقفل كل الأجهزة التانية، والجهاز ده هيتسجّل خروجه كمان. تكمل؟', 'Every other device will be signed out, and this device too. Continue?'))) return;
    D.apiJson('/api/auth/logout-others', { method: 'POST' }).catch(function () { D.toast('مقدرناش نقفل الأجهزة التانية. جرّب تاني.'); }).then(function () {
      var o = document.querySelector('[data-um="logout"]');
      if (o) o.click();
    });
  }

  // ---------- التحكم في البيانات ----------
  function openData() {
    var b = page(T('التحكم في البيانات', 'Data controls'), openSettings);
    b.appendChild(group([
      toggleRow(T('المساهمة في تحسين النموذج', 'Help improve the model'), 'improveModel', T('التفضيل ده محفوظ على الجهاز دلوقتي، ولسه مش مربوط بالخادم.', 'This choice is saved on this device for now and is not yet linked to the server.'))
    ]));
    b.appendChild(heading(T('سجل الدردشة', 'Chat history')));
    b.appendChild(group([
      row(T('أرشفة جميع المحادثات', 'Archive all chats'), {
        fn: archiveAll,
        sub: T('بتتنقل للأرشيف على الجهاز ده، وتقدر ترجعها في أي وقت.', 'Moved to the archive on this device. You can restore them anytime.')
      }),
      row(T('المحادثات المؤرشفة', 'Archived chats'), {
        fn: restoreArchive, value: String(archivedList().length),
        sub: T('رجّعها للقائمة الجانبية.', 'Bring them back to the sidebar.')
      }),
      row(T('تصدير البيانات', 'Export data'), { fn: exportData, sub: T('ملف JSON فيه محادثاتك على هذا الجهاز وإعداداتك.', 'A JSON file with the chats on this device and your settings.') }),
      row(T('حذف جميع المحادثات', 'Delete all chats'), { fn: deleteChats, danger: true, sub: T('بيتحذف من هذا الجهاز بس.', 'Deleted from this device only.') })
    ]));
    b.appendChild(heading(T('بيانات الحساب', 'Account data')));
    b.appendChild(group([
      row(T('تصدير بيانات حسابي', 'Export my account data'), {
        fn: exportAccount,
        sub: T('ملف JSON فيه بيانات حسابك وأنشطتك المحفوظة على الخادم، من غير مفاتيح الربط.', 'A JSON file with your account data and activity saved on the server, without connection keys.')
      }),
      row(T('حذف الحساب نهائياً', 'Delete account permanently'), {
        fn: deleteAccount, danger: true,
        sub: T('بيتحذف الحساب وكل بياناته من الخادم، ومش هترجع. هيتم تسجيل خروجك.', 'Your account and all its data are removed from the server and cannot be restored. You will be signed out.')
      })
    ]));
  }
  function exportAccount() {
    D.apiJson('/api/me/export').then(function (data) {
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dubai-fans-ai-account.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(function () { D.toast(T('مقدرناش نصدّر البيانات. جرّب تاني.', 'Could not export the data. Please try again.')); });
  }
  function deleteAccount() {
    if (!confirm(T('هنحذف حسابك وكل بياناتك من الخادم نهائياً. مش هترجع. تكمل؟', 'Your account and all its data will be permanently deleted from the server. This cannot be undone. Continue?'))) return;
    var typed = prompt(T('اكتب DELETE بالإنجليزي للتأكيد:', 'Type DELETE to confirm:'));
    if (typed !== 'DELETE') { D.toast(T('الحذف ما اتنفّذش.', 'Deletion was not performed.')); return; }
    var password = prompt(T('اكتب كلمة المرور عشان نتأكد إنها إنت:', 'Enter your password to confirm it is you:'));
    if (!password) { D.toast(T('الحذف ما اتنفّذش.', 'Deletion was not performed.')); return; }
    D.apiJson('/api/me/delete', { method: 'POST', body: JSON.stringify({ confirm: 'DELETE', password: password }) })
      .then(function () {
        try {
          Object.keys(localStorage).filter(function (k) { return k.indexOf('dfai.') === 0; }).forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) { /* تجاهل */ }
        D.toast(T('اتحذف حسابك. هنحوّلك لصفحة الدخول.', 'Your account was deleted. Taking you to the sign-in page.'));
        setTimeout(function () { location.reload(); }, 1200);
      })
      .catch(function (ex) { D.toast((ex && ex.message) || T('مقدرناش نحذف الحساب. جرّب تاني.', 'Could not delete the account. Please try again.')); });
  }
  function userId() { return (D.state && D.state.me && D.state.me.user) ? D.state.me.user.id : 'x'; }
  function exportData() {
    var chats = [];
    try { chats = JSON.parse(localStorage.getItem('dfai.chats.' + userId()) || '[]') || []; } catch (e) { chats = []; }
    var payload = { exportedAt: new Date().toISOString(), chats: chats, settings: read() };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dubai-fans-ai-export.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function archivedKey() { return 'dfai.archive.' + userId(); }
  function archivedList() {
    try { return JSON.parse(localStorage.getItem(archivedKey()) || '[]') || []; } catch (e) { return []; }
  }
  function chatList() {
    try { return JSON.parse(localStorage.getItem('dfai.chats.' + userId()) || '[]') || []; } catch (e) { return []; }
  }
  function archiveAll() {
    var chats = chatList();
    if (!chats.length) { D.toast(T('ما فيش محادثات تتأرشف.', 'There are no chats to archive.')); return; }
    if (!confirm(T('هننقل كل المحادثات للأرشيف على الجهاز ده، وتقدر ترجعها في أي وقت. تكمل؟', 'All chats will move to the archive on this device. You can restore them anytime. Continue?'))) return;
    try {
      localStorage.setItem(archivedKey(), JSON.stringify(chats.concat(archivedList())));
      localStorage.setItem('dfai.chats.' + userId(), '[]');
    } catch (e) { D.toast(T('مقدرناش نأرشف المحادثات.', 'Could not archive the chats.')); return; }
    location.reload();
  }
  function restoreArchive() {
    var arch = archivedList();
    if (!arch.length) { D.toast(T('ما فيش محادثات مؤرشفة.', 'No archived chats.')); return; }
    if (!confirm(T('هنرجّع كل المحادثات المؤرشفة للقائمة الجانبية. تكمل؟', 'All archived chats will return to the sidebar. Continue?'))) return;
    try {
      localStorage.setItem('dfai.chats.' + userId(), JSON.stringify(arch.concat(chatList())));
      localStorage.setItem(archivedKey(), '[]');
    } catch (e) { D.toast(T('مقدرناش نرجّع المحادثات.', 'Could not restore the chats.')); return; }
    location.reload();
  }
  function deleteChats() {
    if (!confirm(T('هنحذف كل المحادثات المحفوظة على الجهاز ده. مش هترجع. تكمل؟', 'All chats saved on this device will be deleted and cannot be restored. Continue?'))) return;
    try { localStorage.removeItem('dfai.chats.' + userId()); } catch (e) { /* تجاهل */ }
    location.reload();
  }

  // ---------- الدردشة المؤقتة ----------
  function openTemp() {
    var b = page(T('الدردشة المؤقتة', 'Temporary chat'), openSettings);
    b.appendChild(hint(T('الدردشة المؤقتة مش بتظهر في السجل. اختر كيف تتعامل معها:', 'Temporary chats do not appear in your history. Choose how they behave:')));
    var cur = get('tempChat');
    var list = el('div', 'st-radios');
    [
      ['custom', T('مخصّصة', 'Personalized'), T('يمكن لهذه الدردشة الرجوع إلى الذاكرة والمكونات الإضافية والتعليمات المخصصة', 'This chat can use memory, plugins and custom instructions.')],
      ['plain', T('غير مخصّصة', 'Not personalized'), T('ستتجاهل هذه الدردشة الذاكرة والمكونات الإضافية والتعليمات المخصصة', 'This chat ignores memory, plugins and custom instructions.')]
    ].forEach(function (o) {
      var r = el('button', 'st-radio');
      r.type = 'button';
      r.setAttribute('role', 'radio');
      r.setAttribute('aria-checked', String(cur === o[0]));
      r.appendChild(el('b', '', o[1]));
      r.appendChild(el('small', '', o[2]));
      r.addEventListener('click', function () { set('tempChat', o[0]); openTemp(); });
      list.appendChild(r);
    });
    b.appendChild(list);
    b.appendChild(plainBtn(T('تم', 'Done'), 'btn-primary', function () { openSettings(); }));
    b.appendChild(hint(T('الاختيار ده بيتحفظ دلوقتي، وتطبيقه على الدردشة جاي لاحقاً.', 'Your choice is saved now. Applying it to chats is coming later.')));
  }

  // ---------- التخصيص ----------
  function openPersonal() {
    var b = page(T('التخصيص', 'Customize'), openSettings);
    b.appendChild(group([
      selectRow(T('الأسلوب والنبرة الأساسيان', 'Base style and tone'), 'style', [['pro', T('احترافي', 'Professional')], ['friendly', T('ودّي', 'Friendly')], ['direct', T('مباشر', 'Direct')]]),
      selectRow(T('درجة الود', 'Warmth'), 'warmth', [['less', T('أقل', 'Less')], ['more', T('أكثر', 'More')]]),
      selectRow(T('الحماس', 'Enthusiasm'), 'enthusiasm', [['less', T('أقل', 'Less')], ['more', T('أكثر', 'More')]]),
      selectRow(T('رموز تعبيرية', 'Emoji'), 'emoji', [['less', T('أقل', 'Less')], ['more', T('أكثر', 'More')]]),
      selectRow(T('إجابات مرئية', 'Visual answers'), 'visual', [['default', T('افتراضي', 'Default')], ['more', T('أكثر', 'More')]])
    ]));
    b.appendChild(heading(T('التعليمات المخصصة', 'Custom instructions')));
    b.appendChild(fieldGroup([field(T('ماذا تريد من المساعد؟', 'What should the assistant do?'), 'custom', T('مثلاً: اجعل الإجابات موجزة', 'For example: keep answers short'), true)]));
    b.appendChild(group([
      toggleRow(T('إجابات سريعة', 'Quick answers'), 'quickAnswers', T('قد نستخدم معرفتنا العامة لتقديم إجابات أسرع. الإجابات دي مش بتستخدم ذاكرتك.', 'We may use general knowledge for faster answers. These answers do not use your memory.'))
    ]));
    b.appendChild(hint(NOTE));
  }

  // ---------- الذاكرة ----------
  function openMemory() {
    var b = page(T('الذاكرة', 'Memory'), openSettings);
    b.appendChild(group([
      toggleRow(T('تمكين الذاكرة', 'Enable memory'), 'memOn', T('خلي Dubai Fans AI يتعلم من محادثاتك عشان يساعدك أكتر.', 'Let Dubai Fans AI learn from your chats to help you better.'))
    ]));
    b.appendChild(heading(T('معلوماتك', 'About you')));
    b.appendChild(fieldGroup([
      field(T('الاسم المستعار', 'Nickname'), 'memAlias', T('اسمك اللي تحب نناديك بيه', 'What you want us to call you')),
      field(T('مهنتك', 'Your work'), 'memJob', T('مثلاً: مدير تسويق', 'For example: marketing manager')),
      field(T('المزيد عنك', 'More about you'), 'memAbout', T('أي حاجة تساعدنا نفهم احتياجك', 'Anything that helps us understand your needs'), true)
    ]));
    b.appendChild(hint(T('المعلومات دي محفوظة على الجهاز ده، والمساعد مش بيقراها لسه.', 'This information is saved on this device, and the assistant does not read it yet.')));
  }

  // ---------- المكونات الإضافية ----------
  function openPlugins() {
    var b = page(T('المكونات الإضافية', 'Plugins'), openSettings);
    b.appendChild(group([
      selectRow(T('الأذونات', 'Permissions'), 'permissions', [['ask', T('اطلب الإذن عند الاستخدام', 'Ask when used')], ['auto', T('السماح بالإجراءات منخفضة المخاطر', 'Allow low-risk actions')]])
    ]));
    b.appendChild(hint(T('اختر متى يجب أن يطلب Dubai Fans AI الإذن عند استخدام المكونات.', 'Choose when Dubai Fans AI should ask permission to use plugins.')));
    var search = el('input', 'st-input st-search');
    search.type = 'search';
    search.placeholder = T('بحث في المكونات الإضافية', 'Search plugins');
    b.appendChild(search);
    b.appendChild(heading(T('المضافة', 'Added')));
    var list = el('div', 'st-group');
    b.appendChild(list);

    var sources = document.querySelectorAll('#toolList .tool-btn');
    function paint() {
      var term = search.value.trim().toLowerCase();
      list.innerHTML = '';
      Array.prototype.forEach.call(sources, function (src) {
        var text = src.textContent.trim();
        if (term && text.toLowerCase().indexOf(term) === -1) return;
        var r = el('button', 'st-row link');
        r.type = 'button';
        r.innerHTML = src.innerHTML;
        r.insertAdjacentHTML('beforeend', svg(ICON_CHEV, 'st-chev'));
        r.addEventListener('click', function () { D.hidePanel(); src.click(); });
        list.appendChild(r);
      });
      if (!list.childNodes.length) list.appendChild(el('div', 'st-row', T('ما فيش نتائج', 'No results')));
    }
    search.addEventListener('input', paint);
    paint();
  }

  // ---------- تصدير للاستخدام من أماكن تانية ----------
  window.DFAI.openSettings = openSettings;
})();
