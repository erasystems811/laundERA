import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";

const PAGE_SIZE = 30;

type Row = { id: string; name: string; phone: string; order_count: number; spend: number; balance: number };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const [{ data: rowsRaw }, { data: total }] = await Promise.all([
    supabase.rpc("customers_page", { p_search: q, p_limit: PAGE_SIZE, p_offset: offset }),
    supabase.rpc("customers_count", { p_search: q }),
  ]);

  const rows = (rowsRaw ?? []) as Row[];
  const totalCount = Number(total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${totalCount} customer${totalCount === 1 ? "" : "s"}`} />

      <form className="mb-5 max-w-md" action="/dashboard/customers" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or phone…"
          className="h-11 w-full rounded-xl border border-white/60 bg-white/40 px-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
        />
      </form>

      {!rows.length ? (
        <div className="glass-card rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-teal-900">{q ? "No match" : "No customers yet"}</p>
          <p className="mt-1 text-sm text-muted">{q ? "Try a different name or phone." : "Customers are added with their first order."}</p>
        </div>
      ) : (
        <>
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
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{c.order_count}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{formatNaira(Number(c.spend))}</td>
                      <td className="px-5 py-3 text-right">
                        {Number(c.balance) > 0 ? (
                          <span className="font-mono font-semibold tabular-nums text-red-600">{formatNaira(Number(c.balance))}</span>
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">Page {pageNum} of {totalPages}</span>
              <div className="flex gap-2">
                {pageNum > 1 && <Link href={qs(pageNum - 1)} className="glass-card rounded-xl px-4 py-2 font-medium text-teal-700">← Prev</Link>}
                {pageNum < totalPages && <Link href={qs(pageNum + 1)} className="glass-card rounded-xl px-4 py-2 font-medium text-teal-700">Next →</Link>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
