/* ai-tools: لوحة واحدة فيها ثلاث أدوات: صوت العلامة، مقيّم الجمهور، ومن صورة لكود.
   الكود في site/ai-tools/ (واجهة) وفي api/app/ai-tools/ (الخادم). */
(function () {
  'use strict';
  var D = window.DFAI;
  if (!D) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var TABS = [
    { id: 'voice', label: 'صوت العلامة' },
    { id: 'personas', label: 'تقييم الجمهور' },
    { id: 'shot', label: 'من صورة لكود' },
    { id: 'leads', label: 'باحث العملاء' },
    { id: 'advisor', label: 'المستشار' },
    { id: 'bench', label: 'قارن بالمنافس' },
    { id: 'tasks', label: 'المهام' }
  ];

  function openAiTools() {
    var p = D.showPanel('ai-tools');
    p.innerHTML = '';
    // نفس هوية صفحة نشاطي التجاري: رأس بأيقونة ووصف، وتبويبات بنفس الشكل
    var head = el('div', 'pv');
    var hh = el('div', 'pv-head');
    hh.innerHTML = '<div class="pv-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg></div>' +
      '<div><h1>مركز الأدوات الذكية</h1><p>أدوات الذكاء الاصطناعي لنشاطك. ولا تنفيذ من غير موافقتك.</p></div>';
    var close = el('button', 'icon-btn ait-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    close.addEventListener('click', D.hidePanel);
    hh.appendChild(close);
    head.appendChild(hh);

    var tabs = el('div', 'biz-tabs');
    tabs.setAttribute('role', 'tablist');
    var body = el('div', 'ait-body');

    function show(id) {
      Array.prototype.forEach.call(tabs.children, function (b) {
        var on = b.getAttribute('data-t') === id;
        b.className = on ? 'on' : '';
        b.setAttribute('aria-selected', String(on));
      });
      body.innerHTML = '';
      if (id === 'voice') renderVoice(body);
      else if (id === 'personas') renderPersonas(body);
      else if (id === 'leads') renderLeads(body);
      else if (id === 'advisor') renderAdvisor(body);
      else if (id === 'bench') renderBench(body);
      else if (id === 'tasks') renderTasks(body);
      else renderShot(body);
    }

    TABS.forEach(function (t) {
      var b = el('button', '', t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-t', t.id);
      b.addEventListener('click', function () { show(t.id); });
      tabs.appendChild(b);
    });

    p.appendChild(head);
    p.appendChild(tabs);
    p.appendChild(body);
    p.classList.add('ait-panel');
    show('voice');
  }

  // ---------- الإضافات (BYOK): المستخدم يضيف مفتاح مزوده بنفسه ----------
  // المفتاح يُرسل للسيرفر مرة واحدة ويُمسح من الحقل فوراً، ولا يُعرض أو يُحفظ في المتصفح.
  // الإضافة المختارة للمحادثة (بالسلاج فقط، لا مفاتيح). تُحفظ في المتصفح كتفضيل للمستخدم
  D.getAddon = function () {
    try { return localStorage.getItem('dfai.addon') || ''; } catch (e) { return ''; }
  };
  D.setAddon = function (slug) {
    try { if (slug) localStorage.setItem('dfai.addon', slug); else localStorage.removeItem('dfai.addon'); } catch (e) { /* تجاهل */ }
  };

  // يُعرض من إعدادات الحساب (site/settings.js) وليس من مركز الأدوات
  D.renderAddons = renderAddons;

  // شعارات المزودين: من حزمة simple-icons (CC0) لمزودي Gemini وClaude وOpenRouter، وOpenAI وGroq بحرف بديل حتى تُضاف شعاراتهما الرسمية
  var PROVIDER_LOGOS = {"openai":{"hex":"#191919","path":"M22.282 9.821a6 6 0 0 0-.516-4.91 6.05 6.05 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a6 6 0 0 0-3.998 2.9 6.05 6.05 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.05 6.05 0 0 0 6.515 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.772-4.206 6 6 0 0 0 3.997-2.9 6.06 6.06 0 0 0-.747-7.073M13.26 22.43a4.48 4.48 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.8.8 0 0 0 .392-.681v-6.737l2.02 1.168a.07.07 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494M3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.77.77 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646M2.34 7.896a4.5 4.5 0 0 1 2.366-1.973V11.6a.77.77 0 0 0 .388.677l5.815 3.354-2.02 1.168a.08.08 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.08.08 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667m2.01-3.023-.141-.085-4.774-2.782a.78.78 0 0 0-.785 0L9.409 9.23V6.897a.07.07 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.8.8 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z"},"groq":{"hex":"#191919","path":"M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z"},"gemini":{"hex":"#8E75B2","path":"M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"},"claude":{"hex":"#191919","path":"M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"},"openrouter":{"hex":"#94A3B8","path":"M16.778 1.844v1.919q-.569-.026-1.138-.032-.708-.008-1.415.037c-1.93.126-4.023.728-6.149 2.237-2.911 2.066-2.731 1.95-4.14 2.75-.396.223-1.342.574-2.185.798-.841.225-1.753.333-1.751.333v4.229s.768.108 1.61.333c.842.224 1.789.575 2.185.799 1.41.798 1.228.683 4.14 2.75 2.126 1.509 4.22 2.11 6.148 2.236.88.058 1.716.041 2.555.005v1.918l7.222-4.168-7.222-4.17v2.176c-.86.038-1.611.065-2.278.021-1.364-.09-2.417-.357-3.979-1.465-2.244-1.593-2.866-2.027-3.68-2.508.889-.518 1.449-.906 3.822-2.59 1.56-1.109 2.614-1.377 3.978-1.466.667-.044 1.418-.017 2.278.02v2.176L24 6.014Z"}};
  // شعارات مزودي التسويق: من simple-icons (CC0) لـHubSpot وMailchimp وSemrush، وحرف بديل لـAhrefs وGoogle Trends
  Object.assign(PROVIDER_LOGOS, {"hubspot":{"hex":"#FF7A59","path":"M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"},"mailchimp":{"hex":"#FFE01B","path":"M11.267 0C6.791-.015-1.82 10.246 1.397 12.964l.79.669a3.88 3.88 0 0 0-.22 1.792c.084.84.518 1.644 1.22 2.266.666.59 1.542.964 2.392.964 1.406 3.24 4.62 5.228 8.386 5.34 4.04.12 7.433-1.776 8.854-5.182.093-.24.488-1.316.488-2.267 0-.956-.54-1.352-.885-1.352-.01-.037-.078-.286-.172-.586-.093-.3-.19-.51-.19-.51.375-.563.382-1.065.332-1.35-.053-.353-.2-.653-.496-.964-.296-.311-.902-.63-1.753-.868l-.446-.124c-.002-.019-.024-1.053-.043-1.497-.014-.32-.042-.822-.197-1.315-.186-.668-.508-1.253-.911-1.627 1.112-1.152 1.806-2.422 1.804-3.511-.003-2.095-2.576-2.729-5.746-1.416l-.672.285A678.22 678.22 0 0 0 12.7.504C12.304.159 11.817.002 11.267 0zm.073.873c.166 0 .322.019.465.058.297.084 1.28 1.224 1.28 1.224s-1.826 1.013-3.52 2.426c-2.28 1.757-4.005 4.311-5.037 7.082-.811.158-1.526.618-1.963 1.253-.261-.218-.748-.64-.834-.804-.698-1.326.761-3.902 1.781-5.357C5.834 3.44 9.37.867 11.34.873zm3.286 3.273c.04-.002.06.05.028.074-.143.11-.299.26-.413.414a.04.04 0 0 0 .031.064c.659.004 1.587.235 2.192.574.041.023.012.103-.034.092-.915-.21-2.414-.369-3.97.01-1.39.34-2.45.863-3.224 1.426-.04.028-.086-.023-.055-.06.896-1.035 1.999-1.935 2.987-2.44.034-.018.07.019.052.052-.079.143-.23.447-.278.678-.007.035.032.063.062.042.615-.42 1.684-.868 2.622-.926zm3.023 3.205l.056.001a.896.896 0 0 1 .456.146c.534.355.61 1.216.638 1.845.015.36.059 1.229.074 1.478.034.571.184.651.487.751.17.057.33.098.563.164.706.198 1.125.4 1.39.658.157.162.23.333.253.497.083.608-.472 1.36-1.942 2.041-1.607.746-3.557.935-4.904.785l-.471-.053c-1.078-.145-1.693 1.247-1.046 2.201.417.615 1.552 1.015 2.688 1.015 2.604 0 4.605-1.111 5.35-2.072a.987.987 0 0 0 .06-.085c.036-.055.006-.085-.04-.054-.608.416-3.31 2.069-6.2 1.571 0 0-.351-.057-.672-.182-.255-.1-.788-.344-.853-.891 2.333.72 3.801.039 3.801.039a.072.072 0 0 0 .042-.072.067.067 0 0 0-.074-.06s-1.911.283-3.718-.378c.197-.64.72-.408 1.51-.345a11.045 11.045 0 0 0 3.647-.394c.818-.234 1.892-.697 2.727-1.356.281.618.38 1.299.38 1.299s.219-.04.4.073c.173.106.299.326.213.895-.176 1.063-.628 1.926-1.387 2.72a5.714 5.714 0 0 1-1.666 1.244c-.34.18-.704.334-1.087.46-2.863.935-5.794-.093-6.739-2.3a3.545 3.545 0 0 1-.189-.522c-.403-1.455-.06-3.2 1.008-4.299.065-.07.132-.153.132-.256 0-.087-.055-.179-.102-.243-.374-.543-1.669-1.466-1.409-3.254.187-1.284 1.31-2.189 2.357-2.135.089.004.177.01.266.015.453.027.85.085 1.223.1.625.028 1.187-.063 1.853-.618.225-.187.405-.35.71-.401.028-.005.092-.028.215-.028zm.022 2.18a.42.42 0 0 0-.06.005c-.335.054-.347.468-.228 1.04.068.32.187.595.32.765.175-.02.343-.022.498 0 .089-.205.104-.557.024-.942-.112-.535-.261-.872-.554-.868zm-3.66 1.546a1.724 1.724 0 0 0-1.016.326c-.16.117-.311.28-.29.378.008.032.031.056.088.063.131.015.592-.217 1.122-.25.374-.023.684.094.923.2.239.104.386.173.443.113.037-.038.026-.11-.031-.204-.118-.192-.36-.387-.618-.497a1.601 1.601 0 0 0-.621-.129zm4.082.81c-.171-.003-.313.186-.317.42-.004.236.131.43.303.432.172.003.314-.185.318-.42.004-.236-.132-.429-.304-.432zm-3.58.172c-.05 0-.102.002-.155.008-.311.05-.483.152-.593.247-.094.082-.152.173-.152.237a.075.075 0 0 0 .075.076c.07 0 .228-.063.228-.063a1.98 1.98 0 0 1 1.001-.104c.157.018.23.027.265-.026.01-.016.022-.049-.01-.1-.063-.103-.311-.269-.66-.275zm2.26.4c-.127 0-.235.051-.283.148-.075.154.035.363.246.466.21.104.443.063.52-.09.075-.155-.035-.364-.246-.467a.542.542 0 0 0-.237-.058zm-11.635.024c.048 0 .098 0 .149.003.73.04 1.806.6 2.052 2.19.217 1.41-.128 2.843-1.449 3.069-.123.02-.248.029-.374.026-1.22-.033-2.539-1.132-2.67-2.435-.145-1.44.591-2.548 1.894-2.811.117-.024.252-.04.398-.042zm-.07.927a1.144 1.144 0 0 0-.847.364c-.38.418-.439.988-.366 1.19.027.073.07.094.1.098.064.008.16-.039.22-.2a1.2 1.2 0 0 0 .017-.052 1.58 1.58 0 0 1 .157-.37.689.689 0 0 1 .955-.199c.266.174.369.5.255.81-.058.161-.154.469-.133.721.043.511.357.717.64.738.274.01.466-.143.515-.256.029-.067.005-.107-.011-.125-.043-.053-.113-.037-.18-.021a.638.638 0 0 1-.16.022.347.347 0 0 1-.294-.148c-.078-.12-.073-.3.013-.504.011-.028.025-.058.04-.092.138-.308.368-.825.11-1.317-.195-.37-.513-.602-.894-.65a1.135 1.135 0 0 0-.138-.01z"},"semrush":{"hex":"#FF642D","path":"M20.698 11.911c0 .444-.226.516-.79.516-.596 0-.706-.1-.77-.554-.118-1.152-.896-2.13-2.201-2.24-.418-.034-.518-.19-.518-.706 0-.48.074-.708.446-.708 2.265.01 3.833 1.832 3.833 3.69v.002zm3.3 0c0-3.456-2.338-7.11-7.74-7.11H5.52c-.218 0-.354.11-.354.31 0 .109.082.209.156.26.388.31.97.654 1.73 1.036.743.372 1.323.616 1.903.852.246.1.336.208.336.344 0 .19-.136.308-.4.308H.372c-.254 0-.372.164-.372.326 0 .136.044.254.162.372.69.726 1.796 1.596 3.4 2.604 1.466.91 2.98 1.74 4.533 2.492.236.11.308.236.308.372-.008.154-.126.28-.4.28H4.1c-.216 0-.344.12-.344.3 0 .1.08.226.19.326.888.808 2.311 1.688 4.207 2.494 2.53 1.08 5.094 1.721 7.98 1.721 5.465 0 7.867-4.087 7.867-7.289l-.002.002zm-7.133 5.104c-2.794 0-5.132-2.276-5.132-5.114 0-2.794 2.33-5.04 5.132-5.04 2.863 0 5.111 2.24 5.111 5.04a5.086 5.086 0 0 1-5.111 5.114z"},"ahrefs":{"hex":"#F36F21","letter":"A"},"google-trends":{"hex":"#4285F4","letter":"G"}});
  function providerLogo(slug, name) {
    var wrap = el('span', 'ait-logo');
    wrap.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;margin-inline-end:8px;border-radius:8px;background:#fff;flex:0 0 auto';
    var P = PROVIDER_LOGOS[slug];
    if (P && P.path) wrap.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="' + P.hex + '" d="' + P.path + '"/></svg>';
    else { wrap.textContent = (P && P.letter) || (name || '?').charAt(0); wrap.style.color = (P && P.hex) || '#64748B'; wrap.style.fontWeight = '700'; }
    return wrap;
  }

  // وصف قصير لكل مزود يظهر تحت اسمه في القائمة
  var ADDON_DESC = {
    openai: 'نماذج GPT للمحادثة والكتابة',
    gemini: 'نماذج Google Gemini',
    claude: 'نماذج Anthropic Claude',
    groq: 'استدلال سريع لنماذج مفتوحة',
    openrouter: 'عشرات النماذج بمفتاح واحد',
    semrush: 'أبحاث الكلمات المفتاحية والمنافسين',
    ahrefs: 'تحليل الروابط وأبحاث SEO',
    hubspot: 'CRM وتسويق وأتمتة المبيعات',
    mailchimp: 'إرسال النشرات والحملات البريدية',
    'google-trends': 'اتجاهات البحث عبر SerpApi'
  };

  var ADDON_CSS = '.ait-row{border:1px solid rgba(127,127,127,.22);border-radius:14px;background:rgba(127,127,127,.07);margin-bottom:10px;overflow:hidden}' +
    '.ait-row-main{display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer}' +
    '.ait-row-txt{flex:1;min-width:0;display:flex;flex-direction:column}' +
    '.ait-row-txt small{opacity:.7;font-size:12px;margin-top:2px}' +
    '.ait-row-end{display:flex;align-items:center;gap:8px}' +
    '.ait-chip{font-size:12px;opacity:.85;white-space:nowrap}' +
    '.ait-plus{width:32px;height:32px;border-radius:50%;border:1px solid rgba(127,127,127,.45);background:transparent;color:inherit;font-size:18px;line-height:1;cursor:pointer}' +
    '.ait-row-det{padding:0 14px 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}' +
    '.ait-row-det[hidden]{display:none}' +
    '.ait-row-det input{flex:1;min-width:180px}' +
    '.ait-pinned{display:flex;gap:10px;flex-wrap:wrap;margin:8px 0 6px}' +
    '.ait-pin{border:1px solid rgba(127,127,127,.25);border-radius:12px;background:rgba(127,127,127,.07);padding:6px;cursor:pointer;display:inline-flex}' +
    '.ait-search{width:100%;margin:10px 0 12px;padding:10px 14px;border-radius:12px;border:1px solid rgba(127,127,127,.3);background:transparent;color:inherit;box-sizing:border-box}' +
    '.ait-group{margin:18px 0 8px;font-size:15px}' +
    '.ait-marquee{overflow:hidden;margin:14px 0 4px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}' +
    '.ait-marquee-track{display:flex;width:max-content;animation:aitMarquee 36s linear infinite}' +
    '.ait-marquee:hover .ait-marquee-track{animation-play-state:paused}' +
    '.ait-marquee-group{display:flex;gap:12px;padding-inline-end:12px}' +
    '.ait-marquee-item{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid rgba(127,127,127,.22);border-radius:12px;background:rgba(127,127,127,.07);white-space:nowrap;font-size:13px}' +
    '@keyframes aitMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
    '@media (prefers-reduced-motion:reduce){.ait-marquee-track{animation:none}}' +
    '.ait-logo{width:34px!important;height:34px!important;border:1px solid rgba(0,0,0,.14)!important;box-sizing:border-box}' +
    '.ait-logo svg{width:22px!important;height:22px!important;display:block}' +
    '.ait-marquee-item{background:rgba(127,127,127,.12)!important}';

  function renderAddons(body) {
    if (!document.getElementById('ait-addons-css')) {
      var st0 = document.createElement('style');
      st0.id = 'ait-addons-css';
      st0.textContent = ADDON_CSS;
      document.head.appendChild(st0);
    }
    body.appendChild(el('p', '', 'اربط مفتاح API الخاص بك عند المزود. المزود يحاسبك مباشرة على استخدامك، ولا نستخدم مفاتيح أي مستخدم غيرك. عند تفعيل الإضافة يرسل سياق المحادثة إلى مزودك.'));
    var picked = el('div', 'ait-status');
    body.appendChild(picked);
    // شريط متحرك بشعارات كل المزودين فوق البحث (يتكرر مرتين لحلقة متصلة)
    var marq = el('div', 'ait-marquee');
    var track = el('div', 'ait-marquee-track');
    marq.appendChild(track);
    body.appendChild(marq);
    var search = el('input', 'ait-search');
    search.type = 'search';
    search.placeholder = 'بحث في المكونات الإضافية';
    body.appendChild(search);
    var status = el('div', 'ait-status', 'جارٍ التحميل…');
    body.appendChild(status);
    var pinnedWrap = el('div');
    body.appendChild(pinnedWrap);
    var list = el('div', 'ait-addons');
    body.appendChild(list);

    var cat = null, ints = [];
    var open = {}; // المزودون المفتوحة تفاصيلهم

    function linkOf(slug) {
      return ints.filter(function (i) { return i.addon === slug; })[0] || null;
    }

    function renderPicked() {
      var cur = D.getAddon();
      picked.innerHTML = '';
      if (!cur) return;
      picked.appendChild(el('span', '', 'المحادثة تستخدم إضافتك الآن: ' + cur + ' '));
      var off = el('button', 'btn-ghost sm', 'رجوع للنموذج العادي');
      off.type = 'button';
      off.addEventListener('click', function () { D.setAddon(''); renderPicked(); paint(); });
      picked.appendChild(off);
    }
    renderPicked();

    search.addEventListener('input', paint);

    function load() {
      status.textContent = 'جارٍ التحميل…';
      Promise.all([D.apiJson('/api/addons/catalog'), D.apiJson('/api/addons/integrations')])
        .then(function (r) {
          cat = r[0];
          ints = r[1].integrations || [];
          track.innerHTML = '';
          [0, 1].forEach(function () {
            var g = el('div', 'ait-marquee-group');
            (cat.providers || []).forEach(function (p) {
              var it = el('span', 'ait-marquee-item');
              it.appendChild(providerLogo(p.slug, p.name));
              it.appendChild(el('span', '', p.name));
              g.appendChild(it);
            });
            track.appendChild(g);
          });
          status.textContent = cat.enabled ? '' : 'الإضافات غير مفعّلة على السيرفر حالياً.';
          paint();
        })
        .catch(function (ex) { status.textContent = ex.message || 'تعذّر تحميل الإضافات.'; });
    }

    function paint() {
      if (!cat) return;
      var q = search.value.trim().toLowerCase();
      var providers = cat.providers || [];
      var matches = function (p) {
        return !q || p.name.toLowerCase().indexOf(q) >= 0 || (ADDON_DESC[p.slug] || '').toLowerCase().indexOf(q) >= 0;
      };

      // المثبّتة: المزودون المرتبطون والناجح اختبارهم
      pinnedWrap.innerHTML = '';
      var pinned = providers.filter(function (p) { var l = linkOf(p.slug); return l && l.status === 'verified'; });
      if (pinned.length) {
        pinnedWrap.appendChild(el('h3', 'ait-group', 'المثبّتة'));
        var prow = el('div', 'ait-pinned');
        pinned.forEach(function (p) {
          var b = el('button', 'ait-pin');
          b.type = 'button';
          b.title = p.name;
          b.appendChild(providerLogo(p.slug, p.name));
          b.addEventListener('click', function () {
            open[p.slug] = true;
            paint();
            var target = list.querySelector('[data-slug="' + p.slug + '"]');
            if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
          prow.appendChild(b);
        });
        pinnedWrap.appendChild(prow);
      }

      list.innerHTML = '';
      [
        { title: '1. نماذج الذكاء الاصطناعي', category: 'chat' },
        { title: '2. Marketing & SEO', category: 'marketing' }
      ].forEach(function (g) {
        var items = providers.filter(function (p) { return p.category === g.category && matches(p); });
        if (!items.length) return;
        list.appendChild(el('h3', 'ait-group', g.title));
        items.forEach(function (p) {
          list.appendChild(providerRow(p, linkOf(p.slug), cat.enabled));
        });
      });
      if (!list.children.length) list.appendChild(el('p', 'ait-status', 'لا توجد نتائج.'));
    }

    function providerRow(p, link, enabled) {
      var wrap = el('div', 'ait-row');
      wrap.setAttribute('data-slug', p.slug);

      var main = el('div', 'ait-row-main');
      main.appendChild(providerLogo(p.slug, p.name));
      var txt = el('div', 'ait-row-txt');
      txt.appendChild(el('strong', '', p.name));
      txt.appendChild(el('small', '', ADDON_DESC[p.slug] || ''));
      main.appendChild(txt);
      var end = el('div', 'ait-row-end');
      if (link) end.appendChild(el('span', 'ait-chip', link.status === 'verified' ? 'مربوطة ✓' : 'الاختبار الأخير فشل'));
      var plus = el('button', 'ait-plus', open[p.slug] ? '−' : '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'تفاصيل');
      end.appendChild(plus);
      main.appendChild(end);
      wrap.appendChild(main);

      var det = el('div', 'ait-row-det');
      det.hidden = !open[p.slug];
      var toggle = function () {
        open[p.slug] = !open[p.slug];
        det.hidden = !open[p.slug];
        plus.textContent = open[p.slug] ? '−' : '+';
      };
      main.addEventListener('click', toggle);
      plus.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });

      if (!link) {
        var input = el('input');
        input.type = 'password';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.placeholder = 'الصق مفتاح ' + p.name + ' هنا';
        input.disabled = !enabled;
        var go = el('button', 'btn-primary sm', 'اختبار واربط');
        go.type = 'button';
        go.disabled = !enabled;
        var msg = el('div', 'ait-status');
        msg.style.width = '100%';
        det.appendChild(input);
        det.appendChild(go);
        det.appendChild(msg);
        go.addEventListener('click', function () {
          var key = input.value.trim();
          input.value = '';
          if (key.length < 8) { D.toast('الصق المفتاح كاملاً.'); return; }
          go.disabled = true;
          msg.textContent = 'جارٍ اختبار المفتاح مع المزود…';
          D.apiJson('/api/addons/integrations', { method: 'POST', body: JSON.stringify({ addon: p.slug, apiKey: key }) })
            .then(function (d) { D.toast(d.message || 'تم الربط ✅'); load(); })
            .catch(function (ex) { msg.textContent = ex.message || 'تعذّر الربط.'; go.disabled = false; });
        });
      } else {
        det.appendChild(el('span', 'ait-status', 'المفتاح ' + link.keyHint));
        if (p.category === 'chat') {
          var on = el('button', link.enabled ? 'btn-ghost sm' : 'btn-primary sm', link.enabled ? 'إيقاف' : 'تفعيل');
          on.type = 'button';
          on.disabled = link.status !== 'verified';
          on.addEventListener('click', function () {
            on.disabled = true;
            D.apiJson('/api/addons/enabled/' + p.slug, { method: 'PUT', body: JSON.stringify({ enabled: !link.enabled }) })
              .then(function () { D.toast(link.enabled ? 'اتوقفت الإضافة' : 'اتفعّلت الإضافة ✅'); load(); })
              .catch(function (ex) { D.toast(ex.message || 'تعذّر التغيير.'); on.disabled = false; });
          });
          var use = el('button', 'btn-primary sm', D.getAddon() === p.slug ? 'مستخدمة في المحادثة الآن' : 'استخدم في المحادثة');
          use.type = 'button';
          use.disabled = !link.enabled || link.status !== 'verified' || D.getAddon() === p.slug;
          use.addEventListener('click', function () { D.setAddon(p.slug); D.toast('تم اختيار الإضافة للمحادثة'); load(); });
          det.appendChild(on);
          det.appendChild(use);
        }
        var test = el('button', 'btn-ghost sm', 'اختبار الآن');
        test.type = 'button';
        test.addEventListener('click', function () {
          test.disabled = true;
          D.apiJson('/api/addons/integrations/' + link.id + '/test', { method: 'POST' })
            .then(function (d) { D.toast(d.message || ''); load(); })
            .catch(function (ex) { D.toast(ex.message || 'تعذّر الاختبار.'); test.disabled = false; });
        });
        var del = el('button', 'btn-ghost sm', 'حذف الربط');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (!window.confirm('تحذف الربط والمفتاح المحفوظ؟ الإضافة هتتوقف.')) return;
          D.apiJson('/api/addons/integrations/' + link.id, { method: 'DELETE' })
            .then(function () { D.toast('اتحذف الربط'); load(); })
            .catch(function (ex) { D.toast(ex.message || 'تعذّر الحذف.'); });
        });
        det.appendChild(test);
        det.appendChild(del);
      }
      wrap.appendChild(det);
      return wrap;
    }

    load();
  }

  // ---------- 1) صوت العلامة ----------
  function renderVoice(body) {
    body.appendChild(el('p', '', 'الصق نصوص كتبتها أنت أو فريقك (منشورات، إعلانات، رسائل)، حتى 20 ألف حرف، وأنا أستخرج ملف أسلوب. الكلام الأصلي ما بيتحفظش، بس الملف، وأي نص بعد كده بيتكتب بنفس الأسلوب.'));
    var status = el('div', 'ait-status', 'جارٍ التحميل…');
    body.appendChild(status);
    var ta = el('textarea');
    ta.rows = 8;
    ta.maxLength = 20000;
    ta.placeholder = 'الصق هنا 300 حرف على الأقل…';
    body.appendChild(ta);
    var row = el('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var save = el('button', 'btn-primary sm', 'احفظ الأسلوب');
    save.type = 'button';
    var clear = el('button', 'btn-ghost sm', 'امسح الأسلوب المحفوظ');
    clear.type = 'button';
    row.appendChild(save);
    row.appendChild(clear);
    body.appendChild(row);

    function paint(d) {
      if (d.profile) {
        status.textContent = 'الأسلوب المحفوظ: ' + d.profile;
      } else {
        status.textContent = 'مفيش أسلوب محفوظ لسه.';
      }
    }
    D.apiJson('/api/ai-tools/voice').then(paint).catch(function () { status.textContent = 'تعذّر تحميل الأسلوب.'; });

    save.addEventListener('click', function () {
      var text = ta.value.trim();
      if (text.length < 300) { D.toast('الصق 300 حرف على الأقل.'); return; }
      save.disabled = true;
      status.textContent = 'جارٍ تحليل الأسلوب…';
      D.apiJson('/api/ai-tools/voice', { method: 'POST', body: JSON.stringify({ samples: text }) })
        .then(function (d) { paint(d); ta.value = ''; D.toast('اتحفظ الأسلوب ✅'); })
        .catch(function (ex) { status.textContent = ''; D.toast(ex.message || 'تعذّر الحفظ.'); })
        .then(function () { save.disabled = false; });
    });
    clear.addEventListener('click', function () {
      if (!window.confirm('تمسح الأسلوب المحفوظ؟')) return;
      D.apiJson('/api/ai-tools/voice', { method: 'DELETE' })
        .then(function () { paint({ profile: null }); D.toast('اتمسح الأسلوب'); })
        .catch(function () { D.toast('تعذّر المسح.'); });
    });
  }

  // ---------- 2) تقييم الجمهور ----------
  function renderPersonas(body) {
    body.appendChild(el('p', '', 'اكتب الإعلان أو العرض، وثلاث شخصيات افتراضية (من الإمارات والخليج والمقيمين) بيقرأوه ويقولوا رأيهم. ده تقدير بالذكاء الاصطناعي، مش بيانات جمهور حقيقي.'));
    var ta = el('textarea');
    ta.rows = 5;
    ta.maxLength = 2000;
    ta.placeholder = 'مثال: خصم 30% على كل العطور لحد نهاية الأسبوع، توصيل مجاني داخل دبي';
    body.appendChild(ta);
    var go = el('button', 'btn-primary sm', 'جرّب على الشخصيات');
    go.type = 'button';
    go.style.justifySelf = 'start';
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    go.addEventListener('click', function () {
      var text = ta.value.trim();
      if (text.length < 10) { D.toast('اكتب الإعلان أو العرض الأول.'); return; }
      go.disabled = true;
      out.textContent = 'الشخصيات بتقرأ…';
      D.apiJson('/api/ai-tools/personas', { method: 'POST', body: JSON.stringify({ content: text }) })
        .then(function (d) {
          out.innerHTML = '';
          (d.critiques || []).forEach(function (c) {
            var card = el('div', 'ait-card');
            card.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:4px';
            card.appendChild(el('strong', '', c.name));
            card.appendChild(el('div', '', '💬 ' + c.reaction));
            card.appendChild(el('div', '', '⚠️ ' + c.objection));
            card.appendChild(el('div', '', '💡 ' + c.suggestion));
            out.appendChild(card);
          });
          if (d.note) out.appendChild(el('p', 'guest-note', d.note));
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر التجربة.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 3) من صورة لكود ----------
  function renderShot(body) {
    body.appendChild(el('p', '', 'ارفع لقطة شاشة لتصميم أعجبك، أو كروكي بإيدك. هيتحوّل لملف HTML واحد تقدر تعدّله في محرر الموقع. بيستهلك من حصة الصور في باقتك.'));
    var file = el('input');
    file.type = 'file';
    file.accept = 'image/png,image/jpeg,image/webp';
    body.appendChild(file);
    var preview = el('img');
    preview.alt = '';
    preview.style.cssText = 'max-width:100%;max-height:260px;border-radius:12px;display:none';
    body.appendChild(preview);
    var go = el('button', 'btn-primary sm', 'حوّل لكود');
    go.type = 'button';
    go.style.justifySelf = 'start';
    go.disabled = true;
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);
    var dataUrl = null;
    var html = null;

    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      dataUrl = null;
      go.disabled = true;
      if (!f) return;
      if (f.size > 2.5 * 1024 * 1024) { D.toast('الصورة كبيرة. الحد 2.5 ميجا.'); file.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function () {
        dataUrl = reader.result;
        preview.src = dataUrl;
        preview.style.display = 'block';
        go.disabled = false;
      };
      reader.readAsDataURL(f);
    });

    go.addEventListener('click', function () {
      if (!dataUrl) return;
      go.disabled = true;
      out.textContent = 'جارٍ التحويل… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/screenshot', { method: 'POST', body: JSON.stringify({ image: dataUrl }) })
        .then(function (d) {
          html = d.html;
          out.innerHTML = '';
          out.appendChild(el('p', '', 'جاهز. افتحه في المحرر وعدّله، أو انسخ الكود.'));
          var row = el('div');
          row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
          var open = el('button', 'btn-primary sm', 'افتح في محرر الموقع');
          open.type = 'button';
          open.addEventListener('click', function () {
            D.openEditor({ content: '```html\n' + html + '\n```' }, document.createElement('div'));
          });
          var copy = el('button', 'btn-ghost sm', 'انسخ الكود');
          copy.type = 'button';
          copy.addEventListener('click', function () {
            var done = function () { D.toast('الكود اتنسخ ✅'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(html).then(done, done);
          });
          row.appendChild(open);
          row.appendChild(copy);
          out.appendChild(row);
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر التحويل.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 6) المهام: اللي شغال في الخلفية ومصيره ----------
  var TASK_KIND = { 'ad-benchmark': 'مقارنة إعلان', 'advisor-market': 'توصيات المستشار' };
  var TASK_STATUS = { queued: 'في الانتظار', running: 'جارٍ التنفيذ', done: 'خلصت', failed: 'فشلت', cancelled: 'ملغاة' };

  function renderTasks(body) {
    var head = el('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px';
    head.appendChild(el('p', '', 'هنا كل المهام اللي شغالة في الخلفية. المهمة بتكمل حتى لو قفلت الصفحة، والنتيجة بتفضل هنا.'));
    var refresh = el('button', 'btn-ghost sm', 'تحديث');
    refresh.type = 'button';
    head.appendChild(refresh);
    body.appendChild(head);
    var list = el('div');
    list.style.cssText = 'display:grid;gap:10px';
    body.appendChild(list);
    var timer = null;

    function taskCard(t) {
      var c = el('div');
      c.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:6px';
      c.appendChild(el('strong', '', TASK_KIND[t.kind] || t.kind));
      c.appendChild(el('div', 'guest-note', (TASK_STATUS[t.status] || t.status) + ' · ' + new Date(t.created_at).toLocaleString('ar-AE')));
      if (t.status === 'failed') c.appendChild(el('div', '', t.error || 'فشلت المهمة.'));
      if (t.status === 'done' && t.result) {
        if (t.kind === 'ad-benchmark') {
          var box = el('div');
          renderBenchResult(box, t.result);
          c.appendChild(box);
        } else {
          c.appendChild(el('div', '', 'اتضافت توصية جديدة في تبويب المستشار ✅'));
        }
      }
      if (t.status === 'queued') {
        var cancel = el('button', 'btn-ghost sm', 'إلغاء');
        cancel.type = 'button';
        cancel.style.justifySelf = 'start';
        cancel.addEventListener('click', function () {
          cancel.disabled = true;
          D.apiJson('/api/tasks/' + t.id + '/cancel', { method: 'POST' })
            .then(load)
            .catch(function (ex) { D.toast(ex.message || 'تعذّر الإلغاء.'); cancel.disabled = false; });
        });
        c.appendChild(cancel);
      }
      return c;
    }

    function load() {
      clearTimeout(timer);
      if (!list.isConnected) return; // قفلنا التبويب، نوقف التحديث
      D.apiJson('/api/tasks')
        .then(function (d) {
          var tasks = d.tasks || [];
          list.innerHTML = '';
          if (!tasks.length) list.appendChild(el('p', 'guest-note', 'لسه ما فيش مهام.'));
          tasks.forEach(function (t) { list.appendChild(taskCard(t)); });
          if (tasks.some(function (t) { return t.status === 'queued' || t.status === 'running'; })) timer = setTimeout(load, 5000);
        })
        .catch(function (ex) { list.textContent = ex.message || 'تعذّر تحميل المهام.'; });
    }

    refresh.addEventListener('click', load);
    load();
  }

  // ---------- 5) قارن إعلانك بالمنافس: المستخدم يرفع الإعلانين بنفسه ----------
  function renderBench(body) {
    body.appendChild(el('p', '', 'ارفع إعلانك وإعلان المنافس اللي عندك (صورة أو نص لكل واحد). هنقارنهم ونديك تقدير من 10 وتوصيات تفرّقك. التقدير على المادة المرفوعة بس، ومش توقع للمبيعات.'));
    var sides = {};
    ['mine', 'rival'].forEach(function (key) {
      var box = el('div', 'ait-side');
      box.style.cssText = 'display:grid;gap:8px;padding:12px;border:1px solid var(--border,#e5e5e5);border-radius:12px';
      box.appendChild(el('strong', '', key === 'mine' ? 'إعلانك' : 'إعلان المنافس'));
      var ta = el('textarea');
      ta.rows = 3;
      ta.maxLength = 1500;
      ta.placeholder = 'اكتب نص الإعلان أو الهوك (اختياري لو رفعت صورة)';
      var file = el('input');
      file.type = 'file';
      file.accept = 'image/png,image/jpeg,image/webp';
      var prev = el('img');
      prev.alt = '';
      prev.style.cssText = 'max-width:100%;max-height:200px;border-radius:12px;display:none';
      box.appendChild(ta);
      box.appendChild(file);
      box.appendChild(prev);
      body.appendChild(box);
      sides[key] = { ta: ta, image: null };
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        sides[key].image = null;
        prev.style.display = 'none';
        if (!f) return;
        if (f.size > 2.5 * 1024 * 1024) { D.toast('الصورة كبيرة. الحد 2.5 ميجا.'); file.value = ''; return; }
        var reader = new FileReader();
        reader.onload = function () {
          sides[key].image = reader.result;
          prev.src = reader.result;
          prev.style.display = 'block';
        };
        reader.readAsDataURL(f);
      });
    });

    var row = el('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var go = el('button', 'btn-primary sm', 'قارن');
    go.type = 'button';
    var bg = el('button', 'btn-ghost sm', 'شغّلها في الخلفية');
    bg.type = 'button';
    row.appendChild(go);
    row.appendChild(bg);
    body.appendChild(row);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    function value(s) { return { text: s.ta.value.trim(), image: s.image }; }

    // يرجّع الإعلانين لو الاتنين فيهم محتوى، وإلا null
    function pair() {
      var mine = value(sides.mine);
      var rival = value(sides.rival);
      if (!(mine.text || mine.image) || !(rival.text || rival.image)) {
        D.toast('ارفع أو اكتب إعلانك وإعلان المنافس.');
        return null;
      }
      return { mine: mine, rival: rival };
    }

    bg.addEventListener('click', function () {
      var p = pair();
      if (!p) return;
      bg.disabled = true;
      D.apiJson('/api/tasks', { method: 'POST', body: JSON.stringify({ kind: 'ad-benchmark', payload: p }) })
        .then(function () { D.toast('هتلاقي النتيجة في تبويب المهام'); })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر بدء المهمة.'); })
        .then(function () { bg.disabled = false; });
    });

    go.addEventListener('click', function () {
      var p = pair();
      if (!p) return;
      var mine = p.mine;
      var rival = p.rival;
      go.disabled = true;
      out.textContent = 'جارٍ المقارنة… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/ad-benchmark', { method: 'POST', body: JSON.stringify({ mine: mine, rival: rival }) })
        .then(function (d) { renderBenchResult(out, d); })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّرت المقارنة.'; })
        .then(function () { go.disabled = false; });
    });
  }

  function renderBenchResult(out, d) {
    out.innerHTML = '';
    var head = el('div');
    head.style.cssText = 'display:flex;align-items:baseline;gap:8px';
    var big = el('strong', '', String(d.score));
    big.style.fontSize = '28px';
    head.appendChild(big);
    head.appendChild(el('span', '', '/ 10 تقدير إعلانك'));
    out.appendChild(head);
    if (d.summary) out.appendChild(el('p', '', d.summary));
    (d.criteria || []).forEach(function (c) {
      out.appendChild(el('p', '', c.name + ': ' + c.score + '/10 — ' + c.note));
    });
    if (d.recommendations && d.recommendations.length) {
      out.appendChild(el('strong', '', 'توصيات قبل ما تنشر'));
      var ol = el('ol');
      d.recommendations.forEach(function (r) {
        var li = el('li');
        li.appendChild(el('b', '', r.title));
        li.appendChild(document.createTextNode(' — ' + r.change));
        ol.appendChild(li);
      });
      out.appendChild(ol);
    }
    out.appendChild(el('small', '', d.caveat || ''));
  }

  // ---------- 4) باحث العملاء: بحث + فحص مجاني + رسالة مقترحة. الإرسال يدوي دايماً ----------
  function renderLeads(body) {
    body.appendChild(el('p', '', 'ابحث عن نشاطات في مجال ومدينة معينة، وشوف ملاحظات الفحص المجاني لموقع كل واحد. بعدين تكتب رسالة مقترحة وتنسخها وتبعتها بنفسك.'));
    body.appendChild(el('p', 'guest-note', 'قبل ما تتواصل مع أي نشاط، اتأكد إنك مسموح تبعتله. المنصة ما بتجمعش أرقام أو إيميلات، ولا بتبعت أي حاجة بدالك.'));
    var cat = el('input');
    cat.type = 'text';
    cat.maxLength = 60;
    cat.placeholder = 'نوع النشاط، مثال: مطعم، صالون تجميل';
    var city = el('input');
    city.type = 'text';
    city.maxLength = 40;
    city.placeholder = 'المدينة، مثال: دبي';
    body.appendChild(cat);
    body.appendChild(city);
    var go = el('button', 'btn-primary sm', 'ابحث');
    go.type = 'button';
    go.style.justifySelf = 'start';
    body.appendChild(go);
    var out = el('div', 'ait-out');
    body.appendChild(out);

    function draftFor(lead, box) {
      box.innerHTML = '';
      box.appendChild(el('p', 'guest-note', 'جاري كتابة الرسالة…'));
      D.apiJson('/api/ai-tools/outreach', { method: 'POST', body: JSON.stringify({ name: lead.name, issues: lead.issues }) })
        .then(function (d) {
          box.innerHTML = '';
          var ta = el('textarea');
          ta.rows = 5;
          ta.value = d.draft || '';
          box.appendChild(ta);
          var copy = el('button', 'btn-ghost sm', 'انسخ الرسالة');
          copy.type = 'button';
          copy.addEventListener('click', function () {
            var done = function () { D.toast('الرسالة اتنسخت ✅'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, done);
          });
          box.appendChild(copy);
        })
        .catch(function (ex) { box.textContent = ex.message || 'تعذّر كتابة الرسالة.'; });
    }

    go.addEventListener('click', function () {
      var c = cat.value.trim();
      var t = city.value.trim();
      if (c.length < 2 || t.length < 2) { D.toast('اكتب نوع النشاط والمدينة.'); return; }
      go.disabled = true;
      out.textContent = 'بنبحث ونفحص المواقع… ممكن ياخد دقيقة.';
      D.apiJson('/api/ai-tools/leads', { method: 'POST', body: JSON.stringify({ category: c, city: t }) })
        .then(function (d) {
          out.innerHTML = '';
          if (!d.leads || !d.leads.length) { out.textContent = d.note || 'مالقيتش نتايج.'; return; }
          d.leads.forEach(function (lead) {
            var card = el('div', 'ait-card');
            card.style.cssText = 'border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px;display:grid;gap:6px';
            card.appendChild(el('strong', '', lead.name));
            var link = el('a', '', lead.url);
            link.href = lead.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.cssText = 'font-size:12px;word-break:break-all';
            card.appendChild(link);
            if (!lead.issues.length) {
              card.appendChild(el('div', '', 'الفحص الأساسي ما لقاش مشاكل واضحة.'));
            } else {
              var ul = el('ul');
              ul.style.cssText = 'margin:0;padding-inline-start:18px;display:grid;gap:2px;font-size:14px';
              lead.issues.forEach(function (i) { ul.appendChild(el('li', '', i)); });
              card.appendChild(ul);
            }
            var draftBtn = el('button', 'btn-ghost sm', 'اكتب رسالة مقترحة');
            draftBtn.type = 'button';
            draftBtn.style.justifySelf = 'start';
            var box = el('div');
            draftBtn.addEventListener('click', function () { draftFor(lead, box); });
            card.appendChild(draftBtn);
            card.appendChild(box);
            out.appendChild(card);
          });
          if (d.note) out.appendChild(el('p', 'guest-note', d.note));
        })
        .catch(function (ex) { out.textContent = ex.message || 'تعذّر البحث.'; })
        .then(function () { go.disabled = false; });
    });
  }

  // ---------- 5) المستشار: تحليل السوق + توصيات بانتظار موافقتك. ما فيش أي تنفيذ تلقائي ----------
  var KIND_LABEL = { budget: 'ميزانية', content: 'محتوى', pricing: 'تسعير', other: 'أخرى' };
  var STATUS_LABEL = { pending: 'بانتظار موافقتك', approved: 'موافق عليها', rejected: 'مرفوضة', done: 'تم تنفيذها يدوياً' };
  var VERDICT_LABEL = {
    met: 'حقّقت المتوقع أو أكتر ✅',
    positive_below_expected: 'موجبة بس أقل من المتوقع',
    loss: 'خسارة ❌',
    positive: 'موجبة',
    no_spend: 'مفيش صرف يتحسب عليه العائد'
  };

  function renderAdvisor(body) {
    body.appendChild(el('p', '', 'المستشار بيحلل تريندات يوتيوب في الإمارات وملف Google Trends لو رفعته، ويقترح توصية واحدة. التوصية بتفضل "بانتظار موافقتك" لحد ما توافق عليها، والتنفيذ بتعمله بنفسك. أنا ما بصرفش ولا بنشر أي حاجة.'));

    // --- التحليل ---
    var analyzeBox = el('div');
    analyzeBox.style.cssText = 'display:grid;gap:8px;border:1px solid var(--border,#e5e5e5);border-radius:12px;padding:12px';
    analyzeBox.appendChild(el('strong', '', 'حلّل السوق'));
    var topic = el('input');
    topic.type = 'text';
    topic.maxLength = 80;
    topic.placeholder = 'كلمة أو موضوع (اختياري)، مثال: عطور، توصيل، رمضان';
    analyzeBox.appendChild(topic);
    analyzeBox.appendChild(el('div', 'guest-note', 'لو عايز الأكثر صعوداً دلوقتي، افتح Google Trends ← Trending now واختار الإمارات، وانسخ كلمة من هناك.'));
    var go = el('button', 'btn-primary sm', 'حلّل وجيب توصية');
    go.type = 'button';
    go.style.justifySelf = 'start';
    analyzeBox.appendChild(go);
    var bgA = el('button', 'btn-ghost sm', 'شغّلها في الخلفية');
    bgA.type = 'button';
    bgA.style.justifySelf = 'start';
    analyzeBox.appendChild(bgA);
    bgA.addEventListener('click', function () {
      bgA.disabled = true;
      D.apiJson('/api/tasks', { method: 'POST', body: JSON.stringify({ kind: 'advisor-market', payload: { topic: topic.value.trim() } }) })
        .then(function () { D.toast('هتلاقي التوصية في تبويب المهام'); topic.value = ''; })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر بدء المهمة.'); })
        .then(function () { bgA.disabled = false; });
    });
    var analyzeOut = el('div', 'ait-out');
    analyzeBox.appendChild(analyzeOut);
    body.appendChild(analyzeBox);

    // أفكار جاهزة من المراجعة: بتتضاف كتوصيات بانتظار موافقتك، ومابتتنفذش
    var IDEAS = [
      { kind: 'content', title: 'غرفة الحرب: كاشف فجوات المحتوى', reason: 'يقارن تريندات يوتيوب وكلمات نشاطك، ويقترح ريلز أو محتوى لموضوع صاعد قبل ما المنافسين يلاحظوه. الاقتراح بيتكتب للمراجعة، ومافيش نشر تلقائي.' },
      { kind: 'other', title: 'المتابعة التلقائية مع لجنة التحكيم', reason: 'لما المتابعة ترصد تغيير في السوق، تعرض رأي الشخصيات الافتراضية كتقدير تقريبي (مش نسبة نجاح مضمونة) مع التوصية.' },
      { kind: 'other', title: 'بيان الرد على الشائعات (مسودة فقط)', reason: 'لو رصدنا حملة تشويه أو تسريب، يكتب المساعد مسودة بيان للمراجعة، والمالك ينشره بنفسه. ما يذكرش أي منافس بالاسم، وما يتنشرش أي حاجة بدون مراجعة.' }
    ];
    var addIdeas = el('button', 'btn-ghost sm', 'ضيف الأفكار الثلاثة كتوصيات');
    addIdeas.type = 'button';
    addIdeas.style.justifySelf = 'start';
    addIdeas.addEventListener('click', function () {
      addIdeas.disabled = true;
      Promise.all(IDEAS.map(function (x) {
        return D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify(x) });
      })).then(function () {
        addIdeas.textContent = 'اتضافت الأفكار ✅';
        D.toast('اتضافت الأفكار الثلاثة بانتظار موافقتك ✅');
        load();
      }).catch(function (ex) {
        addIdeas.disabled = false;
        D.toast(ex.message || 'تعذّر الإضافة.');
      });
    });
    body.appendChild(addIdeas);

    // فكرتين إضافيتين من المراجعة: نفس المبدأ، توصيات بانتظار موافقتك
    var IDEAS2 = [
      { kind: 'content', title: 'مستنسخ الإعلانات: بنية بدون نسخ', reason: 'المستخدم يلصق نص أو لقطة لإعلان يملكه أو صفحة عامة، والمساعد يحلل البنية (الهوك والعرض والإقناع) ويكتب محتوى أصلي بنفس البنية، من غير نسخ أي جملة أو تصميم. ما يتسحبش أي إعلان من منصات التواصل.' },
      { kind: 'other', title: 'تذكير السلة المتروكة (بموافقة العميل)', reason: 'المالك يحدد قواعد الخصم بنفسه، والمساعد يكتب رسالة تذكير للعملاء اللي وافقوا على التسويق بس، وكل رسالة تتراجع قبل ما تتبعت. مفيش تتبع سلوكي في البداية.' }
    ];
    var addIdeas2 = el('button', 'btn-ghost sm', 'ضيف فكرتي المستنسخ والسلة كتوصيات');
    addIdeas2.type = 'button';
    addIdeas2.style.justifySelf = 'start';
    addIdeas2.addEventListener('click', function () {
      addIdeas2.disabled = true;
      Promise.all(IDEAS2.map(function (x) {
        return D.apiJson('/api/advisor/recs', { method: 'POST', body: JSON.stringify(x) });
      })).then(function () {
        addIdeas2.textContent = 'اتضافت الفكرتين ✅';
        D.toast('اتضافت الفكرتين بانتظار موافقتك ✅');
        load();
      }).catch(function (ex) {
        addIdeas2.disabled = false;
        D.toast(ex.message || 'تعذّر الإضافة.');
      });
    });
    body.appendChild(addIdeas2);

    // --- التوصيات ---
    var listHead = el('strong', '', 'توصياتك');
    body.appendChild(listHead);
    var list = el('div');
    list.style.cssText = 'display:grid;gap:10px';
    body.appendChild(list);

    function act(id, action, msg) {
      return D.apiJson('/api/advisor/recs/' + id + '/' + action, { method: 'POST' })
        .then(function () { D.toast(msg); load(); })
        .catch(function (ex) { D.toast(ex.message || 'تعذّر التنفيذ.'); });
    }

    function evalForm(rec, box) {
      var sp = el('input');
      sp.type = 'number'; sp.min = '0'; sp.step = '0.01'; sp.placeholder = 'الصرف (درهم)';
      var rv = el('input');
      rv.type = 'number'; rv.min = '0'; rv.step = '0.01'; rv.placeholder = 'العائد (درهم)';
      var b = el('button', 'btn-ghost sm', 'قيّم النتيجة');
      b.type = 'button';
      b.style.justifySelf = 'start';
      var res = el('div', 'guest-note');
      b.addEventListener('click', function () {
        if (sp.value === '' || rv.value === '') { D.toast('اكتب الصرف والعائد.'); return; }
        b.disabled = true;
        D.apiJson('/api/advisor/recs/' + rec.id + '/evaluate', { method: 'POST', body: JSON.stringify({ spend: Number(sp.value), revenue: Number(rv.value) }) })
          .then(function (d) {
            var roiTxt = d.roi === null ? '' : ' — العائد ' + Math.round(d.roi * 100) + '%';
            res.textContent = (VERDICT_LABEL[d.verdict] || d.verdict) + roiTxt;
          })
          .catch(function (ex) { res.textContent = ex.message || 'تعذّر التقييم.'; })
          .then(function () { b.disabled = false; });
      });
      box.appendChild(sp);
      box.appendChild(rv);
      box.appendChild(b);
      box.appendChild(res);
    }

    function card(rec) {
      var c = el('div', 'card-box biz-rec');
      var chip = { pending: 'conn', approved: 'ok', done: 'ok', rejected: 'dev' }[rec.status] || 'dev';
      var meta = el('div', 'biz-rec-meta');
      meta.appendChild(el('span', 'biz-badge ' + chip, STATUS_LABEL[rec.status] || rec.status));
      meta.appendChild(el('span', 'muted', KIND_LABEL[rec.kind] || rec.kind));
      c.appendChild(meta);
      c.appendChild(el('strong', 'biz-rec-title', rec.title));
      c.appendChild(el('div', 'biz-rec-reason', rec.reason));
      var row = el('div', 'biz-rec-actions');
      if (rec.status === 'pending') {
        var ok = el('button', 'btn-primary sm', 'موافق');
        ok.type = 'button';
        ok.addEventListener('click', function () { act(rec.id, 'approve', 'اتسجلت الموافقة ✅'); });
        var no = el('button', 'btn-ghost sm', 'أرفض');
        no.type = 'button';
        no.addEventListener('click', function () { act(rec.id, 'reject', 'اتسجل الرفض'); });
        row.appendChild(ok);
        row.appendChild(no);
      } else if (rec.status === 'approved') {
        var dn = el('button', 'btn-primary sm', 'نفذتها يدوياً');
        dn.type = 'button';
        dn.addEventListener('click', function () { act(rec.id, 'done', 'تمام، علّمتها تم التنفيذ'); });
        row.appendChild(dn);
      }
      c.appendChild(row);
      if (rec.status === 'done') {
        if (rec.verdict) {
          c.appendChild(el('div', 'guest-note', 'آخر تقييم: ' + (VERDICT_LABEL[rec.verdict] || rec.verdict)));
        }
        var ebox = el('div');
        ebox.style.cssText = 'display:grid;gap:6px';
        evalForm(rec, ebox);
        c.appendChild(ebox);
      }
      return c;
    }

    function load() {
      list.innerHTML = '';
      D.apiJson('/api/advisor/recs').then(function (d) {
        if (!d.recs || !d.recs.length) { list.appendChild(el('p', 'guest-note', 'مفيش توصيات لسه. حلّل السوق عشان تجيب أول توصية.')); return; }
        d.recs.forEach(function (r) { list.appendChild(card(r)); });
      }).catch(function () { list.textContent = 'تعذّر تحميل التوصيات.'; });
    }

    go.addEventListener('click', function () {
      go.disabled = true;
      analyzeOut.textContent = 'بنحلل السوق… ممكن ياخد دقيقة.';
      D.apiJson('/api/advisor/market/analyze', { method: 'POST', body: JSON.stringify({ topic: topic.value.trim() }) })
        .then(function () {
          analyzeOut.textContent = 'اتسجلت توصية جديدة بانتظار موافقتك ✅';
          topic.value = '';
          load();
        })
        .catch(function (ex) { analyzeOut.textContent = ex.message || 'تعذّر التحليل.'; })
        .then(function () { go.disabled = false; });
    });

    load();
  }

  D.openAiTools = openAiTools;
})();
