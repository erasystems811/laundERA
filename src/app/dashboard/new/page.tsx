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

  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <PageHeader back="/dashboard" title="New Order" subtitle="Log clothes brought in" />
      <NewOrderForm services={services ?? []} hasCustomers={(count ?? 0) > 0} />
    </div>
  );
}
