# My Journal

Personal MNQ trading journal built for GitHub Pages + Supabase.

## Features
- Private email/password login through Supabase Auth
- Multiple trading accounts
- Apex, FundedNext, Lucid, Personal and Other account types
- MNQ trade logging
- NY AM / ASIA AM sessions
- WIN / LOSS / BE results
- P&L, points, entries, exits, SL, TP, risk and R multiple
- FVG, IFVG, CISD and other ICT-style confluences
- Private screenshots in Supabase Storage
- Calendar with daily and weekly P&L
- Monthly P&L, win rate, equity curve and result charts
- Payout tracking
- 2-trades-per-day limit for newly entered trades

## GitHub Pages
Upload all files preserving the folder structure. Then open:
Settings → Pages → Build and deployment → Deploy from a branch → main / root.

## Important
The Supabase publishable key is intentionally used in the frontend. Do not add a Supabase secret key, service_role key, database password or Postgres connection string to this repository.
