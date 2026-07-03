import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SERVICES = [
  { name: "Shirt", icon: "shirt", price: 800 },
  { name: "Trouser", icon: "trouser", price: 1000 },
  { name: "Bedsheet", icon: "bedsheet", price: 1500 },
  { name: "Duvet", icon: "duvet", price: 3000 },
  { name: "Agbada", icon: "agbada", price: 4000 },
];

const CUSTOMERS = [
  { name: "Chika Okonkwo", phone: "08032210098" },
  { name: "Tunde Bakare", phone: "08145562231" },
];

async function main() {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("name", "LaundERA Demo")
    .single();

  if (businessError) throw businessError;

  const { error: servicesError } = await supabase
    .from("services")
    .insert(SERVICES.map((s) => ({ ...s, business_id: business.id })));
  if (servicesError) throw servicesError;

  const { error: customersError } = await supabase
    .from("customers")
    .insert(CUSTOMERS.map((c) => ({ ...c, business_id: business.id })));
  if (customersError) throw customersError;

  console.log("Seeded services and customers for", business.id);
}

main().catch((err) => {
  console.error("Seed failed:", err.message ?? err);
  process.exit(1);
});
