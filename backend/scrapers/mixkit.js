const axios = require('axios');

// Mixkit free sound effects — explicit free license, robots.txt allows crawling.
// Audio metadata is embedded in the category pages as data attributes.
const BASE = 'https://mixkit.co/free-sound-effects';
const CATEGORIES = ['bell', 'notification', 'alarm', 'ringtone', 'chime', 'ding', 'whistle'];
const MAX_PAGES = 3;
const UA = 'RingVault/0.3 (catalog ingest; respects robots.txt)';

async function fetchNew() {
  const seen = new Set();
  const results = [];

  for (const category of CATEGORIES) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = page === 1 ? `${BASE}/${category}/` : `${BASE}/${category}/?page=${page}`;
      let html;
      try {
        await new Promise((r) => setTimeout(r, 1500)); // be polite
        ({ data: html } = await axios.get(url, {
          headers: { 'User-Agent': UA },
          timeout: 30000,
          validateStatus: (s) => s === 200,
        }));
      } catch {
        break; // category or page doesn't exist — move on
      }

      const items = parsePage(html);
      if (!items.length) break;

      for (const item of items) {
        if (seen.has(item.sourceId)) continue;
        seen.add(item.sourceId);
        results.push({
          ...item,
          tags: [category],
          source: 'mixkit',
          format: 'mp3',
          bitrateKbps: 128,
          sizeBytes: 0,
          license: 'Mixkit Free License',
          author: 'Mixkit',
        });
      }
    }
  }
  return results;
}

// Each card carries an audio-player block (preview url + item id); the title and
// duration live in sibling nodes. Parse blocks in document order.
function parsePage(html) {
  const items = [];
  const cardRe =
    /data-audio-player-preview-url-value="(https:\/\/assets\.mixkit\.co\/[^"]+\.mp3)"[\s\S]*?data-audio-player-item-id-value="(\d+)"[\s\S]*?item-grid-card__title">\s*([^<]+?)\s*<[\s\S]*?data-test-id="duration">\s*(\d+):(\d{2})/g;

  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const [, previewUrl, id, title, min, sec] = m;
    const durationSec = parseInt(min, 10) * 60 + parseInt(sec, 10);
    if (durationSec < 1 || durationSec > 60) continue;
    items.push({
      title: title.trim(),
      durationSec,
      sourceId: id,
      previewUrl,
      downloadUrl: previewUrl,
    });
  }
  return items;
}

module.exports = { fetchNew };
