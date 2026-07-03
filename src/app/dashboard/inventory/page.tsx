import { createClient } from "@/lib/supabase/server";
import { IN_STORE_STAGES, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { InventoryTabs } from "./inventory-tabs";

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(status)")
    .eq("id", user!.id)
    .single();
  const business = staff?.businesses as unknown as { status: string } | null;
  const readOnly = business?.status === "paused";

  const { data: supplies } = await supabase
    .from("supply_items")
    .select("id, name, unit, quantity, low_threshold")
    .order("name");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, dropped_off_by, customers(name), order_items(quantity)")
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
    return { id: o.id, customerName: customer?.name ?? "Unknown", count, status, droppedOffBy: o.dropped_off_by };
  });
  orderRows.sort((a, b) => b.count - a.count);

  const supplyItems = (supplies ?? []).map((s) => ({
    ...s,
    quantity: Number(s.quantity),
    low_threshold: Number(s.low_threshold),
  }));

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Supplies you stock, and the clothes in your care" />
      <InventoryTabs supplies={supplyItems} clothes={{ total, byStage, orders: orderRows }} readOnly={readOnly} />
    </div>
  );
}
