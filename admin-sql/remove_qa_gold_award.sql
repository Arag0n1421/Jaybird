-- ============================================================================
-- Remove the accidental Gold QA award (peer_badges.id = 6) and its effects
-- STATUS: NOT APPLIED. Nothing here has run. Needs an owner / service-role
--         connection — the app's publishable key is refused with
--         "permission denied for table peer_badges" on UPDATE/DELETE.
--
-- Verified against the live database on 2026-10-24 with the app's own read
-- access. These are the exact rows, quoted verbatim from the server:
--
--   peer_badges   id=6  giver_id=16  receiver_id=2  badge_id=20  tier=gold
--                 season=2026  note='locked tier (QA)'
--                 created_at=2026-10-24T14:01:34.275098+00:00
--   xp_ledger     id=146 member_id=2  xp=150 reason=peer_badge_received
--   xp_ledger     id=147 member_id=16 xp=5   reason=peer_badge_given
--                 (both peer_badge_id=6, same created_at)
--   news          id=19  chapter_id=1 type=peer_badge member_id=2
--                 text='Jānis Ozols recognized Roberts Ozoliņš with Outstanding
--                       contribution: locked tier (QA)'
--                 event_key='peer_badge:6'
--   notification  id=16  member_id=2 type=peer_badge_received
--                 event_key='peer_badge:6' read_at=null
--   kudos on news 19: none (checked — the query returned an empty list)
--
-- BACKUP (keep this file; these are the rows about to be deleted, in full):
--
--   INSERT INTO public.peer_badges (id, giver_id, receiver_id, badge_id, note, tier, season, created_at)
--        VALUES (6, 16, 2, 20, 'locked tier (QA)', 'gold', 2026,
--                '2026-10-24T14:01:34.275098+00:00');
--   INSERT INTO public.xp_ledger (id, member_id, task_id, xp, reason, season, created_at, peer_badge_id)
--        VALUES (146, 2, NULL, 150, 'peer_badge_received', 2026,
--                '2026-10-24T14:01:34.275098+00:00', 6);
--   INSERT INTO public.xp_ledger (id, member_id, task_id, xp, reason, season, created_at, peer_badge_id)
--        VALUES (147, 16, NULL, 5, 'peer_badge_given', 2026,
--                '2026-10-24T14:01:34.275098+00:00', 6);
--   INSERT INTO public.news (id, chapter_id, type, member_id, project_id, text, image_urls, event_key, created_at)
--        VALUES (19, 1, 'peer_badge', 2, NULL,
--                'Jānis Ozols recognized Roberts Ozoliņš with Outstanding contribution: locked tier (QA)',
--                '{}', 'peer_badge:6', '2026-10-24T14:01:34.275098+00:00');
--   INSERT INTO public.notifications (id, member_id, type, payload, event_key, read_at, created_at)
--        VALUES (16, 2, 'peer_badge_received',
--                '{"xp": 150, "note": "locked tier (QA)", "tier": "gold", "season": 2026,
--                  "badge_id": 20, "giver_id": 16, "badge_name": "Outstanding contribution",
--                  "receiver_id": 2, "peer_badge_id": 6}',
--                'peer_badge:6', NULL, '2026-10-24T14:01:34.275098+00:00');
--
-- XP totals before this runs (sum of xp_ledger per member, read live):
--   member 2  = 2025   member 16 = 70
-- After: member 2 = 1875 (-150), member 16 = 65 (-5). Levels and ranks are
-- computed from the ledger, so nothing is decremented by hand.
-- ============================================================================

BEGIN;

-- 1. Abort unless the live row still matches the fingerprint above exactly.
DO $$
DECLARE
  r public.peer_badges%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.peer_badges WHERE id = 6;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ABORT: peer_badges.id=6 is not there any more.';
  END IF;
  IF r.giver_id <> 16 OR r.receiver_id <> 2 OR r.badge_id <> 20
     OR r.tier <> 'gold' OR r.season <> 2026
     OR r.note <> 'locked tier (QA)'
     OR r.created_at <> '2026-10-24T14:01:34.275098+00:00'::timestamptz
  THEN
    RAISE EXCEPTION 'ABORT: peer_badges.id=6 does not match the recorded fingerprint.';
  END IF;
END
$$;

-- 2. Abort if anything new has piled onto the news row since the backup above.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.kudos WHERE news_id = 19;
  IF n <> 0 THEN
    RAISE EXCEPTION 'ABORT: news id=19 now has % kudos row(s); re-check the backup first.', n;
  END IF;
END
$$;

-- 3. Delete children first, each statement pinned to its exact id, and make the
--    transaction fail if the server did not remove exactly the rows expected.
DO $$
DECLARE
  d bigint;
BEGIN
  DELETE FROM public.notifications WHERE id = 16 AND member_id = 2 AND event_key = 'peer_badge:6';
  GET DIAGNOSTICS d = ROW_COUNT;
  IF d <> 1 THEN RAISE EXCEPTION 'ABORT: notification delete removed % rows, expected 1.', d; END IF;

  DELETE FROM public.news WHERE id = 19 AND event_key = 'peer_badge:6';
  GET DIAGNOSTICS d = ROW_COUNT;
  IF d <> 1 THEN RAISE EXCEPTION 'ABORT: news delete removed % rows, expected 1.', d; END IF;

  DELETE FROM public.xp_ledger WHERE id IN (146, 147) AND peer_badge_id = 6;
  GET DIAGNOSTICS d = ROW_COUNT;
  IF d <> 2 THEN RAISE EXCEPTION 'ABORT: ledger delete removed % rows, expected 2.', d; END IF;

  DELETE FROM public.peer_badges WHERE id = 6 AND giver_id = 16 AND receiver_id = 2 AND badge_id = 20;
  GET DIAGNOSTICS d = ROW_COUNT;
  IF d <> 1 THEN RAISE EXCEPTION 'ABORT: award delete removed % rows, expected 1.', d; END IF;
END
$$;

-- 4. Nothing else in the database may still point at that award.
DO $$
DECLARE
  n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.xp_ledger WHERE peer_badge_id = 6;
  IF n <> 0 THEN RAISE EXCEPTION 'ABORT: % ledger rows still reference the award.', n; END IF;
  SELECT count(*) INTO n FROM public.news WHERE event_key = 'peer_badge:6';
  IF n <> 0 THEN RAISE EXCEPTION 'ABORT: % news rows still reference the award.', n; END IF;
  SELECT count(*) INTO n FROM public.notifications WHERE event_key = 'peer_badge:6';
  IF n <> 0 THEN RAISE EXCEPTION 'ABORT: % notifications still reference the award.', n; END IF;
END
$$;

COMMIT;

-- ============================================================================
-- After it runs, confirm from the app's own read access:
--
--   SELECT member_id, sum(xp) FROM public.xp_ledger
--    WHERE member_id IN (2, 16) GROUP BY member_id;        -- 1875 and 65
--
--   SELECT count(*) FROM public.peer_badges;                -- 4 (ids 1,2,3,7)
--
--   SELECT * FROM public.peer_badge_allowance(16, 2026);    -- Gold back to 2 left
--
-- Bronze award id=7 ('[demo QA] Clear poster draft, thanks!') and tasks 22/23
-- are deliberately left alone.
--
-- If a history-protection trigger blocks the xp_ledger delete: stop and leave
-- the transaction rolled back. Do not disable the trigger to force it through.
-- ============================================================================
