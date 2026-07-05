"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { STAGE_LABEL, STAGE_PILL_CLASS, type OrderStatus } from "@/lib/format";
import { addSupplyItem, adjustSupply, deleteSupplyItem } from "./actions";

type SupplyItem = { id: string; name: string; unit: string; quantity: number; low_threshold: number };
type ClothesOrder = { id: string; customerName: string; count: number; breakdown: { name: string; qty: number }[]; status: OrderStatus; droppedOffBy: string | null };
type Clothes = { total: number; byStage: { collected: number; processing: number; ready: number }; orders: ClothesOrder[] };
export type SupplyActivity = { id: string; item_name: string; direction: "in" | "out"; quantity: number; note: string | null; who: string | null; created_at: string };

export function InventoryTabs({
  supplies,
  clothes,
  activity,
  readOnly,
}: {
  supplies: SupplyItem[];
  clothes: Clothes;
  activity: SupplyActivity[];
  readOnly: boolean;
}) {
  const [tab, setTab] = useState<"supplies" | "clothes">("supplies");

  return (
    <div>
      <div className="mb-6 inline-flex gap-1 rounded-2xl bg-white/40 p-1 backdrop-blur">
        {(["supplies", "clothes"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-teal-500/25 text-teal-800 shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t === "supplies" ? "Supplies" : "Clothes in store"}
          </button>
        ))}
      </div>

      {tab === "supplies" ? <Supplies items={supplies} activity={activity} readOnly={readOnly} /> : <ClothesInStore clothes={clothes} />}
    </div>
  );
}

