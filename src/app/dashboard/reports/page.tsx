import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL, ORDER_STAGES, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportsView, type ReportsData } from "./reports-view";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function ReportsPage() {
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const cm = now.getMonth();

  // Freeze any completed months first, so past figures never drift when costs change.
  await supabase.rpc("ensure_months_closed");

  // All heavy aggregation runs in the database — the app only receives rolled-up rows.
  const [scalarsR, seriesR, serviceR, stageR, topR, owingR, expensesR, bizR] = await Promise.all([
    supabase.rpc("reports_scalars"),
    supabase.rpc("monthly_series", { p_year: year }),
    supabase.rpc("revenue_by_service"),
    supabase.rpc("orders_stage_counts"),
    supabase.rpc("top_customers", { p_limit: 8 }),
    supabase.rpc("owing_customers", { p_limit: 20 }),
    supabase.from("expenses").select("id, name, amount, kind, cadence, incurred_on").order("created_at", { ascending: false }),
    supabase.from("businesses").select("created_at").limit(1).single(),
  ]);

  const s = scalarsR.data?.[0] ?? {};
  const series = (seriesR.data ?? []) as { month: number; revenue: number; expenses: number }[];
  const expenses = (expensesR.data ?? []).map((e) => ({ ...e, amount: Number(e.amount) }));

  const businessStart = bizR.data ? new Date(bizR.data.created_at) : now;
  const startMonth = businessStart.getFullYear() < year ? 0 : businessStart.getMonth();

  const recurring = expenses.filter((e) => e.kind === "recurring");

  // Frozen for closed months, live for the current one — straight from monthly_series.
  const collected = Array(12).fill(0);
  const expenseArr = Array(12).fill(0);
  for (const m of series) {
    collected[m.month - 1] = Number(m.revenue);
    expenseArr[m.month - 1] = Number(m.expenses);
  }
  const monthExpense = (m: number) => expenseArr[m];

  const moneyIn = collected[cm];
  const moneyOut = monthExpense(cm);
  const profit = moneyIn - moneyOut;
  const inProfit = moneyIn >= moneyOut && moneyOut > 0;
  const toBreakEven = Math.max(0, moneyOut - moneyIn);
  const progress = moneyOut > 0 ? Math.min(100, (moneyIn / moneyOut) * 100) : 0;

  const monthsRange = Array.from({ length: cm - startMonth + 1 }, (_, i) => startMonth + i);
  const inOut = monthsRange.map((m) => ({ month: MON[m], In: collected[m], Out: monthExpense(m) }));
  const profitByMonth = monthsRange.map((m) => ({ month: MON[m], Profit: collected[m] - monthExpense(m) }));
  const monthRows = monthsRange.map((m) => ({ month: MONTHS[m], inc: collected[m], out: monthExpense(m), profit: collected[m] - monthExpense(m) }));

  const stageCounts = new Map<string, number>();
  for (const r of (stageR.data ?? []) as { stage: string; count: number }[]) stageCounts.set(r.stage, Number(r.count));
  const ordersByStage = ORDER_STAGES.map((st) => ({ stage: STAGE_LABEL[st as OrderStatus], count: stageCounts.get(st) ?? 0 }));

  const owed = Number(s.owed_total ?? 0);
  const thisMonthOnce = expenses.filter((e) => {
    if (e.kind !== "once" || !e.incurred_on) return false;
    const [y, mo] = e.incurred_on.split("-").map(Number);
    return y === year && mo - 1 === cm;
  });

  const data: ReportsData = {
    monthLabel: MONTHS[cm], year,
    moneyIn, moneyOut, profit, owed,
    inProfit, toBreakEven, progress,
    inOut, profitByMonth,
    serviceRevenue: (serviceR.data ?? []).map((r: { name: string; value: number }) => ({ name: r.name, value: Number(r.value) })),
    collectedToday: Number(s.collected_today ?? 0),
    collectedWeek: Number(s.collected_week ?? 0),
    collectedMonth: collected[cm],
    outstanding: owed,
    monthRows,
    totalOrders: Number(s.total_orders ?? 0),
    avgOrderValue: Number(s.avg_value ?? 0),
    ordersByStage,
    totalCustomers: Number(s.total_customers ?? 0),
    owingCount: Number(s.owing_count ?? 0),
    topCustomers: (topR.data ?? []).map((r: { name: string; spend: number }) => ({ name: r.name, spend: Number(r.spend), balance: 0 })),
    owingCustomers: (owingR.data ?? []).map((r: { name: string; balance: number }) => ({ name: r.name, balance: Number(r.balance) })),
    recurring, thisMonthOnce,
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Your business at a glance, updated live"
        action={
          <Link
            href="/dashboard/reports/statement"
            className="flex h-11 items-center gap-1.5 rounded-xl border border-white/60 bg-white/40 px-4 text-sm font-semibold text-ink hover:bg-white/60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3v4a1 1 0 001 1h4M5 3h9l5 5v11a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM9 13h6M9 17h6" />
            </svg>
            Statement
          </Link>
        }
      />
      <ReportsView data={data} />
    </div>
  );
}
