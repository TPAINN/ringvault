// Shared title sanitizer — turns raw source file names into human titles.
// Returns null when nothing presentable survives (caller should skip the item).

const REJECT = /unknown|untitled|unnamed|no title|test recording|^audio$|^sound$/i;

// Words that describe the file, not the sound — noise in a card title
const FILLER =
  /\b(sound effects?|sound files?|audio files?|audio|recording|recorded|files?|misc|near mono|mono|stereo|sample|sfx|wav|mp3|ogg|version|edit)\b/gi;

function cleanTitle(raw) {
  let t = String(raw || '')
    .replace(/\.(mp3|wav|ogg|oga|flac|opus|m4a|aiff?|mid)$/i, '')
    .replace(/[_]+/g, ' ')
    // leading numeric ids, e.g. "406243 Stubb Typewriter Ding"
    .replace(/^\s*\d{3,}[\s.-]+/, '')
    // Wikidata/Lingua-Libre ids: "LL Q117707514", "Q12345"
    .replace(/\bLL\b/gi, ' ')
    .replace(/\bQ\d{4,}\b/gi, ' ')
    // ISRC codes and bracketed/parenthesized noise
    .replace(/\(([^)]*)\)|\[[^\]]*\]/g, ' ')
    .replace(/\bISRC\s*\S+/gi, ' ')
    // keep letters (any script), digits, spaces, apostrophes, hyphens
    .replace(/[^\p{L}\p{N}\s'’-]/gu, ' ')
    .replace(FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // collapse repeated consecutive words: "Mystery Mystery Identity" -> "Mystery Identity"
  t = t.replace(/\b(\p{L}+)(?:\s+\1\b)+/giu, '$1');

  // drop short gibberish tokens with internal capitals ("JjW") — keeps "MacLeod", "WWS"
  t = t.replace(/\b\p{Lu}\p{Ll}{0,2}\p{Lu}\b/gu, ' ').replace(/\s+/g, ' ').trim();

  // drop dangling connector words left behind by the filler pass
  t = t.replace(/\b(for|of|the|a|an|and)\s*$/i, '').trim();

  // long titles read like file descriptions — keep the first 7 words
  const words = t.split(' ');
  if (words.length > 7) t = words.slice(0, 7).join(' ');

  // must be mostly letters and long enough to mean something
  const letters = (t.match(/\p{L}/gu) || []).length;
  if (letters < 4) return null;
  if (letters / t.replace(/\s/g, '').length < 0.5) return null;
  if (REJECT.test(t)) return null;

  t = t.slice(0, 120).trim();

  // Title Case
  return t.replace(/\p{L}\S*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

module.exports = { cleanTitle };
