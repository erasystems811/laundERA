"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrderStage } from "@/lib/notify";

export type CustomerHit = { id: string; name: string; phone: string; preferences: string | null };

// Upload one intake photo, return its public URL (stored on the order at creation).
export async function uploadOrderPhoto(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase.from("staff").select("business_id").eq("id", user!.id).single();
  if (!staff) throw new Error("No business");

  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) throw new Error("No file");

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${staff.business_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await admin.storage.from("order-photos").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return admin.storage.from("order-photos").getPublicUrl(path).data.publicUrl;
}

// Search customers by name or phone — returns only matches (scales to any customer count).
export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, preferences")
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("name")
    .limit(12);
  return (data ?? []) as CustomerHit[];
}

type CreateOrderInput = {
  customerId: string | null;
  newCustomer: { name: string; phone: string; preferences: string } | null;
  items: { serviceId: string; quantity: number }[];
  discount: { type: "percentage" | "fixed"; value: number } | null;
  droppedOffBy: string;
  photos: string[];
};

export async function createOrder(input: CreateOrderInput) {
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

  let customerId = input.customerId;

  if (!customerId && input.newCustomer) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: staff.business_id,
        name: input.newCustomer.name,
        phone: input.newCustomer.phone,
        preferences: input.newCustomer.preferences || null,
      })
      .select("id")
      .single();

    if (customerError) throw customerError;
    customerId = customer.id;
  }

  if (!customerId) throw new Error("A customer is required");
  if (!input.items.length) throw new Error("At least one item is required");

  const serviceIds = input.items.map((i) => i.serviceId);
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, price")
    .in("id", serviceIds);

  if (servicesError) throw servicesError;

  const subtotal = input.items.reduce((sum, item) => {
    const service = services!.find((s) => s.id === item.serviceId);
    return sum + (service ? Number(service.price) * item.quantity : 0);
  }, 0);

  let discountAmount = 0;
  if (input.discount && input.discount.value > 0) {
    discountAmount =
      input.discount.type === "percentage"
        ? (subtotal * input.discount.value) / 100
        : input.discount.value;
  }
  // Never let a discount push the total below zero.
  discountAmount = Math.min(discountAmount, subtotal);
  const total = subtotal - discountAmount;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: staff.business_id,
      customer_id: customerId,
      subtotal,
      discount_type: input.discount && input.discount.value > 0 ? input.discount.type : null,
      discount_value: input.discount && input.discount.value > 0 ? input.discount.value : 0,
      total,
      dropped_off_by: input.droppedOffBy?.trim() || null,
      photos: input.photos ?? [],
      created_by: user!.id,
    })
    .select("id")
    .single();

  if (orderError) throw orderError;

  const orderItems = input.items.map((item) => {
    const service = services!.find((s) => s.id === item.serviceId)!;
    return {
      order_id: order.id,
      service_id: service.id,
      service_name: service.name,
      quantity: item.quantity,
      unit_price: service.price,
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw itemsError;

  // Log the opening stage so the order has a timestamped history from the start.
  await supabase.from("order_stage_events").insert({
    order_id: order.id,
    from_stage: null,
    to_stage: "collected",
    changed_by: user!.id,
  });

  // "We've received your clothes" WhatsApp (best-effort, opt-in per business).
  await notifyOrderStage(order.id, "collected");

  redirect(`/dashboard/orders/${order.id}`);
}
