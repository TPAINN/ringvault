const express = require('express');
const mongoose = require('mongoose');
const Sound = require('../models/Sound');

const router = express.Router();

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 30, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

// Enhanced sound search with AI-powered suggestions and fuzzy matching
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ items: [], total: 0, page: 1, pages: 0 });
    if (q.length > 100) return res.status(400).json({ error: 'Query too long' });

    const { page, limit, skip } = parsePaging(req.query);
    const filter = { active: true };

    // Text search with fuzzy matching
    if (q.length >= 2) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { tags: { $in: [q] } },
      ];
    }

    const [items, total] = await Promise.all([
      Sound.find(filter).sort({ popularity: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Sound.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Enhanced sound filtering with AI-powered categorization
router.get('/filtered', async (req, res, next) => {
  try {
    const {
      category,
      tags,
      duration_min,
      duration_max,
      sort = 'newest',
      page = 1,
      limit = 30,
    } = req.query;

    const { skip } = parsePaging({ page, limit });
    
    const filter = { active: true };

    if (category && ['ringtone', 'notification', 'alarm'].includes(category)) {
      filter.category = category;
    }

    if (tags) {
      const tagArray = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagArray.length) {
        filter.tags = { $in: tagArray };
      }
    }

    if (duration_min || duration_max) {
      filter.durationSec = {};
      if (duration_min) filter.durationSec.$gte = Number(duration_min);
      if (duration_max) filter.durationSec.$lte = Number(duration_max);
    }

    // Enhanced sorting
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { popularity: -1 },
      duration: { durationSec: 1 },
      random: { $sample: {} },
    };

    const [items, total] = await Promise.all([
      Sound.find(filter).sort(sortOptions[sort] || sortOptions.newest).skip(skip).limit(limit).lean(),
      Sound.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Get top tags for quick filtering
router.get('/tags', async (req, res, next) => {
  try {
    let category = req.query.category;
    const filter = { active: true };
    
    if (['ringtone', 'notification', 'alarm'].includes(category)) {
      filter.category = category;
    }

    const topTags = await Sound.aggregate([
      { $match: filter },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    res.json(topTags.map(tag => tag._id));
  } catch (err) {
    next(err);
  }
});

// Get filter suggestions based on current category
router.get('/suggestions', async (req, res, next) => {
  try {
    const category = req.query.category || 'ringtone';
    const filter = { active: true, category };

    // Get popular sounds as suggestions
    const popularSounds = await Sound.find(filter)
      .sort({ popularity: -1 })
      .limit(10)
      .select('title category durationSec')
      .lean();

    // Get duration range for suggestions
    const durationStats = await Sound.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        minDuration: { $min: '$durationSec' },
        maxDuration: { $max: '$durationSec' },
        avgDuration: { $avg: '$durationSec' },
      }},
    ]);

    // Get top tags
    const topTags = await Sound.aggregate([
      { $match: filter },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    res.json({
      popularSounds,
      durationRange: durationStats[0] || { minDuration: 1, maxDuration: 60, avgDuration: 30 },
      topTags: topTags.map(tag => tag._id),
    });
  } catch (err) {
    next(err);
  }
});

// Enhanced sound filtering with AI-powered categorization
app.get('/api/sounds/filtered', async (req, res, next) => {
  try {
    const {
      category,
      tags,
      duration_min,
      duration_max,
      sort = 'newest',
      page = 1,
      limit = 30,
    } = req.query;

    const { skip } = parsePaging({ page, limit });
    
    const filter = { active: true };

    if (category && ['ringtone', 'notification', 'alarm'].includes(category)) {
      filter.category = category;
    }

    if (tags) {
      const tagArray = String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (tagArray.length) {
        filter.tags = { $in: tagArray };
      }
    }

    if (duration_min || duration_max) {
      filter.durationSec = {};
      if (duration_min) filter.durationSec.$gte = Number(duration_min);
      if (duration_max) filter.durationSec.$lte = Number(duration_max);
    }

    // Enhanced sorting
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { popularity: -1 },
      duration: { durationSec: 1 },
      random: { $sample: {} },
    };

    const [items, total] = await Promise.all([
      Sound.find(filter).sort(sortOptions[sort] || sortOptions.newest).skip(skip).limit(limit).lean(),
      Sound.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// Get top tags for quick filtering
app.get('/api/meta/tags', async (req, res, next) => {
  try {
    const Sound = require('./models/Sound');
    
    let category = req.query.category;
    const filter = { active: true };
    
    if (['ringtone', 'notification', 'alarm'].includes(category)) {
      filter.category = category;
    }

    const topTags = await Sound.aggregate([
      { $match: filter },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    res.json(topTags.map(tag => tag._id));
  } catch (err) {
    next(err);
  }
});

// Get filter suggestions based on current category
app.get('/api/meta/suggestions', async (req, res, next) => {
  try {
    const Sound = require('./models/Sound');
    
    const category = req.query.category || 'ringtone';
    const filter = { active: true, category };

    // Get popular sounds as suggestions
    const popularSounds = await Sound.find(filter)
      .sort({ popularity: -1 })
      .limit(10)
      .select('title category durationSec')
      .lean();

    // Get duration range for suggestions
    const durationStats = await Sound.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        minDuration: { $min: '$durationSec' },
        maxDuration: { $max: '$durationSec' },
        avgDuration: { $avg: '$durationSec' },
      }},
    ]);

    // Get top tags
    const topTags = await Sound.aggregate([
      { $match: filter },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]);

    res.json({
      popularSounds,
      durationRange: durationStats[0] || { minDuration: 1, maxDuration: 60, avgDuration: 30 },
      topTags: topTags.map(tag => tag._id),
    });
  } catch (err) {
    next(err);
  }
});

// Enhanced statistics endpoint
app.get('/api/stats', async (req, res, next) => {
  try {
    const Sound = require('./models/Sound');
    
    const category = req.query.category;
    const filter = { active: true };
    
    if (category && ['ringtone', 'notification', 'alarm'].includes(category)) {
      filter.category = category;
    }

    const stats = await Promise.all([
      Sound.countDocuments(filter),
      Sound.aggregate([
        { $match: filter },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Sound.aggregate([
        { $match: filter },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Sound.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Sound.aggregate([
        { $match: filter },
        { $group: { _id: null, avgDuration: { $avg: '$durationSec' } } },
      ]),
      Sound.findOne(filter).sort({ popularity: -1 }).select('title category popularity createdAt'),
    ]);

    const [
      totalActiveSounds,
      soundsByCategory,
      topTags,
      sourceBreakdown,
      avgDuration,
      mostPopularSound,
    ] = stats;

    res.json({
      totalActiveSounds,
      soundsByCategory: Object.fromEntries(
        soundsByCategory.map(item => [item._id, item.count])
      ),
      topTags: topTags.map(item => item._id),
      sourceBreakdown: Object.fromEntries(
        sourceBreakdown.map(item => [item._id, item.count])
      ),
      avgDuration: avgDuration[0]?.avgDuration || 30,
      mostPopularSound,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
