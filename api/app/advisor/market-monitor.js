'use strict';
// مراقب السوق: بيجمع الإشارات من المصادر بس (يوتيوب الإمارات). ما بيتخذش أي قرار.
// القرار والتوصية في orchestrator.js.

const { fetchUAETrends } = require('./market-sources/youtube-trends.js');

async function gatherSignals(youtubeKey) {
  const yt = await fetchUAETrends(youtubeKey, {});
  return {
    youtube_ok: yt.ok,
    youtube_reason: yt.ok ? 'ok' : yt.reason,
    youtube_items: yt.items,
  };
}

module.exports = { gatherSignals };
