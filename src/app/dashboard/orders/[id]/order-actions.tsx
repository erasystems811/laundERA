"use client";

import { useState, useTransition } from "react";
import { NEXT_STAGES, TERMINAL_STAGES, STAGE_LABEL, formatNaira, type OrderStatus } from "@/lib/format";
import { moveOrderStage, logPayment, generateInvoice } from "./actions";

const METHODS: { value: "cash" | "transfer" | "card"; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
];

export function OrderActions({
  orderId,
  status,
  balance,
}: {
  orderId: string;
  status: OrderStatus;
  balance: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");
  const [collectingFor, setCollectingFor] = useState<OrderStatus | null>(null);
  const [receiver, setReceiver] = useState("");

  const nexts = NEXT_STAGES[status];

  function choose(to: OrderStatus) {
    if (TERMINAL_STAGES.includes(to)) {
      setCollectingFor(to);
      return;
    }
    startTransition(() => moveOrderStage(orderId, status, to));
  }

  function confirmTerminal() {
    if (!collectingFor) return;
    startTransition(async () => {
      await moveOrderStage(orderId, status, collectingFor, receiver);
      setCollectingFor(null);
    });
  }

  function handlePayFull() {
    startTransition(async () => {
      await logPayment(orderId, balance, method);
      setShowPayment(false);
      setAmount("");
    });
  }

  function handlePayPart() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    startTransition(async () => {
      await logPayment(orderId, Math.min(value, balance), method);
      setShowPayment(false);
      setAmount("");
    });
  }

  function handleInvoice() {
    startTransition(() => generateInvoice(orderId));
  }

  return (
    <div className="flex flex-col gap-3">
      {showPayment && (
        <div className="glass-card flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Record payment</p>
            <p className="text-sm text-muted">
              Balance <span className="font-mono font-semibold tabular-nums text-teal-900">{formatNaira(balance)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)} className={`h-10 flex-1 rounded-xl text-sm font-medium transition-colors ${method === m.value ? "bg-teal-500/20 text-teal-800" : "bg-white/40 text-muted"}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={isPending} onClick={handlePayFull} className="btn-primary h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-60">
            Paid in full — {formatNaira(balance)}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">or part paid:</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Amount" className="h-10 flex-1 rounded-xl border border-white/60 bg-white/40 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
            <button type="button" disabled={isPending || !Number(amount)} onClick={handlePayPart} className="h-10 rounded-xl bg-teal-500/20 px-4 text-sm font-semibold text-teal-800 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {balance > 0 && !showPayment && (
          <button type="button" onClick={() => setShowPayment(true)} className="h-14 flex-1 rounded-2xl border border-white/60 bg-white/40 text-[15px] font-medium text-ink backdrop-blur-sm hover:bg-white/60">
            Record Payment
          </button>
        )}
        <button type="button" onClick={handleInvoice} disabled={isPending} className="h-14 flex-1 rounded-2xl border border-white/60 bg-white/40 text-[15px] font-medium text-ink backdrop-blur-sm hover:bg-white/60 disabled:opacity-60">
          Invoice
        </button>
      </div>

      {collectingFor ? (
        <div className="glass-card flex flex-col gap-2 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Who {collectingFor === "picked_up" ? "collected" : "received"} it?
          </p>
          <input value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Name" className="h-11 w-full rounded-xl border border-teal-500 bg-white/60 px-4 text-[15px] text-ink outline-none placeholder:text-muted-2" autoFocus />
          <div className="flex gap-2">
            <button type="button" onClick={() => setCollectingFor(null)} className="h-11 flex-1 rounded-xl bg-white/50 text-sm font-medium text-muted">Cancel</button>
            <button type="button" disabled={isPending || !receiver.trim()} onClick={confirmTerminal} className="btn-primary h-11 flex-1 rounded-xl text-sm font-semibold text-white disabled:opacity-60">Mark {STAGE_LABEL[collectingFor]}</button>
          </div>
        </div>
      ) : (
        nexts.length > 0 && (
          <div className={`flex gap-2 ${nexts.length > 1 ? "flex-col sm:flex-row" : ""}`}>
            {nexts.map((to) => (
              <button key={to} type="button" disabled={isPending} onClick={() => choose(to)} className="btn-primary h-14 flex-1 rounded-2xl text-[15px] font-medium text-white disabled:opacity-60">
                {isPending ? "Updating…" : `Mark ${STAGE_LABEL[to]}`}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
