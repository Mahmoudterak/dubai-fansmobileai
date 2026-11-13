/* Dubai Fans AI — تأهيل المستخدم الجديد (خمس خطوات)
   يظهر مرة واحدة بعد الدخول. الملف الشخصي يتخزن في المتصفح (localStorage) ويُضاف لأول رسالة. */
(function () {
  'use strict';
  var D = window.DFAI = window.DFAI || {};
  var KEY_DONE = 'dfai.onboarded';
  var KEY_PROFILE = 'dfai.profile';

  function readLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function writeLS(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* تجاهل */ } }

  var TYPES = ['متجر إلكتروني', 'مطعم أو كافيه', 'عيادة أو خدمات صحية', 'صالون أو خدمات تجميل', 'شركة أو وكالة', 'صانع محتوى'];
  var MARKETS = ['الإمارات', 'السعودية', 'الخليج', 'مصر', 'أخرى'];
  var DIALECTS = ['خليجية', 'مصرية', 'شامية', 'فصحى', 'إنجليزي'];
  var ACTIONS = [
    { label: 'أنشئ محتواك الأول', text: 'اكتب لي أول منشور وإعلان لنشاطي مع فكرتين للفيديو القصير.' },
    { label: 'حلّل نشاطك التجاري', text: 'حلّل نشاطي التجاري وقل لي أين الفرص الأسرع والأقل تكلفة.' },
    { label: 'اكتشف فرص النمو', text: 'ما أكثر فرصتين لزيادة المبيعات والعملاء الجدد لنشاطي هذا الشهر؟' }
  ];
  var STEPS = 6; // 0 = الترحيب، و1-5 = الخمس خطوات

  var root = null;
  var step = 0;
  var profile = { type: '', market: '', dialect: '', brand: '', website: '' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function chips(list, key) {
    var wrap = el('div', 'ob-chips');
    list.forEach(function (v) {
      var b = el('button', 'ob-chip' + (profile[key] === v ? ' on' : ''), v);
      b.type = 'button';
      b.addEventListener('click', function () { profile[key] = v; render(); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function finish(send, actionText) {
    writeLS(KEY_DONE, '1');
    writeLS(KEY_PROFILE, JSON.stringify(profile));
    close();
    if (!send) return;
    var intro = 'نشاطي: ' + profile.type + ' في ' + profile.market + '. اسم علامتي: ' + (profile.brand || 'غير محدد') +
      (profile.website ? '. موقعي: ' + profile.website : '') + '. اكتب بلهجة: ' + profile.dialect + '.';
    if (D.newChat) D.newChat();
    setTimeout(function () { if (D.send) D.send(intro + ' ' + actionText); }, 200);
  }

  function body() {
    var box = el('div', 'ob-body');
    if (step === 0) {
      box.appendChild(el('h2', 'ob-title', 'أهلاً بك في Dubai Fans AI'));
      box.appendChild(el('p', 'ob-sub', 'خطوات قليلة نجهّز بيها مساعدك على نشاطك'));
    } else if (step === 1) {
      box.appendChild(el('h2', 'ob-title', 'ما نوع نشاطك؟'));
      box.appendChild(chips(TYPES, 'type'));
    } else if (step === 2) {
      box.appendChild(el('h2', 'ob-title', 'أين سوقك؟'));
      box.appendChild(chips(MARKETS, 'market'));
    } else if (step === 3) {
      box.appendChild(el('h2', 'ob-title', 'بأي لهجة تحب أكتب لك؟'));
      box.appendChild(chips(DIALECTS, 'dialect'));
    } else if (step === 4) {
      box.appendChild(el('h2', 'ob-title', 'عرّفنا بعلامتك'));
      var name = el('input', 'ob-input'); name.setAttribute('placeholder', 'اسم العلامة'); name.value = profile.brand;
      name.addEventListener('input', function () { profile.brand = name.value.trim(); });
      var site = el('input', 'ob-input'); site.setAttribute('placeholder', 'موقعك أو متجرك (اختياري)'); site.value = profile.website;
      site.addEventListener('input', function () { profile.website = site.value.trim(); });
      box.appendChild(name);
      box.appendChild(site);
      box.appendChild(el('p', 'ob-sub', 'ماتقلقش، تقدر تغيّر ده في أي وقت'));
    } else {
      box.appendChild(el('h2', 'ob-title', 'ما الذي تريد أن نبدأ به؟'));
      var row = el('div', 'ob-actions');
      ACTIONS.forEach(function (a) {
        var b = el('button', 'ob-action', a.label);
        b.type = 'button';
        b.addEventListener('click', function () { finish(true, a.text); });
        row.appendChild(b);
      });
      box.appendChild(row);
    }
    return box;
  }

  function render() {
    if (!root) return;
    root.innerHTML = '';
    var card = el('div', 'ob-card');
    // ‎: علامة اتجاه يسار-يمين عشان "1 / 5" ما تتقلبش في الواجهة العربية
    if (step > 0) card.appendChild(el('div', 'ob-progress', '‎' + step + ' / 5'));
    card.appendChild(body());
    var nav = el('div', 'ob-nav');
    var skip = el('button', 'ob-link', 'تخطي'); skip.type = 'button';
    skip.addEventListener('click', function () { finish(false); });
    nav.appendChild(skip);
    if (step > 0) {
      var back = el('button', 'ob-link', 'رجوع'); back.type = 'button';
      back.addEventListener('click', function () { step -= 1; render(); });
      nav.appendChild(back);
    }
    if (step < STEPS - 1) {
      var next = el('button', 'ob-next', step === 0 ? 'ابدأ' : 'التالي'); next.type = 'button';
      next.addEventListener('click', function () { step += 1; render(); });
      nav.appendChild(next);
    }
    card.appendChild(nav);
    root.appendChild(card);
  }

  function open() {
    if (root) return;
    step = 0;
    try { var saved = JSON.parse(readLS(KEY_PROFILE) || 'null'); if (saved) profile = Object.assign(profile, saved); } catch (e) { /* تجاهل */ }
    root = el('div', 'ob-overlay');
    root.setAttribute('dir', 'rtl');
    document.body.appendChild(root);
    render();
  }

  function close() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
  }

  // يظهر بعد الدخول مرة واحدة
  function autoShow() {
    if (readLS(KEY_DONE)) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      var app = document.getElementById('app');
      var me = D.state && D.state.me;
      if (app && !app.hidden && me) { clearInterval(timer); open(); }
      if (tries > 300) clearInterval(timer);
    }, 500);
  }

  D.openOnboarding = open;
  D.getProfile = function () { try { return JSON.parse(readLS(KEY_PROFILE) || 'null'); } catch (e) { return null; } };
  autoShow();
})();
