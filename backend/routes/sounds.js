const express = require('express');
const mongoose = require('mongoose');
const Sound = require('../models/Sound');

const router = express.Router();

const MAX_LIMIT = 50;

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

// GET /api/sounds?category=&tags=&sort=new|popular&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePaging(req.query);
    const filter = { active: true };

    if (req.query.category) {
      if (!['ringtone', 'notification', 'alarm'].includes(req.query.category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      filter.category = req.query.category;
    }
    if (req.query.tags) {
      const tags = String(req.query.tags)
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 10);
      if (tags.length) filter.tags = { $in: tags };
    }

    const sort = req.query.sort === 'popular' ? { popularity: -1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      Sound.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Sound.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/sounds/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ items: [], total: 0, page: 1, pages: 0 });
    if (q.length > 100) return res.status(400).json({ error: 'Query too long' });

    const { page, limit, skip } = parsePaging(req.query);
    const filter = { active: true, $text: { $search: q } };

    const [items, total] = await Promise.all([
      Sound.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
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

// GET /api/sounds/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const sound = await Sound.findOne({ _id: req.params.id, active: true }).lean();
    if (!sound) return res.status(404).json({ error: 'Not found' });
    res.json(sound);
  } catch (err) {
    next(err);
  }
});

// POST /api/sounds/:id/download — increments popularity
router.post('/:id/download', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const sound = await Sound.findOneAndUpdate(
      { _id: req.params.id, active: true },
      { $inc: { popularity: 1 } },
      { new: true }
    ).lean();
    if (!sound) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, popularity: sound.popularity });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
