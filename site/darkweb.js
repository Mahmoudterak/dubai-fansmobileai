/* Dubai Fans AI — مراقبة الويب المظلم: فحص كلمة مرور (بدون حفظها) وفحص إيميل الحساب */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function $(id) { return document.getElementById(id); }

  var SHIELD = '<svg viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4Z"/><path d="m9 12 2 2 4-4"/></svg>';

  function resultBox(el, cls, text) {
    el.innerHTML = '<div class="' + cls + '"></div>';
    el.firstChild.textContent = text;
  }

  function open() {
    var panel = D.showPanel('darkweb');
    var mail = ($('userRole') && $('userRole').textContent) || '';
    panel.innerHTML = '<div class="pv dw-page">' +
      '<div class="dw-stats">' +
      '<div class="dw-stat"><b>1</b><span>بريد مراقَب</span></div>' +
      '<div class="dw-stat"><b>0</b><span>رقم هاتف</span></div>' +
      '<div class="dw-stat"><b id="dwLeaks">0</b><span>تسريبات</span></div>' +
      '</div>' +
      '<div class="card-box"><h2>كلمة المرور</h2>' +
      '<p class="biz-hint">اكتب كلمة المرور اللي عايز تتأكد منها. بنرسل أول 5 حروف من الهاش بس، وكلمة المرور نفسها ما بتخرج من السيرفر.</p>' +
      '<form id="dwPwForm" class="dw-form"><input id="dwPw" type="password" autocomplete="new-password" maxlength="256" placeholder="كلمة المرور" aria-label="كلمة المرور">' +
      '<button type="submit" class="btn-primary">افحص</button></form>' +
      '<div id="dwPwRes"></div></div>' +
      '<div class="card-box"><h2>إيميل حسابك</h2>' +
      '<p class="biz-hint">نفحص إيميل حسابك في التسريبات المعروفة.</p>' +
      '<div class="dw-mail" dir="ltr">' + esc(mail) + '</div>' +
      '<button id="dwMailBtn" type="button" class="btn-primary">افحص إيميلي</button>' +
      '<div id="dwMailRes"></div></div>' +
      '<p class="dw-foot">الفحص ما بيغيّرش أي حاجة في حسابك. لو ظهرت تسريبات، غيّر كلمة المرور في الخدمات اللي ظهرت فيها.</p></div>';

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
          if (r.pwned) resultBox($('dwPwRes'), 'msg-error', 'ظهرت كلمة المرور دي في تسريبات ' + r.count.toLocaleString('en-US') + ' مرة. غيّرها فوراً وما تستخدمهاش في أي حساب.');
          else resultBox($('dwPwRes'), 'msg-ok', 'كلمة المرور دي ما ظهرتش في التسريبات المعروفة.');
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
            resultBox($('dwMailRes'), 'msg-ok', 'إيميلك ما ظهرش في التسريبات المعروفة.');
            return;
          }
          var list = r.breaches.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
          $('dwMailRes').innerHTML = '<div class="msg-error">إيميلك ظهر في ' + r.breaches.length + ' تسريب:</div><ul class="dw-list">' + list + '</ul>';
        })
        .catch(function (ex) { resultBox($('dwMailRes'), 'msg-error', D.netMessage(ex)); })
        .finally(function () { btn.disabled = false; });
    });
  }

  D.openDarkweb = function () { open(); };
})();
