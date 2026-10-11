<div align="center">

<img src="docs/banner.svg" alt="RingVault — free ringtones, notifications and alarms for Android. CC0. No ads." width="100%">

<br>

[![Live](https://img.shields.io/badge/%E2%96%B6_live-ringvault.vercel.app-fbbf24?style=for-the-badge&labelColor=161006)](https://ringvault.vercel.app/)
[![Download APK](https://img.shields.io/github/v/release/TPAINN/ringvault?label=Download%20APK&style=for-the-badge&labelColor=161006&color=38bdf8&logo=android&logoColor=white)](https://github.com/TPAINN/ringvault/releases/latest)
[![API](https://img.shields.io/badge/API-online-161006?style=flat-square&labelColor=161006&color=fbbf24)](https://ringvault-api-0wbw.onrender.com/health)
![License](https://img.shields.io/badge/license-MIT-161006?style=flat-square&labelColor=161006&color=38bdf8)

**Free ringtones, notifications and alarms for Android. Preview instantly, set with one tap. No ads, no login, no subscriptions.**

</div>

<br>

![RingVault screenshot](docs/screenshot.jpg)

## Why RingVault

| | |
|---|---|
| **Legally free, forever** | Every sound is CC0, public domain or CC-BY. |
| **One-tap set** | Writes straight to ringtone / notification / alarm through MediaStore. |
| **Always fresh** | A weekly automated pipeline ingests new sounds from Freesound and Pixabay. |
| **Fast preview** | Tap to hear it instantly with ExoPlayer before you commit. |
| **Zero friction** | No ads, no account, no paywall. |
## Stack

| Layer | Tech |
|---|---|
| Android | Kotlin · Jetpack Compose · ExoPlayer |
| Backend | Node.js · Express · MongoDB |
| Ingest | Automated weekly cron (Freesound + Pixabay) |
| Deploy | Vercel (landing) · Render (API + cron) |

## Quick start

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # MONGO_URI, FREESOUND_API_KEY, PIXABAY_API_KEY
npm run dev            # http://localhost:5000
npm run ingest         # populate DB
```

**Android:** Open `android/` in Android Studio (Ladybug+, JDK 17) → Run.

```bash
cd android
./gradlew installDebug
./gradlew assembleRelease   # signed APK
```

API keys: [Freesound](https://freesound.org/apiv2/apply/) · [Pixabay](https://pixabay.com/api/docs/)

## API

```
GET  /api/sounds
GET  /api/sounds/:id
GET  /api/sounds/search?q=
POST /api/sounds/:id/download
GET  /api/meta/categories
GET  /health
```

## License

MIT
