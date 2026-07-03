"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function businessId() {
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

export async function addService(input: { name: string; price: number; icon: string }) {
  const { supabase, businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");
  const { error } = await supabase.from("services").insert({
    business_id: bid,
    name: input.name,
    price: input.price,
    icon: input.icon,
  });
  if (error) throw error;
  revalidatePath("/dashboard/settings");
}

export async function updateService(
  id: string,
  input: { name?: string; price?: number; active?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(input).eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
}

export async function updateBusiness(input: { name: string; whatsapp_number: string }) {
  const { supabase, businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");
  const { error } = await supabase
    .from("businesses")
    .update({ name: input.name, whatsapp_number: input.whatsapp_number })
    .eq("id", bid);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
}
