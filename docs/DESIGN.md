# Jaybird DESIGN.md

Paste this into every Lovable project: Project settings > Knowledge. Owner: Julija (edit freely).

## Brand
- Colors: navy #0A0818 (text, dark surfaces), teal #57BCBC (primary, links, progress), yellow #EFC40F (XP, rewards, main call to action only), white/off-white surfaces. Coral #FF7A6B only for warnings.
- Font: Plus Jakarta Sans. Weights: 400 body, 700 headings, 800 big numbers. Numbers (XP, ranks, counts) use tabular figures.
- Mascot: Jay (teal jay, yellow crest). Appears in empty states, celebrations and nudges. Max one Jay per screen.

## Rules (anti-"AI look")
1. Real photos over illustrations: project covers, galleries, member avatars. No stock 3D blobs.
2. Hierarchy, not equal cards: one large hero block per screen, the rest smaller (bento layout). Never a grid of identical cards as the whole page.
3. Yellow is earned: only XP, rewards and the single main button. Teal for everything interactive.
4. No purple/blue gradients, no glassmorphism, no glow shadows. Flat surfaces, 1px borders, radius 12px cards / 999px chips.
5. Icons: lucide-react only, 20px, stroke 1.75. No emojis as UI icons (emojis OK in user text and news).
6. Spacing on an 8px grid. Generous whitespace above section titles.
7. Copy in Jay's voice: short, warm, direct. "Two tasks fit you today." Never "Welcome to your dashboard".
8. Motion with purpose (Motion library, motion.dev): spring on XP gain, badge pop, rank change, card enter (stagger 40ms). Nothing loops except Jay idle bob. Respect prefers-reduced-motion.
9. Every number has context: "+40 XP", "#4 in Riga", "30 XP to pass Laura", not bare numbers.
10. Empty states always: Jay + one sentence + one button.

## Inspiration (look, don't copy)
- Duolingo: mascot, streaks, celebration moments.
- Strava: social feed with kudos, club leaderboards, segment-style ranks.
- Product Hunt: "hot today" list with momentum.
- Linear: clean type, calm density.
References: refero.design (design-system gallery), inspora.design (inspiration feed).
Design-quality prompt kits (from our intel): github.com/pbakaus/impeccable, github.com/leonxlnx/taste-skill. Optional: paste their rules into Knowledge too.
