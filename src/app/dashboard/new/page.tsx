import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NewOrderForm } from "./new-order-form";

export default async function NewOrderPage() {
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, icon, price")
    .eq("active", true)
    .order("name");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, preferences")
    .order("name");

  return (
    <div>
      <PageHeader back="/dashboard" title="New Order" subtitle="Log clothes brought in" />
      <NewOrderForm services={services ?? []} customers={customers ?? []} />
    </div>
  );
}
