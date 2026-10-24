import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";

export type Lang = "en" | "lv";
const KEY = "jaybird_lang";

/** Navigation-only translations. Full Latvian is not built yet. */
const NAV: Record<string, { en: string; lv: string }> = {
  home: { en: "Home", lv: "Sākums" },
  projects: { en: "Projects", lv: "Projekti" },
  my: { en: "My tasks", lv: "Mani uzdevumi" },
  browse: { en: "Browse", lv: "Pārlūkot" },
  people: { en: "People", lv: "Cilvēki" },
  ranks: { en: "Ranks", lv: "Reitingi" },
  network: { en: "Network", lv: "Tīkls" },
  me: { en: "Me", lv: "Es" },
  lead: { en: "Lead", lv: "Vadīt" },
  more: { en: "More", lv: "Vairāk" },
  sponsors: { en: "Sponsors", lv: "Atbalstītāji" },
  honors: { en: "Honors", lv: "Apbalvojumi" },
  notifications: { en: "Notifications", lv: "Paziņojumi" },
  language: { en: "Language", lv: "Valoda" },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setL] = useState<Lang>("en");
  useEffect(() => {
    try { if (window.localStorage.getItem(KEY) === "lv") setL("lv"); } catch { /* storage unavailable */ }
  }, []);
  const setLang = useCallback((l: Lang) => {
    setL(l);
    try { window.localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
    if (l === "lv") toast.info("Full Latvian coming soon", "Only the navigation is in Latvian for now.");
  }, []);
  const t = useCallback((k: string) => NAV[k]?.[lang] ?? k, [lang]);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside <LangProvider>");
  return c;
}
