/* Dubai Fans AI — مساعد التسويق الرقمي (واجهة المستخدم، تعمل مع dfai-api) */
(function () {
  'use strict';

  var API = '';

  var TOOLS = [
    { id: 'write', label: 'كتابة', color: '#B9A8FF',
      icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      placeholder: 'مثال: اكتب 3 منشورات إنستغرام لعرض نهاية الأسبوع بنبرة حماسية…' },
    { id: 'image', label: 'توليد الصور', color: '#F9A8D4',
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
      placeholder: 'اوصف الصورة: مثال: صورة إعلانية لكوب قهوة على طاولة رخام بإضاءة صباحية دافئة…' },
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
      icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' }
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

  var DEFAULT_PLACEHOLDER = 'اكتب طلبك التسويقي… منشور، إعلان، خطة، أو فكرة حملة';

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
      return window.DOMPurify.sanitize(window.marked.parse(text, { breaks: true, gfm: true }));
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

  function safeName(s) {
    return (s || 'dubai-fans-ai').replace(/[\\/:*?"<>|#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'dubai-fans-ai';
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
    $('greeting').textContent = 'بماذا نبدأ اليوم يا ' + name.split(' ')[0] + '؟';
    $('adminLink').hidden = me.user.role !== 'admin';
    renderQuota();
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
    var limit = me.limits.messages;
    var card = document.querySelector('.quota-card');
    var paid = me.plan.id !== 'free';
    $('planName').textContent = 'باقة ' + me.plan.name;
    $('planPill').classList.toggle('paid', paid);
    $('upgradeLabel').textContent = paid ? 'الباقات' : 'ترقية الباقة';
    if (limit === -1) {
      $('quotaText').textContent = 'غير محدود';
      $('quotaFill').style.width = '100%';
      card.classList.remove('low', 'empty');
    } else {
      var l = left('messages');
      $('quotaText').textContent = 'متبقي ' + l + ' من ' + limit;
      $('quotaFill').style.width = Math.min(100, Math.round((l / limit) * 100)) + '%';
      card.classList.toggle('empty', l === 0);
      card.classList.toggle('low', l > 0 && l <= Math.ceil(limit * 0.2));
    }
    var more = $('quotaMore');
    more.innerHTML = '';
    [['images', 'صور'], ['search', 'بحث'], ['slides', 'عروض']].forEach(function (k) {
      var s = document.createElement('span');
      var v = left(k[0]);
      s.innerHTML = k[1] + ': <b></b>';
      s.querySelector('b').textContent = v === Infinity ? '∞' : String(v);
      more.appendChild(s);
    });
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
    var body = reg ? { name: name, email: email, password: password } : { email: email, password: password };
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

  // ---------- الإعدادات والباقات ----------
  var FEATURE_LABELS = [
    ['messages', 'رسالة يومياً'],
    ['images', 'صورة يومياً'],
    ['search', 'بحث ويب يومياً'],
    ['slides', 'عرض تقديمي يومياً']
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
  ['plansModal', 'agentsModal', 'siteModal'].forEach(function (id) {
    $(id).addEventListener('click', function (e) { if (e.target === $(id)) closeModal(id); });
  });

  function openPlans(reason) {
    $('plansDone').hidden = true;
    $('plansSub').textContent = reason || 'ابدأ مجاناً، وطوّر باقتك وقت ما تحتاج. الأسعار بالدرهم الإماراتي.';
    openModal('plansModal', 'plansClose');
    loadConfig().then(renderPlans).catch(function (ex) { $('plansGrid').textContent = netMessage(ex); });
  }
  $('plansClose').addEventListener('click', function () { closeModal('plansModal'); });
  $('upgradeBtn').addEventListener('click', function () { openPlans(); closeSide(); });
  $('planPill').addEventListener('click', function () { openPlans(); });

  function renderPlans(cfg) {
    var grid = $('plansGrid');
    grid.innerHTML = '';
    var current = state.me ? state.me.plan.id : 'free';
    cfg.plans.forEach(function (p) {
      var card = document.createElement('div');
      var isCurrent = p.id === current;
      card.className = 'plan-card' + (p.id === 'pro' ? ' featured' : '') + (isCurrent ? ' current' : '');
      var badge = isCurrent ? 'باقتك الحالية' : p.id === 'pro' ? 'الأكثر طلباً' : '';
      var feats = FEATURE_LABELS.map(function (f) {
        var v = p.limits[f[0]];
        return '<li>' + (v === -1 ? 'غير محدود' : v) + ' ' + f[1] + '</li>';
      }).join('') + (p.id === 'free' ? '' : '<li>كل الوكلاء المتخصصين</li>');
      card.innerHTML =
        (badge ? '<span class="plan-badge">' + badge + '</span>' : '') +
        '<div class="plan-name">' + p.name + '</div>' +
        '<div class="plan-price"><b>' + p.price + '</b><span>' + (p.price ? 'درهم / شهرياً' : 'مجاناً للأبد') + '</span></div>' +
        '<ul class="plan-feats">' + feats + '</ul>';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-primary plan-cta' + (p.id === 'free' || isCurrent ? ' ghost' : '');
      btn.textContent = isCurrent ? 'مفعّلة' : p.id === 'free' ? 'متاحة للجميع' : 'اشترك في ' + p.name;
      btn.disabled = isCurrent || p.id === 'free';
      if (!btn.disabled) btn.addEventListener('click', function () { requestPlan(p, btn); });
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function requestPlan(plan, btn) {
    btn.disabled = true;
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
        b.innerHTML = '<span class="agent-ico" aria-hidden="true"></span><span class="agent-name"></span><span class="agent-desc"></span>';
        b.querySelector('.agent-ico').textContent = info.ico;
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
    TOOLS.forEach(function (t) {
      var active = t.picker ? Boolean(state.agent) : state.tool === t.id;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool-btn' + (active ? ' active' : '');
      b.setAttribute('aria-pressed', String(active));
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="color:' + t.color + '">' + t.icon + '</svg><span></span>';
      b.querySelector('span').textContent = t.picker && state.agent ? agentName(state.agent) : t.label;
      b.addEventListener('click', function () {
        if (t.picker) openAgents();
        else setTool(state.tool === t.id ? null : t.id);
        closeSide();
      });
      wrap.appendChild(b);
    });
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

  function renderCards() {
    var wrap = $('cards');
    wrap.innerHTML = '';
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.innerHTML = '<span class="card-title"></span><span class="card-sub"></span>';
      b.querySelector('.card-title').textContent = s.title;
      b.querySelector('.card-sub').textContent = s.sub;
      b.addEventListener('click', function () { setTool(s.tool, true); send(s.content); });
      wrap.appendChild(b);
    });
  }

  // ---------- المحادثات ----------
  function chatsKey() { return 'dfai.chats.' + (state.me ? state.me.user.id : 'x'); }
  function loadChats() { state.chats = store(chatsKey()) || []; }
  function saveChats() {
    try { localStorage.setItem(chatsKey(), JSON.stringify(state.chats.slice(0, 40))); }
    catch (e) {
      // المساحة امتلأت: نخفف المحادثات القديمة
      state.chats = state.chats.slice(0, 15);
      try { localStorage.setItem(chatsKey(), JSON.stringify(state.chats)); } catch (e2) { /* تجاهل */ }
    }
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
    state.currentId = null;
    $('thread').innerHTML = '';
    $('main').classList.add('is-home');
    state.agent = null;
    setTool(null, true);
    renderChatList();
  }
  $('newChatBtn').addEventListener('click', function () { newChat(); closeSide(); });

  function openChat(id) {
    if (state.controller) state.controller.abort();
    var c = state.chats.find(function (x) { return x.id === id; });
    if (!c) return;
    state.currentId = id;
    $('main').classList.remove('is-home');
    $('thread').innerHTML = '';
    c.messages.forEach(function (m) {
      if (m.role === 'user') addUserMsg(m.content);
      else if (m.image) renderImageMsg(addAiShell(), m);
      else {
        var el = addAiShell();
        finalizeAi(el, m.content, m);
      }
    });
    if (c.agent) setAgent(c.agent, null, true); else setTool(c.tool || null, true);
    renderChatList();
    $('thread').scrollTop = $('thread').scrollHeight;
  }

  // ---------- عرض الرسائل ----------
  function addUserMsg(text) {
    var el = document.createElement('div');
    el.className = 'msg msg-user';
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
    if (pending) el.querySelector('.md').innerHTML = '<span class="typing" aria-label="يكتب"><span></span><span></span><span></span></span>';
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
      actions.appendChild(actionButton(ICON_EYE, 'معاينة الموقع', function () { openSite(html, m.title); }));
      actions.appendChild(actionButton(ICON_DL, 'تحميل HTML', function () {
        downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), safeName(m.title) + '.html');
      }));
    }
    if (actions.children.length) box.appendChild(actions);
    el.querySelector('.msg-actions').hidden = !text;
  }

  function renderImageMsg(el, m) {
    var md = el.querySelector('.md');
    md.innerHTML = '';
    var img = document.createElement('img');
    img.className = 'gen-image';
    img.src = m.image;
    img.alt = m.prompt || 'صورة مولّدة';
    img.loading = 'lazy';
    img.onerror = function () { md.innerHTML = '<div class="msg-error">الصورة دي اتمسحت من السيرفر (الصور بتتحفظ 30 يوم).</div>'; };
    md.appendChild(img);
    var actions = document.createElement('div');
    actions.className = 'result-actions';
    var dl = document.createElement('a');
    dl.className = 'result-btn';
    dl.href = m.image;
    dl.download = 'dubai-fans-ai-' + Date.now() + (m.image.slice(-4) === '.png' ? '.png' : '.jpg');
    dl.innerHTML = ICON_DL + '<span>تحميل الصورة</span>';
    actions.appendChild(dl);
    if (m.retry) actions.appendChild(actionButton('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></svg>', 'نسخة تانية', function () {
      setTool('image', true); send(m.retry);
    }));
    el.querySelector('.extra').appendChild(actions);
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
    var btn = $('sendBtn');
    btn.classList.toggle('is-stop', on && Boolean(state.controller));
    btn.setAttribute('aria-label', on ? 'إيقاف' : 'إرسال');
    btn.disabled = on ? !state.controller : !$('prompt').value.trim();
  }

  function kindFor(tool) {
    return tool === 'image' ? 'images' : tool === 'search' ? 'search' : tool === 'slides' ? 'slides' : 'messages';
  }

  function historyFor(chat) {
    return chat.messages.slice(-12).map(function (m) {
      if (m.image) return { role: 'assistant', content: '[تم إنشاء صورة بالوصف: ' + (m.prompt || '') + ']' };
      return { role: m.role, content: m.content };
    });
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || state.busy) return;
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
    chat.messages.push({ role: 'user', content: text });
    saveChats();
    renderChatList();

    $('main').classList.remove('is-home');
    $('prompt').value = '';
    autosize();
    addUserMsg(text);
    scrollDown(true);

    if (tool === 'image') return sendImage(chat, text);
    return sendChat(chat, text);
  }

  function failQuota(el, chat, ex) {
    el.remove();
    chat.messages.pop();
    saveChats();
    addQuotaAlert(ex.message);
    openPlans(ex.message);
  }

  function sendImage(chat, text) {
    var el = addAiShell();
    el.querySelector('.md').innerHTML =
      '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span>جارٍ رسم الصورة… (10 إلى 30 ثانية)</span></div>';
    setStreaming(true);
    apiJson('/api/image', { method: 'POST', body: JSON.stringify({ prompt: text }) })
      .then(function (r) {
        var m = { role: 'assistant', content: '', image: r.url, prompt: r.prompt, retry: text };
        chat.messages.push(m);
        saveChats();
        renderImageMsg(el, m);
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
    function paint() { raf = null; md.innerHTML = renderMarkdown(full); el._raw = full; scrollDown(false); }
    function queuePaint() { if (!raf) raf = requestAnimationFrame(paint); }

    api('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ tool: chat.tool, agent: chat.agent, messages: historyFor(chat) })
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
      if (!skip && full.trim()) {
        var m = { role: 'assistant', content: full, tool: meta.tool, agent: meta.agent, title: meta.title, sources: meta.sources };
        chat.messages.push(m);
        saveChats();
        if (!el.querySelector('.msg-error')) finalizeAi(el, full, m);
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
    if (!state.busy) $('sendBtn').disabled = !prompt.value.trim();
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
    if (state.controller) { state.controller.abort(); return; }
    send(prompt.value);
  });

  // ---------- القائمة على الموبايل ----------
  function closeSide() { $('app').classList.remove('side-open'); $('scrim').hidden = true; }
  $('menuBtn').addEventListener('click', function () { $('app').classList.add('side-open'); $('scrim').hidden = false; });
  $('scrim').addEventListener('click', closeSide);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeSide();
    ['plansModal', 'agentsModal', 'siteModal'].forEach(closeModal);
  });

  // ---------- البداية ----------
  Array.prototype.forEach.call(document.querySelectorAll('.logo-slot'), function (el) { el.innerHTML = LOGO_SVG; });
  renderTools();
  renderCards();

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
