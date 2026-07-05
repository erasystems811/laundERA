"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("staff")
    .select("business_id")
    .eq("id", user!.id)
    .single();
  return { supabase, businessId: staff?.business_id as string | undefined, userId: user?.id };
}

export async function addSupplyItem(input: {
  name: string;
  unit: string;
  quantity: number;
  lowThreshold: number;
}) {
  const { supabase, businessId } = await ctx();
  if (!businessId) throw new Error("No business");
  const { error } = await supabase.from("supply_items").insert({
    business_id: businessId,
    name: input.name,
    unit: input.unit,
    quantity: input.quantity,
    low_threshold: input.lowThreshold,
  });
  if (error) throw error;
  revalidatePath("/dashboard/inventory");
}

export async function adjustSupply(input: {
  itemId: string;
  direction: "in" | "out";
  quantity: number;
  note?: string;
  performedBy?: string;
}) {
  const { supabase, businessId, userId } = await ctx();
  if (!businessId) throw new Error("No business");
  if (input.quantity <= 0) return;

  const { data: item, error: itemError } = await supabase
    .from("supply_items")
    .select("quantity")
    .eq("id", input.itemId)
    .single();
  if (itemError) throw itemError;

  const delta = input.direction === "in" ? input.quantity : -input.quantity;
  const newQty = Math.max(0, Number(item.quantity) + delta);

  const { error: moveError } = await supabase.from("supply_movements").insert({
    business_id: businessId,
    item_id: input.itemId,
    direction: input.direction,
    quantity: input.quantity,
    note: input.note?.trim() || null,
    performed_by: input.performedBy?.trim() || null,
    changed_by: userId,
  });
  if (moveError) throw moveError;

  const { error: updError } = await supabase
    .from("supply_items")
    .update({ quantity: newQty })
    .eq("id", input.itemId);
  if (updError) throw updError;

  revalidatePath("/dashboard/inventory");
}

export async function deleteSupplyItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("supply_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard/inventory");
}
