const axios = require('axios');

// ccMixter — Creative Commons remixes and instrumentals.
// CC-BY only (lic=by): safe to redistribute with attribution, which the app
// shows in the detail sheet. This is the legal counterpart of "remixes/mashups".
const API = 'https://ccmixter.org/api/query';
const PAGES = 3;
const PAGE_SIZE = 100;
const MAX_DURATION_SEC = 300;

async function fetchNew() {
  const results = [];

  for (let page = 0; page < PAGES; page += 1) {
    let data;
    try {
      await new Promise((r) => setTimeout(r, 1000));
      ({ data } = await axios.get(API, {
        params: {
          f: 'json',
          lic: 'by',
          sort: 'rank',
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
        headers: { 'User-Agent': 'RingVault/0.4 (catalog ingest)' },
        timeout: 30000,
      }));
    } catch (err) {
      console.error(`[ccmixter] page ${page} failed: ${err.message}`);
      break;
    }
    if (!Array.isArray(data) || !data.length) break;

    for (const t of data) {
      if (t.upload_extra?.nsfw) continue;

      const file = (t.files || []).find(
        (f) => f.download_url && /\.mp3$/i.test(f.download_url)
      );
      if (!file) continue;

      const durationSec = parseDuration(file.file_format_info?.ps);
      if (!durationSec || durationSec > MAX_DURATION_SEC) continue;

      const genres = String(t.upload_extra?.usertags || '')
        .split(',')
        .map((g) => g.trim().replace(/_/g, ' ').toLowerCase())
        .filter((g) => g && g.length <= 20)
        .slice(0, 4);

      results.push({
        title: t.upload_name,
        tags: ['music', 'remix', ...genres],
        durationSec,
        source: 'ccmixter',
        sourceId: String(t.upload_id),
        previewUrl: file.download_url,
        downloadUrl: file.download_url,
        format: 'mp3',
        bitrateKbps: 128,
        sizeBytes: 0,
        license: t.license_name || 'CC-BY',
        author: t.user_real_name || t.user_name || '',
      });
    }
  }
  return results;
}

// "2:45" -> 165
function parseDuration(ps) {
  const m = /^(\d+):(\d{2})$/.exec(String(ps || '').trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

module.exports = { fetchNew };
