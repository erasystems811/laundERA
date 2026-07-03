"use client";

import { useState, useTransition } from "react";
import { NEXT_STAGE, STAGE_LABEL, type OrderStatus } from "@/lib/format";
import { advanceStage, logPayment, generateInvoice } from "./actions";

const METHODS: { value: "cash" | "transfer" | "card"; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Transfer" },
  { value: "card", label: "Card" },
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
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [method, setMethod] = useState<"cash" | "transfer" | "card">("cash");

  const next = NEXT_STAGE[status];

  function handleAdvance() {
    startTransition(() => advanceStage(orderId, status));
  }

  function handleLogPayment() {
    const value = Number(amount);
    if (!value || value <= 0) return;
    startTransition(async () => {
      await logPayment(orderId, value, method);
      setShowPayment(false);
    });
  }

  function handleInvoice() {
    startTransition(() => generateInvoice(orderId));
  }

  return (
    <div className="flex flex-col gap-3">
      {showPayment && (
        <div className="glass-card flex flex-col gap-3 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Log payment</p>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Amount"
            className="h-12 w-full rounded-xl border border-white/60 bg-white/40 px-4 font-mono text-[15px] tabular-nums text-ink outline-none focus:border-teal-500"
          />
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`h-10 flex-1 rounded-xl text-sm font-medium transition-colors ${
                  method === m.value
                    ? "bg-teal-500/20 text-teal-800"
                    : "bg-white/40 text-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleLogPayment}
            className="btn-primary h-12 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          >
            Save Payment
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {balance > 0 && !showPayment && (
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="h-14 flex-1 rounded-2xl border border-white/60 bg-white/40 text-[15px] font-medium text-ink backdrop-blur-sm hover:bg-white/60"
          >
            Log Payment
          </button>
        )}
        <button
          type="button"
          onClick={handleInvoice}
          disabled={isPending}
          className="h-14 flex-1 rounded-2xl border border-white/60 bg-white/40 text-[15px] font-medium text-ink backdrop-blur-sm hover:bg-white/60 disabled:opacity-60"
        >
          Invoice
        </button>
      </div>

      {next && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleAdvance}
          className="btn-primary h-14 w-full rounded-2xl text-lg font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Updating…" : `Mark ${STAGE_LABEL[next]}`}
        </button>
      )}
    </div>
  );
}
