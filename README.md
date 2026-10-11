# RingVault

Free ringtones, notification sounds and alarms for Android. Preview a sound and set it with one tap. No ads, no login, no subscription. Every sound is CC0, public domain or CC-BY.

[Website](https://ringvault.vercel.app/) | [Download the APK](https://github.com/TPAINN/ringvault/releases/latest) | [API status](https://ringvault-api-0wbw.onrender.com/health)

![RingVault](docs/screenshot.jpg)

## Features

- Browse and preview sounds in the app (ExoPlayer)
- Set a sound as ringtone, notification or alarm through MediaStore
- Library licensed CC0, public domain or CC-BY
- Weekly automated ingest from Freesound and Pixabay
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
