// Category heuristics per CLAUDE.md §5:
// ≤ 8s → notification, 8–40s → ringtone, longer / loop-able → alarm
const ALARM_TAGS = new Set(['alarm', 'siren', 'wake', 'wakeup', 'clock', 'emergency']);
const NOTIF_TAGS = new Set(['notification', 'ding', 'pop', 'click', 'blip', 'alert', 'sms']);

function classify(item) {
  const tags = new Set((item.tags || []).map((t) => t.toLowerCase()));
  const title = (item.title || '').toLowerCase();

  if ([...ALARM_TAGS].some((t) => tags.has(t)) || title.includes('alarm')) return 'alarm';
  if ([...NOTIF_TAGS].some((t) => tags.has(t)) || title.includes('notification')) {
    return item.durationSec <= 15 ? 'notification' : 'ringtone';
  }

  if (item.durationSec <= 8) return 'notification';
  if (item.durationSec <= 40) return 'ringtone';
  return 'alarm';
}

module.exports = { classify };