function ActivityLog({ activity }: { activity: SupplyActivity[] }) {
  if (!activity.length) return null;
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <p className="border-b border-ink/10 px-5 py-4 text-sm font-semibold text-ink">Usage &amp; restock history</p>
      <ul className="divide-y divide-ink/5">
        {activity.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${a.direction === "in" ? "bg-teal-500/15 text-teal-700" : "bg-amber-100/70 text-amber-700"}`}>
              {a.direction === "in" ? "+" : "−"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-ink">
                <span className="font-semibold">{a.direction === "in" ? "Restocked" : "Used"} {a.quantity}</span> — {a.item_name}
                {a.note ? <span className="text-muted"> · {a.note}</span> : null}
              </p>
              <p className="text-xs text-muted-2">
                {a.who ? `${a.who} · ` : ""}
                {new Date(a.created_at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/60 bg-white/40 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
      />
    </div>
  );
}

function Supplies({ items, activity, readOnly }: { items: SupplyItem[]; activity: SupplyActivity[]; readOnly: boolean }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [qty, setQty] = useState("");
  const [low, setLow] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addSupplyItem({ name: name.trim(), unit: unit.trim() || "pcs", quantity: Number(qty) || 0, lowThreshold: Number(low) || 0 });
      setName(""); setUnit("pcs"); setQty(""); setLow(""); setAdding(false);
    });
  }

  return (
    <div className="flex flex-col gap-5">
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">Supplies</p>
          <p className="text-xs text-muted-2">Detergent, starch, nylon, hangers…</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => setAdding((v) => !v)} className="btn-primary h-9 rounded-lg px-4 text-sm font-semibold text-white">
            {adding ? "Cancel" : "+ Add item"}
          </button>
        )}
      </div>

      {adding && (
        <div className="grid gap-2 border-b border-ink/10 bg-white/30 p-4 sm:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="Start qty" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
          <div className="flex gap-2">
            <input value={low} onChange={(e) => setLow(e.target.value)} inputMode="numeric" placeholder="Low mark" className="h-11 flex-1 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500" />
            <button type="button" onClick={add} disabled={isPending} className="btn-primary h-11 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-60">Add</button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="border-b border-ink/10 p-3">
          <SearchBox value={query} onChange={setQuery} placeholder="Search supplies…" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3 text-right">In stock</th>
              <th className="px-5 py-3 text-right">Low mark</th>
              <th className="px-5 py-3 text-center">Status</th>
              {!readOnly && <th className="px-5 py-3 text-right">Adjust</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <SupplyRow key={item.id} item={item} readOnly={readOnly} isPending={isPending} start={startTransition} />
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="px-5 py-10 text-center text-sm text-muted">
                  {items.length ? "No match." : "No supplies yet. Add what you use so you never run out."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <ActivityLog activity={activity} />
    </div>
  );
}

function SupplyRow({ item, readOnly, isPending, start }: { item: SupplyItem; readOnly: boolean; isPending: boolean; start: (cb: () => void) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const low = item.quantity <= item.low_threshold;

  function adjust(direction: "in" | "out") {
    const n = Number(amount);
    if (!n) return;
    start(async () => {
      await adjustSupply({ itemId: item.id, direction, quantity: n, note });
      setAmount("");
      setNote("");
    });
  }

  return (
    <tr className="border-b border-ink/5 last:border-b-0">
      <td className="px-5 py-3 font-medium text-ink">{item.name}</td>
      <td className={`px-5 py-3 text-right font-mono font-semibold tabular-nums ${low ? "text-red-600" : "text-teal-900"}`}>{item.quantity} {item.unit}</td>
      <td className="px-5 py-3 text-right font-mono tabular-nums text-muted">{item.low_threshold}</td>
      <td className="px-5 py-3 text-center">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${low ? "bg-red-100/70 text-red-600" : "bg-green-100/70 text-green-700"}`}>
          {low ? "Low" : "OK"}
        </span>
      </td>
      {!readOnly && (
        <td className="px-5 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What for? (optional)" className="h-8 w-32 rounded-lg border border-white/60 bg-white/60 px-2 text-xs text-ink outline-none focus:border-teal-500" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Qty" className="h-8 w-14 rounded-lg border border-white/60 bg-white/60 px-2 font-mono text-sm tabular-nums text-ink outline-none focus:border-teal-500" />
            <button type="button" onClick={() => adjust("in")} disabled={isPending} className="h-8 rounded-lg bg-teal-500/20 px-2.5 text-xs font-semibold text-teal-800">Restock</button>
            <button type="button" onClick={() => adjust("out")} disabled={isPending} className="h-8 rounded-lg bg-amber-100/70 px-2.5 text-xs font-semibold text-amber-700">Use</button>
            <button type="button" onClick={() => start(() => deleteSupplyItem(item.id))} className="px-1 text-xs text-red-500">✕</button>
          </div>
        </td>
      )}
    </tr>
  );
}

function ClothesInStore({ clothes }: { clothes: Clothes }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? clothes.orders.filter((o) => o.customerName.toLowerCase().includes(q)) : clothes.orders;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-muted">In shop now</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-900">{clothes.total}</p>
        </div>
        {(["collected", "processing", "ready"] as const).map((s) => (
          <div key={s} className="glass-card rounded-2xl p-5">
            <p className="text-sm text-muted">{STAGE_LABEL[s]}</p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-teal-900">{clothes.byStage[s]}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-ink">Whose clothes are here</p>
          {clothes.orders.length > 0 && (
            <div className="sm:w-64">
              <SearchBox value={query} onChange={setQuery} placeholder="Search by customer…" />
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Dropped by</th>
                <th className="px-5 py-3 text-right">Total</th>
                <th className="px-5 py-3 text-right">Stage</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 align-top last:border-b-0 hover:bg-white/30">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/orders/${o.id}`} className="font-medium text-ink hover:text-teal-700">{o.customerName}</Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {o.breakdown.map((it) => (
                        <span key={it.name} className="inline-flex items-center gap-1 rounded-lg bg-teal-500/10 px-2 py-0.5 text-xs text-teal-800">
                          <span className="font-semibold">{it.qty}</span> {it.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted">{o.droppedOffBy ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-ink">{o.count}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_PILL_CLASS[o.status]}`}>{STAGE_LABEL[o.status]}</span>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">{clothes.orders.length ? "No match." : "No clothes in the shop right now."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
