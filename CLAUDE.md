# CLAUDE.md — RingVault (Android Ringtones, Notifications & Alarms App)

> Context file for Claude Code sessions. Read this fully before any task. Keep it updated when architecture decisions change.

---

## 1. Project Overview

**RingVault** is a native Android app (APK, sideload-first, Play Store optional later) that delivers high-quality **Ringtones, Notification Sounds, and Alarm Sounds** with a smooth, lightweight, modern UI.

Core loop:
1. Backend aggregates high-quality audio (title, category, duration, tags, preview URL) from legal APIs + scrapers.
2. A **weekly automated job** scans sources, deduplicates, and inserts new sounds into the database.
3. The app fetches the catalog, streams previews, downloads files, and **sets them as ringtone / notification / alarm** via Android system APIs.

**Owner:** Apostolos — solo dev, Greece. Comfortable with React/Node/MongoDB, Puppeteer scraping, Render/Vercel deploys. New-ish to native Android.

---

## 2. Tech Stack (decided — do not re-litigate unless blocked)

### Android Client
| Concern | Choice | Why |
|---|---|---|
| Language | **Kotlin** | Native = smoothest + lightest APK; Compose is declarative like React |
| UI | **Jetpack Compose + Material 3** | Modern design, dynamic color (Material You), minimal boilerplate |
| Architecture | MVVM + Repository, single-module | Solo dev, keep it simple |
| Networking | Retrofit + OkHttp + Kotlinx Serialization | Standard, lean |
| Images | Coil | Compose-native |
| Audio preview | **ExoPlayer (Media3)** | Gapless, streams MP3/OGG previews |
| Local cache | Room | Offline catalog + favorites |
| Downloads | OkHttp → `MediaStore.Audio` (scoped storage) | API 29+ compliant |
| DI | Hilt | Standard |
| Min SDK | 26 (Android 8.0) | Covers ~95% of devices; simplifies ringtone APIs |
| Build | Gradle KTS, R8/ProGuard enabled | Target APK < 10 MB |

### Backend (reuse existing skills)
| Concern | Choice |
|---|---|
| Runtime | **Node.js + Express** (or Fastify) |
| DB | **MongoDB Atlas** (free tier) — collection `sounds` |
| Scraping | Puppeteer-extra + stealth (same pattern as Smart Grocery Hub scrapers) |
| Scheduler | `node-cron` weekly job **or** Render Cron Job (preferred — no always-on process) |
| Audio storage | Don't rehost files initially. Store **source URLs**. If a source blocks hotlinking → proxy/stream through backend, or cache to Cloudflare R2 (free 10 GB) |
| Hosting | Render (backend), free tier |

---

## 3. Audio Sources — IMPORTANT LEGAL CONSTRAINT

⚠️ **Never scrape or redistribute copyrighted commercial ringtones** (movie themes, chart music, Zedge premium content). That creates real legal exposure for a distributed app. Prioritize sources with explicit free licenses:

**Tier 1 — Official free APIs (use first):**
- **Freesound.org API** — huge CC0/CC-BY library, full metadata, requires API key. Filter: `license:"Creative Commons 0"`, duration < 40s, high bitrate.
- **Pixabay Audio API** — royalty-free sound effects, simple JSON API.

**Tier 2 — Scrape-friendly free libraries (check robots.txt + ToS first):**
- ✅ Mixkit — IMPLEMENTED (`scrapers/mixkit.js`). robots.txt verified 2026-06-11 (Allow: /), Mixkit Free License, 1.5s polite delay, data parsed from category-page data attributes
- ✅ Wikimedia Commons — IMPLEMENTED (`scrapers/commons.js`), CC0/PD/CC-BY only
- Notification Sounds–style CC sites

⚠️ TikTok / trending commercial sounds: REJECTED — copyrighted content, real legal
exposure for a distributed app (see warning above). Do not implement.

**Tier 3 — User value-add:**
- Curated/processed versions (normalize loudness to -14 LUFS, trim silence, fade-out) — done in the weekly pipeline with `ffmpeg`.

Attribution: store `license` + `author` per sound; show in app detail sheet (required for CC-BY).

---

## 4. Data Model

