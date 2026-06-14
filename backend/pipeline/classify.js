// Category heuristics. Tuned for a ringtone-first app: only very short one-shots
// are notifications, so the melodic 4–30s sounds land in Ringtones (the headline tab).
//   ≤ 4s → notification, 4–30s → ringtone, longer / alarm-like → alarm
const ALARM_TAGS = new Set(['alarm', 'siren', 'wake', 'wakeup', 'clock', 'emergency']);
const NOTIF_TAGS = new Set(['notification', 'ding', 'pop', 'click', 'blip', 'alert', 'sms']);

function classify(item) {
  const tags = new Set((item.tags || []).map((t) => t.toLowerCase()));
  const title = (item.title || '').toLowerCase();

  if ([...ALARM_TAGS].some((t) => tags.has(t)) || title.includes('alarm')) return 'alarm';
  // Notification-tagged sounds stay notifications only while genuinely short.
  if ([...NOTIF_TAGS].some((t) => tags.has(t)) || title.includes('notification')) {
    return item.durationSec <= 6 ? 'notification' : 'ringtone';
  }

  if (item.durationSec <= 4) return 'notification';
  if (item.durationSec <= 30) return 'ringtone';
  return 'alarm';
}

module.exports = { classify };
