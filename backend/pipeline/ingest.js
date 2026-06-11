require('dotenv').config();
const mongoose = require('mongoose');
const Sound = require('../models/Sound');
const { classify } = require('./classify');
const { cleanTitle } = require('../lib/titleClean');

// Per-source isolation: one failing scraper never kills the pipeline.
const SOURCES = {
  mixkit: require('../scrapers/mixkit'),
  commons: require('../scrapers/commons'),
  freesound: require('../scrapers/freesound'),
  pixabay: require('../scrapers/pixabay'),
};

async function ingest({ since } = {}) {
  const summary = { added: 0, skipped: 0, failedSources: [] };

  for (const [name, scraper] of Object.entries(SOURCES)) {
    let items = [];
    try {
      console.log(`[ingest] fetching from ${name}...`);
      items = await scraper.fetchNew(since);
      console.log(`[ingest] ${name}: ${items.length} candidates`);
    } catch (err) {
      console.error(`[ingest] ${name} FAILED: ${err.message}`);
      summary.failedSources.push(name);
      continue;
    }

    for (const item of items) {
      // Human-presentable title or nothing — drives the whole card UI
      const title = cleanTitle(item.title);
      if (!title) {
        summary.skipped += 1;
        continue;
      }
      item.title = title;

      // Filter: duration limits per category (ringtone/notif ≤ 40s, alarm ≤ 60s)
      const category = classify(item);
      const maxDur = category === 'alarm' ? 60 : 40;
      if (!item.durationSec || item.durationSec > maxDur || item.durationSec < 1) {
        summary.skipped += 1;
        continue;
      }
      if (item.bitrateKbps && item.bitrateKbps < 96) {
        summary.skipped += 1;
        continue;
      }

      try {
        const res = await Sound.updateOne(
          { source: item.source, sourceId: item.sourceId },
          { $setOnInsert: { ...item, category, active: true } },
          { upsert: true }
        );
        if (res.upsertedCount) summary.added += 1;
        else summary.skipped += 1; // already known
      } catch (err) {
        if (err.code === 11000) summary.skipped += 1;
        else console.error(`[ingest] upsert error (${item.source}/${item.sourceId}):`, err.message);
      }
    }
  }

  return summary;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  const lastDoc = await Sound.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
  const since = lastDoc ? lastDoc.createdAt : null;

  const summary = await ingest({ since });
  console.log('[ingest] summary:', JSON.stringify(summary));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { ingest };
