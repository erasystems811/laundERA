import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { QuickPay } from "./quick-pay";

type Row = {
  id: string;
  customer_name: string;
  customer_id: string;
  created_at: string;
  total: number;
  paid: number;
  balance: number;
};

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(status)")
    .eq("id", user!.id)
    .single();
  const readOnly = (staff?.businesses as unknown as { status: string } | null)?.status === "paused";

  const { data } = await supabase.rpc("outstanding_orders", { p_limit: 100, p_offset: 0 });
  const rows = (data ?? []) as Row[];
  const totalOwed = rows.reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div>
      <PageHeader title="Payments" subtitle={`${rows.length} unpaid order${rows.length === 1 ? "" : "s"} · ${formatNaira(totalOwed)} outstanding`} />

      {!rows.length ? (
        <div className="glass-card rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-teal-900">All settled 🎉</p>
          <p className="mt-1 text-sm text-muted">No outstanding balances right now.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Order date</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3 text-right">{readOnly ? "" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5 last:border-b-0 hover:bg-white/30">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/orders/${r.id}`} className="font-medium text-ink hover:text-teal-700">{r.customer_name}</Link>
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{formatNaira(Number(r.total))}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums text-muted">{formatNaira(Number(r.paid))}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-red-600">{formatNaira(Number(r.balance))}</td>
                    <td className="px-5 py-3 text-right">
                      {!readOnly && <QuickPay orderId={r.id} balance={Number(r.balance)} />}
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
