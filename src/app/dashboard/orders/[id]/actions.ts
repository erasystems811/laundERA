"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NEXT_STAGES, TERMINAL_STAGES, type OrderStatus } from "@/lib/format";

export async function moveOrderStage(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  receivedBy?: string
) {
  // Only allow moves the pipeline permits from the current stage.
  if (!NEXT_STAGES[from]?.includes(to)) return;

  const update: { status: OrderStatus; picked_up_by?: string } = { status: to };
  // Delivered and Picked Up both record who received the clothes.
  if (TERMINAL_STAGES.includes(to) && receivedBy?.trim()) {
    update.picked_up_by = receivedBy.trim();
  }

  const supabase = await createClient();
  const { error } = await supabase.from("orders").update(update).eq("id", orderId);
  if (error) throw error;

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
