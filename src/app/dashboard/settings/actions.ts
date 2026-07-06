"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Returns a result (never throws) so the real message reaches the UI —
// Next.js redacts thrown server-action errors in production.
export async function changePin(newPin: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const pin = (newPin || "").trim();
  if (!/^\d{4,}$/.test(pin)) return { ok: false, error: "PIN must be at least 4 digits (numbers only)." };
  const { error } = await supabase.auth.updateUser({ password: pin });
  if (error) {
    const m = /different from the old/i.test(error.message)
      ? "That's already your PIN — pick a new one."
      : /at least/i.test(error.message)
        ? "PIN is too short — use at least 6 digits."
        : error.message;
    return { ok: false, error: m };
  }
  return { ok: true };
}

export async function setNotifyOnReady(enabled: boolean) {
  const { supabase, businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");
  const { error } = await supabase.from("businesses").update({ notify_on_ready: enabled }).eq("id", bid);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
}

export async function savePaymentAccount(input: {
  method: "manual" | "listen" | "flutterwave";
  bank_name: string;
  account_number: string;
  account_name: string;
}) {
  const { supabase, businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");
  const { error } = await supabase
    .from("businesses")
    .update({
      payment_method: input.method,
      bank_name: input.bank_name.trim() || null,
      account_number: input.account_number.trim() || null,
      account_name: input.account_name.trim() || null,
    })
    .eq("id", bid);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
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

export async function updateBusiness(input: {
  name: string;
  whatsapp_number: string;
  address: string;
  invoice_footer: string;
}) {
  const { supabase, businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");
  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name,
      whatsapp_number: input.whatsapp_number,
      address: input.address,
      invoice_footer: input.invoice_footer,
    })
    .eq("id", bid);
  if (error) throw error;
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
}

export async function uploadLogo(formData: FormData) {
  const { businessId: bid } = await businessId();
  if (!bid) throw new Error("No business");

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) throw new Error("No file");

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${bid}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = admin.storage.from("logos").getPublicUrl(path);

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ logo_url: data.publicUrl })
    .eq("id", bid);
  if (error) throw error;

  revalidatePath("/dashboard/settings");
}
