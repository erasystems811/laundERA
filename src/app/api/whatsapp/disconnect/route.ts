export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteCommsSession } from "@/lib/comms";
import { dropRelay } from "@/lib/whatsapp-relay";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staff } = await supabase
    .from("staff")
    .select("business_id, businesses(comms_session_id)")
    .eq("id", user.id)
    .single();
  const businessId = staff?.business_id as string | undefined;
  const sessionId = (staff?.businesses as unknown as { comms_session_id: string | null })?.comms_session_id ?? null;
  if (!businessId) return NextResponse.json({ error: "No business" }, { status: 400 });

  if (sessionId) {
    await deleteCommsSession(sessionId);
    dropRelay(sessionId);
  }
  await createAdminClient()
    .from("businesses")
    .update({ comms_session_id: null, comms_number: null, comms_connected: false })
    .eq("id", businessId);

  return NextResponse.json({ ok: true });
}
