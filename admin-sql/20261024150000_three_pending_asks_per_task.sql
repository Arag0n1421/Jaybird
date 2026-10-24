-- ============================================================================
-- Three pending asks per task, enforced by the database
-- VERSION: 20261024150000
-- STATUS: NOT APPLIED. Nothing in this file has run against the live backend.
--         It needs an owner / service-role connection; the key the app ships
--         with is publishable (anon) and is already refused on peer_badges.
--
-- This file sits in admin-sql/ rather than supabase/migrations/ on purpose: this
-- project's database is an existing external Supabase project that Lovable does
-- not manage, so the managed migration folder is locked and no migration tool is
-- registered for it. Rename/copy it into your own migration sequence when you
-- decide to apply it.
--
-- Why a trigger instead of editing the RPCs: create_ask / ask_top_matches live in
-- the database and their bodies are not readable with the app's key. A trigger on
-- the table covers every writer at once — the RPCs, a direct insert, the automatic
-- "ask the next best match" replacement, and an update that moves a row into
-- pending or points it at a different task — without touching those RPCs, so their
-- names, parameter lists and return types stay exactly as the app calls them.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_ask_pending_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pending integer;
BEGIN
  -- A row that is not pending takes no slot: declining, accepting, cancelling.
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  -- Serialize every writer competing for a slot on this task. The lock is held to
  -- the end of the transaction, so two inserts asking for the same task cannot
  -- both read "2 pending" and both commit. Transactions on different tasks never
  -- block each other.
  PERFORM pg_advisory_xact_lock(NEW.task_id);

  SELECT count(*)
    INTO v_pending
    FROM public.asks a
   WHERE a.task_id = NEW.task_id
     AND a.status = 'pending'
     AND a.id IS DISTINCT FROM NEW.id;

  IF v_pending >= 3 THEN
    RAISE EXCEPTION 'Already 3 people waiting to answer. Wait for a reply first.'
      USING ERRCODE = 'check_violation',
            HINT = 'Wait for an answer, or cancel one of the open asks.';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_ask_pending_limit() IS
  'Rejects an ask that would put a fourth pending request on one task.';

DROP TRIGGER IF EXISTS asks_guard_pending_limit ON public.asks;
CREATE TRIGGER asks_guard_pending_limit
  BEFORE INSERT OR UPDATE ON public.asks
  FOR EACH ROW EXECUTE FUNCTION public.guard_ask_pending_limit();

COMMIT;

-- ============================================================================
-- How to prove it works (do this on a copy, or with a task you are willing to
-- use up). Start from a task with exactly two pending asks, then run two
-- independent sessions at the same time:
--
--   -- session A and session B, both started together:
--   BEGIN;
--   SELECT public.create_ask(<task>, <member_a>, <lead>);   -- session B: <member_b>
--   -- one session must return an ask id, the other must fail with
--   -- "Already 3 people waiting to answer."
--   COMMIT;
--
--   SELECT count(*) FROM public.asks
--    WHERE task_id = <task> AND status = 'pending';         -- must be exactly 3
--
-- Then confirm the same rule holds for a write that does not go through the RPC:
--
--   INSERT INTO public.asks (task_id, member_id, asked_by, status)
--        VALUES (<task>, <member_c>, <lead>, 'pending');    -- must be refused
--
-- And that declining still opens a slot and still lets the server ask the next
-- best match:
--
--   SELECT public.answer_ask(<ask_id>, 'declined', 'not_now');   -- true
--   SELECT count(*) FROM public.asks
--    WHERE task_id = <task> AND status = 'pending';              -- back to 3 at most
--
-- Notes for whoever applies this
--
-- 1. Automatic replacement ask. After a decline the server asks the next best
--    match. That insert normally lands on a task with 2 pending asks, so it
--    passes. In a race it could hit the new limit; if the replacement-ask call
--    inside the decline path is not already wrapped in its own exception
--    handler, that handler should swallow this specific check_violation so a
--    decline never rolls back because the next match could not be asked.
--
-- 2. Duplicate-recipient and task-eligibility checks are untouched — this only
--    adds the count rule.
--
-- 3. Applying it changes no existing row. If a task already sits above the limit,
--    new asks for that task are refused until it drops back under it; nothing
--    already recorded is edited.
-- ============================================================================
