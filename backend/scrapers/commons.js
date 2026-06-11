const axios = require('axios');

const API = 'https://commons.wikimedia.org/w/api.php';
const QUERIES = [
  'bell ring short',
  'phone ringtone',
  'alarm clock sound',
  'notification chime',
  'doorbell sound',
  'chime sound effect',
  'whistle short',
  'ding sound',
  'beep sound effect',
  'marimba melody',
];
const OK_FORMATS = { ogg: 'ogg', oga: 'ogg', mp3: 'mp3', wav: 'wav' };
const OK_LICENSES = /^(cc0|public domain|pd|cc[ -]by)/i;
const SPEECH_OR_MUSIC =
  /interview|speech|sermon|anthem|song|choir|band|orchestra|lecture|reading|poem|silent|empty|language|spoken|pronunciation|silent night|talk|vocal|conversation|lingua|univ|rimshot|macleod/i;
// Lingua Libre pronunciation recordings: "File:LL-Q123456 ..."
const LINGUA_LIBRE = /^File:LL[ -]?Q?\d*/i;
const CJK = /[　-鿿가-힯぀-ヿ]/;

// Wikimedia Commons — keyless source. Only freely licensed audio (CC0/PD/CC-BY*).
async function fetchNew() {
  const seen = new Set();
  const results = [];

  for (const query of QUERIES) {
    await new Promise((r) => setTimeout(r, 2000)); // Commons rate limit
    let data;
    try {
      ({ data } = await axios.get(API, {
        params: {
          action: 'query',
          generator: 'search',
          gsrsearch: `filetype:audio ${query}`,
          gsrnamespace: 6,
          gsrlimit: 25,
          prop: 'imageinfo',
          iiprop: 'url|dimensions|extmetadata',
          format: 'json',
        },
        headers: { 'User-Agent': 'RingVault/0.1 (catalog ingest)' },
        timeout: 30000,
      }));
    } catch (err) {
      console.error(`[commons] query "${query}" failed: ${err.message}`);
      continue;
    }

    const pages = (data.query && data.query.pages) || {};
    for (const page of Object.values(pages)) {
      const info = page.imageinfo && page.imageinfo[0];
      if (!info || !info.url || seen.has(info.url)) continue;
      seen.add(info.url);

      const ext = info.url.split('.').pop().toLowerCase();
      const format = OK_FORMATS[ext];
      if (!format) continue;

      const duration = Math.round(info.duration || 0);
      if (duration < 1 || duration > 60) continue;

      // Skip speech/music recordings that match the keyword but make bad ringtones
      if (SPEECH_OR_MUSIC.test(page.title)) continue;
      if (LINGUA_LIBRE.test(page.title)) continue;
      if (CJK.test(page.title)) continue;
      // Language-prefixed pronunciation files, e.g. "De-Haustürklingel.ogg"
      if (/^File:[A-Z][a-z]{1,3}-/.test(page.title)) continue;

      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value || '');
      if (!OK_LICENSES.test(license)) continue;

      const author = stripHtml(meta.Artist?.value || '').slice(0, 80);

      results.push({
        title: cleanTitle(page.title),
        tags: queryTags(query),
        durationSec: duration,
        source: 'commons',
        sourceId: String(page.pageid),
        previewUrl: info.url,
        downloadUrl: info.url,
        format,
        bitrateKbps: 128,
        sizeBytes: info.size || 0,
        license,
        author: author || 'Wikimedia Commons',
      });
    }
  }
  return results;
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function cleanTitle(pageTitle) {
  return String(pageTitle)
    .replace(/^File:/, '')
    .replace(/\.(ogg|oga|mp3|wav|flac|opus|mid)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function queryTags(query) {
  return query
    .split(' ')
    .filter((w) => !['sound', 'effect', 'short'].includes(w))
    .slice(0, 3);
}

module.exports = { fetchNew };
