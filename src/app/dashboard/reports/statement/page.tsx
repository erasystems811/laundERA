import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PrintButton } from "./print-button";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const supabase = await createClient();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const cm = year === now.getFullYear() ? now.getMonth() : 11;

  const { data: { user } } = await supabase.auth.getUser();
  const { data: staff } = await supabase
    .from("staff")
    .select("businesses(name, address, logo_url, created_at)")
    .eq("id", user!.id)
    .single();
  const business = staff?.businesses as unknown as { name: string; address: string | null; logo_url: string | null; created_at: string } | null;

  // Freeze completed months, then read the frozen-or-live series.
  await supabase.rpc("ensure_months_closed");
  const [seriesR, expensesR] = await Promise.all([
    supabase.rpc("monthly_series", { p_year: year }),
    supabase.from("expenses").select("name, amount, kind, cadence, incurred_on"),
  ]);

  const series = (seriesR.data ?? []) as { month: number; revenue: number; expenses: number }[];
  const expenses = (expensesR.data ?? []).map((e) => ({ ...e, amount: Number(e.amount) }));

  const businessStart = business ? new Date(business.created_at) : now;
  const startMonth = businessStart.getFullYear() < year ? 0 : businessStart.getMonth();
  const monthsElapsed = cm - startMonth + 1;

  const collected = Array(12).fill(0);
  const expenseArr = Array(12).fill(0);
  for (const m of series) { collected[m.month - 1] = Number(m.revenue); expenseArr[m.month - 1] = Number(m.expenses); }

  const range = Array.from({ length: monthsElapsed }, (_, i) => startMonth + i);
  const revenue = range.reduce((a, m) => a + collected[m], 0);
  const totalExpenses = range.reduce((a, m) => a + expenseArr[m], 0);
  const onceThisYear = expenses.filter((e) => {
    if (e.kind !== "once" || !e.incurred_on) return false;
    const [y, mo] = e.incurred_on.split("-").map(Number);
    return y === year && mo - 1 >= startMonth && mo - 1 <= cm;
  });
  const onceTotal = onceThisYear.reduce((a, e) => a + e.amount, 0);
  const recurringTotal = Math.max(0, totalExpenses - onceTotal);
  const netProfit = revenue - totalExpenses;

  const onceByName = new Map<string, number>();
  for (const e of expenses) {
    if (e.kind === "once" && e.incurred_on) {
      const [y, mo] = e.incurred_on.split("-").map(Number);
      if (y === year && mo - 1 >= startMonth && mo - 1 <= cm) onceByName.set(e.name, (onceByName.get(e.name) ?? 0) + e.amount);
    }
  }

  const Row = ({ label, value, bold, indent }: { label: string; value: string; bold?: boolean; indent?: boolean }) => (
    <div className={`flex justify-between py-2 ${bold ? "border-t border-ink/15 font-semibold text-teal-900" : "text-ink"} ${indent ? "pl-4 text-muted" : ""}`}>
      <span>{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/dashboard/reports" className="text-sm font-medium text-teal-700">← Back to reports</Link>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/reports/statement?year=${year - 1}`} className="rounded-xl border border-white/60 bg-white/40 px-3 py-2 text-sm text-ink">← {year - 1}</Link>
          {year < now.getFullYear() && <Link href={`/dashboard/reports/statement?year=${year + 1}`} className="rounded-xl border border-white/60 bg-white/40 px-3 py-2 text-sm text-ink">{year + 1} →</Link>}
          <PrintButton />
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 print:rounded-none print:border-none print:bg-white print:shadow-none">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {business?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain" />
            )}
            <div>
              <p className="text-xl font-semibold tracking-tight text-teal-900">{business?.name}</p>
              {business?.address && <p className="text-xs text-muted">{business.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-ink">Financial Statement</p>
            <p className="text-sm text-muted">Year {year}</p>
          </div>
        </div>

        {/* Income statement */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Income Statement (Profit &amp; Loss)</p>
        <div className="mb-6 text-sm">
          <Row label="Revenue collected" value={formatNaira(revenue)} />
          <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Less expenses</div>
          {recurringTotal > 0 && <Row label={`Recurring costs (${monthsElapsed} month${monthsElapsed === 1 ? "" : "s"})`} value={formatNaira(recurringTotal)} indent />}
          {[...onceByName.entries()].map(([name, amt]) => <Row key={name} label={name} value={formatNaira(amt)} indent />)}
          {totalExpenses === 0 && <Row label="No expenses recorded" value={formatNaira(0)} indent />}
          <Row label="Total expenses" value={formatNaira(totalExpenses)} />
          <Row label="Net profit" value={formatNaira(netProfit)} bold />
        </div>

        {/* Monthly breakdown */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Month by month</p>
        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <th className="py-2">Month</th>
              <th className="py-2 text-right">Revenue</th>
              <th className="py-2 text-right">Expenses</th>
              <th className="py-2 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {range.map((m) => {
              const inc = collected[m];
              const out = expenseArr[m];
              return (
                <tr key={m} className="border-b border-ink/5">
                  <td className="py-2 text-ink">{MONTHS[m]}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-ink">{formatNaira(inc)}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-ink">{formatNaira(out)}</td>
                  <td className={`py-2 text-right font-mono font-semibold tabular-nums ${inc - out >= 0 ? "text-teal-900" : "text-red-600"}`}>{formatNaira(inc - out)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-8 border-t border-ink/10 pt-4 text-center text-xs text-muted">
          Generated by LaundERA from recorded income and expenses. Figures reflect what has been entered into the system.
        </p>
      </div>
    </div>
  );
}
