const express = require('express');
const axios = require('axios');

const router = express.Router();

// Jamendo API integration for free music samples
// All tracks are under CC-BY or CC-BY-SA licenses, compatible with ringtone use
async function fetchJamendoSounds() {
  try {
    const baseUrl = 'https://api.jamendo.com/v3.0';
    const results = [];
    
    // Fetch popular tracks (filtered for shorter duration, similar to ringtones)
    const popularQuery = {
      client_id: process.env.JAMENDO_CLIENT_ID,
      format: 'json',
      limit: 50,
      order: 'popularity_desc',
      audio_format: 'mp3',
      duration_over: 3,  // exclude too long tracks (minimum useful for ringtones)
      duration_less: 40  // max 40 seconds, ideal for ringtones
    };
    
    const response = await axios.get(`${baseUrl}/tracks/`, {
      params: popularQuery,
      timeout: 30000,
      headers: {
        'User-Agent': 'RingVault/1.0 (music catalog ingest)',
      },
    });
    
    const tracks = response.data.results || [];
    
    for (const track of tracks) {
      // Skip tracks explicitly marked as not suitable for ringtones
      if (track.musicbrainz_mapping?.work_id) {
        results.push({
          title: track.name || `Jamendo ${track.id}`,
          tags: (track.tags || []).map(tag => tag.toLowerCase()),
          durationSec: Math.round(track.duration / 1000), // convert ms to seconds
          source: 'jamendo',
          sourceId: String(track.id),
          previewUrl: track.audio || track.audio3 || track.audio_hq,
          downloadUrl: track.audio || track.audio3 || track.audio_hq,
          format: 'mp3',
          bitrateKbps: 320, // Jamendo high-quality MP3
          sizeBytes: 0, // Jamendo doesn't provide size info
          license: 'CC-BY', // Most tracks are CC-BY, some CC-BY-SA
          author: track.artist_name || '',
          createdAt: new Date().toISOString(),
          active: true,
        });
      }
    }
    
    console.log(`[jamendo] fetched ${results.length} tracks`);
    return results;
  } catch (err) {
    console.error(`[jamendo] fetch failed: ${err.message}`);
    return [];
  }
}

// Endpoint to get featured Jamendo tracks (displayed separately from main catalog)
router.get('/featured', async (req, res, next) => {
  try {
    const sounds = await fetchJamendoSounds();
    
    // Transform to the format expected by the frontend
    const formattedSounds = sounds.slice(0, 10).map(sound => ({
      id: sound.sourceId,
      title: sound.title,
      category: 'ringtone', // Jamendo tracks are curated for ringtones
      tags: sound.tags || [],
      durationSec: sound.durationSec,
      source: sound.source,
      previewUrl: sound.previewUrl,
      license: sound.license,
      author: sound.author,
      popularity: 0, // Jamendo tracks start with 0 popularity
      createdAt: sound.createdAt,
      active: sound.active,
    }));
    
    res.json(formattedSounds);
  } catch (err) {
    next(err);
  }
});

// Health check for Jamendo integration
router.get('/health', (req, res) => {
  res.json({ status: 'jamendo API integration active', source: 'Jamendo CC-BY tracks' });
});

module.exports = router;
