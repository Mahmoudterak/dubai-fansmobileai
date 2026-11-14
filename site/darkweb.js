/* Dubai Fans AI — مراقبة الويب المظلم: فحص كلمة مرور (بدون حفظها) وفحص إيميل الحساب */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function $(id) { return document.getElementById(id); }

  var SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4Z"/><path d="m9 12 2 2 4-4"/></svg>';
  var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  function resultBox(el, cls, text) {
    el.innerHTML = '<div class="' + cls + '"></div>';
    el.firstChild.textContent = text;
  }

  // حالة الحماية في البطاقة العليا (تتغيّر بعد الفحص)
  function setStatus(found) {
    var t = $('dwStatusT'), s = $('dwStatusS'), card = $('dwStatus');
    if (!t) return;
    t.textContent = found ? 'تسريبات مكتشفة' : 'الحماية جاهزة';
    s.textContent = found ? 'راجع التفاصيل' : 'آخر فحص: الآن';
    card.classList.toggle('danger', !!found);
  }

  function open() {
    var panel = D.showPanel('darkweb');
    var mail = ($('userRole') && $('userRole').textContent) || '';
    panel.innerHTML = '<div class="pv dw-page">' +
      '<div class="pv-head"><div class="pv-ico dw-shield">' + SHIELD + '</div><div><h1>مراقبة الويب المظلم</h1>' +
      '<p>اتأكد إن كلمة مرورك أو إيميلك ما ظهرش في تسريبات معروفة. كلمة المرور ما بتتحفظش ولا بتتسجل.</p></div></div>' +
      '<div class="dw-status" id="dwStatus"><div class="dw-status-txt">' +
      '<span class="dw-status-k">STATUS</span>' +
      '<strong id="dwStatusT">الحماية جاهزة</strong>' +
      '<span class="dw-status-s"><i></i><span id="dwStatusS">لم يتم الفحص بعد</span></span></div>' +
      '<div class="dw-ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" transform="rotate(-70 50 50)"></circle></svg></div></div>' +
      '<div class="dw-label">إجراءات سريعة</div>' +
      '<div class="dw-quick">' +
      '<button type="button" class="dw-qcard on" id="dwQBreach"><span class="dw-qico">' + SHIELD + '</span><strong>فحص التسريبات</strong><small>Breach Check</small></button>' +
      '<button type="button" class="dw-qcard" id="dwQWatch"><span class="dw-qico">' + EYE + '</span><strong>عناصر المراقبة</strong><small>Watch items</small></button>' +
      '</div>' +
      '<div class="dw-label">بياناتك الشخصية</div>' +
      '<div class="dw-stats">' +
      '<div class="dw-stat"><b>1</b><span>بريد مراقَب</span></div>' +
      '<div class="dw-stat"><b>0</b><span>رقم هاتف</span></div>' +
      '<div class="dw-stat"><b id="dwLeaks">0</b><span>تسريبات</span></div>' +
      '</div>' +
      '<div class="card-box" id="dwPwCard"><h2>كلمة المرور</h2>' +
      '<p class="biz-hint">اكتب كلمة المرور اللي عايز تتأكد منها. بنرسل أول 5 حروف من الهاش بس، وكلمة المرور نفسها ما بتخرج من السيرفر.</p>' +
      '<form id="dwPwForm" class="dw-form"><input id="dwPw" type="password" autocomplete="new-password" maxlength="256" placeholder="كلمة المرور" aria-label="كلمة المرور">' +
      '<button type="submit" class="btn-primary">افحص</button></form>' +
      '<div id="dwPwRes"></div></div>' +
      '<div class="card-box" id="dwMailCard"><h2>إيميل حسابك</h2>' +
      '<p class="biz-hint">نفحص إيميل حسابك في التسريبات المعروفة.</p>' +
      '<div class="dw-mail" dir="ltr">' + esc(mail) + '</div>' +
      '<button id="dwMailBtn" type="button" class="btn-primary">افحص إيميلي</button>' +
      '<div id="dwMailRes"></div></div>' +
      '<p class="dw-foot">الفحص ما بيغيّرش أي حاجة في حسابك. لو ظهرت تسريبات، غيّر كلمة المرور في الخدمات اللي ظهرت فيها.</p></div>';

    $('dwQBreach').addEventListener('click', function () { $('dwPwCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('dwQWatch').addEventListener('click', function () { $('dwMailCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    $('dwPwForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('dwPw');
      var pw = input.value;
      if (!pw) return;
      var btn = e.target.querySelector('button');
      btn.disabled = true;
      D.apiJson('/api/darkweb/password', { method: 'POST', body: JSON.stringify({ password: pw }) })
        .then(function (r) {
          input.value = '';
          if (r.pwned) {
            resultBox($('dwPwRes'), 'msg-error', 'ظهرت كلمة المرور دي في تسريبات ' + r.count.toLocaleString('en-US') + ' مرة. غيّرها فوراً وما تستخدمهاش في أي حساب.');
            setStatus(true);
          } else {
            resultBox($('dwPwRes'), 'msg-ok', 'كلمة المرور دي ما ظهرتش في التسريبات المعروفة.');
          }
        })
        .catch(function (ex) { resultBox($('dwPwRes'), 'msg-error', D.netMessage(ex)); })
        .finally(function () { btn.disabled = false; });
    });

    $('dwMailBtn').addEventListener('click', function () {
      var btn = $('dwMailBtn');
      btn.disabled = true;
      resultBox($('dwMailRes'), 'biz-loading', 'جارٍ الفحص…');
      D.apiJson('/api/darkweb/email', { method: 'POST' })
        .then(function (r) {
          $('dwLeaks').textContent = (r.breaches || []).length;
          if (!r.breaches || !r.breaches.length) {
            setStatus(false);
            resultBox($('dwMailRes'), 'msg-ok', 'إيميلك ما ظهرش في التسريبات المعروفة.');
            return;
          }
          setStatus(true);
          var list = r.breaches.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
          $('dwMailRes').innerHTML = '<div class="msg-error">إيميلك ظهر في ' + r.breaches.length + ' تسريب:</div><ul class="dw-list">' + list + '</ul>';
        })
        .catch(function (ex) { resultBox($('dwMailRes'), 'msg-error', D.netMessage(ex)); })
        .finally(function () { btn.disabled = false; });
    });
  }

  D.openDarkweb = function () { open(); };
})();
