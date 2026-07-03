import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name");

  const { data: orders } = await supabase.from("orders").select("id, customer_id, total");
  const { data: payments } = await supabase.from("payments").select("order_id, amount");

  const paidByOrder = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));
  }

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
      return { ...c, balance: s.billed - s.paid, count: s.count };
    })
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-1 flex-col pb-28">
      <PageHeader title="Customers" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 sm:px-6">
        {!rows.length && (
          <div className="glass-card rounded-3xl px-6 py-12 text-center">
            <p className="text-lg font-semibold text-teal-900">No customers yet</p>
            <p className="mt-1 text-sm text-muted">
              Customers are added automatically when you create their first order.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/customers/${c.id}`}
              className="glass-card flex items-center justify-between rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/25 to-teal-500/10 text-sm font-semibold text-teal-700">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
                  <p className="text-xs text-muted">{c.phone}</p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {c.balance > 0 ? (
                  <>
                    <p className="font-mono text-sm font-semibold tabular-nums text-red-600">
                      {formatNaira(c.balance)}
                    </p>
                    <p className="text-xs text-muted">owing</p>
                  </>
                ) : (
                  <span className="inline-flex rounded-full bg-green-100/70 px-2.5 py-1 text-xs font-semibold text-green-700">
                    Paid up
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
