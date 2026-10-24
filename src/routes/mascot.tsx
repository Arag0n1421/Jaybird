import { createFileRoute } from "@tanstack/react-router";
import { Mascot } from "@/components/Mascot";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/mascot")({
  head: () => pageHead("Meet Jay", "Jay the jay bird, Jaybird's mascot, in all four moods."),
  component: MascotPage,
});

const MOODS = [
  { mood: "idle", label: "Idle", msg: "Hi! I found one task for you." },
  { mood: "cheer", label: "Cheer", msg: "You did it! +60 XP 🎉" },
  { mood: "nudge", label: "Nudge", msg: "Roberts is waiting for your answer." },
  { mood: "sleep", label: "Sleep", msg: "Nothing right now. Enjoy the break." },
] as const;

function MascotPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10">
      <h1 className="text-title text-center">Meet Jay</h1>
      <p className="mt-2 text-center text-muted-foreground">Cheers, nudges, never nags.</p>
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {MOODS.map((m) => (
          <div key={m.mood} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-jci-white p-6">
            <Mascot mood={m.mood} message={m.msg} size={140} />
            <span className="text-sm text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
