import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@/components/ui/chip";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { calendarFree, getInterests, getSkills, type TimeTag } from "@/lib/db";
import { useCategories } from "@/lib/categories";
import { TIME_CHIPS } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const WEEKLY = [
  { label: "30 min", minutes: 45 },
  { label: "1 h", minutes: 60 },
  { label: "2 h", minutes: 120 },
  { label: "4 h", minutes: 240 },
];

function toggle(list: string[], key: string, max = Infinity) {
  return list.includes(key) ? list.filter((k) => k !== key) : list.length < max ? [...list, key] : list;
}

export function SkillsPicker({ value, onChange, max = 5 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const skills = useQuery({ queryKey: ["skills"], queryFn: getSkills, staleTime: Infinity });
  if (skills.isLoading) return <div className="h-24 animate-pulse rounded-xl bg-surface" />;
  return (
    <div className="flex flex-wrap gap-2">
      {(skills.data ?? []).map((s) => <Chip key={s.key} selected={value.includes(s.key)} onClick={() => onChange(toggle(value, s.key, max))}>{s.label}</Chip>)}
    </div>
  );
}

export function InterestsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const items = useQuery({ queryKey: ["interests"], queryFn: getInterests, staleTime: Infinity });
  return (
    <div className="flex flex-wrap gap-2">
      {(items.data ?? []).map((s) => <Chip key={s.key} selected={value.includes(s.key)} onClick={() => onChange(toggle(value, s.key))}>{s.label}</Chip>)}
    </div>
  );
}

export function CategoriesPicker({ value, onChange, withBlurb = false }: { value: string[]; onChange: (v: string[]) => void; withBlurb?: boolean }) {
  const cats = useCategories();
  if (!withBlurb)
    return (
      <div className="flex flex-wrap gap-2">
        {(cats.data ?? []).map((c) => <Chip key={c.key} selected={value.includes(c.key)} onClick={() => onChange(toggle(value, c.key))}>{c.label}</Chip>)}
      </div>
    );
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {(cats.data ?? []).map((c) => {
        const on = value.includes(c.key);
        return (
          <button key={c.key} type="button" aria-pressed={on} onClick={() => onChange(toggle(value, c.key))}
            className={cn("rounded-xl border p-3 text-left transition-colors", on ? "border-jci-blue bg-jci-blue-25" : "border-border hover:border-jci-blue")}>
            <span className="block font-medium">{c.label}</span>
            {c.blurb && <span className="block text-sm text-muted-foreground">{c.blurb}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TimePicker({ value, onChange }: { value: TimeTag | null; onChange: (v: TimeTag) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIME_CHIPS.map((c) => <Chip key={c.tag} selected={value === c.tag} onClick={() => onChange(c.tag as TimeTag)}>{c.label}</Chip>)}
    </div>
  );
}

export function WeeklyPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {WEEKLY.map((w) => <Chip key={w.minutes} selected={value === w.minutes} onClick={() => onChange(w.minutes)}>{w.label}</Chip>)}
    </div>
  );
}

export function CalendarField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [state, setState] = useState<{ busy: boolean; msg: string | null; err: boolean }>({ busy: false, msg: null, err: false });
  async function test() {
    setState({ busy: true, msg: null, err: false });
    try {
      const end = new Date();
      end.setHours(22, 0, 0, 0);
      if (end <= new Date()) end.setDate(end.getDate() + 1);
      const r = await calendarFree(value.trim(), new Date().toISOString(), end.toISOString());
      setState({ busy: false, msg: `You're free for ${r.longest_free_block_minutes} min today.`, err: false });
    } catch (e) {
      setState({ busy: false, msg: e instanceof Error ? e.message : "That link didn't work. Double-check it?", err: true });
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <p>Connect your calendar so Jaybird only suggests things when you're free. <span className="text-muted-foreground">(optional)</span></p>
      <div className="flex gap-2">
        <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://calendar.google.com/…/basic.ics" aria-label="Secret iCal link"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border px-3 focus:border-jci-blue focus:outline-none" />
        <SecondaryButton className="min-h-11 px-4" disabled={!value.trim() || state.busy} onClick={test}>{state.busy ? "…" : "Test"}</SecondaryButton>
      </div>
      <p className="text-xs text-muted-foreground">Google Calendar &gt; Settings &gt; your calendar &gt; Secret address in iCal format. We only read busy times.</p>
      {state.msg && <p className={cn("text-sm", state.err ? "text-destructive" : "text-jci-navy")}>{state.msg}</p>}
    </div>
  );
}
