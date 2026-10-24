import { useQueries, useQuery } from "@tanstack/react-query";
import { useMe } from "./use-me";
import { q } from "@/lib/queries";
import { canReview } from "@/lib/db";

/** Projects I can manage: ones I lead, plus all chapter projects for board/president. */
export function useLeadProjects() {
  const { me } = useMe();
  const projects = useQuery(q.projects());
  const list = (projects.data ?? []).filter(
    (p) => me && (p.lead_id === me.id || ((me.role === "board" || me.role === "president") && p.chapter_id === me.chapter_id)),
  );
  return { ...projects, data: list };
}

/** Tasks in review that I'm allowed to review, oldest submission first. */
export function useReviewQueue() {
  const { me } = useMe();
  const tasks = useQuery(q.tasks());
  const inReview = (tasks.data ?? []).filter((t) => t.status === "review");
  const checks = useQueries({
    queries: inReview.map((t) => ({
      queryKey: ["can_review", me?.id, t.id],
      queryFn: () => canReview(me!.id, t.id),
      enabled: !!me,
      staleTime: 60_000,
    })),
  });
  const data = inReview
    .filter((_, i) => checks[i]?.data === true)
    .sort((a, b) => (a.submitted_at ?? "").localeCompare(b.submitted_at ?? ""));
  return { data, isLoading: tasks.isLoading || checks.some((c) => c.isLoading), error: tasks.error, refetch: tasks.refetch };
}
