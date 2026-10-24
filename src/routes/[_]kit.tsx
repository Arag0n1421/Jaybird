import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { XpBadge } from "@/components/ui/xp-badge";
import { Avatar } from "@/components/ui/member-avatar";
import { LevelRing } from "@/components/ui/level-ring";
import { Stars } from "@/components/ui/stars";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Mascot } from "@/components/Mascot";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_kit")({
  head: () => pageHead("Component kit", "Every Jaybird UI component on one page."),
  component: Kit,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-subheading">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

function Kit() {
  const [rating, setRating] = useState(3);
  const [sel, setSel] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Component kit" subtitle="Dev only." />
      <div className="ripple rounded-xl p-6">
        <p className="text-subtitle">Hero ripple block</p>
      </div>
      <Section title="Type"><div><p className="text-title">Title</p><p className="text-subtitle">Subtitle</p><p className="text-subheading">Subheading</p><p className="text-body">Body text</p><p className="text-quote">“A quote”</p></div></Section>
      <Section title="Card"><Card className="w-full max-w-sm">A white card with a 1px border.</Card></Section>
      <Section title="Chip"><Chip>Default</Chip><Chip tone="blue">Blue</Chip><Chip tone="teal">Teal</Chip><Chip tone="navy">Navy</Chip><Chip selected={sel} onClick={() => setSel(!sel)}>Toggle me</Chip></Section>
      <Section title="Buttons"><PrimaryButton>Yes, I'm in</PrimaryButton><SecondaryButton>Not now</SecondaryButton></Section>
      <Section title="XpBadge"><XpBadge xp={60} /></Section>
      <Section title="Avatar"><Avatar name="Anna Liepiņa" color="#0097D7" size="sm" /><Avatar name="Mart Kask" color="#57BCBC" /><Avatar name="Inese Krūze" color="#1F4789" size="lg" /></Section>
      <Section title="LevelRing"><LevelRing level={4} progress={0.65} /></Section>
      <Section title="Stars"><Stars value={rating} onChange={setRating} /><Stars value={4} size={16} /></Section>
      <Section title="Toast"><SecondaryButton onClick={() => toast.success("Nice one!", "+60 XP is on its way.")}>Show toast</SecondaryButton></Section>
      <Section title="EmptyState"><EmptyState className="w-full" title="All caught up" message="Jay will find you something soon." mood="sleep" /></Section>
      <Section title="BottomSheet"><SecondaryButton onClick={() => setSheet(true)}>Open sheet</SecondaryButton></Section>
      <Section title="Mascot"><Mascot mood="idle" message="Hi, I'm Jay!" size={64} /><Mascot mood="cheer" size={64} /><Mascot mood="nudge" size={64} /><Mascot mood="sleep" size={64} /></Section>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="A bottom sheet"><p>Swipe-free, tap outside to close.</p></BottomSheet>
    </div>
  );
}
