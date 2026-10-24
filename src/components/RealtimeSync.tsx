import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/hooks/use-realtime";
import { useMe } from "@/hooks/use-me";

/** Keeps every screen live. Member-scoped tables subscribe only for the acting member and resubscribe on switch. */
export function RealtimeSync() {
  const qc = useQueryClient();
  const { meId } = useMe();
  const refresh = () => void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "categories" && q.queryKey[0] !== "chapters" });
  const only = (...keys: string[]) => () => void qc.invalidateQueries({ predicate: (q) => keys.includes(String(q.queryKey[0])) });
  useRealtime("tasks", refresh);
  useRealtime("asks", refresh);
  useRealtime("xp_ledger", refresh);
  useRealtime("member_badges", refresh);
  useRealtime("feedback", refresh);
  useRealtime("sponsor_pledges", refresh);
  useRealtime("notifications", only("notifications"), meId ? `member_id=eq.${meId}` : null);
  useRealtime("supporter_interests", only("supporter_interests"), meId ? `member_id=eq.${meId}` : null);
  useRealtime("peer_badges", only("peer_badges", "allowance", "xp_ledger", "member_stats", "leaderboard", "news"));
  useRealtime("follows", only("follows"));
  useRealtime("kudos", only("kudos"));
  useRealtime("news", only("news"));
  useRealtime("project_members", only("project_members", "project_stats"));
  return null;
}
