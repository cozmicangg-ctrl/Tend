# Tend — Recovery Stories

> Personalized audio stories that cast you as the capable center of your own healing.

Tend is a PWA (Progressive Web App) built on the Pygmalion Effect and expectancy research. It asks a few questions about who you are and what you're recovering from, then generates a continuous series of second-person narrative stories — read aloud in your chosen voice — designed to help your subconscious build a steadier, more capable picture of yourself.

---

## Folder structure

```
tend/
├── frontend/
│   └── react/
│       ├── src/
│       │   ├── main.jsx        ← React entry point
│       │   └── App.jsx         ← Full app component
│       ├── public/
│       │   ├── sw.js           ← Service worker (PWA offline support)
│       │   ├── manifest.json   ← PWA manifest (install to home screen)
│       │   └── icons/          ← Add icon-192.png and icon-512.png here
│       ├── index.html          ← HTML shell with PWA meta tags
│       ├── package.json        ← Frontend deps (React, Vite)
│       └── vite.config.js      ← Vite config
│
├── backend/
│   ├── server.js               ← Express server (auth, profiles, sessions, TTS)
│   ├── schema.sql              ← Supabase database schema — run this first
│   ├── package.json            ← Backend deps
│   └── .env.example            ← Copy to .env and fill in your keys
│
├── .gitignore
└── README.md
```

---

## Tech stack

| Layer      | Technology                          | Cost         |
|------------|-------------------------------------|--------------|
| Frontend   | React + Vite (PWA)                  | Free         |
| Backend    | Node/Express on Render              | Free tier    |
| Database   | Supabase (Postgres + Auth)          | Free tier    |
| Stories    | Claude API (Anthropic)              | Pay per use  |
| TTS free   | Microsoft Edge Neural voices        | Free         |
| TTS premium| ElevenLabs                          | Free tier    |

---

## Setup

### 1. Supabase (database + auth)
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `backend/schema.sql`
3. Copy your **Project URL** and **service_role key** from Settings → API

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and optionally ELEVENLABS_API_KEY
npm install
npm start
```
Deploy to [Render](https://render.com) free tier — connect your GitHub repo,
set build command `npm install`, start command `npm start`, add env vars.

### 3. Frontend
```bash
cd frontend/react
npm install
npm run dev
```
Open the app → enter your Render backend URL when prompted → create an account.

For production:
```bash
npm run build   # outputs to dist/
```
Deploy the `dist/` folder to any static host (Netlify, Vercel, Render static site — all free).

---

## PWA — install to home screen

On Android (Chrome): tap the three-dot menu → "Add to Home screen"
On iOS (Safari): tap Share → "Add to Home Screen"

The app includes a bottom nav **Install** button that appears automatically
when the browser detects it can be installed.

---

## Environment variables

### Backend `.env`
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ELEVENLABS_API_KEY=your-elevenlabs-key   # optional
PORT=3000
```

**Never commit `.env` to GitHub.** The `.gitignore` excludes it.

---

## Disclaimer

Tend is designed to support effort, consistency, and resilience — not to replace
medical treatment, therapy, or professional guidance. If you or someone using
this app is in crisis, please contact a professional or crisis line.
