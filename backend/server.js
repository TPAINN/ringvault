require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const soundsRouter = require('./routes/sounds');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1); // Render sits behind a proxy

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10kb' }));

// Catalog changes weekly — let clients and Render's edge cache reads briefly
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  }
  next();
});

const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : {}));

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use('/api/sounds', soundsRouter);

app.get('/api/meta/categories', (req, res) => {
  res.json([
    { id: 'ringtone', label: 'Ringtones' },
    { id: 'notification', label: 'Notifications' },
    { id: 'alarm', label: 'Alarms' },
  ]);
});

// Top tags across active sounds — drives the category chips in the app
app.get('/api/meta/tags', async (req, res, next) => {
  try {
    const Sound = require('./models/Sound');
    const filter = { active: true };
    if (['ringtone', 'notification', 'alarm'].includes(req.query.category)) {
      filter.category = req.query.category;
    }
    const tags = await Sound.aggregate([
      { $match: filter },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
      { $project: { _id: 0, tag: '$_id', count: 1 } },
    ]);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// Never let the edge cache misses — a 404 cached for 5 min hides fresh routes
app.use((req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.set('Cache-Control', 'no-store');
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`RingVault API listening on :${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
