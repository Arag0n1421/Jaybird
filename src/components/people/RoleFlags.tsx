import type { Member } from "@/lib/db";
import { Chip } from "@/components/ui/chip";

/** Role and separate flags (senator, new, national board). */
export function RoleFlags({ m }: { m: Member }) {
  const flags: string[] = [];
  if (m.role === "president") flags.push("President");
  if (m.role === "board") flags.push("Board");
  if (m.is_senator) flags.push("Senator");
  if (m.is_national_board) flags.push("National board");
  if (m.is_new) flags.push("New member");
  if (flags.length === 0) return null;
  return <div className="flex flex-wrap gap-1">{flags.map((f) => <Chip key={f} tone={f === "Senator" ? "navy" : "default"} className="py-0 text-xs">{f}</Chip>)}</div>;
}
