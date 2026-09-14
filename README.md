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

## Updating player data
Player stats live in \`data/players.json\`. Edit or regenerate that file
(e.g. from a fresh CSV export) and redeploy — the scoring engine in
\`lib/scoring.ts\` recalculates everything automatically, no other changes needed.
