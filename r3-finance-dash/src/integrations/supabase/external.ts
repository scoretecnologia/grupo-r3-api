// External Supabase client
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL (ou SUPABASE_URL)"] : []),
    ...(!SUPABASE_ANON_KEY
      ? ["VITE_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_PUBLISHABLE_KEY)"]
      : []),
  ];
  throw new Error(
    `Missing Supabase environment variables in external.ts: ${missing.join(
      ", ",
    )}. Configure o arquivo .env e reinicie o servidor (npm run dev).`,
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
