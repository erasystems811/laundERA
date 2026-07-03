import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase.from("customers").select("id, name, phone").order("name");
  const { data: orders } = await supabase.from("orders").select("id, customer_id, total");
  const { data: payments } = await supabase.from("payments").select("order_id, amount");

  const paidByOrder = new Map<string, number>();
  for (const p of payments ?? []) paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));

  const stats = new Map<string, { billed: number; paid: number; count: number }>();
  for (const o of orders ?? []) {
    const s = stats.get(o.customer_id) ?? { billed: 0, paid: 0, count: 0 };
    s.billed += Number(o.total);
    s.paid += paidByOrder.get(o.id) ?? 0;
    s.count += 1;
    stats.set(o.customer_id, s);
  }

  const rows = (customers ?? [])
    .map((c) => {
      const s = stats.get(c.id) ?? { billed: 0, paid: 0, count: 0 };
      return { ...c, balance: s.billed - s.paid, spend: s.billed, count: s.count };
    })
    .sort((a, b) => b.balance - a.balance || b.spend - a.spend || a.name.localeCompare(b.name));

  const totalOwed = rows.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customer${rows.length === 1 ? "" : "s"} · ${formatNaira(totalOwed)} owed to you`}
      />

      {!rows.length ? (
        <div className="glass-card rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-teal-900">No customers yet</p>
          <p className="mt-1 text-sm text-muted">Customers are added automatically with their first order.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Total spend</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-ink/5 last:border-b-0 hover:bg-white/30">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/25 to-teal-500/10 text-xs font-semibold text-teal-700">
                          {c.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-medium text-ink hover:text-teal-700">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted">{c.phone}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{c.count}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{formatNaira(c.spend)}</td>
                    <td className="px-5 py-3 text-right">
                      {c.balance > 0 ? (
                        <span className="font-mono font-semibold tabular-nums text-red-600">{formatNaira(c.balance)}</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100/70 px-2.5 py-1 text-xs font-semibold text-green-700">Paid up</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
