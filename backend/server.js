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
  
  // Add enhanced metadata and analytics
  app.get('/api/stats', async (req, res, next) => {
    try {
      const Sound = require('./models/Sound');
      const [
        totalActiveSounds,
        soundsByCategory,
        topTags,
        recentAdds,
        sourceBreakdown,
        avgPopularity,
        mostPopularSound,
      ] = await Promise.all([
        Sound.countDocuments({ active: true }),
        Sound.aggregate([
          { $match: { active: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ]),
        Sound.aggregate([
          { $match: { active: true } },
          { $unwind: '$tags' },
          { $group: { _id: '$tags', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
        Sound.find({ active: true })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('title category durationSec createdAt popularity'),
        Sound.aggregate([
          { $match: { active: true } },
          { $group: { _id: '$source', count: { $sum: 1 } } },
        ]),
        Sound.aggregate([
          { $match: { active: true } },
          { $group: { _id: null, avg: { $avg: '$popularity' } } },
        ]),
        Sound.findOne({ active: true }).sort({ popularity: -1 }).select('title category popularity createdAt'),
      ]);
      
      res.json({
        totalActiveSounds,
        soundsByCategory: Object.fromEntries(
          soundsByCategory.map((item) => [item._id, item.count])
        ),
        topTags: topTags.map((item) => item._id),
        recentAdds,
        sourceBreakdown: Object.fromEntries(
          sourceBreakdown.map((item) => [item._id, item.count])
        ),
        avgPopularity: avgPopularity[0]?.avg || 0,
        mostPopularSound,
      });
    } catch (err) {
      next(err);
    }
  });
  
// Enhanced search with fuzzy matching and suggestions
  app.get('/api/sounds/search/enhanced', async (req, res, next) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.json({ items: [], total: 0, page: 1, pages: 0 });
      if (q.length > 100) return res.status(400).json({ error: 'Query too long' });
      
      const { page, limit, skip } = parsePaging(req.query);
      
      // Combine full-text search with regex for better results
      const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const filter = { 
        active: true,
        $or: [
          { $text: { $search: q } },
          { title: searchRegex },
          { tags: searchRegex },
        ]
      };
      
      const [items, total] = await Promise.all([
        Sound.find(filter)
          .sort({ score: { $meta: 'textScore' }, popularity: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Sound.countDocuments(filter),
      ]);
      
      res.json({ items, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
      next(err);
    }
  });
  
  // Random featured sounds endpoint
  app.get('/api/sounds/featured', async (req, res, next) => {
    try {
      const count = Math.min(parseInt(req.query.count, 10) || 10, 50);
      const sounds = await Sound.aggregate([
        { $match: { active: true } },
        { $sample: { size: count } },
        { $project: { title: 1, category: 1, durationSec: 1, previewUrl: 1, thumbnail: 1, popularity: 1 } },
      ]);
      res.json(sounds);
    } catch (err) {
      next(err);
    }
  });
  
  // Sound recommendations based on user behavior
  app.get('/api/sounds/recommended/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid id' });
      }
      
      const sound = await Sound.findById(req.params.id).select('category tags title').lean();
      if (!sound) return res.status(404).json({ error: 'Not found' });
      
      const recommendations = await Sound.aggregate([
        { $match: {
          active: true,
          _id: { $ne: mongoose.Types.ObjectId(req.params.id) },
          $or: [
            { category: sound.category },
            { tags: { $in: sound.tags } },
          ],
        } },
        { $sample: { size: 20 } },
        { $project: { title: 1, category: 1, durationSec: 1, previewUrl: 1, popularity: 1 } },
      ]);
      
      res.json(recommendations);
    } catch (err) {
      next(err);
    }
  });
  
  // Jamendo integration - featured CC-BY tracks
  app.use('/api/jamendo', require('./routes/jamendo'));
  
  app.listen(PORT, () => console.log(`RingVault API listening on :${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
