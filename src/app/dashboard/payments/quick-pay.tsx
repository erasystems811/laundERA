"use client";

import { useState, useTransition } from "react";
import { formatNaira } from "@/lib/format";
import { logPayment } from "../orders/[id]/actions";

export function QuickPay({ orderId, balance }: { orderId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [isPending, startTransition] = useTransition();

  function payFull() {
    startTransition(async () => {
      await logPayment(orderId, balance, method);
      setOpen(false);
    });
  }
  function payPart() {
    const v = Number(amount);
    if (!v) return;
    startTransition(async () => {
      await logPayment(orderId, Math.min(v, balance), method);
      setOpen(false);
      setAmount("");
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary h-9 rounded-lg px-4 text-xs font-semibold text-white">
        Record payment
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex overflow-hidden rounded-lg border border-white/60">
        <button type="button" onClick={() => setMethod("cash")} className={`px-2.5 py-1.5 text-xs font-medium ${method === "cash" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>Cash</button>
        <button type="button" onClick={() => setMethod("transfer")} className={`px-2.5 py-1.5 text-xs font-medium ${method === "transfer" ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>Transfer</button>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Part" className="h-9 w-20 rounded-lg border border-white/60 bg-white/60 px-2 font-mono text-xs tabular-nums text-ink outline-none focus:border-teal-500" />
      <button type="button" disabled={isPending || !Number(amount)} onClick={payPart} className="h-9 rounded-lg bg-teal-500/20 px-3 text-xs font-semibold text-teal-800 disabled:opacity-50">Save</button>
      <button type="button" disabled={isPending} onClick={payFull} className="btn-primary h-9 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-60">Full {formatNaira(balance)}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted">✕</button>
    </div>
  );
}
