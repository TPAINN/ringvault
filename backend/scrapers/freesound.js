const axios = require('axios');

const API = 'https://freesound.org/apiv2';
const PAGE_SIZE = 150;
const MAX_PAGES = 5;

// Searches CC0 sounds suitable for ringtones/notifications/alarms.
// Returns normalized items: { title, tags, durationSec, source, sourceId,
// previewUrl, downloadUrl, format, bitrateKbps, sizeBytes, license, author }
async function fetchNew(since) {
  const key = process.env.FREESOUND_API_KEY;
  if (!key) throw new Error('FREESOUND_API_KEY not set');

  const sinceFilter = since
    ? ` created:[${new Date(since).toISOString()} TO NOW]`
    : '';

  const results = [];
  for (const query of ['ringtone', 'notification', 'alarm', 'chime', 'bell']) {
    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await axios.get(`${API}/search/text/`, {
        params: {
          query,
          filter: `license:"Creative Commons 0" duration:[1 TO 60]${sinceFilter}`,
          fields: 'id,name,tags,duration,previews,filesize,bitrate,type,license,username',
          page_size: PAGE_SIZE,
          page,
          token: key,
        },
        timeout: 30000,
      });

      for (const s of data.results || []) {
        const preview =
          s.previews?.['preview-hq-mp3'] || s.previews?.['preview-lq-mp3'];
        if (!preview) continue;
        results.push({
          title: cleanTitle(s.name),
          tags: (s.tags || []).slice(0, 10).map((t) => t.toLowerCase()),
          durationSec: Math.round(s.duration),
          source: 'freesound',
          sourceId: String(s.id),
          previewUrl: preview,
          // Full downloads need OAuth2; HQ mp3 preview (~128kbps) is fine for ringtones.
          downloadUrl: preview,
          format: 'mp3',
          bitrateKbps: s.bitrate || 128,
          sizeBytes: s.filesize || 0,
          license: s.license || 'CC0',
          author: s.username || '',
        });
      }

      if (!data.next) break;
      page += 1;
    }
  }
  return results;
}

function cleanTitle(name) {
  return String(name)
    .replace(/\.(mp3|wav|ogg|flac|aiff?|m4a)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

module.exports = { fetchNew };
