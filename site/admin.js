/* لوحة إدارة Dubai Fans AI */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var token = null;
  try { token = JSON.parse(localStorage.getItem('dfai.token')); } catch (e) {}
  var PLAN_NAMES = { free: 'مجاني', basic: 'أساسي', pro: 'احترافي', business: 'أعمال' };

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = { 'Authorization': 'Bearer ' + token };
    if (opts.body) opts.headers['Content-Type'] = 'application/json';
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (d) {
        if (!res.ok) { var e = new Error((d.error && d.error.message) || res.status); e.status = res.status; throw e; }
        return d;
      });
    });
  }

  function fmtDate(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function td(text, cls) {
    var c = document.createElement('td');
    if (cls) c.className = cls;
    if (text !== undefined) c.textContent = text;
    return c;
  }

  function planControls(userId, presetPlan) {
    var wrap = document.createElement('div');
    wrap.className = 'row-actions';
    var sel = document.createElement('select');
    sel.setAttribute('aria-label', 'الباقة');
    Object.keys(PLAN_NAMES).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = PLAN_NAMES[k];
      if (k === (presetPlan || 'pro')) o.selected = true;
      sel.appendChild(o);
    });
    var days = document.createElement('input');
    days.type = 'number'; days.min = '1'; days.max = '3660'; days.value = '30';
    days.className = 'days'; days.setAttribute('aria-label', 'عدد الأيام');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn-primary sm'; btn.textContent = 'تفعيل';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      api('/api/admin/users/' + userId + '/plan', { method: 'POST', body: JSON.stringify({ plan: sel.value, days: Number(days.value) }) })
        .then(function () { toast('تم تفعيل باقة ' + PLAN_NAMES[sel.value] + ' ✅'); loadAll(); })
        .catch(function (e) { toast(e.message); btn.disabled = false; });
    });
    wrap.appendChild(sel); wrap.appendChild(days);
    var lbl = document.createElement('span'); lbl.className = 'muted'; lbl.textContent = 'يوم';
    wrap.appendChild(lbl); wrap.appendChild(btn);
    return { el: wrap, button: btn };
  }

  function loadStats() {
    return api('/api/admin/stats').then(function (s) {
      $('sUsers').textContent = s.users; $('sPaid').textContent = s.paid;
      $('sMsgs').textContent = s.messages_today; $('sReq').textContent = s.pending_requests;
    });
  }

  function loadRequests() {
    return api('/api/admin/requests').then(function (d) {
      var body = $('reqBody'); body.innerHTML = '';
      $('reqCount').textContent = d.requests.length;
      if (!d.requests.length) {
        var tr = document.createElement('tr'); var c = td('مفيش طلبات جديدة', 'empty'); c.colSpan = 4; tr.appendChild(c); body.appendChild(tr); return;
      }
      d.requests.forEach(function (r) {
        var tr = document.createElement('tr');
        var who = td(); who.innerHTML = '<div></div><div class="muted"></div>';
        who.children[0].textContent = r.name; who.children[1].textContent = r.email;
        tr.appendChild(who);
        tr.appendChild(td(PLAN_NAMES[r.plan] || r.plan));
        tr.appendChild(td(fmtDate(r.created_at), 'muted'));
        var act = td();
        var ctl = planControls(r.user_id, r.plan);
        ctl.button.addEventListener('click', function () {
          api('/api/admin/requests/' + r.id + '/done', { method: 'POST' }).catch(function () {});
        });
        var dismiss = document.createElement('button');
        dismiss.type = 'button'; dismiss.className = 'btn-primary sm ghost'; dismiss.textContent = 'تجاهل';
        dismiss.addEventListener('click', function () {
          api('/api/admin/requests/' + r.id + '/done', { method: 'POST' }).then(loadAll);
        });
        ctl.el.appendChild(dismiss);
        act.appendChild(ctl.el);
        tr.appendChild(act);
        body.appendChild(tr);
      });
    });
  }

  var PAY_STATUS = { completed: ['اتدفعت ✅', 'ok'], pending: ['مستنية الدفع', 'muted'], failed: ['فشلت', 'bad'], canceled: ['اتلغت', 'muted'], mismatch: ['محتاجة مراجعة ⚠️', 'bad'] };
  function loadPayments() {
    return api('/api/admin/payments').then(function (d) {
      $('payMonth').textContent = Math.round((d.month.total || 0) / 100) + ' درهم هذا الشهر (' + (d.month.n || 0) + ')';
      $('payMode').textContent = !d.online ? '· الدفع الأونلاين مش متفعّل' : d.test ? '· وضع تجريبي (مفيش فلوس حقيقية)' : '· شغّال بفلوس حقيقية';
      var body = $('payBody'); body.innerHTML = '';
      if (!d.payments.length) {
        var tr0 = document.createElement('tr'); var c = td('لسه مفيش مدفوعات', 'empty'); c.colSpan = 5; tr0.appendChild(c); body.appendChild(tr0); return;
      }
      d.payments.forEach(function (p) {
        var tr = document.createElement('tr');
        var who = td(); who.innerHTML = '<div></div><div class="muted"></div>';
        who.children[0].textContent = p.name; who.children[1].textContent = p.email;
        tr.appendChild(who);
        tr.appendChild(td(PLAN_NAMES[p.plan] || p.plan));
        tr.appendChild(td((p.amount / 100) + ' درهم' + (p.test ? ' (تجربة)' : '')));
        var st = PAY_STATUS[p.status] || [p.status, 'muted'];
        tr.appendChild(td(st[0], st[1]));
        tr.appendChild(td(fmtDate(p.completed_at || p.created_at), 'muted'));
        body.appendChild(tr);
      });
    });
  }

  function loadUsers() {
    var s = $('q').value.trim();
    return api('/api/admin/users?q=' + encodeURIComponent(s)).then(function (d) {
      var body = $('userBody'); body.innerHTML = '';
      $('userCount').textContent = d.users.length;
      if (!d.users.length) {
        var tr = document.createElement('tr'); var c = td('مفيش نتايج', 'empty'); c.colSpan = 7; tr.appendChild(c); body.appendChild(tr); return;
      }
      d.users.forEach(function (u) {
        var tr = document.createElement('tr');
        var who = td(); who.innerHTML = '<div></div><div class="muted"></div>';
        who.children[0].textContent = u.name + (u.role === 'admin' ? ' (مسؤول)' : '');
        who.children[1].textContent = u.email;
        tr.appendChild(who);
        var planCell = td();
        var tag = document.createElement('span');
        tag.className = 'tag' + (u.disabled ? ' off' : u.effective_plan !== 'free' ? ' paid' : '');
        tag.textContent = u.disabled ? 'موقوف' : PLAN_NAMES[u.effective_plan];
        planCell.appendChild(tag);
        tr.appendChild(planCell);
        tr.appendChild(td(u.effective_plan !== 'free' ? fmtDate(u.plan_until) : '—', 'muted'));
        tr.appendChild(td(String((u.usage_today && u.usage_today.messages) || 0)));
        tr.appendChild(td(fmtDate(u.created_at), 'muted'));
        var act = td(); act.appendChild(planControls(u.id, u.effective_plan === 'free' ? 'pro' : u.effective_plan).el); tr.appendChild(act);
        var dis = td();
        if (u.role !== 'admin') {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'btn-primary sm ghost';
          b.textContent = u.disabled ? 'تفعيل الحساب' : 'إيقاف';
          b.addEventListener('click', function () {
            if (!u.disabled && !confirm('إيقاف حساب ' + u.email + '؟')) return;
            api('/api/admin/users/' + u.id + '/disable', { method: 'POST', body: JSON.stringify({ disabled: !u.disabled }) })
              .then(function () { toast('تم ✅'); loadAll(); }).catch(function (e) { toast(e.message); });
          });
          dis.appendChild(b);
        }
        tr.appendChild(dis);
        body.appendChild(tr);
      });
    });
  }

  function cellText(tr, text, cls) { tr.appendChild(td(text === undefined || text === null ? '—' : String(text), cls)); }
  function emptyRow(body, cols, msg) {
    var tr = document.createElement('tr'); var c = td(msg, 'empty'); c.colSpan = cols; tr.appendChild(c); body.appendChild(tr);
  }
  function fmtTime(ms) {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('ar-AE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function loadTraces() {
    var hours = Number($('trHours').value) || 24;
    return api('/api/admin/traces?hours=' + hours + '&limit=100').then(function (d) {
      var routes = d.byRoute || [];
      var total = 0, errs = 0, msSum = 0, msN = 0;
      routes.forEach(function (r) {
        total += r.n;
        msSum += (r.avg_ms || 0) * r.n; msN += r.n;
        if (r.status !== 'ok' && r.status !== 'cache') errs += r.n;
      });
      $('trCount').textContent = total;
      $('trTotal').textContent = total;
      $('trErr').textContent = errs;
      $('trAvg').textContent = msN ? Math.round(msSum / msN) : '—';

      var rb = $('trRoute'); rb.innerHTML = '';
      if (!routes.length) emptyRow(rb, 6, 'مفيش طلبات في الفترة دي');
      routes.forEach(function (r) {
        var tr = document.createElement('tr');
        cellText(tr, r.route); cellText(tr, r.status, r.status === 'ok' || r.status === 'cache' ? 'ok' : 'bad');
        cellText(tr, r.n); cellText(tr, r.avg_ms); cellText(tr, r.max_ms); cellText(tr, r.rag_hits || 0);
        rb.appendChild(tr);
      });

      var eb = $('trEngine'); eb.innerHTML = '';
      if (!(d.engines || []).length) emptyRow(eb, 3, 'لا يوجد');
      (d.engines || []).forEach(function (e) {
        var tr = document.createElement('tr');
        cellText(tr, e.engine); cellText(tr, e.n); cellText(tr, e.avg_ms);
        eb.appendChild(tr);
      });

      var nb = $('trRecent'); nb.innerHTML = '';
      if (!(d.recent || []).length) emptyRow(nb, 6, 'لا يوجد');
      (d.recent || []).forEach(function (r) {
        var tr = document.createElement('tr');
        cellText(tr, fmtTime(r.ts), 'muted'); cellText(tr, r.route);
        cellText(tr, r.status, r.status === 'ok' || r.status === 'cache' ? 'ok' : 'bad');
        cellText(tr, [r.engine, r.tool].filter(Boolean).join(' · ')); cellText(tr, r.ms);
        cellText(tr, r.note, 'muted');
        nb.appendChild(tr);
      });
    });
  }

  // لوحة Langfuse: أخطاؤها لا توقف باقي اللوحة
  function loadLangfuseSafe() {
    return loadLangfuse().catch(function (e) { var n = $('lfNote'); n.textContent = 'تعذّر تحميل Langfuse: ' + e.message; n.hidden = false; });
  }

  function loadLangfuse() {
    var hours = Number($('lfHours').value) || 24;
    return api('/api/admin/langfuse?hours=' + hours).then(function (d) {
      var note = $('lfNote');
      var rb = $('lfRoute'), nb = $('lfRecent');
      rb.innerHTML = ''; nb.innerHTML = '';
      if (!d.enabled || d.error) {
        note.textContent = !d.enabled ? 'Langfuse غير مفعّل على السيرفر (المفاتيح ناقصة).' : 'تعذّر الاتصال بـ Langfuse: ' + d.error;
        note.hidden = false;
        $('lfCount').textContent = '—'; $('lfTotal').textContent = '—'; $('lfErr').textContent = '—'; $('lfAvg').textContent = '—';
        return;
      }
      note.hidden = true;
      $('lfCount').textContent = d.total;
      $('lfTotal').textContent = d.total + (d.truncated ? '+' : '');
      $('lfErr').textContent = d.errors;
      $('lfAvg').textContent = d.avgLatencyMs === null ? '—' : d.avgLatencyMs;
      if (d.host) $('lfOpen').href = d.host;

      if (!d.byRoute.length) emptyRow(rb, 2, 'مفيش traces في الفترة دي');
      d.byRoute.forEach(function (r) {
        var tr = document.createElement('tr'); cellText(tr, r.name); cellText(tr, r.n); rb.appendChild(tr);
      });
      if (!d.recent.length) emptyRow(nb, 4, 'لا يوجد');
      d.recent.forEach(function (r) {
        var tr = document.createElement('tr');
        cellText(tr, fmtTime(Date.parse(r.timestamp)), 'muted'); cellText(tr, r.name);
        cellText(tr, r.tags, 'muted'); cellText(tr, r.latencyMs);
        nb.appendChild(tr);
      });
    });
  }

  function loadAssistant() {
    return api('/api/admin/assistant').then(function (d) {
      var t = d.today || {}, tot = d.totals || {}, bg = d.bg || {}, counts = bg.counts || {};
      $('asDay').textContent = d.day || '—';
      $('asChats').textContent = t.chats_active || 0;
      $('asUsers').textContent = t.active_users || 0;
      $('asMsgs').textContent = (t.messages_user || 0) + ' / ' + (t.messages_assistant || 0);
      $('asTotal').textContent = tot.chats || 0;

      var tb = $('asTool'); tb.innerHTML = '';
      var tools = t.by_tool || [];
      if (!tools.length) emptyRow(tb, 2, 'مفيش محادثات النهارده');
      tools.forEach(function (r) { var tr = document.createElement('tr'); cellText(tr, r.tool); cellText(tr, r.n); tb.appendChild(tr); });

      $('asStore').textContent = 'محادثات: ' + (tot.chats || 0) + ' · مستخدمين: ' + (tot.users || 0) +
        ' · رسائل: ' + (tot.messages || 0) + ' · حجم النصوص: ' + Number(tot.chars || 0).toLocaleString('en') +
        ' حرف · الاحتفاظ: ' + (d.retention_days || 0) + ' يوم · تخزين R2: ' + (d.r2_enabled ? 'مفعّل' : 'متوقف');

      var bb = $('asBg'); bb.innerHTML = '';
      ['queued', 'running', 'done', 'failed'].forEach(function (k) {
        var tr = document.createElement('tr');
        cellText(tr, k); cellText(tr, counts[k] || 0, k === 'failed' && counts[k] ? 'bad' : '');
        bb.appendChild(tr);
      });

      var fb = $('asFailed'); fb.innerHTML = '';
      var failed = bg.failed || [];
      if (!failed.length) emptyRow(fb, 5, 'ما فيش مهام فاشلة');
      failed.forEach(function (r) {
        var tr = document.createElement('tr');
        cellText(tr, r.id); cellText(tr, r.kind); cellText(tr, r.attempts); cellText(tr, r.error); cellText(tr, fmtTime(r.done_at || r.created_at));
        fb.appendChild(tr);
      });
      $('asNote').hidden = true;
    });
  }
  function loadAssistantSafe() {
    return loadAssistant().catch(function (e) { var n = $('asNote'); n.textContent = 'تعذّر تحميل مؤشرات المساعد: ' + e.message; n.hidden = false; });
  }

  function loadAll() { return Promise.all([loadStats(), loadPayments(), loadRequests(), loadTraces(), loadUsers(), loadLangfuseSafe(), loadAssistantSafe()]); }

  $('trHours').addEventListener('change', function () { loadTraces().catch(function (e) { toast(e.message); }); });
  $('lfHours').addEventListener('change', function () { loadLangfuseSafe(); });

  var t;
  $('q').addEventListener('input', function () { clearTimeout(t); t = setTimeout(loadUsers, 300); });

  if (!token) { $('deny').hidden = false; return; }
  loadAll().then(function () { $('adm').hidden = false; }).catch(function () { $('deny').hidden = false; });
  setInterval(function () { if (!document.hidden) loadStats().then(loadPayments).then(loadRequests).then(loadTraces).then(loadLangfuseSafe).then(loadAssistantSafe).catch(function () {}); }, 60000);
})();
