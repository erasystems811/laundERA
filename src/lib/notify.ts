import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, toE164Nigeria } from "@/lib/comms";

// Fire a "your clothes are ready" WhatsApp when an order hits Ready.
// Never throws — a messaging problem must never break the pipeline move.
export async function notifyOrderReady(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("id, business_id, customers(name, phone), businesses(name, notify_on_ready, comms_session_id)")
      .eq("id", orderId)
      .single();
    if (!order) return;

    const biz = order.businesses as unknown as { name: string; notify_on_ready: boolean; comms_session_id: string | null } | null;
    const cust = order.customers as unknown as { name: string; phone: string } | null;
    if (!biz?.notify_on_ready) return;

    // The laundry's own connected WhatsApp, or the platform default sender.
    const sessionId = biz.comms_session_id || process.env.COMMS_DEFAULT_SESSION_ID;
    if (!sessionId) return; // WhatsApp not configured yet — silently skip

    const to = toE164Nigeria(cust?.phone || "");
    if (!to) return;

    const firstName = (cust?.name || "there").split(" ")[0];
    const content = `Hi ${firstName}, your laundry at ${biz.name} is ready for pickup. Thank you!`;

    let status = "sent";
    let providerId: string | null = null;
    let error: string | null = null;
    try {
      const r = await sendWhatsApp({ to, content, sessionId, idempotencyKey: `order-${orderId}-ready` });
      providerId = r.id ?? null;
      status = r.status || "sent";
    } catch (e) {
      status = "failed";
      error = (e as Error).message;
    }

    await admin.from("notifications").insert({
      business_id: order.business_id,
      order_id: orderId,
      channel: "whatsapp",
      recipient: to,
      content,
      status,
      provider_id: providerId,
      error,
    });
  } catch {
    // swallow — notifications are best-effort
  }
}
