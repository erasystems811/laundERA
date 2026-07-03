import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const OWNER_PHONE = "09032637607";
const OWNER_EMAIL = "2349032637607@staff.laundera.app";
const OWNER_NAME = "Chidera";
const BUSINESS_NAME = "LaundERA Demo";

const pin = crypto.randomInt(100000, 999999).toString();

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ name: BUSINESS_NAME })
    .select()
    .single();

  if (businessError) throw businessError;

  const { data: userResult, error: userError } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: pin,
    email_confirm: true,
  });

  if (userError) throw userError;

  const { error: staffError } = await supabase.from("staff").insert({
    id: userResult.user.id,
    business_id: business.id,
    name: OWNER_NAME,
    phone: OWNER_PHONE,
    role: "owner",
  });

  if (staffError) throw staffError;

  console.log("Done.");
  console.log("Business:", business.name, business.id);
  console.log("Owner phone (login):", OWNER_PHONE);
  console.log("Owner PIN (login):", pin);
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
