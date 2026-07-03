import { createClient } from "@supabase/supabase-js";

// Service-role client for privileged server-only operations (e.g. storage uploads).
// Never import this into client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
