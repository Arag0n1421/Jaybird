import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { Avatar } from "@/components/ui/member-avatar";
import { BadgeIcon } from "@/components/BadgeIcon";
import { cq, TIER_COLOR, TIER_LABEL, TIER_RULE } from "@/lib/community";
import { relativeTime } from "@/lib/format";

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Earned badges with real icons. With showLocked, unearned ones show how to earn them (no invented progress). */
export function EarnedBadges({ memberId, showLocked = false }: { memberId: number; showLocked?: boolean }) {
  const badges = useQuery(cq.badges());
  const mb = useQuery(cq.memberBadges());
  if (badges.isLoading || mb.isLoading) return <div className="h-24 animate-pulse rounded-xl bg-surface" />;
  if (badges.error || mb.error) return <p className="text-sm text-muted-foreground">Couldn't load badges right now.</p>;
  const earned = new Map((mb.data ?? []).filter((x) => x.member_id === memberId).map((x) => [x.badge_id, x.earned_at]));
  const list = (badges.data ?? []).filter((b) => b.kind === "earned" && (showLocked || earned.has(b.id)));
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No badges yet. The first one comes with the first finished task.</p>;
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {list.map((b) => {
        const at = earned.get(b.id);
        return (
          <li key={b.id} className="flex flex-col items-center gap-1 text-center">
            <BadgeIcon code={b.code} icon={b.icon} earned={!!at} size={52} />
            <span className={at ? "text-xs font-bold" : "text-xs text-muted-foreground"}>{b.name}</span>
            <span className="text-[11px] leading-tight text-muted-foreground">{at ? fmt(at) : b.description}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Peer recognition received: badge, giver, note and date. */
export function Recognition({ memberId }: { memberId: number }) {
  const { members } = useMe();
  const peers = useQuery(cq.peerBadges());
  const badges = useQuery(cq.badges());
  if (peers.isLoading) return <div className="h-20 animate-pulse rounded-xl bg-surface" />;
  if (peers.error) return <p className="text-sm text-muted-foreground">Couldn't load recognition right now.</p>;
  const list = (peers.data ?? []).filter((p) => p.receiver_id === memberId);
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No peer badges yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {list.map((p) => {
        const b = badges.data?.find((x) => x.id === p.badge_id);
        const g = members.find((m) => m.id === p.giver_id);
        return (
          <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
            <BadgeIcon code={b?.code ?? ""} icon={b?.icon} tier={p.tier} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{b?.name ?? "Peer badge"} <span className="ml-1 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TIER_COLOR[p.tier] }} />{TIER_LABEL[p.tier]}</span></p>
              <p className="text-sm">“{p.note}”</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                {g && <Avatar name={g.name} color={g.avatar_color} size="sm" className="h-5 w-5 text-[9px]" />}
                {g ? <Link to="/people/$id" params={{ id: String(g.id) }} className="underline">{g.name}</Link> : "A member"} · {relativeTime(p.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** My giving power per tier, straight from peer_badge_allowance. */
export function GivingPower({ memberId }: { memberId: number }) {
  const allowance = useQuery(cq.allowance(memberId));
  if (allowance.isLoading) return <div className="h-20 animate-pulse rounded-xl bg-surface" />;
  if (allowance.error) return <p className="text-sm text-muted-foreground">Couldn't load your giving power.</p>;
  const rows = allowance.data ?? [];
  const top = [...rows].reverse().find((r) => r.eligible);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">{top ? <>You can give up to <span className="font-bold">{TIER_LABEL[top.tier]}</span> badges. Open someone's profile in People to recognize them.</> : "Reach level 3 to start giving peer badges."}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((r) => (
          <li key={r.tier} className="rounded-xl border border-border p-3" style={{ borderTopColor: TIER_COLOR[r.tier], borderTopWidth: 3 }}>
            <p className="text-sm font-bold">{TIER_LABEL[r.tier]}</p>
            {r.eligible ? <p className="text-sm"><span className="text-number">{r.remaining}</span>/{r.quota} left</p> : <p className="text-xs text-muted-foreground">{TIER_RULE[r.tier]}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
