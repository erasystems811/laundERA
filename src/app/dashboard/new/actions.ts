"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CreateOrderInput = {
  customerId: string | null;
  newCustomer: { name: string; phone: string } | null;
  items: { serviceId: string; quantity: number }[];
  discount: { type: "percentage" | "fixed"; value: number } | null;
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

  redirect(`/dashboard/orders/${order.id}`);
}
