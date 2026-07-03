import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatNaira, STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PreferencesEditor } from "./preferences-editor";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, preferences, created_at")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: payments } = orderIds.length
    ? await supabase.from("payments").select("order_id, amount").in("order_id", orderIds)
    : { data: [] };

  const paidByOrder = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));
  }

  const billed = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = billed - paid;

  return (
    <div>
      <PageHeader back="/dashboard/customers" title={customer.name} subtitle={customer.phone} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">Total spend</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-900">{formatNaira(billed)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">Orders</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-900">{orders?.length ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">{balance > 0 ? "Owing" : "Balance"}</p>
          <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${balance > 0 ? "text-red-600" : "text-green-700"}`}>{formatNaira(balance)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="glass-card overflow-hidden rounded-2xl">
            <p className="border-b border-ink/10 px-5 py-4 text-sm font-semibold text-ink">Order history</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                    <th className="px-5 py-3 text-right">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {orders?.map((o) => {
                    const status = o.status as OrderStatus;
                    return (
                      <tr key={o.id} className="border-b border-ink/5 last:border-b-0 hover:bg-white/30">
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/orders/${o.id}`} className="text-ink hover:text-teal-700">
                            {new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{formatNaira(Number(o.total))}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_PILL_CLASS[status]}`}>{STAGE_LABEL[status]}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!orders?.length && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-muted">No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <PreferencesEditor customerId={customer.id} initial={customer.preferences ?? ""} />
        </div>
      </div>
    </div>
  );
}
