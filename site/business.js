/* Dubai Fans AI — نشاطي التجاري: بيانات النشاط، ربط الموقع والمتجر، والتحليلات */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var data = { profile: null, connections: [], reports: [] };
  var tab = 'overview';
  var running = null; // نوع التحليل الشغّال
  var storeKind = 'shopify';
  var shopMode = 'new';

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function $(id) { return document.getElementById(id); }
  function fmtDate(ms) { return new Date(ms).toLocaleDateString('ar-AE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

  // ---------- أدوات الرسم والأرقام (SVG بسيط بألوان الثيم) ----------
  function kpi(v, l, cls) { return '<div class="biz-kpi ' + (cls || '') + '"><b>' + v + '</b><span>' + l + '</span></div>'; }
  // rows: [{label, values:[...]}]، كل قيمة عمود، والعمود الواحد لكل قيمة في الصف
  function barChart(rows, opts) {
    opts = opts || {};
    var cls = opts.cls || ['bc-a', 'bc-b'];
    var all = [];
    rows.forEach(function (r) { all = all.concat(r.values); });
    var max = opts.max || Math.max(1, Math.max.apply(null, all.concat([0])));
    var W = 320, H = 170, pad = 14, bw = (W - pad * 2) / Math.max(1, rows.length);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="biz-chart" role="img" aria-label="' + esc(opts.label || 'رسم بياني') + '">';
    rows.forEach(function (r, i) {
      r.values.forEach(function (v, j) {
        var h = Math.max(2, (Number(v) || 0) / max * (H - 42));
        var x = pad + i * bw + bw * 0.18 + j * (bw * 0.34);
        svg += '<rect x="' + x.toFixed(1) + '" y="' + (H - 24 - h).toFixed(1) + '" width="' + (bw * 0.3).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" class="' + (cls[j] || cls[0]) + '"><title>' + esc(r.label + ': ' + fmtNum(v)) + '</title></rect>';
      });
      svg += '<text x="' + (pad + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="bc-l">' + esc(r.label) + '</text>';
    });
    return '<div class="biz-chart-wrap">' + svg + '</svg></div>';
  }
  // أشرطة أفقية: [{label, value}]
  function hBars(rows) {
    var max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return Number(r.value) || 0; })));
    return '<div class="hbars">' + rows.map(function (r) {
      return '<div class="hb"><span>' + esc(r.label) + '</span><div class="hb-track"><i style="width:' + Math.round((Number(r.value) || 0) / max * 100) + '%"></i></div><b>' + fmtNum(r.value) + '</b></div>';
    }).join('') + '</div>';
  }

  var ICONS = {
    store: '<svg viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18M9 20v-6h6v6"/></svg>',
    web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="M12 2c.6 4.6 2.4 7.4 7 8-4.6.6-6.4 3.4-7 8-.6-4.6-2.4-7.4-7-8 4.6-.6 6.4-3.4 7-8Z"/></svg>'
  };
  var SOON = [
    ['واتساب للأعمال', 'رد تلقائي على عملائك 24 ساعة', '#25D366'],
    ['إنستغرام', 'تحليل الحساب والرد على الرسائل والتعليقات', '#E1306C'],
    ['فيسبوك', 'تحليل الصفحة والرد على الرسائل', '#1877F2'],
    ['تيك توك', 'تحليل الحساب والفيديوهات', '#FFFFFF'],
    ['إعلانات Meta', 'نتايج حملاتك وتوصيات الميزانية', '#0866FF'],
    ['Google Ads', 'أداء الحملات والكلمات المفتاحية', '#FBBC04']
  ];
  var FIELDS = [
    ['name', 'اسم النشاط', 'input', 'مثال: عطور لمسة'],
    ['category', 'المجال', 'input', 'مثال: متجر عطور أونلاين'],
    ['description', 'وصف مختصر للنشاط', 'textarea', 'بتبيع إيه، وإيه اللي يميزك عن المنافسين؟'],
    ['audience', 'الجمهور المستهدف', 'input', 'مثال: سيدات 25-45 في الإمارات'],
    ['market', 'السوق / المدينة', 'input', 'مثال: دبي والإمارات'],
    ['offers', 'أهم المنتجات أو الخدمات والعروض', 'textarea', 'مثال: عطور شرقية، توصيل مجاني فوق 200 درهم'],
    ['prices', 'الأسعار', 'input', 'مثال: من 90 لـ 450 درهم'],
    ['tone', 'نبرة الكلام', 'select', ['', 'رسمية', 'ودودة', 'فاخرة', 'شبابية ومرحة', 'خليجية/إماراتية']],
    ['goals', 'هدفك الحالي', 'textarea', 'مثال: زيادة الطلبات من إنستغرام 30% الشهر الجاي'],
    ['website', 'الموقع الإلكتروني', 'input', 'example.com', 'ltr'],
    ['instagram', 'إنستغرام', 'input', '@youraccount', 'ltr'],
    ['tiktok', 'تيك توك', 'input', '@youraccount', 'ltr'],
    ['facebook', 'فيسبوك', 'input', 'رابط الصفحة', 'ltr'],
    ['whatsapp', 'واتساب', 'input', '9715xxxxxxxx', 'ltr']
  ];

  function load() {
    return D.apiJson('/api/business').then(function (r) { data = r; data.profile = r.profile || {}; return r; })
      .then(function () {
        // توصيات المستشار بتكمّل خطوات الشغل (لو فشل الطلب ما نوقفش الصفحة)
        return D.apiJson('/api/advisor/recs').then(function (a) { data.recs = a.recs || []; }).catch(function () { data.recs = null; });
      });
  }

  function open(startTab) {
    var panel = D.showPanel('business');
    if (startTab) tab = startTab;
    panel.innerHTML = '<div class="pv"><div class="pv-head" id="bizHead"><div class="pv-ico green">' + ICONS.store + '</div><div><h1>نشاطي التجاري</h1>' +
      '<p>اربط نشاطك، والمساعد يحلله ويخصّص كل ردوده ومحتواه وإعلاناته عليه.</p></div></div>' +
      '<div class="biz-tabs" role="tablist">' +
      '<button type="button" role="tab" data-t="overview">نظرة عامة</button>' +
      '<button type="button" role="tab" data-t="profile">بيانات النشاط</button>' +
      '<button type="button" role="tab" data-t="connect">الربط والتحليل</button>' +
      '<button type="button" role="tab" data-t="customers">العملاء</button>' +
      '<button type="button" role="tab" data-t="ops">المحاسبة والموظفين</button>' +
      '<button type="button" role="tab" data-t="alerts">الإشعارات</button>' +
      '<button type="button" role="tab" data-t="memory">ذاكرة المساعد</button>' +
      '<button type="button" role="tab" data-t="reports">التقارير</button></div>' +
      '<div id="bizBody"><div class="biz-loading">جارٍ التحميل…</div></div></div>';
    Array.prototype.forEach.call(panel.querySelectorAll('.biz-tabs button'), function (b) {
      b.onclick = function () { tab = b.getAttribute('data-t'); render(); };
    });
    load().then(render).catch(function (ex) { $('bizBody').innerHTML = '<div class="msg-error">' + esc(D.netMessage(ex)) + '</div>'; });
  }

  function render() {
    var body = $('bizBody');
    if (!body) return;
    Array.prototype.forEach.call(document.querySelectorAll('.biz-tabs button'), function (b) {
      var on = b.getAttribute('data-t') === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    var head = $('bizHead');
    if (head) head.style.display = tab === 'overview' ? 'none' : '';
    if (tab === 'overview') renderOverview(body);
    else if (tab === 'profile') renderProfile(body);
    else if (tab === 'connect') renderConnect(body);
    else if (tab === 'memory') renderMemory(body);
    else if (tab === 'customers') renderCustomers(body);
    else if (tab === 'alerts') renderAlerts(body);
    else if (tab === 'ops') renderOps(body);
    else renderReports(body);
  }

  // ---------- نظرة عامة: حلقة الجاهزية الدوّارة وخطوات التجهيز (من التصميم) ----------
  function renderOverview(body) {
    var p = data.profile || {};
    var steps = [
      ['بيانات النشاط', !!(p.name && p.category)],
      ['الجمهور المستهدف', !!p.audience],
      ['أهم المنتجات والعروض', !!p.offers],
      ['موقع أو حساب سوشيال', !!(p.website || p.instagram || p.tiktok || p.facebook)],
      ['هدفك الحالي', !!p.goals]
    ];
    var done = steps.filter(function (s) { return s[1]; }).length;
    var pct = Math.round(done / steps.length * 100);
    var recs = (data.recs || []).length;
    body.innerHTML = '<div class="ov-hero">' +
      '<div class="ov-ring"><span class="ov-glow"></span><span class="ov-sphere"></span>' +
      '<span class="ov-spin"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" transform="rotate(-70 50 50)"></circle></svg></span>' +
      '<div class="ov-center"><b>' + pct + '%</b><span>جاهزية نشاطك</span></div></div>' +
      '<h2 class="ov-title">نشاطي التجاري</h2>' +
      '<p class="ov-note">اربط نشاطك، والمساعد يخصّص كل ردوده ومحتواه عليه.</p></div>' +
      '<div class="ov-grid">' +
      '<div class="ov-stat alert"><span class="ov-stat-top"><i></i></span><small>المتجر</small><b>يتطلب ربطاً</b></div>' +
      '<div class="ov-stat"><span class="ov-stat-top"><i class="off"></i></span><small>الموقع الإلكتروني</small><b>' + (p.website ? 'تم إدخاله' : 'لم يُحلَّل بعد') + '</b></div>' +
      '<div class="ov-stat"><span class="ov-stat-top"><i class="off"></i></span><small>المحاسبة</small><b>لا قيود بعد</b></div>' +
      '<div class="ov-stat"><span class="ov-stat-top"><i class="off"></i></span><small>التوصيات</small><b>' + recs + ' بانتظار موافقتك</b></div>' +
      '</div>' +
      '<div class="ov-card"><div class="ov-card-head"><b>جاهزية النشاط</b><span>' + done + ' / ' + steps.length + '</span></div>' +
      '<div class="ov-bar"><i style="width:' + pct + '%"></i></div>' +
      steps.map(function (s) {
        return '<div class="ov-step' + (s[1] ? ' done' : '') + '"><span class="ov-dot"></span><span>' + esc(s[0]) + '</span><em>' + (s[1] ? 'تم' : 'ابدأ') + '</em></div>';
      }).join('') + '</div>';
  }

  // ---------- المحاسبة والموظفين (أرقام تقديرية من إدخالك) ----------
  function renderOps(body) {
    var month = new Date().toISOString().slice(0, 7);
    body.innerHTML = '<div class="card-box"><h2>المحاسبة</h2>' +
      '<p class="biz-hint">سجّل الدخل والمصروفات، والمساعد يقدر يجاوب عن صافي الربح والرواتب. الأرقام تقديرية ومش بديل عن المحاسب.</p>' +
      '<div id="opsSum" class="muted">جارٍ التحميل…</div>' +
      '<div class="form-foot"><button type="button" class="btn-ghost" id="opsPay">رحّل رواتب الشهر كمصروف</button> ' +
      '<button type="button" class="btn-ghost" id="opsCsv">تصدير CSV للمحاسب</button></div>' +
      '<div id="opsYear"></div>' +
      '<form id="opsForm" class="form-grid">' +
      '<div class="f"><label for="oDate">التاريخ</label><input id="oDate" type="date" required></div>' +
      '<div class="f"><label for="oType">النوع</label><select id="oType"><option value="income">دخل</option><option value="expense">مصروف</option></select></div>' +
      '<div class="f"><label for="oCat">التصنيف</label><input id="oCat" type="text" maxlength="40" placeholder="مبيعات، إيجار، رواتب…"></div>' +
      '<div class="f"><label for="oAmt">المبلغ (درهم)</label><input id="oAmt" type="number" min="0" step="0.01" dir="ltr" required></div>' +
      '<div class="f full"><label for="oNote">ملاحظة</label><input id="oNote" type="text" maxlength="200"></div>' +
      '<div class="form-foot"><button type="submit" class="btn-primary" id="opsSave">سجّل القيد</button></div></form>' +
      '<div id="opsList"></div></div>' +
      '<div class="card-box"><h2>الموظفون</h2>' +
      '<form id="empForm" class="form-grid">' +
      '<div class="f"><label for="eName">الاسم</label><input id="eName" type="text" maxlength="80" required></div>' +
      '<div class="f"><label for="eRole">المسمى</label><input id="eRole" type="text" maxlength="60"></div>' +
      '<div class="f"><label for="eSal">الراتب الشهري (درهم)</label><input id="eSal" type="number" min="0" step="0.01" dir="ltr" required></div>' +
      '<div class="f"><label for="eStart">تاريخ البداية</label><input id="eStart" type="date"></div>' +
      '<div class="form-foot"><button type="submit" class="btn-primary">أضف الموظف</button></div></form>' +
      '<div id="empList"></div></div><div id="invBox"></div>';
    $('oDate').value = new Date().toISOString().slice(0, 10);

    function drawOps(r) {
      var s = r.summary;
      $('opsSum').innerHTML = '<div class="biz-kpis">' + kpi(fmtNum(s.income), 'دخل الشهر', 'ok') + kpi(fmtNum(s.expense), 'مصروفات الشهر', 'bad') +
        kpi(fmtNum(s.net), 'صافي الشهر', s.net < 0 ? 'bad' : 'ok') + '</div><p class="muted">شهر ' + esc(s.month) + ' · درهم</p>';
      var byId = {};
      r.items.forEach(function (e) { byId[e.id] = e; });
      $('opsList').innerHTML = r.items.length ? r.items.map(function (e) {
        return '<div class="mem-item"><div><strong>' + (e.type === 'income' ? 'دخل' : 'مصروف') + ' ' + e.amount + ' درهم</strong>' +
          '<div class="muted">' + esc(e.date) + ' · ' + esc(e.category) + (e.note ? ' · ' + esc(e.note) : '') + '</div></div>' +
          '<span><button type="button" class="btn-ghost" data-eedit="' + e.id + '">عدّل</button> ' +
          '<button type="button" class="btn-ghost" data-edel="' + e.id + '">امسح</button></span></div>';
      }).join('') : '<p class="muted">مفيش قيود للشهر ده.</p>';
      Array.prototype.forEach.call($('opsList').querySelectorAll('[data-edel]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/ops/ledger/' + b.getAttribute('data-edel'), { method: 'DELETE' }).then(loadOps).catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
      Array.prototype.forEach.call($('opsList').querySelectorAll('[data-eedit]'), function (b) {
        b.onclick = function () {
          var e = byId[b.getAttribute('data-eedit')];
          if (!e) return;
          editingId = e.id;
          $('oDate').value = e.date; $('oType').value = e.type; $('oCat').value = e.category;
          $('oAmt').value = e.amount; $('oNote').value = e.note || '';
          $('opsSave').textContent = 'احفظ التعديل';
          $('opsForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
      });
    }
    function loadOps() {
      return D.apiJson('/api/ops/ledger?month=' + month).then(drawOps).catch(function (ex) { $('opsSum').textContent = D.netMessage(ex); });
    }

    function drawYear(y) {
      var rows = y.months.filter(function (m) { return m.income || m.expense; });
      $('opsYear').innerHTML = '<h3>السنة ' + esc(y.year) + '</h3><p class="muted">دخل ' + y.income + ' · مصروفات ' + y.expense + ' درهم</p>' +
        '<div class="card-box biz-chartbox">' + barChart(y.months.map(function (m) { return { label: String(m.month).slice(-2), values: [m.income, m.expense] }; }), { cls: ['bc-g', 'bc-r'], label: 'دخل ومصروفات الشهور' }) + '</div>' +
        (rows.length ? '<div class="tbl-scroll"><table class="tbl"><tr><th>الشهر</th><th>دخل</th><th>مصروف</th><th>صافي</th></tr>' +
          rows.map(function (m) { return '<tr><td>' + esc(m.month) + '</td><td>' + m.income + '</td><td>' + m.expense + '</td><td>' + m.net + '</td></tr>'; }).join('') +
          '</table></div>' : '<p class="muted">مفيش أرقام للسنة دي لسه.</p>');
    }
    function loadYear() {
      return D.apiJson('/api/ops/year?year=' + month.slice(0, 4)).then(drawYear).catch(function () {});
    }

    $('opsPay').onclick = function () {
      D.apiJson('/api/ops/payroll', { method: 'POST', body: JSON.stringify({ month: month }) })
        .then(function (r) { D.toast(r.created ? 'اتسجّلت ' + r.created + ' مصروفات رواتب ✅' : 'الرواتب دي متسجلة من قبل'); return Promise.all([loadOps(), loadYear()]); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); });
    };
    $('opsCsv').onclick = function () {
      D.api('/api/ops/export?month=' + month).then(function (res) {
        if (!res.ok) throw new Error('تعذّر تصدير الملف.');
        return res.blob();
      }).then(function (blob) { D.downloadBlob(blob, 'dfai-ledger-' + month + '.csv'); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); });
    };

    function drawEmps(r) {
      var p = r.payroll;
      $('empList').innerHTML = '<p class="muted">النشطين: ' + p.activeEmployees + ' · إجمالي الرواتب الشهرية: ' + p.monthlyPayroll + ' درهم</p>' +
        (r.items.length ? r.items.map(function (e) {
          return '<div class="mem-item"><div><strong>' + esc(e.name) + '</strong>' + (e.role ? ' · ' + esc(e.role) : '') +
            '<div class="muted">' + e.salary + ' درهم' + (e.status === 'left' ? ' · غادر' : '') + '</div></div>' +
            '<button type="button" class="btn-ghost" data-empdel="' + e.id + '">امسح</button></div>';
        }).join('') : '<p class="muted">مفيش موظفين مسجلين.</p>');
      Array.prototype.forEach.call($('empList').querySelectorAll('[data-empdel]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/ops/employees/' + b.getAttribute('data-empdel'), { method: 'DELETE' }).then(loadEmps).catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
    }
    function loadEmps() {
      return D.apiJson('/api/ops/employees').then(drawEmps).catch(function (ex) { $('empList').textContent = D.netMessage(ex); });
    }

    $('opsForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = JSON.stringify({
        date: $('oDate').value, type: $('oType').value, category: $('oCat').value, amount: $('oAmt').value, note: $('oNote').value
      });
      var req = editingId
        ? D.apiJson('/api/ops/ledger/' + editingId, { method: 'PUT', body: payload })
        : D.apiJson('/api/ops/ledger', { method: 'POST', body: payload });
      req.then(function () {
        editingId = null;
        $('opsSave').textContent = 'سجّل القيد';
        $('oAmt').value = ''; $('oNote').value = '';
        D.toast('اتسجّل القيد ✅');
        return Promise.all([loadOps(), loadYear()]);
      }).catch(function (ex) { D.toast(D.netMessage(ex)); });
    });
    $('empForm').addEventListener('submit', function (e) {
      e.preventDefault();
      D.apiJson('/api/ops/employees', { method: 'POST', body: JSON.stringify({
        name: $('eName').value, role: $('eRole').value, salary: $('eSal').value, start_date: $('eStart').value
      }) }).then(function () { e.target.reset(); D.toast('اتضاف الموظف ✅'); return loadEmps(); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); });
    });
    var editingId = null;
    loadOps();
    loadYear();
    loadEmps();
    renderInvoices($('invBox'));
  }

  // ---------- دفتر دبي: بيانات الفاتورة والفواتير والضريبة ----------
  function itemRow() {
    return '<div class="inv-row"><input class="iDesc" type="text" maxlength="160" placeholder="البيان">' +
      '<input class="iQty" type="number" min="0" step="any" placeholder="الكمية" dir="ltr">' +
      '<input class="iPrice" type="number" min="0" step="0.01" placeholder="السعر" dir="ltr">' +
      '<select class="iVat"><option value="5">ضريبة 5%</option><option value="0">بدون ضريبة</option></select></div>';
  }

  function renderInvoices(box) {
    if (!box) return;
    box.innerHTML = '<div class="card-box"><h2>بيانات الفاتورة الضريبية</h2>' +
      '<p class="biz-hint">الرقم الضريبي (TRN) لازم يكون 15 رقماً، ونوع النشاط بيظهر على الفاتورة.</p>' +
      '<form id="setForm" class="form-grid">' +
      '<div class="f"><label for="sLegal">الاسم القانوني</label><input id="sLegal" type="text" maxlength="120"></div>' +
      '<div class="f"><label for="sTrn">الرقم الضريبي (TRN)</label><input id="sTrn" type="text" maxlength="20" dir="ltr" inputmode="numeric"></div>' +
      '<div class="f"><label for="sType">نوع النشاط</label><input id="sType" type="text" maxlength="80" placeholder="مطعم، عيادة، متجر…"></div>' +
      '<div class="f"><label for="sAddr">العنوان</label><input id="sAddr" type="text" maxlength="200"></div>' +
      '<div class="form-foot"><button type="submit" class="btn-primary">احفظ بيانات الفاتورة</button></div></form></div>' +
      '<div class="card-box"><h2>فاتورة جديدة</h2><form id="invForm" class="form-grid">' +
      '<div class="f"><label for="iCust">اسم العميل</label><input id="iCust" type="text" maxlength="120" required></div>' +
      '<div class="f"><label for="iTrn">الرقم الضريبي للعميل (اختياري)</label><input id="iTrn" type="text" maxlength="20" dir="ltr"></div>' +
      '<div class="f"><label for="iDate">التاريخ</label><input id="iDate" type="date"></div>' +
      '<div class="f full" id="iItems">' + itemRow() + '</div>' +
      '<div class="f full"><button type="button" class="btn-ghost" id="iAdd">+ بند</button></div>' +
      '<div class="form-foot"><button type="submit" class="btn-primary">أنشئ الفاتورة</button></div></form>' +
      '<div id="vatBox" class="muted"></div><div id="invList"></div></div>';
    $('iDate').value = new Date().toISOString().slice(0, 10);
    var month = new Date().toISOString().slice(0, 7);

    D.apiJson('/api/ops/settings').then(function (r) {
      var s = r.settings || {};
      $('sLegal').value = s.legal_name || ''; $('sTrn').value = s.trn || ''; $('sType').value = s.business_type || ''; $('sAddr').value = s.address || '';
    }).catch(function () {});

    $('setForm').addEventListener('submit', function (e) {
      e.preventDefault();
      D.apiJson('/api/ops/settings', { method: 'PUT', body: JSON.stringify({
        legal_name: $('sLegal').value, trn: $('sTrn').value, business_type: $('sType').value, address: $('sAddr').value
      }) }).then(function () { D.toast('اتحفظت بيانات الفاتورة ✅'); }).catch(function (ex) { D.toast(D.netMessage(ex)); });
    });

    $('iAdd').onclick = function () {
      if ($('iItems').querySelectorAll('.inv-row').length >= 50) return;
      $('iItems').insertAdjacentHTML('beforeend', itemRow());
    };

    function collectItems() {
      return Array.prototype.map.call($('iItems').querySelectorAll('.inv-row'), function (row) {
        return {
          description: row.querySelector('.iDesc').value,
          qty: row.querySelector('.iQty').value,
          unit_price: row.querySelector('.iPrice').value,
          vat_rate: Number(row.querySelector('.iVat').value),
        };
      });
    }

    function loadVat() {
      return D.apiJson('/api/ops/vat?month=' + month).then(function (v) {
        $('vatBox').innerHTML = 'ضريبة ' + month + ': مبيعات خاضعة <strong>' + v.taxableSales + '</strong> درهم · ضريبة محصّلة <strong>' + v.vatCollected + '</strong> درهم (من ' + v.invoices + ' فاتورة مدفوعة)';
      }).catch(function () {});
    }

    function drawInvoices(r) {
      var list = $('invList');
      if (!r.items.length) { list.innerHTML = '<p class="muted">مفيش فواتير لسه.</p>'; return; }
      list.innerHTML = r.items.map(function (i) {
        return '<div class="mem-item"><div><strong>' + esc(i.number) + '</strong> · ' + esc(i.customer_name) +
          '<div class="muted">' + i.total + ' درهم (ضريبة ' + i.vat + ') · ' + esc(i.date) + ' · ' + (i.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة') + '</div></div>' +
          '<span><button type="button" class="btn-ghost" data-iprint="' + i.id + '" data-num="' + esc(i.number) + '">طباعة</button> ' +
          (i.status === 'unpaid' ? '<button type="button" class="btn-ghost" data-ipaid="' + i.id + '">تم الدفع</button> <button type="button" class="btn-ghost" data-idel="' + i.id + '">امسح</button>' : '') +
          '</span></div>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('[data-iprint]'), function (b) {
        b.onclick = function () {
          D.api('/api/ops/invoices/' + b.getAttribute('data-iprint') + '/html').then(function (res) {
            if (!res.ok) throw new Error('تعذّر فتح الفاتورة.');
            return res.blob();
          }).then(function (blob) { D.downloadBlob(blob, b.getAttribute('data-num') + '.html'); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
      Array.prototype.forEach.call(list.querySelectorAll('[data-ipaid]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/ops/invoices/' + b.getAttribute('data-ipaid') + '/paid', { method: 'POST' })
            .then(function () { D.toast('اتسجّلت كمدفوعة وأُضيفت للإيرادات ✅'); return Promise.all([loadInv(), loadVat()]); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
      Array.prototype.forEach.call(list.querySelectorAll('[data-idel]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/ops/invoices/' + b.getAttribute('data-idel'), { method: 'DELETE' })
            .then(function () { return loadInv(); }).catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
    }
    function loadInv() {
      return D.apiJson('/api/ops/invoices').then(drawInvoices).catch(function (ex) { $('invList').textContent = D.netMessage(ex); });
    }

    $('invForm').addEventListener('submit', function (e) {
      e.preventDefault();
      D.apiJson('/api/ops/invoices', { method: 'POST', body: JSON.stringify({
        customer_name: $('iCust').value, customer_trn: $('iTrn').value, date: $('iDate').value, items: collectItems()
      }) }).then(function (r) {
        D.toast('اتعملت الفاتورة ' + r.number + ' ✅');
        e.target.reset();
        $('iDate').value = new Date().toISOString().slice(0, 10);
        $('iItems').innerHTML = itemRow();
        return Promise.all([loadInv(), loadVat()]);
      }).catch(function (ex) { D.toast(D.netMessage(ex)); });
    });

    loadInv();
    loadVat();
  }

  // ---------- الإشعارات (تنبيه لما تخلص الصورة أو الفيديو) ----------
  function urlB64ToBytes(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  function renderAlerts(body) {
    var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    body.innerHTML = '<div class="card-box"><h2>الإشعارات</h2>' +
      '<p class="biz-hint">فعّل الإشعارات عشان تعرف لما الصورة أو الفيديو يخلص حتى لو قفلت التطبيق. على الآيفون لازم تضيف التطبيق للشاشة الرئيسية الأول.</p>' +
      '<div id="alertState"><div class="biz-loading">جارٍ التحقق…</div></div>' +
      '<div class="form-foot" id="alertActions"></div></div>';
    if (!supported) { $('alertState').innerHTML = '<p class="muted">المتصفح ده ما بيدعمش الإشعارات. جرّب من تطبيق مثبّت على الشاشة الرئيسية.</p>'; return; }

    function show(subscribed) {
      $('alertState').innerHTML = subscribed
        ? '<p>الإشعارات <strong>مفعّلة</strong> على الجهاز ده ✅</p>'
        : '<p>الإشعارات <strong>مش مفعّلة</strong> على الجهاز ده.</p>';
      var acts = subscribed
        ? '<button type="button" class="btn-ghost" id="alOff">أوقف الإشعارات</button> <button type="button" class="result-btn" id="alTest">جرّب إشعار</button>'
        : '<button type="button" class="btn-primary" id="alOn">فعّل الإشعارات</button>';
      $('alertActions').innerHTML = acts;
      if (subscribed) {
        $('alOff').onclick = function () {
          navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
            if (!sub) return null;
            var endpoint = sub.endpoint;
            return sub.unsubscribe().then(function () { return D.apiJson('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: endpoint }) }); });
          }).then(function () { D.toast('اتوقفت الإشعارات على الجهاز ده'); show(false); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
        $('alTest').onclick = function () {
          D.apiJson('/api/push/test', { method: 'POST' })
            .then(function (r) { D.toast(r.sent ? 'الإشعار اتبعت ✅' : 'ما وصلش إشعار. فعّل الإشعارات من جديد.'); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      } else {
        $('alOn').onclick = function () {
          D.apiJson('/api/push/key').then(function (k) {
            if (!k.enabled || !k.publicKey) throw new Error('الإشعارات لسه مش مفعّلة على السيرفر.');
            return Notification.requestPermission().then(function (perm) {
              if (perm !== 'granted') throw new Error('لازم توافق على الإشعارات من إعدادات المتصفح.');
              return navigator.serviceWorker.ready.then(function (reg) {
                return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(k.publicKey) });
              }).then(function (sub) {
                return D.apiJson('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription: sub.toJSON() }) });
              });
            });
          }).then(function () { D.toast('اتفعّلت الإشعارات ✅'); show(true); })
            .catch(function (ex) { D.toast(ex.message || D.netMessage(ex)); });
        };
      }
    }

    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (sub) { show(!!sub); })
      .catch(function () { show(false); });
  }

  // ---------- العملاء ----------
  var editingCustomer = null;
  function renderCustomers(body) {
    body.innerHTML = '<div id="custKpi"></div><div class="card-box"><h2>العملاء</h2>' +
      '<p class="biz-hint">سجّل عملاءك عشان المساعد يعرفهم لما تسأله عنهم. ابحث بالاسم أو الهاتف أو الوسم.</p>' +
      '<form id="custForm" class="form-grid">' +
      '<div class="f"><label for="cName">الاسم</label><input id="cName" type="text" maxlength="80" required></div>' +
      '<div class="f"><label for="cPhone">الهاتف</label><input id="cPhone" type="text" maxlength="20" dir="ltr"></div>' +
      '<div class="f"><label for="cEmail">الإيميل</label><input id="cEmail" type="text" maxlength="190" dir="ltr"></div>' +
      '<div class="f"><label for="cTags">وسوم (مفصولة بفاصلة)</label><input id="cTags" type="text" maxlength="200" placeholder="VIP, مارينا"></div>' +
      '<div class="f full"><label for="cNotes">ملاحظات</label><textarea id="cNotes" rows="2" maxlength="500" placeholder="مثال: يفضل التوصيل بعد 6 مساءً"></textarea></div>' +
      '<div class="form-foot"><button type="submit" class="btn-primary" id="custSave">أضف العميل</button></div></form>' +
      '<div class="mem-form"><input id="cSearch" type="search" placeholder="ابحث في العملاء…"></div>' +
      '<div id="custList"><div class="biz-loading">جارٍ التحميل…</div></div></div>';

    function drawList(items) {
      var list = $('custList');
      if (!items.length) { list.innerHTML = '<p class="muted">مفيش عملاء. أضف أول عميل من فوق.</p>'; return; }
      var byId = {};
      items.forEach(function (c) { byId[c.id] = c; });
      $('custKpi').innerHTML = '<div class="biz-kpis">' + kpi(items.length, 'عدد العملاء') +
        kpi(items.filter(function (c) { return c.phone; }).length, 'عندهم رقم تليفون') +
        kpi(items.filter(function (c) { return c.tags; }).length, 'عليهم وسوم', 'ok') + '</div>';
      list.innerHTML = items.map(function (c) {
        var meta = [c.phone, c.email, c.tags].filter(Boolean).join(' · ');
        return '<div class="mem-item"><div><strong>' + esc(c.name) + '</strong>' +
          (meta ? '<div class="muted" dir="auto">' + esc(meta) + '</div>' : '') +
          (c.notes ? '<div class="muted">' + esc(c.notes) + '</div>' : '') + '</div>' +
          '<span><button type="button" class="btn-ghost" data-cedit="' + c.id + '">عدّل</button> ' +
          '<button type="button" class="btn-ghost" data-cdel="' + c.id + '">امسح</button></span></div>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('[data-cdel]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/customers/' + b.getAttribute('data-cdel'), { method: 'DELETE' })
            .then(function () { if (editingCustomer == b.getAttribute('data-cdel')) resetCustomerForm(); D.toast('اتمسح العميل'); return loadCustomers(); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
      Array.prototype.forEach.call(list.querySelectorAll('[data-cedit]'), function (b) {
        b.onclick = function () {
          var c = byId[b.getAttribute('data-cedit')];
          if (!c) return;
          editingCustomer = c.id;
          $('cName').value = c.name; $('cPhone').value = c.phone || ''; $('cEmail').value = c.email || '';
          $('cTags').value = (c.tags || '').replace(/,/g, ', '); $('cNotes').value = c.notes || '';
          $('custSave').textContent = 'احفظ التعديل';
          $('custForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
      });
    }
    function resetCustomerForm() {
      editingCustomer = null;
      $('custForm').reset();
      $('custSave').textContent = 'أضف العميل';
    }
    function loadCustomers() {
      var s = $('cSearch').value.trim();
      return D.apiJson('/api/customers?q=' + encodeURIComponent(s)).then(function (r) { drawList(r.items || []); })
        .catch(function (ex) { $('custList').innerHTML = '<div class="msg-error">' + esc(D.netMessage(ex)) + '</div>'; });
    }
    var searchTimer = null;
    $('cSearch').addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadCustomers, 250);
    });
    $('custForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var body2 = JSON.stringify({
        name: $('cName').value, phone: $('cPhone').value, email: $('cEmail').value,
        tags: $('cTags').value, notes: $('cNotes').value
      });
      var editing = editingCustomer;
      var req = editing
        ? D.apiJson('/api/customers/' + editing, { method: 'PUT', body: body2 })
        : D.apiJson('/api/customers', { method: 'POST', body: body2 });
      req.then(function () {
        resetCustomerForm();
        D.toast(editing ? 'اتحفظ التعديل ✅' : 'اتضاف العميل ✅');
        return loadCustomers();
      }).catch(function (ex) { D.toast(D.netMessage(ex)); });
    });
    loadCustomers();
  }

  // ---------- ذاكرة المساعد (معلومات يحفظها المستخدم بموافقته) ----------
  function renderMemory(body) {
    body.innerHTML = '<div class="card-box"><h2>ذاكرة المساعد</h2>' +
      '<p class="biz-hint">المعلومات اللي تحفظها هنا (أو تكتب في المحادثة "احفظ: ...") بيستخدمها المساعد في المحادثات اللاحقة. تقدر تحذف أي معلومة في أي وقت. ما نحفظش أرقام بطاقات أو هوية أو حسابات بنكية.</p>' +
      '<form id="memForm" class="mem-form"><input id="memText" type="text" maxlength="300" placeholder="مثال: نفتح من 10 صباحاً لـ 11 مساءً، وتوصيلنا مجاني داخل مارينا"><button type="submit" class="btn-primary">احفظ</button></form>' +
      '<div id="memList"><div class="biz-loading">جارٍ التحميل…</div></div></div>';
    function drawList(items) {
      var list = $('memList');
      if (!list) return; // المستخدم غيّر التبويب قبل ما يرجع الرد
      if (!items.length) { list.innerHTML = '<p class="muted">مفيش معلومات محفوظة لسه.</p>'; return; }
      list.innerHTML = items.map(function (i) {
        return '<div class="mem-item"><span>' + esc(i.text) + '</span><button type="button" class="btn-ghost" data-del="' + i.id + '">امسح</button></div>';
      }).join('');
      Array.prototype.forEach.call(list.querySelectorAll('[data-del]'), function (b) {
        b.onclick = function () {
          D.apiJson('/api/memory/' + b.getAttribute('data-del'), { method: 'DELETE' })
            .then(function () { D.toast('اتمسحت المعلومة'); return loadMemory(); })
            .catch(function (ex) { D.toast(D.netMessage(ex)); });
        };
      });
    }
    function loadMemory() {
      return D.apiJson('/api/memory').then(function (r) { drawList(r.items || []); })
        .catch(function (ex) { var list = $('memList'); if (list) list.innerHTML = '<div class="msg-error">' + esc(D.netMessage(ex)) + '</div>'; });
    }
    $('memForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var text = $('memText').value.trim();
      if (!text) return;
      D.apiJson('/api/memory', { method: 'POST', body: JSON.stringify({ text: text }) })
        .then(function () { $('memText').value = ''; D.toast('اتحفظت ✅'); return loadMemory(); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); });
    });
    loadMemory();
  }

  // ---------- بيانات النشاط ----------
  function renderProfile(body) {
    var p = data.profile || {};
    var html = '<form id="bizForm" class="card-box" novalidate><h2>عرّف المساعد على نشاطك</h2>' +
      '<p class="biz-hint">البيانات دي بتخلّي كل المحتوى والإعلانات والردود متفصّلة على نشاطك بدل ما تكون عامة. املأ اللي تعرفه بس.</p><div class="form-grid">';
    FIELDS.forEach(function (f) {
      var id = 'bz_' + f[0], v = p[f[0]] || '';
      var full = f[2] === 'textarea' ? ' full' : '';
      html += '<div class="f' + full + '"><label for="' + id + '">' + f[1] + '</label>';
      if (f[2] === 'textarea') html += '<textarea id="' + id + '" rows="3" maxlength="600" placeholder="' + esc(f[3]) + '">' + esc(v) + '</textarea>';
      else if (f[2] === 'select') html += '<select id="' + id + '">' + f[3].map(function (o) { return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + (o || 'اختار…') + '</option>'; }).join('') + '</select>';
      else html += '<input id="' + id + '" type="text" maxlength="200"' + (f[4] ? ' dir="ltr"' : '') + ' placeholder="' + esc(f[3]) + '" value="' + esc(v) + '">';
      html += '</div>';
    });
    var useBrand = !!(p.brandPrimary || p.brandAccent);
    html += '</div><div class="brand-kit"><h3>هوية علامتك</h3><p class="biz-hint">اللوجو والألوان بيتحطوا أوتوماتيك على كل الإعلانات والتصاميم.</p>' +
      '<div class="bk-row"><div class="bk-logo" id="bkLogo"><span>مفيش لوجو</span></div>' +
      '<div class="bk-actions"><button type="button" class="result-btn" id="bkUp">ارفع اللوجو</button><button type="button" class="btn-ghost" id="bkRm" hidden>امسح</button>' +
      '<input type="file" id="bkFile" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></div></div>' +
      '<label class="ad-check biz-check"><input type="checkbox" id="bz_brandOn"' + (useBrand ? ' checked' : '') + '> استخدم ألوان علامتي في التصاميم</label>' +
      '<div class="ad-colors" id="bkColors"' + (useBrand ? '' : ' hidden') + '>' +
      '<label class="ad-color"><input type="color" id="bz_brandPrimary" value="' + esc(p.brandPrimary || '#1F2A44') + '"><span>اللون الأساسي (الخلفيات)</span></label>' +
      '<label class="ad-color"><input type="color" id="bz_brandAccent" value="' + esc(p.brandAccent || '#E3B04B') + '"><span>لون مميز (الأزرار)</span></label></div></div>';
    html += '<label class="ad-check biz-check"><input type="checkbox" id="bz_use"' + (p.useInChat === false ? '' : ' checked') + '> استخدم بيانات نشاطي في كل ردود المساعد</label>' +
      '<div class="form-foot"><button type="submit" class="btn-primary">احفظ البيانات</button><span class="muted" id="bzSaved"></span></div></form>';
    body.innerHTML = html;
    var A = D.adStudio;
    function showLogo() {
      var u = A && A.getLogo();
      $('bkLogo').innerHTML = u ? '<img alt="اللوجو">' : '<span>مفيش لوجو</span>';
      if (u) $('bkLogo').querySelector('img').src = u;
      $('bkRm').hidden = !u;
      $('bkUp').textContent = u ? 'غيّر اللوجو' : 'ارفع اللوجو';
    }
    if (A) {
      showLogo();
      if (!A.getLogo() && data.hasLogo) A.syncLogo().then(showLogo);
      $('bkUp').onclick = function () { $('bkFile').click(); };
      $('bkFile').onchange = function () {
        A.processLogo($('bkFile').files[0]).then(function (url) {
          return A.saveLogo(url).then(function () { D.toast('اتحفظ اللوجو ✅'); }, function () { D.toast('اللوجو اتحفظ على الجهاز بس.'); });
        }).catch(function (ex) { D.toast(ex.message); }).then(function () { showLogo(); if (D.resetDesignBrand) D.resetDesignBrand(); });
      };
      $('bkRm').onclick = function () { A.removeLogo().then(showLogo); showLogo(); };
    }
    $('bz_brandOn').onchange = function () { $('bkColors').hidden = !this.checked; };
    $('bizForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var prof = {};
      FIELDS.forEach(function (f) { prof[f[0]] = $('bz_' + f[0]).value.trim(); });
      prof.useInChat = $('bz_use').checked;
      if ($('bz_brandOn').checked) { prof.brandPrimary = $('bz_brandPrimary').value; prof.brandAccent = $('bz_brandAccent').value; }
      var btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true;
      D.apiJson('/api/business', { method: 'PUT', body: JSON.stringify({ profile: prof }) })
        .then(function (r) { data.profile = r.profile; if (D.resetDesignBrand) D.resetDesignBrand(); if (D.adStudio && D.adStudio.resetBrand) D.adStudio.resetBrand(); D.toast('اتحفظت بيانات نشاطك ✅'); $('bzSaved').textContent = 'المساعد هيستخدمها في ردوده من دلوقتي.'; })
        .catch(function (ex) { D.toast(D.netMessage(ex)); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ---------- الربط والتحليل ----------
  // خطوات الشغل الخمسة من الخطة: كل خطوة بتتعلّم "خلصت" من البيانات الفعلية
  var FLOW = ['جمع البيانات', 'كشف المشاكل', 'القرار', 'التنفيذ بموافقتك', 'القياس'];
  function flowState() {
    var recs = data.recs || [];
    var reps = data.reports || [];
    var p = data.profile || {};
    return [
      !!(conn('shopify') || conn('woo') || p.name || p.brand || p.website || p.goals),
      reps.some(function (r) { return r.kind === 'site' || r.kind === 'store' || r.kind === 'full'; }),
      recs.length > 0,
      recs.some(function (r) { return r.status === 'approved' || r.status === 'done'; }),
      recs.some(function (r) { return r.verdict; }),
    ];
  }
  function flowHtml() {
    var st = flowState();
    var cur = st.indexOf(false);
    if (cur < 0) cur = FLOW.length;
    return '<ol class="biz-flow" aria-label="خطوات الشغل">' + FLOW.map(function (t, i) {
      return '<li class="' + (st[i] ? 'ok' : i === cur ? 'on' : '') + '"><span class="biz-flow-n">' + (st[i] ? '✓' : i + 1) + '</span><span>' + t + '</span></li>';
    }).join('') + '</ol>';
  }

  // أرقام سريعة فوق: من بيانات الخطوات والتوصيات والتقارير اللي موجودة بالفعل
  function kpiHtml() {
    var done = flowState().filter(Boolean).length;
    var recs = data.recs || [];
    var pending = recs.filter(function (r) { return r.status === 'pending'; }).length;
    var finished = recs.filter(function (r) { return r.status === 'done'; }).length;
    var k = function (v, l, cls) { return '<div class="biz-kpi ' + (cls || '') + '"><b>' + v + '</b><span>' + l + '</span></div>'; };
    return '<div class="biz-kpis">' +
      k(done + ' / ' + FLOW.length, 'الخطوات المكتملة') +
      k(pending, 'توصيات بانتظار موافقتك', pending ? 'warn' : '') +
      k(finished, 'توصيات منفذة', finished ? 'ok' : '') +
      k((data.reports || []).length, 'تحليلات تمت') + '</div>';
  }

  // حالة كل ميزة: متاح / يتطلب ربطاً / قيد التطوير
  var FEAT_LABEL = { ok: 'متاح', conn: 'يتطلب ربطاً', dev: 'قيد التطوير' };
  function featuresHtml() {
    var hasStore = !!(conn('shopify') || conn('woo'));
    var rows = [
      ['تحليل الموقع الإلكتروني', 'ok', ''],
      ['تحليل المتجر والمنتجات الراكدة', hasStore ? 'ok' : 'conn', hasStore ? '' : 'اربط متجرك في قسم المتجر الإلكتروني'],
      ['Dubai Fans Radar: ظهور علامتك في البحث وإجابات الذكاء الاصطناعي', 'ok', ''],
      ['المستشار: توصيات بتتنفذ بموافقتك', 'ok', ''],
      ['معدل التحويل وتكلفة اكتساب العميل', 'dev', 'محتاجة ربط تحليلات الموقع والإعلانات، وده لسه ماتعملش'],
    ];
    return '<section class="card-box biz-card biz-full"><h2>حالة الميزات</h2><ul class="biz-feat">' + rows.map(function (r) {
      return '<li><span class="biz-badge ' + r[1] + '">' + FEAT_LABEL[r[1]] + '</span><div><b>' + r[0] + '</b>' + (r[2] ? '<span class="muted">' + r[2] + '</span>' : '') + '</div></li>';
    }).join('') + '</ul></section>';
  }

  // المشاكل اللي بتطلع من أرقام المتجر، كل مشكلة تقدر تتحول لتوصية في المستشار
  function problemsOf(f) {
    var out = [];
    var days = f.days || 90;
    var list = function (a) { return (a || []).slice(0, 5).join('، '); };
    var drop = f.revenuePrev30 > 0 ? (f.revenue30 - f.revenuePrev30) / f.revenuePrev30 : 0;
    if (f.noSalesCount) out.push({ kind: 'content', title: 'منتجات ما اتباعتش خلال ' + days + ' يوم', reason: f.noSalesCount + ' منتج نشط ما اتباعش: ' + list(f.noSales) + '. جرّب عرض أو منشور ليهم، وراجع سعرهم ووصفهم.' });
    if ((f.outStock || []).length) out.push({ kind: 'other', title: 'منتجات خلص مخزونها', reason: list(f.outStock) + ' مخزونهم خلص. اعمل إعادة توريد، أو اخفيهم لحد ما يرجعوا عشان الزبون ما يطلبش حاجة مش متاحة.' });
    if ((f.lowStock || []).length) out.push({ kind: 'other', title: 'مخزون قليل لمنتجات بتتباع', reason: list(f.lowStock) + ' باقي منهم 3 قطع أو أقل. خطط لإعادة التوريد قبل ما يخلص.' });
    if (f.weakDesc) out.push({ kind: 'content', title: 'أوصاف قصيرة لـ ' + f.weakDesc + ' منتج', reason: 'الوصف القصير (أقل من 80 حرف) بيضعّف ظهور المنتج في جوجل وقرار الشراء. اكتب وصف واضح لكل منتج.' });
    if (f.noImages) out.push({ kind: 'content', title: 'منتجات بدون صور: ' + f.noImages, reason: 'المنتج من غير صورة بيتباع أقل بكتير. ضيف صورة واضحة لكل منتج نشط.' });
    if (f.revenuePrev30 > 0 && drop <= -0.1) out.push({ kind: 'other', title: 'تراجع المبيعات آخر 30 يوم', reason: 'الإيراد آخر 30 يوم ' + fmtNum(f.revenue30) + ' مقابل ' + fmtNum(f.revenuePrev30) + ' في الشهر اللي قبله. ابدأ بمراجعة الإعلانات والمنتجات الأكثر مبيعاً.' });
    return out;
  }
  function problemsHtml(f) {
    var ps = problemsOf(f);
    if (!ps.length) return '<div class="card-box biz-problems"><h2>المشاكل اللي لقيناها</h2><p class="muted">ما لقيناش مشاكل واضحة في البيانات دي ✅</p></div>';
    return '<div class="card-box biz-problems"><h2>المشاكل اللي لقيناها</h2>' +
      '<p class="biz-hint">أضف أي مشكلة للمستشار كتوصية. التوصية بتفضل بانتظار موافقتك، ومفيش حاجة بتتنفذ لوحدها.</p><ul>' +
      ps.map(function (p, i) {
        return '<li><div><b>' + esc(p.title) + '</b><span>' + esc(p.reason) + '</span></div>' +
          '<button type="button" class="btn-ghost" data-pi="' + i + '">أضفها للمستشار</button></li>';
      }).join('') + '</ul></div>';
  }
  // يضيف كل المشاكل للمستشار كتوصيات بانتظار الموافقة، واحدة ورا التانية
  function addAllProblems(ps, btn) {
    btn.disabled = true;
    ps.reduce(function (chain, p) {
      return chain.then(function () {
        return D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify({ kind: p.kind, title: p.title, reason: p.reason }) })
          .then(function () { data.recs = (data.recs || []).concat([{ status: 'pending' }]); })
          .catch(function () {});
      });
    }, Promise.resolve()).then(function () {
      btn.textContent = 'اتضافت ✓';
      D.toast('اتضافت التوصيات للمستشار');
    });
  }
  function bindProblems(box, f) {
    var ps = problemsOf(f);
    Array.prototype.forEach.call(box.querySelectorAll('[data-pi]'), function (b) {
      b.onclick = function () {
        var p = ps[Number(b.getAttribute('data-pi'))];
        b.disabled = true;
        D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify({ kind: p.kind, title: p.title, reason: p.reason }) })
          .then(function () {
            b.textContent = 'اتضافت ✓';
            data.recs = (data.recs || []).concat([{ status: 'pending' }]);
            D.toast('اتضافت للمستشار');
          })
          .catch(function (ex) { b.disabled = false; D.toast(D.netMessage(ex)); });
      };
    });
  }
  function conn(kind) { return (data.connections || []).filter(function (c) { return c.kind === kind; })[0]; }
  function runBtn(kind, label) {
    var busy = running === kind;
    return '<button type="button" class="btn-primary biz-run" data-run="' + kind + '"' + (running ? ' disabled' : '') + '>' +
      (busy ? '<span class="mic-spin"></span> جارٍ التحليل… (دقيقة تقريباً)' : label) + '</button>';
  }
  function left() {
    var n = D.left ? D.left('radar') : null;
    return n == null ? '' : '<span class="muted">' + (n === Infinity ? 'تحليلات غير محدودة' : 'متبقي ' + n + ' تحليل اليوم') + '</span>';
  }

  function renderConnect(body) {
    var p = data.profile || {};
    var store = conn('shopify') || conn('woo');
    var html = kpiHtml() + '<section class="card-box biz-card biz-full biz-pipe"><h2>خطوات الشغل</h2>' + flowHtml() + '</section>' + featuresHtml();
    // الموقع
    html += '<section class="card-box biz-card"><div class="biz-card-head"><span class="biz-ico">' + ICONS.web + '</span><div><h2>الموقع الإلكتروني</h2>' +
      '<p>بنقرا صفحات موقعك ونطلّعلك تقرير SEO وتجربة مستخدم ومحتوى، وأهم 10 تحسينات.</p></div></div>' +
      '<div class="biz-row"><input id="bzUrl" type="text" dir="ltr" placeholder="example.com" value="' + esc(p.website || '') + '">' + runBtn('site', 'حلّل موقعي') + '</div>' + left() + '</section>';
    // المتجر
    html += '<section class="card-box biz-card"><div class="biz-card-head"><span class="biz-ico">' + ICONS.cart + '</span><div><h2>المتجر الإلكتروني</h2>' +
      '<p>بنقرا منتجاتك وطلباتك (قراءة بس، مش بنعدّل حاجة)، ونحللك المبيعات والأكثر مبيعاً والمنتجات الراكدة، ونقترح عروض ومحتوى.</p></div></div>';
    // تحليل من رابط المتجر فقط (بدون مفاتيح)، جنب الربط بالمفاتيح
    html += '<div class="biz-url"><p class="biz-hint">ماعندكش مفاتيح ربط؟ اكتب رابط متجرك وبنقرا صفحات المنتجات العامة. بيشتغل مع أي منصة، بس من غير بيانات الطلبات والمبيعات.</p>' +
      '<div class="biz-row"><input id="bzStoreUrl" type="text" dir="ltr" placeholder="your-store.com" value="' + esc(p.website || '') + '">' + runBtn('storeurl', 'حلّل المتجر من رابطه') + '</div></div>';
    if (store) {
      html += '<div class="biz-connected"><span class="dot-on"></span><b>' + esc(store.label) + '</b><span class="muted">' + (store.kind === 'shopify' ? 'Shopify' : 'WooCommerce') + ' · متربط من ' + fmtDate(store.created_at) + '</span>' +
        '<button type="button" class="btn-ghost danger" id="bzDisconnect">افصل</button></div>' +
        '<div class="form-foot">' + runBtn('store', 'حلّل متجري') + left() + '</div>';
    } else {
      html += '<div class="ad-seg biz-seg"><button type="button" data-k="shopify"' + (storeKind === 'shopify' ? ' class="on"' : '') + '>Shopify</button>' +
        '<button type="button" data-k="woo"' + (storeKind === 'woo' ? ' class="on"' : '') + '>WooCommerce</button></div>';
      if (storeKind === 'shopify') {
        html += '<div class="ad-seg biz-seg small"><button type="button" data-m="new"' + (shopMode === 'new' ? ' class="on"' : '') + '>Client ID و Secret</button>' +
          '<button type="button" data-m="token"' + (shopMode === 'token' ? ' class="on"' : '') + '>عندي Access Token</button></div>' +
          '<div class="form-grid"><div class="f"><label for="bzShop">رابط المتجر</label><input id="bzShop" type="text" dir="ltr" placeholder="your-store.myshopify.com"></div>' +
          (shopMode === 'new'
            ? '<div class="f"><label for="bzCid">Client ID</label><input id="bzCid" type="text" dir="ltr" autocomplete="off"></div>' +
              '<div class="f"><label for="bzCsec">Client secret</label><input id="bzCsec" type="password" dir="ltr" autocomplete="off"></div>'
            : '<div class="f"><label for="bzTok">Admin API access token</label><input id="bzTok" type="password" dir="ltr" autocomplete="off" placeholder="shpat_…"></div>') +
          '</div><details class="biz-help"><summary>إزاي أجيب البيانات دي من Shopify؟</summary>' +
          (shopMode === 'new'
            ? '<ol><li>ادخل <b>dev.shopify.com</b> بنفس حساب صاحب المتجر، واختار <b>Apps ← Create app</b>.</li>' +
              '<li>في إعدادات النسخة (Version) فعّل الصلاحيات: <b>read_products</b> و<b>read_orders</b>، وبعدين <b>Release</b>.</li>' +
              '<li>دوس <b>Install</b> وثبّت التطبيق على متجرك ووافق.</li>' +
              '<li>من <b>Settings</b> في التطبيق انسخ <b>Client ID</b> و<b>Client secret</b> وحطهم هنا.</li></ol>'
            : '<ol><li>لو عندك تطبيق قديم من <b>Settings ← Apps ← Develop apps</b>، افتحه.</li><li>اتأكد إن صلاحيات <b>read_products</b> و<b>read_orders</b> مفعّلة.</li><li>من <b>API credentials</b> انسخ <b>Admin API access token</b> (بيبدأ بـ shpat_).</li></ol>') +
          '<p class="muted">بياناتك بتتحفظ مشفّرة، وتقدر تفصل المتجر في أي وقت. <a href="privacy.html" target="_blank">سياسة الخصوصية</a></p></details>';
      } else {
        html += '<div class="form-grid"><div class="f full"><label for="bzSite">رابط الموقع</label><input id="bzSite" type="text" dir="ltr" placeholder="https://your-store.com" value="' + esc(p.website || '') + '"></div>' +
          '<div class="f"><label for="bzCk">Consumer key</label><input id="bzCk" type="text" dir="ltr" autocomplete="off" placeholder="ck_…"></div>' +
          '<div class="f"><label for="bzCs">Consumer secret</label><input id="bzCs" type="password" dir="ltr" autocomplete="off" placeholder="cs_…"></div></div>' +
          '<details class="biz-help"><summary>إزاي أجيب المفاتيح من WooCommerce؟</summary><ol>' +
          '<li>من لوحة ووردبريس: <b>WooCommerce ← Settings ← Advanced ← REST API</b>.</li>' +
          '<li>دوس <b>Add key</b>، اكتب وصف زي "Dubai Fans AI"، واختار الصلاحية <b>Read</b> بس.</li>' +
          '<li>دوس <b>Generate API key</b> وانسخ <b>Consumer key</b> و<b>Consumer secret</b>.</li></ol>' +
          '<p class="muted">الصلاحية "Read" يعني المساعد بيقرا بس ومش هيعدّل أي حاجة في متجرك. البيانات بتتحفظ مشفّرة.</p></details>';
      }
      html += '<p id="bzConnErr" class="form-error" role="alert" hidden></p><div class="form-foot"><button type="button" class="btn-primary" id="bzConnect">اربط المتجر</button></div>';
    }
    html += '</section>';
    // التحليل الشامل
    html += '<section class="card-box biz-card biz-full"><div class="biz-card-head"><span class="biz-ico spark">' + ICONS.spark + '</span><div><h2>التحليل الشامل وخطة 30 يوم</h2>' +
      '<p>بيجمع بيانات نشاطك وتحليل موقعك ومتجرك، ويطلّعلك خطة نمو أسبوع بأسبوع، وخطة محتوى 14 يوم، وتوصيات إعلانات.</p></div></div>' +
      '<div class="form-foot">' + runBtn('full', 'اعمل التحليل الشامل') + '</div></section>';
    // قريباً
    html += '<section class="card-box biz-card"><h2>ربط الحسابات (قريباً)</h2><p class="biz-hint">بنجهّز ربط الحسابات دي بالتعاون مع المنصات نفسها. هتقدر تربطها من هنا أول ما تتفعّل.</p><div class="soon-grid">' +
      SOON.map(function (s) { return '<div class="soon-item"><span class="soon-dot" style="background:' + s[2] + '"></span><div><b>' + s[0] + '</b><span>' + s[1] + '</span></div><em>قريباً</em></div>'; }).join('') +
      '</div></section>';
    body.innerHTML = html;

    Array.prototype.forEach.call(body.querySelectorAll('[data-run]'), function (b) { b.onclick = function () { run(b.getAttribute('data-run')); }; });
    Array.prototype.forEach.call(body.querySelectorAll('.biz-seg [data-k]'), function (b) { b.onclick = function () { storeKind = b.getAttribute('data-k'); render(); }; });
    Array.prototype.forEach.call(body.querySelectorAll('.biz-seg [data-m]'), function (b) { b.onclick = function () { shopMode = b.getAttribute('data-m'); render(); }; });
    if ($('bzConnect')) $('bzConnect').onclick = connect;    if ($('bzDisconnect')) $('bzDisconnect').onclick = function () {
      if (!confirm('تفصل المتجر؟ هنمسح بيانات الربط من عندنا.')) return;
      D.apiJson('/api/business/connect/' + store.kind, { method: 'DELETE' }).then(function (r) { data.connections = r.connections; D.toast('اتفصل المتجر'); render(); });
    };
  }

  function connect() {
    var b = { kind: storeKind };
    if (storeKind === 'shopify') {
      b.shop = $('bzShop').value.trim();
      if (shopMode === 'new') { b.clientId = $('bzCid').value.trim(); b.clientSecret = $('bzCsec').value.trim(); }
      else b.token = $('bzTok').value.trim();
    } else { b.site = $('bzSite').value.trim(); b.ck = $('bzCk').value.trim(); b.cs = $('bzCs').value.trim(); }
    var err = $('bzConnErr'), btn = $('bzConnect');
    err.hidden = true;
    btn.disabled = true; btn.textContent = 'بنجرّب الربط…';
    D.apiJson('/api/business/connect', { method: 'POST', body: JSON.stringify(b) })
      .then(function (r) { data.connections = r.connections; D.toast('اتربط متجرك ✅ ' + r.label); render(); })
      .catch(function (ex) { err.textContent = D.netMessage(ex); err.hidden = false; btn.disabled = false; btn.textContent = 'اربط المتجر'; });
  }

  function run(kind) {
    if (running) return;
    var body = {};
    if (kind === 'site') {
      body.url = ($('bzUrl') && $('bzUrl').value.trim()) || '';
      if (!body.url) return D.toast('اكتب رابط موقعك.');
    }
    if (kind === 'storeurl') {
      body.url = ($('bzStoreUrl') && $('bzStoreUrl').value.trim()) || '';
      if (!body.url) return D.toast('اكتب رابط متجرك.');
    }
    var endpoint = { site: 'site-audit', store: 'store-analysis', storeurl: 'store-url', full: 'full-analysis' }[kind];
    running = kind;
    render();
    D.apiJson('/api/business/' + endpoint, { method: 'POST', body: JSON.stringify(body) })
      .then(function (r) {
        running = null;
        data.reports = [{ id: r.id, kind: r.kind, title: r.title, score: r.score, created_at: r.created_at }].concat(data.reports || []);
        if (D.refreshMe) D.refreshMe();
        tab = 'reports';
        render();
        showReport(r);
      })
      .catch(function (ex) {
        running = null;
        render();
        if (ex.code === 'quota') return D.openPlans(ex.message);
        D.toast(D.netMessage(ex));
      });
  }

  // ---------- التقارير ----------
  var KIND = { site: ['🌐', 'تحليل موقع'], store: ['🛒', 'تحليل متجر'], full: ['✨', 'خطة شاملة'] };
  function renderReports(body) {
    var list = data.reports || [];
    if (!list.length) {
      body.innerHTML = '<div class="card-box biz-empty"><p>لسه مفيش تقارير. ابدأ من <b>الربط والتحليل</b>: حلّل موقعك أو متجرك.</p><button type="button" class="btn-primary" id="bzGo">ابدأ التحليل</button></div>';
      $('bzGo').onclick = function () { tab = 'connect'; render(); };
      return;
    }
    var sites = list.filter(function (r) { return r.kind === 'site' && r.score != null; }).slice(0, 8).reverse();
    var kinds = { site: 0, store: 0, full: 0 };
    list.forEach(function (r) { if (kinds[r.kind] != null) kinds[r.kind] += 1; });
    var lastScore = sites.length ? sites[sites.length - 1].score : null;
    var summary = '<div class="biz-kpis">' + kpi(list.length, 'كل التقارير') + kpi(kinds.site, 'تحليلات موقع') +
      kpi(kinds.store, 'تحليلات متجر') + kpi(lastScore == null ? '—' : lastScore, 'آخر درجة للموقع', 'ok') + '</div>' +
      (sites.length > 1 ? '<div class="card-box biz-chartbox"><h2>تطور درجة الموقع</h2>' + barChart(sites.map(function (r) {
        return { label: new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }), values: [r.score] };
      }), { cls: ['bc-a'], max: 100, label: 'تطور درجة الموقع' }) + '</div>' : '');
    body.innerHTML = summary + '<div class="biz-reports">' + list.map(function (r) {
      var k = KIND[r.kind] || ['📄', ''];
      return '<button type="button" class="biz-rep" data-id="' + r.id + '"><span class="biz-rep-ico">' + k[0] + '</span><span class="biz-rep-t"><b>' + esc(r.title) + '</b><span>' + k[1] + ' · ' + fmtDate(r.created_at) + '</span></span>' +
        (r.score != null ? '<span class="biz-rep-score">' + r.score + '</span>' : '') + '</button>';
    }).join('') + '</div><div id="bzReport"></div>';
    Array.prototype.forEach.call(body.querySelectorAll('.biz-rep'), function (b) {
      b.onclick = function () {
        D.apiJson('/api/business/reports/' + b.getAttribute('data-id')).then(showReport).catch(function (ex) { D.toast(D.netMessage(ex)); });
      };
    });
  }

  function storeCards(f) {
    var trend = f.revenuePrev30 ? Math.round((f.revenue30 - f.revenuePrev30) / f.revenuePrev30 * 100) : null;
    var c = function (v, l) { return '<div class="metric"><b><bdi>' + v + '</bdi></b><span>' + l + '</span></div>'; };
    var cur = { AED: 'درهم', SAR: 'ريال', KWD: 'د.ك', QAR: 'ر.ق', BHD: 'د.ب', OMR: 'ر.ع', EGP: 'ج.م', USD: '$' }[f.currency] || esc(f.currency);
    return '<div class="metrics">' +
      c(fmtNum(f.revenue) + ' ' + cur, 'المبيعات (' + f.days + ' يوم)') +
      c(fmtNum(f.orders), 'عدد الطلبات') +
      c(fmtNum(f.aov) + ' ' + cur, 'متوسط الطلب') +
      c(trend == null ? '—' : '<span dir="ltr" class="' + (trend >= 0 ? 'up' : 'down') + '">' + (trend > 0 ? '+' : '') + trend + '%</span>', 'آخر 30 يوم مقابل اللي قبلها') + '</div>' +
      (f.top && f.top.length ? '<div class="card-box"><h2>الأكثر مبيعاً</h2><table class="biz-table"><thead><tr><th>المنتج</th><th>الكمية</th><th>المبيعات</th></tr></thead><tbody>' +
        f.top.slice(0, 8).map(function (t) { return '<tr><td>' + esc(t.name) + '</td><td>' + fmtNum(t.qty) + '</td><td>' + fmtNum(t.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '');
  }

  function storeCharts(f) {
    var out = '';
    if (f.revenue30 || f.revenuePrev30) out += '<div class="card-box biz-chartbox"><h2>آخر 30 يوم مقابل اللي قبله</h2>' +
      barChart([{ label: 'قبل', values: [f.revenuePrev30 || 0] }, { label: 'آخر 30', values: [f.revenue30 || 0] }], { cls: ['bc-a'], label: 'آخر 30 يوم' }) + '</div>';
    return out;
  }

  function showReport(r) {
    var box = $('bzReport');
    if (!box) { tab = 'reports'; render(); box = $('bzReport'); }
    var head = '<div class="card-box biz-report-head"><div><h2>' + esc(r.title) + '</h2><span class="muted">' + fmtDate(r.created_at) + '</span></div>';
    if (r.kind === 'site' && r.score != null && window.DFAI.radarRing) head += window.DFAI.radarRing(r.score);
    else if (r.kind === 'site' && r.score != null) head += '<div class="biz-score">' + r.score + '<span>من 100</span></div>';
    head += '</div>';
    var urlOnly = r.kind === 'store' && r.facts && r.facts.mode === 'url';
    var extra = r.kind === 'store' && r.facts
      ? (urlOnly ? '<p class="biz-hint">التحليل ده من صفحات المتجر العامة بدون بيانات الطلبات والمبيعات. اربط المتجر بالمفاتيح عشان تشوف المبيعات.</p>' : storeCards(r.facts) + storeCharts(r.facts)) + problemsHtml(r.facts)
      : '';
    box.innerHTML = head + extra + '<article class="card-box md biz-md">' + D.renderMarkdown(r.report || '') + '</article>' +
      '<div class="biz-actions">' + (urlOnly || r.kind === 'store' ? (r.facts && problemsOf(r.facts).length ? '<button type="button" class="btn-ghost" id="bzAdvisor">أضف كل المشاكل للمستشار</button>' : '') : '') +
      '<button type="button" class="btn-primary" id="bzDiscuss">ناقش التقرير مع المساعد</button>' +
      '<button type="button" class="btn-ghost" id="bzCopy">انسخ التقرير</button>' +
      '<button type="button" class="btn-ghost danger" id="bzDel">امسح</button></div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (r.kind === 'store' && r.facts) bindProblems(box, r.facts);
    if ($('bzAdvisor')) $('bzAdvisor').onclick = function () { addAllProblems(problemsOf(r.facts), $('bzAdvisor')); };
    $('bzCopy').onclick = function () {
      (navigator.clipboard ? navigator.clipboard.writeText(r.report) : Promise.reject()).then(function () { D.toast('اتنسخ ✅'); }, function () { D.toast('مقدرتش أنسخ'); });
    };
    $('bzDel').onclick = function () {
      if (!confirm('تمسح التقرير ده؟')) return;
      D.apiJson('/api/business/reports/' + r.id, { method: 'DELETE' }).then(function () {
        data.reports = data.reports.filter(function (x) { return x.id !== r.id; }); render();
      });
    };
    $('bzDiscuss').onclick = function () {
      D.hidePanel();
      D.newChat();
      D.setTool(null, true);
      D.send('ده تقرير "' + r.title + '" لنشاطي:\n\n' + String(r.report || '').slice(0, 3500) + '\n\nساعدني أبدأ أنفذ أهم 3 خطوات فيه، خطوة بخطوة.');
    };
  }

  D.openBusiness = function () { open(); };
})();
