const axios = require('axios');

// Mixkit free sound effects — explicit free license, robots.txt allows crawling.
// Categories are discovered from the index page, so new ones land automatically.
const BASE = 'https://mixkit.co/free-sound-effects';
const MAX_PAGES_PER_CATEGORY = 2;
const POLITE_DELAY_MS = 1200;
const UA = 'RingVault/0.4 (catalog ingest; respects robots.txt)';

async function fetchNew() {
  const categories = await discoverCategories();
  console.log(`[mixkit] ${categories.length} categories discovered`);

  const seen = new Set();
  const results = [];

  for (const category of categories) {
    for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page += 1) {
      const url = page === 1 ? `${BASE}/${category}/` : `${BASE}/${category}/?page=${page}`;
      let html;
      try {
        await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
        ({ data: html } = await axios.get(url, {
          headers: { 'User-Agent': UA },
          timeout: 30000,
          validateStatus: (s) => s === 200,
        }));
      } catch {
        break; // page doesn't exist — next category
      }

      const items = parsePage(html);
      if (!items.length) break;

      for (const item of items) {
        if (seen.has(item.sourceId)) continue;
        seen.add(item.sourceId);
        results.push({
          ...item,
          tags: [category.replace(/-/g, ' ')],
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

async function discoverCategories() {
  try {
    const { data: html } = await axios.get(`${BASE}/`, {
      headers: { 'User-Agent': UA },
      timeout: 30000,
    });
    const slugs = new Set();
    const re = /href="\/free-sound-effects\/([a-z0-9-]+)\/"/g;
    let m;
    while ((m = re.exec(html)) !== null) slugs.add(m[1]);
    return [...slugs];
  } catch (err) {
    console.error(`[mixkit] category discovery failed: ${err.message}`);
    // fallback to a known-good core set
    return ['bell', 'notification', 'alarm', 'ringtone', 'chimes', 'beep', 'click'];
  }
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
