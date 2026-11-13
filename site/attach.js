/* Dubai Fans AI — رفع الصور والملفات من الموبايل أو الكمبيوتر
   الصور: بتتصغّر في المتصفح وبعدين السيرفر يوصفها بالتفصيل (عشان المساعد يعمل حاجة مشابهة).
   الملفات: بنطلّع النص منها في المتصفح (PDF وWord وExcel وPowerPoint ونصوص). */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;
  var $ = function (id) { return document.getElementById(id); };

  var MAX_ITEMS = 4;
  var MAX_FILE_TEXT = 9000;
  var items = [];
  var seq = 0;
  var FILE_ACCEPT = '.pdf,.docx,.xlsx,.pptx,.txt,.md,.csv,.json,.html,.htm,application/pdf,text/plain,text/csv';

  // ---------- مدخلات الملفات المخفية ----------
  function input(accept, capture, multiple) {
    var i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    if (capture) i.setAttribute('capture', 'environment');
    if (multiple) i.multiple = true;
    i.hidden = true;
    i.addEventListener('change', function () {
      Array.prototype.forEach.call(i.files || [], add);
      i.value = '';
    });
    document.body.appendChild(i);
    return i;
  }
  var inCamera = input('image/*', true, false);
  var inPhotos = input('image/*', false, true);
  var inFiles = input(FILE_ACCEPT + ',image/*', false, true);

  function pick(kind) {
    if (items.length >= MAX_ITEMS) return D.toast('تقدر ترفع ' + MAX_ITEMS + ' مرفقات بس في الرسالة الواحدة.');
    (kind === 'camera' ? inCamera : kind === 'photos' ? inPhotos : inFiles).click();
  }

  // ---------- شريط المرفقات فوق صندوق الكتابة ----------
  var strip = document.createElement('div');
  strip.className = 'att-strip';
  strip.id = 'attStrip';
  var tool = document.querySelector('#composer .composer-tool');
  if (tool) tool.appendChild(strip);

  function render() {
    strip.innerHTML = '';
    items.forEach(function (it) {
      var c = document.createElement('div');
      c.className = 'att-chip ' + it.kind + (it.status === 'loading' ? ' loading' : '') + (it.status === 'error' ? ' error' : '');
      if (it.kind === 'image' && it.thumb) {
        var img = document.createElement('img');
        img.src = it.thumb; img.alt = '';
        c.appendChild(img);
      } else {
        var ic = document.createElement('span');
        ic.className = 'att-ext';
        ic.textContent = ext(it.name);
        c.appendChild(ic);
      }
      var meta = document.createElement('span');
      meta.className = 'att-meta';
      meta.textContent = it.status === 'loading' ? (it.kind === 'image' ? 'بنقرا الصورة…' : 'بنقرا الملف…') : it.status === 'error' ? (it.error || 'مقدرناش نقراه') : it.name;
      c.appendChild(meta);
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'att-x';
      x.setAttribute('aria-label', 'شيل المرفق');
      x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      x.addEventListener('click', function () { items = items.filter(function (o) { return o !== it; }); render(); });
      c.appendChild(x);
      strip.appendChild(c);
    });
    var comp = $('composer');
    if (comp) comp.classList.toggle('has-att', items.length > 0);
    var p = $('prompt');
    if (p) p.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function ext(name) {
    var m = /\.([a-z0-9]{1,5})$/i.exec(name || '');
    return m ? m[1].toUpperCase() : 'FILE';
  }

  // ---------- الإضافة ----------
  function add(file) {
    if (items.length >= MAX_ITEMS) return D.toast('تقدر ترفع ' + MAX_ITEMS + ' مرفقات بس في الرسالة الواحدة.');
    var isImg = /^image\//.test(file.type) || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
    var it = { id: ++seq, kind: isImg ? 'image' : 'file', name: file.name || (isImg ? 'صورة' : 'ملف'), status: 'loading' };
    items.push(it);
    render();
    var job = isImg ? readImage(file, it) : readFile(file, it);
    job.then(function () { it.status = 'ready'; })
      .catch(function (e) { it.status = 'error'; it.error = e && e.message ? e.message : 'مقدرناش نقراه'; })
      .finally(render);
  }

  function loadImage(file) {
    return new Promise(function (ok, bad) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { ok(img); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        var isHeic = /heic|heif/i.test(file.type || '') || /\.(heic|heif)$/i.test(file.name || '');
        if (!isHeic) return bad(new Error('الصورة دي مش مدعومة. جرّب JPG أو PNG.'));
        // صور آيفون (HEIC) المتصفح ما يقراهاش: نحوّلها لـ JPEG أولاً
        convertHeic(file).then(function (blob) { loadImage(blob).then(ok, bad); },
          function () { bad(new Error('ملف HEIC ما اتحولش. احفظ الصورة كـ JPG وجرّب تاني.')); });
      };
      img.src = url;
    });
  }

  // مكتبة تحويل HEIC تتحمّل فقط لما يحتاجها المستخدم
  function convertHeic(file) {
    return new Promise(function (ok, bad) {
      function run() {
        window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
          .then(function (out) { ok(Array.isArray(out) ? out[0] : out); }, bad);
      }
      if (window.heic2any) return run();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = run;
      s.onerror = function () { bad(new Error('تعذّر تحميل محوّل الصور')); };
      document.head.appendChild(s);
    });
  }
  function scaled(img, max, q) {
    var s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * s));
    c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * s));
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }

  function readImage(file, it) {
    if (file.size > 25 * 1024 * 1024) return Promise.reject(new Error('الصورة كبيرة أوي (أكتر من 25 ميجا).'));
    return loadImage(file).then(function (img) {
      it.thumb = scaled(img, 220, 0.72);
      it.src = scaled(img, 512, 0.9);
      render();
      var big = scaled(img, 1024, 0.85);
      return D.apiJson('/api/vision', { method: 'POST', body: JSON.stringify({ image: big }) });
    }).then(function (r) {
      it.desc = r.description;
      if (D.refreshMe) D.refreshMe();
    });
  }

  // ---------- استخراج النص من الملفات ----------
  function readFile(file, it) {
    if (file.size > 15 * 1024 * 1024) return Promise.reject(new Error('الملف كبير أوي (أكتر من 15 ميجا).'));
    var e = ext(file.name);
    var p;
    if (e === 'PDF' || file.type === 'application/pdf') p = pdfText(file);
    else if (e === 'DOCX') p = zipText(file, function (z) { return xmlText(z, /^word\/document\.xml$/, 'w:p'); });
    else if (e === 'PPTX') p = zipText(file, function (z) { return xmlText(z, /^ppt\/slides\/slide\d+\.xml$/, 'a:p', true); });
    else if (e === 'XLSX') p = zipText(file, xlsxText);
    else if (/^(TXT|MD|CSV|JSON|HTML|HTM)$/.test(e) || /^text\//.test(file.type)) p = file.text().then(function (t) { return /^HTML?$/.test(e) ? stripHtml(t) : t; });
    else return Promise.reject(new Error('نوع الملف ده مش مدعوم. ارفع PDF أو Word أو Excel أو PowerPoint أو صورة.'));
    return p.then(function (t) {
      t = String(t || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
      if (!t) throw new Error('الملف فاضي أو صور بس. لو كان صور، ارفعه كصورة.');
      it.truncated = t.length > MAX_FILE_TEXT;
      it.text = t.slice(0, MAX_FILE_TEXT);
    });
  }

  function stripHtml(h) {
    var d = new DOMParser().parseFromString(h, 'text/html');
    Array.prototype.forEach.call(d.querySelectorAll('script,style,noscript'), function (n) { n.remove(); });
    return d.body ? d.body.innerText || d.body.textContent : '';
  }

  var libs = {};
  function loadScript(src) {
    if (libs[src]) return libs[src];
    libs[src] = new Promise(function (ok, bad) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { delete libs[src]; bad(new Error('مقدرناش نحمّل قارئ الملفات.')); };
      document.head.appendChild(s);
    });
    return libs[src];
  }

  function pdfText(file) {
    return import('/vendor/pdf.min.js').then(function (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
      return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: buf }).promise; });
    }).then(function (doc) {
      var n = Math.min(doc.numPages, 30);
      var out = [];
      var chain = Promise.resolve();
      for (var i = 1; i <= n; i++) {
        (function (pg) {
          chain = chain.then(function () { return doc.getPage(pg); }).then(function (page) { return page.getTextContent(); })
            .then(function (tc) { out.push(tc.items.map(function (x) { return x.str + (x.hasEOL ? '\n' : ' '); }).join('')); });
        })(i);
      }
      return chain.then(function () { return out.join('\n\n'); });
    }).catch(function (e) {
      if (e && /password/i.test(e.name || e.message)) throw new Error('الملف عليه باسورد.');
      throw e && e.message && /قارئ/.test(e.message) ? e : new Error('مقدرناش نقرا ملف الـ PDF ده.');
    });
  }

  function zipText(file, fn) {
    return loadScript('/vendor/jszip.min.js').then(function () { return file.arrayBuffer(); })
      .then(function (buf) { return window.JSZip.loadAsync(buf); })
      .then(fn)
      .catch(function (e) { throw e && e.message && /[؀-ۿ]/.test(e.message) ? e : new Error('مقدرناش نفتح الملف ده.'); });
  }

  function byNumber(a, b) {
    var na = +(/(\d+)\.xml$/.exec(a) || [0, 0])[1], nb = +(/(\d+)\.xml$/.exec(b) || [0, 0])[1];
    return na - nb;
  }
  function xmlText(zip, re, paraTag, numbered) {
    var names = Object.keys(zip.files).filter(function (n) { return re.test(n); }).sort(byNumber);
    return Promise.all(names.map(function (n) { return zip.files[n].async('string'); })).then(function (xs) {
      return xs.map(function (x, i) {
        var d = new DOMParser().parseFromString(x, 'application/xml');
        var paras = d.getElementsByTagName(paraTag);
        var lines = [];
        for (var k = 0; k < paras.length; k++) {
          var ts = paras[k].getElementsByTagName(paraTag.split(':')[0] + ':t');
          var line = '';
          for (var j = 0; j < ts.length; j++) line += ts[j].textContent;
          if (line.trim()) lines.push(line);
        }
        return (numbered ? 'شريحة ' + (i + 1) + ':\n' : '') + lines.join('\n');
      }).join('\n\n');
    });
  }

  function xlsxText(zip) {
    var ss = zip.file('xl/sharedStrings.xml');
    return (ss ? ss.async('string') : Promise.resolve('')).then(function (sx) {
      var shared = [];
      if (sx) {
        var sd = new DOMParser().parseFromString(sx, 'application/xml');
        var si = sd.getElementsByTagName('si');
        for (var i = 0; i < si.length; i++) {
          var ts = si[i].getElementsByTagName('t'), s = '';
          for (var j = 0; j < ts.length; j++) s += ts[j].textContent;
          shared.push(s);
        }
      }
      var sheets = Object.keys(zip.files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort(byNumber).slice(0, 5);
      return Promise.all(sheets.map(function (n) { return zip.files[n].async('string'); })).then(function (xs) {
        return xs.map(function (x, si2) {
          var d = new DOMParser().parseFromString(x, 'application/xml');
          var rows = d.getElementsByTagName('row');
          var out = [];
          for (var r = 0; r < rows.length && r < 400; r++) {
            var cells = rows[r].getElementsByTagName('c'), vals = [];
            for (var c = 0; c < cells.length; c++) {
              var t = cells[c].getAttribute('t');
              var v = cells[c].getElementsByTagName('v')[0];
              var is = cells[c].getElementsByTagName('t')[0];
              var val = t === 's' && v ? shared[+v.textContent] : t === 'inlineStr' && is ? is.textContent : v ? v.textContent : '';
              vals.push(val == null ? '' : val);
            }
            if (vals.join('').trim()) out.push(vals.join(' | '));
          }
          return 'ورقة ' + (si2 + 1) + ':\n' + out.join('\n');
        }).join('\n\n');
      });
    });
  }

  // ---------- الواجهة اللي app.js بيستخدمها ----------
  D.attach = {
    pick: pick,
    count: function () { return items.length; },
    readyCount: function () { return items.filter(function (i) { return i.status === 'ready'; }).length; },
    busy: function () { return items.some(function (i) { return i.status === 'loading'; }); },
    // بيرجّع المرفقات الجاهزة وبيفضّي الشريط
    take: function () {
      var ready = items.filter(function (i) { return i.status === 'ready'; }).map(function (i) {
        var o = { kind: i.kind, name: i.name };
        if (i.thumb) o.thumb = i.thumb;
        if (i.desc) o.desc = i.desc;
        if (i.src) o.src = i.src;
        if (i.text) { o.text = i.text; if (i.truncated) o.truncated = true; }
        return o;
      });
      items = [];
      render();
      return ready;
    },
    enabled: function () { var f = D.state.config && D.state.config.features; return !f || f.attach !== false; }
  };

  // سحب وإفلات على الكمبيوتر + لصق صورة
  var main = $('main');
  if (main) {
    main.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') !== -1) { e.preventDefault(); main.classList.add('dropping'); } });
    main.addEventListener('dragleave', function (e) { if (e.target === main) main.classList.remove('dropping'); });
    main.addEventListener('drop', function (e) {
      main.classList.remove('dropping');
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      Array.prototype.forEach.call(e.dataTransfer.files, add);
    });
  }
  var pr = $('prompt');
  if (pr) pr.addEventListener('paste', function (e) {
    var fs = e.clipboardData && e.clipboardData.files;
    if (fs && fs.length) { e.preventDefault(); Array.prototype.forEach.call(fs, add); }
  });
})();
