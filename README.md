# My Journal — v1.1

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

## v1.1
- WIN is always stored/displayed as a positive P&L.
- LOSS is always stored/displayed as a negative P&L.
- BE is always stored/displayed as $0.
- Existing LOSS trades that were entered as positive values display correctly immediately.
- Editing and saving an older LOSS trade corrects its stored value in Supabase.
