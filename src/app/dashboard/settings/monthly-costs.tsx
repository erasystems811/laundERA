"use client";

import { useState, useTransition } from "react";
import { formatNaira } from "@/lib/format";
import { addRecurringExpense, updateExpense, deleteExpense } from "../reports/actions";

type Expense = { id: string; name: string; amount: number; cadence: "monthly" | "yearly" | null };

export function MonthlyCosts({ recurring }: { recurring: Expense[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "yearly">("monthly");
  const [isPending, startTransition] = useTransition();

  const totalPerMonth = recurring.reduce((s, e) => s + (e.cadence === "yearly" ? e.amount / 12 : e.amount), 0);

  function add() {
    if (!name.trim() || !Number(amount)) return;
    startTransition(async () => {
      await addRecurringExpense({ name: name.trim(), amount: Number(amount), cadence });
      setName(""); setAmount(""); setCadence("monthly"); setAdding(false);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monthly running costs</p>
          <p className="text-[11px] text-muted-2">Rent, light, salary — feeds your net profit</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-sm font-semibold text-teal-700">
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/40 p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What is it? (e.g. Rent)" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <div className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount (₦)" className="h-11 flex-1 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
            <div className="flex overflow-hidden rounded-lg border border-white/60">
              <button type="button" onClick={() => setCadence("monthly")} className={`px-3 text-sm font-medium ${cadence === "monthly" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>/month</button>
              <button type="button" onClick={() => setCadence("yearly")} className={`px-3 text-sm font-medium ${cadence === "yearly" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>/year</button>
            </div>
          </div>
          <button type="button" onClick={add} disabled={isPending} className="btn-primary h-11 rounded-lg text-sm font-medium text-white disabled:opacity-60">Add cost</button>
        </div>
      )}

      <div className="flex flex-col">
        {recurring.map((e) => <Row key={e.id} expense={e} isPending={isPending} start={startTransition} />)}
        {!recurring.length && !adding && (
          <p className="py-3 text-center text-sm text-muted">No monthly costs yet. Add rent, light, salary so the system knows your break-even.</p>
        )}
      </div>

      {recurring.length > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-sm">
          <span className="font-medium text-ink">Total monthly</span>
          <span className="font-mono font-bold tabular-nums text-teal-900">{formatNaira(totalPerMonth)}/mo</span>
        </div>
      )}
    </div>
  );
}

function Row({ expense, isPending, start }: { expense: Expense; isPending: boolean; start: (cb: () => void) => void }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount));
  const [cadence, setCadence] = useState<"monthly" | "yearly">(expense.cadence ?? "monthly");
  const perMonth = expense.cadence === "yearly" ? expense.amount / 12 : expense.amount;

  function save() {
    if (!Number(amount)) return;
    start(async () => { await updateExpense(expense.id, { amount: Number(amount), cadence }); setEditing(false); });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 border-b border-ink/5 py-2.5 last:border-b-0">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium text-ink">{expense.name}</span>
          <button type="button" onClick={() => start(() => deleteExpense(expense.id))} className="text-xs font-medium text-red-500">Remove</button>
        </div>
        <div className="flex gap-2">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className="h-10 flex-1 rounded-lg border border-teal-500 bg-white/60 px-3 font-mono text-sm tabular-nums text-ink outline-none" autoFocus />
          <div className="flex overflow-hidden rounded-lg border border-white/60">
            <button type="button" onClick={() => setCadence("monthly")} className={`px-2.5 text-xs font-medium ${cadence === "monthly" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>/mo</button>
            <button type="button" onClick={() => setCadence("yearly")} className={`px-2.5 text-xs font-medium ${cadence === "yearly" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>/yr</button>
          </div>
          <button type="button" onClick={save} disabled={isPending} className="text-sm font-semibold text-teal-700">Save</button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className="flex items-center justify-between border-b border-ink/5 py-2.5 text-left last:border-b-0">
      <div>
        <p className="text-[15px] font-medium text-ink">{expense.name}</p>
        {expense.cadence === "yearly" && <p className="text-xs text-muted">{formatNaira(expense.amount)}/year</p>}
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums text-teal-900">{formatNaira(perMonth)}<span className="text-xs font-normal text-muted">/mo</span></span>
    </button>
  );
}
