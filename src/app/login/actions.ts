"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { phoneToLoginEmail } from "@/lib/phone";

export async function logIn(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const pin = String(formData.get("pin") ?? "");

  const loginEmail = phoneToLoginEmail(phone);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: pin,
  });

  console.log(
    `[login attempt] rawPhone="${phone}" derivedEmail="${loginEmail}" pinLength=${pin.length} result=${error ? "FAILED: " + error.message : "SUCCESS"}`
  );

  if (error) {
    redirect("/login?error=1");
  }

  redirect("/dashboard");
}
