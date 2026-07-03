"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { addSupplyItem, adjustSupply, deleteSupplyItem } from "./actions";

type SupplyItem = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  low_threshold: number;
};

type ClothesOrder = { id: string; customerName: string; count: number; status: OrderStatus };

type Clothes = {
  total: number;
  byStage: { collected: number; processing: number; ready: number };
  orders: ClothesOrder[];
};

export function InventoryTabs({ supplies, clothes }: { supplies: SupplyItem[]; clothes: Clothes }) {
  const [tab, setTab] = useState<"supplies" | "clothes">("supplies");

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card flex rounded-2xl p-1">
        {(["supplies", "clothes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              tab === t ? "bg-teal-500/20 text-teal-800" : "text-muted"
            }`}
          >
            {t === "supplies" ? "Supplies" : "Clothes in store"}
          </button>
        ))}
      </div>

      {tab === "supplies" ? <Supplies items={supplies} /> : <ClothesInStore clothes={clothes} />}
    </div>
  );
}

function Supplies({ items }: { items: SupplyItem[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [qty, setQty] = useState("");
  const [low, setLow] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addSupplyItem({
        name: name.trim(),
        unit: unit.trim() || "pcs",
        quantity: Number(qty) || 0,
        lowThreshold: Number(low) || 0,
      });
      setName("");
      setUnit("pcs");
      setQty("");
      setLow("");
      setAdding(false);
    });
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Supplies</p>
          <p className="text-[11px] text-muted-2">Detergent, starch, nylon, hangers…</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="text-sm font-semibold text-teal-700">
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/40 p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name (e.g. Detergent)"
            className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
          <div className="flex gap-2">
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              placeholder="Start qty"
              className="h-11 flex-1 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit"
              className="h-11 w-24 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
            />
          </div>
          <input
            value={low}
            onChange={(e) => setLow(e.target.value)}
            inputMode="numeric"
            placeholder="Warn me when it drops to… (low mark)"
            className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
          <button type="button" onClick={add} disabled={isPending} className="btn-primary h-11 rounded-lg text-sm font-medium text-white disabled:opacity-60">
            Add item
          </button>
        </div>
      )}

      <div className="flex flex-col">
        {items.map((item) => (
          <SupplyRow key={item.id} item={item} isPending={isPending} start={startTransition} />
        ))}
        {!items.length && !adding && (
          <p className="py-3 text-center text-sm text-muted">
            No supplies yet. Add what you use so you never run out unexpectedly.
          </p>
        )}
      </div>
    </div>
  );
}

function SupplyRow({
  item,
  isPending,
  start,
}: {
  item: SupplyItem;
  isPending: boolean;
  start: (cb: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const low = item.quantity <= item.low_threshold;

  function adjust(direction: "in" | "out") {
    const n = Number(amount);
    if (!n) return;
    start(async () => {
      await adjustSupply({ itemId: item.id, direction, quantity: n });
      setAmount("");
      setOpen(false);
    });
  }

  return (
    <div className="border-b border-ink/5 py-2.5 last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-ink">{item.name}</span>
          {low && (
            <span className="rounded-full bg-red-100/70 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              Low
            </span>
          )}
        </div>
        <span className={`font-mono text-sm font-semibold tabular-nums ${low ? "text-red-600" : "text-teal-900"}`}>
          {item.quantity} <span className="text-xs font-normal text-muted">{item.unit}</span>
        </span>
      </button>

      {open && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Qty"
            className="h-10 w-20 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-sm tabular-nums text-ink outline-none focus:border-teal-500"
            autoFocus
          />
          <button type="button" onClick={() => adjust("in")} disabled={isPending} className="h-10 flex-1 rounded-lg bg-teal-500/20 text-sm font-semibold text-teal-800">
            + Stock in
          </button>
          <button type="button" onClick={() => adjust("out")} disabled={isPending} className="h-10 flex-1 rounded-lg bg-amber-100/70 text-sm font-semibold text-amber-700">
            − Take out
          </button>
          <button type="button" onClick={() => start(() => deleteSupplyItem(item.id))} className="px-1 text-xs font-medium text-red-500">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function ClothesInStore({ clothes }: { clothes: Clothes }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="font-mono text-4xl font-bold tabular-nums text-teal-900">{clothes.total}</p>
        <p className="mt-1 text-sm text-muted">garments in your shop right now</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["collected", "processing", "ready"] as const).map((s) => (
          <div key={s} className="glass-card rounded-2xl p-4 text-center">
            <p className="font-mono text-2xl font-bold tabular-nums text-teal-900">{clothes.byStage[s]}</p>
            <p className="mt-0.5 text-xs text-muted">{STAGE_LABEL[s]}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Whose clothes</p>
        <div className="flex flex-col">
          {clothes.orders.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
              className="flex items-center justify-between border-b border-ink/5 py-2.5 last:border-b-0 transition-transform active:scale-[0.99]"
            >
              <div>
                <p className="text-[15px] font-medium text-ink">{o.customerName}</p>
                <p className="text-xs text-muted">{o.count} {o.count === 1 ? "item" : "items"}</p>
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_PILL_CLASS[o.status]}`}>
                {STAGE_LABEL[o.status]}
              </span>
            </Link>
          ))}
          {!clothes.orders.length && (
            <p className="py-3 text-center text-sm text-muted">No clothes in the shop right now.</p>
          )}
        </div>
      </div>
    </div>
  );
}
