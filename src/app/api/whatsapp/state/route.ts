export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommsSessionStatus } from "@/lib/comms";
import { getRelayState, ensureRelay } from "@/lib/whatsapp-relay";

// Polled by the connect UI: returns idle | connecting (+qr) | connected.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "idle" });

  const { data: staff } = await supabase
    .from("staff")
    .select("business_id, businesses(comms_session_id, comms_number, comms_connected)")
    .eq("id", user.id)
    .single();
  const businessId = staff?.business_id as string | undefined;
  const biz = staff?.businesses as unknown as { comms_session_id: string | null; comms_number: string | null; comms_connected: boolean } | null;
  const sessionId = biz?.comms_session_id ?? null;

  if (!businessId || !sessionId) return NextResponse.json({ status: "idle" });
  if (biz?.comms_connected) return NextResponse.json({ status: "connected", number: biz.comms_number });

  // Keep the relay alive (self-heal after a server restart).
  if (!getRelayState(sessionId)) ensureRelay(sessionId, businessId);

  // REST backstop for the connected transition (webhooks aren't wired in Comms).
  try {
    if ((await getCommsSessionStatus(sessionId)) === "connected") {
      await createAdminClient().from("businesses").update({ comms_connected: true }).eq("id", businessId);
      return NextResponse.json({ status: "connected", number: biz?.comms_number });
    }
  } catch {}

  const r = getRelayState(sessionId);
  if (r?.connected) return NextResponse.json({ status: "connected", number: biz?.comms_number });
  return NextResponse.json({ status: "connecting", qr: r?.qr ?? null, error: r?.error ?? null, number: biz?.comms_number });
}
