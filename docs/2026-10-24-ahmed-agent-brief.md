# Brief for Ahmed's agent (Lovable via MCP)

One brief, all changes from 2026-10-24. Paste the block below into the agent.

```
You build Jaybird (JCI member platform) in Lovable via MCP. Repo: https://github.com/Arag0n1421/Jaybird
Read first, in order: docs/DESIGN.md, docs/2026-10-24-product-spec.md (sections 3, 4, 8),
docs/2026-10-24-review-v1-and-prompts.md, docs/2026-10-24-home-feed-prompt.md.
The spec is the source of truth. If this brief and the spec disagree, the spec wins.

RULES
- App name "Jaybird", mascot "Jay". Follow DESIGN.md on every screen; add it to the Lovable project Knowledge.
- Database: Supabase. Change schema only with migrations (additive: add tables/columns, do not drop or rename
  existing ones). Anton also owns the schema: tell Ahmed before you migrate so Anton pauses schema edits.
- Seed data is fake. Use Unsplash photo URLs for covers, galleries, avatars, supporter logos (or initials).
- No secrets in code or repo. Demo RLS can stay open; do not add real member data.
- Work in the order below. After each step: check the screen in the preview, fix errors, then continue.
- Do not touch docs/. Report at the end: done steps, skipped steps and why, known bugs.

STEP 1 - DATABASE (one migration)
Add, if missing:
- members: linkedin_url text, level int default 1
- projects: cover_url text, status text check in ('active','closed') default 'active'
- badges: icon text, tier text check in ('bronze','silver','gold','platinum') null, kind text check in ('earned','peer') default 'earned'
- recommendations (id, member_id fk, author_name, author_title, text, source default 'linkedin')
- follows (follower_id fk members, followee_id fk members, pk both)
- notifications (id, member_id fk, type text, payload jsonb, read_at timestamptz, created_at default now())
- project_photos (id, project_id fk, url, caption)
- supporters (id, name, type check in ('sponsor','supporting_member','partner'), logo_url, ask, reward, chapter_id fk null, url)
- news (id, chapter_id fk, type text, member_id fk null, project_id fk null, text, image_urls text[], created_at default now())
- kudos (news_id fk, member_id fk, pk both)
- peer_badges (id, giver_id fk, receiver_id fk, badge_id fk, note text check length <= 140, season int, created_at default now();
  unique (giver_id, receiver_id, season); check giver_id <> receiver_id)
Seed: covers for every project, 1 closed project with 8-12 gallery photos, 2 recommendations for Elza,
6-8 news items, 3 supporters (1 sponsor, 1 supporting member, 1 partner "BNI Latvia"), peer badge set
(bronze: Thanks for the help, Team player; silver: Problem solver, Leader in action; gold: Outstanding contribution;
platinum: Senator's choice) and 3 given peer badges, a few follows, 3 unread notifications for the demo user.
XP rule check: XP grows with task size (15m < 1h < half_day).

STEP 2 - FIXES (prompt P0 in review doc)
Gap bonus box text once; Ranks: list places 4-10 + sticky "You" row; Personal asks card on Home above "one task".

STEP 3 - HOME FEED (P6, with supporters version)
Personal asks, one task today, Hot projects, Best XP per minute (XP ÷ minutes pill), Our supporters
(sponsor / supporting member / partner + partner logo strip), Chapter news with kudos, "XP to pass {name}" nudge.
Desktop right rail: supporters, nudge, mini leaderboard.

STEP 4 - PROJECTS + GALLERY (P3)
STEP 5 - PEOPLE + FRIENDS (P1), incl. member profile with recommendations ("Recommended by") and LinkedIn link
STEP 6 - BADGE ICONS (P5) + PEER BADGES BY TIER (P7)
Peer badge rules: giver tier from level/role (bronze level 3+, silver level 6+ or lead of a closed project,
gold local board/president, platinum senator or national board); limits 5/3/2/1 per season; +20/+60/+150/+300 XP
to receiver; +5 XP to giver; note required. Enforce limits server-side (RPC or trigger).
STEP 7 - NOTIFICATIONS BELL (P2), incl. "badge received" and "buddy posted a task"
STEP 8 - NETWORK VIEW (P4), d3-force
STEP 9 - LANGUAGE BUTTON (P8): EN works; Latviešu translates nav only + "coming soon" toast

NOT NOW (spec section 8): Stripe membership EUR 100/yr, full translation, GDPR. Do not build.

DEMO PATH TO TEST AT THE END
Act as lead -> ask Elza for "Write the Instagram recap" -> act as Elza -> accept on Home -> mark done ->
act as lead -> approve -> Elza: XP up, Spark badge pops, rank passes Laura, news item appears, notification arrives.
```
