import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely — Node-only, never import this
 * from a Client Component. Every Route Handler uses this to actually read
 * and write data; authorization is enforced in code via src/lib/permissions.ts
 * against an actor id resolved from the caller's session (see auth.ts).
 */
export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
