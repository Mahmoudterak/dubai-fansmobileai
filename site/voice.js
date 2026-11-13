/* Dubai Fans AI — الصوت: اكتب بصوتك + استمع للرد */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;
  var $ = function (id) { return document.getElementById(id); };

  var MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  var STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>';
  var SPIN = '<span class="mic-spin" aria-hidden="true"></span>';
  var SPEAK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var MAX_MS = 90000;

  // ---------- 1) الكتابة بالصوت ----------
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var btn, timerEl, rec, chunks, stream, startedAt, tick, autoStop, busy = false, voiceTurn = false;

  function setMic(mode) {
    btn.dataset.mode = mode;
    btn.classList.toggle('rec', mode === 'rec');
    btn.innerHTML = mode === 'rec' ? STOP : mode === 'wait' ? SPIN : MIC;
    btn.setAttribute('aria-label', mode === 'rec' ? 'إيقاف التسجيل' : mode === 'wait' ? 'جارٍ تحويل الصوت' : 'اكتب بصوتك');
    btn.title = btn.getAttribute('aria-label');
    btn.disabled = mode === 'wait';
    timerEl.hidden = mode !== 'rec';
  }

  function pickType() {
    var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (var i = 0; i < types.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(types[i])) return types[i];
    return '';
  }

  function start() {
    if (busy) return;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (s) {
      stream = s;
      chunks = [];
      var type = pickType();
      try { rec = new MediaRecorder(s, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined); }
      catch (e) { rec = new MediaRecorder(s); }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = upload;
      rec.start(250);
      startedAt = Date.now();
      setMic('rec');
      timerEl.textContent = '0:00';
      tick = setInterval(function () {
        var sec = Math.floor((Date.now() - startedAt) / 1000);
        timerEl.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      }, 500);
      autoStop = setTimeout(stop, MAX_MS);
    }).catch(function (e) {
      D.toast(e && e.name === 'NotAllowedError' ? 'اسمح للموقع يستخدم المايك من إعدادات المتصفح.' : 'مفيش مايك شغّال على الجهاز ده.');
    });
  }

  function stop() {
    clearInterval(tick); clearTimeout(autoStop);
    if (rec && rec.state !== 'inactive') rec.stop();
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
  }

  function upload() {
    var type = (rec && rec.mimeType) || 'audio/webm';
    var blob = new Blob(chunks, { type: type });
    chunks = [];
    if (Date.now() - startedAt < 700 || blob.size < 1500) { setMic('idle'); return D.toast('التسجيل قصير أوي. دوس واتكلم، وبعدين دوس إيقاف.'); }
    busy = true;
    setMic('wait');
    D.api('/api/transcribe', { method: 'POST', headers: { 'Content-Type': type.split(';')[0] }, body: blob })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || 'خطأ'); return j; }); })
      .then(function (j) {
        var p = $('prompt');
        var cur = p.value.trim();
        var text = cur ? cur + ' ' + j.text : j.text;
        // محادثة صوتية: نبعت على طول، والرد يتقري بصوت أول ما يخلص
        if (!D.state.busy) {
          voiceTurn = true;
          D.send(text);
          if (D.state.busy) return;
          voiceTurn = false;
        }
        p.value = text;
        p.dispatchEvent(new Event('input', { bubbles: true }));
        p.focus();
      })
      .catch(function (e) { D.toast(e.message && e.message !== 'Failed to fetch' ? e.message : 'مقدرناش نوصل للسيرفر. جرّب تاني.'); })
      .finally(function () { busy = false; setMic('idle'); });
  }

  if (canRecord && $('sendBtn')) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'micBtn';
    btn.className = 'mic-btn';
    timerEl = document.createElement('span');
    timerEl.className = 'mic-timer';
    timerEl.setAttribute('aria-live', 'polite');
    var send = $('sendBtn');
    send.parentNode.insertBefore(timerEl, send);
    send.parentNode.insertBefore(btn, send);
    setMic('idle');
    btn.addEventListener('click', function () {
      if (btn.dataset.mode === 'rec') stop();
      else if (btn.dataset.mode === 'idle') { unlockSpeech(); stopSpeaking(); start(); }
    });
  }

  // لو المستخدم كتب بإيده، الرد مايتقراش لوحده
  if ($('composer')) $('composer').addEventListener('submit', function () { voiceTurn = false; }, true);
  if ($('prompt')) $('prompt').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) voiceTurn = false; }, true);

  // ---------- 2) استمع للرد ----------
  var synth = window.speechSynthesis;
  var speakingEl = null;
  function arabicVoice() {
    var vs = synth ? synth.getVoices() : [];
    var pref = ['ar-AE', 'ar-SA', 'ar-EG', 'ar'];
    for (var i = 0; i < pref.length; i++) {
      var hit = vs.filter(function (v) { return (v.lang || '').replace('_', '-').indexOf(pref[i]) === 0; });
      if (hit.length) {
        var nat = hit.filter(function (v) { return /natural|online|google/i.test(v.name); });
        return nat[0] || hit[0];
      }
    }
    return null;
  }
  if (synth) { synth.getVoices(); if ('onvoiceschanged' in synth) synth.onvoiceschanged = function () { synth.getVoices(); }; }

  // iPhone مبيسمحش بالكلام إلا بعد لمسة من المستخدم، فبنفتحه مع ضغطة المايك
  var unlocked = false, playCtx = null;
  function unlockSpeech() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (AC && cloudVoices().length) {
      try {
        if (!playCtx) playCtx = new AC();
        if (playCtx.state === 'suspended') playCtx.resume();
        var b = playCtx.createBuffer(1, 1, 22050), src = playCtx.createBufferSource();
        src.buffer = b; src.connect(playCtx.destination); src.start(0);
      } catch (e) { /* نكمّل بصوت الجهاز */ }
    }
    if (unlocked || !synth) return;
    unlocked = true;
    try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {}
  }

  // ---- الصوت الإماراتي من السيرفر (حمدان / فاطمة) ----
  function cloudVoices() {
    var f = D.state.config && D.state.config.features;
    return (f && f.tts) || [];
  }
  function voicePref() {
    var v = D.store('dfai.voice');
    var list = cloudVoices();
    return list.some(function (x) { return x.id === v; }) ? v : (list[0] && list[0].id);
  }
  var cloudOff = 0, playing = null, playGen = 0;
  function splitForCloud(text) {
    text = text.slice(0, 3000);
    if (text.length <= 260) return [text];
    var cut = -1, re = /[.!؟?\n]/g, m;
    while ((m = re.exec(text)) && m.index < 260) cut = m.index + 1;
    if (cut < 60) { cut = text.lastIndexOf('،', 260); if (cut < 60) cut = text.lastIndexOf(' ', 220); }
    return cut > 0 ? [text.slice(0, cut).trim(), text.slice(cut).trim()].filter(Boolean) : [text];
  }
  function fetchAudio(t) {
    return D.api('/api/tts', { method: 'POST', body: JSON.stringify({ text: t, voice: voicePref() }) })
      .then(function (r) { if (!r.ok) throw new Error('tts ' + r.status); return r.arrayBuffer(); })
      .then(function (buf) {
        return new Promise(function (ok, bad) { playCtx.decodeAudioData(buf, ok, bad); });
      });
  }
  function speakCloud(text, onDone, onFail) {
    var gen = ++playGen;
    if (!playCtx) { var AC = window.AudioContext || window.webkitAudioContext; playCtx = new AC(); }
    if (playCtx.state === 'suspended') playCtx.resume();
    var jobs = splitForCloud(text).map(fetchAudio);
    var i = 0, started = false;
    (function next() {
      if (gen !== playGen) return;
      if (i >= jobs.length) { playing = null; return onDone(); }
      jobs[i++].then(function (buf) {
        if (gen !== playGen) return;
        started = true;
        var src = playCtx.createBufferSource();
        src.buffer = buf;
        src.connect(playCtx.destination);
        src.onended = function () { if (playing === src) next(); };
        playing = src;
        src.start(0);
      }).catch(function () {
        if (gen !== playGen) return;
        playing = null;
        if (!started) { cloudOff = Date.now(); onFail(); } else onDone();
      });
    })();
  }

  function plain(md) {
    return String(md || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<think>[\s\S]*?<\/think>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\[\d+\]/g, '')
      .replace(/[#>*_`|~-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stopSpeaking() {
    speakDone = null;
    playGen++;
    if (playing) { try { playing.onended = null; playing.stop(); } catch (e) {} playing = null; }
    if (synth) synth.cancel();
    if (speakingEl) { speakingEl.classList.remove('on'); speakingEl.innerHTML = SPEAK; speakingEl = null; }
  }

  // يقرا نص بصوت عربي؛ بيرجّع false لو مفيش صوت عربي على الجهاز
  var speakDone = null;
  function speakText(text, onDone) {
    var isAr = /[\u0600-\u06FF]/.test(text);
    if (isAr && cloudVoices().length && Date.now() - cloudOff > 120000) {
      speakDone = onDone || null;
      var fin = function () { var f = speakDone; speakDone = null; if (f) f(); };
      speakCloud(text, fin, function () {
        // لو الصوت الإماراتي وقع، نكمّل بصوت الجهاز
        var f = speakDone; speakDone = null;
        if (!speakText(text, f)) { if (f) f(); }
      });
      return true;
    }
    var v = isAr ? arabicVoice() : null;
    if (!synth || (isAr && !v)) return false;
    var parts = text.match(/[^.!؟?\n،,]{1,200}[.!؟?،,]?/g) || [text];
    parts = parts.map(function (t) { return t.trim(); }).filter(Boolean);
    if (!parts.length) return false;
    speakDone = onDone || null;
    var finish = function () { var f = speakDone; speakDone = null; if (f) f(); };
    parts.forEach(function (t, i) {
      var u = new SpeechSynthesisUtterance(t);
      u.lang = v ? v.lang : (isAr ? 'ar-AE' : u.lang);
      if (v) { try { u.voice = v; } catch (e) { /* نكتفي باللغة */ } }
      u.rate = 1.05;
      if (i === parts.length - 1) u.onend = finish;
      u.onerror = function (e) { if (!e || e.error !== 'interrupted') finish(); };
      synth.speak(u);
    });
    // Chrome أحياناً بيوقف الكلام الطويل؛ ده بيصحّيه
    var keep = setInterval(function () {
      if (!speakDone) return clearInterval(keep);
      if (!synth.speaking) { clearInterval(keep); finish(); return; }
      if (!/android|iphone|ipad/i.test(navigator.userAgent)) { synth.pause(); synth.resume(); }
    }, 10000);
    return true;
  }

  function speak(msgEl, b, auto) {
    if (speakingEl === b) return stopSpeaking();
    stopSpeaking();
    var text = plain(msgEl._raw || (msgEl.querySelector('.md') || {}).textContent);
    if (!text) return;
    speakingEl = b;
    b.classList.add('on');
    b.innerHTML = STOP;
    var ok = speakText(text, function () { if (speakingEl === b) { b.classList.remove('on'); b.innerHTML = SPEAK; speakingEl = null; } });
    if (!ok) {
      b.classList.remove('on'); b.innerHTML = SPEAK; speakingEl = null;
      D.toast(auto ? 'الرد جاهز مكتوب. جهازك مافيهوش صوت عربي عشان يقراه.' : 'جهازك مافيهوش صوت عربي. جرّب من Edge أو Chrome على الموبايل.');
    }
  }

  function addSpeak(msgEl) {
    var bar = msgEl.querySelector('.msg-actions');
    if (!bar || bar.querySelector('.speak-btn')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn speak-btn';
    b.setAttribute('aria-label', 'استمع للرد');
    b.title = 'استمع';
    b.innerHTML = SPEAK;
    b.addEventListener('click', function () { unlockSpeech(); speak(msgEl, b); });
    bar.appendChild(b);
  }

  var thread = $('thread');
  if (synth && thread) {
    Array.prototype.forEach.call(thread.querySelectorAll('.msg-ai'), addSpeak);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.nodeType === 1 && n.classList.contains('msg-ai')) addSpeak(n);
        });
      });
      if (!thread.children.length) stopSpeaking();
    }).observe(thread, { childList: true });
    // لما رد المحادثة الصوتية يخلص (زرار النسخ بيظهر) نقراه
    new MutationObserver(function (list) {
      if (!voiceTurn) return;
      for (var i = 0; i < list.length; i++) {
        var t = list[i].target;
        if (t.classList && t.classList.contains('msg-actions') && !t.hidden) {
          var msg = t.closest('.msg-ai');
          if (msg && msg === thread.lastElementChild) {
            voiceTurn = false;
            addSpeak(msg);
            if (VM.active) { VM.onReply(msg); return; }
            var sb = msg.querySelector('.speak-btn');
            setTimeout(function () { if (sb) speak(msg, sb, true); }, 150);
            return;
          }
        }
      }
    }).observe(thread, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('beforeunload', stopSpeaking);
  }

  // ---------- 3) المحادثة الصوتية (زي ChatGPT) ----------
  var VM = { active: false };
  var WAVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4"/></svg>';
  var ui, orbEl, statusEl, capUser, capAi, ctx, analyser, data, vmStream, vmRec, vmChunks, raf, phase = 'off';
  var noise = 0.01, calibUntil = 0, heard = 0, lastVoice = 0, recStart = 0, waitTimer = null;
  var SILENCE_MS = 1300, MIN_SPEECH_MS = 350, IDLE_RESET_MS = 25000;

  function buildUi() {
    ui = document.createElement('div');
    ui.className = 'vm';
    ui.id = 'voiceMode';
    ui.hidden = true;
    ui.setAttribute('role', 'dialog');
    ui.setAttribute('aria-modal', 'true');
    ui.setAttribute('aria-label', 'محادثة صوتية');
    ui.innerHTML =
      '<div class="vm-top"><span class="vm-title">محادثة صوتية</span><div class="vm-voices" id="vmVoices" role="radiogroup" aria-label="الصوت"></div></div>' +
      '<div class="vm-center">' +
      '<button type="button" class="vm-orb" id="vmOrb" aria-label="اضغط للمقاطعة"><span class="vm-core"></span></button>' +
      '<div class="vm-status" id="vmStatus" aria-live="polite"></div>' +
      '<div class="vm-cap vm-cap-user" id="vmUser"></div>' +
      '<div class="vm-cap vm-cap-ai" id="vmAi"></div>' +
      '</div>' +
      '<div class="vm-bottom"><button type="button" class="vm-end" id="vmEnd">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg><span>إنهاء</span></button></div>';
    document.body.appendChild(ui);
    orbEl = ui.querySelector('#vmOrb');
    statusEl = ui.querySelector('#vmStatus');
    capUser = ui.querySelector('#vmUser');
    capAi = ui.querySelector('#vmAi');
    ui.querySelector('#vmEnd').onclick = closeVM;
    orbEl.onclick = function () {
      if (phase === 'speaking') { stopSpeaking(); listen(); }
      else if (phase === 'listening' && heard > MIN_SPEECH_MS) finishUtterance();
    };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && VM.active) closeVM(); });
  }

  function renderVoices() {
    var box = ui.querySelector('#vmVoices');
    var list = cloudVoices();
    box.innerHTML = '';
    if (!list.length) return;
    var cur = voicePref();
    list.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(v.id === cur));
      b.className = v.id === cur ? 'on' : '';
      b.textContent = v.label;
      b.onclick = function () { D.store('dfai.voice', v.id); renderVoices(); };
      box.appendChild(b);
    });
  }

  function setPhase(p, msg) {
    phase = p;
    ui.dataset.phase = p;
    statusEl.textContent = msg;
  }

  function openVM() {
    if (VM.active) return;
    if (!ui) buildUi();
    unlockSpeech();
    stopSpeaking();
    if (D.hidePanel) D.hidePanel();
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
      vmStream = s;
      var AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      var src = ctx.createMediaStreamSource(s);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      data = new Float32Array(analyser.fftSize);
      src.connect(analyser);
      VM.active = true;
      D.state.voiceMode = true;
      ui.hidden = false;
      document.body.classList.add('vm-open');
      capUser.textContent = ''; capAi.textContent = '';
      renderVoices();
      if (!cloudVoices().length && !arabicVoice()) capAi.textContent = 'ملحوظة: جهازك مافيهوش صوت عربي، فالردود هتظهر مكتوبة هنا. جرّب Edge أو الموبايل عشان تسمعها.';
      loop();
      listen();
    }).catch(function (e) {
      D.toast(e && e.name === 'NotAllowedError' ? 'اسمح للموقع يستخدم المايك من إعدادات المتصفح.' : 'مفيش مايك شغّال على الجهاز ده.');
    });
  }

  function closeVM() {
    VM.active = false;
    D.state.voiceMode = false;
    voiceTurn = false;
    clearTimeout(waitTimer);
    cancelAnimationFrame(raf);
    stopSpeaking();
    if (vmRec && vmRec.state !== 'inactive') { vmRec.onstop = null; vmRec.stop(); }
    if (vmStream) vmStream.getTracks().forEach(function (t) { t.stop(); });
    if (ctx) { try { ctx.close(); } catch (e) {} }
    vmStream = ctx = analyser = vmRec = null;
    phase = 'off';
    if (ui) ui.hidden = true;
    document.body.classList.remove('vm-open');
  }

  function level() {
    analyser.getFloatTimeDomainData(data);
    var sum = 0;
    for (var i = 0; i < data.length; i++) sum += data[i] * data[i];
    return Math.sqrt(sum / data.length);
  }

  var lastT = 0;
  function loop(t) {
    if (!VM.active) return;
    raf = requestAnimationFrame(loop);
    var dt = lastT ? Math.min(100, (t || 0) - lastT) : 16;
    lastT = t || 0;
    var lv = level();
    var now = Date.now();
    if (phase === 'listening') {
      if (now < calibUntil) { noise = Math.max(0.004, noise * 0.8 + lv * 0.2); }
      var thr = Math.max(0.018, noise * 3);
      if (lv > thr) { heard += dt; lastVoice = now; }
      if (heard > MIN_SPEECH_MS && now - lastVoice > SILENCE_MS) finishUtterance();
      else if (heard <= MIN_SPEECH_MS && now - recStart > IDLE_RESET_MS) restartRecorder();
      var sc = 1 + Math.min(0.35, lv * 6);
      orbEl.style.setProperty('--vm-scale', sc.toFixed(3));
    } else if (phase === 'speaking') {
      orbEl.style.setProperty('--vm-scale', (1 + 0.06 * Math.sin(now / 160) + 0.04 * Math.sin(now / 97)).toFixed(3));
    } else {
      orbEl.style.setProperty('--vm-scale', '1');
    }
  }

  function newRecorder() {
    vmChunks = [];
    var type = pickType();
    try { vmRec = new MediaRecorder(vmStream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined); }
    catch (e) { vmRec = new MediaRecorder(vmStream); }
    vmRec.ondataavailable = function (e) { if (e.data && e.data.size) vmChunks.push(e.data); };
    vmRec.start(250);
    recStart = Date.now();
    heard = 0;
  }
  function restartRecorder() {
    if (vmRec && vmRec.state !== 'inactive') { vmRec.onstop = null; vmRec.stop(); }
    newRecorder();
  }

  function listen() {
    if (!VM.active) return;
    clearTimeout(waitTimer);
    if (ctx && ctx.state === 'suspended') ctx.resume();
    setPhase('listening', 'أنا سامعك… اتكلم');
    calibUntil = Date.now() + 400;
    lastVoice = Date.now();
    restartRecorder();
  }

  function finishUtterance() {
    if (phase !== 'listening' || !vmRec) return;
    setPhase('thinking', 'بفكّر…');
    var rec = vmRec;
    vmRec = null;
    rec.onstop = function () {
      var type = rec.mimeType || 'audio/webm';
      var blob = new Blob(vmChunks, { type: type });
      transcribe(blob, type);
    };
    if (rec.state !== 'inactive') rec.stop(); else rec.onstop();
  }

  function transcribe(blob, type) {
    D.api('/api/transcribe', { method: 'POST', headers: { 'Content-Type': type.split(';')[0] }, body: blob })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error((j.error && j.error.message) || 'خطأ'); e.code = j.error && j.error.code; throw e; } return j; }); })
      .then(function (j) {
        if (!VM.active) return;
        capUser.textContent = j.text;
        capAi.textContent = '';
        if (D.state.busy) { listen(); return; }
        if (D.state.tool && D.state.tool !== 'write' && D.state.tool !== 'search' && D.setTool) D.setTool(null);
        voiceTurn = true;
        D.send(j.text);
        if (!D.state.busy) { voiceTurn = false; closeVM(); return; }
        waitReply();
      })
      .catch(function (e) {
        if (!VM.active) return;
        if (e.code === 'no_speech' || e.code === 'empty') { listen(); return; }
        setPhase('error', e.message && e.message !== 'Failed to fetch' ? e.message : 'مقدرناش نوصل للسيرفر.');
        waitTimer = setTimeout(listen, 2500);
      });
  }

  // لو الرد وقف بخطأ أو اتأخر، نرجع نسمع
  function waitReply() {
    var started = Date.now();
    clearTimeout(waitTimer);
    (function check() {
      if (!VM.active || phase !== 'thinking') return;
      if (!D.state.busy && voiceTurn && Date.now() - started > 1200) {
        voiceTurn = false;
        var err = document.querySelector('#thread .msg-ai:last-child .msg-error');
        setPhase('error', err ? err.textContent : 'حصلت مشكلة في الرد.');
        waitTimer = setTimeout(listen, 2500);
        return;
      }
      if (Date.now() - started > 90000) { voiceTurn = false; listen(); return; }
      waitTimer = setTimeout(check, 400);
    })();
  }

  VM.onReply = function (msg) {
    if (!VM.active) return;
    clearTimeout(waitTimer);
    var text = plain(msg._raw || (msg.querySelector('.md') || {}).textContent);
    capAi.textContent = text.length > 280 ? text.slice(0, 280) + '…' : text;
    if (!text) { listen(); return; }
    setPhase('speaking', 'بتكلّم… (اضغط على الدائرة عشان تقاطعني)');
    var ok = speakText(text, function () { if (VM.active && phase === 'speaking') listen(); });
    if (!ok) waitTimer = setTimeout(listen, Math.min(6000, 1200 + text.length * 25));
  };

  if (canRecord && $('sendBtn') && (window.AudioContext || window.webkitAudioContext)) {
    var vb = document.createElement('button');
    vb.type = 'button';
    vb.id = 'voiceModeBtn';
    vb.className = 'mic-btn vm-btn';
    vb.setAttribute('aria-label', 'محادثة صوتية');
    vb.title = 'محادثة صوتية';
    vb.innerHTML = WAVE;
    vb.addEventListener('click', openVM);
    var sb2 = $('sendBtn');
    sb2.parentNode.insertBefore(vb, sb2);
  }
  D.openVoiceMode = openVM;
})();
