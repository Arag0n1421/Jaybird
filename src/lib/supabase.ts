import { createClient } from "@supabase/supabase-js";

// Public (publishable) client key for the existing Jaybird backend — safe in code.
export const supabase = createClient(
  "https://nonsdrjyannjnejaonnq.supabase.co",
  "sb_publishable_TwABP9coVdneETdFm6aRYQ_84nNWgEh",
  { auth: { persistSession: false, autoRefreshToken: false } },
);
