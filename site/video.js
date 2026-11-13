/* Dubai Fans AI — إعلان فيديو للريلز وتيك توك (MP4) يتعمل بالكامل في المتصفح
   الصورة بتتحرك ببطء والكلام بيظهر بأنيميشن. ترميز H.264 بـ WebCodecs، وتغليف MP4 هنا من غير مكتبات. */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  var W = 1080, H = 1920, FPS = 30, DUR = 8;

  // ---------- تغليف MP4 بسيط (مسار فيديو واحد H.264) ----------
  function u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function u16(n) { return [(n >>> 8) & 255, n & 255]; }
  function str(s) { return Array.prototype.map.call(s, function (c) { return c.charCodeAt(0); }); }
  function concat(parts) {
    var len = 0; parts.forEach(function (p) { len += p.length; });
    var out = new Uint8Array(len), o = 0;
    parts.forEach(function (p) { out.set(p, o); o += p.length; });
    return out;
  }
  function box(type) {
    var parts = Array.prototype.slice.call(arguments, 1).map(function (p) { return p instanceof Uint8Array ? p : new Uint8Array(p); });
    var body = concat(parts);
    return concat([new Uint8Array(u32(body.length + 8).concat(str(type))), body]);
  }
  function full(type, version, flags) {
    var rest = Array.prototype.slice.call(arguments, 3);
    return box.apply(null, [type, [version].concat(u32(flags).slice(1))].concat(rest));
  }
  var MATRIX = [].concat(u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000));

  function buildMp4(samples, avcC, width, height, fps) {
    var TS = 90000, delta = TS / fps, n = samples.length;
    var durMs = Math.round(n * 1000 / fps), durTs = n * delta;
    var ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
    var sizes = [], keys = [];
    samples.forEach(function (s, i) { sizes = sizes.concat(u32(s.data.length)); if (s.key) keys = keys.concat(u32(i + 1)); });
    function moov(offset) {
      var compressor = new Array(32).fill(0);
      var avc1 = box('avc1', new Array(6).fill(0), u16(1), new Array(16).fill(0), u16(width), u16(height),
        u32(0x00480000), u32(0x00480000), u32(0), u16(1), compressor, u16(0x18), u16(0xffff), box('avcC', avcC));
      var stbl = box('stbl',
        full('stsd', 0, 0, u32(1), avc1),
        full('stts', 0, 0, u32(1), u32(n), u32(delta)),
        full('stss', 0, 0, u32(keys.length / 4), keys),
        full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1)),
        full('stsz', 0, 0, u32(0), u32(n), sizes),
        full('stco', 0, 0, u32(1), u32(offset)));
      var minf = box('minf', full('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)),
        box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))), stbl);
      var mdia = box('mdia', full('mdhd', 0, 0, u32(0), u32(0), u32(TS), u32(durTs), u16(0x55c4), u16(0)),
        full('hdlr', 0, 0, u32(0), str('vide'), u32(0), u32(0), u32(0), str('VideoHandler'), [0]), minf);
      var tkhd = full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durMs), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0),
        MATRIX, u32(width * 65536), u32(height * 65536));
      var mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0),
        MATRIX, new Array(24).fill(0), u32(2));
      return box('moov', mvhd, box('trak', tkhd, mdia));
    }
    var dataLen = 0; samples.forEach(function (s) { dataLen += s.data.length; });
    var m0 = moov(0);
    var offset = ftyp.length + m0.length + 8;
    var mdatHead = new Uint8Array(u32(dataLen + 8).concat(str('mdat')));
    return new Blob([ftyp, moov(offset), mdatHead].concat(samples.map(function (s) { return s.data; })), { type: 'video/mp4' });
  }

  // ---------- الترميز ----------
  function pickCodec(w, h) {
    var list = ['avc1.640028', 'avc1.4d0028', 'avc1.640033', 'avc1.42003e'];
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(null);
      var cfg = { codec: list[i++], width: w, height: h, bitrate: 6000000, framerate: FPS, avc: { format: 'avc' } };
      return VideoEncoder.isConfigSupported(cfg).then(function (r) { return r.supported ? cfg : next(); }, next);
    }
    return next();
  }

  // الفريم لازم يكون فيه محتوى: لو نقاط العيّنة كلها لون واحد يبقى الصورة ما اتحمّلتش/ما اترسمتش.
  function looksBlank(ctx) {
    try {
      var first = null, distinct = 0;
      for (var gy = 1; gy < 8; gy++) {
        for (var gx = 1; gx < 8; gx++) {
          var d = ctx.getImageData(Math.round(W * gx / 8), Math.round(H * gy / 8), 1, 1).data;
          var key = d[0] + ',' + d[1] + ',' + d[2];
          if (first === null) first = key; else if (key !== first) distinct++;
        }
      }
      return distinct < 3;
    } catch (e) { return false; }
  }

  function encodeWebCodecs(draw, onProgress) {
    return pickCodec(W, H).then(function (cfg) {
      if (!cfg) throw new Error('no-codec');
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      var samples = [], avcC = null, failed = null;
      var enc = new VideoEncoder({
        output: function (chunk, meta) {
          if (meta && meta.decoderConfig && meta.decoderConfig.description && !avcC) {
            var desc = meta.decoderConfig.description;
            avcC = new Uint8Array(desc.buffer ? desc.buffer.slice(desc.byteOffset || 0, (desc.byteOffset || 0) + desc.byteLength) : desc);
          }
          var data = new Uint8Array(chunk.byteLength);
          chunk.copyTo(data);
          samples.push({ data: data, key: chunk.type === 'key' });
        },
        error: function (e) { failed = e; }
      });
      enc.configure(cfg);
      var total = DUR * FPS, i = 0;
      function loop() {
        if (failed) return Promise.reject(failed);
        if (i >= total) return enc.flush();
        if (enc.encodeQueueSize > 6) return new Promise(function (r) { setTimeout(r, 8); }).then(loop);
        draw(ctx, i / FPS);
        if (i === 0 && looksBlank(ctx)) {
          try { enc.close(); } catch (e) { /* تجاهل */ }
          return Promise.reject(new Error('blank-frame'));
        }
        var vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
        vf.close();
        i++;
        if (onProgress && i % 6 === 0) onProgress(i / total);
        return (i % 10 === 0 ? new Promise(function (r) { setTimeout(r, 0); }) : Promise.resolve()).then(loop);
      }
      return loop().then(function () {
        enc.close();
        if (failed) throw failed;
        var bytes = 0;
        samples.forEach(function (s) { bytes += s.data.length; });
        // فيديو 8 ثواني بدقة 1080x1920 ما يكونش أقل من كذا إلا لو فاضي
        if (!avcC || !samples.length || bytes < 20000) throw new Error('empty-video');
        return { blob: buildMp4(samples, avcC, W, H, FPS), ext: 'mp4' };
      });
    });
  }

  // احتياطي: تسجيل مباشر بالوقت الحقيقي (MP4 لو المتصفح بيدعمه، وإلا WebM)
  function encodeRecorder(draw, onProgress) {
    return new Promise(function (ok, bad) {
      var cv = document.createElement('canvas'); cv.width = 720; cv.height = 1280;
      var ctx = cv.getContext('2d');
      var big = document.createElement('canvas'); big.width = W; big.height = H;
      var bctx = big.getContext('2d');
      var types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      var type = types.filter(function (t) { return window.MediaRecorder && MediaRecorder.isTypeSupported(t); })[0];
      if (!type || !cv.captureStream) return bad(new Error('unsupported'));
      var rec = new MediaRecorder(cv.captureStream(FPS), { mimeType: type, videoBitsPerSecond: 5000000 });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () { ok({ blob: new Blob(chunks, { type: type.split(';')[0] }), ext: type.indexOf('mp4') >= 0 ? 'mp4' : 'webm' }); };
      var t0 = null;
      function frame(now) {
        if (t0 == null) t0 = now;
        var t = (now - t0) / 1000;
        draw(bctx, Math.min(t, DUR));
        ctx.drawImage(big, 0, 0, cv.width, cv.height);
        if (onProgress) onProgress(Math.min(1, t / DUR));
        if (t < DUR) requestAnimationFrame(frame); else rec.stop();
      }
      rec.start(250);
      requestAnimationFrame(frame);
    });
  }

  function make(m, onProgress) {
    var A = D.adStudio;
    if (!A || !A.frames || !m || !m.image) return Promise.reject(new Error('التصميم مش جاهز.'));
    var design = Object.assign({}, m.design || {}, { size: 'story' });
    if (!design.layout || design.layout === 'overlay') design.layout = 'hero';
    return A.frames(m.image, design, W, H, DUR).then(function (draw) {
      var useWc = typeof VideoEncoder === 'function' && typeof VideoFrame === 'function';
      // لو الفريم فاضي ما نعملش مسار احتياطي (هيطلع فاضي برضه): نوقف ونبلّغ المستخدم
      return (useWc ? encodeWebCodecs(draw, onProgress).catch(function (e) {
        if (e && e.message === 'blank-frame') throw e;
        return encodeRecorder(draw, onProgress);
      }) : encodeRecorder(draw, onProgress));
    });
  }

  D.adVideo = { make: make, _buildMp4: buildMp4 };
})();
