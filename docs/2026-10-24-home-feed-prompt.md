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
6. "Sponsors looking for help": 2-3 sponsor cards with logo, what they need ("Volunteers for our run, 12 Nov"), reward ("EUR 200 to the prize pool" or "+150 XP"), button "I'm in".
7. "Chapter news": Strava-style feed. Items: "{name} earned the Spark badge", "{project} closed: 24 photos" (with 3 photo thumbnails), "Welcome {new member}, buddy: {name}", "{name} passed {name} on the chapter board". Each item has a kudos button (clap icon + count) and time ago.
8. Bottom nudge card: "30 XP to pass Laura. One 15-min task does it." with button.

Layout: desktop = main column (sections 2-5, 7) + right rail (section 6 sponsors, section 8 nudge, mini leaderboard top 5). Mobile = single column in the order above.
Animations: cards stagger in on load, kudos button pops on click, XP pill shimmer once on enter.
```
