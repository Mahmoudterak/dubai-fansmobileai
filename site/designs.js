/* Dubai Fans AI — تصميم النصوص: قوائم وتعليقات ونصائح وأسعار في صور جاهزة للنشر
   النص بيترسم في المتصفح بخط عربي حقيقي (مش بنموذج الصور)، وبيتقسم على صفحات تلقائياً. */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var SIZES = { portrait: [1080, 1350, 'بوست 4:5'], square: [1080, 1080, 'مربع'], story: [1080, 1920, 'ستوري'] };
  var THEMES = {
    dark: { label: 'داكن', bg: ['#0B0B12', '#1B1240'], glow: 'rgba(109,74,255,.35)', title: '#FFFFFF', accent: '#9B7BFF', sub: '#A9AEC0', card: '#FFFFFF', cardText: '#14151B', num: '#14151B', numText: '#FFFFFF', foot: '#A9AEC0', link: '#B9A8FF' },
    light: { label: 'فاتح', bg: ['#FFFFFF', '#EEF0F7'], glow: 'rgba(109,74,255,.12)', title: '#111318', accent: '#6D4AFF', sub: '#5B6172', card: '#FFFFFF', cardText: '#14151B', num: '#6D4AFF', numText: '#FFFFFF', foot: '#5B6172', link: '#6D4AFF', border: '#E1E4EE' },
    brand: { label: 'ألوان علامتي', bg: ['#4B2BD9', '#1A0E52'], glow: 'rgba(255,255,255,.18)', title: '#FFFFFF', accent: '#FFD166', sub: '#DCD3FF', card: '#FFFFFF', cardText: '#1A1530', num: '#4B2BD9', numText: '#FFFFFF', foot: '#DCD3FF', link: '#FFFFFF' }
  };
  var TITLE_FONT = '"Readex Pro", "IBM Plex Sans Arabic", sans-serif';
  var BODY_FONT = '"IBM Plex Sans Arabic", sans-serif';

  // ---------- بيانات العلامة (من نشاطي التجاري واللوجو المحفوظ) ----------
  var brand = null;
  D.resetDesignBrand = function () { brand = null; };
  function loadBrand() {
    if (brand) return Promise.resolve(brand);
    var b = { name: 'Dubai Fans AI', site: 'ai.mtuaefans.com', logo: null };
    var uid = D.state.me && D.state.me.user && D.state.me.user.id;
    var logo = uid ? D.store('dfai.logo.' + uid) : null;
    return D.apiJson('/api/business').then(function (r) {
      var p = r.profile || {};
      if (p.name) b.name = p.name;
      if (p.website) b.site = String(p.website).replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (p.brandPrimary) b.primary = p.brandPrimary;
      if (p.brandAccent) b.accent = p.brandAccent;
    }).catch(function () {}).then(function () {
      if (!logo) return b;
      return new Promise(function (ok) { var i = new Image(); i.onload = function () { b.logo = i; ok(b); }; i.onerror = function () { ok(b); }; i.src = logo; });
    }).then(function (x) { brand = x; return x; });
  }

  function shade(hex, t) {
    var h = String(hex).replace('#', '');
    return '#' + [0, 2, 4].map(function (i) { var v = Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - t)); return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function fonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([Promise.all([document.fonts.load('700 60px "Readex Pro"', 'أبجد'), document.fonts.load('500 30px "IBM Plex Sans Arabic"', 'أبجد')]),
      new Promise(function (r) { setTimeout(r, 2500); })]).catch(function () {});
  }

  // ---------- الرسم ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur);
    return lines;
  }
  function toArabicDigits(n) { return String(n); }

  function layout(d, W, H) {
    var pad = 64, headH = pad + 176 + (d.subtitle ? 38 : 0) + 40, footH = 90;
    var cardW = W - pad * 2, numD = 46, inner = cardW - 36 - numD - 18;
    var fs = d.items.length > 40 ? 28 : 30, lh = fs * 1.55;
    var c = document.createElement('canvas').getContext('2d');
    c.font = '500 ' + fs + 'px ' + BODY_FONT; c.direction = 'rtl';
    var cards = d.items.map(function (t) { var lines = wrap(c, t, inner).slice(0, 6); return { text: t, lines: lines, h: Math.max(numD + 20, lines.length * lh + 30) }; });
    var pages = [], cur = [], y = 0, avail = H - headH - footH - 40, gap = 14;
    cards.forEach(function (cd, i) {
      if (cur.length && y + cd.h > avail) { pages.push(cur); cur = []; y = 0; }
      cd.n = i + 1; cur.push(cd); y += cd.h + gap;
    });
    if (cur.length) pages.push(cur);
    return { pages: pages, pad: pad, headH: headH, footH: footH, fs: fs, lh: lh, numD: numD, cardW: cardW, inner: inner, gap: gap };
  }

  function drawPage(d, L, pageIdx, W, H, th, b) {
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var gl = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, W * 0.8);
    gl.addColorStop(0, th.glow); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    var pad = L.pad, total = L.pages.length, items = L.pages[pageIdx];
    ctx.direction = 'rtl'; ctx.textBaseline = 'middle';

    // الهيدر: الشعار والاسم يمين، ورقم الصفحة شمال
    var hx = W - pad, hy = pad + 26;
    if (b.logo) {
      var lh = 52, lw = Math.min(140, lh * b.logo.width / b.logo.height);
      ctx.drawImage(b.logo, hx - lw, hy - lh / 2, lw, lh); hx -= lw + 14;
    }
    ctx.fillStyle = th.title; ctx.textAlign = 'right';
    ctx.font = '700 26px ' + TITLE_FONT;
    ctx.fillText(b.name, hx, hy);
    if (total > 1) {
      var badge = (pageIdx + 1) + ' / ' + total;
      ctx.font = '700 24px ' + TITLE_FONT;
      var bw = ctx.measureText(badge).width + 36;
      ctx.fillStyle = th.num; rr(ctx, pad, hy - 22, bw, 44, 22); ctx.fill();
      ctx.fillStyle = th.numText; ctx.textAlign = 'center'; ctx.direction = 'ltr';
      ctx.fillText(badge, pad + bw / 2, hy + 1); ctx.direction = 'rtl';
    }

    // العنوان: آخر كلمة بلون مميز
    var ty = pad + 120;
    ctx.font = '700 62px ' + TITLE_FONT; ctx.textAlign = 'right';
    var words = String(d.title || '').split(/\s+/).filter(Boolean);
    var last = words.length > 1 ? words.pop() : '';
    var first = words.join(' ');
    var x = W - pad;
    ctx.fillStyle = th.title; ctx.fillText(first + (last ? ' ' : ''), x, ty);
    if (last) { var fw = ctx.measureText(first + ' ').width; ctx.fillStyle = th.accent; ctx.fillText(last, x - fw, ty); }
    var sy = ty + 56;
    ctx.font = '500 26px ' + BODY_FONT; ctx.fillStyle = th.sub;
    if (d.subtitle) { ctx.fillText(d.subtitle, x, sy); sy += 38; }
    if (total > 1) {
      var from = items[0].n, to = items[items.length - 1].n;
      ctx.fillText('العناصر ' + from + ' – ' + to + ' من أصل ' + d.items.length, x, sy);
    }

    // البطاقات
    var y = L.headH;
    items.forEach(function (cd) {
      ctx.fillStyle = th.card;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      rr(ctx, pad, y, L.cardW, cd.h, 18); ctx.fill(); ctx.restore();
      if (th.border) { ctx.strokeStyle = th.border; ctx.lineWidth = 2; rr(ctx, pad, y, L.cardW, cd.h, 18); ctx.stroke(); }
      var cx = W - pad - 18 - L.numD / 2, cy = y + cd.h / 2;
      ctx.fillStyle = th.num; ctx.beginPath(); ctx.arc(cx, cy, L.numD / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = th.numText; ctx.font = '700 22px ' + TITLE_FONT; ctx.textAlign = 'center'; ctx.direction = 'ltr';
      ctx.fillText(toArabicDigits(cd.n), cx, cy + 1); ctx.direction = 'rtl';
      ctx.fillStyle = th.cardText; ctx.font = '500 ' + L.fs + 'px ' + BODY_FONT; ctx.textAlign = 'right';
      var tx = W - pad - 18 - L.numD - 18, ly = cy - (cd.lines.length - 1) * L.lh / 2;
      cd.lines.forEach(function (ln, k) { ctx.fillText(ln, tx, ly + k * L.lh); });
      y += cd.h + L.gap;
    });

    // الذيل
    var fy = H - pad * 0.75;
    ctx.font = '500 22px ' + BODY_FONT; ctx.fillStyle = th.foot; ctx.textAlign = 'right';
    ctx.fillText(d.footer || b.name, W - pad, fy);
    if (b.site) { ctx.fillStyle = th.link; ctx.textAlign = 'left'; ctx.direction = 'ltr'; ctx.font = '700 22px ' + BODY_FONT; ctx.fillText(b.site, pad, fy); ctx.direction = 'rtl'; }
    return cv;
  }

  function render(d) {
    var sz = SIZES[d.size] || SIZES.portrait, th = THEMES[d.theme] || THEMES.dark;
    return Promise.all([loadBrand(), fonts()]).then(function (r) {
      var b = r[0];
      if (d.theme === 'brand' && b.primary) {
        th = Object.assign({}, th, { bg: [b.primary, shade(b.primary, 0.45)], num: b.primary, accent: b.accent || th.accent, glow: 'rgba(255,255,255,.14)' });
      }
      var L = layout(d, sz[0], sz[1]);
      return L.pages.map(function (_, i) { return drawPage(d, L, i, sz[0], sz[1], th, b); });
    });
  }

  function uploadAll(canvases, onProgress) {
    var urls = [], i = 0;
    return canvases.reduce(function (p, cv) {
      return p.then(function () {
        return D.apiJson('/api/images/upload', { method: 'POST', body: JSON.stringify({ image: cv.toDataURL('image/jpeg', 0.92) }) })
          .then(function (r) { urls.push(r.url); if (onProgress) onProgress(++i, canvases.length); });
      });
    }, Promise.resolve()).then(function () { return urls; });
  }

  // ---------- عرض النتيجة في المحادثة ----------
  var libs = {};
  function loadScript(src) {
    if (libs[src]) return libs[src];
    libs[src] = new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { delete libs[src]; bad(new Error('load')); }; document.head.appendChild(s); });
    return libs[src];
  }
  function fetchBytes(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('img'); return r.arrayBuffer(); }); }
  function fname(m, ext) { return (D.safeName ? D.safeName((m.design && m.design.title) || 'design') : 'design') + ext; }

  function downloadZip(m, btn) {
    btn.disabled = true;
    loadScript('/vendor/jszip.min.js').then(function () {
      var zip = new window.JSZip();
      return Promise.all(m.gallery.map(function (u, i) { return fetchBytes(u).then(function (b) { zip.file('design-' + String(i + 1).padStart(2, '0') + '.jpg', b); }); }))
        .then(function () { return zip.generateAsync({ type: 'blob' }); });
    }).then(function (blob) { D.downloadBlob(blob, fname(m, '.zip')); })
      .catch(function () { D.toast('مقدرناش نجهّز الملف. جرّب تاني.'); })
      .finally(function () { btn.disabled = false; });
  }
  function downloadPdf(m, btn) {
    btn.disabled = true;
    loadScript('/vendor/pdf-lib.min.js').then(function () {
      var P = window.PDFLib;
      return P.PDFDocument.create().then(function (doc) {
        return m.gallery.reduce(function (p, u) {
          return p.then(function () { return fetchBytes(u); }).then(function (b) { return doc.embedJpg(b); }).then(function (img) {
            var w = img.width / 2, h = img.height / 2;
            doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
          });
        }, Promise.resolve()).then(function () { return doc.save(); });
      });
    }).then(function (bytes) { D.downloadBlob(new Blob([bytes], { type: 'application/pdf' }), fname(m, '.pdf')); })
      .catch(function () { D.toast('مقدرناش نجهّز ملف PDF. جرّب تاني.'); })
      .finally(function () { btn.disabled = false; });
  }

  function btn(label, icon, fn) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'result-btn';
    b.innerHTML = icon + '<span></span>'; b.querySelector('span').textContent = label;
    b.addEventListener('click', function () { fn(b); });
    return b;
  }
  var ICON_DL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>';
  var ICON_ED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  function renderGallery(el, m) {
    var md = el.querySelector('.md');
    md.innerHTML = '';
    var head = document.createElement('p');
    head.className = 'gal-head';
    head.textContent = 'جهّزتلك ' + m.gallery.length + (m.gallery.length === 1 ? ' تصميم' : ' تصاميم') + ' بعنوان "' + ((m.design && m.design.title) || '') + '" (' + ((m.design && m.design.items.length) || 0) + ' عنصر، بنفس النص اللي بعته).';
    md.appendChild(head);
    var grid = document.createElement('div');
    grid.className = 'gal-grid' + (m.gallery.length === 1 ? ' one' : '');
    m.gallery.forEach(function (u, i) {
      var a = document.createElement('a');
      a.href = u; a.target = '_blank'; a.rel = 'noopener';
      var im = document.createElement('img'); im.src = u; im.alt = 'صفحة ' + (i + 1); im.loading = 'lazy';
      im.onerror = function () { a.classList.add('gone'); };
      a.appendChild(im);
      grid.appendChild(a);
    });
    md.appendChild(grid);
    var extra = el.querySelector('.extra');
    extra.innerHTML = '';
    var actions = document.createElement('div'); actions.className = 'result-actions';
    if (m.gallery.length > 1) actions.appendChild(btn('تحميل الكل (ZIP)', ICON_DL, function (b) { downloadZip(m, b); }));
    actions.appendChild(btn(m.gallery.length > 1 ? 'تحميل PDF' : 'تحميل PDF', ICON_DL, function (b) { downloadPdf(m, b); }));
    if (m.gallery.length === 1) {
      var one = document.createElement('a'); one.className = 'result-btn'; one.href = m.gallery[0]; one.download = fname(m, '.jpg');
      one.innerHTML = ICON_DL + '<span>تحميل الصورة</span>'; actions.appendChild(one);
    }
    actions.appendChild(btn('عدّل التصميم', ICON_ED, function () { openEditor(m, el); }));
    extra.appendChild(actions);
  }

  // ---------- تعديل التصميم ----------
  var modal;
  function openEditor(m, el) {
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal'; modal.id = 'designModal'; modal.hidden = true;
      modal.innerHTML = '<div class="modal-box modal-md" role="dialog" aria-modal="true" aria-labelledby="dsTitle">' +
        '<button class="icon-btn modal-close" type="button" id="dsClose" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '<h2 id="dsTitle">عدّل التصميم</h2><p class="modal-sub">كل سطر في خانة النصوص بيبقى بطاقة لوحده، والصفحات بتتقسم تلقائياً.</p>' +
        '<div class="ds-form"><label class="ad-field"><span>العنوان</span><input type="text" id="dsT" maxlength="80"></label>' +
        '<label class="ad-field"><span>سطر تحت العنوان (اختياري)</span><input type="text" id="dsS" maxlength="120"></label>' +
        '<label class="ad-field"><span>النصوص (كل سطر عنصر)</span><textarea id="dsI" rows="10"></textarea></label>' +
        '<label class="ad-field"><span>نص الذيل (اختياري)</span><input type="text" id="dsF" maxlength="80" placeholder="مثال: دبي فانز · إدارة التفاعل"></label>' +
        '<div class="ad-field"><span>الستايل</span><div class="ad-seg" id="dsTheme"></div></div>' +
        '<div class="ad-field"><span>المقاس</span><div class="ad-seg" id="dsSize"></div></div></div>' +
        '<div class="ad-foot"><button type="button" class="btn-ghost" id="dsCancel">إلغاء</button><button type="button" class="btn-primary" id="dsGo">حدّث التصميم</button></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('#dsClose').onclick = modal.querySelector('#dsCancel').onclick = function () { modal.hidden = true; };
      modal.addEventListener('click', function (e) { if (e.target === modal) modal.hidden = true; });
    }
    var d = m.design;
    var cur = { theme: d.theme || 'dark', size: d.size || 'portrait' };
    modal.querySelector('#dsT').value = d.title || '';
    modal.querySelector('#dsS').value = d.subtitle || '';
    modal.querySelector('#dsI').value = (d.items || []).join('\n');
    modal.querySelector('#dsF').value = d.footer || '';
    function seg(id, opts, key) {
      var w = modal.querySelector(id); w.innerHTML = '';
      Object.keys(opts).forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = opts[k].label || opts[k][2];
        b.className = cur[key] === k ? 'on' : '';
        b.onclick = function () { cur[key] = k; Array.prototype.forEach.call(w.children, function (x) { x.className = x === b ? 'on' : ''; }); };
        w.appendChild(b);
      });
    }
    seg('#dsTheme', THEMES, 'theme'); seg('#dsSize', SIZES, 'size');
    var go = modal.querySelector('#dsGo');
    go.onclick = function () {
      var nd = {
        title: modal.querySelector('#dsT').value.trim() || 'قائمة', subtitle: modal.querySelector('#dsS').value.trim(),
        items: modal.querySelector('#dsI').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 200),
        footer: modal.querySelector('#dsF').value.trim(), theme: cur.theme, size: cur.size
      };
      if (!nd.items.length) return D.toast('اكتب نص واحد على الأقل.');
      go.disabled = true; go.textContent = 'بنجهّز…';
      render(nd).then(function (cvs) { return uploadAll(cvs, function (i, n) { go.textContent = 'بنحفظ ' + i + ' / ' + n; }); })
        .then(function (urls) { m.design = nd; m.gallery = urls; D.saveChats(); renderGallery(el, m); modal.hidden = true; })
        .catch(function (ex) { D.toast(D.netMessage ? D.netMessage(ex) : 'حصلت مشكلة.'); })
        .finally(function () { go.disabled = false; go.textContent = 'حدّث التصميم'; });
    };
    modal.hidden = false;
  }

  // ---------- التوجيه داخل أداة الصور ----------
  function routeImage(chat, text, fallback) {
    var el = D.addAiShell(true);
    D.setStreaming(true);
    D.scrollDown(true);
    D.apiJson('/api/design/route', { method: 'POST', body: JSON.stringify({ messages: D.historyFor(chat) }) })
      .then(function (r) {
        if (!r || r.action === 'image' || !r.action) {
          el.remove(); D.setStreaming(false); fallback(); return;
        }
        if (r.action === 'chat') {
          var m = { role: 'assistant', content: r.reply };
          chat.messages.push(m); D.saveChats();
          D.finalizeAi(el, r.reply, m);
          return finish();
        }
        var dsn = { title: r.title, subtitle: r.subtitle || '', items: r.items, footer: '', theme: r.theme, size: r.size };
        el.querySelector('.md').innerHTML = '<div class="img-pending"><div class="orb thinking" aria-hidden="true"></div><span>بصمّم ' + r.items.length + ' عنصر…</span></div>';
        return render(dsn).then(function (cvs) {
          var span = el.querySelector('.img-pending span');
          return uploadAll(cvs, function (i, n) { if (span) span.textContent = 'بحفظ الصفحة ' + i + ' من ' + n + '…'; });
        }).then(function (urls) {
          var m2 = { role: 'assistant', content: '', gallery: urls, design: dsn };
          chat.messages.push(m2); D.saveChats();
          renderGallery(el, m2);
          finish();
        });
      })
      .catch(function (ex) {
        if (ex && ex.code === 'quota') { el.remove(); D.setStreaming(false); return D.openPlans(ex.message); }
        el.querySelector('.md').innerHTML = '<div class="msg-error"></div>';
        el.querySelector('.msg-error').textContent = D.netMessage ? D.netMessage(ex) : 'حصلت مشكلة.';
        finish();
      });
    function finish() { D.setStreaming(false); D.scrollDown(false); if (D.refreshMe) D.refreshMe(); }
  }

  D.routeImage = routeImage;
  D.renderGallery = renderGallery;
  D.textDesign = { render: render };
})();
