"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NEXT_STAGES, TERMINAL_STAGES, IN_STORE_STAGES, type OrderStatus } from "@/lib/format";
import { notifyOrderStage } from "@/lib/notify";

// Add more clothes to an existing order (e.g. the customer brought extra after intake).
// Recomputes subtotal, discount and total; any generated invoice reads live so it updates too.
export async function addItemsToOrder(
  orderId: string,
  items: { serviceId: string; quantity: number }[]
) {
  if (!items.length) return;
  const supabase = await createClient();

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("status, subtotal, discount_type, discount_value")
    .eq("id", orderId)
    .single();
  if (orderErr) throw orderErr;
  // No edits once the clothes have left the shop (With Rider / Delivered / Picked Up).
  if (!IN_STORE_STAGES.includes(order.status as OrderStatus)) return;

  const serviceIds = items.map((i) => i.serviceId);
  const { data: services, error: svcErr } = await supabase
    .from("services")
    .select("id, name, price")
    .in("id", serviceIds);
  if (svcErr) throw svcErr;

  const newRows = items.map((it) => {
    const s = services!.find((x) => x.id === it.serviceId)!;
    return {
      order_id: orderId,
      service_id: s.id,
      service_name: s.name,
      quantity: it.quantity,
      unit_price: s.price,
    };
  });
  const { error: insErr } = await supabase.from("order_items").insert(newRows);
  if (insErr) throw insErr;

  const added = newRows.reduce((sum, r) => sum + r.quantity * Number(r.unit_price), 0);
  const subtotal = Number(order.subtotal) + added;
  let discount = 0;
  if (order.discount_type === "percentage") discount = (subtotal * Number(order.discount_value)) / 100;
  else if (order.discount_type === "fixed") discount = Number(order.discount_value);
  discount = Math.min(discount, subtotal);
  const total = subtotal - discount;

  const { error: updErr } = await supabase.from("orders").update({ subtotal, total }).eq("id", orderId);
  if (updErr) throw updErr;

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payments");
}

// Fix a mistake: change an existing item's quantity, or remove it (quantity 0).
// Recomputes subtotal/discount/total so the invoice stays correct.
export async function setOrderItemQuantity(orderId: string, itemId: string, quantity: number) {
  const supabase = await createClient();

  const { data: order } = await supabase.from("orders").select("status, discount_type, discount_value").eq("id", orderId).single();
  // No edits once the clothes have left the shop (With Rider / Delivered / Picked Up).
  if (!order || !IN_STORE_STAGES.includes(order.status as OrderStatus)) return;

  if (quantity <= 0) {
    const { error } = await supabase.from("order_items").delete().eq("id", itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("order_items").update({ quantity }).eq("id", itemId);
    if (error) throw error;
  }
  const { data: items } = await supabase.from("order_items").select("quantity, unit_price").eq("order_id", orderId);
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  let discount = 0;
  if (order?.discount_type === "percentage") discount = (subtotal * Number(order.discount_value)) / 100;
  else if (order?.discount_type === "fixed") discount = Number(order.discount_value);
  discount = Math.min(discount, subtotal);

  const { error } = await supabase.from("orders").update({ subtotal, total: subtotal - discount }).eq("id", orderId);
  if (error) throw error;

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");
}

export async function moveOrderStage(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  receivedBy?: string
) {
  // Only allow moves the pipeline permits from the current stage.
  if (!NEXT_STAGES[from]?.includes(to)) return;

  const update: { status: OrderStatus; picked_up_by?: string; completed_at?: string } = { status: to };
  // Delivered and Picked Up both record who received the clothes + when it completed
  // (so it stays visible in its terminal column, not filtered out by age).
  if (TERMINAL_STAGES.includes(to)) {
    update.completed_at = new Date().toISOString();
    if (receivedBy?.trim()) update.picked_up_by = receivedBy.trim();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("order_stage_events").insert({
    order_id: orderId,
    from_stage: from,
    to_stage: to,
    changed_by: user?.id ?? null,
  });

  // Auto-WhatsApp the customer at each stage (best-effort, opt-in per business).
  await notifyOrderStage(orderId, to);

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
}

export async function logPayment(orderId: string, amount: number, method: "cash" | "transfer" | "card") {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("business_id")
    .eq("id", user!.id)
    .single();

  if (!staff) throw new Error("Staff record not found");

  const { error } = await supabase.from("payments").insert({
    business_id: staff.business_id,
    order_id: orderId,
    amount,
    method,
    logged_by: user!.id,
  });

  if (error) throw error;

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");
}

export async function generateInvoice(orderId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!existing) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: staff } = await supabase
      .from("staff")
      .select("business_id")
      .eq("id", user!.id)
      .single();

    if (!staff) throw new Error("Staff record not found");

    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", staff.business_id);

    const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { error } = await supabase.from("invoices").insert({
      business_id: staff.business_id,
      order_id: orderId,
      invoice_number: invoiceNumber,
    });

    if (error) throw error;
  }

  redirect(`/dashboard/orders/${orderId}/invoice`);
}
