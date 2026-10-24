# P6 Home feed prompt

for: Ahmed (Lovable). Needs `DESIGN.md` in project Knowledge first. Data: sponsors, news, kudos tables (Anton, see spec F14); seed if missing.

```
Redesign Home into an engaging feed. Keep "Your one task today" and its buttons, make the page feel alive. Follow DESIGN.md.

Top to bottom:
1. Header strip (compact): "Hi {name}", level ring, streak flame with weeks, Jay with one short line.
2. Personal asks (only if any): highlighted card "Kadri asked you personally" with task, time tag, XP, Accept / Not now.
3. Your one task today: keep current card, slightly more compact.
4. "Hot projects" : horizontal scroll of 4-6 project cards with large cover photo, name, chapter, momentum line ("+5 joined this week", "8 tasks done"), progress bar, avatar stack. Sorted by activity in the last 7 days. Click opens project.
5. "Best XP per minute": 3-5 open tasks ranked by XP ÷ minutes. Each row: title, project, time tag, XP, and a yellow pill "2.7 XP/min". Button "Take it".
6. "Our supporters": 2-3 cards with logo and a type label: Sponsor / Supporting member / Partner (e.g. BNI). Each shows what they need or offer ("Volunteers for our run, 12 Nov", "BNI breakfast: 2 guest seats for members"), reward if any ("EUR 200 to the prize pool" or "+150 XP"), button "I'm in". Below: a thin logo strip "Partners: BNI, ...".
7. "Chapter news": Strava-style feed. Items: "{name} earned the Spark badge", "{project} closed: 24 photos" (with 3 photo thumbnails), "Welcome {new member}, buddy: {name}", "{name} passed {name} on the chapter board". Each item has a kudos button (clap icon + count) and time ago.
8. Bottom nudge card: "30 XP to pass Laura. One 15-min task does it." with button.

Layout: desktop = main column (sections 2-5, 7) + right rail (section 6 sponsors, section 8 nudge, mini leaderboard top 5). Mobile = single column in the order above.
Animations: cards stagger in on load, kudos button pops on click, XP pill shimmer once on enter.
```

# P7 Peer badges by career tier

```
Add peer badges: members give badges to each other. Follow DESIGN.md.
Tiers (giver's level/role decides what they can give, limited per season):
- Bronze (level 3+): "Thanks for the help", "Team player". 5 per season. +20 XP to receiver.
- Silver (level 6+ or project lead with a closed project): "Problem solver", "Leader in action". 3 per season. +60 XP.
- Gold (local board or local president): "Outstanding contribution". 2 per season. +150 XP.
- Platinum (senator or national board): "Senator's choice". 1 per season. +300 XP.
UI:
1. On any member profile: button "Give a badge". Opens a sheet showing the badges the viewer can give, locked ones greyed with "Unlocks at level 6", and "badges left this season".
2. Pick badge, write a short note (required, max 140 chars), send. Badge flies onto the profile with a pop animation; Jay: "You made {name}'s day."
3. Receiver profile: "Recognized by" section, each badge with tier color (bronze #C08A5A, silver #B8C0CC, gold #EFC40F, platinum #57BCBC), note, giver avatar + name.
4. Me page: "Your giving power" card with current tier, next tier and what unlocks it.
Rules: cannot give to yourself; one badge per giver per receiver per season; giver gets +5 XP.
Add a notification and a chapter news item when a badge is given.
```

# P8 Language button

```
Add a language button in the top bar (globe icon + "EN"). Dropdown: English, Latviešu, plus greyed "More soon". English works. Choosing Latviešu translates the left nav labels only and shows a small toast "Full Latvian coming soon". No other changes.
```