```js
// MongoDB: sounds collection
{
  _id: ObjectId,
  title: String,            // cleaned, Title Case
  category: "ringtone" | "notification" | "alarm",
  tags: [String],           // ["calm", "electronic", "birds"]
  durationSec: Number,
  source: "freesound" | "pixabay" | "mixkit" | ...,
  sourceId: String,         // for dedup: unique index on (source, sourceId)
  previewUrl: String,       // low-bitrate stream
  downloadUrl: String,      // full quality
  format: "mp3" | "ogg",
  bitrateKbps: Number,
  sizeBytes: Number,
  license: String,
  author: String,
  popularity: Number,       // download count in-app
  createdAt: Date,          // = "New this week" badge driver
  active: Boolean           // soft-delete if source 404s
}
```

**API endpoints (Express):**
```
GET /api/sounds?category=&tags=&sort=new|popular&page=&limit=30
GET /api/sounds/:id
GET /api/sounds/search?q=
POST /api/sounds/:id/download      // increments popularity
GET /api/stream/:id                // optional proxy if hotlinking blocked
GET /api/meta/categories
```

---

## 5. Weekly Ingestion Pipeline (Render Cron, Sundays 04:00 UTC)

```
fetch new items per source (since lastRun)
  → filter: duration ≤ 40s (ringtone/notif) / ≤ 60s (alarm), bitrate ≥ 128kbps
  → dedup: (source, sourceId) unique index + title fuzzy match
  → ffmpeg: loudness normalize, trim, transcode to mp3 192kbps if needed
  → classify category: duration + tag heuristics
      (≤ 8s → notification, 8–40s → ringtone, loop-able/long → alarm)
  → upsert to MongoDB, set createdAt
  → health check: HEAD existing downloadUrls in batches, deactivate 404s
  → log summary (added / skipped / deactivated)
```

Keep each scraper in `backend/scrapers/<source>.js` exporting `{ fetchNew(since) }` — same modular pattern as the supermarket scrapers.

---

## 6. Android App — Screens & UX

1. **Home** — tabs: Ringtones / Notifications / Alarms. Chips: New 🔥 / Popular / Tags. LazyColumn of `SoundCard`s.
2. **SoundCard** — title, duration, tag chips, waveform-ish progress bar, ▶ inline preview (only one plays at a time), ⬇ button.
3. **Detail bottom sheet** — full info, license/author, actions: *Set as Ringtone / Notification / Alarm / Save to device / Favorite*.
4. **Search** — debounced, server-side.
5. **Favorites** — Room-backed, offline.
6. **Settings** — theme (system/dark/light, dynamic color), cache clear.

**Design language:** Material 3, dynamic color, large rounded cards (24dp), subtle spring animations on play state, edge-to-edge, no splash bloat. Dark theme first-class.

### Setting sounds — the critical Android part
```kotlin
// 1. Need WRITE_SETTINGS special permission:
if (!Settings.System.canWrite(context)) {
    startActivity(Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS,
        Uri.parse("package:$packageName")))
}
// 2. Save file via MediaStore (scoped storage, API 29+):
//    RELATIVE_PATH = "Ringtones/" | "Notifications/" | "Alarms/"
//    IS_RINGTONE / IS_NOTIFICATION / IS_ALARM = true
// 3. Apply:
RingtoneManager.setActualDefaultRingtoneUri(
    context, RingtoneManager.TYPE_RINGTONE /* or _NOTIFICATION / _ALARM */, uri)
```
Handle gracefully: permission denied → fall back to "Saved to Ringtones folder, set it manually" snackbar with deep-link to system sound settings.

---

## 7. Repository Layout

```
ringvault/
├── CLAUDE.md
├── backend/
│   ├── server.js
│   ├── routes/sounds.js
│   ├── models/Sound.js
│   ├── scrapers/{freesound.js, pixabay.js, mixkit.js}
│   ├── pipeline/{ingest.js, normalize.js, classify.js, healthcheck.js}
│   └── cron/weekly.js
└── android/
    └── app/src/main/java/com/apostolos/ringvault/
        ├── data/{api/, db/, repo/}
        ├── ui/{home/, detail/, search/, favorites/, theme/}
        ├── player/PreviewPlayer.kt
        ├── ringtone/RingtoneSetter.kt
        └── di/
```

