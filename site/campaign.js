/* Dubai Fans AI — حملات المواسم: حملة كاملة (5 تصاميم + كابشنات + خطة نشر) بضغطة واحدة */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;
  function $(id) { return document.getElementById(id); }

  var occasions = [];
  var modal;

  function dayText(o) {
    if (o.days <= 0) return 'النهارده';
    if (o.days === 1) return 'بكره';
    if (o.days === 2) return 'بعد يومين';
    return 'بعد ' + o.days + (o.days <= 10 ? ' أيام' : ' يوم');
  }

  function renderCard() {
    var cards = $('cards');
    if (!cards) return;
    var old = $('seasonCards');
    if (old) old.remove();
    var list = occasions.filter(function (x) { return x.days <= 45; }).slice(0, 2);
    if (!list.length) return;
    var wrap = document.createElement('div');
    wrap.id = 'seasonCards';
    wrap.className = 'season-cards';
    list.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'season-card' + (o.id === 'uae_union' ? ' uae' : '');
      b.setAttribute('data-occ', o.id);
      b.innerHTML = '<span class="sc-flag" aria-hidden="true"></span><span class="sc-body"><span class="sc-title"></span><span class="sc-sub"></span></span><span class="sc-go">جهّز الحملة</span>';
      b.querySelector('.sc-title').textContent = 'حملة ' + o.name;
      b.querySelector('.sc-sub').textContent = dayText(o) + ' · 5 تصاميم بالكابشن وخطة النشر بضغطة واحدة';
      b.addEventListener('click', function () { open(o.id); });
      wrap.appendChild(b);
    });
    cards.parentNode.insertBefore(wrap, cards);
  }

  function build() {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'campaignModal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="cmTitle">' +
      '<button class="icon-btn modal-close" type="button" id="cmClose" aria-label="إغلاق"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<h2 id="cmTitle">حملة موسم كاملة</h2>' +
      '<p class="modal-sub">المساعد هيخطط الحملة ويصمم 5 إعلانات بهوية نشاطك، ومع كل إعلان الكابشن والهاشتاجات ووقت النشر.</p>' +
      '<label class="ad-field"><span>المناسبة</span><select id="cmOcc"></select></label>' +
      '<label class="ad-field"><span>عرضك للمناسبة (اختياري)</span><input type="text" id="cmOffer" maxlength="200" placeholder="مثلاً: خصم 20% على كل المنتجات لحد 3 ديسمبر" dir="auto"></label>' +
      '<p class="cm-note" id="cmNote"></p>' +
      '<div class="ad-foot"><button class="btn-ghost" type="button" id="cmCancel">إلغاء</button><button class="btn-primary" type="button" id="cmGo">جهّز الحملة</button></div></div>';
    document.body.appendChild(modal);
    function close() { modal.hidden = true; }
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    $('cmClose').onclick = close;
    $('cmCancel').onclick = close;
    $('cmGo').onclick = function () {
      var o = occasions.filter(function (x) { return x.id === $('cmOcc').value; })[0];
      close();
      if (o) D.startCampaign(o, $('cmOffer').value.trim());
    };
  }

  function open(id) {
    if (!modal) build();
    var sel = $('cmOcc');
    sel.innerHTML = '';
    occasions.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o.id;
      op.textContent = o.name + ' — ' + dayText(o) + (o.approx ? ' (تقريباً)' : '');
      if (o.id === id) op.selected = true;
      sel.appendChild(op);
    });
    var n = D.left ? D.left('images') : Infinity;
    $('cmNote').textContent = n === Infinity || n >= 5 ? 'هتستهلك 5 صور من باقتك.' :
      'باقتك فيها ' + n + ' صور متاحة النهارده، فهنجهّز أول ' + n + ' تصاميم. اشترك في Pro عشان الحملة الكاملة.';
    $('cmOffer').value = '';
    modal.hidden = false;
    setTimeout(function () { $('cmOffer').focus(); }, 40);
  }

  function load() {
    if (!D.state || !D.state.me) return setTimeout(load, 800);
    D.apiJson('/api/occasions').then(function (r) {
      occasions = (r && r.occasions) || [];
      renderCard();
    }).catch(function () {});
  }
  load();

  D.campaigns = { open: open, list: function () { return occasions; } };
})();
