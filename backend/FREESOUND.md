# Scaling the catalog with Freesound (tens of thousands of CC0 sounds)

Pixabay's **audio** API was discontinued (the public `/api/audio/` endpoint returns
`403 Access denied`; the key only works for images/videos now). The real source for a
large ringtone/notification/alarm catalog is **Freesound** — a huge CC0/CC-BY library
with a proper search API. The scraper (`scrapers/freesound.js`) is already wired.

## 1. Get a free API key (~2 minutes)

1. Register: https://freesound.org/home/register/
2. Apply for API access: https://freesound.org/apiv2/apply/
   - Fill the short form (name + description, e.g. "RingVault — personal ringtone app").
   - Approval is instant. Copy the **API key / token** (the `token` value, not the OAuth client secret).

## 2. Use it locally

Add to `backend/.env` (this file is gitignored — never commit it):

```
FREESOUND_API_KEY=your_token_here
```

### Grow the web app catalog (web/catalog.json + catalog.js)

```
cd backend
node scripts/harvest-web.js
```

`harvest-web.js` auto-detects `FREESOUND_API_KEY` and pulls Freesound CC0 sounds
(filtered to ≤60s, then capped per category) on top of Mixkit + Commons. Then ship it:

```
git add web/catalog.json web/catalog.js
git commit -m "data: grow catalog with Freesound"
git push            # Vercel redeploys the web app
```

### Grow the backend DB (used by the Android app via the live API)

```
cd backend
npm run ingest      # upserts new Freesound sounds into MongoDB Atlas
```

## 3. Keep the weekly cron pulling Freesound

The GitHub Actions weekly job (`.github/workflows/weekly-ingest.yml`) needs the key as
a repo secret:

- GitHub repo → Settings → Secrets and variables → Actions → New repository secret
- Name: `FREESOUND_API_KEY`, value: your token

After that, every Sunday run ingests fresh Freesound sounds automatically.

## Notes

- Freesound previews are ~128 kbps HQ MP3 — perfect for ringtones; full-quality
  downloads need OAuth2, which we don't need here.
- The CC0 filter (`license:"Creative Commons 0"`) means no attribution is required,
  but the app still shows author/license in the detail sheet.
- Rate limits are generous for ingestion; the scraper paginates politely.
