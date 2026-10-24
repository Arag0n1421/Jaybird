import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/ui/member-avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

const roleLabel = { member: "Member", board: "Board", president: "President" } as const;

export function ActingAsPicker() {
  const { me, members, chapters, setMeId, isLoading, error } = useMe();
  const [open, setOpen] = useState(false);
  const chapterName = (id: number) => chapters.find((c) => c.id === id)?.name ?? "";

  if (error) return <span className="text-sm text-destructive">Couldn't load members</span>;
  if (isLoading || !me) return <span className="h-10 w-32 animate-pulse rounded-full bg-surface" aria-label="Loading members" />;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 hover:border-jci-blue"
        aria-label={`Acting as ${me.name}. Change member`}
      >
        <Avatar name={me.name} color={me.avatar_color} size="sm" />
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[11px] text-muted-foreground">Acting as</span>
          <span className="block max-w-[6.5rem] sm:max-w-[9rem] truncate text-sm font-medium">{me.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-jci-blue" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Act as…">
        <ul className="flex flex-col gap-1" data-testid="acting-as-list">
          {members.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  setMeId(m.id);
                  setOpen(false);
                }}
                className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface", m.id === me.id && "bg-surface")}
              >
                <Avatar name={m.name} color={m.avatar_color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {chapterName(m.chapter_id)} · {roleLabel[m.role]}
                    {!m.onboarded && " · new"}
                  </span>
                </span>
                {m.id === me.id && <Check className="h-5 w-5 text-jci-blue" />}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
