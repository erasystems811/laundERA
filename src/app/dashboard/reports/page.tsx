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

  // All heavy aggregation runs in the database — the app only receives rolled-up rows.
  const [scalarsR, monthlyR, serviceR, stageR, topR, owingR, expensesR, bizR] = await Promise.all([
    supabase.rpc("reports_scalars"),
    supabase.rpc("reports_monthly", { p_year: year }),
    supabase.rpc("revenue_by_service"),
    supabase.rpc("orders_stage_counts"),
    supabase.rpc("top_customers", { p_limit: 8 }),
    supabase.rpc("owing_customers", { p_limit: 20 }),
    supabase.from("expenses").select("id, name, amount, kind, cadence, incurred_on").order("created_at", { ascending: false }),
    supabase.from("businesses").select("created_at").limit(1).single(),
  ]);

  const s = scalarsR.data?.[0] ?? {};
  const monthly = (monthlyR.data ?? []) as { month: number; collected: number; once_expense: number }[];
  const expenses = (expensesR.data ?? []).map((e) => ({ ...e, amount: Number(e.amount) }));

  const businessStart = bizR.data ? new Date(bizR.data.created_at) : now;
  const startMonth = businessStart.getFullYear() < year ? 0 : businessStart.getMonth();

  const recurring = expenses.filter((e) => e.kind === "recurring");
  const recurringPerMonth = recurring.reduce((a, e) => a + (e.cadence === "yearly" ? e.amount / 12 : e.amount), 0);

  const collected = Array(12).fill(0);
  const once = Array(12).fill(0);
  for (const m of monthly) {
    collected[m.month - 1] = Number(m.collected);
    once[m.month - 1] = Number(m.once_expense);
  }
  const monthExpense = (m: number) => recurringPerMonth + once[m];

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
      <PageHeader title="Reports" subtitle="Your business at a glance, updated live" />
      <ReportsView data={data} />
    </div>
  );
}
