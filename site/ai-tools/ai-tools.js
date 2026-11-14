/* ai-tools: لوحة واحدة فيها ثلاث أدوات: صوت العلامة، مقيّم الجمهور، ومن صورة لكود.
   الكود في site/ai-tools/ (واجهة) وفي api/app/ai-tools/ (الخادم). */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var TABS = [
    { id: 'voice', label: 'صوت العلامة' },
    { id: 'personas', label: 'تقييم الجمهور' },
    { id: 'shot', label: 'من صورة لكود' },
    { id: 'leads', label: 'باحث العملاء' },
    { id: 'advisor', label: 'المستشار' },
    { id: 'bench', label: 'قارن بالمنافس' },
    { id: 'tasks', label: 'المهام' }
  ];

  function openAiTools() {
    var p = D.showPanel('ai-tools');
    p.innerHTML = '';
    // نفس هوية صفحة نشاطي التجاري: رأس بأيقونة ووصف، وتبويبات بنفس الشكل
    var head = el('div', 'pv');
    var hh = el('div', 'pv-head');
    hh.innerHTML = '<div class="pv-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></div>' +
      '<div><h1>مركز الأدوات الذكية</h1><p>أدوات الذكاء الاصطناعي لنشاطك. ولا تنفيذ من غير موافقتك.</p></div>';
    var close = el('button', 'icon-btn ait-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', D.hidePanel);
    hh.appendChild(close);
    head.appendChild(hh);

    var tabs = el('div', 'biz-tabs');
    tabs.setAttribute('role', 'tablist');
    var body = el('div', 'ait-body');

    function show(id) {
      Array.prototype.forEach.call(tabs.children, function (b) {
        var on = b.getAttribute('data-t') === id;
        b.className = on ? 'on' : '';
        b.setAttribute('aria-selected', String(on));
      });
      body.innerHTML = '';
      if (id === 'voice') renderVoice(body);
      else if (id === 'personas') renderPersonas(body);
      else if (id === 'leads') renderLeads(body);
      else if (id === 'advisor') renderAdvisor(body);
      else if (id === 'bench') renderBench(body);
      else if (id === 'tasks') renderTasks(body);
      else renderShot(body);
    }

    TABS.forEach(function (t) {
      var b = el('button', '', t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-t', t.id);
      b.addEventListener('click', function () { show(t.id); });
      tabs.appendChild(b);
    });

    // الرجوع للوحة الرئيسية (الكروت) من أي أداة
    var back = el('button', 'btn-ghost sm ait-back', 'رجوع');
    back.type = 'button';
    back.addEventListener('click', showHub);

    function openTool(id) {
      p.innerHTML = '';
      p.appendChild(head);
      p.appendChild(back);
      p.appendChild(tabs);
      p.appendChild(body);
      show(id);
    }

    function showHub() {
      p.innerHTML = '';
      p.appendChild(head);
      p.appendChild(buildHub(openTool));
    }

    p.classList.add('ait-panel');
    showHub();
  }

  // اللوحة الرئيسية: رصيد النقاط، ثلاث بطاقات أرقام، وست أدوات
  var HUB_TOOLS = [
    { id: 'voice', label: 'صوت العلامة', sub: 'خلي كل نص يطلع بأسلوب علامتك', ico: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3' },
    { id: 'personas', label: 'تقييم الجمهور', sub: 'اعرض إعلانك على ثلاث شخصيات افتراضية', ico: 'M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0' },
    { id: 'shot', label: 'من صورة لكود', sub: 'حوّل لقطة شاشة لصفحة HTML قابلة للتعديل', ico: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4' },
    { id: 'leads', label: 'باحث العملاء', sub: 'ابحث عن عملاء محتملين لنشاطك', ico: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4' },
    { id: 'advisor', label: 'المستشار', sub: 'اسأل عن قرار تجاري واخذ رأي واضح', ico: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' },
    { id: 'bench', label: 'قارن بالمنافس', sub: 'قارن موقعك أو عرضك بمنافس', ico: 'M4 19V9M10 19V5M16 19v-7M22 19H2' }
  ];

  function buildHub(openTool) {
    var me = D.state && D.state.me;
    var cr = me && me.credits;
    var wrap = el('div', 'ait-hub');

    var credit = el('div', 'ait-credit');
    credit.appendChild(el('strong', '', 'رصيد النقاط الشهري'));
    var left = cr ? (cr.limit === -1 ? 'غير محدود' : String(cr.left)) : '—';
    credit.appendChild(el('div', 'ait-credit-num', left));
    wrap.appendChild(credit);

    var stats = el('div', 'ait-stats');
    var tiles = [
      ['الرصيد المتبقي', left],
      ['حد الباقة', cr ? (cr.limit === -1 ? 'غير محدود' : String(cr.limit)) : '—'],
      ['الأدوات المتاحة', String(HUB_TOOLS.length)]
    ];
    tiles.forEach(function (t) {
      var s = el('div', 'ait-stat');
      s.appendChild(el('span', 'ait-stat-label', t[0]));
      s.appendChild(el('b', '', t[1]));
      stats.appendChild(s);
    });
    wrap.appendChild(stats);

    var grid = el('div', 'ait-grid');
    HUB_TOOLS.forEach(function (t) {
      var b = el('button', 'ait-tool');
      b.type = 'button';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t.ico + '"/></svg>';
      b.appendChild(el('strong', '', t.label));
      b.appendChild(el('small', '', t.sub));
      b.addEventListener('click', function () { openTool(t.id); });
      grid.appendChild(b);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ---------- 1) صوت العلامة ----------
  function renderVoice(body) {
    body.appendChild(el('p', '', 'الصق نصوص كتبتها أنت أو فريقك (منشورات، إعلانات، رسائل)، حتى 20 ألف حرف، وأنا أستخرج ملف أسلوب. الكلام الأصلي ما بيتحفظش، بس الملف، وأي نص بعد كده بيتكتب بنفس الأسلوب.'));
    var status = el('div', 'ait-status', 'جارٍ التحميل…');
    body.appendChild(status);
    var ta = el('textarea');
    ta.rows = 8;
    ta.maxLength = 20000;
    ta.placeholder = 'الصق هنا 300 حرف على الأقل…';
    body.appendChild(ta);
    var row = el('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var save = el('button', 'btn-primary sm', 'احفظ الأسلوب');
    save.type = 'button';
    var clear = el('button', 'btn-ghost sm', 'امسح الأسلوب المحفوظ');
    clear.type = 'button';
    row.appendChild(save);
    row.appendChild(clear);
    body.appendChild(row);

    function paint(d) {
      if (d.profile) {
        status.textContent = 'الأسلوب المحفوظ: ' + d.profile;
      } else {
        status.textContent = 'مفيش أسلوب محفوظ لسه.';
      }
    }
    D.apiJson('/api/ai-tools/voice').then(paint).catch(function () { status.textContent = 'تعذّر تحميل الأسلوب.'; });

    save.addEventListener('click', function () {
      var text = ta.value.trim();
      if (text.length < 300) { D.toast('الصق 300 حرف على الأقل.'); return; }
      save.disabled = true;
      status.textContent = 'جارٍ تحليل الأسلوب…';
      D.apiJson('/api/ai-tools/voice', { method: 'POST', body: JSON.stringify({ samples: text }) })
        .then(function (d) { paint(d); ta.value = ''; D.toast('اتحفظ الأسلوب ✅'); })
        .catch(function (ex) { status.textContent = ''; D.toast(ex.message || 'تعذّر الحفظ.'); })
        .then(function () { save.disabled = false; });
    });
    clear.addEventListener('click', function () {
      if (!window.confirm('تمسح الأسلوب المحفوظ؟')) return;
      D.apiJson('/api/ai-tools/voice', { method: 'DELETE' })
        .then(function () { paint({ profile: null }); D.toast('اتمسح الأسلوب'); })
        .catch(function () { D.toast('تعذّر المسح.'); });
    });
  }

  // ---------- 2) تقييم الجمهور ----------
  function renderPersonas(body) {
    body.appendChild(el('p', '', 'اكتب الإعلان أو العرض، وثلاث شخصيات افتراضية (من الإمارات والخليج والمقيمين) بيقرأوه ويقولوا رأيهم. ده تقدير بالذكاء الاصطناعي، مش بيانات جمهور حقيقي.'));
    var ta = el('textarea');
    ta.rows = 5;
    ta.maxLength = 2000;
    ta.placeholder = 'مثال: خصم 30% على كل العطور لحد نهاية الأسبوع، توصيل مجاني داخل دبي';
    body.appendChild(ta);
    var go = el('button', 'btn-primary sm', 'جرّب على الشخصيات');
    go.type = 'button';
    go.style.justifySelf = 'start';
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    go.addEventListener('click', function () {
      var text = ta.value.trim();
      if (text.length < 10) { D.toast('اكتب الإعلان أو العرض الأول.'); return; }
      go.disabled = true;
      out.textContent = 'الشخصيات بتقرأ…';
      D.apiJson('/api/ai-tools/personas', { method: 'POST', body: JSON.stringify({ content: text }) })
        .then(function (d) {
          out.innerHTML = '';
          (d.critiques || []).forEach(function (c) {
            var card = el('div', 'ait-card');
            card.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:4px';
            card.appendChild(el('strong', '', c.name));
            card.appendChild(el('div', '', '💬 ' + c.reaction));
            card.appendChild(el('div', '', '⚠️ ' + c.objection));
            card.appendChild(el('div', '', '💡 ' + c.suggestion));
            out.appendChild(card);
          });
          if (d.note) out.appendChild(el('p', 'guest-note', d.note));
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر التجربة.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 3) من صورة لكود ----------
  function renderShot(body) {
    body.appendChild(el('p', '', 'ارفع لقطة شاشة لتصميم أعجبك، أو كروكي بإيدك. هيتحوّل لملف HTML واحد تقدر تعدّله في محرر الموقع. بيستهلك من حصة الصور في باقتك.'));
    var file = el('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp';
    body.appendChild(file);
    var preview = el('img');
    preview.alt = '';
    preview.style.cssText = 'max-width:100%;max-height:260px;border-radius:12px;display:none';
    body.appendChild(preview);
    var go = el('button', 'btn-primary sm', 'حوّل لكود');
    go.type = 'button';
    go.style.justifySelf = 'start';
    go.disabled = true;
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);
    var dataUrl = null;
    var html = null;

    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      dataUrl = null;
      go.disabled = true;
      if (!f) return;
      if (f.size > 2.5 * 1024 * 1024) { D.toast('الصورة كبيرة. الحد 2.5 ميجا.'); file.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        dataUrl = reader.result;
        preview.src = dataUrl;
        preview.style.display = 'block';
        go.disabled = false;
      };
      reader.readAsDataURL(f);
    });

    go.addEventListener('click', function () {
      if (!dataUrl) return;
      go.disabled = true;
      out.textContent = 'جارٍ التحويل… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/screenshot', { method: 'POST', body: JSON.stringify({ image: dataUrl }) })
        .then(function (d) {
          html = d.html;
          out.innerHTML = '';
          out.appendChild(el('p', '', 'جاهز. افتحه في المحرر وعدّله، أو انسخ الكود.'));
          var row = el('div');
          row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
          var open = el('button', 'btn-primary sm', 'افتح في محرر الموقع');
          open.type = 'button';
          open.addEventListener('click', function () {
            D.openEditor({ content: '```html\n' + html + '\n```' }, document.createElement('div'));
          });
          var copy = el('button', 'btn-ghost sm', 'انسخ الكود');
          copy.type = 'button';
          copy.addEventListener('click', function () {
            var done = function () { D.toast('الكود اتنسخ ✅'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(html).then(done, done);
          });
          row.appendChild(open);
          row.appendChild(copy);
          out.appendChild(row);
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر التحويل.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 6) المهام: اللي شغال في الخلفية ومصيره ----------
  var TASK_KIND = { 'ad-benchmark': 'مقارنة إعلان', 'advisor-market': 'توصيات المستشار' };
  var TASK_STATUS = { queued: 'في الانتظار', running: 'جارٍ التنفيذ', done: 'خلصت', failed: 'فشلت', cancelled: 'ملغاة' };

  function renderTasks(body) {
    var head = el('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px';
    head.appendChild(el('p', '', 'هنا كل المهام اللي شغالة في الخلفية. المهمة بتكمل حتى لو قفلت الصفحة، والنتيجة بتفضل هنا.'));
    var refresh = el('button', 'btn-ghost sm', 'تحديث');
    refresh.type = 'button';
    head.appendChild(refresh);
    body.appendChild(head);
    var list = el('div');
    list.style.cssText = 'display:grid;gap:10px';
    body.appendChild(list);
    var timer = null;

    function taskCard(t) {
      var c = el('div');
      c.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:6px';
      c.appendChild(el('strong', '', TASK_KIND[t.kind] || t.kind));
      c.appendChild(el('div', 'guest-note', (TASK_STATUS[t.status] || t.status) + ' · ' + new Date(t.created_at).toLocaleString('ar-AE')));
      if (t.status === 'failed') c.appendChild(el('div', '', t.error || 'فشلت المهمة.'));
      if (t.status === 'done' && t.result) {
        if (t.kind === 'ad-benchmark') {
          var box = el('div');
          renderBenchResult(box, t.result);
          c.appendChild(box);
        } else {
          c.appendChild(el('div', '', 'اتضافت توصية جديدة في تبويب المستشار ✅'));
        }
      }
      if (t.status === 'queued') {
        var cancel = el('button', 'btn-ghost sm', 'إلغاء');
        cancel.type = 'button';
        cancel.style.justifySelf = 'start';
        cancel.addEventListener('click', function () {
          cancel.disabled = true;
          D.apiJson('/api/tasks/' + t.id + '/cancel', { method: 'POST' })
            .then(load)
            .catch(function (ex) { D.toast(ex.message || 'تعذّر الإلغاء.'); cancel.disabled = false; });
        });
        c.appendChild(cancel);
      }
      return c;
    }

    function load() {
      clearTimeout(timer);
      if (!list.isConnected) return; // قفلنا التبويب، نوقف التحديث
      D.apiJson('/api/tasks')
        .then(function (d) {
          var tasks = d.tasks || [];
          list.innerHTML = '';
          if (!tasks.length) list.appendChild(el('p', 'guest-note', 'لسه ما فيش مهام.'));
          tasks.forEach(function (t) { list.appendChild(taskCard(t)); });
          if (tasks.some(function (t) { return t.status === 'queued' || t.status === 'running'; })) timer = setTimeout(load, 5000);
        })
        .catch(function (ex) { list.textContent = ex.message || 'تعذّر تحميل المهام.'; });
    }

    refresh.addEventListener('click', load);
    load();
  }

  // ---------- 5) قارن إعلانك بالمنافس: المستخدم يرفع الإعلانين بنفسه ----------
  function renderBench(body) {
    body.appendChild(el('p', '', 'ارفع إعلانك وإعلان المنافس اللي عندك (صورة أو نص لكل واحد). هنقارنهم ونديك تقدير من 10 وتوصيات تفرّقك. التقدير على المادة المرفوعة بس، ومش توقع للمبيعات.'));
    var sides = {};
    ['mine', 'rival'].forEach(function (key) {
      var box = el('div', 'ait-side');
      box.style.cssText = 'display:grid;gap:8px;padding:12px;border:1px solid var(--border,#e5e5e5);border-radius:12px';
      box.appendChild(el('strong', '', key === 'mine' ? 'إعلانك' : 'إعلان المنافس'));
      var ta = el('textarea');
      ta.rows = 3;
      ta.maxLength = 1500;
      ta.placeholder = 'اكتب نص الإعلان أو الهوك (اختياري لو رفعت صورة)';
      var file = el('input');
      file.type = 'file';
      file.accept = 'image/png,image/jpeg,image/webp';
      var prev = el('img');
      prev.alt = '';
      prev.style.cssText = 'max-width:100%;max-height:200px;border-radius:12px;display:none';
      box.appendChild(ta);
      box.appendChild(file);
      box.appendChild(prev);
      body.appendChild(box);
      sides[key] = { ta: ta, image: null };
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        sides[key].image = null;
        prev.style.display = 'none';
        if (!f) return;
        if (f.size > 2.5 * 1024 * 1024) { D.toast('الصورة كبيرة. الحد 2.5 ميجا.'); file.value = ''; return; }
        var reader = new FileReader();
        reader.onload = function () {
          sides[key].image = reader.result;
          prev.src = reader.result;
          prev.style.display = 'block';
        };
        reader.readAsDataURL(f);
      });
    });

    var row = el('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var go = el('button', 'btn-primary sm', 'قارن');
    go.type = 'button';
    var bg = el('button', 'btn-ghost sm', 'شغّلها في الخلفية');
    bg.type = 'button';
    row.appendChild(go);
    row.appendChild(bg);
    body.appendChild(row);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    function value(s) { return { text: s.ta.value.trim(), image: s.image }; }

    // يرجّع الإعلانين لو الاتنين فيهم محتوى، وإلا null
    function pair() {
      var mine = value(sides.mine);
      var rival = value(sides.rival);
      if (!(mine.text || mine.image) || !(rival.text || rival.image)) {
        D.toast('ارفع أو اكتب إعلانك وإعلان المنافس.');
        return null;
      }
      return { mine: mine, rival: rival };
    }

    bg.addEventListener('click', function () {
      var p = pair();
      if (!p) return;
      bg.disabled = true;
      D.apiJson('/api/tasks', { method: 'POST', body: JSON.stringify({ kind: 'ad-benchmark', payload: p }) })
        .then(function () { D.toast('هتلاقي النتيجة في تبويب المهام'); })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر بدء المهمة.'); })
        .then(function () { bg.disabled = false; });
    });

    go.addEventListener('click', function () {
      var p = pair();
      if (!p) return;
      var mine = p.mine;
      var rival = p.rival;
      go.disabled = true;
      out.textContent = 'جارٍ المقارنة… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/ad-benchmark', { method: 'POST', body: JSON.stringify({ mine: mine, rival: rival }) })
        .then(function (d) { renderBenchResult(out, d); })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّرت المقارنة.'; })
        .then(function () { go.disabled = false; });
    });
  }

  function renderBenchResult(out, d) {
    out.innerHTML = '';
    var head = el('div');
    head.style.cssText = 'display:flex;align-items:baseline;gap:8px';
    var big = el('strong', '', String(d.score));
    big.style.fontSize = '28px';
    head.appendChild(big);
    head.appendChild(el('span', '', '/ 10 تقدير إعلانك'));
    out.appendChild(head);
    if (d.summary) out.appendChild(el('p', '', d.summary));
    (d.criteria || []).forEach(function (c) {
      out.appendChild(el('p', '', c.name + ': ' + c.score + '/10 — ' + c.note));
    });
    if (d.recommendations && d.recommendations.length) {
      out.appendChild(el('strong', '', 'توصيات قبل ما تنشر'));
      var ol = el('ol');
      d.recommendations.forEach(function (r) {
        var li = el('li');
        li.appendChild(el('b', '', r.title));
        li.appendChild(document.createTextNode(' — ' + r.change));
        ol.appendChild(li);
      });
      out.appendChild(ol);
    }
    out.appendChild(el('small', '', d.caveat || ''));
  }

  // ---------- 4) باحث العملاء: بحث + فحص مجاني + رسالة مقترحة. الإرسال يدوي دايماً ----------
  function renderLeads(body) {
    body.appendChild(el('p', '', 'ابحث عن نشاطات في مجال ومدينة معينة، وشوف ملاحظات الفحص المجاني لموقع كل واحد. بعدين تكتب رسالة مقترحة وتنسخها وتبعتها بنفسك.'));
    body.appendChild(el('p', 'guest-note', 'قبل ما تتواصل مع أي نشاط، اتأكد إنك مسموح تبعتله. المنصة ما بتجمعش أرقام أو إيميلات، ولا بتبعت أي حاجة بدالك.'));
    var cat = el('input');
    cat.type = 'text';
    cat.maxLength = 60;
    cat.placeholder = 'نوع النشاط، مثال: مطعم، صالون تجميل';
    var city = el('input');
    city.type = 'text';
    city.maxLength = 40;
    city.placeholder = 'المدينة، مثال: دبي';
    body.appendChild(cat);
    body.appendChild(city);
    var go = el('button', 'btn-primary sm', 'ابحث');
    go.type = 'button';
    go.style.justifySelf = 'start';
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    function draftFor(lead, box) {
      box.innerHTML = '';
      box.appendChild(el('p', 'guest-note', 'جاري كتابة الرسالة…'));
      D.apiJson('/api/ai-tools/outreach', { method: 'POST', body: JSON.stringify({ name: lead.name, issues: lead.issues }) })
        .then(function (d) {
          box.innerHTML = '';
          var ta = el('textarea');
          ta.rows = 5;
          ta.value = d.draft || '';
          box.appendChild(ta);
          var copy = el('button', 'btn-ghost sm', 'انسخ الرسالة');
          copy.type = 'button';
          copy.addEventListener('click', function () {
            var done = function () { D.toast('الرسالة اتنسخت ✅'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, done);
          });
          box.appendChild(copy);
        })
        .catch(function (ex) { box.textContent = ex.message || 'تعذّر كتابة الرسالة.'; });
    }

    go.addEventListener('click', function () {
      var c = cat.value.trim();
      var t = city.value.trim();
      if (c.length < 2 || t.length < 2) { D.toast('اكتب نوع النشاط والمدينة.'); return; }
      go.disabled = true;
      out.textContent = 'بنبحث ونفحص المواقع… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/leads', { method: 'POST', body: JSON.stringify({ category: c, city: t }) })
        .then(function (d) {
          out.innerHTML = '';
          if (!d.leads || !d.leads.length) { out.textContent = d.note || 'مالقيتش نتايج.'; return; }
          d.leads.forEach(function (lead) {
            var card = el('div', 'ait-card');
            card.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:6px';
            card.appendChild(el('strong', '', lead.name));
            var link = el('a', '', lead.url);
            link.href = lead.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.cssText = 'font-size:12px;word-break:break-all';
            card.appendChild(link);
            if (!lead.issues.length) {
              card.appendChild(el('div', '', 'الفحص الأساسي ما لقاش مشاكل واضحة.'));
            } else {
              var ul = el('ul');
              ul.style.cssText = 'margin:0;padding-inline-start:18px;display:grid;gap:2px;font-size:14px';
              lead.issues.forEach(function (i) { ul.appendChild(el('li', '', i)); });
              card.appendChild(ul);
            }
            var draftBtn = el('button', 'btn-ghost sm', 'اكتب رسالة مقترحة');
            draftBtn.type = 'button';
            draftBtn.style.justifySelf = 'start';
            var box = el('div');
            draftBtn.addEventListener('click', function () { draftFor(lead, box); });
            card.appendChild(draftBtn);
            card.appendChild(box);
            out.appendChild(card);
          });
          if (d.note) out.appendChild(el('p', 'guest-note', d.note));
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر البحث.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 5) المستشار: تحليل السوق + توصيات بانتظار موافقتك. ما فيش أي تنفيذ تلقائي ----------
  var KIND_LABEL = { budget: 'ميزانية', content: 'محتوى', pricing: 'تسعير', other: 'أخرى' };
  var STATUS_LABEL = { pending: 'بانتظار موافقتك', approved: 'موافق عليها', rejected: 'مرفوضة', done: 'تم تنفيذها يدوياً' };
  var VERDICT_LABEL = {
    met: 'حقّقت المتوقع أو أكتر ✅',
    positive_below_expected: 'موجبة بس أقل من المتوقع',
    loss: 'خسارة ❌',
    positive: 'موجبة',
    no_spend: 'مفيش صرف يتحسب عليه العائد'
  };

  function renderAdvisor(body) {
    body.appendChild(el('p', '', 'المستشار بيحلل تريندات يوتيوب في الإمارات وملف Google Trends لو رفعته، ويقترح توصية واحدة. التوصية بتفضل "بانتظار موافقتك" لحد ما توافق عليها، والتنفيذ بتعمله بنفسك. أنا ما بصرفش ولا بنشر أي حاجة.'));

    // --- التحليل ---
    var analyzeBox = el('div');
    analyzeBox.style.cssText = 'display:grid;gap:8px;border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px';
    analyzeBox.appendChild(el('strong', '', 'حلّل السوق'));
    var topic = el('input');
    topic.type = 'text';
    topic.maxLength = 80;
    topic.placeholder = 'كلمة أو موضوع (اختياري)، مثال: عطور، توصيل، رمضان';
    analyzeBox.appendChild(topic);
    analyzeBox.appendChild(el('div', 'guest-note', 'لو عايز الأكثر صعوداً دلوقتي، افتح Google Trends ← Trending now واختار الإمارات، وانسخ كلمة من هناك.'));
    var go = el('button', 'btn-primary sm', 'حلّل وجيب توصية');
    go.type = 'button';
    go.style.justifySelf = 'start';
    analyzeBox.appendChild(go);
    var bgA = el('button', 'btn-ghost sm', 'شغّلها في الخلفية');
    bgA.type = 'button';
    bgA.style.justifySelf = 'start';
    analyzeBox.appendChild(bgA);
    bgA.addEventListener('click', function () {
      bgA.disabled = true;
      D.apiJson('/api/tasks', { method: 'POST', body: JSON.stringify({ kind: 'advisor-market', payload: { topic: topic.value.trim() } }) })
        .then(function () { D.toast('هتلاقي التوصية في تبويب المهام'); topic.value = ''; })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر بدء المهمة.'); })
        .then(function () { bgA.disabled = false; });
    });
    var analyzeOut = el('div', 'ait-out');
    analyzeBox.appendChild(analyzeOut);
    body.appendChild(analyzeBox);

    // أفكار جاهزة من المراجعة: بتتضاف كتوصيات بانتظار موافقتك، ومابتتنفذش
    var IDEAS = [
      { kind: 'content', title: 'غرفة الحرب: كاشف فجوات المحتوى', reason: 'يقارن تريندات يوتيوب وكلمات نشاطك، ويقترح ريلز أو محتوى لموضوع صاعد قبل ما المنافسين يلاحظوه. الاقتراح بيتكتب للمراجعة، ومافيش نشر تلقائي.' },
      { kind: 'other', title: 'المتابعة التلقائية مع لجنة التحكيم', reason: 'لما المتابعة ترصد تغيير في السوق، تعرض رأي الشخصيات الافتراضية كتقدير تقريبي (مش نسبة نجاح مضمونة) مع التوصية.' },
      { kind: 'other', title: 'بيان الرد على الشائعات (مسودة فقط)', reason: 'لو رصدنا حملة تشويه أو تسريب، يكتب المساعد مسودة بيان للمراجعة، والمالك ينشره بنفسه. ما يذكرش أي منافس بالاسم، وما يتنشرش أي حاجة بدون مراجعة.' }
    ];
    var addIdeas = el('button', 'btn-ghost sm', 'ضيف الأفكار الثلاثة كتوصيات');
    addIdeas.type = 'button';
    addIdeas.style.justifySelf = 'start';
    addIdeas.addEventListener('click', function () {
      addIdeas.disabled = true;
      Promise.all(IDEAS.map(function (x) {
        return D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify(x) });
      })).then(function () {
        addIdeas.textContent = 'اتضافت الأفكار ✅';
        D.toast('اتضافت الأفكار الثلاثة بانتظار موافقتك ✅');
        load();
      }).catch(function (ex) {
        addIdeas.disabled = false;
        D.toast(ex.message || 'تعذّر الإضافة.');
      });
    });
    body.appendChild(addIdeas);

    // فكرتين إضافيتين من المراجعة: نفس المبدأ، توصيات بانتظار موافقتك
    var IDEAS2 = [
      { kind: 'content', title: 'مستنسخ الإعلانات: بنية بدون نسخ', reason: 'المستخدم يلصق نص أو لقطة لإعلان يملكه أو صفحة عامة، والمساعد يحلل البنية (الهوك والعرض والإقناع) ويكتب محتوى أصلي بنفس البنية، من غير نسخ أي جملة أو تصميم. ما يتسحبش أي إعلان من منصات التواصل.' },
      { kind: 'other', title: 'تذكير السلة المتروكة (بموافقة العميل)', reason: 'المالك يحدد قواعد الخصم بنفسه، والمساعد يكتب رسالة تذكير للعملاء اللي وافقوا على التسويق بس، وكل رسالة تتراجع قبل ما تتبعت. مفيش تتبع سلوكي في البداية.' }
    ];
    var addIdeas2 = el('button', 'btn-ghost sm', 'ضيف فكرتي المستنسخ والسلة كتوصيات');
    addIdeas2.type = 'button';
    addIdeas2.style.justifySelf = 'start';
    addIdeas2.addEventListener('click', function () {
      addIdeas2.disabled = true;
      Promise.all(IDEAS2.map(function (x) {
        return D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify(x) });
      })).then(function () {
        addIdeas2.textContent = 'اتضافت الفكرتين ✅';
        D.toast('اتضافت الفكرتين بانتظار موافقتك ✅');
        load();
      }).catch(function (ex) {
        addIdeas2.disabled = false;
        D.toast(ex.message || 'تعذّر الإضافة.');
      });
    });
    body.appendChild(addIdeas2);

    // --- التوصيات ---
    var listHead = el('strong', '', 'توصياتك');
    body.appendChild(listHead);
    var list = el('div');
    list.style.cssText = 'display:grid;gap:10px';
    body.appendChild(list);

    function act(id, action, msg) {
      return D.apiJson('/api/advisor/recs/' + id + '/' + action, { method: 'POST' })
        .then(function () { D.toast(msg); load(); })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر التنفيذ.'); });
    }

    function evalForm(rec, box) {
      var sp = el('input');
      sp.type = 'number'; sp.min = '0'; sp.step = '0.01'; sp.placeholder = 'الصرف (درهم)';
      var rv = el('input');
      rv.type = 'number'; rv.min = '0'; rv.step = '0.01'; rv.placeholder = 'العائد (درهم)';
      var b = el('button', 'btn-ghost sm', 'قيّم النتيجة');
      b.type = 'button';
      b.style.justifySelf = 'start';
      var res = el('div', 'guest-note');
      b.addEventListener('click', function () {
        if (sp.value === '' || rv.value === '') { D.toast('اكتب الصرف والعائد.'); return; }
        b.disabled = true;
        D.apiJson('/api/advisor/recs/' + rec.id + '/evaluate', { method: 'POST', body: JSON.stringify({ spend: Number(sp.value), revenue: Number(rv.value) }) })
          .then(function (d) {
            var roiTxt = d.roi === null ? '' : ' — العائد ' + Math.round(d.roi * 100) + '%';
            res.textContent = (VERDICT_LABEL[d.verdict] || d.verdict) + roiTxt;
          })
          .catch(function (ex) { res.textContent = ex.message || 'تعذّر التقييم.'; })
          .then(function () { b.disabled = false; });
      });
      box.appendChild(sp);
      box.appendChild(rv);
      box.appendChild(b);
      box.appendChild(res);
    }

    function card(rec) {
      var c = el('div', 'card-box biz-rec');
      var chip = { pending: 'conn', approved: 'ok', done: 'ok', rejected: 'dev' }[rec.status] || 'dev';
      var meta = el('div', 'biz-rec-meta');
      meta.appendChild(el('span', 'biz-badge ' + chip, STATUS_LABEL[rec.status] || rec.status));
      meta.appendChild(el('span', 'muted', KIND_LABEL[rec.kind] || rec.kind));
      c.appendChild(meta);
      c.appendChild(el('strong', 'biz-rec-title', rec.title));
      c.appendChild(el('div', 'biz-rec-reason', rec.reason));
      var row = el('div', 'biz-rec-actions');
      if (rec.status === 'pending') {
        var ok = el('button', 'btn-primary sm', 'موافق');
        ok.type = 'button';
        ok.addEventListener('click', function () { act(rec.id, 'approve', 'اتسجلت الموافقة ✅'); });
        var no = el('button', 'btn-ghost sm', 'أرفض');
        no.type = 'button';
        no.addEventListener('click', function () { act(rec.id, 'reject', 'اتسجل الرفض'); });
        row.appendChild(ok);
        row.appendChild(no);
      } else if (rec.status === 'approved') {
        var dn = el('button', 'btn-primary sm', 'نفذتها يدوياً');
        dn.type = 'button';
        dn.addEventListener('click', function () { act(rec.id, 'done', 'تمام، علّمتها تم التنفيذ'); });
        row.appendChild(dn);
      }
      c.appendChild(row);
      if (rec.status === 'done') {
        if (rec.verdict) {
          c.appendChild(el('div', 'guest-note', 'آخر تقييم: ' + (VERDICT_LABEL[rec.verdict] || rec.verdict)));
        }
        var ebox = el('div');
        ebox.style.cssText = 'display:grid;gap:6px';
        evalForm(rec, ebox);
        c.appendChild(ebox);
      }
      return c;
    }

    function load() {
      list.innerHTML = '';
      D.apiJson('/api/advisor/recs').then(function (d) {
        if (!d.recs || !d.recs.length) { list.appendChild(el('p', 'guest-note', 'مفيش توصيات لسه. حلّل السوق عشان تجيب أول توصية.')); return; }
        d.recs.forEach(function (r) { list.appendChild(card(r)); });
      }).catch(function () { list.textContent = 'تعذّر تحميل التوصيات.'; });
    }

    go.addEventListener('click', function () {
      go.disabled = true;
      analyzeOut.textContent = 'بنحلل السوق… ممكن ياخد دقيقة.';
      D.apiJson('/api/advisor/market/analyze', { method: 'POST', body: JSON.stringify({ topic: topic.value.trim() }) })
        .then(function () {
          analyzeOut.textContent = 'اتسجلت توصية جديدة بانتظار موافقتك ✅';
          topic.value = '';
          load();
        })
        .catch(function (ex) { analyzeOut.textContent = ex.message || 'تعذّر التحليل.'; })
        .then(function () { go.disabled = false; });
    });

    load();
  }

  D.openAiTools = openAiTools;
})();
