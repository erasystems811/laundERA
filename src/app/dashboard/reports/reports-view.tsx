"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";
import { InOutChart, ProfitChart, ServiceRevenueChart } from "./charts";
import { ExpenseManager } from "./expense-manager";

type Expense = {
  id: string;
  name: string;
  amount: number;
  kind: "recurring" | "once";
  cadence: "monthly" | "yearly" | null;
  incurred_on: string | null;
};

export type ReportsData = {
  monthLabel: string;
  year: number;
  moneyIn: number;
  moneyOut: number;
  profit: number;
  owed: number;
  inProfit: boolean;
  toBreakEven: number;
  progress: number;
  inOut: { month: string; In: number; Out: number }[];
  profitByMonth: { month: string; Profit: number }[];
  serviceRevenue: { name: string; value: number }[];
  collectedToday: number;
  collectedWeek: number;
  collectedMonth: number;
  outstanding: number;
  monthRows: { month: string; inc: number; out: number; profit: number }[];
  totalOrders: number;
  avgOrderValue: number;
  ordersByStage: { stage: string; count: number }[];
  totalCustomers: number;
  owingCount: number;
  topCustomers: { name: string; spend: number; balance: number }[];
  owingCustomers: { name: string; balance: number }[];
  recurring: Expense[];
  thisMonthOnce: Expense[];
  supplies: SupplyStat[];
};

export type SupplyStat = {
  id: string; name: string; unit: string; quantity: number;
  totalUsed: number; totalRestocked: number; restockCount: number;
  avgDailyUse: number; daysLeft: number | null; daysTracked: number;
};

const TABS = ["Overview", "Revenue", "Expenses", "Orders", "Customers", "Supplies"] as const;
type Tab = (typeof TABS)[number];

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "in" | "out" | "profit" }) {
  const color =
    tone === "in" ? "text-green-700" : tone === "out" ? "text-red-600" : "text-teal-900";
  return (
    <div className="glass-card rounded-2xl p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      {title && <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>}
      {children}
    </div>
  );
}

