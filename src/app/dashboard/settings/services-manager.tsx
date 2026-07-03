"use client";

import { useState, useTransition } from "react";
import { ServiceIcon } from "@/components/service-icon";
import { formatNaira } from "@/lib/format";
import { addService, updateService } from "./actions";

type Service = { id: string; name: string; icon: string; price: number; active: boolean };

const ICONS = ["shirt", "trouser", "bedsheet", "duvet", "agbada"];

export function ServicesManager({ services }: { services: Service[] }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("shirt");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim() || !Number(price)) return;
    startTransition(async () => {
      await addService({ name: name.trim(), price: Number(price), icon });
      setName("");
      setPrice("");
      setIcon("shirt");
      setAdding(false);
    });
  }

  function handleSaveEdit(id: string) {
    if (!Number(editPrice)) return;
    startTransition(async () => {
      await updateService(id, { price: Number(editPrice) });
      setEditingId(null);
    });
  }

  function toggle(id: string, active: boolean) {
    startTransition(() => updateService(id, { active: !active }));
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Services & prices</p>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-sm font-semibold text-teal-700"
        >
          {adding ? "Cancel" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-white/40 p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Service name (e.g. Shirt)"
            className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 text-[15px] text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="Price (₦)"
            className="h-11 rounded-lg border border-white/60 bg-white/60 px-3 font-mono text-[15px] tabular-nums text-ink outline-none placeholder:text-muted-2 focus:border-teal-500"
          />
          <div className="flex gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`flex h-11 flex-1 items-center justify-center rounded-lg border ${
                  icon === ic ? "border-teal-500 bg-teal-500/10 text-teal-700" : "border-white/60 bg-white/40 text-muted"
                }`}
              >
                <ServiceIcon icon={ic} className="h-5 w-5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="btn-primary h-11 rounded-lg text-sm font-medium text-white disabled:opacity-60"
          >
            Add service
          </button>
        </div>
      )}

      <div className="flex flex-col">
        {services.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 border-b border-ink/5 py-2.5 last:border-b-0"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-teal-500/25 bg-teal-500/10 text-teal-700">
              <ServiceIcon icon={s.icon} className="h-5 w-5" />
            </div>
            <p className={`flex-1 text-[15px] font-medium ${s.active ? "text-ink" : "text-muted-2 line-through"}`}>
              {s.name}
            </p>
            {editingId === s.id ? (
              <div className="flex items-center gap-2">
                <input
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  inputMode="numeric"
                  className="h-9 w-24 rounded-lg border border-teal-500 bg-white/60 px-2 font-mono text-sm tabular-nums text-ink outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleSaveEdit(s.id)}
                  className="text-sm font-semibold text-teal-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingId(s.id);
                  setEditPrice(String(s.price));
                }}
                className="font-mono text-sm font-semibold tabular-nums text-teal-900"
              >
                {formatNaira(Number(s.price))}
              </button>
            )}
            <button
              type="button"
              onClick={() => toggle(s.id, s.active)}
              className={`ml-1 h-6 w-10 flex-shrink-0 rounded-full p-0.5 transition-colors ${
                s.active ? "bg-teal-500" : "bg-ink/15"
              }`}
              aria-label={s.active ? "Deactivate" : "Activate"}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                  s.active ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
        {!services.length && (
          <p className="py-4 text-center text-sm text-muted">
            No services yet. Tap “+ Add” to set up your price list.
          </p>
        )}
      </div>
    </div>
  );
}
