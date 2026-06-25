# Tend backend — deploy guide

## Files you need
- `tend-backend-server.js`  → rename to `server.js`
- `tend-backend-package.json` → rename to `package.json`
- `tend-schema.sql`         → run in Supabase SQL editor

---

## Step 1 — Create a Supabase project (free, no card)
1. Go to supabase.com → New project
2. Give it a name, set a database password, pick a region close to you
3. Go to **SQL Editor** → paste the full contents of `tend-schema.sql` → Run
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **service_role secret key** (the long one under "Project API keys")

---

## Step 2 — Push to GitHub
1. Create a new repo (e.g. `tend-backend`)
2. Add `server.js` and `package.json`
3. Commit and push

---

## Step 3 — Deploy on Render (free tier)
1. render.com → New → Web Service → connect your repo
2. Settings:
   - Build command: `npm install`
   - Start command:  `npm start`
   - Instance type:  Free
3. Add these environment variables:
   - `SUPABASE_URL`              → your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` → your service_role key
   - `ELEVENLABS_API_KEY`        → (optional) your ElevenLabs key
4. Deploy — Render gives you a URL like `https://tend-backend-xxxx.onrender.com`

---

## Step 4 — Connect the app
Open the Tend app → enter your Render URL when prompted → done.
Create an account, sign in, and your profile + stories save automatically
across every device you sign in on.

---

## Notes
- Render free tier sleeps after inactivity — first request after idle takes ~30s.
  Acceptable for personal use; upgrade to a paid instance for a real launch.
- The service_role key is admin-level — never put it in the frontend. It lives
  only in your Render environment variables.
- Supabase free tier: 500MB storage, 50k monthly active users — plenty to start.
