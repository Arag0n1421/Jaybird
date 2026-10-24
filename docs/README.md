# Jam docs

Shared product decisions for the team. Read before you build. New idea from the team → it lands here.

| File | What |
|---|---|
| `2026-10-24-product-spec.md` | Problem, features, data model, demo story. Source of truth for what we build |
| `2026-10-24-poll-results.md` | JCI member poll results (pitch proof) |

## Team
| Person | Owns |
|---|---|
| Matīss | Pitch (sole presenter), member dashboard, docs |
| Ahmed | Lead dashboard, matching, research |
| Julija | Design tokens, mascot, presentation |
| Anton | Database + seed data, points + badges, leaderboard |

## Working in parallel (rules)
1. Write only in your own folder. `docs/`: Matīss. Ask before editing someone else's files.
2. `git pull` before every push. Never force-push.
3. Small commits, clear messages.
4. No keys in the repo. `.env` stays local. Supabase service key never in code.
5. Spec changes: edit `2026-10-24-product-spec.md` > Changelog, one line, date + who.
