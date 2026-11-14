/* Dubai Fans AI — واجهة الموبايل: زرار + للأدوات، بحث المحادثات، وتثبيت التطبيق */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- 1) زرار + : قائمة الأدوات من تحت ----------
  var sheet;
  function buildSheet() {
    sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.id = 'toolsSheet';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="sheet-box" role="dialog" aria-modal="true" aria-label="الأدوات">' +
      '<div class="sheet-handle" aria-hidden="true"></div>' +
      '<div class="sheet-attach" id="sheetAttach">' +
      '<button type="button" data-k="camera"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>الكاميرا</span></button>' +
      '<button type="button" data-k="photos"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg><span>الصور</span></button>' +
      '<button type="button" data-k="files"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.5 18a2 2 0 0 1-3-3l7.5-7.5"/></svg><span>الملفات</span></button>' +
      '</div>' +
      '<div class="sheet-title">الأدوات</div>' +
      '<div class="sheet-grid" id="sheetGrid"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
    Array.prototype.forEach.call(sheet.querySelectorAll('#sheetAttach button'), function (b) {
      b.addEventListener('click', function () {
        closeSheet();
        if (D.attach) D.attach.pick(b.getAttribute('data-k'));
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeSheet(); });
  }
  // القائمة فيها المرفقات والأدوات بس؛ بطاقات الاقتراحات والحملات تفضل في الشاشة الرئيسية
  function openSheet() {
    if (!sheet) buildSheet();
    var grid = sheet.querySelector('#sheetGrid');
    grid.innerHTML = '';
    // نفس أدوات القائمة الجانبية، عشان أي أداة جديدة تظهر هنا لوحدها
    Array.prototype.forEach.call(document.querySelectorAll('#toolList .tool-btn:not(.explore-btn)'), function (src) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sheet-item' + (src.classList.contains('active') ? ' active' : '');
      b.innerHTML = src.innerHTML;
      b.addEventListener('click', function () { closeSheet(); src.click(); });
      grid.appendChild(b);
    });
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('open'); });
    var first = grid.querySelector('button');
    if (first) first.focus();
  }
  function closeSheet() {
    if (!sheet) return;
    var home = document.querySelector('.composer-wrap');
    var cards = $('cards');
    if (home && cards) {
      home.insertBefore(cards, home.querySelector('.disclaimer'));
      var sc = $('seasonCards');
      if (sc) home.insertBefore(sc, cards);
    }
    sheet.classList.remove('open');
    setTimeout(function () { sheet.hidden = true; }, 180);
  }
  if ($('plusBtn')) $('plusBtn').addEventListener('click', openSheet);
  // أيقونات الإرفاق الدائرية تحت مربع الكتابة (بدل زر +)
  Array.prototype.forEach.call(document.querySelectorAll('.cmp-ico'), function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-k');
      if (k === 'mic') { var m = $('micBtn'); if (m) m.click(); return; }
      if (D.attach) D.attach.pick(k);
    });
  });

  // ---------- 2) بحث في المحادثات ----------
  var search = $('chatSearch');
  function filterChats() {
    if (!search) return;
    var term = search.value.trim().toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll('#chatList .chat-item'), function (row) {
      row.hidden = !!term && row.textContent.toLowerCase().indexOf(term) === -1;
    });
  }
  if (search) {
    search.addEventListener('input', filterChats);
    new MutationObserver(filterChats).observe($('chatList'), { childList: true });
  }

  // ---------- 3) التطبيق على الموبايل (PWA) ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* الموقع شغّال عادي من غيره */ });
    });
  }

  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('is-app');
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var deferred = null;
  var btn = $('installBtn');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (btn && !standalone) btn.hidden = false;
  });
  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (btn) btn.hidden = true;
    D.toast('اتثبّت التطبيق ✅ هتلاقيه على الشاشة الرئيسية');
  });
  if (btn && isIOS && !standalone) btn.hidden = false;

  function iosHelp() {
    var m = document.createElement('div');
    m.className = 'sheet';
    m.innerHTML = '<div class="sheet-box ios-help" role="dialog" aria-modal="true" aria-labelledby="iosT">' +
      '<div class="sheet-handle" aria-hidden="true"></div>' +
      '<div class="sheet-title" id="iosT">ثبّت Dubai Fans AI على الآيفون</div>' +
      '<ol>' +
      '<li>افتح الموقع من <b>Safari</b>.</li>' +
      '<li>دوس زرار <b>المشاركة</b> <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg> تحت الشاشة.</li>' +
      '<li>اختار <b>إضافة إلى الشاشة الرئيسية</b>.</li>' +
      '<li>دوس <b>إضافة</b>، وهتلاقي الأيقونة جنب تطبيقاتك.</li>' +
      '</ol><button type="button" class="btn-primary">تمام</button></div>';
    document.body.appendChild(m);
    var close = function () { m.classList.remove('open'); setTimeout(function () { m.remove(); }, 180); };
    m.querySelector('button').onclick = close;
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    requestAnimationFrame(function () { m.classList.add('open'); });
  }

  if (btn) btn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; btn.hidden = true; });
    } else if (isIOS) {
      iosHelp();
    } else {
      D.toast('افتح الموقع من Chrome على الموبايل، وهيظهر لك اختيار "تثبيت التطبيق".');
    }
  });
})();
(function () {
  // اختصار "محادثة صوتية" من أيقونة التطبيق
  var D = window.DFAI;
  if (!D || new URLSearchParams(location.search).get('voice') !== '1') return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  var n = 0;
  (function wait() {
    if (D.state && D.state.me && D.openVoiceMode) return D.openVoiceMode();
    if (++n < 100) setTimeout(wait, 300);
  })();
})();

