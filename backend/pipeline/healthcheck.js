require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Sound = require('../models/Sound');

const BATCH = 20;

// HEAD-checks downloadUrls of active sounds; deactivates 404/410s (soft delete).
async function healthcheck() {
  let deactivated = 0;
  let checked = 0;

  const cursor = Sound.find({ active: true }).select('downloadUrl').lean().cursor();
  let batch = [];

  const flush = async () => {
    const results = await Promise.allSettled(
      batch.map((doc) =>
        axios.head(doc.downloadUrl, { timeout: 10000, maxRedirects: 5 }).then(
          () => null,
          (err) => (err.response && [404, 410].includes(err.response.status) ? doc._id : null)
        )
      )
    );
    const deadIds = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter(Boolean);
    if (deadIds.length) {
      await Sound.updateMany({ _id: { $in: deadIds } }, { $set: { active: false } });
      deactivated += deadIds.length;
    }
    checked += batch.length;
    batch = [];
  };

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH) await flush();
  }
  if (batch.length) await flush();

  return { checked, deactivated };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const summary = await healthcheck();
  console.log('[healthcheck] summary:', JSON.stringify(summary));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { healthcheck };
