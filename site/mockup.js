/* Dubai Fans AI — اعرض تطبيقك أو موقعك (Mockup): سكرين شوت حقيقي من تطبيقك جوه موبايل أو لابتوب في صورة إعلانية.
   الأجهزة بتترسم في المتصفح (شاشات واضحة 100%)، والخلفية ألوان جاهزة أو بالذكاء الاصطناعي. */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var SIZES = {
    square: { w: 1080, h: 1080, label: 'مربع' },
    portrait: { w: 1080, h: 1350, label: '4:5' },
    story: { w: 1080, h: 1920, label: 'ستوري' },
    wide: { w: 1200, h: 628, label: 'عرضي' }
  };
  var LAYOUTS = {
    single: { label: 'موبايل واحد', n: 1 },
    duo: { label: 'موبايلين', n: 2 },
    trio: { label: '3 موبايلات', n: 3 },
    laptop: { label: 'لابتوب (موقع)', n: 1 }
  };
  var BGS = {
    brand: { label: 'بنفسجي', stops: ['#3B1F9E', '#160C3D', '#07080C'], podium: ['#8B6CFF', '#2A1A7A'] },
    ocean: { label: 'أزرق', stops: ['#1D6FA5', '#0E3A5C', '#06121F'], podium: ['#5AB3E6', '#134A73'] },
    night: { label: 'أسود', stops: ['#2A2F42', '#11131A', '#050608'], podium: ['#4B5168', '#1A1D27'] },
    sunset: { label: 'غروب', stops: ['#F97316', '#DB2777', '#4C0B2E'], podium: ['#FDBA74', '#9D174D'] },
    light: { label: 'فاتح', stops: ['#FFFFFF', '#ECEEF5', '#D4D8E4'], podium: ['#FFFFFF', '#C9CEDD'] },
    ai: { label: '✨ بالذكاء الاصطناعي', ai: true }
  };
  var COLORS = {
    black: { label: 'أسود', body: ['#3A3D45', '#0E0F12', '#2A2C33'] },
    silver: { label: 'فضي', body: ['#F2F3F6', '#AEB3BF', '#E4E6EC'] },
    purple: { label: 'بنفسجي', body: ['#B7A5F5', '#5B3FD0', '#9C86EE'] }
  };
  var SPACE = { top: 'فوق', bottom: 'تحت', none: 'من غير' };

  var cur, modal, preview, form, shots = [], aiBg = null, aiBusy = false, renderT, seq = 0;

  function defaults() {
    return { layout: 'trio', bg: 'brand', color: 'black', size: 'square', space: 'top', podium: true, aiStyle: '' };
  }

  // ---------- رسم ----------
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function cover(ctx, img, x, y, w, h, alignTop) {
    var s = Math.max(w / img.width, h / img.height);
    var dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, x + (w - dw) / 2, alignTop ? y : y + (h - dh) / 2, dw, dh);
  }

  function drawBg(ctx, W, H, bg) {
    if (bg.ai && aiBg) { cover(ctx, aiBg, 0, 0, W, H); return; }
    var st = (bg.stops || BGS.brand.stops);
    var g = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, st[0]); g.addColorStop(0.55, st[1]); g.addColorStop(1, st[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // لمعة خفيفة
    var g2 = ctx.createRadialGradient(W * 0.5, H * 0.18, 0, W * 0.5, H * 0.18, W * 0.6);
    g2.addColorStop(0, 'rgba(255,255,255,.10)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPodium(ctx, cx, topY, rx, colors) {
    var ry = rx * 0.17, depth = rx * 0.16;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = rx * 0.15; ctx.shadowOffsetY = rx * 0.05;
    var side = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    side.addColorStop(0, colors[1]); side.addColorStop(0.5, colors[0]); side.addColorStop(1, colors[1]);
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.ellipse(cx, topY + depth, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(cx - rx, topY);
    ctx.ellipse(cx, topY, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    var top = ctx.createLinearGradient(0, topY - ry, 0, topY + ry);
    top.addColorStop(0, shade(colors[0], 0.25)); top.addColorStop(1, colors[0]);
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = Math.max(1, rx * 0.006);
    ctx.stroke();
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function placeholder(ctx, x, y, w, h) {
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#1C1640'); g.addColorStop(1, '#3B2A8F');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '600 ' + Math.round(w * 0.075) + 'px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    ctx.fillText('ارفع سكرين شوت', x + w / 2, y + h / 2);
  }

  function drawPhone(ctx, cx, cy, h, img, color, rot) {
    var w = h * 0.49, r = w * 0.17;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot || 0);
    var x = -w / 2, y = -h / 2;
    // ظل
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = h * 0.07; ctx.shadowOffsetY = h * 0.035;
    var body = ctx.createLinearGradient(x, y, x + w, y + h);
    body.addColorStop(0, color.body[0]); body.addColorStop(0.5, color.body[1]); body.addColorStop(1, color.body[2]);
    ctx.fillStyle = body;
    rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.restore();
    // أزرار جانبية
    ctx.fillStyle = color.body[1];
    rr(ctx, x - w * 0.012, y + h * 0.2, w * 0.016, h * 0.07, w * 0.008); ctx.fill();
    rr(ctx, x - w * 0.012, y + h * 0.3, w * 0.016, h * 0.07, w * 0.008); ctx.fill();
    rr(ctx, x + w - w * 0.004, y + h * 0.25, w * 0.016, h * 0.1, w * 0.008); ctx.fill();
    // إطار أسود
    var b1 = w * 0.03;
    ctx.fillStyle = '#050506';
    rr(ctx, x + b1, y + b1, w - 2 * b1, h - 2 * b1, r - b1); ctx.fill();
    // الشاشة
    var b2 = w * 0.045, sx = x + b2, sy = y + b2, sw = w - 2 * b2, sh = h - 2 * b2;
    ctx.save();
    rr(ctx, sx, sy, sw, sh, r - b2); ctx.clip();
    if (img) cover(ctx, img, sx, sy, sw, sh, true); else placeholder(ctx, sx, sy, sw, sh);
    var gl = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
    gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
    // الجزيرة
    ctx.fillStyle = '#000';
    rr(ctx, -w * 0.15, sy + h * 0.016, w * 0.3, w * 0.085, w * 0.0425); ctx.fill();
    ctx.restore();
    return w;
  }

  function drawLaptop(ctx, cx, cy, width, img, color) {
    var sw = width * 0.84, sh = sw * 0.625, bez = sw * 0.025;
    var x = cx - sw / 2, y = cy - sh / 2 - width * 0.03;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = width * 0.05; ctx.shadowOffsetY = width * 0.025;
    ctx.fillStyle = '#0A0A0C';
    rr(ctx, x, y, sw, sh, sw * 0.03); ctx.fill();
    ctx.restore();
    ctx.save();
    rr(ctx, x + bez, y + bez, sw - 2 * bez, sh - 2 * bez * 1.2, sw * 0.008); ctx.clip();
    if (img) cover(ctx, img, x + bez, y + bez, sw - 2 * bez, sh - 2 * bez * 1.2, true); else placeholder(ctx, x + bez, y + bez, sw - 2 * bez, sh - 2 * bez);
    ctx.restore();
    // القاعدة
    var by = y + sh, bh = width * 0.035;
    var g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, color.body[0]); g.addColorStop(1, color.body[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - width / 2, by + bh * 0.25);
    ctx.lineTo(cx + width / 2, by + bh * 0.25);
    ctx.quadraticCurveTo(cx + width / 2, by + bh, cx + width / 2 - bh, by + bh);
    ctx.lineTo(cx - width / 2 + bh, by + bh);
    ctx.quadraticCurveTo(cx - width / 2, by + bh, cx - width / 2, by + bh * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    rr(ctx, cx - width * 0.08, by + bh * 0.25, width * 0.16, bh * 0.3, bh * 0.15); ctx.fill();
    return by + bh;
  }

  function compose(d) {
    var size = SIZES[d.size] || SIZES.square;
    var W = size.w, H = size.h;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var bg = BGS[d.bg] || BGS.brand;
    drawBg(ctx, W, H, bg);
    var col = COLORS[d.color] || COLORS.black;
    var lay = LAYOUTS[d.layout] ? d.layout : 'trio';
    var spaceFrac = d.space === 'none' ? 0 : (H / W > 1.3 ? 0.2 : 0.26);
    var areaTop = d.space === 'top' ? H * spaceFrac : H * 0.05;
    var areaH = H - H * spaceFrac - H * 0.07;
    var midY = areaTop + areaH / 2;
    var podiumColors = bg.podium || BGS.brand.podium;
    var showPodium = d.podium && !(bg.ai && aiBg);
    var img = function (i) { return shots[i] ? shots[i].img : (shots[0] ? shots[0].img : null); };

    if (lay === 'laptop') {
      var lw = Math.min(W * 0.86, areaH * 1.35);
      if (showPodium) drawPodium(ctx, W / 2, midY + lw * 0.84 * 0.625 / 2 + lw * 0.01, Math.min(W * 0.46, lw * 0.56), podiumColors);
      drawLaptop(ctx, W / 2, midY, lw, img(0), col);
      return cv;
    }
    var h;
    if (lay === 'single') h = Math.min(areaH * 0.9, W * 1.25);
    else if (lay === 'duo') h = Math.min(areaH * 0.86, W * 1.05);
    else h = Math.min(areaH * 0.84, W * 0.8);
    var cy = midY - (showPodium ? h * 0.05 : 0);
    var pw = h * 0.49;
    if (showPodium) {
      var groupW = lay === 'trio' ? pw * 2.4 : lay === 'duo' ? pw * 1.75 : pw * 1.3;
      drawPodium(ctx, W / 2, cy + h * 0.46, Math.min(W * 0.47, groupW * 0.62), podiumColors);
    }
    if (lay === 'single') {
      drawPhone(ctx, W / 2, cy, h, img(0), col, 0);
    } else if (lay === 'duo') {
      drawPhone(ctx, W / 2 + pw * 0.42, cy + h * 0.02, h * 0.94, img(1), col, 0.1);
      drawPhone(ctx, W / 2 - pw * 0.42, cy - h * 0.01, h, img(0), col, -0.06);
    } else {
      var sh = h * 0.86;
      drawPhone(ctx, W / 2 - pw * 0.98, cy + h * 0.05, sh, img(1), col, -0.13);
      drawPhone(ctx, W / 2 + pw * 0.98, cy + h * 0.05, sh, img(2), col, 0.13);
      drawPhone(ctx, W / 2, cy, h, img(0), col, 0);
    }
    return cv;
  }

  // ---------- الواجهة ----------
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }

  function build() {
    modal = el('<div class="modal" id="mockModal" hidden><div class="modal-box ad-box" role="dialog" aria-modal="true" aria-labelledby="mkTitle">' +
      '<button class="icon-btn modal-close" id="mkClose" type="button" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<h2 id="mkTitle">اعرض تطبيقك أو موقعك</h2>' +
      '<p class="modal-sub">ارفع صور شاشات من تطبيقك أو موقعك (سكرين شوت)، وهنحطها جوه موبايل أو لابتوب في صورة إعلانية احترافية جاهزة للنشر.</p>' +
      '<div class="ad-main"><div class="ad-preview" id="mkPreview"></div><div class="ad-form" id="mkForm"></div></div>' +
      '<div class="ad-foot"><button class="btn-ghost" type="button" id="mkCancel">إلغاء</button>' +
      '<button class="btn-primary" type="button" id="mkNext">التالي: أضف العنوان واللوجو</button></div></div></div>');
    document.body.appendChild(modal);
    preview = modal.querySelector('#mkPreview');
    form = modal.querySelector('#mkForm');
    modal.querySelector('#mkClose').onclick = close;
    modal.querySelector('#mkCancel').onclick = close;
    modal.querySelector('#mkNext').onclick = finish;
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
  }

  function seg(key, options) {
    var w = el('<div class="ad-seg" role="radiogroup"></div>');
    Object.keys(options).forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.textContent = options[k].label || options[k];
      if (cur[key] === k) b.className = 'on';
      b.setAttribute('aria-checked', String(cur[key] === k));
      b.onclick = function () {
        cur[key] = k;
        if (key === 'layout' || key === 'bg') renderForm();
        else Array.prototype.forEach.call(w.children, function (x) { x.className = x === b ? 'on' : ''; x.setAttribute('aria-checked', String(x === b)); });
        schedule();
      };
      w.appendChild(b);
    });
    return w;
  }
  function field(label, node, hint) {
    var f = el('<div class="ad-field"><span></span></div>');
    f.firstChild.textContent = label;
    f.appendChild(node);
    if (hint) { var s = document.createElement('small'); s.textContent = hint; f.appendChild(s); }
    return f;
  }

  function renderForm() {
    form.innerHTML = '';
    var need = LAYOUTS[cur.layout].n;
    // السكرين شوتس
    var box = el('<div class="mk-shots"></div>');
    shots.forEach(function (s, i) {
      var t = el('<div class="mk-shot"><img alt=""><span class="mk-n"></span><button type="button" class="att-x" aria-label="شيل الصورة"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>');
      t.querySelector('img').src = s.thumb;
      t.querySelector('.mk-n').textContent = String(i + 1);
      t.querySelector('button').onclick = function () { shots.splice(i, 1); renderForm(); schedule(); };
      box.appendChild(t);
    });
    if (shots.length < 3) {
      var add = el('<button type="button" class="mk-add"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>سكرين شوت</span></button>');
      add.onclick = function () { fileIn.click(); };
      box.appendChild(add);
    }
    form.appendChild(field(cur.layout === 'laptop' ? 'سكرين شوت من موقعك' : 'سكرين شوتس من تطبيقك', box,
      need > 1 ? 'الشكل ده بيعرض ' + need + ' شاشات. لو رفعت أقل، هنكرر الأولى. الصورة رقم 1 بتبقى في النص.' : null));
    form.appendChild(field('الشكل', seg('layout', LAYOUTS)));
    form.appendChild(field('الخلفية', seg('bg', BGS)));
    if (cur.bg === 'ai') {
      var wrap = el('<div class="mk-ai"><input type="text" maxlength="160" dir="auto" placeholder="مثال: استوديو بإضاءة بنفسجي ونيون، فخم"><button type="button" class="result-btn">ولّد الخلفية</button></div>');
      var inp = wrap.querySelector('input'), btn = wrap.querySelector('button');
      inp.value = cur.aiStyle || '';
      inp.oninput = function () { cur.aiStyle = inp.value; };
      btn.disabled = aiBusy;
      if (aiBusy) btn.textContent = 'بنرسم… (10-30 ثانية)';
      btn.onclick = genBg;
      form.appendChild(field('وصف الخلفية', wrap, 'بتتحسب صورة واحدة من رصيد الصور.'));
    }
    form.appendChild(field('لون الجهاز', seg('color', COLORS)));
    form.appendChild(field('مساحة للعنوان', seg('space', SPACE)));
    form.appendChild(field('المقاس', seg('size', SIZES)));
    var pod = el('<label class="ad-check"><input type="checkbox"> منصة تحت الأجهزة</label>');
    pod.querySelector('input').checked = !!cur.podium;
    pod.querySelector('input').onchange = function (e) { cur.podium = e.target.checked; schedule(); };
    if (!(cur.bg === 'ai' && aiBg)) form.appendChild(pod);
  }

  var fileIn = document.createElement('input');
  fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true;
  document.body.appendChild(fileIn);
  fileIn.addEventListener('change', function () {
    var files = Array.prototype.slice.call(fileIn.files || [], 0, 3 - shots.length);
    fileIn.value = '';
    Promise.all(files.map(loadShot)).then(function (list) {
      list.forEach(function (s) { if (s) shots.push(s); });
      renderForm(); schedule();
    });
  });
  function loadShot(file) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(file);
      var i = new Image();
      i.onload = function () {
        var c = document.createElement('canvas');
        var s = Math.min(1, 140 / Math.max(i.width, i.height));
        c.width = Math.round(i.width * s); c.height = Math.round(i.height * s);
        c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
        ok({ img: i, thumb: c.toDataURL('image/jpeg', 0.7) });
      };
      i.onerror = function () { D.toast('الملف ده مش صورة.'); ok(null); };
      i.src = url;
    });
  }

  function genBg() {
    if (aiBusy) return;
    var style = (cur.aiStyle || '').trim() || 'استوديو فخم بإضاءة ناعمة';
    aiBusy = true; renderForm();
    var podiumTxt = cur.podium ? 'an empty round pedestal/podium in the lower center' : 'clean empty space in the center';
    var prompt = style + '. Background scene only for a product mockup: ' + podiumTxt + ', no phones, no devices, no people, no text, no logos, plain and uncluttered, bokeh, professional lighting.';
    D.apiJson('/api/image', { method: 'POST', body: JSON.stringify({ prompt: prompt }) })
      .then(function (r) {
        return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = bad; i.src = r.url; });
      })
      .then(function (i) { aiBg = i; if (D.refreshMe) D.refreshMe(); })
      .catch(function (ex) { D.toast(ex && ex.code === 'quota' ? ex.message : (D.netMessage ? D.netMessage(ex) : 'مقدرناش نرسم الخلفية.')); })
      .finally(function () { aiBusy = false; if (modal && !modal.hidden) { renderForm(); schedule(); } });
  }

  function schedule() { clearTimeout(renderT); renderT = setTimeout(renderPreview, 60); }
  function renderPreview() {
    var my = ++seq;
    var go = function () {
      if (my !== seq) return;
      var cv = compose(cur);
      cv.className = 'ad-canvas';
      preview.innerHTML = '';
      preview.appendChild(cv);
    };
    if (document.fonts && document.fonts.load) document.fonts.load('600 40px "IBM Plex Sans Arabic"', 'أبجد').then(go, go); else go();
  }

  function finish() {
    if (!shots.length) return D.toast('ارفع سكرين شوت واحد على الأقل.');
    if (cur.bg === 'ai' && !aiBg) return D.toast('ولّد الخلفية الأول، أو اختار خلفية جاهزة.');
    var btn = modal.querySelector('#mkNext');
    btn.disabled = true; btn.textContent = 'بنجهّز الصورة…';
    var data = compose(cur).toDataURL('image/jpeg', 0.9);
    D.apiJson('/api/images/upload', { method: 'POST', body: JSON.stringify({ image: data }) })
      .then(function (r) {
        close();
        var design = D.adStudio ? D.adStudio.fromOverlay(null) : null;
        if (design) { design.size = cur.size; design.pos = cur.space === 'bottom' ? 'bottom' : 'top'; }
        var res = D.addImageResult(r.url, 'صورة إعلانية لتطبيقي (' + LAYOUTS[cur.layout].label + ')', design);
        // نفتح استوديو الإعلان على طول عشان يضيف العنوان واللوجو
        setTimeout(function () {
          var b = Array.prototype.filter.call(res.el.querySelectorAll('.result-btn'), function (x) { return /كتابة/.test(x.textContent); })[0];
          if (b) b.click();
        }, 150);
      })
      .catch(function (ex) { D.toast(D.netMessage ? D.netMessage(ex) : 'مقدرناش نحفظ الصورة.'); })
      .finally(function () { btn.disabled = false; btn.textContent = 'التالي: أضف العنوان واللوجو'; });
  }

  function open() {
    if (!modal) build();
    if (D.hidePanel) D.hidePanel();
    cur = Object.assign(defaults(), D.store('dfai.mockup') || {});
    modal.hidden = false;
    renderForm();
    renderPreview();
  }
  function close() {
    if (!modal) return;
    modal.hidden = true;
    var keep = Object.assign({}, cur); delete keep.aiStyle;
    D.store('dfai.mockup', keep);
  }

  D.openMockup = open;
  D.mockup = { compose: compose, shots: shots };
})();
