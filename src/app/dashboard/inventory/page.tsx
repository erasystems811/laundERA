import { createClient } from "@/lib/supabase/server";
import { IN_STORE_STAGES, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { InventoryTabs } from "./inventory-tabs";

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: supplies } = await supabase
    .from("supply_items")
    .select("id, name, unit, quantity, low_threshold")
    .order("name");

  // Clothes in custody = live view derived from in-store orders.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, customers(name), order_items(quantity)")
    .in("status", IN_STORE_STAGES);

  const byStage = { collected: 0, processing: 0, ready: 0 };
  let total = 0;
  const orderRows = (orders ?? []).map((o) => {
    const items = (o.order_items as unknown as { quantity: number }[]) ?? [];
    const count = items.reduce((s, it) => s + Number(it.quantity), 0);
    const status = o.status as OrderStatus;
    total += count;
    if (status in byStage) byStage[status as keyof typeof byStage] += count;
    const customer = o.customers as unknown as { name: string } | null;
    return { id: o.id, customerName: customer?.name ?? "Unknown", count, status };
  });

  // Show the fullest orders first.
  orderRows.sort((a, b) => b.count - a.count);

  const supplyItems = (supplies ?? []).map((s) => ({
    ...s,
    quantity: Number(s.quantity),
    low_threshold: Number(s.low_threshold),
  }));

  return (
    <div className="flex flex-1 flex-col pb-28">
      <PageHeader title="Inventory" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 sm:px-6">
        <InventoryTabs
          supplies={supplyItems}
          clothes={{ total, byStage, orders: orderRows }}
        />
      </main>
    </div>
  );
}
