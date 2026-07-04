"use client";

import { useState, useTransition } from "react";
import { ServiceIcon } from "@/components/service-icon";
import { formatNaira } from "@/lib/format";
import { addItemsToOrder } from "./actions";

type Service = { id: string; name: string; icon: string; price: number };

export function AddItems({ orderId, services }: { orderId: string; services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  const added = services.reduce((s, sv) => s + (qtys[sv.id] ?? 0) * Number(sv.price), 0);
  const hasItems = Object.values(qtys).some((q) => q > 0);

  function bump(id: string, d: number) {
    setQtys((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) + d) }));
  }

  function save() {
    const items = Object.entries(qtys).filter(([, q]) => q > 0).map(([serviceId, quantity]) => ({ serviceId, quantity }));
    if (!items.length) return;
    startTransition(async () => {
      await addItemsToOrder(orderId, items);
      setQtys({});
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-xl border border-white/60 bg-white/40 text-sm font-medium text-ink hover:bg-white/60">
        + Add more items
      </button>
    );
  }

  return (
    <div className="glass-card flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add more clothes</p>
        <button type="button" onClick={() => { setOpen(false); setQtys({}); }} className="text-xs font-medium text-muted">Cancel</button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {services.map((s) => {
          const qty = qtys[s.id] ?? 0;
          return (
            <button key={s.id} type="button" onClick={() => bump(s.id, 1)} className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center text-[11px] font-semibold transition-colors ${qty > 0 ? "border-teal-500 bg-teal-500/10 text-teal-900" : "border-white/60 bg-white/25 text-ink"}`}>
              <ServiceIcon icon={s.icon} className="h-5 w-5" />
              <span>{s.name}</span>
              {qty > 0 && (
                <>
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 font-mono text-[10px] text-white shadow">{qty}</span>
                  <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); bump(s.id, -1); }} className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-white/70 bg-white text-ink shadow">−</span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" disabled={isPending || !hasItems} onClick={save} className="btn-primary h-11 rounded-xl text-sm font-semibold text-white disabled:opacity-60">
        {isPending ? "Adding…" : hasItems ? `Add ${formatNaira(added)} to order` : "Tap items to add"}
      </button>
    </div>
  );
}
