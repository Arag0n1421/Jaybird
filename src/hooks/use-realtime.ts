import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export type RealtimeTable =
  | "tasks" | "asks" | "xp_ledger" | "member_badges" | "feedback" | "sponsor_pledges"
  | "notifications" | "peer_badges" | "follows" | "kudos" | "news" | "project_members" | "supporter_interests";

let channelSeq = 0;

/** Subscribes to changes on a table (optionally filtered, e.g. "member_id=eq.3"); unsubscribes on unmount/change. */
export function useRealtime(table: RealtimeTable, onChange: (payload: unknown) => void, filter?: string | null) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (filter === null) return;
    const opts = filter ? { event: "*" as const, schema: "public", table, filter } : { event: "*" as const, schema: "public", table };
    const channel = supabase
      .channel(`rt-${table}-${++channelSeq}`)
      .on("postgres_changes", opts, (payload) => cb.current(payload))
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
