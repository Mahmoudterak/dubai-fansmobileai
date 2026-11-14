/* Dubai Fans AI — اختيار النموذج داخل الشات
   القائمة بتجي من الخادم (النماذج المفعّلة فعلاً فقط)، والاختيار بيتحفظ على الجهاز.
   الواجهة: زر وقائمة منبثقة بشكل تصميم Dubai Fans AI. الـ <select> المخفي يفضل مصدر الحقيقة. */
(function () {
  var D = window.DFAI;
  if (!D) return;
  var KEY = 'dfai.model';
  var sel = null;
  var trig = null;
  var menu = null;

  // وصف وأيقونة كل نموذج كما في تصميم القائمة
  var META = {
    auto: { sub: 'يختار الأنسب لكل سؤال', icon: 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z', bg: 'linear-gradient(135deg,#2E7BE6,#173A86)' },
    cloud: { sub: 'تفكير أعمق للخطط والتحليل', icon: 'M12 4l10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5', bg: 'linear-gradient(135deg,#173A86,#5A2B9B)' },
    small: { sub: 'ردود أسرع للأسئلة البسيطة', icon: 'M13 2L4 14h7l-1 8 9-12h-7z', bg: 'linear-gradient(135deg,#2E7BE6,#2A8F7A)' },
    external: { sub: 'نموذج خارجي حسب إعداداتك', icon: 'M14 3h7v7M10 14L21 3M19 13v7H4V5h7', bg: 'linear-gradient(135deg,#5A2B9B,#7A1824)' },
    local: { sub: 'على جهازك · خصوصية كاملة', icon: 'M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4', bg: 'rgba(255,255,255,.1)' }
  };
  var DEFAULT_META = { sub: '', icon: 'M12 3v18M3 12h18', bg: 'rgba(255,255,255,.1)' };
  var SPARK = 'M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z';
  var CHEVRON = 'm6 9 6 6 6-6';

  function saved() {
    try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, v); } catch (_) { /* التخزين غير متاح: عادي */ }
  }

  function openMenu() { if (menu) { menu.hidden = false; trig.setAttribute('aria-expanded', 'true'); } }
  function closeMenu() { if (menu) { menu.hidden = true; trig.setAttribute('aria-expanded', 'false'); } }

  function render() {
    if (!sel || !trig || !menu) return;
    var cur = sel.value;
    var opt = sel.options[sel.selectedIndex];
    trig.querySelector('.mt-name').textContent = opt ? opt.textContent : 'تلقائي';
    menu.innerHTML = '';
    Array.prototype.forEach.call(sel.options, function (o) {
      var meta = META[o.value] || DEFAULT_META;
      var it = document.createElement('button');
      it.type = 'button';
      it.className = 'model-opt' + (o.value === cur ? ' active' : '');
      it.innerHTML = '<span class="mo-ico" style="background:' + meta.bg + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + meta.icon + '"></path></svg></span>' +
        '<span class="mo-txt"><span class="mo-name"></span><span class="mo-sub"></span></span>' +
        '<span class="mo-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg></span>';
      it.querySelector('.mo-name').textContent = o.textContent;
      it.querySelector('.mo-sub').textContent = meta.sub;
      it.addEventListener('click', function () {
        sel.value = o.value;
        sel.dispatchEvent(new Event('change'));
        render();
        closeMenu();
      });
      menu.appendChild(it);
    });
  }

  function build() {
    if (sel) return sel;
    var host = document.querySelector('#composer .composer-tool');
    if (!host) return null;

    sel = document.createElement('select');
    sel.id = 'modelPick';
    sel.className = 'model-pick';
    sel.setAttribute('aria-label', 'اختيار النموذج');
    sel.style.display = 'none';
    sel.innerHTML = '<option value="auto">تلقائي</option>';
    sel.value = 'auto';
    sel.addEventListener('change', function () { remember(sel.value); });

    trig = document.createElement('button');
    trig.type = 'button';
    trig.className = 'model-trig';
    trig.setAttribute('aria-haspopup', 'listbox');
    trig.setAttribute('aria-expanded', 'false');
    trig.innerHTML = '<span class="mt-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + SPARK + '"></path></svg></span>' +
      '<span class="mt-name">تلقائي</span>' +
      '<svg class="mt-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="' + CHEVRON + '"></path></svg>';
    trig.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) openMenu(); else closeMenu();
    });

    menu = document.createElement('div');
    menu.className = 'model-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    document.addEventListener('click', function (e) {
      if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== trig) closeMenu();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    host.appendChild(sel);
    host.appendChild(trig);
    host.appendChild(menu);
    render();
    return sel;
  }

  // تُستدعى بعد تسجيل الدخول فقط (من loadChats)
  function load() {
    if (!build() || !D.apiJson) return;
    D.apiJson('/api/models').then(function (r) {
      var list = (r && r.models) || [];
      if (!list.length) return;
      sel.innerHTML = '';
      list.forEach(function (m) {
        var o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.name;
        sel.appendChild(o);
      });
      var cur = saved();
      sel.value = list.some(function (m) { return m.id === cur; }) ? cur : 'auto';
      render();
    }).catch(function () { /* لو القائمة فشلت، يفضل تلقائي */ });
  }

  D.getModel = function () { return sel ? sel.value : saved(); };
  D.loadModels = load;
  build();
})();
