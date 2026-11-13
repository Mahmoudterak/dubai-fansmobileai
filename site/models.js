/* Dubai Fans AI — اختيار النموذج داخل الشات
   القائمة بتجي من الخادم (النماذج المفعّلة فعلاً فقط)، والاختيار بيتحفظ على الجهاز. */
(function () {
  var D = window.DFAI;
  if (!D) return;
  var KEY = 'dfai.model';
  var sel = null;

  function saved() {
    try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; }
  }
  function remember(v) {
    try { localStorage.setItem(KEY, v); } catch (_) { /* التخزين غير متاح: عادي */ }
  }

  function build() {
    if (sel) return sel;
    var host = document.querySelector('#composer .composer-tool');
    if (!host) return null;
    sel = document.createElement('select');
    sel.id = 'modelPick';
    sel.className = 'model-pick';
    sel.setAttribute('aria-label', 'اختيار النموذج');
    sel.innerHTML = '<option value="auto">تلقائي</option>';
    sel.value = 'auto';
    sel.addEventListener('change', function () { remember(sel.value); });
    host.appendChild(sel);
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
    }).catch(function () { /* لو القائمة فشلت، يفضل تلقائي */ });
  }

  D.getModel = function () { return sel ? sel.value : saved(); };
  D.loadModels = load;
  build();
})();
