const mongoose = require('mongoose');

const soundSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      enum: ['ringtone', 'notification', 'alarm'],
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    durationSec: { type: Number, required: true, min: 0 },
    source: { type: String, required: true }, // freesound | pixabay | mixkit | ...
    sourceId: { type: String, required: true },
    previewUrl: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    format: { type: String, enum: ['mp3', 'ogg', 'wav', 'm4a'], default: 'mp3' },
    bitrateKbps: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    license: { type: String, default: '' },
    author: { type: String, default: '' },
    popularity: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

// Dedup: one document per (source, sourceId)
soundSchema.index({ source: 1, sourceId: 1 }, { unique: true });
soundSchema.index({ category: 1, createdAt: -1 });
soundSchema.index({ category: 1, popularity: -1 });
soundSchema.index({ title: 'text', tags: 'text' });

module.exports = mongoose.model('Sound', soundSchema);
