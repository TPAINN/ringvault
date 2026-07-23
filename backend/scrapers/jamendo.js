// Jamendo scraper - CC0/CC-BY licensed audio tracks
const axios = require('axios');

const BASE_URL = 'https://api.jamendo.com/v3.0';

function cleanTitle(name) {
  return String(name)
    .replace(/\.(mp3|wav|ogg|flac|m4a|aac)$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

async function fetchNew() {
  try {
    console.log('[jamendo] fetching tracks...');
    
    const params = {
      client_id: process.env.JAMENDO_CLIENT_ID || '5b1c32ad',
      format: 'json',
      limit: 50,
      order: 'popularity_desc',
      audio_format: 'mp3',
      duration_over: 3,
      duration_less: 40
    };
    
    const response = await axios.get(`${BASE_URL}/tracks/`, {
      params,
      timeout: 30000,
      headers: { 'User-Agent': 'RingVault/1.0' },
    });
    
    const tracks = response.data.results || [];
    console.log(`[jamendo] found ${tracks.length} tracks`);
    
    const results = [];
    
    for (const track of tracks) {
      if (!track.name || !track.id) continue;
      if (!track.musicbrainz_mapping?.work_id) continue;
      
      const tags = (track.tags || []).map(tag => tag.toLowerCase()).slice(0, 5);
      if (track.genre) tags.push(track.genre.toLowerCase());
      
      let category = 'ringtone';
      const title = (track.name || '').toLowerCase();
      
      if (['notification', 'ding', 'pop', 'click'].some(t => tags.includes(t)) || 
          title.includes('notification')) {
        category = track.duration <= 6000 ? 'notification' : 'ringtone';
      } else if (['alarm', 'siren', 'clock'].some(t => tags.includes(t)) || 
                 title.includes('alarm')) {
        category = 'alarm';
      }
      
      results.push({
        title: cleanTitle(track.name),
        tags,
        durationSec: Math.round(track.duration / 1000),
        source: 'jamendo',
        sourceId: String(track.id),
        previewUrl: track.audio || '',
        downloadUrl: track.audio || '',
        format: 'mp3',
        bitrateKbps: 320,
        license: 'CC-BY',
        author: track.artist_name || '',
        createdAt: new Date().toISOString(),
        active: true,
      });
    }
    
    console.log(`[jamendo] processed ${results.length} tracks`);
    return results;
    
  } catch (error) {
    console.error('[jamendo] error:', error.message);
    return [];
  }
}

module.exports = { fetchNew };
