export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestPairingCode, toE164Nigeria } from "@/lib/comms";

// Returns an 8-char pairing code for this laundry's in-progress WhatsApp session.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(comms_session_id, comms_number, whatsapp_number)")
    .eq("id", user.id)
    .single();
  const biz = staff?.businesses as unknown as { comms_session_id: string | null; comms_number: string | null; whatsapp_number: string | null } | null;
  const sessionId = biz?.comms_session_id ?? null;
  const phone = toE164Nigeria(biz?.comms_number || biz?.whatsapp_number || "");

  if (!sessionId) return NextResponse.json({ error: "Start connecting first" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "No valid number" }, { status: 400 });

  try {
    const code = await requestPairingCode(sessionId, phone);
    return NextResponse.json({ code });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
