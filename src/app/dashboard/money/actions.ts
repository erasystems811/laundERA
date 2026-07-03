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
  return { supabase, businessId: staff?.business_id as string | undefined };
}

export async function addRecurringExpense(input: {
  name: string;
  amount: number;
  cadence: "monthly" | "yearly";
}) {
  const { supabase, businessId } = await ctx();
  if (!businessId) throw new Error("No business");
  const { error } = await supabase.from("expenses").insert({
    business_id: businessId,
    name: input.name,
    amount: input.amount,
    kind: "recurring",
    cadence: input.cadence,
  });
  if (error) throw error;
  revalidatePath("/dashboard/money");
}

export async function addOnceExpense(input: {
  name: string;
  amount: number;
  incurredOn: string; // yyyy-mm-dd
}) {
  const { supabase, businessId } = await ctx();
  if (!businessId) throw new Error("No business");
  const { error } = await supabase.from("expenses").insert({
    business_id: businessId,
    name: input.name,
    amount: input.amount,
    kind: "once",
    incurred_on: input.incurredOn,
  });
  if (error) throw error;
  revalidatePath("/dashboard/money");
}

export async function updateExpense(
  id: string,
  input: { amount?: number; cadence?: "monthly" | "yearly"; name?: string }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard/money");
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard/money");
}
