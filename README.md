# NBA Draft Manager

A category-based rotisserie fantasy basketball draft board. Ranks ~200 players
against FG%, FT%, 3PM, 3P%, OREB, DREB, AST, A/TO ratio, STL, BLK, and PTS,
using the same z-score methodology as the original spreadsheet version.

## Features
- Sortable, filterable draft board (search by name, filter by position)
- Click any column header to sort by that stat
- Track picks live: type a team name into "Drafted By" as your draft happens
- Notes column for your own scouting comments
- All draft-day state is saved in your browser (localStorage) — nothing is sent to a server
- Fully static — no backend, database, or API keys required

## Running locally
\`\`\`bash
npm install
npm run dev
\`\`\`
Then open http://localhost:3000

## Deploying to Vercel

**Option A — via GitHub (recommended)**
1. Create a new GitHub repo and push this folder to it:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit: NBA Draft Manager"
   git branch -M main
   git remote add origin https://github.com/<your-username>/nba-draft-manager.git
   git push -u origin main
   \`\`\`
2. Go to https://vercel.com/new, import the repo, and click Deploy.
   Vercel auto-detects Next.js — no config needed.

**Option B — Vercel CLI (no GitHub needed)**
\`\`\`bash
npm install -g vercel
vercel login
vercel --prod
\`\`\`
Follow the prompts; it'll give you a live URL in under a minute.

## Live ESPN sync

The "🔄 Sync with ESPN" button pulls your league's current rosters straight
from ESPN Fantasy and marks those players as drafted, with the right team
name, automatically.

**Setup (one-time):**
1. Log into fantasy.espn.com, open DevTools → Application (Chrome) or
   Storage (Firefox) → Cookies → `https://fantasy.espn.com`.
2. Copy the values of the `espn_s2` and `SWID` cookies (SWID includes the
   curly braces).
3. In your Vercel project: Settings → Environment Variables, add:
   - `ESPNS2` = (the espn_s2 value)
   - `ESPNSWID` = (the SWID value, including `{ }`)
   - `ESPNLEAGUEID` = `85907` (only needed if it ever changes)
   - `ESPNSEASONID` = `2027` (ESPN's season-end year, e.g. 2026-27 → 2027)
   - `ESPNTEAMID` = `20` (your team ID, used to detect "My Team")
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new env vars take effect.

These cookies are read only server-side, inside `/app/api/espn/route.ts` —
they're never sent to the browser. If sync starts failing, your ESPN
session likely expired; repeat steps 1–2 and update the Vercel values.

## Updating player data
Player stats live in \`data/players.json\`. Edit or regenerate that file
(e.g. from a fresh CSV export) and redeploy — the scoring engine in
\`lib/scoring.ts\` recalculates everything automatically, no other changes needed.