---

## 8. Build & Run Commands

```bash
# Backend
cd backend && npm i && npm run dev          # nodemon, port 5000
npm run ingest                              # manual pipeline run
# Android
cd android && ./gradlew assembleRelease     # signed APK → app/build/outputs/apk/release/
./gradlew installDebug                      # to connected device (USB debugging on)
```

Release signing: keep `keystore.jks` + `keystore.properties` **out of git** (.gitignore). Document the keystore password in a password manager — losing it means losing update capability.

---

## 9. Phased Plan

- **Phase 1 (MVP):** Backend with Freesound + Pixabay only, no scraping. App: Home list + preview + download + set-as-ringtone. Hardcoded catalog fallback if backend down.
- **Phase 2:** Weekly cron, dedup, ffmpeg normalization, categories/tags, search, favorites.
- **Phase 3:** Scrapers (Mixkit etc.), "New this week" push via FCM, in-app trimmer (cut your own segment), Greek localization (default `el`, fallback `en`).
- **Phase 4:** Optional Play Store release (requires privacy policy, content licensing audit).

---

## 10. Conventions for Claude Code Sessions

- Kotlin: official style, Compose previews for every screen-level composable.
- Backend: same conventions as Smart Grocery Hub (async/await, modular scrapers, try/catch with per-source isolation so one failing scraper never kills the pipeline).
- Strings: Greek-first UI (`values-el` is default locale), English fallback.
- Never commit API keys — use `local.properties` (Android) / `.env` (backend).
- Before adding a new audio source: verify license + robots.txt, then add to §3 table.
- Update this file's **Phased Plan** checkboxes as features land.

## 11. Current Status

- [x] Repo scaffolded — GitHub: https://github.com/TPAINN/ringvault
- [ ] Freesound API key obtained (Pixabay key also pending). Keyless sources live: Mixkit (276 auto-discovered categories), ccMixter (CC-BY music/remixes, native HTTP — see scraper comment re X-JSON header + expired cert), Commons — **3348 sounds total**, clean titles via lib/titleClean.js
- [x] Tag categories: GET /api/meta/tags (top-30 per category) + chips row in app (v0.4.0)
- [x] Instant load: disk cache per tab on device + keep-warm.yml pings /health every 10 min (free on public repos)
- ⚠️ Cache-Control middleware must NOT apply to 404/500 (edge caches misses — bit us once; fixed with no-store in handlers)
- [x] Backend MVP endpoints — LIVE at https://ringvault-api-0wbw.onrender.com (Render free, Frankfurt; MongoDB Atlas db `ringvault` on SmartGroceryHub cluster)
- [x] Android project compiles — Gradle 9.0 / AGP 8.8 / Kotlin 2.1 / JDK 25 (Adoptium); release-signed APK (1.7 MB, R8) on GitHub release v0.2.0
- [x] Release signing: `android/keystore.jks` + `android/keystore.properties` (both gitignored). KEYSTORE PASSWORD IS ONLY IN keystore.properties — back it up in a password manager; losing it = losing update capability
- [x] Adaptive UI: LazyVerticalGrid (1 col phones / multi-col tablets+landscape), spring animations, item placement animations, download scrim
- [x] Preview player implemented (PreviewPlayer.kt, single-instance ExoPlayer) — needs on-device verification
- [ ] Set-as-ringtone flow working on physical device (RingtoneSetter.kt implemented, untested on device)
- [x] Weekly cron on GitHub Actions (.github/workflows/weekly-ingest.yml, Sun 04:00 UTC + manual dispatch). MONGO_URI repo secret set; add FREESOUND_API_KEY / PIXABAY_API_KEY secrets when obtained. Verified run: ingest + healthcheck green
- [x] Backend: gzip + Cache-Control(300s) live on Render
- [x] Landing page LIVE at https://ringvault.vercel.app (Vercel, root dir `web/`) — phone mockup, scroll reveal, responsive
- Note: local dev `.env` uses non-SRV Mongo URI (local DNS blocks SRV lookups); Render/Actions use the mongodb+srv form
