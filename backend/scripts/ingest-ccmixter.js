// One-off: ingest only ccMixter (used after fixing their TLS issue via HTTP).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Sound = require('../models/Sound');
const { cleanTitle } = require('../lib/titleClean');
const cc = require('../scrapers/ccmixter');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const items = await cc.fetchNew();
  console.log('candidates:', items.length);
  let added = 0;
  for (const item of items) {
    const title = cleanTitle(item.title);
    if (!title || !item.durationSec || item.durationSec > 300) continue;
    item.title = title;
    const res = await Sound.updateOne(
      { source: item.source, sourceId: item.sourceId },
      { $setOnInsert: { ...item, category: 'ringtone', active: true } },
      { upsert: true }
    );
    if (res.upsertedCount) added += 1;
  }
  console.log('added:', added);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
