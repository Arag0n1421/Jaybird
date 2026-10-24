import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChapters, getMemberStats, getMembers, type Chapter, type Member, type MemberStats } from "@/lib/db";

const STORAGE_KEY = "jaybird_member_id";

export type Me = Member & { stats: MemberStats | null; chapter: Chapter | null };

interface MeContextValue {
  me: Me | null;
  meId: number | null;
  setMeId: (id: number) => void;
  members: Member[];
  chapters: Chapter[];
  isLoading: boolean;
  error: Error | null;
}

const MeContext = createContext<MeContextValue | null>(null);

export const membersQuery = { queryKey: ["members"], queryFn: getMembers };
export const memberStatsQuery = { queryKey: ["member_stats"], queryFn: getMemberStats };
export const chaptersQuery = { queryKey: ["chapters"], queryFn: getChapters, staleTime: Infinity };

export function MeProvider({ children }: { children: ReactNode }) {
  const members = useQuery(membersQuery);
  const stats = useQuery(memberStatsQuery);
  const chapters = useQuery(chaptersQuery);
  const [storedId, setStoredId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v) setStoredId(Number(v));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setMeId = useCallback((id: number) => {
    setStoredId(id);
    // Switch instantly, then refetch every screen for the new member.
    void queryClient.invalidateQueries();
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* storage unavailable */
    }
  }, [queryClient]);

  const value = useMemo<MeContextValue>(() => {
    const list = members.data ?? [];
    const member = list.find((m) => m.id === storedId) ?? list[0] ?? null;
    const me: Me | null = member
      ? {
          ...member,
          stats: stats.data?.find((s) => s.member_id === member.id) ?? null,
          chapter: chapters.data?.find((c) => c.id === member.chapter_id) ?? null,
        }
      : null;
    return {
      me,
      meId: me?.id ?? null,
      setMeId,
      members: list,
      chapters: chapters.data ?? [],
      isLoading: members.isLoading,
      error: (members.error as Error | null) ?? null,
    };
  }, [members.data, members.isLoading, members.error, stats.data, chapters.data, storedId, setMeId]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used inside <MeProvider>");
  return ctx;
}
