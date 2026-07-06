"use client";

import { useState, useTransition } from "react";
import { formatNaira } from "@/lib/format";
import { setOrderItemQuantity } from "./actions";

type Item = { id: string; service_name: string; quantity: number; unit_price: number };

export function OrderItemsEditor({ orderId, items, readOnly }: { orderId: string; items: Item[]; readOnly: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function change(id: string, q: number) {
    setPendingId(id);
    startTransition(async () => {
      await setOrderItemQuantity(orderId, id, q);
      setPendingId(null);
    });
  }

  return (
    <div className="mb-4 flex flex-col">
      {items.map((item) => {
        const busy = isPending && pendingId === item.id;
        return (
          <div key={item.id} className={`flex items-center justify-between gap-2 border-b border-ink/10 py-2.5 text-[15px] last:border-b-0 ${busy ? "opacity-50" : ""}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-ink">{item.service_name}</span>
              {readOnly ? (
                <span className="text-muted">× {item.quantity}</span>
              ) : (
                <span className="flex items-center gap-1">
                  <button type="button" disabled={busy} onClick={() => change(item.id, item.quantity - 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/60 text-ink disabled:opacity-50">−</button>
                  <span className="w-6 text-center font-mono tabular-nums text-ink">{item.quantity}</span>
                  <button type="button" disabled={busy} onClick={() => change(item.id, item.quantity + 1)} className="flex h-6 w-6 items-center justify-center rounded-md bg-white/60 text-ink disabled:opacity-50">+</button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-ink">{formatNaira(item.quantity * Number(item.unit_price))}</span>
              {!readOnly && (
                <button type="button" disabled={busy} onClick={() => change(item.id, 0)} title="Remove item" className="flex h-6 w-6 items-center justify-center rounded-md text-red-500 hover:bg-red-500/10 disabled:opacity-50">✕</button>
              )}
            </div>
          </div>
        );
      })}
      {!items.length && <p className="py-3 text-sm text-muted">No items on this order.</p>}
    </div>
  );
}
