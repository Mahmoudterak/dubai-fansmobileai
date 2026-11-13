'use strict';
// من صورة لكود: المستخدم يرفع لقطة شاشة أو كروكي، والنموذج الرؤيوي يحوّلها لملف HTML واحد.
// الناتج بيفتح في محرر الموقع. بيستهلك من حصة الصور في الباقة.

const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 3.5 * 1024 * 1024;   // بالحروف بعد base64
const MAX_HTML = 80 * 1024;

const PROMPT = 'Convert this UI screenshot or sketch into ONE complete, self-contained HTML5 document. '
  + 'Use inline CSS in a <style> tag only, no external resources, no external scripts, no images from the internet (use simple shapes or CSS placeholders instead). '
  + 'Match the layout, sections, colors (approximate hex), spacing and typography as closely as possible. '
  + 'Make it responsive for mobile. If the image contains Arabic text, use dir="rtl" and lang="ar" and copy the text exactly. '
  + 'Return ONLY the HTML code inside one ```html fenced block, with no explanation.';

function extractHtml(raw) {
  const text = String(raw || '');
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  let html = fenced ? fenced[1] : text;
  const start = html.search(/<!doctype html|<html/i);
  if (start > 0) html = html.slice(start);
  html = html.trim();
  if (!/<html[\s>]/i.test(html) && !/<body[\s>]/i.test(html)) return null;
  return html.slice(0, MAX_HTML);
}

function init(db, deps) {
  async function route(req, res, user, p, m) {
    if (p !== '/api/ai-tools/screenshot' || m !== 'POST') return null;
    if (deps.rateLimited('shot:' + user.id, 5, 3600000)) return deps.fail(res, 429, 'rate', 'تحويلات كتير. جرّب بعد شوية.');
    const b = await deps.readJson(req, 4 * 1024 * 1024);
    const image = String(b.image || '');
    if (!IMG_RE.test(image) || image.length > MAX_IMAGE) {
      return deps.fail(res, 400, 'input', 'ارفع صورة PNG أو JPG أو WebP، وحجمها أقل من 2.5 ميجا.');
    }
    let release;
    try { release = deps.reserve(user, 'images'); }
    catch (e) { return deps.fail(res, e.status || 429, e.code || 'quota', e.message, { kind: e.kind }); }
    try {
      const r = await deps.cfRun(deps.visionModel, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }, { type: 'image_url', image_url: { url: image } }] }],
          max_tokens: 6000,
        }),
      }, 120000);
      const raw = (r && (r.response || (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content))) || '';
      const html = extractHtml(raw);
      if (!html) { release(); return deps.fail(res, 502, 'model', 'مقدرناش نحوّل الصورة لكود مرتب. جرّب صورة أوضح أو أبسط.'); }
      return deps.send(res, 200, { html });
    } catch (e) {
      release();
      console.error('screenshot failed:', e.message);
      return deps.fail(res, 502, 'model', 'حصلت مشكلة في التحويل. جرّب بعدين.');
    }
  }
  return { route };
}

module.exports = { init };
