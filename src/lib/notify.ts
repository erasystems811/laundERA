import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp, toE164Nigeria } from "@/lib/comms";
import type { OrderStatus } from "@/lib/format";

// The message a customer gets at a stage. Stages NOT listed here (e.g. "contacted",
// which is an internal marker) send nothing.
const STAGE_MESSAGE: Partial<Record<OrderStatus, (name: string, biz: string) => string>> = {
  collected: (n, b) => `Hi ${n}, we've received your clothes at ${b}. We'll keep you posted as we go. Thank you!`,
  processing: (n, b) => `Hi ${n}, your laundry at ${b} is now being washed.`,
  ready: (n, b) => `Hi ${n}, your laundry at ${b} is ready for pickup. Thank you!`,
  in_transit: (n, b) => `Hi ${n}, your laundry from ${b} is on its way to you.`,
  delivered: (n, b) => `Hi ${n}, your laundry from ${b} has been delivered. Thank you for your patronage!`,
  picked_up: (n, b) => `Hi ${n}, thanks for collecting your laundry from ${b}. See you next time!`,
};

// Best-effort WhatsApp update when an order reaches a stage. Never throws —
// a messaging problem must never break the pipeline move.
export async function notifyOrderStage(orderId: string, stage: OrderStatus): Promise<void> {
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

    const sessionId = biz.comms_session_id || process.env.COMMS_DEFAULT_SESSION_ID;
    if (!sessionId) return;

    const to = toE164Nigeria(cust?.phone || "");
    if (!to) return;

    const build = STAGE_MESSAGE[stage];
    if (!build) return; // stage has no customer message (e.g. "contacted")

    const firstName = (cust?.name || "there").split(" ")[0];
    const content = build(firstName, biz.name);

    let status = "sent";
    let providerId: string | null = null;
    let error: string | null = null;
    try {
      const r = await sendWhatsApp({ to, content, sessionId, idempotencyKey: `order-${orderId}-${stage}` });
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
