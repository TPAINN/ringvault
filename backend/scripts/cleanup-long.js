// Deactivate sounds that are too long to work as ringtones (the "100s+ won't play"
// problem). Soft-delete only: sets active:false, so routes stop serving them but
// nothing is destroyed — re-activate by flipping active back to true.
//
//   node scripts/cleanup-long.js          # DRY RUN — shows what would change
//   node scripts/cleanup-long.js --apply  # actually deactivate
//
// Caps: alarms ≤ 40s, everything else ≤ 30s. Anything longer is deactivated.

require('dotenv').config();
const mongoose = require('mongoose');
const Sound = require('../models/Sound');

const APPLY = process.argv.includes('--apply');

// active sounds longer than their category allows
const TOO_LONG = {
  active: true,
  $or: [
    { category: 'alarm', durationSec: { $gt: 40 } },
    { category: { $ne: 'alarm' }, durationSec: { $gt: 30 } },
  ],
};

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set (need the Atlas connection string in .env)');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected.', APPLY ? 'MODE: APPLY' : 'MODE: DRY RUN (no writes)');

  const totalActive = await Sound.countDocuments({ active: true });
  const toDeactivate = await Sound.countDocuments(TOO_LONG);

  // show the worst offenders
  const sample = await Sound.find(TOO_LONG).sort({ durationSec: -1 }).limit(10)
    .select('title durationSec category source').lean();
  console.log(`\nactive now: ${totalActive}`);
  console.log(`too-long (will be deactivated): ${toDeactivate}`);
  if (sample.length) {
    console.log('worst offenders:');
    sample.forEach((s) => console.log(`  ${s.durationSec}s  [${s.category}]  ${s.title}  (${s.source})`));
  }

  if (APPLY && toDeactivate > 0) {
    const res = await Sound.updateMany(TOO_LONG, { $set: { active: false } });
    console.log(`\n✅ deactivated ${res.modifiedCount} sounds.`);
    const byCat = await Sound.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', n: { $sum: 1 } } },
    ]);
    const after = await Sound.countDocuments({ active: true });
    console.log(`active after: ${after} ·`, byCat.map((c) => `${c._id}:${c.n}`).join(' '));
    const maxLeft = await Sound.find({ active: true }).sort({ durationSec: -1 }).limit(1).select('durationSec').lean();
    console.log('longest remaining:', maxLeft[0] ? maxLeft[0].durationSec + 's' : 'n/a');
  } else if (!APPLY) {
    console.log('\n(dry run — re-run with --apply to deactivate)');
  } else {
    console.log('\nnothing to do — no long sounds active.');
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