export function ReportsView({ data }: { data: ReportsData }) {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div>
      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl bg-white/40 p-1 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-teal-500/25 text-teal-800 shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={`Money in · ${data.monthLabel}`} value={formatNaira(data.moneyIn)} tone="in" />
            <StatTile label="Money out" value={formatNaira(data.moneyOut)} tone="out" />
            <StatTile label="Profit" value={formatNaira(data.profit)} tone="profit" />
            <StatTile label="Owed to you" value={formatNaira(data.owed)} />
          </div>

          <Panel title={`Break-even · ${data.monthLabel}`}>
            {data.moneyOut === 0 ? (
              <p className="text-sm text-muted">Add your monthly costs in the Expenses tab to see break-even.</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <p className={`font-mono text-3xl font-bold tabular-nums ${data.inProfit ? "text-green-700" : "text-amber-600"}`}>
                    {data.inProfit ? formatNaira(data.profit) : formatNaira(data.toBreakEven)}
                  </p>
                  <p className="text-sm font-medium text-ink">{data.inProfit ? "in profit" : "left to break even"}</p>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <div
                    className={`h-full rounded-full ${data.inProfit ? "bg-green-500" : "bg-gradient-to-r from-teal-500 to-teal-700"}`}
                    style={{ width: `${data.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Collected {formatNaira(data.moneyIn)} of {formatNaira(data.moneyOut)} needed
                </p>
              </>
            )}
          </Panel>

          <Panel title={`Money in vs out · ${data.year}`}>
            <InOutChart data={data.inOut} />
          </Panel>
        </div>
      )}

      {tab === "Revenue" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Collected today" value={formatNaira(data.collectedToday)} tone="in" />
            <StatTile label="This week" value={formatNaira(data.collectedWeek)} tone="in" />
            <StatTile label={`This month`} value={formatNaira(data.collectedMonth)} tone="in" />
            <StatTile label="Outstanding" value={formatNaira(data.outstanding)} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Revenue by service">
              {data.serviceRevenue.length ? (
                <ServiceRevenueChart data={data.serviceRevenue} />
              ) : (
                <p className="py-8 text-center text-sm text-muted">No revenue yet.</p>
              )}
            </Panel>
            <Panel title={`${data.year} · collected month by month`}>
              <Table
                head={["Month", "In", "Out", "Profit"]}
                rows={data.monthRows.map((r) => [
                  r.month,
                  <span key="i" className="font-mono tabular-nums text-green-700">{formatNaira(r.inc)}</span>,
                  <span key="o" className="font-mono tabular-nums text-red-600">{formatNaira(r.out)}</span>,
                  <span key="p" className={`font-mono font-semibold tabular-nums ${r.profit >= 0 ? "text-teal-900" : "text-red-600"}`}>{formatNaira(r.profit)}</span>,
                ])}
              />
            </Panel>
          </div>
        </div>
      )}

      {tab === "Expenses" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <ExpenseManager thisMonth={data.thisMonthOnce} monthLabel={data.monthLabel} />
          <Panel title={`Profit & loss · ${data.year}`}>
            <ProfitChart data={data.profitByMonth} />
          </Panel>
        </div>
      )}

      {tab === "Orders" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile label="Total orders" value={String(data.totalOrders)} />
            <StatTile label="Average order value" value={formatNaira(data.avgOrderValue)} />
            <StatTile label="Owed to you" value={formatNaira(data.owed)} />
          </div>
          <Panel title="Orders by stage">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {data.ordersByStage.map((s) => (
                <div key={s.stage} className="rounded-2xl bg-white/40 p-4 text-center">
                  <p className="font-mono text-2xl font-bold tabular-nums text-teal-900">{s.count}</p>
                  <p className="mt-0.5 text-xs text-muted">{s.stage}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === "Customers" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total customers" value={String(data.totalCustomers)} />
            <StatTile label="Customers owing" value={String(data.owingCount)} />
            <StatTile label="Total owed" value={formatNaira(data.owed)} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Top customers by spend">
              <Table
                head={["Customer", "Spend"]}
                rows={data.topCustomers.map((c) => [
                  c.name,
                  <span key="s" className="font-mono font-semibold tabular-nums text-teal-900">{formatNaira(c.spend)}</span>,
                ])}
              />
            </Panel>
            <Panel title="Customers owing">
              {data.owingCustomers.length ? (
                <Table
                  head={["Customer", "Owing"]}
                  rows={data.owingCustomers.map((c) => [
                    c.name,
                    <span key="b" className="font-mono font-semibold tabular-nums text-red-600">{formatNaira(c.balance)}</span>,
                  ])}
                />
              ) : (
                <p className="py-8 text-center text-sm text-muted">Everyone is paid up.</p>
              )}
            </Panel>
          </div>
        </div>
      )}

      {tab === "Supplies" && <SuppliesPanel supplies={data.supplies} />}
    </div>
  );
}

function SuppliesPanel({ supplies }: { supplies: SupplyStat[] }) {
  if (!supplies.length) {
    return <p className="glass-card rounded-2xl px-6 py-16 text-center text-sm text-muted">No supplies tracked yet. Add supplies in Inventory and log usage/restock to see this report.</p>;
  }
  const used = supplies.filter((s) => s.totalUsed > 0);
  const fastest = [...used].sort((a, b) => b.avgDailyUse - a.avgDailyUse)[0];
  const mostRestocked = [...supplies].sort((a, b) => b.restockCount - a.restockCount)[0];
  const soonest = [...supplies].filter((s) => s.daysLeft !== null).sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))[0];
  const dl = (d: number | null) => (d === null ? "—" : d >= 1 ? `${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}` : "< 1 day");

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">Finishes fastest</p>
          <p className="mt-1 text-lg font-bold text-teal-900">{fastest ? fastest.name : "—"}</p>
          {fastest && <p className="text-xs text-muted-2">{fastest.avgDailyUse.toFixed(1)} {fastest.unit}/day used</p>}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">Most restocked</p>
          <p className="mt-1 text-lg font-bold text-teal-900">{mostRestocked?.restockCount ? mostRestocked.name : "—"}</p>
          {!!mostRestocked?.restockCount && <p className="text-xs text-muted-2">restocked {mostRestocked.restockCount}×</p>}
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">Runs out soonest</p>
          <p className="mt-1 text-lg font-bold text-teal-900">{soonest ? soonest.name : "—"}</p>
          {soonest && <p className="text-xs text-muted-2">lasts ~{dl(soonest.daysLeft)}</p>}
        </div>
      </div>

      <Panel title="Every supply — usage & how long it lasts">
        <Table
          head={["Item", "In stock", "Used/day", "Lasts ~", "Total used", "Restocks"]}
          rows={supplies.map((s) => [
            s.name,
            <span key="q" className="font-mono tabular-nums text-ink">{s.quantity} {s.unit}</span>,
            <span key="a" className="font-mono tabular-nums text-ink">{s.avgDailyUse > 0 ? s.avgDailyUse.toFixed(1) : "—"}</span>,
            <span key="d" className="font-mono tabular-nums text-teal-900">{dl(s.daysLeft)}</span>,
            <span key="u" className="font-mono tabular-nums text-muted">{s.totalUsed} {s.unit}</span>,
            <span key="r" className="font-mono tabular-nums text-muted">{s.restockCount}×</span>,
          ])}
        />
      </Panel>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
            {head.map((h, i) => (
              <th key={i} className={`pb-2 ${i > 0 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-ink/5 last:border-b-0">
              {r.map((cell, ci) => (
                <td key={ci} className={`py-2.5 ${ci > 0 ? "text-right" : "font-medium text-ink"}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
