/* Dubai Fans AI — أدوات النمو: مولد المحتوى، Dubai Fans Radar، المتابعة التلقائية */
(function () {
  'use strict';
  var D = window.DFAI;
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function fmtDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('ar-AE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  var ICON = {
    radar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/></svg>',
    pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>'
  };

  // ======================= مولد المحتوى =======================
  var TONES = ['احترافية', 'ودودة', 'حماسية', 'فاخرة وراقية', 'مرحة', 'مقنعة ومباشرة'];
  var DIALECTS = ['عربية فصحى سهلة', 'لهجة إماراتية', 'لهجة خليجية', 'لهجة مصرية', 'English', 'عربي + English'];

  var TEMPLATES = [
    { id: 'blog', ico: '📝', name: 'مقال مدونة', desc: 'مقال متوافق مع SEO بعناوين وأسئلة شائعة',
      fields: [
        { k: 'topic', label: 'موضوع المقال', req: true, ph: 'مثال: كيف تختار عطراً يناسب شخصيتك' },
        { k: 'keyword', label: 'الكلمة المفتاحية', ph: 'مثال: أفضل عطور رجالية' },
        { k: 'audience', label: 'الجمهور', ph: 'مثال: شباب 20-35 في الإمارات' },
        { k: 'length', label: 'الطول', type: 'select', options: ['قصير (400 كلمة)', 'متوسط (800 كلمة)', 'طويل (1200 كلمة)'] }
      ],
      build: function (v) {
        return 'اكتب مقال مدونة كامل بعنوان جذاب عن: ' + v.topic + '.' +
          (v.keyword ? ' الكلمة المفتاحية الأساسية: "' + v.keyword + '" (استخدمها في العنوان وأول فقرة وبعض العناوين الفرعية بشكل طبيعي).' : '') +
          (v.audience ? ' الجمهور: ' + v.audience + '.' : '') + ' الطول: ' + v.length + '.' +
          ' أضف: مقدمة قوية، عناوين فرعية H2/H3، نقاط، خاتمة بدعوة لاتخاذ إجراء، قسم أسئلة شائعة من 3 أسئلة، ثم عنوان SEO (أقل من 60 حرفاً) ووصف ميتا (أقل من 155 حرفاً).';
      } },
    { id: 'email', ico: '✉️', name: 'رسالة بريد تسويقية', desc: 'ترحيب، عرض، استرجاع سلة، متابعة',
      fields: [
        { k: 'kind', label: 'نوع الرسالة', type: 'select', options: ['رسالة ترحيب بعميل جديد', 'إعلان عرض أو خصم', 'استرجاع سلة متروكة', 'متابعة بعد الشراء', 'إطلاق منتج جديد', 'إعادة تنشيط عميل غير نشط'] },
        { k: 'offer', label: 'المنتج أو العرض', req: true, ph: 'مثال: خصم 20% على كل الشنط لمدة 3 أيام' },
        { k: 'audience', label: 'الجمهور', ph: 'مثال: عملاء اشتروا مرة واحدة' }
      ],
      build: function (v) {
        return 'اكتب ' + v.kind + ' عبر البريد الإلكتروني. المنتج أو العرض: ' + v.offer + '.' + (v.audience ? ' الجمهور: ' + v.audience + '.' : '') +
          ' أعطني: 3 خيارات لسطر العنوان، نص معاينة قصير، نص الرسالة كاملاً مع دعوة واضحة لاتخاذ إجراء، وملاحظة عن أفضل توقيت للإرسال.';
      } },
    { id: 'social', ico: '📱', name: 'منشورات سوشيال', desc: 'كابشن وهاشتاجات لكل منصة',
      fields: [
        { k: 'platform', label: 'المنصة', type: 'select', options: ['إنستغرام', 'تيك توك', 'سناب شات', 'X (تويتر)', 'لينكدإن', 'فيسبوك'] },
        { k: 'topic', label: 'موضوع المنشورات', req: true, ph: 'مثال: افتتاح فرع جديد في الشارقة' },
        { k: 'count', label: 'عدد المنشورات', type: 'select', options: ['3', '5', '7', '10'] }
      ],
      build: function (v) {
        return 'اكتب ' + v.count + ' منشورات ل' + v.platform + ' عن: ' + v.topic + '. لكل منشور: فكرة المحتوى المرئي، الكابشن جاهز للنسخ، دعوة لاتخاذ إجراء، و5 إلى 8 هاشتاجات مناسبة للمنصة وللسوق المستهدف.';
      } },
    { id: 'product', ico: '🏷️', name: 'وصف منتج', desc: 'وصف يبيع للمتاجر الإلكترونية',
      fields: [
        { k: 'product', label: 'اسم المنتج', req: true, ph: 'مثال: ساعة ذكية رياضية X5' },
        { k: 'features', label: 'المميزات والمواصفات', type: 'textarea', req: true, ph: 'مثال: مقاومة للماء، بطارية 10 أيام، قياس نبض…' },
        { k: 'audience', label: 'الجمهور', ph: 'مثال: الرياضيين والمهتمين بالصحة' }
      ],
      build: function (v) {
        return 'اكتب وصف منتج احترافي لمتجر إلكتروني. المنتج: ' + v.product + '. المميزات: ' + v.features + '.' + (v.audience ? ' الجمهور: ' + v.audience + '.' : '') +
          ' أعطني: عنواناً جذاباً، فقرة افتتاحية تركز على الفائدة، قائمة مميزات بصيغة فوائد، فقرة "لمن هذا المنتج"، ووصفاً قصيراً (أقل من 160 حرفاً) يصلح لنتائج البحث.';
      } },
    { id: 'ad', ico: '📣', name: 'إعلان ممول', desc: 'نسخ إعلانية لـ Meta وTikTok وGoogle',
      fields: [
        { k: 'platform', label: 'المنصة', type: 'select', options: ['Meta (إنستغرام وفيسبوك)', 'تيك توك', 'سناب شات', 'إعلانات جوجل', 'لينكدإن'] },
        { k: 'offer', label: 'المنتج أو العرض', req: true, ph: 'مثال: باقة تنظيف منازل بـ [السعر]' },
        { k: 'goal', label: 'هدف الإعلان', type: 'select', options: ['مبيعات', 'رسائل واتساب', 'زيارات للموقع', 'متابعين وتفاعل', 'تحميل تطبيق'] },
        { k: 'count', label: 'عدد النسخ', type: 'select', options: ['3', '5'] }
      ],
      build: function (v) {
        return 'اكتب ' + v.count + ' نسخ إعلانية ممولة على ' + v.platform + '. المنتج أو العرض: ' + v.offer + '. الهدف: ' + v.goal + '.' +
          ' لكل نسخة: العنوان الرئيسي، النص الأساسي، نص الزر المقترح، وفكرة للصورة أو الفيديو. التزم بحدود عدد الحروف المعتادة في المنصة، ونوّع الزاوية بين النسخ (فائدة، عرض، دليل اجتماعي، استعجال).';
      } },
    { id: 'whatsapp', ico: '💬', name: 'رسالة واتساب', desc: 'رسائل عروض ومتابعة قصيرة',
      fields: [
        { k: 'purpose', label: 'الغرض', type: 'select', options: ['إعلان عرض', 'متابعة عميل مهتم', 'تذكير بموعد', 'شكر بعد الشراء', 'طلب تقييم'] },
        { k: 'details', label: 'التفاصيل', req: true, ph: 'مثال: خصم 15% على كل الخدمات حتى نهاية الشهر' }
      ],
      build: function (v) {
        return 'اكتب 3 صيغ مختلفة لرسالة واتساب قصيرة (أقل من 300 حرف) الغرض منها: ' + v.purpose + '. التفاصيل: ' + v.details + '. اجعلها شخصية وغير مزعجة، مع إيموجي باعتدال ودعوة واضحة للرد.';
      } },
    { id: 'reel', ico: '🎬', name: 'سكربت ريلز / تيك توك', desc: 'خطّاف أول 3 ثواني ومشاهد ونص',
      fields: [
        { k: 'topic', label: 'موضوع الفيديو', req: true, ph: 'مثال: 3 أخطاء بتخلي متجرك ما يبيع' },
        { k: 'duration', label: 'المدة', type: 'select', options: ['15 ثانية', '30 ثانية', '60 ثانية'] }
      ],
      build: function (v) {
        return 'اكتب سكربت فيديو قصير (ريلز أو تيك توك) مدته ' + v.duration + ' عن: ' + v.topic + '. قسّمه لمشاهد بتوقيت تقريبي، مع: خطّاف قوي في أول 3 ثواني، النص المنطوق، النص المكتوب على الشاشة، اقتراح للقطات، ودعوة لاتخاذ إجراء في النهاية، ثم كابشن وهاشتاجات.';
      } }
  ];

  // أيقونات القوالب بخط بسيط كما في التصميم (بدل الإيموجي)
  var TPL_SVG = {
    blog: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    social: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
    product: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    ad: '<path d="M4 10v4h3l7 4V6L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    whatsapp: '<path d="M4 5h16v11H9l-5 4z"/>',
    reel: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>'
  };

  function openContent() {
    renderTemplates();
    D.openModal('contentModal', 'contentClose');
  }
  $('contentClose').addEventListener('click', function () { D.closeModal('contentModal'); });

  function renderTemplates() {
    $('contentTitle').textContent = 'مولد المحتوى';
    $('contentSub').textContent = 'اختار نوع المحتوى، واملأ بيانات بسيطة، والباقي علينا.';
    var body = $('contentBody');
    body.innerHTML = '';
    var grid = h('<div class="tpl-grid"></div>');
    TEMPLATES.forEach(function (t) {
      var b = h('<button type="button" class="tpl"><span class="tpl-ico" aria-hidden="true"></span><b></b><span></span></button>');
      var tIco = TPL_SVG[t.id];
      if (tIco) b.querySelector('.tpl-ico').innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + tIco + '</svg>';
      else b.querySelector('.tpl-ico').textContent = t.ico;
      b.querySelector('b').textContent = t.name;
      b.querySelector('span:last-child').textContent = t.desc;
      b.addEventListener('click', function () { renderForm(t); });
      grid.appendChild(b);
    });
    body.appendChild(grid);
  }

  function fieldHtml(f, id, value) {
    var label = '<label for="' + id + '">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>';
    if (f.type === 'select') {
      return '<div class="f">' + label + '<select id="' + id + '">' + f.options.map(function (o) {
        return '<option' + (o === value ? ' selected' : '') + '>' + esc(o) + '</option>';
      }).join('') + '</select></div>';
    }
    if (f.type === 'textarea') return '<div class="f full">' + label + '<textarea id="' + id + '" placeholder="' + esc(f.ph || '') + '"></textarea></div>';
    return '<div class="f">' + label + '<input id="' + id + '" type="text" placeholder="' + esc(f.ph || '') + '"></div>';
  }

  function renderForm(t) {
    var saved = D.store('dfai.brand') || {};
    $('contentTitle').textContent = t.ico + ' ' + t.name;
    $('contentSub').textContent = t.desc;
    var body = $('contentBody');
    body.innerHTML = '';
    var back = h('<button type="button" class="back-link">→ كل القوالب</button>');
    back.addEventListener('click', renderTemplates);
    body.appendChild(back);
    var fields = t.fields.concat([
      { k: 'brand', label: 'اسم النشاط (اختياري)', ph: 'مثال: متجر لمسة' },
      { k: 'tone', label: 'النبرة', type: 'select', options: TONES },
      { k: 'dialect', label: 'اللغة واللهجة', type: 'select', options: DIALECTS }
    ]);
    var form = h('<form class="form-grid" novalidate></form>');
    form.innerHTML = fields.map(function (f) { return fieldHtml(f, 'cg_' + f.k, saved[f.k]); }).join('') +
      '<p id="cgErr" class="form-error full" role="alert" hidden></p>' +
      '<div class="form-foot full"><button type="submit" class="btn-primary">اكتب المحتوى ✨</button>' +
      '<span class="muted">بيتحسب رسالة واحدة من رصيدك اليومي</span></div>';
    if (saved.brand) form.querySelector('#cg_brand').value = saved.brand;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {};
      var missing = null;
      fields.forEach(function (f) {
        v[f.k] = form.querySelector('#cg_' + f.k).value.trim();
        if (f.req && !v[f.k] && !missing) missing = f;
      });
      if (missing) {
        var err = form.querySelector('#cgErr');
        err.textContent = 'اكتب ' + missing.label + '.';
        err.hidden = false;
        form.querySelector('#cg_' + missing.k).focus();
        return;
      }
      D.store('dfai.brand', { brand: v.brand, tone: v.tone, dialect: v.dialect });
      var prompt = t.build(v) +
        (v.brand ? ' اسم النشاط: ' + v.brand + '.' : ' استخدم [اسم النشاط] مكان اسم النشاط.') +
        ' النبرة: ' + v.tone + '. اللغة: ' + v.dialect + '.';
      D.closeModal('contentModal');
      D.newChat();
      D.setTool('write', true);
      D.send(prompt);
    });
    body.appendChild(form);
    var first = form.querySelector('input, textarea, select');
    if (first) first.focus();
  }

  // ======================= Dubai Fans Radar =======================
  var lastInput = null;

  function radarFormHtml(prefill) {
    prefill = prefill || {};
    var left = D.left('radar');
    return '<form id="radarForm" class="card-box" novalidate>' +
      '<h2>حلّل ظهور علامتك</h2>' +
      '<div class="form-grid">' +
      '<div class="f"><label for="rd_brand">اسم العلامة التجارية <span class="req">*</span></label><input id="rd_brand" type="text" maxlength="100" placeholder="مثال: لمسة للعطور / Lamsa Perfumes"><small class="f-hint">لو ليك أكتر من اسم (عربي وإنجليزي) افصل بينهم بـ /</small></div>' +
      '<div class="f"><label for="rd_category">مجال النشاط <span class="req">*</span></label><input id="rd_category" type="text" placeholder="مثال: متاجر عطور أونلاين"></div>' +
      '<div class="f"><label for="rd_market">السوق / المدينة</label><input id="rd_market" type="text" placeholder="مثال: دبي أو الإمارات"></div>' +
      '<div class="f"><label for="rd_website">موقعك الإلكتروني</label><input id="rd_website" type="text" dir="ltr" placeholder="example.com"></div>' +
      '<div class="f full"><label for="rd_comp">المنافسين (لحد 4، افصل بينهم بفاصلة)</label><input id="rd_comp" type="text" placeholder="مثال: عطور الحرمين، أجمل، العربية للعود"></div>' +
      '</div>' +
      '<p id="rdErr" class="form-error" role="alert" hidden></p>' +
      '<div class="form-foot"><button type="submit" class="btn-primary">حلّل الظهور 📡</button>' +
      '<span class="muted">' + (left === Infinity ? 'تحليلات غير محدودة' : 'متبقي ' + left + ' تحليل اليوم') + ' · التحليل بياخد حوالي دقيقة</span></div>' +
      '</form>';
  }

  function openRadar(prefill) {
    var panel = D.showPanel('radar');
    panel.innerHTML =
      '<div class="pv">' +
      '<div class="pv-head"><div class="pv-ico ring-ico" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" transform="rotate(-70 50 50)"></circle></svg></div><div><h1>Dubai Fans Radar</h1>' +
      '<p>شوف علامتك بتظهر قد إيه في نتائج البحث وفي إجابات الذكاء الاصطناعي، مقارنةً بمنافسينك.</p></div></div>' +
      '<div id="radarTop">' + radarFormHtml() + '</div>' +
      '<div id="radarHistory"></div>' +
      '</div>';
    var p = prefill || lastInput;
    if (p) {
      $('rd_brand').value = p.brand || '';
      $('rd_category').value = p.category || '';
      $('rd_market').value = p.market || '';
      $('rd_website').value = p.website || '';
      $('rd_comp').value = (p.competitors || []).join('، ');
    }
    bindRadarForm();
    loadHistory();
  }

  function readRadarForm() {
    return {
      brand: $('rd_brand').value.trim(),
      category: $('rd_category').value.trim(),
      market: $('rd_market').value.trim(),
      website: $('rd_website').value.trim(),
      competitors: $('rd_comp').value.split(/[,،\n]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4)
    };
  }

  function bindRadarForm() {
    $('radarForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = readRadarForm();
      var err = $('rdErr');
      if (input.brand.length < 2 || input.category.length < 2) {
        err.textContent = 'اكتب اسم العلامة ومجال النشاط.';
        err.hidden = false;
        return;
      }
      if (D.left('radar') <= 0) {
        D.openPlans('خلصت تحليلات Radar المتاحة لليوم في باقتك. اشترك في باقة أعلى عشان تكمّل، أو ارجع بكره.');
        return;
      }
      lastInput = input;
      runRadar(input);
    });
  }

  function runRadar(input) {
    var top = $('radarTop');
    var steps = ['البحث في الويب عن مجالك', 'سؤال الذكاء الاصطناعي أسئلة المشترين', 'حساب الظهور مقارنةً بالمنافسين', 'كتابة التوصيات'];
    top.innerHTML = '<div class="card-box"><h2>جارٍ تحليل ' + esc(input.brand) + '…</h2><div class="progress-steps">' +
      steps.map(function (s, i) { return '<div class="pstep' + (i === 0 ? ' on' : '') + '"><span class="dot"></span>' + esc(s) + '</div>'; }).join('') + '</div></div>';
    var els = top.querySelectorAll('.pstep');
    var i = 0;
    var timer = setInterval(function () {
      if (i >= els.length - 1) return;
      els[i].classList.remove('on'); els[i].classList.add('done');
      i += 1; els[i].classList.add('on');
    }, 9000);
    D.apiJson('/api/radar', { method: 'POST', body: JSON.stringify(input) })
      .then(function (r) {
        clearInterval(timer);
        showReport(r.report, r.id);
        D.refreshMe();
        loadHistory();
      })
      .catch(function (ex) {
        clearInterval(timer);
        top.innerHTML = radarFormHtml();
        bindRadarForm();
        $('rd_brand').value = input.brand; $('rd_category').value = input.category; $('rd_market').value = input.market;
        $('rd_website').value = input.website; $('rd_comp').value = input.competitors.join('، ');
        var err = $('rdErr');
        err.textContent = D.netMessage(ex);
        err.hidden = false;
        if (ex.code === 'quota') D.openPlans(ex.message);
      });
  }

  function ring(score) {
    var r = 80, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
    var color = score >= 60 ? '#34D399' : score >= 30 ? '#FBBF24' : '#F87171';
    return '<div class="ring" role="img" aria-label="نتيجة الظهور ' + score + ' من 100"><svg viewBox="0 0 190 190">' +
      '<circle cx="95" cy="95" r="' + r + '" fill="none" stroke="#1A1D27" stroke-width="14"/>' +
      '<circle cx="95" cy="95" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><div class="val"><b>' + score + '</b><span>من 100</span></div></div>';
  }

  D.radarRing = ring;

  function rankTag(rank) {
    if (!rank) return '<span class="rank none">لا يظهر</span>';
    return '<span class="rank ' + (rank <= 3 ? 'good' : 'mid') + '">#' + rank + '</span>';
  }

  function reportHtml(rep) {
    var me = rep.entities.find(function (e) { return e.isBrand; }) || rep.entities[0];
    var maxSov = Math.max.apply(null, rep.entities.map(function (e) { return e.shareOfVoice; }).concat([1]));
    var leads = rep.entities.length > 1 && me && me.shareOfVoice >= maxSov;
    var verdict = rep.score >= 60 ? 'ظهور قوي 💪'
      : rep.score >= 30 ? 'ظهور متوسط، فيه فرصة كبيرة للتحسين'
      : leads ? 'ظهور ضعيف عموماً، بس انت متقدم على المنافسين اللي كتبتهم'
      : rep.entities.length > 1 ? 'ظهور ضعيف، ومنافسينك واخدين المساحة' : 'ظهور ضعيف، فيه فرصة كبيرة للتحسين';
    return '' +
      '<div class="card-box"><div class="score-row">' + ring(rep.score) +
      '<div><h2 style="margin-bottom:6px">' + esc(rep.input.brand) + ' · ' + esc(verdict) + '</h2>' +
      '<p class="report-note" style="margin:0 0 14px">' + esc(rep.input.category) + (rep.input.market ? ' · ' + esc(rep.input.market) : '') + ' · ' + esc(fmtDate(rep.createdAt)) + '</p>' +
      '<div class="metrics">' +
      '<div class="metric"><b>' + me.webVisibility + '%</b><span>الظهور في نتائج الويب</span></div>' +
      '<div class="metric"><b>' + me.aiVisibility + '%</b><span>الذكر في إجابات الذكاء الاصطناعي</span></div>' +
      '<div class="metric"><b>' + me.shareOfVoice + '%</b><span>حصة الصوت أمام المنافسين</span></div>' +
      '<div class="metric"><b>' + (me.bestRank ? '#' + me.bestRank : '—') + '</b><span>أفضل ترتيب في البحث</span></div>' +
      '</div></div></div></div>' +

      (rep.entities.length > 1 ? '<div class="card-box"><h2>مقارنة بالمنافسين (حصة الصوت)</h2><div class="cmp">' +
        rep.entities.map(function (e) {
          return '<div class="cmp-row' + (e.isBrand ? ' me' : '') + '"><span class="cmp-name">' + esc(e.name) + '</span>' +
            '<div class="cmp-bar" aria-hidden="true"><span style="width:' + Math.round((e.shareOfVoice / maxSov) * 100) + '%"></span></div>' +
            '<span class="cmp-val">' + e.shareOfVoice + '%</span></div>';
        }).join('') +
        '</div><p class="cmp-legend">حصة الصوت = نسبة الذكر في نتائج البحث وإجابات الذكاء الاصطناعي مقارنةً ببعض.</p>' +
        '<div style="overflow-x:auto;margin-top:12px"><table class="tbl"><thead><tr><th>الاسم</th><th>ظهور الويب</th><th>أفضل ترتيب</th><th>ذكر الذكاء الاصطناعي</th></tr></thead><tbody>' +
        rep.entities.map(function (e) {
          return '<tr><td>' + esc(e.name) + '</td><td>' + e.webVisibility + '%</td><td>' + rankTag(e.bestRank) + '</td><td>' + e.aiVisibility + '%</td></tr>';
        }).join('') + '</tbody></table></div></div>' : '') +

      (rep.recommendations ? '<div class="card-box"><h2>التوصيات</h2><div class="md">' + D.renderMarkdown(rep.recommendations) + '</div></div>' : '') +

      '<div class="card-box"><h2>نتائج البحث على الويب</h2><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>عملية البحث</th><th>ترتيبك</th><th>مين ظهر</th></tr></thead><tbody>' +
      rep.web.map(function (w) {
        var names = {};
        w.results.forEach(function (r) { r.mentions.forEach(function (n) { names[n] = true; }); });
        var chips = Object.keys(names).map(function (n) { return '<span class="chip-s' + (n === rep.input.brand ? ' me' : '') + '">' + esc(n) + '</span>'; }).join('');
        return '<tr><td>' + esc(w.query) + '</td><td>' + (w.ok ? rankTag(w.brandRank) : '<span class="rank none">تعذّر</span>') + '</td><td><div class="chips">' + (chips || '<span class="muted">—</span>') + '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="card-box"><h2>إجابات الذكاء الاصطناعي على أسئلة المشترين</h2><div class="hist-list">' +
      rep.ai.map(function (a) {
        var chips = a.mentioned.map(function (n) { return '<span class="chip-s' + (n === rep.input.brand ? ' me' : '') + '">' + esc(n) + '</span>'; }).join('');
        return '<div class="hist-item" style="flex-direction:column;align-items:stretch"><div>' + esc(a.question) + '</div>' +
          '<div class="chips" style="margin-top:6px">' + (chips || '<span class="chip-s">ماذكرش أي اسم من القائمة</span>') + '</div>' +
          (a.answer ? '<details class="ans"><summary>اعرض الإجابة</summary><div class="md">' + D.renderMarkdown(a.answer) + '</div></details>' : '') + '</div>';
      }).join('') + '</div></div>' +

      '<p class="report-note">ℹ️ ' + esc(rep.note) + '</p>';
  }

  function showReport(rep, id) {
    var top = $('radarTop');
    if (!top) { openRadar(); top = $('radarTop'); }
    top.innerHTML = '<div class="report-actions" style="margin-bottom:16px">' +
      '<button type="button" id="rdNew" class="btn-ghost">↻ تحليل جديد</button>' +
      '<button type="button" id="rdMonitor" class="btn-primary sm">🔔 تابع العلامة دي تلقائياً</button>' +
      '<button type="button" id="rdAsk" class="btn-ghost">✨ اعمل خطة تحسين بالذكاء الاصطناعي</button>' +
      '</div>' + reportHtml(rep);
    $('rdNew').addEventListener('click', function () { lastInput = rep.input; openRadar(rep.input); });
    $('rdMonitor').addEventListener('click', function () { openMonitors(rep.input); });
    $('rdAsk').addEventListener('click', function () {
      var me = rep.entities.find(function (e) { return e.isBrand; });
      D.newChat();
      D.send('حللت ظهور علامتي "' + rep.input.brand + '" (مجال: ' + rep.input.category + (rep.input.market ? '، السوق: ' + rep.input.market : '') + ').' +
        ' النتيجة: ' + rep.score + '/100. الظهور في الويب ' + me.webVisibility + '%، الذكر في إجابات الذكاء الاصطناعي ' + me.aiVisibility + '%، حصة الصوت ' + me.shareOfVoice + '%.' +
        (rep.input.competitors.length ? ' المنافسون: ' + rep.input.competitors.join('، ') + '.' : '') +
        ' اعمل لي خطة عملية لمدة 30 يوم لتحسين الظهور في جوجل وفي إجابات أدوات الذكاء الاصطناعي، مقسمة بالأسابيع.');
    });
    var panel = $('panel');
    if (panel) panel.scrollTop = 0;
  }

  function openReport(id) {
    openRadar();
    $('radarTop').innerHTML = '<div class="card-box"><div class="progress-steps"><div class="pstep on"><span class="dot"></span>جارٍ فتح التقرير…</div></div></div>';
    D.apiJson('/api/radar/reports/' + id).then(function (r) { showReport(r.report, r.id); D.refreshMe(); })
      .catch(function (ex) { D.toast(D.netMessage(ex)); openRadar(); });
  }

  function loadHistory() {
    D.apiJson('/api/radar/reports').then(function (d) {
      var box = $('radarHistory');
      if (!box) return;
      if (!d.reports.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="card-box"><h2>تحليلاتك السابقة</h2><div class="hist-list"></div></div>';
      var list = box.querySelector('.hist-list');
      d.reports.slice(0, 12).forEach(function (r) {
        var b = h('<button type="button" class="hist-item"><span><b></b> <span class="muted"></span></span><span class="score-pill"></span></button>');
        b.querySelector('b').textContent = r.brand;
        b.querySelector('.muted').textContent = (r.monitorId ? 'متابعة تلقائية · ' : '') + fmtDate(r.at);
        b.querySelector('.score-pill').textContent = r.score;
        b.addEventListener('click', function () { openReport(r.id); });
        list.appendChild(b);
      });
    }).catch(function () {});
  }

  // ======================= المتابعة التلقائية =======================
  function spark(history) {
    var pts = history.slice().reverse();
    if (pts.length < 2) return '';
    var w = 260, hgt = 44, max = 100;
    var step = w / (pts.length - 1);
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (i * step).toFixed(1) + ' ' + (hgt - 4 - (p.score / max) * (hgt - 8)).toFixed(1); }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" role="img" aria-label="تطور النتيجة"><path d="' + d + '" fill="none" stroke="#FB923C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  function monitorCard(m) {
    var last = m.history[0];
    var prev = m.history[1];
    var delta = last && prev ? last.score - prev.score : null;
    var deltaHtml = delta === null ? '' : '<span class="delta ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') + '">' +
      (delta > 0 ? '▲ ' + delta : delta < 0 ? '▼ ' + Math.abs(delta) : 'بدون تغيير') + '</span>';
    var el = h('<div class="mon' + (m.active ? '' : ' paused') + '"></div>');
    el.innerHTML = (m.unseen ? '<span class="mon-new">تقرير جديد</span>' : '') +
      '<div class="mon-top"><div><div class="mon-name"></div><div class="mon-meta"></div></div>' +
      '<div class="mon-score">' + (last ? '<b>' + last.score + '</b>' + deltaHtml : '<span class="mon-meta">⏳ أول تقرير بيتجهز…</span>') + '</div></div>' +
      spark(m.history) +
      '<div class="mon-meta"></div>' +
      '<div class="mon-actions"></div>';
    el.querySelector('.mon-name').textContent = m.brand;
    el.querySelectorAll('.mon-meta')[0].textContent = m.category + (m.market ? ' · ' + m.market : '') + (m.competitors.length ? ' · ضد ' + m.competitors.join('، ') : '');
    el.querySelectorAll('.mon-meta')[el.querySelectorAll('.mon-meta').length - 1].textContent =
      (m.frequency === 'daily' ? 'يومياً' : 'أسبوعياً') + ' · ' + (m.active ? 'التحليل الجاي: ' + fmtDate(m.nextRunAt) : 'متوقفة');
    var actions = el.querySelector('.mon-actions');
    if (m.lastReportId) {
      var view = h('<button type="button" class="btn-primary sm">عرض آخر تقرير</button>');
      view.addEventListener('click', function () { openReport(m.lastReportId); });
      actions.appendChild(view);
    }
    var toggle = h('<button type="button" class="btn-ghost"></button>');
    toggle.textContent = m.active ? 'إيقاف مؤقت' : 'تشغيل';
    toggle.addEventListener('click', function () {
      D.apiJson('/api/monitors/' + m.id + '/active', { method: 'POST', body: JSON.stringify({ active: !m.active }) })
        .then(function () { openMonitors(); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); if (ex.code === 'quota') D.openPlans(ex.message); });
    });
    actions.appendChild(toggle);
    var del = h('<button type="button" class="btn-ghost danger">حذف</button>');
    del.addEventListener('click', function () {
      if (!confirm('حذف متابعة ' + m.brand + ' وكل تقاريرها؟')) return;
      D.apiJson('/api/monitors/' + m.id, { method: 'DELETE' }).then(function () { D.toast('اتحذفت'); openMonitors(); D.refreshMe(); })
        .catch(function (ex) { D.toast(D.netMessage(ex)); });
    });
    actions.appendChild(del);
    return el;
  }

  function openMonitors(prefill) {
    var panel = D.showPanel('monitors');
    panel.innerHTML = '<div class="pv"><div class="pv-head"><div class="pv-ico orange">' + ICON.pulse + '</div><div><h1>المتابعة التلقائية</h1>' +
      '<p>فوّض Dubai Fans AI يتابع علامتك ومنافسينك لوحده، ويطلعلك تقرير يومي أو أسبوعي بتغيّر الظهور.</p></div></div>' +
      '<div id="monBody"><div class="card-box"><div class="progress-steps"><div class="pstep on"><span class="dot"></span>جارٍ التحميل…</div></div></div></div></div>';
    D.apiJson('/api/monitors').then(function (d) { renderMonitors(d, prefill); D.refreshMe(); })
      .catch(function (ex) { $('monBody').innerHTML = '<div class="card-box empty-box"></div>'; $('monBody').firstChild.textContent = D.netMessage(ex); });
  }

  function renderMonitors(d, prefill) {
    var body = $('monBody');
    body.innerHTML = '';
    if (!d.limit) {
      var proPlan = ((D.state.config && D.state.config.plans) || []).filter(function (p) { return p.id !== 'free'; })[0];
      var up = h('<div class="upsell"><span class="upsell-ico" aria-hidden="true">✦</span><p><b>المتابعة التلقائية متاحة في ' + (proPlan ? proPlan.name : 'Pro') + '</b>' +
        'Dubai Fans AI هيحلّل ظهور علامتك ومنافسينك كل يوم أو كل أسبوع، ويحفظلك التقارير ويوريك التغيّر.</p>' +
        '<button type="button" class="btn-primary">' + (proPlan ? 'اشترك في ' + proPlan.name + ' مقابل ' + proPlan.price + ' د.إ.' : 'شوف الاشتراك') + '</button></div>');
      up.querySelector('button').addEventListener('click', function () { D.openPlans(); });
      body.appendChild(up);
    }
    var active = d.monitors.filter(function (m) { return m.active; }).length;
    if (d.limit) {
      var canAdd = active < d.limit;
      var form = h('<form class="card-box" novalidate></form>');
      form.innerHTML = '<h2>متابعة جديدة <span class="muted" style="font-size:13px;font-weight:400;color:var(--muted)">(' + active + ' من ' + d.limit + ' في باقتك)</span></h2>' +
        '<div class="form-grid">' +
        '<div class="f"><label for="mn_brand">اسم العلامة <span class="req">*</span></label><input id="mn_brand" type="text"></div>' +
        '<div class="f"><label for="mn_category">مجال النشاط <span class="req">*</span></label><input id="mn_category" type="text"></div>' +
        '<div class="f"><label for="mn_market">السوق / المدينة</label><input id="mn_market" type="text"></div>' +
        '<div class="f"><label for="mn_freq">كل قد إيه؟</label><select id="mn_freq"><option value="weekly">أسبوعياً</option><option value="daily">يومياً</option></select></div>' +
        '<div class="f"><label for="mn_website">الموقع الإلكتروني</label><input id="mn_website" type="text" dir="ltr"></div>' +
        '<div class="f"><label for="mn_comp">المنافسين (افصل بفاصلة)</label><input id="mn_comp" type="text"></div>' +
        '</div><p id="mnErr" class="form-error" role="alert" hidden></p>' +
        '<div class="form-foot"><button type="submit" class="btn-primary"' + (canAdd ? '' : ' disabled') + '>ابدأ المتابعة 🔔</button>' +
        '<span class="muted">' + (canAdd ? 'أول تقرير هيجهز خلال دقايق' : 'وصلت للحد الأقصى في باقتك') + '</span></div>';
      if (prefill) {
        form.querySelector('#mn_brand').value = prefill.brand || '';
        form.querySelector('#mn_category').value = prefill.category || '';
        form.querySelector('#mn_market').value = prefill.market || '';
        form.querySelector('#mn_website').value = prefill.website || '';
        form.querySelector('#mn_comp').value = (prefill.competitors || []).join('، ');
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = {
          brand: form.querySelector('#mn_brand').value.trim(),
          category: form.querySelector('#mn_category').value.trim(),
          market: form.querySelector('#mn_market').value.trim(),
          website: form.querySelector('#mn_website').value.trim(),
          frequency: form.querySelector('#mn_freq').value,
          competitors: form.querySelector('#mn_comp').value.split(/[,،\n]/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4)
        };
        var err = form.querySelector('#mnErr');
        if (v.brand.length < 2 || v.category.length < 2) { err.textContent = 'اكتب اسم العلامة ومجال النشاط.'; err.hidden = false; return; }
        var btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        D.apiJson('/api/monitors', { method: 'POST', body: JSON.stringify(v) })
          .then(function () { D.toast('المتابعة اشتغلت ✅ أول تقرير خلال دقايق'); openMonitors(); setTimeout(function () { if (D.state.panel === 'monitors') openMonitors(); }, 90000); })
          .catch(function (ex) { btn.disabled = false; err.textContent = D.netMessage(ex); err.hidden = false; if (ex.code === 'quota') D.openPlans(ex.message); });
      });
      body.appendChild(form);
    } else if (prefill) {
      // للباقة المجانية: نوضّح إن المتابعة محتاجة ترقية
      D.openPlans('المتابعة التلقائية متاحة في الباقات المدفوعة.');
    }
    if (d.monitors.length) {
      var wrap = h('<div class="card-box"><h2>متابعاتك</h2><div class="mon-list"></div></div>');
      var list = wrap.querySelector('.mon-list');
      d.monitors.forEach(function (m) { list.appendChild(monitorCard(m)); });
      body.appendChild(wrap);
    } else if (d.limit) {
      body.appendChild(h('<div class="card-box empty-box">لسه مفيش متابعات. ابدأ أول متابعة من فوق 👆</div>'));
    }
  }

  D.openContent = openContent;
  D.openRadar = function () { openRadar(); };
  D.openMonitors = function () { openMonitors(); };
})();
