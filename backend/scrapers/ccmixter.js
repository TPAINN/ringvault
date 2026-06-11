const http = require('http');

// ccMixter — Creative Commons remixes and instrumentals.
// CC-BY only (lic=by): safe to redistribute with attribution, which the app
// shows in the detail sheet. This is the legal counterpart of "remixes/mashups".
// NOTE: plain HTTP on purpose — ccmixter.org serves an expired intermediate cert
// that Node/Android reject (browsers and Windows curl build an alternate path).
const API = 'http://ccmixter.org/api/query';
const PAGES = 3;
const PAGE_SIZE = 100;
const MAX_DURATION_SEC = 300;

async function fetchNew() {
  const results = [];

  for (let page = 0; page < PAGES; page += 1) {
    let data;
    try {
      await new Promise((r) => setTimeout(r, 1000));
      data = await getJson(
        `${API}?f=json&lic=by&sort=rank&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      );
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

      const url = file.download_url.replace(/^https:/, 'http:');
      results.push({
        title: t.upload_name,
        tags: ['music', 'remix', ...genres],
        durationSec,
        source: 'ccmixter',
        sourceId: String(t.upload_id),
        previewUrl: url,
        downloadUrl: url,
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

// Native http with a large maxHeaderSize: ccMixter mirrors the entire JSON
// payload into an X-JSON response header, which blows Node's 16KB default.
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      url,
      {
        maxHeaderSize: 4 * 1024 * 1024,
        headers: { 'User-Agent': 'RingVault/0.4 (catalog ingest)' },
        timeout: 30000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

// "2:45" -> 165
function parseDuration(ps) {
  const m = /^(\d+):(\d{2})$/.exec(String(ps || '').trim());
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

module.exports = { fetchNew };
