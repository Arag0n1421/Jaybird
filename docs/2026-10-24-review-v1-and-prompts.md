# Review of Lovable v1 + next prompts

reviewed: 2026-10-24, Ahmed's preview (/, /my, /browse, /ranks, /me), acting as Toomas Rebane
for: Ahmed (Lovable), Anton (data)

## Works well (keep)
- Home: "Your one task today", time filter, "Why you" chips, gap bonus ×1.5, Not now / Not my thing / Too long.
- Browse: category, time and scope filters.
- Ranks: project/chapter/country/global tabs, season sponsor prize pool.
- Me: level, stats, ranks, mentees, badge grid. "Acting as" switcher (good for the demo).

## Fix (small)
| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | Home, gap bonus box | Text repeats: "Your chapter needs this. Your chapter needs this · ×1.5 XP" | One line: "Your chapter needs this · ×1.5 XP" |
| 2 | Browser tab title | OK: "Jaybird" (name kept) | Mascot = "Jay" |
| 3 | Ranks | Only top 3 podium; no list, no "you" row | Podium + list 4-10 + sticky "you" row |
| 4 | Me, badges | Grey star placeholders | Icons (prompt P5) |
| 5 | Home | Personal asks (spec F3) not visible | Inbox card above "one task": "Kadri asked you" |

## New from team (2026-10-24)
| # | Feature | Spec |
|---|---|---|
| F10 | Members directory + friends | P1 |
| F11 | Buddy/friend notifications | P2 |
| F12 | Projects page with cover image + photo gallery after close | P3 |
| F13 | Network view: people, projects, senators | P4 |
| F6 | Badge icons | P5 |

Data needed (Anton): `projects.cover_url`, `projects.status (active/closed)`, `project_photos (id, project_id, url, caption)`, `follows (follower_id, followee_id)`, `notifications (id, member_id, type, payload jsonb, read_at, created_at)`. Seed images: Unsplash URLs (people at events, volunteering, workshops).

## Lovable prompts (paste one at a time; each = 1 screen)
Credits tip: send the whole prompt once, fix small text in GitHub, not in chat.

### P0 Fixes
```
Small fixes, no layout changes:
1. Home gap bonus box: show one line only: "Your chapter needs this · ×1.5 XP".
2. The app is called "Jaybird". The mascot is called "Jay".
3. Ranks: under the top-3 podium, add a list for places 4-10 (rank, avatar, name, chapter, XP). If the current user is not in the top 10, show a sticky highlighted "You" row at the bottom with their real rank.
```

### P1 Members directory + friends
```
Add a "People" page in the left nav (icon: Users), between Browse and Ranks.
- Grid of member cards: avatar, name, chapter, country, role badge (Member / Board / Senator / New), top 3 skills, level.
- Filters as chips, same style as Browse: Chapter, Country, Project, Role, Skill. Plus a search box.
- Tab switch at top: "Everyone" / "My friends".
- Each card has a "Follow" button (toggle to "Following"). Followed people appear under "My friends".
- Click a card: member profile page (same layout as Me, read-only), with "Ask for a task" button if the viewer is a project lead.
Use the existing members data; store follows in a follows table (follower_id, followee_id).
```

### P2 Notifications
```
Add a bell icon in the top bar next to "Acting as", with an unread count dot.
Dropdown list of notifications, newest first. Types:
- "Your buddy {name} posted a task: {title}" (when a buddy or followed member creates a task)
- "{lead} asked you personally: {task}" (personal ask)
- "Your task {title} was approved: +{xp} XP"
- "You earned the {badge} badge"
Click marks as read and opens the task. Mascot Jay appears in the empty state: "All quiet. Go do one small thing."
Store in a notifications table (member_id, type, payload, read_at, created_at).
```

### P3 Projects + gallery
```
Add a "Projects" page in the left nav (icon: FolderKanban), after Home.
- Grid of project cards with a large cover image (cover_url), name, chapter, lead avatar, progress bar (done / total tasks), member avatars stack, status pill (Active / Closed).
- Filters: Chapter, Country, Status, Category.
- Project page: cover image header, description, lead, team members, task list grouped by status (Open / In progress / Review / Done) with time tag + XP, and a "Join" button.
- If the project is Closed: show a "Gallery" section with a masonry grid of photos (project_photos), click to open a lightbox with caption. Show total XP earned and members who took part.
- Task cards elsewhere in the app link to their project.
Use Unsplash photo URLs for seed covers and gallery photos.
```

### P4 Network view
```
Add a "Network" page in the left nav (icon: Share2).
A force-directed graph (use d3-force) of the community:
- Nodes: members (circles, size = XP, color = chapter), senators (yellow diamonds), projects (squares with project cover thumbnail).
- Links: buddy pairs (thick teal), senator mentors (dashed yellow), member works on project (thin light line), friends/follows (thin dotted).
- Filter chips above: Chapter, Country, link types (Buddies / Mentors / Projects / Friends).
- Drag nodes. Hover shows name. Click a node: side panel with details (points, buddy, mentor, projects) and dims everything not connected to it.
- Dark navy background (#0A0818), teal #57BCBC, yellow #EFC40F.
```
Reference implementation: concept page network section (Matīss can share the d3 code).

### P5 Badge icons
```
Replace badge placeholders with lucide-react icons inside the hexagon. Earned = colored (teal or yellow fill), not earned = grey outline with a lock overlay and progress text ("2 of 3").
Delegator: Share2 · Spark: Zap · Connector: Link · Recruiter: UserPlus · Closer: Handshake · Rescuer: LifeBuoy · Quality Gate: ShieldCheck · Bridge: ArrowLeftRight · Host: CalendarCheck · Mentor: GraduationCap · Handover Hero: ScrollText · Streak: Flame.
When a badge is earned, show a short pop animation and Jay says "New badge: {name}!".
```

## Demo order (suggested)
Home (one task) → Accept → lead approves → Me (badge pops) → Projects (gallery) → Network (wow) → Ranks.
