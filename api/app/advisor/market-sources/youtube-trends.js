'use strict';
// تريندات يوتيوب في الإمارات: أكثر الفيديوهات رواجاً (YouTube Data API v3، بدون مكتبات).
// المفتاح من YOUTUBE_API_KEY. بنرجّع العنوان والتاجات وعدد المشاهدات بس، ومش بنبعت وصف الفيديو.
// ما بنسجلش الرابط كامل في أي log، لأنه فيه المفتاح.

const ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';

async function fetchUAETrends(apiKey, opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const max = Math.min(Math.max(Number(opts.max) || 20, 1), 50);
  if (!apiKey) return { ok: false, reason: 'no_key', items: [] };
  const qs = new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode: 'AE',
    maxResults: String(max),
    key: apiKey,
  });
  let res;
  try {
    res = await fetchImpl(`${ENDPOINT}?${qs.toString()}`, { signal: AbortSignal.timeout(10000) });
  } catch (e) {
    return { ok: false, reason: 'network', items: [] };
  }
  if (!res.ok) return { ok: false, reason: 'http_' + res.status, items: [] };
  let data;
  try { data = await res.json(); } catch (e) { return { ok: false, reason: 'bad_json', items: [] }; }
  const items = (Array.isArray(data.items) ? data.items : []).map((v) => ({
    title: String((v.snippet && v.snippet.title) || '').slice(0, 200),
    tags: ((v.snippet && v.snippet.tags) || []).slice(0, 10).map((t) => String(t).slice(0, 40)),
    viewCount: Number(v.statistics && v.statistics.viewCount) || 0,
  })).filter((x) => x.title);
  return { ok: true, items };
}

module.exports = { fetchUAETrends };
