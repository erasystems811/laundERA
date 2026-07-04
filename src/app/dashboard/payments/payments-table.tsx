"use client";

import Link from "next/link";
import { useState } from "react";
import { formatNaira } from "@/lib/format";
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

export function PaymentsTable({ rows, readOnly }: { rows: Row[]; readOnly: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.customer_name.toLowerCase().includes(q)) : rows;

  return (
    <>
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer…"
            className="h-11 w-full rounded-xl border border-white/60 bg-white/40 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
        </div>
      </div>

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
              {filtered.map((r) => (
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
              {!filtered.length && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">No match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
