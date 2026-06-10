const axios = require('axios');

const API = 'https://pixabay.com/api/audio/';
const PER_PAGE = 200;
const MAX_PAGES = 3;

// Pixabay audio API. All content is royalty-free under the Pixabay Content License.
// Note: Pixabay has no "since" filter; dedup happens downstream on (source, sourceId).
async function fetchNew() {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error('PIXABAY_API_KEY not set');

  const results = [];
  for (const query of ['ringtone', 'notification', 'alarm', 'bell', 'chime']) {
    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await axios.get(API, {
        params: { key, q: query, per_page: PER_PAGE, page, order: 'latest' },
        timeout: 30000,
      });

      const hits = data.hits || [];
      for (const s of hits) {
        if (!s.audio_url || !s.duration || s.duration > 60) continue;
        results.push({
          title: cleanTitle(s.title || s.tags || `Pixabay ${s.id}`),
          tags: String(s.tags || '')
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 10),
          durationSec: Math.round(s.duration),
          source: 'pixabay',
          sourceId: String(s.id),
          previewUrl: s.audio_url,
          downloadUrl: s.audio_url,
          format: 'mp3',
          bitrateKbps: 128,
          sizeBytes: 0,
          license: 'Pixabay Content License',
          author: s.user || '',
        });
      }

      if (hits.length < PER_PAGE) break;
      page += 1;
    }
  }
  return results;
}

function cleanTitle(name) {
  return String(name)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

module.exports = { fetchNew };
