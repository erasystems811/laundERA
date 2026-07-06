export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCommsSession, findCommsSession, reconnectCommsSession, toE164Nigeria } from "@/lib/comms";
import { ensureRelay } from "@/lib/whatsapp-relay";

// Start (or resume) connecting this laundry's own WhatsApp number.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staff } = await supabase
    .from("staff")
    .select("business_id, businesses(comms_session_id)")
    .eq("id", user.id)
    .single();
  const businessId = staff?.business_id as string | undefined;
  if (!businessId) return NextResponse.json({ error: "No business" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { phoneNumber?: string };
  const to = toE164Nigeria(body.phoneNumber || "");
  if (!to) return NextResponse.json({ error: "Enter a valid WhatsApp number" }, { status: 400 });

  const admin = createAdminClient();
  let sessionId = (staff!.businesses as unknown as { comms_session_id: string | null })?.comms_session_id ?? null;
  try {
    if (!sessionId) {
      try {
        sessionId = await createCommsSession(to);
      } catch (createErr) {
        // Number already has a session (from a prior connect) — reuse it and restart it.
        const existing = await findCommsSession(to);
        if (!existing) throw createErr;
        sessionId = existing;
        await reconnectCommsSession(existing);
      }
    } else {
      // Resuming an existing session — nudge it to emit a fresh QR.
      await reconnectCommsSession(sessionId);
    }
    await admin
      .from("businesses")
      .update({ comms_session_id: sessionId, comms_number: to, comms_connected: false })
      .eq("id", businessId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  ensureRelay(sessionId, businessId);
  return NextResponse.json({ sessionId });
}
