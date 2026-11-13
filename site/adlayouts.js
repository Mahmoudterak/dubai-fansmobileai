/* Dubai Fans AI — قوالب الإعلانات الاحترافية
   الصورة من نموذج الرسم، والكلام والألوان والتنسيق بيترسموا هنا بخط عربي حقيقي. */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var LAYOUTS = {
    hero: 'صورة كاملة',
    split: 'صورة + لوحة',
    frame: 'إطار أنيق',
    offer: 'عرض وخصم',
    minimal: 'هادئ فاخر',
    overlay: 'كلاسيك',
    clean: 'بدون كتابة'
  };
  var BODY = '"IBM Plex Sans Arabic", "Readex Pro", sans-serif';

  // ---------- ألوان ----------
  function hexRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length !== 6) return [20, 18, 38];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgba(h, a) { var c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lum(h) {
    var c = hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function onColor(h) { return lum(h) > 0.45 ? '#111318' : '#FFFFFF'; }
  function mix(a, b, t) {
    var x = hexRgb(a), y = hexRgb(b);
    return '#' + [0, 1, 2].map(function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  // لون اللوحة لازم يكون غامق كفاية عشان الكلام الأبيض يتقري
  function deep(h) { var c = h; for (var i = 0; i < 6 && lum(c) > 0.12; i++) c = mix(c, '#000000', 0.25); return c; }

  // ---------- أدوات الرسم ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // ---------- الحركة (للفيديو): null = تصميم ثابت ----------
  var AN = null;
  function step(ctx, fn, opt) {
    if (!AN) { fn(); return; }
    var i = AN.seq++;
    var st = AN.start + i * AN.gap;
    var p = Math.max(0, Math.min(1, (AN.t - st) / 0.6));
    if (p <= 0) return;
    var e = 1 - Math.pow(1 - p, 3);
    ctx.save();
    ctx.globalAlpha *= e;
    if (opt && opt.scale) {
      var sc = 0.55 + 0.45 * e + Math.sin(p * Math.PI) * 0.1;
      if (opt.pulse && p >= 1) sc = 1 + 0.045 * Math.max(0, Math.sin((AN.t - st - 0.6) * 4.2));
      ctx.translate(opt.cx, opt.cy); ctx.scale(sc, sc); ctx.translate(-opt.cx, -opt.cy);
    } else {
      ctx.translate(0, (1 - e) * 42 * ((opt && opt.u) || 1));
    }
    fn();
    ctx.restore();
  }
  function cover(ctx, img, x, y, w, h, fy) {
    var s = Math.max(w / img.width, h / img.height);
    var px = 0;
    if (AN) {
      var q = Math.min(1, AN.t / AN.dur);
      q = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      s *= 1.02 + 0.12 * q;
      px = (q - 0.5) * w * 0.04;
    }
    var dw = img.width * s, dh = img.height * s;
    var oy = fy == null ? 0.5 : fy;
    ctx.drawImage(img, x + (w - dw) / 2 + px, y + (h - dh) * oy, dw, dh);
  }
  function wrap(ctx, text, maxW) {
    var words = String(text || '').split(/\s+/).filter(Boolean), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur);
    return lines;
  }
  function fit(ctx, text, maxW, maxLines, size, min, font) {
    var lines = [];
    for (; size >= min; size -= 2) {
      ctx.font = font(size);
      lines = wrap(ctx, text, maxW);
      var widest = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }).concat([0]));
      if (lines.length <= maxLines && widest <= maxW) break;
    }
    if (size < min) size = min;
    ctx.font = font(size);
    // توزيع متوازن للسطور بدل كلمة لوحدها في السطر الأخير
    if (lines.length >= 2 && lines.length <= maxLines) {
      var n = lines.length, lo = maxW * 0.45, hi = maxW;
      for (var k = 0; k < 12; k++) { var mid = (lo + hi) / 2; if (wrap(ctx, text, mid).length <= n) hi = mid; else lo = mid; }
      var bal = wrap(ctx, text, hi);
      if (bal.length === n) lines = bal;
    }
    return { size: size, lines: lines.slice(0, maxLines + 1) };
  }

  // كتلة الكلام: عنوان + سطر + نقاط + زرار. بتتقاس الأول وبعدين تترسم
  function block(ctx, d, o) {
    var u = o.u, f = o.font;
    var hf = function (s) { return f.w + ' ' + s + 'px "' + f.id + '", ' + BODY; };
    var H = d.headline ? fit(ctx, d.headline, o.maxW, o.maxHead || 3, Math.round((o.hSize || 88) * u), Math.round(40 * u), hf) : { size: 0, lines: [] };
    var sSize = Math.round((o.sSize || 34) * u);
    ctx.font = '500 ' + sSize + 'px ' + BODY;
    var S = d.sub ? wrap(ctx, d.sub, o.maxW).slice(0, 3) : [];
    var bSize = Math.round(30 * u);
    var bullets = o.bullets === false ? [] : (d.bullets || []).slice(0, 3);
    var cSize = Math.round(32 * u);
    var gap = Math.round(22 * u);
    var hLH = H.size * 1.28, sLH = sSize * 1.5, bLH = bSize * 1.9;
    var ctaH = d.cta ? Math.round(cSize * 2.5) : 0;
    var bar = o.bar ? Math.round(10 * u) + gap : 0;
    var h = bar + H.lines.length * hLH + (S.length ? gap * 0.6 + S.length * sLH : 0) +
      (bullets.length ? gap + bullets.length * bLH : 0) + (d.cta && !o.noCta ? gap * 1.6 + ctaH : 0);
    return {
      h: h,
      draw: function (top) {
        var y = top, align = o.align || 'right';
        var x = align === 'center' ? o.x + o.maxW / 2 : align === 'right' ? o.x + o.maxW : o.x;
        ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
        if (o.bar) {
          var by = y;
          step(ctx, function () {
            ctx.fillStyle = o.accent;
            var bw = Math.round(70 * u);
            rr(ctx, align === 'center' ? x - bw / 2 : align === 'right' ? x - bw : x, by, bw, Math.round(10 * u), 5 * u); ctx.fill();
          }, { u: u });
          y += bar;
        }
        ctx.font = hf(H.size);
        H.lines.forEach(function (l, i) {
          var ly = y;
          step(ctx, function () {
            ctx.fillStyle = (o.accentLast && i === H.lines.length - 1 && H.lines.length > 1) ? (o.accentText || o.accent) : o.text;
            if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18 * u; }
            ctx.font = hf(H.size);
            ctx.fillText(l, x, ly + hLH / 2);
            ctx.shadowBlur = 0;
          }, { u: u });
          y += hLH;
        });
        ctx.shadowBlur = 0;
        if (S.length) {
          y += gap * 0.6;
          var sy0 = y;
          step(ctx, function () {
            var yy = sy0;
            ctx.fillStyle = o.subText; ctx.font = '500 ' + sSize + 'px ' + BODY;
            S.forEach(function (l) { ctx.fillText(l, x, yy + sLH / 2); yy += sLH; });
          }, { u: u });
          y += S.length * sLH;
        }
        if (bullets.length) {
          y += gap;
          var by2 = y;
          bullets.forEach(function (b) {
            var y = by2; by2 += bLH;
            step(ctx, function () {
            ctx.font = '600 ' + bSize + 'px ' + BODY;
            var cy = y + bLH / 2, r = bSize * 0.5;
            var tw = ctx.measureText(b).width;
            var cx = align === 'right' ? x - r : align === 'center' ? x + (tw + r * 2 + 14 * u) / 2 - r : x + r;
            ctx.fillStyle = o.accent; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = onColor(o.accent); ctx.lineWidth = Math.max(2, 3.5 * u); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy); ctx.lineTo(cx - r * 0.1, cy + r * 0.35); ctx.lineTo(cx + r * 0.45, cy - r * 0.3); ctx.stroke();
            ctx.fillStyle = o.text; ctx.textAlign = 'right';
            ctx.fillText(b, cx - r - 14 * u, cy + 1);
            ctx.textAlign = align;
            }, { u: u });
          });
          y = by2;
        }
        if (d.cta && !o.noCta) {
          y += gap * 1.6;
          ctx.font = '700 ' + cSize + 'px ' + BODY;
          var w = ctx.measureText(d.cta).width + cSize * 2.6;
          var bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
          var cty = y;
          step(ctx, function () {
            ctx.font = '700 ' + cSize + 'px ' + BODY;
            ctx.fillStyle = o.accent; rr(ctx, bx, cty, w, ctaH, ctaH / 2); ctx.fill();
            ctx.fillStyle = onColor(o.accent); ctx.textAlign = 'center';
            ctx.fillText(d.cta, bx + w / 2, cty + ctaH / 2 + 1);
          }, { scale: true, pulse: true, cx: bx + w / 2, cy: cty + ctaH / 2 });
          ctx.textAlign = align;
          y += ctaH;
        }
        return y;
      }
    };
  }

  function contact(b) {
    if (!b) return '';
    return b.whatsapp || b.site || (b.instagram ? '@' + String(b.instagram).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '') : '');
  }
  // سطر العلامة: اللوجو والاسم يمين، وطريقة التواصل شمال
  function footer(ctx, W, y, pad, u, logo, b, color) {
    var has = !!(logo || (b && b.name) || contact(b));
    if (has) step(ctx, function () { footerDraw(ctx, W, y, pad, u, logo, b, color); }, { u: u });
    return has;
  }
  function footerDraw(ctx, W, y, pad, u, logo, b, color) {
    var h = Math.round(56 * u), x = W - pad;
    ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    if (logo) {
      var lh = h, lw = Math.min(170 * u, lh * logo.width / logo.height);
      ctx.drawImage(logo, x - lw, y - lh / 2, lw, lh); x -= lw + 16 * u;
    }
    if (b && b.name) {
      ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.font = '700 ' + Math.round(28 * u) + 'px ' + BODY;
      ctx.fillText(b.name, x, y);
    }
    var c = contact(b);
    if (c) {
      ctx.fillStyle = color; ctx.globalAlpha = 0.85; ctx.textAlign = 'left'; ctx.direction = 'ltr';
      ctx.font = '500 ' + Math.round(26 * u) + 'px ' + BODY;
      ctx.fillText(c, pad, y); ctx.globalAlpha = 1; ctx.direction = 'rtl';
    }
    return !!(logo || (b && b.name) || c);
  }

  function badgeCircle(ctx, text, cx, cy, r, bg, u) {
    step(ctx, function () { badgeDraw(ctx, text, cx, cy, r, bg, u); }, { scale: true, cx: cx, cy: cy });
  }
  function badgeDraw(ctx, text, cx, cy, r, bg, u) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 30 * u; ctx.shadowOffsetY = 8 * u;
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(onColor(bg) === '#FFFFFF' ? '#FFFFFF' : '#111318', 0.35); ctx.lineWidth = 3 * u;
    ctx.beginPath(); ctx.arc(cx, cy, r - 12 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = onColor(bg); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    var words = String(text).split(/\s+/).filter(Boolean);
    var lines = words.length > 1 && String(text).length > 6 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [String(text)];
    var size = r * (lines.length > 1 ? 0.5 : 0.62);
    ctx.font = '800 ' + size + 'px ' + BODY;
    while (size > 14 && Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; })) > r * 1.55) { size -= 2; ctx.font = '800 ' + size + 'px ' + BODY; }
    var lh = size * 1.15, y0 = cy - (lines.length - 1) * lh / 2;
    lines.forEach(function (l, i) { ctx.fillText(l, cx, y0 + i * lh); });
  }

  // ---------- القوالب ----------
  function draw(ctx, img, d, W, H, logo, b, f, anim) {
    AN = anim ? { t: anim.t, dur: anim.dur || 8, start: anim.start == null ? 0.5 : anim.start, gap: anim.gap || 0.16, seq: 0 } : null;
    try { drawInner(ctx, img, d, W, H, logo, b, f); } finally { AN = null; }
  }
  function drawInner(ctx, img, d, W, H, logo, b, f) {
    var u = Math.min(W, H) / 1080;
    var pad = Math.round(Math.min(W, H) * 0.075);
    var primary = d.primary || '#16122E', accent = d.accent || '#7C5CFF';
    var dark = deep(primary);
    var wide = W / H > 1.3;
    var hasFoot0 = !!(logo || (b && b.name) || contact(b));
    var L = d.layout;

    if (L === 'clean') {
      cover(ctx, img, 0, 0, W, H);
      if (logo) footer(ctx, W, H - pad, pad, u, logo, null, '#FFFFFF');
      return;
    }

    if (L === 'hero' || L === 'offer') {
      cover(ctx, img, 0, 0, W, H, 0.35);
      var g;
      if (wide) {
        g = ctx.createLinearGradient(W, 0, W * 0.25, 0);
        g.addColorStop(0, rgba(dark, 0.95)); g.addColorStop(0.55, rgba(dark, 0.75)); g.addColorStop(1, rgba(dark, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        var bw = block(ctx, d, { u: u, font: f, maxW: W * 0.5 - pad, x: W * 0.5, text: '#FFFFFF', subText: 'rgba(255,255,255,.88)', accent: accent, bar: true, bullets: false, hSize: 76, maxHead: 3 });
        bw.draw((H - bw.h) / 2 - 20 * u);
      } else {
        var fh = hasFoot0 ? Math.round(90 * u) : Math.round(10 * u);
        var bk = block(ctx, d, { u: u, font: f, maxW: W - pad * 2, x: pad, text: '#FFFFFF', subText: 'rgba(255,255,255,.88)', accent: accent, bar: true, bullets: false, shadow: true, hSize: H > W * 1.4 ? 100 : 92 });
        var top = H - pad - fh - bk.h;
        g = ctx.createLinearGradient(0, Math.max(0, top - H * 0.28), 0, H);
        g.addColorStop(0, rgba(dark, 0)); g.addColorStop(0.35, rgba(dark, 0.7)); g.addColorStop(1, rgba(dark, 0.96));
        ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, top - H * 0.28), W, H);
        bk.draw(top);
      }
      var sh = ctx.createLinearGradient(0, 0, 0, pad * 2.2);
      sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, 0, W, pad * 2.2);
      if (logo) { var lh = Math.round(64 * u), lw = Math.min(200 * u, lh * logo.width / logo.height); ctx.drawImage(logo, W - pad - lw, pad * 0.7, lw, lh); }
      if (!wide) footer(ctx, W, H - pad * 0.95, pad, u, null, b, '#FFFFFF');
      if (L === 'offer' && d.badge) {
        var r = Math.round((wide ? 120 : 150) * u);
        badgeCircle(ctx, d.badge, pad + r, (logo ? pad * 0.7 : pad * 0.5) + r + 10 * u, r, accent, u);
      }
      return;
    }

    if (L === 'split') {
      if (wide) {
        cover(ctx, img, 0, 0, W * 0.5, H);
        ctx.fillStyle = dark; ctx.fillRect(W * 0.5, 0, W * 0.5, H);
        var bs = block(ctx, d, { u: u, font: f, maxW: W * 0.5 - pad * 2, x: W * 0.5 + pad, text: '#FFFFFF', subText: 'rgba(255,255,255,.82)', accent: accent, bar: true, hSize: 66, maxHead: 3 });
        bs.draw(Math.max(pad * 0.8, (H - bs.h) / 2));
        if (logo) { var l1 = Math.round(48 * u), w1 = Math.min(150 * u, l1 * logo.width / logo.height); ctx.drawImage(logo, pad * 0.6, pad * 0.6, w1, l1); }
        return;
      }
      var foot = hasFoot0 ? Math.round(100 * u) : 0;
      var b2 = block(ctx, d, { u: u, font: f, maxW: W - pad * 2, x: pad, text: '#FFFFFF', subText: 'rgba(255,255,255,.82)', accent: accent, accentLast: true, accentText: mix(accent, '#FFFFFF', 0.35), hSize: 80, maxHead: 3 });
      var panelTop = Math.max(H * 0.42, H - foot - pad * 1.4 - b2.h);
      cover(ctx, img, 0, 0, W, panelTop + 80 * u, 0.4);
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.moveTo(0, panelTop + 50 * u);
      ctx.quadraticCurveTo(W * 0.45, panelTop - 40 * u, W, panelTop - 10 * u);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(W * 0.6, panelTop - 26 * u); ctx.quadraticCurveTo(W * 0.85, panelTop - 30 * u, W, panelTop - 10 * u);
      ctx.lineTo(W, panelTop + 2 * u); ctx.quadraticCurveTo(W * 0.85, panelTop - 16 * u, W * 0.6, panelTop - 12 * u); ctx.closePath(); ctx.fill();
      b2.draw(panelTop + Math.max(pad * 0.7, (H - foot - panelTop - b2.h) / 2));
      footer(ctx, W, H - pad * 0.85, pad, u, logo, b, 'rgba(255,255,255,.9)');
      if (d.badge) badgeCircle(ctx, d.badge, pad + 110 * u, pad + 110 * u, 110 * u, accent, u);
      return;
    }

    if (L === 'frame') {
      var bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, mix(dark, accent, 0.18)); bg.addColorStop(1, dark);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(accent, 0.1); ctx.beginPath(); ctx.arc(W * 0.95, H * 0.02, W * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(accent, 0.1); ctx.beginPath(); ctx.arc(W * 0.04, H * 0.98, W * 0.38, 0, Math.PI * 2); ctx.fill();
      if (wide) {
        var cw = W * 0.44, ch = H - pad * 2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 14 * u;
        rr(ctx, pad, pad, cw, ch, 30 * u); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
        ctx.save(); rr(ctx, pad, pad, cw, ch, 30 * u); ctx.clip(); cover(ctx, img, pad, pad, cw, ch); ctx.restore();
        var bf = block(ctx, d, { u: u, font: f, maxW: W - cw - pad * 3.2, x: cw + pad * 2.2, text: '#FFFFFF', subText: 'rgba(255,255,255,.8)', accent: accent, bar: true, hSize: 64 });
        bf.draw(Math.max(pad, (H - bf.h) / 2));
        return;
      }
      var hdrY = pad * 0.9;
      var hasFoot = footer(ctx, W, hdrY, pad, u, logo, b, 'rgba(255,255,255,.92)');
      var bt = block(ctx, d, { u: u, font: f, maxW: W - pad * 2, x: pad, text: '#FFFFFF', subText: 'rgba(255,255,255,.8)', accent: accent, accentLast: true, accentText: mix(accent, '#FFFFFF', 0.35), noCta: true, hSize: 76, maxHead: 2 });
      var tTop = hasFoot ? hdrY + 60 * u : pad;
      var tEnd = bt.draw(tTop);
      var cH = d.cta ? Math.round(32 * u * 2.5) : 0;
      var cardTop = tEnd + 34 * u, cardBottom = H - pad - (cH ? cH / 2 : 0);
      var cardW = W - pad * 2, cardH = Math.max(H * 0.3, cardBottom - cardTop);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 50 * u; ctx.shadowOffsetY = 18 * u;
      rr(ctx, pad, cardTop, cardW, cardH, 36 * u); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, pad, cardTop, cardW, cardH, 36 * u); ctx.clip(); cover(ctx, img, pad, cardTop, cardW, cardH, 0.45); ctx.restore();
      if (d.cta) {
        ctx.font = '700 ' + Math.round(32 * u) + 'px ' + BODY;
        var w2 = ctx.measureText(d.cta).width + 32 * u * 2.6;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 20 * u;
        ctx.fillStyle = accent; rr(ctx, (W - w2) / 2, cardTop + cardH - cH / 2, w2, cH, cH / 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = onColor(accent); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.cta, W / 2, cardTop + cardH + 1);
      }
      if (d.badge) badgeCircle(ctx, d.badge, pad + 100 * u, cardTop + 100 * u, 95 * u, accent, u);
      return;
    }

    if (L === 'minimal') {
      var paper = mix(primary, '#FFFFFF', 0.92);
      var ink = lum(primary) < 0.2 ? primary : deep(primary);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
      if (wide) {
        var aw = W * 0.42, ah = H - pad * 1.6;
        ctx.save(); arch(ctx, pad, pad * 0.8, aw, ah); ctx.clip(); cover(ctx, img, pad, pad * 0.8, aw, ah); ctx.restore();
        var bm = block(ctx, d, { u: u, font: f, maxW: W - aw - pad * 3.2, x: aw + pad * 2.2, text: ink, subText: rgba(ink, 0.7), accent: ink, bullets: false, hSize: 62 });
        bm.draw(Math.max(pad, (H - bm.h) / 2));
        return;
      }
      var bm2 = block(ctx, d, { u: u, font: f, maxW: W - pad * 2.4, x: pad * 1.2, text: ink, subText: rgba(ink, 0.68), accent: ink, align: 'center', bullets: false, hSize: 70, maxHead: 2 });
      var fH = hasFoot0 ? Math.round(80 * u) : 0;
      var archH = Math.max(H * 0.4, H - pad * 1.1 - bm2.h - fH - 50 * u - pad * 0.6);
      var archW = Math.min(W - pad * 2.6, archH * 0.82);
      ctx.save(); arch(ctx, (W - archW) / 2, pad * 1.1, archW, archH); ctx.clip(); cover(ctx, img, (W - archW) / 2, pad * 1.1, archW, archH); ctx.restore();
      ctx.strokeStyle = rgba(ink, 0.25); ctx.lineWidth = 2 * u;
      arch(ctx, (W - archW) / 2 - 16 * u, pad * 1.1 - 16 * u, archW + 32 * u, archH + 32 * u); ctx.stroke();
      bm2.draw(pad * 1.1 + archH + 50 * u);
      footer(ctx, W, H - pad * 0.8, pad, u, logo, b, ink);
      return;
    }
  }
  function arch(ctx, x, y, w, h) {
    var r = w / 2;
    ctx.beginPath(); ctx.moveTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
  }

  D.adLayouts = { LAYOUTS: LAYOUTS, draw: draw, onColor: onColor };
})();
