// Harvest a self-contained catalog for the standalone web app (web/catalog.json).
// Keyless legal sources only: Mixkit (free license) + Wikimedia Commons (CC0/PD/CC-BY).
// Everything is filtered SHORT so each sound plays fully in-app and works as a ringtone.
//
//   node scripts/harvest-web.js
//
// Add FREESOUND_API_KEY / PIXABAY_API_KEY to .env to also pull those (thousands more).

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { cleanTitle } = require('../lib/titleClean');
const { classify } = require('../pipeline/classify');

const OUT = path.join(__dirname, '..', '..', 'web', 'catalog.json');
const UA = 'RingVault/0.5 (catalog harvest; respects robots.txt)';

const MIXKIT_BASE = 'https://mixkit.co/free-sound-effects';
const MAX_CATS = 150;
const PAGES_PER_CAT = 3;
const DELAY = 450;

// Curated categories that yield ringtone/notification/alarm-worthy sounds — pulled first.
const PREFERRED = [
  'notification', 'alarm', 'bell', 'ringtone', 'chimes', 'beep', 'click',
  'message', 'alert', 'game', 'arcade', 'win', 'coin', 'magic', 'sci-fi',
  'transition', 'pop', 'ding', 'tone', 'electronic', 'percussion', 'marimba',
  'bird', 'water', 'whoosh', 'button', 'interface', 'app', 'cartoon', 'bubble',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function discoverCategories() {
  try {
    const { data: html } = await axios.get(`${MIXKIT_BASE}/`, { headers: { 'User-Agent': UA }, timeout: 30000 });
    const slugs = new Set();
    const re = /href="\/free-sound-effects\/([a-z0-9-]+)\/"/g;
    let m;
    while ((m = re.exec(html)) !== null) slugs.add(m[1]);
    // preferred first, then the rest
    const all = [...slugs];
    const ordered = [...PREFERRED.filter((p) => slugs.has(p)), ...all.filter((s) => !PREFERRED.includes(s))];
    return ordered.slice(0, MAX_CATS);
  } catch (err) {
    console.error('[mixkit] discovery failed:', err.message);
    return PREFERRED;
  }
}

function parseMixkitPage(html, category) {
  const items = [];
  const cardRe =
    /data-audio-player-preview-url-value="(https:\/\/assets\.mixkit\.co\/[^"]+\.mp3)"[\s\S]*?data-audio-player-item-id-value="(\d+)"[\s\S]*?item-grid-card__title">\s*([^<]+?)\s*<[\s\S]*?data-test-id="duration">\s*(\d+):(\d{2})/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const [, previewUrl, id, title, min, sec] = m;
    const durationSec = parseInt(min, 10) * 60 + parseInt(sec, 10);
    if (durationSec < 1 || durationSec > 40) continue;
    items.push({
      title: title.trim(),
      durationSec,
      sourceId: id,
      previewUrl,
      downloadUrl: previewUrl,
      tags: [category.replace(/-/g, ' ')],
      source: 'mixkit',
      format: 'mp3',
      bitrateKbps: 128,
      license: 'Mixkit Free License',
      author: 'Mixkit',
    });
  }
  return items;
}

async function harvestMixkit() {
  const cats = await discoverCategories();
  console.log(`[mixkit] harvesting ${cats.length} categories...`);
  const out = [];
  const seen = new Set();
  for (const cat of cats) {
    for (let p = 1; p <= PAGES_PER_CAT; p += 1) {
      const url = p === 1 ? `${MIXKIT_BASE}/${cat}/` : `${MIXKIT_BASE}/${cat}/?page=${p}`;
      let html;
      try {
        await sleep(DELAY);
        ({ data: html } = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 30000, validateStatus: (s) => s === 200 }));
      } catch {
        break;
      }
      const items = parseMixkitPage(html, cat);
      if (!items.length) break;
      for (const it of items) {
        if (seen.has(it.sourceId)) continue;
        seen.add(it.sourceId);
        out.push(it);
      }
    }
  }
  console.log(`[mixkit] ${out.length} raw items`);
  return out;
}

async function harvestCommons() {
  try {
    const commons = require('../scrapers/commons');
    const items = await commons.fetchNew();
    console.log(`[commons] ${items.length} raw items`);
    return items;
  } catch (err) {
    console.error('[commons] failed:', err.message);
    return [];
  }
}

async function harvestKeyed() {
  const out = [];
  if (process.env.FREESOUND_API_KEY) {
    try { out.push(...(await require('../scrapers/freesound').fetchNew())); console.log(`[freesound] ${out.length}`); }
    catch (e) { console.error('[freesound] failed:', e.message); }
  }
  if (process.env.PIXABAY_API_KEY) {
    try { const px = await require('../scrapers/pixabay').fetchNew(); out.push(...px); console.log(`[pixabay] ${px.length}`); }
    catch (e) { console.error('[pixabay] failed:', e.message); }
  }
  return out;
}

function build(records) {
  const byKey = new Set();
  const byTitle = new Set();
  const now = Date.now();
  const final = [];

  for (const r of records) {
    const title = cleanTitle(r.title) || (r.title || '').trim();
    if (!title || title.length < 2) continue;

    const category = classify({ ...r, title });
    const maxDur = category === 'alarm' ? 40 : category === 'notification' ? 8 : 30;
    if (!r.durationSec || r.durationSec < 1 || r.durationSec > maxDur) continue;

    const key = `${r.source}:${r.sourceId}`;
    if (byKey.has(key)) continue;
    const tkey = `${category}|${title.toLowerCase()}`;
    if (byTitle.has(tkey)) continue;
    byKey.add(key);
    byTitle.add(tkey);

    final.push({
      id: key.replace(/[^a-z0-9]+/gi, '_'),
      title,
      category,
      tags: (r.tags || []).map((t) => String(t).toLowerCase()).filter(Boolean).slice(0, 6),
      durationSec: r.durationSec,
      source: r.source,
      url: r.previewUrl || r.downloadUrl,
      license: r.license || '',
      author: r.author || '',
      bitrateKbps: r.bitrateKbps || 128,
    });
  }

  // stagger createdAt so "newest" sort is meaningful; pseudo popularity for variety
  final.forEach((s, i) => {
    s.createdAt = new Date(now - i * 3600 * 1000).toISOString();
    s.popularity = Math.floor(((i * 2654435761) % 1000));
  });

  return final;
}

async function main() {
  require('dotenv').config();
  const raw = [];
  raw.push(...(await harvestMixkit()));
  raw.push(...(await harvestCommons()));
  raw.push(...(await harvestKeyed()));

  const catalog = build(raw);

  const counts = catalog.reduce((a, s) => ((a[s.category] = (a[s.category] || 0) + 1), a), {});
  console.log('\n=== CATALOG ===');
  console.log('total:', catalog.length, '| by category:', JSON.stringify(counts));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(catalog));
  // also emit catalog.js so the app works when opened as a local file:// (fetch is blocked there)
  const OUT_JS = OUT.replace(/\.json$/, '.js');
  fs.writeFileSync(OUT_JS, 'window.RINGVAULT_CATALOG=' + JSON.stringify(catalog) + ';');
  console.log('written:', OUT, '+ catalog.js', `(${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
