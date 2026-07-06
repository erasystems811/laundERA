"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  STAGE_LABEL,
  STAGE_PILL_CLASS,
  NEXT_STAGES,
  TERMINAL_STAGES,
  isTerminal,
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

// Delivered + Picked Up are both "done" — grouped into one visible column so completed
// orders don't slide off the right edge of the board.
const COLUMNS: { key: string; label: string; accent: string; statuses: OrderStatus[] }[] = [
  { key: "collected", label: "Collected", accent: "bg-slate-400", statuses: ["collected"] },
  { key: "processing", label: "Processing", accent: "bg-amber-400", statuses: ["processing"] },
  { key: "ready", label: "Ready", accent: "bg-violet-400", statuses: ["ready"] },
  { key: "in_transit", label: "With Rider", accent: "bg-blue-400", statuses: ["in_transit"] },
  { key: "done", label: "Done", accent: "bg-green-400", statuses: ["delivered", "picked_up"] },
];

export function PipelineBoard({ orders, readOnly }: { orders: BoardOrder[]; readOnly: boolean }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? orders.filter(
        (o) => o.customerName.toLowerCase().includes(q) || String(o.total).includes(q)
      )
    : orders;

  const grouped = COLUMNS.map((col) => ({
    col,
    orders: filtered.filter((o) => col.statuses.includes(o.status)),
  }));

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
            placeholder="Search orders by customer…"
            className="h-11 w-full rounded-xl border border-white/60 bg-white/40 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
        </div>
        {q && (
          <p className="mt-1.5 px-1 text-xs text-muted">
            {filtered.length} match{filtered.length === 1 ? "" : "es"} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {grouped.map(({ col, orders: colOrders }) => (
        <div key={col.key} className="flex w-60 shrink-0 flex-col">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${col.accent}`} />
              <span className="text-sm font-semibold text-ink">{col.label}</span>
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
    </>
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
        {isTerminal(order.status) && (
          <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_PILL_CLASS[order.status]}`}>
            ✓ {STAGE_LABEL[order.status]}
          </span>
        )}
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
