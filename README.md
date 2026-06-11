# RingVault 🔔

Android app για Ringtones, Notifications & Alarms — Kotlin/Compose client + Node/Express/MongoDB backend.

[![Landing](https://img.shields.io/badge/landing-ringvault.vercel.app-orange)](https://ringvault.vercel.app)
[![API](https://img.shields.io/badge/API-onrender.com-46b3e6)](https://ringvault-api-0wbw.onrender.com/health)
[![APK](https://img.shields.io/github/v/release/TPAINN/ringvault?label=APK)](https://github.com/TPAINN/ringvault/releases)

| | |
|---|---|
| 🌐 Landing page | https://ringvault.vercel.app |
| ⚙️ Live API | https://ringvault-api-0wbw.onrender.com/api/sounds |
| 📱 APK | [Releases](https://github.com/TPAINN/ringvault/releases) |

Δες το [CLAUDE.md](CLAUDE.md) για πλήρες context (αρχιτεκτονική, νομικοί περιορισμοί πηγών, phased plan).

## Backend — τοπικό setup

```bash
cd backend
npm install
cp .env.example .env   # συμπλήρωσε MONGO_URI + API keys
npm run dev            # http://localhost:5000
npm run ingest         # γέμισμα DB από Freesound + Pixabay
```

API keys:
- Freesound: https://freesound.org/apiv2/apply/
- Pixabay: https://pixabay.com/api/docs/

Endpoints: `GET /api/sounds`, `GET /api/sounds/:id`, `GET /api/sounds/search?q=`,
`POST /api/sounds/:id/download`, `GET /api/meta/categories`, `GET /health`.

## Deploy (Render)

`render.yaml` ορίζει web service + weekly cron (Κυριακή 04:00 UTC).
Blueprint deploy: New → Blueprint → δείξε στο repo. Όρισε `MONGO_URI`, `FREESOUND_API_KEY`, `PIXABAY_API_KEY`.

## Android

Άνοιξε τον φάκελο `android/` στο Android Studio (Ladybug ή νεότερο, JDK 17).

```bash
cd android
./gradlew installDebug        # σε συνδεδεμένη συσκευή
./gradlew assembleRelease     # signed APK (θέλει keystore — δες CLAUDE.md §8)
```

Backend URL: default `https://ringvault-api-0wbw.onrender.com` (live). Override σε `~/.gradle/gradle.properties` ή `android/gradle.properties`:

```
RINGVAULT_API_URL=http://10.0.2.2:5000
```

(`10.0.2.2` = localhost από emulator.)

MVP flow: Home tabs (Ringtones/Notifications/Alarms) → inline preview (ExoPlayer, ένα κάθε φορά) → bottom sheet → Set as Ringtone/Notification/Alarm μέσω MediaStore + `RingtoneManager`. Αν λείπει το WRITE_SETTINGS permission, ο ήχος αποθηκεύεται και ο χρήστης παίρνει snackbar με deep-link στις ρυθμίσεις.
