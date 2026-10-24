# Jaybird product spec

status: hackathon demo, 2026-10-24
name: platform = Jaybird (decided 2026-10-24, replaces Jam). Mascot = Jay.
one-line: JCI members get one task that fits their time and skills, asked personally, and earn XP and badges for it.

## 1. Problems (with proof)
| # | Problem | Proof |
|---|---|---|
| P1 | Members have no time and don't know what tasks exist | Poll Q1: "No time" 8, "Don't know tasks" 6 (top 2 of 19 votes) |
| P2 | Tasks, projects and people get lost in WhatsApp chats | Julija; every member's experience |
| P3 | A task sent to everyone gets done by no one (bystander effect). A personal ask gets a reply | Poll Q3: 13 of 13 lead votes say finding people is hard |
| P4 | Volunteers are not employees: you can't assign work, you have to find the right person | Senator Uģis Krūmiņš: "the biggest challenge is to manage people who are not formally subordinate" |

## 2. Users
| Role | Does |
|---|---|
| Member | Has a profile, gets tasks, earns XP |
| New member | Gets a buddy |
| Senator (40+) | Optional mentor |
| Project lead | Posts tasks, asks matched people, approves done work |
| Verifier | Person the lead assigns to approve tasks |

## 3. Features (demo priority order)
### F1 Member dashboard (hero screen)
- Opens with ONE pick: "Your one task today" (best fit by skill + time).
- Filter: "I have 15 min / 1 h / half day".
- Level ring, XP, weekly streak.
- Mascot speech line (encouraging, Duolingo-style).
- Inbox of personal asks (F3).

### F2 Lead dashboard
- Project KPIs: done, waiting for review, open, XP awarded.
- Task list with status filter.
- Approve button → XP to member, live update on member dashboard.
- Per task: ranked matches → "Ask" (F3).

### F3 Personal ask (no group broadcast)
- Lead taps "Ask" on 1 to 3 top matches.
- Member gets: task, time tag, XP, "why you" (matched skill). Buttons: Accept / Not now.
- Not now → next match is asked automatically.
- Lead sees who was asked and who replied.
- Mascot nudges once. No spam.

### F4 Time-fit tasks
- Every task has a time tag: 15 min / 1 h / half day.
- XP grows with task size.

### F5 Matching
- Demo: tag overlap between task tags and member skills/interests + time fit. Shown as "% match".
- Later: AI on profile text.

### F6 Points, badges, gap bonus
- XP on approved task. Recruit = fixed. Sponsorship = scales with amount. Streak + leadership role = bonus.
- Gap bonus: task category under-covered this month earns ×1.5 XP.
- Badges (draft):

| Badge | Trigger |
|---|---|
| Delegator | 3 tasks handed off and finished by others. Both earn |
| Spark | Social post when chapter had no posts for 14 days (×2 XP) |
| Connector | Buddy pair or intro that led to a task |
| Recruiter | New member joined through you |
| Closer | Won a sponsorship |
| Rescuer | Took an overdue task and finished it |
| Quality Gate | Checked 10 tasks as lead/verifier |
| Bridge | Task for another chapter |
| Host | Organized an event |
| Mentor | Senator, 3 mentoring sessions |
| Handover Hero | Documented own role before term end |
| Streak | 1 task a week, N weeks in a row |

### F7 Leaderboard (secondary)
- Scope filter: project / chapter / national / global.
- Always show "you" row even outside top 5.

### F8 Mascot
- Jay (teal/yellow jay). Cheers, nudges, celebrates. Design: Julija.

### F9 LinkedIn import (nice to have)
Verified via Perplexity 2026-10-24 (LinkedIn Help + Microsoft Learn docs).
| Path | Gives | Limits | Use |
|---|---|---|---|
| Sign in with LinkedIn (OIDC: `openid profile email`) | Name, photo, email, locale | No skills, no recommendations, no work history | Login + avatar |
| Profile "Save to PDF" | Profile incl. recommendations received (full text), skill names | Desktop only; English profile only; no endorsement counts | Fastest import: member uploads PDF, AI extracts |
| Own data export (Settings > Data privacy > Get a copy of your data) | Skills, Positions, Recommendations Received/Given (CSV) | Selected categories: minutes; full archive: 24 h; link valid 72 h | Most precise import |
- Not allowed: scraping, or reading other members' profiles. Richer API = LinkedIn partner program only.
- Shown on profile: "Recommended by X for Y". Extracted skills feed F5 matching.
- Demo: seed data (Elza: 2 imported recommendations + skills) + "Upload LinkedIn PDF" button.

