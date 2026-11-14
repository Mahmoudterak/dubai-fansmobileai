/* Dubai Fans AI — مساعد التسويق الرقمي (واجهة المستخدم، تعمل مع dfai-api) */
(function () {
  'use strict';

  var API = '';

  var TOOLS = [
    { id: 'business', label: 'نشاطي التجاري', color: '#34D399', action: 'openBusiness',
      icon: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18M9 20v-6h6v6"/>' },
    { id: 'darkweb', label: 'مراقبة الويب المظلم', color: '#F87171', action: 'openDarkweb',
      icon: '<path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4Z"/><path d="m9 12 2 2 4-4"/>' },
    { id: 'write', label: 'كتابة', color: '#B9A8FF',
      icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      placeholder: 'مثال: اكتب 3 منشورات إنستغرام لعرض نهاية الأسبوع بنبرة حماسية…' },
    { id: 'image', label: 'توليد الصور', color: '#F9A8D4',
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
      placeholder: 'اوصف الصورة: مثال: صورة إعلانية لكوب قهوة على طاولة رخام بإضاءة صباحية دافئة…' },
    { id: 'follower', label: 'افحص حساب Instagram', color: '#F472B6', action: 'openFollower',
      icon: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>' },
    { id: 'virality', label: 'ابدأ بتحليل قوة الريلز بتاعك', color: '#FDBA74', action: 'openVirality',
      icon: '<path d="M12 3c1 3.5 4.5 5 4.5 9.5A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.5C7.5 9 10 7.5 12 3z"/>' },
    { id: 'ai-tools', label: 'مركز الأدوات الذكية', color: '#60A5FA', action: 'openAiTools',
      icon: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>' },
    { id: 'video', label: 'إنشاء فيديو', color: '#FB7185',
      icon: '<rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-2v8l-4-2"/>',
      placeholder: 'اوصف الفيديو: مثال: فيديو ريلز لعطر العود بخصم 20% بمناسبة عيد الاتحاد… (وتقدر ترفق صورة منتجك)' },
    { id: 'search', label: 'بحث الويب', color: '#86EFAC',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
      placeholder: 'ابحث في الويب: مثال: أحدث اتجاهات التسويق على تيك توك في الإمارات…' },
    { id: 'slides', label: 'عروض تقديمية', color: '#F5B76B',
      icon: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
      placeholder: 'موضوع العرض: مثال: عرض لحملة إطلاق متجر عطور أونلاين…' },
    { id: 'site', label: 'موقع إلكتروني', color: '#67E8F9',
      icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
      placeholder: 'اوصف الموقع: مثال: صفحة هبوط لصالون تجميل في دبي مع حجز عبر واتساب…' },
    { id: 'agent', label: 'وكلاء متخصصين', color: '#FCD34D', picker: true,
      icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' },
    { id: 'content', label: 'مولد المحتوى', color: '#C4B5FD', action: 'openContent',
      icon: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>' },
    { id: 'radar', label: 'Dubai Fans Radar', color: '#22D3EE', action: 'openRadar',
      icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>' },
    { id: 'monitors', label: 'المتابعة التلقائية', color: '#FB923C', action: 'openMonitors',
      icon: '<path d="M3 12h4l3-8 4 16 3-8h4"/>' }
  ];

  var AGENT_INFO = {
    strategy: { ico: '🧭', desc: 'خطط تسويق متكاملة وأهداف ومؤشرات أداء', ph: 'احكيلي عن نشاطك وهدفك، وأنا أبنيلك الاستراتيجية…' },
    seo: { ico: '🔎', desc: 'كلمات مفتاحية وتحسين ترتيب موقعك في جوجل', ph: 'ابعت رابط أو وصف موقعك، ونوع عملائك…' },
    ads: { ico: '🎯', desc: 'حملات Meta وTikTok وSnap وGoogle', ph: 'إيه المنتج والميزانية والهدف من الحملة؟' },
    social: { ico: '📱', desc: 'محتوى وتقويم نشر وزيادة التفاعل', ph: 'إيه حسابك ونوع جمهورك؟' },
    sales: { ico: '💼', desc: 'عروض، سكربتات واتساب، وزيادة التحويل', ph: 'إيه اللي بتبيعه، وفين العملاء بيقفوا؟' },
    copy: { ico: '✒️', desc: 'عناوين ونصوص إعلانية مقنعة', ph: 'إيه اللي محتاج تكتبه، ولمين؟' },
    email: { ico: '✉️', desc: 'رسائل وحملات بريد تزوّد الفتح والمبيعات', ph: 'إيه نوع الإيميل اللي محتاجه؟' }
  };

  var DEFAULT_PLACEHOLDER = 'اسأل Dubai Fans AI';

  var SUGGESTIONS = [
    { title: '📈 خطة تسويق', sub: 'لمتجر إلكتروني جديد', tool: 'write',
      content: 'اعمل خطة تسويق رقمي لمدة شهر لمتجر إلكتروني جديد، مع القنوات المناسبة والميزانية التقريبية' },
    { title: '📣 إعلان ممول', sub: 'لإنستغرام وسناب شات', tool: 'write',
      content: 'اكتب 3 نسخ إعلانية قصيرة لإعلان ممول على إنستغرام وسناب شات لمطعم، مع دعوة واضحة لاتخاذ إجراء' },
    { title: '🖼️ صورة إعلانية', sub: 'لمنتج على السوشيال', tool: 'image',
      content: 'صورة إعلانية احترافية لزجاجة عطر فاخرة على خلفية رخام داكن مع إضاءة ذهبية ناعمة' },
    { title: '🔎 اتجاهات السوق', sub: 'بحث ويب محدّث', tool: 'search',
      content: 'إيه أحدث اتجاهات التسويق عبر السوشيال ميديا في الإمارات هذا العام؟' },
    { title: '📊 عرض تقديمي', sub: 'لحملة تسويقية', tool: 'slides',
      content: 'اعمل عرض تقديمي لحملة إطلاق منتج جديد لعميل' },
    { title: '🌐 صفحة هبوط', sub: 'موقع جاهز في دقيقة', tool: 'site',
      content: 'صفحة هبوط لمقهى مختص في دبي، مع قائمة المشروبات المميزة وزر طلب عبر واتساب' }
  ];

  var LOGO_SVG =
    '<svg viewBox="0 0 48 48" role="img" aria-label="شعار دبي فانز">' +
    '<rect width="48" height="48" rx="11" fill="#0F1117"/>' +
    '<ellipse cx="24" cy="25" rx="21" ry="8.5" transform="rotate(-28 24 25)" fill="none" stroke="#7C5CFF" stroke-width="2.6"/>' +
    '<path fill="#F2F4F8" fill-rule="evenodd" d="M14 10h10a14 14 0 0 1 0 28H14a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2Zm4.5 6v16H24a8 8 0 0 0 0-16Z"/>' +
    '<circle cx="41" cy="14" r="6" fill="#6D4AFF" opacity=".35"/><circle cx="41" cy="14" r="3.2" fill="#C9BCFF"/></svg>';

  var ICON_DL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  var state = {
    token: null, me: null, config: null,
    chats: [], currentId: null, tool: null, agent: null,
    controller: null, authMode: 'login', busy: false
  };

  var $ = function (id) { return document.getElementById(id); };

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      if (val === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
    return null;
  }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2800);
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function renderMarkdown(text) {
    if (window.marked && window.DOMPurify) {
      var safe = window.DOMPurify.sanitize(window.marked.parse(text, { breaks: true, gfm: true }));
      // الجدول يتلف في غلاف قابل للتمرير: الجدول نفسه بيفضل بعرض طبيعي، والتمرير بيحصل جوّه الغلاف بس
      return safe.replace(/<table>/g, '<div class="tbl-scroll"><table>').replace(/<\/table>/g, '</table></div>');
    }
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    opts.headers = headers;
    return fetch(API + path, opts);
  }

  function apiJson(path, opts) {
    return api(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error((data.error && data.error.message) || ('حدث خطأ (' + res.status + ')'));
          err.status = res.status;
          err.code = data.error && data.error.code;
          throw err;
        }
        return data;
      });
    });
  }

  function netMessage(ex) {
    return ex && ex.message === 'Failed to fetch' ? 'تعذّر الاتصال بالسيرفر. اتأكد من الإنترنت وجرّب تاني.' : (ex && ex.message) || 'حدث خطأ.';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('تعذّر تحميل المكتبة')); };
      document.head.appendChild(s);
    });
  }

  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // تنزيل مباشر: نجيب الملف كـ Blob ونحفظه بالاسم والامتداد الصحيحين (مش بنفتح صفحة الصورة).
  // على آيفون (PWA) التنزيل المباشر مابيشتغلش، فبنفتح ورقة المشاركة عشان المستخدم يختار "حفظ في الصور".
  function saveUrl(url, baseName) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('download ' + r.status);
      return r.blob();
    }).then(function (blob) {
      var t = blob.type || '';
      var ext = /png/.test(t) ? '.png' : /webp/.test(t) ? '.webp' : /mp4/.test(t) ? '.mp4' : '.jpg';
      var name = safeName(baseName) + ext;
      var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      var file = null;
      try { file = new File([blob], name, { type: t || 'image/jpeg' }); } catch (e) { file = null; }
      if (isIOS && file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: name }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          downloadBlob(blob, name);
        });
      }
      downloadBlob(blob, name);
    }).catch(function () { toast('مقدرناش ننزّل الملف. جرّب تاني.'); });
  }

  function safeName(s) {
    return (s || 'dubai-fans-ai').replace(/[\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'dubai-fans-ai';
  }

  // ---------- الشاشات الإضافية (Radar، المتابعة) ----------
  function showPanel(id) {
    if (state.controller) state.controller.abort();
    state.panel = id;
    $('main').classList.add('is-panel');
    $('panel').hidden = false;
    $('panel').scrollTop = 0;
    renderTools();
    return $('panel');
  }
  function hidePanel() {
    if (!state.panel) return;
    state.panel = null;
    $('main').classList.remove('is-panel');
    $('panel').hidden = true;
    $('panel').innerHTML = '';
    renderTools();
  }

  // ---------- أدوات خارجية داخل المساعد (iframe في نفس الصفحة) ----------
  function openEmbed(id, title, url) {
    var p = showPanel(id);
    p.innerHTML = '';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border,#e5e5e5)';
    var name = document.createElement('strong');
    name.textContent = title;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-btn';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', hidePanel);
    head.appendChild(name);
    head.appendChild(close);
    var frame = document.createElement('iframe');
    frame.src = url;
    frame.title = title;
    frame.allow = 'clipboard-write';
    frame.style.cssText = 'display:block;width:100%;height:calc(100vh - 56px);border:0;background:#fff';
    p.appendChild(head);
    p.appendChild(frame);
  }

  // ---------- ادعُ واكسب: رابط الإحالة وعمولاتك ----------
  function openReferral() {
    var p = showPanel('referral');
    p.innerHTML = '';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;border-bottom:1px solid var(--border,#e5e5e5)';
    var title = document.createElement('strong');
    title.textContent = 'ادعُ واكسب';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-btn';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', hidePanel);
    head.appendChild(title);
    head.appendChild(close);
    var body = document.createElement('div');
    body.style.cssText = 'padding:16px;max-width:620px;width:100%;min-width:0;box-sizing:border-box;display:grid;gap:14px';
    body.textContent = 'جارٍ التحميل…';
    p.appendChild(head);
    p.appendChild(body);
    apiJson('/api/affiliate').then(function (d) {
      var pct = Math.round((d.rate || 0) * 100);
      var fmt = function (f) { return (f / 100).toFixed(2) + ' درهم'; };
      body.innerHTML = '';
      var lead = document.createElement('p');
      lead.style.margin = '0';
      lead.textContent = 'شارك رابطك مع أي حد. لو سجّل من خلاله واشترك في باقة مدفوعة، تاخد ' + pct + '% من أول دفعة.';
      body.appendChild(lead);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;min-width:0;width:100%';
      var input = document.createElement('input');
      input.type = 'text';
      input.readOnly = true;
      input.value = d.link || '';
      input.dir = 'ltr';
      input.style.cssText = 'flex:1 1 200px;min-width:0;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border,#e5e5e5);border-radius:10px;font:inherit';
      var copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'btn-primary sm';
      copy.textContent = 'انسخ الرابط';
      copy.addEventListener('click', function () {
        input.select();
        var done = function () { toast('الرابط اتنسخ ✅'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, done);
        else { document.execCommand('copy'); done(); }
      });
      row.appendChild(input);
      row.appendChild(copy);
      body.appendChild(row);
      var stats = document.createElement('div');
      stats.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;min-width:0';
      [['المُحالين', String(d.referred)], ['عمولات معلّقة', fmt(d.pending_fils)], ['عمولات مدفوعة', fmt(d.paid_fils)]].forEach(function (s) {
        var c = document.createElement('div');
        c.style.cssText = 'padding:12px;border:1px solid var(--border,#e5e5e5);border-radius:12px;text-align:center';
        var k = document.createElement('div');
        k.style.cssText = 'font-size:12px;opacity:.7';
        k.textContent = s[0];
        var v = document.createElement('div');
        v.style.cssText = 'font-size:18px;font-weight:600;margin-top:4px';
        v.textContent = s[1];
        c.appendChild(k);
        c.appendChild(v);
        stats.appendChild(c);
      });
      body.appendChild(stats);
      var note = document.createElement('p');
      note.style.cssText = 'font-size:12px;opacity:.7;margin:0';
      note.textContent = 'العمولات بتتصرف يدوياً بعد مراجعة الإدارة.';
      body.appendChild(note);
    }).catch(function () {
      body.textContent = 'مقدرناش نجيب بيانات الإحالة. جرّب بعد شوية.';
    });
  }

  // ---------- الدخول وإنشاء الحساب ----------
  function setAuthMode(mode) {
    state.authMode = mode;
    var reg = mode === 'register';
    $('tabLogin').classList.toggle('active', !reg);
    $('tabRegister').classList.toggle('active', reg);
    $('tabLogin').setAttribute('aria-selected', String(!reg));
    $('tabRegister').setAttribute('aria-selected', String(reg));
    $('nameField').hidden = !reg;
    $('pwHint').hidden = !reg;
    $('authTitle').textContent = reg ? 'ابدأ مجاناً' : 'أهلاً بك من جديد';
    $('authSub').textContent = reg ? 'اعمل حسابك في ثواني، ولك رسائل مجانية كل يوم.' : 'سجّل دخولك لمساعدك الذكي في التسويق الرقمي.';
    $('loginBtn').querySelector('span').textContent = reg ? 'أنشئ حسابي' : 'ادخل إلى المساعد';
    $('password').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    $('loginError').hidden = true;
    (reg ? $('name') : $('email')).focus();
  }
  $('tabLogin').addEventListener('click', function () { setAuthMode('login'); });
  $('tabRegister').addEventListener('click', function () { setAuthMode('register'); });

  function showLogin() {
    $('app').hidden = true;
    $('login').hidden = false;
    setTimeout(function () { (state.authMode === 'register' ? $('name') : $('email')).focus(); }, 50);
  }

  function applyMe(me) {
    state.me = me;
    var name = (me.user && me.user.name) || 'مستخدم';
    $('userName').textContent = name;
    $('userAvatar').textContent = name.trim().charAt(0) || 'م';
    $('userRole').textContent = me.user.role === 'admin' ? 'مسؤول النظام' : me.user.email;
    $('greeting').textContent = 'ماذا تريد أن تنجز اليوم؟';
    $('adminLink').hidden = me.user.role !== 'admin';
    renderQuota();
    renderTools();
  }

  function left(kind) {
    var me = state.me;
    if (!me) return Infinity;
    var lim = me.limits[kind];
    return lim === -1 ? Infinity : Math.max(lim - (me.usage[kind] || 0), 0);
  }

  function renderQuota() {
    var me = state.me;
    if (!me) return;
    var paid = me.plan.id !== 'free';
    $('planName').textContent = paid ? 'باقة ' + me.plan.name : 'ترقية الباقة';
    $('planPill').classList.toggle('paid', paid);
    // تنبيه مرة واحدة في الجلسة قبل نفاد رصيد النقاط
    var cr = me.credits;
    if (cr && cr.limit !== -1 && cr.left > 0 && cr.left <= cr.limit * 0.1 && !state.creditWarned) {
      state.creditWarned = true;
      toast('رصيدك قارب على النفاد. الرصيد بيتجدد أول الشهر الجاي.');
    }
    paintUsage();
  }

  function refreshMe() {
    return apiJson('/api/me').then(applyMe).catch(function (ex) { if (ex.status === 401) logout(true); });
  }

  function enterApp(me) {
    applyMe(me);
    $('login').hidden = true;
    $('app').hidden = false;
    loadChats();
    renderChatList();
    newChat();
    loadConfig().catch(function () {});
    setTimeout(function () { if (window.DFAI.adStudio && window.DFAI.adStudio.syncLogo) window.DFAI.adStudio.syncLogo(); }, 600);
    playSplash();
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var reg = state.authMode === 'register';
    var name = $('name').value.trim();
    var email = $('email').value.trim();
    var password = $('password').value;
    var err = $('loginError');
    err.hidden = true;
    var problem = !email || !password ? 'اكتب البريد الإلكتروني وكلمة المرور.'
      : reg && name.length < 2 ? 'اكتب اسمك.'
      : reg && password.length < 8 ? 'كلمة المرور لازم تكون 8 حروف على الأقل.' : '';
    if (problem) { err.textContent = problem; err.hidden = false; return; }

    var btn = $('loginBtn');
    var label = btn.querySelector('span');
    var original = label.textContent;
    btn.disabled = true;
    label.textContent = reg ? 'جارٍ إنشاء الحساب…' : 'جارٍ الدخول…';
    state.token = null;
    var refCode = null;
    try { refCode = localStorage.getItem('dfai_ref'); } catch (e) { refCode = null; }
    var body = reg ? { name: name, email: email, password: password, ref: refCode || undefined } : { email: email, password: password };
    apiJson(reg ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: JSON.stringify(body) })
      .then(function (data) {
        state.token = data.token;
        store('dfai.token', data.token);
        $('password').value = '';
        enterApp(data);
        if (reg) toast('أهلاً بيك ' + data.user.name.split(' ')[0] + ' 👋 حسابك جاهز');
      })
      .catch(function (ex) {
        if (ex.code === 'exists') setAuthMode('login');
        err.textContent = netMessage(ex);
        err.hidden = false;
      })
      .finally(function () { btn.disabled = false; label.textContent = original; });
  });

  function logout(silent) {
    if (state.controller) state.controller.abort();
    if (!silent && state.token) api('/api/auth/logout', { method: 'POST' }).catch(function () {});
    state.token = null; state.me = null;
    store('dfai.token', null);
    showLogin();
  }
  $('logoutBtn').addEventListener('click', function () { logout(false); });

  // ---------- قائمة المستخدم (أسفل القائمة الجانبية) ----------
  var userBtn = $('userBtn'), userMenu = $('userMenu');
  // بطاقة المستخدم تفتح صفحة الإعدادات مباشرة (ادع واكسب واللغة موجودين فيها)
  function setUserMenu(open) {
    userMenu.hidden = true;
    userBtn.setAttribute('aria-expanded', 'false');
    if (open && window.DFAI && DFAI.openSettings) {
      if (typeof closeSide === 'function') closeSide();
      DFAI.openSettings();
    }
  }
  userBtn.addEventListener('click', function (e) { e.stopPropagation(); setUserMenu(userMenu.hidden); });
  document.addEventListener('click', function (e) {
    if (!userMenu.hidden && !e.target.closest('.user-card')) setUserMenu(false);
  });
  userMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-um]');
    if (!item) { if (e.target.closest('a')) setUserMenu(false); return; }
    setUserMenu(false);
    routeUm(item.getAttribute('data-um'));
  });
  function routeUm(k) {
    if (k === 'settings' && window.DFAI && DFAI.openSettings) { if (typeof closeSide === 'function') closeSide(); DFAI.openSettings(); }
    else if (k === 'settings' && window.DFAI && DFAI.openBusiness) { if (typeof closeSide === 'function') closeSide(); DFAI.openBusiness(); }
    else if (k === 'plans') { openPlans(); if (typeof closeSide === 'function') closeSide(); }
    else if (k === 'referral') { if (window.DFAI && DFAI.openReferral) DFAI.openReferral(); if (typeof closeSide === 'function') closeSide(); }
    else if (k === 'billing' || k === 'usage' || k === 'design') {
      if (typeof closeSide === 'function') closeSide();
      ({ billing: openBilling, usage: openUsage, design: openDesign })[k]();
    }
    else if (k === 'logout') logout(false);
  }

  // ---------- حسابي والمدفوعات والاستخدام والتصميم ----------
  var PREFS_KEY = 'dfai.prefs';
  // الوضع الداكن هو الأساسي. الترحيل مرة واحدة: المستخدم اللي كان محفوظ عنده "فاتح" بيتحوّل للداكن، وبعدها يقدر يختار أي وضع.
  var PREFS_DEFAULT = { theme: 'dark', font: 'default', respFont: 'match', txSize: 'm', txWidth: 'narrow' };
  var BOX = 'border:1px solid var(--line-2);border-radius:14px;padding:14px;background:var(--surface);display:grid;gap:10px';
  var USAGE_ROWS = [['messages', 'الرسائل'], ['images', 'الصور والإعلانات'], ['search', 'بحث الويب'], ['slides', 'العروض التقديمية'], ['radar', 'Radar'], ['monitors', 'المتابعة التلقائية']];
  var DESIGN_GROUPS = [
    ['theme', 'المظهر', [['light', 'فاتح'], ['dark', 'داكن'], ['system', 'حسب الجهاز']]],
    ['font', 'خط الواجهة', [['default', 'الافتراضي'], ['system', 'خط النظام']]],
    ['respFont', 'خط الردود', [['match', 'مطابق للواجهة'], ['sans', 'خط بسيط']]],
    ['txSize', 'حجم نص المحادثة', [['s', 'صغير'], ['m', 'متوسط'], ['l', 'كبير']]],
    ['txWidth', 'عرض المحادثة', [['narrow', 'ضيق'], ['wide', 'عريض']]]
  ];

  function readPrefs() {
    var p = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { p = {}; }
    if (!p.darkMigrated) { // ترحيل مرة واحدة: الوضع الداكن أساسي
      p.theme = 'dark'; p.darkMigrated = true;
      savePrefs(p);
    }
    return Object.assign({}, PREFS_DEFAULT, p);
  }
  function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* تجاهل */ } }

  function applyPrefs(p) {
    p = p || readPrefs();
    var root = document.documentElement;
    var dark = p.theme === 'dark' || (p.theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.style.setProperty('--font', p.font === 'system' ? 'system-ui, sans-serif' : "'IBM Plex Sans Arabic', system-ui, sans-serif");
    root.style.setProperty('--resp-font', p.respFont === 'sans' ? 'system-ui, sans-serif' : 'var(--font)');
    root.style.setProperty('--tx-size', { s: '14px', m: '15px', l: '17px' }[p.txSize] || '15px');
    root.style.setProperty('--tx-w', p.txWidth === 'wide' ? '1000px' : '800px');
  }
  applyPrefs();

  function panelShell(id, title) {
    var p = showPanel(id);
    p.innerHTML = '';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 4px;border-bottom:1px solid var(--line);margin-bottom:16px';
    var h = document.createElement('strong');
    h.textContent = title;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-btn';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', hidePanel);
    head.appendChild(h);
    head.appendChild(close);
    var body = document.createElement('div');
    body.style.cssText = 'display:grid;gap:12px;max-width:640px';
    p.appendChild(head);
    p.appendChild(body);
    return body;
  }

  function infoRow(label, value) {
    var r = document.createElement('div');
    r.style.cssText = 'border:1px solid var(--line-2);border-radius:14px;padding:14px;background:var(--surface);display:flex;justify-content:space-between;align-items:center;gap:12px';
    var a = document.createElement('span');
    a.style.color = 'var(--muted)';
    a.textContent = label;
    var b = document.createElement('strong');
    b.textContent = value;
    r.appendChild(a);
    r.appendChild(b);
    return r;
  }

  function plainBtn(label, cls, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.style.justifySelf = 'start';
    b.addEventListener('click', fn);
    return b;
  }

  function openBilling() {
    var b = panelShell('billing', 'المدفوعات');
    var me = state.me || {};
    var paid = !!(me.plan && me.plan.id && me.plan.id !== 'free');
    b.appendChild(infoRow('الباقة الحالية', (me.plan && me.plan.name) || 'مجانية'));
    b.appendChild(infoRow('الحالة', paid ? 'مشترك' : 'مجاني'));
    var note = document.createElement('p');
    note.className = 'guest-note';
    note.textContent = 'سجل الفواتير بيتعرض هنا قريباً. لو عايز فاتورة دلوقتي، تواصل مع الدعم.';
    b.appendChild(note);
    b.appendChild(plainBtn(paid ? 'تغيير الباقة' : 'ترقية الباقة', 'btn-primary sm', function () { hidePanel(); openPlans(); }));
  }

  // بطاقة الاستخدام: بقت في صفحة "الاستخدام" بدل الشريط الجانبي
  var usageHost = null;
  function paintUsage() {
    if (!usageHost) return;
    var me = state.me;
    usageHost.innerHTML = '';
    if (!me || !me.limits) { usageHost.textContent = 'جارٍ التحميل…'; return; }
    if (me.credits) {
      var cr = me.credits;
      var crCard = document.createElement('div');
      crCard.style.cssText = BOX;
      var crHead = document.createElement('div');
      crHead.style.cssText = 'display:flex;justify-content:space-between;gap:8px';
      var crTitle = document.createElement('strong');
      crTitle.textContent = 'رصيد النقاط الشهري';
      var crNum = document.createElement('span');
      crNum.style.color = 'var(--muted)';
      var crPct = cr.limit === -1 ? 100 : Math.min(100, Math.round((cr.left / cr.limit) * 100));
      crNum.textContent = cr.limit === -1 ? 'غير محدود' : 'متبقي ' + cr.left + ' من ' + cr.limit;
      crHead.appendChild(crTitle);
      crHead.appendChild(crNum);
      var crBar = document.createElement('div');
      crBar.style.cssText = 'height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden';
      var crFill = document.createElement('span');
      crFill.style.cssText = 'display:block;height:100%;background:var(--accent);width:' + crPct + '%';
      crBar.appendChild(crFill);
      crCard.appendChild(crHead);
      crCard.appendChild(crBar);
      if (cr.limit !== -1 && cr.left <= cr.limit * 0.1) {
        var crWarn = document.createElement('div');
        crWarn.style.cssText = 'color:var(--danger);font-size:13px';
        crWarn.textContent = cr.left > 0 ? 'رصيدك قارب على النفاد. الرصيد بيتجدد أول الشهر الجاي.' : 'خلص رصيدك الشهري. الرصيد بيتجدد أول الشهر الجاي.';
        crCard.appendChild(crWarn);
      }
      var crNote = document.createElement('div');
      crNote.style.cssText = 'color:var(--muted);font-size:12px';
      crNote.textContent = 'الرسالة من 1 إلى 6 نقاط حسب طولها والنموذج · الصورة 10 · البحث 5 · العرض 10 · التحليل 5';
      crCard.appendChild(crNote);
      usageHost.appendChild(crCard);
    }
    var limit = me.limits.messages;
    var card = document.createElement('div');
    card.style.cssText = BOX;
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;gap:8px';
    var title = document.createElement('strong');
    title.textContent = 'رسائل اليوم';
    var num = document.createElement('span');
    num.style.color = 'var(--muted)';
    var pct = 100;
    if (limit === -1) {
      num.textContent = 'غير محدود';
    } else {
      var l = left('messages');
      num.textContent = 'متبقي ' + l + ' من ' + limit;
      pct = Math.min(100, Math.round((l / limit) * 100));
    }
    head.appendChild(title);
    head.appendChild(num);
    var bar = document.createElement('div');
    bar.style.cssText = 'height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden';
    var fill = document.createElement('span');
    fill.style.cssText = 'display:block;height:100%;background:var(--accent);width:' + pct + '%';
    bar.appendChild(fill);
    card.appendChild(head);
    card.appendChild(bar);
    usageHost.appendChild(card);

    USAGE_ROWS.slice(1).forEach(function (r) {
      var lim = me.limits[r[0]];
      if (lim === undefined) return;
      var row = document.createElement('div');
      row.style.cssText = BOX.replace('display:grid;gap:10px', 'display:flex;justify-content:space-between;align-items:center;gap:8px');
      var name = document.createElement('strong');
      name.textContent = r[1];
      var val = document.createElement('span');
      val.style.color = 'var(--muted)';
      val.textContent = lim === -1 ? 'غير محدود' : lim === 0 ? 'غير متاح في باقتك' : 'متبقي ' + left(r[0]) + ' من ' + lim;
      row.appendChild(name);
      row.appendChild(val);
      usageHost.appendChild(row);
    });
    usageHost.appendChild(plainBtn(me.plan && me.plan.id !== 'free' ? 'الباقات' : 'ترقية الباقة', 'btn-primary sm', function () { hidePanel(); openPlans(); }));
  }

  function openUsage() {
    usageHost = panelShell('usage', 'الاستخدام');
    paintUsage();
    refreshMe().catch(function () {});
  }

  function openDesign() {
    var b = panelShell('design', 'التصميم');
    function paint() {
      b.innerHTML = '';
      var p = readPrefs();
      DESIGN_GROUPS.forEach(function (g) {
        var box = document.createElement('div');
        box.style.cssText = BOX;
        var t = document.createElement('strong');
        t.textContent = g[1];
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
        g[2].forEach(function (o) {
          row.appendChild(plainBtn(o[1], p[g[0]] === o[0] ? 'btn-primary sm' : 'btn-ghost sm', function () {
            p[g[0]] = o[0];
            savePrefs(p);
            applyPrefs(p);
            paint();
          }));
        });
        box.appendChild(t);
        box.appendChild(row);
        b.appendChild(box);
      });
    }
    paint();
  }

  // ---------- الإعدادات والباقات ----------
  var FEATURE_LABELS = [
    ['messages', 'رسالة يومياً'],
    ['images', 'صورة يومياً'],
    ['search', 'بحث ويب يومياً'],
    ['slides', 'عرض تقديمي يومياً'],
    ['radar', 'تحليل Radar يومياً']
  ];

  function loadConfig() {
    if (state.config) return Promise.resolve(state.config);
    return apiJson('/api/config').then(function (c) { state.config = c; return c; });
  }

  function openModal(id, focusId) {
    $(id).hidden = false;
    setTimeout(function () { var f = $(focusId); if (f) f.focus(); }, 30);
  }
  function closeModal(id) { $(id).hidden = true; }
  ['plansModal', 'agentsModal', 'siteModal', 'contentModal'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) closeModal(id); });
  });

  function openPlans(reason) {
    $('plansDone').hidden = true;
    $('plansSub').textContent = reason || 'كل أدوات التسويق بالذكاء الاصطناعي، بحدود أكبر بكتير وصوت إماراتي.';
    openModal('plansModal', 'plansClose');
    loadConfig().then(renderPlans).catch(function (ex) { $('plansGrid').textContent = netMessage(ex); });
  }
  $('plansClose').addEventListener('click', function () { closeModal('plansModal'); });
  $('planPill').addEventListener('click', function () { openPlans(); });

  // اشتراك واحد بأسلوب ChatGPT Plus: مقارنة المجانية بـ Pro وزرار واحد
  var COMPARE_ROWS = [
    ['messages', 'الرسائل يومياً'],
    ['images', 'الصور والإعلانات يومياً'],
    ['search', 'بحث الويب يومياً'],
    ['slides', 'العروض التقديمية يومياً'],
    ['radar', 'تحليلات Radar يومياً'],
    ['monitors', 'متابعة تلقائية لعلامتك ومنافسينك']
  ];
  var CHECK = '<svg class="cmp-yes" viewBox="0 0 24 24" aria-label="متاح"><path d="m5 12 5 5 9-10"/></svg>';
  var DASH = '<span class="cmp-no" aria-label="غير متاح">—</span>';
  function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }
  function limitCell(v) {
    if (v === -1) return '<span class="cmp-val inf">بلا حد</span>';
    if (!v) return DASH;
    return '<span class="cmp-val">' + v + '</span>';
  }
  // صف ميزة داخل بطاقة الباقة: علامة صح أو شرطة + الرقم + الوصف
  function featLi(num, label) {
    return '<li><span class="plan-chk">' + CHECK + '</span><span class="plan-num">' + num + '</span><span>' + label + '</span></li>';
  }
  function txtLi(on, label) {
    return '<li' + (on ? '' : ' class="off"') + '><span class="plan-chk">' + (on ? CHECK : DASH) + '</span><span>' + label + '</span></li>';
  }
  function limitLi(v, label) {
    if (v === -1) return featLi('بلا حد', label);
    if (!v) return txtLi(false, label);
    return featLi(fmtN(v), label);
  }
  function renderPlans(cfg) {
    var grid = $('plansGrid');
    grid.innerHTML = '';
    grid.className = 'plans-one';
    var free = cfg.plans.find(function (p) { return p.id === 'free'; });
    var paidPlans = cfg.plans.filter(function (p) { return p.id !== 'free'; });
    if (!free || !paidPlans.length) return;
    var me = state.me;
    var current = me ? me.plan.id : 'free';
    var pro = paidPlans.filter(function (p) { return p.id === 'pro'; })[0] || paidPlans[0];
    var isCurrentPaid = paidPlans.some(function (p) { return p.id === current; });
    if (!$('oneSpark')) {
      var sp = document.createElement('div');
      sp.id = 'oneSpark';
      sp.className = 'one-spark';
      sp.setAttribute('aria-hidden', 'true');
      sp.innerHTML = '<svg viewBox="0 0 24 24"><path d="M10 3c.7 5 2.7 7.3 7.5 8-4.8.7-6.8 3-7.5 8-.7-5-2.7-7.3-7.5-8 4.8-.7 6.8-3 7.5-8Z"/><path d="M18.5 2c.3 2 1.1 2.9 3 3.2-1.9.3-2.7 1.2-3 3.2-.3-2-1.1-2.9-3-3.2 1.9-.3 2.7-1.2 3-3.2Z"/></svg>';
      $('plansTitle').parentNode.insertBefore(sp, $('plansTitle'));
    }
    var stack = document.createElement('div');
    stack.className = 'plan-stack';
    [free].concat(paidPlans).forEach(function (p) {
      var isFree = p.id === 'free';
      var card = document.createElement('section');
      card.className = 'plan-card' + (p === pro ? ' pro' : '') + (current === p.id ? ' mine' : '');
      var h = '';
      if (p === pro) h += '<span class="plan-badge">الأكثر طلباً</span>';
      h += '<h3 class="plan-name"></h3>';
      h += '<div class="plan-price"><span class="plan-amt">' + (isFree ? '0' : p.price) + '</span> <span class="plan-cur">د.إ.</span>' +
        (isFree ? '' : ' <span class="plan-per">في الشهر</span>') + '</div>';
      h += '<ul class="plan-feats">';
      h += featLi(fmtN(p.credits), 'نقاط الرصيد شهرياً');
      COMPARE_ROWS.forEach(function (r) { h += limitLi(p.limits[r[0]], r[1]); });
      h += txtLi(true, 'المحادثة الصوتية بصوت إماراتي');
      h += txtLi(!isFree, 'أولوية في السرعة والمميزات الجديدة');
      h += '</ul><div class="plan-cta"></div>';
      card.innerHTML = h;
      card.querySelector('.plan-name').textContent = p.name;
      var cta = card.querySelector('.plan-cta');
      if (isFree) {
        if (current === 'free') {
          var mineNote = document.createElement('p');
          mineNote.className = 'one-note ok';
          mineNote.textContent = 'باقتك الحالية';
          cta.appendChild(mineNote);
        }
      } else {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = (p === pro ? 'btn-primary' : 'btn-ghost') + ' one-btn';
        var isMine = current === p.id;
        btn.textContent = isMine ? 'جدّد شهر إضافي مقابل ' + p.price + ' د.إ.' : 'اشترك في ' + p.name + ' مقابل ' + p.price + ' د.إ.';
        if (isMine && !cfg.onlinePay) { btn.disabled = true; btn.textContent = 'مفعّلة'; }
        btn.addEventListener('click', function () { if (!btn.disabled) requestPlan(p, btn); });
        cta.appendChild(btn);
      }
      stack.appendChild(card);
    });
    grid.appendChild(stack);
    var notes = document.createElement('div');
    notes.className = 'one-cta';
    grid.appendChild(notes);
    if (current !== 'free' && !isCurrentPaid) {
      var note = document.createElement('p');
      note.className = 'one-note';
      note.textContent = 'عندك حالياً باقة ' + me.plan.name + (me.plan.until ? ' لحد ' + new Date(me.plan.until).toLocaleDateString(window.DFAI_LANG === 'en' ? 'en-GB' : 'ar-AE', { day: 'numeric', month: 'long' }) : '') + '.';
      notes.appendChild(note);
    }
    if (isCurrentPaid && me.plan.until) {
      var until = document.createElement('p');
      until.className = 'one-note ok';
      until.textContent = 'اشتراكك في ' + me.plan.name + ' شغّال لحد ' + new Date(me.plan.until).toLocaleDateString(window.DFAI_LANG === 'en' ? 'en-GB' : 'ar-AE', { day: 'numeric', month: 'long' }) + ' ✅';
      notes.appendChild(until);
    }
    var fine = document.createElement('p');
    fine.className = 'one-fine';
    fine.textContent = 'اشتراك لمدة 30 يوم، وتقدر تجدّده وقت ما تحب. الدفع آمن عن طريق زينة.';
    notes.appendChild(fine);
  }


  function requestPlan(plan, btn) {
    btn.disabled = true;
    if (state.config && state.config.onlinePay) {
      var label = btn.textContent;
      btn.textContent = 'جارٍ فتح صفحة الدفع…';
      apiJson('/api/pay', { method: 'POST', body: JSON.stringify({ plan: plan.id }) })
        .then(function (r) { window.location.href = r.url; })
        .catch(function (ex) {
          btn.disabled = false; btn.textContent = label;
          if (ex.code === 'manual') { state.config.onlinePay = false; return requestPlan(plan, btn); }
          toast(netMessage(ex));
        });
      return;
    }
    apiJson('/api/purchase-request', { method: 'POST', body: JSON.stringify({ plan: plan.id }) })
      .then(function (r) {
        var done = $('plansDone');
        done.hidden = false;
        if (r.purchaseUrl) {
          window.open(r.purchaseUrl, '_blank', 'noopener');
          done.innerHTML = 'فتحنالك صفحة الدفع لباقة <b></b> ✅<br>بعد الدفع، هيتفعّل اشتراكك خلال ساعات قليلة.';
        } else {
          done.innerHTML = 'استلمنا طلب اشتراكك في باقة <b></b> ✅<br>فريقنا هيتواصل معاك على بريدك لإتمام الدفع وتفعيل الباقة.';
        }
        done.querySelector('b').textContent = plan.name;
        if (r.contactUrl) {
          var a = document.createElement('a');
          a.href = r.contactUrl; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'أو تواصل معنا مباشرة على واتساب';
          done.appendChild(document.createElement('br'));
          done.appendChild(a);
        }
      })
      .catch(function (ex) { toast(netMessage(ex)); btn.disabled = false; });
  }

  // ---------- الوكلاء ----------
  // أيقونات الوكلاء بخط بسيط كما في التصميم (بدل الإيموجي)
  var AGENT_SVG = {
    strategy: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    seo: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    ads: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    social: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
    sales: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
    copy: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
  };
  function openAgents() {
    openModal('agentsModal', 'agentsClose');
    loadConfig().then(function (cfg) {
      var grid = $('agentsGrid');
      grid.innerHTML = '';
      (cfg.agents || []).forEach(function (a) {
        var info = AGENT_INFO[a.id] || { ico: '🤖', desc: '' };
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'agent-card' + (state.agent === a.id ? ' active' : '');
        b.innerHTML = '<span class="agent-ico" aria-hidden="true"></span><span class="agent-name"></span><span class="agent-desc"></span><span class="agent-chev" aria-hidden="true"></span>';
        var art = AGENT_SVG[a.id];
        if (art) b.querySelector('.agent-ico').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + art + '</svg>';
        else b.querySelector('.agent-ico').textContent = info.ico;
        b.querySelector('.agent-name').textContent = a.name;
        b.querySelector('.agent-desc').textContent = info.desc;
        b.addEventListener('click', function () { setAgent(a.id, a.name); closeModal('agentsModal'); });
        grid.appendChild(b);
      });
    }).catch(function (ex) { $('agentsGrid').textContent = netMessage(ex); });
  }
  $('agentsClose').addEventListener('click', function () { closeModal('agentsModal'); });

  function agentName(id) {
    var a = state.config && (state.config.agents || []).find(function (x) { return x.id === id; });
    return a ? a.name : 'وكيل متخصص';
  }

  // ---------- الأدوات ----------
  function renderTools() {
    var wrap = $('toolList');
    wrap.innerHTML = '';
    // الظاهر في القائمة 4 أدوات بس، والباقي تحت "استكشاف" (قائمة منسدلة)
    var MAIN_TOOL_IDS = ['image', 'search', 'site', 'business'];
    var mainTools = MAIN_TOOL_IDS.map(function (id) { return TOOLS.filter(function (t) { return t.id === id; })[0]; }).filter(Boolean);
    var restTools = TOOLS.filter(function (t) { return MAIN_TOOL_IDS.indexOf(t.id) === -1; });
    function buildTool(t) {
      var active = t.picker ? Boolean(state.agent) : state.tool === t.id;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn' + (active ? ' active' : '');
      b.setAttribute('aria-pressed', String(active));
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="color:' + t.color + '">' + t.icon + '</svg><span></span>';
      b.querySelector('span').textContent = t.picker && state.agent ? agentName(state.agent) : t.label;
      if (t.action) {
        b.classList.toggle('active', state.panel === t.id);
        b.setAttribute('aria-pressed', String(state.panel === t.id));
        if (t.id === 'monitors' && state.me && state.me.alerts) {
          var badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = String(state.me.alerts);
          badge.setAttribute('aria-label', state.me.alerts + ' تقرير جديد');
          b.appendChild(badge);
        }
      }
      b.addEventListener('click', function () {
        if (t.action) { if (window.DFAI && window.DFAI[t.action]) window.DFAI[t.action](); }
        else if (t.picker) openAgents();
        else { hidePanel(); setTool(state.tool === t.id ? null : t.id); }
        closeSide();
      });
      return b;
    }
    mainTools.forEach(function (t) { wrap.appendChild(buildTool(t)); });
    var exploreOpen = !!state.exploreOpen;
    var exBtn = document.createElement('button');
    exBtn.type = 'button';
    exBtn.className = 'tool-btn explore-btn' + (exploreOpen ? ' open' : '');
    exBtn.setAttribute('aria-expanded', String(exploreOpen));
    exBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="color:#A5B4FC"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg><span>استكشاف</span><svg viewBox="0 0 24 24" aria-hidden="true" class="explore-chev"><path d="m6 9 6 6 6-6"/></svg>';
    exBtn.addEventListener('click', function () { state.exploreOpen = !state.exploreOpen; renderTools(); });
    wrap.appendChild(exBtn);
    var explore = document.createElement('div');
    explore.className = 'explore-list';
    explore.hidden = !exploreOpen;
    restTools.forEach(function (t) { explore.appendChild(buildTool(t)); });
    wrap.appendChild(explore);
  }

  function setTool(id, noFocus) {
    state.tool = id;
    if (id) state.agent = null;
    updateChip();
    if (!noFocus) $('prompt').focus();
  }

  function setAgent(id, name, noFocus) {
    state.agent = id;
    if (id) state.tool = null;
    updateChip(name);
    if (!noFocus) $('prompt').focus();
  }

  function updateChip(name) {
    var chip = $('toolChip');
    var t = TOOLS.find(function (x) { return x.id === state.tool; });
    var label = state.agent ? (name || agentName(state.agent)) : t ? t.label : '';
    chip.hidden = !label;
    chip.classList.toggle('agent-chip', Boolean(state.agent));
    $('toolChipLabel').textContent = label;
    $('prompt').placeholder = state.agent ? ((AGENT_INFO[state.agent] || {}).ph || DEFAULT_PLACEHOLDER) : t ? t.placeholder : DEFAULT_PLACEHOLDER;
    renderTools();
  }
  $('toolChip').addEventListener('click', function () { state.agent = null; setTool(null); });

  // بطاقات الرئيسية الأربع كما في تصميم Dubai Fans AI
  var HOME_CARDS = [
    { label: 'إنشاء محتوى تسويقي', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6', tool: 'write', content: 'أنشئ لي محتوى تسويقي لنشاطي' },
    { label: 'تصميم صور إعلانية', icon: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4', tool: 'image', content: 'صمّم لي صور إعلانية لنشاطي' },
    { label: 'تحليل المنافسين', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', tool: 'search', content: 'حلّل المنافسين لنشاطي وقارن ظهورهم بظهوري' },
    { label: 'تحليل متجري أو الموقع', icon: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6', tool: 'site', content: 'حلّل متجري أو موقعي وقدّم ملاحظات للتحسين' }
  ];

  function renderCards() {
    var wrap = $('cards');
    wrap.innerHTML = '';
    HOME_CARDS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card card-home';
      b.innerHTML = '<span class="card-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d=""></path></svg></span><span class="card-title"></span>';
      b.querySelector('path').setAttribute('d', c.icon);
      b.querySelector('.card-title').textContent = c.label;
      b.addEventListener('click', function () { setTool(c.tool, true); send(window.DFAI_I18N ? window.DFAI_I18N.tr(c.content) : c.content); });
      wrap.appendChild(b);
    });
  }

  // شاشة الترحيب بعد تسجيل الدخول: تظهر ~6 ثوانٍ أو حتى يضغط "تخطي"
  var splashTimers = [];
  function hideSplash() {
    splashTimers.forEach(clearTimeout);
    splashTimers = [];
    var el = $('splash');
    if (!el) return;
    el.classList.remove('show', 'lit');
    el.hidden = true;
  }
  function playSplash() {
    var el = $('splash');
    if (!el) return;
    hideSplash();
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('show');
    $('splashSkip').onclick = hideSplash;
    splashTimers.push(setTimeout(function () { el.classList.add('lit'); }, 2000));
    splashTimers.push(setTimeout(hideSplash, 5800));
  }

  // ---------- المحادثات ----------
  // المحادثات تُحفظ على السيرفر (/api/chats). localStorage يحتفظ بنسخة احتياطية فقط
  // عندما توجد مزامنة لم تكتمل (مثلاً عند انقطاع الشبكة)، ثم يُحذف.
  var chatSync = { timer: null, running: false, synced: {}, deleted: [] };
  function chatsKey() { return 'dfai.chats.' + (state.me ? state.me.user.id : 'x'); }
  function cleanMsg(m) {
    var o = Object.assign({}, m);
    delete o.created_at;
    if (o.sources == null) delete o.sources;
    return o;
  }
  function chatHash(c) { return JSON.stringify([c.title, c.tool, c.agent, (c.messages || []).map(cleanMsg)]); }
  function unsyncedChats() { return state.chats.filter(function (c) { return !c._busy && chatSync.synced[c.id] !== chatHash(c); }); }
  // بعد انتهاء رد: لو السيرفر عنده رد أحدث (أكمل بعد انقطاع الاتصال) نأخذ نسخته
  function adoptFromServer(id) {
    if (!state.token) return;
    apiJson('/api/chats/' + encodeURIComponent(id)).then(function (d) {
      var c = state.chats.find(function (x) { return x.id === id; });
      if (!c || c._busy || !d.chat) return;
      var srv = (d.chat.messages || []).map(cleanMsg);
      var loc = c.messages || [];
      var sl = srv[srv.length - 1], ll = loc[loc.length - 1];
      var serverNewer = srv.length > loc.length || (sl && ll && sl.role === 'assistant' && ll.role === 'assistant' && String(sl.content || '').length > String(ll.content || '').length);
      if (!serverNewer) return;
      c.messages = srv;
      chatSync.synced[id] = chatHash(c);
      updateLocalBackup();
      renderChatList();
      if (state.currentId === id) openChat(id);
    }).catch(function () {});
  }
  function updateLocalBackup() {
    var pending = unsyncedChats().length || chatSync.deleted.length;
    store(chatsKey(), pending ? { chats: state.chats, deleted: chatSync.deleted } : null);
  }
  function loadChats() {
    var saved = store(chatsKey());
    var local = Array.isArray(saved) ? saved : ((saved && saved.chats) || []);
    var pendingDeletes = (saved && !Array.isArray(saved) && saved.deleted) || [];
    chatSync.deleted = pendingDeletes.slice();
    local.forEach(function (c) { c._busy = false; c._reqId = null; });
    state.chats = local;
    setTimeout(pollJobs, 1500);
    if (window.DFAI && DFAI.loadModels) DFAI.loadModels();
    if (!state.token) return;
    apiJson('/api/chats').then(function (data) {
      var rows = (data && data.chats) || [];
      return Promise.all(rows.map(function (row) {
        return apiJson('/api/chats/' + encodeURIComponent(row.id)).then(function (d) { return d.chat; }).catch(function () { return null; });
      })).then(function (full) {
        var fromServer = full.filter(Boolean).filter(function (c) { return pendingDeletes.indexOf(c.id) < 0; }).map(function (c) {
          return { id: c.id, title: c.title, tool: c.tool, agent: c.agent, created: c.created_at, messages: (c.messages || []).map(cleanMsg) };
        });
        var ids = {};
        fromServer.forEach(function (c) { ids[c.id] = true; chatSync.synced[c.id] = chatHash(c); });
        // محادثات محلية لم تُرفع بعد (الترحيل لمرة واحدة) تُضاف وتُرفع في المزامنة التالية
        local.forEach(function (c) { if (!ids[c.id] && pendingDeletes.indexOf(c.id) < 0) fromServer.push(c); });
        fromServer.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
        state.chats = fromServer;
        updateLocalBackup();
        renderChatList();
        scheduleChatSync(0);
      });
    }).catch(function () { /* بدون اتصال: نعرض النسخة المحلية */ });
  }
  function saveChats() {
    if (state.chats.length > 40) state.chats = state.chats.slice(0, 40);
    updateLocalBackup();
    scheduleChatSync();
  }
  function scheduleChatSync(delay) {
    if (!state.token) return;
    clearTimeout(chatSync.timer);
    chatSync.timer = setTimeout(syncChats, delay == null ? 1200 : delay);
  }
  function saveOneChat(c) {
    var base = '/api/chats/' + encodeURIComponent(c.id);
    return apiJson(base, { method: 'PUT', body: JSON.stringify({ title: c.title || '', tool: c.tool || null, agent: c.agent || null }) })
      .then(function () { return apiJson(base + '/messages', { method: 'PUT', body: JSON.stringify((c.messages || []).map(cleanMsg)) }); });
  }
  function syncChats() {
    if (!state.token) return;
    if (chatSync.running) { scheduleChatSync(2000); return; }
    var todo = unsyncedChats();
    var dels = chatSync.deleted.slice();
    if (!todo.length && !dels.length) { updateLocalBackup(); return; }
    chatSync.running = true;
    var jobs = dels.map(function (id) {
      return api('/api/chats/' + encodeURIComponent(id), { method: 'DELETE' }).then(function (res) {
        if (res.ok || res.status === 404) chatSync.deleted = chatSync.deleted.filter(function (x) { return x !== id; });
        else throw new Error('delete ' + res.status);
      });
    }).concat(todo.map(function (c) {
      var snap = chatHash(c);
      return saveOneChat(c).then(function () { chatSync.synced[c.id] = snap; }, function (err) {
        // خطأ من السيرفر (مثلاً الحد الأقصى): لا نعيد المحاولة باستمرار. انقطاع الشبكة: نعيد لاحقاً
        if (err && err.status) { chatSync.synced[c.id] = snap; console.warn('chat sync rejected', err.status); return; }
        throw err;
      });
    }));
    Promise.allSettled(jobs).then(function (results) {
      chatSync.running = false;
      var retry = results.some(function (r) { return r.status === 'rejected'; });
      updateLocalBackup();
      if (retry) scheduleChatSync(15000);
    });
  }
  function currentChat() { return state.chats.find(function (c) { return c.id === state.currentId; }); }

  function renderChatList() {
    var wrap = $('chatList');
    wrap.innerHTML = '';
    if (!state.chats.length) {
      wrap.innerHTML = '<div class="empty-hint">لسه مفيش محادثات</div>';
      return;
    }
    state.chats.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'chat-item' + (c.id === state.currentId ? ' active' : '');
      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'chat-open';
      open.textContent = c.title || 'محادثة';
      open.addEventListener('click', function () { openChat(c.id); closeSide(); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn chat-del';
      del.setAttribute('aria-label', 'حذف المحادثة');
      del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
      del.addEventListener('click', function () {
        if (!confirm('حذف المحادثة دي؟')) return;
        state.chats = state.chats.filter(function (x) { return x.id !== c.id; });
        delete chatSync.synced[c.id];
        chatSync.deleted.push(c.id);
        saveChats();
        if (state.currentId === c.id) newChat(); else renderChatList();
      });
      row.appendChild(open);
      row.appendChild(del);
      wrap.appendChild(row);
    });
  }

  function newChat() {
    if (state.controller) state.controller.abort();
    hidePanel();
    state.currentId = null;
    $('thread').innerHTML = '';
    $('main').classList.add('is-home');
    state.agent = null;
    setTool(null, true);
    renderChatList();
  }
  $('newChatBtn').addEventListener('click', function () { newChat(); closeSide(); });
  $('topNewChat').addEventListener('click', function () { hidePanel(); newChat(); });

  function openChat(id) {
    if (state.controller) state.controller.abort();
    var c = state.chats.find(function (x) { return x.id === id; });
    if (!c) return;
    hidePanel();
    state.currentId = id;
    $('main').classList.remove('is-home');
    $('thread').innerHTML = '';
    var lastEl = null;
    c.messages.forEach(function (m) {
      if (m.role === 'user') addUserMsg(m.content, m.att);
      else if (m.image) renderImageMsg(addAiShell(), m);
      else if (m.pendingJob) { var pe = addAiShell(); pe.querySelector('.md').innerHTML = pendingHtml(); jobEls[m.pendingJob] = pe; pollSoon(); }
      else if (m.videoUrl) { renderVideoMsg(addAiShell(), m); }
      else if (m.jobError) { var fe = addAiShell(); fe.querySelector('.md').innerHTML = '<div class="msg-error"></div>'; fe.querySelector('.msg-error').textContent = m.jobError; }
      else if (m.gallery && window.DFAI.renderGallery) window.DFAI.renderGallery(addAiShell(), m);
      else {
        var el = addAiShell();
        finalizeAi(el, m.content, m);
        lastEl = el;
      }
    });
    var lastM = c.messages[c.messages.length - 1];
    if (lastM && lastM.suggest && lastEl) renderSuggest(lastEl, lastM.suggest);
    if (c.agent) setAgent(c.agent, null, true); else setTool(c.tool || null, true);
    renderChatList();
    $('thread').scrollTop = $('thread').scrollHeight;
  }

  // ---------- عرض الرسائل ----------
  function addUserMsg(text, att) {
    renderSuggest(null);
    var el = document.createElement('div');
    el.className = 'msg msg-user';
    if (att && att.length) {
      var box = document.createElement('div');
      box.className = 'msg-att';
      att.forEach(function (a) {
        if (a.kind === 'image' && a.thumb) {
          var im = document.createElement('img');
          im.src = a.thumb; im.alt = a.name || 'صورة مرفقة';
          box.appendChild(im);
        } else {
          var f = document.createElement('span');
          f.className = 'msg-file';
          f.textContent = '📎 ' + (a.name || 'ملف');
          box.appendChild(f);
        }
      });
      el.appendChild(box);
    }
    var b = document.createElement('div');
    b.className = 'bubble';
    b.textContent = text;
    el.appendChild(b);
    $('thread').appendChild(el);
    return el;
  }

  function addAiShell(pending) {
    var el = document.createElement('div');
    el.className = 'msg msg-ai';
    el.innerHTML =
      '<div class="ai-avatar">' + LOGO_SVG + '</div>' +
      '<div class="ai-body"><div class="ai-name">Dubai Fans AI</div><div class="md"></div>' +
      '<div class="extra"></div>' +
      '<div class="msg-actions" hidden>' +
      '<button type="button" class="icon-btn copy-btn" aria-label="نسخ الرد" title="نسخ">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></div></div>';
    // مؤشر "المساعد بيفكّر": موجة صوتية متحركة مع وهج، وبيختفي تلقائياً أول ما يوصل أول جزء من الرد
    if (pending) el.querySelector('.md').innerHTML = '<span class="ai-orb" aria-label="يفكّر"><span class="ai-orb-ring"></span><span class="ai-orb-dots"><i></i><i></i><i></i></span></span>';
    el._raw = '';
    el.querySelector('.copy-btn').addEventListener('click', function () {
      (navigator.clipboard ? navigator.clipboard.writeText(el._raw) : Promise.reject())
        .then(function () { toast('اتنسخ ✅'); })
        .catch(function () { toast('مقدرتش أنسخ، حدّد النص وانسخه يدوياً'); });
    });
    $('thread').appendChild(el);
    return el;
  }

  function setAgentTag(el, m) {
    if (!m || !m.agent) return;
    var tag = document.createElement('span');
    tag.className = 'engine-tag';
    tag.textContent = agentName(m.agent);
    el.querySelector('.ai-name').appendChild(tag);
  }

  function renderSources(el, sources) {
    var box = el.querySelector('.extra');
    if (!sources || !sources.length || box.querySelector('.sources')) return;
    var wrap = document.createElement('div');
    wrap.className = 'sources';
    wrap.innerHTML = '<div class="sources-title">المصادر</div><ol></ol>';
    var ol = wrap.querySelector('ol');
    sources.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = /^https?:\/\//.test(s.url) ? s.url : '#';
      a.target = '_blank'; a.rel = 'noopener nofollow';
      a.textContent = s.title || s.url;
      li.appendChild(a);
      ol.appendChild(li);
    });
    box.appendChild(wrap);
  }

  // يعرض رابط الصفحة المنشورة داخل الرد، مع زر نسخ
  function showPublishedLink(host, url) {
    var old = host.querySelector('.pub-link');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'pub-link';
    box.style.cssText = 'width:100%;display:grid;gap:8px;margin-top:10px;padding:12px;border-radius:14px;border:1px solid var(--line-2);background:var(--surface)';
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = url;
    a.style.cssText = 'direction:ltr;text-align:left;word-break:break-all;color:var(--accent);font-size:14px';
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'result-btn';
    copy.textContent = 'نسخ الرابط';
    copy.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('تم النسخ'); }, function () { toast('تعذّر النسخ.'); });
    });
    box.appendChild(a);
    box.appendChild(copy);
    host.appendChild(box);
  }

  // ينشر صفحة الهبوط اللي ولّدها المساعد على رابط عام (من غير توليد جديد)
  function publishSite(m, btn) {
    var html = extractHtml(m.content) || '';
    if (!html) { toast('ما فيش صفحة تتنشر.'); return; }
    if (btn) btn.disabled = true;
    var slug = 'lp-' + Date.now().toString(36);
    var brief = 'صفحة هبوط منشورة من المساعد: ' + (m.title || 'بدون عنوان');
    apiJson('/api/landing', { method: 'POST', body: JSON.stringify({ brief: brief, slug: slug, html: html }) })
      .then(function (d) {
        toast('تم النشر');
        if (d && d.url && btn && btn.parentNode) showPublishedLink(btn.parentNode, d.url);
      })
      .catch(function (ex) { toast(ex.message || 'تعذّر النشر.'); })
      .then(function () { if (btn) btn.disabled = false; });
  }

  function actionButton(html, label, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'result-btn';
    b.innerHTML = html + '<span></span>';
    b.querySelector('span').textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  // يحط الرد النهائي + المصادر + أزرار الأدوات
  // سطر الاقتراحات اللي بيرجع في آخر الرد: [[ ... | ... | ... ]]
  function splitSuggest(t) {
    t = String(t || '');
    var i = t.lastIndexOf('[[');
    if (i < 0) {
      var k = t.lastIndexOf('[');
      if (k >= 0 && k >= t.length - 2 && (k === 0 || t[k - 1] === '\n')) return { text: t.slice(0, k).replace(/\s+$/, ''), items: [] };
      return { text: t, items: [] };
    }
    var rest = t.slice(i);
    if (!/^\[\[[^\n\]]*(\]\]?)?\s*$/.test(rest)) return { text: t, items: [] };
    var items = rest.replace(/^\[\[|\]+\s*$/g, '').split('|').map(function (x) { return x.trim().replace(/^[-–•\d.\s]+/, ''); })
      .filter(function (x) { return x && x.length <= 80; }).slice(0, 3);
    return { text: t.slice(0, i).replace(/\s+$/, ''), items: /\]\]\s*$/.test(rest) ? items : [] };
  }
  function renderSuggest(el, items) {
    Array.prototype.forEach.call(document.querySelectorAll('.suggest-row'), function (x) { x.remove(); });
    if (!el || !items || !items.length) return;
    var row = document.createElement('div');
    row.className = 'suggest-row';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'suggest-chip';
      b.textContent = it;
      b.addEventListener('click', function () { if (!state.busy) send(it); });
      row.appendChild(b);
    });
    el.querySelector('.extra').appendChild(row);
  }

  function finalizeAi(el, text, m) {
    el._raw = text || '';
    el.querySelector('.md').innerHTML = renderMarkdown(text || '');
    setAgentTag(el, m);
    renderSources(el, m && m.sources);
    var box = el.querySelector('.extra');
    var actions = document.createElement('div');
    actions.className = 'result-actions';

    var deck = m && m.tool === 'slides' ? parseDeck(text) : null;
    if (deck && deck.slides.length) {
      actions.appendChild(actionButton(ICON_DL, 'تحميل العرض PowerPoint', function () { exportPptx(deck, this); }));
    }
    var html = m && m.tool === 'site' ? extractHtml(text) : null;
    if (html) {
      actions.appendChild(actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>', 'افتح في المحرر', function () {
        if (window.DFAI && window.DFAI.openEditor) window.DFAI.openEditor(m, el);
      }));
      actions.appendChild(actionButton(ICON_EYE, 'معاينة الموقع', function () { openSite(extractHtml(m.content) || html, m.title); }));
      actions.appendChild(actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>', 'نشر الصفحة', function () { publishSite(m, this); }));
      actions.appendChild(actionButton(ICON_DL, 'تحميل HTML', function () {
        downloadBlob(new Blob([extractHtml(m.content) || html], { type: 'text/html;charset=utf-8' }), safeName(m.title) + '.html');
      }));
    }
    if (actions.children.length) box.appendChild(actions);
    el.querySelector('.msg-actions').hidden = !text;
  }

  // كابشن جاهز للنشر مع الهاشتاجات وأفضل وقت
  function postCard(p) {
    var box = document.createElement('div');
    box.className = 'post-card';
    var full = p.caption + (p.hashtags && p.hashtags.length ? '\n\n' + p.hashtags.join(' ') : '');
    var h = document.createElement('div'); h.className = 'post-head';
    h.innerHTML = '<span>الكابشن جاهز للنشر</span>';
    var cp = document.createElement('button'); cp.type = 'button'; cp.className = 'post-copy'; cp.textContent = 'نسخ الكابشن';
    cp.addEventListener('click', function () {
      var done = function () { cp.textContent = 'اتنسخ ✓'; setTimeout(function () { cp.textContent = 'نسخ الكابشن'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done, function () { fallbackCopy(full); done(); });
      else { fallbackCopy(full); done(); }
    });
    h.appendChild(cp); box.appendChild(h);
    var t = document.createElement('div'); t.className = 'post-text'; t.textContent = p.caption; box.appendChild(t);
    if (p.hashtags && p.hashtags.length) { var tg = document.createElement('div'); tg.className = 'post-tags'; p.hashtags.forEach(function (x) { var sp = document.createElement('bdi'); sp.textContent = x; tg.appendChild(sp); tg.appendChild(document.createTextNode(' ')); }); box.appendChild(tg); }
    var times = p.times || {};
    [['instagram', 'إنستغرام'], ['tiktok', 'تيك توك']].forEach(function (x) {
      if (!times[x[0]]) return;
      var r = document.createElement('div'); r.className = 'post-time';
      var b = document.createElement('b'); b.textContent = 'أفضل وقت على ' + x[1] + ': ';
      r.appendChild(b); r.appendChild(document.createTextNode(times[x[0]]));
      box.appendChild(r);
    });
    return box;
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
  }

  function renderImageMsg(el, m) {
    var md = el.querySelector('.md');
    md.innerHTML = '';
    if (m.label) { var lb = document.createElement('div'); lb.className = 'img-label'; lb.textContent = m.label; md.appendChild(lb); }
    var img = document.createElement('img');
    img.className = 'gen-image';
    img.src = m.image;
    img.alt = m.prompt || 'صورة مولّدة';
    img.loading = 'lazy';
    img.onerror = function () { md.innerHTML = '<div class="msg-error">الصورة دي اتمسحت من السيرفر (الصور بتتحفظ 30 يوم).</div>'; };
    md.appendChild(img);
    var ad = window.DFAI && window.DFAI.adStudio;
    var hasText = ad && m.design && ad.hasText(m.design);
    if (hasText) {
      ad.compose(m.image, m.design).then(function (cv) { img.src = cv.toDataURL('image/jpeg', 0.92); })
        .catch(function () { /* تفضل الصورة الأصلية ظاهرة */ });
    }
    if (ad && ad.isPro && ad.isPro(m.design)) {
      var strip = document.createElement('div');
      strip.className = 'layout-strip';
      var lab = document.createElement('div');
      lab.className = 'layout-label';
      lab.textContent = 'جرّب شكل تاني لنفس الإعلان:';
      el.querySelector('.extra').appendChild(lab);
      var L = ad.LAYOUTS();
      Object.keys(L).forEach(function (k) {
        if (k === 'overlay' || (k === 'offer' && !m.design.badge)) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'layout-thumb' + (k === m.design.layout ? ' on' : '');
        btn.title = L[k];
        btn.innerHTML = '<span class="lt-img"></span><span class="lt-name"></span>';
        btn.querySelector('.lt-name').textContent = L[k];
        var dd = Object.assign({}, m.design, { layout: k });
        ad.compose(m.image, dd, 0.22).then(function (cv) {
          cv.className = 'lt-canvas';
          btn.querySelector('.lt-img').appendChild(cv);
        }).catch(function () {});
        btn.addEventListener('click', function () {
          if (k === m.design.layout) return;
          m.design = Object.assign({}, m.design, { layout: k });
          saveChats();
          el.querySelector('.extra').innerHTML = '';
          renderImageMsg(el, m);
        });
        strip.appendChild(btn);
      });
      el.querySelector('.extra').appendChild(strip);
    }
    if (m.post && m.post.caption) el.querySelector('.extra').appendChild(postCard(m.post));
    var actions = document.createElement('div');
    actions.className = 'result-actions';
    if (ad) {
      actions.appendChild(actionButton(ICON_DL, 'تحميل التصميم', function () {
        ad.download(m.image, m.design || {});
      }));
      actions.appendChild(actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
        hasText ? 'عدّل الكتابة واللوجو' : 'أضف كتابة ولوجو', function () {
          ad.open(m, function (design) {
            m.design = design;
            saveChats();
            el.querySelector('.extra').innerHTML = '';
            renderImageMsg(el, m);
          });
        }));
    }
    if (ad && ad.isPro && ad.isPro(m.design) && window.DFAI.adVideo) {
      var vb = actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-2v8l-4-2"/></svg>', 'فيديو ريلز / تيك توك', function () {
        var btn = this, label = btn.querySelector('span');
        if (btn.disabled) return;
        btn.disabled = true;
        label.textContent = 'جارٍ تجهيز الفيديو… 0%';
        window.DFAI.adVideo.make(m, function (p) { label.textContent = 'جارٍ تجهيز الفيديو… ' + Math.round(p * 100) + '%'; })
          .then(function (r) {
            var url = URL.createObjectURL(r.blob);
            var old = el.querySelector('.ad-video');
            if (old) old.remove();
            var wrap = document.createElement('div');
            wrap.className = 'ad-video';
            var v = document.createElement('video');
            v.src = url; v.controls = true; v.playsInline = true; v.muted = true; v.loop = true; v.autoplay = true;
            wrap.appendChild(v);
            var note = document.createElement('p');
            note.textContent = 'الفيديو 8 ثواني بمقاس الريلز (9:16) ومن غير صوت، ضيف عليه موسيقى من مكتبة إنستغرام أو تيك توك وانت بتنشره.';
            wrap.appendChild(note);
            el.querySelector('.extra').insertBefore(wrap, actions);
            downloadBlob(r.blob, 'dubai-fans-ai-reel-' + Date.now() + '.' + r.ext);
            if (r.ext !== 'mp4') toast('المتصفح ده بيطلّع الفيديو WebM. افتح من كروم أو سفاري عشان يطلع MP4.');
            label.textContent = 'فيديو ريلز / تيك توك';
          })
          .catch(function (e) {
            toast(e && e.message === 'blank-frame'
              ? 'الصورة الأصلية طلعت فاضية، فما نقدرش نعمل منها فيديو. ولّد الصورة من جديد.'
              : 'مقدرناش نعمل الفيديو على الجهاز ده. جرّب من كروم أو سفاري محدّث.');
            label.textContent = 'فيديو ريلز / تيك توك';
          })
          .finally(function () { btn.disabled = false; });
      });
      actions.appendChild(vb);
    }
    var dl = document.createElement('button');
    dl.type = 'button';
    dl.className = 'result-btn';
    dl.innerHTML = ICON_DL + '<span>' + (ad ? 'الصورة بدون كتابة' : 'تحميل الصورة') + '</span>';
    dl.onclick = function () { saveUrl(m.image, 'dubai-fans-ai-' + Date.now()); };
    actions.appendChild(dl);
    if (m.retry) actions.appendChild(actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></svg>', 'نسخة تانية', function () {
      setTool('image', true); send(m.retry);
    }));
    el.querySelector('.extra').appendChild(actions);
  }

  // ---------- حملة موسم كاملة ----------
  function startCampaign(occ, offer) {
    if (state.busy || !occ) return;
    if (left('messages') <= 0 || left('images') <= 0) {
      openPlans('الحملة محتاجة رسائل وصور متاحة في باقتك النهارده. اشترك في Pro عشان تجهّز حملات كاملة.');
      return;
    }
    newChat();
    setTool('image', true);
    var text = (window.DFAI_LANG === 'en' ? 'Prepare a campaign for ' : 'جهّز لي حملة ') + occ.name + (offer ? (window.DFAI_LANG === 'en' ? ' — offer: ' : ' — العرض: ') + offer : '');
    var chat = { id: uid(), title: ('حملة ' + occ.name).slice(0, 48), tool: 'image', agent: null, messages: [], created: Date.now() };
    state.chats.unshift(chat);
    state.currentId = chat.id;
    chat.messages.push({ role: 'user', content: text });
    saveChats();
    renderChatList();
    $('main').classList.remove('is-home');
    addUserMsg(text);
    scrollDown(true);
    var el = addAiShell();
    el.querySelector('.md').innerHTML = '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span>جارٍ تخطيط الحملة…</span></div>';
    setStreaming(true);
    apiJson('/api/campaign', { method: 'POST', body: JSON.stringify({ occasion: occ.id, offer: offer || '' }) })
      .then(function (plan) {
        // تصميم واحد لكل طلب: الحملة تعمل أول تصميم بس، والباقي يتطلب طلب منفصل
        var n = Math.min(1, plan.posts.length, left('images'));
        var EN_UI = window.DFAI_LANG === 'en';
        var md = '### ' + plan.title + '\n\n' + plan.intro + '\n\n' +
          plan.posts.map(function (x, i) { return (i + 1) + '. **' + x.role + '**' + (x.when ? ' — ' + x.when : '') + (x.size === 'story' ? (EN_UI ? ' (Story)' : ' (ستوري)') : ''); }).join('\n') +
          (plan.occasion.approx ? (EN_UI ? '\n\n_The occasion date is approximate and will be confirmed by the moon sighting._' : '\n\n_تاريخ المناسبة تقريبي ويتحدد رسمياً برؤية الهلال._') : '') +
          (n === 0
            ? (EN_UI ? '\n\n**No image credits left today.**' : '\n\n**خلص رصيد الصور النهارده.**')
            : (EN_UI ? '\n\nI will prepare **one design** now with its caption. For the next ones, send a separate request for each design.' : '\n\nهجهّز **تصميماً واحداً** دلوقتي ومعه الكابشن. لباقي التصاميم، ابعت طلب منفصل لكل تصميم.'));
        var m = { role: 'assistant', content: md };
        chat.messages.push(m);
        saveChats();
        finalizeAi(el, md, m);
        setStreaming(false);
        refreshMe();
        var chain = Promise.resolve();
        plan.posts.slice(0, n).forEach(function (x, i) {
          chain = chain.then(function () {
            if (state.currentId !== chat.id) return;
            return sendImage(chat, x.brief, [], { size: x.size, occasionColors: plan.occasion.colors, label: 'تصميم ' + (i + 1) + ' من ' + n + ' · ' + x.role + (x.when ? ' (' + x.when + ')' : '') });
          });
        });
        return chain;
      })
      .catch(function (ex) {
        setStreaming(false);
        if (ex.code === 'quota') return failQuota(el, chat, ex);
        el.querySelector('.md').innerHTML = '<div class="msg-error"></div>';
        el.querySelector('.msg-error').textContent = netMessage(ex);
      });
  }

  function addQuotaAlert(message) {
    var box = document.createElement('div');
    box.className = 'quota-alert';
    var p = document.createElement('p');
    p.textContent = message;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-primary';
    b.textContent = 'شوف الباقات';
    b.addEventListener('click', function () { openPlans(message); });
    box.appendChild(p);
    box.appendChild(b);
    $('thread').appendChild(box);
  }

  function scrollDown(force) {
    var t = $('thread');
    if (force || t.scrollHeight - t.scrollTop - t.clientHeight < 160) t.scrollTop = t.scrollHeight;
  }

  // ---------- العروض التقديمية ----------
  function parseDeck(md) {
    var deck = { title: '', slides: [] };
    var cur = null;
    String(md || '').split('\n').forEach(function (line) {
      var l = line.trim();
      if (!l) return;
      var m;
      if ((m = l.match(/^#\s+(.+)/)) && !deck.title) { deck.title = clean(m[1]); return; }
      if ((m = l.match(/^#{2,3}\s+(.+)/))) {
        cur = { title: clean(m[1]).replace(/^(الشريحة|شريحة)\s*\d*\s*[:：\-–]?\s*/, ''), bullets: [], notes: '' };
        deck.slides.push(cur);
        return;
      }
      if (!cur) return;
      if ((m = l.match(/^>\s*(.+)/))) { cur.notes += (cur.notes ? '\n' : '') + clean(m[1]).replace(/^ملاحظة( للمتحدث)?\s*[:：]\s*/, ''); return; }
      if ((m = l.match(/^(?:[-*•]|\d+[.)])\s+(.+)/))) { if (cur.bullets.length < 7) cur.bullets.push(clean(m[1])); }
    });
    if (!deck.title) deck.title = 'عرض تقديمي';
    return deck;
    function clean(s) { return s.replace(/\*\*|__|`/g, '').trim(); }
  }

  function exportPptx(deck, btn) {
    btn.disabled = true;
    var ready = window.PptxGenJS ? Promise.resolve() : loadScript('vendor/pptxgen.bundle.js');
    ready.then(function () {
      var pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.rtlMode = true;
      pptx.title = deck.title;
      var BG = '0B0D14', TXT = 'F2F4F8', MUTED = '9AA3B5', ACC = '6D4AFF', LAV = 'B9A8FF';
      var font = 'Arial';

      var cover = pptx.addSlide();
      cover.background = { color: BG };
      cover.addShape(pptx.ShapeType.ellipse, { x: 9.6, y: -1.2, w: 5, h: 5, fill: { color: ACC, transparency: 70 }, line: { color: ACC, transparency: 100 } });
      cover.addText(deck.title, { x: 0.8, y: 2.4, w: 11.7, h: 1.6, fontFace: font, fontSize: 40, bold: true, color: TXT, align: 'right', rtlMode: true, valign: 'middle' });
      cover.addShape(pptx.ShapeType.rect, { x: 10.5, y: 4.2, w: 2, h: 0.08, fill: { color: LAV }, line: { color: LAV } });
      cover.addText('Dubai Fans AI', { x: 0.8, y: 6.6, w: 11.7, h: 0.4, fontFace: font, fontSize: 12, color: MUTED, align: 'right' });

      deck.slides.forEach(function (s, i) {
        var sl = pptx.addSlide();
        sl.background = { color: BG };
        sl.addShape(pptx.ShapeType.rect, { x: 12.83, y: 0, w: 0.5, h: 7.5, fill: { color: ACC }, line: { color: ACC } });
        sl.addText(s.title, { x: 0.8, y: 0.5, w: 11.6, h: 1.0, fontFace: font, fontSize: 30, bold: true, color: TXT, align: 'right', rtlMode: true, valign: 'middle' });
        sl.addShape(pptx.ShapeType.rect, { x: 10.9, y: 1.55, w: 1.5, h: 0.06, fill: { color: LAV }, line: { color: LAV } });
        if (s.bullets.length) {
          sl.addText(s.bullets.map(function (b) {
            return { text: b, options: { bullet: { code: '25CF' }, rtlMode: true, paraSpaceAfter: 14 } };
          }), { x: 0.8, y: 1.9, w: 11.6, h: 4.8, fontFace: font, fontSize: 20, color: 'DCE0E8', align: 'right', valign: 'top', rtlMode: true });
        }
        sl.addText(String(i + 1), { x: 0.5, y: 6.8, w: 0.6, h: 0.4, fontFace: font, fontSize: 11, color: MUTED, align: 'left' });
        if (s.notes) sl.addNotes(s.notes);
      });
      return pptx.writeFile({ fileName: safeName(deck.title) + '.pptx' });
    }).then(function () { toast('العرض اتحمّل ✅'); })
      .catch(function (ex) { toast(netMessage(ex)); })
      .finally(function () { btn.disabled = false; });
  }

  // ---------- المواقع ----------
  function extractHtml(md) {
    var m = String(md || '').match(/```html\s*([\s\S]*?)(```|$)/i);
    if (!m) return null;
    var html = m[1].trim();
    return /<html|<body|<section|<div/i.test(html) && html.length > 200 ? html : null;
  }

  var siteHtml = '', siteName = '';
  function openSite(html, title) {
    siteHtml = html; siteName = title || 'الموقع';
    $('siteFrame').srcdoc = html;
    setSiteWidth('100%');
    openModal('siteModal', 'siteClose');
  }
  function setSiteWidth(w) {
    $('siteFrame').style.width = w;
    Array.prototype.forEach.call(document.querySelectorAll('.site-view'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-w') === w);
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.site-view'), function (b) {
    b.addEventListener('click', function () { setSiteWidth(b.getAttribute('data-w')); });
  });
  $('siteClose').addEventListener('click', function () { closeModal('siteModal'); $('siteFrame').srcdoc = ''; });
  $('siteDownload').addEventListener('click', function () {
    downloadBlob(new Blob([siteHtml], { type: 'text/html;charset=utf-8' }), safeName(siteName) + '.html');
  });

  // ---------- الإرسال ----------
  function setStreaming(on) {
    state.busy = on;
    $('composer').classList.toggle('busy', on);
    var btn = $('sendBtn');
    btn.classList.toggle('is-stop', on && Boolean(state.controller));
    btn.setAttribute('aria-label', on ? 'إيقاف' : 'إرسال');
    btn.disabled = on ? !state.controller : !$('prompt').value.trim();
  }

  function kindFor(tool) {
    return tool === 'image' || tool === 'video' ? 'images' : tool === 'search' ? 'search' : tool === 'slides' ? 'slides' : 'messages';
  }

  function attContext(att, full) {
    if (!att || !att.length) return '';
    return '\n\n---\nمرفقات من المستخدم (استخدمها في ردّك، ولو طلب حاجة مشابهة اعمل نسخة جديدة مناسبة لنشاطه من غير نسخ حرفي):\n' +
      att.map(function (a) {
        if (a.kind === 'image') return '[صورة: ' + (a.name || 'صورة') + ']\nوصف تفصيلي للصورة: ' + (a.desc || 'غير متاح');
        var t = a.text || '';
        if (!full) t = t.slice(0, 1200) + (t.length > 1200 ? '…' : '');
        return '[ملف: ' + (a.name || 'ملف') + ']' + (a.truncated && full ? ' (أول جزء من الملف فقط)' : '') + '\n<<<\n' + t + '\n>>>';
      }).join('\n\n');
  }
  function historyFor(chat) {
    var msgs = chat.messages.slice(-12);
    var lastUser = -1;
    msgs.forEach(function (m, i) { if (m.role === 'user') lastUser = i; });
    return msgs.map(function (m, i) {
      if (m.image) return { role: 'assistant', content: '[تم إنشاء صورة بالوصف: ' + (m.prompt || '') + ']' + (m.design && m.design.headline ? '\nعنوان الإعلان: ' + m.design.headline : '') + (m.post && m.post.caption ? '\nالكابشن:\n' + m.post.caption + '\n' + (m.post.hashtags || []).join(' ') : '') };
      if (m.gallery) return { role: 'assistant', content: '[تم تصميم ' + m.gallery.length + ' صورة بعنوان "' + ((m.design && m.design.title) || '') + '" فيها ' + ((m.design && m.design.items && m.design.items.length) || 0) + ' عنصر]' };
      return { role: m.role, content: m.content + (m.role === 'user' ? attContext(m.att, i === lastUser) : '') };
    });
  }

  // ---------- طلب الفيديو من نفس التصميم المعتمد ----------
  // "اعمله فيديو" بعد صورة/تصميم في المحادثة = فيديو من نفس الصورة والنص، مش صورة جديدة.
  var VIDEO_RE = /(فيديو|فيدو|ريلز|reel|video|تيك ?توك|tiktok)/i;
  var NEW_SUBJECT_RE = /(جديد|جديدة|مختلف|مختلفة|غير|بدل|مكان|لمنتج|لمطعم|لعيادة|لمحل|صورة جديدة|تصميم جديد)/;
  function lastDesignImage(chat) {
    for (var i = chat.messages.length - 1; i >= 0; i -= 1) {
      var m = chat.messages[i];
      if (m.image && !m.gallery) return m;
    }
    return null;
  }
  function isVideoFollowUp(text, chat) {
    return text.length <= 120 && VIDEO_RE.test(text) && !NEW_SUBJECT_RE.test(text) && !!lastDesignImage(chat) && !!window.DFAI.adVideo;
  }
  // فيديو الريلز في الخلفية (على السيرفر): يرجع فوراً برقم مهمة، والفيديو يظهر لما يخلص
  function renderVideoMsg(el, m) {
    el.querySelector('.md').innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'ad-video';
    var v = document.createElement('video');
    v.src = m.videoUrl; v.controls = true; v.playsInline = true; v.muted = true; v.loop = true;
    wrap.appendChild(v);
    var a = document.createElement('a');
    a.href = m.videoUrl; a.download = 'dubai-fans-ai-reel-' + Date.now() + '.mp4';
    a.className = 'result-btn';
    a.innerHTML = ICON_DL + '<span>تحميل الفيديو (MP4)</span>';
    wrap.appendChild(a);
    el.querySelector('.md').appendChild(wrap);
  }

  function makeVideoFromServer(chat, src) {
    var el = addAiShell();
    el.querySelector('.md').innerHTML = pendingHtml();
    setStreaming(true);
    scrollDown(true);
    return apiJson('/api/jobs/video', { method: 'POST', body: JSON.stringify({ imageUrl: src.image, overlay: src.overlay }) })
      .then(function (r) {
        var m = { role: 'assistant', content: '', pendingJob: r.job.id, pendingKind: 'video' };
        chat.messages.push(m);
        saveChats();
        jobEls[r.job.id] = el;
        pollSoon();
      })
      .catch(function (e) {
        el.querySelector('.md').innerHTML = '<div class="msg-error"></div>';
        el.querySelector('.msg-error').textContent = netMessage(e);
      })
      .finally(function () { setStreaming(false); scrollDown(false); });
  }

  function makeVideoFromDesign(chat, src) {
    // التصاميم الجديدة (فيها overlay) تتحول لفيديو على السيرفر في الخلفية
    if (src && src.overlay && src.image) return makeVideoFromServer(chat, src);
    var el = addAiShell();
    el.querySelector('.md').innerHTML = '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span>بجهّز الفيديو من نفس التصميم… 0%</span></div>';
    var span = el.querySelector('.img-pending span');
    setStreaming(true);
    scrollDown(true);
    return window.DFAI.adVideo.make(src, function (p) {
      if (span) span.textContent = 'بجهّز الفيديو من نفس التصميم… ' + Math.round(p * 100) + '%';
    }).then(function (r) {
      var m = { role: 'assistant', content: 'جهّزت فيديو ريلز 8 ثواني (9:16) من نفس التصميم اللي اعتمدته، من غير صوت. ضيف عليه موسيقى وانت بتنشره.', video: true };
      chat.messages.push(m);
      saveChats();
      finalizeAi(el, m.content, m);
      var wrap = document.createElement('div');
      wrap.className = 'ad-video';
      var v = document.createElement('video');
      v.src = URL.createObjectURL(r.blob); v.controls = true; v.playsInline = true; v.muted = true; v.loop = true;
      wrap.appendChild(v);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'result-btn';
      btn.innerHTML = ICON_DL + '<span>تحميل الفيديو (MP4)</span>';
      btn.onclick = function () { downloadBlob(r.blob, 'dubai-fans-ai-reel-' + Date.now() + '.' + r.ext); };
      wrap.appendChild(btn);
      el.querySelector('.md').appendChild(wrap);
      if (r.ext !== 'mp4') toast('المتصفح ده بيطلّع الفيديو WebM. افتح من كروم أو سفاري عشان يطلع MP4.');
    }).catch(function (e) {
      el.querySelector('.md').innerHTML = '<div class="msg-error"></div>';
      el.querySelector('.msg-error').textContent = e && e.message === 'blank-frame'
        ? 'الصورة الأصلية طلعت فاضية، فما نقدرش نعمل منها فيديو. ولّد التصميم من جديد.'
        : 'مقدرناش نعمل الفيديو على الجهاز ده. جرّب من كروم أو سفاري محدّث.';
    }).finally(function () { setStreaming(false); scrollDown(false); });
  }

  function send(text) {
    text = (text || '').trim();
    var A = window.DFAI && window.DFAI.attach;
    if (state.busy) return;
    if (A && A.busy()) { toast('استنى ثواني لحد ما المرفقات تجهز ⏳'); return; }
    var hasAtt = A && A.readyCount() > 0;
    if (!text && !hasAtt) { if (A && A.count()) toast('المرفقات ماتقريتش. شيلها وجرّب تاني.'); return; }
    var tool = state.tool;
    var kind = kindFor(tool);
    if (left(kind) <= 0) {
      var labels = { messages: 'رسائلك', images: 'صورك', search: 'عمليات البحث', slides: 'العروض التقديمية' };
      openPlans('خلصت ' + labels[kind] + ' المتاحة لليوم في باقتك. اشترك في باقة أعلى عشان تكمّل، أو ارجع بكره.');
      return;
    }

    var chat = currentChat();
    if (!chat) {
      chat = { id: uid(), title: text.slice(0, 48), tool: tool, agent: state.agent, messages: [], created: Date.now() };
      state.chats.unshift(chat);
      state.currentId = chat.id;
    }
    chat.tool = tool;
    chat.agent = state.agent;
    var att = A ? A.take() : [];
    if (!text) {
      text = att.some(function (a) { return a.kind === 'image'; })
        ? (state.tool === 'image' ? 'اعمل إعلان احترافي للمنتج اللي في الصورة.' : 'شوف الصورة المرفقة وساعدني أعمل حاجة مشابهة ليها لنشاطي.')
        : 'اقرأ الملف المرفق وساعدني أعمل حاجة مشابهة ليه.';
      if (!chat.messages.length) chat.title = text.slice(0, 48);
    }
    var userMsg = { role: 'user', content: text };
    if (att.length) userMsg.att = att.map(function (a) { var o = Object.assign({}, a); delete o.src; return o; });
    chat.messages.push(userMsg);
    saveChats();
    renderChatList();

    $('main').classList.remove('is-home');
    $('prompt').value = '';
    autosize();
    addUserMsg(text, userMsg.att);
    scrollDown(true);

    if (!hasAtt && isVideoFollowUp(text, chat)) {
      return makeVideoFromDesign(chat, lastDesignImage(chat));
    }

    if (tool === 'video') return sendImage(chat, text, att, { video: true, size: 'story', label: 'فيديو ريلز / تيك توك' });
    if (tool === 'image') {
      var hasImgAtt = (userMsg.att || []).some(function (a) { return a.kind === 'image'; });
      // أداة الصور بتفهم الأول: الطلب صورة؟ ولا تصميم نصوص؟ ولا كلام محتاج رد؟
      if (!hasImgAtt && window.DFAI.routeImage) return window.DFAI.routeImage(chat, text, function () { sendImage(chat, text, att); });
      return sendImage(chat, text, att);
    }
    return sendChat(chat, text);
  }

  function failQuota(el, chat, ex) {
    el.remove();
    chat.messages.pop();
    saveChats();
    addQuotaAlert(ex.message);
    openPlans(ex.message);
  }

  // ---- مهام الصور في الخلفية: الطلب يرجع برقم مهمة، والنتيجة تظهر لما تخلص ----
  var jobEls = {};
  var jobPolling = false;
  function pendingHtml() {
    return '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span>جارٍ الرسم في الخلفية… تقدر تكمل كلامك، والصورة هتظهر هنا لما تخلص.</span></div>';
  }
  function pollSoon() { setTimeout(pollJobs, 4000); }
  function applyImageResult(m, r) {
    m.image = r.url; m.prompt = r.prompt; m.overlay = r.overlay || null;
    if (r.post && r.post.caption) m.post = r.post;
    if (window.DFAI.adStudio && r.overlay) m.design = window.DFAI.adStudio.fromOverlay(r.overlay);
    if (m.design && m.sizeOpt) m.design.size = m.sizeOpt;
    delete m.pendingJob;
  }
  function pollJobs() {
    if (jobPolling) return;
    var pending = [];
    state.chats.forEach(function (c) {
      c.messages.forEach(function (m) { if (m.pendingJob) pending.push({ chat: c, m: m }); });
    });
    if (!pending.length) return;
    jobPolling = true;
    apiJson('/api/jobs').then(function (r) {
      var byId = {};
      (r.jobs || []).forEach(function (j) { byId[j.id] = j; });
      var stillPending = false;
      pending.forEach(function (p) {
        var job = byId[p.m.pendingJob];
        if (job && (job.status === 'queued' || job.status === 'running')) { stillPending = true; return; }
        var el = jobEls[p.m.pendingJob];
        delete jobEls[p.m.pendingJob];
        if (job && job.status === 'done' && job.result && p.m.pendingKind === 'video') {
          delete p.m.pendingJob; delete p.m.pendingKind;
          p.m.content = 'جهّزت فيديو ريلز 8 ثواني (9:16) من نفس التصميم، من غير صوت. ضيف عليه موسيقى وانت بتنشره.';
          p.m.videoUrl = job.result.url;
          if (el && el.isConnected) renderVideoMsg(el, p.m);
          else toast('الفيديو جاهز في محادثة "' + (p.chat.title || 'بدون عنوان') + '"');
        } else if (job && job.status === 'done' && job.result) {
          var autoVid = !!p.m.autoVideo;
          delete p.m.autoVideo;
          applyImageResult(p.m, job.result);
          // أداة الفيديو: التصميم يتحول لريلز تلقائياً بعد ما الصورة تخلص
          if (autoVid && p.m.design && window.DFAI.adStudio && !window.DFAI.adStudio.isPro(p.m.design) && window.DFAI.adLayouts && window.DFAI.adLayouts.LAYOUTS.hero) p.m.design.layout = 'hero';
          if (el && el.isConnected) renderImageMsg(el, p.m);
          else toast('الصورة جاهزة في محادثة "' + (p.chat.title || 'بدون عنوان') + '"');
          if (autoVid) makeVideoFromDesign(p.chat, p.m);
        } else {
          p.m.jobError = (job && job.error) || 'تعذّر إكمال الصورة.';
          delete p.m.pendingJob;
          if (el && el.isConnected) { el.querySelector('.md').innerHTML = '<div class="msg-error"></div>'; el.querySelector('.msg-error').textContent = p.m.jobError; }
          else toast(p.m.jobError);
        }
      });
      saveChats();
      if (stillPending) pollSoon();
    }).catch(function () { pollSoon(); })
      .finally(function () { jobPolling = false; });
  }

  function sendImage(chat, text, att, opts) {
    opts = opts || {};
    var refImg = (att || []).filter(function (a) { return a.kind === 'image' && a.desc; })[0];
    var el = addAiShell();
    el.querySelector('.md').innerHTML =
      '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span></span></div>';
    el.querySelector('.img-pending span').textContent = (opts.label ? opts.label + ' — ' : '') + (refImg && refImg.src ? 'جارٍ تجهيز منتجك في مشهد احترافي… (15 إلى 40 ثانية)' : 'جارٍ رسم الصورة… (10 إلى 30 ثانية)');
    setStreaming(true);
    var payload = { prompt: text };
    if (refImg) { payload.reference = refImg.desc; if (refImg.src) payload.productImage = refImg.src; }
    if (opts.occasionColors) payload.occasionColors = true;
    return apiJson('/api/jobs/image', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) {
        var m = { role: 'assistant', content: '', pendingJob: r.job.id, retry: text };
        if (opts.label) m.label = opts.label;
        if (opts.size) m.sizeOpt = opts.size;
        if (opts.video) m.autoVideo = true;
        chat.messages.push(m);
        saveChats();
        jobEls[r.job.id] = el;
        el.querySelector('.md').innerHTML = pendingHtml();
        pollSoon();
      })
      .catch(function (ex) {
        if (ex.code === 'quota') return failQuota(el, chat, ex);
        el.querySelector('.md').innerHTML = '<div class="msg-error"></div>';
        el.querySelector('.msg-error').textContent = netMessage(ex);
      })
      .finally(function () { setStreaming(false); scrollDown(false); refreshMe(); });
  }

  function sendChat(chat, text) {
    var el = addAiShell(true);
    var md = el.querySelector('.md');
    var controller = new AbortController();
    state.controller = controller;
    setStreaming(true);


    var meta = { tool: chat.tool, agent: chat.agent, title: chat.title, sources: null };
    setAgentTag(el, meta);
    var full = '';
    var raf = null;
    function paint() { raf = null; var vis = splitSuggest(full).text; md.innerHTML = renderMarkdown(vis); el._raw = vis; scrollDown(false); }
    function queuePaint() { if (!raf) raf = requestAnimationFrame(paint); }

    var reqId = uid();
    chat._busy = true;
    chat._reqId = reqId;
    api('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ tool: chat.tool, agent: chat.agent, messages: historyFor(chat), voice: !!state.voiceMode, lang: window.DFAI_LANG || 'ar', model: (window.DFAI && DFAI.getModel) ? DFAI.getModel() : 'auto', chatId: chat.id, reqId: reqId })
    }).then(function (res) {
      if (res.status === 401) { logout(true); throw new Error('انتهت الجلسة، سجّل دخولك تاني.'); }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          var err = new Error((d.error && d.error.message) || ('حدث خطأ (' + res.status + ')'));
          err.code = d.error && d.error.code;
          throw err;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buffer += decoder.decode(r.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(function (line) {
            line = line.trim();
            if (line.indexOf('data:') !== 0) return;
            var payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') return;
            var j;
            try { j = JSON.parse(payload); } catch (ex) { return; }
            if (j.error) throw new Error(j.error.message || 'خطأ من المحرك');
            if (j.sources) { meta.sources = j.sources; renderSources(el, j.sources); return; }
            if (j.meta) return;
            var delta = j.choices && j.choices[0] && j.choices[0].delta;
            if (delta && delta.content) { full += delta.content; queuePaint(); }
          });
          return pump();
        });
      }
      return pump();
    }).then(function () {
      if (raf) cancelAnimationFrame(raf);
      if (!full.trim()) md.innerHTML = '<div class="msg-error">المساعد مرجّعش رد. جرّب تاني.</div>';
      finish();
    }).catch(function (ex) {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (ex.code === 'quota') { failQuota(el, chat, ex); finish(true); return; }
      if (ex.name === 'AbortError') {
        if (!full) md.innerHTML = '<div class="msg-error">اتوقف الرد.</div>';
      } else {
        md.innerHTML = (full ? renderMarkdown(full) : '') + '<div class="msg-error"></div>';
        md.querySelector('.msg-error').textContent = netMessage(ex);
        full = full ? full : '';
      }
      finish();
    });

    function finish(skip) {
      state.controller = null;
      chat._busy = false;
      chat._reqId = null;
      // الرد قد يكون اكتمل على السيرفر بعد انقطاع الاتصال: نتحقق منه لاحقاً
      setTimeout(function () { adoptFromServer(chat.id); }, 8000);
      var sp = splitSuggest(full);
      full = sp.text;
      if (!skip && full.trim()) {
        var m = { role: 'assistant', content: full, tool: meta.tool, agent: meta.agent, title: meta.title, sources: meta.sources };
        if (sp.items.length) m.suggest = sp.items;
        chat.messages.push(m);
        saveChats();
        if (!el.querySelector('.msg-error')) { finalizeAi(el, full, m); renderSuggest(el, sp.items); }
        else el.querySelector('.msg-actions').hidden = false;
      }
      setStreaming(false);
      scrollDown(false);
      refreshMe();
    }
  }

  // ---------- محرّر الرسالة ----------
  var prompt = $('prompt');
  function autosize() {
    prompt.style.height = 'auto';
    prompt.style.height = Math.min(prompt.scrollHeight, 220) + 'px';
    var nAtt = window.DFAI && window.DFAI.attach ? window.DFAI.attach.count() : 0;
    $('composer').classList.toggle('has-text', Boolean(prompt.value.trim()) || nAtt > 0);
    if (!state.busy) $('sendBtn').disabled = !prompt.value.trim() && !nAtt;
  }
  prompt.addEventListener('input', autosize);
  prompt.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send(prompt.value);
    }
  });
  $('composer').addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.controller) {
      // الإيقاف الصريح: السيرفر يوقف الرد ولا يحفظه، ثم نلغي الاتصال من الواجهة
      var cs = currentChat();
      if (cs && cs._reqId) api('/api/chat/stop', { method: 'POST', body: JSON.stringify({ reqId: cs._reqId }) }).catch(function () {});
      state.controller.abort();
      return;
    }
    send(prompt.value);
  });

  // ---------- القائمة على الموبايل ----------
  function closeSide() { $('app').classList.remove('side-open'); $('scrim').hidden = true; }
  $('menuBtn').addEventListener('click', function () { $('app').classList.add('side-open'); $('scrim').hidden = false; });
  $('scrim').addEventListener('click', closeSide);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeSide();
    ['plansModal', 'agentsModal', 'siteModal', 'contentModal'].forEach(closeModal);
  });

  // ---------- واجهة للملفات الإضافية (growth.js و editor.js) ----------
  // ---------- طي الأدوات ----------
  (function () {
    var nav = $('toolsNav'), btn = $('toolsToggle');
    if (!nav || !btn) return;
    function apply(c) { nav.classList.toggle('collapsed', c); btn.setAttribute('aria-expanded', String(!c)); }
    apply(store('dfai.toolsCollapsed') === true);
    btn.addEventListener('click', function () {
      var c = !nav.classList.contains('collapsed');
      apply(c);
      store('dfai.toolsCollapsed', c);
    });
  })();

  // صورة جاهزة (زي الموكب) بتتحط في المحادثة كأنها رد من المساعد
  function addImageResult(url, title, design) {
    var chat = currentChat();
    if (!chat) {
      chat = { id: uid(), title: title.slice(0, 48), tool: null, agent: null, messages: [], created: Date.now() };
      state.chats.unshift(chat);
      state.currentId = chat.id;
    }
    var u = { role: 'user', content: title };
    var m = { role: 'assistant', content: '', image: url, prompt: title };
    if (design) m.design = design;
    chat.messages.push(u, m);
    saveChats();
    renderChatList();
    hidePanel();
    $('main').classList.remove('is-home');
    addUserMsg(title);
    var el = addAiShell();
    renderImageMsg(el, m);
    scrollDown(true);
    return { el: el, msg: m };
  }

  window.DFAI = window.DFAI || {};
  [['api', api], ['apiJson', apiJson], ['toast', toast], ['send', send], ['setTool', setTool], ['newChat', newChat],
   ['openPlans', openPlans], ['refreshMe', refreshMe], ['renderMarkdown', renderMarkdown], ['netMessage', netMessage],
   ['openModal', openModal], ['closeModal', closeModal], ['saveChats', saveChats], ['showPanel', showPanel],
   ['hidePanel', hidePanel], ['extractHtml', extractHtml], ['downloadBlob', downloadBlob], ['safeName', safeName],
   ['left', left], ['loadConfig', loadConfig], ['store', store], ['addImageResult', addImageResult], ['addAiShell', addAiShell], ['finalizeAi', finalizeAi], ['setStreaming', setStreaming], ['historyFor', historyFor], ['scrollDown', scrollDown], ['currentChat', currentChat], ['startCampaign', startCampaign], ['left', left]].forEach(function (p) { window.DFAI[p[0]] = p[1]; });
  window.DFAI.state = state;
  window.DFAI.openFollower = function () { openEmbed('follower', 'افحص حساب Instagram', 'https://follower-checker.vercel.app/'); };
  window.DFAI.openVirality = function () { openEmbed('virality', 'ابدأ بتحليل قوة الريلز بتاعك', 'https://viralityuae.vercel.app/'); };
  window.DFAI.openReferral = openReferral;
  window.DFAI.openUsage = openUsage;
  window.DFAI.openDesign = openDesign;

  // ---------- البداية ----------
  Array.prototype.forEach.call(document.querySelectorAll('.logo-slot'), function (el) { el.innerHTML = LOGO_SVG; });
  renderTools();
  renderCards();

  // تحديث دوري للحصص والتنبيهات (تقارير المتابعة الجديدة)
  setInterval(function () {
    if (state.token && state.me && !document.hidden && !state.busy) refreshMe();
  }, 120000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && state.token && state.me && !state.busy) refreshMe();
  });

  state.token = store('dfai.token');
  if (!state.token) {
    showLogin();
  } else {
    apiJson('/api/me').then(enterApp).catch(function () {
      state.token = null;
      store('dfai.token', null);
      showLogin();
    });
  }
})();
