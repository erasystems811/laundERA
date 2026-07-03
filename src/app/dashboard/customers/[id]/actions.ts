"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function savePreferences(customerId: string, preferences: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ preferences })
    .eq("id", customerId);
  if (error) throw error;
  revalidatePath(`/dashboard/customers/${customerId}`);
}
