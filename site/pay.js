/* Dubai Fans AI — الرجوع من صفحة الدفع (زينة) وتأكيد التفعيل */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;
  var params = new URLSearchParams(location.search);
  var id = params.get('pay');
  if (!id || !/^[a-f0-9]{24}$/.test(id)) return;
  var hint = params.get('r');
  try { history.replaceState(null, '', location.pathname); } catch (e) {}

  var box;
  function show(icon, title, text, done) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'modal';
      box.id = 'payModal';
      box.innerHTML = '<div class="modal-box pay-box" role="dialog" aria-modal="true" aria-labelledby="payTitle">' +
        '<div class="pay-ico" id="payIco"></div><h2 id="payTitle"></h2><p class="modal-sub" id="payText"></p>' +
        '<div class="pay-actions"><button type="button" class="btn-primary" id="payOk">تمام</button></div></div>';
      document.body.appendChild(box);
      box.querySelector('#payOk').onclick = function () { box.hidden = true; };
      box.addEventListener('click', function (e) { if (e.target === box) box.hidden = true; });
    }
    box.hidden = false;
    box.querySelector('#payIco').innerHTML = icon;
    box.querySelector('#payTitle').textContent = title;
    box.querySelector('#payText').textContent = text;
    var ok = box.querySelector('#payOk');
    ok.hidden = !done;
    if (done) ok.focus();
  }
  var SPIN = '<span class="pay-spin" aria-hidden="true"></span>';

  var tries = 0;
  function check() {
    D.apiJson('/api/pay/' + id).then(function (r) {
      if (r.status === 'completed') {
        if (D.refreshMe) D.refreshMe();
        show('🎉', 'تم تفعيل باقة ' + r.planName, (r.test ? '(دفعة تجريبية) ' : '') + 'شكراً لاشتراكك! باقتك شغّالة دلوقتي لمدة 30 يوم.', true);
        return;
      }
      if (r.status === 'canceled' || r.status === 'failed') {
        show('⚠️', r.status === 'canceled' ? 'اتلغت عملية الدفع' : 'الدفع ماكملش', 'مااتسحبش منك أي مبلغ. تقدر تجرّب تاني من زرار الباقات وقت ما تحب.', true);
        return;
      }
      if (r.status === 'mismatch') {
        show('⚠️', 'محتاجين نراجع الدفعة', 'حصل اختلاف في بيانات الدفع. كلّمنا على واتساب وهنحلّها على طول.', true);
        return;
      }
      tries++;
      if (tries >= 15) {
        show('⏳', 'الدفع لسه بيتأكد', 'لو دفعت، باقتك هتتفعّل لوحدها خلال دقايق. مش محتاج تعمل حاجة.', true);
        return;
      }
      if (hint === 'cancel' && tries >= 2) { show('⚠️', 'اتلغت عملية الدفع', 'مااتسحبش منك أي مبلغ.', true); return; }
      setTimeout(check, 2000);
    }).catch(function (ex) {
      show('⚠️', 'مقدرناش نتأكد من الدفع', (D.netMessage ? D.netMessage(ex) : '') + ' لو دفعت، الباقة هتتفعّل لوحدها خلال دقايق.', true);
    });
  }

  // نستنى لحد ما المستخدم يدخل حسابه
  var waited = 0;
  (function waitLogin() {
    if (D.state && D.state.me) { show(SPIN, 'بنتأكد من الدفع…', 'ثواني بس.', false); return check(); }
    if ((waited += 300) > 60000) return;
    setTimeout(waitLogin, 300);
  })();
})();
