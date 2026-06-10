// Entry point for Render Cron Job (Sundays 04:00 UTC: "0 4 * * 0").
// Render command: node cron/weekly.js
require('dotenv').config();
const mongoose = require('mongoose');
const Sound = require('../models/Sound');
const { ingest } = require('../pipeline/ingest');
const { healthcheck } = require('../pipeline/healthcheck');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  const lastDoc = await Sound.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
  const since = lastDoc ? lastDoc.createdAt : null;

  console.log(`[weekly] run started ${new Date().toISOString()}, since=${since}`);
  const ingestSummary = await ingest({ since });
  const healthSummary = await healthcheck();

  console.log(
    `[weekly] done. added=${ingestSummary.added} skipped=${ingestSummary.skipped} ` +
      `failedSources=[${ingestSummary.failedSources}] ` +
      `checked=${healthSummary.checked} deactivated=${healthSummary.deactivated}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[weekly] failed:', err);
  process.exit(1);
});
