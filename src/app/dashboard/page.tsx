import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IN_STORE_STAGES, formatNaira, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PipelineBoard, type BoardOrder } from "./pipeline-board";

export default async function OrdersPage() {
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

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select("id, status, total, dropped_off_by, created_at, customers(name), order_items(quantity)")
    .order("created_at", { ascending: false });

  const orderIds = (ordersRaw ?? []).map((o) => o.id);
  const { data: payments } = orderIds.length
    ? await supabase.from("payments").select("order_id, amount").in("order_id", orderIds)
    : { data: [] };
  const paidByOrder = new Map<string, number>();
  for (const p of payments ?? [])
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));

  const orders: BoardOrder[] = (ordersRaw ?? []).map((o) => {
    const items = (o.order_items as unknown as { quantity: number }[]) ?? [];
    const customer = o.customers as unknown as { name: string } | null;
    const total = Number(o.total);
    return {
      id: o.id,
      customerName: customer?.name ?? "Unknown",
      itemCount: items.reduce((s, it) => s + Number(it.quantity), 0),
      total,
      balance: total - (paidByOrder.get(o.id) ?? 0),
      droppedOffBy: o.dropped_off_by,
      status: o.status as OrderStatus,
      createdAt: o.created_at,
    };
  });

  const activeOrders = orders.filter((o) => o.status !== "delivered");
  const inStore = orders.filter((o) => IN_STORE_STAGES.includes(o.status)).length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const owed = orders.reduce((s, o) => s + Math.max(0, o.balance), 0);

  const stats = [
    { label: "Active orders", value: String(activeOrders.length) },
    { label: "Garments in shop", value: String(inStore) },
    { label: "Ready for pickup", value: String(readyCount) },
    { label: "Owed to you", value: formatNaira(owed) },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Move each order along as it progresses"
        action={
          !readOnly && (
            <Link
              href="/dashboard/new"
              className="btn-primary flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Order
            </Link>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-900">{s.value}</p>
          </div>
        ))}
      </div>

      {!orders.length ? (
        <div className="glass-card rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-teal-900">No orders yet</p>
          <p className="mt-1 text-sm text-muted">Tap New Order to log the first one.</p>
        </div>
      ) : (
        <PipelineBoard orders={orders} readOnly={readOnly} />
      )}
    </div>
  );
}