### F10 Members directory + friends
- People page: member cards, filters (chapter, country, project, role, skill), search. Follow → "My friends".
### F11 Notifications
- Bell: buddy/friend posted a task, personal ask, task approved, badge earned.
### F12 Projects + gallery
- Projects page with cover image, progress, team. Closed project → photo gallery.
### F13 Network view
- d3-force graph: members, senators, projects; buddy / mentor / project / friend links; filters; click to focus.
Prompts + data needs: `2026-10-24-review-v1-and-prompts.md`.

### F14 Home feed ("what's hot")
- Home = engaging feed, not a task list. Order: personal asks → one task today → hot projects → best XP per minute → sponsors looking for help → chapter news (kudos) → "30 XP to pass Laura".
- Return coefficient = XP ÷ minutes. Shown as "2.7 XP/min".
- Prompt P6 + design rules: `DESIGN.md`, `2026-10-24-home-feed-prompt.md`.
- Data (Anton): sponsors (id, name, logo_url, ask, reward, chapter_id), news (id, chapter_id, type, member_id, project_id, text, created_at), kudos (news_id, member_id).

## 4. Data model (draft; Anton owns the schema)
| Table | Fields |
|---|---|
| chapters | id, name, country |
| members | id, name, chapter_id, role, is_senator, is_new, skills[], interests[], available_time, linkedin_url |
| recommendations | id, member_id, author_name, author_title, text, source (linkedin) |
| projects | id, name, chapter_id, lead_id, cover_url, status (active/closed) |
| tasks | id, project_id, title, category (project/ops/social/recruiting), tags[], time_tag (15m/1h/half_day), xp, status (open/asked/in_progress/review/done), assignee_id, verifier_id, due_date |
| asks | id, task_id, member_id, asked_by, status (pending/accepted/declined), asked_at, answered_at |
| xp_ledger | id, member_id, task_id, xp, reason, created_at |
| badges | id, code, name |
| member_badges | member_id, badge_id, earned_at |
| follows | follower_id, followee_id |
| notifications | id, member_id, type, payload jsonb, read_at, created_at |
| project_photos | id, project_id, url, caption |
| buddies | new_member_id, buddy_id |
| mentors | senator_id, member_id |

Seed: 3 chapters in 2 countries, ~15 members, 2 projects, ~10 tasks with mixed time tags.

## 5. Demo story (3 min)
1. Lead posts "Instagram recap, 15 min". Taps Ask on Elza (92% match, "good at social").
2. Elza opens her dashboard: mascot says she has a personal ask. "Your one task today" = that task. Accept.
3. Elza marks it done. Lead approves.
4. Elza: +XP, level ring fills, Spark badge, rank moves up on chapter board.

## 6. Decisions
| Topic | Decision |
|---|---|
| Scope | International, all chapters |
| Verification | Project lead or assigned verifier. AI check: maybe later |
| Leaderboard | Public in the org, secondary |
| Tone | Encouragement first (Duolingo) |
| Broadcast | No group broadcast; personal asks only |
| Privacy/GDPR | After the demo |
| Backend | Our own Supabase, not Lovable Cloud |

## 7. Open
- Pitch length + judging criteria
- Can Lovable sync into this repo? (Perplexity check pending)

## Changelog
- 2026-10-24 Matīss: first version. Added F3 personal ask, F4 time-fit tasks, problems P1 to P4 from polls and team.
- 2026-10-24 Matīss: name = Jam for today, mascot = Jay. Added F9 LinkedIn import.
- 2026-10-24 Matīss: F9 LinkedIn import verified; PDF upload = demo path.
- 2026-10-24 Matīss: v1 reviewed. Added F10 people, F11 notifications, F12 projects + gallery, F13 network view.
- 2026-10-24 Matīss: name back to Jaybird. Added F14 home feed + DESIGN.md.
