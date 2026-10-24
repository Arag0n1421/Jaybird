import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/lib/db";
import { useMe } from "./use-me";

export const projectsQuery = { queryKey: ["projects"], queryFn: getProjects };

/** Lead = leads a project, or has role board/president. */
export function useIsLead(): boolean {
  const { me } = useMe();
  const projects = useQuery(projectsQuery);
  if (!me) return false;
  if (me.role === "board" || me.role === "president") return true;
  return (projects.data ?? []).some((p) => p.lead_id === me.id);
}
