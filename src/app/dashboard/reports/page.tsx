import { createClient } from "@/lib/supabase/server";
import { STAGE_LABEL, ORDER_STAGES, type OrderStatus } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ReportsView, type ReportsData } from "./reports-view";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase.from("orders").select("id, status, total, created_at, customer_id");
  const { data: items } = await supabase.from("order_items").select("service_name, quantity, unit_price");
  const { data: payments } = await supabase.from("payments").select("amount, created_at");
  const { data: expensesRaw } = await supabase
    .from("expenses").select("id, name, amount, kind, cadence, incurred_on").order("created_at", { ascending: false });
  const { data: customers } = await supabase.from("customers").select("id, name");
  const { data: businessRow } = await supabase.from("businesses").select("created_at").limit(1).single();

  const expenses = (expensesRaw ?? []).map((e) => ({ ...e, amount: Number(e.amount) }));

  const now = new Date();
  const year = now.getFullYear();
  const cm = now.getMonth();
  const businessStart = businessRow ? new Date(businessRow.created_at) : now;
  const startMonth = businessStart.getFullYear() < year ? 0 : businessStart.getMonth();

  const recurring = expenses.filter((e) => e.kind === "recurring");
  const recurringPerMonth = recurring.reduce((s, e) => s + (e.cadence === "yearly" ? e.amount / 12 : e.amount), 0);

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

  // Totals
  const totalBilled = (orders ?? []).reduce((s, o) => s + Number(o.total), 0);
  const totalCollected = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = totalBilled - totalCollected;

  // This month
  const moneyIn = collected[cm];
  const moneyOut = monthExpense(cm);
  const profit = moneyIn - moneyOut;
  const inProfit = moneyIn >= moneyOut && moneyOut > 0;
  const toBreakEven = Math.max(0, moneyOut - moneyIn);
  const progress = moneyOut > 0 ? Math.min(100, (moneyIn / moneyOut) * 100) : 0;

  // Charts
  const monthsRange = Array.from({ length: cm - startMonth + 1 }, (_, i) => startMonth + i);
  const inOut = monthsRange.map((m) => ({ month: MON[m], In: collected[m], Out: monthExpense(m) }));
  const profitByMonth = monthsRange.map((m) => ({ month: MON[m], Profit: collected[m] - monthExpense(m) }));
  const monthRows = monthsRange.map((m) => ({ month: MONTHS[m], inc: collected[m], out: monthExpense(m), profit: collected[m] - monthExpense(m) }));

  // Revenue by service (billed)
  const svc = new Map<string, number>();
  for (const it of items ?? []) svc.set(it.service_name, (svc.get(it.service_name) ?? 0) + Number(it.quantity) * Number(it.unit_price));
  const serviceRevenue = [...svc.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Today / week collected
  const startToday = new Date(year, cm, now.getDate()).getTime();
  const startWeek = startToday - 6 * 86400000;
  let collectedToday = 0, collectedWeek = 0;
  for (const p of payments ?? []) {
    const t = new Date(p.created_at).getTime();
    if (t >= startToday) collectedToday += Number(p.amount);
    if (t >= startWeek) collectedWeek += Number(p.amount);
  }

  // Orders
  const totalOrders = orders?.length ?? 0;
  const avgOrderValue = totalOrders ? totalBilled / totalOrders : 0;
  const stageCount = new Map<string, number>();
  for (const o of orders ?? []) stageCount.set(o.status, (stageCount.get(o.status) ?? 0) + 1);
  const ordersByStage = ORDER_STAGES.map((s) => ({ stage: STAGE_LABEL[s as OrderStatus], count: stageCount.get(s) ?? 0 }));

  // Customers
  const paidByOrder = new Map<string, number>();
  // recompute per-order paid needs order_id; refetch lightweight
  const { data: pay2 } = await supabase.from("payments").select("order_id, amount");
  for (const p of pay2 ?? []) paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount));
  const custSpend = new Map<string, { spend: number; balance: number }>();
  const { data: ord2 } = await supabase.from("orders").select("id, customer_id, total");
  for (const o of ord2 ?? []) {
    const cur = custSpend.get(o.customer_id) ?? { spend: 0, balance: 0 };
    cur.spend += Number(o.total);
    cur.balance += Number(o.total) - (paidByOrder.get(o.id) ?? 0);
    custSpend.set(o.customer_id, cur);
  }
  const nameById = new Map((customers ?? []).map((c) => [c.id, c.name]));
  const custRows = [...custSpend.entries()].map(([id, v]) => ({ name: nameById.get(id) ?? "Unknown", ...v }));
  const topCustomers = [...custRows].sort((a, b) => b.spend - a.spend).slice(0, 8);
  const owingCustomers = custRows.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);

  const thisMonthOnce = expenses.filter((e) => {
    if (e.kind !== "once" || !e.incurred_on) return false;
    const [y, mo] = e.incurred_on.split("-").map(Number);
    return y === year && mo - 1 === cm;
  });

  const data: ReportsData = {
    monthLabel: MONTHS[cm], year,
    moneyIn, moneyOut, profit, owed: Math.max(0, outstanding),
    inProfit, toBreakEven, progress,
    inOut, profitByMonth, serviceRevenue,
    collectedToday, collectedWeek, collectedMonth: collected[cm], outstanding: Math.max(0, outstanding),
    monthRows,
    totalOrders, avgOrderValue, ordersByStage,
    totalCustomers: customers?.length ?? 0,
    owingCount: owingCustomers.length,
    topCustomers, owingCustomers,
    recurring, thisMonthOnce,
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Your business at a glance, updated live" />
      <ReportsView data={data} />
    </div>
  );
}
