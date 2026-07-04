"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatNaira } from "@/lib/format";
import { addOnceExpense, deleteExpense } from "./actions";

type Expense = {
  id: string;
  name: string;
  amount: number;
  kind: "recurring" | "once";
  cadence: "monthly" | "yearly" | null;
  incurred_on: string | null;
};

// Monthly running costs now live in Settings. Here we only log one-off spends.
export function ExpenseManager({ thisMonth, monthLabel }: { thisMonth: Expense[]; monthLabel: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!name.trim() || !Number(amount)) return;
    const today = new Date().toISOString().slice(0, 10);
    startTransition(async () => {
      await addOnceExpense({ name: name.trim(), amount: Number(amount), incurredOn: today });
      setName(""); setAmount(""); setAdding(false);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">One-off spends · {monthLabel}</p>
          <p className="text-[11px] text-muted-2">
            Monthly costs (rent, salary…) are in <Link href="/dashboard/settings" className="text-teal-700">Settings</Link>
          </p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-sm font-semibold text-teal-700">
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/40 p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What was it? (e.g. Machine repair)" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount (₦)" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <button type="button" onClick={add} disabled={isPending} className="btn-primary h-11 rounded-lg text-sm font-medium text-white disabled:opacity-60">Add expense</button>
        </div>
      )}

      <div className="flex flex-col">
        {thisMonth.map((e) => (
          <div key={e.id} className="flex items-center justify-between border-b border-ink/5 py-2.5 last:border-b-0">
            <span className="text-[15px] text-ink">{e.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold tabular-nums text-teal-900">{formatNaira(e.amount)}</span>
              <button type="button" onClick={() => startTransition(() => deleteExpense(e.id))} className="text-xs font-medium text-red-500">✕</button>
            </div>
          </div>
        ))}
        {!thisMonth.length && !adding && (
          <p className="py-3 text-center text-sm text-muted">No one-off expenses logged this month.</p>
        )}
      </div>
    </div>
  );
}
