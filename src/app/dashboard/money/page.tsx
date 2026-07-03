import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ExpenseManager } from "./expense-manager";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Expense = {
  id: string;
  name: string;
  amount: number;
  kind: "recurring" | "once";
  cadence: "monthly" | "yearly" | null;
  incurred_on: string | null;
};

export default async function MoneyPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase.from("orders").select("total, created_at");
  const { data: payments } = await supabase.from("payments").select("amount, created_at");
  const { data: businessRow } = await supabase
    .from("businesses")
    .select("created_at")
    .limit(1)
    .single();
  const { data: expensesRaw } = await supabase
    .from("expenses")
    .select("id, name, amount, kind, cadence, incurred_on")
    .order("created_at", { ascending: false });

  const expenses = (expensesRaw ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Expense[];

  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth();

  // Don't show costs for months before the business existed (avoids phantom losses).
  const businessStart = businessRow ? new Date(businessRow.created_at) : now;
  const startMonth = businessStart.getFullYear() < year ? 0 : businessStart.getMonth();

  // Recurring cost base, normalised to a per-month figure.
  const recurring = expenses.filter((e) => e.kind === "recurring");
  const recurringPerMonth = recurring.reduce(
    (s, e) => s + (e.cadence === "yearly" ? e.amount / 12 : e.amount),
    0
  );

  // Per-month arrays for this year.
  const collected = Array(12).fill(0);
  const onceExpense = Array(12).fill(0);

  for (const p of payments ?? []) {
    const d = new Date(p.created_at);
    if (d.getFullYear() === year) collected[d.getMonth()] += Number(p.amount);
  }
  for (const e of expenses) {
    if (e.kind === "once" && e.incurred_on) {
      const [y, mo] = e.incurred_on.split("-").map(Number);
      if (y === year) onceExpense[mo - 1] += e.amount;
    }
  }

  const monthExpense = (m: number) => recurringPerMonth + onceExpense[m];

  // All-time owed to them (billed minus collected across all orders).
  const totalBilled = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const totalCollected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = totalBilled - totalCollected;

  // This month
  const moneyIn = collected[currentMonth];
  const moneyOut = monthExpense(currentMonth);
  const cashProfit = moneyIn - moneyOut;
  const inProfit = moneyIn >= moneyOut && moneyOut > 0;
  const toBreakEven = Math.max(0, moneyOut - moneyIn);
  const progress = moneyOut > 0 ? Math.min(100, (moneyIn / moneyOut) * 100) : 0;

  const thisMonthOnce = expenses.filter((e) => {
    if (e.kind !== "once" || !e.incurred_on) return false;
    const [y, mo] = e.incurred_on.split("-").map(Number);
    return y === year && mo - 1 === currentMonth;
  });

  return (
    <div className="flex flex-1 flex-col pb-28">
      <PageHeader title="Money" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-4 sm:px-6">
        {/* Break-even hero */}
        <div className="glass-card rounded-3xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {MONTHS[currentMonth]} {year}
          </p>
          {moneyOut === 0 ? (
            <>
              <p className="mt-2 text-2xl font-bold tracking-tight text-teal-900">
                Set your monthly costs
              </p>
              <p className="mt-1 text-sm text-muted">
                Add rent, light and salary below so the system can show your break-even.
              </p>
            </>
          ) : (
            <>
              <p
                className={`mt-2 font-mono text-3xl font-bold tabular-nums ${inProfit ? "text-green-700" : "text-amber-600"}`}
              >
                {inProfit ? formatNaira(cashProfit) : formatNaira(toBreakEven)}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {inProfit ? "In profit this month" : "left to break even"}
              </p>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className={`h-full rounded-full ${inProfit ? "bg-green-500" : "bg-gradient-to-r from-teal-500 to-teal-700"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                Collected {formatNaira(moneyIn)} of {formatNaira(moneyOut)} needed
              </p>
            </>
          )}
        </div>

        {/* This-month money tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="font-mono text-lg font-bold tabular-nums text-green-700">{formatNaira(moneyIn)}</p>
            <p className="mt-0.5 text-xs text-muted">Money in</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className="font-mono text-lg font-bold tabular-nums text-red-600">{formatNaira(moneyOut)}</p>
            <p className="mt-0.5 text-xs text-muted">Money out</p>
          </div>
          <div className="glass-card rounded-2xl p-4 text-center">
            <p className={`font-mono text-lg font-bold tabular-nums ${cashProfit >= 0 ? "text-teal-900" : "text-red-600"}`}>
              {formatNaira(cashProfit)}
            </p>
            <p className="mt-0.5 text-xs text-muted">Profit</p>
          </div>
        </div>

        {/* Owed to you */}
        {outstanding > 0 && (
          <Link href="/dashboard/customers" className="glass-card flex items-center justify-between rounded-2xl px-5 py-4 transition-transform active:scale-[0.99]">
            <div>
              <p className="text-sm font-medium text-ink">Owed to you</p>
              <p className="text-xs text-muted">Becomes profit once collected · tap to see who</p>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums text-amber-600">{formatNaira(outstanding)}</span>
          </Link>
        )}

        {/* Expense manager */}
        <ExpenseManager
          recurring={recurring}
          thisMonth={thisMonthOnce}
          monthLabel={MONTHS[currentMonth]}
        />

        {/* Year, month by month */}
        <div className="glass-card rounded-2xl p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{year} · month by month</p>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-ink/10 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <span className="flex-1">Month</span>
              <span className="w-20 text-right">In</span>
              <span className="w-20 text-right">Out</span>
              <span className="w-20 text-right">Profit</span>
            </div>
            {Array.from({ length: currentMonth - startMonth + 1 }, (_, i) => {
              const m = startMonth + i;
              const inc = collected[m];
              const out = monthExpense(m);
              const prof = inc - out;
              return (
                <div key={m} className="flex items-center gap-2 border-b border-ink/5 py-2 text-sm last:border-b-0">
                  <span className="flex-1 font-medium text-ink">{MONTHS[m].slice(0, 3)}</span>
                  <span className="w-20 text-right font-mono tabular-nums text-green-700">{formatNaira(inc)}</span>
                  <span className="w-20 text-right font-mono tabular-nums text-red-600">{formatNaira(out)}</span>
                  <span className={`w-20 text-right font-mono font-semibold tabular-nums ${prof >= 0 ? "text-teal-900" : "text-red-600"}`}>
                    {formatNaira(prof)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
