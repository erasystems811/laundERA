"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ORDER_STAGES,
  STAGE_LABEL,
  NEXT_STAGES,
  TERMINAL_STAGES,
  formatNaira,
  type OrderStatus,
} from "@/lib/format";
import { moveOrderStage } from "./orders/[id]/actions";

export type BoardOrder = {
  id: string;
  customerName: string;
  itemCount: number;
  total: number;
  balance: number;
  droppedOffBy: string | null;
  status: OrderStatus;
  createdAt: string;
};

const COLUMN_ACCENT: Record<OrderStatus, string> = {
  collected: "bg-slate-400",
  processing: "bg-amber-400",
  ready: "bg-violet-400",
  in_transit: "bg-blue-400",
  delivered: "bg-green-400",
  picked_up: "bg-emerald-400",
};

export function PipelineBoard({ orders, readOnly }: { orders: BoardOrder[]; readOnly: boolean }) {
  const grouped = ORDER_STAGES.map((stage) => ({
    stage,
    orders: orders.filter((o) => o.status === stage),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {grouped.map(({ stage, orders: colOrders }) => (
        <div key={stage} className="flex w-72 shrink-0 flex-col">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_ACCENT[stage]}`} />
              <span className="text-sm font-semibold text-ink">{STAGE_LABEL[stage]}</span>
            </div>
            <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-semibold text-muted">
              {colOrders.length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            {colOrders.map((order) => (
              <OrderCard key={order.id} order={order} readOnly={readOnly} />
            ))}
            {!colOrders.length && (
              <div className="rounded-2xl border border-dashed border-ink/10 py-6 text-center text-xs text-muted-2">
                Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ order, readOnly }: { order: BoardOrder; readOnly: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [collectingFor, setCollectingFor] = useState<OrderStatus | null>(null);
  const [receiver, setReceiver] = useState(order.customerName);

  const nexts = NEXT_STAGES[order.status];

  function choose(to: OrderStatus) {
    // Delivered / Picked Up need the receiver's name first.
    if (TERMINAL_STAGES.includes(to)) {
      setCollectingFor(to);
      return;
    }
    startTransition(() => moveOrderStage(order.id, order.status, to));
  }

  function confirmTerminal() {
    if (!collectingFor) return;
    startTransition(async () => {
      await moveOrderStage(order.id, order.status, collectingFor, receiver);
      setCollectingFor(null);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-3.5">
      <button type="button" onClick={() => router.push(`/dashboard/orders/${order.id}`)} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{order.customerName}</span>
          <span className="flex-shrink-0 font-mono text-sm font-semibold tabular-nums text-teal-900">
            {formatNaira(order.total)}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span>{order.itemCount} {order.itemCount === 1 ? "item" : "items"}</span>
          <span>·</span>
          <span>{new Date(order.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
          {order.balance > 0 && (
            <>
              <span>·</span>
              <span className="font-medium text-red-500">{formatNaira(order.balance)} owing</span>
            </>
          )}
        </div>
        {order.droppedOffBy && <p className="mt-1 text-[11px] text-muted-2">Dropped by {order.droppedOffBy}</p>}
      </button>

      {!readOnly && nexts.length > 0 && (
        <div className="mt-3 border-t border-ink/5 pt-2.5">
          {collectingFor ? (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Who {collectingFor === "picked_up" ? "collected" : "received"} it?
              </p>
              <input
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                placeholder="Name"
                className="h-9 w-full rounded-lg border border-teal-500 bg-white/60 px-3 text-sm text-ink outline-none placeholder:text-muted-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setCollectingFor(null)} className="h-9 flex-1 rounded-lg bg-white/50 text-xs font-medium text-muted">Cancel</button>
                <button type="button" disabled={isPending || !receiver.trim()} onClick={confirmTerminal} className="btn-primary h-9 flex-1 rounded-lg text-xs font-semibold text-white disabled:opacity-60">
                  Mark {STAGE_LABEL[collectingFor]}
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex ${nexts.length > 1 ? "flex-col" : ""} gap-1.5`}>
              {nexts.map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={isPending}
                  onClick={() => choose(to)}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-500/15 text-xs font-semibold text-teal-800 hover:bg-teal-500/25 disabled:opacity-60"
                >
                  {STAGE_LABEL[to]}
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
