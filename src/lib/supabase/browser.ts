import { createBrowserClient } from "@supabase/ssr";

/** Browser client for Supabase Auth (sign in/up/out, session state). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
