import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/hooks/use-me";
import { Mascot } from "@/components/Mascot";
import { ActingAsPicker } from "@/components/ActingAsPicker";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { toast } from "@/components/ui/toast";
import { LoadingBlock } from "@/components/StateViews";
import { CalendarField, CategoriesPicker, InterestsPicker, SkillsPicker, TimePicker, WeeklyPicker } from "@/components/profile/fields";
import { getBuddies, insertMember, updateMember, type TimeTag } from "@/lib/db";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => pageHead("Welcome to Jaybird", "Tell Jay what you are good at and how much time you have."),
  component: Onboarding,
});

const COLORS = ["#0097D7", "#1F4789", "#57BCBC", "#130F2D"];
const STEPS = ["Who are you?", "What are you good at?", "What do you enjoy doing?", "How much time can you give?"];

function Onboarding() {
  const { me, chapters, setMeId, members } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const buddies = useQuery({ queryKey: ["buddies"], queryFn: getBuddies });
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [f, setF] = useState({ name: "", chapter_id: 0, skills: [] as string[], liked: [] as string[], interests: [] as string[], time: null as TimeTag | null, weekly: null as number | null, ics: "" });

  useEffect(() => {
    if (!me) return;
    setF({ name: me.name.includes("(demo)") ? "" : me.name, chapter_id: me.chapter_id, skills: me.skills ?? [], liked: me.liked_categories ?? [], interests: me.interests ?? [], time: me.available_time, weekly: me.weekly_minutes, ics: me.calendar_ics_url ?? "" });
    setStep(0);
    setFinished(false);
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateMember>[1]) => updateMember(me!.id, patch),
    onError: (e: Error) => toast.error("Couldn't save that", e.message),
  });
  const create = useMutation({
    mutationFn: () => insertMember({ name: "New member", chapter_id: me?.chapter_id ?? chapters[0]!.id, is_new: true, onboarded: false, avatar_color: COLORS[members.length % COLORS.length]!, skills: [], interests: [], liked_categories: [] }),
    onSuccess: async (m) => { await qc.invalidateQueries({ queryKey: ["members"] }); setMeId(m.id); toast.success("Welcome aboard!"); },
    onError: (e: Error) => toast.error("Couldn't create a member", e.message),
  });

  if (!me) return <div className="p-4"><LoadingBlock /></div>;

  const canNext = [f.name.trim().length > 1 && !!f.chapter_id, f.skills.length >= 1 && f.skills.length <= 5, true, !!f.time && !!f.weekly][step];

  async function next() {
    try {
      if (step === 0) await save.mutateAsync({ name: f.name.trim(), chapter_id: f.chapter_id });
      if (step === 1) await save.mutateAsync({ skills: f.skills });
      if (step === 2) await save.mutateAsync({ liked_categories: f.liked, interests: f.interests });
      if (step === 3) {
        await save.mutateAsync({ available_time: f.time, weekly_minutes: f.weekly, calendar_ics_url: f.ics.trim() || null, onboarded: true });
        await qc.invalidateQueries({ queryKey: ["members"] });
        setFinished(true);
        return;
      }
      setStep(step + 1);
    } catch { /* toast already shown */ }
  }

  const buddyId = buddies.data?.find((b) => b.new_member_id === me.id)?.buddy_id;
  const buddy = members.find((m) => m.id === buddyId);

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-8 pt-4">
      <header className="mb-6 flex items-center justify-between gap-3">
        <img src="/jci-logo.png" alt="JCI" className="h-8 w-auto" />
        <ActingAsPicker />
      </header>

      {finished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <Mascot mood="cheer" size={120} />
          <h1 className="text-title">You're in.</h1>
          <p className="text-subtitle text-muted-foreground">Jaybird will suggest one thing at a time.</p>
          {buddy && <p className="rounded-xl bg-jci-teal-25 px-4 py-3">Your buddy is <span className="font-semibold">{buddy.name}</span>, say hi.</p>}
          <PrimaryButton block onClick={() => void navigate({ to: "/" })}>Show me my first task</PrimaryButton>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-center gap-2" aria-label={`Step ${step + 1} of 4`}>
            {STEPS.map((_, i) => <span key={i} className={cn("h-2 rounded-full transition-all", i === step ? "w-6 bg-jci-blue" : i < step ? "w-2 bg-jci-blue" : "w-2 bg-border")} />)}
          </div>
          <Mascot mood="idle" size={56} message={["Hi! I'm Jay. Let's set you up.", "Pick up to 5. Be generous!", "Pick anything that sounds fun.", "Small is great. 15 minutes counts!"][step]} />
          <h1 className="text-title mb-5 mt-5">{STEPS[step]}</h1>

          <div className="flex flex-1 flex-col gap-5 animate-in fade-in" key={step}>
            {step === 0 && (
              <>
                <label className="flex flex-col gap-2">Full name
                  <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Anna Liepiņa" autoComplete="name"
                    className="min-h-12 rounded-xl border border-border px-3 focus:border-jci-blue focus:outline-none" />
                </label>
                <label className="flex flex-col gap-2">Chapter
                  <select value={f.chapter_id} onChange={(e) => setF({ ...f, chapter_id: Number(e.target.value) })}
                    className="min-h-12 rounded-xl border border-border bg-jci-white px-3 focus:border-jci-blue focus:outline-none">
                    {chapters.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.country}</option>)}
                  </select>
                </label>
                <button className="self-start text-sm text-jci-blue" disabled={create.isPending} onClick={() => create.mutate()}>Not you? Create new member</button>
              </>
            )}
            {step === 1 && (
              <>
                <SkillsPicker value={f.skills} onChange={(skills) => setF({ ...f, skills })} />
                <p className="text-sm text-muted-foreground">{f.skills.length}/5 picked</p>
              </>
            )}
            {step === 2 && (
              <>
                <CategoriesPicker withBlurb value={f.liked} onChange={(liked) => setF({ ...f, liked })} />
                <h2 className="text-subheading">What are you into?</h2>
                <InterestsPicker value={f.interests} onChange={(interests) => setF({ ...f, interests })} />
              </>
            )}
            {step === 3 && (
              <>
                <div className="flex flex-col gap-2"><span>Usually, one go:</span><TimePicker value={f.time} onChange={(time) => setF({ ...f, time })} /></div>
                <div className="flex flex-col gap-2"><span>Per week:</span><WeeklyPicker value={f.weekly} onChange={(weekly) => setF({ ...f, weekly })} /></div>
                <CalendarField value={f.ics} onChange={(ics) => setF({ ...f, ics })} />
              </>
            )}
          </div>

          <div className="mt-8 flex gap-3">
            {step > 0 && <SecondaryButton className="flex-1" onClick={() => setStep(step - 1)}>Back</SecondaryButton>}
            <PrimaryButton className="flex-[2]" disabled={!canNext || save.isPending} onClick={next}>{step === 3 ? "Finish" : "Next"}</PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
