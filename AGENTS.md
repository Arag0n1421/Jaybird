<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Jaybird architecture
- Data access goes only through `src/lib/db.ts` (typed getters, allowed writes, RPCs, edge functions) using the fixed client in `src/lib/supabase.ts`; the backend is an existing external project, so never enable Cloud or change schema.
- The acting member comes from `MeProvider`/`useMe()` mounted in `__root.tsx`; `RealtimeSync` there invalidates React Query caches on realtime changes, so screens just use queries.
- The app shell wraps every route in `__root.tsx` except paths in `FULL_SCREEN` (/pitch, /mascot, /onboarding).
- Jaybird UI primitives live in `src/components/ui` as kebab-case files (card, chip, primary-button, member-avatar, …) beside the shadcn ones; `/_kit` (file `[_]kit.tsx`) showcases them.
- `src/components/Mascot.tsx` must stay self-contained (react only) with props mood/message/size so it can be swapped.
- Community reads/RPC wrappers live at the end of `src/lib/db.ts`; shared query options, tier colors and helpers in `src/lib/community.ts` so every screen shares cache keys that `RealtimeSync` invalidates.
- Member-scoped realtime (notifications, supporter_interests) is filtered by the acting member and resubscribes on switch.
- Language switch (`use-lang`) translates navigation only; nav lives in `AppShell` (desktop sidebar, mobile 4 tabs + More sheet).
