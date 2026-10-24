# Jaybird database changes

The app uses the existing external Supabase project `nonsdrjyannjnejaonnq`.
Copying these files to GitHub does not execute SQL or deploy database changes.

| File | Recorded status on 24 October 2026 |
| --- | --- |
| `20261024131730_jaybird_community_upgrade.sql` | Applied through the Supabase SQL editor and independently verified earlier on this date. Preserved here as the applied community upgrade source; do not blindly rerun it. No Supabase CLI migration-history entry was created. |
| `20261024150000_three_pending_asks_per_task.sql` | Prepared by Lovable, not applied. The two-session concurrency test remains outstanding. |
| `remove_qa_gold_award.sql` | Prepared by Lovable, not applied. One-off cleanup for the accidental demo award; requires owner review and execution. |

The frontend and the two pending admin SQL files were exported from Lovable
project `b4ca7515-dcce-4986-bad4-441dae19a05e`, saved commit
`4f18cb2ea64b039e05ee74788fc32fe69a4853e3`. These files are source snapshots,
not evidence that the two pending database jobs have succeeded.

This folder is not a full database bootstrap or schema backup. Preserve the
existing schema, legitimate awards and task history when reviewing migrations.
