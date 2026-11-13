/* Dubai Fans AI — استوديو الإعلان
   نماذج الصور مبتكتبش عربي صح، فبنرسم الكلام فوق الصورة في المتصفح بخط عربي حقيقي. */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var SIZES = {
    square: { w: 1080, h: 1080, label: 'مربع (بوست)' },
    portrait: { w: 1080, h: 1350, label: 'طولي 4:5' },
    story: { w: 1080, h: 1920, label: 'ستوري / ريلز' },
    wide: { w: 1200, h: 628, label: 'عرضي (إعلان/فيسبوك)' }
  };
  var FONTS = [
    { id: 'Readex Pro', label: 'ريدكس (عصري)', w: 700 },
    { id: 'Cairo', label: 'القاهرة', w: 800 },
    { id: 'Tajawal', label: 'تجوال', w: 800 },
    { id: 'Lalezar', label: 'لاله‌زار (عريض)', w: 400 },
    { id: 'Reem Kufi', label: 'ريم كوفي', w: 700 },
    { id: 'IBM Plex Sans Arabic', label: 'بلكس (رسمي)', w: 600 }
  ];
  var THEMES = {
    dark: { label: 'غامق', text: '#FFFFFF', sub: '#E6E8EE', scrim: '0,0,0', cta: '#6D4AFF', ctaText: '#FFFFFF' },
    light: { label: 'فاتح', text: '#111318', sub: '#2A2E3A', scrim: '255,255,255', cta: '#111318', ctaText: '#FFFFFF' },
    brand: { label: 'بنفسجي', text: '#FFFFFF', sub: '#EDE8FF', scrim: '45,20,140', cta: '#FFFFFF', ctaText: '#4B2BD9' }
  };
  var POS = { top: 'أعلى', center: 'وسط', bottom: 'أسفل' };
  var LOGO_POS = { tr: 'أعلى يمين', tl: 'أعلى شمال', br: 'أسفل يمين', bl: 'أسفل شمال' };

  var fontsLinked = false;
  function linkFonts() {
    if (fontsLinked) return;
    fontsLinked = true;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&family=Tajawal:wght@500;800&family=Lalezar&family=Reem+Kufi:wght@500;700&display=swap';
    document.head.appendChild(l);
  }
  function fontInfo(id) { return FONTS.filter(function (f) { return f.id === id; })[0] || FONTS[0]; }
  function ensureFont(id) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var f = fontInfo(id);
    if (f.id !== 'Readex Pro' && f.id !== 'IBM Plex Sans Arabic') linkFonts();
    return Promise.race([
      Promise.all([
        document.fonts.load(f.w + ' 60px "' + f.id + '"', 'أبجد هوز abc'),
        document.fonts.load('500 40px "IBM Plex Sans Arabic"', 'أبجد')
      ]),
      new Promise(function (r) { setTimeout(r, 2500); })
    ]).catch(function () {});
  }

  function logoKey() { return 'dfai.logo.' + ((D.state.me && D.state.me.user && D.state.me.user.id) || 'x'); }
  function getLogo() { return D.store(logoKey()) || ''; }
  // اللوجو بيتحفظ في الحساب على السيرفر، ونسخة على الجهاز للسرعة
  function saveLogo(dataUrl) {
    try { D.store(logoKey(), dataUrl); } catch (e) { /* مساحة الجهاز */ }
    return D.apiJson('/api/business/logo', { method: 'PUT', body: JSON.stringify({ image: dataUrl }) });
  }
  function removeLogo() {
    D.store(logoKey(), null);
    return D.apiJson('/api/business/logo', { method: 'DELETE' }).catch(function () {});
  }
  function syncLogo() {
    if (getLogo()) {
      return D.apiJson('/api/business').then(function (r) { if (r && r.hasLogo === false) saveLogo(getLogo()).catch(function () {}); }).catch(function () {});
    }
    return D.apiJson('/api/business/logo').then(function (r) { if (r && r.image) D.store(logoKey(), r.image); }).catch(function () {});
  }
  function processLogo(fl) {
    return new Promise(function (ok, bad) {
      if (!fl) return bad(new Error('مفيش ملف'));
      if (fl.size > 4 * 1024 * 1024) return bad(new Error('اللوجو كبير. ارفع صورة أقل من 4 ميجا.'));
      var rd = new FileReader();
      rd.onload = function () {
        var i = new Image();
        i.onload = function () {
          var s = Math.min(1, 600 / Math.max(i.width || 600, i.height || 600));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round((i.width || 600) * s));
          c.height = Math.max(1, Math.round((i.height || 600) * s));
          c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/png'));
        };
        i.onerror = function () { bad(new Error('الملف ده مش صورة.')); };
        i.src = rd.result;
      };
      rd.onerror = function () { bad(new Error('مقدرناش نقرا الملف.')); };
      rd.readAsDataURL(fl);
    });
  }

  function defaults() {
    return { headline: '', sub: '', cta: '', pos: 'bottom', theme: 'dark', font: 'Readex Pro', size: 'square', logo: false, logoPos: 'tr',
      layout: 'overlay', badge: '', bullets: [], primary: '', accent: '' };
  }
  function fromOverlay(o) {
    var d = defaults();
    if (o) {
      d.headline = o.headline || ''; d.sub = o.sub || ''; d.cta = o.cta || '';
      if (o.layout && D.adLayouts && D.adLayouts.LAYOUTS[o.layout]) {
        d.layout = o.layout; d.size = 'portrait';
        d.badge = o.badge || ''; d.bullets = Array.isArray(o.bullets) ? o.bullets.slice(0, 3) : [];
        d.primary = o.primary || ''; d.accent = o.accent || '';
      }
    }
    d.logo = !!getLogo();
    return d;
  }
  function isPro(d) { return !!(d && d.layout && d.layout !== 'overlay' && D.adLayouts); }
  function hasText(d) {
    if (!d) return false;
    if (d.layout === 'clean') return !!(d.logo && getLogo());
    if (isPro(d)) return !!(d.headline || d.sub || d.cta || d.badge);
    return !!(d.headline || d.sub || d.cta || (d.logo && getLogo()));
  }

  // بيانات النشاط (الاسم وطريقة التواصل) لسطر العلامة في التصاميم
  var brandP = null;
  function brandInfo() {
    if (!brandP) {
      brandP = D.apiJson('/api/business').then(function (r) {
        var p = (r && r.profile) || {};
        return { name: p.name || '', site: p.website ? String(p.website).replace(/^https?:\/\//, '').replace(/\/$/, '') : '', whatsapp: p.whatsapp || '', instagram: p.instagram || '' };
      }).catch(function () { brandP = null; return { name: '' }; });
    }
    return brandP;
  }

  var imgCache = {};
  function loadImg(src) {
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(function (ok, bad) {
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { delete imgCache[src]; bad(new Error('img')); };
      i.src = src;
    });
    return imgCache[src];
  }

  function isArabic(s) { return /[؀-ۿ]/.test(s); }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h) {
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  // يرسم التصميم كامل ويرجّع canvas
  function compose(src, design, scale) {
    var d = Object.assign(defaults(), design || {});
    var size = SIZES[d.size] || SIZES.square;
    if (isPro(d)) {
      var fp = fontInfo(d.font);
      var lsrc = d.logo ? getLogo() : '';
      return Promise.all([loadImg(src), ensureFont(fp.id), lsrc ? loadImg(lsrc).catch(function () { return null; }) : null, brandInfo()])
        .then(function (r) {
          var k = scale || 1;
          var W = Math.round(size.w * k), H = Math.round(size.h * k);
          var cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          D.adLayouts.draw(cv.getContext('2d'), r[0], d, W, H, r[2], r[3], fp);
          return cv;
        });
    }
    var th = THEMES[d.theme] || THEMES.dark;
    var f = fontInfo(d.font);
    var logoSrc = d.logo ? getLogo() : '';
    return Promise.all([loadImg(src), ensureFont(f.id), logoSrc ? loadImg(logoSrc).catch(function () { return null; }) : null])
      .then(function (r) {
        var img = r[0], logo = r[2];
        var W = size.w, H = size.h;
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');

        // الخلفية: لو المقاس مش مربع، خلفية مموّهة + الصورة كاملة، عشان الصورة متتقصّش كتير
        var ratio = W / H;
        if ((ratio > 1.25 || ratio < 0.7) && Math.abs(img.width / img.height - ratio) > 0.03) {
          ctx.save();
          if ('filter' in ctx) ctx.filter = 'blur(40px) brightness(0.7)';
          drawCover(ctx, img, -60, -60, W + 120, H + 120);
          ctx.restore();
          if (!('filter' in ctx)) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); }
          var s = Math.min(W / img.width, H / img.height);
          if (ratio < 0.7) s = W / img.width; // ستوري: الصورة بعرض الشاشة
          var dw = img.width * s, dh = img.height * s;
          var dy = (H - dh) / 2;
          if (ratio < 0.7) dy = d.pos === 'top' ? H - dh - H * 0.12 : d.pos === 'bottom' ? H * 0.12 : (H - dh) / 2;
          ctx.drawImage(img, (W - dw) / 2, dy, dw, dh);
        } else {
          drawCover(ctx, img, 0, 0, W, H);
        }

        var pad = Math.round(W * 0.07);
        var maxW = W - pad * 2;
        var dir = isArabic(d.headline + d.sub + d.cta) ? 'rtl' : 'ltr';
        ctx.direction = dir;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // قياس العنوان: نصغّر الخط لحد ما يدخل في 3 سطور
        var hSize = Math.round(Math.min(W, H * 1.1) * 0.095);
        var hLines = [];
        if (d.headline) {
          for (; hSize > 28; hSize -= 4) {
            ctx.font = f.w + ' ' + hSize + 'px "' + f.id + '", "IBM Plex Sans Arabic", sans-serif';
            hLines = wrap(ctx, d.headline, maxW);
            var widest = Math.max.apply(null, hLines.map(function (l) { return ctx.measureText(l).width; }));
            if (hLines.length <= 3 && widest <= maxW) break;
          }
        }
        var sSize = Math.round(hSize * 0.45);
        sSize = Math.max(sSize, Math.round(W * 0.032));
        ctx.font = '500 ' + sSize + 'px "IBM Plex Sans Arabic", sans-serif';
        var sLines = d.sub ? wrap(ctx, d.sub, maxW).slice(0, 3) : [];
        var cSize = Math.round(W * 0.036);
        var hLH = hSize * 1.3, sLH = sSize * 1.5;
        var ctaH = d.cta ? cSize * 2.4 : 0;
        var gap = Math.round(W * 0.025);
        var blockH = hLines.length * hLH + (sLines.length ? gap + sLines.length * sLH : 0) + (d.cta ? gap * 1.4 + ctaH : 0);

        var top;
        if (d.pos === 'top') top = pad + (logo && d.logoPos[0] === 't' ? W * 0.12 : 0);
        else if (d.pos === 'center') top = (H - blockH) / 2;
        else top = H - pad - blockH - (logo && d.logoPos[0] === 'b' ? W * 0.12 : 0);

        // تظليل خلف الكلام عشان يتقري على أي صورة
        if (blockH > 0) {
          var c = th.scrim;
          if (d.theme === 'brand') {
            ctx.fillStyle = 'rgba(' + c + ',.82)';
            roundRect(ctx, pad * 0.55, top - gap * 1.6, W - pad * 1.1, blockH + gap * 3.2, Math.round(W * 0.035));
            ctx.fill();
          } else {
            var g;
            var ext = blockH + pad * 2.6;
            if (d.pos === 'top') { g = ctx.createLinearGradient(0, 0, 0, top + ext); g.addColorStop(0, 'rgba(' + c + ',.82)'); g.addColorStop(0.6, 'rgba(' + c + ',.55)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, top + ext); }
            else if (d.pos === 'bottom') { var y0 = top - pad * 2; g = ctx.createLinearGradient(0, y0, 0, H); g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(0.4, 'rgba(' + c + ',.55)'); g.addColorStop(1, 'rgba(' + c + ',.85)'); ctx.fillStyle = g; ctx.fillRect(0, y0, W, H - y0); }
            else { var y1 = top - pad * 1.4, y2 = top + blockH + pad * 1.4; g = ctx.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, 'rgba(' + c + ',0)'); g.addColorStop(0.25, 'rgba(' + c + ',.6)'); g.addColorStop(0.75, 'rgba(' + c + ',.6)'); g.addColorStop(1, 'rgba(' + c + ',0)'); ctx.fillStyle = g; ctx.fillRect(0, y1, W, y2 - y1); }
          }
        }

        var y = top;
        ctx.fillStyle = th.text;
        ctx.shadowColor = d.theme === 'light' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.35)';
        ctx.shadowBlur = hSize * 0.15;
        ctx.font = f.w + ' ' + hSize + 'px "' + f.id + '", "IBM Plex Sans Arabic", sans-serif';
        hLines.forEach(function (l) { ctx.fillText(l, W / 2, y + hLH / 2); y += hLH; });
        if (sLines.length) {
          y += gap;
          ctx.fillStyle = th.sub;
          ctx.shadowBlur = sSize * 0.1;
          ctx.font = '500 ' + sSize + 'px "IBM Plex Sans Arabic", sans-serif';
          sLines.forEach(function (l) { ctx.fillText(l, W / 2, y + sLH / 2); y += sLH; });
        }
        ctx.shadowBlur = 0;
        if (d.cta) {
          y += gap * 1.4;
          ctx.font = '700 ' + cSize + 'px "' + (f.id === 'Lalezar' ? 'Lalezar' : 'IBM Plex Sans Arabic') + '", sans-serif';
          var bw = ctx.measureText(d.cta).width + cSize * 2.6;
          ctx.fillStyle = th.cta;
          roundRect(ctx, (W - bw) / 2, y, bw, ctaH, ctaH / 2);
          ctx.fill();
          ctx.fillStyle = th.ctaText;
          ctx.fillText(d.cta, W / 2, y + ctaH / 2 + 1);
        }

        if (logo) {
          var lw = W * 0.17, lh = lw * logo.height / logo.width;
          if (lh > W * 0.12) { lh = W * 0.12; lw = lh * logo.width / logo.height; }
          var m = W * 0.045;
          var lx = d.logoPos[1] === 'r' ? W - m - lw : m;
          var ly = d.logoPos[0] === 't' ? m : H - m - lh;
          ctx.drawImage(logo, lx, ly, lw, lh);
        }
        return cv;
      });
  }

  function download(src, design) {
    compose(src, design).then(function (cv) {
      cv.toBlob(function (b) {
        D.downloadBlob(b, 'dubai-fans-ai-' + (design.size || 'square') + '-' + Date.now() + '.jpg');
      }, 'image/jpeg', 0.94);
    }).catch(function () { D.toast('مقدرناش نجهز الصورة. جرّب تاني.'); });
  }

  // ---------- نافذة التعديل ----------
  var modal, cur, onSave, cvWrap, renderT, renderSeq = 0;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html != null) e.innerHTML = html;
    return e;
  }

  function seg(name, options, value) {
    var w = el('div', { class: 'ad-seg', role: 'radiogroup' });
    Object.keys(options).forEach(function (k) {
      var b = el('button', { type: 'button', 'data-k': k, role: 'radio' });
      b.textContent = options[k].label || options[k];
      if (k === value) b.className = 'on';
      b.addEventListener('click', function () {
        cur[name] = k;
        Array.prototype.forEach.call(w.children, function (x) { x.className = x === b ? 'on' : ''; });
        schedule();
      });
      w.appendChild(b);
    });
    return w;
  }

  function build() {
    modal = el('div', { class: 'modal', id: 'adModal', hidden: '' });
    modal.innerHTML =
      '<div class="modal-box ad-box" role="dialog" aria-modal="true" aria-labelledby="adTitle">' +
      '<button class="icon-btn modal-close" id="adClose" type="button" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<h2 id="adTitle">صمّم الإعلان</h2>' +
      '<p class="modal-sub">الكلام بيتكتب بخط عربي حقيقي فوق الصورة. عدّل وشوف النتيجة على طول.</p>' +
      '<div class="ad-main"><div class="ad-preview" id="adPreview"></div><div class="ad-form" id="adForm"></div></div>' +
      '<div class="ad-foot"><button class="btn-ghost" type="button" id="adCancel">إلغاء</button>' +
      '<button class="result-btn" type="button" id="adDl">تحميل</button>' +
      '<button class="btn-primary" type="button" id="adSave">حفظ في المحادثة</button></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    modal.querySelector('#adClose').onclick = close;
    modal.querySelector('#adCancel').onclick = close;
    modal.querySelector('#adSave').onclick = function () {
      var d = Object.assign({}, cur);
      delete d.src;
      close();
      if (onSave) onSave(d);
    };
    modal.querySelector('#adDl').onclick = function () { download(cur.src, cur); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
    cvWrap = modal.querySelector('#adPreview');
  }

  function field(label, input, hint) {
    var f = el('label', { class: 'ad-field' });
    f.appendChild(el('span', null, label));
    f.appendChild(input);
    if (hint) f.appendChild(el('small', null, hint));
    return f;
  }
  function textInput(key, ph, max) {
    var i = el('input', { type: 'text', maxlength: String(max), placeholder: ph, dir: 'auto' });
    i.value = cur[key] || '';
    i.addEventListener('input', function () { cur[key] = i.value; schedule(); });
    return i;
  }

  function renderForm() {
    var f = modal.querySelector('#adForm');
    f.innerHTML = '';
    if (D.adLayouts) {
      var ls = seg('layout', D.adLayouts.LAYOUTS, cur.layout || 'overlay');
      ls.addEventListener('click', function () { setTimeout(renderForm, 0); });
      f.appendChild(field('شكل التصميم', ls));
    }
    var pro = isPro(cur);
    if (cur.layout === 'clean') {
      f.appendChild(field('المقاس', seg('size', SIZES, cur.size)));
    } else {
      f.appendChild(field('العنوان', textInput('headline', 'مثلاً: افتتاح فرعنا الجديد', 80)));
      f.appendChild(field('سطر تاني (اختياري)', textInput('sub', 'مثلاً: خصومات لحد آخر الشهر', 140)));
      if (pro && (cur.layout === 'split' || cur.layout === 'frame')) {
        var bt = el('textarea', { rows: '3', maxlength: '130', placeholder: 'كل ميزة في سطر (لحد 3)', dir: 'auto' });
        bt.value = (cur.bullets || []).join('\n');
        bt.addEventListener('input', function () { cur.bullets = bt.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3); schedule(); });
        f.appendChild(field('مميزات (اختياري)', bt));
      }
      f.appendChild(field('زرار (اختياري)', textInput('cta', 'مثلاً: اطلب الآن', 30)));
      if (pro) f.appendChild(field('شارة (خصم أو سعر، اختياري)', textInput('badge', 'مثلاً: خصم 30%', 24)));
      if (pro) {
        var cw = el('div', { class: 'ad-colors' });
        [['primary', 'اللون الأساسي', '#16122E'], ['accent', 'لون الزرار', '#7C5CFF']].forEach(function (c) {
          var lab = el('label', { class: 'ad-color' });
          var inp = el('input', { type: 'color' });
          inp.value = cur[c[0]] || c[2];
          inp.addEventListener('input', function () { cur[c[0]] = inp.value; schedule(); });
          lab.appendChild(inp); lab.appendChild(el('span', null, c[1]));
          cw.appendChild(lab);
        });
        f.appendChild(field('الألوان', cw));
      } else {
        f.appendChild(field('مكان الكلام', seg('pos', POS, cur.pos)));
        f.appendChild(field('الستايل', seg('theme', THEMES, cur.theme)));
      }
      f.appendChild(field('المقاس', seg('size', SIZES, cur.size)));
    }

    var fs = el('select');
    FONTS.forEach(function (x) { var o = el('option', { value: x.id }); o.textContent = x.label; if (x.id === cur.font) o.selected = true; fs.appendChild(o); });
    fs.addEventListener('change', function () { cur.font = fs.value; schedule(); });
    f.appendChild(field('الخط', fs));

    // اللوجو
    var lb = el('div', { class: 'ad-logo' });
    var file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', id: 'adLogoFile', hidden: '' });
    var has = !!getLogo();
    var up = el('button', { type: 'button', class: 'result-btn' }, has ? 'غيّر اللوجو' : 'ارفع اللوجو');
    up.onclick = function () { file.click(); };
    lb.appendChild(up);
    if (has) {
      var chk = el('label', { class: 'ad-check' });
      var cb = el('input', { type: 'checkbox' });
      cb.checked = !!cur.logo;
      cb.onchange = function () { cur.logo = cb.checked; schedule(); };
      chk.appendChild(cb);
      chk.appendChild(document.createTextNode(' اظهر اللوجو'));
      lb.appendChild(chk);
      var rm = el('button', { type: 'button', class: 'btn-ghost ad-rm' }, 'امسح');
      rm.onclick = function () { removeLogo(); cur.logo = false; renderForm(); schedule(); };
      lb.appendChild(rm);
    }
    lb.appendChild(file);
    file.onchange = function () {
      processLogo(file.files && file.files[0]).then(function (url) {
        saveLogo(url).catch(function () { D.toast('اللوجو اتحفظ على الجهاز بس. هيتزامن لما النت يرجع.'); });
        cur.logo = true;
        renderForm();
        schedule();
      }).catch(function (ex) { D.toast(ex.message); });
    };
    f.appendChild(field('اللوجو', lb, has ? null : 'بيتحفظ في حسابك ويتحط على كل تصاميمك.'));
    if (has && !isPro(cur)) f.appendChild(field('مكان اللوجو', seg('logoPos', LOGO_POS, cur.logoPos)));
  }

  function schedule() {
    clearTimeout(renderT);
    renderT = setTimeout(renderPreview, 120);
  }
  function renderPreview() {
    var seq = ++renderSeq;
    compose(cur.src, cur).then(function (cv) {
      if (seq !== renderSeq) return;
      cv.className = 'ad-canvas';
      cvWrap.innerHTML = '';
      cvWrap.appendChild(cv);
    }).catch(function () { cvWrap.innerHTML = '<div class="msg-error">الصورة مش موجودة.</div>'; });
  }

  function open(m, cb) {
    if (!modal) build();
    onSave = cb;
    cur = Object.assign(defaults(), m.design || fromOverlay(null), { src: m.image });
    renderForm();
    cvWrap.innerHTML = '<div class="ad-loading">جارٍ التحضير…</div>';
    modal.hidden = false;
    renderPreview();
    setTimeout(function () { var i = modal.querySelector('#adForm input'); if (i) i.focus(); }, 40);
  }
  function close() { modal.hidden = true; }

  // راسم إطارات للفيديو: نفس التصميم بالحركة
  function frames(src, design, W, H, dur) {
    var d = Object.assign(defaults(), design || {});
    var fp = fontInfo(d.font);
    var lsrc = d.logo ? getLogo() : '';
    return Promise.all([loadImg(src), ensureFont(fp.id), lsrc ? loadImg(lsrc).catch(function () { return null; }) : null, brandInfo()])
      .then(function (r) {
        return function (ctx, t) {
          ctx.clearRect(0, 0, W, H);
          D.adLayouts.draw(ctx, r[0], d, W, H, r[2], r[3], fp, { t: t, dur: dur });
        };
      });
  }
  D.adStudio = { frames: frames, saveLogo: saveLogo, removeLogo: removeLogo, syncLogo: syncLogo, processLogo: processLogo, getLogo: getLogo, resetBrand: function () { brandP = null; }, compose: compose, download: download, open: open, fromOverlay: fromOverlay, hasText: hasText, isPro: isPro, LAYOUTS: function () { return D.adLayouts ? D.adLayouts.LAYOUTS : {}; } };
})();
