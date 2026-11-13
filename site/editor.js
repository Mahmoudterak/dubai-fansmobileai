/* Dubai Fans AI — محرر المواقع: سحب وإفلات للأقسام، تعديل مباشر للنصوص، تنسيق، وتعديل بالذكاء الاصطناعي */
(function () {
  'use strict';
  var D = window.DFAI;
  var $ = function (id) { return document.getElementById(id); };
  var frame = $('edFrame');

  var ctx = null;          // { m: رسالة المحادثة، el: عنصرها في الصفحة }
  var doc = null;          // مستند الصفحة جوه الـ iframe
  var container = null;    // العنصر اللي جواه الأقسام
  var selected = null;     // العنصر المحدد للتنسيق
  var selectedSection = null;
  var undoStack = [];
  var lastSnap = '';
  var dirty = false;
  var typingTimer = null;

  var EDITOR_CSS =
    '.dfai-hover{outline:1px dashed rgba(109,74,255,.7)!important;outline-offset:2px}' +
    '.dfai-sel{outline:2px solid #6D4AFF!important;outline-offset:2px}' +
    '[contenteditable]:focus{outline:none}';

  var SKIP = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, NOSCRIPT: 1, TEMPLATE: 1 };

  var BLOCKS = [
    { id: 'hero', ico: '🚀', name: 'واجهة رئيسية', html:
      '<section style="padding:90px 24px;text-align:center;background:linear-gradient(135deg,#6D4AFF,#22D3EE);color:#fff">' +
      '<h1 style="font-size:44px;margin:0 0 16px">[العنوان الرئيسي]</h1>' +
      '<p style="font-size:20px;opacity:.92;margin:0 0 28px">[جملة قصيرة توضح القيمة اللي بتقدمها]</p>' +
      '<a href="#" style="display:inline-block;padding:14px 32px;border-radius:12px;background:#fff;color:#1f1147;font-weight:700;text-decoration:none">ابدأ الآن</a></section>' },
    { id: 'features', ico: '✨', name: 'المميزات', html:
      '<section style="padding:70px 24px;background:#fff;color:#14141f;text-align:center">' +
      '<h2 style="font-size:32px;margin:0 0 36px">ليه تختارنا؟</h2>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;max-width:1000px;margin:0 auto">' +
      '<div style="padding:24px;border-radius:16px;background:#f4f2ff"><h3 style="margin:0 0 8px">[ميزة 1]</h3><p style="margin:0;color:#555">[وصف قصير للميزة]</p></div>' +
      '<div style="padding:24px;border-radius:16px;background:#f4f2ff"><h3 style="margin:0 0 8px">[ميزة 2]</h3><p style="margin:0;color:#555">[وصف قصير للميزة]</p></div>' +
      '<div style="padding:24px;border-radius:16px;background:#f4f2ff"><h3 style="margin:0 0 8px">[ميزة 3]</h3><p style="margin:0;color:#555">[وصف قصير للميزة]</p></div>' +
      '</div></section>' },
    { id: 'pricing', ico: '💳', name: 'الأسعار', html:
      '<section style="padding:70px 24px;background:#0f0f1a;color:#fff;text-align:center">' +
      '<h2 style="font-size:32px;margin:0 0 36px">الباقات والأسعار</h2>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;max-width:1000px;margin:0 auto">' +
      '<div style="padding:28px;border-radius:18px;border:1px solid #333"><h3 style="margin:0">أساسي</h3><p style="font-size:34px;font-weight:800;margin:12px 0">[السعر]</p><p style="color:#aaa">[ماذا تشمل الباقة]</p></div>' +
      '<div style="padding:28px;border-radius:18px;border:2px solid #6D4AFF"><h3 style="margin:0">مميز</h3><p style="font-size:34px;font-weight:800;margin:12px 0">[السعر]</p><p style="color:#aaa">[ماذا تشمل الباقة]</p></div>' +
      '<div style="padding:28px;border-radius:18px;border:1px solid #333"><h3 style="margin:0">احترافي</h3><p style="font-size:34px;font-weight:800;margin:12px 0">[السعر]</p><p style="color:#aaa">[ماذا تشمل الباقة]</p></div>' +
      '</div></section>' },
    { id: 'testimonials', ico: '💬', name: 'آراء العملاء', html:
      '<section style="padding:70px 24px;background:#faf9ff;color:#14141f;text-align:center">' +
      '<h2 style="font-size:32px;margin:0 0 36px">عملاؤنا بيقولوا</h2>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;max-width:900px;margin:0 auto">' +
      '<blockquote style="margin:0;padding:24px;border-radius:16px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.06)">"[رأي العميل]"<footer style="margin-top:12px;color:#6D4AFF;font-weight:700">— [اسم العميل]</footer></blockquote>' +
      '<blockquote style="margin:0;padding:24px;border-radius:16px;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.06)">"[رأي العميل]"<footer style="margin-top:12px;color:#6D4AFF;font-weight:700">— [اسم العميل]</footer></blockquote>' +
      '</div></section>' },
    { id: 'faq', ico: '❓', name: 'أسئلة شائعة', html:
      '<section style="padding:70px 24px;background:#fff;color:#14141f">' +
      '<h2 style="font-size:32px;margin:0 0 28px;text-align:center">الأسئلة الشائعة</h2>' +
      '<div style="max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px">' +
      '<details style="padding:16px 18px;border-radius:12px;background:#f4f2ff"><summary style="font-weight:700;cursor:pointer">[السؤال الأول]</summary><p style="margin:10px 0 0;color:#555">[الإجابة]</p></details>' +
      '<details style="padding:16px 18px;border-radius:12px;background:#f4f2ff"><summary style="font-weight:700;cursor:pointer">[السؤال الثاني]</summary><p style="margin:10px 0 0;color:#555">[الإجابة]</p></details>' +
      '<details style="padding:16px 18px;border-radius:12px;background:#f4f2ff"><summary style="font-weight:700;cursor:pointer">[السؤال الثالث]</summary><p style="margin:10px 0 0;color:#555">[الإجابة]</p></details>' +
      '</div></section>' },
    { id: 'whatsapp', ico: '📲', name: 'زر واتساب', html:
      '<section style="padding:60px 24px;background:#0b3d2e;color:#fff;text-align:center">' +
      '<h2 style="font-size:30px;margin:0 0 12px">جاهز تبدأ؟</h2><p style="margin:0 0 24px;opacity:.9">كلمنا على واتساب ونرد عليك في دقايق</p>' +
      '<a href="https://wa.me/[رقم الواتساب]" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#25D366;color:#fff;font-weight:700;text-decoration:none">💬 تواصل عبر واتساب</a></section>' },
    { id: 'contact', ico: '📍', name: 'التواصل', html:
      '<section style="padding:60px 24px;background:#f7f7fb;color:#14141f;text-align:center">' +
      '<h2 style="font-size:30px;margin:0 0 24px">تواصل معنا</h2>' +
      '<p style="margin:6px 0">📍 [العنوان]</p><p style="margin:6px 0">📞 [رقم الهاتف]</p><p style="margin:6px 0">✉️ [البريد الإلكتروني]</p></section>' },
    { id: 'footer', ico: '⬇️', name: 'تذييل', html:
      '<footer style="padding:28px 24px;background:#0a0a12;color:#9aa;text-align:center;font-size:14px">© [السنة] [اسم النشاط]. جميع الحقوق محفوظة.</footer>' }
  ];

  var FONTS = ['Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Almarai', 'Readex Pro'];

  // ---------- أدوات ----------
  function toHex(color) {
    var m = String(color || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (!m) return /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000';
    if (m[4] !== undefined && Number(m[4]) === 0) return '#ffffff';
    return '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + Number(n).toString(16)).slice(-2); }).join('');
  }
  function label(el) {
    var hd = el.querySelector && el.querySelector('h1,h2,h3,h4');
    var txt = ((hd && hd.textContent) || el.textContent || '').replace(/\s+/g, ' ').trim();
    var tag = { HEADER: 'الهيدر', NAV: 'القائمة', FOOTER: 'التذييل', SECTION: 'قسم', MAIN: 'المحتوى', DIV: 'قسم' }[el.tagName] || el.tagName.toLowerCase();
    return txt ? txt.slice(0, 36) : tag;
  }
  function sectionsOf() {
    if (!container) return [];
    return Array.prototype.filter.call(container.children, function (c) { return !SKIP[c.tagName]; });
  }
  function findContainer() {
    var c = doc.body;
    for (var i = 0; i < 4; i += 1) {
      var kids = Array.prototype.filter.call(c.children, function (k) { return !SKIP[k.tagName]; });
      if (kids.length === 1 && (kids[0].tagName === 'DIV' || kids[0].tagName === 'MAIN') && kids[0].children.length >= 2) c = kids[0];
      else break;
    }
    return c;
  }

  // ---------- تحميل وتصدير ----------
  function getHtml() {
    if (!doc || !doc.documentElement) return '';
    var clone = doc.documentElement.cloneNode(true);
    var st = clone.querySelector('#dfai-editor-style');
    if (st) st.remove();
    Array.prototype.forEach.call(clone.querySelectorAll('[contenteditable],[spellcheck],.dfai-sel,.dfai-hover'), function (n) {
      n.removeAttribute('contenteditable');
      n.removeAttribute('spellcheck');
      n.classList.remove('dfai-sel', 'dfai-hover');
      if (n.getAttribute('class') === '') n.removeAttribute('class');
    });
    var body = clone.querySelector('body');
    if (body) { body.removeAttribute('contenteditable'); body.removeAttribute('spellcheck'); }
    // المتصفح أحياناً بيضيف style="" أو class="" فاضيين وقت التعديل؛ نشيلهم عشان مايتحسبوش تعديل
    Array.prototype.forEach.call(clone.querySelectorAll('[style=""],[class=""]'), function (n) {
      if (n.getAttribute('style') === '') n.removeAttribute('style');
      if (n.getAttribute('class') === '') n.removeAttribute('class');
    });
    return '<!doctype html>\n' + clone.outerHTML;
  }

  function load(html, cb) {
    selected = null; selectedSection = null; doc = null;
    frame.onload = function () { init(); if (cb) cb(); };
    frame.srcdoc = html;
  }

  function init() {
    doc = frame.contentDocument;
    if (!doc || !doc.body) return;
    var st = doc.createElement('style');
    st.id = 'dfai-editor-style';
    st.textContent = EDITOR_CSS;
    doc.head.appendChild(st);
    doc.body.setAttribute('contenteditable', 'true');
    doc.body.setAttribute('spellcheck', 'false');
    container = findContainer();
    lastSnap = getHtml();

    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a) e.preventDefault();
      var t = e.target;
      if (!t || t === doc.body || t === doc.documentElement) return;
      select(t);
    }, true);
    doc.addEventListener('mouseover', function (e) {
      var t = e.target;
      if (t && t !== doc.body && t !== doc.documentElement) t.classList.add('dfai-hover');
    });
    doc.addEventListener('mouseout', function (e) { if (e.target && e.target.classList) e.target.classList.remove('dfai-hover'); });
    doc.addEventListener('input', function () {
      dirty = true;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(commit, 1200);
      renderSectionsSoon();
    });
    // منع السحب الافتراضي للصور والروابط جوه الصفحة
    doc.addEventListener('dragstart', function (e) { e.preventDefault(); });
    renderSections();
    renderStyle();
  }

  // ---------- التراجع ----------
  function commit() {
    var now = getHtml();
    if (now && now !== lastSnap) {
      undoStack.push(lastSnap);
      if (undoStack.length > 40) undoStack.shift();
      lastSnap = now;
    }
    updateUndo();
  }
  function beforeChange() {
    clearTimeout(typingTimer);
    commit();
    undoStack.push(lastSnap);
    if (undoStack.length > 40) undoStack.shift();
    dirty = true;
  }
  function afterChange() {
    lastSnap = getHtml();
    renderSections();
    updateUndo();
  }
  function updateUndo() { $('edUndo').disabled = !undoStack.length; }
  $('edUndo').addEventListener('click', function () {
    clearTimeout(typingTimer);
    commit();
    if (!undoStack.length) return;
    var prev = undoStack.pop();
    lastSnap = prev;
    dirty = true;
    load(prev, updateUndo);
  });

  // ---------- التحديد ----------
  function select(el) {
    if (selected && selected.classList) selected.classList.remove('dfai-sel');
    selected = el;
    if (el && el.classList) el.classList.add('dfai-sel');
    var secs = sectionsOf();
    selectedSection = secs.find(function (s) { return s === el || s.contains(el); }) || null;
    Array.prototype.forEach.call($('edSections').children, function (li, i) { li.classList.toggle('sel', secs[i] === selectedSection); });
    renderStyle();
  }

  // ---------- قائمة الأقسام (سحب وإفلات) ----------
  var secTimer = null;
  function renderSectionsSoon() { clearTimeout(secTimer); secTimer = setTimeout(renderSections, 400); }

  var ICONS = {
    grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    dup: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    del: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>'
  };

  function miniBtn(icon, labelText, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini';
    b.innerHTML = icon;
    b.setAttribute('aria-label', labelText);
    b.title = labelText;
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return b;
  }

  function renderSections() {
    var list = $('edSections');
    list.innerHTML = '';
    var secs = sectionsOf();
    secs.forEach(function (sec, i) {
      var li = document.createElement('li');
      li.className = 'ed-sec' + (sec === selectedSection ? ' sel' : '');
      li.draggable = true;
      li.dataset.index = String(i);
      var grip = document.createElement('span');
      grip.className = 'grip';
      grip.innerHTML = ICONS.grip;
      grip.setAttribute('aria-hidden', 'true');
      var name = document.createElement('button');
      name.type = 'button';
      name.className = 'name';
      name.textContent = label(sec);
      name.addEventListener('click', function () {
        select(sec);
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(grip);
      li.appendChild(name);
      li.appendChild(miniBtn(ICONS.up, 'تحريك لفوق', function () { move(i, i - 1); }));
      li.appendChild(miniBtn(ICONS.down, 'تحريك لتحت', function () { move(i, i + 1); }));
      li.appendChild(miniBtn(ICONS.dup, 'تكرار القسم', function () {
        beforeChange(); sec.after(sec.cloneNode(true)); afterChange();
      }));
      li.appendChild(miniBtn(ICONS.del, 'حذف القسم', function () {
        beforeChange(); sec.remove(); if (selectedSection === sec) { selected = null; selectedSection = null; } afterChange(); renderStyle();
      }));

      li.addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'sec:' + i);
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        var r = li.getBoundingClientRect();
        var after = e.clientY > r.top + r.height / 2;
        li.classList.toggle('drop-after', after);
        li.classList.toggle('drop-before', !after);
      });
      li.addEventListener('dragleave', function () { li.classList.remove('drop-after', 'drop-before'); });
      li.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var after = li.classList.contains('drop-after');
        li.classList.remove('drop-after', 'drop-before');
        handleDrop(e.dataTransfer.getData('text/plain'), after ? i + 1 : i);
      });
      list.appendChild(li);
    });
    if (!secs.length) list.innerHTML = '<li class="ed-hint">الصفحة فاضية. ضيف أقسام من تبويب "إضافة".</li>';
  }

  var listEl = $('edSections');
  listEl.addEventListener('dragover', function (e) { e.preventDefault(); if (e.target === listEl) listEl.classList.add('drop-end'); });
  listEl.addEventListener('dragleave', function () { listEl.classList.remove('drop-end'); });
  listEl.addEventListener('drop', function (e) {
    e.preventDefault();
    listEl.classList.remove('drop-end');
    handleDrop(e.dataTransfer.getData('text/plain'), sectionsOf().length);
  });

  function handleDrop(data, toIndex) {
    if (!data) return;
    if (data.indexOf('sec:') === 0) {
      var from = Number(data.slice(4));
      move(from, toIndex > from ? toIndex - 1 : toIndex);
    } else if (data.indexOf('block:') === 0) {
      insertBlock(data.slice(6), toIndex);
    }
  }

  function move(from, to) {
    var secs = sectionsOf();
    if (from < 0 || from >= secs.length || to < 0 || to >= secs.length || from === to) return;
    beforeChange();
    var node = secs[from];
    var ref = secs[to];
    if (to > from) ref.after(node); else ref.before(node);
    afterChange();
  }

  // ---------- مكتبة الأقسام ----------
  function renderBlocks() {
    var wrap = $('edBlocks');
    wrap.innerHTML = '';
    BLOCKS.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ed-block';
      btn.draggable = true;
      btn.innerHTML = '<i aria-hidden="true"></i><span></span>';
      btn.querySelector('i').textContent = b.ico;
      btn.querySelector('span').textContent = b.name;
      btn.addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'block:' + b.id);
      });
      btn.addEventListener('click', function () {
        var secs = sectionsOf();
        var idx = selectedSection ? secs.indexOf(selectedSection) + 1 : secs.length;
        insertBlock(b.id, idx);
        D.toast('اتضاف قسم "' + b.name + '" ✅');
      });
      wrap.appendChild(btn);
    });
  }

  function insertBlock(id, index) {
    var b = BLOCKS.find(function (x) { return x.id === id; });
    if (!b || !doc) return;
    beforeChange();
    var tpl = doc.createElement('template');
    tpl.innerHTML = b.html;
    var node = tpl.content.firstElementChild;
    var secs = sectionsOf();
    if (index >= secs.length) container.appendChild(node);
    else secs[index].before(node);
    afterChange();
    select(node);
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- التنسيق ----------
  var styleTimer = null;
  function styleChange(fn) {
    if (!styleTimer) beforeChange();
    fn();
    dirty = true;
    clearTimeout(styleTimer);
    styleTimer = setTimeout(function () { styleTimer = null; afterChange(); }, 700);
  }

  function field(labelText, control) {
    var w = document.createElement('label');
    w.className = 'ed-field';
    w.appendChild(document.createTextNode(labelText));
    w.appendChild(control);
    return w;
  }

  function renderStyle() {
    var box = $('edStyle');
    box.innerHTML = '';
    if (!doc) return;

    if (selected && doc.body.contains(selected)) {
      var cs = doc.defaultView.getComputedStyle(selected);
      var tagName = { H1: 'عنوان رئيسي', H2: 'عنوان', H3: 'عنوان فرعي', P: 'فقرة', A: 'رابط / زر', BUTTON: 'زر', IMG: 'صورة', SECTION: 'قسم', DIV: 'صندوق', SPAN: 'نص', LI: 'عنصر قائمة', HEADER: 'هيدر', FOOTER: 'تذييل', NAV: 'قائمة' }[selected.tagName] || selected.tagName.toLowerCase();
      var tag = document.createElement('span');
      tag.className = 'ed-sel-tag';
      tag.textContent = 'المحدد: ' + tagName;
      box.appendChild(tag);

      var color = document.createElement('input');
      color.type = 'color';
      color.value = toHex(cs.color);
      color.addEventListener('input', function () { styleChange(function () { selected.style.color = color.value; }); });
      box.appendChild(field('لون النص', color));

      var bg = document.createElement('input');
      bg.type = 'color';
      bg.value = toHex(cs.backgroundColor);
      bg.addEventListener('input', function () { styleChange(function () { selected.style.background = bg.value; }); });
      box.appendChild(field('لون الخلفية', bg));

      var size = document.createElement('input');
      size.type = 'range'; size.min = '10'; size.max = '80'; size.step = '1';
      size.value = String(Math.round(parseFloat(cs.fontSize) || 16));
      var sizeLabel = field('حجم الخط: ' + size.value + 'px', size);
      size.addEventListener('input', function () {
        sizeLabel.firstChild.nodeValue = 'حجم الخط: ' + size.value + 'px';
        styleChange(function () { selected.style.fontSize = size.value + 'px'; });
      });
      box.appendChild(sizeLabel);

      var seg = document.createElement('div');
      seg.className = 'ed-seg';
      [['right', 'يمين'], ['center', 'وسط'], ['left', 'شمال']].forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = a[1];
        if (cs.textAlign === a[0] || (a[0] === 'right' && cs.textAlign === 'start')) b.classList.add('on');
        b.addEventListener('click', function () {
          styleChange(function () { selected.style.textAlign = a[0]; });
          Array.prototype.forEach.call(seg.children, function (x) { x.classList.toggle('on', x === b); });
        });
        seg.appendChild(b);
      });
      box.appendChild(field('محاذاة النص', seg));

      var link = selected.closest('a');
      if (link) {
        var href = document.createElement('input');
        href.type = 'url'; href.dir = 'ltr';
        href.value = link.getAttribute('href') || '';
        href.placeholder = 'https://wa.me/971XXXXXXXXX';
        href.addEventListener('change', function () { styleChange(function () { link.setAttribute('href', href.value.trim()); }); });
        box.appendChild(field('رابط الزر', href));
      }
      if (selected.tagName === 'IMG') {
        var src = document.createElement('input');
        src.type = 'url'; src.dir = 'ltr';
        src.value = selected.getAttribute('src') || '';
        src.addEventListener('change', function () { styleChange(function () { selected.setAttribute('src', src.value.trim()); }); });
        box.appendChild(field('رابط الصورة', src));
      }

      var actions = document.createElement('div');
      actions.className = 'mon-actions';
      var dupBtn = document.createElement('button');
      dupBtn.type = 'button'; dupBtn.className = 'btn-ghost'; dupBtn.textContent = 'تكرار العنصر';
      dupBtn.addEventListener('click', function () { beforeChange(); selected.after(selected.cloneNode(true)); afterChange(); });
      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'btn-ghost danger'; delBtn.textContent = 'حذف العنصر';
      delBtn.addEventListener('click', function () { beforeChange(); selected.remove(); selected = null; selectedSection = null; afterChange(); renderStyle(); });
      actions.appendChild(dupBtn);
      actions.appendChild(delBtn);
      box.appendChild(actions);
      box.appendChild(Object.assign(document.createElement('hr'), { className: 'ed-sep' }));
    } else {
      var p = document.createElement('p');
      p.className = 'ed-style-empty';
      p.textContent = 'اضغط على أي عنصر في الصفحة (عنوان، زر، قسم…) عشان تغيّر لونه وحجمه ومحاذاته.';
      box.appendChild(p);
    }

    // تنسيق الصفحة كلها
    var font = document.createElement('select');
    var current = (doc.body.style.fontFamily || '').replace(/["']/g, '').split(',')[0].trim();
    font.innerHTML = '<option value="">الخط الحالي</option>' + FONTS.map(function (f) { return '<option' + (f === current ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    font.addEventListener('change', function () {
      if (!font.value) return;
      styleChange(function () {
        var l = doc.getElementById('dfai-font');
        if (!l) { l = doc.createElement('link'); l.id = 'dfai-font'; l.rel = 'stylesheet'; doc.head.appendChild(l); }
        l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(font.value).replace(/%20/g, '+') + ':wght@400;600;700;800&display=swap';
        doc.body.style.fontFamily = "'" + font.value + "', sans-serif";
        Array.prototype.forEach.call(doc.querySelectorAll('h1,h2,h3,h4,p,a,button,li,span,div,section,blockquote,summary'), function (n) {
          if (n.style && n.style.fontFamily) n.style.fontFamily = '';
        });
      });
    });
    box.appendChild(field('خط الصفحة كلها', font));

    var pageBg = document.createElement('input');
    pageBg.type = 'color';
    pageBg.value = toHex(doc.defaultView.getComputedStyle(doc.body).backgroundColor);
    pageBg.addEventListener('input', function () { styleChange(function () { doc.body.style.background = pageBg.value; }); });
    box.appendChild(field('خلفية الصفحة', pageBg));
  }

  // ---------- التبويبات ----------
  function setTab(name, silent) {
    Array.prototype.forEach.call(document.querySelectorAll('.ed-tab'), function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.ed-pane'), function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
    if (!silent && name === 'style') renderStyle();
  }
  Array.prototype.forEach.call(document.querySelectorAll('.ed-tab'), function (t) {
    t.addEventListener('click', function () { setTab(t.getAttribute('data-tab')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.ed-view'), function (b) {
    b.addEventListener('click', function () {
      frame.style.width = b.getAttribute('data-w');
      Array.prototype.forEach.call(document.querySelectorAll('.ed-view'), function (x) { x.classList.toggle('active', x === b); });
    });
  });

  // ---------- فتح وحفظ وإغلاق ----------
  function openEditor(m, el) {
    var html = D.extractHtml(m.content);
    if (!html) { D.toast('مش لاقي كود الموقع في الرد ده.'); return; }
    ctx = { m: m, el: el };
    undoStack = [];
    dirty = false;
    $('edTitle').textContent = 'محرر الموقع';
    $('edAiInput').value = '';
    frame.style.width = '100%';
    Array.prototype.forEach.call(document.querySelectorAll('.ed-view'), function (x) { x.classList.toggle('active', x.getAttribute('data-w') === '100%'); });
    $('editorModal').hidden = false;
    document.body.style.overflow = 'hidden';
    setTab('sections');
    renderBlocks();
    updateUndo();
    load(html);
    setTimeout(function () { $('edClose').focus(); }, 50);
  }

  function save() {
    clearTimeout(typingTimer);
    commit();
    var html = getHtml();
    if (!ctx || !html) return;
    var m = ctx.m;
    var block = '```html\n' + html + '\n```';
    m.content = /```html[\s\S]*?(```|$)/i.test(m.content) ? m.content.replace(/```html[\s\S]*?(```|$)/i, function () { return block; }) : m.content + '\n\n' + block;
    D.saveChats();
    if (ctx.el) {
      var md = ctx.el.querySelector('.md');
      if (md) md.innerHTML = D.renderMarkdown(m.content);
      ctx.el._raw = m.content;
    }
    dirty = false;
    D.toast('اتحفظ ✅');
  }

  function close() {
    clearTimeout(typingTimer);
    commit();
    if (dirty && !confirm('في تعديلات ماتحفظتش. تخرج من غير حفظ؟')) return;
    $('editorModal').hidden = true;
    document.body.style.overflow = '';
    frame.onload = null;
    frame.srcdoc = '';
    doc = null; ctx = null; selected = null; selectedSection = null;
  }

  $('edSave').addEventListener('click', save);
  $('edClose').addEventListener('click', close);
  $('edDownload').addEventListener('click', function () {
    commit();
    D.downloadBlob(new Blob([getHtml()], { type: 'text/html;charset=utf-8' }), D.safeName(ctx && ctx.m && ctx.m.title) + '.html');
  });
  document.addEventListener('keydown', function (e) {
    if ($('editorModal').hidden) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  }, true);

  // ---------- التعديل بالذكاء الاصطناعي ----------
  function aiEdit() {
    var instruction = $('edAiInput').value.trim();
    if (!instruction) { $('edAiInput').focus(); return; }
    if (D.left('messages') <= 0) { D.openPlans('خلصت رسائلك لليوم. اشترك في باقة عشان تكمّل التعديل بالذكاء الاصطناعي.'); return; }
    clearTimeout(typingTimer);
    commit();
    var html = getHtml();
    $('edBusy').hidden = false;
    $('edAiBtn').disabled = true;
    var full = '';
    D.api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ tool: 'site_edit', lang: window.DFAI_LANG || 'ar', messages: [{ role: 'user', content: instruction + '\n\nالكود الحالي للصفحة:\n```html\n' + html + '\n```' }] })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (d) {
          var err = new Error((d.error && d.error.message) || ('حدث خطأ (' + res.status + ')'));
          err.code = d.error && d.error.code;
          throw err;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          lines.forEach(function (line) {
            line = line.trim();
            if (line.indexOf('data:') !== 0) return;
            var p = line.slice(5).trim();
            if (!p || p === '[DONE]') return;
            var j;
            try { j = JSON.parse(p); } catch (ex) { return; }
            if (j.error) throw new Error(j.error.message || 'خطأ من المحرك');
            var d = j.choices && j.choices[0] && j.choices[0].delta;
            if (d && d.content) full += d.content;
          });
          return pump();
        });
      }
      return pump();
    }).then(function () {
      var next = D.extractHtml(full);
      if (!next) throw new Error('الذكاء الاصطناعي مارجّعش صفحة كاملة. جرّب تكتب الطلب بشكل أوضح.');
      undoStack.push(html);
      lastSnap = next;
      dirty = true;
      load(next, function () { updateUndo(); D.toast('اتعدّلت الصفحة ✨ (تقدر تتراجع لو مش عاجبك)'); });
      $('edAiInput').value = '';
    }).catch(function (ex) {
      D.toast(D.netMessage(ex));
      if (ex.code === 'quota') D.openPlans(ex.message);
    }).finally(function () {
      $('edBusy').hidden = true;
      $('edAiBtn').disabled = false;
      D.refreshMe();
    });
  }
  $('edAiBtn').addEventListener('click', aiEdit);
  $('edAiInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); aiEdit(); } });

  // ---------- فحص وتحسين: مخالفات ثابتة للأداء وSEO، وبعدها الذكاء الاصطناعي يصلّح ----------
  function checkPage() {
    if (!doc) return [];
    var issues = [];
    var imgs = Array.prototype.slice.call(doc.querySelectorAll('img'));
    var noDim = imgs.filter(function (im) { return !im.hasAttribute('width') || !im.hasAttribute('height'); }).length;
    var noAlt = imgs.filter(function (im) { return !im.hasAttribute('alt'); }).length;
    var noLazy = imgs.filter(function (im, i) { return i > 1 && im.getAttribute('loading') !== 'lazy'; }).length;
    var blockingJs = Array.prototype.filter.call(doc.querySelectorAll('script[src]'), function (s) { return !s.defer && !s.async; }).length;
    if (noDim) issues.push(noDim + ' صورة بدون أبعاد (width/height) وده بيسبب قفزات في الصفحة');
    if (noAlt) issues.push(noAlt + ' صورة بدون وصف alt');
    if (noLazy) issues.push(noLazy + ' صورة تحت الشاشة ممكن تتحمّل كسولاً (lazy)');
    if (blockingJs) issues.push(blockingJs + ' ملف JS بيعطّل التحميل (يحتاج defer)');
    if (!doc.querySelector('meta[name="viewport"]')) issues.push('مفيش meta viewport للموبايل');
    if (!doc.documentElement.getAttribute('lang')) issues.push('مفيش lang للصفحة');
    if (!doc.querySelector('title')) issues.push('مفيش title للصفحة');
    return issues;
  }
  $('edCheckBtn').addEventListener('click', function () {
    var issues = checkPage();
    D.toast(issues.length ? 'لقيت ' + issues.length + ' ملاحظة: ' + issues.join(' · ') : 'الفحص الثابت مرّ. الذكاء الاصطناعي هيراجع الكود دلوقتي.');
    $('edAiInput').value = 'افحص الكود ده وصلّح أي أخطاء HTML/CSS/JS، وخلّيه يتعرض صح على الموبايل. وحسّن سرعة التحميل وفق Core Web Vitals: ضيف width وheight للصور، وloading="lazy" للصور اللي تحت الشاشة، وdefer للسكربتات، وalt للصور الناقصة، و lang وtitle لو ناقصين. ما تغيّرش الشكل ولا المحتوى ولا الألوان.';
    aiEdit();
  });

  D.openEditor = openEditor;
})();