// ---------- 4) الرجوع للطبقة اللي فاتحة: زرار الرجوع في الموبايل + السحب من الحافة ----------
// الطبقات: قائمة الأدوات، النوافذ (modal)، القائمة الجانبية، الشاشات الإضافية (panel).
// بنضيف خطوة في سجل المتصفح لما طبقة تتفتح، فزرار الرجوع (أندرويد) أو السحب الأصلي (آيفون) يقفل الطبقة بدل ما يطلّع من الموقع.
(function () {
  var D = window.DFAI;
  if (!D) return;
  var $ = function (id) { return document.getElementById(id); };
  var pushed = false; // ضفنا خطوة في السجل ولسه مقفلناش الطبقة
  var skip = 0;       // popstate جاي من إغلاقنا نحن، مش من المستخدم

  function sheetOpen() { var s = $('toolsSheet'); return !!(s && s.classList.contains('open')); }
  function modalOpen() { return document.querySelector('.modal:not([hidden])'); }
  function sideOpen() { var a = $('app'); return !!(a && a.classList.contains('side-open')); }
  function panelOpen() { return !!(D.state && D.state.panel); }
  function anyOpen() { return sheetOpen() || !!modalOpen() || sideOpen() || panelOpen(); }

  // بيقفل الطبقة الأعلى بس (الترتيب من فوق لتحت)
  function closeTop() {
    if (sheetOpen()) { $('toolsSheet').click(); return; } // الضغط على الخلفية بيقفلها
    var m = modalOpen();
    if (m) { m.hidden = true; return; }
    if (sideOpen()) {
      $('app').classList.remove('side-open');
      var sc = $('scrim'); if (sc) sc.hidden = true;
      return;
    }
    if (panelOpen() && D.hidePanel) D.hidePanel();
  }

  // بيزامن سجل المتصفح مع الطبقات المفتوحة
  function sync() {
    document.body.classList.toggle('layer-open', anyOpen());
    if (anyOpen()) {
      if (!pushed) { try { history.pushState({ dfaiLayer: 1 }, ''); } catch (e) {} pushed = true; }
    } else if (pushed) {
      pushed = false;
      skip++;
      try { history.back(); } catch (e) {}
    }
  }
  new MutationObserver(sync).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });

  window.addEventListener('popstate', function () {
    if (skip > 0) { skip--; return; }
    if (!pushed) return;
    pushed = false;
    closeTop(); // الـ observer بيضيف خطوة تانية لو فضلت طبقة مفتوحة
  });

  // السحب من حافة الشاشة (يمين أو شمال) مسافة كافية وأفقي = رجوع
  var from = '', sx = 0, sy = 0;
  document.addEventListener('touchstart', function (e) {
    from = '';
    if (e.touches.length !== 1 || !anyOpen()) return;
    var x = e.touches[0].clientX, w = window.innerWidth;
    from = x <= 24 ? 'left' : (x >= w - 24 ? 'right' : '');
    sx = x; sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    var f = from; from = '';
    if (!f || !e.changedTouches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dy) > Math.abs(dx) * 0.6) return; // مش سحب أفقي واضح
    if ((f === 'left' && dx > 70) || (f === 'right' && dx < -70)) closeTop();
  }, { passive: true });
})();
